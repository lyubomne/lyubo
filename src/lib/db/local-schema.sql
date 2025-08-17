-- Original SQL from electric-sql.
-- See original at https://electric-sql.com/docs/guides/writes#through-the-db.

-- This is the local database schema for PGlite.

-- It uses two tables: `lyubo_synced` and `lyubo_local`. These are combined
-- into a `lyubo` view that provides a merged view on both tables and supports
-- local live queries. Writes to the `lyubo` view are redirected using
-- `INSTEAD OF` triggers to the `lyubo_local` and `changes` tables.

-- The `lyubo_synced` table for immutable, synced state from the server.
CREATE TABLE IF NOT EXISTS lyubo_synced (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  rating NUMERIC(3,1) NOT NULL DEFAULT 0,
  review TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  watched_on TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Bookkeeping column.
  write_id UUID
);

-- The `lyubo_local` table for local optimistic state.
CREATE TABLE IF NOT EXISTS lyubo_local (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  rating NUMERIC(3,1) NOT NULL DEFAULT 0,
  review TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  watched_on TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Bookkeeping columns.
  changed_columns TEXT[],
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  write_id UUID NOT NULL
);

-- The `lyubo` view to combine the two tables on read.
CREATE OR REPLACE VIEW lyubo AS
  SELECT
    COALESCE(local.id, synced.id) AS id,
    CASE
      WHEN 'name' = ANY(local.changed_columns)
        THEN local.name
        ELSE synced.name
      END AS name,
    CASE
      WHEN 'rating' = ANY(local.changed_columns)
        THEN local.rating
        ELSE synced.rating
      END AS rating,
    CASE
      WHEN 'review' = ANY(local.changed_columns)
        THEN local.review
        ELSE synced.review
      END AS review,
    CASE
      WHEN 'tags' = ANY(local.changed_columns)
        THEN local.tags
        ELSE synced.tags
      END AS tags,
    CASE
      WHEN 'favorite' = ANY(local.changed_columns)
        THEN local.favorite
        ELSE synced.favorite
      END AS favorite,
    CASE
      WHEN 'watched_on' = ANY(local.changed_columns)
        THEN local.watched_on
        ELSE synced.watched_on
      END AS watched_on,
    CASE
      WHEN 'created_at' = ANY(local.changed_columns)
        THEN local.created_at
        ELSE synced.created_at
      END AS created_at
  FROM lyubo_synced AS synced
  FULL OUTER JOIN lyubo_local AS local
    ON synced.id = local.id
    WHERE local.id IS NULL OR local.is_deleted = FALSE;

-- Triggers to automatically remove local optimistic state when the corresponding
-- row syncs over the replication stream. Match on `write_id`, to allow local
-- state to be rebased on concurrent changes to the same row.
CREATE OR REPLACE FUNCTION delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM lyubo_local
    WHERE id = NEW.id
      AND write_id IS NOT NULL
      AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- N.b.: deletes can be concurrent, but can't update the `write_id` and aren't
-- revertable (once a row is deleted, it would be re-created with an insert),
-- so its safe to just match on ID. You could implement revertable concurrent
-- deletes using soft deletes (which are actually updates).
CREATE OR REPLACE FUNCTION delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM lyubo_local WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON lyubo_synced
FOR EACH ROW
EXECUTE FUNCTION delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON lyubo_synced
FOR EACH ROW
EXECUTE FUNCTION delete_local_on_synced_delete_trigger();

-- The local `changes` table for capturing and persisting a log
-- of local write operations that we want to sync to the server.
CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  write_id UUID NOT NULL,
  transaction_id XID8 NOT NULL
);

-- The following `INSTEAD OF` triggers:
-- 1. allow the app code to write directly to the view
-- 2. to capture write operations and write change messages into the

