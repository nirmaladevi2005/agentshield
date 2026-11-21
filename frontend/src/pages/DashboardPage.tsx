import React, { useEffect, useState } from 'react';
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Activity,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Lock,
  CheckCircle,
  Clock,
  Radio,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';

import { StatsCard } from '../components/common/StatsCard';
import { Badge } from '../components/common/Badge';
import { DashboardStats, MonitoringSummary, RetestComparison } from '../types';
import { api } from '../services/api';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monitoringSummary, setMonitoringSummary] = useState<MonitoringSummary | null>(null);
  const [comparisons, setComparisons] = useState<RetestComparison[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, monData, compData] = await Promise.all([
        api.getDashboardStats(),
        api.getMonitoringSummary().catch(() => null),
        api.getRetestComparisons().catch(() => []),
      ]);
      setStats(dashData);
      setMonitoringSummary(monData);
      setComparisons(compData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const pieColors = ['#A855F7', '#EF4444', '#10B981']; // Blocked (purple), Exploited (red), Safe (green)

  const pieData = stats
    ? [
        { name: 'Blocked', value: stats.block_vs_success.attack_blocked },
        { name: 'Exploited', value: stats.block_vs_success.attack_succeeded },
        { name: 'Safe Passed', value: stats.block_vs_success.safe_passed },
      ]
    : [];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-shield-border/60 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Security Intelligence Overview</h1>
            <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Database
            </span>
          </div>
          <p className="text-xs sm:text-sm text-shield-muted mt-1">
            Real-time security telemetry, attack telemetry, and vulnerability metrics across registered agents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-shield-card hover:bg-shield-cardHover border border-shield-border text-xs font-medium text-shield-text flex items-center space-x-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-shield-accent ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={() => onNavigate('simulator')}
            className="px-4 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover text-xs font-semibold text-white glow-primary shadow-sm flex items-center space-x-2 transition-all"
          >
            <span>Run Security Test</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error notification if any */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <span>Failed to connect to backend: {error}</span>
          <button onClick={fetchStats} className="underline text-red-200 ml-4 font-mono">Retry</button>
        </div>
      )}

      {/* Phase 5: Continuous Security Operations & Retest Posture Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Live Threat Monitoring Status */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Security Monitoring</span>
              {(monitoringSummary?.active_alerts_count ?? 0) > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse">
                  {monitoringSummary?.active_alerts_count} Active Alert(s)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Zero Active Alerts
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Runtime tool policy interception, canary leak detectors & alert triage active.
            </p>
          </div>
        </div>

        {/* Right: Quick Action Links & Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
            Defense Ratio: <span className="text-emerald-400 font-bold">{monitoringSummary?.defense_ratio_percentage ?? 100}%</span>
          </div>

          <button
            onClick={() => onNavigate('monitoring')}
            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Alert Center</span>
          </button>

          <button
            onClick={() => onNavigate('retesting')}
            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retest Diff</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <span>Compliance Audit</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="TOTAL AGENTS"
          value={stats ? stats.kpis.total_agents : '-'}
          subtitle="Registered autonomous agents"
          icon={Bot}
          variant="primary"
        />
        <StatsCard
          title="TESTS EXECUTED"
          value={stats ? stats.kpis.security_tests_executed : '-'}
          subtitle="Red-team benchmark suites"
          icon={Activity}
          variant="accent"
        />
        <StatsCard
          title="VULNERABILITIES"
          value={stats ? stats.kpis.vulnerabilities_detected : '-'}
          subtitle="Confirmed security risks"
          icon={ShieldAlert}
          variant="warning"
        />
        <StatsCard
          title="CRITICAL FINDINGS"
          value={stats ? stats.kpis.critical_findings : '-'}
          subtitle="Urgent action required"
          icon={Flame}
          variant="critical"
        />
        <StatsCard
          title="AVG RISK SCORE"
          value={stats ? `${stats.kpis.average_risk_score}/100` : '-'}
          subtitle="Higher represents safer posture"
          icon={ShieldCheck}
          variant="success"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vulnerability Distribution Bar Chart */}
        <div className="p-5 rounded-2xl bg-shield-card border border-shield-border lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Vulnerability Distribution by Category</h3>
              <p className="text-[11px] text-shield-muted">Confirmed findings mapped across attack vectors</p>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
              <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> High</span>
              <span className="flex items-center gap-1 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500" /> Medium</span>
            </div>
          </div>

          <div className="h-64">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.vulnerability_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickFormatter={(val) => val.replace(/_/g, ' ')}
                  />
                  <YAxis stroke="#94A3B8" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1526', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="critical" fill="#EF4444" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="high" fill="#F59E0B" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="medium" fill="#38BDF8" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Attack Outcome Donut Chart */}
        <div className="p-5 rounded-2xl bg-shield-card border border-shield-border">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-wide">Attack Defense Rate</h3>
            <p className="text-[11px] text-shield-muted">Blocked vs Exploited vs Safe Refusal</p>
          </div>

          <div className="h-48 flex items-center justify-center">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1526', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-shield-border/60 text-center font-mono">
            <div className="p-2 rounded-lg bg-shield-sidebar/60 border border-shield-border/40">
              <span className="text-[10px] text-purple-400 block font-semibold">BLOCKED</span>
              <span className="text-sm font-bold text-white">{stats?.block_vs_success.attack_blocked || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-shield-sidebar/60 border border-shield-border/40">
              <span className="text-[10px] text-red-400 block font-semibold">EXPLOITED</span>
              <span className="text-sm font-bold text-white">{stats?.block_vs_success.attack_succeeded || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-shield-sidebar/60 border border-shield-border/40">
              <span className="text-[10px] text-emerald-400 block font-semibold">SAFE</span>
              <span className="text-sm font-bold text-white">{stats?.block_vs_success.safe_passed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Test Activity Timeline & Agent Risk Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Area Chart */}
        <div className="p-5 rounded-2xl bg-shield-card border border-shield-border lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Security Test Activity Timeline</h3>
              <p className="text-[11px] text-shield-muted">Volume of executed test suites and detected risks over time</p>
            </div>
            <span className="text-[10px] font-mono text-shield-accent flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> 7-Day Window
            </span>
          </div>

          <div className="h-60">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVulns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                  <YAxis stroke="#94A3B8" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1526', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="tests_run" name="Tests Executed" stroke="#6366F1" fillOpacity={1} fill="url(#colorTests)" />
                  <Area type="monotone" dataKey="vulnerabilities" name="Vulnerabilities Found" stroke="#EF4444" fillOpacity={1} fill="url(#colorVulns)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Agent Risk Leaderboard */}
        <div className="p-5 rounded-2xl bg-shield-card border border-shield-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Agent Risk Comparison</h3>
              <p className="text-[11px] text-shield-muted">Security posture per registered agent</p>
            </div>
            <button onClick={() => onNavigate('agents')} className="text-xs text-shield-accent hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {stats && stats.agent_comparisons.length > 0 ? (
              stats.agent_comparisons.map((ag) => (
                <div
                  key={ag.agent_id}
                  className="p-3 rounded-xl bg-shield-sidebar/60 border border-shield-border flex items-center justify-between hover:border-shield-borderLight transition-all"
                >
                  <div className="max-w-[65%]">
                    <p className="text-xs font-semibold text-white truncate">{ag.agent_name}</p>
                    <span className="text-[10px] text-shield-muted font-mono">
                      {ag.critical_count > 0 ? `${ag.critical_count} critical issues` : 'No critical issues'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold ${ag.risk_score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {ag.risk_score}/100
                    </span>
                    <p className="text-[9px] uppercase font-mono text-shield-muted">{ag.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-shield-muted text-center py-6">No agents registered yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Security Tests Feed */}
      <div className="p-5 rounded-2xl bg-shield-card border border-shield-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Recent Security Test Runs</h3>
            <p className="text-[11px] text-shield-muted">Audit trail of recently executed adversarial simulations</p>
          </div>
          <button onClick={() => onNavigate('reports')} className="text-xs text-shield-accent hover:underline flex items-center gap-1">
            <span>View Reports</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-shield-sidebar/60 text-shield-muted uppercase tracking-wider font-mono text-[10px] border-b border-shield-border">
              <tr>
                <th className="py-3 px-4">Target Agent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Security Score</th>
                <th className="py-3 px-4">Critical Findings</th>
                <th className="py-3 px-4">Scenarios Run</th>
                <th className="py-3 px-4">Executed Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shield-border/40 font-mono">
              {stats && stats.recent_tests.length > 0 ? (
                stats.recent_tests.map((rt) => (
                  <tr key={rt.test_id} className="hover:bg-shield-sidebar/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-white">{rt.agent_name}</td>
                    <td className="py-3 px-4">
                      <Badge label={rt.status} variant={rt.status === 'completed' ? 'success' : 'info'} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${rt.score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {rt.score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {rt.critical_findings > 0 ? (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {rt.critical_findings}
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> 0
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-shield-muted">{rt.total_scenarios}</td>
                    <td className="py-3 px-4 text-shield-muted text-[11px]">
                      {new Date(rt.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate('reports')}
                        className="px-2.5 py-1 rounded-lg bg-shield-card hover:bg-shield-cardHover border border-shield-border text-white text-[11px] font-sans"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-shield-muted font-sans">
                    No security test executions logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
