import React, { useEffect, useState } from 'react';
import {
  Play,
  Swords,
  RefreshCw,
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Clock,
  Eye,
  CheckSquare,
  Square,
  Shield,
  Layers,
  History,
} from 'lucide-react';
import { Agent, AttackScenario, SecurityTest, TestExecution } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { EvidenceModal } from '../components/simulator/EvidenceModal';
import { CustomScenarioModal } from '../components/simulator/CustomScenarioModal';
import { TestRunSummary } from '../components/simulator/TestRunSummary';

export const SimulatorPage: React.FC = () => {
  // State: Agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // State: Scenarios & Categories
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);

  // State: Active Test & Execution
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testName, setTestName] = useState<string>('');
  const [activeTest, setActiveTest] = useState<SecurityTest | null>(null);
  const [recentTests, setRecentTests] = useState<SecurityTest[]>([]);
  const [executionResultFilter, setExecutionResultFilter] = useState<string>('all');

  // State: Modals & Details
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [replayingExecutionId, setReplayingExecutionId] = useState<string | null>(null);

  // Load initial agents and scenarios
  const loadInitialData = async () => {
    try {
      const [agentsData, scenariosData] = await Promise.all([
        api.getAgents(),
        api.getScenarios(),
      ]);

      setAgents(agentsData);
      if (agentsData.length > 0 && !selectedAgentId) {
        setSelectedAgentId(agentsData[0].id);
      }

      setScenarios(scenariosData);
      // Default to selecting all scenarios
      setSelectedScenarioIds(scenariosData.map((s) => s.id));
    } catch (err) {
      console.error('Failed to load initial simulator data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load test history when selected agent changes
  useEffect(() => {
    if (selectedAgentId) {
      api.getSecurityTests(selectedAgentId).then((tests) => {
        setRecentTests(tests);
        if (tests.length > 0 && !activeTest) {
          setActiveTest(tests[0]);
        }
      });
    }
  }, [selectedAgentId]);

  const categories = [
    { id: 'all', label: 'All Attack Vectors' },
    { id: 'prompt_injection', label: 'Prompt Injection' },
    { id: 'unauthorized_tool_usage', label: 'Unauthorized Tool Usage' },
    { id: 'sensitive_data_exposure', label: 'Sensitive Data Exposure' },
    { id: 'excessive_agency', label: 'Excessive Agency' },
  ];

  // Filtering
  const filteredScenarios = scenarios.filter((sc) => {
    const matchesCat = selectedCategory === 'all' || sc.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      sc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Toggle selection
  const toggleScenario = (id: string) => {
    setSelectedScenarioIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredScenarios.map((s) => s.id);
    setSelectedScenarioIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const clearAllFiltered = () => {
    const filteredIds = new Set(filteredScenarios.map((s) => s.id));
    setSelectedScenarioIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  // Run Test Suite
  const handleRunTest = async () => {
    if (!selectedAgentId) {
      alert('Please select a target agent to test.');
      return;
    }
    if (selectedScenarioIds.length === 0) {
      alert('Please select at least one attack scenario.');
      return;
    }

    setIsRunning(true);
    try {
      const result = await api.runSecurityTest({
        agent_id: selectedAgentId,
        scenario_ids: selectedScenarioIds,
        test_name: testName.trim() || undefined,
      });

      setActiveTest(result);
      // Refresh test history
      const updatedTests = await api.getSecurityTests(selectedAgentId);
      setRecentTests(updatedTests);
    } catch (err: any) {
      console.error('Failed to run security test:', err);
      alert(`Simulation failed: ${err.message || 'Error occurred'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Replay Execution
  const handleReplay = async (executionId: string) => {
    if (!activeTest) return;

    setReplayingExecutionId(executionId);
    try {
      const replayExec = await api.replayExecution(activeTest.id, executionId);

      // Add replayed execution to active test view
      setActiveTest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          executions: [replayExec, ...prev.executions],
        };
      });

      // Update currently inspected execution if open
      setSelectedExecution(replayExec);
    } catch (err: any) {
      alert(`Replay failed: ${err.message}`);
    } finally {
      setReplayingExecutionId(null);
    }
  };

  const openEvidence = (exec: TestExecution) => {
    setSelectedExecution(exec);
    setIsEvidenceModalOpen(true);
  };

  const filteredExecutions = activeTest?.executions.filter((e) => {
    if (executionResultFilter === 'all') return true;
    return e.result === executionResultFilter;
  }) || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-shield-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Adversarial Attack Simulator</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-shield-primary/20 text-shield-accent border border-shield-accent/30 font-semibold">
              PHASE 3 ACTIVE
            </span>
          </div>
          <p className="text-xs text-shield-muted mt-1">
            Execute controlled adversarial payloads, evaluate boundary robustness, and verify security control effectiveness.
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
            onClick={() => setIsCustomModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-shield-card hover:bg-shield-cardHover border border-shield-border text-shield-text hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-shield-accent" />
            <span>New Scenario</span>
          </button>
        </div>
      </div>

      {/* Test Execution Summary if available */}
      {activeTest && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-shield-accent uppercase tracking-wider font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Latest Test Suite Results
            </span>

            {/* Test History Selector */}
            {recentTests.length > 1 && (
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-shield-muted" />
                <span className="text-[11px] text-shield-muted">History:</span>
                <select
                  value={activeTest.id}
                  onChange={(e) => {
                    const found = recentTests.find((t) => t.id === e.target.value);
                    if (found) setActiveTest(found);
                  }}
                  className="px-2 py-1 rounded bg-shield-card border border-shield-border text-[11px] text-shield-text focus:outline-none"
                >
                  {recentTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.test_name} ({new Date(t.created_at).toLocaleTimeString()}) - Score: {t.overall_risk_score}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <TestRunSummary test={activeTest} />

          {/* Executions Table */}
          <div className="p-6 rounded-2xl bg-shield-card border border-shield-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-shield-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Scenario Execution Breakdown</h3>
                <span className="text-xs font-mono text-shield-muted">
                  ({filteredExecutions.length} shown)
                </span>
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 text-xs">
                {['all', 'blocked', 'vulnerable', 'passed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setExecutionResultFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-mono uppercase text-[10px] transition-all ${
                      executionResultFilter === st
                        ? 'bg-shield-accent/20 text-shield-accent border border-shield-accent/40 font-bold'
                        : 'text-shield-muted hover:text-white bg-shield-sidebar border border-shield-border'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Execution Rows */}
            <div className="divide-y divide-shield-border/60">
              {filteredExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-shield-sidebar/40 px-2 rounded-xl transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Result Pill */}
                      {exec.result === 'blocked' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                          <ShieldCheck className="w-3 h-3" /> BLOCKED
                        </span>
                      ) : exec.result === 'vulnerable' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono">
                          <AlertTriangle className="w-3 h-3" /> VULNERABLE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                          <CheckCircle className="w-3 h-3" /> PASSED
                        </span>
                      )}

                      <span className="text-[10px] font-mono uppercase text-shield-muted">
                        {exec.scenario?.category?.replace(/_/g, ' ') || 'SCENARIO'}
                      </span>

                      {exec.is_replay && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          REPLAY
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white">
                      {exec.scenario?.name || 'Adversarial Test'}
                    </h4>
                    <p className="text-[11px] text-shield-muted line-clamp-1">
                      {exec.evaluator_output?.evaluation_reason || exec.prompt_sent}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs self-end md:self-center">
                    <span className="text-[10px] font-mono text-shield-muted mr-2">
                      {exec.execution_time_ms}ms
                    </span>

                    <button
                      onClick={() => openEvidence(exec)}
                      className="px-3 py-1.5 rounded-lg bg-shield-sidebar hover:bg-shield-cardHover border border-shield-border text-shield-text hover:text-white text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-shield-accent" />
                      <span>Evidence</span>
                    </button>

                    <button
                      onClick={() => handleReplay(exec.id)}
                      disabled={replayingExecutionId === exec.id}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${replayingExecutionId === exec.id ? 'animate-spin' : ''}`} />
                      <span>Replay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scenario Catalog & Run Section */}
      <div className="space-y-4 pt-4 border-t border-shield-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Swords className="w-5 h-5 text-shield-accent" /> Attack Scenario Catalog
            </h2>
            <p className="text-xs text-shield-muted">
              Select one or more scenarios to execute against the target agent in a sandboxed runtime.
            </p>
          </div>

          {/* Action to Run */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Suite Name (optional)"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-shield-card border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent hidden md:block w-48"
            />
            <button
              onClick={handleRunTest}
              disabled={isRunning || selectedScenarioIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-shield-primary hover:bg-shield-primaryHover disabled:opacity-50 text-white text-xs font-semibold glow-primary flex items-center gap-2 transition-all"
            >
              <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-pulse' : ''}`} />
              <span>
                {isRunning
                  ? 'Simulating Suite...'
                  : `Run Attack Suite (${selectedScenarioIds.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === c.id
                    ? 'bg-shield-primary text-white shadow-sm glow-primary'
                    : 'bg-shield-card hover:bg-shield-cardHover text-shield-muted hover:text-white border border-shield-border'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-shield-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-shield-card border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
              />
            </div>
            <button
              onClick={selectAllFiltered}
              className="px-2.5 py-1.5 rounded-lg bg-shield-card hover:bg-shield-cardHover border border-shield-border text-shield-text text-xs whitespace-nowrap"
            >
              Select All
            </button>
            <button
              onClick={clearAllFiltered}
              className="px-2.5 py-1.5 rounded-lg bg-shield-card hover:bg-shield-cardHover border border-shield-border text-shield-text text-xs whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Scenario Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((sc) => {
            const isSelected = selectedScenarioIds.includes(sc.id);
            return (
              <div
                key={sc.id}
                onClick={() => toggleScenario(sc.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-shield-primary/10 border-shield-accent/50 shadow-md'
                    : 'bg-shield-card border-shield-border hover:border-shield-borderLight opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-shield-accent flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-shield-muted flex-shrink-0" />
                      )}
                      <span className="text-[10px] font-mono uppercase text-shield-muted tracking-wider">
                        {sc.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Badge label={sc.severity} variant={sc.severity} size="sm" />
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug mb-1">{sc.name}</h4>
                  <p className="text-[11px] text-shield-muted line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-shield-border/40 flex items-center justify-between text-[10px] font-mono text-shield-muted">
                  <span>Version v{sc.version || 1}</span>
                  <span className="text-shield-accent">
                    {sc.synthetic_secrets && sc.synthetic_secrets.length > 0
                      ? `${sc.synthetic_secrets.length} canaries`
                      : 'behavioral test'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forensic Evidence Modal */}
      <EvidenceModal
        execution={selectedExecution}
        onClose={() => setIsEvidenceModalOpen(false)}
        onReplay={handleReplay}
        isReplaying={replayingExecutionId === selectedExecution?.id}
      />

      {/* Custom Scenario Authoring Modal */}
      <CustomScenarioModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onCreated={(newScenario) => {
          setScenarios((prev) => [newScenario, ...prev]);
          setSelectedScenarioIds((prev) => [newScenario.id, ...prev]);
        }}
      />
    </div>
  );
};
