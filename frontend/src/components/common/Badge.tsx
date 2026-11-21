import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'blocked' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info', size = 'sm' }) => {
  const variantStyles = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    blocked: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    info: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-full border uppercase tracking-wider ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {label}
    </span>
  );
};
