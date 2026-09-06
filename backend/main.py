"""
SIH26106 Email Threat Detection, GeoLocation & Forensic Intelligence Platform.
FastAPI Application Entry Point with Case Management & Evidence Persistence.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import Optional

from backend.models import EmailAnalysisResponse, HealthResponse
from backend.db_models import CaseListResponse, CaseDetailResponse, EvidenceRecord
from backend.analyzer import PARSER_VERSION
from backend.database import init_db
from backend.case_service import CaseService

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend.main")

# Max upload size limit: 15MB
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

# Initialize DB schema on module load
try:
    init_db()
except Exception as exc:
    logger.warning(f"Initial DB check: {exc}")

# Default Case Service instance
case_service = CaseService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: ensure database schema on startup."""
    try:
        init_db()
        logger.info("Forensic database schema verified and initialized.")
    except Exception as exc:
        logger.error(f"Database initialization failed: {exc}", exc_info=True)
    yield


app = FastAPI(
    title="SIH26106 Email Threat Detection API",
    description="Forensic analysis pipeline for .eml email threats, authentication validation, IOC extraction, relay tracing, and evidence persistence.",
    version=PARSER_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
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
    summary="Analyze .eml email file and persist case evidence"
)
async def analyze_email(file: UploadFile = File(...)):
    """
    Accepts an uploaded raw .eml file, parses RFC headers, verifies SPF/DKIM/DMARC status,
    extracts IOCs, maps the Received-header relay path, computes exact SHA-256 payload hash,
    stores case & evidence in SQLite, and returns a structured forensic risk report.
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
        analysis_result = case_service.process_and_store_email(
            raw_bytes=content,
            filename=file.filename
        )
        return analysis_result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Analysis and persistence failed for {file.filename}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and analyze the email file."
        )


@app.get(
    "/cases",
    response_model=CaseListResponse,
    tags=["Cases"],
    summary="List stored forensic cases"
)
async def list_cases(
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset")
):
    """Retrieves paginated list of analyzed cases sorted newest first."""
    return case_service.list_cases(limit=limit, offset=offset)


@app.get(
    "/cases/{case_id}",
    response_model=CaseDetailResponse,
    tags=["Cases"],
    summary="Get case details and forensic analysis report"
)
async def get_case(case_id: str):
    """Fetches case metadata, associated digital evidence record, and full analysis report."""
    case_detail = case_service.get_case_detail(case_id)
    if not case_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found."
        )
    return case_detail


@app.get(
    "/cases/{case_id}/evidence",
    response_model=EvidenceRecord,
    tags=["Cases"],
    summary="Get digital evidence and SHA-256 hash for a case"
)
async def get_case_evidence(case_id: str):
    """Fetches digital evidence, exact SHA-256 digest, and chain-of-custody reference for a case."""
    evidence = case_service.get_case_evidence(case_id)
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence for case ID '{case_id}' was not found."
        )
    return evidence
