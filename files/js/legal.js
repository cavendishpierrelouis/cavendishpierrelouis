(function () {
  'use strict';

  const root = document.querySelector('.legal-main');
  if (!root) return;

  const labels = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    cookies: 'Cookies Policy'
  };
  const hashes = {
    privacy: '#privacy-policy',
    terms: '#terms-of-use',
    cookies: '#cookies-policy'
  };
  const navLinks = Array.from(document.querySelectorAll('[data-legal-switch]'));
  const panels = Array.from(document.querySelectorAll('[data-legal-doc]'));
  const heroBlocks = Array.from(document.querySelectorAll('[data-legal-hero]'));
  const breadcrumb = document.querySelector('[data-legal-breadcrumb]');
  const copyMenu = document.querySelector('[data-legal-copy-menu]');
  const copyButton = document.querySelector('[data-legal-copy-page]');
  const markdownButton = document.querySelector('[data-legal-markdown-view]');
  const toast = document.querySelector('[data-legal-copy-toast]');
  const modal = document.querySelector('[data-cookie-modal]');
  const cookieInputs = Array.from(document.querySelectorAll('[data-cookie-category]'));
  let toastTimer;

  function keyFromHash(hash) {
    if (hash.indexOf('#terms-') === 0) return 'terms';
    if (hash.indexOf('#privacy-') === 0) return 'privacy';
    if (hash.indexOf('#cookies-') === 0) return 'cookies';
    if (hash === hashes.terms) return 'terms';
    if (hash === hashes.cookies) return 'cookies';
    return 'privacy';
  }

  function activePanel() {
    return document.querySelector('[data-legal-doc="' + root.dataset.legalActive + '"]');
  }

  function setActive(key, options) {
    const active = labels[key] ? key : 'privacy';
    root.dataset.legalActive = active;
    document.title = labels[active] + ' · Cavendish Pierre-Louis';
    if (breadcrumb) breadcrumb.textContent = labels[active];

    panels.forEach((panel) => panel.toggleAttribute('hidden', panel.dataset.legalDoc !== active));
    heroBlocks.forEach((block) => block.toggleAttribute('hidden', block.dataset.legalHero !== active));
    navLinks.forEach((link) => {
      const selected = link.dataset.legalSwitch === active;
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (options && options.updateHash && window.location.hash !== hashes[active]) {
      history.pushState(null, '', hashes[active]);
    }

    if (options && options.scroll) {
      const target = document.querySelector('.legal-hero');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function markdown() {
    const panel = activePanel();
    if (!panel) return '';
    const title = labels[root.dataset.legalActive];
    const sections = Array.from(panel.querySelectorAll('.legal-intro, h2, p, li'));
    return ['# ' + title, 'Cavendish Pierre-Louis', 'https://www.cavendishpierrelouis.io/legal.html' , '']
      .concat(sections.map((node) => {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (!text) return '';
        if (node.matches('h2')) return '## ' + text;
        if (node.matches('li')) return '- ' + text;
        return text;
      }))
      .join('\n\n');
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  async function copyPage() {
    try {
      await navigator.clipboard.writeText(markdown());
      showToast('Page copied');
    } catch (error) {
      showToast('Copy unavailable');
    }
    if (copyMenu) copyMenu.open = false;
  }

  function openMarkdown() {
    const view = window.open('', '_blank', 'noopener,noreferrer');
    if (!view) {
      showToast('Please allow popups to view Markdown');
      return;
    }
    view.document.title = labels[root.dataset.legalActive] + ' · Markdown';
    view.document.body.innerHTML = '<pre></pre>';
    view.document.body.style.cssText = 'margin:0;padding:32px;background:#161616;color:#FEF8E8;font:15px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;';
    view.document.querySelector('pre').textContent = markdown();
    if (copyMenu) copyMenu.open = false;
  }

  function syncAiLinks() {
    const prompt = encodeURIComponent('Please help me understand the ' + labels[root.dataset.legalActive] + ' for Cavendish Pierre-Louis: ' + window.location.href);
    document.querySelectorAll('[data-legal-ai-link]').forEach((link) => {
      const service = link.dataset.legalAiLink;
      if (service === 'cavai') link.href = 'https://app.cavbot.io/cavai?prompt=' + prompt;
      if (service === 'chatgpt') link.href = 'https://chatgpt.com/?prompt=' + prompt;
      if (service === 'claude') link.href = 'https://claude.ai/new?q=' + prompt;
    });
  }

  function readPreferences() {
    try {
      return JSON.parse(localStorage.getItem('cmpl-cookie-preferences')) || {};
    } catch (error) {
      return {};
    }
  }

  function syncPreferences() {
    const preferences = readPreferences();
    cookieInputs.forEach((input) => {
      if (Object.prototype.hasOwnProperty.call(preferences, input.dataset.cookieCategory)) {
        input.checked = Boolean(preferences[input.dataset.cookieCategory]);
      }
    });
  }

  function openCookies() {
    if (!modal) return;
    syncPreferences();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const close = modal.querySelector('[data-close-cookie-modal]');
    if (close) close.focus();
  }

  function closeCookies() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.removeProperty('overflow');
  }

  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    const key = link.dataset.legalSwitch;
    if (!labels[key]) return;
    event.preventDefault();
    setActive(key, { updateHash: true, scroll: true });
    syncAiLinks();
  }));

  document.querySelectorAll('[data-legal-section]').forEach((link) => link.addEventListener('click', (event) => {
    const target = document.getElementById(link.dataset.legalSection);
    if (!target) return;
    event.preventDefault();
    const key = keyFromHash('#' + link.dataset.legalSection);
    setActive(key, { updateHash: false });
    history.pushState(null, '', '#' + link.dataset.legalSection);
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }));

  if (copyButton) copyButton.addEventListener('click', copyPage);
  if (markdownButton) markdownButton.addEventListener('click', openMarkdown);
  document.addEventListener('click', (event) => {
    if (copyMenu && copyMenu.open && !copyMenu.contains(event.target)) copyMenu.open = false;
  });

  document.querySelectorAll('[data-open-cookie-preferences]').forEach((button) => button.addEventListener('click', openCookies));
  document.querySelectorAll('[data-close-cookie-modal]').forEach((button) => button.addEventListener('click', closeCookies));
  document.querySelector('[data-reset-cookie-preferences]')?.addEventListener('click', () => {
    cookieInputs.forEach((input) => { input.checked = false; });
  });
  document.querySelector('[data-save-cookie-preferences]')?.addEventListener('click', () => {
    const preferences = {};
    cookieInputs.forEach((input) => { preferences[input.dataset.cookieCategory] = input.checked; });
    try { localStorage.setItem('cmpl-cookie-preferences', JSON.stringify(preferences)); } catch (error) {}
    document.documentElement.dataset.cookiePreferences = 'saved';
    closeCookies();
    showToast('Cookie preferences saved');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (copyMenu) copyMenu.open = false;
      closeCookies();
    }
  });

  window.addEventListener('hashchange', () => {
    setActive(keyFromHash(window.location.hash));
    syncAiLinks();
    if (window.location.hash === '#cookies-manage') openCookies();
  });

  setActive(keyFromHash(window.location.hash));
  syncAiLinks();
  if (window.location.hash === '#cookies-manage') requestAnimationFrame(openCookies);
}());
