# Changelog

All notable changes to the Teleprompter Web App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.3] - 2026-09-20

### Added
- **Interactive Welcome & Onboarding Modal:** Glassmorphism onboarding dialog presenting the 4 core product advantages (60+ FPS fluid motion, 100% offline & private, physical glass mirroring, PWA & adaptive controls) with quick navigation preview.
- **"Don't Show Again" Persistence:** Users can check `Don't show this welcome on startup` to suppress the modal on future visits (persisted in `localStorage`).
- **Reopen Welcome Guide anytime:** Added a "📖 View Welcome & Benefits Guide" button in the Settings Drawer to easily reopen the onboarding guide.
- **Enriched Demo Presentation Script:** Updated the default starter text into a realistic presentation speech highlighting product features and universal controls.
- **Restore Demo Script Button:** Added a "📝 Restore Demo Script" button in the Drawer to quickly reload the sample presentation text.
- **Device-Adaptive Controls Guide:** Added dual tabs in the Settings Drawer and Welcome Modal (`👆 Touch & Gestures` vs. `⌨️ Keyboard Shortcuts`), auto-selecting based on detected pointer capability (`isTouchDevice`).
- **Floating Mobile Touch Controls Bar:** Discreet on-screen floating control bar (`[⏪ Reset] [⏯ Play/Pause] [➖ Speed] [➕ Speed]`) designed for touchscreens, with auto-dimming during playback and a "Show On-Screen Touch Controls" toggle in Settings.
- **Adaptive Countdown Cancel Text:** Updated countdown overlay guidance to *"Get Ready... Tap screen or press Space to cancel"*.

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
