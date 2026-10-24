import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StatusBadge, OutletBadge } from '../components/common/Badge.tsx';
import type { Lead, FollowUpTask, SlotBooking } from '../types/index.ts';
import {
  Users2,
  PhoneCall,
  Clock,
  AlertTriangle,
  MessageSquare,
  CalendarCheck,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  CheckCircle2,
  CalendarDays,
  Sheet,
  ArrowUpRight,
  RefreshCw,
  Store,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToTab: (tab: any) => void;
  onSelectLead: (lead: Lead) => void;
  onOpenNewLead: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTab,
  onSelectLead,
  onOpenNewLead,
}) => {
  const { activeOutlet, canChangeOutlet } = useAuth();
  const [dateRange, setDateRange] = useState('this_month');
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [pendingTasks, setPendingTasks] = useState<FollowUpTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, leadsRes, queueRes] = await Promise.all([
        api.getAnalytics(activeOutlet, dateRange),
        api.getLeads({ outletId: activeOutlet }),
        api.getFollowUpQueue({ outletId: activeOutlet, status: 'pending' }),
      ]);
      setAnalytics(analyticsRes);
      setRecentLeads(leadsRes.leads.slice(0, 6));
      setPendingTasks(queueRes.tasks.slice(0, 6));
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeOutlet, dateRange]);

  const kpis = analytics?.kpis || {};
  const comp = analytics?.outletComparison || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-white via-[#FFF9F6] to-[#FCE4D9]/40 border border-[#F0E4DF] rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FCE4D9] text-[#302A28]">
              Operational Live CRM
            </span>
            <span className="text-xs text-[#7B706B]">Asia/Kolkata Timezone</span>
          </div>
          <h1 className="text-2xl font-black text-[#302A28] mt-1 tracking-tight">
            ZigZagZoh Sales Dashboard
          </h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Active Center:{' '}
            <strong className="text-[#302A28]">
              {activeOutlet === 'all' ? 'Gurgaon & Faridabad Combined' : `${activeOutlet.toUpperCase()} Outlet`}
            </strong>{' '}
            • Powered by Supreme Ads
          </p>
        </div>

        {/* Date Filter & Refresh Button */}
        <div className="flex items-center gap-2.5">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-white border border-[#F0E4DF] rounded-xl text-[#302A28] focus:outline-hidden focus:border-[#F4B6A0]"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="all">All Records</option>
          </select>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-white border border-[#F0E4DF] text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenNewLead}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] shadow-xs transition-all active:scale-95"
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* 1-Click Operational Shortcuts for Simple & Fast Workflow */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#7B706B] mr-1">
          Quick Actions:
        </span>

        <button
          onClick={onOpenNewLead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <span>+ Add Customer Lead</span>
        </button>

        <button
          onClick={() => onNavigateToTab('followups')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F6] border border-[#F0E4DF] hover:bg-[#FCE4D9] text-[#302A28] text-xs font-bold transition-all cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5 text-[#5587C7]" />
          <span>Today's Follow-up Queue</span>
        </button>

        <button
          onClick={() => onNavigateToTab('whatsapp')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F6] border border-[#F0E4DF] hover:bg-[#EBF7F0] text-[#302A28] text-xs font-bold transition-all cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#2E8B65]" />
          <span>WhatsApp Outreach ({kpis.whatsAppMissing ?? 0} missing)</span>
        </button>

        <button
          onClick={() => onNavigateToTab('slots')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F6] border border-[#F0E4DF] hover:bg-[#FCE4D9] text-[#302A28] text-xs font-bold transition-all cursor-pointer"
        >
          <CalendarDays className="w-3.5 h-3.5 text-[#E4A23B]" />
          <span>Check & Confirm Slots</span>
        </button>
      </div>

      {/* KPI Cards Grid (18 Essential Metrics from Brief) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Leads */}
        <div
          onClick={() => onNavigateToTab('leads')}
          className="p-4 bg-white border border-[#F0E4DF] rounded-2xl hover:border-[#F4B6A0] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[#7B706B]">
            <span className="text-[11px] font-semibold">Total Leads</span>
            <Users2 className="w-4 h-4 text-[#F4B6A0]" />
          </div>
          <div className="text-xl font-black text-[#302A28] mt-2">{kpis.totalLeads ?? 0}</div>
          <div className="text-[10px] text-[#2E8B65] mt-1 font-semibold flex items-center gap-1">
            <span>+{kpis.newLeadsToday ?? 0} new today</span>
          </div>
        </div>

        {/* 2. Uncontacted Leads */}
        <div
          onClick={() => onNavigateToTab('leads')}
          className="p-4 bg-white border border-[#F0E4DF] rounded-2xl hover:border-[#F4B6A0] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-[#7B706B]">
            <span className="text-[11px] font-semibold">Uncontacted</span>
            <Clock className="w-4 h-4 text-[#E4A23B]" />
          </div>
          <div className="text-xl font-black text-[#E4A23B] mt-2">{kpis.uncontactedLeads ?? 0}</div>
          <div className="text-[10px] text-[#7B706B] mt-1">Requires 1st call</div>
        </div>

        {/* 3. Follow-Ups Due Today */}
        <div
          onClick={() => onNavigateToTab('followups')}
          className="p-4 bg-white border border-[#F0E4DF] rounded-2xl hover:border-[#F4B6A0] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-[#7B706B]">
            <span className="text-[11px] font-semibold">Follow-Ups Today</span>
            <PhoneCall className="w-4 h-4 text-[#5587C7]" />
          </div>
          <div className="text-xl font-black text-[#302A28] mt-2">{kpis.followUpsDueToday ?? 0}</div>
          <div className="text-[10px] text-[#7B706B] mt-1">Scheduled calls</div>
        </div>

        {/* 4. Overdue Follow-ups */}
        <div
          onClick={() => onNavigateToTab('followups')}
          className="p-4 bg-white border border-[#F0E4DF] rounded-2xl hover:border-[#D9534F] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-[#7B706B]">
            <span className="text-[11px] font-semibold">Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-[#D9534F]" />
          </div>
          <div className="text-xl font-black text-[#D9534F] mt-2">{kpis.overdueFollowUps ?? 0}</div>
          <div className="text-[10px] text-[#D9534F] mt-1 font-semibold">Escalated to Manager</div>
        </div>

        {/* 5. WhatsApp Missing Action */}
        <div
          onClick={() => onNavigateToTab('whatsapp')}
          className="p-4 bg-white border border-[#F0E4DF] rounded-2xl hover:border-[#F4B6A0] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-[#7B706B]">
            <span className="text-[11px] font-semibold">WA Action Missing</span>
            <MessageSquare className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-xl font-black text-[#D97706] mt-2">{kpis.whatsAppMissing ?? 0}</div>
          <div className="text-[10px] text-[#7B706B] mt-1">Pending compliance</div>
        </div>

        {/* 6. Confirmed Bookings */}
        <div
          onClick={() => onNavigateToTab('slots')}
          className="p-4 bg-white border border-[#F0E4DF] rounded-2xl hover:border-[#2E8B65] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-[#7B706B]">
            <span className="text-[11px] font-semibold">Confirmed Slots</span>
            <CalendarDays className="w-4 h-4 text-[#2E8B65]" />
          </div>
          <div className="text-xl font-black text-[#2E8B65] mt-2">{kpis.confirmedBookings ?? 0}</div>
          <div className="text-[10px] text-[#7B706B] mt-1">{kpis.interestedBookings ?? 0} interested leads</div>
        </div>
      </div>

      {/* Row 2 Financial & Compliance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Proposal Pipeline Value */}
        <div className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-2xl">
          <span className="text-xs font-semibold text-[#7B706B]">Total Proposal Pipeline</span>
          <div className="text-2xl font-black text-[#302A28] mt-1">
            ₹{(kpis.totalProposalValue ?? 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-[#7B706B] mt-1">Quotes actively submitted to clients</p>
        </div>

        {/* Confirmed Sales Value (Realized Revenue Segregation) */}
        <div className="p-4 bg-[#EBF7F0] border border-[#2E8B65]/30 rounded-2xl">
          <span className="text-xs font-bold text-[#2E8B65]">Confirmed Sales Value</span>
          <div className="text-2xl font-black text-[#2E8B65] mt-1">
            ₹{(kpis.confirmedSalesValue ?? 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-[#2E8B65]/80 mt-1">Exclusively from Converted / Booked leads</p>
        </div>

        {/* Follow-up Compliance Rate */}
        <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl">
          <div className="flex justify-between items-center text-xs font-semibold text-[#7B706B]">
            <span>Follow-Up Compliance</span>
            <span className="font-bold text-[#302A28]">{kpis.followUpComplianceRate ?? 100}%</span>
          </div>
          <div className="w-full bg-[#FFF9F6] h-2 rounded-full mt-2 overflow-hidden border border-[#F0E4DF]">
            <div
              className="bg-[#2E8B65] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.followUpComplianceRate ?? 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-[#7B706B] mt-1.5">
            Afternoon: {kpis.afternoonCompleted ?? 0} done • Evening: {kpis.eveningCompleted ?? 0} done
          </p>
        </div>

        {/* Slot Utilization Rate */}
        <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl">
          <div className="flex justify-between items-center text-xs font-semibold text-[#7B706B]">
            <span>Slot Utilization Rate</span>
            <span className="font-bold text-[#302A28]">{kpis.slotUtilizationRate ?? 0}%</span>
          </div>
          <div className="w-full bg-[#FFF9F6] h-2 rounded-full mt-2 overflow-hidden border border-[#F0E4DF]">
            <div
              className="bg-[#F4B6A0] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.slotUtilizationRate ?? 0)}%` }}
            />
          </div>
          <p className="text-[10px] text-[#7B706B] mt-1.5">Confirmed bookings ÷ total bookable slots</p>
        </div>
      </div>

      {/* Center Comparison Table (Gurgaon vs Faridabad) */}
      <div className="bg-white border border-[#F0E4DF] rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0E4DF]">
          <div>
            <h3 className="font-extrabold text-[#302A28] text-sm flex items-center gap-2">
              <Store className="w-4 h-4 text-[#F4B6A0]" />
              Outlet Comparison: Gurgaon vs Faridabad
            </h3>
            <p className="text-[11px] text-[#7B706B]">
              Side-by-side performance of both retail play and party centers
            </p>
          </div>
        </div>

        <div className="overflow-x-auto pt-3">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#F0E4DF] text-[#7B706B] text-[11px]">
                <th className="py-2.5 font-bold">Outlet Center</th>
                <th className="py-2.5 font-bold">Total Leads</th>
                <th className="py-2.5 font-bold">Converted</th>
                <th className="py-2.5 font-bold">Conversion Rate</th>
                <th className="py-2.5 font-bold">Confirmed Slots</th>
                <th className="py-2.5 font-bold">Sales Value (₹)</th>
                <th className="py-2.5 font-bold">Overdue Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E4DF]/60">
              <tr>
                <td className="py-3 font-bold text-[#302A28] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5587C7]" />
                  Gurgaon Center
                </td>
                <td className="py-3 font-semibold">{comp.gurgaon?.totalLeads ?? 0}</td>
                <td className="py-3 text-[#2E8B65] font-bold">{comp.gurgaon?.converted ?? 0}</td>
                <td className="py-3 font-bold">{comp.gurgaon?.conversionRate ?? 0}%</td>
                <td className="py-3 font-semibold">{comp.gurgaon?.confirmedBookings ?? 0}</td>
                <td className="py-3 font-bold text-[#2E8B65]">₹{(comp.gurgaon?.salesValue ?? 0).toLocaleString()}</td>
                <td className="py-3">
                  {(comp.gurgaon?.overdueFollowUps ?? 0) > 0 ? (
                    <span className="font-bold text-[#D9534F]">{comp.gurgaon?.overdueFollowUps} overdue</span>
                  ) : (
                    <span className="text-[#2E8B65] font-semibold">Zero overdue</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-[#302A28] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E4A23B]" />
                  Faridabad Center
                </td>
                <td className="py-3 font-semibold">{comp.faridabad?.totalLeads ?? 0}</td>
                <td className="py-3 text-[#2E8B65] font-bold">{comp.faridabad?.converted ?? 0}</td>
                <td className="py-3 font-bold">{comp.faridabad?.conversionRate ?? 0}%</td>
                <td className="py-3 font-semibold">{comp.faridabad?.confirmedBookings ?? 0}</td>
                <td className="py-3 font-bold text-[#2E8B65]">₹{(comp.faridabad?.salesValue ?? 0).toLocaleString()}</td>
                <td className="py-3">
                  {(comp.faridabad?.overdueFollowUps ?? 0) > 0 ? (
                    <span className="font-bold text-[#D9534F]">{comp.faridabad?.overdueFollowUps} overdue</span>
                  ) : (
                    <span className="text-[#2E8B65] font-semibold">Zero overdue</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Columns: Recent Leads & Today's Follow-up Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0E4DF]">
            <h3 className="font-bold text-[#302A28] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users2 className="w-4 h-4 text-[#F4B6A0]" />
              Recent Customer Inquiries
            </h3>
            <button
              onClick={() => onNavigateToTab('leads')}
              className="text-xs text-[#7B706B] hover:text-[#302A28] font-bold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#F0E4DF]/60 pt-2">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="py-3 flex items-center justify-between hover:bg-[#FFF9F6] px-2 rounded-xl transition-colors cursor-pointer text-xs"
              >
                <div>
                  <div className="font-bold text-[#302A28] flex items-center gap-2">
                    <span>{lead.customerName}</span>
                    <span className="font-mono text-[10px] text-[#7B706B]">{lead.id}</span>
                  </div>
                  <p className="text-[11px] text-[#7B706B] mt-0.5 truncate max-w-xs">{lead.requirement}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <OutletBadge outletId={lead.outletId} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up Queue Preview */}
        <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0E4DF]">
            <h3 className="font-bold text-[#302A28] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-[#5587C7]" />
              Follow-Up Queue Pending
            </h3>
            <button
              onClick={() => onNavigateToTab('followups')}
              className="text-xs text-[#7B706B] hover:text-[#302A28] font-bold flex items-center gap-1"
            >
              <span>Open Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#F0E4DF]/60 pt-2">
            {pendingTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#2E8B65] font-semibold flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-[#2E8B65]" />
                <span>All scheduled follow-up tasks are completed!</span>
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onNavigateToTab('followups')}
                  className="py-3 flex items-center justify-between hover:bg-[#FFF9F6] px-2 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  <div>
                    <div className="font-bold text-[#302A28]">{task.leadName}</div>
                    <p className="text-[11px] text-[#7B706B] mt-0.5">
                      Session: <strong className="capitalize">{task.session}</strong> ({task.dueTime}) • Rep: {task.assignedToName}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#FCE4D9] text-[#302A28]">
                    Attempt #{task.sequenceNumber}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
