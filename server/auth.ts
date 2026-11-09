import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query } from './db.ts';

const sessions = new Map<string, number>();
const TTL_MS = 12 * 60 * 60 * 1000;

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = req.cookies?.admin_token;
  return cookie || null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: '관리자 인증이 필요합니다.' });
    return;
  }
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) {
    sessions.delete(token);
    res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인하세요.' });
    return;
  }
  next();
}

export function optionalAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  const exp = token ? sessions.get(token) : undefined;
  (req as Request & { isAdmin?: boolean }).isAdmin = Boolean(exp && exp > Date.now());
  next();
}

export async function login(password: string): Promise<string | null> {
  const row = await query<{ password_hash: string }>('SELECT password_hash FROM admin_settings WHERE id = 1');
  const hash = row.rows[0]?.password_hash;
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return null;
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + TTL_MS);
  return token;
}

export function logout(token: string | null): void {
  if (token) sessions.delete(token);
}

export function isAuthed(req: Request): boolean {
  const token = readToken(req);
  const exp = token ? sessions.get(token) : undefined;
  return Boolean(exp && exp > Date.now());
}
