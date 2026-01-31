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

CREATE OR REPLACE TRIGGER delete_lyubo_local_on_synced_insert
  AFTER INSERT OR UPDATE ON lyubo_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_lyubo_local_on_synced_change();

CREATE OR REPLACE TRIGGER delete_lyubo_local_on_synced_delete
  AFTER DELETE ON lyubo_synced
  FOR EACH ROW
  EXECUTE FUNCTION delete_lyubo_local_on_synced_change();

-- ---------------------------------------------------------
-- INSTEAD OF INSERT
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION lyubo_insert_trigger()
  RETURNS TRIGGER
  AS $$
DECLARE
  wid uuid := gen_random_uuid();
BEGIN
  INSERT INTO lyubo_local(id, name, rating, review, favorite, watched_on, created_at, changed_columns, write_id)
    VALUES (NEW.id, COALESCE(NEW.name, ''), COALESCE(NEW.rating, 0), COALESCE(NEW.review, ''), COALESCE(NEW.favorite, FALSE), COALESCE(NEW.watched_on, TO_CHAR(NOW(), 'YYYY-MM-DD')), COALESCE(NEW.created_at, NOW()), ARRAY['name', 'rating', 'review', 'favorite', 'watched_on', 'created_at'], wid);
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
  local lyubo_local%ROWTYPE;
  cols text[] := '{}';
  wid uuid := gen_random_uuid();
BEGIN
  SELECT
    * INTO synced
  FROM
    lyubo_synced
  WHERE
    id = NEW.id;
  SELECT
    * INTO local
  FROM
    lyubo_local
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
BEGIN
  INSERT INTO lyubo_local(id, is_deleted, write_id)
    VALUES(OLD.id, TRUE, gen_random_uuid())
  ON CONFLICT(id)
    DO UPDATE SET
      is_deleted = TRUE,
      write_id = gen_random_uuid();
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
-- Change logging
-- ---------------------------------------------------------
CREATE OR REPLACE TRIGGER lyubo_log_insert
  AFTER INSERT ON lyubo_local
  FOR EACH ROW
  EXECUTE FUNCTION log_insert('id');

CREATE OR REPLACE TRIGGER lyubo_log_update
  AFTER UPDATE ON lyubo_local
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

CREATE OR REPLACE TRIGGER lyubo_log_delete
  AFTER DELETE ON lyubo_local
  FOR EACH ROW
  EXECUTE FUNCTION log_delete('id');

