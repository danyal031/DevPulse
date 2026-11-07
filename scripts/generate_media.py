import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2

# Output files
GIF_PATH = "assets/devshelf-demo.gif"
MP4_PATH = "assets/devshelf-walkthrough.mp4"

# Colors & Palette
BG_DARK = "#181818"
SIDEBAR_BG = "#1f1f1f"
EDITOR_BG = "#141414"
PANEL_BG = "#252526"
CARD_BG = "#2a2d32"
CARD_HOVER = "#32363e"
BORDER_COLOR = "#3c3c3c"
ACCENT_BLUE = "#388bfd"
ACCENT_GREEN = "#3fb950"
ACCENT_RED = "#f85149"
ACCENT_AMBER = "#f59e0b"
ACCENT_CYAN = "#38bdf8"
ACCENT_PURPLE = "#a371f7"
TEXT_WHITE = "#ffffff"
TEXT_MUTED = "#9d9d9d"
TEXT_DIM = "#6b6b6b"

# Load Fonts
font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 18)
font_h2 = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 15)
font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 12)
font_regular = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
font_small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 10)
font_mono = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 11)
font_mono_bold = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 11)
font_mono_small = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 9)
font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 9)
font_hero = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def create_base_canvas(width=1280, height=720):
    img = Image.new("RGB", (width, height), hex_to_rgb(BG_DARK))
    draw = ImageDraw.Draw(img)

    # Window Title Bar (Height: 36)
    draw.rectangle([0, 0, width, 36], fill=hex_to_rgb("#1e1e1e"))
    draw.line([0, 36, width, 36], fill=hex_to_rgb("#2d2d2d"), width=1)
    
    # macOS-style window dots
    draw.ellipse([14, 12, 26, 24], fill=hex_to_rgb("#ff5f56"))
    draw.ellipse([34, 12, 46, 24], fill=hex_to_rgb("#ffbd2e"))
    draw.ellipse([54, 12, 66, 24], fill=hex_to_rgb("#27c93f"))
    
    # Search / Title in titlebar
    draw.rounded_rectangle([width // 2 - 200, 6, width // 2 + 200, 30], radius=5, fill=hex_to_rgb("#2d2d2d"), outline=hex_to_rgb("#3d3d3d"))
    draw.text((width // 2 - 130, 9), "DevShelf (Kaarbox) — Dev Swiss Army Knife", font=font_small, fill=hex_to_rgb(TEXT_MUTED))

    # Activity Bar on left (Width: 48)
    draw.rectangle([0, 36, 48, height], fill=hex_to_rgb("#181818"))
    draw.line([48, 36, 48, height], fill=hex_to_rgb("#282828"), width=1)

    # Activity bar icons (Files, Search, Git, DevShelf)
    # DevShelf active indicator
    draw.rectangle([0, 80, 2, 116], fill=hex_to_rgb(ACCENT_BLUE))
    draw.rounded_rectangle([8, 82, 40, 114], radius=6, fill=hex_to_rgb("#2a2d32"), outline=hex_to_rgb(ACCENT_BLUE))
    draw.text((14, 88), "⚡", font=font_bold, fill=hex_to_rgb(ACCENT_BLUE))

    # Secondary dummy icons
    draw.text((17, 48), "📁", font=font_small, fill=hex_to_rgb(TEXT_DIM))
    draw.text((17, 130), "🔍", font=font_small, fill=hex_to_rgb(TEXT_DIM))
    draw.text((17, 160), "🌿", font=font_small, fill=hex_to_rgb(TEXT_DIM))
    draw.text((17, 190), "🐳", font=font_small, fill=hex_to_rgb(TEXT_DIM))

    # Sidebar Header (Width: 380, x: 48 to 428)
    draw.rectangle([48, 36, 428, 76], fill=hex_to_rgb(SIDEBAR_BG))
    draw.line([48, 76, 428, 76], fill=hex_to_rgb(BORDER_COLOR), width=1)
    
    draw.rounded_rectangle([58, 44, 84, 68], radius=5, fill=hex_to_rgb("#10386b"), outline=hex_to_rgb(ACCENT_BLUE))
    draw.text((64, 48), "⚡", font=font_regular, fill=hex_to_rgb("#58a6ff"))
    
    draw.text((92, 44), "DEVSHELF", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((92, 58), "v1.8.0 • Offline Suite", font=font_badge, fill=hex_to_rgb(ACCENT_CYAN))

    # Language toggle badge
    draw.rounded_rectangle([376, 46, 416, 66], radius=4, fill=hex_to_rgb("#2d2d2d"), outline=hex_to_rgb("#404040"))
    draw.text((388, 49), "FA", font=font_badge, fill=hex_to_rgb(TEXT_WHITE))

    # Sidebar separator line
    draw.line([428, 36, 428, height], fill=hex_to_rgb(BORDER_COLOR), width=1)

    # Main Editor Canvas (x: 428 to width)
    draw.rectangle([428, 36, width, height], fill=hex_to_rgb(EDITOR_BG))

    # Editor Tabs Header
    draw.rectangle([428, 36, width, 68], fill=hex_to_rgb("#181818"))
    draw.line([428, 68, width, 68], fill=hex_to_rgb("#282828"), width=1)

    # Active tab 1
    draw.rectangle([428, 36, 560, 68], fill=hex_to_rgb(EDITOR_BG))
    draw.line([428, 36, 560, 36], fill=hex_to_rgb(ACCENT_BLUE), width=2)
    draw.text((440, 46), "⚛ App.tsx", font=font_regular, fill=hex_to_rgb(TEXT_WHITE))

    # Inactive tab 2
    draw.rectangle([560, 36, 680, 68], fill=hex_to_rgb("#1a1a1a"))
    draw.text((574, 46), "📦 package.json", font=font_regular, fill=hex_to_rgb(TEXT_MUTED))

    # Inactive tab 3
    draw.rectangle([680, 36, 800, 68], fill=hex_to_rgb("#1a1a1a"))
    draw.text((694, 46), "🎨 styles.css", font=font_regular, fill=hex_to_rgb(TEXT_MUTED))

    return img, draw

def draw_lower_third(draw, width, height, tag, title, desc, tag_color=ACCENT_BLUE):
    card_w, card_h = 760, 68
    x = 460
    y = height - card_h - 20

    # Glassmorphism container
    draw.rounded_rectangle([x, y, x + card_w, y + card_h], radius=10, fill=hex_to_rgb("#181c24"), outline=hex_to_rgb("#303848"), width=1)
    
    # Glow accent stripe
    draw.rounded_rectangle([x + 3, y + 12, x + 7, y + card_h - 12], radius=2, fill=hex_to_rgb(tag_color))

    # Tag pill
    tag_w = int(draw.textlength(tag, font=font_badge)) + 14
    draw.rounded_rectangle([x + 18, y + 12, x + 18 + tag_w, y + 28], radius=4, fill=hex_to_rgb("#222c3d"), outline=hex_to_rgb(tag_color))
    draw.text((x + 25, y + 14), tag, font=font_badge, fill=hex_to_rgb(tag_color))

    # Title
    draw.text((x + 18 + tag_w + 10, y + 12), title, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Description
    draw.text((x + 18, y + 36), desc, font=font_regular, fill=hex_to_rgb(TEXT_MUTED))

def render_scene_hub():
    img, draw = create_base_canvas()
    
    # Sidebar: Hub Page
    # Hero Card
    draw.rounded_rectangle([58, 86, 418, 142], radius=8, fill=hex_to_rgb("#222730"), outline=hex_to_rgb("#323a48"))
    draw.text((70, 96), "DevShelf Hub", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((70, 114), "19 Universal Developer Tools", font=font_small, fill=hex_to_rgb(TEXT_MUTED))
    
    # 19 count badge
    draw.rounded_rectangle([356, 96, 406, 132], radius=6, fill=hex_to_rgb("#102b4d"), outline=hex_to_rgb(ACCENT_BLUE))
    draw.text((370, 102), "19", font=font_bold, fill=hex_to_rgb(ACCENT_CYAN))
    draw.text((362, 118), "Tools", font=font_badge, fill=hex_to_rgb(ACCENT_CYAN))

    # Search Box
    draw.rounded_rectangle([58, 150, 418, 178], radius=6, fill=hex_to_rgb("#16181d"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((70, 156), "🔍 Search 19 developer tools...", font=font_small, fill=hex_to_rgb(TEXT_DIM))

    # Category Chips
    chips = [("All 19", ACCENT_BLUE, True), ("Dev 8", TEXT_MUTED, False), ("Net 4", TEXT_MUTED, False), ("Ops 3", TEXT_MUTED, False), ("Sys 4", TEXT_MUTED, False)]
    cx = 58
    for label, col, active in chips:
        cw = int(draw.textlength(label, font=font_badge)) + 14
        bg = "#1b3a6b" if active else "#22252a"
        outl = ACCENT_BLUE if active else BORDER_COLOR
        draw.rounded_rectangle([cx, 186, cx + cw, 206], radius=10, fill=hex_to_rgb(bg), outline=hex_to_rgb(outl))
        draw.text((cx + 7, 190), label, font=font_badge, fill=hex_to_rgb(TEXT_WHITE if active else TEXT_MUTED))
        cx += cw + 6

    # 4 Sample Hub Cards in Sidebar Grid
    cards = [
        ("Snapshot Studio", "DEV", "Ray.so-grade code snapshots", ACCENT_BLUE, "📷"),
        ("Command Center", "OPS", "1-Click automated script runner", ACCENT_PURPLE, "▶"),
        ("CSS Live Toolkit", "DEV", "Color matcher & glassmorphism", ACCENT_BLUE, "🎨"),
        ("Cache Cleaner", "SYS", "Obliterate dead node_modules", ACCENT_AMBER, "🧹"),
        ("API Tester", "NET", "Postman-grade cURL debugging", ACCENT_GREEN, "🚀"),
        ("Log Analyzer", "SYS", "Grafana-style log telemetry", ACCENT_AMBER, "📋"),
    ]

    cy = 216
    for title, cat, sub, col, icon in cards:
        draw.rounded_rectangle([58, cy, 418, cy + 68], radius=8, fill=hex_to_rgb("#23272e"), outline=hex_to_rgb("#343a45"))
        # Icon pod
        draw.rounded_rectangle([68, cy + 12, 104, cy + 48], radius=6, fill=hex_to_rgb("#1a2230"), outline=hex_to_rgb(col))
        draw.text((78, cy + 18), icon, font=font_regular, fill=hex_to_rgb(col))
        
        # Text
        draw.text((114, cy + 12), title, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        draw.text((114, cy + 28), sub, font=font_small, fill=hex_to_rgb(TEXT_MUTED))
        
        # Category pill & launch hint
        draw.rounded_rectangle([114, cy + 46, 146, cy + 60], radius=3, fill=hex_to_rgb("#161a22"))
        draw.text((120, cy + 48), cat, font=font_badge, fill=hex_to_rgb(col))
        
        draw.text((320, cy + 48), "Launch →", font=font_small, fill=hex_to_rgb(ACCENT_BLUE))
        cy += 74

    # Main Editor Canvas: Big Hero Showcase
    draw_editor_code_background(draw)
    
    # Center Hero Card in Editor
    draw.rounded_rectangle([520, 160, 1180, 520], radius=16, fill=hex_to_rgb("#1b2029"), outline=hex_to_rgb("#303a4c"), width=2)
    
    # Radial glow header
    draw.rounded_rectangle([520, 160, 1180, 240], radius=16, fill=hex_to_rgb("#1e283b"))
    draw.text((550, 180), "⚡ DEVSHELF (دِوشلف)", font=font_hero, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((550, 214), "The Ultimate Offline Developer Utility Belt for Visual Studio Code", font=font_regular, fill=hex_to_rgb(ACCENT_CYAN))

    # Grid of features in editor
    feat_x, feat_y = 550, 260
    feats = [
        ("19 Pro Utilities", "Zero network calls, 100% private & secure", "🔒"),
        ("Hub & Spoke Workspace", "Dedicated workspace with back button & guide", "🎯"),
        ("Tactile Modern UI", "Smooth gradient shifts, no scaling jitter", "✨"),
        ("Bilingual LTR / RTL", "Native Persian (فارسی) & English support", "🌐"),
        ("Native VS Code Theming", "Strictly uses official editor CSS variables", "🎨"),
        ("1-Click Insertion", "Inject TypeScript, Zod, and JSON directly", "⚡"),
    ]
    for i, (f_title, f_desc, f_icon) in enumerate(feats):
        rx = feat_x + (i % 2) * 310
        ry = feat_y + (i // 2) * 78
        draw.rounded_rectangle([rx, ry, rx + 290, ry + 66], radius=8, fill=hex_to_rgb("#232a36"), outline=hex_to_rgb("#354052"))
        draw.text((rx + 12, ry + 12), f_icon, font=font_h2, fill=hex_to_rgb(ACCENT_BLUE))
        draw.text((rx + 42, ry + 14), f_title, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        draw.text((rx + 42, ry + 34), f_desc, font=font_small, fill=hex_to_rgb(TEXT_MUTED))

    # Marketplace Install Badge
    draw.rounded_rectangle([550, 470, 780, 506], radius=6, fill=hex_to_rgb(ACCENT_BLUE))
    draw.text((580, 480), "📥 Install on VS Code Marketplace", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    draw_lower_third(draw, 1280, 720, "NEW IN V1.8.0", "Full-Page Hub Catalog & Dedicated Tool Workspaces", "Spacious 19-tool navigation with bilingual explanatory guide cards and instant back navigation.", ACCENT_BLUE)
    return img

def render_scene_snapshot():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "Snapshot Studio", "DEV", "📷", "Code-to-Image & Snapshot Studio", "Capture Ray.so-grade high-res code snapshots with custom padding, gradients, and traffic lights.")
    
    # Sidebar snapshot controls
    cy = 190
    draw.text((58, cy), "Code Theme & Background", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20
    # Gradient selector pills
    gradients = [("Cosmic", ACCENT_PURPLE), ("Cyan", ACCENT_CYAN), ("Sunset", ACCENT_AMBER), ("Emerald", ACCENT_GREEN)]
    gx = 58
    for gname, gcol in gradients:
        draw.rounded_rectangle([gx, cy, gx + 68, cy + 24], radius=4, fill=hex_to_rgb("#23272e"), outline=hex_to_rgb(gcol))
        draw.ellipse([gx + 6, cy + 6, gx + 18, cy + 18], fill=hex_to_rgb(gcol))
        draw.text((gx + 22, cy + 6), gname, font=font_small, fill=hex_to_rgb(TEXT_WHITE))
        gx += 74
    
    cy += 36
    draw.text((58, cy), "Padding & Canvas Shadow", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20
    draw.rounded_rectangle([58, cy, 418, cy + 8], radius=4, fill=hex_to_rgb("#32363e"))
    draw.rounded_rectangle([58, cy, 260, cy + 8], radius=4, fill=hex_to_rgb(ACCENT_BLUE))
    draw.ellipse([254, cy - 4, 266, cy + 12], fill=hex_to_rgb(TEXT_WHITE))

    cy += 30
    draw.rounded_rectangle([58, cy, 230, cy + 32], radius=6, fill=hex_to_rgb(ACCENT_BLUE))
    draw.text((80, cy + 8), "📸 Export HD PNG", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    draw.rounded_rectangle([244, cy, 418, cy + 32], radius=6, fill=hex_to_rgb("#2d323b"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((276, cy + 8), "📋 Copy SVG Code", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Editor Canvas: Ray.so style code snapshot canvas
    draw_editor_code_background(draw)
    
    # Gradient backdrop
    draw.rounded_rectangle([490, 110, 1210, 560], radius=16, fill=hex_to_rgb("#4f46e5"))
    # Inset gradient simulation
    draw.rounded_rectangle([492, 112, 1208, 558], radius=15, fill=hex_to_rgb("#3730a3"))

    # Dark code card
    draw.rounded_rectangle([550, 160, 1150, 510], radius=12, fill=hex_to_rgb("#111827"), outline=hex_to_rgb("#1f2937"), width=1)
    
    # Card traffic lights
    draw.ellipse([570, 178, 582, 190], fill=hex_to_rgb("#ef4444"))
    draw.ellipse([590, 178, 602, 190], fill=hex_to_rgb("#f59e0b"))
    draw.ellipse([610, 178, 622, 190], fill=hex_to_rgb("#10b981"))
    draw.text((810, 176), "DevShelfService.ts", font=font_small, fill=hex_to_rgb(TEXT_MUTED))

    # Code lines
    code_lines = [
        ("import", " { DevShelf, ToolKit } ", "from", " '@kaarbox/core';"),
        ("", "", "", ""),
        ("export class", " DevPulseOrchestrator {", "", ""),
        ("  private", " offlineEngine = ", "new", " ToolKit.Engine();"),
        ("", "", "", ""),
        ("  async", " inspectWorkspace(): ", "Promise<Report>", " {"),
        ("    const", " telemetry = ", "await", " this.offlineEngine.audit();"),
        ("    return", " { status: 'healthy', memoryFreed: '1.84 GB' };", "", ""),
        ("  }", "", "", ""),
        ("}", "", "", ""),
    ]
    code_y = 210
    for i, parts in enumerate(code_lines):
        line_num = f"{i+1:2d}"
        draw.text((570, code_y), line_num, font=font_mono_small, fill=hex_to_rgb("#4b5563"))
        
        # Color code tokens
        c_x = 600
        draw.text((c_x, code_y), parts[0], font=font_mono, fill=hex_to_rgb("#f43f5e"))
        c_x += int(draw.textlength(parts[0], font=font_mono))
        draw.text((c_x, code_y), parts[1], font=font_mono, fill=hex_to_rgb("#e0e7ff"))
        c_x += int(draw.textlength(parts[1], font=font_mono))
        draw.text((c_x, code_y), parts[2], font=font_mono, fill=hex_to_rgb("#38bdf8"))
        c_x += int(draw.textlength(parts[2], font=font_mono))
        draw.text((c_x, code_y), parts[3], font=font_mono, fill=hex_to_rgb("#a78bfa"))
        
        code_y += 26

    draw_lower_third(draw, 1280, 720, "MODULE 1", "Code-to-Image & Snapshot Studio", "Transform source code into gorgeous, presentation-ready snapshots with Carbon / Ray.so aesthetic.", ACCENT_BLUE)
    return img

def render_scene_commandcenter():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "Command Center", "OPS", "▶", "1-Click Project Command Center", "Automatic discovery of npm, pnpm, yarn, Makefile, Cargo & Docker tasks with instant 1-click execution.")

    # Sidebar: scripts list
    cy = 190
    draw.text((58, cy), "Active Workspace Tasks (8 detected)", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20

    tasks = [
        ("npm run build", "PRODUCTION BUILD", "esbuild.js --production", ACCENT_GREEN, True),
        ("npm test", "TEST SUITE", "node test/testRunner.ts", ACCENT_BLUE, False),
        ("npm run dev", "WATCHER", "tsc --watch", ACCENT_CYAN, False),
        ("docker-compose up", "DOCKER", "docker compose -f docker-compose.yml up", ACCENT_AMBER, False),
    ]

    for title, badge, cmd, col, running in tasks:
        bg = "#1f2a24" if running else "#23272e"
        outl = ACCENT_GREEN if running else BORDER_COLOR
        draw.rounded_rectangle([58, cy, 418, cy + 62], radius=6, fill=hex_to_rgb(bg), outline=hex_to_rgb(outl))
        
        draw.text((70, cy + 10), title, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        draw.rounded_rectangle([280, cy + 10, 360, cy + 24], radius=3, fill=hex_to_rgb("#161a22"))
        draw.text((286, cy + 12), badge, font=font_badge, fill=hex_to_rgb(col))
        
        draw.text((70, cy + 30), cmd, font=font_mono_small, fill=hex_to_rgb(TEXT_MUTED))
        
        if running:
            draw.rounded_rectangle([370, cy + 8, 410, cy + 32], radius=4, fill=hex_to_rgb(ACCENT_RED))
            draw.text((376, cy + 12), "STOP", font=font_badge, fill=hex_to_rgb(TEXT_WHITE))
            draw.text((70, cy + 46), "● Running • 00:04.2 elapsed", font=font_badge, fill=hex_to_rgb(ACCENT_GREEN))
        else:
            draw.rounded_rectangle([370, cy + 8, 410, cy + 32], radius=4, fill=hex_to_rgb(ACCENT_GREEN))
            draw.text((378, cy + 12), "RUN", font=font_badge, fill=hex_to_rgb(TEXT_WHITE))
            
        cy += 70

    # Editor Canvas: Integrated Terminal Running Task
    draw_editor_code_background(draw)
    
    # Terminal panel
    draw.rounded_rectangle([470, 200, 1230, 560], radius=10, fill=hex_to_rgb("#101216"), outline=hex_to_rgb("#2d3748"), width=1)
    
    # Terminal header
    draw.rounded_rectangle([470, 200, 1230, 236], radius=10, fill=hex_to_rgb("#181c22"))
    draw.text((490, 210), "TERMINAL • DevShelf Command Runner: npm run build", font=font_mono_bold, fill=hex_to_rgb(ACCENT_GREEN))
    
    term_lines = [
        ("> devshelf@1.8.0 build", TEXT_MUTED),
        ("> node esbuild.js --production", TEXT_MUTED),
        ("", TEXT_MUTED),
        ("[esbuild] Bundling extension host TypeScript...", ACCENT_CYAN),
        ("[esbuild] Compiling hyper-modern webview styles (5,900 lines CSS)...", ACCENT_CYAN),
        ("[esbuild] Bundling 19 offline developer suite views...", ACCENT_CYAN),
        ("[esbuild] Generating production minified chunks in dist/...", ACCENT_CYAN),
        ("✓ Build completed in 420ms (zero bundle warnings).", ACCENT_GREEN),
        ("✨ Watching for workspace file changes...", TEXT_WHITE),
    ]
    ty = 250
    for line, color in term_lines:
        draw.text((490, ty), line, font=font_mono, fill=hex_to_rgb(color))
        ty += 24

    draw_lower_third(draw, 1280, 720, "MODULE 2", "1-Click Project Command Center", "Zero-config scripts & task runner for package.json, Makefiles, Docker Compose, Bun & Cargo.", ACCENT_PURPLE)
    return img

def render_scene_css():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "CSS Designer", "DEV", "🎨", "Frontend & CSS Live Design Toolkit", "Live color palette conversion, Tailwind matcher, interactive glassmorphism & unit sync.")

    # Sidebar: color swatch & sliders
    cy = 190
    draw.text((58, cy), "Color & Tailwind Matcher", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20
    # Circular color swatch
    draw.ellipse([58, cy, 102, cy + 44], fill=hex_to_rgb("#6366f1"), outline=hex_to_rgb(TEXT_WHITE), width=2)
    draw.text((114, cy + 4), "#6366F1", font=font_mono_bold, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((114, cy + 22), "rgb(99, 102, 241) • hsl(239, 84%, 67%)", font=font_mono_small, fill=hex_to_rgb(TEXT_MUTED))

    cy += 54
    # Tailwind match card
    draw.rounded_rectangle([58, cy, 418, cy + 62], radius=6, fill=hex_to_rgb("#1e222d"), outline=hex_to_rgb("#343e54"))
    draw.text((70, cy + 8), "Tailwind CSS Match:", font=font_small, fill=hex_to_rgb(TEXT_MUTED))
    draw.text((190, cy + 8), "indigo-500 (#6366f1)", font=font_mono_bold, fill=hex_to_rgb(ACCENT_CYAN))
    draw.text((70, cy + 28), "bg-indigo-500  •  text-indigo-500  •  border-indigo-500", font=font_mono, fill=hex_to_rgb("#818cf8"))
    draw.text((70, cy + 44), "1-Click copy to clipboard ready", font=font_badge, fill=hex_to_rgb(ACCENT_GREEN))

    cy += 74
    # Units conversion
    draw.text((58, cy), "Units Sync (PX ⇄ REM)", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20
    draw.rounded_rectangle([58, cy, 180, cy + 34], radius=6, fill=hex_to_rgb("#16181d"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((74, cy + 8), "24 px", font=font_mono_bold, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((196, cy + 8), "⇄", font=font_bold, fill=hex_to_rgb(ACCENT_BLUE))
    draw.rounded_rectangle([220, cy, 340, cy + 34], radius=6, fill=hex_to_rgb("#16181d"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((236, cy + 8), "1.5 rem", font=font_mono_bold, fill=hex_to_rgb(ACCENT_CYAN))

    # Editor Canvas: Live Interactive Glassmorphism Stage
    draw_editor_code_background(draw)
    
    # Mesh stage
    draw.rounded_rectangle([480, 120, 1220, 560], radius=16, fill=hex_to_rgb("#0f172a"))
    # Mesh gradient background bubbles
    draw.ellipse([540, 160, 780, 400], fill=hex_to_rgb("#ec4899"))
    draw.ellipse([880, 220, 1140, 480], fill=hex_to_rgb("#3b82f6"))
    draw.ellipse([700, 320, 940, 540], fill=hex_to_rgb("#f59e0b"))

    # Live Glass Overlay Card
    draw.rounded_rectangle([620, 200, 1080, 480], radius=20, fill=hex_to_rgb("#ffffff"), outline=hex_to_rgb("#ffffff"), width=2)
    # Fake glass blur tint
    glass_card = Image.new("RGBA", (460, 280), (255, 255, 255, 45))
    img.paste(glass_card, (620, 200), glass_card)

    draw.ellipse([650, 230, 664, 244], fill=hex_to_rgb(TEXT_WHITE))
    draw.text((674, 228), "Glassmorphism Live Inspector", font=font_h2, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((650, 260), "Blur 16px • Opacity 25% • Border 20% • Radius 20px", font=font_regular, fill=hex_to_rgb(TEXT_WHITE))

    # Glass Code Box
    draw.rounded_rectangle([650, 300, 1050, 440], radius=10, fill=hex_to_rgb("#0b0f19"))
    glass_css = [
        "background: rgba(255, 255, 255, 0.25);",
        "backdrop-filter: blur(16px);",
        "-webkit-backdrop-filter: blur(16px);",
        "border: 1px solid rgba(255, 255, 255, 0.2);",
        "border-radius: 20px;",
    ]
    gcy = 316
    for gline in glass_css:
        draw.text((666, gcy), gline, font=font_mono, fill=hex_to_rgb("#38bdf8"))
        gcy += 22

    draw_lower_third(draw, 1280, 720, "MODULE 3", "Frontend & CSS Live Design Toolkit", "Live glassmorphism generator, accurate Tailwind CSS matcher and bidirectional PX/REM conversion.", ACCENT_BLUE)
    return img

def render_scene_cleaner():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "Cache Cleaner", "SYS", "🧹", "Dev Junk & Cache Obliterator", "Clean dead node_modules, build caches (.next, dist, target) & global package manager junk.")

    # Sidebar: storage telemetry card
    cy = 190
    draw.rounded_rectangle([58, cy, 418, cy + 130], radius=10, fill=hex_to_rgb("#23272e"), outline=hex_to_rgb("#353b47"))
    draw.text((70, cy + 12), "TOTAL RECLAIMABLE DISK SPACE", font=font_badge, fill=hex_to_rgb(TEXT_MUTED))
    draw.text((70, cy + 28), "1.84 GB", font=font_hero, fill=hex_to_rgb(ACCENT_CYAN))
    
    # Purge button
    draw.rounded_rectangle([270, cy + 28, 406, cy + 62], radius=6, fill=hex_to_rgb(ACCENT_RED))
    draw.text((284, cy + 36), "🗑 Purge All", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Multi-bar breakdown
    draw.rounded_rectangle([70, cy + 74, 406, cy + 86], radius=6, fill=hex_to_rgb("#181a1f"))
    # Build segment (cyan)
    draw.rounded_rectangle([70, cy + 74, 160, cy + 86], radius=6, fill=hex_to_rgb(ACCENT_CYAN))
    # Deps segment (rose)
    draw.rectangle([160, cy + 74, 340, cy + 86], fill=hex_to_rgb("#f43f5e"))
    # Cache segment (amber)
    draw.rounded_rectangle([340, cy + 74, 406, cy + 86], radius=6, fill=hex_to_rgb(ACCENT_AMBER))

    draw.text((70, cy + 96), "● Build (23%)", font=font_badge, fill=hex_to_rgb(ACCENT_CYAN))
    draw.text((170, cy + 96), "● Deps (58%)", font=font_badge, fill=hex_to_rgb("#f43f5e"))
    draw.text((270, cy + 96), "● Global Cache (19%)", font=font_badge, fill=hex_to_rgb(ACCENT_AMBER))

    # Items list
    cy += 144
    draw.text((58, cy), "Discovered Cleanable Artifacts (6)", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 18
    junk_items = [
        ("node_modules (dead workspace)", "1.18 GB", "Safe to purge", ACCENT_GREEN),
        ("dist / build output", "312 MB", "Safe to purge", ACCENT_GREEN),
        (".next cache folder", "108 MB", "Safe to purge", ACCENT_GREEN),
        ("pnpm global store stale", "240 MB", "Dangerous", ACCENT_AMBER),
    ]
    for jtitle, jsize, jsafe, jcol in junk_items:
        draw.rounded_rectangle([58, cy, 418, cy + 44], radius=6, fill=hex_to_rgb("#1e2229"), outline=hex_to_rgb(BORDER_COLOR))
        draw.text((70, cy + 8), jtitle, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        draw.text((70, cy + 24), jsafe, font=font_badge, fill=hex_to_rgb(jcol))
        draw.text((340, cy + 12), jsize, font=font_mono_bold, fill=hex_to_rgb(ACCENT_CYAN))
        cy += 50

    # Editor Canvas: Visual storage disks telemetry chart
    draw_editor_code_background(draw)
    
    # Telemetry dashboard
    draw.rounded_rectangle([480, 140, 1220, 540], radius=12, fill=hex_to_rgb("#161a22"), outline=hex_to_rgb("#2d3748"))
    draw.text((510, 166), "Storage Reclamation Radar • Visual Distribution", font=font_h2, fill=hex_to_rgb(TEXT_WHITE))

    # 3 Big Telemetry Metric Cards
    metrics = [
        ("PROJECT DEPENDENCIES", "1.18 GB", "3,420 dead files in node_modules", "#f43f5e"),
        ("BUILD ARTIFACTS", "420 MB", ".next, dist, target, build folders", ACCENT_CYAN),
        ("GLOBAL NPM / PNPM CACHE", "240 MB", "Orphaned tarballs and build cache", ACCENT_AMBER),
    ]
    mx = 510
    for mlabel, mval, msub, mcol in metrics:
        draw.rounded_rectangle([mx, 210, mx + 216, 320], radius=8, fill=hex_to_rgb("#1e232d"), outline=hex_to_rgb(mcol))
        draw.text((mx + 16, 226), mlabel, font=font_badge, fill=hex_to_rgb(mcol))
        draw.text((mx + 16, 246), mval, font=font_hero, fill=hex_to_rgb(TEXT_WHITE))
        draw.text((mx + 16, 288), msub, font=font_small, fill=hex_to_rgb(TEXT_MUTED))
        mx += 236

    # Action Banner
    draw.rounded_rectangle([510, 360, 1190, 500], radius=10, fill=hex_to_rgb("#12231b"), outline=hex_to_rgb(ACCENT_GREEN))
    draw.text((540, 390), "✓ Safe Mode Active: Zero Risk of Source Code Loss", font=font_bold, fill=hex_to_rgb(ACCENT_GREEN))
    draw.text((540, 416), "DevShelf only identifies regenerable caches, intermediate artifacts and dead dependencies.", font=font_regular, fill=hex_to_rgb(TEXT_WHITE))
    
    draw.rounded_rectangle([540, 444, 760, 480], radius=6, fill=hex_to_rgb(ACCENT_GREEN))
    draw.text((566, 452), "⚡ Execute 1-Click Clean (1.84 GB)", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    draw_lower_third(draw, 1280, 720, "MODULE 4", "Dev Junk & Cache Obliterator", "Instantly reclaim gigabytes of hidden storage from node_modules, build targets & stale package caches.", ACCENT_AMBER)
    return img

def render_scene_api():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "Mini API Tester", "NET", "🚀", "Mini API Tester (cURL Lite)", "Send REST requests, configure custom headers, payload body & inspect response time and headers.")

    # Sidebar: unified request bar
    cy = 190
    draw.text((58, cy), "HTTP Request Builder", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20
    # Unified bar
    draw.rounded_rectangle([58, cy, 418, cy + 38], radius=6, fill=hex_to_rgb("#171a21"), outline=hex_to_rgb(BORDER_COLOR))
    # Method badge
    draw.rounded_rectangle([64, cy + 6, 110, cy + 32], radius=4, fill=hex_to_rgb("#093322"), outline=hex_to_rgb(ACCENT_GREEN))
    draw.text((74, cy + 11), "POST", font=font_bold, fill=hex_to_rgb(ACCENT_GREEN))
    draw.text((118, cy + 12), "https://api.devpulse.io/v1/auth", font=font_mono_small, fill=hex_to_rgb(TEXT_WHITE))

    cy += 48
    draw.rounded_rectangle([58, cy, 140, cy + 30], radius=5, fill=hex_to_rgb(ACCENT_BLUE))
    draw.text((76, cy + 7), "🚀 Send (Ctrl+Enter)", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Response meta
    cy += 42
    draw.rounded_rectangle([58, cy, 418, cy + 64], radius=6, fill=hex_to_rgb("#1e232c"), outline=hex_to_rgb("#303846"))
    draw.rounded_rectangle([68, cy + 10, 140, cy + 32], radius=4, fill=hex_to_rgb("#0f3922"), outline=hex_to_rgb(ACCENT_GREEN))
    draw.text((78, cy + 14), "200 OK", font=font_bold, fill=hex_to_rgb(ACCENT_GREEN))
    
    draw.text((150, cy + 14), "⚡ 42 ms (Fast)", font=font_badge, fill=hex_to_rgb(ACCENT_CYAN))
    draw.text((250, cy + 14), "📦 1.2 KB", font=font_badge, fill=hex_to_rgb(TEXT_MUTED))
    draw.text((68, cy + 42), "Content-Type: application/json; charset=utf-8", font=font_mono_small, fill=hex_to_rgb(TEXT_MUTED))

    # Editor Canvas: Rich JSON Response Viewer
    draw_editor_code_background(draw)
    
    draw.rounded_rectangle([480, 120, 1220, 560], radius=10, fill=hex_to_rgb("#12161f"), outline=hex_to_rgb("#2c3547"))
    draw.text((504, 142), "RESPONSE DASHBOARD • 200 OK (application/json)", font=font_bold, fill=hex_to_rgb(ACCENT_GREEN))

    json_payload = [
        ("{", TEXT_WHITE),
        ('  "status": "success",', ACCENT_CYAN),
        ('  "code": 200,', "#f59e0b"),
        ('  "user": {', TEXT_WHITE),
        ('    "id": "usr_9x821a",', ACCENT_GREEN),
        ('    "email": "architect@devshelf.internal",', ACCENT_GREEN),
        ('    "role": "Principal Systems Engineer",', ACCENT_GREEN),
        ('    "permissions": ["telemetry:read", "cache:purge", "cluster:admin"]', "#a78bfa"),
        ('  },', TEXT_WHITE),
        ('  "session": {', TEXT_WHITE),
        ('    "tokenType": "Bearer",', ACCENT_GREEN),
        ('    "expiresIn": 86400,', "#f59e0b"),
        ('    "offlineMode": true', "#f43f5e"),
        ('  }', TEXT_WHITE),
        ("}", TEXT_WHITE),
    ]
    jy = 176
    for jline, jcol in json_payload:
        draw.text((504, jy), jline, font=font_mono, fill=hex_to_rgb(jcol))
        jy += 22

    draw_lower_third(draw, 1280, 720, "MODULE 5", "Mini API Tester (cURL Lite)", "Send HTTP requests, test localhost ports and inspect response JSON without switching to Postman.", ACCENT_GREEN)
    return img

def render_scene_logs():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "Log File Analyzer", "SYS", "📋", "Log File Analyzer & Highlighter", "Real-time log parsing, stack trace highlighting, Grafana HUD & clean error report generation.")

    # Sidebar: HUD metrics
    cy = 190
    draw.text((58, cy), "Real-Time Telemetry HUD", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20

    # 4 HUD cards
    hud = [("TOTAL", "48", TEXT_WHITE), ("ERROR", "2", ACCENT_RED), ("WARN", "5", ACCENT_AMBER), ("INFO", "41", ACCENT_CYAN)]
    hx = 58
    for htitle, hval, hcol in hud:
        draw.rounded_rectangle([hx, cy, hx + 84, cy + 48], radius=6, fill=hex_to_rgb("#1e232c"), outline=hex_to_rgb(BORDER_COLOR))
        draw.text((hx + 8, cy + 6), htitle, font=font_badge, fill=hex_to_rgb(hcol))
        draw.text((hx + 8, cy + 22), hval, font=font_bold, fill=hex_to_rgb(hcol))
        hx += 90

    cy += 58
    # Search inside logs
    draw.rounded_rectangle([58, cy, 418, cy + 28], radius=4, fill=hex_to_rgb("#16181d"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((70, cy + 6), "Filter: level:error OR query...", font=font_small, fill=hex_to_rgb(TEXT_DIM))

    cy += 38
    # Export clean summary
    draw.rounded_rectangle([58, cy, 230, cy + 30], radius=5, fill=hex_to_rgb(ACCENT_BLUE))
    draw.text((74, cy + 7), "📋 Export Clean Error Report", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Editor Canvas: Stream with color stripes
    draw_editor_code_background(draw)
    
    draw.rounded_rectangle([480, 120, 1220, 560], radius=10, fill=hex_to_rgb("#13161c"), outline=hex_to_rgb("#2d3648"))
    draw.text((504, 140), "LOG STREAM TELEMETRY • Active Filter: [ERROR, WARN]", font=font_bold, fill=hex_to_rgb(ACCENT_AMBER))

    log_rows = [
        ("10:14:02.120", "INFO", "Server started listening on port 3000 (PID 1420)", ACCENT_CYAN, False),
        ("10:14:12.890", "WARN", "Query execution exceeded threshold (450ms): SELECT * FROM heavy_table", ACCENT_AMBER, False),
        ("10:14:18.230", "ERROR", "Connection timeout to Redis cache server (127.0.0.1:6379)", ACCENT_RED, True),
        ("10:14:22.010", "INFO", "Healthcheck probed successfully - 200 OK", ACCENT_CYAN, False),
        ("10:14:29.600", "ERROR", "UnhandledPromiseRejection: JWT signature verification failed", ACCENT_RED, True),
    ]
    ly = 176
    for ltime, llevel, lmsg, lcol, has_stack in log_rows:
        draw.rounded_rectangle([504, ly, 1196, ly + (64 if has_stack else 36)], radius=6, fill=hex_to_rgb("#1a1e27"), outline=hex_to_rgb(lcol))
        draw.rounded_rectangle([504, ly, 508, ly + (64 if has_stack else 36)], radius=2, fill=hex_to_rgb(lcol))
        
        draw.text((520, ly + 8), ltime, font=font_mono_small, fill=hex_to_rgb(TEXT_MUTED))
        draw.rounded_rectangle([610, ly + 6, 660, ly + 24], radius=3, fill=hex_to_rgb(lcol))
        draw.text((616, ly + 8), llevel, font=font_badge, fill=hex_to_rgb("#ffffff"))
        
        draw.text((674, ly + 8), lmsg, font=font_mono, fill=hex_to_rgb(TEXT_WHITE))
        
        if has_stack:
            draw.text((530, ly + 36), "↳ at RedisClient.connect (/app/node_modules/redis/client.js:142:19)", font=font_mono_small, fill=hex_to_rgb("#fca5a5"))
        
        ly += 74 if has_stack else 44

    draw_lower_third(draw, 1280, 720, "MODULE 6", "Log File Analyzer & Highlighter", "High-contrast log stream viewer with Datadog-style HUD, level chips and instant error export.", ACCENT_AMBER)
    return img

def render_scene_bundle():
    img, draw = create_base_canvas()
    draw_tool_sidebar(draw, "Bundle Size Radar", "DEV", "⚖", "Bundle Size Radar & Package Diet", "Deep dependency inspection, minified/gzipped sizes & lightweight replacement suggestions.")

    # Sidebar: top heavy dependencies
    cy = 190
    draw.text((58, cy), "Heavy Dependencies (Top 4)", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    cy += 20
    pkgs = [
        ("moment", "289 KB (72 KB gzip)", "💡 Use date-fns (-75%)", ACCENT_AMBER),
        ("lodash", "71 KB (24 KB gzip)", "💡 Use lodash-es / native (-80%)", ACCENT_AMBER),
        ("crypto-js", "68 KB (18 KB gzip)", "💡 Use native Web Crypto (-100%)", ACCENT_GREEN),
        ("axios", "32 KB (11 KB gzip)", "💡 Use native fetch (-100%)", ACCENT_GREEN),
    ]
    for pname, psize, ptip, pcol in pkgs:
        draw.rounded_rectangle([58, cy, 418, cy + 50], radius=6, fill=hex_to_rgb("#1e222c"), outline=hex_to_rgb("#323a4b"))
        draw.text((70, cy + 8), pname, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        draw.text((260, cy + 8), psize, font=font_mono_small, fill=hex_to_rgb(ACCENT_CYAN))
        draw.text((70, cy + 28), ptip, font=font_badge, fill=hex_to_rgb(pcol))
        cy += 58

    # Editor Canvas: Donut weight visualization
    draw_editor_code_background(draw)
    
    draw.rounded_rectangle([480, 120, 1220, 560], radius=12, fill=hex_to_rgb("#151a24"), outline=hex_to_rgb("#2d394f"))
    draw.text((510, 144), "PROJECT DEPENDENCY WEIGHT BREAKDOWN", font=font_h2, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((510, 170), "Total analyzed: 42 production packages • Total Minified: 2.42 MB (486 KB Gzipped)", font=font_regular, fill=hex_to_rgb(ACCENT_CYAN))

    # Fake radial/donut chart
    chart_cx, chart_cy, r = 680, 340, 120
    draw.ellipse([chart_cx - r, chart_cy - r, chart_cx + r, chart_cy + r], fill=hex_to_rgb("#38bdf8"))
    # Slices simulation
    draw.pieslice([chart_cx - r, chart_cy - r, chart_cx + r, chart_cy + r], 0, 140, fill=hex_to_rgb("#f59e0b"))
    draw.pieslice([chart_cx - r, chart_cy - r, chart_cx + r, chart_cy + r], 140, 220, fill=hex_to_rgb("#ec4899"))
    draw.pieslice([chart_cx - r, chart_cy - r, chart_cx + r, chart_cy + r], 220, 290, fill=hex_to_rgb("#10b981"))
    # Donut center hole
    draw.ellipse([chart_cx - 70, chart_cy - 70, chart_cx + 70, chart_cy + 70], fill=hex_to_rgb("#151a24"))
    draw.text((chart_cx - 36, chart_cy - 16), "2.42 MB", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((chart_cx - 30, chart_cy + 4), "Total Weight", font=font_badge, fill=hex_to_rgb(TEXT_MUTED))

    # Donut Legend on right
    lx = 860
    ly = 240
    legends = [
        ("moment.js (289 KB)", "#f59e0b"),
        ("lodash (71 KB)", "#ec4899"),
        ("crypto-js (68 KB)", "#10b981"),
        ("Other 39 packages (1.99 MB)", "#38bdf8"),
    ]
    for lname, lcol in legends:
        draw.ellipse([lx, ly, lx + 12, ly + 12], fill=hex_to_rgb(lcol))
        draw.text((lx + 20, ly), lname, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        ly += 30

    # Package Diet summary card
    draw.rounded_rectangle([860, 380, 1180, 500], radius=8, fill=hex_to_rgb("#1a2b22"), outline=hex_to_rgb(ACCENT_GREEN))
    draw.text((880, 396), "🥗 Package Diet Potential Savings", font=font_bold, fill=hex_to_rgb(ACCENT_GREEN))
    draw.text((880, 424), "Replacing top 3 heavy packages can reduce", font=font_regular, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((880, 444), "bundle weight by up to 410 KB (-68% Gzip)!", font=font_bold, fill=hex_to_rgb(ACCENT_CYAN))
    draw.text((880, 470), "Zero breaking changes with modern native APIs.", font=font_small, fill=hex_to_rgb(TEXT_MUTED))

    draw_lower_third(draw, 1280, 720, "MODULE 7", "Bundle Size Radar & Package Diet", "Visual dependency weight distribution and smart recommendations for ultra-lightweight alternatives.", ACCENT_BLUE)
    return img

def render_scene_outro():
    img, draw = create_base_canvas()
    draw_editor_code_background(draw)

    # Big Outro Card
    draw.rounded_rectangle([200, 100, 1080, 620], radius=20, fill=hex_to_rgb("#1a2130"), outline=hex_to_rgb("#385380"), width=2)
    
    draw.text((260, 140), "⚡ DEVSHELF (Kaarbox)", font=font_hero, fill=hex_to_rgb(TEXT_WHITE))
    draw.text((260, 180), "Supercharge your VS Code workflow with 19 universal developer tools in one place.", font=font_h2, fill=hex_to_rgb(ACCENT_CYAN))

    # Feature Grid
    out_x, out_y = 260, 240
    badges = [
        ("100% Offline-First", "No external telemetry, safe for sensitive code"),
        ("Universal Hub & Spoke", "Spacious 19-tool navigation with back button"),
        ("1-Click Insertion", "Inject TypeScript, Zod & JSON at cursor"),
        ("Bilingual LTR / RTL", "First-class English & Persian (فارسی) support"),
        ("Tactile Modern UI", "Smooth gradient shifts, zero zoom scaling"),
        ("Native VS Code Theming", "Strictly integrates with all VS Code themes"),
    ]
    for i, (btitle, bdesc) in enumerate(badges):
        bx = out_x + (i % 2) * 400
        by = out_y + (i // 2) * 80
        draw.rounded_rectangle([bx, by, bx + 370, by + 68], radius=8, fill=hex_to_rgb("#232c3d"), outline=hex_to_rgb("#3a4b66"))
        draw.text((bx + 16, by + 14), btitle, font=font_bold, fill=hex_to_rgb(TEXT_WHITE))
        draw.text((bx + 16, by + 36), bdesc, font=font_small, fill=hex_to_rgb(TEXT_MUTED))

    # Call to action
    draw.rounded_rectangle([260, 500, 600, 550], radius=8, fill=hex_to_rgb(ACCENT_BLUE))
    draw.text((290, 514), "🚀 Install DevShelf in VS Code", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    draw.rounded_rectangle([620, 500, 920, 550], radius=8, fill=hex_to_rgb("#263042"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((650, 514), "⭐ Star on GitHub", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    return img

def draw_tool_sidebar(draw, tool_name, cat, icon, guide_title, guide_desc):
    # Back to Hub button
    draw.rounded_rectangle([58, 86, 200, 114], radius=6, fill=hex_to_rgb("#272c35"), outline=hex_to_rgb(BORDER_COLOR))
    draw.text((68, 92), "← Back to Tools", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Active tool badge
    draw.rounded_rectangle([212, 86, 418, 114], radius=6, fill=hex_to_rgb("#1f2736"), outline=hex_to_rgb(ACCENT_BLUE))
    draw.text((222, 92), f"{icon} {tool_name}", font=font_bold, fill=hex_to_rgb(TEXT_WHITE))

    # Explanatory guide card
    draw.rounded_rectangle([58, 124, 418, 174], radius=8, fill=hex_to_rgb("#1c222d"), outline=hex_to_rgb("#2e384a"))
    draw.text((70, 132), f"ℹ {guide_title}", font=font_bold, fill=hex_to_rgb(ACCENT_CYAN))
    draw.text((70, 148), guide_desc[:70] + "...", font=font_small, fill=hex_to_rgb(TEXT_MUTED))

def draw_editor_code_background(draw):
    # Faux editor background lines
    for y in range(80, 700, 22):
        draw.text((440, y), f"{y//22:3d}", font=font_mono_small, fill=hex_to_rgb("#2d2d2d"))
        draw.line([470, y + 8, 470 + (y * 3) % 400, y + 8], fill=hex_to_rgb("#1e1e1e"), width=4)

def main():
    os.makedirs("assets", exist_ok=True)
    print("Generating flagship scenes...")

    scenes = [
        ("hub", render_scene_hub()),
        ("snapshot", render_scene_snapshot()),
        ("commandcenter", render_scene_commandcenter()),
        ("css", render_scene_css()),
        ("cleaner", render_scene_cleaner()),
        ("api", render_scene_api()),
        ("logs", render_scene_logs()),
        ("bundle", render_scene_bundle()),
        ("outro", render_scene_outro()),
    ]

    print("Encoding Showcase GIF (assets/devshelf-demo.gif)...")
    # For GIF: Resize to 800x450, add crossfade transition frames between scenes
    gif_frames = []
    for idx, (name, img) in enumerate(scenes):
        resized = img.resize((800, 450), Image.Resampling.LANCZOS)
        # Hold key scene
        for _ in range(8):
            gif_frames.append(resized)
        
        # Crossfade to next scene
        if idx < len(scenes) - 1:
            next_img = scenes[idx + 1][1].resize((800, 450), Image.Resampling.LANCZOS)
            for alpha in [0.25, 0.5, 0.75]:
                blend = Image.blend(resized, next_img, alpha)
                gif_frames.append(blend)

    # Save animated GIF with PIL
    gif_frames[0].save(
        GIF_PATH,
        save_all=True,
        append_images=gif_frames[1:],
        duration=120,
        loop=0,
        optimize=True
    )
    print(f"[OK] Saved {GIF_PATH} ({os.path.getsize(GIF_PATH) // 1024} KB)")

    print("Encoding Full Walkthrough Video (assets/devshelf-walkthrough.mp4)...")
    fps = 30
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video_out = cv2.VideoWriter(MP4_PATH, fourcc, fps, (1280, 720))

    # 30 fps video: hold each scene for ~2.5s (75 frames) with 15 frames crossfade
    for idx, (name, img) in enumerate(scenes):
        np_frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Hold scene
        for _ in range(65):
            video_out.write(np_frame)
            
        # Crossfade to next
        if idx < len(scenes) - 1:
            next_np = cv2.cvtColor(np.array(scenes[idx + 1][1]), cv2.COLOR_RGB2BGR)
            for f in range(15):
                alpha = (f + 1) / 15.0
                blended = cv2.addWeighted(np_frame, 1.0 - alpha, next_np, alpha, 0)
                video_out.write(blended)

    video_out.release()
    print(f"[OK] Saved {MP4_PATH} ({os.path.getsize(MP4_PATH) // 1024} KB)")

if __name__ == "__main__":
    main()
