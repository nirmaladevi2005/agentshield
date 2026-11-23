import React, { useState } from 'react';
import { Shield, Sparkles, LogIn, LogOut } from 'lucide-react';
import { api } from '../../services/api';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isLiveConnected: boolean;
  currentUser?: any | null;
  isAuthenticated: boolean;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  isLiveConnected,
  currentUser,
  isAuthenticated,
  onOpenAuth,
  onLogout,
}) => {
  const [resetting, setResetting] = useState<boolean>(false);

  const handleResetDemo = async () => {
    if (!confirm('Reset demo environment with fresh synthetic demonstration data for Startup Buildathon India 2026?')) {
      return;
    }
    try {
      setResetting(true);
      await api.resetDemoEnvironment();
      alert('Demo environment successfully initialized with synthetic Flagship Agent, benchmarks, differential retest, alerts, and compliance report!');
      window.location.reload();
    } catch (err) {
      console.error('Demo reset failed', err);
      alert('Failed to reset demo environment. Ensure backend is running.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="h-16 border-b border-shield-border bg-shield-sidebar/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-shield-primary via-indigo-500 to-shield-accent flex items-center justify-center glow-primary">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white font-mono">
              Agent<span className="text-shield-accent">Shield</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-shield-primary/20 text-shield-accent border border-shield-primary/30">
              v1.0 MVP
            </span>
          </div>
          <p className="text-[11px] text-shield-muted hidden sm:block">Let AI Agents Act. Make Every Action Safe.</p>
        </div>
      </div>

      {/* Center Nav / Status */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => onNavigate('landing')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === 'landing'
              ? 'bg-shield-primary text-white shadow-sm'
              : 'text-shield-muted hover:text-white hover:bg-shield-card'
          }`}
        >
          Landing Page
        </button>
        <button
          onClick={() => onNavigate('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab !== 'landing'
              ? 'bg-shield-primary text-white shadow-sm glow-primary'
              : 'text-shield-muted hover:text-white hover:bg-shield-card'
          }`}
        >
          Security Console
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Startup Buildathon Demo Mode Quick Reset */}
        <button
          onClick={handleResetDemo}
          disabled={resetting}
          title="Reset synthetic demo environment for Startup Buildathon presentation"
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-purple-400' : 'text-purple-400'}`} />
          <span className="hidden sm:inline">{resetting ? 'Resetting Demo...' : 'Demo Mode'}</span>
        </button>

        {/* Connection status */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-shield-card border border-shield-border text-xs">
          <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-shield-success animate-pulse' : 'bg-shield-critical'}`} />
          <span className="text-shield-muted text-[11px] font-mono hidden md:inline">
            {isLiveConnected ? 'BACKEND LIVE' : 'BACKEND OFFLINE'}
          </span>
        </div>

        {/* Authentication Controls */}
        {isAuthenticated && currentUser ? (
          <div className="flex items-center space-x-3 pl-2 border-l border-shield-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-shield-accent font-semibold text-xs">
                {(currentUser.name || currentUser.email || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-white leading-tight">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-shield-muted capitalize">
                  {currentUser.role || 'Member'}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-shield-muted hover:text-red-400 hover:bg-shield-card transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 pl-2 border-l border-shield-border">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3 py-1.5 rounded-lg bg-shield-primary/20 hover:bg-shield-primary/30 text-shield-accent border border-shield-primary/40 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
