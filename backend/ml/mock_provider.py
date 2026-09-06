"""
Deterministic Mock / Synthetic ML Provider for Testing & Prototyping.
Explicitly labeled as synthetic demo output to preserve forensic integrity.
"""

import re
from typing import List, Tuple
from backend.ml.models import MLPrediction, MLLabel
from backend.ml.provider import BaseMLProvider


class MockMLProvider(BaseMLProvider):
    """
    Deterministic rule-based mock ML classifier.
    Simulates ML model classification for development, testing, and offline demonstrations.
    All outputs explicitly have is_synthetic=True and provider='synthetic_demo'.
    """

    PROVIDER_NAME = "synthetic_demo"
    MODEL_NAME = "mock-heuristic-classifier"
    MODEL_VERSION = "1.0.0-synthetic"

    # Keywords for synthetic classification simulation
    PHISHING_PATTERNS = [
        r"\bverify your account\b",
        r"\baccount suspended\b",
        r"\bpassword expired\b",
        r"\bimmediate action required\b",
        r"\bsecurity alert\b",
        r"\b24 hours to verify\b",
        r"\bupdate your billing\b",
        r"\bsign in to keep access\b",
    ]

    BEC_PATTERNS = [
        r"\bwire transfer\b",
        r"\bgift card\b",
        r"\bpayroll update\b",
        r"\bdirect deposit\b",
        r"\binvoice attached\b",
        r"\boverdue invoice\b",
        r"\bconfidential transaction\b",
        r"\bpayment request\b",
        r"\bbank transfer\b",
    ]

    IMPERSONATION_PATTERNS = [
        r"\bexecutive request\b",
        r"\bfrom the ceo\b",
        r"\bconfidential instructions from management\b",
        r"\bverify identity immediately\b",
        r"\bhr department notice\b",
    ]

    MALICIOUS_PATTERNS = [
        r"\bmalware\b",
        r"\btrojan\b",
        r"\bexploit payload\b",
        r"\bkeylogger\b",
        r"\bransomware\b",
    ]

    BENIGN_PATTERNS = [
        r"\bweekly sync\b",
        r"\bproject status\b",
        r"\bquarterly report\b",
        r"\blunch meeting\b",
        r"\bteam update\b",
        r"\bmeeting agenda\b",
        r"\bthank you\b",
        r"\bconference call\b",
    ]

    def predict(self, text: str) -> MLPrediction:
        """Runs deterministic keyword heuristics to simulate model output."""
        if not text or not text.strip():
            return MLPrediction(
                status="available",
                label=MLLabel.BENIGN.value,
                confidence=0.50,
                model_name=self.MODEL_NAME,
                model_version=self.MODEL_VERSION,
                provider=self.PROVIDER_NAME,
                is_synthetic=True,
                explanation=["Empty or missing text content; defaulting to baseline neutral score."],
            )

        text_lower = text.lower()

        # Check BEC triggers
        bec_matches = [p.replace(r"\b", "") for p in self.BEC_PATTERNS if re.search(p, text_lower)]
        if bec_matches:
            return MLPrediction(
                status="available",
                label=MLLabel.BEC.value,
                confidence=0.88,
                model_name=self.MODEL_NAME,
                model_version=self.MODEL_VERSION,
                provider=self.PROVIDER_NAME,
                is_synthetic=True,
                explanation=[f"Synthetic heuristic matched BEC pattern: '{bec_matches[0]}'."],
            )

        # Check Phishing triggers
        phishing_matches = [p.replace(r"\b", "") for p in self.PHISHING_PATTERNS if re.search(p, text_lower)]
        if phishing_matches:
            return MLPrediction(
                status="available",
                label=MLLabel.PHISHING.value,
                confidence=0.92,
                model_name=self.MODEL_NAME,
                model_version=self.MODEL_VERSION,
                provider=self.PROVIDER_NAME,
                is_synthetic=True,
                explanation=[f"Synthetic heuristic matched Phishing pattern: '{phishing_matches[0]}'."],
            )

        # Check Impersonation triggers
        impersonation_matches = [p.replace(r"\b", "") for p in self.IMPERSONATION_PATTERNS if re.search(p, text_lower)]
        if impersonation_matches:
            return MLPrediction(
                status="available",
                label=MLLabel.IMPERSONATION.value,
                confidence=0.85,
                model_name=self.MODEL_NAME,
                model_version=self.MODEL_VERSION,
                provider=self.PROVIDER_NAME,
                is_synthetic=True,
                explanation=[f"Synthetic heuristic matched Impersonation pattern: '{impersonation_matches[0]}'."],
            )

        # Check Malicious triggers
        malicious_matches = [p.replace(r"\b", "") for p in self.MALICIOUS_PATTERNS if re.search(p, text_lower)]
        if malicious_matches:
            return MLPrediction(
                status="available",
                label=MLLabel.MALICIOUS.value,
                confidence=0.90,
                model_name=self.MODEL_NAME,
                model_version=self.MODEL_VERSION,
                provider=self.PROVIDER_NAME,
                is_synthetic=True,
                explanation=[f"Synthetic heuristic matched Malicious keyword: '{malicious_matches[0]}'."],
            )

        # Check Benign triggers
        benign_matches = [p.replace(r"\b", "") for p in self.BENIGN_PATTERNS if re.search(p, text_lower)]
        if benign_matches:
            return MLPrediction(
                status="available",
                label=MLLabel.BENIGN.value,
                confidence=0.95,
                model_name=self.MODEL_NAME,
                model_version=self.MODEL_VERSION,
                provider=self.PROVIDER_NAME,
                is_synthetic=True,
                explanation=[f"Synthetic heuristic matched Benign pattern: '{benign_matches[0]}'."],
            )

        # Neutral default
        return MLPrediction(
            status="available",
            label=MLLabel.BENIGN.value,
            confidence=0.75,
            model_name=self.MODEL_NAME,
            model_version=self.MODEL_VERSION,
            provider=self.PROVIDER_NAME,
            is_synthetic=True,
            explanation=["No specific heuristic indicators detected; classified as benign."],
        )
