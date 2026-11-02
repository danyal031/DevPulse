# DevShelf (دِوشلف) — Developer Swiss Army Knife

**DevShelf** is an offline-first, zero-bloat developer utility belt built natively for Visual Studio Code. It provides essential developer utilities right in your VS Code sidebar, with seamless bilingual support for **English (`LTR`)** and **Persian / فارسی (`RTL`)**.

---

## Key Highlights

- **100% Offline-First:** Runs entirely inside your local VS Code environment without transmitting tokens, data, or source code over the network.
- **Native VS Code Theming:** Built exclusively with native VS Code CSS variables (`var(--vscode-sideBar-background)`, `var(--vscode-input-background)`, `var(--vscode-editor-background)`, etc.). Adapts seamlessly to Light, Dark, High Contrast, and custom community themes.
- **Minimalist Codicon Aesthetic:** Zero emoji clutter. Clean, precise SVG icons matching VS Code's native desktop design system.
- **Instant Bilingual Toggle:** One-click instant switch between English (`LTR`, System UI / Inter font) and Persian (`RTL`, Vazirmatn font) with full dictionary localization.
- **Persistent State:** Automatically saves your active tabs, inputs, and selected language across workspace reloads via `vscode.getState()` and `context.globalState`.

---

## Core Modules

### 1. JSON Suite (Formatter, Minifier & TS/Zod Generator)
- **JSON Beautifier & Minifier:** Format JSON with 2 spaces, 4 spaces, or minify into a single compact line. Includes alphabetical key sorting and auto-repair for common syntax errors (unquoted keys, single quotes, trailing commas).
- **Instant AST Inference:** Converts raw JSON objects, nested entities, and complex arrays into clean TypeScript `interface` / `type` definitions and corresponding `zod` validation schemas.
- **Live Syntax Validation:** Real-time syntax validation badge displaying exact error line and column.
- **Editor Integration:** One-click copy or direct insertion at the cursor into the active editor (`Format in Selection`, `Insert TS`, `Insert Zod`, or `Insert JSON`).

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
  - Right-click editor context menu command: **`DevShelf: Normalize Persian Text & Digits in Selection`**.

### 4. Local Port Manager & System IP Inspector (Port Killer & Network)
- **System IP & Network Info:** Instantly displays your local IPv4 address (LAN / Wi-Fi IP), Hostname, and all network interfaces with 1-click copy buttons. Optional check for public IP address.
- **Cross-Platform TCP Detection:** Inspects active listening TCP ports on Windows (`netstat`), macOS (`lsof`), and Linux (`ss`/`lsof`).
- **Reliable Process Termination (Tree Kill):** Uses process tree termination (`taskkill /F /T` on Windows with PowerShell fallback, and `kill -9` / `fuser` on Unix) to guarantee ports are fully freed.
- **Inline Safe Confirmation:** Two-step confirmation button right inside the Webview to eliminate blocked modal dialogs.
- **Command Palette Action:** Terminate processes on any port via **`DevShelf: Kill Process on Port...`**.

### 5. Git Conventional Commit Message Generator
- **SCM Integration:** Adds a dedicated button in the VS Code Source Control (SCM) view and commit input box.
- **Intelligent Diff Analysis:** Scans staged and working tree changes, determines type (`feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`) and scope, and generates a standards-compliant Conventional Commit message.
- **Direct Input Box Injection:** Automatically places the generated message directly into the VS Code commit input box with a single click.

### 6. Git Command Wizard & Rescue Kit (جادوگر دستورات گیت)
- **Interactive Scenario Builder:** Provides dynamic forms for 10 common and complex Git workflows:
  - Modify last commit (`--amend`) with/without editing message.
  - Undo local commits with exact target (`--soft`, `--mixed`, `--hard`).
  - Stash changes including untracked new files (`git stash push -u`).
  - Squash recent N commits into one clean commit.
  - Create, switch, and base new branches.
  - Delete local and/or remote branches safely or forcefully.
  - Discard uncommitted changes or unstage specific files.
  - Cherry-pick commits with or without auto-committing.
  - Recover lost commits or deleted branches via `reflog`.
  - Remote sync with lease (`--force-with-lease`) and fetch pruning.
- **Live Command Preview & Terminal Dispatch:** Instantly renders the terminal-ready command and allows 1-click **Copy Command** or **Run in VS Code Terminal** directly inside the active workspace.
- **Searchable Rescue Cheat Sheet:** Searchable, categorized emergency toolkit for everyday, undo, branching, remote, and advanced rescue operations.

### 7. Crypto, ID & Mock Data Generator
- **Identifier Generators:** Cryptographically secure UUID v4 (RFC 4122) and 26-character sortable ULID (Crockford Base32).
- **Secure Secrets:** Generate 32-byte and 64-byte Hex and Base64 secrets for `.env` files (`AUTH_SECRET`, `JWT_SECRET`, etc.).
- **Live Hasher & Codecs:** Real-time SHA-256 hash generation and Unicode-safe Base64 / URL encoder-decoder.
- **Iranian Test Data Generator:**
  - Valid National Code (کد ملی معتبر) with Modulo 11 check digit algorithm.
  - Valid Iranian Mobile Number prefixes (MCI, Irancell, Rightel).
  - Valid 10-digit Iranian Postal Code.
  - Valid Iranian IBAN / Sheba (`IR...`) with ISO 7064 Modulo 97-10 check digits.

