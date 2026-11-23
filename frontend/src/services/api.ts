import { DashboardStats, Agent, AttackScenario } from '../types';

// Base backend URL (e.g. https://agentshield-hhxr.onrender.com or http://localhost:8000)
// Strips trailing slashes and trailing /api to ensure a clean root base URL
const RAW_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://agentshield-hhxr.onrender.com')
).trim().replace(/\/+$/, '');

const BACKEND_BASE_URL = RAW_URL.replace(/\/api$/, '');

/**
 * Normalizes an API endpoint to ensure it is routed under /api without duplication.
 */
function buildApiUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = path.startsWith('/api/') || path === '/api' ? path : `/api${path}`;
  return `${BACKEND_BASE_URL}${apiPath}`;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = buildApiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorBody || response.statusText}`);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchJson<{ status: string; environment: string }>('/api/health'),
  getDashboardStats: () => fetchJson<DashboardStats>('/dashboard/stats'),
  getAgents: () => fetchJson<Agent[]>('/agents'),
  getAgent: (agentId: string) => fetchJson<Agent>(`/agents/${agentId}`),
  createAgent: (agentData: Partial<Agent>) =>
    fetchJson<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(agentData),
    }),
  updateAgent: (agentId: string, agentData: Partial<Agent>) =>
    fetchJson<Agent>(`/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(agentData),
    }),
  deleteAgent: (agentId: string) =>
    fetchJson<void>(`/agents/${agentId}`, {
      method: 'DELETE',
    }),
  getAgentPermissions: (agentId: string) => fetchJson<any[]>(`/agents/${agentId}/permissions`),
  updateAgentPermissions: (agentId: string, permissions: any[]) =>
    fetchJson<any[]>(`/agents/${agentId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  createSandboxSession: (agentId: string, sessionId?: string) =>
    fetchJson<any>(`/agents/${agentId}/sandbox/session`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
  sendSandboxMessage: (agentId: string, sessionId: string, message: string, humanApprovalGranted: boolean = false) =>
    fetchJson<any>(`/agents/${agentId}/sandbox/message`, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        message,
        human_approval_granted: humanApprovalGranted,
      }),
    }),
  getAgentTraces: (agentId: string) => fetchJson<any[]>(`/agents/${agentId}/traces`),
  getScenarios: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<AttackScenario[]>(`/scenarios${qs}`);
  },
  createScenario: (scenarioData: Partial<AttackScenario>) =>
    fetchJson<AttackScenario>('/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenarioData),
    }),
  getSecurityTests: (agentId?: string) => {
    const qs = agentId ? `?agent_id=${agentId}` : '';
    return fetchJson<any[]>(`/tests${qs}`);
  },
  getSecurityTest: (testId: string) => fetchJson<any>(`/tests/${testId}`),
  runSecurityTest: (payload: { agent_id: string; scenario_ids?: string[]; categories?: string[]; test_name?: string }) =>
    fetchJson<any>('/tests/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  replayExecution: (testId: string, executionId: string) =>
    fetchJson<any>(`/tests/${testId}/replay/${executionId}`, {
      method: 'POST',
    }),
  getFindings: (filters?: { category?: string; severity?: string; status?: string; agent_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.severity && filters.severity !== 'all') params.append('severity', filters.severity);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.agent_id) params.append('agent_id', filters.agent_id);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<any[]>(`/findings${qs}`);
  },
  updateFindingStatus: (findingId: string, status: 'open' | 'resolved' | 'acknowledged') =>
    fetchJson<any>(`/findings/${findingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  analyzeFinding: (findingId: string) =>
    fetchJson<any>(`/findings/${findingId}/analyze`, {
      method: 'POST',
    }),
  getFindingIntelligence: (findingId: string) =>
    fetchJson<any>(`/findings/${findingId}/intelligence`),
  getFindingRemediation: (findingId: string) =>
    fetchJson<any>(`/findings/${findingId}/remediation`, {
      method: 'POST',
    }),
  getPolicyRecommendations: (agentId: string) =>
    fetchJson<any[]>(`/agents/${agentId}/policy-recommendations`),
  generatePolicyHardening: (agentId: string) =>
    fetchJson<any[]>(`/agents/${agentId}/policy-hardening`, {
      method: 'POST',
    }),
  approvePolicyRecommendation: (id: string) =>
    fetchJson<any>(`/policy-recommendations/${id}/approve`, {
      method: 'POST',
    }),
  rejectPolicyRecommendation: (id: string) =>
    fetchJson<any>(`/policy-recommendations/${id}/reject`, {
      method: 'POST',
    }),
  applyApprovedPolicies: (agentId: string) =>
    fetchJson<any>(`/agents/${agentId}/apply-policy`, {
      method: 'POST',
    }),
  retestAgentPolicies: (agentId: string) =>
    fetchJson<any>(`/agents/${agentId}/retest`, {
      method: 'POST',
    }),
  getGeminiSettings: () =>
    fetchJson<any>('/settings/gemini'),
  updateGeminiSettings: (data: { api_key?: string; model_name?: string }) =>
    fetchJson<any>('/settings/gemini', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testGeminiConnection: () =>
    fetchJson<any>('/settings/gemini/test', {
      method: 'POST',
    }),

  // Phase 5: Continuous Monitoring & Alerting
  getMonitoringEvents: (params?: { agent_id?: string; severity?: string; event_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.agent_id) q.append('agent_id', params.agent_id);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.event_type) q.append('event_type', params.event_type);
    const qs = q.toString();
    return fetchJson<any[]>(`/monitoring/events${qs ? `?${qs}` : ''}`);
  },
  getSecurityAlerts: (params?: { agent_id?: string; status?: string; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.agent_id) q.append('agent_id', params.agent_id);
    if (params?.status) q.append('status', params.status);
    if (params?.severity) q.append('severity', params.severity);
    const qs = q.toString();
    return fetchJson<any[]>(`/monitoring/alerts${qs ? `?${qs}` : ''}`);
  },
  updateAlertStatus: (alertId: string, status: 'active' | 'acknowledged' | 'dismissed') =>
    fetchJson<any>(`/monitoring/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getMonitoringSummary: (agentId?: string) =>
    fetchJson<any>(`/monitoring/summary${agentId ? `?agent_id=${agentId}` : ''}`),

  // Phase 5: Automated Retesting & Schedules
  runRetest: (data: { agent_id: string; baseline_test_id: string; scenario_ids?: string[]; test_name?: string }) =>
    fetchJson<any>('/retests/run', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRetestComparisons: (agentId?: string) =>
    fetchJson<any[]>(`/retests/comparisons${agentId ? `?agent_id=${agentId}` : ''}`),
  getRetestComparison: (comparisonId: string) =>
    fetchJson<any>(`/retests/comparisons/${comparisonId}`),
  getRetestSchedules: (agentId?: string) =>
    fetchJson<any[]>(`/retests/schedules${agentId ? `?agent_id=${agentId}` : ''}`),
  saveRetestSchedule: (data: { agent_id: string; frequency: string; scenario_ids?: string[]; is_active?: boolean }) =>
    fetchJson<any>('/retests/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Phase 5: Evidence-Backed Compliance Reports
  generateComplianceReport: (data: { agent_id?: string; framework: string; title?: string }) =>
    fetchJson<any>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getComplianceReports: (agentId?: string) =>
    fetchJson<any[]>(`/reports${agentId ? `?agent_id=${agentId}` : ''}`),
  getComplianceReport: (reportId: string) =>
    fetchJson<any>(`/reports/${reportId}`),

  // Phase 6: Startup Buildathon Demo Environment
  resetDemoEnvironment: () =>
    fetchJson<any>('/demo/reset', {
      method: 'POST',
    }),
  getDemoStatus: () =>
    fetchJson<any>('/demo/status'),
};
