import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { OutletBadge } from '../components/common/Badge.tsx';
import type { AuditLog } from '../types/index.ts';
import { History, Shield, Filter, Search } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { activeOutlet } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        outletId: activeOutlet !== 'all' ? activeOutlet : undefined,
        category: categoryFilter || undefined,
      });
      setLogs(res.logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeOutlet, categoryFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Activity & Immutable Audit Log</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Tamper-proof compliance history of status transitions, booking commitments, and staff actions
          </p>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 bg-white border border-[#F0E4DF] rounded-xl text-xs font-semibold"
          >
            <option value="">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="lead">Lead Changes</option>
            <option value="followup">Follow-Up Sessions</option>
            <option value="booking">Booking Engine</option>
            <option value="proposal">Proposals</option>
            <option value="whatsapp">WhatsApp Outreach</option>
            <option value="sheets">Google Sheets Sync</option>
            <option value="user_management">User Management</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
            <tr>
              <th className="px-5 py-3">Timestamp (IST)</th>
              <th className="px-4 py-3">Actor / User</th>
              <th className="px-4 py-3">Action Event</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Center</th>
              <th className="px-5 py-3">Details & Target Record</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E4DF]/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#7B706B]">Loading audit log...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#7B706B]">No audit events logged.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FFF9F6] transition-colors">
                  <td className="px-5 py-3 font-mono text-[#7B706B] text-[11px]">
                    {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#302A28]">
                    <div>{log.userName}</div>
                    <span className="text-[10px] text-[#7B706B] font-normal capitalize">{log.userRole.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#302A28]">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF9F6] border border-[#F0E4DF] text-[#7B706B] uppercase">
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3"><OutletBadge outletId={log.outletId || 'all'} /></td>
                  <td className="px-5 py-3 text-[#302A28]">
                    <p className="max-w-lg leading-relaxed">{log.details}</p>
                    {log.targetId && (
                      <span className="font-mono text-[10px] text-[#7B706B]">Target: {log.targetId}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
