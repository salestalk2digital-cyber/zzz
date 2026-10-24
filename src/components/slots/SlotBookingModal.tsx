import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { api } from '../../services/api.ts';
import type { Lead, SlotDefinition, OutletId, SlotBooking } from '../../types/index.ts';
import { Calendar, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';

interface SlotBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  outletId: OutletId;
  defaultDate?: string;
  defaultSlotId?: string;
  slotDefinitions: SlotDefinition[];
  onBookingConfirmed: (booking: SlotBooking) => void;
}

export const SlotBookingModal: React.FC<SlotBookingModalProps> = ({
  isOpen,
  onClose,
  lead,
  outletId,
  defaultDate,
  defaultSlotId,
  slotDefinitions,
  onBookingConfirmed,
}) => {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [selectedSlotDefId, setSelectedSlotDefId] = useState(defaultSlotId || slotDefinitions[0]?.id || '');
  const [actionType, setActionType] = useState<'confirm' | 'interest'>('confirm');
  const [confirmedSaleAmount, setConfirmedSaleAmount] = useState(lead?.expectedSaleValue?.toString() || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !lead) return null;

  const outletSlots = slotDefinitions.filter((s) => s.outletId === outletId && s.isActive);
  const activeSlot = outletSlots.find((s) => s.id === selectedSlotDefId) || outletSlots[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (actionType === 'confirm') {
        const res = await api.confirmSlotBooking({
          leadId: lead.id,
          outletId,
          date,
          slotDefinitionId: activeSlot.id,
          confirmedSaleAmount: confirmedSaleAmount ? Number(confirmedSaleAmount) : undefined,
          notes,
        });
        onBookingConfirmed(res.booking);
        onClose();
      } else {
        const res = await api.expressSlotInterest({
          leadId: lead.id,
          outletId,
          date,
          slotDefinitionId: activeSlot.id,
          notes,
        });
        onBookingConfirmed(res.booking);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing slot booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actionType === 'confirm' ? 'Official Slot Booking Confirmation' : 'Register Customer Interest in Slot'}
      subtitle={`Outlet: ${outletId.toUpperCase()} • Lead: ${lead.customerName} (${lead.id})`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Toggle: Confirm vs Express Interest */}
        <div className="flex p-1 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl">
          <button
            type="button"
            onClick={() => setActionType('confirm')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              actionType === 'confirm'
                ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
                : 'text-[#7B706B] hover:text-[#302A28]'
            }`}
          >
            Confirm Official Booking (Exclusive)
          </button>
          <button
            type="button"
            onClick={() => setActionType('interest')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              actionType === 'interest'
                ? 'bg-[#FCE4D9] text-[#302A28] shadow-xs'
                : 'text-[#7B706B] hover:text-[#302A28]'
            }`}
          >
            Register Interest Only (Multi-Lead)
          </button>
        </div>

        {actionType === 'confirm' ? (
          <div className="p-3 bg-[#EBF7F0] border border-[#2E8B65]/30 rounded-xl text-[#2E8B65] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#302A28]">Concurrency-Safe Booking Engine</p>
              <p className="text-[11px] text-[#2E8B65]">
                Confirming locks this slot exclusively for {lead.customerName}. Any concurrent confirmation attempt for the same outlet and slot will be blocked by the server transaction.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#FEF6E8] border border-[#D97706]/30 rounded-xl text-[#302A28] flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#302A28]">Multi-Customer Interest Allowed</p>
              <p className="text-[11px] text-[#7B706B]">
                Multiple leads can look at the same slot. This marks the slot as "Interested" without falsely reporting it as booked to other team members.
              </p>
            </div>
          </div>
        )}

        {/* Date and Slot Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#302A28] mb-1">Booking Date <span className="text-[#D9534F]">*</span></label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#302A28] mb-1">Time Slot <span className="text-[#D9534F]">*</span></label>
            <select
              value={selectedSlotDefId}
              onChange={(e) => setSelectedSlotDefId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
            >
              {outletSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name} ({slot.startTime} – {slot.endTime})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Financial: Confirmed Sale Amount (Only for Confirm action) */}
        {actionType === 'confirm' && (
          <div>
            <label className="block font-semibold text-[#302A28] mb-1">
              Confirmed Sale Amount (₹) <span className="text-[#D9534F]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#7B706B]">₹</span>
              <input
                type="number"
                required
                placeholder="e.g. 48000"
                value={confirmedSaleAmount}
                onChange={(e) => setConfirmedSaleAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-[#7B706B] mt-1">
              Will be recorded under Confirmed Sales Value (distinct from proposed quotation).
            </p>
          </div>
        )}

        <div>
          <label className="block font-semibold text-[#302A28] mb-1">Internal Booking Notes / Package Details</label>
          <textarea
            rows={2}
            placeholder="e.g. 25 kids, 2 hours trampoline, customized catering and party host included..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
          />
        </div>

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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[#302A28] shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
              actionType === 'confirm' ? 'bg-[#F4B6A0] hover:bg-[#EFA48A]' : 'bg-[#FCE4D9] hover:bg-[#F4B6A0]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : actionType === 'confirm' ? 'Lock & Confirm Slot' : 'Save Slot Interest'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
