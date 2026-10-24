import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { api } from '../../services/api.ts';
import type { FollowUpTask, FollowUpOutcome, LeadStatus } from '../../types/index.ts';
import { CheckCircle2, Calendar, Clock, AlertCircle } from 'lucide-react';

interface CompleteFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: FollowUpTask | null;
  onCompleted: (task: FollowUpTask) => void;
}

export const CompleteFollowupModal: React.FC<CompleteFollowupModalProps> = ({
  isOpen,
  onClose,
  task,
  onCompleted,
}) => {
  const [outcome, setOutcome] = useState<FollowUpOutcome>('Discussion Completed — Follow-Up Required');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [nextFollowUpTime, setNextFollowUpTime] = useState('14:00');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !task) return null;

  const outcomesList: Array<{ value: FollowUpOutcome; label: string; desc: string }> = [
    { value: 'Discussion Completed — Follow-Up Required', label: 'A. Discussion Completed — Follow-Up Required', desc: 'Customer answered and spoke, another touchpoint scheduled.' },
    { value: 'No Answer — Follow-Up Required', label: 'B. No Answer — Follow-Up Required', desc: 'Customer did not pick up; follow-up attempt needed.' },
    { value: 'Discussion Ongoing', label: 'C. Discussion Ongoing', desc: 'Discussing requirements, menu, or comparing options.' },
    { value: 'Interested — Decision Pending', label: 'D. Interested — Decision Pending', desc: 'Customer interested, waiting for family/internal decision.' },
    { value: 'Requested Callback', label: 'E. Requested Callback', desc: 'Customer requested a specific callback time.' },
    { value: 'Meeting / Video Call Required', label: 'F. Meeting / Video Call Required', desc: 'Schedule visit or video walkthrough.' },
    { value: 'Proposal / Price Discussion', label: 'G. Proposal / Price Discussion', desc: 'Move to proposal stage / negotiation.' },
    { value: 'Converted / Booked', label: 'H. Converted / Booked', desc: 'Deal closed and booked! Confirms sale value.' },
    { value: 'Not Interested / Lost', label: 'I. Not Interested / Lost', desc: 'Customer declined; requires mandatory lost reason.' },
    { value: 'Invalid / Spam', label: 'J. Invalid / Spam', desc: 'Wrong number or spam enquiry.' },
    { value: 'Do Not Contact', label: 'K. Do Not Contact', desc: 'Customer requested not to be contacted further.' },
  ];

  const requiresNextFollowUp = [
    'Discussion Completed — Follow-Up Required',
    'No Answer — Follow-Up Required',
    'Discussion Ongoing',
    'Interested — Decision Pending',
    'Requested Callback',
    'Proposal / Price Discussion',
  ].includes(outcome);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (requiresNextFollowUp && !nextFollowUpDate) {
      setErrorMessage('Please select a Next Follow-Up Date.');
      return;
    }

    if (outcome === 'Converted / Booked' && !agreedAmount) {
      setErrorMessage('Final agreed amount is required to mark lead as Converted / Booked.');
      return;
    }

    if (outcome === 'Not Interested / Lost' && !notes && !lostReason) {
      setErrorMessage('Lost reason is mandatory when marking a lead as Lost.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.completeFollowUp(task.id, {
        outcome,
        notes: outcome === 'Not Interested / Lost' ? `${notes} (Reason: ${lostReason})` : notes,
        nextFollowUpDate: requiresNextFollowUp ? nextFollowUpDate : undefined,
        nextFollowUpTime: requiresNextFollowUp ? nextFollowUpTime : undefined,
      });

      onCompleted(res.task);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete follow-up task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Follow-Up Session"
      subtitle={`Lead: ${task.leadName} (${task.leadPhone}) • Attempt #${task.sequenceNumber}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mandatory Outcome Dropdown */}
        <div>
          <label className="block font-bold text-[#302A28] mb-1">
            Mandatory Follow-Up Outcome <span className="text-[#D9534F]">*</span>
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as FollowUpOutcome)}
            className="w-full p-2.5 bg-white border border-[#F0E4DF] rounded-xl font-medium text-[#302A28] focus:border-[#F4B6A0] focus:outline-hidden"
          >
            {outcomesList.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#7B706B] mt-1 italic">
            {outcomesList.find((o) => o.value === outcome)?.desc}
          </p>
        </div>

        {/* Discussion Summary / Notes */}
        <div>
          <label className="block font-bold text-[#302A28] mb-1">
            Discussion Summary & Remarks <span className="text-[#D9534F]">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Detailed notes of what customer said, concerns raised, or next steps agreed..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden text-[#302A28]"
          />
        </div>

        {/* Conditional Field: Converted Amount */}
        {outcome === 'Converted / Booked' && (
          <div className="p-3 bg-[#EBF7F0] border border-[#2E8B65]/30 rounded-xl space-y-2">
            <h6 className="font-bold text-[#2E8B65]">Booking Confirmation Details</h6>
            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                Final Agreed Sale Amount (₹) <span className="text-[#D9534F]">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 55000"
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#2E8B65]/40 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Conditional Field: Lost Reason */}
        {outcome === 'Not Interested / Lost' && (
          <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl space-y-2">
            <h6 className="font-bold text-[#D9534F]">Reason for Lost Deal (Mandatory)</h6>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9534F]/40 rounded-xl focus:outline-hidden"
            >
              <option value="">Select Lost Reason...</option>
              <option value="High Price / Budget Constraint">High Price / Budget Constraint</option>
              <option value="Date / Preferred Slot Unavailable">Date / Preferred Slot Unavailable</option>
              <option value="Chose Competitor Play Area">Chose Competitor Play Area</option>
              <option value="Event Cancelled / Postponed Indefinitely">Event Cancelled / Postponed Indefinitely</option>
              <option value="Location / Distance Issue">Location / Distance Issue</option>
              <option value="Customer Unresponsive after multiple attempts">Customer Unresponsive after multiple attempts</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        {/* Conditional Field: Next Follow-Up Scheduling */}
        {requiresNextFollowUp && (
          <div className="p-3 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl space-y-3">
            <h6 className="font-bold text-[#302A28] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F4B6A0]" />
              Schedule Next Follow-Up Contact
            </h6>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Next Follow-Up Date <span className="text-[#D9534F]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">
                  Target Session Queue
                </label>
                <select
                  value={nextFollowUpTime}
                  onChange={(e) => setNextFollowUpTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                >
                  <option value="13:30">1:30 PM (Afternoon Queue — Session 1)</option>
                  <option value="14:00">2:00 PM (Afternoon Queue — Session 1)</option>
                  <option value="19:30">7:30 PM (Evening Queue — Session 2)</option>
                  <option value="20:00">8:00 PM (Evening Queue — Session 2)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-3 border-t border-[#F0E4DF] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#F0E4DF] font-semibold text-[#7B706B] hover:text-[#302A28] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording...' : 'Record Outcome & Complete Task'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
