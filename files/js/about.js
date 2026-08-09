'use strict';

(function setupReveal() {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));

  if (!items.length) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(function (item) {
      item.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12
    }
  );

  items.forEach(function (item, index) {
    item.style.transitionDelay = Math.min(index % 4, 3) * 55 + 'ms';
    observer.observe(item);
  });
}());

(function setupFaq() {
  const list = document.querySelector('[data-faq-list]');

  if (!list) return;

  const items = Array.from(list.querySelectorAll('[data-faq-item]'));

  function closeItem(item) {
    const button = item.querySelector('[data-faq-button]');
    const answer = item.querySelector('[data-faq-answer]');

    if (!button || !answer) return;

    item.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    answer.hidden = true;
  }

  function openItem(item) {
    const button = item.querySelector('[data-faq-button]');
    const answer = item.querySelector('[data-faq-answer]');

    if (!button || !answer) return;

    item.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    answer.hidden = false;
  }

  items.forEach(function (item) {
    const button = item.querySelector('[data-faq-button]');

    if (!button) return;

    button.addEventListener('click', function () {
      const isOpen = item.classList.contains('is-open');

      items.forEach(function (currentItem) {
        closeItem(currentItem);
      });

      if (!isOpen) {
        openItem(item);
      }
    });
  });
}());
