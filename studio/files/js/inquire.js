'use strict';


/* ===================================================
  LIVE NEW YORK CLOCK
  Same behavior as the Studio Work page.
=================================================== */


(function setupWorkClock() {
  const clock =
    document.querySelector(
      '[data-work-clock]'
    );


  if (!clock) {
    return;
  }


  let timer = null;


  const formatter =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }
    );


  function getPart(parts, type) {
    const match =
      parts.find(
        function (part) {
          return part.type === type;
        }
      );


    return match
      ? match.value
      : '';
  }


  function getOffset(date, parts) {
    const zonedTimestamp =
      Date.UTC(
        Number(getPart(parts, 'year')),
        Number(getPart(parts, 'month')) - 1,
        Number(getPart(parts, 'day')),
        Number(getPart(parts, 'hour')),
        Number(getPart(parts, 'minute')),
        Number(getPart(parts, 'second'))
      );


    const totalMinutes =
      Math.round(
        (zonedTimestamp - date.getTime()) / 60000
      );


    if (totalMinutes === 0) {
      return 'GMT';
    }


    const sign =
      totalMinutes >= 0
        ? '+'
        : '-';


    const absoluteMinutes =
      Math.abs(
        totalMinutes
      );


    const hours =
      Math.floor(
        absoluteMinutes / 60
      );


    const minutes =
      absoluteMinutes % 60;


    return minutes === 0
      ? `GMT${sign}${hours}`
      : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  }


  function renderClock() {
    const now =
      new Date();


    const parts =
      formatter.formatToParts(
        now
      );


    const time = [
      getPart(parts, 'hour'),
      getPart(parts, 'minute'),
      getPart(parts, 'second')
    ].join(':');


    clock.textContent =
      `${time} ${getOffset(now, parts)}`;


    clock.dateTime =
      now.toISOString();


    timer =
      window.setTimeout(
        renderClock,
        1000 -
        now.getMilliseconds() +
        8
      );
  }


  renderClock();


  window.addEventListener(
    'pagehide',
    function () {
      if (timer !== null) {
        window.clearTimeout(
          timer
        );


        timer = null;
      }
    },
    {
      once: true
    }
  );
}());


/* ===================================================
  RIGHT MENU
  Same behavior as the Studio Work page.
=================================================== */


(function setupWorkMenu() {
  const toggle =
    document.querySelector(
      '[data-menu-toggle]'
    );


  const panel =
    document.querySelector(
      '[data-menu-panel]'
    );


  if (
    !toggle ||
    !panel
  ) {
    return;
  }


  let isOpen = false;
  let closeTimer = null;


  function openMenu() {
    if (isOpen) {
      return;
    }


    isOpen = true;


    document.body.classList.add(
      'is-menu-open'
    );


    toggle.classList.remove(
      'is-closing'
    );


    toggle.classList.add(
      'is-open'
    );


    toggle.setAttribute(
      'aria-expanded',
      'true'
    );


    toggle.setAttribute(
      'aria-label',
      'Close menu'
    );


    panel.classList.add(
      'is-open'
    );


    panel.setAttribute(
      'aria-hidden',
      'false'
    );
  }


  function closeMenu() {
    if (!isOpen) {
      return;
    }


    isOpen = false;


    document.body.classList.remove(
      'is-menu-open'
    );


    toggle.classList.remove(
      'is-open'
    );


    toggle.classList.add(
      'is-closing'
    );


    toggle.setAttribute(
      'aria-expanded',
      'false'
    );


    toggle.setAttribute(
      'aria-label',
      'Open menu'
    );


    panel.classList.remove(
      'is-open'
    );


    panel.setAttribute(
      'aria-hidden',
      'true'
    );


    window.clearTimeout(
      closeTimer
    );


    closeTimer =
      window.setTimeout(
        function () {
          toggle.classList.remove(
            'is-closing'
          );
        },
        430
      );
  }


  toggle.addEventListener(
    'click',
    function () {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  );


  document.addEventListener(
    'keydown',
    function (event) {
      if (
        event.key === 'Escape' &&
        isOpen
      ) {
        closeMenu();

        toggle.focus();
      }
    }
  );


  panel.addEventListener(
    'click',
    function (event) {
      if (
        event.target.closest(
          'a'
        )
      ) {
        closeMenu();
      }
    }
  );
}());


/* ===================================================
  INQUIRE FORM

  There is no backend dependency here.

  On submit, the visitor's email app opens with the
  form content already composed for:

  hello@cavendishpierrelouis.io
=================================================== */


(function setupInquireForm() {
  const form =
    document.querySelector(
      '[data-inquire-form]'
    );


  const status =
    document.querySelector(
      '[data-inquire-status]'
    );


  if (!form) {
    return;
  }


  function clean(value) {
    return String(
      value || ''
    ).trim();
  }


  form.addEventListener(
    'submit',
    function (event) {
      event.preventDefault();


      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }


      const data =
        new FormData(
          form
        );


      const name =
        clean(
          data.get('name')
        );


      const email =
        clean(
          data.get('email')
        );


      const project =
        clean(
          data.get('project')
        );


      const budget =
        clean(
          data.get('budget')
        );


      const message =
        clean(
          data.get('message')
        );


      const subject =
        `Studio inquiry from ${name}`;


      const body = [
        'Dear Cavendish,',
        '',
        message,
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Project: ${project}`,
        `Budget: ${budget}`
      ].join('\n');


      const mailto =
        'mailto:hello@cavendishpierrelouis.io'
        + `?subject=${encodeURIComponent(subject)}`
        + `&body=${encodeURIComponent(body)}`;


      if (status) {
        status.textContent =
          'Opening your email app…';
      }


      window.location.href =
        mailto;


      window.setTimeout(
        function () {
          if (status) {
            status.textContent = '';
          }
        },
        2400
      );
    }
  );
}());
