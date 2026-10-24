import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { OutletId, LeadSource, Lead } from '../../types/index.ts';
import { AlertCircle, CheckCircle2, MessageSquare, Phone, UserPlus } from 'lucide-react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (newLead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onLeadCreated,
  onOpenWhatsApp,
}) => {
  const { user, activeOutlet } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [email, setEmail] = useState('');
  const [outletId, setOutletId] = useState<OutletId>('gurgaon');
  const [leadSource, setLeadSource] = useState<LeadSource>('Meta Ads');
  const [requirement, setRequirement] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('Afternoon Slot (12:00 PM – 3:00 PM)');
  const [budget, setBudget] = useState('');
  const [decisionTimeline, setDecisionTimeline] = useState('');
  const [initialRemarks, setInitialRemarks] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextFollowUpTime, setNextFollowUpTime] = useState('14:00');

  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdSuccessLead, setCreatedSuccessLead] = useState<Lead | null>(null);

  // Set default outlet according to user role or active selection
  useEffect(() => {
    if (user?.role === 'gurgaon_team') setOutletId('gurgaon');
    else if (user?.role === 'faridabad_team') setOutletId('faridabad');
    else if (activeOutlet !== 'all') setOutletId(activeOutlet);
  }, [user, activeOutlet, isOpen]);

  // Check duplicate phone on blur
  const checkDuplicate = async (phone: string) => {
    if (!phone || phone.length < 8) return;
    try {
      const res = await api.checkDuplicatePhone(phone);
      if (res.duplicate && res.existingLead) {
        setDuplicateWarning(res.existingLead);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setWhatsAppNumber('');
    setEmail('');
    setRequirement('');
    setPreferredDate('');
    setBudget('');
    setDecisionTimeline('');
    setInitialRemarks('');
    setDuplicateWarning(null);
    setErrorMessage('');
    setCreatedSuccessLead(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await api.createLead({
        customerName,
        mobileNumber,
        whatsAppNumber: whatsAppNumber || mobileNumber,
        email,
        outletId,
        leadSource,
        requirement,
        preferredDate: preferredDate || undefined,
        preferredSlot,
        budget: budget ? Number(budget) : undefined,
        decisionTimeline,
        initialRemarks,
        nextFollowUpDate,
        nextFollowUpTime,
      });

      setCreatedSuccessLead(res.lead);
      onLeadCreated(res.lead);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create lead. Please check input fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Lead"
      subtitle="ZigZagZoh Play & Party Centers • Direct Enquiry Capture"
      maxWidth="3xl"
    >
      {createdSuccessLead ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EBF7F0] text-[#2E8B65] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-[#302A28]">Lead Created Successfully!</h4>
            <p className="text-xs text-[#7B706B] mt-1 font-mono">
              Lead ID: <strong className="text-[#302A28]">{createdSuccessLead.id}</strong> • Assigned to{' '}
              {createdSuccessLead.assignedSalespersonName}
            </p>
          </div>

          <div className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl max-w-md mx-auto text-left text-xs space-y-1.5">
            <p><strong className="text-[#302A28]">Customer:</strong> {createdSuccessLead.customerName} ({createdSuccessLead.mobileNumber})</p>
            <p><strong className="text-[#302A28]">Center:</strong> {createdSuccessLead.outletId.toUpperCase()}</p>
            <p><strong className="text-[#302A28]">Requirement:</strong> {createdSuccessLead.requirement}</p>
            <p><strong className="text-[#302A28]">Quality Score:</strong> {createdSuccessLead.qualityScore}/100 ({createdSuccessLead.qualityBand})</p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                onOpenWhatsApp(createdSuccessLead);
                handleClose();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E8B65] text-white text-xs font-bold hover:bg-[#2E8B65]/90 transition-all shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send WhatsApp Now</span>
            </button>

            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-[#F0E4DF] text-xs font-semibold text-[#302A28] hover:bg-[#FFF9F6] transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-[#FEF6E8] border border-[#D97706]/40 rounded-xl text-[#302A28] flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#D97706]">Existing Lead Found with this phone number:</strong>
                  <p className="mt-0.5">
                    {duplicateWarning.customerName} ({duplicateWarning.id}) • Status: {duplicateWarning.status} • Center: {duplicateWarning.outletId}
                  </p>
                  <p className="text-[11px] text-[#7B706B] mt-0.5">
                    Proceeding will record this as an enquiry update for the same customer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Customer Details */}
          <div>
            <h5 className="font-bold text-[#302A28] mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#F4B6A0]" />
              1. Customer Information
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Customer Name <span className="text-[#D9534F]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Mobile Number <span className="text-[#D9534F]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  onBlur={(e) => checkDuplicate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  WhatsApp Number (if different)
                </label>
                <input
                  type="tel"
                  placeholder="Same as mobile if empty"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Outlet Center <span className="text-[#D9534F]">*</span>
                </label>
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value as OutletId)}
                  disabled={user?.role === 'gurgaon_team' || user?.role === 'faridabad_team'}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden bg-white"
                >
                  <option value="gurgaon">Gurgaon Center</option>
                  <option value="faridabad">Faridabad Center</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Lead Source <span className="text-[#D9534F]">*</span>
                </label>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden bg-white"
                >
                  <option value="Meta Ads">Meta Ads (Facebook/Instagram)</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Website">Website Form</option>
                  <option value="WhatsApp">WhatsApp Inbound</option>
                  <option value="Walk-in">Walk-in Inquiry</option>
                  <option value="Referral">Word of Mouth / Referral</option>
                  <option value="Organic Social">Organic Social Media</option>
                  <option value="Existing Customer">Repeat Customer</option>
                  <option value="Other">Other Channel</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Requirement & Preferences */}
          <div className="pt-2 border-t border-[#F0E4DF]">
            <h5 className="font-bold text-[#302A28] mb-2 uppercase tracking-wider text-[11px]">
              2. Requirement & Preferences
            </h5>
            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                Requirement / Service Needed <span className="text-[#D9534F]">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Birthday Party for 30 kids with customized cake, playzone unlimited access and snacks"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Preferred Time Slot</label>
                <select
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden bg-white"
                >
                  <option value="Afternoon Slot (12:00 PM – 3:00 PM)">12:00 PM – 3:00 PM</option>
                  <option value="Late Afternoon Slot (4:00 PM – 7:00 PM)">4:00 PM – 7:00 PM</option>
                  <option value="Evening Slot (5:00 PM – 8:00 PM)">5:00 PM – 8:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Expected Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 45000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Follow-Up & Remarks */}
          <div className="pt-2 border-t border-[#F0E4DF]">
            <h5 className="font-bold text-[#302A28] mb-2 uppercase tracking-wider text-[11px]">
              3. Initial Remark & First Follow-Up
            </h5>
            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                Initial Remark (Allocated to Remark Slot #1)
              </label>
              <input
                type="text"
                placeholder="e.g. Customer connected via Instagram ad, looking for pricing quote..."
                value={initialRemarks}
                onChange={(e) => setInitialRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Scheduled Time (1:00 PM or 7:00 PM Queue)
                </label>
                <select
                  value={nextFollowUpTime}
                  onChange={(e) => setNextFollowUpTime(e.target.value)}
                  className="w-full px-3 py-2 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden bg-white"
                >
                  <option value="13:30">1:30 PM (Afternoon Queue Session 1)</option>
                  <option value="14:00">2:00 PM (Afternoon Queue Session 1)</option>
                  <option value="19:30">7:30 PM (Evening Queue Session 2)</option>
                  <option value="20:00">8:00 PM (Evening Queue Session 2)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#F0E4DF] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-[#F0E4DF] font-semibold text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl font-bold bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Lead...' : 'Save New Lead'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
