from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.services.report_generator import ComplianceReportGenerator

router = APIRouter(prefix="/reports", tags=["Compliance & Security Reports"])


class ReportGenerateRequest(BaseModel):
    agent_id: Optional[str] = None
    framework: str = "OWASP_LLM_TOP_10"  # OWASP_LLM_TOP_10, NIST_AI_RMF, MITRE_ATLAS, AGENTSHIELD_STANDARD
    title: Optional[str] = None


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_compliance_report(
    req: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        report = ComplianceReportGenerator.generate_report(
            db=db,
            user_id=current_user.id,
            agent_id=req.agent_id,
            framework=req.framework,
            title=req.title
        )
        return report.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("")
def list_compliance_reports(
    agent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = ComplianceReportGenerator.get_reports(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id
    )
    return [r.to_dict() for r in reports]


@router.get("/{report_id}")
def get_compliance_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = ComplianceReportGenerator.get_report(
        db=db,
        report_id=report_id,
        user_id=current_user.id
    )
    if not report:
        raise HTTPException(status_code=404, detail="Compliance report not found.")
    return report.to_dict()


@router.get("/{report_id}/export")
def export_compliance_report(
    report_id: str,
    format: str = "json",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = ComplianceReportGenerator.get_report(
        db=db,
        report_id=report_id,
        user_id=current_user.id
    )
    if not report:
        raise HTTPException(status_code=404, detail="Compliance report not found.")

    if format.lower() == "json":
        return JSONResponse(content=report.to_dict())

    # HTML printable format for PDF conversion
    measured_html = "".join([
        f"<tr style='border-bottom: 1px solid #e2e8f0;'>"
        f"<td style='padding: 8px; font-weight: 600;'>{c.get('control_id')}</td>"
        f"<td style='padding: 8px;'>{c.get('title')}</td>"
        f"<td style='padding: 8px;'><span style='background: {'#dcfce7; color: #166534' if c.get('status') == 'PASS' else '#fee2e2; color: #991b1b'}; padding: 2px 8px; border-radius: 4px; font-weight: bold;'>{c.get('status')}</span></td>"
        f"<td style='padding: 8px; font-size: 12px;'>{c.get('details')}</td>"
        f"</tr>"
        for c in (report.measured_controls or [])
    ])

    unverified_html = "".join([
        f"<tr style='border-bottom: 1px solid #e2e8f0; color: #64748b;'>"
        f"<td style='padding: 8px;'>{c.get('control_id')}</td>"
        f"<td style='padding: 8px;'>{c.get('title')}</td>"
        f"<td style='padding: 8px;'><span style='background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px;'>UNVERIFIED</span></td>"
        f"<td style='padding: 8px; font-size: 12px;'>{c.get('details')}</td>"
        f"</tr>"
        for c in (report.unverified_controls or [])
    ])

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{report.title} — AgentShield Compliance Audit</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #0f172a; padding: 40px; max-width: 900px; margin: 0 auto; }}
        h1 {{ font-size: 24px; margin-bottom: 8px; color: #0f172a; }}
        .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }}
        .badge {{ background: #0284c7; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; }}
        .disclaimer {{ background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 12px; color: #b45309; }}
        .summary-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
        th {{ background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }}
        @media print {{ body {{ padding: 0; }} .no-print {{ display: none; }} }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Print to PDF</button>
    </div>
    <div class="header">
        <span class="badge">{report.framework}</span>
        <h1>{report.title}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Generated by AgentShield • Assessment Timestamp: {report.created_at.strftime('%Y-%m-%d %H:%M UTC')}</p>
    </div>
    
    <div class="disclaimer">
        <strong>Mandatory Certification Transparency Disclaimer:</strong><br/>
        {report.certification_disclaimer}
    </div>

    <div class="summary-box">
        <h3 style="margin-top: 0; font-size: 16px;">Executive Evaluation Summary</h3>
        <p>{report.summary}</p>
        <div style="display: flex; gap: 20px; margin-top: 12px;">
            <div><strong>Measured Compliance:</strong> <span style="font-size: 18px; color: #0284c7; font-weight: bold;">{report.compliance_percentage}</span></div>
            <div><strong>Measured Controls:</strong> <span>{len(report.measured_controls or [])}</span></div>
            <div><strong>Unverified Controls:</strong> <span>{len(report.unverified_controls or [])}</span></div>
        </div>
    </div>

    <h3>Empirically Measured Controls (Evidence-Backed)</h3>
    <table>
        <thead>
            <tr><th>Control ID</th><th>Title</th><th>Evaluation</th><th>Empirical Evidence</th></tr>
        </thead>
        <tbody>
            {measured_html if measured_html else "<tr><td colspan='4' style='padding: 8px; text-align: center; color: #64748b;'>No measured controls yet.</td></tr>"}
        </tbody>
    </table>

    <h3 style="margin-top: 32px;">Unverified Controls (Awaiting Test Executions)</h3>
    <table>
        <thead>
            <tr><th>Control ID</th><th>Title</th><th>Evaluation</th><th>Requirement Details</th></tr>
        </thead>
        <tbody>
            {unverified_html if unverified_html else "<tr><td colspan='4' style='padding: 8px; text-align: center; color: #64748b;'>All controls have been empirically measured.</td></tr>"}
        </tbody>
    </table>
</body>
</html>
"""
    return HTMLResponse(content=html_content)
