"""
SIH26106 Email Threat Detection, GeoLocation & Forensic Intelligence Platform.
FastAPI Application Entry Point.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import logging

from backend.models import EmailAnalysisResponse, HealthResponse
from backend.analyzer import analyze_email_bytes, PARSER_VERSION

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend.main")

# Max upload size limit: 15MB
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

app = FastAPI(
    title="SIH26106 Email Threat Detection API",
    description="Forensic analysis pipeline for .eml email threats, authentication validation, IOC extraction, and relay tracing.",
    version=PARSER_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local frontend development and integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def value_error_handler(request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Bad Request", "detail": str(exc)}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "detail": "An unexpected error occurred during email analysis."}
    )


@app.get("/", response_model=HealthResponse, tags=["Health"])
async def root():
    """Root status endpoint returning service health and version."""
    return HealthResponse(
        status="online",
        service="SIH26106 Email Threat Detection API",
        version=PARSER_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Health check endpoint for monitoring and uptime probes."""
    return HealthResponse(
        status="online",
        service="SIH26106 Email Threat Detection API",
        version=PARSER_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.post(
    "/analyze",
    response_model=EmailAnalysisResponse,
    response_model_by_alias=True,
    tags=["Analysis"],
    summary="Analyze .eml email file for threat indicators"
)
async def analyze_email(file: UploadFile = File(...)):
    """
    Accepts an uploaded raw .eml file, parses RFC headers, verifies SPF/DKIM/DMARC status,
    extracts IOCs, maps the Received-header relay path, and produces a forensic risk score.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload."
        )

    # Read uploaded content
    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(exc)}"
        )

    # Validate file size
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please provide a valid .eml file."
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    try:
        analysis_result = analyze_email_bytes(content, file_name=file.filename)
        return analysis_result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Analysis failed for {file.filename}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and analyze the email file."
        )
