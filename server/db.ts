import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
} from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../data');
const DEFAULT_DB_FILE = path.join(DEFAULT_DATA_DIR, 'db.json');

// Check if running in Vercel or AWS Lambda environment where filesystem is read-only
function getDatabaseFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'zigzagzoh_db.json');
  }
  return DEFAULT_DB_FILE;
}

export interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> hash or password string
  leads: Lead[];
  remarks: RemarkEntry[];
  followUpTasks: FollowUpTask[];
  whatsappActivities: WhatsAppActivity[];
  slotDefinitions: SlotDefinition[];
  bookings: SlotBooking[];
  meetings: Meeting[];
  proposals: Proposal[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  sheetsConfig: GoogleSheetsSyncConfig;
  settings: {
    agencyName: string;
    brandName: string;
    whatsappApiToken?: string;
    whatsappPhoneNumberId?: string;
    whatsappBusinessAccountId?: string;
    afternoonSessionHour: number; // 13 (1:00 PM)
    eveningSessionHour: number;   // 19 (7:00 PM)
    escalationGraceMinutes: number; // 60 mins
  };
}

let dbCache: DatabaseSchema | null = null;
let isWriting = false;

// Default slot definitions for Gurgaon and Faridabad
const defaultSlots: SlotDefinition[] = [
  { id: 'slot-ggn-1', outletId: 'gurgaon', name: 'Afternoon Slot (12:00 PM – 3:00 PM)', startTime: '12:00', endTime: '15:00', isActive: true },
  { id: 'slot-ggn-2', outletId: 'gurgaon', name: 'Late Afternoon Slot (4:00 PM – 7:00 PM)', startTime: '16:00', endTime: '19:00', isActive: true },
  { id: 'slot-ggn-3', outletId: 'gurgaon', name: 'Evening Slot (5:00 PM – 8:00 PM)', startTime: '17:00', endTime: '20:00', isActive: true },
  { id: 'slot-fbd-1', outletId: 'faridabad', name: 'Afternoon Slot (12:00 PM – 3:00 PM)', startTime: '12:00', endTime: '15:00', isActive: true },
  { id: 'slot-fbd-2', outletId: 'faridabad', name: 'Late Afternoon Slot (4:00 PM – 7:00 PM)', startTime: '16:00', endTime: '19:00', isActive: true },
  { id: 'slot-fbd-3', outletId: 'faridabad', name: 'Evening Slot (5:00 PM – 8:00 PM)', startTime: '17:00', endTime: '20:00', isActive: true },
];

// Initial user accounts for all 5 roles
const defaultUsers: User[] = [
  {
    id: 'usr-owner-1',
    name: 'Supreme Ads Superadmin',
    username: 'supreme_owner',
    email: 'owner@supremeads.com',
    role: 'supreme_ads_owner',
    outletId: 'all',
    active: true,
    phone: '+91 98100 11223',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-client-admin',
    name: 'ZigZagZoh Client Admin',
    username: 'zigzag_admin',
    email: 'admin@zigzagzoh.com',
    role: 'client_admin',
    outletId: 'all',
    active: true,
    phone: '+91 98111 22334',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-mgr-ggn',
    name: 'Vikram Mehta (Gurgaon Manager)',
    username: 'mgr_ggn',
    email: 'manager.ggn@zigzagzoh.com',
    role: 'manager',
    outletId: 'gurgaon',
    active: true,
    phone: '+91 98222 33445',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-mgr-fbd',
    name: 'Ananya Sharma (Faridabad Manager)',
    username: 'mgr_fbd',
    email: 'manager.fbd@zigzagzoh.com',
    role: 'manager',
    outletId: 'faridabad',
    active: true,
    phone: '+91 98333 44556',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-sales-ggn',
    name: 'Rohit Verma (Gurgaon Team)',
    username: 'rohit_ggn',
    email: 'rohit.ggn@zigzagzoh.com',
    role: 'gurgaon_team',
    outletId: 'gurgaon',
    active: true,
    phone: '+91 98444 55667',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-sales-fbd',
    name: 'Pooja Rawat (Faridabad Team)',
    username: 'pooja_fbd',
    email: 'pooja.fbd@zigzagzoh.com',
    role: 'faridabad_team',
    outletId: 'faridabad',
    active: true,
    phone: '+91 98555 66778',
    createdAt: new Date().toISOString(),
  },
];

