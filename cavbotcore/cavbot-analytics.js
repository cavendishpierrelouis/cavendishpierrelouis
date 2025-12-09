(function () {
  "use strict";

  // === CavBot Analytics Client v2.1 ===
  // Event-first, SEO-aware, performance-aware, error-aware.

  const API_URL =
    window.CAVBOT_API_URL || "https://api.cavbot.io/v1/events";

  // Public project key (ok to be in the client, still treat it with respect)
  const PROJECT_KEY =
    window.CAVBOT_PROJECT_KEY || "cavbot_pk_web_main_01J9X0ZK3P";

  const ANON_KEY = "cavbotAnonId";
  const SESSION_KEY = "cavbotSessionKey";

  // SDK + environment markers (for backend segmentation / debugging)
  const SDK_VERSION = "cavbot-web-js-v2.1";
  const ENV = window.CAVBOT_ENV || "production";

  // ---- ID HELPERS ---------------------------------------------------------

  function getAnonymousId() {
    try {
      const existing = localStorage.getItem(ANON_KEY);
      if (existing) return existing;
      const fresh = "anon-" + Math.random().toString(36).slice(2);
      localStorage.setItem(ANON_KEY, fresh);
      return fresh;
    } catch {
      return "anon-ephemeral";
    }
  }

  function getSessionKey() {
    try {
      // Prefer the brain’s session if available (404 game already seeds one)
      if (
        window.cavbotBrain &&
        typeof window.cavbotBrain.getSessionId === "function"
      ) {
        return window.cavbotBrain.getSessionId();
      }
    } catch {
      // ignore
    }

    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const fresh = "sess-" + Math.random().toString(36).slice(2);
      sessionStorage.setItem(SESSION_KEY, fresh);
      return fresh;
    } catch {
      return "sess-" + Math.random().toString(36).slice(2);
    }
  }

  // ---- PAGE CONTEXT + SEO SNAPSHOT ---------------------------------------

  function readMetaTag(name) {
    const el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute("content") || "" : "";
  }

  function readCanonical() {
    const el = document.querySelector('link[rel="canonical"]');
    return el ? el.getAttribute("href") || "" : "";
  }

  function readRobotsFlags() {
    const content = (readMetaTag("robots") || "").toLowerCase();
    return {
      robotsMeta: content || null,
      noindex: content.includes("noindex"),
      nofollow: content.includes("nofollow")
    };
  }

  function readStructureSnapshot() {
    const h1 = document.querySelector("h1");
    const h1Text = h1 ? h1.textContent.trim().slice(0, 260) : "";

    // Very rough word count from visible body text
    let wordCount = 0;
    try {
      const text = (document.body && document.body.innerText) || "";
      wordCount = text.split(/\s+/).filter(Boolean).length;
    } catch {
      wordCount = 0;
    }

    return { h1Text, wordCount };
  }

  function readDeviceSnapshot() {
    try {
      const vpW = window.innerWidth || null;
      const vpH = window.innerHeight || null;

      const scr = window.screen || {};
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};

      return {
        viewportWidth: vpW,
        viewportHeight: vpH,
        screenWidth: scr.width || null,
        screenHeight: scr.height || null,
        devicePixelRatio: window.devicePixelRatio || 1,
        language: navigator.language || null,
        platform: navigator.platform || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemory: navigator.deviceMemory || null,
        connectionType: conn.effectiveType || null,
        downlink: conn.downlink || null
      };
    } catch {
      return {};
    }
  }

  function getBaseContext(overrides) {
    const o = overrides || {};
    const body = document.body || null;

    const pageType =
      o.pageType ||
      (body && body.getAttribute("data-cavbot-page-type")) ||
      "marketing-page";

    const component =
      o.component ||
      (body && body.getAttribute("data-cavbot-component")) ||
      "page-shell";

    return {
      anonymousId: getAnonymousId(),
      sessionKey: getSessionKey(),
      // Allow SPAs / routers to override URL + route
      pageUrl: o.pageUrl || location.href,
      routePath: o.routePath || location.pathname,
      pageType,
      component,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent
    };
  }

  function buildEnvelope(eventName, payload, overrides) {
    const ctx = getBaseContext(overrides);
    const device = readDeviceSnapshot();

    return {
      ...ctx,
      // Version + environment tagging for the backend
      sdkVersion: SDK_VERSION,
      env: ENV,
      device,
      events: [
        {
          name: eventName,
          timestamp: new Date().toISOString(),
          payload: payload || {}
        }
      ]
    };
  }

  // ---- TRANSPORT LAYER ----------------------------------------------------

  function postEnvelope(envelope) {
    try {
      // Normal path: standard fetch with keepalive to survive navigations.
      return fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Project-Key": PROJECT_KEY
        },
        body: JSON.stringify(envelope),
        keepalive: true // helps during navigation
      }).catch(() => {});
    } catch {
      // never break the page
      return Promise.resolve();
    }
  }

  function sendEvent(eventName, payload, overrides) {
    const envelope = buildEnvelope(eventName, payload, overrides);
    return postEnvelope(envelope);
  }

  // ---- PUBLIC API ---------------------------------------------------------

  // Backwards compatible:
  //   cavbotAnalytics.track(name, payload)
  // Extended:
  //   cavbotAnalytics.track(name, payload, { pageType, component, pageUrl, routePath })
  function track(eventName, payload, overrides) {
    return sendEvent(eventName, payload, overrides);
  }

  // Convenience helpers with opinionated pageType/component defaults
  function track404(eventName, payload, overrides) {
    const o = overrides || {};
    return track(
      eventName,
      payload,
      {
        ...o,
        pageType: o.pageType || "404-control-room",
        component: o.component || "404-game"
      }
    );
  }

  function trackConsole(eventName, payload, overrides) {
    const o = overrides || {};
    return track(
      eventName,
      payload,
      {
        ...o,
        pageType: o.pageType || "cavcore-console",
        component: o.component || "cavcore-console-shell"
      }
    );
  }

  // Explicit error tracker if you want to fire custom errors
  function trackError(kind, details, overrides) {
    const payload = {
      kind: kind || "manual",
      ...details
    };
    return track("cavbot_js_error", payload, overrides);
  }

  window.cavbotAnalytics = {
    track,
    track404,
    trackConsole,
    trackError,
    getBaseContext // handy if you ever want to inspect from console
  };

  // ---- AUTO PAGE VIEW + SEO SNAPSHOT -------------------------------------

  function sendPageView() {
    try {
      const seo = {
        title: document.title || "",
        metaDescription: readMetaTag("description") || "",
        canonicalUrl: readCanonical() || ""
      };
      const robots = readRobotsFlags();
      const structure = readStructureSnapshot();

      track(
        "cavbot_page_view",
        {
          seo,
          robots,
          structure
        },
        {
          // Override component for plain page views
          component: "page-shell"
        }
      );
    } catch {
      // don’t break anything if DOM is weird
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    // fire soon after existing onload work
    setTimeout(sendPageView, 80);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(sendPageView, 80);
    });
  }

  // ---- CORE WEB VITALS–STYLE SAMPLE --------------------------------------

  (function initWebVitals() {
    if (typeof performance === "undefined") return;

    const perfPayload = {
      lcpMs: null,
      cls: 0,
      ttfbMs: null
    };

    try {
      const navEntries = performance.getEntriesByType("navigation");
      const nav = navEntries && navEntries[0];
      if (nav) {
        perfPayload.ttfbMs = nav.responseStart;
      }
    } catch {
      // ignore
    }

    try {
      if ("PerformanceObserver" in window) {
        // LCP
        let lcpValue = null;
        const lcpObserver = new PerformanceObserver(function (entryList) {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            lcpValue = lastEntry.renderTime || lastEntry.loadTime || lcpValue;
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

        // CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver(function (entryList) {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });

        window.addEventListener("load", function () {
          setTimeout(function () {
            perfPayload.lcpMs = lcpValue != null ? Math.round(lcpValue) : null;
            perfPayload.cls = Number(clsValue.toFixed(4));

            track(
              "cavbot_web_vitals",
              perfPayload,
              {
                component:
                  (document.body &&
                    document.body.getAttribute("data-cavbot-component")) ||
                  "page-shell"
              }
            );

            try {
              lcpObserver.disconnect();
              clsObserver.disconnect();
            } catch {}
          }, 0);
        });
      }
    } catch {
      // ignore
    }
  })();

  // ---- JS ERROR + PROMISE REJECTION TRACKING -----------------------------

  (function installErrorTracking() {
    try {
      window.addEventListener("error", function (event) {
        try {
          trackError("window_error", {
            message: event.message || null,
            fileName: event.filename || null,
            line: event.lineno || null,
            column: event.colno || null,
            // stack may live on event.error
            stack: event.error && event.error.stack ? String(event.error.stack).slice(0, 2000) : null
          });
        } catch {
          // never throw from handler
        }
      });

      window.addEventListener("unhandledrejection", function (event) {
        try {
          const reason = event.reason || {};
          const payload = {
            message: reason && reason.message ? String(reason.message) : null,
            // Some browsers put stack on reason, some on reason.error
            stack: reason && reason.stack ? String(reason.stack).slice(0, 2000) : null,
            type: typeof reason
          };
          trackError("unhandled_rejection", payload);
        } catch {
          // swallow
        }
      });
    } catch {
      // no-op if environment is weird
    }
  })();
})();