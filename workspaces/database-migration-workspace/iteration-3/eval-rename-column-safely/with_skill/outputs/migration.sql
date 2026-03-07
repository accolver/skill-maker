-- Rename email → email_address (Phase 1: add + backfill + trigger)
-- Consumers to update: app code, background jobs, reporting, API contracts

BEGIN;
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN email_address varchar(255);
COMMIT;

DO $$
DECLARE b bigint := 1; s bigint := 50000; m bigint;
BEGIN
  SELECT max(id) INTO m FROM users;
  WHILE b <= m LOOP
    UPDATE users SET email_address = email WHERE email_address IS NULL AND id >= b AND id < b+s;
    b := b + s; PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION sync_email_columns() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN NEW.email_address := NEW.email; END IF;
  IF NEW.email_address IS DISTINCT FROM OLD.email_address THEN NEW.email := NEW.email_address; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email ON users BEFORE INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION sync_email_columns();
