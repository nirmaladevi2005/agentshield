import React from 'react';

interface AgentModalProps {
  isOpen: boolean;
  isEdit?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  integrationType: string;
  setIntegrationType: (v: string) => void;
  endpointUrl: string;
  setEndpointUrl: (v: string) => void;
  saving: boolean;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  isEdit = false,
  onClose,
  onSubmit,
  name,
  setName,
  description,
  setDescription,
  systemPrompt,
  setSystemPrompt,
  integrationType,
  setIntegrationType,
  endpointUrl,
  setEndpointUrl,
  saving,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-shield-card border border-shield-border rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">
          {isEdit ? 'Edit Agent Configuration' : 'Register New AI Agent'}
        </h3>
        <p className="text-xs text-shield-muted mb-4">
          {isEdit
            ? 'Update agent directives, description, and integration mode.'
            : 'Register a built-in sandbox demo, local adapter, or authorized HTTP endpoint.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-shield-muted block mb-1">Agent Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Autonomous Customer Support Bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
            />
          </div>

          <div>
            <label className="text-xs text-shield-muted block mb-1">Integration Mode</label>
            <select
              value={integrationType}
              onChange={(e) => setIntegrationType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
            >
              <option value="sandbox">Built-in Sandbox Demo Agent</option>
              <option value="adapter">Local Development Adapter</option>
              <option value="http_endpoint">Authorized HTTP Endpoint</option>
            </select>
          </div>

          {integrationType === 'http_endpoint' && (
            <div>
              <label className="text-xs text-shield-muted block mb-1">Endpoint URL</label>
              <input
                type="url"
                placeholder="https://api.yourdomain.com/v1/agent"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-shield-muted block mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Describe agent role and intended operations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
            />
          </div>

          <div>
            <label className="text-xs text-shield-muted block mb-1">System Prompt Directive</label>
            <textarea
              rows={3}
              placeholder="Paste current system prompt instructions..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs font-mono focus:outline-none focus:border-shield-accent"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-shield-border text-xs text-shield-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover text-xs font-semibold text-white glow-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
