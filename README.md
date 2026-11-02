# Kaarbox (کارباکس) — Developer Swiss Army Knife

**Kaarbox** is an offline-first, zero-bloat developer utility belt built natively for Visual Studio Code. It provides essential developer utilities right in your VS Code sidebar, with seamless bilingual support for **English (`LTR`)** and **Persian / فارسی (`RTL`)**.

---

## Key Highlights

- **100% Offline-First:** Runs entirely inside your local VS Code environment without transmitting tokens, data, or source code over the network.
- **Native VS Code Theming:** Built exclusively with native VS Code CSS variables (`var(--vscode-sideBar-background)`, `var(--vscode-input-background)`, `var(--vscode-editor-background)`, etc.). Adapts seamlessly to Light, Dark, High Contrast, and custom community themes.
- **Minimalist Codicon Aesthetic:** Zero emoji clutter. Clean, precise SVG icons matching VS Code's native desktop design system.
- **Instant Bilingual Toggle:** One-click instant switch between English (`LTR`, System UI / Inter font) and Persian (`RTL`, Vazirmatn font) with full dictionary localization.
- **Persistent State:** Automatically saves your active tabs, inputs, and selected language across workspace reloads via `vscode.getState()` and `context.globalState`.

---

## Core Modules

### 1. JSON to TypeScript & Zod Schema Generator
- **Instant AST Inference:** Converts raw JSON objects, nested entities, and complex arrays into clean TypeScript `interface` / `type` definitions and corresponding `zod` validation schemas.
- **Smart Date Detection:** Automatically identifies ISO-8601 timestamps and outputs `z.string().datetime()`.
- **Editor Integration:** One-click copy or direct insertion at the cursor into the active editor (`Insert TS`, `Insert Zod`, or `Insert Both`).

### 2. Offline JWT Inspector
- **Local Decryption & Validation:** Inspects and parses standard 3-part JSON Web Tokens (`header.payload.signature`) locally without sending sensitive credentials to third-party web tools.
- **Live Expiry Engine:** Calculates remaining validity or elapsed time with dynamic badges (`Active Token` vs `Expired Token`).
- **Timestamp Formatter:** Translates `iat`, `exp`, and `nbf` claims into human-readable local dates and relative countdowns.

### 3. Persian & Jalali Developer Suite (ابزار بومی و تاریخ)
- **Pure Mathematical Jalali Algorithm:** Bidirectional conversion between Gregorian (`YYYY-MM-DD`), Solar Hijri / Jalali (`1405/XX/XX`), and Unix Timestamps (seconds / milliseconds) using astronomical leap year calculations (no heavy external dependencies).
- **Text & Digit Sanitizer:**
  - Converts Persian/Arabic digits (`۱۲۳` / `١٢٣`) to English (`123`) and vice versa.
  - Normalizes Arabic `ي` / `ك` to Persian `ی` / `ک`.
  - Fixes Zero-Width Non-Joiner (ZWNJ / نیم‌فاصله) for prefixes (`می‌`, `نمی‌`) and suffixes (`‌ها`, `‌های`, `‌تر`, `‌ترین`, `‌ام`, etc.).
  - Right-click editor context menu command: **`Kaarbox: Normalize Persian Text & Digits in Selection`**.

### 4. Local Port Manager (Port Killer)
- **Cross-Platform TCP Detection:** Communicates with the extension host to inspect active listening TCP ports on Windows (`netstat`), macOS (`lsof`), and Linux (`ss`/`lsof`).
- **Process Identification:** Displays port number, PID, and executable process name (e.g., `node.exe`, `python`, `dockerd`).
- **One-Click Process Termination:** Terminate hanging dev servers directly from the sidebar or via Command Palette: **`Kaarbox: Kill Process on Port...`**.

### 5. Crypto, ID & Mock Data Generator
- **Identifier Generators:** Cryptographically secure UUID v4 (RFC 4122) and 26-character sortable ULID (Crockford Base32).
- **Secure Secrets:** Generate 32-byte and 64-byte Hex and Base64 secrets for `.env` files (`AUTH_SECRET`, `JWT_SECRET`, etc.).
- **Live Hasher & Codecs:** Real-time SHA-256 hash generation and Unicode-safe Base64 / URL encoder-decoder.
- **Iranian Test Data Generator:**
  - Valid National Code (کد ملی معتبر) with Modulo 11 check digit algorithm.
  - Valid Iranian Mobile Number prefixes (MCI, Irancell, Rightel).
  - Valid 10-digit Iranian Postal Code.
  - Valid Iranian IBAN / Sheba (`IR...`) with ISO 7064 Modulo 97-10 check digits.

---

## Command Palette & Context Menu Contributions

| Command | Title | Context |
| :--- | :--- | :--- |
| `kaarbox.openSidebar` | `Kaarbox: Open Developer Swiss Army Knife` | Command Palette |
| `kaarbox.normalizePersianSelection` | `Kaarbox: Normalize Persian Text & Digits in Selection` | Editor Context Menu & Command Palette |
| `kaarbox.convertToJalali` | `Kaarbox: Convert Date or Timestamp to Jalali` | Editor Context Menu & Command Palette |
| `kaarbox.jsonToTypescript` | `Kaarbox: Convert Selected JSON to TypeScript & Zod` | Editor Context Menu & Command Palette |
| `kaarbox.killPort` | `Kaarbox: Kill Process on Port...` | Command Palette |
| `kaarbox.generateUuid` | `Kaarbox: Generate UUID v4 at Cursor` | Command Palette |
| `kaarbox.generateSecret` | `Kaarbox: Generate 64-Byte Secure Secret` | Command Palette |

---

## Project Structure

```
├── .vscode/
│   ├── launch.json              # F5 Extension debugging config
│   ├── tasks.json               # Build automation tasks
│   └── settings.json            # Editor visual customizations
├── media/
│   └── kaarbox-icon.svg         # Monochromatic Activity Bar icon
├── src/
│   ├── extension.ts             # Extension Host entry point & command registrations
│   ├── providers/
│   │   └── SidebarProvider.ts   # WebviewViewProvider with strict CSP
│   ├── utils/
│   │   ├── jalali.ts            # Pure astronomical Jalali calendar math
│   │   ├── persianSanitizer.ts  # Persian/Arabic char & ZWNJ normalizer
│   │   ├── jwt.ts               # Offline JWT parser & expiration engine
│   │   ├── jsonToTsZod.ts       # Recursive JSON to TS and Zod generator
│   │   ├── portManager.ts       # Cross-platform port scanner & process killer
│   │   └── cryptoMock.ts        # UUID, ULID, secrets, hashes & Iranian mock data
│   └── webview/
│       ├── main.ts              # Webview state manager & tab router
│       ├── i18n.ts              # Full English & Persian dictionary
│       ├── icons.ts             # Clean inline SVG Codicons
│       ├── styles.css           # Native VS Code CSS variables with RTL support
│       └── components/          # Modular component views
├── test/
│   └── testRunner.ts            # Comprehensive unit test suite
├── esbuild.js                   # Zero-bloat fast bundler config
├── package.json                 # Extension manifest & contributions
├── tsconfig.json                # Strict TypeScript configuration
└── README.md
```

---

## Development & Testing

1. **Compile:**
   ```bash
   npm run compile
   ```
2. **Watch Mode:**
   ```bash
   npm run watch
   ```
3. **Run Unit Tests:**
   ```bash
   npm run test
   ```
4. **Debug in VS Code:**
   Press `F5` in VS Code to launch the Extension Development Host window.

---

## License
MIT
