"""
Provider interfaces and factory for AI/ML Threat Classification.
Defines abstract inference contract, unavailable fallback provider,
and real model adapter interface for Hugging Face or local transformers.
"""

from abc import ABC, abstractmethod
import os
import logging
from typing import Optional

from backend.ml.models import MLPrediction, MLLabel

logger = logging.getLogger("backend.ml.provider")


class BaseMLProvider(ABC):
    """Abstract interface for all ML inference providers."""

    @abstractmethod
    def predict(self, text: str) -> MLPrediction:
        """
        Runs inference on prepared email text and returns standardized MLPrediction.
        """
        pass


class UnavailableMLProvider(BaseMLProvider):
    """Fallback provider when ML integration is disabled or unconfigured."""

    def __init__(self, reason: str = "ML provider is unconfigured or disabled."):
        self.reason = reason

    def predict(self, text: str) -> MLPrediction:
        return MLPrediction(
            status="unavailable",
            label=MLLabel.UNKNOWN.value,
            confidence=0.0,
            model_name="none",
            model_version="0.0.0",
            provider="none",
            is_synthetic=False,
            explanation=["ML inference is unavailable; proceeding with deterministic forensic scoring only."],
            error=self.reason
        )


class HuggingFaceLocalProvider(BaseMLProvider):
    """
    Adapter for local Hugging Face / Transformers pipeline model.
    Designed for the AI/ML teammate's fine-tuned model artifact.
    Does not download weights on startup if unconfigured.
    """

    def __init__(
        self,
        model_name_or_path: Optional[str] = None,
        model_version: str = "1.0.0"
    ):
        self.model_name_or_path = model_name_or_path or os.getenv("ML_MODEL_NAME", "phishing-detector-roberta")
        self.model_version = model_version
        self._pipeline = None
        self._initialized = False
        self._load_error: Optional[str] = None

    def _lazy_init(self):
        """Lazy loader to prevent slow application startup and avoid internet calls."""
        if self._initialized:
            return

        try:
            # Attempt to import transformers locally
            from transformers import pipeline  # type: ignore
            self._pipeline = pipeline(
                "text-classification",
                model=self.model_name_or_path,
                truncation=True,
                max_length=512
            )
            self._initialized = True
            logger.info(f"Loaded Hugging Face model from '{self.model_name_or_path}'")
        except Exception as exc:
            self._load_error = f"Failed to initialize model '{self.model_name_or_path}': {str(exc)}"
            self._initialized = True
            logger.warning(self._load_error)

    def predict(self, text: str) -> MLPrediction:
        self._lazy_init()

        if self._load_error or self._pipeline is None:
            return MLPrediction(
                status="unavailable",
                label=MLLabel.UNKNOWN.value,
                confidence=0.0,
                model_name=self.model_name_or_path,
                model_version=self.model_version,
                provider="huggingface_local",
                is_synthetic=False,
                explanation=["Hugging Face model pipeline is not available on this host."],
                error=self._load_error or "Model pipeline not loaded"
            )

        try:
            results = self._pipeline(text[:2000])
            if results and isinstance(results, list):
                top_result = results[0]
                raw_label = str(top_result.get("label", "unknown")).lower()
                raw_score = float(top_result.get("score", 0.0))

                return MLPrediction(
                    status="available",
                    label=raw_label,
                    confidence=round(raw_score, 4),
                    model_name=self.model_name_or_path,
                    model_version=self.model_version,
                    provider="huggingface_local",
                    is_synthetic=False,
                    explanation=[f"Hugging Face model '{self.model_name_or_path}' predicted '{raw_label}'."]
                )
            else:
                return MLPrediction(
                    status="error",
                    label=MLLabel.UNKNOWN.value,
                    confidence=0.0,
                    model_name=self.model_name_or_path,
                    model_version=self.model_version,
                    provider="huggingface_local",
                    is_synthetic=False,
                    explanation=[],
                    error="Inference returned empty result structure."
                )
        except Exception as exc:
            logger.error(f"Inference failed on text input: {exc}", exc_info=True)
            return MLPrediction(
                status="error",
                label=MLLabel.UNKNOWN.value,
                confidence=0.0,
                model_name=self.model_name_or_path,
                model_version=self.model_version,
                provider="huggingface_local",
                is_synthetic=False,
                explanation=[],
                error=f"Model inference exception: {str(exc)}"
            )


def get_ml_provider(provider_type: Optional[str] = None) -> BaseMLProvider:
    """
    Factory function resolving configured ML provider.
    Reads ML_PROVIDER environment variable ('mock', 'huggingface', 'none', 'unavailable').
    Default is 'mock' for prototype execution.
    """
    prov = (provider_type or os.getenv("ML_PROVIDER", "mock")).strip().lower()

    if prov in ("mock", "synthetic", "demo"):
        from backend.ml.mock_provider import MockMLProvider
        return MockMLProvider()
    elif prov in ("huggingface", "hf", "local_transformer"):
        return HuggingFaceLocalProvider()
    elif prov in ("none", "unavailable", "disabled"):
        return UnavailableMLProvider(reason="ML inference is explicitly disabled.")
    else:
        logger.warning(f"Unknown ML_PROVIDER '{prov}'. Defaulting to UnavailableMLProvider.")
        return UnavailableMLProvider(reason=f"Unknown provider '{prov}'.")
