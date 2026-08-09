'use strict';


(function setupReveal() {
  const items = Array.from(
    document.querySelectorAll('[data-reveal]')
  );


  if (!items.length) return;


  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;


  if (
    reducedMotion ||
    !('IntersectionObserver' in window)
  ) {
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
      threshold: 0.1
    }
  );


  items.forEach(function (item, index) {
    item.style.transitionDelay =
      Math.min(index % 4, 3) * 45 + 'ms';


    observer.observe(item);
  });
}());


(function setupArticleToc() {
  const links = Array.from(
    document.querySelectorAll('[data-article-toc]')
  );


  if (!links.length) return;


  const sections = links
    .map(function (link) {
      const href = link.getAttribute('href') || '';
      const id = href.replace('#', '');
      const section = document.getElementById(id);


      return section
        ? {
            link: link,
            section: section
          }
        : null;
    })
    .filter(Boolean);


  if (!sections.length) return;


  function setActive(id) {
    links.forEach(function (link) {
      const isActive =
        link.getAttribute('href') === '#' + id;


      link.classList.toggle('is-active', isActive);


      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }


  links.forEach(function (link) {
    link.addEventListener('click', function () {
      const id = (
        link.getAttribute('href') || ''
      ).replace('#', '');


      if (id) {
        setActive(id);
      }
    });
  });


  if (!('IntersectionObserver' in window)) {
    setActive(sections[0].section.id);
    return;
  }


  const visibleSections = new Map();


  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleSections.set(
            entry.target.id,
            entry.boundingClientRect.top
          );
        } else {
          visibleSections.delete(entry.target.id);
        }
      });


      if (!visibleSections.size) return;


      const activeId = Array.from(
        visibleSections.entries()
      )
        .sort(function (first, second) {
          return (
            Math.abs(first[1]) -
            Math.abs(second[1])
          );
        })[0][0];


      setActive(activeId);
    },
    {
      root: null,
      rootMargin: '-18% 0px -66% 0px',
      threshold: 0.01
    }
  );


  sections.forEach(function (item) {
    observer.observe(item.section);
  });


  setActive(sections[0].section.id);
}());
