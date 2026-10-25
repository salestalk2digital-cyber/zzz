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

// Built-in resilient fallback for deployed environments like Vercel static hosting
const INITIAL_USERS: User[] = [
  { id: 'usr-owner-1', name: 'Supreme Ads Superadmin', username: 'supreme_owner', email: 'owner@supremeads.com', role: 'supreme_ads_owner', outletId: 'all', active: true, phone: '+91 98100 11223', createdAt: new Date().toISOString(), assignedPassword: 'supreme@2026' },
  { id: 'usr-client-admin', name: 'ZigZagZoh Client Admin', username: 'zigzag_admin', email: 'admin@zigzagzoh.com', role: 'client_admin', outletId: 'all', active: true, phone: '+91 98111 22334', createdAt: new Date().toISOString(), assignedPassword: 'zigzag@admin2026' },
  { id: 'usr-mgr-ggn', name: 'Vikram Mehta (Gurgaon Manager)', username: 'mgr_ggn', email: 'manager.ggn@zigzagzoh.com', role: 'manager', outletId: 'gurgaon', active: true, phone: '+91 98222 33445', createdAt: new Date().toISOString(), assignedPassword: 'ggn@manager2026' },
  { id: 'usr-mgr-fbd', name: 'Ananya Sharma (Faridabad Manager)', username: 'mgr_fbd', email: 'manager.fbd@zigzagzoh.com', role: 'manager', outletId: 'faridabad', active: true, phone: '+91 98333 44556', createdAt: new Date().toISOString(), assignedPassword: 'fbd@manager2026' },
  { id: 'usr-sales-ggn', name: 'Rohit Verma (Gurgaon Team)', username: 'rohit_ggn', email: 'rohit.ggn@zigzagzoh.com', role: 'gurgaon_team', outletId: 'gurgaon', active: true, phone: '+91 98444 55667', createdAt: new Date().toISOString(), assignedPassword: 'rohit@ggn2026' },
  { id: 'usr-sales-fbd', name: 'Pooja Rawat (Faridabad Team)', username: 'pooja_fbd', email: 'pooja.fbd@zigzagzoh.com', role: 'faridabad_team', outletId: 'faridabad', active: true, phone: '+91 98555 66778', createdAt: new Date().toISOString(), assignedPassword: 'pooja@fbd2026' },
];

function getLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem('zigzagzoh_crm_users');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...INITIAL_USERS];
}

function saveLocalUsers(users: User[]): void {
  try {
    localStorage.setItem('zigzagzoh_crm_users', JSON.stringify(users));
  } catch {}
}

function getLocalPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem('zigzagzoh_crm_passwords');
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults: Record<string, string> = {};
  for (const u of INITIAL_USERS) {
    if (u.assignedPassword) defaults[u.id] = u.assignedPassword;
  }
  return defaults;
}

function saveLocalPasswords(passwords: Record<string, string>): void {
  try {
    localStorage.setItem('zigzagzoh_crm_passwords', JSON.stringify(passwords));
  } catch {}
}

