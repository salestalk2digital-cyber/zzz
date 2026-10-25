export type OutletId = 'gurgaon' | 'faridabad';

export type UserRole =
  | 'supreme_ads_owner' // Role 1: Supreme Ads Owner (Full agency superadmin)
  | 'client_admin'      // Role 2: Client Admin (ZigZagZoh Admin for both outlets)
  | 'manager'           // Role 3: Manager (Assigned outlet(s))
  | 'gurgaon_team'      // Role 4: Gurgaon Team
  | 'faridabad_team';   // Role 5: Faridabad Team

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  outletId?: OutletId | 'all';
  active: boolean;
  phone?: string;
  createdAt: string;
  lastLogin?: string;
  assignedPassword?: string;
}

export type LeadStatus =
  | 'New Lead'
  | 'Contact Attempted'
  | 'Connected'
  | 'Follow-Up 1'
  | 'Follow-Up 2'
  | 'Follow-Up 3'
  | 'Meeting Scheduled'
  | 'Video Call Scheduled'
  | 'Proposal Pending'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Interested — Future Date'
  | 'Booking Requested'
  | 'Converted / Booked'
  | 'Lost / Closed'
  | 'Invalid / Spam';

export type LeadSource =
  | 'Meta Ads'
  | 'Google Ads'
  | 'Website'
  | 'WhatsApp'
  | 'Walk-in'
  | 'Referral'
  | 'Organic Social'
  | 'Existing Customer'
  | 'Other';

export type ActivityType =
  | 'First Call'
  | 'Follow-Up Call'
  | 'WhatsApp Action'
  | 'WhatsApp Reply'
  | 'Customer Requested Callback'
  | 'Meeting'
  | 'Video Call'
  | 'Proposal Discussion'
  | 'Negotiation'
  | 'Booking Discussion'
  | 'Other';

export type FollowUpOutcome =
  | 'Discussion Completed — Follow-Up Required'
  | 'No Answer — Follow-Up Required'
  | 'Discussion Ongoing'
  | 'Interested — Decision Pending'
  | 'Requested Callback'
  | 'Meeting / Video Call Required'
  | 'Proposal / Price Discussion'
  | 'Converted / Booked'
  | 'Not Interested / Lost'
  | 'Invalid / Spam'
  | 'Do Not Contact';

export interface RemarkEntry {
  id: string;
  leadId: string;
  slotIndex?: number; // 1 to 7 for the primary slots
  remarkText: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  timestamp: string;
  activityType: ActivityType;
  outcome?: FollowUpOutcome;
  notes?: string;
}

export type WhatsAppActionStatus =
  | 'Not Started'
  | 'Draft Prepared'
  | 'WhatsApp Button Clicked'
  | 'WhatsApp Opened'
  | 'Awaiting Send Confirmation'
  | 'Employee Confirmed Sent'
  | 'Sent — API Verified'
  | 'Delivered — Verified'
  | 'Read — Verified'
  | 'Failed'
  | 'Reply Received';

export interface WhatsAppActivity {
  id: string;
  leadId: string;
  followUpTaskId?: string;
  employeeId: string;
  employeeName: string;
  outletId: OutletId;
  customerPhone: string;
  customerName: string;
  timestamp: string;
  messageTemplate: string;
  customMessageText?: string;
  relatedSession?: 'afternoon' | 'evening' | 'ad_hoc';
  actionStatus: WhatsAppActionStatus;
  verifiedTimestamp?: string;
  employeeNotes?: string;
}

export interface Lead {
  id: string; // e.g. "ZZ-GUR-1001" or "ZZ-FAR-1002"
  customerName: string;
  mobileNumber: string;
  whatsAppNumber?: string;
  email?: string;
  outletId: OutletId;
  assignedSalespersonId: string;
  assignedSalespersonName: string;
  createdAt: string;
  updatedAt: string;
  leadSource: LeadSource;
  externalSheetRowId?: string;

  // Requirement
  requirement: string;
  preferredDate?: string;
  preferredSlot?: string;
  budget?: number;
  expectedValue?: number;
  decisionTimeline?: string;
  customerNotes?: string;

  // Sales Info
  qualityScore: number; // 0 - 100
  qualityBand: 'High' | 'Medium' | 'Low';
  qualityScoreOverrideReason?: string;
  qualityScoreOverrideBy?: string;
  status: LeadStatus;
  proposalAmount?: number;
  discountAmount?: number;
  expectedSaleValue?: number;
  negotiationAmount?: number;
  finalAgreedAmount?: number;
  expectedConversionDate?: string;
  actualConversionDate?: string;
  nextFollowUpDate?: string; // YYYY-MM-DD
  nextFollowUpTime?: string; // HH:mm
  followUpOwnerId?: string;
  followUpSequenceCount: number;
  lostReason?: string;
  convertedNotes?: string;

  // Compliance Flags
  whatsAppActionMissing?: boolean;
  firstContactAttempted?: boolean;
  firstContactTimestamp?: string;
  doNotContact?: boolean;
}

