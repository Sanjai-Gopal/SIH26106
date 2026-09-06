"""
Data Models and Schemas for Forensic Threat Reporting, Findings, and Timeline Analysis.
Provides structured, normalized, and traceable reports for digital evidence investigations.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FindingSeverity(str, Enum):
    INFORMATIONAL = "INFORMATIONAL"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingCategory(str, Enum):
    AUTHENTICATION = "authentication"
    SENDER_IDENTITY = "sender_identity"
    RELAY_INFRASTRUCTURE = "relay_infrastructure"
    IP_INTELLIGENCE = "ip_intelligence"
    DOMAIN_INTELLIGENCE = "domain_intelligence"
    PHISHING = "phishing"
    BEC = "bec"
    IMPERSONATION = "impersonation"
    ML = "ml"
    MALWARE = "malware"
    EVIDENCE_INTEGRITY = "evidence_integrity"


class ReportMetadata(BaseModel):
    report_id: str = Field(..., description="Unique report identifier (e.g. REP-20260906-ABCD)")
    case_id: str = Field(..., description="Associated forensic investigation case ID")
    generated_at: str = Field(..., description="ISO 8601 UTC timestamp of report generation")
    generated_by: str = Field(default="SIH26106 Automated Forensic Reporting Engine", description="Reporting agent or investigator")
    report_version: str = Field(default="1.0.0", description="Forensic report schema version")


class CaseSummary(BaseModel):
    case_id: str = Field(..., description="Investigation case ID")
    case_status: str = Field(default="ANALYZED", description="Status of investigation: OPEN | ANALYZED | CLOSED")
    evidence_count: int = Field(default=1, description="Number of evidence artifacts analyzed")
    created_at: Optional[str] = Field(default=None, description="Case creation timestamp")


class EvidenceSummary(BaseModel):
    evidence_id: str = Field(..., description="Unique digital evidence identifier")
    filename: str = Field(..., description="Original artifact filename")
    sha256: str = Field(..., description="Cryptographic SHA-256 digest of original raw bytes")
    file_size_bytes: int = Field(..., description="Size in bytes")
    preservation_status: str = Field(default="SECURED", description="Physical preservation state")
    storage_reference: Optional[str] = Field(default=None, description="Internal storage reference / custody pointer")


class EmailForensicSummary(BaseModel):
    sender: Optional[str] = Field(default=None, description="Sender from From header")
    recipients: List[str] = Field(default_factory=list, description="Recipients from To header")
    cc: List[str] = Field(default_factory=list, description="Carbon copy recipients")
    reply_to: Optional[str] = Field(default=None, description="Reply-To header address")
    return_path: Optional[str] = Field(default=None, description="Return-Path address")
    subject: Optional[str] = Field(default=None, description="Email subject line")
    message_id: Optional[str] = Field(default=None, description="Message-ID header")
    date: Optional[str] = Field(default=None, description="Date header value")
    body_preview: Optional[str] = Field(default=None, description="Sanitized preview of plain body")


class AuthenticationSummary(BaseModel):
    spf_status: str = Field(default="UNKNOWN", description="SPF verification result")
    dkim_status: str = Field(default="UNKNOWN", description="DKIM verification result")
    dmarc_status: str = Field(default="UNKNOWN", description="DMARC verification result")
    raw_results: List[str] = Field(default_factory=list, description="Raw authentication headers")
    alignment_notes: Optional[str] = Field(default=None, description="DMARC/SPF/DKIM domain alignment commentary")


class RelayHopSummary(BaseModel):
    hop_number: int = Field(..., description="1-indexed hop order (1 = closest to sender)")
    receiving_server: Optional[str] = Field(default=None, description="Receiving MTA server")
    sending_server: Optional[str] = Field(default=None, description="Transmitting server")
    ip: Optional[str] = Field(default=None, description="Validated IP address")
    ip_type: Optional[str] = Field(default=None, description="IP classification")
    is_private_ip: bool = Field(default=False, description="True if RFC1918 private / loopback")
    delay_seconds: Optional[float] = Field(default=None, description="Transit delay in seconds")
    forensic_notes: Optional[str] = Field(default=None, description="Relay integrity observations")


class IPIntelligenceSummary(BaseModel):
    ip: str = Field(..., description="IP address evaluated")
    country: Optional[str] = Field(default=None, description="Estimated country")
    region: Optional[str] = Field(default=None, description="Estimated region/state")
    city: Optional[str] = Field(default=None, description="Estimated city")
    asn: Optional[str] = Field(default=None, description="Autonomous System Number")
    isp: Optional[str] = Field(default=None, description="ISP / Organization")
    is_hosting: Optional[bool] = Field(default=None, description="Cloud / Hosting datacenter indicator")
    is_vpn_tor: Optional[bool] = Field(default=None, description="VPN or TOR exit node indicator")
    is_synthetic: bool = Field(default=False, description="True if mock demo intelligence")
    provider: str = Field(default="none", description="Intelligence provider name")
    disclaimer: str = Field(
        default="Geolocation reflects network routing infrastructure, not physical attacker location.",
        description="Evidentiary disclaimer"
    )


class DomainIntelligenceSummary(BaseModel):
    domain: str = Field(..., description="Extracted domain name")
    dns_resolved: bool = Field(default=False, description="True if DNS resolution succeeded")
    a_records: List[str] = Field(default_factory=list, description="A / IPv4 records")
    mx_records: List[str] = Field(default_factory=list, description="MX mail exchanger records")
    ns_records: List[str] = Field(default_factory=list, description="NS name server records")
    txt_records: List[str] = Field(default_factory=list, description="TXT records (SPF/DMARC)")
    is_synthetic: bool = Field(default=False, description="True if synthetic demo profile")
    provider: str = Field(default="none", description="Domain intelligence provider")


class MLAssessmentSummary(BaseModel):
    status: str = Field(default="unavailable", description="ML inference status: available | unavailable | error")
    label: str = Field(default="unknown", description="Classification: benign | phishing | bec | impersonation | malicious")
    confidence: float = Field(default=0.0, description="Model prediction confidence (uncalibrated)")
    model_name: str = Field(default="none", description="Model identifier")
    model_version: str = Field(default="0.0.0", description="Model version")
    provider: str = Field(default="none", description="Inference engine provider")
    is_synthetic: bool = Field(default=False, description="True if synthetic demo heuristic")
    explanation: List[str] = Field(default_factory=list, description="Model explainability tokens or rationale")


class RiskAssessmentSummary(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Composite risk score 0 to 100")
    classification: str = Field(..., description="Risk tier: LOW RISK | MEDIUM RISK | HIGH RISK | CRITICAL RISK")
    scoring_type: str = Field(default="deterministic_forensic_only", description="Scoring methodology")
    reasons: List[str] = Field(default_factory=list, description="Key risk rationale points")
    signals_triggered: int = Field(default=0, description="Count of triggered forensic rules")


class BlockchainSummary(BaseModel):
    notarization_status: str = Field(default="not_notarized", description="not_notarized | notarized | unavailable")
    transaction_id: Optional[str] = Field(default=None, description="Ledger transaction identifier")
    block_number: Optional[int] = Field(default=None, description="Ledger block number")
    verification_status: str = Field(default="unverified", description="verified | unverified | tampered")
    chain_valid: bool = Field(default=True, description="Ledger cryptographic hash chain validity")
    record_hash: Optional[str] = Field(default=None, description="Sealed block hash")
    provider: str = Field(default="local_demo", description="Blockchain provider name")


class TimelineEvent(BaseModel):
    event_id: str = Field(..., description="Unique timeline event identifier")
    case_id: str = Field(..., description="Case ID")
    evidence_id: Optional[str] = Field(default=None, description="Associated evidence ID")
    event_type: str = Field(..., description="Action type (e.g. evidence_created, email_sent, email_relayed, analyzed)")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of occurrence")
    actor: str = Field(default="system", description="Entity/Actor responsible")
    source: str = Field(default="email_header", description="Source of timeline event")
    description: str = Field(..., description="Chronological event summary")


class Finding(BaseModel):
    finding_id: str = Field(..., description="Unique finding ID (e.g. FND-001)")
    category: FindingCategory = Field(..., description="Classification category")
    severity: FindingSeverity = Field(..., description="Severity level")
    title: str = Field(..., description="Brief finding headline")
    description: str = Field(..., description="Detailed forensic explanation")
    evidence_reference: str = Field(..., description="Traceable pointer (header, hop, IOC, etc.)")
    confidence: str = Field(default="HIGH", description="Confidence in finding: HIGH | MEDIUM | LOW")
    supporting_signals: List[str] = Field(default_factory=list, description="Underlying signals or rule names")
    limitations: Optional[str] = Field(default=None, description="Forensic bounds or caveats")


class InvestigatorRecommendation(BaseModel):
    recommendation_id: str = Field(..., description="Unique recommendation ID (e.g. REC-001)")
    priority: str = Field(default="MEDIUM", description="Action priority: CRITICAL | HIGH | MEDIUM | LOW")
    title: str = Field(..., description="Action summary")
    action_required: str = Field(..., description="Concrete forensic or security step")
    rationale: str = Field(..., description="Why this recommendation is necessary based on findings")


class InvestigativeNarrative(BaseModel):
    confirmed_facts: List[str] = Field(
        default_factory=list,
        description="Factual observations verified by headers or cryptographic signatures"
    )
    expert_assessments: List[str] = Field(
        default_factory=list,
        description="Forensic risk judgments and threat classification assessments"
    )
    forensic_uncertainties: List[str] = Field(
        default_factory=list,
        description="Explicit limitations, unverified routing boundaries, and approximate data"
    )


class ForensicLimitations(BaseModel):
    disclaimers: List[str] = Field(
        default_factory=list,
        description="Standard evidentiary caveats regarding IP geolocation, header forging, and ML certainty"
    )


class ForensicReport(BaseModel):
    """
    Complete structured forensic intelligence and investigation report.
    Consolidates case metadata, evidence, header parsing, intelligence, risk, findings, timeline, and limitations.
    """
    metadata: ReportMetadata
    case: CaseSummary
    evidence: EvidenceSummary
    narrative: InvestigativeNarrative
    email: EmailForensicSummary
    authentication: AuthenticationSummary
    relay_path: List[RelayHopSummary] = Field(default_factory=list)
    ip_intelligence: List[IPIntelligenceSummary] = Field(default_factory=list)
    domain_intelligence: List[DomainIntelligenceSummary] = Field(default_factory=list)
    ml_assessment: MLAssessmentSummary
    risk_assessment: RiskAssessmentSummary
    blockchain: BlockchainSummary
    findings: List[Finding] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    recommendations: List[InvestigatorRecommendation] = Field(default_factory=list)
    limitations: ForensicLimitations
