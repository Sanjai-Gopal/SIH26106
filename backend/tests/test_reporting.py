"""
Unit and Integration Tests for Forensic Reporting, Timeline Synthesis, Findings, and API Endpoints.
"""

import pytest
import io
import json
from fastapi.testclient import TestClient

from backend.main import app
from backend.reporting import (
    ForensicReportingService,
    ForensicReport,
    TimelineEvent,
    Finding,
    FindingCategory,
    FindingSeverity,
    JSONReportRenderer,
    HTMLReportRenderer,
)
from backend.analyzer import analyze_email_bytes


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def reporting_service():
    return ForensicReportingService()


SAMPLE_EML_BYTES = (
    b"From: ceo@legit-corp.example\r\n"
    b"To: finance@victim-company.com\r\n"
    b"Reply-To: attacker@spoofed-domain.xyz\r\n"
    b"Subject: URGENT: Immediate Wire Transfer Required for Invoice #9842\r\n"
    b"Message-ID: <msg-2026-001@legit-corp.example>\r\n"
    b"Date: Sun, 06 Sep 2026 12:00:00 +0000\r\n"
    b"Authentication-Results: mx.victim.com; dkim=fail; spf=fail; dmarc=fail\r\n"
    b"Received: from mail.attacker-node.xyz ([198.51.100.42]) by mx.victim.com with ESMTP; Sun, 06 Sep 2026 12:00:05 +0000\r\n"
    b"\r\n"
    b"Please verify your account and process an urgent wire transfer to http://198.51.100.42/login immediately.\r\n"
)


def test_report_generation_from_analysis(reporting_service):
    """Test full report generation from raw analysis response."""
    analysis = analyze_email_bytes(SAMPLE_EML_BYTES, file_name="phishing_sample.eml")
    report = reporting_service.build_report_from_analysis(
        analysis_data=analysis,
        case_id=analysis.case_id,
        filename="phishing_sample.eml"
    )

    assert isinstance(report, ForensicReport)
    assert report.case.case_id == analysis.case_id
    assert report.metadata.report_id.startswith("REP-")
    assert report.evidence.filename == "phishing_sample.eml"
    assert len(report.evidence.sha256) == 64
    assert report.email.sender == "ceo@legit-corp.example"
    assert report.email.reply_to == "attacker@spoofed-domain.xyz"
    assert report.authentication.dmarc_status == "FAIL"
    assert report.risk_assessment.score >= 50
    assert len(report.limitations.disclaimers) >= 3


def test_timeline_ordering_and_sources(reporting_service):
    """Test timeline events are chronologically mapped from Date header, relay hops, and intake."""
    analysis = analyze_email_bytes(SAMPLE_EML_BYTES)
    report = reporting_service.build_report_from_analysis(analysis)

    assert len(report.timeline) >= 2
    sources = [e.source for e in report.timeline]
    assert "email_date_header" in sources
    assert "system_intake" in sources

    for evt in report.timeline:
        assert evt.event_id.startswith("EVT-")
        assert evt.timestamp is not None
        assert evt.description is not None


def test_findings_generation_and_categorization(reporting_service):
    """Test findings accurately identify authentication failure, reply-to mismatch, and BEC language."""
    analysis = analyze_email_bytes(SAMPLE_EML_BYTES)
    report = reporting_service.build_report_from_analysis(analysis)

    assert len(report.findings) >= 2
    categories = [f.category for f in report.findings]
    assert FindingCategory.AUTHENTICATION in categories or FindingCategory.SENDER_IDENTITY in categories

    for finding in report.findings:
        assert finding.finding_id.startswith("FND-")
        assert finding.severity in (FindingSeverity.CRITICAL, FindingSeverity.HIGH, FindingSeverity.MEDIUM, FindingSeverity.LOW, FindingSeverity.INFORMATIONAL)
        assert len(finding.evidence_reference) > 0


