// supabase/functions/send-push/index.ts
//
// Edge Function declenchee par Database Webhooks sur :
//   - INSERT sur public.telemetry  -> chute / sabotage / alarme
//   - UPDATE sur public.batteries  -> batterie faible (<= 20%)
//
// Envoie une push notification Expo a tous les tokens enregistres.
// Anti-spam : 1 push max par (scooter, type) toutes les 2 minutes.
//
// Deploiement : `supabase functions deploy send-push --no-verify-jwt`
//
// Variables d'env requises (supabase secrets set ...) :
//   SUPABASE_URL                = https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = service role key (server-side seulement)

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FALL_THRESHOLD     = 55;   // |accel_x| > 55 -> chute
const BATTERY_THRESHOLD  = 20;   // soc <= 20 -> batterie faible
const COOLDOWN_SECONDS   = 120;  // 2 min anti-spam serveur

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Push Expo ────────────────────────────────────────────────

async function sendExpoPush(tokens: string[], title: string, body: string, data: any) {
  if (!tokens.length) return;
  const messages = tokens.map(to => ({
    to,
    title,
    body,
    sound: 'default',
    priority: 'high',
    channelId: 'alerts',
    data,
  }));
  // Expo accepte jusqu'a 100 messages par requete
  const chunks: any[][] = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));
  for (const chunk of chunks) {
    try {
      const r = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      const j = await r.json();
      console.log('Expo push response:', JSON.stringify(j).slice(0, 500));
    } catch (e) {
      console.log('Expo push error:', (e as Error).message);
    }
  }
}

// ── Anti-spam serveur ────────────────────────────────────────

async function shouldFire(scooter_id: string, type: string): Promise<boolean> {
  const since = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();
  const { data, error } = await sb
    .from('push_notif_log')
    .select('id')
    .eq('scooter_id', scooter_id)
    .eq('type', type)
    .gte('sent_at', since)
    .limit(1);
  if (error) { console.log('cooldown check err:', error.message); return true; }
  if (data && data.length > 0) return false;
  await sb.from('push_notif_log').insert({ scooter_id, type });
  return true;
}

// ── Recupere infos scooter + tokens ──────────────────────────

async function getScooterName(scooter_id: string): Promise<string> {
  const { data } = await sb.from('scooters').select('name').eq('id', scooter_id).maybeSingle();
  return data?.name ?? 'Scooter';
}

async function getAllTokens(): Promise<string[]> {
  const { data } = await sb.from('push_tokens').select('token');
  return (data ?? []).map((r: any) => r.token).filter(Boolean);
}

// ── Trigger d'une alerte ─────────────────────────────────────

async function fireAlert(scooter_id: string, type: string, body: string) {
  if (!scooter_id || !type) return;
  if (!(await shouldFire(scooter_id, type))) {
    console.log(`Skipped (cooldown): ${scooter_id}/${type}`);
    return;
  }
  const [name, tokens] = await Promise.all([getScooterName(scooter_id), getAllTokens()]);
  console.log(`→ Push: scooter=${name} type=${type} body="${body}" tokens=${tokens.length}`);
  await sendExpoPush(tokens, name, body, { scooter_id, type });
}

// ── Detection des conditions ─────────────────────────────────

async function handleTelemetry(row: any) {
  if (!row?.scooter_id) return;

  // CHUTE : |accel_x| > seuil  (ou champ fallen=true si firmware le pose)
  const ax = Number(row.accel_x ?? 0);
  if (Math.abs(ax) > FALL_THRESHOLD || row.fallen === true) {
    await fireAlert(row.scooter_id, 'fall', 'Chute detectee !');
  }

  // SABOTAGE : un point de contact a true
  const tp = row.tamper_points;
  if (Array.isArray(tp) && tp.some((v: any) => v === true)) {
    const points = ['Siege', 'Avant', 'Batterie'].filter((_, i) => tp[i]).join(', ');
    await fireAlert(row.scooter_id, 'tamper', `Sabotage detecte : ${points}`);
  }

  // ALARME B : scooter offline + alarme desactivee
  if (row.alarm === false && row.status === 'offline') {
    await fireAlert(row.scooter_id, 'alarm', 'Scooter laisse sans alarme activee');
  }

  // ALARME C : SIRENE — alarme passe a TRUE (declenchement)
  if (row.alarm === true) {
    const { data: prev } = await sb
      .from('telemetry')
      .select('alarm, recorded_at')
      .eq('scooter_id', row.scooter_id)
      .lt('recorded_at', row.recorded_at ?? new Date().toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const wasOff = !prev || prev.alarm === false;
    if (wasOff) {
      await fireAlert(row.scooter_id, 'alarm_siren', 'Alarme declenchee — intrusion detectee');
    }
  }
}

async function handleBatteryUpdate(row: any, oldRow: any) {
  if (!row?.scooter_id) return;
  const soc = Number(row.soc);
  if (Number.isNaN(soc)) return;
  // Trigger uniquement quand on PASSE sous le seuil (pas en boucle)
  const oldSoc = oldRow?.soc != null ? Number(oldRow.soc) : 999;
  const slot = row.slot ?? '?';
  if (soc <= BATTERY_THRESHOLD && oldSoc > BATTERY_THRESHOLD) {
    await fireAlert(row.scooter_id, 'battery_low', `Batterie ${slot} a ${soc}%`);
  } else if (soc <= BATTERY_THRESHOLD) {
    // Cas ou on insere directement une batterie deja faible
    await fireAlert(row.scooter_id, 'battery_low', `Batterie ${slot} a ${soc}%`);
  }
}

// ── HTTP entry point (Database Webhook payload) ──────────────

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Format Database Webhook Supabase :
    // { type: 'INSERT'|'UPDATE'|..., table: 'telemetry', schema: 'public',
    //   record: {...}, old_record: {...} }
    const { table, type, record, old_record } = payload;
    console.log(`Webhook: ${type} on ${table}`);

    if (table === 'telemetry' && (type === 'INSERT' || type === 'UPDATE')) {
      await handleTelemetry(record);
    } else if (table === 'batteries' && (type === 'INSERT' || type === 'UPDATE')) {
      await handleBatteryUpdate(record, old_record);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.log('Webhook error:', (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
