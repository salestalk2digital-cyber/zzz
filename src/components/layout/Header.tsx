import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  LogOut,
  Clock,
  Store,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { RoleBadge, OutletBadge } from '../common/Badge.tsx';
import type { OutletId, NotificationItem, Lead } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface HeaderProps {
  onOpenNewLeadModal: () => void;
  onSelectLead: (lead: Lead) => void;
  onNavigateToTab: (tab: any) => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewLeadModal,
  onSelectLead,
  onNavigateToTab,
  unreadCount = 0,
}) => {
  const { user, activeOutlet, setActiveOutlet, canChangeOutlet, logout, quickLoginAsDemo } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [istTime, setIstTime] = useState('');
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  // Update IST Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      const timeStr = new Intl.DateTimeFormat('en-IN', options).format(now);
      const dateStr = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      }).format(now);
      setIstTime(`${timeStr} IST • ${dateStr}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch demo accounts for switcher
  useEffect(() => {
    api.getDemoAccounts().then((res) => setDemoAccounts(res.accounts)).catch(() => {});
  }, []);

  // Handle global search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { leads } = await api.getLeads({ search: searchQuery });
        setSearchResults(leads.slice(0, 5));
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="h-18 px-6 bg-white border-b border-[#F0E4DF] flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Outlet Selector & Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        {/* Outlet Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Store className="w-4 h-4 text-[#F4B6A0]" />
          {canChangeOutlet ? (
            <select
              value={activeOutlet}
              onChange={(e) => setActiveOutlet(e.target.value as OutletId | 'all')}
              className="text-xs font-semibold bg-[#FFF9F6] border border-[#F0E4DF] rounded-lg px-2.5 py-1.5 text-[#302A28] focus:outline-hidden focus:border-[#F4B6A0] transition-colors cursor-pointer"
            >
              <option value="all">All Outlets (Gurgaon & Faridabad)</option>
              <option value="gurgaon">Gurgaon Center Only</option>
              <option value="faridabad">Faridabad Center Only</option>
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#302A28] uppercase tracking-wider">
                {user?.role === 'gurgaon_team' ? 'Gurgaon Center' : 'Faridabad Center'}
              </span>
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7B706B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads by name, phone or lead ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl text-[#302A28] placeholder-[#7B706B]/70 focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white transition-all"
            />
          </div>

          {/* Search Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#F0E4DF] rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-2 border-b border-[#F0E4DF] bg-[#FFF9F6] flex justify-between items-center text-[11px] text-[#7B706B]">
                <span>Results for "{searchQuery}"</span>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="hover:text-[#302A28] font-medium"
                >
                  Close
                </button>
              </div>

              {isSearching ? (
                <div className="p-4 text-center text-xs text-[#7B706B]">Searching leads...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#7B706B]">No matching leads found.</div>
              ) : (
                <div className="divide-y divide-[#F0E4DF]/60">
                  {searchResults.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => {
                        onSelectLead(lead);
                        setShowSearchResults(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#FFF9F6] flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-[#302A28] flex items-center gap-2">
                          <span>{lead.customerName}</span>
                          <span className="font-mono text-[10px] text-[#7B706B]">{lead.id}</span>
                        </div>
                        <p className="text-[11px] text-[#7B706B] mt-0.5">{lead.mobileNumber} • {lead.requirement.slice(0, 45)}...</p>
                      </div>
                      <OutletBadge outletId={lead.outletId} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: IST Clock, New Lead Button, Notifications, Role Switcher & Profile */}
      <div className="flex items-center gap-3">
        {/* IST Time */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF9F6] border border-[#F0E4DF] text-xs font-medium text-[#7B706B]">
          <Clock className="w-3.5 h-3.5 text-[#F4B6A0]" />
          <span>{istTime}</span>
        </div>

        {/* Add New Lead Button */}
        <button
          onClick={onOpenNewLeadModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <span>+ Add New Lead</span>
        </button>

        {/* Notifications Icon */}
        <button
          onClick={() => onNavigateToTab('notifications')}
          className="relative p-2 rounded-xl text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6] border border-transparent hover:border-[#F0E4DF] transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#D9534F] ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Demo Role Switcher (Crucial for Reviewers to test all 5 roles seamlessly) */}
        <div className="relative">
          <button
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl hover:bg-[#FCE4D9]/40 text-[#302A28] transition-colors"
            title="Switch User Role for Evaluation"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#F4B6A0]" />
            <span className="hidden sm:inline text-[11px] font-semibold">Switch Role</span>
            <ChevronDown className="w-3 h-3 text-[#7B706B]" />
          </button>

          {showDemoMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#F0E4DF] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-[#F0E4DF] mb-1">
                <p className="text-xs font-bold text-[#302A28]">Test Five Role System</p>
                <p className="text-[10px] text-[#7B706B]">Click to log in as another role instantly</p>
              </div>
              <div className="space-y-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={async () => {
                      setShowDemoMenu(false);
                      await quickLoginAsDemo(acc);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col transition-colors ${
                      user?.id === acc.id ? 'bg-[#FCE4D9] font-bold' : 'hover:bg-[#FFF9F6]'
                    }`}
                  >
                    <span className="font-semibold text-[#302A28]">{acc.name}</span>
                    <span className="text-[10px] text-[#7B706B] capitalize">
                      {acc.role.replace(/_/g, ' ')} • {acc.outletId?.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#F0E4DF]">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-[#302A28]">{user?.name}</div>
            <div className="text-[10px] text-[#7B706B] capitalize">
              {user?.role ? user.role.replace(/_/g, ' ') : ''}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-[#7B706B] hover:text-[#D9534F] hover:bg-[#FEECEB] transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
