import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { query } from '../db.ts';
import { requireAdmin } from '../auth.ts';
import { contentDisposition, decodeOriginalName, fileExtension, isAllowedExtension } from '../utils/filename.ts';

export const helpRouter = Router();
const uploadRoot = path.resolve('server/data/help-uploads');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
});

helpRouter.get('/', async (_req, res) => {
  const posts = await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM help_attachments a WHERE a.post_id = p.id) AS attachment_count
     FROM help_posts p
     ORDER BY p.created_at DESC`
  );
  res.json(
    posts.rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachmentCount: Number(row.attachment_count),
      attachments: [],
    }))
  );
});

helpRouter.get('/:id', async (req, res) => {
  const post = await query('SELECT * FROM help_posts WHERE id = $1', [req.params.id]);
  if (!post.rowCount) {
    res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    return;
  }
  const atts = await query('SELECT * FROM help_attachments WHERE post_id = $1 ORDER BY created_at ASC', [req.params.id]);
  const row = post.rows[0];
  res.json({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: atts.rows.map(mapAtt),
  });
});

helpRouter.post('/', requireAdmin, upload.array('files', 10), async (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: '제목은 필수입니다.' });
    return;
  }
  const body = String(req.body?.body ?? '');
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length > 10) {
    res.status(400).json({ error: '파일은 글당 최대 10개입니다.' });
    return;
  }
  const decoded: Array<{ file: Express.Multer.File; originalName: string }> = [];
  for (const file of files) {
    const originalName = decodeOriginalName(file.originalname);
    if (!isAllowedExtension(originalName)) {
      res.status(400).json({ error: `허용되지 않는 확장자입니다: ${originalName}` });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      res.status(400).json({ error: `${originalName} 파일이 20MB를 초과합니다.` });
      return;
    }
    decoded.push({ file, originalName });
  }

  const id = `hp-${crypto.randomUUID()}`;
  await query('INSERT INTO help_posts (id, title, body) VALUES ($1,$2,$3)', [id, title, body]);
  const dir = path.join(uploadRoot, id);
  await fs.mkdir(dir, { recursive: true });
  for (const item of decoded) {
    const attId = crypto.randomUUID();
    const ext = fileExtension(item.originalName);
    const storedName = `${attId}${ext ? `.${ext}` : ''}`;
    await fs.writeFile(path.join(dir, storedName), item.file.buffer);
    await query(
      `INSERT INTO help_attachments (id, post_id, original_name, stored_name, mime_type, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [attId, id, item.originalName, storedName, item.file.mimetype, item.file.size]
    );
  }
  const created = await query('SELECT * FROM help_posts WHERE id = $1', [id]);
  const atts = await query('SELECT * FROM help_attachments WHERE post_id = $1', [id]);
  const row = created.rows[0];
  res.status(201).json({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: atts.rows.map(mapAtt),
  });
});

helpRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT id FROM help_posts WHERE id = $1', [id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    return;
  }
  await query('DELETE FROM help_posts WHERE id = $1', [id]);
  await fs.rm(path.join(uploadRoot, id), { recursive: true, force: true });
  res.json({ ok: true });
});

helpRouter.get('/:id/attachments/:attachmentId', async (req, res) => {
  const att = await query('SELECT * FROM help_attachments WHERE id = $1 AND post_id = $2', [
    req.params.attachmentId,
    req.params.id,
  ]);
  if (!att.rowCount) {
    res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
    return;
  }
  const row = att.rows[0];
  const filePath = path.join(uploadRoot, row.post_id, row.stored_name);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(uploadRoot))) {
    res.status(400).json({ error: '잘못된 경로입니다.' });
    return;
  }
  try {
    const buf = await fs.readFile(resolved);
    res.setHeader('Content-Disposition', contentDisposition(row.original_name));
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.send(buf);
  } catch {
    res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }
});

function mapAtt(row: {
  id: string;
  post_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}) {
  return {
    id: row.id,
    postId: row.post_id,
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type ?? '',
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
  };
}
