-- =========================================================
-- collections.sql
-- Collections schema (local optimistic writes + sync). One row per table of records
-- =========================================================
-- ---------------------------------------------------------
-- Synced (server-authoritative) table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections_synced(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  sort_column text,
  sort_direction text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  write_id uuid
);

-- ---------------------------------------------------------
-- Local optimistic table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections_local(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  sort_column text,
  sort_direction text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  changed_columns text[],
  is_deleted boolean NOT NULL DEFAULT FALSE,
  write_id uuid NOT NULL
);

-- ---------------------------------------------------------
-- Merged read view
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW collections AS
SELECT
  COALESCE(local.id, synced.id) AS id,
  CASE WHEN 'name' = ANY (local.changed_columns) THEN
    local.name
  ELSE
    synced.name
  END AS name,
  CASE WHEN 'position' = ANY (local.changed_columns) THEN
    local.position
  ELSE
    synced.position
  END AS position,
  CASE WHEN 'sort_column' = ANY (local.changed_columns) THEN
    local.sort_column
  ELSE
    synced.sort_column
  END AS sort_column,
  CASE WHEN 'sort_direction' = ANY (local.changed_columns) THEN
    local.sort_direction
  ELSE
    synced.sort_direction
  END AS sort_direction,
  CASE WHEN 'created_at' = ANY (local.changed_columns) THEN
    local.created_at
  ELSE
    synced.created_at
  END AS created_at
FROM
  collections_synced synced
  FULL OUTER JOIN collections_local local ON synced.id = local.id
WHERE
  local.id IS NULL
  OR local.is_deleted = FALSE;

-- ---------------------------------------------------------
-- Cleanup local state when synced rows arrive
-- ---------------------------------------------------------
-- The local write synced back: drop the local row unless it was written again since
CREATE OR REPLACE FUNCTION delete_collections_local_on_synced_change()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM collections_local
  WHERE id = NEW.id
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- The row is gone on the server: local edits of it have nothing left to apply to
CREATE OR REPLACE FUNCTION delete_collections_local_on_synced_delete()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM collections_local
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_collections_local_on_synced_insert
  AFTER INSERT OR UPDATE ON collections_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_collections_local_on_synced_change();

CREATE OR REPLACE TRIGGER delete_collections_local_on_synced_delete
  AFTER DELETE ON collections_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_collections_local_on_synced_delete();

-- ---------------------------------------------------------
-- INSTEAD OF INSERT on view
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION collections_insert_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  local_row collections_local%ROWTYPE;
BEGIN
  INSERT INTO collections_local(id, name, position, sort_column, sort_direction, created_at, changed_columns, write_id)
    VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.position, 0), NEW.sort_column, NEW.sort_direction, COALESCE(NEW.created_at, NOW()), ARRAY['name', 'position', 'sort_column', 'sort_direction', 'created_at'], gen_random_uuid())
  RETURNING
    * INTO local_row;
  PERFORM
    log_change('collections', 'insert', jsonb_build_object('id', local_row.id), to_jsonb(local_row) - ARRAY['changed_columns', 'is_deleted', 'write_id'], local_row.write_id);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- INSTEAD OF UPDATE on view
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION collections_update_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  synced collections_synced%ROWTYPE;
  changed_cols text[] := '{}';
  local_write_id uuid := gen_random_uuid();
  -- Only the columns this write changes go to the server
  edited jsonb := changed_values(to_jsonb(NEW), to_jsonb(OLD)) - 'id';
BEGIN
  IF edited = '{}'::jsonb THEN
    RETURN NEW;
  END IF;
  SELECT
    * INTO synced
  FROM
    collections_synced
  WHERE
    id = NEW.id;
  -- Changed columns are always relative to the synced row, so every edit recomputes them
  IF NEW.name IS DISTINCT FROM synced.name THEN
    changed_cols := array_append(changed_cols, 'name');
  END IF;
  IF NEW.position IS DISTINCT FROM synced.position THEN
    changed_cols := array_append(changed_cols, 'position');
  END IF;
  IF NEW.sort_column IS DISTINCT FROM synced.sort_column THEN
    changed_cols := array_append(changed_cols, 'sort_column');
  END IF;
  IF NEW.sort_direction IS DISTINCT FROM synced.sort_direction THEN
    changed_cols := array_append(changed_cols, 'sort_direction');
  END IF;
  IF NEW.created_at IS DISTINCT FROM synced.created_at THEN
    changed_cols := array_append(changed_cols, 'created_at');
  END IF;
  INSERT INTO collections_local(id, name, position, sort_column, sort_direction, created_at, changed_columns, write_id)
    VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.position, 0), NEW.sort_column, NEW.sort_direction, COALESCE(NEW.created_at, NOW()), changed_cols, local_write_id)
  ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      position = EXCLUDED.position,
      sort_column = EXCLUDED.sort_column,
      sort_direction = EXCLUDED.sort_direction,
      created_at = EXCLUDED.created_at,
      changed_columns = EXCLUDED.changed_columns,
      write_id = local_write_id;
  PERFORM
    log_change('collections', 'update', jsonb_build_object('id', NEW.id), edited, local_write_id);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- INSTEAD OF DELETE on view
