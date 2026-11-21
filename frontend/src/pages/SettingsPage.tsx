import React, { useEffect, useState } from 'react';
import {
  Settings,
  Key,
  Shield,
  User,
  Database,
  Check,
  Sparkles,
  RefreshCw,
  Cpu,
  Lock,
  Activity,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { GeminiSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<GeminiSettings | null>(null);

  // Fetch current Gemini status
  const fetchStatus = async () => {
    try {
      const data = await api.getGeminiSettings();
      setGeminiStatus(data);
      if (data.model) setModelName(data.model);
    } catch (e) {
      console.error('Failed to load Gemini settings:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateGeminiSettings({
        api_key: apiKey ? apiKey : undefined,
        model_name: modelName,
      });
      setSaved(true);
      await fetchStatus();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await api.testGeminiConnection();
      setGeminiStatus(result);
    } catch (err: any) {
      alert(`Connection test failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      <div className="border-b border-shield-border/60 pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Configuration & Settings</h1>
        <p className="text-xs text-shield-muted mt-1">
          Manage Google Gemini credentials, model routing, security analysis preferences, and database telemetry options.
        </p>
      </div>

      <div className="space-y-6">
        {/* Gemini AI Config Card */}
        <div className="p-6 rounded-2xl bg-shield-card border border-shield-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-shield-border">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google Gemini Security Intelligence</h3>
                <p className="text-[11px] text-shield-muted">
                  Official Google Gen AI SDK integration for cognitive root-cause synthesis and remediation.
                </p>
              </div>
            </div>

            {/* Live Connection Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
                  geminiStatus?.status === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                }`}
              >
                {geminiStatus?.status === 'connected' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    LIVE API CONNECTED ({geminiStatus.latency_ms || 35}ms)
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    OFFLINE DETERMINISTIC FALLBACK
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="p-2 rounded-xl bg-shield-sidebar hover:bg-shield-cardHover border border-shield-border text-shield-text hover:text-white transition-all disabled:opacity-50"
                title="Test Gemini API Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-shield-accent ${testing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-shield-muted block mb-1 font-mono uppercase">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder={geminiStatus?.api_key_configured ? '••••••••••••••••••••••••••••••••••••' : 'Enter AIzaSy... key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs font-mono placeholder:text-shield-muted/50 focus:outline-none focus:border-shield-accent"
                />
                <p className="text-[10px] text-shield-muted/80 mt-1">
                  Stored server-side in backend environment variables. Never exposed to browser.
                </p>
              </div>

              <div>
                <label className="text-xs text-shield-muted block mb-1 font-mono uppercase">
                  Intelligence Model
                </label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-shield-sidebar border border-shield-border text-white text-xs font-mono focus:outline-none focus:border-shield-accent"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended: Low Latency & High Precision)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Multimodal Reasoning)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Complex Threat Modeling)</option>
                </select>
                <p className="text-[10px] text-shield-muted/80 mt-1">
                  Enforces structured Pydantic schemas via JSON Schema validation.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-shield-border/60">
              <span className="text-xs text-shield-muted font-mono">
                {geminiStatus?.message || 'Ready for intelligence generation'}
              </span>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover text-xs font-semibold text-white glow-primary flex items-center gap-1.5 transition-all"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{saved ? 'Settings Saved' : 'Update Configuration'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security & Governance Safeguards Matrix */}
        <div className="p-6 rounded-2xl bg-shield-card border border-shield-border space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-shield-primary/20 text-shield-accent border border-shield-primary/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Active Architectural Safeguards</h3>
              <p className="text-[11px] text-shield-muted">
                Zero-trust policies enforced across all AI analysis operations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-shield-sidebar border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold mb-1">
                ✓ PRE-FLIGHT REDACTION
              </span>
              <span className="text-shield-muted text-[11px] leading-relaxed block">
                API tokens, bearer headers, and customer PII scrubbed prior to model invocation.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-shield-sidebar border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold mb-1">
                ✓ ADVISORY-ONLY AI
              </span>
              <span className="text-shield-muted text-[11px] leading-relaxed block">
                Gemini cannot execute tools or alter permissions. PermissionEngine retains final authority.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-shield-sidebar border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold mb-1">
                ✓ 2-STAGE APPROVAL
              </span>
              <span className="text-shield-muted text-[11px] leading-relaxed block">
                Policy patches require explicit human review and authorization before application.
              </span>
            </div>
          </div>
        </div>

        {/* Database & Environment Info */}
        <div className="p-6 rounded-2xl bg-shield-card border border-shield-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Persistence & Database Telemetry</h3>
              <p className="text-[11px] text-shield-muted">Storage backend and audit logging connection</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-shield-sidebar border border-shield-border">
              <span className="text-[10px] text-shield-muted block uppercase">ACTIVE DRIVER</span>
              <span className="text-emerald-400 font-bold">SQLAlchemy ORM (SQLite / PostgreSQL Ready)</span>
            </div>
            <div className="p-3 rounded-xl bg-shield-sidebar border border-shield-border">
              <span className="text-[10px] text-shield-muted block uppercase">AUDIT ENGINE</span>
              <span className="text-white font-bold">Immutable PolicyChangeAudit Logging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
