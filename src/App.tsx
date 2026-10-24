import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, type NavItemKey } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { LoginView } from './views/LoginView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { LeadsView } from './views/LeadsView.tsx';
import { FollowupsView } from './views/FollowupsView.tsx';
import { WhatsAppView } from './views/WhatsAppView.tsx';
import { MeetingsView } from './views/MeetingsView.tsx';
import { SlotsView } from './views/SlotsView.tsx';
import { ProposalsView } from './views/ProposalsView.tsx';
import { SalesView } from './views/SalesView.tsx';
import { PerformanceView } from './views/PerformanceView.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { NotificationsView } from './views/NotificationsView.tsx';
import { SheetsSyncView } from './views/SheetsSyncView.tsx';
import { UsersView } from './views/UsersView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';

// Modals
import { AddLeadModal } from './components/leads/AddLeadModal.tsx';
import { LeadDetailModal } from './components/leads/LeadDetailModal.tsx';
import { WhatsAppModal } from './components/leads/WhatsAppModal.tsx';
import { CompleteFollowupModal } from './components/followups/CompleteFollowupModal.tsx';
import { SlotBookingModal } from './components/slots/SlotBookingModal.tsx';

import { api } from './services/api.ts';
import type { Lead, FollowUpTask, OutletId, SlotDefinition } from './types/index.ts';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Modal states
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [selectedTaskForFollowup, setSelectedTaskForFollowup] = useState<FollowUpTask | null>(null);

  // Slot booking modal
  const [slotBookingState, setSlotBookingState] = useState<{
    isOpen: boolean;
    lead: Lead | null;
    outletId: OutletId;
    date?: string;
    slotId?: string;
  }>({
    isOpen: false,
    lead: null,
    outletId: 'gurgaon',
  });

  const [slotDefs, setSlotDefs] = useState<SlotDefinition[]>([]);

  // Fetch notifications count and slot definitions
  useEffect(() => {
    if (user) {
      api.getNotifications().then((res) => {
        const unread = res.notifications.filter((n) => !n.read && !n.resolved).length;
        setUnreadNotifsCount(unread);
      }).catch(() => {});

      api.getSlotDefinitions().then((res) => {
        setSlotDefs(res.slots);
      }).catch(() => {});
    }
  }, [user, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FCE4D9] border border-[#F4B6A0] animate-spin flex items-center justify-center mb-4">
          <div className="w-4 h-4 rounded-full bg-[#F4B6A0]" />
        </div>
        <h3 className="font-extrabold text-[#302A28] text-base">ZigZagZoh CRM</h3>
        <p className="text-xs text-[#7B706B] mt-1">Starting secure sales session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex bg-[#FFF9F6] text-[#302A28] antialiased">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        unreadNotificationsCount={unreadNotifsCount}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onOpenNewLeadModal={() => setIsAddLeadOpen(true)}
          onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
          onNavigateToTab={setActiveTab}
          unreadCount={unreadNotifsCount}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToTab={setActiveTab}
              onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
              onOpenNewLead={() => setIsAddLeadOpen(true)}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsView
              onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
              onOpenNewLead={() => setIsAddLeadOpen(true)}
              onOpenWhatsApp={(lead) => setSelectedLeadForWhatsApp(lead)}
              onOpenFollowup={async (lead) => {
                const res = await api.getFollowUpQueue({ outletId: lead.outletId });
                const task = res.tasks.find((t) => t.leadId === lead.id && t.status === 'pending');
                if (task) {
                  setSelectedTaskForFollowup(task);
                } else {
                  // Create ad-hoc task
                  setSelectedTaskForFollowup({
                    id: `adhoc-${Date.now()}`,
                    leadId: lead.id,
                    leadName: lead.customerName,
                    leadPhone: lead.mobileNumber,
                    leadStatus: lead.status,
                    outletId: lead.outletId,
                    assignedToId: lead.assignedSalespersonId,
                    assignedToName: lead.assignedSalespersonName,
                    dueDate: new Date().toISOString().split('T')[0],
                    session: 'afternoon',
                    sequenceNumber: lead.followUpSequenceCount + 1,
                    status: 'pending',
                    whatsAppStatus: 'Not Started',
                  });
                }
              }}
            />
          )}

          {activeTab === 'followups' && (
            <FollowupsView
              onOpenFollowupModal={(task) => setSelectedTaskForFollowup(task)}
              onOpenWhatsApp={(lead) => setSelectedLeadForWhatsApp(lead)}
              onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
            />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppView
              onOpenWhatsAppModal={(lead) => setSelectedLeadForWhatsApp(lead)}
              onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
            />
          )}

          {activeTab === 'meetings' && (
            <MeetingsView onSelectLead={(lead) => setSelectedLeadForDetail(lead)} />
          )}

          {activeTab === 'slots' && (
            <SlotsView
              onOpenBookingModal={(lead, outletId, date, slotId) =>
                setSlotBookingState({ isOpen: true, lead, outletId, date, slotId })
              }
              onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
            />
          )}

          {activeTab === 'proposals' && (
            <ProposalsView onSelectLead={(lead) => setSelectedLeadForDetail(lead)} />
          )}

          {activeTab === 'sales' && (
            <SalesView onSelectLead={(lead) => setSelectedLeadForDetail(lead)} />
          )}

          {activeTab === 'performance' && <PerformanceView />}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'notifications' && <NotificationsView />}

          {activeTab === 'sheets' && <SheetsSyncView />}

          {activeTab === 'users' && <UsersView />}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'audit' && <AuditLogsView />}
        </main>

        <Footer />
      </div>

      {/* Global Modals */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onLeadCreated={(newLead) => setSelectedLeadForDetail(newLead)}
        onOpenWhatsApp={(lead) => setSelectedLeadForWhatsApp(lead)}
      />

      <LeadDetailModal
        isOpen={!!selectedLeadForDetail}
        onClose={() => setSelectedLeadForDetail(null)}
        leadId={selectedLeadForDetail?.id || null}
        onOpenWhatsApp={(lead) => setSelectedLeadForWhatsApp(lead)}
        onOpenFollowup={(lead) => {
          setSelectedTaskForFollowup({
            id: `adhoc-${Date.now()}`,
            leadId: lead.id,
            leadName: lead.customerName,
            leadPhone: lead.mobileNumber,
            leadStatus: lead.status,
            outletId: lead.outletId,
            assignedToId: lead.assignedSalespersonId,
            assignedToName: lead.assignedSalespersonName,
            dueDate: new Date().toISOString().split('T')[0],
            session: 'afternoon',
            sequenceNumber: (lead.followUpSequenceCount || 0) + 1,
            status: 'pending',
            whatsAppStatus: 'Not Started',
          });
        }}
        onOpenBooking={(lead) =>
          setSlotBookingState({ isOpen: true, lead, outletId: lead.outletId })
        }
        onLeadUpdated={(lead) => setSelectedLeadForDetail(lead)}
      />

      <WhatsAppModal
        isOpen={!!selectedLeadForWhatsApp}
        onClose={() => setSelectedLeadForWhatsApp(null)}
        lead={selectedLeadForWhatsApp}
      />

      <CompleteFollowupModal
        isOpen={!!selectedTaskForFollowup}
        onClose={() => setSelectedTaskForFollowup(null)}
        task={selectedTaskForFollowup}
        onCompleted={(_completedTask) => {
          // refreshes views automatically
        }}
      />

      <SlotBookingModal
        isOpen={slotBookingState.isOpen}
        onClose={() => setSlotBookingState((prev) => ({ ...prev, isOpen: false }))}
        lead={slotBookingState.lead}
        outletId={slotBookingState.outletId}
        defaultDate={slotBookingState.date}
        defaultSlotId={slotBookingState.slotId}
        slotDefinitions={slotDefs}
        onBookingConfirmed={(_booking) => {
          // updated automatically
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
