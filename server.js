const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const EXPIRED_KEYWORDS = [
  "expired",
  "session expired",
  "token expired",
  "jwt expired",
  "login again",
];

function normalizeHeaders(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) {
    out[key] = value;
  }
  return out;
}

function clipText(value, size = 500) {
  if (!value) {
    return "";
  }

  if (value.length <= size) {
    return value;
  }

  return `${value.slice(0, size)}...`;
}

function classifyStatus(statusCode, textBody) {
  const loweredBody = (textBody || "").toLowerCase();
  const hasExpiredKeyword = EXPIRED_KEYWORDS.some((word) =>
    loweredBody.includes(word),
  );

  if (statusCode >= 200 && statusCode < 300 && !hasExpiredKeyword) {
    return "valid";
  }

  if ([419, 440].includes(statusCode) || hasExpiredKeyword) {
    return "expired";
  }

  if ([401, 403].includes(statusCode)) {
    return "bad";
  }

  return "bad";
}

async function checkEndpoint({
  endpoint,
  cookie,
  method = "GET",
  timeoutMs = 10000,
}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutRef = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Cookie: cookie,
        Accept: "application/json, text/plain, */*",
      },
      signal: controller.signal,
    });

    const body = await response.text();
    const classification = classifyStatus(response.status, body);

    return {
      endpoint,
      status: classification,
      httpStatus: response.status,
      statusText: response.statusText,
      elapsedMs: Date.now() - startedAt,
      responseHeaders: normalizeHeaders(response.headers),
      responsePreview: clipText(body),
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const isAbortError = error && error.name === "AbortError";
    return {
      endpoint,
      status: "bad",
      httpStatus: null,
      statusText: isAbortError ? "Request Timeout" : "Request Failed",
      elapsedMs: Date.now() - startedAt,
      responseHeaders: {},
      responsePreview: clipText(error.message || "Unknown network error"),
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutRef);
  }
}

app.post("/api/check-cookies", async (req, res) => {
  const { cookie, endpoints, method = "GET", timeoutMs = 10000 } = req.body;

  if (!cookie || typeof cookie !== "string") {
    return res.status(400).json({
      error: "Cookie is required and must be a string.",
    });
  }

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return res.status(400).json({
      error: "At least one API endpoint is required.",
    });
  }

  const cleanEndpoints = endpoints
    .map((item) => String(item).trim())
    .filter(Boolean);

  const uniqueEndpoints = [...new Set(cleanEndpoints)];
  const checks = await Promise.all(
    uniqueEndpoints.map((endpoint) =>
      checkEndpoint({
        endpoint,
        cookie: cookie.trim(),
        method: String(method || "GET").toUpperCase(),
        timeoutMs: Number(timeoutMs) || 10000,
      }),
    ),
  );

  const totals = checks.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { valid: 0, bad: 0, expired: 0 },
  );

  return res.json({
    app: "Enz Staff Checker",
    totals,
    results: checks,
  });
});

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Enz Staff Checker running on http://localhost:${port}`);
});
