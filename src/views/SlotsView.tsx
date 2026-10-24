import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { OutletBadge } from '../components/common/Badge.tsx';
import type { SlotDefinition, OutletId, SlotBooking, Lead } from '../types/index.ts';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Filter,
} from 'lucide-react';

interface SlotsViewProps {
  onOpenBookingModal: (lead: Lead, outletId: OutletId, date: string, slotId: string) => void;
  onSelectLead: (lead: Lead) => void;
}

export const SlotsView: React.FC<SlotsViewProps> = ({
  onOpenBookingModal,
  onSelectLead,
}) => {
  const { activeOutlet, canChangeOutlet, user } = useAuth();
  const [selectedOutlet, setSelectedOutlet] = useState<OutletId>(
    activeOutlet === 'faridabad' ? 'faridabad' : 'gurgaon'
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [slotDefs, setSlotDefs] = useState<SlotDefinition[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelModalBooking, setCancelModalBooking] = useState<SlotBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Update selected outlet when active outlet changes
  useEffect(() => {
    if (activeOutlet !== 'all') {
      setSelectedOutlet(activeOutlet);
    }
  }, [activeOutlet]);

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const [defsRes, availRes] = await Promise.all([
        api.getSlotDefinitions(selectedOutlet),
        api.getSlotAvailability(selectedDate, selectedOutlet),
      ]);
      setSlotDefs(defsRes.slots);
      setAvailability(availRes.availability || []);
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedOutlet, selectedDate]);

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking || !cancelReason.trim()) return;
    try {
      await api.cancelSlotBooking(cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      setCancelReason('');
      await loadSlots();
      alert('Booking cancelled and slot released back to available state.');
    } catch (err: any) {
      alert(`Error cancelling booking: ${err.message}`);
    }
  };

  // Metrics for current outlet
  const confirmedCount = availability.filter((a) => a.status === 'confirmed').length;
  const interestedCount = availability.reduce((acc, a) => acc + (a.interestedLeadsCount || 0), 0);
  const availableCount = availability.filter((a) => a.status === 'available').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Slot Calendar & Availability Engine</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Real-time party & play hall booking engine with concurrency-safe transaction locks
          </p>
        </div>

        {/* Outlet Switcher (if permitted) */}
        {canChangeOutlet ? (
          <div className="flex items-center gap-1.5 p-1 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs">
            <button
              onClick={() => setSelectedOutlet('gurgaon')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedOutlet === 'gurgaon'
                  ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
                  : 'text-[#7B706B] hover:text-[#302A28]'
              }`}
            >
              Gurgaon Center
            </button>
            <button
              onClick={() => setSelectedOutlet('faridabad')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedOutlet === 'faridabad'
                  ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
                  : 'text-[#7B706B] hover:text-[#302A28]'
              }`}
            >
              Faridabad Center
            </button>
          </div>
        ) : (
          <OutletBadge outletId={selectedOutlet} />
        )}
      </div>

      {/* Date Bar & Availability Summary */}
      <div className="p-4 bg-white border border-[#F0E4DF] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl border border-[#F0E4DF] text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#F4B6A0]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-[#302A28] bg-[#FFF9F6] border border-[#F0E4DF] px-3 py-1.5 rounded-xl focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl border border-[#F0E4DF] text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend / Metrics */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2E8B65]" />
            <span>Available ({availableCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FCE4D9] border border-[#F4B6A0]" />
            <span>Interested ({interestedCount} inquiries)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F4B6A0]" />
            <span>Confirmed ({confirmedCount})</span>
          </div>
        </div>
      </div>

      {/* Slot Availability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 py-16 text-center text-xs text-[#7B706B]">
            Verifying slot availability on server...
          </div>
        ) : (
          availability.map((item) => {
            const def = item.slotDefinition;
            const status = item.status;
            const confirmed = item.confirmedBooking;
            const interestedList: SlotBooking[] = item.interestedLeads || [];

            return (
              <div
                key={def.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-xs ${
                  status === 'confirmed'
                    ? 'bg-[#FFF9F6] border-[#F4B6A0]'
                    : status === 'interested'
                    ? 'bg-white border-[#FCE4D9]'
                    : 'bg-white border-[#F0E4DF]'
                }`}
              >
                <div>
                  {/* Slot Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0E4DF]">
                    <div>
                      <h4 className="font-extrabold text-[#302A28] text-sm">{def.name}</h4>
                      <div className="text-xs text-[#7B706B] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#F4B6A0]" />
                        <span>{def.startTime} – {def.endTime} IST</span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status === 'confirmed'
                          ? 'bg-[#F4B6A0] text-[#302A28]'
                          : status === 'booking_requested'
                          ? 'bg-[#FEF6E8] text-[#D97706]'
                          : status === 'interested'
                          ? 'bg-[#FCE4D9] text-[#302A28]'
                          : 'bg-[#EBF7F0] text-[#2E8B65]'
                      }`}
                    >
                      {status === 'confirmed'
                        ? 'Confirmed / Booked'
                        : status === 'booking_requested'
                        ? 'Booking Requested'
                        : status === 'interested'
                        ? `Interested (${interestedList.length} leads)`
                        : 'Available for Booking'}
                    </span>
                  </div>

                  {/* Confirmed Booking Details */}
                  {confirmed && (
                    <div className="mt-4 p-4 rounded-2xl bg-white border border-[#F4B6A0]/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#302A28]">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#2E8B65]" />
                          {confirmed.customerName}
                        </span>
                        <span className="font-extrabold text-[#2E8B65]">
                          ₹{(confirmed.confirmedSaleAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7B706B]">
                        Confirmed by {confirmed.confirmedBy} on {new Date(confirmed.confirmedAt!).toLocaleDateString()}
                      </p>
                      {confirmed.notes && (
                        <p className="text-[11px] text-[#302A28] bg-[#FFF9F6] p-2 rounded-lg border border-[#F0E4DF]">
                          {confirmed.notes}
                        </p>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setCancelModalBooking(confirmed)}
                          className="text-[11px] font-bold text-[#D9534F] hover:underline"
                        >
                          Cancel Booking & Release Slot
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interested Leads List */}
                  {interestedList.length > 0 && (
                    <div className="mt-4 space-y-2 text-xs">
                      <h6 className="font-bold text-[#7B706B] text-[11px] uppercase tracking-wider">
                        Interested Inquiries ({interestedList.length})
                      </h6>
                      <div className="space-y-1.5">
                        {interestedList.map((intr) => (
                          <div
                            key={intr.id}
                            className="p-2.5 rounded-xl bg-[#FFF9F6] border border-[#F0E4DF] flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-[#302A28]">{intr.customerName}</span>
                              <span className="text-[10px] text-[#7B706B] block font-mono">{intr.customerPhone}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-[#7B706B]">
                              Rep: {intr.assignedSalespersonName}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#7B706B] italic">
                        Multiple leads may express interest until one officially confirms.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action */}
                {!confirmed && (
                  <div className="mt-6 pt-3 border-t border-[#F0E4DF] flex items-center justify-end">
                    <button
                      onClick={async () => {
                        const { leads } = await api.getLeads({ outletId: selectedOutlet });
                        const eligible = leads.find((l) => l.status !== 'Converted / Booked');
                        if (eligible) {
                          onOpenBookingModal(eligible, selectedOutlet, selectedDate, def.id);
                        } else {
                          alert('No open leads available. Create a new lead first.');
                        }
                      }}
                      className="w-full py-2.5 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Book or Express Interest</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-[#F0E4DF] shadow-xl space-y-4 text-xs">
            <h4 className="text-base font-bold text-[#D9534F] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Cancel Booking & Release Slot
            </h4>
            <p className="text-[#7B706B]">
              Are you sure you want to cancel the confirmed slot for <strong>{cancelModalBooking.customerName}</strong> on {cancelModalBooking.date}?
            </p>

            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                Mandatory Cancellation Reason <span className="text-[#D9534F]">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Customer rescheduled event due to illness..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 border border-[#F0E4DF] rounded-xl text-[#7B706B] font-semibold"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-[#D9534F] text-white font-bold rounded-xl hover:bg-[#D9534F]/90 transition-all disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
