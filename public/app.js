const form = document.querySelector("#checker-form");
const cookieDetails = document.querySelector("#cookieDetails");
const attributeDetails = document.querySelector("#endpointDetails");
const verdictBadge = document.querySelector("#verdictBadge");
const verdictReason = document.querySelector("#verdictReason");
const formStatus = document.querySelector("#formStatus");
const submitButton = document.querySelector("#submitButton");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPairs(pairs) {
  if (!pairs.length) {
    return `
      <div>
        <dt>State</dt>
        <dd>No values detected.</dd>
      </div>
    `;
  }

  return pairs
    .map(
      ([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `
    )
    .join("");
}

function maskCookieValue(value) {
  const stringValue = String(value);
  if (stringValue.length <= 10) {
    return stringValue || "(empty)";
  }

  return `${stringValue.slice(0, 5)}...${stringValue.slice(-3)}`;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Checking..." : "Check cookie";
  formStatus.textContent = isLoading ? "Inspecting cookie locally..." : "";
}

function setVerdict(verdict, reason) {
  const normalized = String(verdict || "neutral").toLowerCase();
  verdictBadge.className = `verdict-badge ${normalized}`;
  verdictBadge.textContent = normalized === "neutral" ? "Waiting" : normalized.toUpperCase();
  verdictReason.textContent = reason;
}

function renderCookieDetails(payload) {
  const cookieEntries = payload.cookie.parsed.map((cookie, index) => [
    `Cookie ${index + 1}`,
    `${cookie.name}=${maskCookieValue(cookie.value)}`
  ]);
  const details = [
    ["Cookies found", String(payload.cookie.parsed.length)],
    ["Attributes found", String(payload.cookie.attributes.length)],
    ["Confidence", payload.confidence],
    ["Expires at", payload.inspection.expiresAt ?? "Not provided"],
    ["Expired", payload.inspection.expired ? "Yes" : "No"],
    ...cookieEntries
  ];

  cookieDetails.className = "details-list";
  cookieDetails.innerHTML = renderPairs(details);
}

function renderAttributeDetails(payload) {
  const attributeEntries = payload.cookie.attributes.map((attribute, index) => [
    `Attribute ${index + 1}`,
    attribute.value === true ? attribute.key : `${attribute.key}=${attribute.value}`
  ]);
  const hintEntries = payload.inspection.securityHints.map((hint, index) => [
    `Hint ${index + 1}`,
    hint
  ]);

  attributeDetails.className = "details-list";
  attributeDetails.innerHTML = renderPairs([
    ["Inspection mode", "Local cookie structure analysis"],
    ["Endpoint request", "Disabled to avoid transmitting sensitive cookies"],
    ["Parsed format", payload.cookie.parsed.length ? "Usable" : "Missing key/value pairs"],
    ["Raw length", String(payload.cookie.raw.length)],
    ...attributeEntries,
    ...hintEntries
  ]);
}

function renderResult(payload) {
  setVerdict(payload.verdict, payload.message);
  renderCookieDetails(payload);
  renderAttributeDetails(payload);
  formStatus.textContent = "Inspection complete.";
}

function renderError(message) {
  setVerdict("bad", message);
  cookieDetails.className = "details-list empty-state";
  cookieDetails.innerHTML = renderPairs([["Error", message]]);
  attributeDetails.className = "details-list empty-state";
  attributeDetails.innerHTML = renderPairs([["State", "Inspection failed"]]);
  formStatus.textContent = "Inspection failed.";
}

async function submitForm(event) {
  event.preventDefault();
  setLoading(true);

  const formData = new FormData(form);
  const payload = {
    cookie: String(formData.get("cookie") || "")
  };

  try {
    const response = await fetch("/api/inspect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Cookie inspection failed.");
    }

    renderResult(data);
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Unknown error.");
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", submitForm);
