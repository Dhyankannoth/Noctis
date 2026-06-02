CREATE TABLE IF NOT EXISTS oauth_providers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT        NOT NULL,   -- 'google' | 'github'
  provider_id   TEXT        NOT NULL,   -- subject id from the provider
  access_token  TEXT,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_providers(user_id);