// Pre-seeded passwords (can be changed in settings)
const defaultPasswords: Record<string, string> = {
  'usr-owner-1': 'supreme@2026',
  'usr-client-admin': 'zigzag@admin2026',
  'usr-mgr-ggn': 'ggn@manager2026',
  'usr-mgr-fbd': 'fbd@manager2026',
  'usr-sales-ggn': 'rohit@ggn2026',
  'usr-sales-fbd': 'pooja@fbd2026',
};

// Initial realistic foundation leads for both outlets
const initialLeads: Lead[] = [
  {
    id: 'ZZ-GUR-1001',
    customerName: 'Aarav Malhotra',
    mobileNumber: '+91 98765 43210',
    whatsAppNumber: '+91 98765 43210',
    email: 'aarav.malhotra@gmail.com',
    outletId: 'gurgaon',
    assignedSalespersonId: 'usr-sales-ggn',
    assignedSalespersonName: 'Rohit Verma (Gurgaon Team)',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    leadSource: 'Meta Ads',
    requirement: 'Birthday Party Celebration for 25 kids & parents with exclusive play area access',
    preferredDate: '2026-11-05',
    preferredSlot: 'Afternoon Slot (12:00 PM – 3:00 PM)',
    budget: 45000,
    expectedValue: 48000,
    decisionTimeline: 'This weekend',
    qualityScore: 85,
    qualityBand: 'High',
    status: 'Follow-Up 2',
    proposalAmount: 48000,
    discountAmount: 3000,
    expectedSaleValue: 45000,
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    nextFollowUpTime: '14:30',
    followUpOwnerId: 'usr-sales-ggn',
    followUpSequenceCount: 2,
    firstContactAttempted: true,
    firstContactTimestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
    whatsAppActionMissing: false,
  },
  {
    id: 'ZZ-GUR-1002',
    customerName: 'Meera Singhania',
    mobileNumber: '+91 98123 45678',
    whatsAppNumber: '+91 98123 45678',
    email: 'meera.s@outlook.com',
    outletId: 'gurgaon',
    assignedSalespersonId: 'usr-sales-ggn',
    assignedSalespersonName: 'Rohit Verma (Gurgaon Team)',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    leadSource: 'Google Ads',
    requirement: 'Toddler Activity Club & Weekend Play Pass package',
    preferredDate: '2026-11-12',
    preferredSlot: 'Late Afternoon Slot (4:00 PM – 7:00 PM)',
    budget: 25000,
    expectedValue: 28000,
    decisionTimeline: 'Within 3 days',
    qualityScore: 75,
    qualityBand: 'Medium',
    status: 'Contact Attempted',
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    nextFollowUpTime: '13:15',
    followUpOwnerId: 'usr-sales-ggn',
    followUpSequenceCount: 1,
    firstContactAttempted: true,
    firstContactTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    whatsAppActionMissing: true, // Needs follow-up message!
  },
  {
    id: 'ZZ-FAR-2001',
    customerName: 'Kabir Oberoi',
    mobileNumber: '+91 99988 77665',
    whatsAppNumber: '+91 99988 77665',
    email: 'kabir.oberoi@techfirm.in',
    outletId: 'faridabad',
    assignedSalespersonId: 'usr-sales-fbd',
    assignedSalespersonName: 'Pooja Rawat (Faridabad Team)',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    leadSource: 'Walk-in',
    requirement: 'Grand 5th Birthday Event for 40 guests + customized catering and entertainer',
    preferredDate: '2026-11-18',
    preferredSlot: 'Evening Slot (5:00 PM – 8:00 PM)',
    budget: 65000,
    expectedValue: 70000,
    decisionTimeline: 'Immediate',
    qualityScore: 95,
    qualityBand: 'High',
    status: 'Negotiation',
    proposalAmount: 70000,
    discountAmount: 5000,
    expectedSaleValue: 65000,
    negotiationAmount: 62000,
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    nextFollowUpTime: '19:30',
    followUpOwnerId: 'usr-sales-fbd',
    followUpSequenceCount: 3,
    firstContactAttempted: true,
    firstContactTimestamp: new Date(Date.now() - 3600000 * 40).toISOString(),
    whatsAppActionMissing: false,
  },
  {
    id: 'ZZ-FAR-2002',
    customerName: 'Shalini Gupta',
    mobileNumber: '+91 97711 22334',
    whatsAppNumber: '+91 97711 22334',
    email: 'shalini.gupta@gmail.com',
    outletId: 'faridabad',
    assignedSalespersonId: 'usr-sales-fbd',
    assignedSalespersonName: 'Pooja Rawat (Faridabad Team)',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    leadSource: 'Website',
    requirement: 'School Playgroup field trip package for 35 children',
    preferredDate: '2026-11-25',
    preferredSlot: 'Afternoon Slot (12:00 PM – 3:00 PM)',
    budget: 35000,
    expectedValue: 40000,
    decisionTimeline: 'End of month',
    qualityScore: 80,
    qualityBand: 'High',
    status: 'Meeting Scheduled',
    proposalAmount: 38000,
    nextFollowUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    nextFollowUpTime: '11:00',
    followUpOwnerId: 'usr-sales-fbd',
    followUpSequenceCount: 1,
    firstContactAttempted: true,
    firstContactTimestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
    whatsAppActionMissing: false,
  },
];