def test_narrative_facts_vs_assessments_vs_uncertainties(reporting_service):
    """Test investigative narrative clearly separates facts, assessments, and uncertainties."""
    analysis = analyze_email_bytes(SAMPLE_EML_BYTES)
    report = reporting_service.build_report_from_analysis(analysis)

    narrative = report.narrative
    assert len(narrative.confirmed_facts) > 0
    assert len(narrative.expert_assessments) > 0
    assert len(narrative.forensic_uncertainties) >= 2

    # Check uncertainty disclaimer language
    assert any("infrastructure" in u.lower() for u in narrative.forensic_uncertainties)
    assert any("forged" in u.lower() for u in narrative.forensic_uncertainties)


def test_html_rendering_and_xss_protection(reporting_service):
    """Test HTMLReportRenderer escapes untrusted inputs to prevent XSS."""
    xss_eml = (
        b"From: <script>alert('xss_from')</script>@evil.com\r\n"
        b"To: victim@example.com\r\n"
        b"Subject: <img src=x onerror=alert('xss_subj')> Normal Subject\r\n"
        b"Date: Sun, 06 Sep 2026 12:00:00 +0000\r\n"
        b"\r\n"
        b"Body content with <script>alert('body')</script>\r\n"
    )

    analysis = analyze_email_bytes(xss_eml, file_name="xss.eml")
    report = reporting_service.build_report_from_analysis(analysis)
    html_output = reporting_service.render_report(report, output_format="html")

    assert isinstance(html_output, str)
    assert "<!DOCTYPE html>" in html_output
    assert "<script>alert('xss_from')</script>" not in html_output
    assert "&lt;script&gt;alert(&#x27;xss_from&#x27;)&lt;/script&gt;" in html_output or "&lt;script&gt;" in html_output
    assert "<img src=x onerror=alert" not in html_output


def test_json_rendering(reporting_service):
    """Test JSONReportRenderer produces valid parseable JSON with all fields."""
    analysis = analyze_email_bytes(SAMPLE_EML_BYTES)
    report = reporting_service.build_report_from_analysis(analysis)
    json_output = reporting_service.render_report(report, output_format="json")

    parsed = json.loads(json_output)
    assert "metadata" in parsed
    assert "case" in parsed
    assert "findings" in parsed
    assert "timeline" in parsed
    assert "recommendations" in parsed
    assert "limitations" in parsed


def test_malformed_and_empty_analysis_resilience(reporting_service):
    """Test reporting service does not crash when passed sparse or empty analysis dictionaries."""
    empty_dict = {}
    report = reporting_service.build_report_from_analysis(empty_dict)
    assert report.case.case_status == "ANALYZED"
    assert report.risk_assessment.score == 0
    assert len(report.limitations.disclaimers) > 0


def test_api_report_endpoints_json_and_html(client):
    """Test /analyze followed by GET /cases/{id}/report in JSON and HTML formats."""
    # Analyze email
    res = client.post(
        "/analyze",
        files={"file": ("invoice.eml", io.BytesIO(SAMPLE_EML_BYTES), "message/rfc822")}
    )
    assert res.status_code == 200
    case_id = res.json()["case_id"]

    # 1. GET report JSON
    rep_json = client.get(f"/cases/{case_id}/report?format=json")
    assert rep_json.status_code == 200
    data = rep_json.json()
    assert data["case"]["case_id"] == case_id
    assert len(data["findings"]) >= 1

    # 2. GET report HTML
    rep_html = client.get(f"/cases/{case_id}/report?format=html")
    assert rep_html.status_code == 200
    assert "text/html" in rep_html.headers.get("content-type", "")
    assert f"Forensic Report: {case_id}" in rep_html.text

    # 3. GET timeline
    rep_timeline = client.get(f"/cases/{case_id}/timeline")
    assert rep_timeline.status_code == 200
    assert isinstance(rep_timeline.json(), list)
    assert len(rep_timeline.json()) >= 1

    # 4. GET findings
    rep_findings = client.get(f"/cases/{case_id}/findings")
    assert rep_findings.status_code == 200
    assert isinstance(rep_findings.json(), list)

    # 5. GET missing report 404
    missing = client.get("/cases/CASE-NONEXISTENT-999/report")
    assert missing.status_code == 404


