import React, { useEffect, useState } from 'react';
import {
  Bot,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Sliders,
  History,
  MessageSquare
} from 'lucide-react';
import { Agent, AgentPermission, ExecutionTrace } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { SandboxChat, ChatMessage } from '../components/agents/SandboxChat';
import { PermissionMatrix } from '../components/agents/PermissionMatrix';
import { TraceHistory } from '../components/agents/TraceHistory';
import { AgentModal } from '../components/agents/AgentModals';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'sandbox' | 'permissions' | 'traces'>('sandbox');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [integrationType, setIntegrationType] = useState('sandbox');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Sandbox state
  const [sessionId, setSessionId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [allowedToolsCount, setAllowedToolsCount] = useState<number>(0);
  const [restrictedToolsCount, setRestrictedToolsCount] = useState<number>(0);

  // Permissions state
  const [editablePermissions, setEditablePermissions] = useState<AgentPermission[]>([]);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);

  // Traces state
  const [traces, setTraces] = useState<ExecutionTrace[]>([]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await api.getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgent) {
        handleSelectAgent(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSelectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);
    setEditablePermissions(agent.permissions || []);
    setChatMessages([]);
    setTraces([]);

    try {
      const session = await api.createSandboxSession(agent.id);
      setSessionId(session.session_id);
      setAllowedToolsCount(session.allowed_tools.length);
      setRestrictedToolsCount(session.restricted_tools.length);
      setChatMessages([
        {
          id: 'welcome',
          sender: 'agent',
          text: session.welcome_message,
        },
      ]);
    } catch (err) {
      console.error('Failed to init sandbox session', err);
    }

    try {
      const traceData = await api.getAgentTraces(agent.id);
      setTraces(traceData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (textToSend: string, approvalGranted: boolean = false) => {
    if (!textToSend.trim() || !selectedAgent || !sessionId) return;

    if (!approvalGranted) {
      setChatMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'user', text: textToSend },
      ]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'user', text: '✅ [Human Approval Granted]: Proceed with transaction.' },
      ]);
    }

    setSendingMessage(true);
    try {
      const response = await api.sendSandboxMessage(
        selectedAgent.id,
        sessionId,
        textToSend,
        approvalGranted
      );

      const hasPendingApproval = response.tool_calls.some(
        (t: any) => t.status === 'approval_required'
      );

      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'agent',
          text: response.agent_response,
          toolCalls: response.tool_calls,
          pendingApproval: hasPendingApproval,
        },
      ]);

      api.getAgentTraces(selectedAgent.id).then(setTraces).catch(console.error);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'agent',
          text: `[Sandbox Error]: ${err.message || 'Execution failed.'}`,
        },
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const newAgent = await api.createAgent({
        name,
        description,
        system_prompt: systemPrompt,
        integration_type: integrationType,
        endpoint_url: endpointUrl || undefined,
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setSystemPrompt('');
      await fetchAgents();
      handleSelectAgent(newAgent);
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setSaving(true);
    try {
      const updated = await api.updateAgent(selectedAgent.id, {
        name,
        description,
        system_prompt: systemPrompt,
        integration_type: integrationType,
        endpoint_url: endpointUrl || undefined,
      });
      setShowEditModal(false);
      setSelectedAgent(updated);
      fetchAgents();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? All security traces will be deleted.')) {
      return;
    }
    try {
      await api.deleteAgent(agentId);
      setSelectedAgent(null);
      fetchAgents();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleTogglePermission = (toolName: string, field: 'is_allowed' | 'requires_human_approval') => {
    setEditablePermissions((prev) =>
      prev.map((p) => {
        if (p.tool_name === toolName) {
          return { ...p, [field]: !p[field] };
        }
        return p;
      })
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedAgent) return;
    setSavingPermissions(true);
    try {
      const updated = await api.updateAgentPermissions(selectedAgent.id, editablePermissions);
      setEditablePermissions(updated);
      const session = await api.createSandboxSession(selectedAgent.id, sessionId);
      setAllowedToolsCount(session.allowed_tools.length);
      setRestrictedToolsCount(session.restricted_tools.length);
      alert('Security policy saved and enforced in sandbox!');
    } catch (err: any) {
      alert(`Failed to update permissions: ${err.message}`);
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-shield-border/60 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Agent Management</h1>
            <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Sandbox Live
            </span>
          </div>
          <p className="text-xs text-shield-muted mt-1">
            Register autonomous agents, manage tool permissions, and interact with the sandbox demo agent.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAgents}
            className="p-2 rounded-xl bg-shield-card hover:bg-shield-cardHover border border-shield-border text-shield-text"
          >
            <RefreshCw className={`w-4 h-4 text-shield-accent ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setName('');
              setDescription('');
              setSystemPrompt('You are a helpful customer support agent with access to mock order and customer tools.');
              setIntegrationType('sandbox');
              setEndpointUrl('');
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover text-xs font-semibold text-white glow-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register Agent</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Agent Selector List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-shield-muted font-semibold px-1">
            Registered Agents ({agents.length})
          </p>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {agents.map((ag) => {
              const isSelected = selectedAgent?.id === ag.id;
              const allowed = ag.permissions?.filter((p) => p.is_allowed).length || 0;
              const restricted = ag.permissions?.filter((p) => !p.is_allowed).length || 0;

              return (
                <div
                  key={ag.id}
                  onClick={() => handleSelectAgent(ag)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-shield-primary/15 border-shield-accent/60 glow-primary'
                      : 'bg-shield-card border-shield-border hover:border-shield-borderLight'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-shield-sidebar border border-shield-border text-shield-accent">
                        <Bot className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-shield-muted capitalize">
                        {ag.integration_type}
                      </span>
                    </div>
                    <Badge label={ag.is_active ? 'Active' : 'Inactive'} variant={ag.is_active ? 'success' : 'info'} />
                  </div>

                  <h3 className="text-sm font-bold text-white leading-tight">{ag.name}</h3>
                  <p className="text-[11px] text-shield-muted line-clamp-2 mt-1 leading-relaxed">
                    {ag.description || 'No description provided.'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-shield-border/50 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400">{allowed} Allowed</span>
                    <span className="text-red-400">{restricted} Restricted</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workspace Console (8 cols) */}
        <div className="lg:col-span-8">
          {selectedAgent ? (
            <div className="p-6 rounded-2xl bg-shield-card border border-shield-border flex flex-col justify-between min-h-[700px]">
              <div>
                {/* Agent Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-shield-border">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-lg font-bold text-white">{selectedAgent.name}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-shield-sidebar border border-shield-border text-shield-accent capitalize">
                        {selectedAgent.integration_type} Mode
                      </span>
                    </div>
                    <p className="text-xs text-shield-muted mt-0.5 font-mono">
                      ID: {selectedAgent.id}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setName(selectedAgent.name);
                        setDescription(selectedAgent.description || '');
                        setSystemPrompt(selectedAgent.system_prompt || '');
                        setIntegrationType(selectedAgent.integration_type);
                        setEndpointUrl(selectedAgent.endpoint_url || '');
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-shield-sidebar hover:bg-shield-cardHover border border-shield-border text-xs text-shield-text flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-shield-muted" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAgent(selectedAgent.id)}
                      className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Workspace Tabs */}
                <div className="flex items-center space-x-2 my-4 border-b border-shield-border/60 pb-3">
                  <button
                    onClick={() => setActiveTab('sandbox')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                      activeTab === 'sandbox'
                        ? 'bg-shield-primary text-white glow-primary'
                        : 'text-shield-muted hover:text-white bg-shield-sidebar/60 border border-shield-border'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Interactive Sandbox</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                      activeTab === 'permissions'
                        ? 'bg-shield-primary text-white glow-primary'
                        : 'text-shield-muted hover:text-white bg-shield-sidebar/60 border border-shield-border'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Tool Policy Matrix</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('traces')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                      activeTab === 'traces'
                        ? 'bg-shield-primary text-white glow-primary'
                        : 'text-shield-muted hover:text-white bg-shield-sidebar/60 border border-shield-border'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Execution Traces ({traces.length})</span>
                  </button>
                </div>

                {/* Active Tab View */}
                {activeTab === 'sandbox' && (
                  <SandboxChat
                    sessionId={sessionId}
                    messages={chatMessages}
                    allowedCount={allowedToolsCount}
                    restrictedCount={restrictedToolsCount}
                    onSendMessage={handleSendMessage}
                    sending={sendingMessage}
                  />
                )}

                {activeTab === 'permissions' && (
                  <PermissionMatrix
                    permissions={editablePermissions}
                    onToggle={handleTogglePermission}
                    onSave={handleSavePermissions}
                    saving={savingPermissions}
                  />
                )}

                {activeTab === 'traces' && (
                  <TraceHistory
                    traces={traces}
                    onRefresh={() => api.getAgentTraces(selectedAgent.id).then(setTraces)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-shield-card border border-shield-border text-center text-shield-muted flex flex-col items-center justify-center min-h-[400px]">
              <Bot className="w-12 h-12 text-shield-muted/40 mb-3" />
              <p className="text-sm font-semibold text-white">Select an Agent to Open Workspace</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AgentModal
        isOpen={showCreateModal}
        isEdit={false}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAgent}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        integrationType={integrationType}
        setIntegrationType={setIntegrationType}
        endpointUrl={endpointUrl}
        setEndpointUrl={setEndpointUrl}
        saving={saving}
      />

      <AgentModal
        isOpen={showEditModal}
        isEdit={true}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleSaveEdit}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        integrationType={integrationType}
        setIntegrationType={setIntegrationType}
        endpointUrl={endpointUrl}
        setEndpointUrl={setEndpointUrl}
        saving={saving}
      />
    </div>
  );
};
