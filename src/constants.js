// ─── Colors ───────────────────────────────────────────────
export const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  accentGlow:   'rgba(0,229,255,0.10)',
  success:      '#00E676',
  successDim:   'rgba(0,230,118,0.12)',
  warning:      '#FFB300',
  warningDim:   'rgba(255,179,0,0.12)',
  danger:       '#FF1744',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};

// ─── Status config ─────────────────────────────────────────
export const STATUS = {
  online:   { color: C.success,  bg: C.successDim, label: 'En ligne'   },
  offline:  { color: C.textMuted, bg: 'transparent', label: 'Hors ligne' },
  charging: { color: C.warning,  bg: C.warningDim, label: 'En charge'  },
};

// ─── Battery color helper ──────────────────────────────────
export function battColor(v) {
  if (v == null) return C.textMuted;
  if (v > 50)   return C.success;
  if (v > 20)   return C.warning;
  return C.danger;
}

// ─── Mock scooters (remplace par ton API/MQTT) ─────────────
export const SCOOTERS = [
  {
    id: '1', name: 'Scooter 1', model: 'Niu NQi GT Pro',
    status: 'online', battery: 78, charging: false,
    speed: 0, range: 62, temp: 24,
    alarm: false, starter: true,
    trips: 142, totalKm: 2340,
    gps: { address: 'Sidi Henri, Tunis', lastUpdate: 'il y a 2 min' },
  },
  {
    id: '2', name: 'Scooter 2', model: 'Niu MQi+ Sport',
    status: 'charging', battery: 34, charging: true,
    speed: 0, range: 28, temp: 31,
    alarm: true, starter: false,
    trips: 89, totalKm: 1120,
    gps: { address: 'La Marsa, Tunis', lastUpdate: 'il y a 5 min' },
  },
  {
    id: '3', name: 'Scooter 3', model: 'Vmoto Super Soco',
    status: 'offline', battery: null, charging: false,
    speed: null, range: null, temp: null,
    alarm: false, starter: false,
    trips: 211, totalKm: 4780,
    gps: { address: null, lastUpdate: null },
  },
];

// Alias pour SplashScreen
export const COLORS = C;

export const FONTS = {
  size: {
    xs:  10,
    sm:  12,
    md:  14,
    lg:  16,
    xl:  20,
    xxl: 28,
  },
  weight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    black:    '900',
  },
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};