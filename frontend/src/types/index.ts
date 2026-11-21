export interface SummaryKPI {
  total_agents: number;
  security_tests_executed: number;
  vulnerabilities_detected: number;
  critical_findings: number;
  average_risk_score: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface BlockVsSuccessRate {
  attack_blocked: number;
  attack_succeeded: number;
  safe_passed: number;
}

export interface TimelinePoint {
  date: string;
  tests_run: number;
  vulnerabilities: number;
}

export interface AgentRiskComparison {
  agent_id: string;
  agent_name: string;
  risk_score: number;
  critical_count: number;
  status: string;
}

export interface RecentTestSummary {
  test_id: string;
  agent_name: string;
  status: string;
  score: number;
  critical_findings: number;
  total_scenarios: number;
  created_at: string;
}

export interface DashboardStats {
  kpis: SummaryKPI;
  vulnerability_distribution: CategoryCount[];
  block_vs_success: BlockVsSuccessRate;
  timeline: TimelinePoint[];
  agent_comparisons: AgentRiskComparison[];
  recent_tests: RecentTestSummary[];
}

export interface AgentPermission {
  id: string;
  tool_name: string;
  is_allowed: boolean;
  requires_human_approval: boolean;
  rate_limit_per_min: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  integration_type: string;
  endpoint_url?: string;
  system_prompt?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions: AgentPermission[];
}

export interface AttackScenario {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  test_input: string;
  expected_behavior: string;
  synthetic_secrets: string[];
  target_tool?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[];
  version?: number;
  evaluation_criteria?: Record<string, any>;
}

export interface EvaluatorOutput {
  test_status: 'blocked' | 'vulnerable' | 'passed' | 'inconclusive';
  attack_attempted: boolean;
  attack_succeeded: boolean;
  control_effective: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evaluation_reason: string;
  confidence: number;
  evidence: Record<string, any>;
}

export interface TestExecution {
  id: string;
  test_id: string;
  scenario_id: string;
  agent_id: string;
  scenario_version?: number;
  is_replay: boolean;
  replayed_from_id?: string;
  prompt_sent: string;
  agent_response?: string;
  tool_calls_detected?: any[];
  permission_decisions?: any[];
  result: 'blocked' | 'vulnerable' | 'passed' | 'inconclusive';
  evaluator_output?: EvaluatorOutput;
  execution_time_ms: number;
  created_at: string;
  scenario?: AttackScenario;
}

export interface SecurityTest {
  id: string;
  user_id: string;
  agent_id: string;
  test_name: string;
  name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_scenarios: number;
  passed_scenarios: number;
  failed_scenarios: number;
  blocked_scenarios: number;
  inconclusive_scenarios: number;
  overall_risk_score: number;
  created_at: string;
  completed_at?: string;
  executions: TestExecution[];
}

export interface FindingRecommendation {
  id: string;
  finding_id: string;
  recommendation_text: string;
  implementation_code?: string;
  mitigation_type: string;
}

export interface VulnerabilityFinding {
  id: string;
  test_id: string;
  scenario_id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence?: Record<string, any>;
  evaluator_type: string;
  confidence: number;
  status: 'open' | 'resolved' | 'acknowledged';
  remediation_patch?: string;
  created_at: string;
  recommendations: FindingRecommendation[];
}

export interface SandboxSession {
  session_id: string;
  agent_id: string;
  agent_name: string;
  integration_type: string;
  welcome_message: string;
  allowed_tools: string[];
  restricted_tools: string[];
  system_prompt?: string;
}

export interface ToolCallResult {
  tool_name: string;
  arguments: Record<string, any>;
  decision: 'allowed' | 'blocked' | 'requires_approval';
  reason?: string;
  result?: any;
  status: 'executed' | 'blocked' | 'approval_required';
}

export interface SandboxMessageResponse {
  session_id: string;
  agent_response: string;
  tool_calls: ToolCallResult[];
  execution_time_ms: number;
}

export interface ExecutionTrace {
  id: string;
  agent_id: string;
  session_id: string;
  user_input: string;
  agent_response?: string;
  tool_calls: ToolCallResult[];
  permission_decisions: Array<{ tool_name: string; decision: string; reason: string }>;
  execution_time_ms: number;
  created_at: string;
}

export interface VulnerabilityIntelligence {
  id: string;
  finding_id: string;
  explanation: string;
  root_cause_hypothesis: string;
  attack_technique: string;
  observed_facts: Record<string, any>;
  ai_hypotheses: Record<string, any>;
  security_impact: string;
  business_impact: string;
  recommended_remediation: string;
  confidence_score: number;
  evidence_references: string[];
  ai_provider: string;
  tokens_used: number;
  created_at: string;
}

export interface RemediationPlan {
  finding_id: string;
  category: string;
  root_cause: string;
  recommended_fix: string;
  proposed_policy_changes: Record<string, any>;
  example_configuration: string;
  expected_security_improvement: string;
  validation_test_scenarios: string[];
}

export interface PolicyRecommendation {
  id: string;
  agent_id: string;
  finding_id?: string;
  tool_name: string;
  current_policy: {
    is_allowed: boolean;
    requires_human_approval: boolean;
    rate_limit_per_min: number;
  };
  proposed_policy: {
    is_allowed: boolean;
    requires_human_approval: boolean;
    rate_limit_per_min: number;
  };
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  created_at: string;
  reviewed_at?: string;
}

export interface PolicyApplyResponse {
  agent_id: string;
  applied_count: number;
  applied_changes: Array<{
    recommendation_id: string;
    tool_name: string;
    is_allowed: boolean;
    requires_human_approval: boolean;
    rate_limit_per_min: number;
  }>;
}

export interface RetestResponse {
  test_id: string;
  test_name: string;
  total_scenarios: number;
  blocked_scenarios: number;
  failed_scenarios: number;
  passed_scenarios: number;
  overall_risk_score: number;
  status: string;
  hardening_verified: boolean;
}

export interface GeminiSettings {
  status: string;
  model: string;
  api_key_configured: boolean;
  offline_fallback_active: boolean;
  latency_ms?: number;
  message: string;
}

export interface SecurityMonitorEvent {
  id: string;
  agent_id: string;
  event_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  details: Record<string, any>;
  timestamp: string;
}

export interface SecurityAlert {
  id: string;
  agent_id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence_references: string[];
  recommended_response?: string;
  status: 'active' | 'acknowledged' | 'dismissed';
  created_at: string;
  acknowledged_at?: string;
}

export interface MonitoringSummary {
  total_events: number;
  blocked_events: number;
  exploit_events: number;
  defense_ratio_percentage: number;
  active_alerts_count: number;
  critical_alerts_count: number;
  high_alerts_count: number;
  acknowledged_alerts_count: number;
}

export interface RetestComparisonFinding {
  scenario_id: string;
  scenario_name: string;
  category: string;
  baseline_status: string;
  current_status: string;
  classification: 'fixed' | 'unresolved' | 'regressed' | 'retained_secure';
  control_effective: boolean;
}

export interface RetestComparisonSummary {
  fixed_findings: RetestComparisonFinding[];
  unresolved_findings: RetestComparisonFinding[];
  regressed_findings: RetestComparisonFinding[];
  inconclusive_findings: any[];
  total_scenarios_compared: number;
  baseline_score: number;
  current_score: number;
  score_delta: number;
}

export interface RetestComparison {
  id: string;
  previous_test_id: string;
  current_test_id: string;
  resolved_count: number;
  unresolved_count: number;
  new_issues_count: number;
  score_delta: number;
  comparison_summary: RetestComparisonSummary;
  created_at: string;
}

export interface RetestSchedule {
  id: string;
  agent_id: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'post_policy_change';
  scenario_ids: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

export interface ComplianceControl {
  control_id: string;
  title: string;
  description: string;
  verification_type: 'MEASURED_EMPIRICAL' | 'UNVERIFIED_INSUFFICIENT_TEST_DATA';
  status: 'PASS' | 'FAIL' | 'NOT_TESTED';
  evidence_executions_count: number;
  active_vulnerabilities_count: number;
  blocked_attempts_count?: number;
  finding_ids?: string[];
  details: string;
}

export interface ComplianceReport {
  id: string;
  user_id: string;
  agent_id?: string;
  title: string;
  framework: string;
  summary: string;
  score: {
    measured_compliance_percentage: number;
    measured_controls_count: number;
    unverified_controls_count: number;
    compliant_controls_count: number;
    total_findings_count: number;
  };
  controls_evaluated: ComplianceControl[];
  measured_controls: ComplianceControl[];
  unverified_controls: ComplianceControl[];
  findings: any[];
  compliance_percentage: string;
  certification_disclaimer: string;
  created_at: string;
}

