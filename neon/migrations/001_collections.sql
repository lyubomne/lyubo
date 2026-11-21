-- =========================================================
-- neon/migrations/001_collections.sql
-- From one table of records to collections: adds `collections`, moves every record and tag into
-- one default collection, renames `lyubo.watched_on` to the date `rated_on`, and keeps tag
-- relations inside one collection with composite foreign keys.
-- Run once, as the owner, then run `neon/schema.sql` (it adds the triggers and CHECKs):
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f neon/migrations/001_collections.sql
-- One transaction: a failure leaves the branch as it was.
-- =========================================================
BEGIN;

-- ---------------------------------------------------------
-- collections, with the default collection
-- ---------------------------------------------------------
CREATE TABLE collections(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  sort_column text,
  sort_direction text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  write_id uuid
);

INSERT INTO collections(id, name)
  VALUES (gen_random_uuid(), 'Collection');

-- ---------------------------------------------------------
-- lyubo
-- ---------------------------------------------------------
ALTER TABLE lyubo
  ADD COLUMN collection_id uuid REFERENCES collections(id) ON DELETE CASCADE;

UPDATE
  lyubo
SET
  collection_id = (
    SELECT
      id
    FROM
      collections);

ALTER TABLE lyubo
  ALTER COLUMN collection_id SET NOT NULL,
  ADD CONSTRAINT lyubo_id_collection_id_key UNIQUE (id, collection_id);

ALTER TABLE lyubo RENAME COLUMN watched_on TO rated_on;

-- Postgres 18 names NOT NULL constraints after the column and keeps the name on a rename
ALTER TABLE lyubo RENAME CONSTRAINT lyubo_watched_on_not_null TO lyubo_rated_on_not_null;

-- The text was always 'YYYY-MM-DD'
ALTER TABLE lyubo
  ALTER COLUMN rated_on DROP DEFAULT,
  ALTER COLUMN rated_on TYPE date
  USING rated_on::date,
  ALTER COLUMN rated_on SET DEFAULT CURRENT_DATE;

-- ---------------------------------------------------------
-- tags
-- ---------------------------------------------------------
ALTER TABLE tags
  ADD COLUMN collection_id uuid REFERENCES collections(id) ON DELETE CASCADE;

UPDATE
  tags
SET
  collection_id = (
    SELECT
      id
    FROM
      collections);

ALTER TABLE tags
  ALTER COLUMN collection_id SET NOT NULL,
  ADD CONSTRAINT tags_id_collection_id_key UNIQUE (id, collection_id);

-- ---------------------------------------------------------
-- lyubo_tags
-- ---------------------------------------------------------
ALTER TABLE lyubo_tags
  ADD COLUMN collection_id uuid;

UPDATE
  lyubo_tags lt
SET
  collection_id = l.collection_id
FROM
  lyubo l
WHERE
  l.id = lt.lyubo_id;

ALTER TABLE lyubo_tags
  ALTER COLUMN collection_id SET NOT NULL,
  DROP CONSTRAINT lyubo_tags_lyubo_id_fkey,
  DROP CONSTRAINT lyubo_tags_tag_id_fkey,
  ADD CONSTRAINT lyubo_tags_lyubo_fkey FOREIGN KEY (lyubo_id, collection_id) REFERENCES lyubo(id,
    collection_id) ON DELETE CASCADE,
  ADD CONSTRAINT lyubo_tags_tag_fkey FOREIGN KEY (tag_id, collection_id) REFERENCES tags(id,
    collection_id) ON DELETE CASCADE;

COMMIT;
