import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Radio,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  Check,
  Ban,
  ShieldCheck,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { api } from '../services/api';
import { SecurityMonitorEvent, SecurityAlert, MonitoringSummary, Agent } from '../types';

export const MonitoringPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityMonitorEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'active' | 'acknowledged' | 'dismissed'>('active');
  const [activeTab, setActiveTab] = useState<'alerts' | 'events'>('alerts');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityMonitorEvent | null>(null);
  const [triageLoadingId, setTriageLoadingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsData, summaryData, eventsData, alertsData] = await Promise.all([
        api.getAgents(),
        api.getMonitoringSummary(selectedAgentId || undefined),
        api.getMonitoringEvents({
          agent_id: selectedAgentId || undefined,
          severity: selectedSeverity || undefined,
        }),
        api.getSecurityAlerts({
          agent_id: selectedAgentId || undefined,
          status: alertStatusFilter,
        }),
      ]);
      setAgents(agentsData);
      setSummary(summaryData);
      setEvents(eventsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to fetch monitoring telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAgentId, selectedSeverity, alertStatusFilter]);

  const handleUpdateAlertStatus = async (alertId: string, newStatus: 'acknowledged' | 'dismissed') => {
    try {
      setTriageLoadingId(alertId);
      await api.updateAlertStatus(alertId, newStatus);
      // Refresh alerts and summary
      const [updatedAlerts, updatedSummary] = await Promise.all([
        api.getSecurityAlerts({
          agent_id: selectedAgentId || undefined,
          status: alertStatusFilter,
        }),
        api.getMonitoringSummary(selectedAgentId || undefined),
      ]);
      setAlerts(updatedAlerts);
      setSummary(updatedSummary);
    } catch (err) {
      console.error('Failed to update alert status', err);
    } finally {
      setTriageLoadingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border border-red-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Radio className="w-6 h-6 text-cyan-400" />
              Continuous Security Monitoring & Alerting
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time runtime event interception, security posture tracking, and alert triage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter by Agent */}
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 outline-none"
          >
            <option value="">All Agents</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Events</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{summary?.total_events ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Ingested runtime telemetry</div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{summary?.active_alerts_count ?? 0}</span>
            {(summary?.critical_alerts_count ?? 0) > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold animate-pulse">
                {summary?.critical_alerts_count} Critical
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Pending security triage</div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Defense Ratio</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {summary?.defense_ratio_percentage ?? 100}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary?.blocked_events ?? 0} blocked vs {summary?.exploit_events ?? 0} exploits
          </div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Triaged / Acknowledged</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{summary?.acknowledged_alerts_count ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Historical alerts audited</div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 -mb-2 ${
              activeTab === 'alerts'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Security Alert Center ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 -mb-2 ${
              activeTab === 'events'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Real-Time Telemetry Feed ({events.length})
          </button>
        </div>

        {activeTab === 'alerts' ? (
          <div className="flex items-center gap-2">
            {(['active', 'acknowledged', 'dismissed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setAlertStatusFilter(status)}
                className={`text-xs px-2.5 py-1 rounded-md capitalize transition font-medium ${
                  alertStatusFilter === status
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1 outline-none"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="info">Info</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Security Alert Center */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-white">No {alertStatusFilter} alerts</h3>
              <p className="text-sm text-slate-400 mt-1">
                {alertStatusFilter === 'active'
                  ? 'Your autonomous agents are safe. No unresolved security alerts detected.'
                  : `No alerts currently in '${alertStatusFilter}' state.`}
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>

                {alert.evidence_references && alert.evidence_references.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Evidence:</span>
                    {alert.evidence_references.map((ref, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                        {ref}
                      </span>
                    ))}
                  </div>
                )}

                {alert.recommended_response && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-400">
                    <span className="text-cyan-400 font-semibold">Recommended Triage: </span>
                    {alert.recommended_response}
                  </div>
                )}

                {alert.status === 'active' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleUpdateAlertStatus(alert.id, 'dismissed')}
                      disabled={triageLoadingId === alert.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5 text-slate-400" />
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleUpdateAlertStatus(alert.id, 'acknowledged')}
                      disabled={triageLoadingId === alert.id}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Acknowledge & Mark Reviewed
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Real-Time Telemetry Event Feed */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No monitoring events</h3>
              <p className="text-sm text-slate-400 mt-1">
                Telemetry events from agent sandbox chats and security simulations will stream here.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
              <div className="divide-y divide-slate-800">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 hover:bg-slate-800/40 transition flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getSeverityBadge(evt.severity)}`}>
                          {evt.severity}
                        </span>
                        <span className="text-xs font-mono font-semibold text-cyan-300">{evt.event_type}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">
                        {evt.details?.reason || evt.details?.description || `Recorded ${evt.event_type} on agent.`}
                      </p>
                      {evt.details?.tool_name && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          Target Tool: <span className="text-amber-400">{evt.details.tool_name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedEvent(evt)}
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      Trace
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">Telemetry Event: {selectedEvent.event_type}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div><span className="text-slate-500">Event ID:</span> <span className="font-mono text-slate-300">{selectedEvent.id.slice(0, 12)}...</span></div>
                <div><span className="text-slate-500">Severity:</span> <span className="uppercase font-bold text-slate-300">{selectedEvent.severity}</span></div>
                <div><span className="text-slate-500">Timestamp:</span> <span className="text-slate-300">{new Date(selectedEvent.timestamp).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Agent ID:</span> <span className="font-mono text-slate-300">{selectedEvent.agent_id.slice(0, 12)}...</span></div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold mb-1 block">Full Telemetry JSON:</span>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