-- The insert trigger
CREATE OR REPLACE FUNCTION lyubo_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
  local_write_id UUID := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM lyubo_synced WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
  END IF;
  IF EXISTS (SELECT 1 FROM lyubo_local WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
  END IF;

  -- Insert into the local table.
  INSERT INTO lyubo_local (
    id,
    name,
    rating,
    review,
    tags,
    favorite,
    watched_on,
    created_at,
    changed_columns,
    write_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.name, ''),
    COALESCE(NEW.rating, 0),
    COALESCE(NEW.review, ''),
    COALESCE(NEW.tags, '{}'),
    COALESCE(NEW.favorite, FALSE),
    COALESCE(NEW.watched_on, TO_CHAR(NOW(), 'YYYY-MM-DD')),
    COALESCE(NEW.created_at, NOW()),
    ARRAY['name', 'rating', 'review', 'tags', 'favorite', 'watched_on', 'created_at'],
    local_write_id
  );

  -- Record the write operation in the change log.
  INSERT INTO changes (
    operation,
    value,
    write_id,
    transaction_id
  )
  VALUES (
    'insert',
    jsonb_build_object(
      'id', NEW.id,
      'name', COALESCE(NEW.name, ''),
      'rating', COALESCE(NEW.rating, 0),
      'review', COALESCE(NEW.review, ''),
      'tags', COALESCE(NEW.tags, '{}'),
      'favorite', COALESCE(NEW.favorite, FALSE),
      'watched_on', COALESCE(NEW.watched_on, TO_CHAR(NOW(), 'YYYY-MM-DD')),
      'created_at', COALESCE(NEW.created_at, NOW())
    ),
    local_write_id,
    pg_current_xact_id()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The update trigger
CREATE OR REPLACE FUNCTION lyubo_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
  synced lyubo_synced%ROWTYPE;
  local lyubo_local%ROWTYPE;
  changed_cols TEXT[] := '{}';
  local_write_id UUID := gen_random_uuid();
BEGIN
  -- Fetch the corresponding rows from the synced and local tables
  SELECT * INTO synced FROM lyubo_synced WHERE id = NEW.id;
  SELECT * INTO local FROM lyubo_local WHERE id = NEW.id;

  -- If the row is not present in the local table, insert it
  IF NOT FOUND THEN
    -- Compare each column with the synced table and add to changed_cols if different
    IF NEW.name IS DISTINCT FROM synced.name THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW.rating IS DISTINCT FROM synced.rating THEN
      changed_cols := array_append(changed_cols, 'rating');
    END IF;
    IF NEW.review IS DISTINCT FROM synced.review THEN
      changed_cols := array_append(changed_cols, 'review');
    END IF;
    IF NEW.tags IS DISTINCT FROM synced.tags THEN
      changed_cols := array_append(changed_cols, 'tags');
    END IF;
    IF NEW.favorite IS DISTINCT FROM synced.favorite THEN
      changed_cols := array_append(changed_cols, 'favorite');
    END IF;
    IF NEW.watched_on IS DISTINCT FROM synced.watched_on THEN
      changed_cols := array_append(changed_cols, 'watched_on');
    END IF;
    IF NEW.created_at IS DISTINCT FROM synced.created_at THEN
      changed_cols := array_append(changed_cols, 'created_at');
    END IF;

    INSERT INTO lyubo_local (
      id,
      name,
      rating,
      review,
      tags,
      favorite,
      watched_on,
      created_at,
      changed_columns,
      write_id
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.name, ''),
      COALESCE(NEW.rating, 0),
      COALESCE(NEW.review, ''),
      COALESCE(NEW.tags, '{}'),
      COALESCE(NEW.favorite, FALSE),
      COALESCE(NEW.watched_on, TO_CHAR(NOW(), 'YYYY-MM-DD')),
      COALESCE(NEW.created_at, NOW()),
      changed_cols,
      local_write_id
    );

  -- Otherwise, if the row is already in the local table, update it and adjust
  -- the changed_columns
  ELSE
    UPDATE lyubo_local
      SET
        name =
          CASE
            WHEN NEW.name IS DISTINCT FROM synced.name
              THEN NEW.name
              ELSE local.name
            END,
        rating =
          CASE
            WHEN NEW.rating IS DISTINCT FROM synced.rating
              THEN NEW.rating
              ELSE local.rating
            END,
        review =
          CASE
            WHEN NEW.review IS DISTINCT FROM synced.review
              THEN NEW.review
              ELSE local.review
            END,
        tags =
          CASE
            WHEN NEW.tags IS DISTINCT FROM synced.tags
              THEN NEW.tags
              ELSE local.tags
            END,
        favorite =
          CASE
            WHEN NEW.favorite IS DISTINCT FROM synced.favorite
              THEN NEW.favorite
              ELSE local.favorite
            END,
        watched_on =
          CASE
            WHEN NEW.watched_on IS DISTINCT FROM synced.watched_on
              THEN NEW.watched_on
              ELSE local.watched_on
            END,
        created_at =
          CASE
            WHEN NEW.created_at IS DISTINCT FROM synced.created_at
              THEN NEW.created_at
              ELSE local.created_at
            END,
        -- Set the changed_columns to columns that have both been marked as changed
        -- and have values that have actually changed.
        changed_columns = (
          SELECT array_agg(DISTINCT col) FROM (
            SELECT unnest(local.changed_columns) AS col
            UNION
            SELECT unnest(ARRAY['name', 'rating', 'review', 'tags', 'favorite', 'watched_on', 'created_at']) AS col
          ) AS cols
          WHERE (
            CASE
              WHEN col = 'name'
                THEN COALESCE(NEW.name, local.name) IS DISTINCT FROM synced.name
              WHEN col = 'rating'
                THEN COALESCE(NEW.rating, local.rating) IS DISTINCT FROM synced.rating
              WHEN col = 'review'
                THEN COALESCE(NEW.review, local.review) IS DISTINCT FROM synced.review
              WHEN col = 'tags'
                THEN COALESCE(NEW.tags, local.tags) IS DISTINCT FROM synced.tags
              WHEN col = 'favorite'
                THEN COALESCE(NEW.favorite, local.favorite) IS DISTINCT FROM synced.favorite
              WHEN col = 'watched_on'
                THEN COALESCE(NEW.watched_on, local.watched_on) IS DISTINCT FROM synced.watched_on
              WHEN col = 'created_at'
                THEN COALESCE(NEW.created_at, local.created_at) IS DISTINCT FROM synced.created_at
              END
          )
        ),
        write_id = local_write_id
      WHERE id = NEW.id;
  END IF;

  -- Record the update into the change log.
  INSERT INTO changes (
    operation,
    value,
    write_id,
    transaction_id
  )
  VALUES (
    'update',
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', NEW.id,
        'name', COALESCE(NEW.name, ''),
        'rating', COALESCE(NEW.rating, 0),
        'review', COALESCE(NEW.review, ''),
        'tags', COALESCE(NEW.tags, '{}'),
        'favorite', COALESCE(NEW.favorite, FALSE),
        'watched_on', COALESCE(NEW.watched_on, TO_CHAR(NOW(), 'YYYY-MM-DD')),
        'created_at', COALESCE(NEW.created_at, NOW())
      )
    ),
    local_write_id,
    pg_current_xact_id()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The delete trigger
