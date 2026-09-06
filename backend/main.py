from fastapi import FastAPI, UploadFile, File, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import logging

from backend.models import EmailAnalysisResponse, HealthResponse
from backend.analyzer import analyze_email_bytes, PARSER_VERSION
from backend.reporting import (
    ForensicReportingService,
    ForensicReport,
    TimelineEvent,
    Finding,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend.main")

# Max upload size limit: 15MB
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

# Initialize Reporting Service singleton
reporting_service = ForensicReportingService()

app = FastAPI(
    title="SIH26106 Email Threat Detection API",
    description="Forensic analysis pipeline for .eml email threats, authentication validation, IOC extraction, relay tracing, and forensic report generation.",
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
    extracts IOCs, maps the Received-header relay path, produces a forensic risk score,
    and synthesizes a full investigation report.
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
        # Automatically generate and cache forensic report for the case
        reporting_service.build_report_from_analysis(
            analysis_data=analysis_result,
            case_id=analysis_result.case_id,
            filename=file.filename
        )
        return analysis_result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Analysis failed for {file.filename}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and analyze the email file."
        )


# =====================================================================
# Forensic Reporting & Investigation Workflow Endpoints
# =====================================================================

@app.get(
    "/cases/{case_id}/report",
    tags=["Reporting"],
    summary="Get comprehensive forensic investigation report in JSON or HTML"
)
async def get_case_report(
    case_id: str,
    format: str = Query(default="json", description="Output format: 'json' | 'html'")
):
    """
    Retrieves full forensic report for a case. Supports structured JSON (for SIEM/automation)
    and executive single-page HTML report for investigator review.
    """
    report = reporting_service.get_cached_report(case_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forensic report for case ID '{case_id}' was not found. Please analyze the email first or generate report."
        )

    if format.lower() == "html":
        html_content = reporting_service.render_report(report, output_format="html")
        return HTMLResponse(content=html_content, status_code=200)

    return JSONResponse(content=report.model_dump(by_alias=True), status_code=200)


@app.get(
    "/cases/{case_id}/timeline",
    response_model=List[TimelineEvent],
    tags=["Reporting"],
    summary="Get chronological investigation timeline for a case"
)
async def get_case_timeline(case_id: str):
    """
    Retrieves normalized, chronologically sorted timeline of email origination,
    relay hops transit, analysis execution, and custody events.
    """
    report = reporting_service.get_cached_report(case_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timeline for case ID '{case_id}' not found."
        )
    return report.timeline


@app.get(
    "/cases/{case_id}/findings",
    response_model=List[Finding],
    tags=["Reporting"],
    summary="Get categorized and traceable forensic findings"
)
async def get_case_findings(case_id: str):
    """
    Retrieves structured forensic findings with category, severity, evidence references,
    and supporting signal traceability.
    """
    report = reporting_service.get_cached_report(case_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Findings for case ID '{case_id}' not found."
        )
    return report.findings


@app.post(
    "/cases/{case_id}/generate-report",
    response_model=ForensicReport,
    tags=["Reporting"],
    summary="Generate and cache a forensic report from analysis data"
)
async def generate_case_report(case_id: str, analysis_payload: Dict[str, Any]):
    """
    Generates a structured ForensicReport from an analysis dictionary payload and caches it.
    """
    try:
        report = reporting_service.build_report_from_analysis(
            analysis_data=analysis_payload,
            case_id=case_id
        )
        return report
    except Exception as exc:
        logger.error(f"Failed to generate report for case {case_id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to synthesize forensic report: {str(exc)}"
        )
