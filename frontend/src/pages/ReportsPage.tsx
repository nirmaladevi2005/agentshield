import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Printer,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Agent, ComplianceReport, ComplianceControl } from '../types';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('OWASP_LLM_TOP_10');
  const [activeReport, setActiveReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsList, reportsList] = await Promise.all([
        api.getAgents(),
        api.getComplianceReports(),
      ]);
      setAgents(agentsList);
      setReports(reportsList);
      if (reportsList.length > 0) {
        setActiveReport(reportsList[0]);
      }
    } catch (err) {
      console.error('Failed to load compliance reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const newReport = await api.generateComplianceReport({
        agent_id: selectedAgentId || undefined,
        framework: selectedFramework,
      });
      const reportsList = await api.getComplianceReports();
      setReports(reportsList);
      setActiveReport(newReport);
    } catch (err) {
      console.error('Failed to generate compliance report', err);
      alert('Report generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadJSON = (report: ComplianceReport) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AgentShield-Compliance-${report.framework}-${report.id.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintHTML = (reportId: string) => {
    window.open(`http://127.0.0.1:8000/api/reports/${reportId}/export?format=html`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Evidence-Backed Compliance & Security Audit Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Standard framework alignments (OWASP, NIST AI RMF, MITRE ATLAS) with empirical control verification.
          </p>
        </div>

        {/* Generate Report Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none"
          >
            <option value="">All Agents</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>

          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none"
          >
            <option value="OWASP_LLM_TOP_10">OWASP Top 10 for LLMs</option>
            <option value="NIST_AI_RMF">NIST AI RMF 1.0</option>
            <option value="MITRE_ATLAS">MITRE ATLAS</option>
            <option value="AGENTSHIELD_STANDARD">AgentShield Autonomous Standard</option>
          </select>

          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Evaluating Controls...' : 'Generate Audit Report'}
          </button>
        </div>
      </div>

      {/* Main Grid: Report Selector & Active Report Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Report List */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Generated Reports</h2>
          {reports.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No reports generated yet. Click "Generate Audit Report" above.
            </div>
          ) : (
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setActiveReport(rep)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    activeReport?.id === rep.id
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-cyan-400 text-[11px] uppercase">{rep.framework}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-semibold line-clamp-1">{rep.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Compliance:</span>
                    <span className="font-bold text-emerald-400">{rep.compliance_percentage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Report Viewer */}
        <div className="lg:col-span-3 space-y-5">
          {activeReport ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold uppercase">
                    {activeReport.framework}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1.5">{activeReport.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(activeReport.created_at).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>Empirical Evaluation Report</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadJSON(activeReport)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => handlePrintHTML(activeReport.id)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print to PDF
                  </button>
                </div>
              </div>

              {/* MANDATORY CERTIFICATION DISCLAIMER CALLOUT */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-bold uppercase text-amber-400 block mb-0.5">
                    Certification Transparency Disclosure:
                  </span>
                  {activeReport.certification_disclaimer}
                </div>
              </div>

              {/* Executive Summary & KPI Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">Measured Compliance</span>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">
                    {activeReport.compliance_percentage}
                  </div>
                  <span className="text-[11px] text-slate-400">Passed / Empirically Measured Controls</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">Empirically Measured Controls</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {activeReport.measured_controls?.length ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-400">Backed by execution traces</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">Unverified Controls</span>
                  <div className="text-2xl font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    {activeReport.unverified_controls?.length ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-400">Requires targeted scenarios</span>
                </div>
              </div>

              {/* Executive Summary Prose */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-white block mb-1">Executive Summary:</span>
                {activeReport.summary}
              </div>

              {/* Empirically Measured Controls Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Empirically Measured Controls ({activeReport.measured_controls?.length ?? 0})
                  </h3>
                </div>

                {activeReport.measured_controls && activeReport.measured_controls.length > 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase text-[11px]">
                          <th className="p-3">Control ID</th>
                          <th className="p-3">Title</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Empirical Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {activeReport.measured_controls.map((ctrl) => (
                          <tr key={ctrl.control_id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-mono font-bold text-cyan-300">{ctrl.control_id}</td>
                            <td className="p-3 font-medium text-white">{ctrl.title}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  ctrl.status === 'PASS'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {ctrl.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 font-sans">{ctrl.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    No controls currently measured. Run security tests for this agent to record empirical evidence.
                  </div>
                )}
              </div>

              {/* Unverified Controls Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-300">
                    Unverified Controls Awaiting Test Data ({activeReport.unverified_controls?.length ?? 0})
                  </h3>
                </div>

                {activeReport.unverified_controls && activeReport.unverified_controls.length > 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase text-[11px]">
                          <th className="p-3">Control ID</th>
                          <th className="p-3">Title</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Requirement & Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {activeReport.unverified_controls.map((ctrl) => (
                          <tr key={ctrl.control_id} className="hover:bg-slate-900/40 text-slate-400">
                            <td className="p-3 font-mono text-slate-400">{ctrl.control_id}</td>
                            <td className="p-3 font-medium text-slate-300">{ctrl.title}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                UNVERIFIED
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-sans">{ctrl.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    All framework controls have been covered by active empirical test executions!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">Select or Generate a Compliance Report</h3>
              <p className="text-sm text-slate-400 mt-1">
                Generate an evidence-backed audit report for OWASP Top 10 for LLMs, NIST AI RMF, or MITRE ATLAS.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
