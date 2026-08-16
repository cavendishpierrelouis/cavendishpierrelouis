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
=================================================== */


(function setupInquireForm() {
  const form =
    document.querySelector(
      '[data-cmpl-form][data-inquire-form]'
    );

  if (!form) {
    return;
  }

  const status =
    form.querySelector(
      '[data-inquire-status]'
    );

  const endpoint =
    form.dataset.formEndpoint;

  const submitButton =
    form.querySelector(
      '[type="submit"]'
    );

  const originalSubmitLabel =
    submitButton
      ? submitButton.textContent.trim()
      : '';

  let isSubmitting = false;

  function resetTurnstile() {
    if (
      !window.turnstile ||
      typeof window.turnstile.reset !== 'function'
    ) {
      return;
    }

    try {
      window.turnstile.reset(
        '#inquire-turnstile'
      );
    } catch (error) {
      // Turnstile may not have rendered yet; the next attempt will create a token.
    }
  }

  function setSubmitting(nextIsSubmitting) {
    isSubmitting = nextIsSubmitting;

    form.toggleAttribute(
      'aria-busy',
      nextIsSubmitting
    );

    if (submitButton) {
      submitButton.disabled = nextIsSubmitting;

      if (nextIsSubmitting) {
        submitButton.setAttribute(
          'aria-disabled',
          'true'
        );
      } else {
        submitButton.removeAttribute(
          'aria-disabled'
        );
      }

      submitButton.textContent = nextIsSubmitting
        ? 'Sending…'
        : originalSubmitLabel;
    }
  }

  form.addEventListener(
    'submit',
    async function (event) {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      if (!form.checkValidity()) {
        const invalidField =
          form.querySelector(
            ':invalid'
          );

        if (status) {
          status.textContent =
            'Complete the required fields.';
        }

        form.reportValidity();

        if (invalidField) {
          invalidField.focus();
        }

        return;
      }

      if (!endpoint) {
        if (status) {
          status.textContent =
            'Your message could not be sent. Please try again.';
        }

        return;
      }

      setSubmitting(true);

      if (status) {
        status.textContent =
          'Sending your message…';
      }

      try {
        const response = await fetch(
          endpoint,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json'
            },
            body: new FormData(form)
          }
        );

        let result = null;

        try {
          result = await response.json();
        } catch (error) {
          result = null;
        }

        if (!response.ok || !result || result.ok !== true) {
          if (status) {
            status.textContent = result && result.message
              ? result.message
              : 'Your message could not be sent. Please try again.';
          }

          return;
        }

        form.reset();

        if (status) {
          status.textContent = result.message
            || 'Thanks — your inquiry has been sent.';
        }
      } catch (error) {
        if (status) {
          status.textContent =
            'Your message could not be sent. Please try again.';
        }
      } finally {
        resetTurnstile();
        setSubmitting(false);
      }
    }
  );
}());
