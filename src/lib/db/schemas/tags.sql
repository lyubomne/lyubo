-- =========================================================
-- tags.sql
-- Tags domain schema (local optimistic writes + sync)
-- =========================================================
-- ---------------------------------------------------------
-- Synced (server-authoritative) table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags_synced(
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  write_id uuid
);

-- ---------------------------------------------------------
-- Local optimistic table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags_local(
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  changed_columns text[],
  is_deleted boolean NOT NULL DEFAULT FALSE,
  write_id uuid NOT NULL
);

-- ---------------------------------------------------------
-- Merged read view
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW tags AS
SELECT
  COALESCE(local.id, synced.id) AS id,
  CASE WHEN 'collection_id' = ANY (local.changed_columns) THEN
    local.collection_id
  ELSE
    synced.collection_id
  END AS collection_id,
  CASE WHEN 'name' = ANY (local.changed_columns) THEN
    local.name
  ELSE
    synced.name
  END AS name,
  CASE WHEN 'created_at' = ANY (local.changed_columns) THEN
    local.created_at
  ELSE
    synced.created_at
  END AS created_at
FROM
  tags_synced synced
  FULL OUTER JOIN tags_local local ON synced.id = local.id
WHERE
  local.id IS NULL
  OR local.is_deleted = FALSE;

-- ---------------------------------------------------------
-- One name per collection
-- ---------------------------------------------------------
-- The server rejects a second tag with the same name (any case) in one collection, and a rejected
-- change rolls back every unsent local write. Rejecting it here keeps it out of the change log
CREATE OR REPLACE FUNCTION tags_assert_unique_name(tag_id uuid, tag_collection_id uuid, tag_name text)
  RETURNS void
  AS $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      tags
    WHERE
      collection_id = tag_collection_id
      AND lower(name) = lower(tag_name)
      AND id <> tag_id) THEN
  RAISE EXCEPTION 'A tag with this name already exists'
    USING ERRCODE = 'unique_violation';
END IF;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- Cleanup local state when synced rows arrive
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_tags_local_on_synced_insert_and_update_trigger()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM tags_local
  WHERE id = NEW.id
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_tags_local_on_synced_delete_trigger()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM tags_local
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_tags_local_on_synced_insert
  AFTER INSERT OR UPDATE ON tags_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_tags_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_tags_local_on_synced_delete
  AFTER DELETE ON tags_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_tags_local_on_synced_delete_trigger();

-- ---------------------------------------------------------
-- INSTEAD OF INSERT on view
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION tags_insert_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  local_row tags_local%ROWTYPE;
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      tags_synced
    WHERE
      id = NEW.id) THEN
  RAISE EXCEPTION 'Cannot insert: id already exists in synced table';
END IF;
  PERFORM
    tags_assert_unique_name(NEW.id, NEW.collection_id, COALESCE(NEW.name, ''));
INSERT INTO tags_local(id, collection_id, name, created_at, changed_columns, write_id)
  VALUES (NEW.id, NEW.collection_id, COALESCE(NEW.name, ''), COALESCE(NEW.created_at, NOW()), ARRAY['collection_id', 'name', 'created_at'], gen_random_uuid())
RETURNING
  * INTO local_row;
  PERFORM
    log_change('tags', 'insert', jsonb_build_object('id', local_row.id), to_jsonb(local_row) - ARRAY['changed_columns', 'is_deleted', 'write_id'], local_row.write_id);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- INSTEAD OF UPDATE on view
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION tags_update_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  synced tags_synced%ROWTYPE;
  changed_cols text[] := '{}';
  local_write_id uuid := gen_random_uuid();
  -- Only the columns this write changes go to the server
  edited jsonb := changed_values(to_jsonb(NEW), to_jsonb(OLD)) - 'id';
