import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Settings, Shield, MessageSquare, Clock, Save, UserPlus, KeyRound, ChevronRight } from 'lucide-react';

interface SettingsViewProps {
  onNavigateToTab?: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateToTab }) => {
  const [settings, setSettings] = useState<any>({
    agencyName: 'Supreme Ads',
    brandName: 'ZigZagZoh',
    whatsappApiToken: '',
    whatsappPhoneNumberId: '',
    afternoonSessionHour: 13,
    eveningSessionHour: 19,
    escalationGraceMinutes: 60,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await api.getSettings();
        setSettings(res.settings);
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      alert('System settings updated successfully!');
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">System & Agency Settings</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Admin Console • Operational schedules, agency parameters, and user credentials
          </p>
        </div>

        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('users')}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#FCE4D9] hover:bg-[#F4B6A0] text-[#302A28] text-xs font-bold rounded-xl transition-all border border-[#F4B6A0]/40 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Manage Users & Passwords</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* User Management Quick Banner */}
      {onNavigateToTab && (
        <div
          onClick={() => onNavigateToTab('users')}
          className="p-4 bg-gradient-to-r from-white to-[#FFF9F6] border border-[#F0E4DF] hover:border-[#F4B6A0] rounded-2xl shadow-xs flex items-center justify-between cursor-pointer transition-all hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE4D9] flex items-center justify-center text-[#302A28]">
              <KeyRound className="w-5 h-5 text-[#302A28]" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-[#302A28]">Team Accounts & Passwords</h3>
              <p className="text-[11px] text-[#7B706B]">
                Create team members with unique usernames, assign custom passwords, or copy credentials.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#302A28] flex items-center gap-1">
            Open Users <ChevronRight className="w-4 h-4 text-[#F4B6A0]" />
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* WhatsApp Cloud API Credentials */}
        <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F0E4DF]">
            <MessageSquare className="w-4 h-4 text-[#2E8B65]" />
            <h3 className="font-bold text-[#302A28] text-sm">Official WhatsApp Business Cloud API</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                WhatsApp Permanent System User Access Token
              </label>
              <input
                type="password"
                placeholder="EAAG... (Stored securely server-side)"
                value={settings.whatsappApiToken || ''}
                onChange={(e) => setSettings({ ...settings, whatsappApiToken: e.target.value })}
                className="w-full p-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl font-mono text-[11px] focus:outline-hidden"
              />
              <p className="text-[10px] text-[#7B706B] mt-1">
                Used to verify delivery and read receipts with the official Meta Graph API.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                placeholder="104928172948192"
                value={settings.whatsappPhoneNumberId || ''}
                onChange={(e) => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                className="w-full p-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl font-mono text-[11px] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Twice Daily Session Timers */}
        <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F0E4DF]">
            <Clock className="w-4 h-4 text-[#F4B6A0]" />
            <h3 className="font-bold text-[#302A28] text-sm">Twice-Daily Follow-Up Session Configuration (IST)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                Session 1: Afternoon Queue Start Hour (IST)
              </label>
              <input
                type="number"
                min={12}
                max={16}
                value={settings.afternoonSessionHour ?? 13}
                onChange={(e) => setSettings({ ...settings, afternoonSessionHour: Number(e.target.value) })}
                className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl"
              />
              <span className="text-[10px] text-[#7B706B] mt-0.5 block">Default 13 (1:00 PM IST)</span>
            </div>

            <div>
              <label className="block font-semibold text-[#302A28] mb-1">
                Session 2: Evening Queue Start Hour (IST)
              </label>
              <input
                type="number"
                min={17}
                max={22}
                value={settings.eveningSessionHour ?? 19}
                onChange={(e) => setSettings({ ...settings, eveningSessionHour: Number(e.target.value) })}
                className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl"
              />
              <span className="text-[10px] text-[#7B706B] mt-0.5 block">Default 19 (7:00 PM IST)</span>
            </div>
          </div>
        </div>

        {/* Agency Attribution */}
        <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-3">
          <h3 className="font-bold text-[#302A28] text-sm">Agency Brand & Attribution</h3>
          <p className="text-[#7B706B] text-xs">
            Agency developing and managing this CRM: <strong className="text-[#302A28]">Supreme Ads</strong>.
          </p>
          <div className="p-3 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl text-xs text-[#7B706B]">
            "Powered by Supreme Ads" appears on the login screen and application footer as specified in the master development requirements.
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
