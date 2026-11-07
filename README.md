# DevShelf (دِوشلف) — Developer Swiss Army Knife

**DevShelf** is an offline-first, zero-bloat developer utility belt built natively for Visual Studio Code. It provides essential developer utilities right in your VS Code sidebar, with seamless bilingual support for **English (`LTR`)** and **Persian / فارسی (`RTL`)**.

---

## Key Highlights

- **Feature Cards Deck & Quick Navigator (v1.6.0):** Hyper-modern card-based navigation featuring a responsive 2-column card deck with distinct icon badges, high-contrast typography, and sub-labels. Includes 1-click category filtering (`All Tools [19]`, `Dev & Design [7]`, `Network & API [5]`, `Project & Ops [3]`, `System & Cleanup [4]`) and collapsible active tool summary banner.
- **100% Offline-First:** Runs entirely inside your local VS Code environment without transmitting tokens, data, or source code over the network.
- **Native VS Code Theming:** Built exclusively with native VS Code CSS variables (`var(--vscode-sideBar-background)`, `var(--vscode-input-background)`, `var(--vscode-editor-background)`, `var(--vscode-focusBorder)`, etc.). Adapts seamlessly to Light, Dark, High Contrast, and custom community themes.
- **Minimalist Codicon Aesthetic:** Zero emoji clutter. Crisp, modern SVG Codicons matching VS Code's desktop design system.
- **Masterclass Bilingual RTL/LTR Architecture:** One-click instant switch between English (`LTR`, System UI / Inter font) and Persian (`RTL`, Vazirmatn font) powered by modern CSS logical properties (`*-inline-start/end`).
- **Persistent State:** Automatically saves your active tabs, inputs, cards deck collapse state, category filter, and selected language across workspace reloads via `vscode.getState()` and `context.globalState`.

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

### 8. Docker Super-Deck (مدیریت کانتینرها، ایمیج‌ها، ولووم‌ها و منابع داکر)
A full-featured Docker Desktop client alternative integrated directly into the VS Code sidebar with native theming:
- **Containers Dashboard (مدیریت کانتینرها):**
  - **Live State & Identification:** Real-time container list with visual status dots (Green for running, Yellow for paused/restarting, Red for stopped/dead), image tags, uptime, and mapped ports.
  - **Comprehensive Lifecycle Controls:** One-click actions for `Start`, `Stop`, `Restart`, `Pause`, `Unpause`, and `Delete/Remove` (with confirmation safety prompt).
  - **Integrated Terminal Access:** Open an interactive shell terminal (`docker exec -it <id> sh`) directly in the VS Code terminal panel.
  - **Live Log Streamer:** Real-time monospace log viewer with inside-search, line tail selector (50, 100, 200, 500 lines), and 1-click clipboard copy.
  - **Inspect JSON Viewer:** Detailed inspect modal to review full container metadata, mounts, environment variables, and network configurations.
- **Images Management (مدیریت ایمیج‌ها):**
  - **Repository & Tag Browser:** View all local Docker images with ID (1-click copy), disk size, and creation date.
  - **Pull Image:** Direct image pull bar with progress indicators (`docker pull <image>`).
  - **Run Container Dialog:** Launch new containers directly from any image with customizable container name, host:container port mappings (`-p`), and environment variables (`-e`).
  - **Prune & Delete:** Remove individual images or prune all dangling/unused images (`docker image prune -a`).
- **Volumes & Networks Explorer (مدیریت ولووم‌ها و شبکه‌ها):**
  - **Volumes Explorer:** Inspect local volumes, view driver/scope, inspect raw metadata, and prune unused volumes.
  - **Networks Explorer:** View bridge, host, and custom user networks; inspect network subnets and remove unused custom networks.
