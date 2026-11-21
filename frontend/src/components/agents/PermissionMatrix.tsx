import React from 'react';
import { AgentPermission } from '../../types';
import { Badge } from '../common/Badge';

interface PermissionMatrixProps {
  permissions: AgentPermission[];
  onToggle: (toolName: string, field: 'is_allowed' | 'requires_human_approval') => void;
  onSave: () => void;
  saving: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  permissions,
  onToggle,
  onSave,
  saving,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-shield-border/60">
        <div>
          <h3 className="text-sm font-bold text-white">Granular Tool Access Policy</h3>
          <p className="text-[11px] text-shield-muted">
            Configure allowed tools, approval gates, and execution boundaries enforced in the backend.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-shield-primary hover:bg-shield-primaryHover text-white text-xs font-semibold glow-primary disabled:opacity-50"
        >
          {saving ? 'Saving Policy...' : 'Save Updated Policy'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-shield-sidebar/60 text-shield-muted uppercase tracking-wider text-[10px] border-b border-shield-border">
            <tr>
              <th className="py-2.5 px-3">Tool Name</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Access Action</th>
              <th className="py-2.5 px-3">Approval Gate</th>
              <th className="py-2.5 px-3">Rate Limit / Min</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-shield-border/40">
            {permissions.map((perm) => (
              <tr key={perm.id || perm.tool_name} className="hover:bg-shield-sidebar/40">
                <td className="py-3 px-3 font-bold text-white">{perm.tool_name}</td>
                <td className="py-3 px-3">
                  <Badge
                    label={perm.is_allowed ? 'Allowed' : 'Blocked'}
                    variant={perm.is_allowed ? 'success' : 'critical'}
                  />
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => onToggle(perm.tool_name, 'is_allowed')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-sans font-semibold border transition-all ${
                      perm.is_allowed
                        ? 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {perm.is_allowed ? 'Block Tool' : 'Allow Tool'}
                  </button>
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => onToggle(perm.tool_name, 'requires_human_approval')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-sans font-semibold border transition-all ${
                      perm.requires_human_approval
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-shield-sidebar text-shield-muted border-shield-border hover:text-white'
                    }`}
                  >
                    {perm.requires_human_approval ? 'Approval Required' : 'Autonomous Allowed'}
                  </button>
                </td>
                <td className="py-3 px-3 text-shield-muted">{perm.rate_limit_per_min || 60}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
