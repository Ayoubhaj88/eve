-- ============================================================
-- Migration: MPU-6050 accelerometer data + fall detection
-- A executer dans Supabase SQL Editor
-- ============================================================

-- Colonnes accelerometre dans telemetry
ALTER TABLE telemetry
  ADD COLUMN IF NOT EXISTS accel_x FLOAT8,
  ADD COLUMN IF NOT EXISTS accel_y FLOAT8,
  ADD COLUMN IF NOT EXISTS accel_z FLOAT8;

-- Supprimer les colonnes inutiles de telemetry
ALTER TABLE telemetry
  DROP COLUMN IF EXISTS battery,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS range,
  DROP COLUMN IF EXISTS speed;

-- Simplifier la table batteries (garder id, scooter_id, serial_number, soc, slot)
ALTER TABLE batteries
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS label,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS is_primary,
  DROP COLUMN IF EXISTS capacity_ah,
  DROP COLUMN IF EXISTS cell_count,
  DROP COLUMN IF EXISTS soh,
  DROP COLUMN IF EXISTS voltage,
  DROP COLUMN IF EXISTS current_a,
  DROP COLUMN IF EXISTS power_w,
  DROP COLUMN IF EXISTS temperature,
  DROP COLUMN IF EXISTS cell_voltages,
  DROP COLUMN IF EXISTS cell_temps,
  DROP COLUMN IF EXISTS cycles,
  DROP COLUMN IF EXISTS bms_status,
  DROP COLUMN IF EXISTS protection,
  DROP COLUMN IF EXISTS updated_at;

-- S'assurer que slot et soc existent
ALTER TABLE batteries
  ADD COLUMN IF NOT EXISTS slot INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS soc  REAL;

-- Supprimer le trigger updated_at (plus besoin)
DROP TRIGGER IF EXISTS trg_battery_updated ON batteries;
DROP FUNCTION IF EXISTS update_battery_timestamp();

-- Seuil de chute configurable par scooter (en g, defaut 2.5)
ALTER TABLE scooters
  ADD COLUMN IF NOT EXISTS fall_threshold FLOAT8 DEFAULT 2.5;
