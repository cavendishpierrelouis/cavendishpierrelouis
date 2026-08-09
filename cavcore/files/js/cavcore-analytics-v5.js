/* ======================================================================
  CavBot Analytics Client (v5)
  - Multi-tenant ingest (project_key + site host/origin)
  - Offline queue + flush, beacon fallback, honors GPC/DNT
  - SPA routes, vitals, errors, safe SEO + A11y signals
  - Safe payloads only (no form values), hashed fingerprints for grouping

  IMPORTANT v5 update:
  - Sends { project_key, site, sdk_version, env, records[] } to /v1/events
  - Uses headers your Worker allowlists:
    X-Project-Key, X-Cavbot-Sdk-Version, X-Cavbot-Env,
    X-Cavbot-Site-Host, X-Cavbot-Site-Origin, X-Cavbot-Site-Public-Id
  - Auto-attaches base { origin, url, path } into every payload_json
====================================================================== */

(function () {
  "use strict";

  if (window.__cavbotAnalyticsV5Loaded) return;
  window.__cavbotAnalyticsV5Loaded = true;

  const API_URL = window.CAVBOT_API_URL || "https://api.cavbot.io/v1/events";
  const PROJECT_KEY = window.CAVBOT_PROJECT_KEY || "cavbot_pk_web_main_01J9X0ZK3P";

  // Optional (recommended): set per-site in the snippet. Server can still resolve by host/origin.
  const SITE_PUBLIC_ID = window.CAVBOT_SITE_PUBLIC_ID || window.CAVBOT_SITE_ID || null;

  const ANON_KEY = "cavbotAnonId";
  const SESSION_KEY = "cavbotSessionKey";
  const VISITOR_KEY = "cavbotVisitorId";

  const QUEUE_KEY_V5 = "cavbotAnalyticsQueueV5";
  const QUEUE_KEY_LEGACY = "cavbotAnalyticsQueueV1";

  const SDK_VERSION = "cavbot-web-js-v5.4";
  const ENV = window.CAVBOT_ENV || "production";

  // Limits
  const MAX_QUEUE = 160;
  const MAX_STACK = 2000;
  const MAX_STRING = 360;
  const MAX_JSON = 4500; // keep payload/meta small for DB + transport
  const BATCH_SIZE = 20;

  // Debug: ?cavbot_debug=1
  const DEBUG = (function () {
    try {
      const s = String(location.search || "");
      return /(^|[?&])cavbot_debug=1(&|$)/.test(s);
    } catch { return false; }
  })();

  const SAMPLE = {
    engagementPing: 1.0,
    scrollDepth: 1.0,
    ctaClick: 1.0,
    formSubmit: 1.0,
    apiError: 1.0,
    a11yAudit: DEBUG ? 1.0 : 0.35,
    contrastAudit: DEBUG ? 1.0 : 0.25,
    focusSignals: DEBUG ? 1.0 : 0.6
  };

  const A11Y = {
    enabled: window.CAVBOT_A11Y_ENABLED !== false,
    maxNodes: 650,
    maxSamplesPerType: 12,
    auditDelayMs: 420,
    contrastNodeCap: 420
  };

  // ---------------------------
  // Transport posture
  // ---------------------------
  const API_ORIGIN = (function () {
    try { return new URL(API_URL, location.href).origin; } catch { return ""; }
  })();

  const PAGE_ORIGIN = (function () {
    try { return location.origin || ""; } catch { return ""; }
  })();

  const IS_CROSS_ORIGIN = !!(API_ORIGIN && PAGE_ORIGIN && API_ORIGIN !== PAGE_ORIGIN);

  const FORCE_BEACON = window.CAVBOT_FORCE_BEACON === true;
  const DISABLE_BEACON = window.CAVBOT_DISABLE_BEACON === true;

  // ---------------------------
  // Privacy switches
  // ---------------------------
  function hasGlobalPrivacyControl() {
    try { return !!navigator.globalPrivacyControl; } catch { return false; }
  }

  function hasDoNotTrack() {
    try {
      const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
      return dnt === "1" || dnt === "yes";
    } catch { return false; }
  }

  function analyticsDisabled() {
    try {
      if (window.CAVBOT_ANALYTICS_DISABLED === true) return true;
      const body = document.body;
      if (body && body.getAttribute("data-cavbot-analytics") === "off") return true;
      if (hasGlobalPrivacyControl()) return true;
      if (hasDoNotTrack()) return true;
    } catch {}
    return false;
  }

  function a11yDisabled() {
    try {
      if (!A11Y.enabled) return true;
      const body = document.body;
      if (body && body.getAttribute("data-cavbot-a11y") === "off") return true;
      if (analyticsDisabled()) return true;
    } catch {}
    return false;
  }

  // ---------------------------
  // Small utils
  // ---------------------------
  function chance(p) {
    try { return Math.random() < (typeof p === "number" ? p : 1); } catch { return true; }
  }

  function safeString(x, maxLen) {
    try {
      const s = (x == null) ? "" : String(x);
      const m = typeof maxLen === "number" ? maxLen : MAX_STRING;
      return s.length > m ? s.slice(0, m) : s;
    } catch { return ""; }
  }

  function safeUrlPath(input) {
    try {
      const u = new URL(String(input || ""), location.href);
      return (u.pathname || "/");
    } catch {
      try {
        const s = String(input || "");
        return s.split("?")[0].split("#")[0] || "";
      } catch { return ""; }
    }
  }

  function safeHost(input) {
    try {
      const u = new URL(String(input || ""), location.href);
      return u.host || "";
    } catch { return ""; }
  }

  function nowMs() {
    try {
      return (performance && typeof performance.now === "function") ? performance.now() : Date.now();
    } catch { return Date.now(); }
  }

  function epochMs() {
    try { return Date.now(); } catch { return 0; }
  }

  function hashString(str) {
    // deterministic, non-crypto fingerprint (grouping only)
    try {
      const s = String(str || "");
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      return ("h" + (h >>> 0).toString(16));
    } catch { return "h0"; }
  }

  function clampInt(n, min, max) {
    const x = Number(n);
    if (!isFinite(x)) return null;
    return Math.max(min, Math.min(max, Math.round(x)));
  }

  function onIdle(fn, timeoutMs) {
    try {
      if ("requestIdleCallback" in window) {
        return window.requestIdleCallback(function () { try { fn(); } catch {} }, { timeout: timeoutMs || 900 });
      }
    } catch {}
    return setTimeout(function () { try { fn(); } catch {} }, 0);
  }

  function cssEscapeSafe(id) {
    try {
      if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(id);
    } catch {}
    try {
      return String(id).replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
    } catch { return String(id || ""); }
  }

  function jsonStringifyCapped(obj, cap) {
    try {
      const raw = JSON.stringify(obj || {});
      const max = typeof cap === "number" ? cap : MAX_JSON;
      return raw.length > max ? raw.slice(0, max) : raw;
    } catch { return "{}"; }
  }

  // ---------------------------
  // ID helpers
  // ---------------------------
  function getAnonymousId() {
    try {
      const existing = localStorage.getItem(ANON_KEY);
      if (existing) return existing;
      const fresh = "anon-" + Math.random().toString(36).slice(2);
      localStorage.setItem(ANON_KEY, fresh);
      return fresh;
    } catch { return "anon-ephemeral"; }
  }

  function getVisitorId() {
    // stable anonymous visitor id (separate from anon id if you ever rotate anon)
    try {
      const existing = localStorage.getItem(VISITOR_KEY);
      if (existing) return existing;
      const fresh = "vis-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem(VISITOR_KEY, fresh);
      return fresh;
    } catch { return "vis-ephemeral"; }
  }

  function getSessionKey() {
    try {
      if (window.cavbotBrain && typeof window.cavbotBrain.getSessionId === "function") {
        return window.cavbotBrain.getSessionId();
      }
    } catch {}

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

  let __evtCounter = 0;
  function newEventId() {
    try {
      __evtCounter = (__evtCounter + 1) % 1e6;
      return "evt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10) + "_" + __evtCounter.toString(36);
    } catch {
      return "evt_" + Math.random().toString(36).slice(2);
    }
  }

  // ---------------------------
  // Page context + snapshots
  // ---------------------------
  function readMetaTag(name) {
    const el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute("content") || "") : "";
  }

  function readCanonical() {
    const el = document.querySelector('link[rel="canonical"]');
    return el ? (el.getAttribute("href") || "") : "";
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
    const h1s = document.querySelectorAll("h1");
    const h1 = h1s && h1s[0];
    const h1Text = h1 ? (h1.textContent || "").trim().slice(0, 260) : "";

    let wordCount = 0;
    try {
      const text = (document.body && document.body.innerText) || "";
      wordCount = text.split(/\s+/).filter(Boolean).length;
    } catch { wordCount = 0; }

    return { h1Text, wordCount, h1Count: h1s ? h1s.length : 0 };
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
    } catch { return {}; }
  }

  function siteContext() {
    try {
      const host = location.host || "";
      const origin = location.origin || "";
      const baseUrl = origin;
      return {
        site_public_id: SITE_PUBLIC_ID ? safeString(SITE_PUBLIC_ID, 160) : null,
        host: safeString(host, 220),
        origin: safeString(origin, 220),
        base_url: safeString(baseUrl, 220)
      };
    } catch {
      return { site_public_id: SITE_PUBLIC_ID ? safeString(SITE_PUBLIC_ID, 160) : null, host: "", origin: "", base_url: "" };
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

    const ref = document.referrer || "";
    const refHost = ref ? safeHost(ref) : "";

    return {
      anonymous_id: getAnonymousId(),
      visitor_id: getVisitorId(),
      session_key: getSessionKey(),
      page_url: o.pageUrl || location.href,
      route_path: o.routePath || location.pathname,
      page_type: pageType,
      component: component,
      referrer_url: ref || "",
      referrer_host: refHost || "",
      project_key: PROJECT_KEY
    };
  }

  function inferEventType(eventName) {
    const n = String(eventName || "");
    if (n === "cavbot_page_view") return "page_view";
    if (n === "cavbot_route_change") return "route_change";
    if (n === "cavbot_web_vitals") return "web_vitals";
    if (n === "cavbot_js_error") return "js_error";
    if (n === "cavbot_api_error") return "api_error";
    if (n === "cavbot_scroll_depth") return "scroll_depth";
    if (n === "cavbot_engagement_ping") return "engagement";
    if (n === "cavbot_cta_click") return "cta_click";
    if (n === "cavbot_form_submit") return "form_submit";
    if (n === "cavbot_a11y_audit") return "a11y_audit";
    if (n === "cavbot_guardian_snapshot") return "guardian";
    if (n === "cavbot_focus_signals") return "focus";
    return "event";
  }

  function buildEventRecord(eventName, payload, overrides) {
    const ctx = getBaseContext(overrides);
    const dev = readDeviceSnapshot();

    const ua = (function () {
      try { return navigator.userAgent || ""; } catch { return ""; }
    })();

    const uaHash = hashString(ua);
    const site = siteContext();

    // v5 payload base (mirrors your TS wrapper behavior: base first, payload overrides)
    const basePayload = {
      origin: site.origin || null,
      url: ctx.page_url || null,
      path: ctx.route_path || null
    };
    const payloadMerged = { ...basePayload, ...(payload || {}) };

    const record = {
      project_key: ctx.project_key,
      site_public_id: site.site_public_id,
      site_host: site.host,
      site_origin: site.origin,

      event_id: newEventId(),
      ts: epochMs(),
      event_timestamp: new Date().toISOString(),

      event_name: safeString(eventName, 120),
      event_type: safeString(inferEventType(eventName), 60),

      anonymous_id: safeString(ctx.anonymous_id, 160),
      visitor_id: safeString(ctx.visitor_id, 160),
      session_key: safeString(ctx.session_key, 160),

      page_url: safeString(ctx.page_url, 600),
      route_path: safeString(ctx.route_path, 360),
      page_type: safeString(ctx.page_type, 120),
      component: safeString(ctx.component, 140),

      referrer_url: safeString(ctx.referrer_url || "", 600),
      referrer_host: safeString(ctx.referrer_host || "", 260),

      user_agent_hash: safeString(uaHash, 80),
      ip_hash: null,
      is_bot: null,

      payload_json: jsonStringifyCapped(payloadMerged || {}, MAX_JSON),
      meta_json: jsonStringifyCapped({
        sdk_version: SDK_VERSION,
        env: ENV,
        device: dev,
        privacy: {
          gpc: hasGlobalPrivacyControl() ? 1 : 0,
          dnt: hasDoNotTrack() ? 1 : 0
        }
      }, MAX_JSON)
    };

    return record;
  }

  // ---------------------------
  // Queue (offline-safe)
  // ---------------------------
  function safeJsonParse(raw, fallback) {
    try {
      const parsed = raw ? JSON.parse(raw) : fallback;
      return Array.isArray(parsed) ? parsed : fallback;
    } catch { return fallback; }
  }

  function migrateLegacyQueueOnce() {
    try {
      const legacy = safeJsonParse(localStorage.getItem(QUEUE_KEY_LEGACY), []);
      if (!legacy.length) return;

      const current = safeJsonParse(localStorage.getItem(QUEUE_KEY_V5), []);
      const merged = current.concat(legacy).slice(-MAX_QUEUE);

      localStorage.setItem(QUEUE_KEY_V5, JSON.stringify(merged));
      localStorage.removeItem(QUEUE_KEY_LEGACY);
    } catch {}
  }

  function readQueue() {
    try {
      migrateLegacyQueueOnce();
      return safeJsonParse(localStorage.getItem(QUEUE_KEY_V5), []);
    } catch { return []; }
  }

  function writeQueue(q) {
    try {
      localStorage.setItem(QUEUE_KEY_V5, JSON.stringify(q.slice(-MAX_QUEUE)));
    } catch {}
  }

  function enqueue(record) {
    const q = readQueue();
    q.push(record);
    writeQueue(q);
  }

  // ---------------------------
  // Transport (batch-aware)
  // ---------------------------
  function postBatch(records) {
    if (analyticsDisabled()) return Promise.resolve(true);

    const site = siteContext();

    const payload = {
      project_key: PROJECT_KEY,
      site: site,
      sdk_version: SDK_VERSION,
      env: ENV,
      records: Array.isArray(records) ? records : []
    };

    const canUseBeacon =
      !DISABLE_BEACON &&
      !!navigator.sendBeacon &&
      (!IS_CROSS_ORIGIN || FORCE_BEACON);

    try {
      if (canUseBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const ok = navigator.sendBeacon(API_URL, blob);
        if (ok) {
          if (DEBUG) { try { console.log("[CavBot] Transport: beacon batch", records.length); } catch {} }
          return Promise.resolve(true);
        }
      }
    } catch {}

    try {
      if (DEBUG) { try { console.log("[CavBot] Transport: fetch batch", { n: records.length, crossOrigin: IS_CROSS_ORIGIN }); } catch {} }

      return fetch(API_URL, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          "X-Project-Key": PROJECT_KEY,
          "X-Cavbot-Sdk-Version": SDK_VERSION,
          "X-Cavbot-Env": ENV,
          "X-Cavbot-Site-Host": (function(){ try { return location.host || ""; } catch { return ""; } })(),
          "X-Cavbot-Site-Origin": (function(){ try { return location.origin || ""; } catch { return ""; } })(),
          "X-Cavbot-Site-Public-Id": (SITE_PUBLIC_ID ? safeString(SITE_PUBLIC_ID, 220) : "")
        },
        body: JSON.stringify(payload),
        keepalive: true
      })
        .then((resp) => !!(resp && resp.ok))
        .catch(() => false);
    } catch { return Promise.resolve(false); }
  }

  async function flushQueue() {
    if (analyticsDisabled()) return;

    const q = readQueue();
    if (!q.length) return;

    const remaining = [];
    for (let i = 0; i < q.length; i += BATCH_SIZE) {
      const chunk = q.slice(i, i + BATCH_SIZE);
      const ok = await postBatch(chunk);
      if (!ok) remaining.push.apply(remaining, chunk);
    }
    writeQueue(remaining);
  }

  function sendEvent(eventName, payload, overrides) {
    const record = buildEventRecord(eventName, payload, overrides);
    enqueue(record);
    flushQueue();
    return Promise.resolve();
  }

  // ---------------------------
  // Public API
  // ---------------------------
  function track(eventName, payload, overrides) {
    return sendEvent(eventName, payload, overrides);
  }

  function track404(eventName, payload, overrides) {
    const o = overrides || {};
    return track(eventName, payload, {
      ...o,
      pageType: o.pageType || "404-control-room",
      component: o.component || "404-game"
    });
  }

  function trackConsole(eventName, payload, overrides) {
    const o = overrides || {};
    return track(eventName, payload, {
      ...o,
      pageType: o.pageType || "cavcore-console",
      component: o.component || "cavcore-console-shell"
    });
  }

  // ---------------------------
  // Error fingerprint + dedupe
  // ---------------------------
  const __errorSeen = new Set();

  function trackError(kind, details, overrides) {
    const d = details || {};
    const base = {
      kind: kind || "manual",
      message: safeString(d.message || null, 360),
      fileName: safeString(d.fileName || null, 360),
      line: (typeof d.line === "number" ? d.line : null),
      column: (typeof d.column === "number" ? d.column : null),
      stack: d.stack ? safeString(String(d.stack), MAX_STACK) : null
    };

    const fpSource =
      (base.kind || "") + "|" +
      (base.message || "") + "|" +
      (base.fileName || "") + "|" +
      String(base.line || "") + "|" +
      String(base.column || "");
    const fingerprint = hashString(fpSource);

    const seenKey = getSessionKey() + ":" + fingerprint;
    if (__errorSeen.has(seenKey)) return Promise.resolve();
    __errorSeen.add(seenKey);

    return track("cavbot_js_error", { ...base, fingerprint }, overrides);
  }

  // ---------------------------
  // SEO + Page view
  // ---------------------------
  function sendPageView(customOverrides) {
    try {
      const seo = {
        title: document.title || "",
        metaDescription: readMetaTag("description") || "",
        canonicalUrl: readCanonical() || ""
      };
      const robots = readRobotsFlags();
      const structure = readStructureSnapshot();

      let brainScan = null;
      try {
        if (window.cavbotBrain && typeof window.cavbotBrain.scanPage === "function") {
          brainScan = window.cavbotBrain.scanPage();
        }
      } catch {}

      const o = customOverrides || {};
      track("cavbot_page_view", { seo, robots, structure, brainScan }, { component: "page-shell", ...o });
    } catch {}
  }

  // ---------------------------
  // SPA route tracking
  // ---------------------------
  let __lastRoute = null;

  function currentRoute() {
    try { return location.pathname + location.search; } catch { return ""; }
  }

  function handleRouteChange(reason) {
    const r = currentRoute();
    if (r && r === __lastRoute) return;
    __lastRoute = r;

    resetScrollDepthState();
    resetEngagementState();

    sendPageView({ routePath: location.pathname, pageUrl: location.href, _reason: reason || "route" });
    track("cavbot_route_change", { reason: reason || "route" }, { component: "page-shell" }).catch(() => {});

    scheduleA11yAudit("route");
  }

  function installSpaHooks() {
    try {
      __lastRoute = currentRoute();

      const push = history.pushState;
      const replace = history.replaceState;

      if (!history.__cavbotPatched) {
        history.__cavbotPatched = true;

        history.pushState = function () {
          const ret = push.apply(this, arguments);
          setTimeout(() => handleRouteChange("pushState"), 0);
          return ret;
        };

        history.replaceState = function () {
          const ret = replace.apply(this, arguments);
          setTimeout(() => handleRouteChange("replaceState"), 0);
          return ret;
        };

        window.addEventListener("popstate", function () { handleRouteChange("popstate"); });
      }
    } catch {}
  }

  // ---------------------------
  // Web vitals (TTFB fixed)
  // ---------------------------
  (function initWebVitals() {
    if (typeof performance === "undefined") return;

    const perfPayload = { lcpMs: null, cls: 0, ttfbMs: null };

    try {
      const navEntries = performance.getEntriesByType("navigation");
      const nav = navEntries && navEntries[0];
      if (nav) {
        const rs = typeof nav.responseStart === "number" ? nav.responseStart : null;
        const rq = typeof nav.requestStart === "number" ? nav.requestStart : null;
        if (rs != null && rq != null && rs >= rq) perfPayload.ttfbMs = Math.round(rs - rq);
        else if (rs != null) perfPayload.ttfbMs = Math.round(rs);
      }
    } catch {}

    try {
      if ("PerformanceObserver" in window) {
        let lcpValue = null;

        const lcpObserver = new PerformanceObserver(function (entryList) {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) lcpValue = lastEntry.renderTime || lastEntry.loadTime || lcpValue;
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

        let clsValue = 0;
        const clsObserver = new PerformanceObserver(function (entryList) {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });

        window.addEventListener("load", function () {
          setTimeout(function () {
            perfPayload.lcpMs = lcpValue != null ? Math.round(lcpValue) : null;
            perfPayload.cls = Number(clsValue.toFixed(4));

            track("cavbot_web_vitals", perfPayload, {
              component: (document.body && document.body.getAttribute("data-cavbot-component")) || "page-shell"
            });

            try { lcpObserver.disconnect(); clsObserver.disconnect(); } catch {}
          }, 0);
        }, { once: true });
      }
    } catch {}
  })();

  // ---------------------------
  // Error + rejection tracking
  // ---------------------------
  (function installErrorTracking() {
    try {
      window.addEventListener("error", function (event) {
        try {
          trackError("window_error", {
            message: event.message || null,
            fileName: event.filename || null,
            line: event.lineno || null,
            column: event.colno || null,
            stack: event.error && event.error.stack ? String(event.error.stack).slice(0, MAX_STACK) : null
          });
        } catch {}
      });

      window.addEventListener("unhandledrejection", function (event) {
        try {
          const reason = event.reason || {};
          trackError("unhandled_rejection", {
            message: reason && reason.message ? String(reason.message) : null,
            stack: reason && reason.stack ? String(reason.stack).slice(0, MAX_STACK) : null
          });
        } catch {}
      });
    } catch {}
  })();

  // ---------------------------
  // API error intelligence (fetch wrapper)
  // ---------------------------
  (function installFetchWrapper() {
    try {
      if (!window.fetch) return;
      if (window.fetch.__cavbotWrapped) return;

      const origFetch = window.fetch;

      function wrappedFetch(input, init) {
        const start = nowMs();
        let method = "GET";
        try { method = (init && init.method) ? String(init.method).toUpperCase() : "GET"; } catch {}
        const urlPath = safeUrlPath(input && input.url ? input.url : input);

        return origFetch.apply(this, arguments)
          .then(function (resp) {
            try {
              if (!chance(SAMPLE.apiError)) return resp;
              const dur = Math.max(0, Math.round(nowMs() - start));
              const status = resp && typeof resp.status === "number" ? resp.status : null;
              if (status != null && status >= 400) {
                track("cavbot_api_error", {
                  kind: "fetch",
                  method,
                  urlPath,
                  status,
                  durationMs: dur
                }, { component: "network" }).catch(() => {});
              }
            } catch {}
            return resp;
          })
          .catch(function (err) {
            try {
              if (chance(SAMPLE.apiError)) {
                const dur = Math.max(0, Math.round(nowMs() - start));
                track("cavbot_api_error", {
                  kind: "fetch_exception",
                  method,
                  urlPath,
                  status: null,
                  durationMs: dur,
                  message: safeString(err && err.message ? err.message : "fetch_failed", 260)
                }, { component: "network" }).catch(() => {});
              }
            } catch {}
            throw err;
          });
      }

      wrappedFetch.__cavbotWrapped = true;
      window.fetch = wrappedFetch;
      window.fetch.__cavbotWrapped = true;
    } catch {}
  })();

  // ---------------------------
  // Scroll depth
  // ---------------------------
  let __scrollFired = null;

  function resetScrollDepthState() {
    __scrollFired = { 25: false, 50: false, 75: false, 90: false };
  }

  function getScrollPercent() {
    try {
      const doc = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || doc.scrollTop || (body && body.scrollTop) || 0;
      const scrollHeight = (doc && doc.scrollHeight) || (body && body.scrollHeight) || 0;
      const clientHeight = (doc && doc.clientHeight) || window.innerHeight || 1;
      const denom = Math.max(1, scrollHeight - clientHeight);
      return Math.max(0, Math.min(100, (scrollTop / denom) * 100));
    } catch { return 0; }
  }

  function installScrollDepth() {
    try {
      if (!chance(SAMPLE.scrollDepth)) return;
      if (window.__cavbotScrollDepthBound) return;
      window.__cavbotScrollDepthBound = true;

      resetScrollDepthState();

      let ticking = false;

      function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          const pct = getScrollPercent();
          const marks = [25, 50, 75, 90];

          for (let i = 0; i < marks.length; i++) {
            const m = marks[i];
            if (!__scrollFired[m] && pct >= m) {
              __scrollFired[m] = true;
              track("cavbot_scroll_depth", { percent: m }, { component: "page-shell" }).catch(() => {});
            }
          }
        });
      }

      window.addEventListener("scroll", onScroll, { passive: true });
    } catch {}
  }

  // ---------------------------
  // Engagement ping
  // ---------------------------
  let __engagement = null;

  function resetEngagementState() {
    __engagement = { seconds: 0, sent: 0 };
  }

  function installEngagementPing() {
    try {
      if (!chance(SAMPLE.engagementPing)) return;
      if (window.__cavbotEngagementBound) return;
      window.__cavbotEngagementBound = true;

      resetEngagementState();

      const PING_EVERY_S = 15;
      const MAX_PINGS = 8;

      function canPing() {
        try {
          if (document.visibilityState && document.visibilityState !== "visible") return false;
        } catch {}
        return true;
      }

      const timer = setInterval(function () {
        try {
          if (!__engagement) return;
          if (__engagement.sent >= MAX_PINGS) { clearInterval(timer); return; }
          if (!canPing()) return;

          __engagement.seconds += PING_EVERY_S;
          __engagement.sent += 1;

          track("cavbot_engagement_ping", {
            seconds: __engagement.seconds,
            ping: __engagement.sent
          }, { component: "page-shell" }).catch(() => {});
        } catch {}
      }, PING_EVERY_S * 1000);
    } catch {}
  }

  // ---------------------------
  // CTA click tracking
  // ---------------------------
  function closestCtaEl(el) {
    try {
      if (!el) return null;
      return el.closest('[data-cavbot-cta], a, button, [role="button"], input[type="submit"], input[type="button"]');
    } catch { return null; }
  }

  function ctaPayloadFromEl(el) {
    try {
      if (!el) return null;

      const tag = el.tagName ? String(el.tagName).toLowerCase() : null;

      const isLink = tag === "a";
      const rawHref = isLink ? (el.getAttribute("href") || "") : "";
      const hrefPath = isLink ? safeUrlPath(rawHref) : null;

      const ctaId = el.getAttribute("data-cavbot-cta") || el.id || null;

      const aria = safeString(el.getAttribute("aria-label") || "", 120);
      const title = safeString(el.getAttribute("title") || "", 120);

      let label = "";
      try {
        const raw = (el.textContent || "").trim().replace(/\s+/g, " ");
        label = raw && raw.length <= 40 ? raw : "";
      } catch {}

      return {
        ctaId: ctaId ? safeString(ctaId, 120) : null,
        hrefPath: hrefPath || null,
        ariaLabel: aria || null,
        title: title || null,
        label: label || null,
        tag
      };
    } catch { return null; }
  }

  function installCtaClicks() {
    try {
      if (!chance(SAMPLE.ctaClick)) return;
      if (window.__cavbotCtaBound) return;
      window.__cavbotCtaBound = true;

      document.addEventListener("click", function (e) {
        try {
          const el = closestCtaEl(e.target);
          if (!el) return;

          const href = (el.tagName && el.tagName.toLowerCase() === "a") ? String(el.getAttribute("href") || "") : "";
          if (href && (href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0)) return;

          const payload = ctaPayloadFromEl(el);
          if (!payload) return;

          track("cavbot_cta_click", payload, { component: "interaction" }).catch(() => {});
        } catch {}
      }, { passive: true });
    } catch {}
  }

  // ---------------------------
  // Form submits (NO values)
  // ---------------------------
  function installFormSubmits() {
    try {
      if (!chance(SAMPLE.formSubmit)) return;
      if (window.__cavbotFormsBound) return;
      window.__cavbotFormsBound = true;

      document.addEventListener("submit", function (e) {
        try {
          const form = e.target;
          if (!form || !form.tagName || form.tagName.toLowerCase() !== "form") return;

          const action = safeUrlPath(form.getAttribute("action") || "");
          const method = safeString((form.getAttribute("method") || "GET").toUpperCase(), 12);

          const payload = {
            formId: form.getAttribute("data-cavbot-form") || form.id || null,
            formName: form.getAttribute("name") || null,
            actionPath: action || null,
            method,
            fieldsCount: (form.elements && typeof form.elements.length === "number") ? form.elements.length : null
          };

          track("cavbot_form_submit", payload, { component: "forms" }).catch(() => {});
        } catch {}
      }, { passive: true });
    } catch {}
  }

  // ============================================================
  // A11y Copilot (safe audits + hashed fingerprints)
  // ============================================================
  function domFingerprint(el, extra) {
    try {
      if (!el) return "h0";
      let depth = 0;
      let parts = [];
      let cur = el;
      while (cur && cur.nodeType === 1 && depth < 4) {
        const tag = (cur.tagName || "").toLowerCase();
        let nth = "";
        try {
          const parent = cur.parentNode;
          if (parent && parent.children) {
            let idx = 0;
            for (let i = 0; i < parent.children.length; i++) {
              if (parent.children[i] === cur) { idx = i + 1; break; }
            }
            nth = idx ? (":nth-child(" + idx + ")") : "";
          }
        } catch {}
        parts.push(tag + nth);
        cur = cur.parentNode;
        depth++;
      }
      const seed = parts.join(">") + "|" + safeString(extra || "", 180);
      return hashString(seed);
    } catch { return "h0"; }
  }

  function getTextFromIdRef(id) {
    try {
      const el = document.getElementById(id);
      if (!el) return "";
      return (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 180);
    } catch { return ""; }
  }

  function hasAccessibleName(el) {
    try {
      if (!el) return false;

      const tag = (el.tagName || "").toLowerCase();
      const type = tag === "input" ? (String(el.getAttribute("type") || "").toLowerCase()) : "";

      const aria = (el.getAttribute("aria-label") || "").trim();
      if (aria) return true;

      const labelledby = (el.getAttribute("aria-labelledby") || "").trim();
      if (labelledby) {
        const ids = labelledby.split(/\s+/).filter(Boolean);
        for (let i = 0; i < ids.length; i++) {
          const t = getTextFromIdRef(ids[i]);
          if (t) return true;
        }
      }

      const title = (el.getAttribute("title") || "").trim();
      if (title) return true;

      if (tag === "input" && (type === "button" || type === "submit" || type === "reset")) {
        const v = (el.getAttribute("value") || "").trim();
        if (v) return true;
      }

      if (tag === "input" && type === "image") {
        const alt = (el.getAttribute("alt") || "").trim();
        if (alt) return true;
      }

      const txt = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (txt) return true;

      return false;
    } catch { return true; }
  }

  function isHiddenOrInert(el) {
    try {
      if (!el) return true;

      const ah = el.closest('[aria-hidden="true"]');
      if (ah) return true;

      const inertHost = el.closest("[inert]");
      if (inertHost) return true;

      const hiddenHost = el.closest("[hidden]");
      if (hiddenHost) return true;

      const cs = window.getComputedStyle(el);
      if (!cs) return false;
      if (cs.display === "none" || cs.visibility === "hidden") return true;

      return false;
    } catch { return false; }
  }

  function isFocusable(el) {
    try {
      if (!el || el.nodeType !== 1) return false;
      const tag = (el.tagName || "").toLowerCase();

      if (el.hasAttribute("disabled")) return false;
      if (isHiddenOrInert(el)) return false;

      const tabIndex = el.getAttribute("tabindex");
      if (tabIndex != null && tabIndex !== "") {
        const ti = parseInt(tabIndex, 10);
        if (!isNaN(ti) && ti >= 0) return true;
      }

      if (tag === "a") return !!el.getAttribute("href");
      if (tag === "button") return true;
      if (tag === "input") {
        const type = String(el.getAttribute("type") || "text").toLowerCase();
        return type !== "hidden";
      }
      if (tag === "select" || tag === "textarea") return true;

      if (el.getAttribute("role") === "button") return true;

      return false;
    } catch { return false; }
  }

  function isImageDecorative(img) {
    try {
      if (!img) return true;
      const role = String(img.getAttribute("role") || "").toLowerCase();
      if (role === "presentation" || role === "none") return true;
      if (img.getAttribute("aria-hidden") === "true") return true;
      return false;
    } catch { return false; }
  }

  function auditAltText(maxSamples) {
    const issues = [];
    let missing = 0;
    let empty = 0;

    try {
      const imgs = document.querySelectorAll("img");
      const cap = Math.min(imgs.length, A11Y.maxNodes);

      for (let i = 0; i < cap; i++) {
        const img = imgs[i];
        if (!img || isImageDecorative(img)) continue;

        const altAttr = img.getAttribute("alt");
        if (altAttr == null) {
          missing += 1;
          if (issues.length < maxSamples) {
            issues.push({ kind: "img_missing_alt", fp: domFingerprint(img, safeUrlPath(img.getAttribute("src") || "")) });
          }
        } else {
          const alt = String(altAttr).trim();
          if (!alt) {
            empty += 1;
            if (issues.length < maxSamples) {
              issues.push({ kind: "img_empty_alt", fp: domFingerprint(img, safeUrlPath(img.getAttribute("src") || "")) });
            }
          }
        }
      }
    } catch {}

    return { missingAlt: missing, emptyAlt: empty, samples: issues };
  }

  function auditInteractiveNames(maxSamples) {
    const issues = [];
    let missingName = 0;

    try {
      const nodes = document.querySelectorAll("a[href], button, [role='button'], input[type='button'], input[type='submit'], input[type='reset'], input[type='image']");
      const cap = Math.min(nodes.length, A11Y.maxNodes);

      for (let i = 0; i < cap; i++) {
        const el = nodes[i];
        if (!el || isHiddenOrInert(el)) continue;

        if (!hasAccessibleName(el)) {
          missingName += 1;
          if (issues.length < maxSamples) {
            const tag = (el.tagName || "").toLowerCase();
            const role = safeString(el.getAttribute("role") || "", 40);
            issues.push({
              kind: "interactive_missing_name",
              fp: domFingerprint(el, tag + "|" + role)
            });
          }
        }
      }
    } catch {}

    return { missingName, samples: issues };
  }

  function auditFormLabels(maxSamples) {
    const issues = [];
    let missingLabel = 0;

    try {
      const fields = document.querySelectorAll("input, select, textarea");
      const cap = Math.min(fields.length, A11Y.maxNodes);

      for (let i = 0; i < cap; i++) {
        const el = fields[i];
        if (!el) continue;

        const tag = (el.tagName || "").toLowerCase();
        const type = tag === "input" ? String(el.getAttribute("type") || "text").toLowerCase() : "";
        if (type === "hidden") continue;
        if (isHiddenOrInert(el)) continue;
        if (el.hasAttribute("disabled")) continue;

        const aria = (el.getAttribute("aria-label") || "").trim();
        if (aria) continue;

        const labelledby = (el.getAttribute("aria-labelledby") || "").trim();
        if (labelledby) {
          const ids = labelledby.split(/\s+/).filter(Boolean);
          let ok = false;
          for (let j = 0; j < ids.length; j++) {
            if (getTextFromIdRef(ids[j])) { ok = true; break; }
          }
          if (ok) continue;
        }

        try {
          if (el.labels && el.labels.length > 0) continue;
        } catch {}

        const id = (el.getAttribute("id") || "").trim();
        if (id) {
          const lab = document.querySelector('label[for="' + cssEscapeSafe(id) + '"]');
          if (lab && (lab.textContent || "").trim()) continue;
        }

        missingLabel += 1;
        if (issues.length < maxSamples) {
          issues.push({
            kind: "field_missing_label",
            fp: domFingerprint(el, tag + "|" + type)
          });
        }
      }
    } catch {}

    return { missingLabel, samples: issues };
  }

  function auditDocumentBasics(maxSamples) {
    const issues = [];
    let missingLang = 0;
    let multipleH1 = 0;
    let skippedHeadingLevels = 0;
    let missingSkipLink = 0;

    try {
      const lang = (document.documentElement && document.documentElement.getAttribute("lang")) || "";
      if (!String(lang).trim()) {
        missingLang = 1;
        issues.push({ kind: "doc_missing_lang", fp: hashString("doc|lang") });
      }

      const h1s = document.querySelectorAll("h1");
      if (h1s && h1s.length > 1) {
        multipleH1 = h1s.length;
        issues.push({ kind: "doc_multiple_h1", fp: hashString("doc|h1|" + String(h1s.length)) });
      }

      try {
        const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
        let last = 0;
        const cap = Math.min(headings.length, A11Y.maxNodes);
        for (let i = 0; i < cap; i++) {
          const t = String(headings[i].tagName || "").toLowerCase();
          const lvl = parseInt(t.replace("h", ""), 10);
          if (!isNaN(lvl)) {
            if (last && lvl > last + 1) { skippedHeadingLevels += 1; break; }
            last = lvl;
          }
        }
        if (skippedHeadingLevels) {
          issues.push({ kind: "doc_heading_skip", fp: hashString("doc|heading_skip") });
        }
      } catch {}

      try {
        const links = document.querySelectorAll("a[href^='#']");
        let found = false;
        const cap = Math.min(links.length, 120);
        for (let i = 0; i < cap; i++) {
          const a = links[i];
          const txt = (a.textContent || "").trim().toLowerCase();
          const aria = (a.getAttribute("aria-label") || "").trim().toLowerCase();
          if (txt.includes("skip") || aria.includes("skip")) { found = true; break; }
        }
        if (!found) {
          missingSkipLink = 1;
          issues.push({ kind: "doc_missing_skip_link", fp: hashString("doc|skiplink") });
        }
      } catch {}

      if (issues.length > maxSamples) issues.length = maxSamples;
    } catch {}

    return {
      missingLang,
      multipleH1,
      skippedHeadingLevels,
      missingSkipLink,
      samples: issues
    };
  }

  // --- Contrast helpers ---
  function parseRgb(str) {
    try {
      const s = String(str || "").trim();
      if (!s) return null;

      const m = s.match(/^rgba?\s*\(([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*$/i);
      if (m) {
        const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
        const a = (m[4] != null) ? Number(m[4]) : 1;
        if ([r, g, b, a].some(v => !isFinite(v))) return null;
        return { r, g, b, a };
      }

      const hx = s.replace("#", "");
      if (hx.length === 3) {
        const r = parseInt(hx[0] + hx[0], 16);
        const g = parseInt(hx[1] + hx[1], 16);
        const b = parseInt(hx[2] + hx[2], 16);
        return { r, g, b, a: 1 };
      }
      if (hx.length === 6) {
        const r = parseInt(hx.slice(0, 2), 16);
        const g = parseInt(hx.slice(2, 4), 16);
        const b = parseInt(hx.slice(4, 6), 16);
        return { r, g, b, a: 1 };
      }

      return null;
    } catch { return null; }
  }

  function srgbToLin(v) {
    const x = v / 255;
    return (x <= 0.03928) ? (x / 12.92) : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  function relLum(rgb) {
    const r = srgbToLin(rgb.r);
    const g = srgbToLin(rgb.g);
    const b = srgbToLin(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(fg, bg) {
    try {
      const L1 = relLum(fg);
      const L2 = relLum(bg);
      const lighter = Math.max(L1, L2);
      const darker = Math.min(L1, L2);
      return (lighter + 0.05) / (darker + 0.05);
    } catch { return null; }
  }

  function effectiveBackgroundColor(el) {
    try {
      let cur = el;
      let depth = 0;

      while (cur && cur.nodeType === 1 && depth < 8) {
        const cs = window.getComputedStyle(cur);
        if (!cs) break;

        const bg = parseRgb(cs.backgroundColor);
        if (bg && bg.a != null && bg.a > 0.05) return bg;

        cur = cur.parentNode;
        depth++;
      }

      return { r: 255, g: 255, b: 255, a: 1 };
    } catch {
      return { r: 255, g: 255, b: 255, a: 1 };
    }
  }

  function isLargeText(cs) {
    try {
      const sizePx = parseFloat(String(cs.fontSize || "16"));
      const weight = parseInt(String(cs.fontWeight || "400"), 10);
      const bold = isFinite(weight) ? (weight >= 700) : false;

      if (sizePx >= 24) return true;
      if (bold && sizePx >= 18.66) return true;
      return false;
    } catch { return false; }
  }

  function auditContrast(maxSamples) {
    const issues = [];
    let lowContrastCount = 0;
    let worstRatio = null;

    try {
      const nodes = document.querySelectorAll("p, li, a, button, label, h1, h2, h3, h4, h5, h6, span");
      const cap = Math.min(nodes.length, A11Y.contrastNodeCap);

      for (let i = 0; i < cap; i++) {
        const el = nodes[i];
        if (!el || isHiddenOrInert(el)) continue;

        const txt = (el.textContent || "").trim();
        if (!txt) continue;

        const cs = window.getComputedStyle(el);
        if (!cs) continue;

        const fg = parseRgb(cs.color);
        if (!fg) continue;

        const bg = effectiveBackgroundColor(el);
        const ratio = contrastRatio(fg, bg);
        if (ratio == null) continue;

        const large = isLargeText(cs);
        const min = large ? 3.0 : 4.5;

        if (ratio < min) {
          lowContrastCount += 1;
          if (worstRatio == null || ratio < worstRatio) worstRatio = ratio;

          if (issues.length < maxSamples) {
            issues.push({
              kind: "text_low_contrast",
              ratio: Number(ratio.toFixed(2)),
              fp: domFingerprint(el, "contrast|" + String(min))
            });
          }
        }
      }
    } catch {}

    return { lowContrastCount, worstRatio: worstRatio != null ? Number(worstRatio.toFixed(2)) : null, samples: issues };
  }

  function auditFocusHygiene() {
    let focusableCount = 0;
    let positiveTabIndexCount = 0;
    let focusableInsideAriaHidden = 0;
    let focusableInsideInert = 0;

    try {
      const all = document.querySelectorAll("*");
      const cap = Math.min(all.length, 900);

      for (let i = 0; i < cap; i++) {
        const el = all[i];
        if (!isFocusable(el)) continue;

        focusableCount += 1;

        const tabindex = el.getAttribute("tabindex");
        if (tabindex != null) {
          const ti = parseInt(tabindex, 10);
          if (!isNaN(ti) && ti > 0) positiveTabIndexCount += 1;
        }

        try {
          if (el.closest('[aria-hidden="true"]')) focusableInsideAriaHidden += 1;
          if (el.closest("[inert]")) focusableInsideInert += 1;
        } catch {}
      }
    } catch {}

    return {
      focusableCount,
      positiveTabIndexCount,
      focusableInsideAriaHidden,
      focusableInsideInert
    };
  }

  let __a11yLastAuditRoute = null;

  function runA11yAudit(reason) {
    if (a11yDisabled()) return;

    try {
      const route = currentRoute();
      __a11yLastAuditRoute = route;

      const alt = auditAltText(A11Y.maxSamplesPerType);
      const names = auditInteractiveNames(A11Y.maxSamplesPerType);
      const labels = auditFormLabels(A11Y.maxSamplesPerType);
      const doc = auditDocumentBasics(A11Y.maxSamplesPerType);

      let contrast = null;
      if (chance(SAMPLE.contrastAudit)) contrast = auditContrast(A11Y.maxSamplesPerType);

      let focus = null;
      if (chance(SAMPLE.focusSignals)) focus = auditFocusHygiene();

      const a11ySummary = {
        reason: safeString(reason || "page", 40),

        missingAlt: alt.missingAlt,
        emptyAlt: alt.emptyAlt,
        interactiveMissingName: names.missingName,
        fieldsMissingLabel: labels.missingLabel,

        docMissingLang: doc.missingLang,
        docMultipleH1: doc.multipleH1,
        docHeadingSkip: doc.skippedHeadingLevels,
        docMissingSkipLink: doc.missingSkipLink,

        lowContrastTextCount: contrast ? contrast.lowContrastCount : null,
        worstContrastRatio: contrast ? contrast.worstRatio : null,

        focusableCount: focus ? focus.focusableCount : null,
        positiveTabIndexCount: focus ? focus.positiveTabIndexCount : null,
        focusableInsideAriaHidden: focus ? focus.focusableInsideAriaHidden : null,
        focusableInsideInert: focus ? focus.focusableInsideInert : null
      };

      const samples = []
        .concat(alt.samples || [])
        .concat(names.samples || [])
        .concat(labels.samples || [])
        .concat(doc.samples || [])
        .concat((contrast && contrast.samples) ? contrast.samples : []);

      track("cavbot_a11y_audit", {
        a11y: a11ySummary,
        samples: samples.slice(0, 50)
      }, { component: "a11y-copilot" }).catch(() => {});

      track("cavbot_guardian_snapshot", {
        seo: {
          titleLen: clampInt((document.title || "").length, 0, 300),
          hasMetaDescription: !!readMetaTag("description"),
          hasCanonical: !!readCanonical(),
          robots: readRobotsFlags()
        },
        structure: readStructureSnapshot(),
        a11y: a11ySummary
      }, { component: "guardian" }).catch(() => {});

      if (DEBUG) {
        try { console.log("[CavBot] A11y audit:", a11ySummary, samples); } catch {}
      }
    } catch {}
  }

  function scheduleA11yAudit(reason) {
    if (a11yDisabled()) return;
    if (!chance(SAMPLE.a11yAudit)) return;

    try {
      const route = currentRoute();
      if (__a11yLastAuditRoute && route === __a11yLastAuditRoute) return;
    } catch {}

    setTimeout(function () {
      onIdle(function () { runA11yAudit(reason || "page"); }, 950);
    }, A11Y.auditDelayMs);
  }

  // ---------------------------
  // Focus telemetry (light)
  // ---------------------------
  function installFocusTelemetry() {
    try {
      if (window.__cavbotFocusBound) return;
      window.__cavbotFocusBound = true;

      let focusEvents = 0;
      let firstKeyboardFocusMs = null;
      let sawKeyboard = false;

      function onKeydown(e) {
        try {
          const k = e && e.key ? String(e.key) : "";
          if (k === "Tab" || k === "ArrowDown" || k === "ArrowUp" || k === "ArrowLeft" || k === "ArrowRight") {
            sawKeyboard = true;
          }
        } catch {}
      }

      function onFocusIn() {
        try {
          focusEvents += 1;
          if (sawKeyboard && firstKeyboardFocusMs == null) {
            firstKeyboardFocusMs = Date.now();
          }
        } catch {}
      }

      window.addEventListener("keydown", onKeydown, { passive: true });
      document.addEventListener("focusin", onFocusIn, { passive: true });

      window.addEventListener("load", function () {
        try {
          track("cavbot_focus_signals", {
            focusEvents: focusEvents,
            firstKeyboardFocusMs: firstKeyboardFocusMs,
            sawKeyboard: sawKeyboard ? 1 : 0
          }, { component: "a11y-copilot" }).catch(() => {});
        } catch {}
      }, { once: true });
    } catch {}
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    try {
      sendPageView();
      installSpaHooks();

      installScrollDepth();
      installEngagementPing();
      installCtaClicks();
      installFormSubmits();

      installFocusTelemetry();
      scheduleA11yAudit("page");

      __lastRoute = currentRoute();

      if (DEBUG) {
        try {
          console.log("[CavBot] Boot", {
            sdk: SDK_VERSION,
            env: ENV,
            api: API_URL,
            apiOrigin: API_ORIGIN,
            pageOrigin: PAGE_ORIGIN,
            crossOrigin: IS_CROSS_ORIGIN,
            beaconDisabled: DISABLE_BEACON,
            forceBeacon: FORCE_BEACON,
            site: siteContext()
          });
        } catch {}
      }
    } catch {}
  }

  // ---------------------------
  // Manual tools
  // ---------------------------
  function report() {
    try {
      const robots = readRobotsFlags();
      const structure = readStructureSnapshot();
      const seo = {
        title: document.title || "",
        metaDescription: readMetaTag("description") || "",
        canonicalUrl: readCanonical() || ""
      };

      const a11y = (function () {
        if (a11yDisabled()) return { disabled: true };
        const alt = auditAltText(6);
        const names = auditInteractiveNames(6);
        const labels = auditFormLabels(6);
        const doc = auditDocumentBasics(6);
        const contrast = auditContrast(6);
        const focus = auditFocusHygiene();
        return { disabled: false, alt, names, labels, doc, contrast, focus };
      })();

      const out = { seo, robots, structure, a11y, sdk: SDK_VERSION, env: ENV, site: siteContext() };
      try { console.log("[CavBot] Report:", out); } catch {}
      return out;
    } catch { return null; }
  }

  function runAuditNow(reason) {
    try { runA11yAudit(reason || "manual"); } catch {}
  }

  // Keep global name the same
  window.cavbotAnalytics = {
    track,
    track404,
    trackConsole,
    trackError,
    flush: flushQueue,
    getBaseContext,
    report,
    runAuditNow
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(boot, 80);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 80);
    }, { once: true });
  }

  // Flush on visibility change / pagehide
  try {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushQueue();
    });
    window.addEventListener("pagehide", function () { flushQueue(); });
  } catch {}

})();