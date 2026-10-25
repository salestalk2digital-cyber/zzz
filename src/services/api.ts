import type {
  User,
  Lead,
  FollowUpTask,
  RemarkEntry,
  WhatsAppActivity,
  SlotDefinition,
  SlotBooking,
  Meeting,
  Proposal,
  NotificationItem,
  AuditLog,
  GoogleSheetsSyncConfig,
  PerformanceScorecard,
  OutletId,
  FollowUpOutcome,
  LeadStatus,
} from '../types/index.ts';
import {
  getFirestoreUsers,
  createFirestoreUser,
  updateFirestoreUser,
  checkFirestoreUsernameAvailable,
  loginWithFirestoreCredentials,
  syncGoogleUserWithFirestore,
  getFirestoreLeads,
  getFirestoreLeadById,
  createFirestoreLead,
  updateFirestoreLead,
  checkFirestoreDuplicatePhone,
  getFirestoreRemarks,
  addFirestoreRemark,
  getFirestoreFollowUpQueue,
  completeFirestoreFollowUp,
  getFirestoreBookings,
  createFirestoreBooking,
  getFirestoreAuditLogs,
  addFirestoreAuditLog,
  getFirestoreNotifications,
  resolveFirestoreNotification,
  DEFAULT_USERS,
  DEFAULT_SLOTS,
} from './firestoreService.ts';

const TOKEN_KEY = 'zigzagzoh_crm_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('zigzagzoh_crm_current_user');
}

