-- =========================================================
-- neon/schema.sql
-- Server schema on Neon (Lakebase Postgres). Applied by hand as the database owner:
--   psql "$DATABASE_URL_UNPOOLED" -f neon/schema.sql
-- The app writes through the restricted role `lyubo_app` (APP_DATABASE_URL):
--   neon roles create --branch <branch> --name lyubo_app --access read_write
-- Neon Realtime needs a primary key on every table and no row-level security.
-- The CHECK constraints are dropped and added again, so a second run applies changed limits to
-- existing tables too. The text limits match `ColumnLimits` in `src/lib/common/limits.ts`.
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

ALTER TABLE lyubo
  DROP CONSTRAINT IF EXISTS lyubo_name_length,
  DROP CONSTRAINT IF EXISTS lyubo_review_length,
  DROP CONSTRAINT IF EXISTS lyubo_rating_range,
  ADD CONSTRAINT lyubo_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT lyubo_review_length CHECK (char_length(review) <= 20000),
  ADD CONSTRAINT lyubo_rating_range CHECK (rating BETWEEN 0 AND 10);

-- ---------------------------------------------------------
-- tags
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid
);

ALTER TABLE tags
  DROP CONSTRAINT IF EXISTS tags_name_length,
  ADD CONSTRAINT tags_name_length CHECK (char_length(name) <= 50);

-- ---------------------------------------------------------
-- lyubo_tags
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lyubo_tags(
  lyubo_id uuid NOT NULL REFERENCES lyubo(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  write_id uuid,
  PRIMARY KEY (lyubo_id, tag_id)
);