def test_api_generate_report_from_payload(client):
    """Test POST /cases/{case_id}/generate-report endpoint with custom payload."""
    payload = {
        "case_id": "CASE-CUSTOM-999",
        "email": {"from_address": "spoof@fake.com", "subject": "Test Alert"},
        "authentication": {"spf": "FAIL", "dkim": "NONE", "dmarc": "FAIL"},
        "risk": {"score": 85, "classification": "CRITICAL RISK", "signals": [{"name": "AUTH_DMARC_FAIL", "description": "DMARC Failed"}]},
        "metadata": {"analysis_timestamp": "2026-09-06T12:00:00Z", "file_size_bytes": 1024}
    }

    res = client.post("/cases/CASE-CUSTOM-999/generate-report", json=payload)
    assert res.status_code == 200
    report_data = res.json()
    assert report_data["case"]["case_id"] == "CASE-CUSTOM-999"
    assert report_data["risk_assessment"]["score"] == 85
    assert len(report_data["findings"]) >= 1


def test_synthetic_data_labeling_and_missing_intelligence(reporting_service):
    """Test synthetic data flags on IP, domain, and ML intelligence are accurately preserved."""
    synthetic_payload = {
        "case_id": "CASE-SYNTH-01",
        "ip_intelligence": [
            {
                "ip": "203.0.113.10",
                "country": "Mockland",
                "is_synthetic": True,
                "provider": "synthetic_mock"
            }
        ],
        "domain_intelligence": [
            {
                "domain": "mock-phish.test",
                "dns_resolved": True,
                "is_synthetic": True,
                "provider": "synthetic_mock"
            }
        ],
        "ml_signals": {
            "status": "available",
            "label": "phishing",
            "confidence": 0.95,
            "is_synthetic": True,
            "provider": "synthetic_ml"
        }
    }

    report = reporting_service.build_report_from_analysis(synthetic_payload)
    assert len(report.ip_intelligence) == 1
    assert report.ip_intelligence[0].is_synthetic is True
    assert len(report.domain_intelligence) == 1
    assert report.domain_intelligence[0].is_synthetic is True
    assert report.ml_assessment.is_synthetic is True
    assert report.ml_assessment.status == "available"

    # HTML output should display synthetic badge
    html_out = reporting_service.render_report(report, output_format="html")
    assert "SYNTHETIC" in html_out or "DEMO" in html_out


def test_missing_ml_and_blockchain_unverified_handling(reporting_service):
    """Test handling of missing/unavailable ML model and unnotarized blockchain."""
    raw = {
        "case_id": "CASE-NO-ML",
        "email": {"from_address": "clean@test.com", "subject": "Hello"},
        "ml_signals": {"status": "unavailable"},
        "risk": {"score": 10, "classification": "LOW RISK", "scoring_type": "deterministic_forensic_only"}
    }

    report = reporting_service.build_report_from_analysis(raw)
    assert report.ml_assessment.status == "unavailable"
    assert report.blockchain.notarization_status == "not_notarized"
    assert report.blockchain.verification_status == "unverified"
    assert report.risk_assessment.scoring_type == "deterministic_forensic_only"


def test_pdf_renderer_extensibility(reporting_service):
    """Test PDF renderer abstraction raises NotImplementedError explaining future pluggability."""
    from backend.reporting.renderers import PDFReportRenderer
    pdf_renderer = PDFReportRenderer()
    report = reporting_service.build_report_from_analysis({})

    with pytest.raises(NotImplementedError) as exc_info:
        pdf_renderer.render(report)
    assert "PDF rendering interface is architected" in str(exc_info.value)

