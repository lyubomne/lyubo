-- =========================================================
-- triggers.sql
-- Change log helpers, called from the INSTEAD OF triggers of the merged views
-- =========================================================
-- ---------------------------------------------------------
-- Remove the old logging from AFTER triggers on *_local
-- ---------------------------------------------------------
-- They logged the operation of the local table instead of the user's operation (an edit of a
-- synced row became an `insert`), and they also fired on cleanup and rollback deletes.
-- CASCADE drops the triggers that still use them in databases created before this change.
DROP FUNCTION IF EXISTS log_insert() CASCADE;

DROP FUNCTION IF EXISTS log_update() CASCADE;

DROP FUNCTION IF EXISTS log_delete() CASCADE;

-- ---------------------------------------------------------
-- Record one local write
-- ---------------------------------------------------------
-- `write_id` must be the write_id stored in the *_local row: the server saves it, and when the
-- write syncs back the cleanup trigger on *_synced drops the local row with the same write_id.
CREATE OR REPLACE FUNCTION log_change(table_name text, operation text, primary_key jsonb, value jsonb, write_id uuid)
  RETURNS void
  AS $$
  INSERT INTO changes(table_name, operation, primary_key, value, write_id, transaction_id)
    VALUES (table_name, operation, primary_key, value, write_id, pg_current_xact_id());
$$
LANGUAGE sql;

-- ---------------------------------------------------------
-- Columns whose values differ between two rows
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION changed_values(new_row jsonb, old_row jsonb)
  RETURNS jsonb
  AS $$
  SELECT
    COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM
    jsonb_each(new_row)
  WHERE
    value IS DISTINCT FROM old_row -> key;
$$
LANGUAGE sql
IMMUTABLE;
