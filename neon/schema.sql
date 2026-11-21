-- =========================================================
-- neon/schema.sql
-- Server schema on Neon (Lakebase Postgres). Applied by hand as the database owner:
--   psql "$DATABASE_URL_UNPOOLED" -f neon/schema.sql
-- The app writes through the restricted role `lyubo_app` (APP_DATABASE_URL):
--   neon roles create --branch <branch> --name lyubo_app --access read_write
-- Neon Realtime needs a primary key on every table and no row-level security.
-- =========================================================
-- ---------------------------------------------------------
-- lyubo
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lyubo(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  rating numeric(3, 1) NOT NULL DEFAULT 0,
  review text NOT NULL DEFAULT '',
  favorite boolean NOT NULL DEFAULT FALSE,
  watched_on text NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid
);

-- ---------------------------------------------------------
-- tags
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid
);

-- ---------------------------------------------------------
-- lyubo_tags
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lyubo_tags(
  lyubo_id uuid NOT NULL REFERENCES lyubo(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  write_id uuid,
  PRIMARY KEY (lyubo_id, tag_id)
);
