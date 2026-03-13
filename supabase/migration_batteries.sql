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
  ADD COLUMN IF NOT EXISTS soh          REAL,
  ADD COLUMN IF NOT EXISTS voltage      REAL,
  ADD COLUMN IF NOT EXISTS current_a    REAL,
  ADD COLUMN IF NOT EXISTS power_w      REAL,
  ADD COLUMN IF NOT EXISTS temperature  REAL,
  ADD COLUMN IF NOT EXISTS cell_voltages JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cell_temps   JSONB     DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cycles       INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protection   JSONB     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();

-- Un seul slot par scooter (empeche doublon slot 1 + slot 1)
ALTER TABLE batteries
  ADD CONSTRAINT unique_scooter_slot UNIQUE (scooter_id, slot);

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
