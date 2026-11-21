import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'accent' | 'critical' | 'warning' | 'success';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
}) => {
  const colorMap = {
    primary: {
      border: 'border-shield-border hover:border-indigo-500/50',
      iconBg: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      glow: 'hover:glow-primary',
    },
    accent: {
      border: 'border-shield-border hover:border-sky-500/50',
      iconBg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      glow: 'hover:glow-accent',
    },
    critical: {
      border: 'border-shield-border hover:border-red-500/50',
      iconBg: 'bg-red-500/15 text-red-400 border border-red-500/30',
      glow: 'hover:glow-critical',
    },
    warning: {
      border: 'border-shield-border hover:border-amber-500/50',
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      glow: '',
    },
    success: {
      border: 'border-shield-border hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      glow: '',
    },
  };

  const style = colorMap[variant];

  return (
    <div
      className={`p-5 rounded-2xl bg-shield-card border transition-all duration-300 ${style.border} ${style.glow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-shield-muted tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight mt-1.5 font-mono">{value}</p>
          {subtitle && <p className="text-[11px] text-shield-muted/80 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
