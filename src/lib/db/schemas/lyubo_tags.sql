-- =========================================================
-- lyubo_tags.sql
-- =========================================================
CREATE TABLE IF NOT EXISTS lyubo_tags_synced(
  lyubo_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  write_id uuid,
  PRIMARY KEY (lyubo_id, tag_id)
);

CREATE TABLE IF NOT EXISTS lyubo_tags_local(
  lyubo_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  is_deleted boolean NOT NULL DEFAULT FALSE,
  write_id uuid NOT NULL,
  PRIMARY KEY (lyubo_id, tag_id)
);

CREATE OR REPLACE VIEW lyubo_tags AS
SELECT
  COALESCE(local.lyubo_id, synced.lyubo_id) AS lyubo_id,
  COALESCE(local.tag_id, synced.tag_id) AS tag_id
FROM
  lyubo_tags_synced synced
  FULL OUTER JOIN lyubo_tags_local local ON synced.lyubo_id = local.lyubo_id
  AND synced.tag_id = local.tag_id
WHERE
  local.lyubo_id IS NULL
  OR local.is_deleted = FALSE;

-- Cleanup local after sync: the local write synced back, unless it was written again since
CREATE OR REPLACE FUNCTION delete_lyubo_tags_local_on_synced_change()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM lyubo_tags_local
  WHERE lyubo_id = NEW.lyubo_id
    AND tag_id = NEW.tag_id
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- The relation is gone on the server
CREATE OR REPLACE FUNCTION delete_lyubo_tags_local_on_synced_delete()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM lyubo_tags_local
  WHERE lyubo_id = OLD.lyubo_id
    AND tag_id = OLD.tag_id;
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_lyubo_tags_local_on_synced_insert
  AFTER INSERT OR UPDATE ON lyubo_tags_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_lyubo_tags_local_on_synced_change();

CREATE OR REPLACE TRIGGER delete_lyubo_tags_local_on_synced_delete
  AFTER DELETE ON lyubo_tags_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_lyubo_tags_local_on_synced_delete();

-- Realtime sync (RealtimeSync passes jsonb arrays of rows / keys)
CREATE OR REPLACE FUNCTION lyubo_tags_synced_upsert(rows jsonb)
  RETURNS void
  AS $$
  INSERT INTO lyubo_tags_synced
  SELECT
    *
  FROM
    jsonb_populate_recordset(NULL::lyubo_tags_synced, rows)
  ON CONFLICT (lyubo_id,
    tag_id)
    DO UPDATE SET
      write_id = EXCLUDED.write_id
    WHERE (lyubo_tags_synced.*) IS DISTINCT FROM (EXCLUDED.*);
$$
LANGUAGE sql;

CREATE OR REPLACE FUNCTION lyubo_tags_synced_remove(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM lyubo_tags_synced
  WHERE (lyubo_id, tag_id) IN (
      SELECT
        lyubo_id,
        tag_id
      FROM
        jsonb_populate_recordset(NULL::lyubo_tags_synced, keys));
$$
LANGUAGE sql;

-- Deletes every row missing from a complete result
CREATE OR REPLACE FUNCTION lyubo_tags_synced_retain(keys jsonb)
  RETURNS void
  AS $$
  DELETE FROM lyubo_tags_synced
  WHERE (lyubo_id, tag_id) NOT IN (
      SELECT
        lyubo_id,
        tag_id
      FROM
        jsonb_populate_recordset(NULL::lyubo_tags_synced, keys));
$$
LANGUAGE sql;

-- INSERT = resurrect or insert
CREATE OR REPLACE FUNCTION lyubo_tags_insert_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  wid uuid := gen_random_uuid();
  pk jsonb := jsonb_build_object('lyubo_id', NEW.lyubo_id, 'tag_id', NEW.tag_id);
BEGIN
  INSERT INTO lyubo_tags_local(lyubo_id, tag_id, is_deleted, write_id)
    VALUES (NEW.lyubo_id, NEW.tag_id, FALSE, wid)
  ON CONFLICT (lyubo_id, tag_id)
    DO UPDATE SET
      is_deleted = FALSE,
      write_id = wid;
  PERFORM
    log_change('lyubo_tags', 'insert', pk, '{}'::jsonb, wid);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- DELETE = soft delete
CREATE OR REPLACE FUNCTION lyubo_tags_delete_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  wid uuid := gen_random_uuid();
  pk jsonb := jsonb_build_object('lyubo_id', OLD.lyubo_id, 'tag_id', OLD.tag_id);
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      lyubo_tags_synced
    WHERE
      lyubo_id = OLD.lyubo_id
      AND tag_id = OLD.tag_id) THEN
  -- Hide the synced relation until the delete syncs back
  INSERT INTO lyubo_tags_local(lyubo_id, tag_id, is_deleted, write_id)
    VALUES (OLD.lyubo_id, OLD.tag_id, TRUE, wid)
  ON CONFLICT (lyubo_id, tag_id)
    DO UPDATE SET
      is_deleted = TRUE,
      write_id = wid;
ELSE
  -- Never synced: no tombstone needed, it would never be cleaned up
  DELETE FROM lyubo_tags_local
  WHERE lyubo_id = OLD.lyubo_id
    AND tag_id = OLD.tag_id;
END IF;
  PERFORM
    log_change('lyubo_tags', 'delete', pk, NULL, wid);
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lyubo_tags_insert
  INSTEAD OF INSERT ON lyubo_tags
  FOR EACH ROW
  EXECUTE FUNCTION lyubo_tags_insert_trigger();

CREATE OR REPLACE TRIGGER lyubo_tags_delete
  INSTEAD OF DELETE ON lyubo_tags
  FOR EACH ROW
  EXECUTE FUNCTION lyubo_tags_delete_trigger();

