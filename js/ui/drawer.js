/**
 * Settings & Script Drawer UI Controller.
 * Handles DOM two-way binding with reactive StateStore.
 */

import { store, WELCOME_DEMO_SCRIPT } from '../state.js';
import { scroller, getPaceDescription } from '../scroller.js';
import { stripMarkdown } from '../markdown.js';

export class DrawerController {
  constructor() {
    this._drawerEl = document.getElementById('drawer');
    this._toggleBtn = document.getElementById('drawerToggle');
    this._closeBtn = document.getElementById('drawerClose');
    this._btnHeaderRefresh = document.getElementById('btnHeaderRefresh');
    this._btnDrawerRefresh = document.getElementById('btnDrawerRefresh');

    // Form inputs
    this._scriptInput = document.getElementById('scriptInput');
    this._wordCountEl = document.getElementById('wordCount');
    this._charCountEl = document.getElementById('charCount');

    // Markdown Help elements
    this._btnToggleMarkdownHelp = document.getElementById('btnToggleMarkdownHelp');
    this._btnCloseMarkdownHelp = document.getElementById('btnCloseMarkdownHelp');
    this._markdownHelpBox = document.getElementById('markdownHelpBox');
    this._renderMarkdownToggle = document.getElementById('renderMarkdownToggle');

    this._speedSlider = document.getElementById('speedSlider');
    this._speedValue = document.getElementById('speedValue');
    this._speedTotalTime = document.getElementById('speedTotalTime');

    this._fontSizeSlider = document.getElementById('fontSizeSlider');
    this._fontSizeValue = document.getElementById('fontSizeValue');

    this._marginSlider = document.getElementById('marginSlider');
    this._marginValue = document.getElementById('marginValue');

    this._eyelineSlider = document.getElementById('eyelineSlider');
    this._eyelineValue = document.getElementById('eyelineValue');

    this._mirrorToggle = document.getElementById('mirrorToggle');
    this._fontFamilySelect = document.getElementById('fontFamilySelect');

    // Control buttons
    this._btnPlayPause = document.getElementById('btnPlayPause');
    this._btnReset = document.getElementById('btnReset');
    this._btnFullscreen = document.getElementById('btnFullscreen');
    this._btnRewind = document.getElementById('btnRewind');
    this._btnRestoreDemo = document.getElementById('btnRestoreDemo');

    // Timing & Direction inputs
    this._countdownSelect = document.getElementById('countdownSelect');
    this._countdownShowScriptToggle = document.getElementById('countdownShowScriptToggle');
    this._progressBarToggle = document.getElementById('progressBarToggle');
    this._touchControlsToggle = document.getElementById('touchControlsToggle');
    this._reverseToggle = document.getElementById('reverseToggle');

    // Guide & Help elements
    this._btnOpenWelcomeGuide = document.getElementById('btnOpenWelcomeGuide');
    this._drawerTabTouch = document.getElementById('drawerTabTouch');
    this._drawerTabKeyboard = document.getElementById('drawerTabKeyboard');
    this._drawerPanelTouch = document.getElementById('drawerPanelTouch');
    this._drawerPanelKeyboard = document.getElementById('drawerPanelKeyboard');

    this._isOpen = false;
    this._onOpenWelcome = null;
  }

