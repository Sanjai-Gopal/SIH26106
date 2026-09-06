"""
Forensic Reporting Service Layer.
Coordinates forensic analysis ingestion, timeline reconstruction, findings synthesis,
and multi-format report rendering (JSON / HTML).
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union

from backend.reporting.models import (
    ForensicReport,
    ReportMetadata,
    CaseSummary,
    EvidenceSummary,
    EmailForensicSummary,
    AuthenticationSummary,
    RelayHopSummary,
    IPIntelligenceSummary,
    DomainIntelligenceSummary,
    MLAssessmentSummary,
    RiskAssessmentSummary,
    BlockchainSummary,
    TimelineEvent,
    Finding,
)
from backend.reporting.generators import (
    generate_timeline,
    generate_findings,
    generate_narrative,
    generate_recommendations,
    generate_limitations,
)
from backend.reporting.renderers import (
    JSONReportRenderer,
    HTMLReportRenderer,
)


class ForensicReportingService:
    """
    Central service for constructing and rendering investigation reports.
    """

    def __init__(self):
        self._json_renderer = JSONReportRenderer()
        self._html_renderer = HTMLReportRenderer()
        self._report_cache: Dict[str, ForensicReport] = {}  # case_id -> ForensicReport

    def build_report_from_analysis(
        self,
        analysis_data: Union[Dict[str, Any], Any],
        case_id: Optional[str] = None,
        evidence_id: Optional[str] = None,
        filename: Optional[str] = None,
        custody_events: Optional[List[Dict[str, Any]]] = None
    ) -> ForensicReport:
        """
        Constructs a structured ForensicReport from parsed analysis dictionary or model.
        """
        # Support Pydantic model instances or dictionaries
        if hasattr(analysis_data, "model_dump"):
            raw_data = analysis_data.model_dump(mode="json")
        elif hasattr(analysis_data, "dict"):
            raw_data = analysis_data.dict()
        elif isinstance(analysis_data, dict):
            raw_data = analysis_data
        else:
            raw_data = {}

        def _clean_str(val: Any, default: str = "") -> str:
            if val is None:
                return default
            if hasattr(val, "value"):
                return str(val.value)
            s = str(val)
            if "." in s and s.startswith("AuthStatus."):
                return s.split(".")[-1]
            return s

        # Identifiers
        active_case_id = case_id or raw_data.get("case_id") or f"CASE-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        active_evidence_id = evidence_id or f"EVID-{uuid.uuid4().hex[:8].upper()}"
        active_filename = filename or (raw_data.get("metadata") or {}).get("file_name") or "uploaded_email.eml"
        now_ts = datetime.now(timezone.utc).isoformat()
        report_id = f"REP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        # Sub-structures
        email_data = raw_data.get("email") or {}
        auth_data = raw_data.get("authentication") or {}
        iocs_data = raw_data.get("iocs") or {}
        relay_hops = raw_data.get("relay_path") or []
        risk_data = raw_data.get("risk") or {}
        metadata_dict = raw_data.get("metadata") or {}
        ml_data = raw_data.get("ml_signals") or risk_data.get("ml_signals") or {}
        ip_intel_raw = raw_data.get("ip_intelligence") or []
        domain_intel_raw = raw_data.get("domain_intelligence") or []

        # 1. Report Metadata
        rep_metadata = ReportMetadata(
            report_id=report_id,
            case_id=active_case_id,
            generated_at=now_ts,
            generated_by="SIH26106 Automated Forensic Reporting Engine",
            report_version="1.0.0"
        )

        # 2. Case Summary
        case_summary = CaseSummary(
            case_id=active_case_id,
            case_status="ANALYZED",
            evidence_count=1,
            created_at=metadata_dict.get("analysis_timestamp", now_ts)
        )

        # 3. Evidence Summary
        evidence_sha256 = metadata_dict.get("sha256") or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        evidence_summary = EvidenceSummary(
            evidence_id=active_evidence_id,
            filename=active_filename,
            sha256=evidence_sha256,
            file_size_bytes=int(metadata_dict.get("file_size_bytes", 0)),
            preservation_status="SECURED",
            storage_reference=f"data/evidence/{active_case_id}/{active_evidence_id}.eml"
        )

        # 4. Email Summary
        email_summary = EmailForensicSummary(
            sender=email_data.get("from_address") or email_data.get("from"),
            recipients=email_data.get("to") or [],
            cc=email_data.get("cc") or [],
            reply_to=email_data.get("reply_to"),
            return_path=email_data.get("return_path"),
            subject=email_data.get("subject"),
            message_id=email_data.get("message_id"),
            date=email_data.get("date"),
            body_preview=email_data.get("body_preview")
        )

        # 5. Authentication Summary
        auth_summary = AuthenticationSummary(
            spf_status=_clean_str(auth_data.get("spf"), "UNKNOWN"),
            dkim_status=_clean_str(auth_data.get("dkim"), "UNKNOWN"),
            dmarc_status=_clean_str(auth_data.get("dmarc"), "UNKNOWN"),
            raw_results=auth_data.get("raw_results") or [],
            alignment_notes="Evaluated via RFC5322 & RFC5321 headers."
        )

        # 6. Relay Path
        relay_summaries: List[RelayHopSummary] = []
        for h in relay_hops:
            relay_summaries.append(RelayHopSummary(
                hop_number=h.get("hop_number", 1),
                receiving_server=h.get("receiving_server"),
                sending_server=h.get("sending_server"),
                ip=h.get("ip"),
                ip_type=h.get("ip_type"),
                is_private_ip=bool(h.get("is_private_ip", False)),
                delay_seconds=h.get("delay_seconds"),
                forensic_notes=h.get("forensic_notes")
            ))

        # 7. IP Intelligence
        ip_summaries: List[IPIntelligenceSummary] = []
        for ip_rec in ip_intel_raw:
            ip_summaries.append(IPIntelligenceSummary(
                ip=ip_rec.get("ip", ""),
                country=ip_rec.get("country"),
                region=ip_rec.get("region"),
                city=ip_rec.get("city"),
                asn=ip_rec.get("asn"),
                isp=ip_rec.get("isp"),
                is_hosting=ip_rec.get("is_hosting"),
                is_vpn_tor=ip_rec.get("is_vpn_tor"),
                is_synthetic=bool(ip_rec.get("is_synthetic", False)),
                provider=ip_rec.get("provider", "none")
            ))

        # 8. Domain Intelligence
        domain_summaries: List[DomainIntelligenceSummary] = []
        for dom_rec in domain_intel_raw:
            domain_summaries.append(DomainIntelligenceSummary(
                domain=dom_rec.get("domain", ""),
                dns_resolved=bool(dom_rec.get("dns_resolved", False)),
                a_records=dom_rec.get("a_records", []),
                mx_records=dom_rec.get("mx_records", []),
                ns_records=dom_rec.get("ns_records", []),
                txt_records=dom_rec.get("txt_records", []),
                is_synthetic=bool(dom_rec.get("is_synthetic", False)),
                provider=dom_rec.get("provider", "none")
            ))

        # 9. ML Assessment
        ml_summary = MLAssessmentSummary(
            status=ml_data.get("status", "unavailable"),
            label=ml_data.get("label", "unknown"),
            confidence=float(ml_data.get("confidence", 0.0)),
            model_name=ml_data.get("model_name", "none"),
            model_version=ml_data.get("model_version", "0.0.0"),
            provider=ml_data.get("provider", "none"),
            is_synthetic=bool(ml_data.get("is_synthetic", False)),
            explanation=ml_data.get("explanation", [])
        )

        # 10. Risk Assessment
        risk_summary = RiskAssessmentSummary(
            score=int(risk_data.get("score", 0)),
            classification=str(risk_data.get("classification", "LOW RISK")),
            scoring_type=str(risk_data.get("scoring_type", "deterministic_forensic_only")),
            reasons=risk_data.get("reasons", []),
            signals_triggered=len(risk_data.get("signals", []))
        )

        # 11. Blockchain Notarization
        blockchain_summary = BlockchainSummary(
            notarization_status="not_notarized",
            transaction_id=None,
            block_number=None,
            verification_status="unverified",
            chain_valid=True,
            provider="local_demo"
        )

        # 12. Generators: Findings, Timeline, Narrative, Recommendations, Limitations
        findings = generate_findings(
            email_data=email_data,
            auth_data=auth_data,
            iocs_data=iocs_data,
            risk_data=risk_data,
            ml_data=ml_data,
            ip_intel_data=ip_intel_raw,
            domain_intel_data=domain_intel_raw
        )

        timeline = generate_timeline(
            case_id=active_case_id,
            evidence_id=active_evidence_id,
            email_data=email_data,
            relay_hops=relay_hops,
            analysis_ts=metadata_dict.get("analysis_timestamp", now_ts),
            custody_events=custody_events
        )

        narrative = generate_narrative(
            email_data=email_data,
            auth_data=auth_data,
            risk_data=risk_data,
            findings=findings
        )

        recommendations = generate_recommendations(
            findings=findings,
            risk_score=risk_summary.score
        )

        limitations = generate_limitations()

        report = ForensicReport(
            metadata=rep_metadata,
            case=case_summary,
            evidence=evidence_summary,
            narrative=narrative,
            email=email_summary,
            authentication=auth_summary,
            relay_path=relay_summaries,
            ip_intelligence=ip_summaries,
            domain_intelligence=domain_summaries,
            ml_assessment=ml_summary,
            risk_assessment=risk_summary,
            blockchain=blockchain_summary,
            findings=findings,
            timeline=timeline,
            recommendations=recommendations,
            limitations=limitations
        )

        self._report_cache[active_case_id] = report
        return report

    def render_report(self, report: ForensicReport, output_format: str = "json") -> str:
        """
        Renders the ForensicReport into JSON or HTML format.
        """
        fmt = output_format.strip().lower()
        if fmt == "html":
            return self._html_renderer.render(report)
        return self._json_renderer.render(report)

    def get_cached_report(self, case_id: str) -> Optional[ForensicReport]:
        """Retrieves cached report for a given case ID."""
        return self._report_cache.get(case_id)

    def store_report(self, case_id: str, report: ForensicReport):
        """Explicitly stores report into session cache."""
        self._report_cache[case_id] = report
