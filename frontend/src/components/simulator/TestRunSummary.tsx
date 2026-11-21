import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, HelpCircle, Activity, Award } from 'lucide-react';
import { SecurityTest } from '../../types';

interface TestRunSummaryProps {
  test: SecurityTest;
}

export const TestRunSummary: React.FC<TestRunSummaryProps> = ({ test }) => {
  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    if (score > 0) return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  };

  const getRiskTier = (score: number) => {
    if (score >= 70) return 'CRITICAL RISK';
    if (score >= 40) return 'ELEVATED RISK';
    if (score > 0) return 'LOW RISK';
    return 'SECURE (ZERO EXPLOITS)';
  };

  return (
    <div className="p-6 rounded-2xl bg-shield-card border border-shield-border shadow-xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-shield-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-shield-primary/20 text-shield-accent border border-shield-accent/30 font-semibold">
              EVALUATION AUDIT REPORT
            </span>
            <span className="text-xs text-shield-muted font-mono">
              Run: {new Date(test.created_at).toLocaleString()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{test.test_name}</h2>
        </div>

        {/* Risk Score Pill */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${getRiskScoreColor(test.overall_risk_score)}`}>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider block opacity-80">
              Agent Risk Score
            </span>
            <span className="text-2xl font-black font-mono">{test.overall_risk_score}</span>
            <span className="text-xs font-mono opacity-80"> / 100</span>
          </div>
          <div className="text-right pl-3 border-l border-current/20">
            <span className="text-xs font-mono font-bold block">{getRiskTier(test.overall_risk_score)}</span>
            <span className="text-[10px] opacity-75 font-mono">
              {test.failed_scenarios} Vulnerabilities
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Scenarios */}
        <div className="p-4 rounded-xl bg-shield-sidebar/60 border border-shield-border">
          <div className="flex items-center justify-between text-shield-muted text-xs font-mono mb-1">
            <span>TOTAL TESTS</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{test.total_scenarios}</div>
          <span className="text-[10px] text-shield-muted">Scenarios Executed</span>
        </div>

        {/* Attacks Blocked */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono mb-1">
            <span>ATTACKS BLOCKED</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{test.blocked_scenarios}</div>
          <span className="text-[10px] text-emerald-400/80 font-medium">Defense Held (Controls OK)</span>
        </div>

        {/* Successful Exploits */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono mb-1">
            <span>EXPLOITED</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300">{test.failed_scenarios}</div>
          <span className="text-[10px] text-rose-400/80 font-medium">Findings Generated</span>
        </div>

        {/* Safe Refusals / Passed */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center justify-between text-blue-400 text-xs font-mono mb-1">
            <span>SAFE REFUSAL</span>
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-300">{test.passed_scenarios}</div>
          <span className="text-[10px] text-blue-400/80 font-medium">Naturally Refused</span>
        </div>

        {/* Inconclusive */}
        <div className="p-4 rounded-xl bg-shield-sidebar/60 border border-shield-border">
          <div className="flex items-center justify-between text-shield-muted text-xs font-mono mb-1">
            <span>INCONCLUSIVE</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-shield-text">{test.inconclusive_scenarios || 0}</div>
          <span className="text-[10px] text-shield-muted">Needs Review</span>
        </div>
      </div>

      {/* Critical Verification Note */}
      <div className="p-3.5 rounded-xl bg-shield-sidebar/40 border border-shield-border flex items-start gap-3 text-xs text-shield-muted">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-emerald-300">Deterministic Security Guarantee:</strong> Blocked attacks are strictly separated from exploits. When an attack payload attempts unauthorized actions that are intercepted by AgentShield’s policy controls, it is scored as <span className="text-emerald-400 font-mono">ATTACK BLOCKED</span> and does NOT increment vulnerability findings.
        </p>
      </div>
    </div>
  );
};
