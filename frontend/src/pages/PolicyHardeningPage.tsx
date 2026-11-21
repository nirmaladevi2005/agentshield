import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Play,
  ArrowRight,
  Lock,
  Layers,
  History,
} from 'lucide-react';
import { Agent, PolicyRecommendation, RetestResponse } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';

export const PolicyHardeningPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<PolicyRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [retesting, setRetesting] = useState<boolean>(false);
  const [retestResult, setRetestResult] = useState<RetestResponse | null>(null);

  // Load registered agents
  const loadAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgentId) {
        setSelectedAgentId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Fetch recommendations for selected agent
  const fetchRecommendations = async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const data = await api.getPolicyRecommendations(selectedAgentId);
      setRecommendations(data);
    } catch (e) {
      console.error('Failed to load policy recommendations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [selectedAgentId]);

  // Stage 1: Generate recommendations
  const handleGenerateRecommendations = async () => {
    if (!selectedAgentId) return;
    setGenerating(true);
    try {
      const recs = await api.generatePolicyHardening(selectedAgentId);
      setRecommendations(recs);
    } catch (e: any) {
      alert(`Policy analysis failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Stage A: Review & Approve
  const handleApprove = async (id: string) => {
    try {
      const updated = await api.approvePolicyRecommendation(id);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
      );
    } catch (e: any) {
      alert(`Approval failed: ${e.message}`);
    }
  };

  // Stage A: Review & Reject
  const handleReject = async (id: string) => {
    try {
      const updated = await api.rejectPolicyRecommendation(id);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
      );
    } catch (e: any) {
      alert(`Rejection failed: ${e.message}`);
    }
  };

  // Stage B: Apply all approved policies
  const handleApplyApproved = async () => {
    if (!selectedAgentId) return;
    setApplying(true);
    try {
      const res = await api.applyApprovedPolicies(selectedAgentId);
      alert(`Successfully applied ${res.applied_count} approved security policy patches!`);
      await fetchRecommendations();
    } catch (e: any) {
      alert(`Failed to apply policies: ${e.message}`);
    } finally {
      setApplying(false);
    }
  };

  // Retest affected scenarios
  const handleRetest = async () => {
    if (!selectedAgentId) return;
    setRetesting(true);
    try {
      const result = await api.retestAgentPolicies(selectedAgentId);
      setRetestResult(result);
    } catch (e: any) {
      alert(`Retest failed: ${e.message}`);
    } finally {
      setRetesting(false);
    }
  };

  const approvedCount = recommendations.filter((r) => r.status === 'approved').length;
  const pendingCount = recommendations.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-shield-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Security Policy Hardening Center
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-shield-primary/20 text-shield-accent border border-shield-accent/30 font-semibold">
              HUMAN-IN-THE-LOOP GOVERNANCE
            </span>
          </div>
          <p className="text-xs text-shield-muted mt-1">
            Review AI policy recommendations, compare before-and-after configurations, approve least-privilege rules, and retest defenses.
          </p>
        </div>

        {/* Target Agent Selector */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-shield-muted block">Target Agent</span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-shield-card border border-shield-border text-white text-xs font-semibold focus:outline-none focus:border-shield-accent"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.integration_type})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateRecommendations}
            disabled={generating || !selectedAgentId}
            className="px-4 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover text-white text-xs font-semibold glow-primary flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Analyzing Posture...' : 'Analyze & Recommend Hardening'}</span>
          </button>
        </div>
      </div>

      {/* Retest Verification Banner if completed */}
      {retestResult && (
        <div className="p-6 rounded-2xl bg-shield-card border border-emerald-500/40 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-shield-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Post-Hardening Verification Suite Results</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              ✓ HARDENING EFFECTIVENESS VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-shield-sidebar border border-shield-border">
              <span className="text-[10px] font-mono uppercase text-shield-muted block">Scenarios Tested</span>
              <span className="text-xl font-bold font-mono text-white">{retestResult.total_scenarios}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block">Attacks Blocked</span>
              <span className="text-xl font-bold font-mono text-emerald-300">{retestResult.blocked_scenarios}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-[10px] font-mono uppercase text-rose-400 block">Vulnerabilities Remaining</span>
              <span className="text-xl font-bold font-mono text-rose-300">{retestResult.failed_scenarios}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-[10px] font-mono uppercase text-blue-400 block">New Risk Score</span>
              <span className="text-xl font-bold font-mono text-blue-300">{retestResult.overall_risk_score}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Banner for Applying Approved Changes */}
      <div className="p-4 rounded-2xl bg-shield-card border border-shield-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Two-Stage Policy Execution Pipeline</h3>
            <p className="text-[11px] text-shield-muted">
              {approvedCount} approved policies ready to be applied. {pendingCount} pending security review.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyApproved}
            disabled={applying || approvedCount === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" />
            <span>{applying ? 'Applying Changes...' : `Apply Approved Policies (${approvedCount})`}</span>
          </button>

          <button
            onClick={handleRetest}
            disabled={retesting || !selectedAgentId}
            className="px-4 py-2 rounded-xl bg-shield-sidebar hover:bg-shield-cardHover border border-shield-border text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-shield-accent ${retesting ? 'animate-spin' : ''}`} />
            <span>{retesting ? 'Retesting...' : 'Retest Affected Scenarios'}</span>
          </button>
        </div>
      </div>

      {/* Before-and-After Policy Recommendations Matrix */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-shield-muted font-mono bg-shield-card rounded-2xl border border-shield-border">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-shield-accent" />
            Loading policy recommendations matrix...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-12 text-center bg-shield-card rounded-2xl border border-shield-border space-y-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Pending Policy Recommendations</h3>
            <p className="text-xs text-shield-muted max-w-md mx-auto">
              Current agent tool permissions adhere to least-privilege standards. Click "Analyze & Recommend Hardening" to run an automated posture check against historical attack logs.
            </p>
          </div>
        ) : (
          recommendations.map((rec) => {
            const isApproved = rec.status === 'approved';
            const isRejected = rec.status === 'rejected';
            const isApplied = rec.status === 'applied';

            return (
              <div
                key={rec.id}
                className="p-6 rounded-2xl bg-shield-card border border-shield-border shadow-lg space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-shield-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-shield-sidebar border border-shield-border">
                      <Lock className="w-4 h-4 text-shield-accent" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        Tool Policy: {rec.tool_name}
                      </h4>
                      <p className="text-xs text-shield-muted">{rec.justification}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        isApplied
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : isApproved
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      Status: {rec.status}
                    </span>

                    {/* Review Action Controls (Stage A) */}
                    {!isApplied && (
                      <div className="flex items-center gap-1 ml-2">
                        {!isApproved && (
                          <button
                            onClick={() => handleApprove(rec.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {!isRejected && (
                          <button
                            onClick={() => handleReject(rec.id)}
                            className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Before vs After Policy Diff Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Policy (Before) */}
                  <div className="p-4 rounded-xl bg-black/40 border border-shield-border space-y-2">
                    <span className="text-[10px] font-mono uppercase text-shield-muted block tracking-wider">
                      Current Policy (Active)
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-shield-muted">Execution Rights:</span>
                        <span className={rec.current_policy.is_allowed ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {rec.current_policy.is_allowed ? 'ALLOWED' : 'BLOCKED'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-shield-muted">Human Approval:</span>
                        <span className={rec.current_policy.requires_human_approval ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {rec.current_policy.requires_human_approval ? 'REQUIRED' : 'NONE (AUTONOMOUS)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-shield-muted">Rate Limit:</span>
                        <span className="text-white">{rec.current_policy.rate_limit_per_min} req/min</span>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Hardened Policy (After) */}
                  <div className="p-4 rounded-xl bg-shield-sidebar/80 border border-shield-accent/30 space-y-2 shadow-inner">
                    <span className="text-[10px] font-mono uppercase text-shield-accent block tracking-wider font-semibold">
                      Proposed Hardening (Recommended)
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-shield-muted">Execution Rights:</span>
                        <span className={rec.proposed_policy.is_allowed ? 'text-white' : 'text-emerald-400 font-bold'}>
                          {rec.proposed_policy.is_allowed ? 'ALLOWED' : 'REVOKED (LEAST PRIVILEGE)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-shield-muted">Human Approval:</span>
                        <span className="text-emerald-400 font-bold">
                          {rec.proposed_policy.requires_human_approval ? 'ENFORCED (APPROVAL REQUIRED)' : 'NONE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-shield-muted">Rate Limit:</span>
                        <span className="text-shield-accent font-bold">{rec.proposed_policy.rate_limit_per_min} req/min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
