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

const TOKEN_KEY = 'zigzagzoh_crm_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredToken();
    if (window.location.pathname !== '/login') {
      // let auth context handle redirect
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (usernameOrEmail: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    }),

  loginWithGoogle: (data: { email: string; name?: string; uid: string }) =>
    request<{ token: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  getDemoAccounts: () =>
    request<{ accounts: Array<User & { samplePassword: string }> }>('/auth/demo-accounts'),

  // Users
  getUsers: () => request<{ users: User[] }>('/users'),

  createUser: (userData: any) =>
    request<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUser: (id: string, updates: any) =>
    request<{ user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Leads
  getLeads: (params: Record<string, string | undefined> = {}) => {
    const cleanParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') cleanParams[k] = v;
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request<{ leads: Lead[]; total: number }>(`/leads${query ? `?${query}` : ''}`);
  },

  getLeadById: (id: string) =>
    request<{
      lead: Lead;
      remarks: RemarkEntry[];
      tasks: FollowUpTask[];
      bookings: SlotBooking[];
      proposals: Proposal[];
      meetings: Meeting[];
      whatsappActivities: WhatsAppActivity[];
    }>(`/leads/${id}`),

  createLead: (leadData: any) =>
    request<{ lead: Lead; isDuplicate: boolean; existingDuplicate?: Lead }>('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    }),

  updateLead: (id: string, updates: any) =>
    request<{ lead: Lead }>(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  checkDuplicatePhone: (phone: string) =>
    request<{ duplicate: boolean; existingLead: Lead | null }>('/leads/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  // Remarks
  getRemarks: (leadId: string) => request<{ remarks: RemarkEntry[] }>(`/leads/${leadId}/remarks`),

  addRemark: (leadId: string, data: any) =>
    request<{ remark: RemarkEntry }>(`/leads/${leadId}/remarks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Follow-ups
  getFollowUpQueue: (params: Record<string, string | undefined> = {}) => {
    const cleanParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') cleanParams[k] = v;
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request<{ tasks: FollowUpTask[]; total: number }>(`/followups/queue${query ? `?${query}` : ''}`);
  },

  completeFollowUp: (
    id: string,
    data: {
      outcome: FollowUpOutcome;
      notes?: string;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      newStatus?: LeadStatus;
    }
  ) =>
    request<{ task: FollowUpTask; lead: Lead; remark: RemarkEntry }>(`/followups/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // WhatsApp
  logWhatsAppClick: (data: {
    leadId: string;
    templateName: string;
    customText?: string;
    session?: 'afternoon' | 'evening' | 'ad_hoc';
  }) =>
    request<{ activity: WhatsAppActivity }>('/whatsapp/click', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmWhatsAppSent: (data: { leadId: string; activityId?: string; notes?: string }) =>
    request<{ activity: WhatsAppActivity }>('/whatsapp/confirm-sent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getWhatsAppCompliance: (outletId?: string) =>
    request<{
      totalTasks: number;
      missingActions: number;
      clicks: number;
      employeeConfirmed: number;
      apiVerified: number;
      failed: number;
      recentActivities: WhatsAppActivity[];
    }>(`/whatsapp/compliance${outletId ? `?outletId=${outletId}` : ''}`),

  // Slots & Booking Engine
  getSlotDefinitions: (outletId?: string) =>
    request<{ slots: SlotDefinition[] }>(`/slots/definitions${outletId ? `?outletId=${outletId}` : ''}`),

  getSlotAvailability: (date: string, outletId: OutletId) =>
    request<{
      date: string;
      outletId: OutletId;
      availability: Array<{
        slotDefinition: SlotDefinition;
        status: 'available' | 'interested' | 'booking_requested' | 'confirmed';
        confirmedBooking: SlotBooking | null;
        pendingRequest: SlotBooking | null;
        interestedLeadsCount: number;
        interestedLeads: SlotBooking[];
      }>;
    }>(`/slots/availability?date=${date}&outletId=${outletId}`),

  confirmSlotBooking: (data: {
    bookingId?: string;
    leadId: string;
    outletId: OutletId;
    date: string;
    slotDefinitionId: string;
    confirmedSaleAmount?: number;
    notes?: string;
  }) =>
    request<{ booking: SlotBooking; lead: Lead }>('/slots/confirm-booking', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  expressSlotInterest: (data: {
    leadId: string;
    outletId: OutletId;
    date: string;
    slotDefinitionId: string;
    notes?: string;
  }) =>
    request<{ booking: SlotBooking }>('/slots/express-interest', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelSlotBooking: (bookingId: string, cancellationReason: string) =>
    request<{ booking: SlotBooking }>('/slots/cancel-booking', {
      method: 'POST',
      body: JSON.stringify({ bookingId, cancellationReason }),
    }),

  // Meetings
  getMeetings: (outletId?: string) =>
    request<{ meetings: Meeting[] }>(`/meetings${outletId ? `?outletId=${outletId}` : ''}`),

  createMeeting: (data: any) =>
    request<{ meeting: Meeting }>('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Proposals
  getProposals: (outletId?: string) =>
    request<{ proposals: Proposal[] }>(`/proposals${outletId ? `?outletId=${outletId}` : ''}`),

  createProposal: (data: any) =>
    request<{ proposal: Proposal }>('/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProposal: (id: string, updates: any) =>
    request<{ proposal: Proposal }>(`/proposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Performance
  getPerformanceScorecards: (period = 'this_month', outletId?: string) =>
    request<{ scorecards: PerformanceScorecard[] }>(
      `/performance?period=${period}${outletId ? `&outletId=${outletId}` : ''}`
    ),

  // Analytics
  getAnalytics: (outletId?: string, dateRange = 'this_month') =>
    request<{
      kpis: any;
      outletComparison: any;
      pipeline: Array<{ stage: string; count: number }>;
      sheetsSyncStatus: string;
      lastSyncTimestamp?: string;
    }>(`/analytics?dateRange=${dateRange}${outletId ? `&outletId=${outletId}` : ''}`),

  // Google Sheets
  getSheetsConfig: () => request<{ config: GoogleSheetsSyncConfig }>('/sheets/config'),

  updateSheetsConfig: (config: any) =>
    request<{ config: GoogleSheetsSyncConfig }>('/sheets/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  previewSheetsData: (csvData?: string, spreadsheetUrl?: string) =>
    request<{
      headers: string[];
      totalRows: number;
      sampleRows: string[][];
      csvRaw: string;
    }>('/sheets/preview', {
      method: 'POST',
      body: JSON.stringify({ csvData, spreadsheetUrl }),
    }),

  importSheetsData: (csvRaw: string, columnMapping: any, defaultOutlet?: OutletId) =>
    request<{
      importedCount: number;
      updatedCount: number;
      duplicateCount: number;
      errors: string[];
    }>('/sheets/import', {
      method: 'POST',
      body: JSON.stringify({ csvRaw, columnMapping, defaultOutlet }),
    }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications'),

  resolveNotification: (id: string) =>
    request<{ notification: NotificationItem }>(`/notifications/${id}/resolve`, {
      method: 'PUT',
    }),

  // Audit Logs
  getAuditLogs: (params: Record<string, string | undefined> = {}) => {
    const cleanParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') cleanParams[k] = v;
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request<{ logs: AuditLog[] }>(`/audit-logs${query ? `?${query}` : ''}`);
  },

  // Settings
  getSettings: () => request<{ settings: any }>('/settings'),
  updateSettings: (settings: any) =>
    request<{ settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
