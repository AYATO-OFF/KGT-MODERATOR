#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html import escape
from typing import Any


HOST = "0.0.0.0"
PORT = 8000

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enz staff checker</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --panel: rgba(11, 21, 39, 0.92);
      --panel-2: rgba(16, 29, 51, 0.98);
      --border: rgba(148, 163, 184, 0.2);
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #22c55e;
      --valid: #16a34a;
      --bad: #ef4444;
      --expired: #f59e0b;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 30%),
        radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.1), transparent 24%),
        var(--bg);
    }

    .wrap {
      width: min(1100px, calc(100% - 24px));
      margin: 0 auto;
      padding: 24px 0 40px;
    }

    .hero, .panel, .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 18px 40px rgba(2, 6, 23, 0.28);
    }

    .hero {
      padding: 28px;
      margin-bottom: 22px;
    }

    .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #86efac;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.2);
      padding: 8px 12px;
      border-radius: 999px;
    }

    h1 {
      margin: 16px 0 12px;
      font-size: clamp(32px, 7vw, 52px);
    }

    p.lead {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
      max-width: 700px;
    }

    .hero-points {
      margin: 20px 0 0;
      padding-left: 20px;
      color: var(--muted);
      line-height: 1.7;
    }

    .panel {
      padding: 24px;
      margin-bottom: 22px;
    }

    .label {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 14px;
    }

    textarea, input {
      width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.82);
      color: var(--text);
      padding: 14px 16px;
      font-size: 15px;
      outline: none;
    }

    textarea {
      resize: vertical;
      min-height: 150px;
    }

    .field {
      margin-bottom: 18px;
    }

    .actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    button {
      border: 0;
      border-radius: 16px;
      background: linear-gradient(135deg, #22c55e, #4ade80);
      color: #04130a;
      font-weight: bold;
      padding: 14px 18px;
      cursor: pointer;
      font-size: 15px;
    }

    button:disabled {
      opacity: 0.75;
      cursor: progress;
    }

    #statusText {
      color: var(--muted);
      font-size: 14px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .card {
      padding: 22px;
      background: var(--panel-2);
    }

    .section-tag {
      display: inline-block;
      margin-bottom: 10px;
      color: #7dd3fc;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h2, h3 {
      margin: 0 0 14px;
    }

    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 10px 14px;
      font-weight: bold;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(51, 65, 85, 0.7);
      color: var(--text);
    }

    .badge.valid { background: rgba(22, 163, 74, 0.18); color: #86efac; }
    .badge.bad { background: rgba(239, 68, 68, 0.16); color: #fca5a5; }
    .badge.expired { background: rgba(245, 158, 11, 0.18); color: #fcd34d; }
    .badge.waiting { background: rgba(51, 65, 85, 0.7); color: #cbd5e1; }

    .reason {
      margin-top: 14px;
      color: var(--muted);
      line-height: 1.6;
    }

    dl {
      margin: 0;
      display: grid;
      gap: 12px;
    }

    .detail {
      padding: 14px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }

    dt {
      color: var(--muted);
      margin-bottom: 6px;
      font-size: 13px;
    }

    dd {
      margin: 0;
      word-break: break-word;
      line-height: 1.5;
    }

    ul.hints {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
      line-height: 1.7;
    }

    .footer-note {
      margin-top: 16px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }

    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
      .hero, .panel, .card { border-radius: 20px; }
      .wrap { width: min(100% - 16px, 100%); padding-top: 16px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <span class="eyebrow">Pydroid3 friendly</span>
      <h1>Enz staff checker</h1>
      <p class="lead">
        Single-file Python website for checking whether a cookie looks valid, bad, or expired.
        Paste a Cookie header or Set-Cookie line and inspect details locally without extra files.
      </p>
      <ul class="hero-points">
        <li>Runs from one Python file</li>
        <li>No external packages required</li>
        <li>Built for simple use on phone or Pydroid3</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Check cookie</h2>
      <div class="field">
        <label class="label" for="cookieInput">Cookie string</label>
        <textarea id="cookieInput" placeholder="session=abc123456789; Path=/; HttpOnly; Secure; SameSite=Lax"></textarea>
      </div>
      <div class="field">
        <label class="label" for="labelInput">Optional label</label>
        <input id="labelInput" placeholder="Discord login cookie" />
      </div>
      <div class="actions">
        <button id="checkButton" type="button">Check cookie</button>
        <span id="statusText">Waiting for input.</span>
      </div>
      <div class="footer-note">
        This tool performs local structure inspection only. It does not send cookies to external endpoints.
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <span class="section-tag">Verdict</span>
        <h3>Cookie status</h3>
        <div id="verdictBadge" class="badge waiting">Waiting</div>
        <div id="verdictReason" class="reason">Paste a cookie and press the button.</div>
      </article>

      <article class="card">
        <span class="section-tag">Inspection</span>
        <h3>Parsed details</h3>
        <dl id="detailsList">
          <div class="detail">
            <dt>State</dt>
            <dd>No cookie checked yet.</dd>
          </div>
        </dl>
      </article>

      <article class="card">
        <span class="section-tag">Hints</span>
        <h3>Security notes</h3>
        <ul id="hintsList" class="hints">
          <li>No hints yet.</li>
        </ul>
      </article>

      <article class="card">
        <span class="section-tag">Raw</span>
        <h3>Cookie preview</h3>
        <dl id="cookieList">
          <div class="detail">
            <dt>State</dt>
            <dd>No parsed values yet.</dd>
          </div>
        </dl>
      </article>
    </section>
  </div>

  <script>
    const cookieInput = document.getElementById("cookieInput");
    const labelInput = document.getElementById("labelInput");
    const checkButton = document.getElementById("checkButton");
    const statusText = document.getElementById("statusText");
    const verdictBadge = document.getElementById("verdictBadge");
    const verdictReason = document.getElementById("verdictReason");
    const detailsList = document.getElementById("detailsList");
    const hintsList = document.getElementById("hintsList");
    const cookieList = document.getElementById("cookieList");

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function renderPairs(target, pairs) {
      target.innerHTML = pairs.map(([key, value]) => `
        <div class="detail">
          <dt>${escapeHtml(key)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("");
    }

    function maskValue(value) {
      const text = String(value);
      if (text.length <= 10) {
        return text || "(empty)";
      }
      return text.slice(0, 5) + "..." + text.slice(-3);
    }

    async function inspectCookie() {
      checkButton.disabled = true;
      statusText.textContent = "Checking cookie...";

      try {
        const response = await fetch("/api/inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cookie: cookieInput.value,
            label: labelInput.value
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Request failed.");
        }

        verdictBadge.className = "badge " + data.verdict;
        verdictBadge.textContent = String(data.verdict || "waiting").toUpperCase();
        verdictReason.textContent = data.message || "";

        renderPairs(detailsList, [
          ["Label", data.submittedLabel || "Not provided"],
          ["Confidence", data.confidence],
          ["Expires at", data.inspection.expiresAt || "Not provided"],
          ["Expired", data.inspection.expired ? "Yes" : "No"],
          ["Cookies found", String(data.cookie.parsed.length)],
          ["Attributes found", String(data.cookie.attributes.length)]
        ]);

        if (data.inspection.securityHints.length) {
          hintsList.innerHTML = data.inspection.securityHints
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("");
        } else {
          hintsList.innerHTML = "<li>No security hints detected.</li>";
        }

        const cookiePairs = [];
        data.cookie.parsed.forEach((item, index) => {
          cookiePairs.push([`Cookie ${index + 1}`, `${item.name}=${maskValue(item.value)}`]);
        });
        data.cookie.attributes.forEach((item, index) => {
          cookiePairs.push([
            `Attribute ${index + 1}`,
            item.value === true ? item.key : `${item.key}=${item.value}`
          ]);
        });

        if (cookiePairs.length) {
          renderPairs(cookieList, cookiePairs);
        } else {
          renderPairs(cookieList, [["State", "No values detected."]]);
        }

        statusText.textContent = "Inspection complete.";
      } catch (error) {
        verdictBadge.className = "badge bad";
        verdictBadge.textContent = "BAD";
        verdictReason.textContent = error.message || "Unknown error.";
        renderPairs(detailsList, [["Error", error.message || "Unknown error."]]);
        hintsList.innerHTML = "<li>Inspection failed.</li>";
        renderPairs(cookieList, [["State", "No parsed values available."]]);
        statusText.textContent = "Inspection failed.";
      } finally {
        checkButton.disabled = false;
      }
    }

    checkButton.addEventListener("click", inspectCookie);
  </script>
</body>
</html>
"""


COOKIE_ATTRIBUTE_KEYS = {
    "expires",
    "max-age",
    "domain",
    "path",
    "samesite",
    "secure",
    "httponly",
    "priority",
    "partitioned",
}


def split_cookie_parts(value: str) -> list[str]:
    if not value:
        return []

    normalized = value.replace("\r", "\n")
    parts: list[str] = []
    for line in normalized.split("\n"):
        for item in line.split(";"):
            item = item.strip()
            if item:
                parts.append(item)
    return parts


def parse_cookie_input(raw_cookie: str) -> dict[str, Any]:
    cookies: list[dict[str, str]] = []
    attributes: list[dict[str, Any]] = []

    for segment in split_cookie_parts(raw_cookie):
        if "=" not in segment:
            attributes.append({"key": segment, "value": True})
            continue

        key, value = segment.split("=", 1)
        key = key.strip()
        value = value.strip()

        if key.lower() in COOKIE_ATTRIBUTE_KEYS:
            attributes.append({"key": key, "value": value})
        else:
            cookies.append({"name": key, "value": value})

    return {"cookies": cookies, "attributes": attributes}


def attributes_to_object(attributes: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for item in attributes:
      result[str(item["key"]).lower()] = item["value"]
    return result


def parse_expiry(attributes: dict[str, Any], now: datetime) -> datetime | None:
    max_age = attributes.get("max-age")
    if max_age is not None:
        try:
            seconds = int(str(max_age).strip())
            return now + timedelta(seconds=seconds)
        except (TypeError, ValueError):
            pass

    expires = attributes.get("expires")
    if expires:
        try:
            expiry = parsedate_to_datetime(str(expires))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            return expiry.astimezone(timezone.utc)
        except (TypeError, ValueError, IndexError, OverflowError):
            return None

    return None


def classify_cookie_status(parsed: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    cookies = parsed["cookies"]
    attributes_object = attributes_to_object(parsed["attributes"])
    expires_at = parse_expiry(attributes_object, now)
    expired = bool(expires_at and expires_at <= now)

    if not cookies:
        return {
            "verdict": "bad",
            "confidence": "high",
            "reason": "No cookie key/value pairs were found.",
            "expiresAt": None,
            "expired": False,
        }

    if expired:
        return {
            "verdict": "expired",
            "confidence": "high",
            "reason": "The cookie expiry date is already in the past.",
            "expiresAt": expires_at.isoformat(),
            "expired": True,
        }

    has_likely_token = any(len(str(item["value"])) >= 10 for item in cookies)
    if not has_likely_token:
        return {
            "verdict": "bad",
            "confidence": "medium",
            "reason": "Cookie values look incomplete or too short to be a usable session token.",
            "expiresAt": expires_at.isoformat() if expires_at else None,
            "expired": False,
        }

    return {
        "verdict": "valid",
        "confidence": "high" if expires_at else "medium",
        "reason": (
            "Cookie structure looks usable and the expiry is still in the future."
            if expires_at
            else "Cookie structure looks usable, but no expiry metadata was supplied."
        ),
        "expiresAt": expires_at.isoformat() if expires_at else None,
        "expired": False,
    }


def build_security_hints(parsed: dict[str, Any]) -> list[str]:
    attributes_object = attributes_to_object(parsed["attributes"])
    hints: list[str] = []

    if "httponly" not in attributes_object:
        hints.append("HttpOnly is missing, so client-side scripts may be able to read the cookie.")
    if "secure" not in attributes_object:
        hints.append("Secure is missing, so the cookie could be sent over plain HTTP.")
    if "samesite" not in attributes_object:
        hints.append("SameSite is missing, so cross-site request behavior is not clearly restricted.")
    if "path" not in attributes_object:
        hints.append("Path is missing, which can make scoping less explicit.")

    same_site = str(attributes_object.get("samesite", "")).lower()
    if same_site == "none" and "secure" not in attributes_object:
        hints.append("SameSite=None should be paired with Secure in modern browsers.")

    for cookie in parsed["cookies"]:
        if len(str(cookie["value"])) < 10:
            hints.append(f'Cookie "{cookie["name"]}" has a short value and may be incomplete.')

    unique_hints: list[str] = []
    seen: set[str] = set()
    for item in hints:
        if item not in seen:
            unique_hints.append(item)
            seen.add(item)
    return unique_hints


def inspect_cookie_payload(payload: dict[str, Any]) -> dict[str, Any]:
    cookie = str(payload.get("cookie", "") or "")
    label = str(payload.get("label", "") or "").strip()

    parsed = parse_cookie_input(cookie)
    status = classify_cookie_status(parsed)
    return {
        "verdict": status["verdict"],
        "title": {
            "valid": "Cookie looks valid",
            "expired": "Cookie is expired",
            "bad": "Cookie looks bad",
        }.get(status["verdict"], "Cookie inspection"),
        "message": status["reason"],
        "confidence": status["confidence"],
        "submittedLabel": label,
        "cookie": {
            "raw": cookie,
            "parsed": parsed["cookies"],
            "attributes": parsed["attributes"],
            "attributesObject": attributes_to_object(parsed["attributes"]),
        },
        "inspection": {
            "expiresAt": status["expiresAt"],
            "expired": status["expired"],
            "securityHints": build_security_hints(parsed),
        },
    }


class EnzStaffHandler(BaseHTTPRequestHandler):
    server_version = "EnzStaffChecker/1.0"

    def do_GET(self) -> None:
        if self.path not in {"/", "/index.html"}:
            self.send_json(404, {"message": "Not found"})
            return

        content = HTML_PAGE.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        if self.path != "/api/inspect":
            self.send_json(404, {"message": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        raw_body = self.rfile.read(length)
        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_json(400, {"message": "Body must be valid JSON."})
            return

        try:
            result = inspect_cookie_payload(payload)
        except Exception as error:  # pragma: no cover
            self.send_json(400, {"message": str(error)})
            return

        self.send_json(200, result)

    def log_message(self, fmt: str, *args: Any) -> None:
        return

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        content = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), EnzStaffHandler)
    print(f"Enz staff checker running on http://127.0.0.1:{PORT}")
    print("Open the URL in your browser or Pydroid3 webview.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
