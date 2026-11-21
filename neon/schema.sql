-- =========================================================
-- neon/schema.sql
-- Server schema on Neon (Lakebase Postgres): the complete current state. Applied by hand as the
-- database owner:
--   psql "$DATABASE_URL_UNPOOLED" -f neon/schema.sql
-- A branch created before a migration in `neon/migrations/` gets that migration first; see
-- `neon/README.md`.
-- The app writes through the restricted role `lyubo_app` (APP_DATABASE_URL):
--   neon roles create --branch <branch> --name lyubo_app --access read_write
-- Neon Realtime needs a primary key on every table and no row-level security.
-- The CHECK constraints are dropped and added again, so a second run applies changed limits to
-- existing tables too. The text limits match `ColumnLimits` in `src/lib/common/limits.ts`.
-- =========================================================
-- ---------------------------------------------------------
-- collections
-- ---------------------------------------------------------
-- One row per table of records. All collections have the same columns; they differ only in
-- name, order and sorting
CREATE TABLE IF NOT EXISTS collections(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  -- NULL: the default order (newest first)
  sort_column text,
  sort_direction text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid
);

ALTER TABLE collections
  DROP CONSTRAINT IF EXISTS collections_name_length,
  DROP CONSTRAINT IF EXISTS collections_sort,
  ADD CONSTRAINT collections_name_length CHECK (char_length(name) <= 100),
  -- Sorting by any other column would be an identifier from the client
  ADD CONSTRAINT collections_sort CHECK ((sort_column IS NULL AND sort_direction IS NULL)
    OR (sort_column IN ('name', 'rating', 'favorite', 'tags', 'rated_on', 'created_at')
      AND sort_direction IN ('asc', 'desc')));

-- ---------------------------------------------------------
-- Rows never move to another collection
-- ---------------------------------------------------------
-- The composite foreign keys of lyubo_tags rely on it. check_violation makes the endpoint
-- answer 400, so the client rolls the change back
CREATE OR REPLACE FUNCTION keep_collection_id()
  RETURNS TRIGGER
  AS $$
BEGIN
  IF NEW.collection_id IS DISTINCT FROM OLD.collection_id THEN
    RAISE EXCEPTION 'collection_id of % % cannot change', TG_TABLE_NAME, OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- lyubo
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lyubo(
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  rating numeric(3, 1) NOT NULL DEFAULT 0,
  review text NOT NULL DEFAULT '',
  favorite boolean NOT NULL DEFAULT FALSE,
  rated_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid,
  -- Target of the lyubo_tags foreign key that keeps a relation inside one collection
  CONSTRAINT lyubo_id_collection_id_key UNIQUE (id, collection_id)
);

CREATE INDEX IF NOT EXISTS lyubo_collection_id_idx ON lyubo(collection_id);

ALTER TABLE lyubo
  DROP CONSTRAINT IF EXISTS lyubo_name_length,
  DROP CONSTRAINT IF EXISTS lyubo_review_length,
  DROP CONSTRAINT IF EXISTS lyubo_rating_range,
  ADD CONSTRAINT lyubo_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT lyubo_review_length CHECK (char_length(review) <= 20000),
  ADD CONSTRAINT lyubo_rating_range CHECK (rating BETWEEN 0 AND 10);

CREATE OR REPLACE TRIGGER lyubo_keep_collection_id
  BEFORE UPDATE ON lyubo
  FOR EACH ROW
  EXECUTE FUNCTION keep_collection_id();

-- ---------------------------------------------------------
-- tags
-- ---------------------------------------------------------
-- Every collection has its own tags
CREATE TABLE IF NOT EXISTS tags(
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid,
  -- Target of the lyubo_tags foreign key that keeps a relation inside one collection
  CONSTRAINT tags_id_collection_id_key UNIQUE (id, collection_id)
);

-- No two tags of one collection differ only in case. Also serves lookups by collection
CREATE UNIQUE INDEX IF NOT EXISTS tags_collection_id_name_key ON tags(collection_id, lower(name));

ALTER TABLE tags
  DROP CONSTRAINT IF EXISTS tags_name_length,
  ADD CONSTRAINT tags_name_length CHECK (char_length(name) <= 50);

CREATE OR REPLACE TRIGGER tags_keep_collection_id
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION keep_collection_id();

-- ---------------------------------------------------------
-- lyubo_tags
-- ---------------------------------------------------------
-- `collection_id` exists only on the server: both foreign keys share it, so a record can only
-- get tags of its own collection. The client never sends it; the trigger below fills it in
CREATE TABLE IF NOT EXISTS lyubo_tags(
  lyubo_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  collection_id uuid NOT NULL,
  write_id uuid,
  PRIMARY KEY (lyubo_id, tag_id),
  CONSTRAINT lyubo_tags_lyubo_fkey FOREIGN KEY (lyubo_id, collection_id) REFERENCES lyubo(id,
    collection_id) ON DELETE CASCADE,
  CONSTRAINT lyubo_tags_tag_fkey FOREIGN KEY (tag_id, collection_id) REFERENCES tags(id,
    collection_id) ON DELETE CASCADE
);

-- Deleting a tag looks up its relations (the primary key covers lookups by lyubo_id)
CREATE INDEX IF NOT EXISTS lyubo_tags_tag_id_idx ON lyubo_tags(tag_id);

-- The collection of the record. A missing record leaves it NULL: not_null_violation, 400
CREATE OR REPLACE FUNCTION lyubo_tags_set_collection_id()
  RETURNS TRIGGER
  AS $$
BEGIN
  NEW.collection_id := (
    SELECT
      collection_id
    FROM
      lyubo
    WHERE
      id = NEW.lyubo_id);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lyubo_tags_set_collection_id
  BEFORE INSERT ON lyubo_tags
  FOR EACH ROW
  EXECUTE FUNCTION lyubo_tags_set_collection_id();
