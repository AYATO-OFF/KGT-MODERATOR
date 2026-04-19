"use strict";

const MS_IN_SECOND = 1000;
const COOKIE_ATTRIBUTE_KEYS = new Set([
  "expires",
  "max-age",
  "domain",
  "path",
  "samesite",
  "secure",
  "httponly",
  "priority",
  "partitioned"
]);

function splitCookies(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/;\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCookieInput(rawCookie) {
  const segments = splitCookies(rawCookie);
  const cookies = [];
  const attributes = [];

  for (const segment of segments) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex === -1) {
      attributes.push({ key: segment, value: true });
      continue;
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    const normalizedKey = key.toLowerCase();

    if (isAttribute(normalizedKey)) {
      attributes.push({ key, value });
      continue;
    }

    cookies.push({ name: key, value });
  }

  return { cookies, attributes };
}

function isAttribute(key) {
  return COOKIE_ATTRIBUTE_KEYS.has(key);
}

function attrsToObject(attributes) {
  return attributes.reduce((accumulator, attribute) => {
    accumulator[attribute.key.toLowerCase()] = attribute.value;
    return accumulator;
  }, {});
}

function getExpiry(attributesObject, now = new Date()) {
  if (attributesObject["max-age"] !== undefined) {
    const seconds = Number(attributesObject["max-age"]);
    if (Number.isFinite(seconds)) {
      return new Date(now.getTime() + (seconds * MS_IN_SECOND));
    }
  }

  if (attributesObject.expires) {
    const parsed = new Date(attributesObject.expires);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function classifyCookieStatus({ cookies, attributes }, now = new Date()) {
  if (!cookies.length) {
    return {
      verdict: "bad",
      confidence: "high",
      reason: "No cookie key/value pairs were found.",
      expiresAt: null,
      expired: false
    };
  }

  const attributesObject = attrsToObject(attributes);
  const expiresAt = getExpiry(attributesObject, now);
  const expired = Boolean(expiresAt && expiresAt.getTime() <= now.getTime());

  if (expired) {
    return {
      verdict: "expired",
      confidence: "high",
      reason: "The cookie expiry date is already in the past.",
      expiresAt: expiresAt.toISOString(),
      expired
    };
  }

  const hasLikelySessionToken = cookies.some((cookie) => cookie.value.length >= 10);

  if (!hasLikelySessionToken) {
    return {
      verdict: "bad",
      confidence: "medium",
      reason: "Cookie values look incomplete or too short to be a usable session token.",
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      expired
    };
  }

  return {
    verdict: "valid",
    confidence: expiresAt ? "high" : "medium",
    reason: expiresAt
      ? "Cookie structure looks usable and the expiry is still in the future."
      : "Cookie structure looks usable, but no expiry metadata was supplied.",
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    expired
  };
}

function buildSecurityHints({ cookies, attributes }) {
  const attributesObject = attrsToObject(attributes);
  const hints = [];

  if (!attributesObject.httponly) {
    hints.push("HttpOnly is missing, so client-side scripts may be able to read the cookie.");
  }

  if (!attributesObject.secure) {
    hints.push("Secure is missing, so the cookie could be sent over plain HTTP.");
  }

  if (!attributesObject.samesite) {
    hints.push("SameSite is missing, so cross-site request behavior is not clearly restricted.");
  }

  if (attributesObject.samesite && String(attributesObject.samesite).toLowerCase() === "none" && !attributesObject.secure) {
    hints.push("SameSite=None should be paired with Secure in modern browsers.");
  }

  if (!attributesObject.path) {
    hints.push("Path is missing, which can make scoping less explicit.");
  }

  for (const cookie of cookies) {
    if (cookie.value.length < 10) {
      hints.push(`Cookie "${cookie.name}" has a short value and may be incomplete.`);
    }
  }

  return [...new Set(hints)];
}

function inspectCookiePayload({
  cookie,
  notes,
  label
} = {}) {
  const parsedCookie = parseCookieInput(cookie);
  const status = classifyCookieStatus(parsedCookie);
  const attributesObject = attrsToObject(parsedCookie.attributes);
  const securityHints = buildSecurityHints(parsedCookie);

  return {
    verdict: status.verdict,
    title: getVerdictTitle(status.verdict),
    message: status.reason,
    confidence: status.confidence,
    submittedLabel: label ? String(label).trim() : "",
    notes: notes ? String(notes).trim() : "",
    cookie: {
      raw: cookie,
      parsed: parsedCookie.cookies,
      attributes: parsedCookie.attributes,
      attributesObject
    },
    inspection: {
      expiresAt: status.expiresAt,
      expired: status.expired,
      securityHints
    }
  };
}

function getVerdictTitle(verdict) {
  if (verdict === "valid") {
    return "Cookie looks valid";
  }

  if (verdict === "expired") {
    return "Cookie is expired";
  }

  return "Cookie looks bad";
}

module.exports = {
  parseCookieInput,
  classifyCookieStatus,
  inspectCookiePayload
};