export interface FollowUpTask {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: LeadStatus;
  outletId: OutletId;
  assignedToId: string;
  assignedToName: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  session: 'afternoon' | 'evening'; // 1:00 PM session or 7:00 PM session
  sequenceNumber: number; // 1, 2, 3, etc.
  status: 'pending' | 'completed' | 'missed' | 'escalated';
  completedAt?: string;
  completedOutcome?: FollowUpOutcome;
  completedNotes?: string;
  whatsAppStatus: WhatsAppActionStatus;
  lastContactTimestamp?: string;
  lastRemarks?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  escalatedToManager?: boolean;
  escalatedToAdmin?: boolean;
}

export type SlotStatus =
  | 'available'
  | 'interested'
  | 'booking_requested'
  | 'confirmed_booked'
  | 'blocked';

export interface SlotDefinition {
  id: string;
  outletId: OutletId;
  name: string; // e.g. "Afternoon Slot (12:00 PM - 3:00 PM)"
  startTime: string; // "12:00"
  endTime: string;   // "15:00"
  isActive: boolean;
}

export interface SlotBooking {
  id: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  outletId: OutletId;
  date: string; // YYYY-MM-DD
  slotDefinitionId: string;
  slotName: string;
  startTime: string;
  endTime: string;
  status: 'interested' | 'booking_requested' | 'confirmed' | 'cancelled';
  proposalAmount?: number;
  confirmedSaleAmount?: number;
  assignedSalespersonId: string;
  assignedSalespersonName: string;
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
}

export interface Meeting {
  id: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  outletId: OutletId;
  meetingType: 'In-person meeting' | 'Video call' | 'Customer callback';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  assignedSalespersonId: string;
  assignedSalespersonName: string;
  meetingLink?: string;
  location?: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'No-show';
  notes?: string;
  outcome?: string;
  nextAction?: string;
  createdAt: string;
}

export interface Proposal {
  id: string; // e.g. "PROP-1001"
  leadId: string;
  customerName: string;
  outletId: OutletId;
  proposalAmount: number;
  discountAmount: number;
  revisedAmount: number;
  negotiationAmount?: number;
  finalAgreedAmount?: number;
  proposalDate: string;
  status:
    | 'Not Prepared'
    | 'In Preparation'
    | 'Sent'
    | 'Under Discussion'
    | 'Negotiation'
    | 'Accepted'
    | 'Rejected'
    | 'Expired';
  nextFollowUpDate?: string;
  salespersonId: string;
  salespersonName: string;
  internalRemarks?: string;
  items?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  history?: Array<{
    timestamp: string;
    action: string;
    user: string;
    amount: number;
  }>;
}

export interface NotificationItem {
  id: string;
  type:
    | 'new_lead'
    | 'afternoon_due'
    | 'evening_due'
    | 'overdue_followup'
    | 'whatsapp_missing'
    | 'whatsapp_unverified'
    | 'whatsapp_failed'
    | 'booking_requested'
    | 'booking_conflict'
    | 'meeting_today'
    | 'escalation'
    | 'sheets_sync_failed';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  leadId?: string;
  outletId?: OutletId;
  assignedUserId?: string;
  createdAt: string;
  read: boolean;
  resolved: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'auth' | 'lead' | 'followup' | 'booking' | 'proposal' | 'whatsapp' | 'sheets' | 'user_management' | 'settings';
  details: string;
  targetId?: string;
  outletId?: OutletId | 'all';
}

export interface GoogleSheetsSyncConfig {
  spreadsheetUrl: string;
  sheetName: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'success' | 'failed' | 'in_progress';
  lastImportedCount?: number;
  lastUpdatedCount?: number;
  lastDuplicateCount?: number;
  lastError?: string;
  columnMapping: {
    customerName: string;
    mobileNumber: string;
    whatsAppNumber?: string;
    email?: string;
    outlet: string;
    requirement: string;
    budget?: string;
    preferredDate?: string;
    leadSource?: string;
    notes?: string;
  };
}

export interface PerformanceScorecard {
  userId: string;
  userName: string;
  role: UserRole;
  outletId: OutletId;
  period: 'today' | 'this_week' | 'this_month';
  totalScore: number; // 0 - 100
  breakdown: {
    followUpCompletionOnTime: number; // max 30
    timelyFirstContact: number; // max 20
    activityLoggingRemarks: number; // max 15
    customerCommunicationTasks: number; // max 15
    meetingAndNextActions: number; // max 10
    crmDataAccuracy: number; // max 10
  };
  metrics: {
    assignedLeads: number;
    followUpsDue: number;
    followUpsCompletedOnTime: number;
    followUpsMissed: number;
    whatsAppClicks: number;
    whatsAppVerifiedSends: number;
    whatsAppPendingVerification: number;
    meetingsCompleted: number;
    proposalsSent: number;
    convertedLeads: number;
    confirmedSalesValue: number;
  };
  manualAdjustments?: number;
  adjustmentReason?: string;
}
