CREATE TABLE IF NOT EXISTS projects (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  owner_id      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  snapshot      JSONB,                  -- latest full diagram state
  version       BIGINT      NOT NULL DEFAULT 0,   -- monotonic op counter
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
