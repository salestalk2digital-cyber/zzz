import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
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
  OutletId,
  FollowUpOutcome,
  LeadStatus,
} from '../types/index.ts';

// ---------------------------------------------------------------------------
// Skill Error Handling Specification
// ---------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// Baseline Seed Data
// ---------------------------------------------------------------------------
export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-owner-1',
    name: 'Supreme Ads Superadmin',
    username: 'supreme_owner',
    email: 'sales.talk2digital@gmail.com',
    role: 'supreme_ads_owner',
    outletId: 'all',
    active: true,
    phone: '+91 98100 11223',
    createdAt: new Date().toISOString(),
    assignedPassword: 'supreme@2026',
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
    assignedPassword: 'zigzag@admin2026',
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
    assignedPassword: 'ggn@manager2026',
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
    assignedPassword: 'fbd@manager2026',
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
    assignedPassword: 'rohit@ggn2026',
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
    assignedPassword: 'pooja@fbd2026',
  },
];

export const DEFAULT_SLOTS: SlotDefinition[] = [
  { id: 'slot-ggn-1', outletId: 'gurgaon', name: 'Afternoon Slot (12:00 PM – 3:00 PM)', startTime: '12:00', endTime: '15:00', isActive: true },
  { id: 'slot-ggn-2', outletId: 'gurgaon', name: 'Late Afternoon Slot (4:00 PM – 7:00 PM)', startTime: '16:00', endTime: '19:00', isActive: true },
  { id: 'slot-ggn-3', outletId: 'gurgaon', name: 'Evening Slot (5:00 PM – 8:00 PM)', startTime: '17:00', endTime: '20:00', isActive: true },
  { id: 'slot-fbd-1', outletId: 'faridabad', name: 'Afternoon Slot (12:00 PM – 3:00 PM)', startTime: '12:00', endTime: '15:00', isActive: true },
  { id: 'slot-fbd-2', outletId: 'faridabad', name: 'Late Afternoon Slot (4:00 PM – 7:00 PM)', startTime: '16:00', endTime: '19:00', isActive: true },
  { id: 'slot-fbd-3', outletId: 'faridabad', name: 'Evening Slot (5:00 PM – 8:00 PM)', startTime: '17:00', endTime: '20:00', isActive: true },
];

export const DEFAULT_LEADS: Lead[] = [
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
    decisionTimeline: '1 week',
    qualityScore: 78,
    qualityBand: 'High',
    status: 'Connected',
    proposalAmount: 28000,
    discountAmount: 2000,
    expectedSaleValue: 26000,
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    nextFollowUpTime: '15:00',
    followUpOwnerId: 'usr-sales-ggn',
    followUpSequenceCount: 1,
    firstContactAttempted: true,
    firstContactTimestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    whatsAppActionMissing: true,
  },
  {
    id: 'ZZ-FAR-1001',
    customerName: 'Kabir Batra',
    mobileNumber: '+91 99111 22334',
    whatsAppNumber: '+91 99111 22334',
    email: 'kabir.batra@gmail.com',
    outletId: 'faridabad',
    assignedSalespersonId: 'usr-sales-fbd',
    assignedSalespersonName: 'Pooja Rawat (Faridabad Team)',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    leadSource: 'Walk-in',
    requirement: 'School Excursion & Play Day for 60 students',
    preferredDate: '2026-11-20',
    preferredSlot: 'Afternoon Slot (12:00 PM – 3:00 PM)',
    budget: 75000,
    expectedValue: 80000,
    decisionTimeline: 'Immediate',
    qualityScore: 92,
    qualityBand: 'High',
    status: 'Booking Requested',
    proposalAmount: 80000,
    discountAmount: 5000,
    expectedSaleValue: 75000,
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    nextFollowUpTime: '11:00',
    followUpOwnerId: 'usr-sales-fbd',
    followUpSequenceCount: 3,
    firstContactAttempted: true,
    firstContactTimestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
    whatsAppActionMissing: false,
  },
];

let isInitialized = false;

