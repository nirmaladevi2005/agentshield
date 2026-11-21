import React, { useState } from 'react';
import { X, Plus, Swords, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AttackScenario } from '../../types';
import { api } from '../../services/api';

interface CustomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newScenario: AttackScenario) => void;
}

export const CustomScenarioModal: React.FC<CustomScenarioModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'prompt_injection',
    subcategory: '',
    severity: 'high' as 'critical' | 'high' | 'medium' | 'low',
    description: '',
    test_input: '',
    expected_behavior: '',
    synthetic_secrets: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.test_input.trim()) {
      setError('Please provide a scenario name and adversarial input payload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Partial<AttackScenario> = {
        name: formData.name.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim() || undefined,
        severity: formData.severity,
        description: formData.description.trim() || 'Custom adversarial red-team test scenario.',
        test_input: formData.test_input.trim(),
        expected_behavior: formData.expected_behavior.trim() || 'Reject malicious instruction and enforce security boundary.',
        synthetic_secrets: formData.synthetic_secrets
          ? formData.synthetic_secrets.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        tags: formData.tags
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : ['custom', formData.category],
      };

      const created = await api.createScenario(payload);
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register scenario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-shield-card border border-shield-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-shield-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Create Custom Attack Scenario</h2>
              <p className="text-xs text-shield-muted">
                Define an adversarial scenario payload for automated evaluation and sandbox regression testing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-shield-muted hover:text-white rounded-lg hover:bg-shield-cardHover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">Scenario Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., Hidden SQL Injection via Doc Summary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">Attack Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
              >
                <option value="prompt_injection">Prompt Injection</option>
                <option value="unauthorized_tool_usage">Unauthorized Tool Usage</option>
                <option value="sensitive_data_exposure">Sensitive Data Exposure</option>
                <option value="excessive_agency">Excessive Agency</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">Subcategory</label>
              <input
                type="text"
                placeholder="e.g., direct_override or tool_bypass"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs focus:outline-none focus:border-shield-accent"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">Attack Narrative / Description</label>
            <textarea
              rows={2}
              placeholder="Explain the adversarial objective and attacker context..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">
              Adversarial Test Input Payload *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Enter the prompt or synthetic file content sent to the agent..."
              value={formData.test_input}
              onChange={(e) => setFormData({ ...formData, test_input: e.target.value })}
              className="w-full font-mono px-3.5 py-2 rounded-xl bg-black/60 border border-shield-border text-amber-300 text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">
              Expected Security Behavior
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Agent must refuse to disclose system prompt or call unauthorized tools."
              value={formData.expected_behavior}
              onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">
                Synthetic Canary Secrets (comma separated)
              </label>
              <input
                type="text"
                placeholder="CANARY_SEC_01, KEY-999"
                value={formData.synthetic_secrets}
                onChange={(e) => setFormData({ ...formData, synthetic_secrets: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-shield-muted mb-1.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="red-team, injection, bypass"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-shield-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-shield-card hover:bg-shield-cardHover border border-shield-border text-shield-text text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover disabled:opacity-50 text-white text-xs font-semibold glow-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Register Attack Scenario'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
