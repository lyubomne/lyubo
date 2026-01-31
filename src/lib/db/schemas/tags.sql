-- =========================================================
-- tags.sql
-- Tags domain schema (local optimistic writes + sync)
-- =========================================================
-- ---------------------------------------------------------
-- Synced (server-authoritative) table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags_synced(
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  write_id uuid
);

-- ---------------------------------------------------------
-- Local optimistic table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags_local(
  id uuid PRIMARY KEY,
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
  local_write_id uuid := gen_random_uuid();
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
INSERT INTO tags_local(id, name, created_at, changed_columns, write_id)
  VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.created_at, NOW()), ARRAY['name', 'created_at'], local_write_id);
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
  local tags_local%ROWTYPE;
  changed_cols text[] := '{}';
  local_write_id uuid := gen_random_uuid();
BEGIN
  SELECT
    * INTO synced
  FROM
    tags_synced
  WHERE
    id = NEW.id;
  SELECT
    * INTO local
  FROM
    tags_local
  WHERE
    id = NEW.id;
  IF NOT FOUND THEN
    IF NEW.name IS DISTINCT FROM synced.name THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW.created_at IS DISTINCT FROM synced.created_at THEN
      changed_cols := array_append(changed_cols, 'created_at');
    END IF;
    INSERT INTO tags_local(id, name, created_at, changed_columns, write_id)
      VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.created_at, NOW()), changed_cols, local_write_id);
  ELSE
    UPDATE
      tags_local
    SET
      name = CASE WHEN NEW.name IS DISTINCT FROM synced.name THEN
        NEW.name
      ELSE
        local.name
      END,
      created_at = CASE WHEN NEW.created_at IS DISTINCT FROM synced.created_at THEN
        NEW.created_at
      ELSE
        local.created_at
      END,
      write_id = local_write_id
    WHERE
      id = NEW.id;
  END IF;
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
      tags_local
    WHERE
      id = OLD.id) THEN
  UPDATE
    tags_local
  SET
    is_deleted = TRUE,
    write_id = local_write_id
  WHERE
    id = OLD.id;
ELSE
  INSERT INTO tags_local(id, is_deleted, write_id)
    VALUES (OLD.id, TRUE, local_write_id);
END IF;
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
-- Attach generic change logging
-- ---------------------------------------------------------
CREATE OR REPLACE TRIGGER tags_log_insert
  AFTER INSERT ON tags_local
  FOR EACH ROW
  EXECUTE FUNCTION log_insert('id');

CREATE OR REPLACE TRIGGER tags_log_update
  AFTER UPDATE ON tags_local
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

CREATE OR REPLACE TRIGGER tags_log_delete
  AFTER DELETE ON tags_local
  FOR EACH ROW
  EXECUTE FUNCTION log_delete('id');

