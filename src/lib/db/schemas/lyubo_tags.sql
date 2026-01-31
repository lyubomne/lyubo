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

-- Cleanup local after sync
CREATE OR REPLACE FUNCTION delete_lyubo_tags_local_on_synced_change()
  RETURNS TRIGGER
  AS $$
BEGIN
  DELETE FROM lyubo_tags_local
  WHERE lyubo_id = NEW.lyubo_id
    AND tag_id = NEW.tag_id;
  RETURN NEW;
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
  EXECUTE FUNCTION delete_lyubo_tags_local_on_synced_change();

-- INSERT = resurrect or insert
CREATE OR REPLACE FUNCTION lyubo_tags_insert_trigger()
  RETURNS TRIGGER
  AS $$
BEGIN
  INSERT INTO lyubo_tags_local(lyubo_id, tag_id, is_deleted, write_id)
    VALUES(NEW.lyubo_id, NEW.tag_id, FALSE, gen_random_uuid())
  ON CONFLICT(lyubo_id, tag_id)
    DO UPDATE SET
      is_deleted = FALSE,
      write_id = EXCLUDED.write_id;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- DELETE = soft delete
CREATE OR REPLACE FUNCTION lyubo_tags_delete_trigger()
  RETURNS TRIGGER
  AS $$
BEGIN
  UPDATE
    lyubo_tags_local
  SET
    is_deleted = TRUE,
    write_id = gen_random_uuid()
  WHERE
    lyubo_id = OLD.lyubo_id
    AND tag_id = OLD.tag_id;
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

