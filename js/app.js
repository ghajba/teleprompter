/**
 * Application entrypoint.
 * Bootstraps state, scrolling engine, controls, and UI bindings.
 */

import { store } from './state.js';
import { scroller } from './scroller.js';
import { ControlsManager } from './controls.js';
import { DrawerController } from './ui/drawer.js';
import { WelcomeModalController } from './ui/welcome.js';
import { renderMarkdown } from './markdown.js';
import { APP_VERSION } from './version.js';

document.addEventListener('DOMContentLoaded', () => {
  const prompterContainer = document.getElementById('prompterContainer');
  const prompterText = document.getElementById('prompterText');
  const mirrorBox = document.getElementById('mirrorBox');
  const hud = document.getElementById('hud');
  const hudDot = document.getElementById('hudDot');
  const hudSpeed = document.getElementById('hudSpeed');
  const hudStatus = document.getElementById('hudStatus');
  const hudTime = document.getElementById('hudTime');
  const hudWpm = document.getElementById('hudWpm');
  const appVersionWatermark = document.getElementById('appVersionWatermark');

  // Dynamic version stamping across all version badges
  document.querySelectorAll('.app-version-text').forEach((el) => {
    el.textContent = APP_VERSION;
  });

  const readingProgressBar = document.getElementById('readingProgressBar');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const touchControls = document.getElementById('touchControls');

  const prompterTextInner = document.getElementById('prompterTextInner');
  if (prompterTextInner) {
    const initialText = store.getState().text || '';
    if (store.getState().renderMarkdown) {
      prompterTextInner.innerHTML = renderMarkdown(initialText);
    } else {
      prompterTextInner.textContent = initialText;
    }
  }

  // Initialize UI controllers
  const welcomeController = new WelcomeModalController();
  const drawerController = new DrawerController();
  const controlsManager = new ControlsManager({
    prompterContainer,
    isDrawerOpen: () => drawerController.isOpen(),
    closeDrawer: () => drawerController.close()
  });

  // Mount components
  scroller.init({
    contentEl: prompterText,
    progressBarEl: readingProgressBar,
    countdownOverlayEl: countdownOverlay
  });
  controlsManager.init();
  drawerController.init(controlsManager, () => welcomeController.open());
  welcomeController.init();

  // Periodic metrics update for HUD (every 250ms)
  setInterval(() => {
    const metrics = scroller.getMetrics();
    if (hudTime) {
      hudTime.textContent = metrics.remainingFormatted;
    }
    if (hudWpm) {
      hudWpm.textContent = metrics.pace || 'Conversational';
    }
  }, 250);

  // Apply state to DOM & CSS Custom Properties
  function applyState(state, changedKeys) {
    const root = document.documentElement;

    if (changedKeys.includes('fontSize')) {
      root.style.setProperty('--font-size', `${state.fontSize}px`);
    }
    if (changedKeys.includes('fontFamily')) {
      root.style.setProperty('--font-family', state.fontFamily);
    }
    if (changedKeys.includes('textColor')) {
      root.style.setProperty('--text-color', state.textColor);
    }
    if (changedKeys.includes('bgColor')) {
      root.style.setProperty('--bg-color', state.bgColor);
    }
    if (changedKeys.includes('marginWidth')) {
      root.style.setProperty('--margin-width', `${state.marginWidth}%`);
    }
    if (changedKeys.includes('eyelinePosition')) {
      root.style.setProperty('--eyeline-top', `${state.eyelinePosition}%`);
    }

    if (changedKeys.includes('showProgressBar') && readingProgressBar) {
      readingProgressBar.classList.toggle('hidden', !state.showProgressBar);
    }

    if (changedKeys.includes('countdownShowScript') && countdownOverlay) {
      countdownOverlay.classList.toggle('transparent-bg', !!state.countdownShowScript);
    }

    const prompterTextInner = document.getElementById('prompterTextInner');
    if (changedKeys.includes('text') || changedKeys.includes('renderMarkdown')) {
      if (prompterTextInner) {
        if (state.renderMarkdown) {
          prompterTextInner.innerHTML = renderMarkdown(state.text || '');
        } else {
          prompterTextInner.textContent = state.text || '';
        }
      } else if (prompterText) {
        prompterText.textContent = state.text || '';
      }
    }

    if (changedKeys.includes('isMirrored') && mirrorBox) {
      mirrorBox.classList.toggle('mirrored', state.isMirrored);
    }

    // Trigger scroller boundary recalculation on any layout mutation
    const layoutAffectingKeys = ['text', 'fontSize', 'marginWidth', 'fontFamily', 'eyelinePosition', 'renderMarkdown'];
    if (changedKeys.some(k => layoutAffectingKeys.includes(k))) {
      requestAnimationFrame(() => {
        scroller.updateBounds();
      });
    }

    if (changedKeys.includes('showTouchControls') && touchControls) {
      touchControls.classList.toggle('hidden', !state.showTouchControls);
    }

    // HUD & On-screen controls status updates
    if (changedKeys.includes('isPlaying') || changedKeys.includes('wpm') || changedKeys.includes('speed') || changedKeys.includes('reverseScroll')) {
      if (hudDot) {
        hudDot.classList.toggle('playing', state.isPlaying);
      }
      if (hudStatus) {
        if (state.reverseScroll && state.isPlaying) {
          hudStatus.textContent = '⏪ Rewind';
        } else if (state.isPlaying) {
          hudStatus.textContent = 'Scrolling';
        } else {
          hudStatus.textContent = 'Paused';
        }
      }
      if (hudSpeed) {
        const wpm = state.wpm || 130;
        hudSpeed.textContent = `${state.reverseScroll ? '⏪ -' : ''}${wpm} WPM`;
      }
      if (hud) {
        hud.classList.toggle('autohide', state.isPlaying);
      }
      if (touchControls) {
        touchControls.classList.toggle('autohide', state.isPlaying);
      }
      if (appVersionWatermark) {
        appVersionWatermark.classList.toggle('autohide', state.isPlaying);
      }
    }
  }

  // Initial synchronization with loaded state
  const initialState = store.getState();
  applyState(initialState, Object.keys(initialState));

  // Subscribe to all ongoing state mutations
  store.subscribe((state, changedKeys) => {
    applyState(state, changedKeys);
  });

  // PWA Service Worker Registration & Live Auto-Update
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[PWA] New service worker version active, reloading...');
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
          // Check for newer versions on server
          reg.update().catch(() => {});
        })
        .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
    });
  }

  // Reload / Check Updates button in drawer
  const btnRefreshApp = document.getElementById('btnRefreshApp');
  if (btnRefreshApp) {
    btnRefreshApp.addEventListener('click', async () => {
      btnRefreshApp.textContent = '🔄 Updating...';
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
          }
        } catch (err) {
          console.warn('[PWA] Update check failed:', err);
        }
      }
      window.location.reload();
    });
  }

  // PWA Install Prompt Listener
  let deferredPrompt = null;
  const installBtn = document.getElementById('btnInstallApp');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User install choice:', outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application successfully installed.');
    if (installBtn) installBtn.style.display = 'none';
  });

  // File Drag & Drop support (.txt and .md files)
  const fileDropZone = document.getElementById('fileDropZone');
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (fileDropZone) fileDropZone.classList.remove('hidden');
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0 && fileDropZone) {
      dragCounter = 0;
      fileDropZone.classList.add('hidden');
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (fileDropZone) fileDropZone.classList.add('hidden');

    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target && event.target.result;
        if (typeof content === 'string') {
          store.setState({ text: content });
        }
      };
      reader.readAsText(file);
    }
  });

  // Global Paste handler: opens drawer and loads clipboard text if not typing in an input
  window.addEventListener('paste', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
      return; // allow native paste inside active input
    }
    const text = (e.clipboardData || window.clipboardData)?.getData('text');
    if (text) {
      e.preventDefault();
      store.setState({ text });
      drawerController.open();
    }
  });

  console.log('🚀 Teleprompter Web App initialized successfully.');
});
