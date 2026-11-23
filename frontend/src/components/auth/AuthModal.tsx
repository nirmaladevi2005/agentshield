import React, { useState } from 'react';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { api, authStorage } from '../../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('secops');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        authStorage.setToken(res.access_token);
        authStorage.setUser(res.user);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({ email, password, name, role });
        authStorage.setToken(res.access_token);
        authStorage.setUser(res.user);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication failed. Please verify your credentials.';
      // Clean up API error wrapping
      if (msg.includes('detail":')) {
        try {
          const jsonStr = msg.substring(msg.indexOf('{'));
          const parsed = JSON.parse(jsonStr);
          msg = parsed.detail || msg;
        } catch {}
      } else if (msg.includes('API Error')) {
        msg = msg.replace(/^API Error \[\d+\]:\s*/, '');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setEmail('demo@agentshield.ai');
    setPassword('AgentShield2026!');
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        email: 'demo@agentshield.ai',
        password: 'AgentShield2026!',
      });
      authStorage.setToken(res.access_token);
      authStorage.setUser(res.user);
      onSuccess(res.user);
      onClose();
    } catch {
      // If demo user hasn't registered in this DB yet, register seamlessly
      try {
        const regRes = await api.register({
          email: 'demo@agentshield.ai',
          password: 'AgentShield2026!',
          name: 'Alex Vance',
          role: 'secops',
        });
        authStorage.setToken(regRes.access_token);
        authStorage.setUser(regRes.user);
        onSuccess(regRes.user);
        onClose();
      } catch (regErr: any) {
        setError(regErr.message || 'Failed to authenticate demo user.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-shield-card border border-shield-border rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-shield-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-shield-accent/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-shield-muted hover:text-white rounded-lg hover:bg-shield-bg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-shield-primary to-shield-accent flex items-center justify-center glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono tracking-tight">
              Agent<span className="text-shield-accent">Shield</span>
            </h2>
            <p className="text-xs text-shield-muted">
              {mode === 'login' ? 'Sign in to access your security console' : 'Create your security operations account'}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-shield-bg border border-shield-border rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-shield-primary text-white shadow-sm'
                : 'text-shield-muted hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-shield-primary text-white shadow-sm'
                : 'text-shield-muted hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-shield-critical/10 border border-shield-critical/30 flex items-start space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-shield-critical shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-shield-muted mb-1">
                Full Name / Organization Handle
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-shield-muted" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-shield-bg border border-shield-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-shield-muted focus:outline-none focus:border-shield-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-shield-muted mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-shield-muted" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-shield-bg border border-shield-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-shield-muted focus:outline-none focus:border-shield-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-shield-muted mb-1">
              Password {mode === 'register' && '(min 12 characters)'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-shield-muted" />
              <input
                type="password"
                required
                minLength={mode === 'register' ? 12 : 1}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-shield-bg border border-shield-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-shield-muted focus:outline-none focus:border-shield-primary transition-colors"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-shield-muted mb-1">
                Security Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-shield-bg border border-shield-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-shield-primary transition-colors"
              >
                <option value="developer">Developer (Agent Builder & Tester)</option>
                <option value="secops">SecOps Specialist (Red-Team & Defense)</option>
                <option value="auditor">Auditor (Governance & Compliance)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-shield-primary hover:bg-shield-primary/90 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-lg glow-primary transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Demo Account Quick Access */}
        <div className="mt-6 pt-5 border-t border-shield-border/60">
          <div className="flex items-center justify-between text-xs text-shield-muted mb-2">
            <span>Evaluating AgentShield?</span>
            <span className="text-[10px] text-purple-400 font-mono">Demo Mode</span>
          </div>
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>One-Click Demo Sign In (Alex Vance - SecOps Lead)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