  init(controlsManager, onOpenWelcome) {
    this._controls = controlsManager;
    this._onOpenWelcome = onOpenWelcome;

    // Toggle drawer event listeners
    if (this._toggleBtn) {
      this._toggleBtn.addEventListener('click', () => this.toggle());
    }
    if (this._closeBtn) {
      this._closeBtn.addEventListener('click', () => this.close());
    }

    const handleAppRefresh = async () => {
      if (this._btnHeaderRefresh) this._btnHeaderRefresh.textContent = '🔄 Updating...';
      if (this._btnDrawerRefresh) this._btnDrawerRefresh.textContent = '🔄 Updating...';
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
          }
        } catch (err) {
          console.warn('[PWA] Refresh check failed:', err);
        }
      }
      window.location.reload();
    };

    if (this._btnHeaderRefresh) {
      this._btnHeaderRefresh.addEventListener('click', handleAppRefresh);
    }
    if (this._btnDrawerRefresh) {
      this._btnDrawerRefresh.addEventListener('click', handleAppRefresh);
    }

    // Guide tabs
    if (this._drawerTabTouch && this._drawerTabKeyboard) {
      this._drawerTabTouch.addEventListener('click', () => this.selectGuideTab('touch'));
      this._drawerTabKeyboard.addEventListener('click', () => this.selectGuideTab('keyboard'));
    }

    const isTouch = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    this.selectGuideTab(isTouch ? 'touch' : 'keyboard');

    if (this._btnOpenWelcomeGuide) {
      this._btnOpenWelcomeGuide.addEventListener('click', () => {
        this.close();
        if (this._onOpenWelcome) this._onOpenWelcome();
      });
    }

    // Markdown help cheatsheet toggle
    if (this._btnToggleMarkdownHelp && this._markdownHelpBox) {
      this._btnToggleMarkdownHelp.addEventListener('click', () => {
        this._markdownHelpBox.classList.toggle('hidden');
      });
    }
    if (this._btnCloseMarkdownHelp && this._markdownHelpBox) {
      this._btnCloseMarkdownHelp.addEventListener('click', () => {
        this._markdownHelpBox.classList.add('hidden');
      });
    }

    // Bind inputs to store
    this._bindFormInputs();

    // Subscribe to store updates to keep drawer UI in sync
    store.subscribe((state, changedKeys) => {
      this._syncFromStore(state, changedKeys);
    });

    // Initial sync
    this._syncFromStore(store.getState(), Object.keys(store.getState()));
  }

  selectGuideTab(tab) {
    if (tab === 'touch') {
      if (this._drawerTabTouch) this._drawerTabTouch.classList.add('active');
      if (this._drawerTabKeyboard) this._drawerTabKeyboard.classList.remove('active');
      if (this._drawerPanelTouch) this._drawerPanelTouch.classList.remove('hidden');
      if (this._drawerPanelKeyboard) this._drawerPanelKeyboard.classList.add('hidden');
    } else {
      if (this._drawerTabTouch) this._drawerTabTouch.classList.remove('active');
      if (this._drawerTabKeyboard) this._drawerTabKeyboard.classList.add('active');
      if (this._drawerPanelTouch) this._drawerPanelTouch.classList.add('hidden');
      if (this._drawerPanelKeyboard) this._drawerPanelKeyboard.classList.remove('hidden');
    }
  }

  isOpen() {
    return this._isOpen;
  }

  open() {
    this._isOpen = true;
    if (this._drawerEl) this._drawerEl.classList.add('open');
  }

  close() {
    this._isOpen = false;
    if (this._drawerEl) this._drawerEl.classList.remove('open');
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  _bindFormInputs() {
    // Script input typing
    if (this._scriptInput) {
      this._scriptInput.addEventListener('input', (e) => {
        store.setState({ text: e.target.value });
        this._updateTextStats(e.target.value);
      });
    }

    // Speed slider (Words Per Minute)
    if (this._speedSlider) {
      this._speedSlider.addEventListener('input', (e) => {
        const wpm = parseInt(e.target.value, 10);
        const speed = scroller.calculateSpeedFromWpm(wpm);
        store.setState({ wpm, speed });
      });
    }

    // Font size slider
    if (this._fontSizeSlider) {
      this._fontSizeSlider.addEventListener('input', (e) => {
        const fontSize = parseInt(e.target.value, 10);
        store.setState({ fontSize });
      });
    }

    // Margin width slider
    if (this._marginSlider) {
      this._marginSlider.addEventListener('input', (e) => {
        const marginWidth = parseInt(e.target.value, 10);
        store.setState({ marginWidth });
      });
    }

    // Eyeline slider
    if (this._eyelineSlider) {
      this._eyelineSlider.addEventListener('input', (e) => {
        const eyelinePosition = parseInt(e.target.value, 10);
        store.setState({ eyelinePosition });
      });
    }

    // Mirror toggle
    if (this._mirrorToggle) {
      this._mirrorToggle.addEventListener('change', (e) => {
        store.setState({ isMirrored: e.target.checked });
      });
    }

    // Font family select
    if (this._fontFamilySelect) {
      this._fontFamilySelect.addEventListener('change', (e) => {
        store.setState({ fontFamily: e.target.value });
      });
    }

    // Play/pause button in drawer
    if (this._btnPlayPause) {
      this._btnPlayPause.addEventListener('click', () => {
        if (store.getState().isCountingDown) {
          scroller.cancelCountdown();
          return;
        }
        scroller.toggle();
      });
    }

    // Reset button in drawer
    if (this._btnReset) {
      this._btnReset.addEventListener('click', () => {
        scroller.reset();
      });
    }

    // Fullscreen button in drawer
    if (this._btnFullscreen && this._controls) {
      this._btnFullscreen.addEventListener('click', () => {
        this._controls.toggleFullscreen();
      });
    }

    // Rewind step button
    if (this._btnRewind) {
      this._btnRewind.addEventListener('click', () => {
        const cur = scroller.getScrollY();
        scroller.setScrollY(Math.max(0, cur - 160));
      });
    }

    // Countdown duration select
    if (this._countdownSelect) {
      this._countdownSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        store.setState({ countdownDuration: isNaN(val) ? 0 : val });
      });
    }

    // Countdown show script toggle
    if (this._countdownShowScriptToggle) {
      this._countdownShowScriptToggle.addEventListener('change', (e) => {
        store.setState({ countdownShowScript: e.target.checked });
      });
    }

    // Progress bar toggle
    if (this._progressBarToggle) {
      this._progressBarToggle.addEventListener('change', (e) => {
        store.setState({ showProgressBar: e.target.checked });
      });
    }

    // Reverse scroll toggle
    if (this._reverseToggle) {
      this._reverseToggle.addEventListener('change', (e) => {
        store.setState({ reverseScroll: e.target.checked });
      });
    }

    // Restore demo presentation script button
    if (this._btnRestoreDemo) {
      this._btnRestoreDemo.addEventListener('click', () => {
        store.setState({ text: WELCOME_DEMO_SCRIPT });
        if (this._scriptInput) {
          this._scriptInput.value = WELCOME_DEMO_SCRIPT;
          this._updateTextStats(WELCOME_DEMO_SCRIPT);
        }
      });
    }

    // Touch controls toggle
    if (this._touchControlsToggle) {
      this._touchControlsToggle.addEventListener('change', (e) => {
        store.setState({ showTouchControls: e.target.checked });
      });
    }

    // Render Markdown toggle
    if (this._renderMarkdownToggle) {
      this._renderMarkdownToggle.addEventListener('change', (e) => {
        store.setState({ renderMarkdown: e.target.checked });
      });
    }

    // Theme color presets
    const themePills = document.querySelectorAll('.theme-pill');
    themePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const bg = pill.dataset.bg;
        const text = pill.dataset.text;
        store.setState({ bgColor: bg, textColor: text });
      });
    });
  }

  _syncFromStore(state, changedKeys) {
    if (changedKeys.includes('showTouchControls') && this._touchControlsToggle) {
      this._touchControlsToggle.checked = !!state.showTouchControls;
    }

    if (changedKeys.includes('renderMarkdown') && this._renderMarkdownToggle) {
      this._renderMarkdownToggle.checked = !!state.renderMarkdown;
    }

    if (changedKeys.includes('countdownDuration') && this._countdownSelect) {
      this._countdownSelect.value = String(state.countdownDuration);
    }

    if (changedKeys.includes('countdownShowScript') && this._countdownShowScriptToggle) {
      this._countdownShowScriptToggle.checked = !!state.countdownShowScript;
    }

    if (changedKeys.includes('showProgressBar') && this._progressBarToggle) {
      this._progressBarToggle.checked = state.showProgressBar;
    }

    if (changedKeys.includes('reverseScroll') && this._reverseToggle) {
      this._reverseToggle.checked = state.reverseScroll;
    }

    if (changedKeys.includes('text') && this._scriptInput && this._scriptInput.value !== state.text) {
      this._scriptInput.value = state.text;
      this._updateTextStats(state.text);
    }

    if ((changedKeys.includes('wpm') || changedKeys.includes('speed') || changedKeys.includes('text')) && this._speedSlider) {
      const wpm = state.wpm || 130;
      const pace = getPaceDescription(wpm);
      this._speedSlider.value = wpm;
      if (this._speedValue) this._speedValue.textContent = `${wpm} WPM • ${pace}`;
      if (this._speedTotalTime) {
        const metrics = scroller.getMetrics();
        this._speedTotalTime.textContent = `~${metrics.totalFormatted || '3:00'} total`;
      }
    }

    if (changedKeys.includes('fontSize')) {
      if (this._fontSizeSlider) this._fontSizeSlider.value = state.fontSize;
      if (this._fontSizeValue) this._fontSizeValue.textContent = `${state.fontSize} px`;
    }

    if (changedKeys.includes('marginWidth')) {
      if (this._marginSlider) this._marginSlider.value = state.marginWidth;
      if (this._marginValue) this._marginValue.textContent = `${state.marginWidth} %`;
    }

    if (changedKeys.includes('eyelinePosition')) {
      if (this._eyelineSlider) this._eyelineSlider.value = state.eyelinePosition;
      if (this._eyelineValue) this._eyelineValue.textContent = `${state.eyelinePosition} %`;
    }

    if (changedKeys.includes('isMirrored') && this._mirrorToggle) {
      this._mirrorToggle.checked = state.isMirrored;
    }

    if (changedKeys.includes('fontFamily') && this._fontFamilySelect) {
      this._fontFamilySelect.value = state.fontFamily;
    }

    if ((changedKeys.includes('isPlaying') || changedKeys.includes('isCountingDown')) && this._btnPlayPause) {
      if (state.isCountingDown) {
        this._btnPlayPause.textContent = '⏹ Cancel';
        this._btnPlayPause.classList.remove('btn-primary');
      } else if (state.isPlaying) {
        this._btnPlayPause.textContent = '⏸ Pause';
        this._btnPlayPause.classList.remove('btn-primary');
      } else {
        this._btnPlayPause.textContent = '▶ Play';
        this._btnPlayPause.classList.add('btn-primary');
      }
    }
  }

  _updateTextStats(text) {
    const cleanText = stripMarkdown(text || '');
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    const chars = (text || '').length;

    if (this._wordCountEl) this._wordCountEl.textContent = `${words} words`;
    if (this._charCountEl) this._charCountEl.textContent = `${chars} chars`;
  }
}
