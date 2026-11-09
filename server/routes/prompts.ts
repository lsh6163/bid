import { Router } from 'express';
import { query } from '../db.ts';
import { requireAdmin } from '../auth.ts';
import { resetCategoriesAndPrompts } from '../seed.ts';

export const promptsRouter = Router();

function mapPrompt(row: {
  id: string;
  category_level2_id: string;
  title: string;
  subtitle: string | null;
  agent_name: string;
  agent_description: string;
  content: string;
  tags: string | null;
}) {
  let tags: string[] = [];
  try {
    tags = row.tags ? JSON.parse(row.tags) : [];
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    categoryLevel2Id: row.category_level2_id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    agentName: row.agent_name,
    agentDescription: row.agent_description,
    content: row.content,
    tags,
  };
}

promptsRouter.post('/reset', requireAdmin, async (_req, res) => {
  await resetCategoriesAndPrompts();
  res.json({ ok: true });
});

promptsRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const cat = typeof req.query.categoryLevel2Id === 'string' ? req.query.categoryLevel2Id : '';
  let sql = 'SELECT * FROM prompts WHERE 1=1';
  const params: unknown[] = [];
  if (cat) {
    params.push(cat);
    sql += ` AND category_level2_id = $${params.length}`;
  }
  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    sql += ` AND (title ILIKE $${i} OR subtitle ILIKE $${i} OR agent_name ILIKE $${i} OR agent_description ILIKE $${i} OR content ILIKE $${i} OR tags ILIKE $${i})`;
  }
  sql += ' ORDER BY title ASC';
  const r = await query(sql, params);
  res.json(r.rows.map(mapPrompt));
});

promptsRouter.get('/:id', async (req, res) => {
  const r = await query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  if (!r.rowCount) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  res.json(mapPrompt(r.rows[0]));
});

promptsRouter.post('/', requireAdmin, async (req, res) => {
  const body = req.body ?? {};
  const categoryLevel2Id = String(body.categoryLevel2Id ?? '');
  const cat = await query('SELECT * FROM category_level2 WHERE id = $1', [categoryLevel2Id]);
  if (!cat.rowCount) {
    res.status(400).json({ error: '단계 2가 없습니다.' });
    return;
  }
  if (cat.rows[0].view_type === 'board') {
    res.status(400).json({ error: '게시판 단계 2에는 프롬프트를 만들 수 없습니다.' });
    return;
  }
  const id = `p-${crypto.randomUUID()}`;
  await query(
    `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      categoryLevel2Id,
      String(body.title ?? '').trim() || '제목 없음',
      String(body.subtitle ?? ''),
      String(body.agentName ?? ''),
      String(body.agentDescription ?? ''),
      String(body.content ?? ''),
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    ]
  );
  const created = await query('SELECT * FROM prompts WHERE id = $1', [id]);
  res.status(201).json(mapPrompt(created.rows[0]));
});

promptsRouter.put('/:id', requireAdmin, async (req, res) => {
  const existing = await query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) {
    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
    return;
  }
  const body = req.body ?? {};
  const row = existing.rows[0];
  const categoryLevel2Id = body.categoryLevel2Id != null ? String(body.categoryLevel2Id) : row.category_level2_id;
  const cat = await query('SELECT * FROM category_level2 WHERE id = $1', [categoryLevel2Id]);
  if (!cat.rowCount) {
    res.status(400).json({ error: '단계 2가 없습니다.' });
    return;
  }
  if (cat.rows[0].view_type === 'board') {
    res.status(400).json({ error: '게시판 단계 2로 프롬프트를 이동할 수 없습니다.' });
    return;
  }
  await query(
    `UPDATE prompts SET
       category_level2_id = $1, title = $2, subtitle = $3, agent_name = $4,
       agent_description = $5, content = $6, tags = $7, updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [
      categoryLevel2Id,
      body.title != null ? String(body.title) : row.title,
      body.subtitle != null ? String(body.subtitle) : row.subtitle,
      body.agentName != null ? String(body.agentName) : row.agent_name,
      body.agentDescription != null ? String(body.agentDescription) : row.agent_description,
      body.content != null ? String(body.content) : row.content,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : JSON.parse(row.tags || '[]')),
      req.params.id,
    ]
  );
  const updated = await query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
  res.json(mapPrompt(updated.rows[0]));
});

promptsRouter.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
