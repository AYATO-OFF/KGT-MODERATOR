const form = document.getElementById("checker-form");
const cookieInput = document.getElementById("cookie");
const endpointsInput = document.getElementById("endpoints");
const methodInput = document.getElementById("method");
const timeoutInput = document.getElementById("timeoutMs");
const statusLine = document.getElementById("status-line");
const summaryNode = document.getElementById("summary");
const resultsNode = document.getElementById("results");
const submitBtn = document.getElementById("submit-btn");

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Checking..." : "Check Cookie";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSummary(totals) {
  summaryNode.innerHTML = `
    <span class="chip valid">Valid: ${totals.valid}</span>
    <span class="chip expired">Expired: ${totals.expired}</span>
    <span class="chip bad">Bad: ${totals.bad}</span>
  `;
  summaryNode.classList.remove("hidden");
}

function renderResults(results) {
  if (!Array.isArray(results) || results.length === 0) {
    resultsNode.innerHTML = "";
    return;
  }

  resultsNode.innerHTML = results
    .map((item) => {
      const endpoint = escapeHtml(item.endpoint);
      const status = escapeHtml(item.status || "bad");
      const statusText = escapeHtml(item.statusText || "Unknown");
      const httpStatus =
        item.httpStatus === null || item.httpStatus === undefined
          ? "N/A"
          : String(item.httpStatus);
      const elapsed = `${Number(item.elapsedMs || 0)}ms`;
      const checkedAt = new Date(item.checkedAt).toLocaleString();
      const preview = escapeHtml(item.responsePreview || "");

      return `
        <article class="card">
          <div class="card-top">
            <p class="endpoint">${endpoint}</p>
            <span class="badge ${status}">${status}</span>
          </div>
          <div class="meta">
            <div><strong>HTTP:</strong> ${httpStatus}</div>
            <div><strong>Status Text:</strong> ${statusText}</div>
            <div><strong>Duration:</strong> ${elapsed}</div>
            <div><strong>Checked:</strong> ${escapeHtml(checkedAt)}</div>
          </div>
          <div class="preview">${preview}</div>
        </article>
      `;
    })
    .join("");
}

async function submitCheck(event) {
  event.preventDefault();
  setLoading(true);
  summaryNode.classList.add("hidden");
  resultsNode.innerHTML = "";

  const endpoints = endpointsInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = {
    cookie: cookieInput.value.trim(),
    endpoints,
    method: methodInput.value,
    timeoutMs: Number(timeoutInput.value) || 10000,
  };

  if (!payload.cookie || endpoints.length === 0) {
    statusLine.textContent = "Cookie and at least one endpoint are required.";
    setLoading(false);
    return;
  }

  statusLine.textContent = "Checking cookies against API endpoints...";

  try {
    const response = await fetch("/api/check-cookies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      statusLine.textContent = data.error || "Failed to check cookie.";
      setLoading(false);
      return;
    }

    renderSummary(data.totals || { valid: 0, bad: 0, expired: 0 });
    renderResults(data.results || []);
    statusLine.textContent = `Finished. ${data.results.length} endpoint(s) checked.`;
  } catch (error) {
    statusLine.textContent = `Network error: ${error.message || "Unknown error"}`;
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", submitCheck);
