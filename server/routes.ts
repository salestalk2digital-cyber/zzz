import express from 'express';
import type { Response } from 'express';
import { loadDatabase, saveDatabase, withTransaction } from './db.ts';
import {
  createSession,
  revokeSession,
  requireAuth,
  requireRoles,
  canAccessOutlet,
  type AuthenticatedRequest,
} from './auth.ts';
import type {
  Lead,
  FollowUpTask,
  RemarkEntry,
  WhatsAppActivity,
  SlotBooking,
  Meeting,
  Proposal,
  AuditLog,
  NotificationItem,
  OutletId,
  LeadStatus,
  FollowUpOutcome,
  User,
} from '../src/types/index.ts';

const router = express.Router();

// Helper to log audit events
function logAudit(
  user: User,
  action: string,
  category: AuditLog['category'],
  details: string,
  targetId?: string,
  outletId?: OutletId | 'all'
) {
  const db = loadDatabase();
  const entry: AuditLog = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    category,
    details,
    targetId,
    outletId: outletId || (user.outletId as OutletId | 'all') || 'all',
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 500) {
    db.auditLogs.pop();
  }
}

// ---------------- AUTH ROUTES ----------------

router.post('/auth/login', (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    res.status(400).json({ error: 'Username/email and password are required' });
    return;
  }

  const db = loadDatabase();
  const user = db.users.find(
    (u) =>
      (u.username.toLowerCase() === String(usernameOrEmail).toLowerCase().trim() ||
        u.email.toLowerCase() === String(usernameOrEmail).toLowerCase().trim()) &&
      u.active
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials or inactive account' });
    return;
  }

  const storedPassword = db.passwords[user.id];
  if (storedPassword && storedPassword !== password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = createSession(user.id);
  user.lastLogin = new Date().toISOString();
  saveDatabase(db);

  logAudit(user, 'User Logged In', 'auth', `User logged in from web client.`);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      outletId: user.outletId,
      phone: user.phone,
    },
  });
});

router.post('/auth/google', async (req, res) => {
  const { email, name, uid } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required from Google Auth' });
    return;
  }

  try {
    const result = await withTransaction((db) => {
      let user = db.users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase().trim()
      );

      if (!user) {
        // Auto-provision authorized account for the owner/client email
        const isOwnerEmail = email.toLowerCase() === 'sales.talk2digital@gmail.com' || email.toLowerCase() === 'owner@supremeads.com';
        const role = isOwnerEmail ? 'supreme_ads_owner' : 'client_admin';
        user = {
          id: `usr-g-${Date.now()}`,
          name: name || email.split('@')[0],
          username: email.split('@')[0],
          email: email.trim(),
          role: role as any,
          outletId: 'all',
          active: true,
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
      }

      user.lastLogin = new Date().toISOString();
      logAudit(user, 'User Logged In via Google Auth', 'auth', `Google SSO verified for ${user.email}`);
      const token = createSession(user.id);
      return { token, user };
    });

    res.json({
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        outletId: result.user.outletId,
        phone: result.user.phone,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

router.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    revokeSession(authHeader.substring(7));
  }
  if (req.user) {
    logAudit(req.user, 'User Logged Out', 'auth', 'User logged out.');
  }
  res.json({ success: true });
});

// Demo accounts for quick testing all 5 roles
router.get('/auth/demo-accounts', (req, res) => {
  const db = loadDatabase();
  const accounts = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    outletId: u.outletId,
    samplePassword: db.passwords[u.id] || 'password123',
  }));
  res.json({ accounts });
});

// ---------------- USERS & PERMISSIONS (Owner Only) ----------------

router.get('/users', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  // Filter sensitive fields
  const users = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    outletId: u.outletId,
    active: u.active,
    phone: u.phone,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));
  res.json({ users });
});

router.post('/users', requireAuth, requireRoles(['supreme_ads_owner']), async (req: AuthenticatedRequest, res) => {
  const { name, username, email, role, outletId, password, phone } = req.body;
  if (!name || !username || !email || !role || !password) {
    res.status(400).json({ error: 'Name, username, email, role, and password are required' });
    return;
  }

  const result = await withTransaction((db) => {
    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username already exists');
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already exists');
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      username: username.trim(),
      email: email.trim(),
      role,
      outletId: role === 'gurgaon_team' ? 'gurgaon' : role === 'faridabad_team' ? 'faridabad' : outletId || 'all',
      active: true,
      phone,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.passwords[newUser.id] = password;

    logAudit(req.user!, 'Created User Account', 'user_management', `Created ${role} account for ${name} (${username}).`, newUser.id);
    return newUser;
  });

  res.status(201).json({ user: result });
});

router.put('/users/:id', requireAuth, requireRoles(['supreme_ads_owner']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, role, outletId, active, phone, password } = req.body;

  const result = await withTransaction((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');

    if (name) user.name = name;
    if (role) user.role = role;
    if (outletId) user.outletId = outletId;
    if (active !== undefined) user.active = Boolean(active);
    if (phone !== undefined) user.phone = phone;
    if (password) db.passwords[user.id] = password;

    logAudit(req.user!, 'Updated User Account', 'user_management', `Updated account settings for ${user.name}.`, user.id);
    return user;
  });

  res.json({ user: result });
});

// ---------------- LEADS MANAGEMENT ----------------

// Helper: Calculate lead quality score
function computeLeadQuality(lead: Partial<Lead>): { score: number; band: 'High' | 'Medium' | 'Low' } {
  let score = 0;
  // 1. Valid contact information (20 pts)
  if (lead.mobileNumber && lead.mobileNumber.replace(/\D/g, '').length >= 10) score += 20;
  // 2. Requirement identified (15 pts)
  if (lead.requirement && lead.requirement.trim().length > 5) score += 15;
  // 3. Customer engaged/responded (15 pts)
  if (lead.firstContactAttempted || lead.whatsAppNumber || (lead.followUpSequenceCount && lead.followUpSequenceCount > 0)) score += 15;
  // 4. Budget / commercial fit established (15 pts)
  if (lead.budget && lead.budget > 0) score += 15;
  // 5. Purchase intent demonstrated (20 pts)
  if (['Proposal Sent', 'Negotiation', 'Booking Requested', 'Converted / Booked', 'Meeting Scheduled'].includes(lead.status || '')) {
    score += 20;
  } else if (lead.expectedValue && lead.expectedValue > 0) {
    score += 10;
  }
  // 6. Timeline or preferred date established (15 pts)
  if (lead.preferredDate || lead.decisionTimeline) score += 15;

  let band: 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 80) band = 'High';
  else if (score >= 50) band = 'Medium';

  return { score, band };
}

router.get('/leads', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId, status, source, salespersonId, search, quality } = req.query;

  let leads = db.leads.filter((lead) => {
    // Role & Outlet isolation
    if (!canAccessOutlet(user, lead.outletId)) return false;

    // Filter by outlet if specified
    if (outletId && outletId !== 'all' && lead.outletId !== outletId) return false;

    // Outlet team member can view outlet leads
    if (status && lead.status !== status) return false;
    if (source && lead.leadSource !== source) return false;
    if (salespersonId && lead.assignedSalespersonId !== salespersonId) return false;
    if (quality && lead.qualityBand !== quality) return false;

    if (search) {
      const q = String(search).toLowerCase();
      const matches =
        lead.customerName.toLowerCase().includes(q) ||
        lead.mobileNumber.includes(q) ||
        lead.id.toLowerCase().includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q));
      if (!matches) return false;
    }

    return true;
  });

  // Sort descending by updated timestamp
  leads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ leads, total: leads.length });
});

