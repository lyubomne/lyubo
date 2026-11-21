-- =========================================================
-- lyubo.sql
-- Lyubo domain schema (local optimistic writes + sync)
-- =========================================================
-- ---------------------------------------------------------
-- Synced table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lyubo_synced(
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
-- Local optimistic table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lyubo_local(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  rating numeric(3, 1) NOT NULL DEFAULT 0,
  review text NOT NULL DEFAULT '',
  favorite boolean NOT NULL DEFAULT FALSE,
  watched_on text NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  changed_columns text[],
  is_deleted boolean NOT NULL DEFAULT FALSE,
  write_id uuid NOT NULL
);

-- ---------------------------------------------------------
-- Merged read view
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW lyubo AS
SELECT
  COALESCE(local.id, synced.id) AS id,
  CASE WHEN 'name' = ANY (local.changed_columns) THEN
    local.name
  ELSE
    synced.name
  END AS name,
  CASE WHEN 'rating' = ANY (local.changed_columns) THEN
    local.rating
  ELSE
    synced.rating
  END AS rating,
  CASE WHEN 'review' = ANY (local.changed_columns) THEN
    local.review
  ELSE
    synced.review
  END AS review,
  CASE WHEN 'favorite' = ANY (local.changed_columns) THEN
    local.favorite
  ELSE
    synced.favorite
  END AS favorite,
  CASE WHEN 'watched_on' = ANY (local.changed_columns) THEN
    local.watched_on
  ELSE
    synced.watched_on
  END AS watched_on,
  CASE WHEN 'created_at' = ANY (local.changed_columns) THEN
    local.created_at
  ELSE
    synced.created_at
  END AS created_at
FROM
  lyubo_synced synced
  FULL OUTER JOIN lyubo_local local ON synced.id = local.id
WHERE
  local.id IS NULL
  OR local.is_deleted = FALSE;

-- ---------------------------------------------------------
-- Cleanup triggers
-- ---------------------------------------------------------
-- The local write synced back: drop the local row unless it was written again since
CREATE OR REPLACE FUNCTION delete_lyubo_local_on_synced_change()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM lyubo_local
  WHERE id = NEW.id
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- The row is gone on the server: local edits of it have nothing left to apply to
CREATE OR REPLACE FUNCTION delete_lyubo_local_on_synced_delete()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM lyubo_local
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_lyubo_local_on_synced_insert
  AFTER INSERT OR UPDATE ON lyubo_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_lyubo_local_on_synced_change();

CREATE OR REPLACE TRIGGER delete_lyubo_local_on_synced_delete
  AFTER DELETE ON lyubo_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_lyubo_local_on_synced_delete();

-- ---------------------------------------------------------
-- INSTEAD OF INSERT
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION lyubo_insert_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  local_row lyubo_local%ROWTYPE;
BEGIN
  INSERT INTO lyubo_local(id, name, rating, review, favorite, watched_on, created_at, changed_columns, write_id)
    VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.rating, 0), COALESCE(NEW.review, ''), COALESCE(NEW.favorite, FALSE), COALESCE(NEW.watched_on, TO_CHAR(NOW(), 'YYYY-MM-DD')), COALESCE(NEW.created_at, NOW()), ARRAY['name', 'rating', 'review', 'favorite', 'watched_on', 'created_at'], gen_random_uuid())
  RETURNING
    * INTO local_row;
  PERFORM
    log_change('lyubo', 'insert', jsonb_build_object('id', local_row.id), to_jsonb(local_row) - ARRAY['changed_columns', 'is_deleted', 'write_id'], local_row.write_id);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- INSTEAD OF UPDATE
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION lyubo_update_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  synced lyubo_synced%ROWTYPE;
  cols text[] := '{}';
  wid uuid := gen_random_uuid();
  -- Only the columns this write changes go to the server
  edited jsonb := changed_values(to_jsonb(NEW), to_jsonb(OLD)) - 'id';
BEGIN
  IF edited = '{}'::jsonb THEN
    RETURN NEW;
  END IF;
  SELECT
    * INTO synced
  FROM
    lyubo_synced
  WHERE
    id = NEW.id;
  IF NEW.name IS DISTINCT FROM synced.name THEN
    cols := array_append(cols, 'name');
  END IF;
  IF NEW.rating IS DISTINCT FROM synced.rating THEN
    cols := array_append(cols, 'rating');
  END IF;
  IF NEW.review IS DISTINCT FROM synced.review THEN
    cols := array_append(cols, 'review');
  END IF;
  IF NEW.favorite IS DISTINCT FROM synced.favorite THEN
    cols := array_append(cols, 'favorite');
  END IF;
  IF NEW.watched_on IS DISTINCT FROM synced.watched_on THEN
    cols := array_append(cols, 'watched_on');
  END IF;
  IF NEW.created_at IS DISTINCT FROM synced.created_at THEN
    cols := array_append(cols, 'created_at');
  END IF;
  INSERT INTO lyubo_local
    VALUES (NEW.id, NEW.name, NEW.rating, NEW.review, NEW.favorite, NEW.watched_on, NEW.created_at, cols, FALSE, wid)
  ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      rating = EXCLUDED.rating,
      review = EXCLUDED.review,
      favorite = EXCLUDED.favorite,
      watched_on = EXCLUDED.watched_on,
      created_at = EXCLUDED.created_at,
      changed_columns = EXCLUDED.changed_columns,
      write_id = wid;
  PERFORM
    log_change('lyubo', 'update', jsonb_build_object('id', NEW.id), edited, wid);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- INSTEAD OF DELETE
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION lyubo_delete_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  wid uuid := gen_random_uuid();
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      lyubo_synced
    WHERE
      id = OLD.id) THEN
  -- Hide the synced row until the delete syncs back
  INSERT INTO lyubo_local(id, is_deleted, write_id)
    VALUES (OLD.id, TRUE, wid)
  ON CONFLICT (id)
    DO UPDATE SET
      is_deleted = TRUE,
      write_id = wid;
ELSE
  -- Never synced: no tombstone needed, it would never be cleaned up
  DELETE FROM lyubo_local
  WHERE id = OLD.id;
END IF;
  PERFORM
    log_change('lyubo', 'delete', jsonb_build_object('id', OLD.id), NULL, wid);
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- Attach triggers
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- Realtime sync (RealtimeSync passes jsonb arrays of rows / keys)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION lyubo_synced_upsert(rows jsonb)
  RETURNS void
  AS $$
  INSERT INTO lyubo_synced
  SELECT
    *
  FROM
    jsonb_populate_recordset(NULL::lyubo_synced, rows)
  ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      rating = EXCLUDED.rating,
      review = EXCLUDED.review,
      favorite = EXCLUDED.favorite,
      watched_on = EXCLUDED.watched_on,
      created_at = EXCLUDED.created_at,
      write_id = EXCLUDED.write_id
    WHERE (lyubo_synced.*) IS DISTINCT FROM (EXCLUDED.*);
$$
LANGUAGE sql;

CREATE OR REPLACE FUNCTION lyubo_synced_remove(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM lyubo_synced
  WHERE id IN (
      SELECT
        id
      FROM
        jsonb_populate_recordset(NULL::lyubo_synced, keys));
$$
LANGUAGE sql;

-- Deletes every row missing from a complete result
CREATE OR REPLACE FUNCTION lyubo_synced_retain(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM lyubo_synced
  WHERE id NOT IN (
      SELECT
        id
      FROM
        jsonb_populate_recordset(NULL::lyubo_synced, keys));
$$
LANGUAGE sql;