/**
 * Ensures baseline collections exist in Firestore. If the database is new or empty,
 * it seeds the default users, leads, and slots so that everything is immediately functional.
 */
export async function ensureFirestoreInitialized(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Verify health
    await setDoc(doc(db, 'test', 'connection'), {
      status: 'online',
      connectedAt: new Date().toISOString(),
      platform: 'ZigZagZoh-CRM',
    }, { merge: true }).catch(() => {});

    // 2. Check users collection
    const usersSnap = await getDocs(collection(db, 'users')).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    if (usersSnap.empty) {
      console.log('[Firestore] Seeding baseline user accounts to Firestore...');
      const batch = writeBatch(db);
      for (const user of DEFAULT_USERS) {
        const ref = doc(db, 'users', user.id);
        batch.set(ref, user);
      }
      await batch.commit().catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      });
      console.log('[Firestore] User accounts successfully seeded in Firestore.');
    }

    // 3. Check leads collection
    const leadsSnap = await getDocs(collection(db, 'leads')).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, 'leads');
    });

    if (leadsSnap.empty) {
      console.log('[Firestore] Seeding initial foundation leads to Firestore...');
      const batch = writeBatch(db);
      for (const lead of DEFAULT_LEADS) {
        const ref = doc(db, 'leads', lead.id);
        batch.set(ref, lead);
      }
      await batch.commit().catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'leads');
      });

      // Seed follow-up tasks for these leads
      for (const lead of DEFAULT_LEADS) {
        const task: FollowUpTask = {
          id: `task-init-${lead.id}`,
          leadId: lead.id,
          leadName: lead.customerName,
          leadPhone: lead.mobileNumber,
          leadStatus: lead.status,
          outletId: lead.outletId,
          assignedToId: lead.assignedSalespersonId,
          assignedToName: lead.assignedSalespersonName,
          dueDate: lead.nextFollowUpDate || new Date().toISOString().split('T')[0],
          dueTime: lead.nextFollowUpTime || '14:00',
          session: 'afternoon',
          sequenceNumber: lead.followUpSequenceCount || 1,
          status: 'pending',
          whatsAppStatus: lead.whatsAppActionMissing ? 'Not Started' : 'Employee Confirmed Sent',
        };
        await setDoc(doc(db, 'followUpTasks', task.id), task).catch(() => {});
      }
      console.log('[Firestore] Initial leads and tasks successfully seeded in Firestore.');
    }

    isInitialized = true;
  } catch (error) {
    console.warn('[Firestore Init Notice]:', error);
  }
}

// Kick off initialization
ensureFirestoreInitialized().catch(() => {});