- **System Resource Stats & Prune Hub (مخزن آمار حیاتی و پاکسازی):**
  - **Real-Time Resource Monitor:** Snapshot of active container CPU %, memory usage/limits with visual progress bars, Net I/O, Block I/O, and PIDs count.
  - **Global System Prune:** Master disk cleanup tool to reclaim storage space by safely removing stopped containers, unused networks, dangling images, and build caches (`docker system prune -af --volumes`) protected by a two-step confirmation dialog.

### 9. Mini API Tester / cURL Lite (تست و پینگ سریع اندپوینت‌ها)
- **Zero-CORS Request Runner:** Dispatches HTTP requests (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`) directly via Node.js native `fetch` from the Extension Host, completely bypassing browser CORS restrictions.
- **Headers & JSON Body Editor:** Dynamic key-value headers table with row toggle, plus formatted JSON payload editor with syntax helper.
- **Rich Response Inspector:** Color-coded status badges (2xx/3xx/4xx/5xx), millisecond response time, byte payload size, formatted JSON viewer, response headers table, and 1-click clipboard copy.

### 10. SQL Query & Schema Playground (تولیدکننده و اعتبارسنج اسکیماهای SQL)
- **Visual Table & Column Builder:**
  - Multi-dialect support: **PostgreSQL**, **MySQL**, and **SQLite**.
  - Dynamic column designer: Name, Data Type (`INT`, `BIGINT`, `VARCHAR`, `TEXT`, `BOOLEAN`, `TIMESTAMP`, `DATE`, `DECIMAL`, `UUID`, `JSON`), Length/Precision.
  - Constraints & Flags: Primary Key (PK), Auto Increment (Auto), Not Null (NN), Unique (UQ), Default Values, and Foreign Key References (`TargetTable.TargetColumn` with `CASCADE` / `SET NULL`).
- **Live DDL Generation:** Generates clean, production-ready, syntax-compliant `CREATE TABLE` DDL statements in real time.
- **Instant Query Templates:** Generates ready-to-use parameterized SQL query templates:
  - `Select All` (ordered by primary key)
  - `Pagination` (limit and offset customized per dialect)
  - `Insert Row` (with dialect-specific syntax like PostgreSQL `RETURNING`)
  - `Update Row` (parameterized update statement by PK)
  - `Search Filter` (case-insensitive `ILIKE` / `LIKE` across text columns)
  - `Inner Join` (auto-detected foreign key relationship query)
- **Editor & Clipboard Actions:** 1-click **Copy SQL** to clipboard or **Insert at Cursor** directly into active SQL migration or schema files.

### 11. Log File Analyzer & Highlighter (دیکودر و تحلیل‌گر فایل‌های لاگ)
- **Multi-Source Log Ingestion:** Parses raw logs from Docker containers, Node.js, Nginx, Python tracebacks, Go, Java, and microservice JSON logs.
- **Active Editor File Grabber:** One-click **Analyze Active Editor File** button pulls the complete contents of currently open `.log` or output files directly into the analyzer.
- **Smart Level & Stack Trace Detection:**
  - Auto-classifies log severities (`ERROR`, `WARN`, `INFO`, `DEBUG`) with distinct native theme color borders and badges.
  - Groups multi-line stack traces (Node.js `at ...`, Python `Traceback`, Java `Caused by:`) under the parent error entry in collapsible details.
- **Interactive Filtering & Search:**
  - Filter by log level chips (`Errors`, `Warnings`, `Info`, `Debug`) with real-time occurrence counts.
  - Real-time keyword filter across log messages and timestamps.
- **Clean Error Summary Exporter:** Aggregates unique issues, occurrence counts, and sample stack traces into a clean Markdown error report ready to share with teams or paste into issue trackers.

### 12. Instant Mock Server & Live Webhook Catcher (شبیه‌ساز فوری سرور موقت و شکارچی وبهوک)
- **Local Embedded HTTP Server:** Spin up a lightweight Node.js HTTP server right inside the Extension Host on your desired port (default `4040`), featuring an interactive Start/Stop switch and live pulsing connection dot.
- **Custom Dynamic Endpoints:**
  - Define custom routes with standard HTTP methods (`ANY`, `GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and URL paths.
  - Simulate real-world frontend network conditions with an artificial latency slider (`0ms` to `5000ms`).
  - Configure custom HTTP status codes (`200`, `201`, `400`, `401`, `500`) and mock JSON/text response payloads.
- **Universal Zero-CORS Architecture:** Pre-configured with automatic CORS headers (`Access-Control-Allow-Origin: *`, `OPTIONS` preflight handling) allowing local SPAs (React, Vue, Vite, Next.js) or mobile apps to test without CORS barriers.
- **Real-Time Webhook Inspector:**
  - Live inbound request stream showing Timestamp, Method, Path, Client IP, Query Params, Headers, and Payload Body.
  - One-click **Copy Payload** and **Replay in API Tester** to immediately test or debug received webhooks.

### 13. One-Click Public Tunnel & QR Share (تونل‌ساز عمومی لوکال‌هاست و اشتراک‌گذاری با QR Code)
- **Instant Port Forwarding to the Internet:** Expose any local development server (Vite, Next.js, Django, FastAPI, or DevShelf Mock Server) to the public web with zero complex configuration.
- **Multi-Provider Support:**
  - **Cloudflare Quick Tunnel:** Free, zero-configuration `trycloudflare.com` tunnel without requiring an account or API key (`npx --yes cloudflared tunnel --url http://localhost:<port>`).
  - **Localtunnel:** Direct public tunnel via `loca.lt`.
  - **Ngrok:** Seamless integration for developers with local `ngrok` CLI configured.
- **Offline Pure-TS SVG QR Code:**
  - Generates a sharp, responsive SVG QR Code directly in the sidebar without external API calls or npm dependencies.
  - Instant mobile phone camera scanning for responsive testing on real iOS / Android devices.
- **Clean Process Management:** Process tree termination ensures no background orphaned `npx` or child processes linger after disconnection.

### 14. System Resource Monitor & Zombie Process Killer (مانیتور زنده منابع سیستم و قاتل پروسه‌های رم‌خوار)
- **Real-Time Hardware Telemetry Gauges:**
  - Dynamic visual progress bars for real-time CPU load (%) and RAM usage (Used GB / Total GB + %).
  - System architecture, CPU cores count, and system uptime readout.
  - Auto-refresh polling every 3 seconds with manual refresh toggle.
- **Top Memory Hogs & Developer Filter:**
  - Lists top resource-consuming processes across Windows (`Get-Process`), Linux, and macOS (`ps aux`).
  - Dedicated **Developer Processes Only** filter highlighting `node`, `python`, `docker`, `java`, `postgres`, `go`, and `code`.
- **Runaway Process & Orphan Terminator:**
  - Two-step safe inline **Kill Process** button (`taskkill /F /PID` on Windows, `kill -9` on Unix).
  - Quick-action **Kill Orphan Node/Python Processes** button to safely clean up dangling development servers with a single click.

### 15. Mini Load Tester & API Stress Benchmarker (تستر بار و بنچمارک سرعت اندپوینت‌ها)
- **High-Precision Async Load Engine:**
  - Concurrent virtual users worker pool (1 to 200 concurrent promises) running in Node.js without blocking the main event loop.
  - Dual test modes: **Duration-Based Mode** (5s, 10s, 30s, 60s) or **Total Requests Mode** (100, 500, 1,000, 5,000 requests).
  - Configurable HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`), custom request headers, JSON payloads, request timeouts, and HTTP/HTTPS connection keep-alive toggle.
  - Emergency 1-click **Abort Benchmark** powered by native `AbortController` and instant socket pool teardown.
- **Real-Time Telemetry Dashboard:**
  - **Live Animated Progress Bar:** Sub-millisecond tracking with elapsed and total duration readouts.
  - **6 Core KPI Metric Cards:** Real-time throughput in blue (`RPS`), Average Latency, P50 (Median), P95, P99, and Success Rate (%).
  - **Pure-SVG Latency Distribution Histogram:** Zero-dependency, lightweight SVG chart visualizing latency brackets (`<50ms`, `50-150ms`, `150-300ms`, `300-500ms`, `>500ms`) with color-coded warning thresholds and share percentages.
  - **Status Codes Breakdown Table:** Detailed breakdown of response HTTP status codes (2xx, 3xx, 4xx, 5xx) and connection errors (e.g. `ECONNREFUSED`, `ETIMEDOUT`).
  - **1-Click Markdown Benchmark Report:** Instant export of complete benchmark telemetry to clipboard formatted for GitHub issues, PRs, and Slack.

### 16. Code-to-Image & Snapshot Studio (استودیوی ساخت عکس‌های خیره‌کننده از کد)
- **Studio-Quality Code Snapshots (Ray.so / Carbon Alternative):**
  - Transform code selections or active editor files into high-resolution, shareable images.
  - **6 Curated Mesh Gradient Presets:** Sunset Rose, Deep Ocean, Midnight Neon, Emerald Glass, Amber Ember, and Monochrome Slate.
  - **macOS Window Chrome:** Realistic window frame with red/yellow/green traffic light dots, customizable window title/filename, and language badge.
  - **Instant Syntax Token Highlighting:** Lexical colorization for keywords, strings, comments, numbers, and identifiers.
  - **Customizable Controls:** Line numbers toggle, watermark/author tag toggle, and adjustable padding (16px, 24px, 32px, 48px).
  - **2x Retina Canvas Exporter:** Zero-dependency, pure HTML5 Canvas rendering supporting direct **Copy Image to Clipboard** and **Save as PNG** via native VS Code save dialog.

### 17. 1-Click Project Command Center (داشبورد هوشمند اسکریپت‌ها و تسک‌های پروژه)
- **Universal Multi-Ecosystem Task Discovery:**
  - Automatically discovers package scripts across `package.json` (`npm`, `pnpm`, `yarn`, `bun`), `Makefile` targets, `docker-compose.yml` services, `Cargo.toml` tasks, and Python scripts (`pyproject.toml` / `requirements.txt`).
  - **Interactive Script Cards:** Distinct package manager badges, quick search and category filtering (`All`, `Node & Web`, `Makefile`, `Docker`, `Cargo`, `Python`).
  - **Live State & Elapsed Timer:** Dynamic running status indicators (pulsing green dot for active tasks) and sub-second elapsed timers (`MM:SS`).
  - **Integrated Terminal Execution:** 1-click **Run**, **Stop**, **Restart**, and **Open Integrated Terminal** actions maintaining full TTY interactivity and ANSI colors.

### 18. Frontend & CSS Live Design Toolkit (جعبه‌ابزار فرانت‌اند، CSS و پیش‌نمایش موبایل)
- **Smart Color & Nearest Tailwind Matcher:**
  - Synchronized HEX, RGB, and HSL color picker.
  - Real-time Euclidean RGB distance matching against standard Tailwind CSS palette (shades 50–950) with 1-click copy buttons for background (`bg-*`), text (`text-*`), and border (`border-*`) classes.
- **Interactive Glassmorphism & Shadow Generator:**
  - Real-time glass card preview over animated colorful mesh bubbles demonstrating refraction and blur.
  - Sliders for backdrop blur (0–40px), opacity (5–90%), border opacity, and border radius.
  - 1-click **Copy CSS** snippet and **Copy Tailwind** utility classes (`backdrop-blur-md bg-white/25 border-white/20 shadow-lg`).
- **Bidirectional PX <-> REM Calculator:**
  - Instant conversion with configurable root font size (default: 16px) and quick breakpoint/spacing preset buttons.
- **Responsive Multi-Device Viewport Preview:**
  - Side-by-side dedicated Webview panel hosting pixel-perfect simulated device frames: **iPhone 16 Pro** (393 × 852), **iPad Air** (820 × 1180), and **Desktop** (1024 × 768).
  - Live orientation toggle (Portrait / Landscape), zoom scaling (50% to 125%), URL navigation bar, and reload controls.

### 19. Dev Junk & Cache Obliterator (تمیزکننده هوشمند حافظه و کش‌های مرده)
- **Storage Junk Scanner:**
  - Identifies abandoned workspace build artifacts (`.next`, `.nuxt`, `dist`, `build`, `.turbo`), heavy dependencies (`node_modules`), Python caches (`__pycache__`, `.pytest_cache`, `.venv`), and Rust target artifacts (`target`).
  - Scans global package manager cache directories (`~/.npm`, `~/.local/share/pnpm/store`, `~/.cache/yarn`, `~/.cache/pip`).
- **Visual Storage Distribution Chart:**
  - Pure-SVG segmented distribution bar showing relative space occupied by build artifacts, dependencies, and caches.
- **Safety Ratings & Safe Master Purge:**
  - Categorizes targets with safety badges (`Safe to Delete` vs `Reinstall Required`).
  - Safe confirmation modal with item counts and total reclaimable space calculation before permanent deletion.

### 20. Smart DNS Benchmarker, Anti-Sanction Switcher & MTR Radar (رادار ضدتحریم، بنچمارک DNS و مسیریاب شبکه)
- **High-Precision Concurrent DNS Benchmarker:**
  - Parallel DNS resolve4 + fallback TCP handshake on port 53 testing across popular anti-sanction providers (Shecan, 403.online, Electro, Radar Game, Begzar), global resolvers (Cloudflare, Google, Quad9), and custom user-defined DNS servers.
  - Color-coded animated latency bars (`<80ms` Green, `80-200ms` Yellow, `>200ms` Red) with fastest provider winner badge.
  - 1-click OS apply command generator (PowerShell, CMD, Bash) copied directly to clipboard.
  - 1-click OS DNS cache flusher (`ipconfig /flushdns` on Windows, `dscacheutil` on macOS, `resolvectl` on Linux).
- **Sanction & Reachability Matrix:**
  - Probes essential developer endpoints (GitHub, Docker Hub, NPM Registry, Android SDK, OpenAI API, Cloudflare Edge) and classifies reachability (`200 OK` vs `403/451 Sanctioned` vs `Timeout/Blocked`).
  - Color-coded badges indicating whether anti-sanction DNS is required for specific development workflows.
- **Package Registry Switcher:**
  - Instant inspection and switching between official NPM registry (`https://registry.npmjs.org/`) and high-speed developer mirrors (`npmmirror.com`, Cloudflare).
- **Visual MTR & Traceroute Radar:**
  - Real-time cross-platform hop-by-hop network trace with hop counter, router IP/hostname, triple RTT samples, average latency, and packet loss metrics rendered in a step-by-step visual timeline.

---

## Command Palette & Context Menu Contributions

| Command | Title | Context |
| :--- | :--- | :--- |
| `devshelf.openSidebar` | `DevShelf: Open Developer Swiss Army Knife` | Command Palette |
| `devshelf.openDnsRadar` | `DevShelf: Open Smart DNS Benchmarker & Anti-Sanction Radar` | Command Palette |
| `devshelf.openSnapshotStudio` | `DevShelf: Open Code-to-Image & Snapshot Studio` | Command Palette |
| `devshelf.openCommandCenter` | `DevShelf: Open 1-Click Project Command Center` | Command Palette |
| `devshelf.openCssDesigner` | `DevShelf: Open Frontend & CSS Live Design Toolkit` | Command Palette |
| `devshelf.openCacheCleaner` | `DevShelf: Open Dev Junk & Cache Obliterator` | Command Palette |
| `devshelf.openMobilePreview` | `DevShelf: Open Responsive Multi-Device Preview Panel` | Command Palette |
| `devshelf.generateCommitMessage` | `DevShelf: Generate Conventional Commit Message` | SCM Toolbar, Commit Input Box & Palette |
| `devshelf.openGitWizard` | `DevShelf: Open Git Command Wizard` | Command Palette |
| `devshelf.gitCheatSheet` | `DevShelf: Git Rescue Cheat Sheet` | Command Palette |
| `devshelf.openDockerDeck` | `DevShelf: Open Docker Quick Deck` | Command Palette |
| `devshelf.openApiTester` | `DevShelf: Open Mini API Tester` | Command Palette |
| `devshelf.openSqlPlayground` | `DevShelf: Open SQL Query & Schema Playground` | Command Palette |
| `devshelf.openLogAnalyzer` | `DevShelf: Open Log File Analyzer & Highlighter` | Command Palette |
| `devshelf.openMockServer` | `DevShelf: Open Mock Server & Webhook Catcher` | Command Palette |
| `devshelf.openTunnel` | `DevShelf: Open Public Tunnel & QR Share` | Command Palette |
| `devshelf.openSystemMonitor` | `DevShelf: Open System Resource Monitor & Zombie Killer` | Command Palette |
| `devshelf.openLoadTester` | `DevShelf: Open Mini Load Tester & API Stress Benchmarker` | Command Palette |
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
│   ├── commit-icon-dark.svg     # SCM commit toolbar icon (dark themes)
│   ├── commit-icon-light.svg    # SCM commit toolbar icon (light themes)
│   ├── commit-icon.svg          # SCM commit toolbar icon
│   └── devshelf-icon.svg        # Activity Bar icon
├── src/
│   ├── extension.ts             # Host entry point, commands & SCM commit hook
│   ├── providers/
│   │   └── SidebarProvider.ts   # WebviewViewProvider with strict CSP
│   ├── services/
│   │   ├── dnsRadarService.ts      # DNS benchmarker, anti-sanction tester & traceroute engine
│   │   ├── codeSnapshotService.ts  # Editor code extractor & PNG image saver
│   │   ├── commandCenterService.ts # Multi-ecosystem task discovery & terminal runner
│   │   ├── cacheCleanerService.ts  # Directory size calculator & cache purger
│   │   └── mobilePreviewPanel.ts   # Responsive multi-device simulator WebviewPanel
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
│   │   ├── sqlBuilder.ts        # SQL DDL dialect generator & sample query builder
│   │   ├── logAnalyzer.ts       # Log parser, level classifier & error report exporter
│   │   ├── mockServerService.ts # Embedded HTTP server & webhook interceptor
│   │   ├── tunnelService.ts     # Cloudflare/Localtunnel/Ngrok child process manager
│   │   ├── qrCode.ts            # Pure-TS zero-dependency QR matrix & SVG generator
│   │   ├── systemMonitorService.ts # Hardware telemetry & process tree killer
│   │   ├── loadTesterService.ts # Async HTTP load engine, worker pool & percentiles
│   │   └── cryptoMock.ts        # UUID, ULID, secrets, hashes & Iranian mock data
│   └── webview/
│       ├── main.ts              # Webview state coordinator & message dispatcher
│       ├── i18n.ts              # Full English & Persian dictionary (19 tools)
│       ├── icons.ts             # Clean inline SVG Codicons
│       ├── styles.css           # Native VS Code CSS variables with RTL support
│       └── components/          # Modular component views
├── test/
│   ├── testRunner.ts            # 25 comprehensive unit test suites
│   └── mockVscode.ts            # VS Code API mock for standalone test runner
├── esbuild.js                   # Fast bundler config
├── package.json                 # Extension manifest & contributions (v1.6.0)
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