// Initial remarks for the leads
const initialRemarks: RemarkEntry[] = [
  {
    id: 'rem-1',
    leadId: 'ZZ-GUR-1001',
    slotIndex: 1,
    remarkText: 'Connected with Aarav regarding 25 kids birthday. Expressed strong interest in the soft play and trampoline zones. Sent details.',
    authorId: 'usr-sales-ggn',
    authorName: 'Rohit Verma (Gurgaon Team)',
    authorRole: 'gurgaon_team',
    timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
    activityType: 'First Call',
    outcome: 'Discussion Completed — Follow-Up Required',
  },
  {
    id: 'rem-2',
    leadId: 'ZZ-GUR-1001',
    slotIndex: 2,
    remarkText: 'Follow-up call completed. Shared package proposal of Rs 48,000 with 3k special booking discount. Customer is discussing menu options with spouse.',
    authorId: 'usr-sales-ggn',
    authorName: 'Rohit Verma (Gurgaon Team)',
    authorRole: 'gurgaon_team',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    activityType: 'Proposal Discussion',
    outcome: 'Discussion Ongoing',
  },
  {
    id: 'rem-3',
    leadId: 'ZZ-FAR-2001',
    slotIndex: 1,
    remarkText: 'Visited the Faridabad center as walk-in. Looked at the party hall setup. Loved the theme decoration portfolio.',
    authorId: 'usr-sales-fbd',
    authorName: 'Pooja Rawat (Faridabad Team)',
    authorRole: 'faridabad_team',
    timestamp: new Date(Date.now() - 3600000 * 40).toISOString(),
    activityType: 'First Call',
    outcome: 'Discussion Completed — Follow-Up Required',
  },
  {
    id: 'rem-4',
    leadId: 'ZZ-FAR-2001',
    slotIndex: 2,
    remarkText: 'Sent proposal for 70k. Customer requested if we can do 62k inclusive of cake cutting celebration and host.',
    authorId: 'usr-sales-fbd',
    authorName: 'Pooja Rawat (Faridabad Team)',
    authorRole: 'faridabad_team',
    timestamp: new Date(Date.now() - 3600000 * 16).toISOString(),
    activityType: 'Negotiation',
    outcome: 'Discussion Ongoing',
  },
];

// Initial follow-up tasks
const todayStr = new Date().toISOString().split('T')[0];
const initialTasks: FollowUpTask[] = [
  {
    id: 'task-1',
    leadId: 'ZZ-GUR-1001',
    leadName: 'Aarav Malhotra',
    leadPhone: '+91 98765 43210',
    leadStatus: 'Follow-Up 2',
    outletId: 'gurgaon',
    assignedToId: 'usr-sales-ggn',
    assignedToName: 'Rohit Verma (Gurgaon Team)',
    dueDate: todayStr,
    dueTime: '14:30',
    session: 'afternoon',
    sequenceNumber: 2,
    status: 'pending',
    whatsAppStatus: 'Draft Prepared',
    lastContactTimestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    lastRemarks: 'Customer discussing menu options with spouse.',
  },
  {
    id: 'task-2',
    leadId: 'ZZ-GUR-1002',
    leadName: 'Meera Singhania',
    leadPhone: '+91 98123 45678',
    leadStatus: 'Contact Attempted',
    outletId: 'gurgaon',
    assignedToId: 'usr-sales-ggn',
    assignedToName: 'Rohit Verma (Gurgaon Team)',
    dueDate: todayStr,
    dueTime: '13:15',
    session: 'afternoon',
    sequenceNumber: 1,
    status: 'pending',
    whatsAppStatus: 'Not Started',
    lastContactTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    lastRemarks: 'Call went unanswered. Need WhatsApp follow-up.',
  },
  {
    id: 'task-3',
    leadId: 'ZZ-FAR-2001',
    leadName: 'Kabir Oberoi',
    leadPhone: '+91 99988 77665',
    leadStatus: 'Negotiation',
    outletId: 'faridabad',
    assignedToId: 'usr-sales-fbd',
    assignedToName: 'Pooja Rawat (Faridabad Team)',
    dueDate: todayStr,
    dueTime: '19:30',
    session: 'evening',
    sequenceNumber: 3,
    status: 'pending',
    whatsAppStatus: 'Employee Confirmed Sent',
    lastContactTimestamp: new Date(Date.now() - 3600000 * 16).toISOString(),
    lastRemarks: 'Requested revised quotation at 62k.',
  },
];

