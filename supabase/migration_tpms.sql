-- ============================================================
-- Migration: TPMS seuil de pression configurable par scooter
-- A executer dans Supabase SQL Editor
-- ============================================================

-- Seuil de pression configurable (en bar, defaut 2.0)
ALTER TABLE scooters
  ADD COLUMN IF NOT EXISTS tpms_threshold FLOAT8 DEFAULT 2.0;