router.get('/leads/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const lead = db.leads.find((l) => l.id === req.params.id);
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (!canAccessOutlet(req.user!, lead.outletId)) {
    res.status(403).json({ error: 'Forbidden: You do not have access to this outlet lead' });
    return;
  }

  const remarks = db.remarks.filter((r) => r.leadId === lead.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const tasks = db.followUpTasks.filter((t) => t.leadId === lead.id);
  const bookings = db.bookings.filter((b) => b.leadId === lead.id);
  const proposals = db.proposals.filter((p) => p.leadId === lead.id);
  const meetings = db.meetings.filter((m) => m.leadId === lead.id);
  const whatsappActivities = db.whatsappActivities.filter((w) => w.leadId === lead.id);

  res.json({
    lead,
    remarks,
    tasks,
    bookings,
    proposals,
    meetings,
    whatsappActivities,
  });
});

router.post('/leads', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const {
    customerName,
    mobileNumber,
    whatsAppNumber,
    email,
    outletId,
    requirement,
    leadSource,
    preferredDate,
    preferredSlot,
    budget,
    expectedValue,
    decisionTimeline,
    customerNotes,
    initialRemarks,
    assignedSalespersonId,
    nextFollowUpDate,
    nextFollowUpTime,
  } = req.body;

  if (!customerName || !mobileNumber || !outletId || !requirement || !leadSource) {
    res.status(400).json({ error: 'Customer name, mobile number, outlet, requirement, and source are required' });
    return;
  }

  if (!canAccessOutlet(user, outletId)) {
    res.status(403).json({ error: `You do not have permission to create leads for ${outletId}` });
    return;
  }

  try {
    const result = await withTransaction((db) => {
      // Duplicate detection
      const cleanPhone = mobileNumber.replace(/\D/g, '').slice(-10);
      const existing = db.leads.find((l) => l.mobileNumber.replace(/\D/g, '').slice(-10) === cleanPhone);

      // Find salesperson
      let assignedId = assignedSalespersonId;
      let assignedName = 'Unassigned';
      if (assignedId) {
        const rep = db.users.find((u) => u.id === assignedId);
        if (rep) assignedName = rep.name;
      } else {
        // Auto assign to available rep for this outlet
        const outletRep = db.users.find((u) => u.role === `${outletId}_team` as any && u.active);
        if (outletRep) {
          assignedId = outletRep.id;
          assignedName = outletRep.name;
        } else {
          assignedId = user.id;
          assignedName = user.name;
        }
      }

      // Generate Unique Lead ID
      const prefix = outletId === 'gurgaon' ? 'ZZ-GUR' : 'ZZ-FAR';
      const existingCount = db.leads.filter((l) => l.outletId === outletId).length;
      const leadId = `${prefix}-${1000 + existingCount + 1}`;

      const { score, band } = computeLeadQuality({
        mobileNumber,
        requirement,
        budget,
        expectedValue,
        preferredDate,
        decisionTimeline,
        status: 'New Lead',
        firstContactAttempted: false,
      });

      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      const newLead: Lead = {
        id: leadId,
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        whatsAppNumber: whatsAppNumber?.trim() || mobileNumber.trim(),
        email: email?.trim(),
        outletId,
        assignedSalespersonId: assignedId,
        assignedSalespersonName: assignedName,
        createdAt: nowIso,
        updatedAt: nowIso,
        leadSource,
        requirement: requirement.trim(),
        preferredDate,
        preferredSlot,
        budget: budget ? Number(budget) : undefined,
        expectedValue: expectedValue ? Number(expectedValue) : undefined,
        decisionTimeline,
        customerNotes,
        qualityScore: score,
        qualityBand: band,
        status: 'New Lead',
        nextFollowUpDate: nextFollowUpDate || today,
        nextFollowUpTime: nextFollowUpTime || '14:00',
        followUpOwnerId: assignedId,
        followUpSequenceCount: 0,
        whatsAppActionMissing: true,
        firstContactAttempted: false,
      };

      db.leads.unshift(newLead);

      // Add Remark 1 if initial remarks provided
      if (initialRemarks && initialRemarks.trim()) {
        const firstRemark: RemarkEntry = {
          id: `rem-${Date.now()}`,
          leadId,
          slotIndex: 1,
          remarkText: initialRemarks.trim(),
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          timestamp: nowIso,
          activityType: 'First Call',
          notes: 'Initial enquiry remarks recorded during lead creation',
        };
        db.remarks.push(firstRemark);
      }

      // Create initial follow-up task
      const task: FollowUpTask = {
        id: `task-${Date.now()}`,
        leadId,
        leadName: newLead.customerName,
        leadPhone: newLead.mobileNumber,
        leadStatus: 'New Lead',
        outletId,
        assignedToId: assignedId,
        assignedToName: assignedName,
        dueDate: nextFollowUpDate || today,
        dueTime: nextFollowUpTime || '14:00',
        session: (nextFollowUpTime && parseInt(nextFollowUpTime.split(':')[0]) >= 19) ? 'evening' : 'afternoon',
        sequenceNumber: 1,
        status: 'pending',
        whatsAppStatus: 'Not Started',
        lastRemarks: initialRemarks || 'New lead created — initial outreach required',
      };
      db.followUpTasks.unshift(task);

      // Create notification
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        type: 'new_lead',
        title: `New Lead: ${newLead.customerName}`,
        message: `New enquiry for ${outletId.toUpperCase()}: ${newLead.requirement.slice(0, 60)}...`,
        severity: 'low',
        leadId,
        outletId,
        assignedUserId: assignedId,
        createdAt: nowIso,
        read: false,
        resolved: false,
      };
      db.notifications.unshift(notif);

      logAudit(user, 'Created Lead', 'lead', `Lead ${leadId} (${newLead.customerName}) created for ${outletId}.`, leadId, outletId);

      return { lead: newLead, isDuplicate: !!existing, existingDuplicate: existing };
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/leads/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const updates = req.body;

  try {
    const result = await withTransaction((db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (!lead) throw new Error('Lead not found');

      if (!canAccessOutlet(user, lead.outletId)) {
        throw new Error('Forbidden: Outlet access denied');
      }

      // Validate conversion requirement
      if (updates.status === 'Converted / Booked') {
        if (!updates.finalAgreedAmount && !lead.finalAgreedAmount) {
          throw new Error('Final agreed amount is required before marking lead as Converted / Booked');
        }
        lead.actualConversionDate = new Date().toISOString();
      }

      // Validate lost reason
      if (updates.status === 'Lost / Closed') {
        if (!updates.lostReason && !lead.lostReason) {
          throw new Error('Lost reason is mandatory when marking a lead as Lost / Closed');
        }
      }

      // Audit status change
      if (updates.status && updates.status !== lead.status) {
        logAudit(
          user,
          'Lead Status Changed',
          'lead',
          `Changed status from "${lead.status}" to "${updates.status}"${updates.statusRemarks ? `: ${updates.statusRemarks}` : ''}`,
          lead.id,
          lead.outletId
        );
      }

      // Apply updates
      Object.assign(lead, updates, { updatedAt: new Date().toISOString() });

      // Recalculate quality score
      const quality = computeLeadQuality(lead);
      lead.qualityScore = quality.score;
      lead.qualityBand = quality.band;

      return lead;
    });

    res.json({ lead: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Check duplicate phone
router.post('/leads/check-duplicate', requireAuth, (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    res.json({ duplicate: false });
    return;
  }
  const clean = phone.replace(/\D/g, '').slice(-10);
  const db = loadDatabase();
  const existing = db.leads.find((l) => l.mobileNumber.replace(/\D/g, '').slice(-10) === clean);
  res.json({ duplicate: !!existing, existingLead: existing || null });
});

// ---------------- SEVEN REMARK SLOTS & TIMELINE ----------------

router.get('/leads/:id/remarks', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const lead = db.leads.find((l) => l.id === req.params.id);
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  if (!canAccessOutlet(req.user!, lead.outletId)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const remarks = db.remarks
    .filter((r) => r.leadId === lead.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json({ remarks });
});

router.post('/leads/:id/remarks', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { remarkText, activityType, outcome, notes, slotIndex } = req.body;

  if (!remarkText || !activityType) {
    res.status(400).json({ error: 'Remark text and activity type are required' });
    return;
  }

  try {
    const result = await withTransaction((db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (!lead) throw new Error('Lead not found');
      if (!canAccessOutlet(user, lead.outletId)) throw new Error('Access denied');

      const existingCount = db.remarks.filter((r) => r.leadId === lead.id).length;
      const assignedSlot = slotIndex || Math.min(existingCount + 1, 7);

      const newRemark: RemarkEntry = {
        id: `rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        leadId: lead.id,
        slotIndex: assignedSlot,
        remarkText: remarkText.trim(),
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        timestamp: new Date().toISOString(),
        activityType,
        outcome,
        notes,
      };

      db.remarks.push(newRemark);
      lead.updatedAt = new Date().toISOString();

      logAudit(user, 'Added Lead Remark', 'lead', `Added slot #${assignedSlot} remark (${activityType}): ${remarkText.slice(0, 50)}...`, lead.id, lead.outletId);

      return newRemark;
    });

    res.status(201).json({ remark: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- TWICE-DAILY FOLLOW-UP WORK SESSIONS ----------------

router.get('/followups/queue', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { session, outletId, status } = req.query; // 'afternoon' | 'evening'

  let tasks = db.followUpTasks.filter((t) => {
    if (!canAccessOutlet(user, t.outletId)) return false;
    if (outletId && outletId !== 'all' && t.outletId !== outletId) return false;
    if (session && t.session !== session) return false;
    if (status && t.status !== status) return false;
    return true;
  });

  // Sort by priority and due date
  tasks.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return (a.dueTime || '00:00').localeCompare(b.dueTime || '00:00');
  });

  res.json({ tasks, total: tasks.length });
});

router.post('/followups/:id/complete', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { outcome, notes, nextFollowUpDate, nextFollowUpTime, interestLevel, newStatus } = req.body;

  if (!outcome) {
    res.status(400).json({ error: 'A mandatory follow-up outcome (A through K) must be selected' });
    return;
  }

  try {
    const result = await withTransaction((db) => {
      const task = db.followUpTasks.find((t) => t.id === id);
      if (!task) throw new Error('Task not found');
      if (!canAccessOutlet(user, task.outletId)) throw new Error('Forbidden outlet access');

      const lead = db.leads.find((l) => l.id === task.leadId);
      if (!lead) throw new Error('Associated lead not found');

      const nowIso = new Date().toISOString();

      task.status = 'completed';
      task.completedAt = nowIso;
      task.completedOutcome = outcome;
      task.completedNotes = notes;

      // Update lead
      lead.updatedAt = nowIso;
      lead.followUpSequenceCount = (lead.followUpSequenceCount || 0) + 1;
      lead.firstContactAttempted = true;

      // Map outcome to lead status if appropriate
      if (outcome === 'Converted / Booked') {
        lead.status = 'Converted / Booked';
      } else if (outcome === 'Not Interested / Lost') {
        lead.status = 'Lost / Closed';
        lead.lostReason = notes || 'Customer declined further contact';
      } else if (outcome === 'Invalid / Spam') {
        lead.status = 'Invalid / Spam';
      } else if (outcome === 'Do Not Contact') {
        lead.doNotContact = true;
      } else if (outcome === 'Meeting / Video Call Required') {
        lead.status = 'Meeting Scheduled';
      } else if (outcome === 'Proposal / Price Discussion') {
        lead.status = 'Negotiation';
      } else if (newStatus) {
        lead.status = newStatus;
      } else {
        // Auto increment follow-up status
        if (lead.followUpSequenceCount === 1) lead.status = 'Follow-Up 1';
        else if (lead.followUpSequenceCount === 2) lead.status = 'Follow-Up 2';
        else if (lead.followUpSequenceCount >= 3) lead.status = 'Follow-Up 3';
      }

      // If follow-up required, schedule next task
      if (nextFollowUpDate && !['Converted / Booked', 'Not Interested / Lost', 'Invalid / Spam', 'Do Not Contact'].includes(outcome)) {
        lead.nextFollowUpDate = nextFollowUpDate;
        lead.nextFollowUpTime = nextFollowUpTime || '14:00';

        const nextHour = nextFollowUpTime ? parseInt(nextFollowUpTime.split(':')[0], 10) : 14;
        const nextSession = nextHour >= 19 ? 'evening' : 'afternoon';

        const nextTask: FollowUpTask = {
          id: `task-${Date.now()}`,
          leadId: lead.id,
          leadName: lead.customerName,
          leadPhone: lead.mobileNumber,
          leadStatus: lead.status,
          outletId: lead.outletId,
          assignedToId: lead.assignedSalespersonId,
          assignedToName: lead.assignedSalespersonName,
          dueDate: nextFollowUpDate,
          dueTime: nextFollowUpTime || '14:00',
          session: nextSession,
          sequenceNumber: lead.followUpSequenceCount + 1,
          status: 'pending',
          whatsAppStatus: 'Not Started',
          lastContactTimestamp: nowIso,
          lastRemarks: notes || `Previous outcome: ${outcome}`,
        };
        db.followUpTasks.push(nextTask);
      }

      // Add historical remark
      const remarkCount = db.remarks.filter((r) => r.leadId === lead.id).length;
      const remark: RemarkEntry = {
        id: `rem-${Date.now()}`,
        leadId: lead.id,
        slotIndex: Math.min(remarkCount + 1, 7),
        remarkText: notes || `Follow-up ${lead.followUpSequenceCount} completed with outcome: ${outcome}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        timestamp: nowIso,
        activityType: 'Follow-Up Call',
        outcome,
        notes,
      };
      db.remarks.push(remark);

      logAudit(user, 'Completed Follow-Up Task', 'followup', `Follow-up completed for ${lead.customerName}. Outcome: ${outcome}`, task.id, lead.outletId);

      return { task, lead, remark };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- WHATSAPP INTEGRATION & ACTIVITY TRACKING ----------------

router.post('/whatsapp/click', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { leadId, templateName, customText, session } = req.body;

  if (!leadId) {
    res.status(400).json({ error: 'leadId is required' });
    return;
  }

  try {
    const result = await withTransaction((db) => {
      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      if (!canAccessOutlet(user, lead.outletId)) throw new Error('Forbidden outlet access');

      const nowIso = new Date().toISOString();

      // Log click activity (CRITICAL: Clicks are NEVER recorded as verified sends!)
      const activity: WhatsAppActivity = {
        id: `wa-${Date.now()}`,
        leadId: lead.id,
        employeeId: user.id,
        employeeName: user.name,
        outletId: lead.outletId,
        customerPhone: lead.whatsAppNumber || lead.mobileNumber,
        customerName: lead.customerName,
        timestamp: nowIso,
        messageTemplate: templateName || 'New Lead Message',
        customMessageText: customText,
        relatedSession: session || 'ad_hoc',
        actionStatus: 'WhatsApp Button Clicked', // Clearly distinguish click from verified send
      };

      db.whatsappActivities.push(activity);

      // Lead no longer has missing action
      lead.whatsAppActionMissing = false;

      // Update any associated pending follow-up task
      const task = db.followUpTasks.find((t) => t.leadId === lead.id && t.status === 'pending');
      if (task) {
        task.whatsAppStatus = 'WhatsApp Button Clicked';
      }

      logAudit(user, 'WhatsApp Button Clicked', 'whatsapp', `Opened WhatsApp chat for ${lead.customerName} (${templateName}).`, activity.id, lead.outletId);

      return activity;
    });

    res.status(201).json({ activity: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/whatsapp/confirm-sent', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { leadId, activityId, notes } = req.body;

  try {
    const result = await withTransaction((db) => {
      const activity = db.whatsappActivities.find((a) => a.id === activityId) || db.whatsappActivities.filter((a) => a.leadId === leadId).pop();
      if (!activity) throw new Error('WhatsApp activity record not found');

      activity.actionStatus = 'Employee Confirmed Sent';
      activity.employeeNotes = notes;

      const lead = db.leads.find((l) => l.id === activity.leadId);
      if (lead) {
        lead.whatsAppActionMissing = false;
      }

      const task = db.followUpTasks.find((t) => t.leadId === activity.leadId && t.status === 'pending');
      if (task) {
        task.whatsAppStatus = 'Employee Confirmed Sent';
      }

      logAudit(user, 'WhatsApp Send Confirmed by Employee', 'whatsapp', `Employee manually confirmed send for ${activity.customerName}`, activity.id, activity.outletId);

      return activity;
    });

    res.json({ activity: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Official WhatsApp Webhook endpoint (for incoming status updates from WhatsApp Business Platform)
router.post('/whatsapp/webhook', async (req, res) => {
  // Webhook handler for official delivery / read receipts
  const body = req.body;
  try {
    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.statuses) {
      const statuses = body.entry[0].changes[0].value.statuses;
      await withTransaction((db) => {
        for (const s of statuses) {
          const phone = s.recipient_id;
          const status = s.status; // 'sent', 'delivered', 'read', 'failed'
          const act = db.whatsappActivities.find((w) => w.customerPhone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
          if (act) {
            if (status === 'read') act.actionStatus = 'Read — Verified';
            else if (status === 'delivered') act.actionStatus = 'Delivered — Verified';
            else if (status === 'sent') act.actionStatus = 'Sent — API Verified';
            else if (status === 'failed') act.actionStatus = 'Failed';
            act.verifiedTimestamp = new Date().toISOString();
          }
        }
      });
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

router.get('/whatsapp/compliance', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId } = req.query;

  const filteredTasks = db.followUpTasks.filter((t) => canAccessOutlet(user, t.outletId) && (!outletId || outletId === 'all' || t.outletId === outletId));
  const filteredActivities = db.whatsappActivities.filter((a) => canAccessOutlet(user, a.outletId) && (!outletId || outletId === 'all' || a.outletId === outletId));
  const filteredLeads = db.leads.filter((l) => canAccessOutlet(user, l.outletId) && (!outletId || outletId === 'all' || l.outletId === outletId));

  const totalTasks = filteredTasks.length;
  const missingActions = filteredLeads.filter((l) => l.whatsAppActionMissing && l.status !== 'Converted / Booked' && l.status !== 'Lost / Closed').length;
  const clicks = filteredActivities.filter((a) => a.actionStatus === 'WhatsApp Button Clicked').length;
  const employeeConfirmed = filteredActivities.filter((a) => a.actionStatus === 'Employee Confirmed Sent').length;
  const apiVerified = filteredActivities.filter((a) => ['Sent — API Verified', 'Delivered — Verified', 'Read — Verified'].includes(a.actionStatus)).length;
  const failed = filteredActivities.filter((a) => a.actionStatus === 'Failed').length;

  res.json({
    totalTasks,
    missingActions,
    clicks,
    employeeConfirmed,
    apiVerified,
    failed,
    recentActivities: filteredActivities.slice(-20).reverse(),
  });
});

// ---------------- SLOT CALENDAR & CONCURRENCY-SAFE BOOKING ----------------

router.get('/slots/definitions', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId } = req.query;

  const slots = db.slotDefinitions.filter((s) => canAccessOutlet(user, s.outletId) && (!outletId || outletId === 'all' || s.outletId === outletId));
  res.json({ slots });
});

router.get('/slots/availability', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { date, outletId } = req.query;

  if (!date || !outletId) {
    res.status(400).json({ error: 'date (YYYY-MM-DD) and outletId are required' });
    return;
  }

  if (!canAccessOutlet(user, outletId as OutletId)) {
    res.status(403).json({ error: 'Access denied for this outlet' });
    return;
  }

  const slotDefs = db.slotDefinitions.filter((s) => s.outletId === outletId && s.isActive);
  const bookingsForDate = db.bookings.filter((b) => b.outletId === outletId && b.date === date);

  const availability = slotDefs.map((def) => {
    const slotBookings = bookingsForDate.filter((b) => b.slotDefinitionId === def.id && b.status !== 'cancelled');
    const confirmedBooking = slotBookings.find((b) => b.status === 'confirmed');
    const pendingRequest = slotBookings.find((b) => b.status === 'booking_requested');
    const interestedLeads = slotBookings.filter((b) => b.status === 'interested');

    let slotState: 'available' | 'interested' | 'booking_requested' | 'confirmed' = 'available';
    if (confirmedBooking) slotState = 'confirmed';
    else if (pendingRequest) slotState = 'booking_requested';
    else if (interestedLeads.length > 0) slotState = 'interested';

    return {
      slotDefinition: def,
      status: slotState,
      confirmedBooking: confirmedBooking || null,
      pendingRequest: pendingRequest || null,
      interestedLeadsCount: interestedLeads.length,
      interestedLeads,
    };
  });

  res.json({ date, outletId, availability });
});

// Concurrency-Safe Booking Confirmation
router.post('/slots/confirm-booking', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { bookingId, leadId, outletId, date, slotDefinitionId, confirmedSaleAmount, notes } = req.body;

  try {
    const result = await withTransaction((db) => {
      // 1. Double check outlet access
      if (!canAccessOutlet(user, outletId)) {
        throw new Error(`Unauthorized outlet confirmation`);
      }

      // 2. CONCURRENCY SAFETY CHECK: Ensure no other booking is already confirmed for this slot on this date!
      const existingConfirmed = db.bookings.find(
        (b) =>
          b.outletId === outletId &&
          b.date === date &&
          b.slotDefinitionId === slotDefinitionId &&
          b.status === 'confirmed' &&
          b.id !== bookingId
      );

      if (existingConfirmed) {
        throw new Error('Slot already booked. Please select another available slot.');
      }

      const slotDef = db.slotDefinitions.find((s) => s.id === slotDefinitionId);
      if (!slotDef) throw new Error('Slot definition not found');

      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      const nowIso = new Date().toISOString();

      let booking: SlotBooking;
      if (bookingId) {
        const existingBooking = db.bookings.find((b) => b.id === bookingId);
        if (!existingBooking) throw new Error('Booking record not found');
        booking = existingBooking;
      } else {
        booking = {
          id: `book-${Date.now()}`,
          leadId: lead.id,
          customerName: lead.customerName,
          customerPhone: lead.mobileNumber,
          outletId,
          date,
          slotDefinitionId,
          slotName: slotDef.name,
          startTime: slotDef.startTime,
          endTime: slotDef.endTime,
          status: 'confirmed',
          assignedSalespersonId: lead.assignedSalespersonId,
          assignedSalespersonName: lead.assignedSalespersonName,
          createdBy: user.id,
        };
        db.bookings.push(booking);
      }

      booking.status = 'confirmed';
      booking.confirmedSaleAmount = confirmedSaleAmount ? Number(confirmedSaleAmount) : lead.expectedSaleValue || 0;
      booking.confirmedBy = user.name;
      booking.confirmedAt = nowIso;
      booking.notes = notes;

      // Update lead
      lead.status = 'Converted / Booked';
      lead.actualConversionDate = nowIso;
      lead.finalAgreedAmount = booking.confirmedSaleAmount;
      lead.preferredDate = date;
      lead.preferredSlot = slotDef.name;
      lead.updatedAt = nowIso;

      // Historical remark
      const remarkCount = db.remarks.filter((r) => r.leadId === lead.id).length;
      db.remarks.push({
        id: `rem-${Date.now()}`,
        leadId: lead.id,
        slotIndex: Math.min(remarkCount + 1, 7),
        remarkText: `Slot officially confirmed & booked for ${date} (${slotDef.name}). Amount: ₹${booking.confirmedSaleAmount?.toLocaleString()}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        timestamp: nowIso,
        activityType: 'Booking Discussion',
        outcome: 'Converted / Booked',
      });

      logAudit(user, 'Confirmed Slot Booking', 'booking', `Confirmed booking #${booking.id} on ${date} for ${lead.customerName} at ${outletId}`, booking.id, outletId);

      return { booking, lead };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Express Interest in slot
router.post('/slots/express-interest', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { leadId, outletId, date, slotDefinitionId, notes } = req.body;

  try {
    const result = await withTransaction((db) => {
      if (!canAccessOutlet(user, outletId)) throw new Error('Unauthorized outlet access');

      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      const slotDef = db.slotDefinitions.find((s) => s.id === slotDefinitionId);
      if (!slotDef) throw new Error('Slot definition not found');

      // Check if already interested
      const existing = db.bookings.find(
        (b) => b.leadId === leadId && b.date === date && b.slotDefinitionId === slotDefinitionId && b.status !== 'cancelled'
      );
      if (existing) {
        return existing;
      }

      const booking: SlotBooking = {
        id: `book-${Date.now()}`,
        leadId: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.mobileNumber,
        outletId,
        date,
        slotDefinitionId,
        slotName: slotDef.name,
        startTime: slotDef.startTime,
        endTime: slotDef.endTime,
        status: 'interested',
        proposalAmount: lead.proposalAmount,
        assignedSalespersonId: lead.assignedSalespersonId,
        assignedSalespersonName: lead.assignedSalespersonName,
        createdBy: user.id,
        notes,
      };

      db.bookings.push(booking);
      lead.preferredDate = date;
      lead.preferredSlot = slotDef.name;
      lead.status = 'Interested — Future Date';
      lead.updatedAt = new Date().toISOString();

      logAudit(user, 'Customer Expressed Interest in Slot', 'booking', `${lead.customerName} expressed interest in ${date} ${slotDef.name}`, booking.id, outletId);

      return booking;
    });

    res.status(201).json({ booking: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel Booking
router.post('/slots/cancel-booking', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { bookingId, cancellationReason } = req.body;

  if (!cancellationReason) {
    res.status(400).json({ error: 'Cancellation reason is required' });
    return;
  }

  try {
    const result = await withTransaction((db) => {
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');
      if (!canAccessOutlet(user, booking.outletId)) throw new Error('Unauthorized outlet access');

      booking.status = 'cancelled';
      booking.cancelledBy = user.name;
      booking.cancelledAt = new Date().toISOString();
      booking.cancellationReason = cancellationReason;

      logAudit(user, 'Cancelled Booking', 'booking', `Cancelled booking ${booking.id} for ${booking.customerName}. Reason: ${cancellationReason}`, booking.id, booking.outletId);

      return booking;
    });

    res.json({ booking: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- MEETINGS & VIDEO CALLS ----------------

router.get('/meetings', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId } = req.query;

  const meetings = db.meetings.filter((m) => canAccessOutlet(user, m.outletId) && (!outletId || outletId === 'all' || m.outletId === outletId));
  meetings.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  res.json({ meetings });
});

router.post('/meetings', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { leadId, meetingType, date, time, durationMinutes, location, meetingLink, notes } = req.body;

  try {
    const result = await withTransaction((db) => {
      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      if (!canAccessOutlet(user, lead.outletId)) throw new Error('Forbidden outlet access');

      const meeting: Meeting = {
        id: `meet-${Date.now()}`,
        leadId: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.mobileNumber,
        outletId: lead.outletId,
        meetingType,
        date,
        time,
        durationMinutes: Number(durationMinutes) || 45,
        location,
        meetingLink,
        notes,
        status: 'Scheduled',
        assignedSalespersonId: lead.assignedSalespersonId,
        assignedSalespersonName: lead.assignedSalespersonName,
        createdAt: new Date().toISOString(),
      };

      db.meetings.push(meeting);
      lead.status = meetingType === 'Video call' ? 'Video Call Scheduled' : 'Meeting Scheduled';
      lead.updatedAt = new Date().toISOString();

      logAudit(user, 'Scheduled Meeting', 'lead', `Scheduled ${meetingType} with ${lead.customerName} on ${date} at ${time}`, meeting.id, lead.outletId);

      return meeting;
    });

    res.status(201).json({ meeting: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- PROPOSALS & NEGOTIATIONS ----------------

router.get('/proposals', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId } = req.query;

  const proposals = db.proposals.filter((p) => canAccessOutlet(user, p.outletId) && (!outletId || outletId === 'all' || p.outletId === outletId));
  res.json({ proposals });
});

router.post('/proposals', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { leadId, proposalAmount, discountAmount, revisedAmount, internalRemarks, nextFollowUpDate, status } = req.body;

  try {
    const result = await withTransaction((db) => {
      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      if (!canAccessOutlet(user, lead.outletId)) throw new Error('Forbidden outlet access');

      const propCount = db.proposals.filter((p) => p.outletId === lead.outletId).length;
      const propId = `PROP-${lead.outletId === 'gurgaon' ? 'GUR' : 'FAR'}-${100 + propCount + 1}`;

      const proposal: Proposal = {
        id: propId,
        leadId: lead.id,
        customerName: lead.customerName,
        outletId: lead.outletId,
        proposalAmount: Number(proposalAmount) || 0,
        discountAmount: Number(discountAmount) || 0,
        revisedAmount: Number(revisedAmount) || (Number(proposalAmount) - Number(discountAmount)),
        proposalDate: new Date().toISOString().split('T')[0],
        status: status || 'Sent',
        nextFollowUpDate,
        salespersonId: lead.assignedSalespersonId,
        salespersonName: lead.assignedSalespersonName,
        internalRemarks,
        history: [
          {
            timestamp: new Date().toISOString(),
            action: 'Proposal Created & Sent',
            user: user.name,
            amount: Number(revisedAmount) || Number(proposalAmount),
          },
        ],
      };

      db.proposals.push(proposal);
      lead.proposalAmount = proposal.proposalAmount;
      lead.discountAmount = proposal.discountAmount;
      lead.expectedSaleValue = proposal.revisedAmount;
      lead.status = 'Proposal Sent';
      lead.updatedAt = new Date().toISOString();

      logAudit(user, 'Created Proposal', 'proposal', `Proposal ${propId} generated for ${lead.customerName}: ₹${proposal.revisedAmount.toLocaleString()}`, propId, lead.outletId);

      return proposal;
    });

    res.status(201).json({ proposal: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/proposals/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { negotiationAmount, finalAgreedAmount, status, internalRemarks } = req.body;

  try {
    const result = await withTransaction((db) => {
      const proposal = db.proposals.find((p) => p.id === id);
      if (!proposal) throw new Error('Proposal not found');
      if (!canAccessOutlet(user, proposal.outletId)) throw new Error('Forbidden outlet access');

      if (negotiationAmount !== undefined) proposal.negotiationAmount = Number(negotiationAmount);
      if (finalAgreedAmount !== undefined) proposal.finalAgreedAmount = Number(finalAgreedAmount);
      if (status) proposal.status = status;
      if (internalRemarks) proposal.internalRemarks = internalRemarks;

      proposal.history = proposal.history || [];
      proposal.history.push({
        timestamp: new Date().toISOString(),
        action: `Status updated to ${status || proposal.status}`,
        user: user.name,
        amount: finalAgreedAmount || negotiationAmount || proposal.revisedAmount,
      });

      const lead = db.leads.find((l) => l.id === proposal.leadId);
      if (lead) {
        if (negotiationAmount) lead.negotiationAmount = Number(negotiationAmount);
        if (finalAgreedAmount) lead.finalAgreedAmount = Number(finalAgreedAmount);
        if (status === 'Accepted') lead.status = 'Booking Requested';
        else if (status === 'Negotiation') lead.status = 'Negotiation';
        lead.updatedAt = new Date().toISOString();
      }

      logAudit(user, 'Updated Proposal', 'proposal', `Proposal ${proposal.id} updated to status ${proposal.status}`, proposal.id, proposal.outletId);

      return proposal;
    });

    res.json({ proposal: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------- SALESPERSON PERFORMANCE METER ----------------

router.get('/performance', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { period, outletId } = req.query; // 'today' | 'this_week' | 'this_month'

  const reps = db.users.filter((u) => ['gurgaon_team', 'faridabad_team', 'manager'].includes(u.role) && u.active);

  const scorecards = reps
    .filter((rep) => canAccessOutlet(user, (rep.outletId as OutletId) || 'gurgaon') && (!outletId || outletId === 'all' || rep.outletId === outletId))
    .map((rep) => {
      const assignedLeads = db.leads.filter((l) => l.assignedSalespersonId === rep.id);
      const followUps = db.followUpTasks.filter((t) => t.assignedToId === rep.id);
      const activities = db.whatsappActivities.filter((a) => a.employeeId === rep.id);
      const meetings = db.meetings.filter((m) => m.assignedSalespersonId === rep.id);
      const proposals = db.proposals.filter((p) => p.salespersonId === rep.id);
      const converted = assignedLeads.filter((l) => l.status === 'Converted / Booked');

      const followUpsDue = followUps.length;
      const completedOnTime = followUps.filter((t) => t.status === 'completed').length;
      const missed = followUps.filter((t) => t.status === 'missed').length;

      // Rubric computation
      // 1. Follow-up completion on time (max 30 pts)
      const followUpScore = followUpsDue > 0 ? Math.round((completedOnTime / followUpsDue) * 30) : 30;

      // 2. Timely first contact on assigned leads (max 20 pts)
      const contacted = assignedLeads.filter((l) => l.firstContactAttempted).length;
      const firstContactScore = assignedLeads.length > 0 ? Math.round((contacted / assignedLeads.length) * 20) : 20;

      // 3. Activity logging & remarks (max 15 pts)
      const remarksLogged = db.remarks.filter((r) => r.authorId === rep.id).length;
      const remarksScore = Math.min(15, Math.round((remarksLogged / (assignedLeads.length || 1)) * 15));

      // 4. Customer communication tasks (max 15 pts)
      const waClicks = activities.length;
      const commsScore = Math.min(15, Math.round((waClicks / (followUpsDue || 1)) * 15));

      // 5. Meeting and next-action management (max 10 pts)
      const meetingsScore = Math.min(10, meetings.length * 5);

      // 6. CRM data accuracy (max 10 pts)
      const accurateLeads = assignedLeads.filter((l) => !l.whatsAppActionMissing && l.nextFollowUpDate).length;
      const accuracyScore = assignedLeads.length > 0 ? Math.round((accurateLeads / assignedLeads.length) * 10) : 10;

      const totalScore = Math.min(100, followUpScore + firstContactScore + remarksScore + commsScore + meetingsScore + accuracyScore);

      const confirmedSalesValue = converted.reduce((sum, l) => sum + (l.finalAgreedAmount || l.expectedSaleValue || 0), 0);

      return {
        userId: rep.id,
        userName: rep.name,
        role: rep.role,
        outletId: (rep.outletId as OutletId) || 'gurgaon',
        period: (period as any) || 'this_month',
        totalScore,
        breakdown: {
          followUpCompletionOnTime: followUpScore,
          timelyFirstContact: firstContactScore,
          activityLoggingRemarks: remarksScore,
          customerCommunicationTasks: commsScore,
          meetingAndNextActions: meetingsScore,
          crmDataAccuracy: accuracyScore,
        },
        metrics: {
          assignedLeads: assignedLeads.length,
          followUpsDue,
          followUpsCompletedOnTime: completedOnTime,
          followUpsMissed: missed,
          whatsAppClicks: activities.filter((a) => a.actionStatus === 'WhatsApp Button Clicked').length,
          whatsAppVerifiedSends: activities.filter((a) => a.actionStatus.includes('Verified')).length,
          whatsAppPendingVerification: activities.filter((a) => a.actionStatus === 'Employee Confirmed Sent').length,
          meetingsCompleted: meetings.filter((m) => m.status === 'Completed').length,
          proposalsSent: proposals.length,
          convertedLeads: converted.length,
          confirmedSalesValue,
        },
      };
    });

  res.json({ scorecards });
});

// ---------------- ANALYTICS & CONVERSION METRICS ----------------

router.get('/analytics', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId, dateRange } = req.query; // 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'all'

  const leads = db.leads.filter((l) => canAccessOutlet(user, l.outletId) && (!outletId || outletId === 'all' || l.outletId === outletId));
  const tasks = db.followUpTasks.filter((t) => canAccessOutlet(user, t.outletId) && (!outletId || outletId === 'all' || t.outletId === outletId));
  const bookings = db.bookings.filter((b) => canAccessOutlet(user, b.outletId) && (!outletId || outletId === 'all' || b.outletId === outletId));
  const proposals = db.proposals.filter((p) => canAccessOutlet(user, p.outletId) && (!outletId || outletId === 'all' || p.outletId === outletId));
  const activities = db.whatsappActivities.filter((a) => canAccessOutlet(user, a.outletId) && (!outletId || outletId === 'all' || a.outletId === outletId));
  const meetings = db.meetings.filter((m) => canAccessOutlet(user, m.outletId) && (!outletId || outletId === 'all' || m.outletId === outletId));

  const totalLeads = leads.length;
  const newLeadsToday = leads.filter((l) => l.createdAt.split('T')[0] === new Date().toISOString().split('T')[0]).length;
  const uncontactedLeads = leads.filter((l) => !l.firstContactAttempted).length;

  const followUpsDueToday = tasks.filter((t) => t.dueDate === new Date().toISOString().split('T')[0] && t.status === 'pending').length;
  const overdueFollowUps = tasks.filter((t) => t.dueDate < new Date().toISOString().split('T')[0] && t.status === 'pending').length;

  const afternoonCompleted = tasks.filter((t) => t.session === 'afternoon' && t.status === 'completed').length;
  const eveningCompleted = tasks.filter((t) => t.session === 'evening' && t.status === 'completed').length;

  const whatsAppMissing = leads.filter((l) => l.whatsAppActionMissing && l.status !== 'Converted / Booked' && l.status !== 'Lost / Closed').length;
  const messagesVerified = activities.filter((a) => a.actionStatus.includes('Verified')).length;

  const meetingsScheduled = meetings.filter((m) => m.status === 'Scheduled' || m.status === 'Confirmed').length;
  const proposalsSent = proposals.filter((p) => p.status === 'Sent' || p.status === 'Under Discussion' || p.status === 'Negotiation').length;
  const negotiationsInProgress = leads.filter((l) => l.status === 'Negotiation').length;

  const convertedLeads = leads.filter((l) => l.status === 'Converted / Booked').length;
  const lostLeads = leads.filter((l) => l.status === 'Lost / Closed').length;

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const interestedBookings = bookings.filter((b) => b.status === 'interested').length;

  // Financial segregated totals
  const totalProposalValue = proposals.reduce((acc, p) => acc + (p.proposalAmount || 0), 0);
  const totalNegotiationValue = leads.filter((l) => l.status === 'Negotiation').reduce((acc, l) => acc + (l.negotiationAmount || l.expectedSaleValue || 0), 0);
  const confirmedSalesValue = leads.filter((l) => l.status === 'Converted / Booked').reduce((acc, l) => acc + (l.finalAgreedAmount || l.expectedSaleValue || 0), 0);

  // Exact formulas requested:
  const firstContactRate = totalLeads > 0 ? Math.round(((totalLeads - uncontactedLeads) / totalLeads) * 100) : 0;
  const followUpComplianceRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100) : 100;
  const leadConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // Slot utilization: Booked / Total slots for last 30 days
  const totalSlotsCapacity = db.slotDefinitions.length * 30; // 3 slots * 2 outlets * 30 days = 180 slots approx
  const slotUtilizationRate = totalSlotsCapacity > 0 ? Math.round((confirmedBookings / totalSlotsCapacity) * 100) : 0;

  // Gurgaon vs Faridabad breakdown
  const gurgaonLeads = db.leads.filter((l) => l.outletId === 'gurgaon');
  const faridabadLeads = db.leads.filter((l) => l.outletId === 'faridabad');

  const outletComparison = {
    gurgaon: {
      totalLeads: gurgaonLeads.length,
      converted: gurgaonLeads.filter((l) => l.status === 'Converted / Booked').length,
      conversionRate: gurgaonLeads.length > 0 ? Math.round((gurgaonLeads.filter((l) => l.status === 'Converted / Booked').length / gurgaonLeads.length) * 100) : 0,
      confirmedBookings: db.bookings.filter((b) => b.outletId === 'gurgaon' && b.status === 'confirmed').length,
      salesValue: gurgaonLeads.filter((l) => l.status === 'Converted / Booked').reduce((s, l) => s + (l.finalAgreedAmount || l.expectedSaleValue || 0), 0),
      overdueFollowUps: db.followUpTasks.filter((t) => t.outletId === 'gurgaon' && t.status === 'pending' && t.dueDate < new Date().toISOString().split('T')[0]).length,
    },
    faridabad: {
      totalLeads: faridabadLeads.length,
      converted: faridabadLeads.filter((l) => l.status === 'Converted / Booked').length,
      conversionRate: faridabadLeads.length > 0 ? Math.round((faridabadLeads.filter((l) => l.status === 'Converted / Booked').length / faridabadLeads.length) * 100) : 0,
      confirmedBookings: db.bookings.filter((b) => b.outletId === 'faridabad' && b.status === 'confirmed').length,
      salesValue: faridabadLeads.filter((l) => l.status === 'Converted / Booked').reduce((s, l) => s + (l.finalAgreedAmount || l.expectedSaleValue || 0), 0),
      overdueFollowUps: db.followUpTasks.filter((t) => t.outletId === 'faridabad' && t.status === 'pending' && t.dueDate < new Date().toISOString().split('T')[0]).length,
    },
  };

  // Pipeline funnel stages
  const pipeline = [
    { stage: 'New Lead', count: leads.filter((l) => l.status === 'New Lead').length },
    { stage: 'Contact Attempted', count: leads.filter((l) => l.status === 'Contact Attempted' || l.status === 'Connected').length },
    { stage: 'Follow-Up Active', count: leads.filter((l) => ['Follow-Up 1', 'Follow-Up 2', 'Follow-Up 3'].includes(l.status)).length },
    { stage: 'Meeting Scheduled', count: leads.filter((l) => l.status === 'Meeting Scheduled' || l.status === 'Video Call Scheduled').length },
    { stage: 'Proposal Sent', count: leads.filter((l) => l.status === 'Proposal Sent' || l.status === 'Proposal Pending').length },
    { stage: 'Negotiation', count: leads.filter((l) => l.status === 'Negotiation').length },
    { stage: 'Booking Requested', count: leads.filter((l) => l.status === 'Booking Requested' || l.status === 'Interested — Future Date').length },
    { stage: 'Converted / Booked', count: leads.filter((l) => l.status === 'Converted / Booked').length },
    { stage: 'Lost / Closed', count: leads.filter((l) => l.status === 'Lost / Closed' || l.status === 'Invalid / Spam').length },
  ];

  res.json({
    kpis: {
      totalLeads,
      newLeadsToday,
      uncontactedLeads,
      followUpsDueToday,
      overdueFollowUps,
      afternoonCompleted,
      eveningCompleted,
      whatsAppMissing,
      messagesVerified,
      meetingsScheduled,
      proposalsSent,
      negotiationsInProgress,
      convertedLeads,
      lostLeads,
      confirmedBookings,
      interestedBookings,
      totalProposalValue,
      totalNegotiationValue,
      confirmedSalesValue,
      followUpComplianceRate,
      firstContactRate,
      leadConversionRate,
      slotUtilizationRate,
    },
    outletComparison,
    pipeline,
    sheetsSyncStatus: db.sheetsConfig.lastSyncStatus || 'idle',
    lastSyncTimestamp: db.sheetsConfig.lastSyncTimestamp,
  });
});

// ---------------- GOOGLE SHEETS IMPORT & AUTO-SYNC ----------------

router.get('/sheets/config', requireAuth, (req, res) => {
  const db = loadDatabase();
  res.json({ config: db.sheetsConfig });
});

router.put('/sheets/config', requireAuth, requireRoles(['supreme_ads_owner', 'client_admin']), async (req: AuthenticatedRequest, res) => {
  const { spreadsheetUrl, sheetName, autoSyncEnabled, syncIntervalMinutes, columnMapping } = req.body;

  const result = await withTransaction((db) => {
    db.sheetsConfig = {
      ...db.sheetsConfig,
      spreadsheetUrl: spreadsheetUrl || db.sheetsConfig.spreadsheetUrl,
      sheetName: sheetName || db.sheetsConfig.sheetName,
      autoSyncEnabled: autoSyncEnabled !== undefined ? Boolean(autoSyncEnabled) : db.sheetsConfig.autoSyncEnabled,
      syncIntervalMinutes: Number(syncIntervalMinutes) || db.sheetsConfig.syncIntervalMinutes,
      columnMapping: columnMapping || db.sheetsConfig.columnMapping,
    };

    logAudit(req.user!, 'Updated Google Sheets Sync Config', 'sheets', `Updated Google Sheets sync settings for sheet: ${db.sheetsConfig.sheetName}`);
    return db.sheetsConfig;
  });

  res.json({ config: result });
});

// CSV parser helper
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let token = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        token += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(token.trim());
      token = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(token.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      token = '';
    } else {
      token += ch;
    }
  }

  if (token.length > 0 || row.length > 0) {
    row.push(token.trim());
    lines.push(row);
  }

  return lines;
}

// Preview CSV / Sheets Rows
router.post('/sheets/preview', requireAuth, async (req, res) => {
  const { csvData, spreadsheetUrl } = req.body;
  let rawText = csvData || '';

  if (!rawText && spreadsheetUrl) {
    // If user provided a public Google Sheet URL, convert to export CSV
    try {
      let exportUrl = spreadsheetUrl;
      if (spreadsheetUrl.includes('docs.google.com/spreadsheets/d/')) {
        const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
        }
      }
      const response = await fetch(exportUrl);
      if (response.ok) {
        rawText = await response.text();
      } else {
        res.status(400).json({ error: `Could not fetch Google Sheet. Status: ${response.status}. Please check permissions or upload CSV.` });
        return;
      }
    } catch (err: any) {
      res.status(400).json({ error: `Error fetching Google Sheet: ${err.message}` });
      return;
    }
  }

  if (!rawText) {
    res.status(400).json({ error: 'Please provide CSV content or a valid Google Spreadsheet URL' });
    return;
  }

  const rows = parseCSV(rawText);
  if (rows.length === 0) {
    res.status(400).json({ error: 'Spreadsheet has no rows' });
    return;
  }

  const headers = rows[0];
  const sampleRows = rows.slice(1, 11);

  res.json({
    headers,
    totalRows: rows.length - 1,
    sampleRows,
    csvRaw: rawText,
  });
});

// Import parsed rows into CRM leads
router.post('/sheets/import', requireAuth, requireRoles(['supreme_ads_owner', 'client_admin', 'manager']), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { csvRaw, columnMapping, defaultOutlet } = req.body;

  if (!csvRaw || !columnMapping) {
    res.status(400).json({ error: 'csvRaw and columnMapping are required' });
    return;
  }

  const rows = parseCSV(csvRaw);
  if (rows.length < 2) {
    res.status(400).json({ error: 'No data rows found in spreadsheet' });
    return;
  }

  const headers = rows[0];
  const headerIndex: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndex[h.trim().toLowerCase()] = idx;
  });

  const getCol = (row: string[], colName?: string): string => {
    if (!colName) return '';
    const idx = headerIndex[colName.trim().toLowerCase()];
    if (idx !== undefined && row[idx]) return row[idx].trim();
    return '';
  };

  try {
    const importStats = await withTransaction((db) => {
      let importedCount = 0;
      let updatedCount = 0;
      let duplicateCount = 0;
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = getCol(row, columnMapping.customerName);
        const phone = getCol(row, columnMapping.mobileNumber);
        const reqText = getCol(row, columnMapping.requirement) || 'General Play Enquiry';
        const rawOutlet = getCol(row, columnMapping.outlet).toLowerCase();

        let outlet: OutletId = 'gurgaon';
        if (rawOutlet.includes('faridabad') || rawOutlet.includes('fbd')) outlet = 'faridabad';
        else if (rawOutlet.includes('gurgaon') || rawOutlet.includes('ggn')) outlet = 'gurgaon';
        else if (defaultOutlet && (defaultOutlet === 'gurgaon' || defaultOutlet === 'faridabad')) outlet = defaultOutlet;

        if (!canAccessOutlet(user, outlet)) {
          continue; // skip unauthorized rows
        }

        if (!name || !phone) {
          errors.push(`Row ${i + 1}: Missing customer name or phone number`);
          continue;
        }

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length < 10) {
          errors.push(`Row ${i + 1}: Invalid phone number (${phone})`);
          continue;
        }

        // Duplicate check
        const existingLead = db.leads.find((l) => l.mobileNumber.replace(/\D/g, '').slice(-10) === cleanPhone);

        if (existingLead) {
          // Idempotent: Never overwrite CRM-managed status or remarks!
          duplicateCount++;
          existingLead.externalSheetRowId = `row-${i}`;
          continue;
        }

        // New Lead from Sheet
        const prefix = outlet === 'gurgaon' ? 'ZZ-GUR' : 'ZZ-FAR';
        const existingCount = db.leads.filter((l) => l.outletId === outlet).length;
        const leadId = `${prefix}-${1000 + existingCount + 1}`;

        const rep = db.users.find((u) => u.role === `${outlet}_team` as any && u.active);
        const assignedId = rep ? rep.id : user.id;
        const assignedName = rep ? rep.name : user.name;

        const nowIso = new Date().toISOString();
        const today = nowIso.split('T')[0];

        const newLead: Lead = {
          id: leadId,
          customerName: name,
          mobileNumber: phone,
          whatsAppNumber: getCol(row, columnMapping.whatsAppNumber) || phone,
          email: getCol(row, columnMapping.email),
          outletId: outlet,
          assignedSalespersonId: assignedId,
          assignedSalespersonName: assignedName,
          createdAt: nowIso,
          updatedAt: nowIso,
          leadSource: (getCol(row, columnMapping.leadSource) as any) || 'Website',
          requirement: reqText,
          budget: Number(getCol(row, columnMapping.budget)) || undefined,
          preferredDate: getCol(row, columnMapping.preferredDate),
          customerNotes: getCol(row, columnMapping.notes),
          qualityScore: 70,
          qualityBand: 'Medium',
          status: 'New Lead',
          nextFollowUpDate: today,
          nextFollowUpTime: '14:00',
          followUpOwnerId: assignedId,
          followUpSequenceCount: 0,
          whatsAppActionMissing: true,
          firstContactAttempted: false,
          externalSheetRowId: `row-${i}`,
        };

        db.leads.unshift(newLead);

        // Task for afternoon queue
        db.followUpTasks.push({
          id: `task-${Date.now()}-${i}`,
          leadId,
          leadName: name,
          leadPhone: phone,
          leadStatus: 'New Lead',
          outletId: outlet,
          assignedToId: assignedId,
          assignedToName: assignedName,
          dueDate: today,
          dueTime: '14:00',
          session: 'afternoon',
          sequenceNumber: 1,
          status: 'pending',
          whatsAppStatus: 'Not Started',
          lastRemarks: `Imported from Google Sheets row ${i}`,
        });

        importedCount++;
      }

      db.sheetsConfig.lastSyncTimestamp = new Date().toISOString();
      db.sheetsConfig.lastSyncStatus = 'success';
      db.sheetsConfig.lastImportedCount = importedCount;
      db.sheetsConfig.lastDuplicateCount = duplicateCount;

      logAudit(user, 'Google Sheets Data Imported', 'sheets', `Imported ${importedCount} leads, skipped ${duplicateCount} duplicates.`);

      return { importedCount, updatedCount, duplicateCount, errors };
    });

    res.json(importStats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- NOTIFICATIONS & AUDIT LOGS ----------------

router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const notifs = db.notifications.filter((n) => {
    if (n.outletId && !canAccessOutlet(user, n.outletId)) return false;
    return true;
  });
  res.json({ notifications: notifs.slice(0, 50) });
});

router.put('/notifications/:id/resolve', requireAuth, async (req, res) => {
  const { id } = req.params;
  const result = await withTransaction((db) => {
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      notif.resolved = true;
    }
    return notif;
  });
  res.json({ notification: result });
});

router.get('/audit-logs', requireAuth, requireRoles(['supreme_ads_owner', 'client_admin']), (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const user = req.user!;
  const { outletId, category } = req.query;

  let logs = db.auditLogs.filter((l) => {
    if (outletId && outletId !== 'all' && l.outletId !== 'all' && l.outletId !== outletId) return false;
    if (category && l.category !== category) return false;
    return true;
  });

  res.json({ logs: logs.slice(0, 100) });
});

// ---------------- SYSTEM SETTINGS (Owner Only) ----------------

router.get('/settings', requireAuth, (req, res) => {
  const db = loadDatabase();
  res.json({ settings: db.settings });
});

router.put('/settings', requireAuth, requireRoles(['supreme_ads_owner']), async (req: AuthenticatedRequest, res) => {
  const { whatsappApiToken, whatsappPhoneNumberId, afternoonSessionHour, eveningSessionHour, escalationGraceMinutes } = req.body;

  const result = await withTransaction((db) => {
    if (whatsappApiToken !== undefined) db.settings.whatsappApiToken = whatsappApiToken;
    if (whatsappPhoneNumberId !== undefined) db.settings.whatsappPhoneNumberId = whatsappPhoneNumberId;
    if (afternoonSessionHour !== undefined) db.settings.afternoonSessionHour = Number(afternoonSessionHour);
    if (eveningSessionHour !== undefined) db.settings.eveningSessionHour = Number(eveningSessionHour);
    if (escalationGraceMinutes !== undefined) db.settings.escalationGraceMinutes = Number(escalationGraceMinutes);

    logAudit(req.user!, 'Updated System Settings', 'settings', 'Updated agency and WhatsApp configuration.');
    return db.settings;
  });

  res.json({ settings: result });
});

export default router;
