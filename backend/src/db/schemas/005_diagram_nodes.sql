CREATE TABLE IF NOT EXISTS diagram_nodes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_type   TEXT        NOT NULL,     -- 'service' | 'database' | 'queue' | 'gateway' | ...
  label       TEXT        NOT NULL,
  meta        JSONB       NOT NULL DEFAULT '{}',  -- icon, color, tech stack, etc.
  position_x  FLOAT       NOT NULL DEFAULT 0,
  position_y  FLOAT       NOT NULL DEFAULT 0,
  width       FLOAT       NOT NULL DEFAULT 120,
  height      FLOAT       NOT NULL DEFAULT 60,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ                         -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_nodes_project ON diagram_nodes(project_id) WHERE deleted_at IS NULL;
