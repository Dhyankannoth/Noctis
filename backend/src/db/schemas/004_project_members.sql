DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_role') THEN
    CREATE TYPE project_role AS ENUM ('owner', 'editor', 'viewer');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS project_members (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          project_role NOT NULL DEFAULT 'viewer',
  invited_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
  joined_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_user    ON project_members(user_id);
