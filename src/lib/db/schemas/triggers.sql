CREATE OR REPLACE FUNCTION log_insert()
  RETURNS TRIGGER
  AS $$
DECLARE
  pk jsonb := '{}'::jsonb;
  col text;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    pk := pk || jsonb_build_object(col, to_jsonb(NEW) -> col);
  END LOOP;
  INSERT INTO changes(table_name, operation, primary_key, value, write_id, transaction_id)
    VALUES (TG_TABLE_NAME, 'insert', pk, to_jsonb(NEW), gen_random_uuid(), pg_current_xact_id());
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_update()
  RETURNS TRIGGER
  AS $$
BEGIN
  INSERT INTO changes(table_name, operation, primary_key, value, write_id, transaction_id)
    VALUES(TG_TABLE_NAME, 'update', jsonb_build_object('id', NEW.id), to_jsonb(NEW), gen_random_uuid(), pg_current_xact_id());
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_delete()
  RETURNS TRIGGER
  AS $$
DECLARE
  pk jsonb := '{}'::jsonb;
  col text;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    pk := pk || jsonb_build_object(col, to_jsonb(OLD) -> col);
  END LOOP;
  INSERT INTO changes(table_name, operation, primary_key, write_id, transaction_id)
    VALUES (TG_TABLE_NAME, 'delete', pk, gen_random_uuid(), pg_current_xact_id());
  RETURN OLD;
END;
$$
LANGUAGE plpgsql;

