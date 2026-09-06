"""
ML Service Orchestration & Input Preparation Layer.
Safely extracts and formats email content for inference, standardizes labels,
and handles provider failure modes gracefully without breaking analysis.
"""

import logging
from typing import Optional, List, Any

from backend.ml.models import MLPrediction, MLLabel
from backend.ml.provider import BaseMLProvider, get_ml_provider

logger = logging.getLogger("backend.ml.service")

MAX_INPUT_CHARS = 4000

# Canonical label mapping dictionary
LABEL_NORMALIZATION_MAP = {
    # Benign
    "benign": MLLabel.BENIGN.value,
    "ham": MLLabel.BENIGN.value,
    "clean": MLLabel.BENIGN.value,
    "legitimate": MLLabel.BENIGN.value,
    "safe": MLLabel.BENIGN.value,
    "normal": MLLabel.BENIGN.value,
    # Phishing
    "phishing": MLLabel.PHISHING.value,
    "phish": MLLabel.PHISHING.value,
    "credential_harvesting": MLLabel.PHISHING.value,
    # BEC
    "bec": MLLabel.BEC.value,
    "business_email_compromise": MLLabel.BEC.value,
    "financial_fraud": MLLabel.BEC.value,
    "wire_fraud": MLLabel.BEC.value,
    # Impersonation
    "impersonation": MLLabel.IMPERSONATION.value,
    "impersonate": MLLabel.IMPERSONATION.value,
    "spoof": MLLabel.IMPERSONATION.value,
    "spoofing": MLLabel.IMPERSONATION.value,
    # Malicious
    "malicious": MLLabel.MALICIOUS.value,
    "malware": MLLabel.MALICIOUS.value,
    "trojan": MLLabel.MALICIOUS.value,
    "exploit": MLLabel.MALICIOUS.value,
    "spam": MLLabel.MALICIOUS.value,
    "attack": MLLabel.MALICIOUS.value,
}


def normalize_label(raw_label: Optional[str]) -> str:
    """
    Normalizes arbitrary model classification labels into standard platform taxonomy.
    """
    if not raw_label:
        return MLLabel.UNKNOWN.value

    clean = raw_label.strip().lower().replace("-", "_").replace(" ", "_")
    return LABEL_NORMALIZATION_MAP.get(clean, MLLabel.UNKNOWN.value)


def prepare_model_input(
    email_meta: Any,
    plain_body: Optional[str],
    max_chars: int = MAX_INPUT_CHARS
) -> str:
    """
    Constructs clean, sanitized textual input for ML model consumption.
    Includes pertinent forensic headers and plain-text body preview.
    Enforces maximum character length to prevent buffer overruns or high latency.
    Does NOT execute scripts, render HTML, or parse external URLs.
    """
    subject = (getattr(email_meta, "subject", None) or "").strip()
    from_addr = (getattr(email_meta, "from_address", None) or "").strip()
    reply_to = (getattr(email_meta, "reply_to", None) or "").strip()
    body_preview = getattr(email_meta, "body_preview", None)
    body_text = (plain_body or body_preview or "").strip()

    parts: List[str] = []
    if subject:
        parts.append(f"Subject: {subject}")
    if from_addr:
        parts.append(f"From: {from_addr}")
    if reply_to:
        parts.append(f"Reply-To: {reply_to}")

    header_block = "\n".join(parts)
    if header_block:
        full_text = f"{header_block}\n\nBody:\n{body_text}"
    else:
        full_text = f"Body:\n{body_text}"

    # Enforce safe upper bound limit
    if len(full_text) > max_chars:
        return full_text[:max_chars]
    return full_text


class MLService:
    """
    Core ML inference management service.
    Orchestrates input preparation, inference execution, label normalization,
    and graceful error handling.
    """

    def __init__(self, provider: Optional[BaseMLProvider] = None):
        self.provider = provider or get_ml_provider()

    def predict_email(
        self,
        email_meta: Any,
        plain_body: Optional[str]
    ) -> MLPrediction:
        """
        Executes ML classification on parsed email metadata and body.
        Guarantees non-throwing behavior: returns error/unavailable status on failures.
        """
        try:
            input_text = prepare_model_input(email_meta, plain_body)
            raw_prediction = self.provider.predict(input_text)

            # Ensure prediction label is normalized to platform taxonomy
            normalized_label = normalize_label(raw_prediction.label)
            if normalized_label != raw_prediction.label and normalized_label != MLLabel.UNKNOWN.value:
                raw_prediction.label = normalized_label

            return raw_prediction
        except Exception as exc:
            # Safe logging: log error message without printing raw email contents
            logger.error(f"ML Service prediction failed unexpectedly: {exc}", exc_info=True)
            return MLPrediction(
                status="error",
                label=MLLabel.UNKNOWN.value,
                confidence=0.0,
                model_name="none",
                model_version="0.0.0",
                provider="error",
                is_synthetic=False,
                explanation=["ML prediction encountered an internal error during execution."],
                error=str(exc)
            )
