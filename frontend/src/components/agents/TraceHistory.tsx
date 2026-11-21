import React from 'react';
import { RefreshCw } from 'lucide-react';
import { ExecutionTrace } from '../../types';

interface TraceHistoryProps {
  traces: ExecutionTrace[];
  onRefresh: () => void;
}

export const TraceHistory: React.FC<TraceHistoryProps> = ({ traces, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-shield-border/60">
        <div>
          <h3 className="text-sm font-bold text-white">Execution Trace History</h3>
          <p className="text-[11px] text-shield-muted">
            Immutable backend audit logs recording prompt inputs, tool calls, and security decisions.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-xl bg-shield-sidebar border border-shield-border text-xs text-shield-text hover:text-white flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-shield-accent" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {traces.length > 0 ? (
          traces.map((tr) => (
            <div
              key={tr.id}
              className="p-4 rounded-xl bg-shield-sidebar/60 border border-shield-border font-mono text-xs space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] text-shield-muted">
                <span className="text-shield-accent font-bold">Session: {tr.session_id}</span>
                <span>{new Date(tr.created_at).toLocaleTimeString()} ({tr.execution_time_ms}ms)</span>
              </div>

              <p className="text-white font-sans text-xs">
                <span className="text-shield-muted font-mono">[Prompt]:</span> {tr.user_input}
              </p>

              {tr.agent_response && (
                <p className="text-shield-muted font-sans text-[11px] bg-black/30 p-2 rounded-lg">
                  {tr.agent_response}
                </p>
              )}

              {tr.tool_calls && tr.tool_calls.length > 0 && (
                <div className="p-2.5 rounded-lg bg-black/50 border border-shield-border/60 text-[10px]">
                  <span className="text-shield-accent font-semibold block mb-1">Tool Invocations:</span>
                  {tr.tool_calls.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between text-shield-muted">
                      <span>{t.tool_name}({JSON.stringify(t.arguments)})</span>
                      <span className={t.status === 'executed' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        [{t.status}]
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-shield-muted text-center py-8">
            No execution traces recorded yet. Send a message in the sandbox to generate traces.
          </p>
        )}
      </div>
    </div>
  );
};
