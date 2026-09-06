"""
Report Renderers: JSON, HTML, and extensible PDF interfaces.
Produces clean, secure, and professional forensic investigation reports with strict XSS sanitization.
"""

from abc import ABC, abstractmethod
import html
import json
from typing import Any

from backend.reporting.models import ForensicReport


class BaseReportRenderer(ABC):
    """Abstract base class for report rendering engines."""

    @abstractmethod
    def render(self, report: ForensicReport) -> str:
        """Renders ForensicReport into the target format."""
        pass


class JSONReportRenderer(BaseReportRenderer):
    """Serializes report into standardized indented JSON string."""

    def render(self, report: ForensicReport) -> str:
        return report.model_dump_json(indent=2, by_alias=True)


class HTMLReportRenderer(BaseReportRenderer):
    """
    Renders ForensicReport into a clean, modern, single-page HTML report for investigators.
    Strictly escapes all dynamic content to eliminate XSS vulnerabilities.
    """

    def render(self, report: ForensicReport) -> str:
        rep_id = html.escape(report.metadata.report_id)
        case_id = html.escape(report.case.case_id)
        gen_at = html.escape(report.metadata.generated_at)
        gen_by = html.escape(report.metadata.generated_by)
        risk_score = report.risk_assessment.score
        risk_class = html.escape(report.risk_assessment.classification)

        # Risk badge color
        if risk_score <= 25:
            badge_color = "#10b981"  # Green
            badge_bg = "rgba(16, 185, 129, 0.1)"
        elif risk_score <= 55:
            badge_color = "#f59e0b"  # Amber
            badge_bg = "rgba(245, 158, 11, 0.1)"
        elif risk_score <= 80:
            badge_color = "#f97316"  # Orange
            badge_bg = "rgba(249, 115, 22, 0.1)"
        else:
            badge_color = "#ef4444"  # Red
            badge_bg = "rgba(239, 68, 68, 0.1)"

        # Render Findings HTML
        findings_html = ""
        if report.findings:
            for f in report.findings:
                f_sev = html.escape(f.severity.value)
                f_cat = html.escape(f.category.value if hasattr(f.category, "value") else str(f.category))
                f_title = html.escape(f.title)
                f_desc = html.escape(f.description)
                f_ref = html.escape(f.evidence_reference)
                f_limit = html.escape(f.limitations or "N/A")
                findings_html += f"""
                <div class="finding-card">
                    <div class="finding-header">
                        <span class="finding-id">{html.escape(f.finding_id)}</span>
                        <span class="sev-badge sev-{f_sev.lower()}">{f_sev}</span>
                        <span class="cat-badge">{f_cat}</span>
                        <span class="finding-title">{f_title}</span>
                    </div>
                    <p class="finding-desc">{f_desc}</p>
                    <div class="finding-meta"><strong>Evidence Reference:</strong> <code>{f_ref}</code> | <strong>Limitations:</strong> {f_limit}</div>
                </div>
                """
        else:
            findings_html = "<p class='empty-text'>No adverse forensic findings detected.</p>"

        # Render Relay Hops Table
        relay_html = ""
        if report.relay_path:
            relay_rows = "".join([
                f"<tr><td>#{h.hop_number}</td><td>{html.escape(h.sending_server or 'N/A')}</td>"
                f"<td>{html.escape(h.receiving_server or 'N/A')}</td><td><code>{html.escape(h.ip or 'N/A')}</code></td>"
                f"<td>{html.escape(h.ip_type or 'N/A')}</td><td>{h.delay_seconds if h.delay_seconds is not None else 'N/A'}s</td></tr>"
                for h in report.relay_path
            ])
            relay_html = f"""
            <table class="report-table">
                <thead><tr><th>Hop</th><th>Transmitting Server (from)</th><th>Receiving Server (by)</th><th>IP Address</th><th>Type</th><th>Delay</th></tr></thead>
                <tbody>{relay_rows}</tbody>
            </table>
            """
        else:
            relay_html = "<p class='empty-text'>No Received relay hops parsed from headers.</p>"

        # Render IP Intelligence
        ip_html = ""
        if report.ip_intelligence:
            ip_rows = "".join([
                f"<tr><td><code>{html.escape(ip_item.ip)}</code></td>"
                f"<td>{html.escape(ip_item.country or 'N/A')} ({html.escape(ip_item.city or 'N/A')})</td>"
                f"<td>{html.escape(ip_item.isp or 'N/A')}</td>"
                f"<td>{html.escape(ip_item.asn or 'N/A')}</td>"
                f"<td>{'<span class=\"badge-synthetic\">SYNTHETIC/DEMO</span>' if ip_item.is_synthetic else '<span class=\"badge-verified\">LIVE</span>'}</td></tr>"
                for ip_item in report.ip_intelligence
            ])
            ip_html = f"""
            <table class="report-table">
                <thead><tr><th>IP Address</th><th>Location</th><th>ISP / Org</th><th>ASN</th><th>Source Mode</th></tr></thead>
                <tbody>{ip_rows}</tbody>
            </table>
            """
        else:
            ip_html = "<p class='empty-text'>No external IP intelligence records queried.</p>"

        # Render Domain Intelligence
        domain_html = ""
        if report.domain_intelligence:
            domain_rows = "".join([
                f"<tr><td><strong>{html.escape(dom_item.domain)}</strong></td>"
                f"<td>{'Resolved' if dom_item.dns_resolved else 'Unresolved'}</td>"
                f"<td><code>{html.escape(', '.join(dom_item.mx_records) or 'None')}</code></td>"
                f"<td>{'<span class=\"badge-synthetic\">SYNTHETIC/DEMO</span>' if dom_item.is_synthetic else '<span class=\"badge-verified\">LIVE</span>'}</td></tr>"
                for dom_item in report.domain_intelligence
            ])
            domain_html = f"""
            <table class="report-table">
                <thead><tr><th>Domain Name</th><th>DNS Status</th><th>MX Records</th><th>Source Mode</th></tr></thead>
                <tbody>{domain_rows}</tbody>
            </table>
            """
        else:
            domain_html = "<p class='empty-text'>No external domain intelligence records queried.</p>"

        # Render ML Assessment Section
        ml_synth_badge = "<span class=\"badge-synthetic\">SYNTHETIC/DEMO MODEL</span>" if report.ml_assessment.is_synthetic else ""
        ml_html = f"""
        <div class="grid-2">
            <div class="info-group"><label>ML Engine Status</label><span>{html.escape(report.ml_assessment.status.upper())} {ml_synth_badge}</span></div>
            <div class="info-group"><label>Classification Label</label><span><strong>{html.escape(report.ml_assessment.label.upper())}</strong></span></div>
            <div class="info-group"><label>Model Name & Version</label><span>{html.escape(report.ml_assessment.model_name)} (v{html.escape(report.ml_assessment.model_version)})</span></div>
            <div class="info-group"><label>Inference Confidence</label><span>{report.ml_assessment.confidence * 100:.1f}%</span></div>
        </div>
        """

        # Render Timeline HTML
        timeline_html = ""
        if report.timeline:
            for t in report.timeline:
                t_ts = html.escape(t.timestamp)
                t_type = html.escape(t.event_type)
                t_actor = html.escape(t.actor)
                t_desc = html.escape(t.description)
                timeline_html += f"""
                <div class="timeline-row">
                    <div class="timeline-time">{t_ts}</div>
                    <div class="timeline-dot"></div>
                    <div class="timeline-body">
                        <strong>{t_type}</strong> ({t_actor})<br/>
                        <span>{t_desc}</span>
                    </div>
                </div>
                """
        else:
            timeline_html = "<p class='empty-text'>No timeline events recorded.</p>"

        # Render Recommendations HTML
        recs_html = ""
        if report.recommendations:
            for r in report.recommendations:
                r_pri = html.escape(r.priority)
                r_title = html.escape(r.title)
                r_action = html.escape(r.action_required)
                r_rat = html.escape(r.rationale)
                recs_html += f"""
                <div class="rec-card">
                    <div class="rec-title">[{r_pri}] {r_title}</div>
                    <div class="rec-action">{r_action}</div>
                    <div class="rec-rationale"><em>Rationale:</em> {r_rat}</div>
                </div>
                """
        else:
            recs_html = "<p class='empty-text'>No specific recommendations required.</p>"

        # Render Disclaimers
        disclaimers_html = "".join([f"<li>{html.escape(d)}</li>" for d in report.limitations.disclaimers])

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forensic Report: {case_id}</title>
    <style>
        :root {{
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-border: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #38bdf8;
            --accent-glow: rgba(56, 189, 248, 0.15);
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text-main);
            margin: 0;
            padding: 30px;
            line-height: 1.5;
        }}
        .container {{ max-width: 1080px; margin: 0 auto; }}
        .header-card {{
            background: var(--surface);
            border: 1px solid var(--surface-border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .report-title {{ margin: 0 0 6px 0; font-size: 24px; color: var(--accent); }}
        .meta-line {{ color: var(--text-muted); font-size: 13px; }}
        .risk-score-box {{
            text-align: right;
            padding: 12px 20px;
            border-radius: 8px;
            background: {badge_bg};
            border: 1px solid {badge_color};
        }}
        .score-val {{ font-size: 32px; font-weight: bold; color: {badge_color}; }}
        .score-label {{ font-size: 12px; text-transform: uppercase; color: {badge_color}; font-weight: bold; }}
        .section {{
            background: var(--surface);
            border: 1px solid var(--surface-border);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }}
        .section-title {{
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--accent);
            margin-top: 0;
            margin-bottom: 14px;
            border-bottom: 1px solid var(--surface-border);
            padding-bottom: 8px;
        }}
        .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
        .info-group label {{ font-size: 12px; color: var(--text-muted); display: block; }}
        .info-group span {{ font-size: 14px; word-break: break-all; }}
        .finding-card {{
            background: #0f172a;
            border: 1px solid var(--surface-border);
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 12px;
        }}
        .finding-header {{ display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }}
        .finding-id {{ font-size: 12px; color: var(--text-muted); font-weight: bold; }}
        .finding-title {{ font-size: 14px; font-weight: bold; color: var(--text-main); }}
        .sev-badge {{
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }}
        .cat-badge {{
            font-size: 10px;
            background: #334155;
            color: #94a3b8;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }}
        .badge-synthetic {{
            font-size: 10px;
            background: #7c2d12;
            color: #fdba74;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }}
        .badge-verified {{
            font-size: 10px;
            background: #064e3b;
            color: #6ee7b7;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }}
        .sev-critical {{ background: #ef4444; color: white; }}
        .sev-high {{ background: #f97316; color: white; }}
        .sev-medium {{ background: #f59e0b; color: black; }}
        .sev-low {{ background: #10b981; color: white; }}
        .sev-informational {{ background: #64748b; color: white; }}
        .finding-desc {{ font-size: 13px; color: #cbd5e1; margin: 4px 0 8px 0; }}
        .finding-meta {{ font-size: 11px; color: var(--text-muted); }}
        .timeline-row {{
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
            font-size: 13px;
        }}
        .timeline-time {{ width: 220px; color: var(--text-muted); font-size: 12px; }}
        .timeline-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent);
            margin: 6px 12px 0 12px;
        }}
        .timeline-body {{ flex: 1; }}
        .rec-card {{
            background: #0f172a;
            border-left: 3px solid var(--accent);
            padding: 10px 14px;
            margin-bottom: 10px;
            border-radius: 0 6px 6px 0;
        }}
        .rec-title {{ font-weight: bold; font-size: 13px; color: var(--accent); margin-bottom: 4px; }}
        .rec-action {{ font-size: 13px; color: var(--text-main); }}
        .rec-rationale {{ font-size: 11px; color: var(--text-muted); margin-top: 4px; }}
        .disclaimer-list {{ font-size: 12px; color: var(--text-muted); padding-left: 18px; margin: 0; }}
        .disclaimer-list li {{ margin-bottom: 6px; }}
        .report-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            text-align: left;
        }}
        .report-table th {{
            background: #0f172a;
            color: var(--accent);
            padding: 8px 10px;
            border-bottom: 1px solid var(--surface-border);
        }}
        .report-table td {{
            padding: 8px 10px;
            border-bottom: 1px solid rgba(51, 65, 85, 0.4);
            color: var(--text-main);
        }}
        .empty-text {{ font-size: 13px; color: var(--text-muted); font-style: italic; margin: 0; }}
        code {{ background: #0f172a; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; }}
    </style>
</head>
<body>
<div class="container">
    <div class="header-card">
        <div>
            <h1 class="report-title">Forensic Email Threat Investigation Report</h1>
            <div class="meta-line">Report ID: <strong>{rep_id}</strong> | Case ID: <strong>{case_id}</strong></div>
            <div class="meta-line">Generated: {gen_at} | Agent: {gen_by}</div>
        </div>
        <div class="risk-score-box">
            <div class="score-val">{risk_score}/100</div>
            <div class="score-label">{risk_class}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">1. Executive & Investigative Summary</div>
        <div class="grid-2">
            <div>
                <strong>Confirmed Observations (Facts):</strong>
                <ul>
                    {"".join([f"<li>{html.escape(c)}</li>" for c in report.narrative.confirmed_facts])}
                </ul>
            </div>
            <div>
                <strong>Expert Assessments:</strong>
                <ul>
                    {"".join([f"<li>{html.escape(a)}</li>" for a in report.narrative.expert_assessments])}
                </ul>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Case & Evidence Information</div>
        <div class="grid-2">
            <div class="info-group">
                <label>Case ID</label>
                <span>{case_id}</span>
            </div>
            <div class="info-group">
                <label>Preservation Status</label>
                <span>{html.escape(report.evidence.preservation_status)}</span>
            </div>
            <div class="info-group">
                <label>Evidence Filename</label>
                <span>{html.escape(report.evidence.filename)}</span>
            </div>
            <div class="info-group">
                <label>SHA-256 Digest</label>
                <span><code>{html.escape(report.evidence.sha256)}</code></span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">3. Email Headers & Cryptographic Authentication</div>
        <div class="grid-2">
            <div class="info-group">
                <label>From Address</label>
                <span>{html.escape(report.email.sender or "N/A")}</span>
            </div>
            <div class="info-group">
                <label>Reply-To Address</label>
                <span>{html.escape(report.email.reply_to or "N/A")}</span>
            </div>
            <div class="info-group">
                <label>Subject</label>
                <span>{html.escape(report.email.subject or "N/A")}</span>
            </div>
            <div class="info-group">
                <label>Authentication Results</label>
                <span>SPF: <strong>{html.escape(report.authentication.spf_status)}</strong> | DKIM: <strong>{html.escape(report.authentication.dkim_status)}</strong> | DMARC: <strong>{html.escape(report.authentication.dmarc_status)}</strong></span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">4. Relay Path & Network Infrastructure</div>
        {relay_html}
    </div>

    <div class="section">
        <div class="section-title">5. IP & Threat Intelligence</div>
        {ip_html}
    </div>

    <div class="section">
        <div class="section-title">6. Domain Intelligence</div>
        {domain_html}
    </div>

    <div class="section">
        <div class="section-title">7. AI / Machine Learning Assessment</div>
        {ml_html}
    </div>

    <div class="section">
        <div class="section-title">8. Key Forensic Findings ({len(report.findings)})</div>
        {findings_html}
    </div>

    <div class="section">
        <div class="section-title">9. Investigation Timeline</div>
        {timeline_html}
    </div>

    <div class="section">
        <div class="section-title">10. Chain of Custody & Notarization</div>
        <div class="grid-2">
            <div class="info-group"><label>Notarization Status</label><span>{html.escape(report.blockchain.notarization_status)}</span></div>
            <div class="info-group"><label>Verification Status</label><span>{html.escape(report.blockchain.verification_status)}</span></div>
            <div class="info-group"><label>Ledger Reference</label><span><code>{html.escape(report.blockchain.transaction_id or "NONE")}</code></span></div>
            <div class="info-group"><label>Ledger Integrity</label><span>{'VALID' if report.blockchain.chain_valid else 'COMPROMISED'}</span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">11. Recommended Actions</div>
        {recs_html}
    </div>

    <div class="section">
        <div class="section-title">12. Forensic & Legal Limitations</div>
        <ul class="disclaimer-list">
            {disclaimers_html}
        </ul>
    </div>
</div>
</body>
</html>
"""


class PDFReportRenderer(BaseReportRenderer):
    """
    Extensible interface for PDF generation.
    Can be hooked into headless Weasyprint or Chromium renderers without code churn.
    """

    def render(self, report: ForensicReport) -> str:
        raise NotImplementedError(
            "PDF rendering interface is architected for future headless PDF driver integration. "
            "Please use HTMLReportRenderer or JSONReportRenderer."
        )
