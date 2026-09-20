# Changelog

All notable changes to the Teleprompter Web App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-20

### General Availability (v1.0 Milestone)
This marks the official **v1.0.0 General Availability** release of the Teleprompter Web App! A lightweight, 100% offline-first, zero-dependency browser teleprompter engineered for professional creators, presenters, and video production workflows.

#### Core Capabilities & Highlights:
- **⚡ 60+ FPS Fluid Motion Engine:** Hardware-accelerated sub-pixel scrolling powered by `requestAnimationFrame` and GPU transforms for jitter-free reading.
- **🗣️ Presenter Reading Speed (WPM):** Presenter pace calibrated in Words Per Minute (`60 - 250 WPM`, default `130 WPM`), real-time speech duration estimates, and qualitative speaking pace indicators.
- **🔒 100% Offline-First & Private:** Zero third-party trackers, zero server dependencies, and fully functional offline via Service Worker precaching. All scripts stay private in local storage.
- **📝 Native Zero-Dependency Markdown:** Rich typography rendering for section headings, bold spoken emphasis, tone hints, visual break bars (`---`), and non-spoken stage direction cues (`[Pause 2s]`).
- **🪞 Physical Glass Mirroring:** Reflection flip mode designed for professional beam-splitter glass teleprompter rigs.
- **📱 PWA & Adaptive Controls:** Installable Progressive Web App with touch gestures, floating on-screen mobile controls, keyboard shortcuts, and mobile-calibrated font scaling (44px default).
- **⏱️ Clean Countdown & Eyeline Guide:** Visual reading anchor line, configurable countdown timer with instant tap-to-cancel protection.
- **🔍 In-App Version Visibility:** Live status badges on canvas watermark, HUD, and settings drawer.

---

## [1.0.0-rc.7] - 2026-09-20

### Fixed
- **Markdown Cheatsheet Layout & Truncation:** Redesigned the "✨ Markdown Formatting Guide" from a cramped 2-column grid into a clean, legible single-column layout:
  - Eliminated awkward mid-tag line breaks inside code blocks (e.g. `## Section` and `[Pause 2s]`) with `white-space: nowrap;` and dedicated minimum widths.
  - Removed ellipsis truncation on longer descriptions (`white-space: normal; overflow: visible;`), allowing explanations like "Stage Direction / Cue (Not spoken aloud)" to be read completely without being cut off.
  - Added responsive `max-height: 260px` with custom slim scrolling to maintain clean ergonomics on landscape mobile screens.
  - Refined description wording and improved contrast across cheatsheet items.

---

## [1.0.0-rc.6] - 2026-09-20

### Added
- **Global In-App Version Visibility:** Displayed active application version (`v1.0.0-rc.6`) prominently across the interface so users can instantly verify after updates or page reloads that the latest build has loaded:
  - **Canvas Watermark:** Subtle, non-intrusive status pill in the bottom-left corner with live status dot (`🟢 v1.0.0-rc.6`), automatically dimming during teleprompter playback to prevent distraction during filming.
  - **Heads-Up Display (HUD):** Version badge in the top-left status bar next to reading pace metrics.
  - **Settings Drawer Header:** Version pill positioned directly next to the drawer title and `🔄 Refresh` button.
  - **Settings Drawer Footer:** Version tag linking to latest release notes.
  - **Welcome Modal Badge:** Displays version in the onboarding header badge.
- **Single Source of Truth (`js/version.js`):** Exported `APP_VERSION` constant dynamically stamping all `.app-version-text` elements in the DOM, with automated SemVer test verification.

---

## [1.0.0-rc.5] - 2026-09-20

### Added
- **Human-Friendly Reading Speed (Words Per Minute / WPM):** Replaced technical `pixels per second (px/s)` with standard presenter WPM (`60 - 250 WPM`, default `130 WPM`). Displays qualitative pace labels (*Conversational*, *Slow & Clear*, *Brisk*, *Fast*) and dynamically estimated total speech duration (e.g. `~3m 20s total`). The scroll engine automatically calculates exact hardware sub-pixel scroll velocities calibrated to actual script word density and typography.
- **HUD Speaking Pace:** Replaced raw `px/s` in the Heads-Up Display with active WPM and spoken pace indicator (`130 WPM` &bull; `🗣️ Conversational`).
- **Unmissable Refresh Controls:** Added a direct `🔄 Refresh` button in the Drawer Header and in the Quick Action buttons grid, in addition to the footer button, allowing users to reload and fetch updates immediately without scrolling.
- **Mobile Pull-to-Refresh & Native Overscroll:** Enabled native browser pull-to-refresh on mobile by setting `overscroll-behavior-y: auto;` and preventing `preventDefault()` on downward swipes at the top of the script.
- **Mobile-Calibrated 44px Starting Font Size:** On touch and mobile screens (viewport &le; 768px), the initial font size defaults to 44px instead of desktop 48px, preventing oversized text on smartphone screens. Settings reset dynamically restores 44px on mobile and 48px on desktop, while automatically migrating previous 70px/48px caches on mobile devices.
- **Automatic Live PWA Version Updates:** Added a `controllerchange` lifecycle listener to reload the active page automatically when a newly activated Service Worker takes control.

### Fixed
- **Stop Button Restart Bug:** Fixed a race condition where tapping the on-screen `⏹` Stop button or drawer `⏹ Cancel` button dismissed the countdown on `touchend` and then immediately processed a synthetic `click` on the play button, restarting the countdown. Added an 800ms protection guard in `toggle()` and `play()`.
- **Countdown Overlay Click/Tap to Cancel on Mobile:** Tapping anywhere on the screen during countdown cancels the timer cleanly without leaking synthetic click events.
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
