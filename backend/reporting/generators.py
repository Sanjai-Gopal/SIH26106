"""
Report Analysis Generators: Findings, Investigation Timelines, Narratives, and Recommendations.
Transforms raw and parsed forensic analysis structures into structured investigative intelligence.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from backend.reporting.models import (
    TimelineEvent,
    Finding,
    FindingCategory,
    FindingSeverity,
    InvestigatorRecommendation,
    InvestigativeNarrative,
    ForensicLimitations,
)


def generate_timeline(
    case_id: str,
    evidence_id: str,
    email_data: Dict[str, Any],
    relay_hops: List[Dict[str, Any]],
    analysis_ts: str,
    custody_events: Optional[List[Dict[str, Any]]] = None
) -> List[TimelineEvent]:
    """
    Constructs a normalized, chronologically sorted investigation timeline from
    email headers, Received hops, analysis timestamps, and custody events.
    """
    events: List[TimelineEvent] = []

    # 1. Email Date Header Event
    email_date = email_data.get("date")
    if email_date:
        events.append(TimelineEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="email_originated",
            timestamp=str(email_date),
            actor=str(email_data.get("from_address") or "unknown_sender"),
            source="email_date_header",
            description=f"Email message created with Subject: '{email_data.get('subject') or 'No Subject'}'"
        ))

    # 2. Relay Hops Events (ordered chronologically: hop 1 = earliest sender hop)
    for hop in relay_hops:
        hop_num = hop.get("hop_number", 1)
        hop_ts = hop.get("timestamp") or analysis_ts
        sending_srv = hop.get("sending_server") or "unspecified_host"
        receiving_srv = hop.get("receiving_server") or "unspecified_mta"
        ip_addr = hop.get("ip") or "no_ip"

        events.append(TimelineEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="relay_transit",
            timestamp=str(hop_ts),
            actor=f"{sending_srv} ({ip_addr})",
            source=f"received_header_hop_{hop_num}",
            description=f"Hop #{hop_num}: Transmitted from '{sending_srv}' to '{receiving_srv}' (IP: {ip_addr})"
        ))

    # 3. Evidence Intake & Analysis Timestamp Event
    events.append(TimelineEvent(
        event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
        case_id=case_id,
        evidence_id=evidence_id,
        event_type="forensic_analysis_executed",
        timestamp=analysis_ts,
        actor="SIH26106 Automated Analyzer",
        source="system_intake",
        description="Digital evidence ingested, SHA-256 computed, and forensic inspection completed."
    ))

    # 4. Custody / Blockchain Notarization Events if present
    if custody_events:
        for c_evt in custody_events:
            events.append(TimelineEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                case_id=case_id,
                evidence_id=evidence_id,
                event_type=str(c_evt.get("action", "custody_event")),
                timestamp=str(c_evt.get("timestamp", analysis_ts)),
                actor=str(c_evt.get("actor", "system")),
                source="blockchain_ledger",
                description=f"Ledger Transaction {c_evt.get('transaction_id', 'N/A')}: {c_evt.get('action', 'Custody Action')}"
            ))

    return events


def _normalize_auth(val: Any) -> str:
    if val is None:
        return "UNKNOWN"
    if hasattr(val, "value"):
        return str(val.value).upper()
    s = str(val).upper()
    if "." in s and s.startswith("AUTHSTATUS."):
        return s.split(".")[-1]
    return s


def generate_findings(
    email_data: Dict[str, Any],
    auth_data: Dict[str, Any],
    iocs_data: Dict[str, Any],
    risk_data: Dict[str, Any],
    ml_data: Optional[Dict[str, Any]] = None,
    ip_intel_data: Optional[List[Dict[str, Any]]] = None,
    domain_intel_data: Optional[List[Dict[str, Any]]] = None
) -> List[Finding]:
    """
    Evaluates analysis artifacts to generate structured, traceable forensic findings.
    """
    findings: List[Finding] = []
    finding_idx = 1

    # 1. Authentication Failures
    spf_status = _normalize_auth(auth_data.get("spf"))
    dkim_status = _normalize_auth(auth_data.get("dkim"))
    dmarc_status = _normalize_auth(auth_data.get("dmarc"))

    if dmarc_status == "FAIL":
        findings.append(Finding(
            finding_id=f"FND-{finding_idx:03d}",
            category=FindingCategory.AUTHENTICATION,
            severity=FindingSeverity.CRITICAL,
            title="DMARC Policy Verification Failed",
            description="DMARC alignment policy failed for the domain specified in the From header. "
                        "Indicates unauthorized sending source or spoofed domain identity.",
            evidence_reference="Authentication-Results: dmarc=fail",
            confidence="HIGH",
            supporting_signals=["AUTH_DMARC_FAIL"],
            limitations="DMARC evaluation relies on DNS records published by the sender domain."
        ))
        finding_idx += 1

    if spf_status == "FAIL":
        findings.append(Finding(
            finding_id=f"FND-{finding_idx:03d}",
            category=FindingCategory.AUTHENTICATION,
            severity=FindingSeverity.HIGH,
            title="SPF Sender Authentication Failed",
            description="Transmitting server IP was explicitly unauthorized under the sender's published SPF policy.",
            evidence_reference="Received-SPF: fail",
            confidence="HIGH",
            supporting_signals=["AUTH_SPF_FAIL"]
        ))
        finding_idx += 1

    if dkim_status == "FAIL":
        findings.append(Finding(
            finding_id=f"FND-{finding_idx:03d}",
            category=FindingCategory.AUTHENTICATION,
            severity=FindingSeverity.HIGH,
            title="DKIM Signature Integrity Failed",
            description="Cryptographic DKIM body or header signature verification failed, indicating payload tampering.",
            evidence_reference="DKIM-Signature: fail",
            confidence="HIGH",
            supporting_signals=["AUTH_DKIM_FAIL"]
        ))
        finding_idx += 1

    # 2. Header Mismatch / Sender Impersonation
    from_addr = str(email_data.get("from_address") or email_data.get("from") or "")
    reply_to = str(email_data.get("reply_to") or "")

    if from_addr and reply_to and from_addr.lower() != reply_to.lower():
        from_domain = from_addr.split("@")[-1] if "@" in from_addr else ""
        reply_domain = reply_to.split("@")[-1] if "@" in reply_to else ""
        if from_domain != reply_domain:
            findings.append(Finding(
                finding_id=f"FND-{finding_idx:03d}",
                category=FindingCategory.SENDER_IDENTITY,
                severity=FindingSeverity.HIGH,
                title="From vs. Reply-To Domain Discrepancy",
                description=f"Reply-To domain '{reply_domain}' does not align with From domain '{from_domain}'. "
                            f"Commonly observed in Business Email Compromise (BEC) and phishing campaigns.",
                evidence_reference=f"Headers: From: <{from_addr}> vs. Reply-To: <{reply_to}>",
                confidence="HIGH",
                supporting_signals=["REPLY_TO_DOMAIN_MISMATCH"],
                limitations="Legitimate mailing lists occasionally rewrite Reply-To headers."
            ))
            finding_idx += 1

    # 3. Content Heuristics & Trigger Signals
    signals = risk_data.get("signals", [])
    for sig in signals:
        sig_name = sig.get("name", "") if isinstance(sig, dict) else getattr(sig, "name", "")
        sig_desc = sig.get("description", "") if isinstance(sig, dict) else getattr(sig, "description", "")

        if sig_name == "FINANCIAL_BEC_LANGUAGE":
            findings.append(Finding(
                finding_id=f"FND-{finding_idx:03d}",
                category=FindingCategory.BEC,
                severity=FindingSeverity.HIGH,
                title="Financial / Wire Transfer Urgency Indicators",
                description=f"Message body contains financial manipulation phrases. {sig_desc}",
                evidence_reference="Email Body Text Analysis",
                confidence="MEDIUM",
                supporting_signals=["FINANCIAL_BEC_LANGUAGE"]
            ))
            finding_idx += 1
        elif sig_name == "URGENCY_LANGUAGE":
            findings.append(Finding(
                finding_id=f"FND-{finding_idx:03d}",
                category=FindingCategory.PHISHING,
                severity=FindingSeverity.MEDIUM,
                title="Psychological Urgency & Coercion Keywords Detected",
                description=f"Message employs panic or urgent countdown triggers. {sig_desc}",
                evidence_reference="Email Subject & Body",
                confidence="MEDIUM",
                supporting_signals=["URGENCY_LANGUAGE"]
            ))
            finding_idx += 1
        elif sig_name == "RAW_IP_URL":
            findings.append(Finding(
                finding_id=f"FND-{finding_idx:03d}",
                category=FindingCategory.PHISHING,
                severity=FindingSeverity.HIGH,
                title="Suspicious Direct IP URL in Content",
                description="Hyperlinks directly target numeric IP addresses instead of registered domain names.",
                evidence_reference="Extracted IOC URLs",
                confidence="HIGH",
                supporting_signals=["RAW_IP_URL"]
            ))
            finding_idx += 1

    # 4. ML Model Prediction Findings
    if ml_data and ml_data.get("status") == "available":
        ml_label = str(ml_data.get("label", "unknown")).lower()
        ml_conf = float(ml_data.get("confidence", 0.0))
        if ml_label in ("phishing", "bec", "impersonation", "malicious"):
            findings.append(Finding(
                finding_id=f"FND-{finding_idx:03d}",
                category=FindingCategory.ML,
                severity=FindingSeverity.HIGH if ml_conf > 0.8 else FindingSeverity.MEDIUM,
                title=f"AI/ML Model Threat Classification: {ml_label.upper()}",
                description=f"Statistical NLP inference engine ({ml_data.get('model_name', 'classifier')}) "
                            f"classified content as '{ml_label}' with {ml_conf * 100:.1f}% confidence.",
                evidence_reference=f"ML Engine ({ml_data.get('provider', 'inference')})",
                confidence="MEDIUM",
                supporting_signals=[f"ML_{ml_label.upper()}"],
                limitations="ML model score is a heuristic classification and not a calibrated mathematical probability."
            ))
            finding_idx += 1

    return findings


def generate_narrative(
    email_data: Dict[str, Any],
    auth_data: Dict[str, Any],
    risk_data: Dict[str, Any],
    findings: List[Finding]
) -> InvestigativeNarrative:
    """
    Generates analyst narrative clearly separating Confirmed Facts, Expert Assessments, and Forensic Uncertainties.
    """
    confirmed_facts: List[str] = []
    expert_assessments: List[str] = []
    forensic_uncertainties: List[str] = []

    # Facts
    spf_val = _normalize_auth(auth_data.get("spf"))
    dkim_val = _normalize_auth(auth_data.get("dkim"))
    dmarc_val = _normalize_auth(auth_data.get("dmarc"))

    if spf_val == "FAIL":
        confirmed_facts.append("SPF authentication failed: sender IP is not authorized in DNS SPF record.")
    elif spf_val == "PASS":
        confirmed_facts.append("SPF authentication passed: sender IP is authorized.")

    if dkim_val == "FAIL":
        confirmed_facts.append("DKIM cryptographic signature verification failed: signature is invalid or altered.")
    elif dkim_val == "PASS":
        confirmed_facts.append("DKIM cryptographic signature verified successfully.")

    if dmarc_val == "FAIL":
        confirmed_facts.append("DMARC alignment failed: From domain policy rejected the message origin.")

    from_addr = email_data.get("from_address") or email_data.get("from")
    reply_to = email_data.get("reply_to")
    if from_addr and reply_to:
        if from_addr != reply_to:
            confirmed_facts.append(
                f"From address '{from_addr}' differs from Reply-To address '{reply_to}'."
            )

    if not confirmed_facts:
        confirmed_facts.append("Email headers conform to basic RFC syntax with no explicit cryptographic signature failures.")

    # Assessments
    risk_score = risk_data.get("score", 0)
    risk_class = risk_data.get("classification", "LOW RISK")
    expert_assessments.append(f"Overall threat assessment evaluated at {risk_score}/100 ({risk_class}).")

    if any(f.category == FindingCategory.BEC for f in findings):
        expert_assessments.append("High probability of Business Email Compromise (BEC) aiming for financial redirect.")
    elif any(f.category == FindingCategory.PHISHING for f in findings):
        expert_assessments.append("Elevated likelihood of credential harvesting or phishing manipulation.")
    elif risk_score <= 25:
        expert_assessments.append("Forensic signals indicate low threat probability under current rule set.")

    # Uncertainties
    forensic_uncertainties.append(
        "IP geolocation reflects network routing infrastructure, not the physical location of the human adversary."
    )
    forensic_uncertainties.append(
        "Received headers before the first authenticated MTA hop may be forged or manipulated by untrusted intermediate relays."
    )
    forensic_uncertainties.append(
        "ML confidence score represents pattern classification certainty, not a mathematically calibrated probability."
    )

    return InvestigativeNarrative(
        confirmed_facts=confirmed_facts,
        expert_assessments=expert_assessments,
        forensic_uncertainties=forensic_uncertainties
    )


def generate_recommendations(
    findings: List[Finding],
    risk_score: int
) -> List[InvestigatorRecommendation]:
    """
    Generates actionable, proportionate investigator recommendations based strictly on findings.
    """
    recs: List[InvestigatorRecommendation] = []
    rec_idx = 1

    # Critical / High Risk Escalation
    if risk_score >= 56:
        recs.append(InvestigatorRecommendation(
            recommendation_id=f"REC-{rec_idx:03d}",
            priority="CRITICAL" if risk_score >= 80 else "HIGH",
            title="Quarantine Message and Notify Target Recipient",
            action_required="Block message delivery, isolate affected mailboxes, and alert recipient against clicking links or executing financial instructions.",
            rationale="High-risk forensic indicators (authentication failure or BEC triggers) detected."
        ))
        rec_idx += 1

    # BEC recommendations
    if any(f.category in (FindingCategory.BEC, FindingCategory.SENDER_IDENTITY) for f in findings):
        recs.append(InvestigatorRecommendation(
            recommendation_id=f"REC-{rec_idx:03d}",
            priority="HIGH",
            title="Verify Financial & Wire Requests Out-of-Band",
            action_required="Contact the purported sender via a verified telephone number or internal messaging system before processing any payment or account changes.",
            rationale="Discrepancies in Reply-To domain indicate potential impersonation."
        ))
        rec_idx += 1

    # Phishing / IOC recommendations
    if any(f.category == FindingCategory.PHISHING for f in findings):
        recs.append(InvestigatorRecommendation(
            recommendation_id=f"REC-{rec_idx:03d}",
            priority="HIGH",
            title="Blacklist Detected IOC Domains and Direct IPs",
            action_required="Submit extracted malicious URLs and IP hostnames to organization firewall/EDR blacklists.",
            rationale="Content contains suspicious URLs matching credential theft patterns."
        ))
        rec_idx += 1

    # Baseline preservation recommendation
    recs.append(InvestigatorRecommendation(
        recommendation_id=f"REC-{rec_idx:03d}",
        priority="MEDIUM",
        title="Preserve Immutable Evidence & SHA-256 Digest",
        action_required="Ensure raw .eml bytes remain unaltered on disk and maintain blockchain/notarization audit records for chain of custody.",
        rationale="Guarantees courtroom admissibility and non-repudiation of forensic findings."
    ))

    return recs


def generate_limitations() -> ForensicLimitations:
    """Standardized evidentiary caveats."""
    return ForensicLimitations(
        disclaimers=[
            "IP Geolocation Caveat: Geolocation estimates reflect datacenter or ISP network infrastructure routing and do NOT prove the physical location of the threat actor.",
            "Header Provenance Caveat: Headers recorded prior to the boundary MTA of the receiving organization are susceptible to forgeable synthetic insertion by attackers.",
            "ML Calibration Caveat: AI/ML classifications reflect heuristic statistical pattern recognition and should be verified alongside deterministic cryptographic authentication (SPF/DKIM/DMARC).",
            "Attribution Caveat: Digital evidence proves technical mechanics of transmission; legal attribution requires corroborated ISP subscriber logs and lawful subpoenas."
        ]
    )
