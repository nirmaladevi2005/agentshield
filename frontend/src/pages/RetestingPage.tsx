import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  History,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Agent, SecurityTest, RetestComparison, RetestSchedule } from '../types';

export const RetestingPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [tests, setTests] = useState<SecurityTest[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('');
  const [comparisons, setComparisons] = useState<RetestComparison[]>([]);
  const [selectedComparison, setSelectedComparison] = useState<RetestComparison | null>(null);
  const [schedules, setSchedules] = useState<RetestSchedule[]>([]);

  // Schedule modal state
  const [scheduleFreq, setScheduleFreq] = useState<'hourly' | 'daily' | 'weekly' | 'post_policy_change'>('daily');
  const [scheduleActive, setScheduleActive] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [runningRetest, setRunningRetest] = useState<boolean>(false);
  const [saveScheduleLoading, setSaveScheduleLoading] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      loadAgentData(selectedAgentId);
    }
  }, [selectedAgentId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const agentsList = await api.getAgents();
      setAgents(agentsList);
      if (agentsList.length > 0) {
        setSelectedAgentId(agentsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load agents', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentData = async (agentId: string) => {
    try {
      const [testsList, compsList, schedsList] = await Promise.all([
        api.getSecurityTests(agentId),
        api.getRetestComparisons(agentId),
        api.getRetestSchedules(agentId),
      ]);
      setTests(testsList);
      if (testsList.length > 0) {
        setSelectedBaselineId(testsList[0].id);
      }
      setComparisons(compsList);
      if (compsList.length > 0) {
        setSelectedComparison(compsList[0]);
      } else {
        setSelectedComparison(null);
      }
      setSchedules(schedsList);
      if (schedsList.length > 0) {
        setScheduleFreq(schedsList[0].frequency as any);
        setScheduleActive(schedsList[0].is_active);
      }
    } catch (err) {
      console.error('Failed to load agent retesting data', err);
    }
  };

  const handleRunRetest = async () => {
    if (!selectedAgentId || !selectedBaselineId) return;
    try {
      setRunningRetest(true);
      const result = await api.runRetest({
        agent_id: selectedAgentId,
        baseline_test_id: selectedBaselineId,
      });

      // Reload tests and comparisons
      await loadAgentData(selectedAgentId);
      if (result.comparison) {
        setSelectedComparison(result.comparison);
      }
    } catch (err) {
      console.error('Retest execution failed', err);
      alert('Retest execution failed. Please ensure the baseline test has recorded scenario runs.');
    } finally {
      setRunningRetest(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedAgentId) return;
    try {
      setSaveScheduleLoading(true);
      await api.saveRetestSchedule({
        agent_id: selectedAgentId,
        frequency: scheduleFreq,
        is_active: scheduleActive,
      });
      const schedsList = await api.getRetestSchedules(selectedAgentId);
      setSchedules(schedsList);
      alert('Retest schedule updated successfully!');
    } catch (err) {
      console.error('Failed to update retest schedule', err);
    } finally {
      setSaveScheduleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-400" />
            Automated Security Retesting & Differential Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Re-run attack scenarios against historical baselines, track fixed vulnerabilities, and detect regressions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none"
          >
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trigger & Scheduler Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retest Trigger Card */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Execute Regression Retest</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
              Deterministic Differential
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Select Baseline Test Run:</label>
              <select
                value={selectedBaselineId}
                onChange={(e) => setSelectedBaselineId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 outline-none font-sans"
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.test_name || (t as any).name || 'Benchmark Test'} (Risk: {t.overall_risk_score ?? 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Target Agent Under Assessment:</label>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium">
                {agents.find((a) => a.id === selectedAgentId)?.name || 'Select Agent'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Compares active permissions and prompt guardrails against previous execution traces.
            </span>
            <button
              onClick={handleRunRetest}
              disabled={runningRetest || !selectedBaselineId}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50 shadow-md shadow-purple-900/30"
            >
              <RotateCcw className={`w-4 h-4 ${runningRetest ? 'animate-spin' : ''}`} />
              {runningRetest ? 'Simulating & Comparing...' : 'Run Regression Retest'}
            </button>
          </div>
        </div>

        {/* Retest Schedule Card */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Continuous Retest Schedule</h2>
          </div>
          <p className="text-xs text-slate-400">
            Automatically trigger regression tests on a cadence or following policy changes.
          </p>

          <div className="space-y-3 pt-1 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Frequency:</label>
              <select
                value={scheduleFreq}
                onChange={(e) => setScheduleFreq(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 outline-none"
              >
                <option value="post_policy_change">Post-Policy Hardening (Recommended)</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeSchedule"
                checked={scheduleActive}
                onChange={(e) => setScheduleActive(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded bg-slate-950 border-slate-800"
              />
              <label htmlFor="activeSchedule" className="text-xs text-slate-300 font-medium">
                Active Continuous Execution
              </label>
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={saveScheduleLoading}
              className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              {saveScheduleLoading ? 'Saving...' : 'Save Schedule Policy'}
            </button>
          </div>
        </div>
      </div>

      {/* Differential Comparison View */}
      {selectedComparison ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Differential Analysis Report</h2>
              <span className="text-xs text-slate-400 font-mono">
                ({new Date(selectedComparison.created_at).toLocaleString()})
              </span>
            </div>

            {/* Score Delta Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Risk Score Delta:</span>
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedComparison.score_delta >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}
              >
                {selectedComparison.score_delta >= 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{selectedComparison.score_delta} Improvement
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" />
                    {selectedComparison.score_delta} Regression
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Fixed Findings</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {selectedComparison.resolved_count}
              </div>
              <span className="text-[11px] text-slate-400">Neutralized in retest</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Unresolved Issues</span>
              <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {selectedComparison.unresolved_count}
              </div>
              <span className="text-[11px] text-slate-400">Still active exploits</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">New Regressions</span>
              <div className="text-2xl font-bold text-red-400 mt-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {selectedComparison.new_issues_count}
              </div>
              <span className="text-[11px] text-slate-400">Previously safe, now exploited</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Total Scenarios</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                {selectedComparison.comparison_summary?.total_scenarios_compared ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Differential coverage</span>
            </div>
          </div>

          {/* Regression Critical Alert Callout if regressed */}
          {selectedComparison.new_issues_count > 0 && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-red-300">
                  Critical Security Regression Detected ({selectedComparison.new_issues_count} Scenario(s))
                </h4>
                <p className="text-xs text-red-200/80 mt-1">
                  Scenarios that passed during the baseline run are now vulnerable under the current configuration!
                  An automated critical security alert has been dispatched to the Monitoring Center.
                </p>
              </div>
            </div>
          )}

          {/* Differential Scenario Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="p-3">Scenario Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Baseline Run</th>
                  <th className="p-3">Current Retest</th>
                  <th className="p-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {/* Fixed Findings */}
                {selectedComparison.comparison_summary?.fixed_findings?.map((item) => (
                  <tr key={item.scenario_id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">{item.scenario_name}</td>
                    <td className="p-3 text-slate-400">{item.category}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono">
                        {item.baseline_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                        {item.current_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 uppercase text-[10px]">
                        FIXED
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Regressed Findings */}
                {selectedComparison.comparison_summary?.regressed_findings?.map((item) => (
                  <tr key={item.scenario_id} className="hover:bg-red-950/20 bg-red-950/10">
                    <td className="p-3 font-semibold text-white">{item.scenario_name}</td>
                    <td className="p-3 text-slate-400">{item.category}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                        {item.baseline_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono font-bold">
                        {item.current_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/40 uppercase text-[10px] animate-pulse">
                        REGRESSED
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Unresolved Findings */}
                {selectedComparison.comparison_summary?.unresolved_findings?.map((item) => (
                  <tr key={item.scenario_id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">{item.scenario_name}</td>
                    <td className="p-3 text-slate-400">{item.category}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono">
                        {item.baseline_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono">
                        {item.current_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 uppercase text-[10px]">
                        UNRESOLVED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80">
          <RotateCcw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Retest Differential Records Yet</h3>
          <p className="text-sm text-slate-400 mt-1">
            Execute a regression retest above to generate a differential analysis against a baseline run.
          </p>
        </div>
      )}

      {/* Historical Retest Comparisons Drawer/List */}
      {comparisons.length > 1 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Historical Differential Runs</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {comparisons.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComparison(c)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                  selectedComparison?.id === c.id
                    ? 'bg-purple-950/30 border-purple-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  <span className={c.score_delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    Delta: {c.score_delta >= 0 ? `+${c.score_delta}` : c.score_delta}
                  </span>
                </div>
                <div className="text-slate-300 font-medium">
                  Fixed: <span className="text-emerald-400 font-bold">{c.resolved_count}</span> • Unresolved:{' '}
                  <span className="text-amber-400 font-bold">{c.unresolved_count}</span>
                  {c.new_issues_count > 0 && (
                    <>
                      {' '}
                      • Regressed: <span className="text-red-400 font-bold">{c.new_issues_count}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
