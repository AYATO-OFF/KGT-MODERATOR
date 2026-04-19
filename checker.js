const EXPIRED_KEYWORDS = [
  "expired",
  "session expired",
  "token expired",
  "jwt expired",
  "login again",
];

function clipText(value, size = 350) {
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
      responsePreview: clipText(error.message || "Unknown network error"),
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutRef);
  }
}

async function checkCookieBatch({
  cookie,
  endpoints,
  method = "GET",
  timeoutMs = 10000,
}) {
  const cleanEndpoints = endpoints
    .map((item) => String(item).trim())
    .filter(Boolean);
  const uniqueEndpoints = [...new Set(cleanEndpoints)];
  const upperMethod = String(method || "GET").toUpperCase();

  const results = await Promise.all(
    uniqueEndpoints.map((endpoint) =>
      checkEndpoint({
        endpoint,
        cookie: cookie.trim(),
        method: upperMethod,
        timeoutMs: Number(timeoutMs) || 10000,
      }),
    ),
  );

  const totals = results.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { valid: 0, bad: 0, expired: 0 },
  );

  return {
    totals,
    results,
  };
}

module.exports = {
  checkCookieBatch,
};