CREATE OR REPLACE FUNCTION lyubo_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
  local_write_id UUID := gen_random_uuid();
BEGIN
  -- Upsert a soft-deletion record in the local table.
  IF EXISTS (SELECT 1 FROM lyubo_local WHERE id = OLD.id) THEN
    UPDATE lyubo_local
    SET
      is_deleted = TRUE,
      write_id = local_write_id
    WHERE id = OLD.id;
  ELSE
    INSERT INTO lyubo_local (
      id,
      is_deleted,
      write_id
    )
    VALUES (
      OLD.id,
      TRUE,
      local_write_id
    );
  END IF;

  -- Record in the change log.
  INSERT INTO changes (
    operation,
    value,
    write_id,
    transaction_id
  )
  VALUES (
    'delete',
    jsonb_build_object(
      'id', OLD.id
    ),
    local_write_id,
    pg_current_xact_id()
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lyubo_insert
INSTEAD OF INSERT ON lyubo
FOR EACH ROW
EXECUTE FUNCTION lyubo_insert_trigger();

CREATE OR REPLACE TRIGGER lyubo_update
INSTEAD OF UPDATE ON lyubo
FOR EACH ROW
EXECUTE FUNCTION lyubo_update_trigger();

CREATE OR REPLACE TRIGGER lyubo_delete
INSTEAD OF DELETE ON lyubo
FOR EACH ROW
EXECUTE FUNCTION lyubo_delete_trigger();

-- Notify on a `changes` topic whenever anything is added to the change log.
CREATE OR REPLACE FUNCTION changes_notify_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER changes_notify
AFTER INSERT ON changes
FOR EACH ROW
EXECUTE FUNCTION changes_notify_trigger();