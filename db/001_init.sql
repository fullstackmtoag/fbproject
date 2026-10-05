-- 001_init.sql
-- Initial schema for Mtoag Social Dashboard. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL,              -- 'facebook' | 'instagram'
  name        TEXT,
  username    TEXT,
  followers   INT,
  following   INT,
  media_count INT,
  picture_url TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  platform      TEXT NOT NULL,            -- 'facebook' | 'instagram'
  account_id    TEXT REFERENCES accounts(id),
  content       TEXT,
  content_type  TEXT,                     -- image | video | reel | carousel | text | link | other
  permalink     TEXT,
  thumbnail_url TEXT,
  created_time  TIMESTAMPTZ,
  raw           JSONB,
  CONSTRAINT posts_content_type_check CHECK (
    content_type IS NULL OR
    content_type IN ('image', 'video', 'reel', 'carousel', 'text', 'link', 'other')
  )
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id         BIGSERIAL PRIMARY KEY,
  post_id    TEXT REFERENCES posts(id),
  fetched_at TIMESTAMPTZ DEFAULT now(),
  reactions  INT,
  comments   INT,
  shares     INT,
  saves      INT,
  reach      INT,
  views      INT,
  engagement INT
);

CREATE TABLE IF NOT EXISTS account_metrics (
  account_id         TEXT REFERENCES accounts(id),
  date               DATE,
  followers          INT,
  following          INT,
  media_count        INT,
  reach              INT,
  views              INT,
  accounts_engaged   INT,
  total_interactions INT,
  PRIMARY KEY (account_id, date)
);

CREATE TABLE IF NOT EXISTS audience (
  account_id TEXT REFERENCES accounts(id),
  breakdown  TEXT,                        -- age | gender | city | country
  label      TEXT,
  value      INT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (account_id, breakdown, label)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id          BIGSERIAL PRIMARY KEY,
  started_at  TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      TEXT,                       -- running | success | error
  details     JSONB
);

CREATE INDEX IF NOT EXISTS posts_platform_created_time_idx
  ON posts (platform, created_time);

CREATE INDEX IF NOT EXISTS post_metrics_post_id_fetched_at_idx
  ON post_metrics (post_id, fetched_at DESC);
