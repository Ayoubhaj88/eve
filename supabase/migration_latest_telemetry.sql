-- ============================================================
-- Migration: computed relationship `scooters.latest_telemetry`
-- Permet a HomeScreen de faire :
--   .from('scooters').select('*, latest_telemetry(...)')
-- A executer dans Supabase SQL Editor
-- ============================================================

-- Nettoyer les versions precedentes au cas ou
DROP VIEW IF EXISTS public.latest_telemetry;
DROP FUNCTION IF EXISTS public.latest_telemetry(public.scooters);

-- Computed relationship : permet l'embedding via PostgREST
-- Signature `nom(table_parent)` retournant SETOF table_enfant
CREATE OR REPLACE FUNCTION public.latest_telemetry(public.scooters)
RETURNS SETOF public.telemetry
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.telemetry
  WHERE scooter_id = $1.id
  ORDER BY recorded_at DESC
  LIMIT 1;
$$;

-- Permissions pour anon + authenticated
GRANT EXECUTE ON FUNCTION public.latest_telemetry(public.scooters) TO anon, authenticated;

-- Forcer PostgREST a recharger son cache
NOTIFY pgrst, 'reload schema';
