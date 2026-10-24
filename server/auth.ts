import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { loadDatabase, withTransaction } from './db.ts';
import type { User, UserRole, OutletId } from '../src/types/index.ts';

// In-memory active session tokens mapping to user ID
const activeSessions = new Map<string, { userId: string; createdAt: number; expiresAt: number }>();

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function revokeSession(token: string): void {
  activeSessions.delete(token);
}

export function getUserByToken(token: string): User | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === session.userId && u.active);
  return user || null;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-session-token']) {
    token = String(req.headers['x-session-token']).trim();
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = getUserByToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }

  req.user = user;
  next();
}

// Role-based authorization checker
export function requireRoles(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges for this role' });
      return;
    }

    next();
  };
}

// Outlet isolation verification
export function canAccessOutlet(user: User, outletId: OutletId): boolean {
  if (user.role === 'supreme_ads_owner' || user.role === 'client_admin') {
    return true;
  }
  if (user.role === 'manager') {
    return user.outletId === 'all' || user.outletId === outletId;
  }
  if (user.role === 'gurgaon_team') {
    return outletId === 'gurgaon';
  }
  if (user.role === 'faridabad_team') {
    return outletId === 'faridabad';
  }
  return false;
}

export function verifyOutletAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const requestedOutlet = (req.params.outletId || req.query.outletId || req.body.outletId) as OutletId | undefined;
  if (!requestedOutlet) {
    next();
    return;
  }

  if (!canAccessOutlet(req.user, requestedOutlet)) {
    res.status(403).json({
      error: `Access Denied: Your account does not have permission to access ${requestedOutlet} outlet records.`,
    });
    return;
  }

  next();
}
