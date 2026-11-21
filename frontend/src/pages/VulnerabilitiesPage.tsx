import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Code,
  Eye,
  RefreshCw,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  ShieldCheck,
  ExternalLink,
  Copy,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { VulnerabilityFinding, VulnerabilityIntelligence, RemediationPlan } from '../types';

export const VulnerabilitiesPage: React.FC = () => {
  const [findings, setFindings] = useState<VulnerabilityFinding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Phase 4 Intelligence & Remediation state
  const [intelligenceMap, setIntelligenceMap] = useState<Record<string, VulnerabilityIntelligence>>({});
  const [remediationMap, setRemediationMap] = useState<Record<string, RemediationPlan>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [remediatingId, setRemediatingId] = useState<string | null>(null);
  const [expandedIntelId, setExpandedIntelId] = useState<string | null>(null);
  const [expandedRemediationId, setExpandedRemediationId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const data = await api.getFindings({
        status: statusFilter,
        severity: severityFilter,
        category: categoryFilter,
      });
      setFindings(data);
    } catch (e) {
      console.error('Failed to fetch findings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [statusFilter, severityFilter, categoryFilter]);

  const handleUpdateStatus = async (
    findingId: string,
    newStatus: 'open' | 'resolved' | 'acknowledged'
  ) => {
    setUpdatingId(findingId);
    try {
      const updated = await api.updateFindingStatus(findingId, newStatus);
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: updated.status } : f))
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Phase 4: Trigger Gemini / deterministic intelligence analysis
  const handleAnalyzeWithGemini = async (findingId: string) => {
    setAnalyzingId(findingId);
    try {
      const intel = await api.analyzeFinding(findingId);
      setIntelligenceMap((prev) => ({ ...prev, [findingId]: intel }));
      setExpandedIntelId(findingId);
    } catch (err: any) {
      alert(`Intelligence analysis failed: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Phase 4: Trigger automated remediation generation
  const handleGenerateRemediation = async (findingId: string) => {
    setRemediatingId(findingId);
    try {
      const plan = await api.getFindingRemediation(findingId);
      setRemediationMap((prev) => ({ ...prev, [findingId]: plan }));
      setExpandedRemediationId(findingId);
    } catch (err: any) {
      alert(`Remediation generation failed: ${err.message}`);
    } finally {
      setRemediatingId(null);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'prompt_injection', label: 'Prompt Injection' },
    { id: 'unauthorized_tool_usage', label: 'Unauthorized Tool Usage' },
    { id: 'sensitive_data_exposure', label: 'Sensitive Data Exposure' },
    { id: 'excessive_agency', label: 'Excessive Agency' },
  ];

  const severities = ['all', 'critical', 'high', 'medium', 'low'];
  const statuses = ['all', 'open', 'resolved', 'acknowledged'];

  const openCount = findings.filter((f) => f.status === 'open').length;
  const resolvedCount = findings.filter((f) => f.status === 'resolved').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-shield-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Vulnerability Findings & Evidence
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-shield-primary/20 text-shield-accent border border-shield-accent/30 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              GEMINI INTELLIGENCE ENABLED
            </span>
          </div>
          <p className="text-xs text-shield-muted mt-1">
            Confirmed security exposures, policy violations, and canary leaks with AI-synthesized root-cause analysis and automated policy patches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30">
              {openCount} Open
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {resolvedCount} Resolved
            </span>
          </div>

          <button
            onClick={fetchFindings}
            disabled={loading}
            className="p-2 rounded-xl bg-shield-card hover:bg-shield-cardHover border border-shield-border text-shield-text transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-shield-accent ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-shield-card border border-shield-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-shield-muted mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-medium uppercase font-mono transition-all ${
                statusFilter === st
                  ? 'bg-shield-primary text-white shadow-sm glow-primary'
                  : 'bg-shield-sidebar hover:bg-shield-cardHover text-shield-muted border border-shield-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Severity & Category dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs uppercase font-mono focus:outline-none focus:border-shield-accent"
            >
              {severities.map((sev) => (
                <option key={sev} value={sev}>
                  Severity: {sev}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-shield-muted font-mono bg-shield-card rounded-2xl border border-shield-border">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-shield-accent" />
            Loading forensic vulnerability records...
          </div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center bg-shield-card rounded-2xl border border-shield-border">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No Vulnerability Findings Found</h3>
            <p className="text-xs text-shield-muted mt-1 max-w-md mx-auto">
              No findings match your current filter parameters. All simulated attacks in this category were either safely blocked or naturally rejected.
            </p>
          </div>
        ) : (
          findings.map((f) => {
            const intel = intelligenceMap[f.id];
            const remediation = remediationMap[f.id];
            const isIntelExpanded = expandedIntelId === f.id;
            const isRemediationExpanded = expandedRemediationId === f.id;

            return (
              <div
                key={f.id}
                className={`p-6 rounded-2xl border transition-all ${
                  f.status === 'resolved'
                    ? 'bg-shield-card/60 border-shield-border/60 opacity-80'
                    : 'bg-shield-card border-shield-border hover:border-shield-borderLight shadow-lg'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-3 flex-wrap">
                    <Badge label={f.severity} variant={f.severity} size="md" />
                    <span className="text-xs font-mono text-shield-muted uppercase tracking-wider">
                      {f.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-shield-sidebar border border-shield-border text-shield-accent">
                      Evaluator: {f.evaluator_type} ({Math.round(f.confidence * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      label={f.status.toUpperCase()}
                      variant={f.status === 'open' ? 'critical' : f.status === 'resolved' ? 'success' : 'medium'}
                    />

                    {/* Status Toggle Actions */}
                    <div className="flex items-center gap-1 ml-2">
                      {f.status !== 'resolved' ? (
                        <button
                          onClick={() => handleUpdateStatus(f.id, 'resolved')}
                          disabled={updatingId === f.id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(f.id, 'open')}
                          disabled={updatingId === f.id}
                          className="px-2.5 py-1 rounded-lg bg-shield-sidebar hover:bg-shield-cardHover text-shield-muted hover:text-white border border-shield-border text-[11px] font-medium flex items-center gap-1 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reopen</span>
                        </button>
                      )}

                      {f.status === 'open' && (
                        <button
                          onClick={() => handleUpdateStatus(f.id, 'acknowledged')}
                          disabled={updatingId === f.id}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-all"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white">{f.title}</h3>
                <p className="text-xs text-shield-muted mt-1 leading-relaxed">{f.description}</p>

                {/* Action Bar for AI Analysis & Remediation */}
                <div className="mt-4 pt-3 border-t border-shield-border/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyzeWithGemini(f.id)}
                      disabled={analyzingId === f.id}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-purple-500/10 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${analyzingId === f.id ? 'animate-spin' : ''}`} />
                      <span>{analyzingId === f.id ? 'Analyzing with Gemini...' : intel ? 'Re-Analyze with Gemini' : 'Analyze with Gemini'}</span>
                    </button>

                    <button
                      onClick={() => handleGenerateRemediation(f.id)}
                      disabled={remediatingId === f.id}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Code className={`w-3.5 h-3.5 ${remediatingId === f.id ? 'animate-spin' : ''}`} />
                      <span>{remediatingId === f.id ? 'Synthesizing Patch...' : remediation ? 'View Remediation Patch' : 'Generate Remediation Patch'}</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-shield-muted">
                    Finding ID: {f.id.slice(0, 8)}...
                  </span>
                </div>

                {/* Expanded Gemini Intelligence Panel */}
                {intel && isIntelExpanded && (
                  <div className="mt-4 p-5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-purple-400" />
                        <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                          Gemini Vulnerability Intelligence Report
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Provider: {intel.ai_provider}
                        </span>
                        <span className="text-[10px] font-mono text-shield-muted">
                          Confidence: {Math.round(intel.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Technique & Root Cause Hypothesis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-lg bg-black/40 border border-shield-border">
                        <span className="text-[10px] font-mono uppercase text-purple-300 tracking-wider block mb-1">
                          Attack Technique Taxonomy
                        </span>
                        <p className="font-semibold text-white">{intel.attack_technique}</p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-black/40 border border-shield-border">
                        <span className="text-[10px] font-mono uppercase text-amber-300 tracking-wider block mb-1">
                          AI Root Cause Hypothesis
                        </span>
                        <p className="text-shield-text leading-relaxed">{intel.root_cause_hypothesis}</p>
                      </div>
                    </div>

                    {/* Factual Evidence vs AI Hypotheses (Safeguard 4) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3.5 rounded-lg bg-black/60 border border-emerald-500/30">
                        <span className="text-[10px] uppercase text-emerald-400 tracking-wider block mb-1 font-bold">
                          ✓ Observed Verifiable Facts (No Hallucination)
                        </span>
                        <pre className="text-emerald-300 overflow-x-auto whitespace-pre-wrap text-[11px] max-h-36">
                          {JSON.stringify(intel.observed_facts, null, 2)}
                        </pre>
                      </div>

                      <div className="p-3.5 rounded-lg bg-black/60 border border-purple-500/30">
                        <span className="text-[10px] uppercase text-purple-400 tracking-wider block mb-1 font-bold">
                          ⚡ AI Inferences & Model Hypotheses
                        </span>
                        <pre className="text-purple-300 overflow-x-auto whitespace-pre-wrap text-[11px] max-h-36">
                          {JSON.stringify(intel.ai_hypotheses, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Impact Assessment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                        <span className="text-[10px] font-mono uppercase text-rose-400 tracking-wider block mb-1 font-bold">
                          Technical Security Impact
                        </span>
                        <p className="text-rose-200 leading-relaxed">{intel.security_impact}</p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider block mb-1 font-bold">
                          Business & Operational Impact
                        </span>
                        <p className="text-amber-200 leading-relaxed">{intel.business_impact}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Automated Remediation Panel */}
                {remediation && isRemediationExpanded && (
                  <div className="mt-4 p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                          Automated Policy Patch & Remediation Guidance
                        </h4>
                      </div>
                      <button
                        onClick={() => handleCopyCode(f.id, remediation.example_configuration)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedCodeId === f.id ? 'Copied!' : 'Copy Policy Code'}</span>
                      </button>
                    </div>

                    <div className="text-xs text-shield-text space-y-2">
                      <p><strong className="text-indigo-300">Recommended Fix:</strong> {remediation.recommended_fix}</p>
                      <p><strong className="text-emerald-300">Expected Improvement:</strong> {remediation.expected_security_improvement}</p>
                    </div>

                    <div className="relative">
                      <pre className="p-4 rounded-xl bg-black/70 border border-indigo-500/20 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                        {remediation.example_configuration}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-mono text-shield-muted">
                        Validation Scenarios: {remediation.validation_test_scenarios.join(', ') || 'Current Scenario Suite'}
                      </span>
                      <a
                        href="/hardening"
                        className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 font-mono transition-colors"
                      >
                        <span>Open Policy Hardening Center</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
