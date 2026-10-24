import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { BarChart3, TrendingUp, PieChart, Layers, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { activeOutlet } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      try {
        const res = await api.getAnalytics(activeOutlet !== 'all' ? activeOutlet : undefined, 'this_month');
        setData(res);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, [activeOutlet]);

  const kpis = data?.kpis || {};
  const pipeline = data?.pipeline || [];
  const comp = data?.outletComparison || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-[#302A28]">Enterprise Sales & Conversion Analytics</h1>
        <p className="text-xs text-[#7B706B] mt-0.5">
          Formulas computed directly from persistent database records with documented denominators
        </p>
      </div>

      {/* Conversion & Compliance Rates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs">
          <span className="text-xs font-semibold text-[#7B706B]">First-Contact Rate</span>
          <div className="text-3xl font-black text-[#302A28] mt-1">{kpis.firstContactRate ?? 0}%</div>
          <p className="text-[10px] text-[#7B706B] mt-1.5 font-mono">
            Attempted 1st calls ÷ Eligible new leads × 100
          </p>
        </div>

        <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs">
          <span className="text-xs font-semibold text-[#7B706B]">Follow-Up Compliance</span>
          <div className="text-3xl font-black text-[#2E8B65] mt-1">{kpis.followUpComplianceRate ?? 100}%</div>
          <p className="text-[10px] text-[#7B706B] mt-1.5 font-mono">
            Tasks completed on time ÷ Follow-ups due × 100
          </p>
        </div>

        <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs">
          <span className="text-xs font-semibold text-[#7B706B]">Lead Conversion Rate</span>
          <div className="text-3xl font-black text-[#2E8B65] mt-1">{kpis.leadConversionRate ?? 0}%</div>
          <p className="text-[10px] text-[#7B706B] mt-1.5 font-mono">
            Converted leads ÷ Unique eligible leads × 100
          </p>
        </div>

        <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs">
          <span className="text-xs font-semibold text-[#7B706B]">Slot Utilization</span>
          <div className="text-3xl font-black text-[#F4B6A0] mt-1">{kpis.slotUtilizationRate ?? 0}%</div>
          <p className="text-[10px] text-[#7B706B] mt-1.5 font-mono">
            Confirmed bookings ÷ Bookable slots × 100
          </p>
        </div>
      </div>

      {/* Sales Pipeline Funnel */}
      <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0E4DF]">
          <div>
            <h3 className="font-extrabold text-[#302A28] text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#F4B6A0]" />
              Full Sales Funnel Progression
            </h3>
            <p className="text-[11px] text-[#7B706B] mt-0.5">
              New → Contacted → Follow-Up → Meeting → Proposal → Negotiation → Converted / Booked
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {pipeline.map((stageItem: any) => {
            const maxVal = Math.max(...pipeline.map((p: any) => p.count), 1);
            const percentage = Math.round((stageItem.count / maxVal) * 100);

            return (
              <div key={stageItem.stage} className="text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#302A28]">{stageItem.stage}</span>
                  <span className="font-black text-[#302A28]">{stageItem.count} leads</span>
                </div>
                <div className="w-full bg-[#FFF9F6] h-3 rounded-full overflow-hidden border border-[#F0E4DF]">
                  <div
                    className="bg-gradient-to-r from-[#FCE4D9] to-[#F4B6A0] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outlet Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0E4DF]">
            <h4 className="font-extrabold text-[#302A28] text-sm">Gurgaon Outlet Metrics</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#5587C7]">GUR</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#7B706B]">Total Leads Managed:</span>
              <span className="font-bold text-[#302A28]">{comp.gurgaon?.totalLeads ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7B706B]">Deals Converted:</span>
              <span className="font-bold text-[#2E8B65]">{comp.gurgaon?.converted ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7B706B]">Conversion Rate:</span>
              <span className="font-black text-[#2E8B65]">{comp.gurgaon?.conversionRate ?? 0}%</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#F0E4DF]">
              <span className="font-bold text-[#302A28]">Realized Sales Revenue:</span>
              <span className="font-black text-[#2E8B65]">₹{(comp.gurgaon?.salesValue ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0E4DF]">
            <h4 className="font-extrabold text-[#302A28] text-sm">Faridabad Outlet Metrics</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FEF6E8] text-[#D97706]">FBD</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#7B706B]">Total Leads Managed:</span>
              <span className="font-bold text-[#302A28]">{comp.faridabad?.totalLeads ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7B706B]">Deals Converted:</span>
              <span className="font-bold text-[#2E8B65]">{comp.faridabad?.converted ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7B706B]">Conversion Rate:</span>
              <span className="font-black text-[#2E8B65]">{comp.faridabad?.conversionRate ?? 0}%</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#F0E4DF]">
              <span className="font-bold text-[#302A28]">Realized Sales Revenue:</span>
              <span className="font-black text-[#2E8B65]">₹{(comp.faridabad?.salesValue ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
