export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS knowledge_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS inquiry_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    knowledge_category_id TEXT,
    source TEXT NOT NULL DEFAULT 'experience',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (knowledge_category_id)
      REFERENCES knowledge_categories(id)
      ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS knowledge_tags (
    knowledge_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (knowledge_id, tag_id),
    FOREIGN KEY (knowledge_id)
      REFERENCES knowledge_items(id)
      ON DELETE CASCADE,
    FOREIGN KEY (tag_id)
      REFERENCES tags(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS inquiry_notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    response_note TEXT NOT NULL DEFAULT '',
    next_action TEXT NOT NULL DEFAULT '',
    occurred_on TEXT NOT NULL,
    inquiry_category_id TEXT,
    source TEXT NOT NULL DEFAULT 'experience',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (inquiry_category_id)
      REFERENCES inquiry_categories(id)
      ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS inquiry_tags (
    inquiry_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (inquiry_id, tag_id),
    FOREIGN KEY (inquiry_id)
      REFERENCES inquiry_notes(id)
      ON DELETE CASCADE,
    FOREIGN KEY (tag_id)
      REFERENCES tags(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS inquiry_knowledge_links (
    inquiry_id TEXT NOT NULL,
    knowledge_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (inquiry_id, knowledge_id),
    FOREIGN KEY (inquiry_id)
      REFERENCES inquiry_notes(id)
      ON DELETE CASCADE,
    FOREIGN KEY (knowledge_id)
      REFERENCES knowledge_items(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS monthly_reviews (
    id TEXT PRIMARY KEY,
    target_month TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL DEFAULT '',
    learnings TEXT NOT NULL DEFAULT '',
    issues TEXT NOT NULL DEFAULT '',
    frequent_topics TEXT NOT NULL DEFAULT '',
    next_goals TEXT NOT NULL DEFAULT '',
    free_memo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_knowledge_items_type
    ON knowledge_items(type)`,

  `CREATE INDEX IF NOT EXISTS idx_knowledge_items_category
    ON knowledge_items(knowledge_category_id)`,

  `CREATE INDEX IF NOT EXISTS idx_knowledge_items_source
    ON knowledge_items(source)`,

  `CREATE INDEX IF NOT EXISTS idx_inquiry_notes_occurred_on
    ON inquiry_notes(occurred_on)`,

  `CREATE INDEX IF NOT EXISTS idx_inquiry_notes_category
    ON inquiry_notes(inquiry_category_id)`,

  `CREATE INDEX IF NOT EXISTS idx_inquiry_notes_source
    ON inquiry_notes(source)`,

  `CREATE INDEX IF NOT EXISTS idx_monthly_reviews_target_month
    ON monthly_reviews(target_month)`,
];
