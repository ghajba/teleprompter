# Changelog

All notable changes to the Teleprompter Web App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.2] - 2026-09-20

### Added
- **Mouse Wheel & Trackpad Scrolling:** Enabled smooth manual scrolling using the mouse wheel or laptop touchpad directly on the prompter canvas.
- **Touch Drag Gestures:** Added touchscreen drag-to-scroll support for mobile phones and tablets.
- **Transparent Countdown Script Preview:** Added a "Show Script During Countdown" toggle (enabled by default). The script text remains completely sharp and readable during the 3-2-1 countdown overlay so speakers can prepare and read ahead.
- **Project Changelog:** Added `CHANGELOG.md` following the Keep a Changelog standard.

### Fixed
- **End-of-Script Boundary Calculation:** Fixed `_maxScrollY` calculation based on true text content height so scripts are no longer prematurely cut off before reaching the final lines.
- **Unstartable End State:** Fixed a bug where reaching the end of the text left playback frozen in a paused state. Pressing Play or Space at the end now gracefully resets to the top and starts playback smoothly.
- **WPM & Remaining Time Calculation:** Aligned remaining time countdown and WPM metrics with actual rendered script dimensions.

---

## [1.0.0-rc.1] - 2026-09-20

### Added
- **Core 60+ FPS Scroll Engine:** Sub-pixel precision scrolling driven by `requestAnimationFrame` and GPU-accelerated CSS `translateY` transforms.
- **Collapsible Control Drawer:** Translucent sidebar for on-the-fly script editing and settings without interrupting reading.
- **Physical Prompter Mirroring:** Horizontal flip mode (`scaleX(-1)`) for beam-splitter glass rigs.
- **Visual Eyeline Guide:** Adjustable horizontal focus guide with left/right directional markers and subtle reading band.
- **Typography & Layout Customization:** Dynamic font size, reading column width, contrast palettes (Dark, Light, Amber, Green), and system font families.
- **Auto-Save Persistence:** Safe `localStorage` integration with debouncing.
- **Pro Timing Aids:**
  - 3-2-1 countdown timer with cancel support.
  - Real-time remaining time and dynamic WPM calculation in Heads-Up Display (HUD).
  - Reading progress bar along the top screen border.
  - Bidirectional scrolling (`B` key, reverse mode toggle, step rewind).
- **Offline-First PWA:**
  - Cache-First Service Worker (`sw.js`).
  - Web App Manifest & vector application icon (`icons/icon.svg`).
  - Desktop & mobile installable (`beforeinstallprompt` support).
- **Automated CI/CD & Testing:**
  - GitHub Actions matrix CI workflow (Node.js 20.x and 22.x).
  - Automated deployment to GitHub Pages on pushes to `main`.
  - Node.js test suite for reactive state store and storage layers.
- **GitHub Community Standards:**
  - MIT License (`LICENSE`).
  - GitHub Sponsors configuration (`.github/FUNDING.yml`).
  - Comprehensive documentation (`README.md`).
