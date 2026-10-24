import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StatusBadge, OutletBadge, QualityScoreBadge } from '../components/common/Badge.tsx';
import type { Lead, LeadStatus, LeadSource, OutletId } from '../types/index.ts';
import {
  Search,
  Filter,
  Download,
  Phone,
  MessageSquare,
  Calendar,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface LeadsViewProps {
  onSelectLead: (lead: Lead) => void;
  onOpenNewLead: () => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenFollowup: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  onSelectLead,
  onOpenNewLead,
  onOpenWhatsApp,
  onOpenFollowup,
}) => {
  const { activeOutlet, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [outletFilter, setOutletFilter] = useState(activeOutlet);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLeads({
        outletId: outletFilter !== 'all' ? outletFilter : undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        quality: qualityFilter || undefined,
        search: search || undefined,
      });
      setLeads(res.leads);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setOutletFilter(activeOutlet);
  }, [activeOutlet]);

  useEffect(() => {
    fetchLeads();
  }, [outletFilter, statusFilter, sourceFilter, qualityFilter, search]);

  // Export to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = [
      'Lead ID',
      'Customer Name',
      'Mobile Number',
      'WhatsApp Number',
      'Outlet',
      'Assigned Salesperson',
      'Status',
      'Lead Source',
      'Requirement',
      'Budget',
      'Quality Score',
      'Quality Band',
      'Proposal Amount',
      'Confirmed Sale Amount',
      'Created At',
    ];

    const rows = leads.map((l) => [
      l.id,
      `"${l.customerName.replace(/"/g, '""')}"`,
      l.mobileNumber,
      l.whatsAppNumber || '',
      l.outletId,
      `"${l.assignedSalespersonName.replace(/"/g, '""')}"`,
      l.status,
      l.leadSource,
      `"${l.requirement.replace(/"/g, '""')}"`,
      l.budget || '',
      l.qualityScore,
      l.qualityBand,
      l.proposalAmount || '',
      l.finalAgreedAmount || '',
      l.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZigZagZoh_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Leads Management</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Real-time inquiries and qualification tracking across Gurgaon & Faridabad centers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#F0E4DF] text-xs font-semibold text-[#7B706B] hover:text-[#302A28] rounded-xl hover:bg-[#FFF9F6] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-2 px-4 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar with 1-Tap Filter Pills */}
      <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl space-y-3 shadow-xs">
        {/* Quick 1-Tap Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-[#F0E4DF]/60">
          <span className="text-[10px] font-black uppercase text-[#7B706B] tracking-wider mr-1">Quick Filter:</span>
          <button
            onClick={() => { setStatusFilter(''); setQualityFilter(''); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !statusFilter && !qualityFilter
                ? 'bg-[#302A28] text-white shadow-xs'
                : 'bg-[#FFF9F6] text-[#7B706B] hover:bg-[#FCE4D9]'
            }`}
          >
            All Leads ({leads.length})
          </button>
          <button
            onClick={() => setStatusFilter('New Lead')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'New Lead'
                ? 'bg-[#5587C7] text-white shadow-xs'
                : 'bg-[#FFF9F6] text-[#7B706B] hover:bg-[#FCE4D9]'
            }`}
          >
            New Leads
          </button>
          <button
            onClick={() => setStatusFilter('Follow-Up 1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter.startsWith('Follow-Up')
                ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
                : 'bg-[#FFF9F6] text-[#7B706B] hover:bg-[#FCE4D9]'
            }`}
          >
            In Follow-Up
          </button>
          <button
            onClick={() => setStatusFilter('Converted / Booked')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'Converted / Booked'
                ? 'bg-[#2E8B65] text-white shadow-xs'
                : 'bg-[#FFF9F6] text-[#7B706B] hover:bg-[#FCE4D9]'
            }`}
          >
            Converted
          </button>
          <button
            onClick={() => setQualityFilter('High')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              qualityFilter === 'High'
                ? 'bg-[#E4A23B] text-white shadow-xs'
                : 'bg-[#FFF9F6] text-[#7B706B] hover:bg-[#FCE4D9]'
            }`}
          >
            High Quality (80+)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#7B706B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or lead ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0]"
            >
              <option value="">All Statuses</option>
              <option value="New Lead">New Lead</option>
              <option value="Contact Attempted">Contact Attempted</option>
              <option value="Connected">Connected</option>
              <option value="Follow-Up 1">Follow-Up 1</option>
              <option value="Follow-Up 2">Follow-Up 2</option>
              <option value="Follow-Up 3">Follow-Up 3</option>
              <option value="Meeting Scheduled">Meeting Scheduled</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Booking Requested">Booking Requested</option>
              <option value="Converted / Booked">Converted / Booked</option>
              <option value="Lost / Closed">Lost / Closed</option>
              <option value="Invalid / Spam">Invalid / Spam</option>
            </select>
          </div>

          {/* Lead Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0]"
            >
              <option value="">All Lead Sources</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Website">Website</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
              <option value="Organic Social">Organic Social</option>
            </select>
          </div>

          {/* Quality Filter */}
          <div>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="w-full text-xs p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0]"
            >
              <option value="">All Quality Bands</option>
              <option value="High">High Quality (80-100)</option>
              <option value="Medium">Medium Quality (50-79)</option>
              <option value="Low">Low Quality (0-49)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
              <tr>
                <th className="px-5 py-3">Lead ID & Customer</th>
                <th className="px-4 py-3">Center</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Quality Score</th>
                <th className="px-4 py-3">Sales Status</th>
                <th className="px-4 py-3">Commercials (₹)</th>
                <th className="px-4 py-3">Rep & Next Follow-Up</th>
                <th className="px-5 py-3 text-right">Quick Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F0E4DF]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7B706B]">
                    Loading leads database...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7B706B]">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#FFF9F6]/60 transition-colors">
                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div
                        onClick={() => onSelectLead(lead)}
                        className="font-bold text-[#302A28] hover:text-[#F4B6A0] cursor-pointer"
                      >
                        {lead.customerName}
                      </div>
                      <div className="text-[11px] text-[#7B706B] font-mono mt-0.5">
                        {lead.id} • {lead.mobileNumber}
                      </div>
                    </td>

                    {/* Center */}
                    <td className="px-4 py-3.5">
                      <OutletBadge outletId={lead.outletId} />
                    </td>

                    {/* Requirement */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-medium text-[#302A28] truncate">{lead.requirement}</div>
                      <div className="text-[10px] text-[#7B706B] mt-0.5">
                        Src: {lead.leadSource} {lead.preferredDate ? `• Date: ${lead.preferredDate}` : ''}
                      </div>
                    </td>

                    {/* Quality */}
                    <td className="px-4 py-3.5">
                      <QualityScoreBadge score={lead.qualityScore} band={lead.qualityBand} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Commercials */}
                    <td className="px-4 py-3.5">
                      {lead.status === 'Converted / Booked' ? (
                        <div className="font-bold text-[#2E8B65]">
                          ₹{(lead.finalAgreedAmount || 0).toLocaleString()} (Confirmed)
                        </div>
                      ) : (
                        <div className="font-semibold text-[#302A28]">
                          {lead.budget ? `₹${lead.budget.toLocaleString()} budget` : 'Budget open'}
                        </div>
                      )}
                    </td>

                    {/* Salesperson & Next Due */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#302A28]">{lead.assignedSalespersonName}</div>
                      <div className="text-[10px] text-[#7B706B] mt-0.5 flex items-center gap-1">
                        <span>Due: {lead.nextFollowUpDate || 'None'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenWhatsApp(lead)}
                          title="Open WhatsApp Outreach"
                          className="p-1.5 rounded-lg bg-[#2E8B65]/10 text-[#2E8B65] hover:bg-[#2E8B65] hover:text-white transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenFollowup(lead)}
                          title="Record Follow-Up Call"
                          className="p-1.5 rounded-lg bg-[#F4B6A0]/20 text-[#302A28] hover:bg-[#F4B6A0] transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSelectLead(lead)}
                          title="View Full History"
                          className="p-1.5 rounded-lg bg-gray-100 text-[#7B706B] hover:text-[#302A28] hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer count */}
        <div className="px-5 py-3 border-t border-[#F0E4DF] bg-[#FFF9F6] flex justify-between items-center text-xs text-[#7B706B]">
          <span>Showing {leads.length} total lead records</span>
          <span className="text-[11px]">Filtered by authorized center rules</span>
        </div>
      </div>
    </div>
  );
};
