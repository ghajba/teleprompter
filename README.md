# Teleprompter Web App

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI Tests](https://github.com/ghajba/teleprompter/actions/workflows/ci.yml/badge.svg)](https://github.com/ghajba/teleprompter/actions/workflows/ci.yml)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink.svg)](https://github.com/sponsors/ghajba)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](manifest.webmanifest)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)](#-architecture--tech-stack)
[![Performance](https://img.shields.io/badge/Scrolling-60%2B%20FPS-orange.svg)](#-features)

A lightweight, privacy-focused, zero-dependency browser teleprompter engineered for silky smooth 60+ FPS scrolling, offline PWA execution, hands-free voice following, and wireless remote control.

[🌐 Open Live App (GitHub Pages)](https://ghajba.github.io/teleprompter/)

---

## ✨ Features

### 🚀 Core Prompter Experience & PWA
- **Silky Smooth 60+ FPS Scrolling:** Sub-pixel precision scrolling powered by `requestAnimationFrame` and GPU-accelerated CSS `translateY` transforms to eliminate micro-stutter.
- **Human-Centric WPM Pacing:** Real-time Words Per Minute (WPM) speed indicator with qualitative speech cadence labels (*Slow*, *Conversational*, *Lively*, *Rapid*, *Auctioneer*).
- **Presenter Heads-Up Display (HUD):** Non-intrusive floating HUD displaying status indicator, live WPM, elapsed timer, estimated remaining reading time, and installed app version badge. Responsive design automatically adapts for mobile screens.
- **3-2-1 Countdown Preparation:** Gentle countdown overlay giving presenters time to breathe and focus before scrolling begins; dismissible instantly via tap or keypress.
- **Physical Prompter Mirroring:** 1-click horizontal flip (`scaleX(-1)`) designed specifically for professional beam-splitter glass rigs.
- **Visual Eyeline Guide:** Draggable focus line with lateral guide markers to keep the presenter's gaze locked to the camera lens.
- **Adaptive Responsive Typography:**
  - Dynamic font sizing (adaptive 44px default on mobile devices to prevent excessive line wrapping).
  - Configurable reading column width and viewport margins to reduce eye travel fatigue.
  - High-contrast color themes: *Dark (Default)*, *Light*, *Amber on Black*, and *High-Contrast Green*.
  - Built-in, offline-friendly system font families (*Sans-serif*, *Serif*, *Monospace*).
- **Rich Markdown Formatting & Stage Cues:**
  - Instant live formatting for headings, bold, italic, and bullet lists.
  - Distinctive stage direction cue blocks (e.g. `[Pause 2s]`, `[Smile]`, `[Transition]`).
  - Visual pause bars created with standard markdown dividers (`---`).
- **Offline-First PWA:**
  - 100% self-hosted assets cached via a Cache-First Service Worker (`sw.js`).
  - Installable as a standalone app on iOS, Android, macOS, Windows, and Linux.
  - Fully functional in Airplane Mode or without internet connectivity.

### 🎙️ Phase 2: Smart Presentation & Remote Tools
- **Reading Highlight Focus Modes:**
  - **Dim Non-Focused Lines:** Subtly dims previous and upcoming lines, spotlighting the exact sentence currently being read.
  - **Accent Bar:** Displays a clean, high-contrast lateral accent indicator aligned with the active reading point.
- **Native Multilingual Voice Follow:**
  - Hands-free auto-scrolling powered by the browser's native Web Speech API (`SpeechRecognition`).
  - Intelligent sliding-window fuzzy token alignment resilient to natural speech pauses, repetitions, and filler words.
  - **Multilingual Support:** Automatic language detection (`auto`), Hungarian (`hu-HU`), German (`de-DE` with full Eszett `ß` and umlaut normalization), and English (`en-US`).
  - **100% Private & Free:** Runs entirely locally within the browser; zero audio sent to cloud transcription APIs.
- **Wireless Companion Remote Control:**
  - Dedicated mobile remote web app (`remote.html`) with oversized tactile controls for phones and secondary displays.
  - Instant QR code pairing via an embedded, pure JavaScript SVG QR code generator (`js/qrcode.js`) — no external QR APIs.
  - Real-time bidirectional synchronization: Play/Pause, speed adjustment, rewind/advance, screen reset, and live WPM/timer updates via `BroadcastChannel`.

### 🔮 Roadmap & Upcoming Features
- **Phase 3 (Media Recording):** Browser-native webcam & audio recording via `MediaRecorder`, Picture-in-Picture presenter preview, and direct `.webm`/`.mp4` download.
- **Phase 4 (Post-Production):** Optional video watermarking and automated timed subtitle track generation (`.srt` / WebVTT).

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| `Space` | **Play / Pause** | Toggle scrolling on/off (or start countdown) |
| `Arrow Up` / `]` | **Speed +** | Increase reading speed (+5 WPM) |
| `Arrow Down` / `[` | **Speed -** | Decrease reading speed (-5 WPM) |
| `Home` / `R` | **Reset** | Rewind script to the beginning |
| `F` | **Fullscreen** | Toggle full-screen presentation mode |
| `Esc` | **Close Drawer** | Dismiss control drawer or active modal |

---

## 🏗️ Architecture & Tech Stack

This project strictly adheres to a **zero runtime dependency** and **zero build tooling** philosophy. It runs natively in any standard web browser.

```
teleprompter/
├── index.html                 # Primary prompter view & presenter HUD
├── remote.html                # Wireless companion remote controller
├── manifest.webmanifest       # PWA metadata & installation manifest
├── sw.js                      # Cache-First Service Worker for 100% offline usage
├── icons/                     # Application icons (SVG PWA & Favicon)
├── css/
│   ├── main.css               # Design tokens, typography, dark/light color themes
│   ├── prompter.css           # Prompter viewport, transforms, eyeline guide, HUD
│   ├── sidebar.css            # Collapsible control drawer & responsive styling
│   └── remote.css             # Tactile mobile remote controller interface
├── js/
│   ├── app.js                 # Application bootstrap & lifecycle coordinator
│   ├── state.js               # Reactive pub/sub state manager
│   ├── scroller.js            # requestAnimationFrame scroll engine & WPM calculations
│   ├── controls.js            # Keyboard, touch & mouse event dispatchers
│   ├── storage.js             # Fault-tolerant LocalStorage persistence wrapper
│   ├── markdown.js            # Offline markdown parser with stage directions & pause bars
│   ├── highlight.js           # Reading highlight controller (dim & accent focus modes)
│   ├── speech.js              # Web Speech API voice follow engine (de-DE, hu-HU, en-US)
│   ├── qrcode.js              # Pure JavaScript SVG QR code generator
│   ├── remote.js              # Host-side remote pairing & BroadcastChannel coordinator
│   ├── remote-client.js       # Client-side companion remote controller logic
│   ├── version.js             # Semantic application version registry
│   └── ui/
│       ├── drawer.js          # Sidebar toggle, QR pairing modal & control bindings
│       └── welcome.js         # First-run onboarding guide & sample scripts
└── tests/
    ├── compliance.test.mjs    # Zero-dependency, zero-CDN & privacy guarantee tests
    ├── dom-contract.test.mjs  # JS DOM query integrity vs HTML elements contract
    ├── state.test.mjs         # Pub/Sub store & responsive state assertions
    ├── storage.test.mjs       # Storage resilience, error recovery & debouncing
    ├── scroller.test.mjs      # WPM calculation & sub-pixel scroll positioning
    ├── markdown.test.mjs      # Markdown formatting & XSS sanitization
    ├── highlight.test.mjs     # Reading highlight modes & focus tracking
    ├── speech.test.mjs        # Multilingual normalization, German & sliding window
    └── remote.test.mjs        # Remote control messaging protocol & state sync
```

- **Runtime Dependencies:** `0`
- **Build Tools Required:** `0` (Native ES6+ modules, CSS custom properties)
- **External Network Calls:** `0` (No external fonts, no CDN scripts, no tracking)
- **Hosting:** GitHub Pages via automated workflow (`.github/workflows/deploy.yml`)

---

## 🚦 Getting Started

### Option 1: Live Web App
Access the deployed application directly in any modern browser:  
👉 **[https://ghajba.github.io/teleprompter/](https://ghajba.github.io/teleprompter/)**

### Option 2: Local Development
Because there are no build steps or compile stages:

1. Clone the repository:
   ```bash
   git clone https://github.com/ghajba/teleprompter.git
   cd teleprompter
   ```
2. Start any local static HTTP server (required for ES6 module imports and Service Workers):
   ```bash
   # Using Node.js (via package.json script)
   npm run serve

   # Or using Python 3
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in Chrome, Edge, Safari, or Firefox.

---

## 🧪 Testing & Quality Assurance

The codebase includes a comprehensive, multi-layer automated test suite executed with Node.js built-in test primitives:

```bash
npm test
```

### Test Coverage Highlights:
1. **Architectural Compliance & Privacy Contract (`compliance.test.mjs`):** Enforces 0 runtime dependencies, 0 external CDN scripts, 0 telemetry/analytics signatures, PWA manifest validity, and 100% Service Worker precached asset presence on disk.
2. **DOM Element Integrity Contract (`dom-contract.test.mjs`):** Validates that 100% of DOM element queries in JavaScript match actual elements defined in `index.html` and `remote.html`.
3. **Reactive State & Adaptability (`state.test.mjs`):** Tests state subscriptions, countdown lifecycle, and mobile-adaptive typography defaults.
4. **Storage Resilience (`storage.test.mjs`):** Tests QuotaExceededError handling, corrupted JSON fallback, and debounced save operations.
5. **Scroller & Pace Calculations (`scroller.test.mjs`):** Verifies sub-pixel scrolling math, WPM conversion, and time estimation.
6. **Markdown Engine & Security (`markdown.test.mjs`):** Tests XSS prevention, stage direction cues, break bars, and empty paragraph spacing.
7. **Reading Highlight Focus (`highlight.test.mjs`):** Verifies dimming and accent modes across scrolling lines.
8. **Speech Follow & Multilingual Alignment (`speech.test.mjs`):** Validates accent stripping, German Eszett (`ß`) & umlauts, language detection (`de-DE`, `hu-HU`, `en-US`), and sliding-window token matching.
9. **Remote Control Messaging Protocol (`remote.test.mjs`):** Tests bidirectional messaging schemas, commands, and host state synchronization.

---

## 🔒 Privacy & Offline Guarantee

- **Zero Telemetry:** No Google Analytics, no tracking pixels, no telemetry beacons, no cookies.
- **Local Data Isolation:** Scripts and settings remain strictly inside your browser's local sandbox (`localStorage`).
- **Offline Ready:** Operates seamlessly without internet access once installed or cached.

---

## 💖 Support the Developer

If you find this free, privacy-first teleprompter helpful for your video productions, presentations, or live streams, consider supporting its open-source development:

👉 **[Sponsor @ghajba on GitHub Sponsors](https://github.com/sponsors/ghajba)**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 Gábor László Hajba.
