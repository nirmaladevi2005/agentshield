import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Swords,
  ShieldAlert,
  FileText,
  RotateCcw,
  Settings,
  ChevronRight,
  Terminal,
  Lock,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  agentCount?: number;
  vulnerabilityCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  agentCount = 0,
  vulnerabilityCount = 0,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Radio },
    { id: 'agents', label: 'Agents', icon: Bot, badge: agentCount > 0 ? String(agentCount) : undefined },
    { id: 'simulator', label: 'Attack Simulator', icon: Swords },
    {
      id: 'vulnerabilities',
      label: 'Vulnerabilities',
      icon: ShieldAlert,
      badge: vulnerabilityCount > 0 ? String(vulnerabilityCount) : undefined,
      badgeColor: 'bg-shield-critical/20 text-shield-critical border border-shield-critical/30',
    },
    { id: 'hardening', label: 'Policy Hardening', icon: Lock },
    { id: 'retesting', label: 'Retesting & Diff', icon: RotateCcw },
    { id: 'reports', label: 'Compliance Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-shield-border bg-shield-sidebar flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold text-shield-muted/60 uppercase tracking-wider mb-2">
            Core Modules
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-shield-primary/15 text-shield-accent border border-shield-primary/30 glow-primary'
                    : 'text-shield-muted hover:text-white hover:bg-shield-card/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-shield-accent' : 'text-shield-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-shield-border text-shield-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sandbox status widget */}
      <div className="p-4 border-t border-shield-border/60">
        <div className="p-3 rounded-xl bg-shield-card border border-shield-border/80">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-shield-accent" />
              Isolated Sandbox
            </span>
            <span className="text-[10px] text-shield-success font-mono font-bold">READY</span>
          </div>
          <p className="text-[11px] text-shield-muted leading-relaxed">
            Synthetic data active. No external networks exposed.
          </p>
        </div>
      </div>
    </aside>
  );
};
