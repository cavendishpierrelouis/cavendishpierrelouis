const DEFAULT_ACCOUNT_ID = 'e7c8426afddfba2ab94c35e64e98c66e';
const EMAIL_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_ORIGINS = new Set([
  'https://studio.cavendishpierrelouis.io'
]);
const ALLOWED_BUDGETS = new Set([
  'Not sure yet',
  'Under $2,500',
  '$2,500–$5,000',
  '$5,000–$10,000',
  '$10,000+'
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = 'Thanks — your inquiry has been sent.';
const DELIVERY_ERROR_MESSAGE =
  'Your message could not be sent. Please try again.';
const SECURITY_ERROR_MESSAGE =
  'Security verification failed. Please try again.';

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({
      ok: false,
      message: 'This form can only be submitted from the Cavendish Pierre-Louis Studio website.'
    }, 403);
  }

  let formData;

  try {
    formData = await request.formData();
  } catch (error) {
    return json({
      ok: false,
      message: 'We could not read your message. Please try again.'
    }, 400);
  }

  if (isHoneypotFilled(formData.get('_website'))) {
    return json({
      ok: true,
      message: SUCCESS_MESSAGE
    });
  }

  const emailToken = readServerValue(env.CF_EMAIL_API_TOKEN);
  const turnstileSecret = readServerValue(env.TURNSTILE_SECRET);
  const recipient = readServerValue(env.FORM_TO_EMAIL);

  if (!emailToken || !turnstileSecret || !isValidEmail(recipient)) {
    console.error('Studio inquiry form is missing required server-side configuration.');

    return json({
      ok: false,
      message: 'This form is temporarily unavailable. Please try again later.'
    }, 500);
  }

  const turnstileToken = readField(
    formData,
    'cf-turnstile-response',
    2048
  );

  if (!turnstileToken.value || turnstileToken.tooLong) {
    return json({
      ok: false,
      message: SECURITY_ERROR_MESSAGE
    }, 400);
  }

  const turnstilePassed = await verifyTurnstile({
    secret: turnstileSecret,
    response: turnstileToken.value,
    remoteIp: request.headers.get('CF-Connecting-IP')
  });

  if (!turnstilePassed) {
    return json({
      ok: false,
      message: SECURITY_ERROR_MESSAGE
    }, 400);
  }

  const fields = {
    name: readField(formData, 'name', 300),
    email: readField(formData, 'email', 320),
    project: readField(formData, 'project', 500),
    budget: readField(formData, 'budget', 100),
    message: readField(formData, 'message', 10000),
    consent: readField(formData, 'consent', 20)
  };

  if (hasInvalidField(fields)) {
    return json({
      ok: false,
      message: 'One or more fields are invalid. Please check your inquiry and try again.'
    }, 400);
  }

  if (!fields.name.value || !fields.project.value || !fields.message.value) {
    return json({
      ok: false,
      message: 'Complete the required fields.'
    }, 400);
  }

  if (!isValidEmail(fields.email.value)) {
    return json({
      ok: false,
      message: 'Enter a valid email address.'
    }, 400);
  }

  if (!ALLOWED_BUDGETS.has(fields.budget.value)) {
    return json({
      ok: false,
      message: 'Select a budget range.'
    }, 400);
  }

  if (fields.consent.value !== 'on') {
    return json({
      ok: false,
      message: 'Please agree before sending your inquiry.'
    }, 400);
  }

  const accountId = readServerValue(env.CF_ACCOUNT_ID) || DEFAULT_ACCOUNT_ID;
  const emailPayload = {
    from: {
      address: 'forms@cavendishpierrelouis.io',
      name: 'Cavendish Pierre-Louis'
    },
    to: recipient,
    reply_to: fields.email.value,
    subject: 'New Studio inquiry',
    text: buildEmailBody(fields, request.headers.get('Referer'))
  };

  let emailResponse;
  let emailResult = null;

  try {
    emailResponse = await fetch(
      `${EMAIL_API_BASE}/${accountId}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      }
    );

    try {
      emailResult = await emailResponse.json();
    } catch (error) {
      emailResult = null;
    }
  } catch (error) {
    console.error('Cloudflare Email Sending request failed for the Studio inquiry form.', {
      message: error instanceof Error ? error.message : 'Unknown request error'
    });

    return json({
      ok: false,
      message: DELIVERY_ERROR_MESSAGE
    }, 502);
  }

  if (!emailResponse.ok || !emailResult || emailResult.success !== true) {
    console.error('Cloudflare Email Sending rejected a Studio inquiry submission.', {
      status: emailResponse.status,
      errors: getApiErrors(emailResult)
    });

    return json({
      ok: false,
      message: DELIVERY_ERROR_MESSAGE
    }, 502);
  }

  return json({
    ok: true,
    message: SUCCESS_MESSAGE
  });
}

function readServerValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isHoneypotFilled(value) {
  return value !== null && (
    typeof value !== 'string' ||
    value.trim() !== ''
  );
}

function readField(formData, name, maxLength) {
  const rawValue = formData.get(name);

  if (rawValue === null) {
    return {
      value: '',
      tooLong: false,
      invalidType: false
    };
  }

  if (typeof rawValue !== 'string') {
    return {
      value: '',
      tooLong: false,
      invalidType: true
    };
  }

  const value = rawValue.trim();

  return {
    value,
    tooLong: value.length > maxLength,
    invalidType: false
  };
}

function hasInvalidField(fields) {
  return Object.values(fields).some(function (field) {
    return field.invalidType || field.tooLong;
  });
}

function isValidEmail(value) {
  return value.length <= 320 && EMAIL_PATTERN.test(value);
}

async function verifyTurnstile({ secret, response, remoteIp }) {
  const body = new URLSearchParams({
    secret,
    response
  });

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    let verification = null;

    try {
      verification = await verificationResponse.json();
    } catch (error) {
      verification = null;
    }

    if (
      !verificationResponse.ok ||
      !verification ||
      verification.success !== true
    ) {
      console.error('Turnstile verification failed for the Studio inquiry form.', {
        status: verificationResponse.status,
        errorCodes: verification && verification['error-codes']
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error('Turnstile verification request failed for the Studio inquiry form.', {
      message: error instanceof Error ? error.message : 'Unknown request error'
    });

    return false;
  }
}

function buildEmailBody(fields, referer) {
  return [
    'New Studio inquiry',
    '',
    'Source: Studio inquiry',
    `Referrer: ${formatReferrer(referer) || 'Not provided'}`,
    '',
    `Name: ${formatSingleLine(fields.name.value)}`,
    `Email: ${fields.email.value}`,
    `Project: ${formatSingleLine(fields.project.value)}`,
    `Budget: ${formatSingleLine(fields.budget.value)}`,
    'Consent to reply: Yes',
    '',
    'Message:',
    formatMessage(fields.message.value)
  ].join('\n');
}

function formatReferrer(value) {
  if (typeof value !== 'string') return '';

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return '';
    }

    return url.toString().slice(0, 2048);
  } catch (error) {
    return '';
  }
}

function formatSingleLine(value) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function formatMessage(value) {
  return value.replace(/\r\n?/g, '\n').trim();
}

function getApiErrors(payload) {
  if (!payload || !Array.isArray(payload.errors)) return [];

  return payload.errors.map(function (error) {
    return {
      code: error && error.code,
      message: error && error.message
    };
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}
