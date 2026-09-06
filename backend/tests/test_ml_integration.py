"""
Integration tests for ML Risk Fusion, Analyzer Orchestration, API Endpoints, and Persistence.
"""

import pytest
import io
import json
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import (
    EmailMetadata,
    AuthResults,
    AuthStatus,
    IOCs,
    RelayHop,
    RiskClassification,
)
from backend.ml.models import MLPrediction, MLLabel
from backend.ml.mock_provider import MockMLProvider
from backend.ml.provider import UnavailableMLProvider
from backend.ml.service import MLService
from backend.risk_engine import calculate_risk
from backend.analyzer import analyze_email_bytes
from backend.case_service import CaseService
from backend.database import init_db


@pytest.fixture
def test_client():
    return TestClient(app)


def test_risk_fusion_with_ml_threat_available():
    """
    Test 70/30 risk fusion when ML detects a threat (phishing/bec).
    Forensic score = 40 (REPLY_TO_DOMAIN_MISMATCH 25 + URGENCY_LANGUAGE 15)
    ML confidence = 0.90 (phishing -> ML risk score = 90)
    Fused score = round(0.70 * 40 + 0.30 * 90) = round(28 + 27) = 55
    Scoring type must be 'forensic_plus_ml'.
    """
    meta = EmailMetadata(
        from_address="ceo@company.com",
        reply_to="attacker@fake.com",
        subject="Urgent Security Alert",
        message_id="<valid-msg@company.com>"
    )
    auth = AuthResults()
    iocs = IOCs()
    body = "Please verify your account immediately."
    hops = [RelayHop(hop_number=1, raw_header="from mail.com by mx.com")]

    ml_pred = MLPrediction(
        status="available",
        label="phishing",
        confidence=0.90,
        model_name="mock-model",
        provider="synthetic_demo",
        is_synthetic=True,
        explanation=["Synthetic heuristic matched phishing."]
    )

    risk = calculate_risk(
        email_meta=meta,
        auth=auth,
        iocs=iocs,
        relay_hops=hops,
        plain_body=body,
        ml_signals=ml_pred
    )

    assert risk.scoring_type == "forensic_plus_ml"
    assert risk.score == 55
    assert risk.classification == RiskClassification.MEDIUM_RISK
    assert any("ML model (mock-model) predicted 'phishing'" in r for r in risk.reasons)


def test_risk_fusion_with_ml_benign_available():
    """
    Test 70/30 risk fusion when ML detects benign content.
    Forensic score = 40 (REPLY_TO_DOMAIN_MISMATCH 25 + URGENCY_LANGUAGE 15)
    ML confidence = 0.90 (benign -> ML risk score = (1.0 - 0.90) * 100 = 10)
    Fused score = round(0.70 * 40 + 0.30 * 10) = round(28 + 3) = 31
    """
    meta = EmailMetadata(
        from_address="ceo@company.com",
        reply_to="attacker@fake.com",
        subject="Urgent Security Alert",
        message_id="<valid-msg@company.com>"
    )
    auth = AuthResults()
    iocs = IOCs()
    body = "Regular weekly team sync meeting."
    hops = [RelayHop(hop_number=1, raw_header="from mail.com by mx.com")]

    ml_pred = MLPrediction(
        status="available",
        label="benign",
        confidence=0.90,
        model_name="mock-model",
        provider="synthetic_demo",
        is_synthetic=True,
        explanation=["Content classified as benign."]
    )

    risk = calculate_risk(
        email_meta=meta,
        auth=auth,
        iocs=iocs,
        relay_hops=hops,
        plain_body=body,
        ml_signals=ml_pred
    )

    assert risk.scoring_type == "forensic_plus_ml"
    assert risk.score == 31
    assert any("ML model (mock-model) predicted 'benign'" in r for r in risk.reasons)


