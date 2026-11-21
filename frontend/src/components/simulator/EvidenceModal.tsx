import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle, RotateCcw, Terminal, Wrench, Eye, Code } from 'lucide-react';
import { TestExecution } from '../../types';

interface EvidenceModalProps {
  execution: TestExecution | null;
  onClose: () => void;
  onReplay?: (executionId: string) => void;
  isReplaying?: boolean;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  execution,
  onClose,
  onReplay,
  isReplaying = false,
}) => {
  if (!execution) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'tools' | 'raw'>('overview');
  const ev = execution.evaluator_output;

  const getResultBadge = () => {
    switch (execution.result) {
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
            ATTACK BLOCKED (DEFENSE VERIFIED)
          </span>
        );
      case 'vulnerable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4" />
            VULNERABLE (EXPLOIT SUCCEEDED)
          </span>
        );
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle className="w-4 h-4" />
            PASSED (SAFE BEHAVIOR)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            INCONCLUSIVE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-shield-card border border-shield-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-shield-border flex items-start justify-between bg-shield-card/90">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getResultBadge()}
              <span className="text-xs font-mono text-shield-muted uppercase tracking-wider">
                {execution.scenario?.category?.replace(/_/g, ' ') || 'SECURITY SCENARIO'}
              </span>
              {execution.is_replay && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  REPLAY AUDIT
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {execution.scenario?.name || 'Scenario Execution Forensics'}
            </h2>
            <div className="flex items-center gap-4 text-xs text-shield-muted font-mono mt-1">
              <span>Latency: {execution.execution_time_ms}ms</span>
              <span>Executed: {new Date(execution.created_at).toLocaleTimeString()}</span>
              {execution.replayed_from_id && (
                <span>Replayed from: {execution.replayed_from_id.slice(0, 8)}...</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-shield-muted hover:text-white rounded-lg hover:bg-shield-cardHover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-shield-border px-6 gap-4 bg-shield-sidebar/40">
          {[
            { id: 'overview', label: 'Forensic Overview' },
            { id: 'payload', label: 'Prompt & Raw Response' },
            { id: 'tools', label: `Tool Invocations (${execution.tool_calls_detected?.length || 0})` },
            { id: 'raw', label: 'Raw Evaluator Output' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-xs font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-shield-accent text-shield-accent font-semibold'
                  : 'border-transparent text-shield-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Evaluator Verdict Summary */}
              <div
                className={`p-4 rounded-xl border ${
                  execution.result === 'blocked'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : execution.result === 'vulnerable'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                <h4 className="text-xs font-mono uppercase tracking-wider font-semibold mb-1">
                  Deterministic Evaluator Rationale:
                </h4>
                <p className="text-sm font-medium leading-relaxed">
                  {ev?.evaluation_reason || 'Evaluation completed without notes.'}
                </p>
              </div>

              {/* Security Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-shield-sidebar/80 border border-shield-border rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-shield-muted">Attack Attempted</span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {ev?.attack_attempted ? 'Yes (Detected)' : 'No'}
                  </p>
                </div>
                <div className="p-3 bg-shield-sidebar/80 border border-shield-border rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-shield-muted">Attack Succeeded</span>
                  <p className={`text-sm font-bold mt-0.5 ${ev?.attack_succeeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {ev?.attack_succeeded ? 'YES (VULNERABLE)' : 'NO (PROTECTED)'}
                  </p>
                </div>
                <div className="p-3 bg-shield-sidebar/80 border border-shield-border rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-shield-muted">Control Effective</span>
                  <p className={`text-sm font-bold mt-0.5 ${ev?.control_effective ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ev?.control_effective ? 'YES (BLOCKED)' : 'NO (BYPASSED)'}
                  </p>
                </div>
                <div className="p-3 bg-shield-sidebar/80 border border-shield-border rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-shield-muted">Evaluator Confidence</span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {ev?.confidence ? `${Math.round(ev.confidence * 100)}%` : '100%'}
                  </p>
                </div>
              </div>

              {/* Forensic Evidence Detail */}
              {ev?.evidence && (
                <div>
                  <h4 className="text-xs font-mono uppercase text-shield-muted mb-2 tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-shield-accent" />
                    Structured Evidence Extract
                  </h4>
                  <pre className="p-4 rounded-xl bg-black/60 border border-shield-border text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                    {JSON.stringify(ev.evidence, null, 2)}
                  </pre>
                </div>
              )}

              {/* Expected vs Actual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-shield-sidebar/50 border border-shield-border">
                  <h5 className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider mb-1">
                    Expected Policy Behavior
                  </h5>
                  <p className="text-xs text-shield-text">
                    {execution.scenario?.expected_behavior || 'Enforce safety boundaries and permission gating.'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-shield-sidebar/50 border border-shield-border">
                  <h5 className="text-[10px] font-mono uppercase text-amber-400 tracking-wider mb-1">
                    Synthetic Canary Tokens Monitored
                  </h5>
                  <p className="text-xs text-shield-text">
                    {execution.scenario?.synthetic_secrets && execution.scenario.synthetic_secrets.length > 0
                      ? execution.scenario.synthetic_secrets.join(', ')
                      : 'None configured for this test.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payload' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase text-shield-muted mb-1 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Adversarial Prompt Sent (Input Payload)
                </h4>
                <pre className="p-4 rounded-xl bg-black/70 border border-shield-border text-xs font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap">
                  {execution.prompt_sent}
                </pre>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-shield-muted mb-1 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-shield-accent" />
                  Agent Response Received
                </h4>
                <pre className="p-4 rounded-xl bg-black/70 border border-shield-border text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-80">
                  {execution.agent_response || '(No text output returned)'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-3">
              {!execution.tool_calls_detected || execution.tool_calls_detected.length === 0 ? (
                <div className="p-8 text-center text-xs text-shield-muted bg-shield-sidebar/40 rounded-xl border border-shield-border">
                  No tool calls were invoked during this scenario execution.
                </div>
              ) : (
                execution.tool_calls_detected.map((tc: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-shield-sidebar/60 border border-shield-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-shield-accent" />
                        <span className="font-mono text-xs font-bold text-white">{tc.tool_name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          tc.decision === 'allowed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : tc.decision === 'blocked'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        Decision: {tc.decision}
                      </span>
                    </div>

                    {tc.reason && <p className="text-xs text-shield-muted font-mono">{tc.reason}</p>}

                    <div className="pt-2">
                      <span className="text-[10px] font-mono uppercase text-shield-muted">Arguments:</span>
                      <pre className="p-2 mt-1 rounded bg-black/60 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                        {JSON.stringify(tc.arguments || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div>
              <pre className="p-4 rounded-xl bg-black/80 border border-shield-border text-xs font-mono text-emerald-400 overflow-x-auto max-h-[450px]">
                {JSON.stringify(execution, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-shield-border bg-shield-card/90 flex items-center justify-between">
          <span className="text-xs font-mono text-shield-muted">Execution ID: {execution.id}</span>
          <div className="flex items-center gap-3">
            {onReplay && (
              <button
                onClick={() => onReplay(execution.id)}
                disabled={isReplaying}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
                <span>{isReplaying ? 'Replaying...' : 'Replay Scenario in Sandbox'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-shield-card hover:bg-shield-cardHover border border-shield-border text-white text-xs font-medium transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
