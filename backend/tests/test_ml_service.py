"""
Unit tests for AI/ML Inference Layer, Mock Provider, Input Preparation, and Normalization.
"""

import pytest
from backend.models import EmailMetadata
from backend.ml.models import MLPrediction, MLLabel
from backend.ml.provider import BaseMLProvider, UnavailableMLProvider, get_ml_provider
from backend.ml.mock_provider import MockMLProvider
from backend.ml.service import MLService, prepare_model_input, normalize_label, MAX_INPUT_CHARS


class FailingMLProvider(BaseMLProvider):
    """Test helper provider that raises an exception during inference."""
    def predict(self, text: str) -> MLPrediction:
        raise RuntimeError("Simulated GPU out-of-memory or pipeline failure.")


def test_mock_provider_heuristics_and_synthetic_flag():
    """Test MockMLProvider returns deterministic classifications and strictly marks is_synthetic=True."""
    provider = MockMLProvider()

    # Phishing trigger
    phish_pred = provider.predict("URGENT: Please verify your account immediately or access will be suspended.")
    assert phish_pred.status == "available"
    assert phish_pred.label == "phishing"
    assert phish_pred.confidence >= 0.90
    assert phish_pred.is_synthetic is True
    assert phish_pred.provider == "synthetic_demo"
    assert len(phish_pred.explanation) > 0

    # BEC trigger
    bec_pred = provider.predict("Kindly initiate an urgent wire transfer for the overdue invoice attached.")
    assert bec_pred.status == "available"
    assert bec_pred.label == "bec"
    assert bec_pred.confidence >= 0.85
    assert bec_pred.is_synthetic is True

    # Impersonation trigger
    imp_pred = provider.predict("Confidential request from the CEO regarding urgent company operations.")
    assert imp_pred.status == "available"
    assert imp_pred.label == "impersonation"
    assert imp_pred.is_synthetic is True

    # Malicious trigger
    mal_pred = provider.predict("A new trojan ransomware exploit payload was detected.")
    assert mal_pred.status == "available"
    assert mal_pred.label == "malicious"
    assert mal_pred.is_synthetic is True

    # Benign trigger
    benign_pred = provider.predict("Here is the meeting agenda for our weekly sync and lunch meeting.")
    assert benign_pred.status == "available"
    assert benign_pred.label == "benign"
    assert benign_pred.confidence >= 0.90
    assert benign_pred.is_synthetic is True


def test_mock_provider_empty_input():
    """Test MockMLProvider handling of empty or whitespace-only inputs."""
    provider = MockMLProvider()
    pred = provider.predict("   \n\t  ")
    assert pred.status == "available"
    assert pred.label == "benign"
    assert pred.confidence == 0.50
    assert pred.is_synthetic is True


def test_unavailable_provider():
    """Test UnavailableMLProvider returns status='unavailable' with explanation and no synthetic flag."""
    provider = UnavailableMLProvider(reason="ML is disabled in configuration.")
    pred = provider.predict("Any email text")
    assert pred.status == "unavailable"
    assert pred.label == "unknown"
    assert pred.confidence == 0.0
    assert pred.provider == "none"
    assert pred.is_synthetic is False
    assert "disabled" in str(pred.error)


def test_label_normalization():
    """Test normalization of various model output labels to platform standard taxonomy."""
    assert normalize_label("HAM") == "benign"
    assert normalize_label("clean") == "benign"
    assert normalize_label("Safe") == "benign"
    assert normalize_label("Phish") == "phishing"
    assert normalize_label("credential-harvesting") == "phishing"
    assert normalize_label("business_email_compromise") == "bec"
    assert normalize_label("wire_fraud") == "bec"
    assert normalize_label("SPOOF") == "impersonation"
    assert normalize_label("malware") == "malicious"
    assert normalize_label("Spam") == "malicious"
    assert normalize_label("custom-unrecognized-category") == "unknown"
    assert normalize_label(None) == "unknown"


def test_prepare_model_input_formatting():
    """Test structured text preparation from EmailMetadata and body preview."""
    meta = EmailMetadata(
        from_address="boss@example.com",
        reply_to="attacker@spoofed.xyz",
        subject="Urgent Payroll Notice"
    )
    body = "Please update your direct deposit information immediately."

    prepared = prepare_model_input(meta, body)
    assert "Subject: Urgent Payroll Notice" in prepared
    assert "From: boss@example.com" in prepared
    assert "Reply-To: attacker@spoofed.xyz" in prepared
    assert "Body:\nPlease update your direct deposit" in prepared


def test_prepare_model_input_length_truncation():
    """Test safe upper bound truncation on extremely large email payloads."""
    meta = EmailMetadata(subject="Test Long")
    huge_body = "A" * 10000

    prepared = prepare_model_input(meta, huge_body, max_chars=4000)
    assert len(prepared) <= 4000


def test_ml_service_resilience_on_provider_exception():
    """Test MLService catches provider runtime exceptions and returns status='error' without crashing."""
    failing_service = MLService(provider=FailingMLProvider())
    meta = EmailMetadata(subject="Test")
    
    pred = failing_service.predict_email(meta, "Some email text")
    assert pred.status == "error"
    assert pred.label == "unknown"
    assert pred.confidence == 0.0
    assert pred.error is not None
    assert "Simulated GPU" in pred.error


def test_get_ml_provider_factory(monkeypatch):
    """Test provider resolution via environment variable."""
    # Test mock resolution
    prov_mock = get_ml_provider("mock")
    assert isinstance(prov_mock, MockMLProvider)

    # Test unavailable resolution
    prov_none = get_ml_provider("none")
    assert isinstance(prov_none, UnavailableMLProvider)

    # Test fallback on unknown provider
    prov_unknown = get_ml_provider("some_nonexistent_provider")
    assert isinstance(prov_unknown, UnavailableMLProvider)


def test_huggingface_provider_graceful_fallback_when_unconfigured():
    """Test HuggingFaceLocalProvider does not crash when local weights are uninstalled."""
    from backend.ml.provider import HuggingFaceLocalProvider
    hf_provider = HuggingFaceLocalProvider(model_name_or_path="nonexistent-model-repo")
    pred = hf_provider.predict("Test email content")
    assert pred.status == "unavailable"
    assert pred.is_synthetic is False
    assert pred.provider == "huggingface_local"


def test_ml_service_normal_prediction_flow():
    """Test MLService standard prediction with mock provider."""
    service = MLService()
    meta = EmailMetadata(
        subject="Action Required: Update Direct Deposit",
        from_address="payroll@fake-domain.com"
    )
    pred = service.predict_email(meta, "Kindly provide bank transfer details.")
    assert pred.status == "available"
    assert pred.label == "bec"
    assert pred.confidence > 0.8
    assert pred.is_synthetic is True
    assert pred.provider == "synthetic_demo"