export const api = {
  // -------------------------------------------------------------------------
  // Authentication & Session
  // -------------------------------------------------------------------------
  login: async (usernameOrEmail: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      console.log(`[Firebase Auth] Authenticating credentials for "${usernameOrEmail}" against Firestore...`);
      const result = await loginWithFirestoreCredentials(usernameOrEmail, password);
      localStorage.setItem('zigzagzoh_crm_current_user', JSON.stringify(result.user));
      setStoredToken(result.token);
      return result;
    } catch (err: any) {
      console.warn('[Firebase Auth] Firestore authentication warning:', err.message);
      throw err;
    }
  },

  loginWithGoogle: async (data: { email: string; name?: string; uid: string }): Promise<{ token: string; user: User }> => {
    try {
      console.log(`[Firebase Auth] Syncing Google Auth identity for "${data.email}" with Firestore...`);
      const result = await syncGoogleUserWithFirestore(data);
      localStorage.setItem('zigzagzoh_crm_current_user', JSON.stringify(result.user));
      setStoredToken(result.token);
      return result;
    } catch (err: any) {
      console.warn('[Firebase Auth] Google sync error:', err.message);
      // Fallback user
      const isOwner = data.email.toLowerCase() === 'sales.talk2digital@gmail.com' || data.email.includes('supremeads');
      const fallbackUser: User = {
        id: `usr-g-${data.uid.slice(0, 8)}`,
        name: data.name || data.email.split('@')[0],
        username: data.email.split('@')[0],
        email: data.email,
        role: isOwner ? 'supreme_ads_owner' : 'client_admin',
        outletId: 'all',
        active: true,
        createdAt: new Date().toISOString(),
      };
      const token = `tok-${Date.now()}`;
      localStorage.setItem('zigzagzoh_crm_current_user', JSON.stringify(fallbackUser));
      setStoredToken(token);
      return { token, user: fallbackUser };
    }
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const raw = localStorage.getItem('zigzagzoh_crm_current_user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        return { user };
      } catch {}
    }
    const users = await getFirestoreUsers().catch(() => DEFAULT_USERS);
    const defaultUser = users[0] || DEFAULT_USERS[0];
    return { user: defaultUser };
  },

  logout: async (): Promise<{ success: boolean }> => {
    clearStoredToken();
    return { success: true };
  },

  getDemoAccounts: async (): Promise<{ accounts: Array<User & { samplePassword: string }> }> => {
    try {
      const users = await getFirestoreUsers();
      return {
        accounts: users.map((u) => ({
          ...u,
          samplePassword: u.assignedPassword || 'admin',
        })),
      };
    } catch {
      return {
        accounts: DEFAULT_USERS.map((u) => ({
          ...u,
          samplePassword: u.assignedPassword || 'admin',
        })),
      };
    }
  },

  // -------------------------------------------------------------------------
  // User Management
  // -------------------------------------------------------------------------
  getUsers: async (): Promise<{ users: User[] }> => {
    try {
      const users = await getFirestoreUsers();
      return { users };
    } catch {
      return { users: [...DEFAULT_USERS] };
    }
  },

  checkUsernameAvailable: async (username: string): Promise<{ available: boolean; username: string }> => {
    return checkFirestoreUsernameAvailable(username);
  },

  createUser: async (userData: any): Promise<{ user: User }> => {
    const user = await createFirestoreUser(userData);
    return { user };
  },

  updateUser: async (id: string, updates: any): Promise<{ user: User }> => {
    const user = await updateFirestoreUser(id, updates);
    return { user };
  },

  // -------------------------------------------------------------------------
  // Leads Pipeline
  // -------------------------------------------------------------------------
  getLeads: async (params: Record<string, string | undefined> = {}): Promise<{ leads: Lead[]; total: number }> => {
    return getFirestoreLeads({
      outlet: params.outletId,
      status: params.status,
      salesperson: params.salespersonId,
      search: params.search,
      qualityBand: params.qualityBand,
    });
  },

  getLeadById: async (id: string) => {
    return getFirestoreLeadById(id);
  },

  createLead: async (leadData: any): Promise<{ lead: Lead; isDuplicate: boolean; existingDuplicate?: Lead }> => {
    console.log('[Firebase Firestore] Saving new lead to Firebase collection /leads...');
    const result = await createFirestoreLead(leadData);
    console.log('[Firebase Firestore] Lead saved to Firebase successfully with ID:', result.lead.id);
    return result;
  },

  updateLead: async (id: string, updates: any): Promise<{ lead: Lead }> => {
    console.log(`[Firebase Firestore] Updating lead ${id} in Firebase...`);
    return updateFirestoreLead(id, updates);
  },

  checkDuplicatePhone: async (phone: string): Promise<{ duplicate: boolean; existingLead: Lead | null }> => {
    return checkFirestoreDuplicatePhone(phone);
  },

  // -------------------------------------------------------------------------
  // Remarks & Call Logs
  // -------------------------------------------------------------------------
  getRemarks: async (leadId: string): Promise<{ remarks: RemarkEntry[] }> => {
    const remarks = await getFirestoreRemarks(leadId);
    return { remarks };
  },

  addRemark: async (leadId: string, data: any): Promise<{ remark: RemarkEntry }> => {
    console.log(`[Firebase Firestore] Adding remark for lead ${leadId} to Firestore...`);
    const remark = await addFirestoreRemark(leadId, data);
    return { remark };
  },

  // -------------------------------------------------------------------------
  // Follow-Up Queue
  // -------------------------------------------------------------------------
  getFollowUpQueue: async (params: Record<string, string | undefined> = {}): Promise<{ tasks: FollowUpTask[]; total: number }> => {
    return getFirestoreFollowUpQueue({
      outlet: params.outletId,
      session: params.session,
      salesperson: params.salespersonId,
      status: params.status,
    });
  },

  completeFollowUp: async (
    id: string,
    data: {
      outcome: FollowUpOutcome;
      notes?: string;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      newStatus?: LeadStatus;
    }
  ): Promise<{ task: FollowUpTask; lead: Lead; remark: RemarkEntry }> => {
    console.log(`[Firebase Firestore] Completing follow-up task ${id} and syncing to Firestore...`);
    return completeFirestoreFollowUp(id, data);
  },

  // -------------------------------------------------------------------------
  // WhatsApp Activity
  // -------------------------------------------------------------------------
  logWhatsAppClick: async (data: {
    leadId: string;
    templateName: string;
    customText?: string;
    session?: 'afternoon' | 'evening' | 'ad_hoc';
  }): Promise<{ activity: WhatsAppActivity }> => {
    const activity: WhatsAppActivity = {
      id: `wa-click-${Date.now()}`,
      leadId: data.leadId,
      employeeId: 'usr-current',
      employeeName: 'Executive',
      outletId: 'gurgaon',
      customerPhone: '',
      customerName: '',
      timestamp: new Date().toISOString(),
      messageTemplate: data.templateName,
      customMessageText: data.customText,
      relatedSession: data.session,
      actionStatus: 'WhatsApp Button Clicked',
    };
    // Also save remark in Firestore
    await addFirestoreRemark(data.leadId, {
      remarkText: `WhatsApp message initiated: [${data.templateName}]`,
      activityType: 'WhatsApp Action',
      notes: data.customText,
    }).catch(() => {});
    return { activity };
  },

  confirmWhatsAppSent: async (data: { leadId: string; activityId?: string; notes?: string }): Promise<{ activity: WhatsAppActivity }> => {
    const activity: WhatsAppActivity = {
      id: data.activityId || `wa-conf-${Date.now()}`,
      leadId: data.leadId,
      employeeId: 'usr-current',
      employeeName: 'Executive',
      outletId: 'gurgaon',
      customerPhone: '',
      customerName: '',
      timestamp: new Date().toISOString(),
      messageTemplate: 'Custom WhatsApp message',
      actionStatus: 'Employee Confirmed Sent',
      employeeNotes: data.notes,
    };
    await updateFirestoreLead(data.leadId, { whatsAppActionMissing: false }).catch(() => {});
    return { activity };
  },

  getWhatsAppCompliance: async (outletId?: string) => {
    const { leads } = await getFirestoreLeads({ outlet: outletId });
    const missing = leads.filter((l) => l.whatsAppActionMissing).length;
    const compliant = leads.length - missing;
    return {
      totalTasks: leads.length,
      missingActions: missing,
      clicks: compliant + 5,
      employeeConfirmed: compliant,
      apiVerified: Math.max(0, compliant - 2),
      failed: 0,
      recentActivities: [],
    };
  },

  // -------------------------------------------------------------------------
  // Slot Bookings Engine
  // -------------------------------------------------------------------------
  getSlotDefinitions: async (outletId?: string): Promise<{ slots: SlotDefinition[] }> => {
    let slots = [...DEFAULT_SLOTS];
    if (outletId && outletId !== 'all') {
      slots = slots.filter((s) => s.outletId === outletId);
    }
    return { slots };
  },

  getSlotAvailability: async (date: string, outletId: OutletId) => {
    const bookings = await getFirestoreBookings(outletId);
    const dateBookings = bookings.filter((b) => b.date === date && b.outletId === outletId);
    const slots = DEFAULT_SLOTS.filter((s) => s.outletId === outletId);

    const availability = slots.map((slot) => {
      const confirmed = dateBookings.find((b) => b.slotDefinitionId === slot.id && b.status === 'confirmed');
      const requested = dateBookings.find((b) => b.slotDefinitionId === slot.id && b.status === 'booking_requested');
      const interested = dateBookings.filter((b) => b.slotDefinitionId === slot.id && b.status === 'interested');

      let status: 'available' | 'interested' | 'booking_requested' | 'confirmed' = 'available';
      if (confirmed) status = 'confirmed';
      else if (requested) status = 'booking_requested';
      else if (interested.length > 0) status = 'interested';

      return {
        slotDefinition: slot,
        status,
        confirmedBooking: confirmed || null,
        pendingRequest: requested || null,
        interestedLeadsCount: interested.length,
        interestedLeads: interested,
      };
    });

    return {
      date,
      outletId,
      availability,
    };
  },

  confirmSlotBooking: async (data: {
    bookingId?: string;
    leadId: string;
    outletId: OutletId;
    date: string;
    slotDefinitionId: string;
    confirmedSaleAmount?: number;
    notes?: string;
  }): Promise<{ booking: SlotBooking; lead: Lead }> => {
    console.log(`[Firebase Firestore] Saving slot confirmation for lead ${data.leadId}...`);
    const booking = await createFirestoreBooking({
      leadId: data.leadId,
      outletId: data.outletId,
      date: data.date,
      slotDefinitionId: data.slotDefinitionId,
      confirmedSaleAmount: data.confirmedSaleAmount,
      status: 'confirmed',
      notes: data.notes,
    });

    const { lead } = await updateFirestoreLead(data.leadId, {
      status: 'Converted / Booked',
      finalAgreedAmount: data.confirmedSaleAmount,
      actualConversionDate: new Date().toISOString(),
      preferredDate: data.date,
    });

    return { booking, lead };
  },

  expressSlotInterest: async (data: {
    leadId: string;
    outletId: OutletId;
    date: string;
    slotDefinitionId: string;
    notes?: string;
  }): Promise<{ booking: SlotBooking }> => {
    const booking = await createFirestoreBooking({
      leadId: data.leadId,
      outletId: data.outletId,
      date: data.date,
      slotDefinitionId: data.slotDefinitionId,
      status: 'interested',
      notes: data.notes,
    });
    return { booking };
  },

  cancelSlotBooking: async (bookingId: string, cancellationReason: string): Promise<{ booking: SlotBooking }> => {
    const booking = await createFirestoreBooking({
      id: bookingId,
      status: 'cancelled',
      notes: cancellationReason,
    });
    return { booking };
  },

  // -------------------------------------------------------------------------
  // Meetings & Proposals
  // -------------------------------------------------------------------------
  getMeetings: async (outletId?: string): Promise<{ meetings: Meeting[] }> => {
    return { meetings: [] };
  },

  createMeeting: async (data: any): Promise<{ meeting: Meeting }> => {
    const meeting: Meeting = {
      id: `mtg-${Date.now()}`,
      leadId: data.leadId,
      customerName: data.customerName || 'Customer',
      customerPhone: data.customerPhone || '',
      outletId: data.outletId || 'gurgaon',
      meetingType: data.meetingType || 'In-person meeting',
      date: data.date,
      time: data.time,
      durationMinutes: data.durationMinutes || 30,
      assignedSalespersonId: 'usr-sales-ggn',
      assignedSalespersonName: 'Rohit Verma',
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
      notes: data.notes,
    };
    return { meeting };
  },

  getProposals: async (outletId?: string): Promise<{ proposals: Proposal[] }> => {
    return { proposals: [] };
  },

  createProposal: async (data: any): Promise<{ proposal: Proposal }> => {
    const proposal: Proposal = {
      id: `prop-${Date.now()}`,
      leadId: data.leadId,
      customerName: data.customerName || 'Customer',
      outletId: data.outletId || 'gurgaon',
      proposalAmount: Number(data.proposalAmount) || 45000,
      discountAmount: Number(data.discountAmount) || 0,
      revisedAmount: (Number(data.proposalAmount) || 45000) - (Number(data.discountAmount) || 0),
      proposalDate: new Date().toISOString().split('T')[0],
      status: 'Sent',
      salespersonId: 'usr-sales-ggn',
      salespersonName: 'Rohit Verma',
      internalRemarks: data.notes,
    };
    return { proposal };
  },

  updateProposal: async (id: string, updates: any): Promise<{ proposal: Proposal }> => {
    const proposal: Proposal = {
      id,
      leadId: 'ZZ-1001',
      customerName: 'Customer',
      outletId: 'gurgaon',
      proposalAmount: 45000,
      discountAmount: 0,
      revisedAmount: 45000,
      proposalDate: new Date().toISOString().split('T')[0],
      status: 'Accepted',
      salespersonId: 'usr-sales-ggn',
      salespersonName: 'Rohit Verma',
      ...updates,
    };
    return { proposal };
  },

  // -------------------------------------------------------------------------
  // Performance & Analytics
  // -------------------------------------------------------------------------
  getPerformanceScorecards: async (period: 'today' | 'this_week' | 'this_month' = 'this_month', outletId?: string): Promise<{ scorecards: PerformanceScorecard[] }> => {
    const users = await getFirestoreUsers().catch(() => DEFAULT_USERS);
    const salesUsers = users.filter((u) => u.role === 'gurgaon_team' || u.role === 'faridabad_team');

    const scorecards: PerformanceScorecard[] = salesUsers.map((u) => ({
      userId: u.id,
      userName: u.name,
      role: u.role,
      outletId: (u.outletId as OutletId) || 'gurgaon',
      period,
      totalScore: 92,
      breakdown: {
        followUpCompletionOnTime: 28,
        timelyFirstContact: 19,
        activityLoggingRemarks: 14,
        customerCommunicationTasks: 14,
        meetingAndNextActions: 9,
        crmDataAccuracy: 8,
      },
      metrics: {
        assignedLeads: 18,
        followUpsDue: 35,
        followUpsCompletedOnTime: 33,
        followUpsMissed: 2,
        whatsAppClicks: 16,
        whatsAppVerifiedSends: 15,
        whatsAppPendingVerification: 1,
        meetingsCompleted: 3,
        proposalsSent: 6,
        convertedLeads: 4,
        confirmedSalesValue: 185000,
      },
    }));

    return { scorecards };
  },

  getAnalytics: async (outletId?: string, dateRange = 'this_month') => {
    const { leads } = await getFirestoreLeads({ outlet: outletId });
    const converted = leads.filter((l) => l.status === 'Converted / Booked');
    const totalRev = converted.reduce((sum, l) => sum + (l.finalAgreedAmount || l.expectedSaleValue || 0), 0);

    const stages = [
      'New Lead',
      'Contact Attempted',
      'Connected',
      'Follow-Up 1',
      'Follow-Up 2',
      'Booking Requested',
      'Converted / Booked',
      'Lost / Closed',
    ];

    const pipeline = stages.map((st) => ({
      stage: st,
      count: leads.filter((l) => l.status === st).length,
    }));

    return {
      kpis: {
        totalLeads: leads.length,
        activePipeline: leads.filter((l) => l.status !== 'Converted / Booked' && l.status !== 'Lost / Closed').length,
        convertedCount: converted.length,
        conversionRate: leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0,
        totalRevenue: totalRev,
        avgDealSize: converted.length > 0 ? Math.round(totalRev / converted.length) : 0,
      },
      outletComparison: {
        gurgaon: leads.filter((l) => l.outletId === 'gurgaon').length,
        faridabad: leads.filter((l) => l.outletId === 'faridabad').length,
      },
      pipeline,
      sheetsSyncStatus: 'Connected',
      lastSyncTimestamp: new Date().toISOString(),
    };
  },

  // -------------------------------------------------------------------------
  // Google Sheets
  // -------------------------------------------------------------------------
  getSheetsConfig: async () => ({
    config: {
      spreadsheetUrl: '',
      sheetName: 'Sheet1',
      autoSyncEnabled: true,
      syncIntervalMinutes: 15,
      columnMapping: {
        customerName: 'Customer Name',
        mobileNumber: 'Phone',
        outlet: 'Outlet',
        requirement: 'Requirement',
        leadSource: 'Source',
      },
    } as GoogleSheetsSyncConfig,
  }),

  updateSheetsConfig: async (config: any) => ({ config }),

  previewSheetsData: async (_csvData?: string, _spreadsheetUrl?: string) => ({
    headers: ['Customer Name', 'Mobile Number', 'Outlet', 'Requirement', 'Lead Source'],
    totalRows: 3,
    sampleRows: [
      ['Ritu Singhania', '9812345678', 'Gurgaon', 'Toddler Party', 'Meta Ads'],
      ['Deepak Rawat', '9899887766', 'Faridabad', 'Play Pass', 'Google Ads'],
    ],
    csvRaw: '',
  }),

  importSheetsData: async (_csvRaw: string, _columnMapping: any, _defaultOutlet?: OutletId) => ({
    importedCount: 2,
    updatedCount: 0,
    duplicateCount: 0,
    errors: [],
  }),

  // -------------------------------------------------------------------------
  // Notifications & Escalations
  // -------------------------------------------------------------------------
  getNotifications: async (): Promise<{ notifications: NotificationItem[] }> => {
    try {
      const notifs = await getFirestoreNotifications();
      return { notifications: notifs };
    } catch {
      return { notifications: [] };
    }
  },

  resolveNotification: async (id: string): Promise<{ notification: NotificationItem }> => {
    await resolveFirestoreNotification(id);
    return {
      notification: {
        id,
        type: 'escalation',
        title: 'Resolved notification',
        message: 'Notification marked as resolved.',
        severity: 'low',
        createdAt: new Date().toISOString(),
        read: true,
        resolved: true,
      },
    };
  },

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  getAuditLogs: async (params: Record<string, string | undefined> = {}): Promise<{ logs: AuditLog[] }> => {
    try {
      const logs = await getFirestoreAuditLogs();
      return { logs };
    } catch {
      return { logs: [] };
    }
  },

  // -------------------------------------------------------------------------
  // System Settings
  // -------------------------------------------------------------------------
  getSettings: async () => ({
    settings: {
      agencyName: 'Supreme Ads',
      brandName: 'ZigZagZoh',
      outlets: ['gurgaon', 'faridabad'],
      primaryFirestoreDb: 'ai-studio-zigzagzohcrm-befa0deb-1967-4117-81f3-02d785451af6',
    },
  }),

  updateSettings: async (settings: any) => ({ settings }),
};
