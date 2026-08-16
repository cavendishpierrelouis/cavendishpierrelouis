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
      threshold: 0.12
    }
  );

  items.forEach(function (item, index) {
    item.style.transitionDelay =
      Math.min(index % 4, 3) * 55 + 'ms';

    observer.observe(item);
  });
}());

(function setupFaq() {
  const list = document.querySelector('[data-faq-list]');

  if (!list) return;

  const items = Array.from(
    list.querySelectorAll('[data-faq-item]')
  );

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

(function setupContactForm() {
  const form = document.querySelector('[data-cmpl-form][data-contact-form]');

  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const endpoint = form.dataset.formEndpoint;
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = form.querySelector('.contact-form__submit-label');
  const originalSubmitLabel = submitLabel
    ? submitLabel.textContent.trim()
    : '';

  let isSubmitting = false;

  const requiredFields = Array.from(
    form.querySelectorAll('[required]')
  );

  function getErrorElement(field) {
    const describedBy = field.getAttribute('aria-describedby');

    if (!describedBy) return null;

    return document.getElementById(describedBy);
  }

  function getErrorMessage(field) {
    if (field.validity.valueMissing) {
      return 'This field is required.';
    }

    if (field.validity.typeMismatch) {
      return 'Enter a valid email address.';
    }

    return 'Check this field.';
  }

  function validateField(field) {
    const error = getErrorElement(field);
    const isValid = field.checkValidity();

    field.setAttribute(
      'aria-invalid',
      isValid ? 'false' : 'true'
    );

    if (error) {
      error.textContent = isValid
        ? ''
        : getErrorMessage(field);
    }

    return isValid;
  }

  requiredFields.forEach(function (field) {
    field.addEventListener('blur', function () {
      validateField(field);
    });

    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') {
        validateField(field);
      }
    });
  });

  function resetTurnstile() {
    if (
      !window.turnstile ||
      typeof window.turnstile.reset !== 'function'
    ) {
      return;
    }

    try {
      window.turnstile.reset('#contact-turnstile');
    } catch (error) {
      // Turnstile may not have rendered yet; the next attempt will create a token.
    }
  }

  function setSubmitting(nextIsSubmitting) {
    isSubmitting = nextIsSubmitting;
    form.toggleAttribute('aria-busy', nextIsSubmitting);

    if (submitButton) {
      submitButton.disabled = nextIsSubmitting;

      if (nextIsSubmitting) {
        submitButton.setAttribute('aria-disabled', 'true');
      } else {
        submitButton.removeAttribute('aria-disabled');
      }
    }

    if (submitLabel) {
      submitLabel.textContent = nextIsSubmitting
        ? 'Sending…'
        : originalSubmitLabel;
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (isSubmitting) return;

    const firstInvalid = requiredFields.find(function (field) {
      return !validateField(field);
    });

    if (firstInvalid) {
      if (status) {
        status.textContent = 'Complete the required fields.';
      }

      firstInvalid.focus();
      return;
    }

    if (!form.checkValidity()) {
      const invalidField = form.querySelector(':invalid');

      if (status) {
        status.textContent = 'Check the highlighted field and try again.';
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
      status.textContent = 'Sending your message…';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: new FormData(form)
      });

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
        status.textContent = result.message || 'Thanks — your message has been sent.';
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
  });
}());
