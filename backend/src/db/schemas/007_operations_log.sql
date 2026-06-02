CREATE TABLE IF NOT EXISTS operations_log (
  id           BIGSERIAL   PRIMARY KEY,
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  op_type      TEXT        NOT NULL,   -- e.g. 'ADD_NODE', 'UPDATE_NODE_POSITION', etc.
  op_payload   JSONB       NOT NULL,
  base_version BIGINT      NOT NULL,   -- project.version at time of op
  result_version BIGINT    NOT NULL,   -- project.version after commit
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oplog_project ON operations_log(project_id, result_version);
