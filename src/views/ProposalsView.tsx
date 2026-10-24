import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { OutletBadge } from '../components/common/Badge.tsx';
import type { Proposal, Lead } from '../types/index.ts';
import {
  FileSpreadsheet,
  Plus,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProposalsViewProps {
  onSelectLead: (lead: Lead) => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({ onSelectLead }) => {
  const { activeOutlet } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New proposal modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProposals(activeOutlet !== 'all' ? activeOutlet : undefined);
      setProposals(res.proposals);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [activeOutlet]);

  const handleOpenCreate = async () => {
    const res = await api.getLeads({ outletId: activeOutlet !== 'all' ? activeOutlet : undefined });
    setLeads(res.leads);
    if (res.leads[0]) setSelectedLeadId(res.leads[0].id);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !amount) return;

    try {
      const numAmount = Number(amount);
      const numDiscount = Number(discount) || 0;
      await api.createProposal({
        leadId: selectedLeadId,
        proposalAmount: numAmount,
        discountAmount: numDiscount,
        revisedAmount: numAmount - numDiscount,
        internalRemarks: remarks,
        nextFollowUpDate: nextFollowUp || undefined,
      });

      setShowCreateModal(false);
      setAmount('');
      setDiscount('');
      setRemarks('');
      await fetchProposals();
      alert('Proposal created and sent successfully!');
    } catch (err: any) {
      alert(`Error creating proposal: ${err.message}`);
    }
  };

  // Financial Segregations
  const totalProposed = proposals.reduce((acc, p) => acc + (p.proposalAmount || 0), 0);
  const underNegotiation = proposals.filter((p) => p.status === 'Negotiation').reduce((acc, p) => acc + (p.negotiationAmount || p.revisedAmount || 0), 0);
  const acceptedValue = proposals.filter((p) => p.status === 'Accepted').reduce((acc, p) => acc + (p.finalAgreedAmount || p.revisedAmount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Proposals & Price Negotiations</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Strict separation between proposed quotation values and realized revenue
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Proposal</span>
        </button>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-[#7B706B]">Total Value Quoted</span>
          <div className="text-2xl font-black text-[#302A28] mt-1">₹{totalProposed.toLocaleString()}</div>
          <p className="text-[10px] text-[#7B706B] mt-1">Initial proposals submitted to customers</p>
        </div>

        <div className="p-4 bg-[#FFF9F6] border border-[#E4A23B]/30 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-[#E4A23B]">Value Under Negotiation</span>
          <div className="text-2xl font-black text-[#E4A23B] mt-1">₹{underNegotiation.toLocaleString()}</div>
          <p className="text-[10px] text-[#7B706B] mt-1">Counter-offers and revised discounts in review</p>
        </div>

        <div className="p-4 bg-[#EBF7F0] border border-[#2E8B65]/30 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-[#2E8B65]">Accepted Proposals Value</span>
          <div className="text-2xl font-black text-[#2E8B65] mt-1">₹{acceptedValue.toLocaleString()}</div>
          <p className="text-[10px] text-[#2E8B65]/80 mt-1">Accepted by client awaiting slot finalization</p>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
            <tr>
              <th className="px-5 py-3">Proposal ID & Customer</th>
              <th className="px-4 py-3">Center</th>
              <th className="px-4 py-3">Quote (₹)</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Revised (₹)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rep & Date</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E4DF]/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#7B706B]">Loading proposals...</td>
              </tr>
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#7B706B]">No proposals created yet.</td>
              </tr>
            ) : (
              proposals.map((prop) => (
                <tr key={prop.id} className="hover:bg-[#FFF9F6] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#302A28]">
                    <div>{prop.customerName}</div>
                    <span className="text-[10px] font-mono text-[#7B706B]">{prop.id}</span>
                  </td>
                  <td className="px-4 py-3.5"><OutletBadge outletId={prop.outletId} /></td>
                  <td className="px-4 py-3.5 font-semibold text-[#302A28]">₹{prop.proposalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-[#D97706] font-medium">-₹{(prop.discountAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3.5 font-black text-[#2E8B65]">₹{prop.revisedAmount.toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE4D9] text-[#302A28]">
                      {prop.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#7B706B]">
                    <div>{prop.salespersonName}</div>
                    <span className="text-[10px]">{prop.proposalDate}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={async () => {
                        const { lead } = await api.getLeadById(prop.leadId);
                        onSelectLead(lead);
                      }}
                      className="px-3 py-1.5 bg-[#FFF9F6] border border-[#F0E4DF] hover:bg-[#FCE4D9]/40 text-[#302A28] font-bold rounded-xl text-xs transition-colors"
                    >
                      View Lead
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-[#F0E4DF] shadow-xl space-y-4 text-xs">
            <h4 className="text-base font-bold text-[#302A28]">Generate New Quotation / Proposal</h4>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Select Customer Lead *</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customerName} ({l.id} • {l.outletId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Proposed Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Discount Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 3000"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Internal Package Inclusions & Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 2 hours soft play + 1 hour trampoline + kids meals + party host..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#F0E4DF] text-[#7B706B] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
