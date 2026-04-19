<div align="center">

# Enz Staff Checker

**A 2026 website for checking cookies against API endpoints.**
Classify sessions as **Valid · Bad · Expired** in milliseconds.

</div>

---

## Features

- Single cookie check against any HTTP(S) API endpoint.
- Bulk mode — paste many cookies, one per line, same endpoint.
- Real-time verdicts: **VALID / BAD / EXPIRED / UNKNOWN**.
- Smart classification based on HTTP status, redirect target (e.g. `→ /login`), and well-known response hints (e.g. `session expired`, `401`, `419`, `440`).
- Configurable HTTP method and extra request headers.
- Modern glass-morphism UI designed for 2026.

## Tech stack

- **Node.js 18+** (uses the built-in `fetch`)
- **Express** for the HTTP server
- **Vanilla HTML/CSS/JS** for the UI (no build step required)

## Run locally

```bash
# 1. install dependencies
npm install

# 2. start the server
npm start

# 3. open the UI
#    http://localhost:3000
```

The server listens on `PORT` (default `3000`). Example:

```bash
PORT=8080 npm start
```

## API

### `POST /api/check`

Send a cookie + endpoint, get a verdict back.

Request body:

```json
{
  "endpoint": "https://api.example.com/v1/me",
  "cookie": "session=abc123; auth_token=eyJhbGciOi...",
  "method": "GET",
  "headers": { "X-Client": "enz" }
}
```

Response:

```json
{
  "ok": true,
  "status": 200,
  "statusText": "OK",
  "classification": "valid",
  "elapsedMs": 87,
  "location": null,
  "setCookie": null,
  "preview": "{\"id\":\"u_123\",...}",
  "cookieEcho": "session=abc123"
}
```

`classification` is one of:

| Verdict     | Meaning                                                   |
|-------------|-----------------------------------------------------------|
| `valid`     | 2xx response — cookie is accepted by the endpoint.        |
| `bad`       | 401/403/4xx or body hints like `unauthorized`, `invalid`. |
| `expired`   | 419/440, redirect to `/login`, or body hints like `session expired`. |
| `unknown`   | Anything else (e.g. 5xx or unclassifiable).               |

### `GET /api/health`

Liveness probe:

```json
{ "ok": true, "service": "Enz Staff Checker", "year": 2026 }
```

## Notes

- Only `http` and `https` endpoints are allowed.
- Requests time out after 15 seconds.
- Redirects are captured but not followed, so auth redirects can be classified correctly.

## License

MIT
