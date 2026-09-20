/**
 * Welcome & Onboarding Modal UI Controller.
 * Introduces key teleprompter benefits, adaptive control guides, and handles "Don't show again" preference.
 */

export const WELCOME_STORAGE_KEY = 'teleprompter_hide_welcome';

export class WelcomeModalController {
  constructor() {
    this._modalEl = document.getElementById('welcomeModal');
    this._closeBtn = document.getElementById('welcomeClose');
    this._startBtn = document.getElementById('welcomeStartBtn');
    this._dontShowCheckbox = document.getElementById('welcomeDontShowAgain');

    this._tabTouch = document.getElementById('welcomeTabTouch');
    this._tabKeyboard = document.getElementById('welcomeTabKeyboard');
    this._panelTouch = document.getElementById('welcomePanelTouch');
    this._panelKeyboard = document.getElementById('welcomePanelKeyboard');

    this._isOpen = false;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onBackdropClick = this._onBackdropClick.bind(this);
  }

  init() {
    if (!this._modalEl) return;

    if (this._closeBtn) {
      this._closeBtn.addEventListener('click', () => this.close());
    }
    if (this._startBtn) {
      this._startBtn.addEventListener('click', () => this.close());
    }

    if (this._dontShowCheckbox) {
      const isHidden = localStorage.getItem(WELCOME_STORAGE_KEY) === 'true';
      this._dontShowCheckbox.checked = isHidden;

      this._dontShowCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        } else {
          localStorage.removeItem(WELCOME_STORAGE_KEY);
        }
      });
    }

    // Modal Control Guide tab switching
    if (this._tabTouch && this._tabKeyboard) {
      this._tabTouch.addEventListener('click', () => this.selectTab('touch'));
      this._tabKeyboard.addEventListener('click', () => this.selectTab('keyboard'));
    }

    this._modalEl.addEventListener('click', this._onBackdropClick);

    // Auto-detect initial tab
    const isTouch = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    this.selectTab(isTouch ? 'touch' : 'keyboard');

    // Auto-open on initial visit if not dismissed
    const shouldHide = localStorage.getItem(WELCOME_STORAGE_KEY) === 'true';
    if (!shouldHide) {
      this.open();
    }
  }

  selectTab(tab) {
    if (tab === 'touch') {
      if (this._tabTouch) this._tabTouch.classList.add('active');
      if (this._tabKeyboard) this._tabKeyboard.classList.remove('active');
      if (this._panelTouch) this._panelTouch.classList.remove('hidden');
      if (this._panelKeyboard) this._panelKeyboard.classList.add('hidden');
    } else {
      if (this._tabTouch) this._tabTouch.classList.remove('active');
      if (this._tabKeyboard) this._tabKeyboard.classList.add('active');
      if (this._panelTouch) this._panelTouch.classList.add('hidden');
      if (this._panelKeyboard) this._panelKeyboard.classList.remove('hidden');
    }
  }

  open() {
    if (!this._modalEl) return;
    this._isOpen = true;
    this._modalEl.classList.remove('hidden');
    window.addEventListener('keydown', this._onKeyDown);
  }

  close() {
    if (!this._modalEl) return;
    this._isOpen = false;
    this._modalEl.classList.add('hidden');
    window.removeEventListener('keydown', this._onKeyDown);
  }

  isOpen() {
    return this._isOpen;
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  _onBackdropClick(e) {
    if (e.target === this._modalEl) {
      this.close();
    }
  }
}
