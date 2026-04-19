/*
 * Enz Staff Checker — server
 *
 * A lightweight Express server that exposes a /api/check endpoint.
 * The endpoint accepts a cookie string (or JSON { name, value } pairs)
 * and an arbitrary API endpoint, performs a request against that
 * endpoint with the cookie attached, and classifies the response as
 *   - valid   : 2xx success
 *   - bad     : 401 / 403 / malformed cookie
 *   - expired : server indicated the session expired
 *   - unknown : anything else
 */

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function classifyResponse(status, bodyText) {
  const body = (bodyText || '').toLowerCase();

  const expiredHints = [
    'expired',
    'session expired',
    'token expired',
    'session timeout',
    'please log in again',
    'session has expired',
  ];
  const badHints = [
    'invalid cookie',
    'invalid token',
    'unauthorized',
    'forbidden',
    'not authenticated',
    'authentication required',
    'invalid session',
  ];

  if (expiredHints.some((h) => body.includes(h))) return 'expired';

  if (status >= 200 && status < 300) return 'valid';
  if (status === 401) {
    if (expiredHints.some((h) => body.includes(h))) return 'expired';
    return 'bad';
  }
  if (status === 403) return 'bad';
  if (status === 419 || status === 440) return 'expired';
  if (badHints.some((h) => body.includes(h))) return 'bad';
  if (status >= 400 && status < 500) return 'bad';

  return 'unknown';
}

function normalizeCookie(input) {
  if (!input) return '';
  if (typeof input === 'string') return input.trim();
  if (Array.isArray(input)) {
    return input
      .map((c) => {
        if (!c) return '';
        if (typeof c === 'string') return c.trim();
        if (c.name && c.value !== undefined) return `${c.name}=${c.value}`;
        return '';
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof input === 'object' && input.name && input.value !== undefined) {
    return `${input.name}=${input.value}`;
  }
  return String(input);
}

app.post('/api/check', async (req, res) => {
  const started = Date.now();
  try {
    const { endpoint, cookie, method = 'GET', headers = {} } = req.body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Missing "endpoint" (string) in request body.',
      });
    }

    let url;
    try {
      url = new URL(endpoint);
    } catch (e) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid endpoint URL.',
      });
    }
    if (!/^https?:$/.test(url.protocol)) {
      return res.status(400).json({
        ok: false,
        error: 'Only http(s) endpoints are supported.',
      });
    }

    const cookieHeader = normalizeCookie(cookie);
    const finalHeaders = {
      'User-Agent':
        'Mozilla/5.0 (compatible; EnzStaffChecker/1.0; +https://enz.local)',
      Accept: 'application/json, text/plain, */*',
      ...headers,
    };
    if (cookieHeader) finalHeaders.Cookie = cookieHeader;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(url.toString(), {
        method: (method || 'GET').toUpperCase(),
        headers: finalHeaders,
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      return res.status(502).json({
        ok: false,
        error: `Request failed: ${err.message || err}`,
      });
    }
    clearTimeout(timeout);

    let text = '';
    try {
      text = await response.text();
    } catch (_) {
      text = '';
    }

    const status = response.status;
    const location = response.headers.get('location') || null;
    const setCookie = response.headers.get('set-cookie') || null;

    let classification = classifyResponse(status, text);

    if (
      classification === 'valid' &&
      location &&
      /login|signin|auth/i.test(location)
    ) {
      classification = 'expired';
    }
    if (
      (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) &&
      location &&
      /login|signin|auth/i.test(location)
    ) {
      classification = 'expired';
    }

    const elapsed = Date.now() - started;

    res.json({
      ok: true,
      status,
      statusText: response.statusText,
      classification,
      elapsedMs: elapsed,
      location,
      setCookie,
      preview: text ? text.slice(0, 600) : '',
      cookieEcho: cookieHeader ? cookieHeader.slice(0, 300) : '',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || 'Internal error',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Enz Staff Checker', year: 2026 });
});

app.listen(PORT, () => {
  console.log(`Enz Staff Checker running on http://localhost:${PORT}`);
});
