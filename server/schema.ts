import { query } from './db.ts';

export async function ensureSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS category_level1 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS category_level2 (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      view_type TEXT NOT NULL DEFAULT 'prompt' CHECK (view_type IN ('prompt', 'board')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES category_level1(id) ON DELETE RESTRICT,
      UNIQUE(parent_id, name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      category_level2_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      agent_name TEXT NOT NULL,
      agent_description TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_level2_id) REFERENCES category_level2(id) ON DELETE RESTRICT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS help_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS help_attachments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES help_posts(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS economic_indicator_catalog (
      indicator_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK (provider IN ('ECOS', 'EIA', 'IMF')),
      display_name_ko TEXT NOT NULL,
      category TEXT NOT NULL,
      frequency TEXT NOT NULL,
      unit TEXT,
      currency TEXT,
      mapping_json TEXT NOT NULL,
      source_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS economic_observations (
      id TEXT PRIMARY KEY,
      indicator_key TEXT NOT NULL,
      period TEXT NOT NULL,
      value DOUBLE PRECISION NOT NULL,
      unit TEXT,
      currency TEXT,
      source_timestamp TEXT,
      fetched_at TEXT NOT NULL,
      source_reference TEXT,
      is_estimated INTEGER NOT NULL DEFAULT 0,
      UNIQUE(indicator_key, period),
      FOREIGN KEY (indicator_key) REFERENCES economic_indicator_catalog(indicator_key)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bid_cost_scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_cost DOUBLE PRECISION,
      base_fx DOUBLE PRECISION,
      weights_json TEXT NOT NULL,
      risk_weights_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    ALTER TABLE category_level2
    ADD COLUMN IF NOT EXISTS view_type TEXT NOT NULL DEFAULT 'prompt'
  `);

  await query(`
    UPDATE category_level2
    SET view_type = 'board', updated_at = CURRENT_TIMESTAMP
    WHERE view_type IS DISTINCT FROM 'board'
      AND (
        id = 'l2-help'
        OR (
          name IN ('도움말', '참고 문서 모음')
          AND parent_id IN (
            SELECT id FROM category_level1 WHERE name IN ('기타', '게시판')
          )
        )
      )
  `);

  await query(`
    UPDATE category_level1
    SET name = '게시판', updated_at = CURRENT_TIMESTAMP
    WHERE id = 'l1-etc' AND name <> '게시판'
  `);

  await query(`
    UPDATE category_level2
    SET name = '참고 문서 모음', updated_at = CURRENT_TIMESTAMP
    WHERE id = 'l2-help' AND name <> '참고 문서 모음'
  `);
}
