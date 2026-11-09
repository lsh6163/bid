import { Router } from 'express';
import { isAuthed, login, logout } from '../auth.ts';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const password = String(req.body?.password ?? '');
  const token = await login(password);
  if (!token) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }
  res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 });
  res.json({ token, ok: true });
});

authRouter.post('/logout', (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.admin_token;
  logout(token ?? null);
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  res.json({ admin: isAuthed(req) });
});