### 8. Docker Quick Deck (مدیریت کانتینرها و سرویس‌های داکر)
- **Container Lifecycle Management:** Real-time inspection of active and stopped local containers (Name, Image, Ports, Status) with graceful status handling when daemon is offline.
- **One-Click Actions:** Start, Stop, and Restart containers directly from the sidebar without terminal switching.
- **Live Log Streamer:** Monospace viewer fetching recent 50 container log lines with instant reload and auto-scroll.
- **Instant Search Filter:** Real-time container filtering by name, image, or port.

### 9. Mini API Tester / cURL Lite (تست و پینگ سریع اندپوینت‌ها)
- **Zero-CORS Request Runner:** Dispatches HTTP requests (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`) directly via Node.js native `fetch` from the Extension Host, completely bypassing browser CORS restrictions.
- **Headers & JSON Body Editor:** Dynamic key-value headers table with row toggle, plus formatted JSON payload editor with syntax helper.
- **Rich Response Inspector:** Color-coded status badges (2xx/3xx/4xx/5xx), millisecond response time, byte payload size, formatted JSON viewer, response headers table, and 1-click clipboard copy.

---

## Command Palette & Context Menu Contributions

| Command | Title | Context |
| :--- | :--- | :--- |
| `devshelf.generateCommitMessage` | `DevShelf: Generate Conventional Commit Message` | SCM Toolbar, Commit Input Box & Palette |
| `devshelf.openSidebar` | `DevShelf: Open Developer Swiss Army Knife` | Command Palette |
| `devshelf.openGitWizard` | `DevShelf: Open Git Command Wizard` | Command Palette |
| `devshelf.gitCheatSheet` | `DevShelf: Git Rescue Cheat Sheet` | Command Palette |
| `devshelf.openDockerDeck` | `DevShelf: Open Docker Quick Deck` | Command Palette |
| `devshelf.openApiTester` | `DevShelf: Open Mini API Tester` | Command Palette |
| `devshelf.copySystemIp` | `DevShelf: Copy Local System IP` | Command Palette |
| `devshelf.formatJson` | `DevShelf: Format JSON in Selection` | Editor Context Menu & Command Palette |
| `devshelf.normalizePersianSelection` | `DevShelf: Normalize Persian Text & Digits in Selection` | Editor Context Menu & Command Palette |
| `devshelf.convertToJalali` | `DevShelf: Convert Date or Timestamp to Jalali` | Editor Context Menu & Command Palette |
| `devshelf.jsonToTypescript` | `DevShelf: Convert Selected JSON to TypeScript & Zod` | Editor Context Menu & Command Palette |
| `devshelf.killPort` | `DevShelf: Kill Process on Port...` | Command Palette |
| `devshelf.generateUuid` | `DevShelf: Generate UUID v4 at Cursor` | Command Palette |
| `devshelf.generateSecret` | `DevShelf: Generate 64-Byte Secure Secret` | Command Palette |

---

## Project Structure

```
├── .vscode/
│   ├── launch.json              # F5 Extension debugging config
│   ├── tasks.json               # Build automation tasks
│   └── settings.json            # Editor visual customizations
├── media/
│   ├── commit-icon.svg          # SCM commit toolbar icon
│   └── devshelf-icon.svg        # Activity Bar icon
├── src/
│   ├── extension.ts             # Host entry point, commands & SCM commit hook
│   ├── providers/
│   │   └── SidebarProvider.ts   # WebviewViewProvider with strict CSP
│   ├── utils/
│   │   ├── jalali.ts            # Pure astronomical Jalali calendar math
│   │   ├── persianSanitizer.ts  # Persian/Arabic char & ZWNJ normalizer
│   │   ├── jwt.ts               # Offline JWT parser & expiration engine
│   │   ├── jsonToTsZod.ts       # Recursive AST generator for TS & Zod
│   │   ├── jsonFormatter.ts     # JSON formatter, minifier & syntax validator
│   │   ├── portManager.ts       # Process tree killer & TCP port scanner
│   │   ├── networkInfo.ts       # System IP, hostname & interfaces info
│   │   ├── gitCommit.ts         # Conventional commit message generator
│   │   ├── gitScenarios.ts      # Git Wizard interactive scenarios & rescue cheat sheet
│   │   ├── dockerManager.ts     # Docker container lifecycle & log inspector
│   │   ├── apiTester.ts         # Zero-CORS Node.js HTTP request client
│   │   └── cryptoMock.ts        # UUID, ULID, secrets, hashes & Iranian mock data
│   └── webview/
│       ├── main.ts              # Webview state coordinator & message dispatcher
│       ├── i18n.ts              # Full English & Persian dictionary
│       ├── icons.ts             # Clean inline SVG Codicons
│       ├── styles.css           # Native VS Code CSS variables with RTL support
│       └── components/          # Modular component views
├── test/
│   └── testRunner.ts            # 11 unit test suites
├── esbuild.js                   # Fast bundler config
├── package.json                 # Extension manifest & contributions
├── tsconfig.json                # Strict TypeScript configuration
└── README.md                    # Documentation
```

---

## Development & Testing

1. **Compile:**
   ```bash
   npm run compile
   ```
2. **Run Unit Tests:**
   ```bash
   npm run test
   ```
3. **Debug in VS Code:**
   Press `F5` in VS Code to launch the Extension Development Host window.
4. **Package VSIX:**
   ```bash
   npx vsce package
   ```

---

## License
MIT