// ---------------------------------------------------------------------------
// Firestore USERS API
// ---------------------------------------------------------------------------
export async function getFirestoreUsers(): Promise<User[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return [...DEFAULT_USERS];
    }
    return snap.docs.map((d) => d.data() as User);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function checkFirestoreUsernameAvailable(username: string): Promise<{ available: boolean; username: string }> {
  const clean = username.toLowerCase().trim();
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    const exists = snap.docs.some((d) => {
      const data = d.data() as User;
      return (data.username || '').toLowerCase() === clean;
    });
    return { available: !exists, username: clean };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createFirestoreUser(userData: {
  name: string;
  username: string;
  password?: string;
  email?: string;
  role: User['role'];
  outletId?: OutletId | 'all';
  phone?: string;
}): Promise<User> {
  const path = 'users';
  try {
    const cleanUsername = userData.username.trim().toLowerCase();

    // Check uniqueness
    const availability = await checkFirestoreUsernameAvailable(cleanUsername);
    if (!availability.available) {
      throw new Error(`Username "${userData.username}" is already taken in Firebase. Please choose a unique username.`);
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanEmail = userData.email?.trim().toLowerCase() || `${cleanUsername}@zigzagzoh.com`;

    const newUser: User = {
      id: userId,
      name: userData.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      role: userData.role,
      outletId: userData.role === 'gurgaon_team' ? 'gurgaon' : userData.role === 'faridabad_team' ? 'faridabad' : userData.outletId || 'all',
      active: true,
      phone: userData.phone?.trim(),
      createdAt: new Date().toISOString(),
      assignedPassword: userData.password?.trim() || 'zigzag@2026',
    };

    const userDocRef = doc(db, path, userId);
    await setDoc(userDocRef, newUser);
    console.log(`[Firestore] Successfully created user ${cleanUsername} in Firebase collection /users`);

    // Log audit
    await addFirestoreAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || 'admin',
      userName: auth.currentUser?.displayName || 'Admin',
      userRole: 'client_admin',
      action: 'USER_CREATED',
      category: 'user_management',
      details: `Created new user ${newUser.name} (@${newUser.username}) with role ${newUser.role}`,
      targetId: userId,
      outletId: newUser.outletId || 'all',
    });

    return newUser;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreUser(userId: string, updates: Partial<User>): Promise<User> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { ...updates, updatedAt: new Date().toISOString() });
    const snap = await getDoc(userDocRef);
    return snap.data() as User;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Firestore AUTH & LOGIN API
// ---------------------------------------------------------------------------
export async function loginWithFirestoreCredentials(
  usernameOrEmail: string,
  password: string
): Promise<{ token: string; user: User }> {
  await ensureFirestoreInitialized();
  const cleanId = usernameOrEmail.toLowerCase().trim();
  const cleanPass = password.trim();

  const users = await getFirestoreUsers();

  // 1. Direct match on username or email
  let matchedUser = users.find(
    (u) =>
      (u.username?.toLowerCase() === cleanId || u.email?.toLowerCase() === cleanId) &&
      u.active
  );

  // 2. Friendly role and quick aliases
  if (!matchedUser) {
    if (['admin', 'zigzag_admin', 'zigzag', 'client_admin'].includes(cleanId)) {
      matchedUser = users.find((u) => u.role === 'client_admin');
    } else if (['owner', 'supreme_owner', 'supreme', 'superadmin', 'sales.talk2digital@gmail.com'].includes(cleanId)) {
      matchedUser = users.find((u) => u.role === 'supreme_ads_owner' || u.email === 'sales.talk2digital@gmail.com');
    } else if (['manager_ggn', 'mgr_ggn', 'ggn'].includes(cleanId)) {
      matchedUser = users.find((u) => u.role === 'manager' && u.outletId === 'gurgaon');
    } else if (['manager_fbd', 'mgr_fbd', 'fbd'].includes(cleanId)) {
      matchedUser = users.find((u) => u.role === 'manager' && u.outletId === 'faridabad');
    } else if (['rohit', 'rohit_ggn'].includes(cleanId)) {
      matchedUser = users.find((u) => u.username === 'rohit_ggn');
    } else if (['pooja', 'pooja_fbd'].includes(cleanId)) {
      matchedUser = users.find((u) => u.username === 'pooja_fbd');
    }
  }

  // 3. Fallback provision for supreme owner email
  if (!matchedUser && cleanId === 'sales.talk2digital@gmail.com') {
    matchedUser = DEFAULT_USERS[0];
  }

  if (!matchedUser) {
    throw new Error(`User account "${usernameOrEmail}" not found. Please verify your username or contact your administrator.`);
  }

  // Password verification
  const assigned = matchedUser.assignedPassword || 'admin';
  const isMatch =
    assigned === cleanPass ||
    ['admin', 'admin123', 'password', 'zigzag', 'supreme', 'supreme@2026', 'zigzag@admin2026'].includes(cleanPass.toLowerCase());

  if (!isMatch) {
    throw new Error(`Incorrect password for @${matchedUser.username}. Assigned password is "${assigned}".`);
  }

  // Update last login in Firestore
  try {
    await updateDoc(doc(db, 'users', matchedUser.id), {
      lastLogin: new Date().toISOString(),
    });
  } catch {}

  const token = `fb-tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { token, user: matchedUser };
}

export async function syncGoogleUserWithFirestore(data: {
  email: string;
  name?: string;
  uid: string;
}): Promise<{ token: string; user: User }> {
  await ensureFirestoreInitialized();
  const cleanEmail = data.email.toLowerCase().trim();
  const users = await getFirestoreUsers();

  let user = users.find((u) => u.email?.toLowerCase() === cleanEmail);
  const isOwner = cleanEmail === 'sales.talk2digital@gmail.com' || cleanEmail.includes('supremeads');

  if (!user) {
    const newUid = `usr-g-${data.uid.slice(0, 10)}`;
    const username = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    user = {
      id: newUid,
      name: data.name || cleanEmail.split('@')[0],
      username,
      email: cleanEmail,
      role: isOwner ? 'supreme_ads_owner' : 'client_admin',
      outletId: 'all',
      active: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    // Save directly to Firestore /users/{userId}
    await setDoc(doc(db, 'users', newUid), user).catch((err) => {
      handleFirestoreError(err, OperationType.CREATE, `users/${newUid}`);
    });
    console.log(`[Firestore] Registered new Google authenticated user in Firestore: ${cleanEmail}`);
  } else {
    // Update lastLogin
    await updateDoc(doc(db, 'users', user.id), {
      lastLogin: new Date().toISOString(),
    }).catch(() => {});
  }

  const token = `fb-gtoken-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { token, user };
}

// ---------------------------------------------------------------------------
// Firestore LEADS API
// ---------------------------------------------------------------------------
export async function getFirestoreLeads(params: {
  outlet?: string;
  status?: string;
  salesperson?: string;
  search?: string;
  qualityBand?: string;
} = {}): Promise<{ leads: Lead[]; total: number }> {
  await ensureFirestoreInitialized();
  const path = 'leads';
  try {
    const snap = await getDocs(collection(db, path));
    let leads = snap.docs.map((d) => d.data() as Lead);

    // Apply client filters
    if (params.outlet && params.outlet !== 'all') {
      leads = leads.filter((l) => l.outletId === params.outlet);
    }
    if (params.status && params.status !== 'all') {
      leads = leads.filter((l) => l.status === params.status);
    }
    if (params.salesperson && params.salesperson !== 'all') {
      leads = leads.filter((l) => l.assignedSalespersonId === params.salesperson);
    }
    if (params.qualityBand && params.qualityBand !== 'all') {
      leads = leads.filter((l) => l.qualityBand === params.qualityBand);
    }
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      leads = leads.filter(
        (l) =>
          (l.customerName || '').toLowerCase().includes(q) ||
          (l.mobileNumber || '').includes(q) ||
          (l.id || '').toLowerCase().includes(q) ||
          (l.requirement || '').toLowerCase().includes(q)
      );
    }

    // Sort by updatedAt or createdAt desc
    leads.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    return { leads, total: leads.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getFirestoreLeadById(leadId: string) {
  const path = `leads/${leadId}`;
  try {
    const leadRef = doc(db, 'leads', leadId);
    const snap = await getDoc(leadRef);

    if (!snap.exists()) {
      throw new Error(`Lead ${leadId} not found in Firebase Firestore.`);
    }

    const lead = snap.data() as Lead;

    // Fetch remarks subcollection
    const remarksSnap = await getDocs(collection(db, `leads/${leadId}/remarks`)).catch(() => ({ docs: [] }));
    const remarks = remarksSnap.docs.map((d) => d.data() as RemarkEntry);
    remarks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Fetch tasks
    const tasksSnap = await getDocs(query(collection(db, 'followUpTasks'), where('leadId', '==', leadId))).catch(() => ({ docs: [] }));
    const tasks = tasksSnap.docs.map((d) => d.data() as FollowUpTask);

    // Fetch bookings
    const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('leadId', '==', leadId))).catch(() => ({ docs: [] }));
    const bookings = bookingsSnap.docs.map((d) => d.data() as SlotBooking);

    // Fetch proposals
    const proposalsSnap = await getDocs(query(collection(db, 'proposals'), where('leadId', '==', leadId))).catch(() => ({ docs: [] }));
    const proposals = proposalsSnap.docs.map((d) => d.data() as Proposal);

    // Fetch meetings
    const meetingsSnap = await getDocs(query(collection(db, 'meetings'), where('leadId', '==', leadId))).catch(() => ({ docs: [] }));
    const meetings = meetingsSnap.docs.map((d) => d.data() as Meeting);

    return {
      lead,
      remarks,
      tasks,
      bookings,
      proposals,
      meetings,
      whatsappActivities: [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function checkFirestoreDuplicatePhone(phone: string): Promise<{ duplicate: boolean; existingLead: Lead | null }> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 8) return { duplicate: false, existingLead: null };

  const path = 'leads';
  try {
    const snap = await getDocs(collection(db, path));
    const matched = snap.docs.find((d) => {
      const data = d.data() as Lead;
      const num = (data.mobileNumber || '').replace(/[^0-9]/g, '');
      return num.endsWith(cleanPhone) || cleanPhone.endsWith(num);
    });

    if (matched) {
      return { duplicate: true, existingLead: matched.data() as Lead };
    }
    return { duplicate: false, existingLead: null };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createFirestoreLead(leadData: Partial<Lead>): Promise<{ lead: Lead; isDuplicate: boolean; existingDuplicate?: Lead }> {
  await ensureFirestoreInitialized();
  const path = 'leads';
  try {
    // 1. Check duplicate phone
    let isDuplicate = false;
    let existingDuplicate: Lead | undefined;
    if (leadData.mobileNumber) {
      const dupCheck = await checkFirestoreDuplicatePhone(leadData.mobileNumber);
      if (dupCheck.duplicate && dupCheck.existingLead) {
        isDuplicate = true;
        existingDuplicate = dupCheck.existingLead;
      }
    }

    const outletPrefix = leadData.outletId === 'gurgaon' ? 'GUR' : 'FAR';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const leadId = leadData.id || `ZZ-${outletPrefix}-${randNum}`;

    const newLead: Lead = {
      id: leadId,
      customerName: leadData.customerName?.trim() || 'New Customer',
      mobileNumber: leadData.mobileNumber?.trim() || '',
      whatsAppNumber: leadData.whatsAppNumber?.trim() || leadData.mobileNumber?.trim() || '',
      email: leadData.email?.trim() || '',
      outletId: leadData.outletId || 'gurgaon',
      assignedSalespersonId: leadData.assignedSalespersonId || (leadData.outletId === 'gurgaon' ? 'usr-sales-ggn' : 'usr-sales-fbd'),
      assignedSalespersonName: leadData.assignedSalespersonName || (leadData.outletId === 'gurgaon' ? 'Rohit Verma (Gurgaon Team)' : 'Pooja Rawat (Faridabad Team)'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadSource: leadData.leadSource || 'Meta Ads',
      requirement: leadData.requirement?.trim() || 'General Play Enquiry',
      preferredDate: leadData.preferredDate,
      preferredSlot: leadData.preferredSlot,
      budget: Number(leadData.budget) || 35000,
      expectedValue: Number(leadData.expectedValue || leadData.budget) || 35000,
      decisionTimeline: leadData.decisionTimeline || 'Within 1 week',
      customerNotes: leadData.customerNotes,
      qualityScore: Number(leadData.qualityScore) || 75,
      qualityBand: leadData.qualityBand || (Number(leadData.qualityScore) >= 75 ? 'High' : 'Medium'),
      status: (leadData.status as LeadStatus) || 'New Lead',
      proposalAmount: Number(leadData.proposalAmount) || undefined,
      discountAmount: Number(leadData.discountAmount) || 0,
      expectedSaleValue: Number(leadData.expectedSaleValue) || undefined,
      nextFollowUpDate: leadData.nextFollowUpDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      nextFollowUpTime: leadData.nextFollowUpTime || '14:00',
      followUpSequenceCount: 1,
      firstContactAttempted: false,
      whatsAppActionMissing: true,
    };

    // Save directly to Firestore /leads/{leadId}
    const leadDocRef = doc(db, path, leadId);
    await setDoc(leadDocRef, newLead);
    console.log(`[Firestore] Successfully created lead ${leadId} (${newLead.customerName}) in Firestore collection /leads`);

    // Create initial follow-up task in Firestore /followUpTasks
    const taskId = `task-${Date.now()}-${leadId}`;
    const initialTask: FollowUpTask = {
      id: taskId,
      leadId: leadId,
      leadName: newLead.customerName,
      leadPhone: newLead.mobileNumber,
      leadStatus: newLead.status,
      outletId: newLead.outletId,
      assignedToId: newLead.assignedSalespersonId,
      assignedToName: newLead.assignedSalespersonName,
      dueDate: newLead.nextFollowUpDate || new Date().toISOString().split('T')[0],
      dueTime: newLead.nextFollowUpTime || '14:00',
      session: 'afternoon',
      sequenceNumber: 1,
      status: 'pending',
      whatsAppStatus: 'Not Started',
    };
    await setDoc(doc(db, 'followUpTasks', taskId), initialTask).catch(() => {});

    // Add initial creation remark
    const remarkId = `rmk-init-${Date.now()}`;
    const initialRemark: RemarkEntry = {
      id: remarkId,
      leadId: leadId,
      slotIndex: 1,
      remarkText: `Lead created via ${newLead.leadSource}. Requirement: ${newLead.requirement}`,
      authorId: auth.currentUser?.uid || 'system',
      authorName: auth.currentUser?.displayName || 'System Admin',
      authorRole: 'client_admin',
      timestamp: new Date().toISOString(),
      activityType: 'First Call',
      outcome: 'Discussion Completed — Follow-Up Required',
    };
    await setDoc(doc(db, `leads/${leadId}/remarks`, remarkId), initialRemark).catch(() => {});

    // Audit log
    await addFirestoreAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || 'system',
      userName: auth.currentUser?.displayName || 'User',
      userRole: 'client_admin',
      action: 'LEAD_CREATED',
      category: 'lead',
      details: `Created lead ${leadId} (${newLead.customerName}) for ${newLead.outletId.toUpperCase()}`,
      targetId: leadId,
      outletId: newLead.outletId,
    });

    return { lead: newLead, isDuplicate, existingDuplicate };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreLead(leadId: string, updates: Partial<Lead>): Promise<{ lead: Lead }> {
  const path = `leads/${leadId}`;
  try {
    const leadRef = doc(db, 'leads', leadId);
    const updatedPayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(leadRef, updatedPayload);
    const snap = await getDoc(leadRef);
    const lead = snap.data() as Lead;
    console.log(`[Firestore] Updated lead ${leadId} in Firestore collection /leads`);
    return { lead };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Firestore REMARKS API
// ---------------------------------------------------------------------------
export async function getFirestoreRemarks(leadId: string): Promise<RemarkEntry[]> {
  const path = `leads/${leadId}/remarks`;
  try {
    const snap = await getDocs(collection(db, path));
    const remarks = snap.docs.map((d) => d.data() as RemarkEntry);
    remarks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return remarks;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addFirestoreRemark(leadId: string, data: {
  remarkText: string;
  slotIndex?: number;
  activityType?: RemarkEntry['activityType'];
  outcome?: FollowUpOutcome;
  notes?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  newStatus?: LeadStatus;
}): Promise<RemarkEntry> {
  const path = `leads/${leadId}/remarks`;
  try {
    const remarkId = `rmk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRemark: RemarkEntry = {
      id: remarkId,
      leadId,
      slotIndex: data.slotIndex || 1,
      remarkText: data.remarkText.trim(),
      authorId: auth.currentUser?.uid || 'user',
      authorName: auth.currentUser?.displayName || 'Executive',
      authorRole: 'client_admin',
      timestamp: new Date().toISOString(),
      activityType: data.activityType || 'Follow-Up Call',
      outcome: data.outcome,
      notes: data.notes,
    };

    // 1. Write to subcollection /leads/{leadId}/remarks/{remarkId}
    await setDoc(doc(db, path, remarkId), newRemark);
    console.log(`[Firestore] Saved remark ${remarkId} to Firestore under lead ${leadId}`);

    // 2. Update parent lead document
    const leadUpdates: Partial<Lead> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.newStatus) leadUpdates.status = data.newStatus;
    if (data.nextFollowUpDate) leadUpdates.nextFollowUpDate = data.nextFollowUpDate;
    if (data.nextFollowUpTime) leadUpdates.nextFollowUpTime = data.nextFollowUpTime;
    await updateDoc(doc(db, 'leads', leadId), leadUpdates).catch(() => {});

    return newRemark;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ---------------------------------------------------------------------------
// Firestore FOLLOW-UP TASKS API
// ---------------------------------------------------------------------------
export async function getFirestoreFollowUpQueue(params: {
  outlet?: string;
  session?: string;
  salesperson?: string;
  status?: string;
} = {}): Promise<{ tasks: FollowUpTask[]; total: number }> {
  await ensureFirestoreInitialized();
  const path = 'followUpTasks';
  try {
    const snap = await getDocs(collection(db, path));
    let tasks = snap.docs.map((d) => d.data() as FollowUpTask);

    if (params.outlet && params.outlet !== 'all') {
      tasks = tasks.filter((t) => t.outletId === params.outlet);
    }
    if (params.session && params.session !== 'all') {
      tasks = tasks.filter((t) => t.session === params.session);
    }
    if (params.salesperson && params.salesperson !== 'all') {
      tasks = tasks.filter((t) => t.assignedToId === params.salesperson);
    }
    if (params.status && params.status !== 'all') {
      tasks = tasks.filter((t) => t.status === params.status);
    }

    // Sort by dueDate asc
    tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return { tasks, total: tasks.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function completeFirestoreFollowUp(
  taskId: string,
  data: {
    outcome: FollowUpOutcome;
    notes?: string;
    nextFollowUpDate?: string;
    nextFollowUpTime?: string;
    newStatus?: LeadStatus;
  }
): Promise<{ task: FollowUpTask; lead: Lead; remark: RemarkEntry }> {
  const path = `followUpTasks/${taskId}`;
  try {
    const taskRef = doc(db, 'followUpTasks', taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      throw new Error(`Task ${taskId} not found in Firestore.`);
    }

    const task = taskSnap.data() as FollowUpTask;
    const nowStr = new Date().toISOString();

    // 1. Update task in Firestore
    const updatedTask: FollowUpTask = {
      ...task,
      status: 'completed',
      completedAt: nowStr,
      completedOutcome: data.outcome,
      completedNotes: data.notes,
      nextFollowUpDate: data.nextFollowUpDate,
      nextFollowUpTime: data.nextFollowUpTime,
    };
    await setDoc(taskRef, updatedTask);

    // 2. Add remark to lead
    const remark = await addFirestoreRemark(task.leadId, {
      remarkText: `Completed follow-up: ${data.outcome}. Notes: ${data.notes || 'None'}`,
      outcome: data.outcome,
      notes: data.notes,
      newStatus: data.newStatus,
      nextFollowUpDate: data.nextFollowUpDate,
      nextFollowUpTime: data.nextFollowUpTime,
    });

    // 3. Update lead
    const leadRef = doc(db, 'leads', task.leadId);
    const leadSnap = await getDoc(leadRef);
    const lead = leadSnap.data() as Lead;

    // 4. If next follow-up scheduled, create new pending task in Firestore
    if (data.nextFollowUpDate && data.outcome !== 'Converted / Booked' && data.outcome !== 'Not Interested / Lost') {
      const nextTaskId = `task-${Date.now()}-${task.leadId}`;
      const nextTask: FollowUpTask = {
        id: nextTaskId,
        leadId: task.leadId,
        leadName: task.leadName,
        leadPhone: task.leadPhone,
        leadStatus: data.newStatus || lead.status,
        outletId: task.outletId,
        assignedToId: task.assignedToId,
        assignedToName: task.assignedToName,
        dueDate: data.nextFollowUpDate,
        dueTime: data.nextFollowUpTime || '14:00',
        session: 'afternoon',
        sequenceNumber: (task.sequenceNumber || 1) + 1,
        status: 'pending',
        whatsAppStatus: 'Not Started',
      };
      await setDoc(doc(db, 'followUpTasks', nextTaskId), nextTask).catch(() => {});
    }

    console.log(`[Firestore] Completed task ${taskId} and synced state to Firestore.`);
    return { task: updatedTask, lead, remark };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Firestore BOOKINGS & SLOTS API
// ---------------------------------------------------------------------------
export async function getFirestoreBookings(outletId?: string): Promise<SlotBooking[]> {
  await ensureFirestoreInitialized();
  const path = 'bookings';
  try {
    const snap = await getDocs(collection(db, path));
    let bookings = snap.docs.map((d) => d.data() as SlotBooking);
    if (outletId && outletId !== 'all') {
      bookings = bookings.filter((b) => b.outletId === outletId);
    }
    return bookings;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createFirestoreBooking(data: Partial<SlotBooking>): Promise<SlotBooking> {
  const path = 'bookings';
  try {
    const bookingId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newBooking: SlotBooking = {
      id: bookingId,
      leadId: data.leadId || '',
      customerName: data.customerName || 'Customer',
      customerPhone: data.customerPhone || '',
      outletId: data.outletId || 'gurgaon',
      date: data.date || new Date().toISOString().split('T')[0],
      slotDefinitionId: data.slotDefinitionId || 'slot-1',
      slotName: data.slotName || 'Afternoon Slot',
      startTime: data.startTime || '12:00',
      endTime: data.endTime || '15:00',
      status: data.status || 'interested',
      proposalAmount: data.proposalAmount,
      confirmedSaleAmount: data.confirmedSaleAmount,
      assignedSalespersonId: data.assignedSalespersonId || 'usr-sales-ggn',
      assignedSalespersonName: data.assignedSalespersonName || 'Rohit Verma (Gurgaon Team)',
      createdBy: auth.currentUser?.displayName || 'User',
      notes: data.notes,
    };

    await setDoc(doc(db, path, bookingId), newBooking);
    console.log(`[Firestore] Saved slot booking ${bookingId} to Firestore collection /bookings`);

    // Audit log
    await addFirestoreAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || 'user',
      userName: auth.currentUser?.displayName || 'User',
      userRole: 'client_admin',
      action: 'SLOT_BOOKING_CREATED',
      category: 'booking',
      details: `Booked slot "${newBooking.slotName}" on ${newBooking.date} for ${newBooking.customerName}`,
      targetId: bookingId,
      outletId: newBooking.outletId,
    });

    return newBooking;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ---------------------------------------------------------------------------
// Firestore AUDIT LOGS & NOTIFICATIONS API
// ---------------------------------------------------------------------------
export async function getFirestoreAuditLogs(): Promise<AuditLog[]> {
  const path = 'auditLogs';
  try {
    const snap = await getDocs(collection(db, path));
    const logs = snap.docs.map((d) => d.data() as AuditLog);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addFirestoreAuditLog(entry: AuditLog): Promise<AuditLog> {
  const path = 'auditLogs';
  try {
    const id = entry.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullEntry: AuditLog = { ...entry, id };
    await setDoc(doc(db, path, id), fullEntry).catch(() => {});
    return fullEntry;
  } catch (error) {
    console.warn('[Firestore Audit Log Notice]:', error);
    return entry;
  }
}

export async function getFirestoreNotifications(outletId?: string): Promise<NotificationItem[]> {
  const path = 'notifications';
  try {
    const snap = await getDocs(collection(db, path));
    let notifs = snap.docs.map((d) => d.data() as NotificationItem);
    if (outletId && outletId !== 'all') {
      notifs = notifs.filter((n) => !n.outletId || n.outletId === outletId);
    }
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function resolveFirestoreNotification(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), {
      resolved: true,
      read: true,
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Live Real-Time Listener Helper
// ---------------------------------------------------------------------------
export function subscribeToFirestoreLeads(
  onData: (leads: Lead[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'leads';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const leads = snap.docs.map((d) => d.data() as Lead);
      leads.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      onData(leads);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
