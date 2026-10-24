import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { OutletBadge } from '../components/common/Badge.tsx';
import type { Meeting, Lead } from '../types/index.ts';
import {
  CalendarCheck,
  Video,
  MapPin,
  Clock,
  Plus,
  CheckCircle2,
  PhoneCall,
  User,
} from 'lucide-react';

interface MeetingsViewProps {
  onSelectLead: (lead: Lead) => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({ onSelectLead }) => {
  const { activeOutlet } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New meeting modal
  const [showModal, setShowModal] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [meetingType, setMeetingType] = useState<Meeting['meetingType']>('In-person meeting');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMeetings(activeOutlet !== 'all' ? activeOutlet : undefined);
      setMeetings(res.meetings);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [activeOutlet]);

  const handleOpenCreate = async () => {
    const res = await api.getLeads({ outletId: activeOutlet !== 'all' ? activeOutlet : undefined });
    setLeads(res.leads);
    if (res.leads[0]) setSelectedLeadId(res.leads[0].id);
    setShowModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !date || !time) return;

    try {
      await api.createMeeting({
        leadId: selectedLeadId,
        meetingType,
        date,
        time,
        location: meetingType === 'In-person meeting' ? location || 'ZigZagZoh Center Desk' : undefined,
        meetingLink: meetingType === 'Video call' ? location || 'https://meet.google.com/zzz-party' : undefined,
        notes,
      });

      setShowModal(false);
      setNotes('');
      setLocation('');
      await fetchMeetings();
      alert('Meeting scheduled successfully!');
    } catch (err: any) {
      alert(`Error scheduling meeting: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Meetings & Center Walkthroughs</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            In-person visits, video call walkthroughs, and scheduled callbacks
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Visit / Video Call</span>
        </button>
      </div>

      <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
            <tr>
              <th className="px-5 py-3">Customer & Lead</th>
              <th className="px-4 py-3">Center</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Location / Link</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rep</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E4DF]/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#7B706B]">Loading meetings...</td>
              </tr>
            ) : meetings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#7B706B]">No meetings scheduled.</td>
              </tr>
            ) : (
              meetings.map((m) => (
                <tr key={m.id} className="hover:bg-[#FFF9F6] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#302A28]">
                    <div>{m.customerName}</div>
                    <span className="text-[10px] font-mono text-[#7B706B]">{m.customerPhone}</span>
                  </td>
                  <td className="px-4 py-3.5"><OutletBadge outletId={m.outletId} /></td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 font-semibold text-[#302A28]">
                      {m.meetingType === 'Video call' ? (
                        <Video className="w-3.5 h-3.5 text-[#5587C7]" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-[#F4B6A0]" />
                      )}
                      {m.meetingType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-[#302A28]">
                    <div>{m.date}</div>
                    <span className="text-[10px] text-[#7B706B]">{m.time} IST</span>
                  </td>
                  <td className="px-4 py-3.5 max-w-xs truncate text-[#7B706B]">
                    {m.meetingLink ? (
                      <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-[#5587C7] underline font-mono text-[10px]">
                        Google Meet Link
                      </a>
                    ) : (
                      m.location || 'Center Reception'
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F4EFFE] text-[#8C78B8]">
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#7B706B] font-semibold">{m.assignedSalespersonName}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={async () => {
                        const { lead } = await api.getLeadById(m.leadId);
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

      {/* Schedule Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-[#F0E4DF] shadow-xl space-y-4 text-xs">
            <h4 className="text-base font-bold text-[#302A28]">Schedule Visit or Video Call</h4>

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

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Meeting Type *</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value as any)}
                  className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                >
                  <option value="In-person meeting">In-person meeting at Center</option>
                  <option value="Video call">Video call (Walkthrough demo)</option>
                  <option value="Customer callback">Scheduled Customer Callback</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Time (IST) *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Location or Video Link</label>
                <input
                  type="text"
                  placeholder="e.g. ZigZagZoh Gurgaon Reception or Meet URL"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#302A28] mb-1">Meeting Objectives & Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Show playground equipment, explain food menu and host options..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#F0E4DF] text-[#7B706B] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs"
                >
                  Save Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
