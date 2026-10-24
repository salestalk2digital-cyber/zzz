import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { OutletBadge } from '../components/common/Badge.tsx';
import type { PerformanceScorecard } from '../types/index.ts';
import { Award, CheckCircle2, AlertTriangle, PhoneCall, MessageSquare, TrendingUp, User } from 'lucide-react';

export const PerformanceView: React.FC = () => {
  const { activeOutlet } = useAuth();
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month'>('this_month');
  const [scorecards, setScorecards] = useState<PerformanceScorecard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformance = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPerformanceScorecards(period, activeOutlet !== 'all' ? activeOutlet : undefined);
      setScorecards(res.scorecards);
    } catch (err) {
      console.error('Error loading performance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [period, activeOutlet]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Salesperson Performance Meter</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            0–100 Standardized Operational Rubric • Separates employee diligence from customer response
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              period === 'today' ? 'bg-[#F4B6A0] text-[#302A28]' : 'text-[#7B706B]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('this_week')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              period === 'this_week' ? 'bg-[#F4B6A0] text-[#302A28]' : 'text-[#7B706B]'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              period === 'this_month' ? 'bg-[#F4B6A0] text-[#302A28]' : 'text-[#7B706B]'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Rubric Breakdown Explanation Card */}
      <div className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-2xl text-xs space-y-2">
        <h4 className="font-bold text-[#302A28] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#F4B6A0]" />
          Configured Compliance Rubric (100 Maximum Points)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] pt-1">
          <div className="p-2 bg-white rounded-xl border border-[#F0E4DF]">
            <span className="font-bold text-[#302A28]">Follow-ups on time</span>
            <span className="block font-black text-[#2E8B65] mt-0.5">Max 30 pts</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0E4DF]">
            <span className="font-bold text-[#302A28]">Timely 1st Contact</span>
            <span className="block font-black text-[#2E8B65] mt-0.5">Max 20 pts</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0E4DF]">
            <span className="font-bold text-[#302A28]">Activity Remarks</span>
            <span className="block font-black text-[#2E8B65] mt-0.5">Max 15 pts</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0E4DF]">
            <span className="font-bold text-[#302A28]">Customer Comms</span>
            <span className="block font-black text-[#2E8B65] mt-0.5">Max 15 pts</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0E4DF]">
            <span className="font-bold text-[#302A28]">Meeting Mgmt</span>
            <span className="block font-black text-[#2E8B65] mt-0.5">Max 10 pts</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0E4DF]">
            <span className="font-bold text-[#302A28]">CRM Data Accuracy</span>
            <span className="block font-black text-[#2E8B65] mt-0.5">Max 10 pts</span>
          </div>
        </div>
      </div>

      {/* Scorecards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-xs text-[#7B706B]">Calculating scorecards...</div>
        ) : (
          scorecards.map((card) => {
            const b = card.breakdown;
            const m = card.metrics;

            return (
              <div key={card.userId} className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-4">
                {/* Rep Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#F0E4DF]">
                  <div>
                    <h3 className="font-black text-base text-[#302A28]">{card.userName}</h3>
                    <p className="text-xs text-[#7B706B] capitalize mt-0.5">
                      {card.role.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-black text-[#302A28]">{card.totalScore}<span className="text-xs font-bold text-[#7B706B]">/100</span></div>
                    <OutletBadge outletId={card.outletId} />
                  </div>
                </div>

                {/* Score Breakdown Progress Bars */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#7B706B]">Follow-ups completed on time</span>
                    <span className="font-bold text-[#302A28]">{b.followUpCompletionOnTime} / 30 pts</span>
                  </div>
                  <div className="w-full bg-[#FFF9F6] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#2E8B65] h-full" style={{ width: `${(b.followUpCompletionOnTime / 30) * 100}%` }} />
                  </div>

                  <div className="flex justify-between text-[11px] pt-1">
                    <span className="text-[#7B706B]">Timely first contact</span>
                    <span className="font-bold text-[#302A28]">{b.timelyFirstContact} / 20 pts</span>
                  </div>
                  <div className="w-full bg-[#FFF9F6] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#5587C7] h-full" style={{ width: `${(b.timelyFirstContact / 20) * 100}%` }} />
                  </div>

                  <div className="flex justify-between text-[11px] pt-1">
                    <span className="text-[#7B706B]">Activity logging & 7-slot remarks</span>
                    <span className="font-bold text-[#302A28]">{b.activityLoggingRemarks} / 15 pts</span>
                  </div>
                  <div className="w-full bg-[#FFF9F6] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#F4B6A0] h-full" style={{ width: `${(b.activityLoggingRemarks / 15) * 100}%` }} />
                  </div>

                  <div className="flex justify-between text-[11px] pt-1">
                    <span className="text-[#7B706B]">Customer outreach & WhatsApp</span>
                    <span className="font-bold text-[#302A28]">{b.customerCommunicationTasks} / 15 pts</span>
                  </div>
                  <div className="w-full bg-[#FFF9F6] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#E4A23B] h-full" style={{ width: `${(b.customerCommunicationTasks / 15) * 100}%` }} />
                  </div>
                </div>

                {/* Performance Output Summary */}
                <div className="p-3 bg-[#FFF9F6] rounded-2xl border border-[#F0E4DF] grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-[#7B706B] block">Assigned Leads</span>
                    <span className="font-black text-[#302A28] text-sm">{m.assignedLeads}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7B706B] block">Deals Closed</span>
                    <span className="font-black text-[#2E8B65] text-sm">{m.convertedLeads}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7B706B] block">Confirmed Sales</span>
                    <span className="font-black text-[#2E8B65] text-sm">₹{(m.confirmedSalesValue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
