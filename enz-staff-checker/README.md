# Enz Staff Checker — 2026

A lightweight web tool for staff teams to validate cookies against an API endpoint
and classify each one as **valid**, **bad**, **expired**, or **error**.

## Features

- Clean, modern 2026 UI (dark theme, responsive)
- Paste a list of cookies (one per line) and point them at any API endpoint
- Runs checks in parallel on the server (configurable concurrency)
- Classifies responses using status codes + body heuristics
- Filter / export results (copy valid, download JSON)
- Simple JSON HTTP API for scripted use

## Run locally

```bash
cd enz-staff-checker
npm install
npm start
```

Then open http://localhost:3000

## HTTP API

```
POST /api/check
Content-Type: application/json

{
  "endpoint": "https://api.example.com/v1/me",
  "method": "GET",
  "cookies": ["sessionid=abc", "sessionid=def"],
  "headers": { "X-App": "enz" },
  "timeoutMs": 15000,
  "concurrency": 5
}
```

Response:

```
{
  "ok": true,
  "total": 2,
  "summary": { "valid": 1, "bad": 1, "expired": 0, "error": 0 },
  "results": [
    { "state": "valid", "status": 200, "cookie": "sessio…abc", "elapsedMs": 142 },
    { "state": "bad",   "status": 401, "cookie": "sessio…def", "elapsedMs": 137 }
  ]
}
```

## Notes

- Use responsibly — only on endpoints you own or are authorized to test.
- Cookies are masked in results; raw cookies are never logged.
- Redirects are disabled during probing so `302` to a login page is classified as **bad**.