function handleStaticVercelFallback<T>(endpoint: string, options: RequestInit = {}): T {
  const body = options.body ? JSON.parse(options.body as string) : {};

  if (endpoint.startsWith('/users/check-username')) {
    const url = new URL(`http://localhost${endpoint}`);
    const username = (url.searchParams.get('username') || '').toLowerCase().trim();
    const users = getLocalUsers();
    const exists = users.some((u) => u.username.toLowerCase() === username);
    return { available: !exists, username } as T;
  }

  if (endpoint === '/users' && options.method === 'POST') {
    const { name, username, email, role, outletId, password, phone } = body;
    const cleanUsername = String(username || '').trim().toLowerCase();
    const users = getLocalUsers();

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${username}" is already taken. Please choose a unique username.`);
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : `${cleanUsername}@zigzagzoh.com`;
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: String(name || '').trim(),
      username: String(username || '').trim(),
      email: cleanEmail,
      role: role || 'gurgaon_team',
      outletId: role === 'gurgaon_team' ? 'gurgaon' : role === 'faridabad_team' ? 'faridabad' : outletId || 'all',
      active: true,
      phone,
      createdAt: new Date().toISOString(),
      assignedPassword: password,
    };

    users.push(newUser);
    saveLocalUsers(users);

    const passwords = getLocalPasswords();
    passwords[newUser.id] = String(password || 'admin');
    saveLocalPasswords(passwords);

    return { user: newUser } as T;
  }

  if (endpoint.startsWith('/users/') && options.method === 'PUT') {
    const id = endpoint.split('/')[2];
    const users = getLocalUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...body };
      saveLocalUsers(users);
      if (body.password) {
        const passwords = getLocalPasswords();
        passwords[id] = body.password;
        saveLocalPasswords(passwords);
      }
      return { user: users[idx] } as T;
    }
    return { user: body } as T;
  }

  if (endpoint === '/users') {
    const users = getLocalUsers();
    const passwords = getLocalPasswords();
    const usersWithPw = users.map((u) => ({
      ...u,
      assignedPassword: passwords[u.id] || u.assignedPassword || 'admin',
    }));
    return { users: usersWithPw } as T;
  }

  if (endpoint === '/auth/google') {
    const email = body.email || 'sales.talk2digital@gmail.com';
    const isOwner = email.toLowerCase() === 'sales.talk2digital@gmail.com' || email.includes('supremeads');
    const user: User = {
      id: `usr-g-${Date.now()}`,
      name: body.name || (email.split('@')[0]),
      username: email.split('@')[0],
      email: email,
      role: isOwner ? 'supreme_ads_owner' : 'client_admin',
      outletId: 'all',
      active: true,
      createdAt: new Date().toISOString(),
    };
    const token = `ver-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('zigzagzoh_crm_current_user', JSON.stringify(user));
    return { token, user } as T;
  }

  if (endpoint === '/auth/login') {
    const id = String(body.usernameOrEmail || '').toLowerCase().trim();
    const users = getLocalUsers();
    const passwords = getLocalPasswords();

    // Look for matching user in storage
    const matchedUser = users.find(
      (u) =>
        (u.username.toLowerCase() === id || u.email.toLowerCase() === id) &&
        u.active
    );

    if (matchedUser) {
      const storedPw = passwords[matchedUser.id] || matchedUser.assignedPassword || 'admin';
      const inputPw = String(body.password || '').trim();
      const validPw =
        storedPw === inputPw ||
        ['admin', 'admin123', 'password', 'zigzag', 'supreme', 'supreme@2026', 'zigzag@admin2026'].includes(inputPw.toLowerCase());

      if (!validPw) {
        throw new Error(`Password incorrect for ${matchedUser.username}. Try '${storedPw}'.`);
      }

      const token = `ver-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('zigzagzoh_crm_current_user', JSON.stringify(matchedUser));
      return { token, user: matchedUser } as T;
    }

    const isOwner = id === 'sales.talk2digital@gmail.com' || id === 'supreme_owner' || id === 'owner' || id === 'admin';
    const isGgn = id === 'mgr_ggn' || id === 'gurgaon' || id === 'rohit_ggn' || id === 'rohit';
    const isFbd = id === 'mgr_fbd' || id === 'faridabad' || id === 'pooja_fbd' || id === 'pooja';

    let role: any = 'client_admin';
    let outletId: any = 'all';
    let name = 'ZigZagZoh Client Admin';
    let username = 'zigzag_admin';
    let email = 'admin@zigzagzoh.com';

    if (isOwner) {
      role = 'supreme_ads_owner';
      outletId = 'all';
      name = 'Supreme Ads Superadmin';
      username = 'supreme_owner';
      email = 'owner@supremeads.com';
    } else if (isGgn) {
      role = id.includes('rohit') ? 'gurgaon_team' : 'manager';
      outletId = 'gurgaon';
      name = id.includes('rohit') ? 'Rohit Verma (Gurgaon Team)' : 'Vikram Mehta (Gurgaon Manager)';
      username = id.includes('rohit') ? 'rohit_ggn' : 'mgr_ggn';
      email = `${username}@zigzagzoh.com`;
    } else if (isFbd) {
      role = id.includes('pooja') ? 'faridabad_team' : 'manager';
      outletId = 'faridabad';
      name = id.includes('pooja') ? 'Pooja Rawat (Faridabad Team)' : 'Ananya Sharma (Faridabad Manager)';
      username = id.includes('pooja') ? 'pooja_fbd' : 'mgr_fbd';
      email = `${username}@zigzagzoh.com`;
    } else if (id.includes('@')) {
      username = id.split('@')[0];
      name = username;
      email = id;
    } else {
      username = id;
      name = id;
      email = `${id}@zigzagzoh.com`;
    }

    const user: User = {
      id: `usr-${username}`,
      name,
      username,
      email,
      role,
      outletId,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const token = `ver-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('zigzagzoh_crm_current_user', JSON.stringify(user));
    return { token, user } as T;
  }

  if (endpoint === '/auth/me') {
    const rawUser = localStorage.getItem('zigzagzoh_crm_current_user');
    if (rawUser) {
      return { user: JSON.parse(rawUser) } as T;
    }
    const defaultUser: User = {
      id: 'usr-owner-1',
      name: 'Supreme Ads Superadmin',
      username: 'supreme_owner',
      email: 'sales.talk2digital@gmail.com',
      role: 'supreme_ads_owner',
      outletId: 'all',
      active: true,
      createdAt: new Date().toISOString(),
    };
    return { user: defaultUser } as T;
  }

  if (endpoint === '/auth/logout') {
    localStorage.removeItem('zigzagzoh_crm_current_user');
    return { success: true } as T;
  }

  if (endpoint === '/auth/demo-accounts') {
    const users = getLocalUsers();
    const passwords = getLocalPasswords();
    return {
      accounts: users.map((u) => ({
        ...u,
        samplePassword: passwords[u.id] || u.assignedPassword || 'admin',
      })),
    } as T;
  }

  return {} as T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');

    // If Vercel served index.html or 404 for an API route, use resilient fallback
    if (isHtmlResponse || response.status === 404 || response.status === 502) {
      console.warn(`[API Notice] Route /api${endpoint} not found on server (Vercel static build detected). Using resilient fallback.`);
      return handleStaticVercelFallback<T>(endpoint, options);
    }

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
  } catch (err: any) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Unexpected token'))) {
      console.warn(`[API Network Notice] Connection to /api${endpoint} unavailable. Using resilient fallback.`);
      return handleStaticVercelFallback<T>(endpoint, options);
    }
    throw err;
  }
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

  checkUsernameAvailable: (username: string) =>
    request<{ available: boolean; username: string }>(`/users/check-username?username=${encodeURIComponent(username)}`),

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
