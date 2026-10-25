import React from 'react';
import {
  LayoutDashboard,
  Users2,
  PhoneCall,
  MessageSquare,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  Award,
  BarChart3,
  Bell,
  Sheet,
  ShieldCheck,
  Settings,
  History,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import type { UserRole } from '../../types/index.ts';

export type NavItemKey =
  | 'dashboard'
  | 'leads'
  | 'followups'
  | 'whatsapp'
  | 'meetings'
  | 'slots'
  | 'proposals'
  | 'sales'
  | 'performance'
  | 'analytics'
  | 'notifications'
  | 'sheets'
  | 'users'
  | 'settings'
  | 'audit';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadNotificationsCount?: number;
}

interface NavItemConfig {
  key: NavItemKey;
  label: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  section: 'Operations' | 'Administration';
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  unreadNotificationsCount = 0,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'gurgaon_team';

  const allRoles: UserRole[] = ['supreme_ads_owner', 'client_admin', 'manager', 'gurgaon_team', 'faridabad_team'];
  const adminAndOwner: UserRole[] = ['supreme_ads_owner', 'client_admin'];
  const managersAndAbove: UserRole[] = ['supreme_ads_owner', 'client_admin', 'manager'];

  const navItems: NavItemConfig[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: allRoles, section: 'Operations' },
    { key: 'leads', label: 'Leads', icon: Users2, allowedRoles: allRoles, section: 'Operations' },
    { key: 'followups', label: 'Follow-ups', icon: PhoneCall, allowedRoles: allRoles, section: 'Operations' },
    { key: 'whatsapp', label: 'WhatsApp Outreach', icon: MessageSquare, allowedRoles: allRoles, section: 'Operations' },
    { key: 'meetings', label: 'Meetings & Visits', icon: CalendarCheck, allowedRoles: allRoles, section: 'Operations' },
    { key: 'slots', label: 'Slot Calendar', icon: CalendarDays, allowedRoles: allRoles, section: 'Operations' },
    { key: 'proposals', label: 'Proposals', icon: FileSpreadsheet, allowedRoles: allRoles, section: 'Operations' },
    { key: 'sales', label: 'Sales & Conversions', icon: TrendingUp, allowedRoles: allRoles, section: 'Operations' },
    { key: 'performance', label: 'Team Performance', icon: Award, allowedRoles: managersAndAbove, section: 'Administration' },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, allowedRoles: managersAndAbove, section: 'Administration' },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      allowedRoles: allRoles,
      section: 'Administration',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { key: 'sheets', label: 'Google Sheets Sync', icon: Sheet, allowedRoles: adminAndOwner, section: 'Administration' },
    { key: 'users', label: 'Users & Permissions', icon: ShieldCheck, allowedRoles: adminAndOwner, section: 'Administration' },
    { key: 'settings', label: 'Settings', icon: Settings, allowedRoles: adminAndOwner, section: 'Administration' },
    { key: 'audit', label: 'Activity & Audit Log', icon: History, allowedRoles: adminAndOwner, section: 'Administration' },
  ];

  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(role));

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-[#F0E4DF] transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-18 px-4 flex items-center justify-between border-b border-[#F0E4DF] bg-[#FFF9F6]">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F4B6A0] to-[#FCE4D9] flex items-center justify-center shadow-xs border border-[#F4B6A0]/40">
              <span className="font-black text-sm text-[#302A28]">ZZ</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#302A28]">ZigZagZoh</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#FCE4D9] text-[#302A28]">CRM</span>
              </div>
              <p className="text-[11px] text-[#7B706B] font-medium flex items-center gap-1">
                <Store className="w-3 h-3 text-[#F4B6A0]" />
                Gurgaon & Faridabad
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F4B6A0] to-[#FCE4D9] flex items-center justify-center border border-[#F4B6A0]/40">
              <span className="font-black text-sm text-[#302A28]">ZZ</span>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-[#7B706B] hover:text-[#302A28] hover:bg-[#FCE4D9]/50 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          const prevItem = visibleItems[idx - 1];
          const isNewSection = !isCollapsed && (!prevItem || prevItem.section !== item.section);

          return (
            <React.Fragment key={item.key}>
              {isNewSection && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-[#7B706B]/70">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => onSelectTab(item.key)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#FCE4D9] text-[#302A28] shadow-xs font-bold border border-[#F4B6A0]/40'
                    : 'text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6]'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-[#302A28] scale-110' : 'text-[#7B706B]'
                  }`}
                />

                {!isCollapsed && <span className="truncate">{item.label}</span>}

                {!isCollapsed && item.badge !== undefined && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9534F] text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer Attribution - Powered by Supreme Ads */}
      <div className="p-3 border-t border-[#F0E4DF] bg-[#FFF9F6]">
        {!isCollapsed ? (
          <div className="flex flex-col items-center justify-center text-center py-1">
            <span className="text-[10px] font-semibold tracking-wider text-[#7B706B] uppercase">
              Powered by Supreme Ads
            </span>
            <span className="text-[9px] text-[#7B706B]/80 mt-0.5">Enterprise Sales Suite v2.4</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Powered by Supreme Ads">
            <span className="text-[10px] font-black text-[#F4B6A0]">SA</span>
          </div>
        )}
      </div>
    </aside>
  );
};
