-- ============================================================
-- Migration: batteries multi-pack + BMS data
-- A executer dans Supabase SQL Editor
-- ============================================================

-- Supprimer la vue inutilisee
DROP VIEW IF EXISTS scooters_live;

-- Nouveaux champs batteries
ALTER TABLE batteries
  ADD COLUMN IF NOT EXISTS slot         INTEGER   DEFAULT 1,
  ADD COLUMN IF NOT EXISTS capacity_ah  REAL      DEFAULT 20,
  ADD COLUMN IF NOT EXISTS cell_count   INTEGER   DEFAULT 16,
  ADD COLUMN IF NOT EXISTS soc          REAL,
  ADD COLUMN IF NOT EXISTS soh          REAL,
  ADD COLUMN IF NOT EXISTS voltage      REAL,
  ADD COLUMN IF NOT EXISTS current_a    REAL,
  ADD COLUMN IF NOT EXISTS power_w      REAL,
  ADD COLUMN IF NOT EXISTS temperature  REAL,
  ADD COLUMN IF NOT EXISTS cell_voltages JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cell_temps   JSONB     DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cycles       INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bms_status   TEXT      DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS protection   JSONB     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();

-- Un seul slot par scooter (empeche doublon slot 1 + slot 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_scooter_slot'
  ) THEN
    ALTER TABLE batteries ADD CONSTRAINT unique_scooter_slot UNIQUE (scooter_id, slot);
  END IF;
END $$;

-- CASCADE : supprimer les batteries quand on supprime un scooter
-- D'abord enlever l'ancienne FK, puis la recreer avec CASCADE
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'batteries'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'scooter_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE batteries DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE batteries
    ADD CONSTRAINT fk_batteries_scooter
    FOREIGN KEY (scooter_id) REFERENCES scooters(id) ON DELETE CASCADE;
END $$;

-- Nettoyer les batteries orphelines (scooter supprime)
DELETE FROM batteries
WHERE scooter_id NOT IN (SELECT id FROM scooters);

-- Index pour les requetes par scooter
CREATE INDEX IF NOT EXISTS idx_batteries_scooter
  ON batteries (scooter_id, slot);

-- Trigger : met a jour updated_at a chaque PATCH
CREATE OR REPLACE FUNCTION update_battery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_battery_updated ON batteries;
CREATE TRIGGER trg_battery_updated
  BEFORE UPDATE ON batteries
  FOR EACH ROW
  EXECUTE FUNCTION update_battery_timestamp();

-- Active Realtime sur batteries (si pas deja fait)
ALTER PUBLICATION supabase_realtime ADD TABLE batteries;
