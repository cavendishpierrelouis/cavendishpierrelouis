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

(function setupExternalProjectClick() {
  const projectMedia = document.querySelector('.project-media');

  if (!projectMedia) return;

  projectMedia.addEventListener('pointermove', function (event) {
    if (!window.matchMedia('(hover: hover)').matches) return;

    const rect = projectMedia.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    projectMedia.style.setProperty(
      '--pointer-x',
      (x * 100).toFixed(2) + '%'
    );

    projectMedia.style.setProperty(
      '--pointer-y',
      (y * 100).toFixed(2) + '%'
    );
  });
}());

(function setupCredentialProgress() {
  const section = document.querySelector('.credentials-section');
  const rings = Array.from(document.querySelectorAll('[data-progress]'));

  if (!section || !rings.length) return;

  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let animationFrame = null;

  function setRingValue(ring, value) {
    const safeValue = Math.max(0, Math.min(100, value));
    const text = ring.querySelector('.credential-progress__text');

    ring.style.setProperty('--progress', safeValue.toFixed(2));

    if (text) {
      text.textContent = Math.round(safeValue) + '%';
    }
  }

  function resetRings() {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    rings.forEach(function (ring) {
      setRingValue(ring, 0);
    });
  }

  function animateRings() {
    if (reducedMotion) {
      rings.forEach(function (ring) {
        setRingValue(ring, Number(ring.dataset.progress) || 0);
      });
      return;
    }

    const duration = 1100;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);

      rings.forEach(function (ring) {
        const target = Number(ring.dataset.progress) || 0;
        setRingValue(ring, target * easedProgress);
      });

      if (rawProgress < 1) {
        animationFrame = window.requestAnimationFrame(frame);
      } else {
        animationFrame = null;
      }
    }

    animationFrame = window.requestAnimationFrame(frame);
  }

  resetRings();

  if (!('IntersectionObserver' in window)) {
    animateRings();
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        resetRings();
        animateRings();
      } else {
        resetRings();
      }
    });
  }, {
    threshold: 0.28
  });

  observer.observe(section);
}());
