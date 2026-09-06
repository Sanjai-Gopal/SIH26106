"""
AI/ML Integration Package for SIH26106 Email Threat Detection Platform.
"""

from backend.ml.models import MLPrediction, MLLabel
from backend.ml.provider import (
    BaseMLProvider,
    UnavailableMLProvider,
    HuggingFaceLocalProvider,
    get_ml_provider
)
from backend.ml.mock_provider import MockMLProvider
from backend.ml.service import MLService, prepare_model_input, normalize_label

__all__ = [
    "MLPrediction",
    "MLLabel",
    "BaseMLProvider",
    "UnavailableMLProvider",
    "HuggingFaceLocalProvider",
    "get_ml_provider",
    "MockMLProvider",
    "MLService",
    "prepare_model_input",
    "normalize_label",
]
