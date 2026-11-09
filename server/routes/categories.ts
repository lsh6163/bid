import { Router } from 'express';
import { query } from '../db.ts';
import { requireAdmin } from '../auth.ts';

export const categoriesRouter = Router();

function mapL1(row: { id: string; name: string; sort_order: number }) {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}
function mapL2(row: {
  id: string;
  parent_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  view_type: string;
}) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    viewType: (row.view_type === 'board' ? 'board' : 'prompt') as 'prompt' | 'board',
  };
}

categoriesRouter.get('/level1', async (_req, res) => {
  const r = await query('SELECT * FROM category_level1 ORDER BY sort_order ASC, name ASC');
  res.json(r.rows.map(mapL1));
});

categoriesRouter.post('/level1', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: '이름이 필요합니다.' });
    return;
  }
  const dup = await query('SELECT id FROM category_level1 WHERE name = $1', [name]);
  if (dup.rowCount) {
    res.status(409).json({ error: '같은 이름의 단계 1이 있습니다.' });
    return;
  }
  const id = `l1-${crypto.randomUUID()}`;
  const sortOrder = Number(req.body?.sortOrder ?? 0);
  await query('INSERT INTO category_level1 (id, name, sort_order) VALUES ($1,$2,$3)', [id, name, sortOrder]);
  res.status(201).json({ id, name, sortOrder });
});

categoriesRouter.put('/level1/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT * FROM category_level1 WHERE id = $1', [id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '단계 1을 찾을 수 없습니다.' });
    return;
  }
  const name = req.body?.name != null ? String(req.body.name).trim() : existing.rows[0].name;
  const sortOrder = req.body?.sortOrder != null ? Number(req.body.sortOrder) : existing.rows[0].sort_order;
  if (name !== existing.rows[0].name) {
    const dup = await query('SELECT id FROM category_level1 WHERE name = $1 AND id <> $2', [name, id]);
    if (dup.rowCount) {
      res.status(409).json({ error: '같은 이름의 단계 1이 있습니다.' });
      return;
    }
  }
  await query(
    'UPDATE category_level1 SET name = $1, sort_order = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [name, sortOrder, id]
  );
  res.json({ id, name, sortOrder });
});

categoriesRouter.delete('/level1/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const children = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM category_level2 WHERE parent_id = $1',
    [id]
  );
  const n = Number(children.rows[0]?.count ?? 0);
  if (n > 0) {
    res.status(409).json({ error: `하위 단계 2가 ${n}개 있어 삭제할 수 없습니다. 먼저 이동 또는 삭제하세요.` });
    return;
  }
  await query('DELETE FROM category_level1 WHERE id = $1', [id]);
  res.json({ ok: true });
});

categoriesRouter.get('/level2', async (req, res) => {
  const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : null;
  const r = parentId
    ? await query('SELECT * FROM category_level2 WHERE parent_id = $1 ORDER BY sort_order ASC, name ASC', [parentId])
    : await query('SELECT * FROM category_level2 ORDER BY sort_order ASC, name ASC');
  res.json(r.rows.map(mapL2));
});

categoriesRouter.post('/level2', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const parentId = String(req.body?.parentId ?? '');
  if (!name || !parentId) {
    res.status(400).json({ error: '이름과 상위 단계 1이 필요합니다.' });
    return;
  }
  const parent = await query('SELECT id FROM category_level1 WHERE id = $1', [parentId]);
  if (!parent.rowCount) {
    res.status(400).json({ error: '상위 단계 1이 없습니다.' });
    return;
  }
  const dup = await query('SELECT id FROM category_level2 WHERE parent_id = $1 AND name = $2', [parentId, name]);
  if (dup.rowCount) {
    res.status(409).json({ error: '같은 상위 단계 아래 동일 이름의 단계 2가 있습니다.' });
    return;
  }
  const id = `l2-${crypto.randomUUID()}`;
  const description = req.body?.description ? String(req.body.description) : null;
  const sortOrder = Number(req.body?.sortOrder ?? 0);
  await query(
    `INSERT INTO category_level2 (id, parent_id, name, description, sort_order, view_type)
     VALUES ($1,$2,$3,$4,$5,'prompt')`,
    [id, parentId, name, description, sortOrder]
  );
  res.status(201).json({ id, parentId, name, description, sortOrder, viewType: 'prompt' });
});

categoriesRouter.put('/level2/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT * FROM category_level2 WHERE id = $1', [id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const row = existing.rows[0];
  const name = req.body?.name != null ? String(req.body.name).trim() : row.name;
  const parentId = req.body?.parentId != null ? String(req.body.parentId) : row.parent_id;
  const description = req.body?.description != null ? String(req.body.description) : row.description;
  const sortOrder = req.body?.sortOrder != null ? Number(req.body.sortOrder) : row.sort_order;
  const parent = await query('SELECT id FROM category_level1 WHERE id = $1', [parentId]);
  if (!parent.rowCount) {
    res.status(400).json({ error: '상위 단계 1이 없습니다.' });
    return;
  }
  const dup = await query(
    'SELECT id FROM category_level2 WHERE parent_id = $1 AND name = $2 AND id <> $3',
    [parentId, name, id]
  );
  if (dup.rowCount) {
    res.status(409).json({ error: '같은 상위 단계 아래 동일 이름의 단계 2가 있습니다.' });
    return;
  }
  await query(
    `UPDATE category_level2
     SET parent_id = $1, name = $2, description = $3, sort_order = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [parentId, name, description, sortOrder, id]
  );
  res.json({
    id,
    parentId,
    name,
    description,
    sortOrder,
    viewType: row.view_type === 'board' ? 'board' : 'prompt',
  });
});

categoriesRouter.delete('/level2/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT * FROM category_level2 WHERE id = $1', [id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '단계 2를 찾을 수 없습니다.' });
    return;
  }
  const prompts = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM prompts WHERE category_level2_id = $1',
    [id]
  );
  const pn = Number(prompts.rows[0]?.count ?? 0);
  if (pn > 0) {
    res.status(409).json({ error: `연결된 프롬프트가 ${pn}개 있어 삭제할 수 없습니다.` });
    return;
  }
  if (existing.rows[0].view_type === 'board') {
    const posts = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM help_posts');
    const hn = Number(posts.rows[0]?.count ?? 0);
    if (hn > 0) {
      res.status(409).json({ error: `도움말 게시물이 ${hn}건 있어 게시판 단계 2를 삭제할 수 없습니다.` });
      return;
    }
  }
  await query('DELETE FROM category_level2 WHERE id = $1', [id]);
  res.json({ ok: true });
});
