# Forensic Threat Reporting & Investigation Workflow

## Overview

The SIH26106 Forensic Reporting Layer synthesizes raw header parsing, cryptographic authentication, IOC extraction, relay analysis, network/domain intelligence, ML inference, and blockchain audit logs into a unified, actionable, and courtroom-admissible forensic investigation report.

```
Parsed Analysis & Forensic Signals
               ↓
ForensicReportingService.build_report_from_analysis()
               ↓
Generators (Timeline, Traceable Findings, Facts vs. Uncertainties, Recommendations)
               ↓
Structured ForensicReport Object (Pydantic Schema)
               ↓
Renderers (JSONReportRenderer / HTMLReportRenderer / Extensible PDF)
               ↓
Investigator Dashboard & Courtroom Artifacts
```

---

## Key Reporting Architectural Principles

1. **Analysis Decoupling**: The reporting layer is a consumer and synthesizer of analysis data, not the source of truth for raw forensic parsing.
2. **Strict Facts vs. Assessments vs. Uncertainties Separation**:
   - **Confirmed Facts**: Explicit header or cryptographic observations (e.g. SPF failed, Reply-To mismatch).
   - **Expert Assessments**: Algorithmic and heuristic risk judgments (e.g. elevated phishing likelihood).
   - **Forensic Uncertainties**: Explicit disclosure of routing and heuristic limitations (e.g. unverified relay boundaries, approximate IP geolocations).
3. **Traceability**: Every finding references a specific verifiable header, hop number, IOC, or ML provider output.
4. **No Attribution Fabrication**: The system explicitly notes that network infrastructure geolocations and IP hops reflect routing nodes, not the verified physical identity or human location of an attacker.

---

## Supported Report Formats

- **JSON Format (`?format=json`)**: Standardized, machine-readable JSON format suitable for SIEM/SOAR ingestion and programmatic auditing.
- **HTML Executive Report (`?format=html`)**: Standalone, dark-mode, single-page executive document designed for investigators and legal counsel.
- **Extensible PDF Driver**: An abstract renderer interface (`PDFReportRenderer`) designed for future headless browser or Weasyprint rendering without altering business logic.

---

## API Endpoints

- `GET /cases/{case_id}/report`: Returns full structured forensic report in JSON (default) or HTML (`?format=html`).
- `GET /cases/{case_id}/timeline`: Returns ordered chronological investigation events.
- `GET /cases/{case_id}/findings`: Returns categorized, severity-ranked forensic findings with evidence references.
- `POST /cases/{case_id}/generate-report`: Generates and caches report directly from analysis payload.

---

## Security & Privacy Model

- **Strict XSS Protection**: All untrusted email strings (Subject, From, To, Body previews, URLs, IP hostnames) are strictly escaped via `html.escape` before inclusion in HTML documents.
- **No External Outbound Calls**: Report generation is entirely offline and deterministic; no external URLs are crawled during report compilation.
- **Evidence Path Protection**: Internal filesystem directories and server paths are never exposed in user-facing reports.
- **Data Minimization**: Minimizes duplicate raw payload storage while maintaining complete hash provenance.

---

## Forensic Limitations & Legal Disclaimers

Every generated report automatically appends mandatory evidentiary caveats:
1. **IP Geolocation**: Reflects network routing infrastructure (ISP/cloud), not proof of the adversary's physical whereabouts.
2. **Relay Headers**: Headers recorded prior to the boundary MTA of the receiving organization are susceptible to forgeable synthetic insertion.
3. **ML Calibration**: Statistical classifier confidence represents heuristic pattern recognition, not a calibrated mathematical probability.
