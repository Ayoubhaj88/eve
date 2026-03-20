-- ============================================================
-- Migration: batteries (simple)
-- A executer dans Supabase SQL Editor
-- ============================================================

-- Supprimer la vue inutilisee
DROP VIEW IF EXISTS scooters_live;

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

-- Realtime deja active sur batteries (rien a faire)