def test_risk_fusion_when_ml_unavailable_or_error():
    """
    Test graceful fallback to 100% deterministic forensic scoring when ML is unavailable or in error.
    Forensic score = 40
    ML status = unavailable
    Final score = 40, scoring_type = 'deterministic_forensic_only'.
    """
    meta = EmailMetadata(
        from_address="ceo@company.com",
        reply_to="attacker@fake.com",
        subject="Urgent Security Alert",
        message_id="<valid-msg@company.com>"
    )
    auth = AuthResults()
    iocs = IOCs()
    body = "Please verify your account."
    hops = [RelayHop(hop_number=1, raw_header="from mail.com by mx.com")]

    ml_pred = MLPrediction(
        status="unavailable",
        label="unknown",
        confidence=0.0,
        provider="none",
        is_synthetic=False,
        error="ML disabled"
    )

    risk = calculate_risk(
        email_meta=meta,
        auth=auth,
        iocs=iocs,
        relay_hops=hops,
        plain_body=body,
        ml_signals=ml_pred
    )

    assert risk.scoring_type == "deterministic_forensic_only"
    assert risk.score == 40


def test_analyze_email_bytes_contains_ml_signals():
    """Test full analysis pipeline attaches ml_signals to response and risk object."""
    raw_eml = (
        b"From: ceo@example.com\r\n"
        b"Reply-To: fraud@external.com\r\n"
        b"To: finance@example.com\r\n"
        b"Subject: Urgent Wire Transfer Required\r\n"
        b"Message-ID: <msg-123@example.com>\r\n"
        b"Date: Sun, 06 Sep 2026 12:00:00 +0000\r\n"
        b"\r\n"
        b"Please execute an urgent wire transfer for the invoice attached.\r\n"
    )

    result = analyze_email_bytes(raw_eml, file_name="bec_test.eml")

    assert result.ml_signals is not None
    assert result.ml_signals.status == "available"
    assert result.ml_signals.label == "bec"
    assert result.ml_signals.is_synthetic is True
    assert result.ml_signals.provider == "synthetic_demo"
    assert result.risk.ml_signals is not None
    assert result.risk.scoring_type == "forensic_plus_ml"


def test_api_analyze_endpoint_ml_contract(test_client):
    """Test POST /analyze API response schema backward compatibility with ml_signals field."""
    raw_eml = (
        b"From: support@service.com\r\n"
        b"To: victim@example.com\r\n"
        b"Subject: Security Alert: Account Suspended\r\n"
        b"Message-ID: <alert-456@service.com>\r\n"
        b"Date: Sun, 06 Sep 2026 12:00:00 +0000\r\n"
        b"\r\n"
        b"Immediate action required: verify your account within 24 hours.\r\n"
    )

    response = test_client.post(
        "/analyze",
        files={"file": ("phish_test.eml", io.BytesIO(raw_eml), "message/rfc822")}
    )

    assert response.status_code == 200
    data = response.json()

    # Verify all expected top-level response contracts
    assert "case_id" in data
    assert "email" in data
    assert "authentication" in data
    assert "iocs" in data
    assert "relay_path" in data
    assert "risk" in data
    assert "ip_intelligence" in data
    assert "domain_intelligence" in data
    assert "ml_signals" in data
    assert "metadata" in data

    # Verify ML signals structure
    ml_data = data["ml_signals"]
    assert ml_data["status"] == "available"
    assert ml_data["label"] in ("phishing", "bec", "benign", "impersonation", "malicious")
    assert isinstance(ml_data["confidence"], float)
    assert ml_data["is_synthetic"] is True
    assert ml_data["provider"] == "synthetic_demo"
    assert isinstance(ml_data["explanation"], list)


def test_case_service_persistence_with_ml(tmp_path):
    """Test CaseService persists analysis with ML signals and can be loaded from DB."""
    db_file = tmp_path / "forensic_ml_test.db"
    init_db(str(db_file))
    evidence_folder = tmp_path / "evidence"
    service = CaseService(db_path=str(db_file), evidence_dir=str(evidence_folder))

    raw_eml = (
        b"From: team@company.com\r\n"
        b"To: dev@company.com\r\n"
        b"Subject: Weekly Sync Meeting\r\n"
        b"Message-ID: <sync-789@company.com>\r\n"
        b"Date: Sun, 06 Sep 2026 12:00:00 +0000\r\n"
        b"\r\n"
        b"Here is the agenda for our weekly sync meeting tomorrow.\r\n"
    )

    response = service.process_and_store_email(raw_eml, "sync_test.eml")
    assert response.case_id.startswith("CASE-")

    # Fetch detail from DB
    detail = service.get_case_detail(response.case_id)
    assert detail is not None
    assert detail.analysis is not None
    assert "ml_signals" in detail.analysis
    assert detail.analysis["ml_signals"]["status"] == "available"
    assert detail.analysis["ml_signals"]["label"] == "benign"
