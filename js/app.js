/**
 * Application entrypoint.
 * Bootstraps state, scrolling engine, controls, and UI bindings.
 */

import { store } from './state.js';
import { scroller } from './scroller.js';
import { ControlsManager } from './controls.js';
import { DrawerController } from './ui/drawer.js';

document.addEventListener('DOMContentLoaded', () => {
  const prompterContainer = document.getElementById('prompterContainer');
  const prompterText = document.getElementById('prompterText');
  const mirrorBox = document.getElementById('mirrorBox');
  const hud = document.getElementById('hud');
  const hudDot = document.getElementById('hudDot');
  const hudSpeed = document.getElementById('hudSpeed');
  const hudStatus = document.getElementById('hudStatus');

  // Initialize UI controllers
  const drawerController = new DrawerController();
  const controlsManager = new ControlsManager({
    prompterContainer,
    isDrawerOpen: () => drawerController.isOpen(),
    closeDrawer: () => drawerController.close()
  });

  // Mount components
  scroller.init(prompterText);
  controlsManager.init();
  drawerController.init(controlsManager);

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

    if (changedKeys.includes('text') && prompterText) {
      prompterText.textContent = state.text;
    }

    if (changedKeys.includes('isMirrored') && mirrorBox) {
      mirrorBox.classList.toggle('mirrored', state.isMirrored);
    }

    // HUD status updates
    if (changedKeys.includes('isPlaying') || changedKeys.includes('speed')) {
      if (hudDot) {
        hudDot.classList.toggle('playing', state.isPlaying);
      }
      if (hudStatus) {
        hudStatus.textContent = state.isPlaying ? 'Scrolling' : 'Paused';
      }
      if (hudSpeed) {
        hudSpeed.textContent = `${state.speed} px/s`;
      }
      if (hud) {
        hud.classList.toggle('autohide', state.isPlaying);
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

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
        .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
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

  console.log('🚀 Teleprompter Web App initialized successfully.');
});
