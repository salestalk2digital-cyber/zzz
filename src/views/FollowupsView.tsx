import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StatusBadge, OutletBadge } from '../components/common/Badge.tsx';
import type { FollowUpTask, Lead } from '../types/index.ts';
import {
  PhoneCall,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Sun,
  Moon,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface FollowupsViewProps {
  onOpenFollowupModal: (task: FollowUpTask) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onSelectLead: (lead: Lead) => void;
}

export const FollowupsView: React.FC<FollowupsViewProps> = ({
  onOpenFollowupModal,
  onOpenWhatsApp,
  onSelectLead,
}) => {
  const { activeOutlet } = useAuth();
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSessionTab, setActiveSessionTab] = useState<'afternoon' | 'evening' | 'overdue' | 'completed' | 'all'>('afternoon');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.getFollowUpQueue({ outletId: activeOutlet });
      setTasks(res.tasks);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeOutlet]);

  const todayStr = new Date().toISOString().split('T')[0];

  const afternoonTasks = tasks.filter((t) => t.session === 'afternoon' && t.status === 'pending');
  const eveningTasks = tasks.filter((t) => t.session === 'evening' && t.status === 'pending');
  const overdueTasks = tasks.filter((t) => t.status === 'pending' && t.dueDate < todayStr);
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const getFilteredTasks = () => {
    if (activeSessionTab === 'afternoon') return afternoonTasks;
    if (activeSessionTab === 'evening') return eveningTasks;
    if (activeSessionTab === 'overdue') return overdueTasks;
    if (activeSessionTab === 'completed') return completedTasks;
    return tasks;
  };

  const displayedTasks = getFilteredTasks();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-[#302A28]">Twice-Daily Follow-Up Queues</h1>
        <p className="text-xs text-[#7B706B] mt-0.5">
          Asia/Kolkata Structured Contact Sessions: Afternoon (1:00 PM) & Evening (7:00 PM) review periods
        </p>
      </div>

      {/* Session Queue Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Afternoon Session Pill */}
        <button
          onClick={() => setActiveSessionTab('afternoon')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSessionTab === 'afternoon'
              ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
              : 'bg-white border border-[#F0E4DF] text-[#7B706B] hover:bg-[#FFF9F6]'
          }`}
        >
          <Sun className="w-4 h-4 text-[#E4A23B]" />
          <span>Afternoon Queue (After 1:00 PM)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-[#302A28] font-black">
            {afternoonTasks.length}
          </span>
        </button>

        {/* Evening Session Pill */}
        <button
          onClick={() => setActiveSessionTab('evening')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSessionTab === 'evening'
              ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
              : 'bg-white border border-[#F0E4DF] text-[#7B706B] hover:bg-[#FFF9F6]'
          }`}
        >
          <Moon className="w-4 h-4 text-[#8C78B8]" />
          <span>Evening Queue (After 7:00 PM)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-[#302A28] font-black">
            {eveningTasks.length}
          </span>
        </button>

        {/* Overdue Queue */}
        <button
          onClick={() => setActiveSessionTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSessionTab === 'overdue'
              ? 'bg-[#D9534F] text-white shadow-xs'
              : 'bg-white border border-[#F0E4DF] text-[#D9534F] hover:bg-[#FEECEB]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Overdue / Escalated</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-current font-black">
            {overdueTasks.length}
          </span>
        </button>

        {/* Completed */}
        <button
          onClick={() => setActiveSessionTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSessionTab === 'completed'
              ? 'bg-[#2E8B65] text-white shadow-xs'
              : 'bg-white border border-[#F0E4DF] text-[#7B706B] hover:bg-[#FFF9F6]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#2E8B65]" />
          <span>Completed Attempts</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-[#302A28] font-black">
            {completedTasks.length}
          </span>
        </button>
      </div>

      {/* Current Session Explanation Banner */}
      <div className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-2xl flex items-start gap-3 text-xs">
        {activeSessionTab === 'afternoon' && (
          <>
            <Sun className="w-5 h-5 text-[#E4A23B] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#302A28]">Session 1: Afternoon Follow-Up Queue (Post 1:00 PM IST)</p>
              <p className="text-[11px] text-[#7B706B] mt-0.5">
                Displays scheduled daytime follow-ups, pending morning callbacks, and new inbound leads awaiting contact attempt #1.
              </p>
            </div>
          </>
        )}
        {activeSessionTab === 'evening' && (
          <>
            <Moon className="w-5 h-5 text-[#8C78B8] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#302A28]">Session 2: Evening Review & Callback Queue (Post 7:00 PM IST)</p>
              <p className="text-[11px] text-[#7B706B] mt-0.5">
                Displays evening family callbacks, unresolved afternoon tasks, and WhatsApp outreach needing verification before end of day.
              </p>
            </div>
          </>
        )}
        {activeSessionTab === 'overdue' && (
          <>
            <ShieldAlert className="w-5 h-5 text-[#D9534F] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#D9534F]">Escalated Overdue Tasks</p>
              <p className="text-[11px] text-[#7B706B] mt-0.5">
                Tasks not completed within the session grace period. Notified automatically to Center Managers and Client Admin.
              </p>
            </div>
          </>
        )}
        {activeSessionTab === 'completed' && (
          <>
            <CheckCircle2 className="w-5 h-5 text-[#2E8B65] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#2E8B65]">Historical Completed Tasks</p>
              <p className="text-[11px] text-[#7B706B] mt-0.5">
                Tasks logged with mandatory outcomes (A through K) and authoritative timestamps.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Task Queue Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7B706B] bg-white rounded-3xl border border-[#F0E4DF]">
            Loading follow-up tasks...
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#2E8B65] font-semibold bg-white rounded-3xl border border-[#F0E4DF] flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-[#2E8B65]" />
            <span>No pending tasks in this session queue!</span>
          </div>
        ) : (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              className="p-5 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs hover:border-[#F4B6A0] transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
            >
              {/* Left Details */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-black text-sm text-[#302A28]">{task.leadName}</span>
                  <a
                    href={`tel:${task.leadPhone}`}
                    className="font-mono text-xs font-semibold text-[#5587C7] hover:underline"
                  >
                    {task.leadPhone}
                  </a>
                  <OutletBadge outletId={task.outletId} />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE4D9] text-[#302A28]">
                    Attempt #{task.sequenceNumber}
                  </span>
                  <StatusBadge status={task.leadStatus} />
                </div>

                <div className="text-[#7B706B] flex items-center gap-3 text-[11px]">
                  <span>Due: <strong className="text-[#302A28]">{task.dueDate}</strong> ({task.dueTime})</span>
                  <span>•</span>
                  <span>Assigned Rep: <strong className="text-[#302A28]">{task.assignedToName}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-[#2E8B65]" />
                    <span>WA Status: <strong>{task.whatsAppStatus}</strong></span>
                  </span>
                </div>

                {task.lastRemarks && (
                  <p className="text-[11px] text-[#302A28] bg-[#FFF9F6] p-2 rounded-lg border border-[#F0E4DF] max-w-2xl">
                    <strong className="text-[#7B706B]">Latest Remark:</strong> {task.lastRemarks}
                  </p>
                )}

                {task.completedOutcome && (
                  <p className="text-[11px] text-[#2E8B65] font-semibold">
                    Recorded Outcome: {task.completedOutcome}
                  </p>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {task.status === 'pending' && (
                  <>
                    <button
                      onClick={async () => {
                        const { lead } = await api.getLeadById(task.leadId);
                        onOpenWhatsApp(lead);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#2E8B65]/10 text-[#2E8B65] hover:bg-[#2E8B65] hover:text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => onOpenFollowupModal(task)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Complete Follow-Up</span>
                    </button>
                  </>
                )}

                <button
                  onClick={async () => {
                    const { lead } = await api.getLeadById(task.leadId);
                    onSelectLead(lead);
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-[#302A28] font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  View Lead
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
