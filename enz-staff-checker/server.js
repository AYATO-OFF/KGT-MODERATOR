/*
 * Enz Staff Checker — 2026
 * Web service for validating cookies against arbitrary API endpoints.
 *
 * The checker issues a request to the target endpoint using the supplied
 * cookie string and classifies the response as:
 *   - valid   : authenticated (2xx with no auth-rejection markers)
 *   - expired : authentication expired / session no longer active
 *   - bad     : malformed / rejected / unauthorized cookie
 *   - error   : network or unexpected failure while probing
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_COOKIES_PER_REQUEST = 200;

// Heuristic keywords used to classify response bodies when status codes are
// ambiguous (e.g. APIs that always return 200 and embed an error in JSON).
const EXPIRED_HINTS = [
  'expired', 'session expired', 'token expired', 'session_has_expired',
  'تنتهي', 'انتهت', 'منتهي', 'expiré', 'caducado'
];
const BAD_HINTS = [
  'invalid', 'unauthorized', 'not authenticated', 'not logged in',
  'authentication failed', 'bad cookie', 'forbidden', 'auth required',
  'login required', 'please log in', 'please login', 'access denied',
  'غير مصرح', 'غير صالح'
];
const VALID_HINTS = [
  '"authenticated":true', '"isauthenticated":true', '"loggedin":true',
  '"logged_in":true', '"status":"ok"', '"success":true'
];

function matchesAny(haystack, needles) {
  if (!haystack) return false;
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

function classifyResponse({ status, bodySnippet }) {
  if (status === 401 || status === 407) {
    return matchesAny(bodySnippet, EXPIRED_HINTS) ? 'expired' : 'bad';
  }
  if (status === 403) {
    return matchesAny(bodySnippet, EXPIRED_HINTS) ? 'expired' : 'bad';
  }
  if (status === 419 || status === 440) {
    // Common "session expired" codes (Laravel 419, IIS 440).
    return 'expired';
  }
  if (status >= 500) return 'error';

  if (status >= 200 && status < 300) {
    if (matchesAny(bodySnippet, EXPIRED_HINTS)) return 'expired';
    if (matchesAny(bodySnippet, BAD_HINTS)) return 'bad';
    if (matchesAny(bodySnippet, VALID_HINTS)) return 'valid';
    return 'valid';
  }
  if (status >= 300 && status < 400) {
    // Redirects to a login page usually indicate a rejected cookie.
    return 'bad';
  }
  return 'bad';
}

async function checkOne({ cookie, endpoint, method, extraHeaders, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const headers = {
      'User-Agent': 'EnzStaffChecker/1.0 (+2026)',
      'Accept': '*/*',
      'Cookie': cookie,
      ...(extraHeaders || {})
    };
    const res = await fetch(endpoint, {
      method: method || 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal
    });

    // Pull a bounded slice of the body for keyword matching.
    let bodySnippet = '';
    try {
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          bodySnippet = Buffer.from(value).toString('utf8').slice(0, 2048);
        }
        try { await reader.cancel(); } catch (_) { /* ignore */ }
      } else {
        bodySnippet = (await res.text()).slice(0, 2048);
      }
    } catch (_) {
      bodySnippet = '';
    }

    const status = res.status;
    const state = classifyResponse({ status, bodySnippet });
    return {
      cookie: maskCookie(cookie),
      status,
      state,
      elapsedMs: Date.now() - startedAt,
      snippet: bodySnippet.slice(0, 240)
    };
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return {
      cookie: maskCookie(cookie),
      status: 0,
      state: 'error',
      elapsedMs: Date.now() - startedAt,
      error: aborted ? `timeout after ${timeoutMs}ms` : (err.message || String(err))
    };
  } finally {
    clearTimeout(timer);
  }
}

function maskCookie(cookie) {
  if (!cookie) return '';
  const trimmed = cookie.trim();
  if (trimmed.length <= 18) return trimmed.replace(/.(?=.{4})/g, '*');
  return `${trimmed.slice(0, 10)}…${trimmed.slice(-6)}`;
}

function parseCookiesInput(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean);
  }
  if (typeof raw !== 'string') return [];
  return raw
    .split(/\r?\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !c.startsWith('#'));
}

app.post('/api/check', async (req, res) => {
  try {
    const {
      endpoint,
      method = 'GET',
      cookies,
      headers: extraHeaders = {},
      timeoutMs = DEFAULT_TIMEOUT_MS,
      concurrency = 5
    } = req.body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'endpoint is required' });
    }
    try { new URL(endpoint); } catch { return res.status(400).json({ error: 'invalid endpoint URL' }); }

    const list = parseCookiesInput(cookies);
    if (list.length === 0) {
      return res.status(400).json({ error: 'at least one cookie is required' });
    }
    if (list.length > MAX_COOKIES_PER_REQUEST) {
      return res.status(400).json({ error: `maximum ${MAX_COOKIES_PER_REQUEST} cookies per request` });
    }

    const cap = Math.max(1, Math.min(20, Number(concurrency) || 5));
    const timeout = Math.max(1000, Math.min(60000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));

    const results = new Array(list.length);
    let cursor = 0;
    async function worker() {
      while (true) {
        const idx = cursor++;
        if (idx >= list.length) return;
        results[idx] = await checkOne({
          cookie: list[idx],
          endpoint,
          method: String(method).toUpperCase(),
          extraHeaders,
          timeoutMs: timeout
        });
      }
    }

    const workers = Array.from({ length: cap }, () => worker());
    await Promise.all(workers);

    const summary = results.reduce(
      (acc, r) => { acc[r.state] = (acc[r.state] || 0) + 1; return acc; },
      { valid: 0, bad: 0, expired: 0, error: 0 }
    );

    res.json({
      ok: true,
      endpoint,
      method: String(method).toUpperCase(),
      total: results.length,
      summary,
      results,
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Enz Staff Checker', year: 2026 });
});

app.listen(PORT, () => {
  console.log(`Enz Staff Checker running on http://localhost:${PORT}`);
});
