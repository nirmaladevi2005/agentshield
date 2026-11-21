import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
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
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [agentCount, setAgentCount] = useState<number>(0);
  const [vulnerabilityCount, setVulnerabilityCount] = useState<number>(0);

  // Check health and initial counts
  const checkHealthAndCounts = async () => {
    try {
      const health = await api.getHealth();
      if (health.status === 'healthy') {
        setIsLiveConnected(true);
        const stats = await api.getDashboardStats();
        setAgentCount(stats.kpis.total_agents);
        setVulnerabilityCount(stats.kpis.vulnerabilities_detected);
      }
    } catch {
      setIsLiveConnected(false);
    }
  };

  useEffect(() => {
    checkHealthAndCounts();
    const interval = setInterval(checkHealthAndCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-shield-bg text-shield-text flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        isLiveConnected={isLiveConnected}
      />

      {currentTab === 'landing' ? (
        <LandingPage onGetStarted={() => setCurrentTab('overview')} />
      ) : (
        <div className="flex-1 flex">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            agentCount={agentCount}
            vulnerabilityCount={vulnerabilityCount}
          />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto w-full">
            {currentTab === 'overview' && <DashboardPage onNavigate={setCurrentTab} />}
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
    </div>
  );
}

export default App;
