import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge, OutletBadge, QualityScoreBadge } from '../common/Badge.tsx';
import type { Lead, RemarkEntry, ActivityType, FollowUpOutcome, LeadStatus } from '../../types/index.ts';
import {
  Phone,
  MessageSquare,
  Calendar,
  FileSpreadsheet,
  Clock,
  History,
  Send,
  AlertCircle,
  Plus,
  CheckCircle2,
  DollarSign,
  User,
  Tag,
  Building,
} from 'lucide-react';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenFollowup: (lead: Lead) => void;
  onOpenBooking: (lead: Lead) => void;
  onLeadUpdated: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onOpenWhatsApp,
  onOpenFollowup,
  onOpenBooking,
  onLeadUpdated,
}) => {
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [remarks, setRemarks] = useState<RemarkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // New remark entry form
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newActivityType, setNewActivityType] = useState<ActivityType>('Follow-Up Call');
  const [newOutcome, setNewOutcome] = useState<FollowUpOutcome>('Discussion Completed — Follow-Up Required');
  const [isAddingRemark, setIsAddingRemark] = useState(false);

  // Status update
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('New Lead');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusRemarks, setStatusRemarks] = useState('');

  // Fetch full details
  const loadLeadDetails = async () => {
    if (!leadId) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await api.getLeadById(leadId);
      setLead(data.lead);
      setRemarks(data.remarks);
      setSelectedStatus(data.lead.status);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading lead details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) {
      loadLeadDetails();
    }
  }, [isOpen, leadId]);

  if (!isOpen || !leadId) return null;

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newRemarkText.trim()) return;

    setIsAddingRemark(true);
    try {
      const res = await api.addRemark(lead.id, {
        remarkText: newRemarkText,
        activityType: newActivityType,
        outcome: newOutcome,
      });
      setRemarks((prev) => [...prev, res.remark]);
      setNewRemarkText('');
      // Reload lead to reflect updated timestamps
      const updated = await api.getLeadById(lead.id);
      setLead(updated.lead);
      onLeadUpdated(updated.lead);
    } catch (err: any) {
      alert(`Error saving remark: ${err.message}`);
    } finally {
      setIsAddingRemark(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!lead || selectedStatus === lead.status) return;

    setIsUpdatingStatus(true);
    try {
      const res = await api.updateLead(lead.id, {
        status: selectedStatus,
        statusRemarks,
      });
      setLead(res.lead);
      onLeadUpdated(res.lead);
      setStatusRemarks('');
      alert(`Status successfully updated to ${selectedStatus}`);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Group remarks into the primary 7 slots + extended timeline
  const slotEntries: Array<{ slotNumber: number; remark: RemarkEntry | null }> = Array.from(
    { length: 7 },
    (_, i) => {
      const slotNum = i + 1;
      const r = remarks.find((item) => item.slotIndex === slotNum) || remarks[i] || null;
      return { slotNumber: slotNum, remark: r };
    }
  );

  const extendedRemarks = remarks.slice(7);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? `${lead.customerName} (${lead.id})` : 'Lead Details'}
      subtitle={lead ? `${lead.outletId.toUpperCase()} Center • Assigned to ${lead.assignedSalespersonName}` : ''}
      maxWidth="4xl"
    >
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[#7B706B]">Loading lead file & history...</div>
      ) : lead ? (
        <div className="space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F]">
              {errorMessage}
            </div>
          )}

          {/* Top Quick Action Bar */}
          <div className="p-3 bg-[#FFF9F6] border border-[#F0E4DF] rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={lead.status} />
              <OutletBadge outletId={lead.outletId} />
              <QualityScoreBadge score={lead.qualityScore} band={lead.qualityBand} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenWhatsApp(lead)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E8B65] text-white font-bold hover:bg-[#2E8B65]/90 transition-all shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Outreach</span>
              </button>

              <button
                onClick={() => onOpenFollowup(lead)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4B6A0] text-[#302A28] font-bold hover:bg-[#EFA48A] transition-all shadow-xs cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Record Follow-Up</span>
              </button>

              <button
                onClick={() => onOpenBooking(lead)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FCE4D9] text-[#302A28] font-bold hover:bg-[#F4B6A0] transition-all border border-[#F4B6A0]/40 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book / Check Slot</span>
              </button>
            </div>
          </div>

          {/* Lead Information Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Contact & Customer Info */}
            <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl space-y-2">
              <h5 className="font-bold text-[#302A28] text-xs uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F0E4DF]">
                <User className="w-3.5 h-3.5 text-[#F4B6A0]" />
                Customer Contact
              </h5>
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[#7B706B] block text-[10px]">Mobile Phone:</span>
                  <a href={`tel:${lead.mobileNumber}`} className="font-bold text-[#302A28] hover:text-[#F4B6A0]">
                    {lead.mobileNumber}
                  </a>
                </div>
                {lead.whatsAppNumber && (
                  <div>
                    <span className="text-[#7B706B] block text-[10px]">WhatsApp:</span>
                    <span className="font-medium text-[#302A28]">{lead.whatsAppNumber}</span>
                  </div>
                )}
                {lead.email && (
                  <div>
                    <span className="text-[#7B706B] block text-[10px]">Email:</span>
                    <span className="font-medium text-[#302A28]">{lead.email}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#7B706B] block text-[10px]">Source:</span>
                  <span className="font-semibold text-[#302A28]">{lead.leadSource}</span>
                </div>
                {lead.externalSheetRowId && (
                  <div>
                    <span className="text-[#7B706B] block text-[10px]">Google Sheets Reference:</span>
                    <span className="font-mono text-[10px] text-[#5587C7]">{lead.externalSheetRowId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Requirement & Preferences */}
            <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl space-y-2">
              <h5 className="font-bold text-[#302A28] text-xs uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F0E4DF]">
                <Tag className="w-3.5 h-3.5 text-[#F4B6A0]" />
                Service Requirement
              </h5>
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[#7B706B] block text-[10px]">Requirement:</span>
                  <p className="font-medium text-[#302A28] leading-snug">{lead.requirement}</p>
                </div>
                <div>
                  <span className="text-[#7B706B] block text-[10px]">Preferred Date & Slot:</span>
                  <p className="font-semibold text-[#302A28]">
                    {lead.preferredDate || 'No date fixed yet'}{' '}
                    {lead.preferredSlot ? `• ${lead.preferredSlot}` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-[#7B706B] block text-[10px]">Decision Timeline:</span>
                  <span className="font-medium text-[#302A28]">{lead.decisionTimeline || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* 3. Sales & Financials */}
            <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl space-y-2">
              <h5 className="font-bold text-[#302A28] text-xs uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F0E4DF]">
                <DollarSign className="w-3.5 h-3.5 text-[#2E8B65]" />
                Sales & Commercials
              </h5>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-[#7B706B]">Customer Budget:</span>
                  <span className="font-bold text-[#302A28]">₹{(lead.budget || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7B706B]">Proposal Amount:</span>
                  <span className="font-bold text-[#302A28]">₹{(lead.proposalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7B706B]">Negotiation Amount:</span>
                  <span className="font-bold text-[#D97706]">₹{(lead.negotiationAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#F0E4DF]">
                  <span className="font-bold text-[#2E8B65]">Confirmed Sale:</span>
                  <span className="font-extrabold text-[#2E8B65]">₹{(lead.finalAgreedAmount || 0).toLocaleString()}</span>
                </div>
                <div className="pt-1">
                  <span className="text-[#7B706B] block text-[10px]">Next Follow-Up Due:</span>
                  <span className="font-semibold text-[#302A28]">
                    {lead.nextFollowUpDate || 'None'} ({lead.nextFollowUpTime || '14:00'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Status Update Bar */}
          <div className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-2xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block font-bold text-[#302A28] mb-1">Update Sales Pipeline Status</label>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                  className="flex-1 px-3 py-2 bg-white border border-[#F0E4DF] rounded-xl font-medium focus:outline-hidden"
                >
                  <option value="New Lead">New Lead</option>
                  <option value="Contact Attempted">Contact Attempted</option>
                  <option value="Connected">Connected</option>
                  <option value="Follow-Up 1">Follow-Up 1</option>
                  <option value="Follow-Up 2">Follow-Up 2</option>
                  <option value="Follow-Up 3">Follow-Up 3</option>
                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                  <option value="Video Call Scheduled">Video Call Scheduled</option>
                  <option value="Proposal Pending">Proposal Pending</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Interested — Future Date">Interested — Future Date</option>
                  <option value="Booking Requested">Booking Requested</option>
                  <option value="Converted / Booked">Converted / Booked</option>
                  <option value="Lost / Closed">Lost / Closed</option>
                  <option value="Invalid / Spam">Invalid / Spam</option>
                </select>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus || selectedStatus === lead.status}
                  className="px-4 py-2 bg-[#302A28] text-white font-bold rounded-xl hover:bg-[#302A28]/90 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isUpdatingStatus ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>

          {/* THE SEVEN REMARK SLOTS SYSTEM */}
          <div className="p-5 bg-white border border-[#F0E4DF] rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0E4DF]">
              <div>
                <h4 className="font-extrabold text-[#302A28] text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-[#F4B6A0]" />
                  Seven Mandatory Remark Slots & Activity History
                </h4>
                <p className="text-[11px] text-[#7B706B] mt-0.5">
                  Seven dedicated chronological slots. New entries never overwrite previous attempts.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FCE4D9] text-[#302A28]">
                {remarks.length} Recorded Attempts
              </span>
            </div>

            {/* The 7 Visual Slots */}
            <div className="space-y-2.5">
              {slotEntries.map(({ slotNumber, remark }) => (
                <div
                  key={slotNumber}
                  className={`p-3 rounded-xl border transition-all ${
                    remark
                      ? 'bg-[#FFF9F6] border-[#F0E4DF]'
                      : 'bg-[#FDFBF9] border-dashed border-[#F0E4DF]/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FCE4D9] text-[#302A28] font-black text-[10px] flex items-center justify-center">
                        #{slotNumber}
                      </span>
                      {remark ? (
                        <span className="font-bold text-[#302A28]">
                          {remark.activityType}
                          {remark.outcome ? ` • ${remark.outcome}` : ''}
                        </span>
                      ) : (
                        <span className="text-[#7B706B] italic">Remark Slot #{slotNumber} (Empty)</span>
                      )}
                    </div>

                    {remark && (
                      <span className="text-[11px] text-[#7B706B]">
                        {new Date(remark.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        by <strong className="text-[#302A28]">{remark.authorName}</strong>
                      </span>
                    )}
                  </div>

                  {remark && (
                    <p className="text-xs text-[#302A28] mt-1.5 pl-7 leading-relaxed font-normal">
                      {remark.remarkText}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Extended remarks if more than 7 */}
            {extendedRemarks.length > 0 && (
              <div className="pt-2 border-t border-[#F0E4DF] space-y-2">
                <h6 className="font-bold text-[#7B706B] text-[11px] uppercase">Additional Chronological Activity</h6>
                {extendedRemarks.map((remark, idx) => (
                  <div key={remark.id} className="p-2.5 rounded-xl bg-[#FFF9F6] border border-[#F0E4DF] text-xs">
                    <div className="flex justify-between text-[11px] text-[#7B706B]">
                      <span className="font-bold text-[#302A28]">#{idx + 8} {remark.activityType}</span>
                      <span>{new Date(remark.timestamp).toLocaleDateString()} by {remark.authorName}</span>
                    </div>
                    <p className="text-[#302A28] mt-1">{remark.remarkText}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Form to Append New Remark */}
            <form onSubmit={handleAddRemark} className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl space-y-3">
              <h6 className="font-bold text-[#302A28] flex items-center gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5 text-[#F4B6A0]" />
                Log Next Remark Entry
              </h6>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#7B706B] mb-1">Activity Type</label>
                  <select
                    value={newActivityType}
                    onChange={(e) => setNewActivityType(e.target.value as ActivityType)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-lg focus:outline-hidden"
                  >
                    <option value="First Call">First Call</option>
                    <option value="Follow-Up Call">Follow-Up Call</option>
                    <option value="WhatsApp Action">WhatsApp Action</option>
                    <option value="WhatsApp Reply">WhatsApp Reply</option>
                    <option value="Customer Requested Callback">Customer Requested Callback</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Video Call">Video Call</option>
                    <option value="Proposal Discussion">Proposal Discussion</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Booking Discussion">Booking Discussion</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#7B706B] mb-1">Outcome</label>
                  <select
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value as FollowUpOutcome)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-lg focus:outline-hidden"
                  >
                    <option value="Discussion Completed — Follow-Up Required">Discussion Completed — Follow-Up Required</option>
                    <option value="No Answer — Follow-Up Required">No Answer — Follow-Up Required</option>
                    <option value="Discussion Ongoing">Discussion Ongoing</option>
                    <option value="Interested — Decision Pending">Interested — Decision Pending</option>
                    <option value="Requested Callback">Requested Callback</option>
                    <option value="Proposal / Price Discussion">Proposal / Price Discussion</option>
                    <option value="Converted / Booked">Converted / Booked</option>
                    <option value="Not Interested / Lost">Not Interested / Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#7B706B] mb-1">Remark Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Record summary of customer response, objections or requirements discussed..."
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#F0E4DF] rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isAddingRemark || !newRemarkText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAddingRemark ? 'Saving...' : 'Add Historical Remark'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
