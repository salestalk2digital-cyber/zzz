import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { Lead, WhatsAppActivity } from '../../types/index.ts';
import { MessageSquare, ExternalLink, CheckCheck, Clock, AlertTriangle } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onActivityRecorded?: (activity: WhatsAppActivity) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  lead,
  onActivityRecorded,
}) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('New Lead Message');
  const [messageText, setMessageText] = useState<string>('');
  const [isLogged, setIsLogged] = useState(false);
  const [lastActivity, setLastActivity] = useState<WhatsAppActivity | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState('');
  const [confirmedSent, setConfirmedSent] = useState(false);

  const customerName = lead?.customerName || 'Valued Customer';
  const salespersonName = user?.name || lead?.assignedSalespersonName || 'Our Team';
  const outletName = lead?.outletId === 'gurgaon' ? 'Gurgaon' : 'Faridabad';

  const templates: Record<string, string> = {
    'New Lead Message': `Hi ${customerName}, thank you for connecting with ZigZagZoh! We would love to help you with your requirement. Please share a convenient time for us to connect and assist you further. — ${salespersonName}, ZigZagZoh ${outletName}`,
    'Follow-Up Message': `Hi ${customerName}, this is ${salespersonName} from ZigZagZoh ${outletName}. I am following up on your recent enquiry. Please let me know if you need any further details or assistance.`,
    'Follow-Up 1': `Hi ${customerName}, this is ${salespersonName} from ZigZagZoh ${outletName}. I am following up on your recent enquiry. Please let me know if you need any further details or assistance.`,
    'Follow-Up 2': `Hi ${customerName}, just checking in regarding your enquiry with ZigZagZoh. We would be happy to help you explore the available options. Let me know a convenient time to connect.`,
    'Follow-Up 3': `Hi ${customerName}, I wanted to check whether you are still considering your enquiry with ZigZagZoh. If you need any information or would like to discuss your requirements, I am happy to assist.`,
    'Custom Message': `Hi ${customerName}, greetings from ZigZagZoh ${outletName}! `,
  };

  const handleTemplateChange = (tplName: string) => {
    setSelectedTemplate(tplName);
    setMessageText(templates[tplName] || '');
  };

  // Initialize text on first open - called unconditionally to obey Rules of Hooks
  React.useEffect(() => {
    if (lead) {
      setMessageText(templates['New Lead Message']);
      setSelectedTemplate('New Lead Message');
      setIsLogged(false);
      setConfirmedSent(false);
    }
  }, [lead?.id]);

  if (!isOpen || !lead) return null;

  // Clean phone number for WhatsApp international format
  const rawPhone = lead.whatsAppNumber || lead.mobileNumber || '';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const internationalPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  const handleOpenWhatsApp = async () => {
    try {
      // 1. Immediately log CRM Button Click (NEVER counted as verified send!)
      const res = await api.logWhatsAppClick({
        leadId: lead.id,
        templateName: selectedTemplate,
        customText: messageText,
        session: 'afternoon',
      });
      setLastActivity(res.activity);
      setIsLogged(true);
      if (onActivityRecorded) onActivityRecorded(res.activity);

      // 2. Open WhatsApp Web or Mobile App via Click-to-Chat URL
      const encodedMsg = encodeURIComponent(messageText);
      const waUrl = `https://wa.me/${internationalPhone}?text=${encodedMsg}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Error logging WhatsApp click:', err);
    }
  };

  const handleConfirmSent = async () => {
    if (!lastActivity) return;
    try {
      const res = await api.confirmWhatsAppSent({
        leadId: lead.id,
        activityId: lastActivity.id,
        notes: employeeNotes,
      });
      setConfirmedSent(true);
      if (onActivityRecorded) onActivityRecorded(res.activity);
    } catch (err: any) {
      console.error('Error confirming send:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Customer Outreach"
      subtitle={`Customer: ${lead.customerName} (${lead.mobileNumber}) • Center: ${outletName}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Template Selector */}
        <div>
          <label className="block font-bold text-[#302A28] mb-1.5">Select Message Template</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.keys(templates).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleTemplateChange(name)}
                className={`px-3 py-2 rounded-xl text-left font-medium border transition-all ${
                  selectedTemplate === name
                    ? 'bg-[#FCE4D9] text-[#302A28] border-[#F4B6A0] font-bold shadow-xs'
                    : 'bg-white text-[#7B706B] border-[#F0E4DF] hover:bg-[#FFF9F6]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="block font-bold text-[#302A28] mb-1">
            Message Preview (Editable)
          </label>
          <textarea
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3 border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden bg-[#FFF9F6] text-[#302A28] leading-relaxed"
          />
          <p className="text-[11px] text-[#7B706B] mt-1">
            Tags automatically populated for <strong className="text-[#302A28]">{lead.customerName}</strong> from{' '}
            <strong className="text-[#302A28]">{outletName}</strong> center.
          </p>
        </div>

        {/* Action Button: Open WhatsApp */}
        <div className="p-4 rounded-xl bg-[#FFF9F6] border border-[#F0E4DF] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#7B706B]">
            <Clock className="w-4 h-4 text-[#F4B6A0]" />
            <span>Sends via WhatsApp Web or mobile app to <strong>+{internationalPhone}</strong></span>
          </div>

          <button
            onClick={handleOpenWhatsApp}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E8B65] hover:bg-[#2E8B65]/90 text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open & Send in WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Post-Click Step: Employee Confirmation (Honoring Technical Constraint: Clicks != Sent) */}
        {isLogged && (
          <div className="p-4 rounded-xl bg-[#FEF6E8] border border-[#D97706]/30 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#302A28]">Activity Status: WhatsApp Button Clicked</p>
                <p className="text-[11px] text-[#7B706B]">
                  Opening WhatsApp does not confirm delivery. Once you press send in WhatsApp, please click below to confirm.
                </p>
              </div>
            </div>

            {!confirmedSent ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Optional notes (e.g., customer was online, awaiting response)"
                  value={employeeNotes}
                  onChange={(e) => setEmployeeNotes(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[#F0E4DF] rounded-lg bg-white focus:outline-hidden"
                />
                <button
                  onClick={handleConfirmSent}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#302A28] text-white font-bold hover:bg-[#302A28]/90 transition-all shrink-0 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-[#2E8B65]" />
                  <span>Confirm Sent</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-[#2E8B65]">
                <CheckCheck className="w-4 h-4" />
                <span>Recorded: Employee Confirmed Sent. Compliance meter updated!</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#F0E4DF] font-semibold text-[#7B706B] hover:text-[#302A28] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
