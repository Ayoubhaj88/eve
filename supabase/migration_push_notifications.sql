-- ============================================================
-- Migration: Push Notifications (Expo Push)
-- A executer dans Supabase SQL Editor
-- ============================================================

-- Table des tokens push Expo (un token par appareil par utilisateur)
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT,                  -- 'ios' | 'android'
  device_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- RLS : un user voit/edite uniquement ses tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_tokens_select" ON push_tokens;
CREATE POLICY "own_tokens_select" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_tokens_insert" ON push_tokens;
CREATE POLICY "own_tokens_insert" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_tokens_update" ON push_tokens;
CREATE POLICY "own_tokens_update" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_tokens_delete" ON push_tokens;
CREATE POLICY "own_tokens_delete" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Anti-spam : table d'historique des notifs serveur (cooldown)
-- Empeche d'envoyer la meme alerte 100 fois en 1 minute
-- ============================================================
CREATE TABLE IF NOT EXISTS push_notif_log (
  id           BIGSERIAL PRIMARY KEY,
  scooter_id   UUID NOT NULL,
  type         TEXT NOT NULL,         -- 'fall' | 'tamper' | 'battery_low' | 'alarm'
  sent_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_log_lookup
  ON push_notif_log (scooter_id, type, sent_at DESC);

-- Nettoyage auto : on garde 7 jours
CREATE OR REPLACE FUNCTION purge_push_notif_log() RETURNS void AS $$
BEGIN
  DELETE FROM push_notif_log WHERE sent_at < now() - INTERVAL '7 days';
END $$ LANGUAGE plpgsql;
