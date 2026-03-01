// ─── Color Palette ───────────────────────────────────────
// Deep navy dark theme — electric cyan accent
// Inspiré du design des apps de mobilité premium (Tesla, Lime, Bird)
export const COLORS = {
    // Backgrounds — dégradé de profondeur cohérent
    bg:          '#080c14',   // noir bleu très profond
    bgCard:      '#0f1521',   // carte principale
    bgCardLight: '#151d2e',   // carte secondaire / survol
    bgElevated:  '#1c2540',   // éléments élevés (toggles, tracks)

    // Accent — cyan électrique Eve Mobility
    accent:      '#00A8E8',
    accentDim:   'rgba(0, 200, 240, 0.12)',
    accentGlow:  'rgba(0, 200, 240, 0.22)',

    // Text — hiérarchie claire sur fond sombre
    white:         '#ffffff',
    textPrimary:   '#dde4f0',   // texte principal
    textSecondary: '#6b7a9e',   // texte secondaire
    textMuted:     '#3d4d6b',   // texte discret

    // Status
    success:    '#05d87e',
    successDim: 'rgba(5, 216, 126, 0.12)',
    warning:    '#f5a623',
    warningDim: 'rgba(245, 166, 35, 0.12)',
    danger:     '#f04e4e',
    dangerDim:  'rgba(240, 78, 78, 0.12)',

    // Borders — subtils sur fond sombre
    border:       'rgba(100, 120, 170, 0.10)',
    borderAccent: 'rgba(0, 200, 240, 0.28)',
};

// ─── Typography ──────────────────────────────────────────
export const FONTS = {
    size: {
        xs:   11,
        sm:   13,
        md:   15,
        lg:   17,
        xl:   22,
        xxl:  32,
        hero: 44,
    },
    weight: {
        regular:  '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
        black:    '800',
    },
};

// ─── Spacing ─────────────────────────────────────────────
export const SPACING = {
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    xxl:  24,
    xxxl: 32,
};

// ─── User Profile ────────────────────────────────────────
// TODO: remplacer par Firebase Auth + Firestore
export const USER_PROFILE = {
    name:         'Ayoub',
    email:        'ayoub@example.com',
    scooterModel: 'X-Ride Pro 5000',
};