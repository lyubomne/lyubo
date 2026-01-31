-- Global change log
CREATE TABLE IF NOT EXISTS changes(
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  primary_key jsonb NOT NULL,
  value jsonb,
  write_id uuid NOT NULL,
  transaction_id XID8 NOT NULL
);

-- Notify listeners
CREATE OR REPLACE FUNCTION changes_notify_trigger()
  RETURNS TRIGGER
  AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS changes_notify ON changes;

CREATE TRIGGER changes_notify
  AFTER INSERT ON changes
  FOR EACH ROW
  EXECUTE FUNCTION changes_notify_trigger();

