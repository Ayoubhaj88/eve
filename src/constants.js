import { Alert, Platform } from 'react-native';

// ─── Colors ───────────────────────────────────────────────
export const C = {
  bg:           '#0A1628',
  bgCard:       '#0F2044',
  bgElevated:   '#162550',
  bgSidebar:    '#0D1E3A',
  accent:       '#1565C0',
  accentBright: '#1976D2',
  accentDim:    'rgba(21,101,192,0.15)',
  accentGlow:   'rgba(21,101,192,0.20)',
  success:      '#00E676',
  successDim:   'rgba(0,230,118,0.12)',
  warning:      '#FFB300',
  warningDim:   'rgba(255,179,0,0.12)',
  danger:       '#FF1744',
  dangerDim:    'rgba(255,23,68,0.15)',
  white:        '#FFFFFF',
  textSecondary:'#8AAFD4',
  textMuted:    '#4A6A9A',
  border:       '#1E3A6E',
  borderAccent: 'rgba(21,101,192,0.40)',
};

// ─── Status config ─────────────────────────────────────────
export const STATUS = {
  online:   { color: C.success,   bg: C.successDim,  label: 'Active'     },
  offline:  { color: C.textMuted, bg: 'transparent', label: 'Hors ligne' },
  charging: { color: C.warning,   bg: C.warningDim,  label: 'En charge'  },
};

// ─── Helpers ───────────────────────────────────────────────
export function battColor(v) {
  if (v == null) return C.textMuted;
  if (v > 50)   return C.success;
  if (v > 20)   return C.warning;
  return C.danger;
}

export function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `il y a ${diff}s`;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

// ─── Cross-platform Alert (web-safe) ───────────────────────
export function alertOk(title, msg) {
  if (Platform.OS === 'web') window.alert(msg ?? title);
  else Alert.alert(title, msg);
}

export function alertConfirm(title, msg, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${msg}`)) onConfirm();
  } else {
    Alert.alert(title, msg, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// ─── SplashScreen aliases ──────────────────────────────────
export const COLORS = C;
export const FONTS = {
  size: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '900' },
};
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
