#!/usr/bin/env python3
"""
Generateur de documentation PDF pour EVE Mobility - Scooter Monitor
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os

# ── Couleurs du design system ──────────────────────────────
BG        = HexColor('#0A0A0F')
BG_CARD   = HexColor('#111111')
BG_ELEV   = HexColor('#1A1A2E')
ACCENT    = HexColor('#00E5FF')
SUCCESS   = HexColor('#00E676')
WARNING   = HexColor('#FFB300')
DANGER    = HexColor('#FF1744')
TEXT_W    = HexColor('#FFFFFF')
TEXT_SEC  = HexColor('#8A8A9A')
TEXT_MUT  = HexColor('#4A4A5A')
BORDER    = HexColor('#2A2A3A')

OUTPUT = os.path.join(os.path.dirname(__file__), 'documentation_app.pdf')
W, H = A4  # 595 x 842

# ── Helpers ─────────────────────────────────────────────────

def draw_bg(c, page_num=None):
    """Fond sombre + bande accent en haut"""
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Bande accent fine en haut
    c.setFillColor(ACCENT)
    c.rect(0, H - 3, W, 3, fill=1, stroke=0)
    # Numero de page
    if page_num:
        c.setFillColor(TEXT_MUT)
        c.setFont('Helvetica', 8)
        c.drawRightString(W - 30, 20, f"Page {page_num}")
    c.restoreState()


def draw_card(c, x, y, w, h, border_color=BORDER):
    """Dessine une carte sombre arrondie"""
    c.saveState()
    c.setFillColor(BG_CARD)
    c.setStrokeColor(border_color)
    c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.restoreState()


def draw_section_title(c, y, text, icon=""):
    """Titre de section avec accent"""
    c.saveState()
    c.setFillColor(ACCENT)
    c.rect(40, y - 2, 4, 16, fill=1, stroke=0)
    c.setFont('Helvetica-Bold', 13)
    c.setFillColor(TEXT_W)
    c.drawString(52, y, f"{icon}  {text}" if icon else text)
    c.restoreState()
    return y - 10


def draw_subtitle(c, y, text):
    c.saveState()
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(ACCENT)
    c.drawString(55, y, text)
    c.restoreState()
    return y - 14


def draw_text(c, y, text, x=55, size=9, color=TEXT_SEC, font='Helvetica'):
    c.saveState()
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, text)
    c.restoreState()
    return y - 13


def draw_bullet(c, y, text, x=60, color=TEXT_SEC):
    c.saveState()
    c.setFillColor(ACCENT)
    c.circle(x, y + 3, 2, fill=1, stroke=0)
    c.setFont('Helvetica', 9)
    c.setFillColor(color)
    c.drawString(x + 8, y, text)
    c.restoreState()
    return y - 14


def draw_color_swatch(c, x, y, color, label):
    c.saveState()
    c.setFillColor(color)
    c.roundRect(x, y, 14, 14, 3, fill=1, stroke=0)
    c.setFont('Helvetica', 8)
    c.setFillColor(TEXT_SEC)
    c.drawString(x + 20, y + 3, label)
    c.restoreState()


def draw_table_row(c, y, cols, widths, header=False):
    """Dessine une ligne de tableau"""
    c.saveState()
    x = 55
    font = 'Helvetica-Bold' if header else 'Helvetica'
    size = 8 if not header else 8
    color = ACCENT if header else TEXT_SEC
    bg = BG_ELEV if header else None

    if bg:
        c.setFillColor(bg)
        total_w = sum(widths)
        c.roundRect(x - 5, y - 4, total_w + 10, 16, 3, fill=1, stroke=0)

    c.setFont(font, size)
    c.setFillColor(color)
    for i, col in enumerate(cols):
        c.drawString(x, y, str(col))
        x += widths[i]
    c.restoreState()
    return y - 16


# ═══════════════════════════════════════════════════════════
# PAGE 1 : COUVERTURE
# ═══════════════════════════════════════════════════════════

def page_cover(c):
    draw_bg(c)

    # Grande barre accent decorative
    c.setFillColor(ACCENT)
    c.setFillAlpha(0.08)
    c.rect(0, H * 0.35, W, H * 0.35, fill=1, stroke=0)
    c.setFillAlpha(1)

    # Ligne accent
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.line(40, H - 120, W - 40, H - 120)

    # Titre
    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(TEXT_W)
    c.drawString(40, H - 200, "EVE")

    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(ACCENT)
    c.drawString(110, H - 200, "Mobility")

    # Sous-titre
    c.setFont('Helvetica', 14)
    c.setFillColor(TEXT_SEC)
    c.drawString(40, H - 235, "Documentation Technique")

    c.setFont('Helvetica-Bold', 16)
    c.setFillColor(TEXT_W)
    c.drawString(40, H - 265, "Application Scooter Monitor")

    # Ligne separatrice
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(40, H - 285, 300, H - 285)

    # Infos
    y = H - 320
    infos = [
        ("Stack", "React Native / Expo"),
        ("Backend", "Supabase (PostgreSQL + Realtime)"),
        ("Hardware", "ESP32 + BMS + MPU-6050 + TPMS"),
        ("Plateforme", "iOS / Android / Web"),
        ("Date", "Mars 2026"),
    ]
    for label, value in infos:
        c.setFont('Helvetica', 9)
        c.setFillColor(TEXT_MUT)
        c.drawString(40, y, label.upper())
        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(TEXT_W)
        c.drawString(140, y, value)
        y -= 22

    # Logo scooter (emoji en texte)
    c.setFont('Helvetica-Bold', 80)
    c.setFillColor(ACCENT)
    c.setFillAlpha(0.15)
    c.drawRightString(W - 50, 120, "///")
    c.setFillAlpha(1)

    # Pied de page
    c.setFont('Helvetica', 8)
    c.setFillColor(TEXT_MUT)
    c.drawCentredString(W / 2, 30, "EVE Mobility - Document confidentiel")

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 2 : ARCHITECTURE GENERALE
# ═══════════════════════════════════════════════════════════

def page_architecture(c):
    draw_bg(c, 2)
    y = H - 50

    # Titre
    draw_section_title(c, y, "ARCHITECTURE GENERALE")
    y -= 40

    # Description
    y = draw_text(c, y, "Flux de navigation de l'application React Native / Expo", size=10, color=TEXT_W)
    y -= 10

    # ── Schema visuel ──
    box_w, box_h = 120, 40
    gap = 30

    # App.js
    cx = W / 2
    bx = cx - box_w / 2

    # Dessiner les boites du schema
    boxes = [
        (cx, y - 20,     "App.js",         ACCENT,  "Point d'entree"),
        (cx, y - 90,     "SplashScreen",   TEXT_MUT, "Animation logo 1.2s"),
        (cx, y - 160,    "AuthScreen",     WARNING, "Login / Register"),
        (cx, y - 230,    "AppNavigator",   ACCENT,  "React Navigation Stack"),
        (cx - 100, y - 320, "HomeScreen",  SUCCESS, "Liste des scooters"),
        (cx + 100, y - 320, "DashboardScreen", WARNING, "Detail scooter"),
    ]

    for bx_c, by, label, color, desc in boxes:
        bx = bx_c - box_w / 2
        draw_card(c, bx, by - box_h / 2, box_w, box_h, color)
        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(color)
        c.drawCentredString(bx_c, by + 5, label)
        c.setFont('Helvetica', 7)
        c.setFillColor(TEXT_MUT)
        c.drawCentredString(bx_c, by - 8, desc)

    # Fleches verticales
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1)
    arrow_pairs = [
        (cx, y - 40, cx, y - 70),
        (cx, y - 110, cx, y - 140),
        (cx, y - 180, cx, y - 210),
    ]
    for x1, y1, x2, y2 in arrow_pairs:
        c.line(x1, y1, x2, y2)
        # Pointe de fleche
        c.line(x2 - 4, y2 + 6, x2, y2)
        c.line(x2 + 4, y2 + 6, x2, y2)

    # Fleches vers Home et Dashboard
    c.line(cx, y - 250, cx, y - 270)
    c.line(cx, y - 270, cx - 100, y - 270)
    c.line(cx, y - 270, cx + 100, y - 270)
    c.line(cx - 100, y - 270, cx - 100, y - 300)
    c.line(cx + 100, y - 270, cx + 100, y - 300)
    # Pointes
    c.line(cx - 104, y - 294, cx - 100, y - 300)
    c.line(cx - 96, y - 294, cx - 100, y - 300)
    c.line(cx + 96, y - 294, cx + 100, y - 300)
    c.line(cx + 104, y - 294, cx + 100, y - 300)

    # Fleche bidirectionnelle Home <-> Dashboard
    c.setStrokeColor(SUCCESS)
    c.setDash(3, 3)
    hd_y = y - 340
    c.line(cx - 40, hd_y, cx + 40, hd_y)
    c.setDash()
    c.setFont('Helvetica', 7)
    c.setFillColor(SUCCESS)
    c.drawCentredString(cx, hd_y - 10, "navigate('Dashboard', { scooter })")

    y = y - 380

    # ── Auth flow ──
    draw_subtitle(c, y, "Flux d'authentification")
    y -= 20
    steps = [
        "App.js → getSession() au demarrage",
        "Si session active → AppNavigator (HomeScreen)",
        "Si pas de session → AuthScreen (Login/Register)",
        "onAuthStateChange() ecoute les evenements login/logout",
        "signOut() → retour a AuthScreen",
    ]
    for s in steps:
        y = draw_bullet(c, y, s)

    y -= 15
    draw_subtitle(c, y, "Technologies")
    y -= 20
    techs = [
        "React Native + Expo (cross-platform iOS/Android/Web)",
        "React Navigation (Stack Navigator, slide_from_right)",
        "Supabase JS Client (Auth + Database + Realtime)",
        "ESP32 microcontroleur (capteurs hardware)",
    ]
    for t in techs:
        y = draw_bullet(c, y, t)

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 3 : HOMESCREEN
# ═══════════════════════════════════════════════════════════

def page_homescreen(c):
    draw_bg(c, 3)
    y = H - 50

    draw_section_title(c, y, "HOMESCREEN - Menu Principal")
    y -= 35

    y = draw_text(c, y, "Ecran principal affichant la liste de tous les scooters avec indicateurs temps reel.", size=10, color=TEXT_W)
    y -= 15

    # ── Header ──
    draw_subtitle(c, y, "En-tete du tableau de bord")
    y -= 18
    items = [
        "Titre 'EVE Mobility' avec accent cyan",
        "Compteur de scooters (ex: '4 scooters')",
        "Email de l'utilisateur connecte",
        "Bouton [+] cyan : ajouter un nouveau scooter",
        "Bouton [porte] rouge : deconnexion avec confirmation",
    ]
    for item in items:
        y = draw_bullet(c, y, item)

    y -= 10
    # ── Compteurs ──
    draw_subtitle(c, y, "Compteurs de statut")
    y -= 18
    y = draw_bullet(c, y, "EN LIGNE (vert #00E676) : scooters avec status != 'offline'")
    y = draw_bullet(c, y, "EN CHARGE (orange #FFB300) : scooters avec status == 'charging'")

    y -= 10
    # ── 5 indicateurs ──
    draw_subtitle(c, y, "5 indicateurs par carte scooter")
    y -= 20

    indicators = [
        ("BATT.", SUCCESS, [
            "3 tirets colores = 3 slots de batterie",
            "Vert > 50%  |  Orange > 20%  |  Rouge <= 20%",
            "Gris transparent = slot vide",
        ]),
        ("SABOTAGE", DANGER, [
            "3 points = 3 capteurs tamper (telemetry.tamper_points)",
            "Vert = capteur OK  |  Rouge = capteur declenche",
            "Badge 'OK' vert ou 'Alerte' rouge",
        ]),
        ("ALARME", WARNING, [
            "1 point = etat alarme (telemetry.alarm)",
            "Vert 'Armee' = alarme activee",
            "Rouge 'OFF' = alarme desactivee",
        ]),
        ("CHUTE", DANGER, [
            "1 point = etat chute (telemetry.fallen)",
            "Vert 'Stable' = scooter debout",
            "Rouge 'Chute !' = scooter tombe (emoji incline 90 deg)",
        ]),
        ("ROUES (TPMS)", ACCENT, [
            "Pression avant (AV) et arriere (AR) en bar",
            "Couleur basee sur tpms_threshold du scooter",
            "Rouge < seuil  |  Orange < seuil x 1.15  |  Vert >= seuil x 1.15",
        ]),
    ]

    for name, color, details in indicators:
        # Carte indicateur
        card_h = 10 + len(details) * 13
        draw_card(c, 50, y - card_h - 5, W - 100, card_h + 12, color)
        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(color)
        c.drawString(60, y, name)
        y -= 14
        for d in details:
            c.setFont('Helvetica', 8)
            c.setFillColor(TEXT_SEC)
            c.drawString(70, y, f"- {d}")
            y -= 12
        y -= 8

    y -= 5
    # ── Badge statut ──
    draw_subtitle(c, y, "Badges de statut")
    y -= 18

    statuses = [
        ("En ligne",   "#00E676", "Scooter connecte et actif"),
        ("Hors ligne", "#4A4A5A", "Aucune donnee recente"),
        ("En charge",  "#FFB300", "Batterie en cours de charge"),
    ]
    for label, hex_c, desc in statuses:
        draw_color_swatch(c, 60, y - 2, HexColor(hex_c), f"{label} - {desc}")
        y -= 20

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 4 : DASHBOARD - BATTERIES
# ═══════════════════════════════════════════════════════════

def page_dashboard_batteries(c):
    draw_bg(c, 4)
    y = H - 50

    draw_section_title(c, y, "DASHBOARD - Section Batteries")
    y -= 35

    y = draw_text(c, y, "Chaque scooter peut contenir jusqu'a 3 batteries (slots). Donnees BMS detaillees.", size=10, color=TEXT_W)
    y -= 15

    # ── Header batterie ──
    draw_subtitle(c, y, "Carte Batterie (BatteryCard)")
    y -= 18
    items = [
        "Emoji batterie + 'Batterie N' + numero de serie (#serial)",
        "Badge BMS status : charging (cyan), discharging (orange), idle (gris), error (rouge)",
        "Boutons edition (crayon) et suppression (X rouge)",
        "Barre de progression SOC coloree (vert > 50%, orange > 20%, rouge <= 20%)",
    ]
    for item in items:
        y = draw_bullet(c, y, item)

    y -= 10
    draw_subtitle(c, y, "Donnees BMS principales")
    y -= 20

    # Tableau BMS
    headers = ["Champ", "Unite", "Description", "Alerte"]
    widths = [100, 50, 200, 120]
    y = draw_table_row(c, y, headers, widths, header=True)

    rows = [
        ["voltage",      "V",   "Tension totale du pack",          "-"],
        ["current_a",    "A",   "Courant instantane",              "-"],
        ["power_w",      "W",   "Puissance (V x A)",               "-"],
        ["temperature",  "C",   "Temperature interne",             "> 45C = rouge"],
        ["soh",          "%",   "State of Health",                 "-"],
        ["cycles",       "-",   "Nombre de cycles charge/decharge","-"],
    ]
    for row in rows:
        y = draw_table_row(c, y, row, widths)

    y -= 15
    draw_subtitle(c, y, "Cellules individuelles")
    y -= 18
    cells_info = [
        "cell_voltages : tableau JSONB des tensions par cellule (ex: C1: 3.710V)",
        "Affichees en grille de badges si disponibles",
        "Sinon : '-- en attente ESP32' (donnees pas encore envoyees)",
    ]
    for info in cells_info:
        y = draw_bullet(c, y, info)

    y -= 15
    draw_subtitle(c, y, "Alertes de protection BMS")
    y -= 18

    protections = [
        ("overvoltage",           "Surtension",           "Tension trop haute"),
        ("undervoltage",          "Sous-tension",         "Tension trop basse"),
        ("overcurrent_charge",    "Surcourant charge",    "Courant de charge excessif"),
        ("overcurrent_discharge", "Surcourant decharge",  "Courant de decharge excessif"),
        ("overtemp",              "Surchauffe",           "Temperature trop elevee"),
        ("short_circuit",         "Court-circuit",        "Court-circuit detecte"),
    ]

    headers = ["Flag JSONB", "Label FR", "Description"]
    widths = [160, 130, 190]
    y = draw_table_row(c, y, headers, widths, header=True)
    for row in protections:
        y = draw_table_row(c, y, row, widths)

    y -= 15
    y = draw_text(c, y, "Si aucune alerte : badge vert 'Aucune alerte protection'", color=SUCCESS, size=9)
    y = draw_text(c, y, "Si alerte(s) : encadre rouge avec liste des protections actives", color=DANGER, size=9)

    y -= 20
    draw_subtitle(c, y, "Formulaire Batterie (BatteryFormModal)")
    y -= 18
    modal_info = [
        "Champ : Numero de serie (obligatoire, monospace, majuscules)",
        "Selection du slot (1, 2 ou 3) : slots occupes desactives",
        "Maximum 3 batteries par scooter (bouton Ajouter masque si plein)",
        "Suppression avec confirmation 'alertConfirm'",
    ]
    for info in modal_info:
        y = draw_bullet(c, y, info)

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 5 : DASHBOARD - MPU + TPMS
# ═══════════════════════════════════════════════════════════

def page_dashboard_sensors(c):
    draw_bg(c, 5)
    y = H - 50

    draw_section_title(c, y, "DASHBOARD - Capteurs (MPU-6050 + TPMS)")
    y -= 40

    # ── MPU-6050 ──
    draw_card(c, 40, y - 210, W - 80, 220, ACCENT)
    y -= 5

    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(ACCENT)
    c.drawString(55, y, "Accelerometre MPU-6050")
    y -= 20

    mpu_items = [
        "3 axes affiches : X (rouge), Y (cyan), Z (orange) en g",
        "Magnitude calculee : sqrt(x*x + y*y + z*z)",
        "Si magnitude > seuil → badge 'CHUTE DETECTEE' rouge",
        "Si magnitude <= seuil → badge 'Stable' vert",
    ]
    for item in mpu_items:
        y = draw_bullet(c, y, item)

    y -= 8
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(WARNING)
    c.drawString(55, y, "SEUIL DE CHUTE CONFIGURABLE")
    y -= 16
    threshold_info = [
        "Valeur par defaut : 2.5 g",
        "Stocke dans scooters.fall_threshold (FLOAT8)",
        "Modifiable inline : clic sur la valeur → TextInput → OK/Annuler",
        "Sauvegarde immediate en base Supabase",
        "Chaque scooter a son propre seuil independant",
    ]
    for info in threshold_info:
        y = draw_bullet(c, y, info)

    y -= 30

    # ── TPMS ──
    draw_card(c, 40, y - 250, W - 80, 260, WARNING)
    y -= 5

    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(WARNING)
    c.drawString(55, y, "TPMS - Pression des Pneus")
    y -= 20

    tpms_items = [
        "2 jauges : Avant (wheel_front) et Arriere (wheel_rear) en bar",
        "Jauge verticale (0-4.0 bar) avec barre coloree proportionnelle",
        "Badge header : 'Normal' vert ou 'PRESSION BASSE' rouge",
    ]
    for item in tpms_items:
        y = draw_bullet(c, y, item)

    y -= 8
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(WARNING)
    c.drawString(55, y, "SEUIL D'ALERTE CONFIGURABLE")
    y -= 16
    tpms_threshold = [
        "Valeur par defaut : 2.0 bar",
        "Stocke dans scooters.tpms_threshold (FLOAT8)",
        "Modifiable inline : clic sur '2.0 bar' → TextInput → OK/Annuler",
        "Validation : 0 < valeur <= 6 bar",
        "Sauvegarde immediate en base Supabase",
    ]
    for info in tpms_threshold:
        y = draw_bullet(c, y, info)

    y -= 10
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(ACCENT)
    c.drawString(55, y, "CODE COULEUR DYNAMIQUE (base sur le seuil)")
    y -= 16

    colors = [
        (SUCCESS, f"Vert   : pression >= seuil x 1.15  →  OK"),
        (WARNING, f"Orange : entre seuil et seuil x 1.15  →  Bas"),
        (DANGER,  f"Rouge  : pression < seuil  →  Critique"),
    ]
    for color, text in colors:
        draw_color_swatch(c, 60, y - 2, color, text)
        y -= 20

    y -= 5
    y = draw_bullet(c, y, "Legende en bas de la carte : s'adapte automatiquement au seuil choisi")
    y = draw_bullet(c, y, "Le meme seuil est utilise dans le HomeScreen (widget Roues)")

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 6 : BASE DE DONNEES
# ═══════════════════════════════════════════════════════════

def page_database(c):
    draw_bg(c, 6)
    y = H - 50

    draw_section_title(c, y, "BASE DE DONNEES - Supabase PostgreSQL")
    y -= 40

    # ── Table scooters ──
    draw_card(c, 40, y - 130, W - 80, 140, ACCENT)
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(ACCENT)
    c.drawString(55, y, "TABLE : scooters")
    y -= 18

    headers = ["Colonne", "Type", "Defaut", "Description"]
    widths = [120, 80, 80, 200]
    y = draw_table_row(c, y, headers, widths, header=True)

    scooter_cols = [
        ["id",             "UUID PK",  "auto",   "Identifiant unique"],
        ["name",           "TEXT",     "-",       "Nom du scooter"],
        ["model",          "TEXT",     "-",       "Modele (ex: Novago)"],
        ["reference",      "TEXT",     "-",       "Reference interne"],
        ["status",         "TEXT",     "offline", "online/offline/charging"],
        ["fall_threshold", "FLOAT8",  "2.5",     "Seuil chute en g"],
        ["tpms_threshold", "FLOAT8",  "2.0",     "Seuil pression en bar"],
    ]
    for row in scooter_cols:
        y = draw_table_row(c, y, row, widths)

    y -= 25

    # ── Table batteries ──
    draw_card(c, 40, y - 185, W - 80, 195, SUCCESS)
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(SUCCESS)
    c.drawString(55, y, "TABLE : batteries")
    y -= 18

    y = draw_table_row(c, y, headers, widths, header=True)

    batt_cols = [
        ["id",             "UUID PK",  "auto",   "Identifiant unique"],
        ["scooter_id",     "UUID FK",  "-",      "→ scooters(id) CASCADE"],
        ["serial_number",  "TEXT",     "-",      "Numero de serie"],
        ["slot",           "INT",      "1",      "Emplacement 1-3 (UNIQUE)"],
        ["soc",            "REAL",     "-",      "State of Charge 0-100%"],
        ["voltage",        "FLOAT",    "-",      "Tension pack (V)"],
        ["current_a",      "FLOAT",    "-",      "Courant (A)"],
        ["power_w",        "FLOAT",    "-",      "Puissance (W)"],
        ["temperature",    "FLOAT",    "-",      "Temperature (C)"],
        ["soh / cycles",   "FLOAT/INT","-",      "Sante et cycles"],
        ["cell_voltages",  "JSONB",    "-",      "Tensions cellules []"],
        ["protection",     "JSONB",    "-",      "Flags protection {}"],
    ]
    for row in batt_cols:
        y = draw_table_row(c, y, row, widths)

    y -= 25

    # ── Table telemetry ──
    draw_card(c, 40, y - 170, W - 80, 180, WARNING)
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(WARNING)
    c.drawString(55, y, "TABLE : telemetry")
    y -= 18

    y = draw_table_row(c, y, headers, widths, header=True)

    tel_cols = [
        ["id",            "UUID PK",  "auto",   "Identifiant unique"],
        ["scooter_id",    "UUID FK",  "-",      "→ scooters(id)"],
        ["tamper_points",  "JSONB",   "-",      "[bool, bool, bool]"],
        ["alarm",          "BOOL",    "-",      "Alarme armee ou non"],
        ["fallen",         "BOOL",    "-",      "Chute detectee"],
        ["wheel_front",    "FLOAT",   "-",      "Pression avant (bar)"],
        ["wheel_rear",     "FLOAT",   "-",      "Pression arriere (bar)"],
        ["accel_x/y/z",   "FLOAT8",  "-",      "Accelerometre 3 axes (g)"],
        ["status",         "TEXT",    "-",      "Statut au moment de l'envoi"],
        ["recorded_at",    "TIMESTAMP","-",     "Horodatage de la mesure"],
    ]
    for row in tel_cols:
        y = draw_table_row(c, y, row, widths)

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 7 : TEMPS REEL + DESIGN SYSTEM
# ═══════════════════════════════════════════════════════════

def page_realtime_design(c):
    draw_bg(c, 7)
    y = H - 50

    draw_section_title(c, y, "TEMPS REEL - Supabase Realtime")
    y -= 35

    y = draw_text(c, y, "L'application ecoute les changements PostgreSQL en temps reel via WebSocket.", size=10, color=TEXT_W)
    y -= 15

    draw_subtitle(c, y, "HomeScreen : 3 canaux")
    y -= 18
    channels_home = [
        "home-tel   → INSERT sur telemetry → fetchScooters()",
        "home-batt  → * sur batteries → fetchScooters()",
        "home-scoot → * sur scooters → fetchScooters()",
    ]
    for ch in channels_home:
        y = draw_bullet(c, y, ch)

    y -= 10
    draw_subtitle(c, y, "DashboardScreen : 2 canaux (filtres par scooter_id)")
    y -= 18
    channels_dash = [
        "batt-{id} → * sur batteries WHERE scooter_id = id → fetchBatteries()",
        "tel-{id}  → INSERT sur telemetry WHERE scooter_id = id → fetchTelemetry()",
    ]
    for ch in channels_dash:
        y = draw_bullet(c, y, ch)

    y -= 15
    draw_subtitle(c, y, "Flux de donnees ESP32 → Application")
    y -= 20

    # Schema flux
    flow_steps = [
        ("ESP32",              "Capteurs hardware (BMS, MPU, TPMS, tamper)"),
        ("       |",           ""),
        ("       v",           ""),
        ("Supabase INSERT",    "INSERT INTO telemetry / UPDATE batteries"),
        ("       |",           ""),
        ("       v",           ""),
        ("Realtime WebSocket", "postgres_changes event pousse au client"),
        ("       |",           ""),
        ("       v",           ""),
        ("React Native",       "Callback → fetch → setState → re-render UI"),
    ]
    for step, desc in flow_steps:
        if desc:
            c.setFont('Helvetica-Bold', 9)
            c.setFillColor(ACCENT)
            c.drawString(60, y, step)
            c.setFont('Helvetica', 8)
            c.setFillColor(TEXT_SEC)
            c.drawString(220, y, desc)
        else:
            c.setFont('Helvetica', 9)
            c.setFillColor(TEXT_MUT)
            c.drawString(60, y, step)
        y -= 14

    y -= 25

    # ── Design System ──
    draw_section_title(c, y, "DESIGN SYSTEM")
    y -= 30

    draw_subtitle(c, y, "Palette de couleurs")
    y -= 22

    palette = [
        ("#000000", "bg",         "Fond principal"),
        ("#111111", "bgCard",     "Fond des cartes"),
        ("#1A1A1A", "bgElevated", "Fond eleve / inputs"),
        ("#00E5FF", "accent",     "Cyan accent principal"),
        ("#00E676", "success",    "Vert succes / en ligne"),
        ("#FFB300", "warning",    "Orange avertissement"),
        ("#FF1744", "danger",     "Rouge danger / erreur"),
        ("#FFFFFF", "white",      "Texte principal"),
        ("#8A8A9A", "textSecondary", "Texte secondaire"),
        ("#4A4A5A", "textMuted",  "Texte discret"),
    ]
    for hex_c, name, desc in palette:
        color = HexColor(hex_c) if hex_c != '#000000' else HexColor('#222222')
        draw_color_swatch(c, 60, y - 2, color, f"{name}  {hex_c}  -  {desc}")
        y -= 18

    y -= 15
    draw_subtitle(c, y, "Helpers utilitaires (constants.js)")
    y -= 18
    helpers = [
        "battColor(v) → couleur selon le pourcentage batterie",
        "timeAgo(date) → 'il y a Xs / Xmin / Xh / Xj'",
        "alertOk(title, msg) → alerte cross-platform (web + native)",
        "alertConfirm(title, msg, onConfirm) → confirmation cross-platform",
    ]
    for h in helpers:
        y = draw_bullet(c, y, h)

    c.showPage()


# ═══════════════════════════════════════════════════════════
# PAGE 8 : AUTHENTIFICATION
# ═══════════════════════════════════════════════════════════

def page_auth(c):
    draw_bg(c, 8)
    y = H - 50

    draw_section_title(c, y, "AUTHENTIFICATION - Supabase Auth")
    y -= 35

    y = draw_text(c, y, "Systeme d'authentification complet avec Supabase Auth.", size=10, color=TEXT_W)
    y -= 15

    draw_subtitle(c, y, "AuthScreen - Fonctionnalites")
    y -= 18
    auth_features = [
        "2 onglets animes : Connexion et Inscription",
        "Validation email (format + domaine)",
        "Indicateur de force du mot de passe (5 niveaux, barre coloree)",
        "Afficher/masquer le mot de passe (bouton oeil)",
        "Champs avec glow cyan au focus",
        "Messages d'erreur en francais (traduits depuis Supabase)",
        "Detection automatique 'compte existant' → switch vers login",
        "Lien 'Mot de passe oublie' → resetPasswordForEmail()",
    ]
    for f in auth_features:
        y = draw_bullet(c, y, f)

    y -= 15
    draw_subtitle(c, y, "Methodes Supabase utilisees")
    y -= 18
    methods = [
        "supabase.auth.signInWithPassword({ email, password })",
        "supabase.auth.signUp({ email, password })",
        "supabase.auth.signOut()",
        "supabase.auth.getSession() → verification session existante",
        "supabase.auth.getUser() → recuperer email utilisateur",
        "supabase.auth.resetPasswordForEmail(email)",
        "supabase.auth.onAuthStateChange(callback) → ecoute events",
    ]
    for m in methods:
        y = draw_bullet(c, y, m)

    y -= 15
    draw_subtitle(c, y, "Gestion de session (App.js)")
    y -= 18
    session_info = [
        "session = undefined → ecran de chargement (spinner)",
        "session = null → afficher AuthScreen",
        "session = objet → afficher AppNavigator (Home)",
        "Persistence automatique : session recuperee au redemarrage",
        "Deconnexion : modal de confirmation → signOut() → retour auth",
    ]
    for s in session_info:
        y = draw_bullet(c, y, s)

    y -= 25
    draw_subtitle(c, y, "Indicateur de force du mot de passe")
    y -= 18

    strength_levels = [
        (DANGER,  "Niveau 1", "Tres faible (< 6 caracteres)"),
        (DANGER,  "Niveau 2", "Faible (6+ caracteres)"),
        (WARNING, "Niveau 3", "Moyen (+ majuscule)"),
        (WARNING, "Niveau 4", "Bon (+ chiffre)"),
        (SUCCESS, "Niveau 5", "Fort (+ caractere special)"),
    ]
    for color, level, desc in strength_levels:
        draw_color_swatch(c, 60, y - 2, color, f"{level} : {desc}")
        y -= 20

    # ── Footer ──
    y -= 30
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(40, y, W - 40, y)
    y -= 20
    c.setFont('Helvetica', 9)
    c.setFillColor(TEXT_MUT)
    c.drawCentredString(W / 2, y, "EVE Mobility - Scooter Monitor - Documentation Technique - Mars 2026")

    c.showPage()


# ═══════════════════════════════════════════════════════════
# GENERATION
# ═══════════════════════════════════════════════════════════

def main():
    c = canvas.Canvas(OUTPUT, pagesize=A4)
    c.setTitle("EVE Mobility - Documentation Technique")
    c.setAuthor("EVE Mobility")
    c.setSubject("Documentation Application Scooter Monitor")

    page_cover(c)
    page_architecture(c)
    page_homescreen(c)
    page_dashboard_batteries(c)
    page_dashboard_sensors(c)
    page_database(c)
    page_realtime_design(c)
    page_auth(c)

    c.save()
    print(f"PDF genere : {OUTPUT}")
    print(f"8 pages")

if __name__ == '__main__':
    main()
