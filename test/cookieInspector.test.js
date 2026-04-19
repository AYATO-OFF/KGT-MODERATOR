const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseCookieInput,
  classifyCookieStatus,
} = require("../src/lib/cookieInspector");

test("classifyCookieStatus marks expired cookies", () => {
  const parsed = parseCookieInput(
    "session=abc123456789; Expires=Wed, 01 Jan 2020 00:00:00 GMT; HttpOnly; Secure"
  );

  const result = classifyCookieStatus(parsed);

  assert.equal(result.verdict, "expired");
  assert.match(result.reason, /expiry date is already in the past/i);
});

test("classifyCookieStatus marks empty payloads as bad", () => {
  const parsed = parseCookieInput("HttpOnly; Secure");

  const result = classifyCookieStatus(parsed);

  assert.equal(result.verdict, "bad");
  assert.match(result.reason, /no cookie key\/value pairs/i);
});

test("classifyCookieStatus marks short values as bad", () => {
  const parsed = parseCookieInput("session=abc; HttpOnly; Secure");

  const result = classifyCookieStatus(parsed);

  assert.equal(result.verdict, "bad");
  assert.match(result.reason, /too short/i);
});

test("classifyCookieStatus marks future expiries as valid", () => {
  const parsed = parseCookieInput(
    "session=abc123456789; Expires=Wed, 01 Jan 2099 00:00:00 GMT; HttpOnly; Secure; SameSite=None"
  );

  const result = classifyCookieStatus(parsed);

  assert.equal(result.verdict, "valid");
  assert.match(result.reason, /expiry is still in the future/i);
});

test("parseCookieInput splits multiple cookie pairs", () => {
  const parsed = parseCookieInput("foo=bar; session=abc123456789; theme=dark");

  assert.deepEqual(parsed.cookies, [
    { name: "foo", value: "bar" },
    { name: "session", value: "abc123456789" },
    { name: "theme", value: "dark" },
  ]);
});
