"""
Central Analyzer Orchestrator.
Coordinates email parsing, authentication checks, IOC extraction, relay analysis, and risk assessment.
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.models import (
    EmailAnalysisResponse,
    AnalysisMetadata,
    EmailMetadata,
    AuthResults,
    IOCs,
    RiskAssessment
)
from backend.header_parser import parse_email_headers
from backend.relay_parser import parse_relay_path
from backend.ioc_extractor import extract_iocs
from backend.risk_engine import calculate_risk

PARSER_VERSION = "1.0.0-prototype"


def generate_case_id() -> str:
    """Generates a unique forensic case ID (e.g. CASE-20260906-A1B2C3D4)."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:8].upper()
    return f"CASE-{date_str}-{unique_suffix}"


def analyze_email_bytes(
    raw_bytes: bytes,
    file_name: Optional[str] = "uploaded_email.eml",
    case_id: Optional[str] = None
) -> EmailAnalysisResponse:
    """
    Main analysis pipeline function.
    Safely parses raw email bytes and generates a forensic analysis report.
    """
    if not raw_bytes or len(raw_bytes.strip()) == 0:
        raise ValueError("Cannot analyze empty email content.")

    start_time = time.perf_counter()
    active_case_id = case_id or generate_case_id()
    analysis_ts = datetime.now(timezone.utc).isoformat()
    file_size = len(raw_bytes)

    # 1. Parse Headers & Body
    email_meta, auth_results, plain_body, html_body, msg_obj = parse_email_headers(raw_bytes)

    # 2. Parse Relay Path
    relay_hops = parse_relay_path(msg_obj)

    # 3. Extract IOCs
    header_emails = []
    if email_meta.from_address:
        header_emails.append(email_meta.from_address)
    if email_meta.reply_to:
        header_emails.append(email_meta.reply_to)
    if email_meta.return_path:
        header_emails.append(email_meta.return_path)
    header_emails.extend(email_meta.to)
    header_emails.extend(email_meta.cc)

    iocs = extract_iocs(plain_body, html_body, header_emails)

    # 4. Calculate Risk
    risk = calculate_risk(
        email_meta=email_meta,
        auth=auth_results,
        iocs=iocs,
        relay_hops=relay_hops,
        plain_body=plain_body
    )

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    metadata = AnalysisMetadata(
        analysis_timestamp=analysis_ts,
        parser_version=PARSER_VERSION,
        file_name=file_name,
        file_size_bytes=file_size,
        execution_time_ms=elapsed_ms
    )

    return EmailAnalysisResponse(
        case_id=active_case_id,
        email=email_meta,
        authentication=auth_results,
        iocs=iocs,
        relay_path=relay_hops,
        risk=risk,
        metadata=metadata
    )
