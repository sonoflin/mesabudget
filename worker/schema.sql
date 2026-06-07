CREATE TABLE IF NOT EXISTS shared_budgets (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_name TEXT,
  category_amounts TEXT NOT NULL,
  revenue_amounts TEXT NOT NULL,
  multi_fund TEXT,
  agree_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_budgets_created ON shared_budgets(created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  window_start TEXT NOT NULL
);
