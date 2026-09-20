# Changelog

All notable changes to the Teleprompter Web App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.5] - 2026-09-20

### Added
- **Mobile Pull-to-Refresh Gesture & Visual Banner:** Swiping downwards when at the top of the teleprompter now triggers a dedicated Pull-to-Refresh banner (`↓ Pull down to refresh` &rarr; `🔄 Release to refresh`) rather than erroneously capturing the gesture as upward prompter scrolling. Releasing past threshold automatically refreshes the application.
- **In-App Reload & Check for Updates Button:** Added a `🔄 Reload App • Check Updates` button in the Settings drawer footer that queries the Service Worker for newly deployed builds and immediately reloads the assets.
- **Automatic Live PWA Version Updates:** Added a `controllerchange` lifecycle listener to reload the active page automatically when a newly activated Service Worker takes control.

### Fixed
- **Countdown Overlay Click/Tap to Cancel on Mobile:** Resolved a race condition where cancelling the countdown on mobile touch could leak synthetic click events and inadvertently restart the countdown. Cancellation is now handled smoothly on touch release with `preventDefault()` and an 800ms debounce protection window.
- **Downward Swipe at Top No Longer Scrolls:** Prevented downward touch drags from being intercepted as teleprompter scrolling when the script is already at `scrollY = 0`.
- **Universal Cancellation Handlers:** Clicking or tapping anywhere on the screen, pressing <kbd>Space</kbd>, or pressing <kbd>Escape</kbd> immediately cancels the countdown and returns to the ready state.
- **Contextual UI Indicators:** Updated the floating touch control bar (`⏹`) and Settings drawer button (`⏹ Cancel`) to dynamically display stop/cancel states during an active countdown.

---

## [1.0.0-rc.4] - 2026-09-20

### Added
- **Native Zero-Dependency Markdown Rendering:** Prompter text is rendered with rich Markdown typography, including section headings (`#`, `##`, `###`), bold spoken emphasis (`**bold**`), italics (`*italic*`), strikethrough, and bullet/numbered lists.
- **Stage Directions & Actor Cues:** Bracketed cues (e.g. `[Pause 2s]`, `[Look at camera 2]`) are automatically rendered as discrete visual cue badges (`🎬 Cue`), styled to indicate they are presentation directions not to be spoken aloud.
- **Visual Scene Breaks & Pause Bars:** Three or more dashes (`---`) create a prominent `[⏸ PAUSE / BREAK]` separator bar.
- **Markdown Formatting Guide:** Added an interactive, collapsible cheatsheet (`✨ Markdown Guide`) directly above the script textarea in the Drawer.
- **Render Markdown Toggle:** Added a "Render Markdown Formatting" switch in Settings (*Display & Typography*) allowing users to switch between formatted and plain raw text.
- **File Drag & Drop Import:** Users can drag and drop `.txt` and `.md` script files directly onto the teleprompter window to load scripts instantly.
- **Global Clipboard Paste:** Pressing <kbd>Ctrl</kbd> + <kbd>V</kbd> anywhere on the prompter canvas opens the settings drawer and loads the clipboard script.
- **Markdown-Sanitized Speech Timing:** The word counting engine strips Markdown tokens and stage directions so spoken WPM and estimated durations remain 100% accurate.

### Fixed
- **Placeholder & Instructions Wording:** Replaced ambiguous "paste here" text with clear instructions directing users to the `⚙️ Settings & Script` drawer. Updated textarea placeholder to indicate Markdown support.

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
