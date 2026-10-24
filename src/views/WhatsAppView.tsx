import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { OutletBadge } from '../components/common/Badge.tsx';
import type { WhatsAppActivity, Lead } from '../types/index.ts';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ShieldCheck,
  FileText,
  User,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppViewProps {
  onOpenWhatsAppModal: (lead: Lead) => void;
  onSelectLead: (lead: Lead) => void;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  onOpenWhatsAppModal,
  onSelectLead,
}) => {
  const { activeOutlet } = useAuth();
  const [compliance, setCompliance] = useState<any>(null);
  const [missingLeads, setMissingLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<WhatsAppActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'compliance' | 'missing' | 'activities' | 'templates'>('compliance');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, leadsRes] = await Promise.all([
        api.getWhatsAppCompliance(activeOutlet !== 'all' ? activeOutlet : undefined),
        api.getLeads({ outletId: activeOutlet !== 'all' ? activeOutlet : undefined }),
      ]);
      setCompliance(compRes);
      setActivities(compRes.recentActivities || []);
      setMissingLeads(leadsRes.leads.filter((l) => l.whatsAppActionMissing && l.status !== 'Converted / Booked' && l.status !== 'Lost / Closed'));
    } catch (err) {
      console.error('Error fetching WhatsApp compliance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOutlet]);

  const templatesList = [
    {
      title: 'New Lead Message',
      content: 'Hi {customer_name}, thank you for connecting with ZigZagZoh! We would love to help you with your requirement. Please share a convenient time for us to connect and assist you further. — {salesperson_name}, ZigZagZoh {outlet_name}',
    },
    {
      title: 'Follow-Up Message (General)',
      content: 'Hi {customer_name}, this is {salesperson_name} from ZigZagZoh {outlet_name}. I am following up on your recent enquiry. Please let me know if you need any further details or assistance.',
    },
    {
      title: 'Follow-Up 1',
      content: 'Hi {customer_name}, this is {salesperson_name} from ZigZagZoh {outlet_name}. I am following up on your recent enquiry. Please let me know if you need any further details or assistance.',
    },
    {
      title: 'Follow-Up 2',
      content: 'Hi {customer_name}, just checking in regarding your enquiry with ZigZagZoh. We would be happy to help you explore the available options. Let me know a convenient time to connect.',
    },
    {
      title: 'Follow-Up 3',
      content: 'Hi {customer_name}, I wanted to check whether you are still considering your enquiry with ZigZagZoh. If you need any information or would like to discuss your requirements, I am happy to assist.',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">WhatsApp Activity & Compliance</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Strict Click vs Verified Send segregation • Real-time missing action monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#2E8B65] bg-[#EBF7F0] px-3 py-1.5 rounded-full border border-[#2E8B65]/30">
            WhatsApp Business API Ready
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#F0E4DF] pb-2">
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'bg-[#F4B6A0] text-[#302A28] shadow-xs'
              : 'text-[#7B706B] hover:text-[#302A28]'
          }`}
        >
          Compliance Metrics
        </button>
        <button
          onClick={() => setActiveTab('missing')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'missing'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-[#7B706B] hover:text-[#302A28]'
          }`}
        >
          Missing Actions ({missingLeads.length})
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'activities'
              ? 'bg-[#302A28] text-white shadow-xs'
              : 'text-[#7B706B] hover:text-[#302A28]'
          }`}
        >
          Activity Stream
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-[#FCE4D9] text-[#302A28] shadow-xs'
              : 'text-[#7B706B] hover:text-[#302A28]'
          }`}
        >
          Brand Message Templates
        </button>
      </div>

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Key Compliance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Missing Actions */}
            <div className="p-5 bg-white border border-[#D97706]/40 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center text-xs font-semibold text-[#D97706]">
                <span>Missing WhatsApp Actions</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-[#D97706] mt-2">{compliance?.missingActions ?? 0}</div>
              <p className="text-[10px] text-[#7B706B] mt-1">Leads lacking required WhatsApp outreach</p>
            </div>

            {/* Clicks */}
            <div className="p-5 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs">
              <div className="flex justify-between items-center text-xs font-semibold text-[#7B706B]">
                <span>CRM Button Clicks</span>
                <ExternalLink className="w-4 h-4 text-[#5587C7]" />
              </div>
              <div className="text-2xl font-black text-[#302A28] mt-2">{compliance?.clicks ?? 0}</div>
              <p className="text-[10px] text-[#7B706B] mt-1">Initiated in CRM (not verified sends)</p>
            </div>

            {/* Employee Confirmed */}
            <div className="p-5 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs">
              <div className="flex justify-between items-center text-xs font-semibold text-[#7B706B]">
                <span>Employee-Confirmed Sends</span>
                <Clock className="w-4 h-4 text-[#E4A23B]" />
              </div>
              <div className="text-2xl font-black text-[#302A28] mt-2">{compliance?.employeeConfirmed ?? 0}</div>
              <p className="text-[10px] text-[#7B706B] mt-1">Logged manually by sales reps</p>
            </div>

            {/* API Verified */}
            <div className="p-5 bg-[#EBF7F0] border border-[#2E8B65]/30 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center text-xs font-bold text-[#2E8B65]">
                <span>API Verified Sends / Delivered</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-[#2E8B65] mt-2">{compliance?.apiVerified ?? 0}</div>
              <p className="text-[10px] text-[#2E8B65]/80 mt-1">Confirmed via WhatsApp Business Webhook</p>
            </div>
          </div>

          {/* Technical Note Callout Box */}
          <div className="p-5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-3xl space-y-2 text-xs">
            <h4 className="font-bold text-[#302A28] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#F4B6A0]" />
              Technical Constraint & Anti-Inflation Guarantee
            </h4>
            <p className="text-[#7B706B] leading-relaxed text-[11px]">
              A standard <code className="bg-white px-1.5 py-0.5 rounded-sm border border-[#F0E4DF] font-mono text-[#302A28]">wa.me</code> click-to-chat link only opens WhatsApp with prefilled text. In this system, <strong>a button click is NEVER recorded as a verified sent message</strong>. Manual employee confirmations are separated from official API Webhook delivery confirmations, ensuring 100% audit accuracy for management.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Missing Actions */}
      {activeTab === 'missing' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#FEF6E8] border border-[#D97706]/40 rounded-2xl text-xs text-[#302A28]">
            <strong className="text-[#D97706]">Compliance Alert:</strong> These active leads require immediate WhatsApp contact. Sales reps must launch WhatsApp and record confirmation.
          </div>

          <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-4 py-3">Center</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Requirement</th>
                  <th className="px-4 py-3">Assigned Rep</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E4DF]/60">
                {missingLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#2E8B65] font-semibold">
                      All active leads have completed WhatsApp outreach!
                    </td>
                  </tr>
                ) : (
                  missingLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#FFF9F6] transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[#302A28]">{lead.customerName}</td>
                      <td className="px-4 py-3.5"><OutletBadge outletId={lead.outletId} /></td>
                      <td className="px-4 py-3.5 font-mono text-[#7B706B]">{lead.mobileNumber}</td>
                      <td className="px-4 py-3.5 max-w-xs truncate text-[#7B706B]">{lead.requirement}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#302A28]">{lead.assignedSalespersonName}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onOpenWhatsAppModal(lead)}
                          className="px-3 py-1.5 bg-[#2E8B65] text-white font-bold rounded-xl hover:bg-[#2E8B65]/90 transition-all text-xs"
                        >
                          Send WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Activity Stream */}
      {activeTab === 'activities' && (
        <div className="bg-white border border-[#F0E4DF] rounded-3xl p-5 shadow-xs space-y-3">
          <h4 className="font-bold text-[#302A28] text-xs uppercase tracking-wider">
            Chronological WhatsApp Outbound & Inbound Stream
          </h4>

          {activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7B706B]">No recent WhatsApp activities.</div>
          ) : (
            <div className="divide-y divide-[#F0E4DF]/60">
              {activities.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#302A28] flex items-center gap-2">
                      <span>{act.customerName}</span>
                      <span className="font-mono text-[10px] text-[#7B706B]">{act.customerPhone}</span>
                    </div>
                    <p className="text-[11px] text-[#7B706B] mt-0.5">
                      Template: <strong>{act.messageTemplate}</strong> • Rep: {act.employeeName}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      act.actionStatus.includes('Verified')
                        ? 'bg-[#EBF7F0] text-[#2E8B65]'
                        : act.actionStatus === 'Employee Confirmed Sent'
                        ? 'bg-[#FEF6E8] text-[#D97706]'
                        : 'bg-[#EFF6FF] text-[#5587C7]'
                    }`}>
                      {act.actionStatus}
                    </span>
                    <div className="text-[10px] text-[#7B706B] mt-1">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Brand Message Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templatesList.map((tpl, i) => (
            <div key={i} className="p-5 bg-white border border-[#F0E4DF] rounded-2xl shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-[#302A28]">{tpl.title}</h5>
                <span className="text-[10px] font-semibold text-[#7B706B] bg-[#FFF9F6] px-2 py-0.5 rounded-md">
                  Active Brand Template
                </span>
              </div>
              <p className="p-3 bg-[#FFF9F6] rounded-xl border border-[#F0E4DF] text-[#302A28] leading-relaxed text-[11px] font-mono">
                {tpl.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