BEGIN
  IF edited = '{}'::jsonb THEN
    RETURN NEW;
  END IF;
  IF edited ? 'name' THEN
    PERFORM
      tags_assert_unique_name(NEW.id, NEW.collection_id, COALESCE(NEW.name, ''));
  END IF;
  SELECT
    * INTO synced
  FROM
    tags_synced
  WHERE
    id = NEW.id;
  -- Changed columns are always relative to the synced row, so every edit recomputes them
  IF NEW.collection_id IS DISTINCT FROM synced.collection_id THEN
    changed_cols := array_append(changed_cols, 'collection_id');
  END IF;
  IF NEW.name IS DISTINCT FROM synced.name THEN
    changed_cols := array_append(changed_cols, 'name');
  END IF;
  IF NEW.created_at IS DISTINCT FROM synced.created_at THEN
    changed_cols := array_append(changed_cols, 'created_at');
  END IF;
  INSERT INTO tags_local(id, collection_id, name, created_at, changed_columns, write_id)
    VALUES (NEW.id, NEW.collection_id, COALESCE(NEW.name, ''), COALESCE(NEW.created_at, NOW()), changed_cols, local_write_id)
  ON CONFLICT (id)
    DO UPDATE SET
      collection_id = EXCLUDED.collection_id,
      name = EXCLUDED.name,
      created_at = EXCLUDED.created_at,
      changed_columns = EXCLUDED.changed_columns,
      write_id = local_write_id;
  PERFORM
    log_change('tags', 'update', jsonb_build_object('id', NEW.id), edited, local_write_id);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- INSTEAD OF DELETE on view
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION tags_delete_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  local_write_id uuid := gen_random_uuid();
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      tags_synced
    WHERE
      id = OLD.id) THEN
  -- Hide the synced row until the delete syncs back
  -- A tombstone keeps the collection: the column is NOT NULL
  INSERT INTO tags_local(id, collection_id, is_deleted, write_id)
    VALUES (OLD.id, OLD.collection_id, TRUE, local_write_id)
  ON CONFLICT (id)
    DO UPDATE SET
      is_deleted = TRUE,
      write_id = local_write_id;
ELSE
  -- Never synced: no tombstone needed, it would never be cleaned up
  DELETE FROM tags_local
  WHERE id = OLD.id;
END IF;
  PERFORM
    log_change('tags', 'delete', jsonb_build_object('id', OLD.id), NULL, local_write_id);
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- Attach INSTEAD OF triggers
-- ---------------------------------------------------------
CREATE OR REPLACE TRIGGER tags_insert
  INSTEAD OF INSERT ON tags
  FOR EACH ROW
  EXECUTE FUNCTION tags_insert_trigger();

CREATE OR REPLACE TRIGGER tags_update
  INSTEAD OF UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION tags_update_trigger();

CREATE OR REPLACE TRIGGER tags_delete
  INSTEAD OF DELETE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION tags_delete_trigger();

-- ---------------------------------------------------------
-- Realtime sync (RealtimeSync passes jsonb arrays of rows / keys)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION tags_synced_upsert(rows jsonb)
  RETURNS void
  AS $$
  INSERT INTO tags_synced
  SELECT
    *
  FROM
    jsonb_populate_recordset(NULL::tags_synced, rows)
  ON CONFLICT (id)
    DO UPDATE SET
      collection_id = EXCLUDED.collection_id,
      name = EXCLUDED.name,
      created_at = EXCLUDED.created_at,
      write_id = EXCLUDED.write_id
    WHERE (tags_synced.*) IS DISTINCT FROM (EXCLUDED.*);
$$
LANGUAGE sql;

CREATE OR REPLACE FUNCTION tags_synced_remove(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM tags_synced
  WHERE id IN (
      SELECT
        id
      FROM
        jsonb_populate_recordset(NULL::tags_synced, keys));
$$
LANGUAGE sql;

-- Deletes every row missing from a complete result
CREATE OR REPLACE FUNCTION tags_synced_retain(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM tags_synced
  WHERE id NOT IN (
      SELECT
        id
      FROM
        jsonb_populate_recordset(NULL::tags_synced, keys));
$$
LANGUAGE sql;
