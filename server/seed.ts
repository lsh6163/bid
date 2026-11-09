import bcrypt from 'bcryptjs';
import { query } from './db.ts';
import {
  HELP_INTRO_BODY,
  SEED_LEVEL1,
  SEED_LEVEL2,
  SEED_PROMPTS,
} from './seedPrompts.ts';
import { seedEconomicCatalog } from './catalog.ts';

export async function seedIfEmpty(): Promise<void> {
  const l1 = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM category_level1');
  if (Number(l1.rows[0]?.count ?? 0) === 0) {
    await insertCategorySeed();
  }

  const prompts = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM prompts');
  if (Number(prompts.rows[0]?.count ?? 0) === 0) {
    await insertPromptSeed();
  }

  await ensureAdminPassword();
  await ensureHelpIntro();
  await seedEconomicCatalog();
  await ensureDefaultBidScenario();
}

export async function resetCategoriesAndPrompts(): Promise<void> {
  await query('DELETE FROM prompts');
  await query('DELETE FROM category_level2');
  await query('DELETE FROM category_level1');
  await insertCategorySeed();
  await insertPromptSeed();
  await ensureHelpIntro();
}

async function insertCategorySeed(): Promise<void> {
  for (const row of SEED_LEVEL1) {
    await query(
      `INSERT INTO category_level1 (id, name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = CURRENT_TIMESTAMP`,
      [row.id, row.name, row.sortOrder]
    );
  }
  for (const row of SEED_LEVEL2) {
    await query(
      `INSERT INTO category_level2 (id, parent_id, name, description, sort_order, view_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         parent_id = EXCLUDED.parent_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order,
         view_type = EXCLUDED.view_type,
         updated_at = CURRENT_TIMESTAMP`,
      [row.id, row.parentId, row.name, row.description, row.sortOrder, row.viewType]
    );
  }
}

async function insertPromptSeed(): Promise<void> {
  for (const p of SEED_PROMPTS) {
    await query(
      `INSERT INTO prompts (id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         category_level2_id = EXCLUDED.category_level2_id,
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         agent_name = EXCLUDED.agent_name,
         agent_description = EXCLUDED.agent_description,
         content = EXCLUDED.content,
         tags = EXCLUDED.tags,
         updated_at = CURRENT_TIMESTAMP`,
      [p.id, p.categoryLevel2Id, p.title, p.subtitle, p.agentName, p.agentDescription, p.content, JSON.stringify(p.tags)]
    );
  }
}

async function ensureAdminPassword(): Promise<void> {
  const existing = await query('SELECT id FROM admin_settings WHERE id = 1');
  if (existing.rowCount) return;
  const raw = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(raw, 10);
  await query('INSERT INTO admin_settings (id, password_hash) VALUES (1, $1)', [hash]);
}

export async function ensureHelpIntro(): Promise<void> {
  const count = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM help_posts');
  if (Number(count.rows[0]?.count ?? 0) > 0) return;
  await query(
    `INSERT INTO help_posts (id, title, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    ['hp-intro', '참고 문서 모음 이용 안내', HELP_INTRO_BODY]
  );
}

async function ensureDefaultBidScenario(): Promise<void> {
  const count = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM bid_cost_scenarios');
  if (Number(count.rows[0]?.count ?? 0) > 0) return;
  const weights = [
    { id: 'steel', name: '철강', weightPct: 30, indicatorKeys: ['ppi', 'import_price', 'usdkrw'] },
    { id: 'aluminum', name: '알루미늄', weightPct: 10, indicatorKeys: ['aluminum', 'usdkrw'] },
    { id: 'copper', name: '구리', weightPct: 10, indicatorKeys: ['copper', 'usdkrw'] },
    { id: 'import', name: '수입부품', weightPct: 15, indicatorKeys: ['import_price', 'usdkrw'] },
    { id: 'energy', name: '에너지', weightPct: 10, indicatorKeys: ['wti'] },
    { id: 'finance', name: '금융비용', weightPct: 5, indicatorKeys: ['corp_aa_3y'] },
    { id: 'cpi', name: '일반 물가', weightPct: 10, indicatorKeys: ['cpi'] },
    { id: 'other', name: '기타', weightPct: 10, indicatorKeys: ['ppi'] },
  ];
  await query(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      'bcs-default',
      '기본 입찰 시나리오',
      1000000000,
      null,
      JSON.stringify(weights),
      JSON.stringify({ commodity: 0.35, fx: 0.25, ppi: 0.25, rate: 0.15 }),
    ]
  );
}
