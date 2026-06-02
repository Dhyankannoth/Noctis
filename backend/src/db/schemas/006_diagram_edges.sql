CREATE TABLE IF NOT EXISTS diagram_edges (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id     UUID        NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
  target_id     UUID        NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
  edge_type     TEXT        NOT NULL DEFAULT 'http',  -- 'http'|'grpc'|'mq'|'ws'|'db'
  label         TEXT,
  meta          JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_edges_project ON diagram_edges(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_edges_source  ON diagram_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target  ON diagram_edges(target_id);