// Initial bookings showing interest vs confirmed
const initialBookings: SlotBooking[] = [
  {
    id: 'book-1',
    leadId: 'ZZ-GUR-1001',
    customerName: 'Aarav Malhotra',
    customerPhone: '+91 98765 43210',
    outletId: 'gurgaon',
    date: '2026-11-05',
    slotDefinitionId: 'slot-ggn-1',
    slotName: 'Afternoon Slot (12:00 PM – 3:00 PM)',
    startTime: '12:00',
    endTime: '15:00',
    status: 'interested', // Interested only, not double booked!
    proposalAmount: 48000,
    assignedSalespersonId: 'usr-sales-ggn',
    assignedSalespersonName: 'Rohit Verma (Gurgaon Team)',
    createdBy: 'usr-sales-ggn',
  },
  {
    id: 'book-2',
    leadId: 'ZZ-FAR-2001',
    customerName: 'Kabir Oberoi',
    customerPhone: '+91 99988 77665',
    outletId: 'faridabad',
    date: '2026-11-18',
    slotDefinitionId: 'slot-fbd-3',
    slotName: 'Evening Slot (5:00 PM – 8:00 PM)',
    startTime: '17:00',
    endTime: '20:00',
    status: 'booking_requested',
    proposalAmount: 70000,
    confirmedSaleAmount: 65000,
    assignedSalespersonId: 'usr-sales-fbd',
    assignedSalespersonName: 'Pooja Rawat (Faridabad Team)',
    createdBy: 'usr-sales-fbd',
  },
];

// Initial proposals
const initialProposals: Proposal[] = [
  {
    id: 'PROP-GUR-101',
    leadId: 'ZZ-GUR-1001',
    customerName: 'Aarav Malhotra',
    outletId: 'gurgaon',
    proposalAmount: 48000,
    discountAmount: 3000,
    revisedAmount: 45000,
    proposalDate: new Date(Date.now() - 3600000 * 20).toISOString().split('T')[0],
    status: 'Sent',
    nextFollowUpDate: todayStr,
    salespersonId: 'usr-sales-ggn',
    salespersonName: 'Rohit Verma (Gurgaon Team)',
    internalRemarks: 'Offered complimentary welcome drinks for kids.',
  },
  {
    id: 'PROP-FAR-201',
    leadId: 'ZZ-FAR-2001',
    customerName: 'Kabir Oberoi',
    outletId: 'faridabad',
    proposalAmount: 70000,
    discountAmount: 5000,
    revisedAmount: 65000,
    negotiationAmount: 62000,
    proposalDate: new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0],
    status: 'Negotiation',
    nextFollowUpDate: todayStr,
    salespersonId: 'usr-sales-fbd',
    salespersonName: 'Pooja Rawat (Faridabad Team)',
    internalRemarks: 'Client wants anchor inclusion in package.',
  },
];

// Initial meetings
const initialMeetings: Meeting[] = [
  {
    id: 'meet-1',
    leadId: 'ZZ-FAR-2002',
    customerName: 'Shalini Gupta',
    customerPhone: '+91 97711 22334',
    outletId: 'faridabad',
    meetingType: 'In-person meeting',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '11:00',
    durationMinutes: 45,
    assignedSalespersonId: 'usr-sales-fbd',
    assignedSalespersonName: 'Pooja Rawat (Faridabad Team)',
    location: 'ZigZagZoh Faridabad Center, Reception Desk',
    status: 'Scheduled',
    notes: 'Walkthrough of adventure equipment for school principal.',
    createdAt: new Date().toISOString(),
  },
];