-- ---------------------------------------------------------
-- The server deletes the records and tags of the collection with it (ON DELETE CASCADE), and
-- Realtime then removes them locally
CREATE OR REPLACE FUNCTION collections_delete_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  local_write_id uuid := gen_random_uuid();
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      collections_synced
    WHERE
      id = OLD.id) THEN
  -- Hide the synced row until the delete syncs back
  INSERT INTO collections_local(id, is_deleted, write_id)
    VALUES (OLD.id, TRUE, local_write_id)
  ON CONFLICT (id)
    DO UPDATE SET
      is_deleted = TRUE,
      write_id = local_write_id;
ELSE
  -- Never synced: no tombstone needed, it would never be cleaned up
  DELETE FROM collections_local
  WHERE id = OLD.id;
END IF;
  -- Its records, tags and relations that never synced would stay forever: the server deletes them
  -- with the collection, so they never sync back. Edits of synced rows go when the server's
  -- delete arrives. Their logged changes stay and are sent as usual
  DELETE FROM lyubo_tags_local rel
  WHERE NOT EXISTS (
      SELECT
        1
      FROM
        lyubo_tags_synced synced
      WHERE
        synced.lyubo_id = rel.lyubo_id
        AND synced.tag_id = rel.tag_id)
    AND (rel.lyubo_id IN (
        SELECT
          id
        FROM
          lyubo_local
        WHERE
          collection_id = OLD.id
        UNION
        SELECT
          id
        FROM
          lyubo_synced
        WHERE
          collection_id = OLD.id)
        OR rel.tag_id IN (
          SELECT
            id
          FROM
            tags_local
          WHERE
            collection_id = OLD.id
          UNION
          SELECT
            id
          FROM
            tags_synced
          WHERE
            collection_id = OLD.id));
  DELETE FROM lyubo_local l
  WHERE l.collection_id = OLD.id
    AND NOT EXISTS (
      SELECT
        1
      FROM
        lyubo_synced synced
      WHERE
        synced.id = l.id);
  DELETE FROM tags_local t
  WHERE t.collection_id = OLD.id
    AND NOT EXISTS (
      SELECT
        1
      FROM
        tags_synced synced
      WHERE
        synced.id = t.id);
  PERFORM
    log_change('collections', 'delete', jsonb_build_object('id', OLD.id), NULL, local_write_id);
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- Attach INSTEAD OF triggers
-- ---------------------------------------------------------
CREATE OR REPLACE TRIGGER collections_insert
  INSTEAD OF INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION collections_insert_trigger();

CREATE OR REPLACE TRIGGER collections_update
  INSTEAD OF UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION collections_update_trigger();

CREATE OR REPLACE TRIGGER collections_delete
  INSTEAD OF DELETE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION collections_delete_trigger();

-- ---------------------------------------------------------
-- Realtime sync (RealtimeSync passes jsonb arrays of rows / keys)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION collections_synced_upsert(rows jsonb)
  RETURNS void
  AS $$
  INSERT INTO collections_synced
  SELECT
    *
  FROM
    jsonb_populate_recordset(NULL::collections_synced, rows)
  ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      position = EXCLUDED.position,
      sort_column = EXCLUDED.sort_column,
      sort_direction = EXCLUDED.sort_direction,
      created_at = EXCLUDED.created_at,
      write_id = EXCLUDED.write_id
    WHERE (collections_synced.*) IS DISTINCT FROM (EXCLUDED.*);
$$
LANGUAGE sql;

CREATE OR REPLACE FUNCTION collections_synced_remove(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM collections_synced
  WHERE id IN (
      SELECT
        id
      FROM
        jsonb_populate_recordset(NULL::collections_synced, keys));
$$
LANGUAGE sql;

-- Deletes every row missing from a complete result
CREATE OR REPLACE FUNCTION collections_synced_retain(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM collections_synced
  WHERE id NOT IN (
      SELECT
        id
      FROM
        jsonb_populate_recordset(NULL::collections_synced, keys));
$$
LANGUAGE sql;
