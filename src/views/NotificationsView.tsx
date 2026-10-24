import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import type { NotificationItem } from '../types/index.ts';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await api.resolveNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, resolved: true } : n))
      );
    } catch (err) {
      console.error('Error resolving notif:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-[#302A28]">Notification & Escalation Center</h1>
        <p className="text-xs text-[#7B706B] mt-0.5">
          Real-time alerts for overdue follow-up queues, missing WhatsApp outreach, and booking requests
        </p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7B706B] bg-white rounded-3xl border border-[#F0E4DF]">
            Loading system notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#2E8B65] font-semibold bg-white rounded-3xl border border-[#F0E4DF]">
            No unread notifications!
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 text-xs ${
                n.resolved
                  ? 'bg-white border-[#F0E4DF] opacity-70'
                  : n.severity === 'high' || n.severity === 'critical'
                  ? 'bg-[#FEECEB] border-[#D9534F]/30 shadow-xs'
                  : 'bg-[#FFF9F6] border-[#F0E4DF] shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                {n.severity === 'high' || n.severity === 'critical' ? (
                  <ShieldAlert className="w-5 h-5 text-[#D9534F] shrink-0 mt-0.5" />
                ) : n.type === 'whatsapp_missing' ? (
                  <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                ) : (
                  <Bell className="w-5 h-5 text-[#F4B6A0] shrink-0 mt-0.5" />
                )}

                <div>
                  <h4 className="font-bold text-[#302A28] text-sm">{n.title}</h4>
                  <p className="text-xs text-[#7B706B] mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-[#7B706B]/80 mt-1 block">
                    {new Date(n.createdAt).toLocaleString()} {n.outletId ? `• ${n.outletId.toUpperCase()}` : ''}
                  </span>
                </div>
              </div>

              {!n.resolved && (
                <button
                  onClick={() => handleResolve(n.id)}
                  className="px-3 py-1.5 bg-white border border-[#F0E4DF] hover:bg-[#EBF7F0] text-[#2E8B65] font-bold rounded-xl text-xs transition-colors shrink-0"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
