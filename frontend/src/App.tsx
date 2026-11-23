import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgentsPage } from './pages/AgentsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { VulnerabilitiesPage } from './pages/VulnerabilitiesPage';
import { ReportsPage } from './pages/ReportsPage';
import { RetestingPage } from './pages/RetestingPage';
import { SettingsPage } from './pages/SettingsPage';
import { PolicyHardeningPage } from './pages/PolicyHardeningPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { api, authStorage } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [agentCount, setAgentCount] = useState<number>(0);
  const [vulnerabilityCount, setVulnerabilityCount] = useState<number>(0);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(() => authStorage.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(authStorage.getToken()));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAgentCount(0);
    setVulnerabilityCount(0);
  };

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchProtectedCounts();
  };

  // Fetch counts only when authenticated
  const fetchProtectedCounts = useCallback(async () => {
    try {
      const stats = await api.getDashboardStats();
      setAgentCount(stats.kpis.total_agents);
      setVulnerabilityCount(stats.kpis.vulnerabilities_detected);
    } catch (err) {
      console.warn('Could not fetch protected dashboard stats', err);
    }
  }, []);

  // Health and session verification
  const checkHealthAndSession = useCallback(async () => {
    try {
      const health = await api.getHealth();
      if (health.status === 'healthy') {
        setIsLiveConnected(true);

        const token = authStorage.getToken();
        if (token) {
          try {
            const user = await api.getCurrentUser();
            setCurrentUser(user);
            setIsAuthenticated(true);
            authStorage.setUser(user);
            fetchProtectedCounts();
          } catch {
            // Token expired or invalid
            authStorage.clearAll();
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }
      }
    } catch {
      setIsLiveConnected(false);
    }
  }, [fetchProtectedCounts]);

  useEffect(() => {
    checkHealthAndSession();
    const interval = setInterval(checkHealthAndSession, 15000);

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    const handleAppLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    window.addEventListener('agentshield:unauthorized', handleUnauthorized);
    window.addEventListener('agentshield:logout', handleAppLogout);

    return () => {
      clearInterval(interval);
      window.removeEventListener('agentshield:unauthorized', handleUnauthorized);
      window.removeEventListener('agentshield:logout', handleAppLogout);
    };
  }, [checkHealthAndSession]);

  const handleNavigate = (tab: string) => {
    if (tab !== 'landing' && !isAuthenticated) {
      openAuth('login');
      return;
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-shield-bg text-shield-text flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        isLiveConnected={isLiveConnected}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
      />

      {/* Shared Demo Evaluation Notice */}
      {isAuthenticated && currentUser?.email?.toLowerCase() === 'demo@agentshield.ai' && (
        <aside
          role="status"
          aria-label="Demo environment notice"
          className="bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 border-b border-purple-500/30 px-4 sm:px-6 py-2 text-xs text-purple-200 shadow-sm animate-in fade-in duration-150"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="leading-tight">
                Shared Evaluation Sandbox — changes are visible to other demo visitors. Register a free account for isolated testing.
              </p>
            </div>
            <button
              onClick={() => openAuth('register')}
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 text-[11px] font-semibold transition shrink-0 cursor-pointer"
            >
              <span>Create Free Account</span>
            </button>
          </div>
        </aside>
      )}

      {currentTab === 'landing' ? (
        <LandingPage
          onGetStarted={() => {
            if (!isAuthenticated) {
              openAuth('login');
            } else {
              setCurrentTab('overview');
            }
          }}
        />
      ) : (
        <div className="flex-1 flex">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={handleNavigate}
            agentCount={agentCount}
            vulnerabilityCount={vulnerabilityCount}
          />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto w-full">
            {currentTab === 'overview' && <DashboardPage onNavigate={handleNavigate} />}
            {currentTab === 'monitoring' && <MonitoringPage />}
            {currentTab === 'agents' && <AgentsPage />}
            {currentTab === 'simulator' && <SimulatorPage />}
            {currentTab === 'vulnerabilities' && <VulnerabilitiesPage />}
            {currentTab === 'hardening' && <PolicyHardeningPage />}
            {currentTab === 'retesting' && <RetestingPage />}
            {currentTab === 'reports' && <ReportsPage />}
            {currentTab === 'settings' && <SettingsPage />}
          </main>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default App;
