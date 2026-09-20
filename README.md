# Teleprompter Web App

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI Tests](https://github.com/ghajba/teleprompter/actions/workflows/ci.yml/badge.svg)](https://github.com/ghajba/teleprompter/actions/workflows/ci.yml)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink.svg)](https://github.com/sponsors/ghajba)
[![PWA](https://img.shields.io/badge/PWA-Ready-success.svg)](manifest.webmanifest)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)](#architecture)
[![Performance](https://img.shields.io/badge/Scrolling-60%2B%20FPS-orange.svg)](#performance)

A lightweight, privacy-focused, zero-dependency browser-based teleprompter designed for silky smooth 60+ FPS scrolling, offline PWA capability, and flexible presentation workflows.

[🌐 Live Demo (GitHub Pages)](https://ghajba.github.io/teleprompter/)

---

## ✨ Features

### 🚀 Phase 1: Core Prompter & PWA (MVP)
- **Fluid 60+ FPS Scrolling:** Sub-pixel precision scrolling driven by `requestAnimationFrame` and GPU-accelerated CSS transforms (`translateY`) to eliminate jitter and stutter.
- **Collapsible Control Drawer:** Translucent, always-accessible sidebar to adjust settings and edit text without leaving the reading canvas.
- **Physical Prompter Mirroring:** Instant horizontal flip (`scaleX(-1)`) for beam-splitter prompter glass rigs.
- **Visual Eyeline Guide:** Adjustable horizontal focus bar with side markers to keep speech aligned with the camera lens.
- **Customizable Typography & Theme:** 
  - Dynamic font sizing and reading column margins (reduces eye travel fatigue).
  - High-contrast color palettes (Dark, Light, Amber on Black, High-Contrast Green).
  - Built-in, offline-friendly system font families (Sans-serif, Serif, Monospace).
- **Auto-Save Persistence:** Seamless automatic saving of script and configuration to browser `localStorage` — no data ever leaves your device.
- **Keyboard Shortcuts:** Ergonomic, quick controls for play/pause, speed increment, screen reset, and fullscreen toggle.
- **Offline-First PWA:** Zero external CDN dependencies. Fully functional offline and installable to desktop or mobile via Service Worker caching (`Cache-First`).

### 🔮 Upcoming Roadmap
- **Phase 1.2:** Countdown timer (3-2-1 prep), WPM calculator & remaining time estimation, bidirectional rewind, and visual progress bar.
- **Phase 2 (Media Recording):** Browser-native webcam & audio recording via `MediaRecorder`, PiP preview under text, and instant local `.webm`/`.mp4` download.
- **Phase 3 (Cloud Storage & Sync):** Direct pre-signed PUT uploads to Cloudflare R2 / AWS S3 with zero egress fees, plus Bring-Your-Own-Storage (BYOS) support.
- **Phase 4 (Smart Controls):** Bluetooth presentation clicker integration, WebRTC QR-paired mobile phone remote control, and Web Speech API auto-following.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Space` | **Play / Pause** | Toggle prompter scrolling |
| `Arrow Up` / `]` | **Speed +** | Increase scroll speed |
| `Arrow Down` / `[` | **Speed -** | Decrease scroll speed |
| `Home` / `R` | **Reset** | Rewind text to the beginning |
| `F` | **Fullscreen** | Enter / exit browser fullscreen |
| `Esc` | **Close Drawer** | Collapse control sidebar if open |

---

## 🏗️ Architecture & Tech Stack

This project is intentionally designed with **zero runtime dependencies** and **zero build tooling**:

```
d:/dev/teleprompter/
├── index.html                 # Semantic single-page application entry
├── manifest.webmanifest       # PWA metadata for installation
├── sw.js                      # Cache-First Service Worker for 100% offline usage
├── icons/                     # Application icons (PWA & Favicon)
├── css/
│   ├── main.css               # Reset, typography tokens, base layout
│   ├── prompter.css           # Prompter viewport, transforms, eyeline guide
│   └── sidebar.css            # Floating collapsible drawer styles
└── js/
    ├── app.js                 # Application bootstrap & lifecycle
    ├── state.js               # Reactive pub/sub state manager
    ├── scroller.js            # requestAnimationFrame sub-pixel scroll engine
    ├── controls.js            # Keyboard & mouse event listeners
    ├── storage.js             # LocalStorage persistence wrapper
    └── ui/
        ├── drawer.js          # Sidebar toggle & form bindings
        ├── typography.js      # Font, color, and margin controllers
        └── eyeline.js         # Eyeline guide positioner
```

- **Languages:** HTML5, Modern Modular CSS3 (CSS Custom Properties & Flex/Grid), Vanilla ES6+ JavaScript modules.
- **No Bundler Required:** Runs natively in any modern browser without Webpack, Vite, or Babel.
- **Storage:** HTML5 `localStorage` API.
- **Hosting:** GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).

---

## 🚦 Getting Started

### Option 1: Live Web App
Open the deployed application directly in your browser:  
👉 **[https://ghajba.github.io/teleprompter/](https://ghajba.github.io/teleprompter/)**

### Option 2: Local Development
Because there are no build steps or dependencies:

1. Clone the repository:
   ```bash
   git clone https://github.com/ghajba/teleprompter.git
   cd teleprompter
   ```
2. Serve locally with any static web server (required for ES6 modules and Service Workers):
   ```bash
   # Using Python 3
   python -m http.server 8080

   # Or using Node.js (npx)
   npx serve .
   ```
3. Open `http://localhost:8080` in Chrome, Edge, Firefox, or Safari.

---

## 🧪 Testing & CI

Automated continuous integration is powered by **GitHub Actions** (`.github/workflows/ci.yml`). Every commit and pull request runs:
- StateStore & Storage unit tests (Pub/Sub verification, localStorage serialization, fallback behavior)
- JavaScript syntax and ES module import integrity verification across multiple Node.js environments.

Run tests locally:
```bash
npm test
```

---

## 💖 Support the Developer

If you find this free, privacy-friendly, zero-tracking teleprompter useful for your video shoots, presentations, or live streams, consider sponsoring its ongoing open-source development:

👉 **[Sponsor @ghajba on GitHub Sponsors](https://github.com/sponsors/ghajba)**

Your support helps keep this tool 100% free, ad-free, and continuously improved!

---

## 🔒 Privacy & Offline Guarantee

- **Zero Telemetry:** No tracking, no analytics, no external third-party requests.
- **Local Data Only:** Your presentation scripts and settings remain strictly inside your browser's local sandbox.
- **Offline Ready:** Once loaded, you can disconnect Wi-Fi or turn on Airplane Mode; the app will start and run flawlessly.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 Gábor László Hajba.