// Initial notifications
const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'afternoon_due',
    title: 'Afternoon Follow-Up Queue Active',
    message: 'The 1:00 PM afternoon follow-up session is active. Please review your pending leads.',
    severity: 'medium',
    createdAt: new Date().toISOString(),
    read: false,
    resolved: false,
  },
  {
    id: 'notif-2',
    type: 'whatsapp_missing',
    title: 'WhatsApp Action Missing',
    message: 'Lead ZZ-GUR-1002 (Meera Singhania) requires WhatsApp outreach after missed call.',
    severity: 'medium',
    leadId: 'ZZ-GUR-1002',
    outletId: 'gurgaon',
    assignedUserId: 'usr-sales-ggn',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    resolved: false,
  },
];

// Initial audit logs
const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    timestamp: new Date().toISOString(),
    userId: 'usr-owner-1',
    userName: 'Supreme Ads Superadmin',
    userRole: 'supreme_ads_owner',
    action: 'System Initialized',
    category: 'settings',
    details: 'ZigZagZoh CRM database loaded with Gurgaon & Faridabad outlets.',
    outletId: 'all',
  },
];

function getInitialDatabase(): DatabaseSchema {
  return {
    users: defaultUsers,
    passwords: defaultPasswords,
    leads: initialLeads,
    remarks: initialRemarks,
    followUpTasks: initialTasks,
    whatsappActivities: [],
    slotDefinitions: defaultSlots,
    bookings: initialBookings,
    meetings: initialMeetings,
    proposals: initialProposals,
    notifications: initialNotifications,
    auditLogs: initialAuditLogs,
    sheetsConfig: {
      spreadsheetUrl: '',
      sheetName: 'Leads',
      autoSyncEnabled: false,
      syncIntervalMinutes: 30,
      columnMapping: {
        customerName: 'Name',
        mobileNumber: 'Phone',
        whatsAppNumber: 'WhatsApp',
        email: 'Email',
        outlet: 'Outlet',
        requirement: 'Requirement',
        budget: 'Budget',
        preferredDate: 'Date',
        leadSource: 'Source',
        notes: 'Notes',
      },
    },
    settings: {
      agencyName: 'Supreme Ads',
      brandName: 'ZigZagZoh',
      afternoonSessionHour: 13,
      eveningSessionHour: 19,
      escalationGraceMinutes: 60,
    },
  };
}

export function loadDatabase(): DatabaseSchema {
  if (dbCache) return dbCache;

  const targetFile = getDatabaseFilePath();

  // 1. Try reading existing database from targetFile (/tmp or data/db.json)
  if (fs.existsSync(targetFile)) {
    try {
      const raw = fs.readFileSync(targetFile, 'utf-8');
      dbCache = JSON.parse(raw);
      return dbCache!;
    } catch (err) {
      console.warn('Failed to parse active database file, checking default:', err);
    }
  }

  // 2. If target is in /tmp and doesn't exist yet, try copying from bundled DEFAULT_DB_FILE
  if (targetFile !== DEFAULT_DB_FILE && fs.existsSync(DEFAULT_DB_FILE)) {
    try {
      const raw = fs.readFileSync(DEFAULT_DB_FILE, 'utf-8');
      dbCache = JSON.parse(raw);
      saveDatabase(dbCache!);
      return dbCache!;
    } catch {}
  }

  // 3. Fallback to fresh initial database
  const initial = getInitialDatabase();
  dbCache = initial;
  saveDatabase(initial);
  return dbCache;
}

export function saveDatabase(data: DatabaseSchema): void {
  dbCache = data;

  try {
    const targetFile = getDatabaseFilePath();
    const targetDir = path.dirname(targetFile);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Safe atomic write
    const tempPath = `${targetFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, targetFile);
  } catch (err) {
    // Graceful in-memory fallback for read-only environments (e.g. AWS Lambda / Vercel without /tmp access)
    console.warn('[DB] Could not persist to disk, keeping changes in memory:', err);
  }
}

// Concurrency-safe atomic transaction runner
export async function withTransaction<T>(fn: (db: DatabaseSchema) => Promise<T> | T): Promise<T> {
  while (isWriting) {
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  isWriting = true;
  try {
    const db = loadDatabase();
    const result = await fn(db);
    saveDatabase(db);
    return result;
  } finally {
    isWriting = false;
  }
}
