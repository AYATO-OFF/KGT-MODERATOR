/* Enz Staff Checker — 2026 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    cookies: $("cookiesInput"),
    endpoint: $("endpoint"),
    method: $("method"),
    concurrency: $("concurrency"),
    validStatus: $("validStatus"),
    expiredStatus: $("expiredStatus"),
    validContains: $("validContains"),
    expiredContains: $("expiredContains"),
    sendAsHeader: $("sendAsHeader"),

    btnRun: $("btnRun"),
    btnStop: $("btnStop"),
    btnClear: $("btnClear"),
    btnSample: $("btnSample"),
    btnExport: $("btnExport"),

    results: $("results"),
    emptyState: $("emptyState"),
    progressBar: $("progressBar"),
    rowTpl: $("rowTemplate"),

    statCount: $("statCount"),
    statValid: $("statValid"),
    statExpired: $("statExpired"),
    statBad: $("statBad"),

    cAll: $("cAll"),
    cValid: $("cValid"),
    cExpired: $("cExpired"),
    cBad: $("cBad"),
    cPending: $("cPending"),

    presetGrid: $("presetGrid"),
  };

  /* ---------- presets ---------- */
  const presets = [
    {
      name: "Generic JSON API",
      url: "https://httpbin.org/cookies",
      method: "GET",
      valid: "200",
      expired: "401,403",
      validContains: "",
      expiredContains: "expired",
    },
    {
      name: "Self-hosted /me",
      url: "https://api.example.com/v1/me",
      method: "GET",
      valid: "200",
      expired: "401,403,419",
      validContains: '"id"',
      expiredContains: "expired",
    },
    {
      name: "HEAD probe",
      url: "https://example.com/account",
      method: "HEAD",
      valid: "200",
      expired: "302,401,403",
      validContains: "",
      expiredContains: "",
    },
    {
      name: "Session validate",
      url: "https://api.example.com/session/validate",
      method: "POST",
      valid: "200,204",
      expired: "401,440",
      validContains: '"valid":true',
      expiredContains: '"valid":false',
    },
  ];

  function renderPresets() {
    els.presetGrid.innerHTML = "";
    presets.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "preset";
      b.innerHTML = `<h4>${p.name}</h4><small>${p.method} · ${p.url}</small>`;
      b.addEventListener("click", () => {
        els.endpoint.value = p.url;
        els.method.value = p.method;
        els.validStatus.value = p.valid;
        els.expiredStatus.value = p.expired;
        els.validContains.value = p.validContains;
        els.expiredContains.value = p.expiredContains;
        els.endpoint.focus();
      });
      els.presetGrid.appendChild(b);
    });
  }

  /* ---------- cookie parsing ---------- */
  function parseCookies(raw) {
    const text = (raw || "").trim();
    if (!text) return [];

    // Try JSON array / object first
    if (text.startsWith("[") || text.startsWith("{")) {
      try {
        const j = JSON.parse(text);
        const arr = Array.isArray(j) ? j : [j];
        return arr
          .map((c) => normalizeCookieObj(c))
          .filter(Boolean);
      } catch {
        /* fall through */
      }
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    return lines.map((line) => parseCookieLine(line)).filter(Boolean);
  }

  function normalizeCookieObj(c) {
    if (!c || typeof c !== "object") return null;
    const name = c.name || c.Name;
    const value = c.value ?? c.Value ?? "";
    if (!name) return null;
    const expires = c.expires ?? c.expirationDate ?? c.Expires ?? null;
    return buildCookie([[String(name), String(value)]], expires);
  }

  function parseCookieLine(line) {
    // Netscape format: domain \t flag \t path \t secure \t expires \t name \t value
    if (line.includes("\t")) {
      const parts = line.split("\t");
      if (parts.length >= 7) {
        const expires = Number(parts[4]);
        const name = parts[5];
        const value = parts.slice(6).join("\t");
        return buildCookie([[name, value]], Number.isFinite(expires) ? expires : null);
      }
    }

    // Cookie header format: a=b; c=d
    if (line.includes("=")) {
      const pairs = line
        .split(/;\s*/)
        .map((p) => p.split("="))
        .filter((kv) => kv.length >= 2 && kv[0])
        .map((kv) => [kv[0].trim(), kv.slice(1).join("=").trim()]);
      if (pairs.length) return buildCookie(pairs, null);
    }
    return null;
  }

  function buildCookie(pairs, expires) {
    const header = pairs.map(([k, v]) => `${k}=${v}`).join("; ");
    const preview = pairs
      .map(([k, v]) => `${k}=${v.length > 16 ? v.slice(0, 14) + "…" : v}`)
      .join("; ");
    return {
      header,
      preview,
      expires: expires ? Number(expires) : null,
      pairs,
    };
  }

  /* ---------- state ---------- */
  const state = {
    rows: [],
    abort: null,
    running: false,
    filter: "all",
  };

  function parseStatusList(s) {
    return (s || "")
      .split(/[,\s]+/)
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isFinite(x));
  }

  /* ---------- UI helpers ---------- */
  function addRow(cookie, index) {
    const frag = els.rowTpl.content.cloneNode(true);
    const tr = frag.querySelector("tr");
    tr.dataset.status = "pending";
    tr.querySelector(".idx").textContent = String(index + 1);
    tr.querySelector(".preview code").textContent = cookie.preview;
    tr.querySelector(".pill-status").textContent = "pending";
    tr.querySelector(".pill-status").className = "pill-status pending";
    els.results.appendChild(frag);
    return tr;
  }

  function setRowStatus(tr, status, detail) {
    tr.dataset.status = status;
    const pill = tr.querySelector(".pill-status");
    pill.className = "pill-status " + status;
    pill.textContent = status;
    if (detail) {
      if ("http" in detail) tr.querySelector(".http").textContent = detail.http ?? "—";
      if ("time" in detail) tr.querySelector(".time").textContent = detail.time ?? "—";
      if ("detail" in detail) {
        const d = tr.querySelector(".detail");
        d.textContent = detail.detail ?? "";
        d.title = detail.detail ?? "";
      }
    }
    applyFilter();
    updateCounts();
  }

  function updateCounts() {
    const rows = [...els.results.querySelectorAll("tr")];
    const c = { all: rows.length, valid: 0, expired: 0, bad: 0, pending: 0, running: 0 };
    rows.forEach((r) => {
      const s = r.dataset.status || "pending";
      if (c[s] !== undefined) c[s]++;
    });
    els.cAll.textContent = c.all;
    els.cValid.textContent = c.valid;
    els.cExpired.textContent = c.expired;
    els.cBad.textContent = c.bad;
    els.cPending.textContent = c.pending + c.running;

    els.statCount.textContent = c.all;
    els.statValid.textContent = c.valid;
    els.statExpired.textContent = c.expired;
    els.statBad.textContent = c.bad;

    els.btnExport.disabled = c.valid === 0;
    els.emptyState.style.display = c.all === 0 ? "" : "none";
  }

  function applyFilter() {
    const f = state.filter;
    els.results.querySelectorAll("tr").forEach((tr) => {
      const s = tr.dataset.status || "pending";
      const show = f === "all" || f === s || (f === "pending" && (s === "pending" || s === "running"));
      tr.style.display = show ? "" : "none";
    });
  }

  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      state.filter = t.dataset.filter;
      applyFilter();
    });
  });

  /* ---------- run ---------- */
  async function runBatch() {
    if (state.running) return;

    const endpoint = els.endpoint.value.trim();
    if (!endpoint) {
      flashInvalid(els.endpoint);
      return;
    }

    const cookies = parseCookies(els.cookies.value);
    if (!cookies.length) {
      flashInvalid(els.cookies);
      return;
    }

    els.results.innerHTML = "";
    state.rows = cookies.map((c, i) => ({ cookie: c, tr: addRow(c, i) }));
    updateCounts();
    els.progressBar.style.width = "0%";

    const validCodes = parseStatusList(els.validStatus.value);
    const expiredCodes = parseStatusList(els.expiredStatus.value);
    const validContains = els.validContains.value;
    const expiredContains = els.expiredContains.value;
    const method = els.method.value;
    const sendAsHeader = els.sendAsHeader.checked;

    const concurrency = Math.max(1, Math.min(50, parseInt(els.concurrency.value, 10) || 8));

    state.running = true;
    state.abort = new AbortController();
    els.btnRun.classList.add("loading");
    els.btnRun.disabled = true;
    els.btnStop.disabled = false;

    let done = 0;
    let idx = 0;

    const workers = Array.from({ length: concurrency }, () =>
      (async function worker() {
        while (idx < state.rows.length && state.running) {
          const my = idx++;
          const row = state.rows[my];
          row.tr.dataset.status = "running";
          row.tr.querySelector(".pill-status").className = "pill-status running";
          row.tr.querySelector(".pill-status").textContent = "running";

          const result = await checkOne(row.cookie, {
            endpoint,
            method,
            validCodes,
            expiredCodes,
            validContains,
            expiredContains,
            sendAsHeader,
            signal: state.abort.signal,
          });
          setRowStatus(row.tr, result.status, result);
          done++;
          els.progressBar.style.width = ((done / state.rows.length) * 100).toFixed(1) + "%";
        }
      })()
    );

    await Promise.all(workers);

    state.running = false;
    els.btnRun.classList.remove("loading");
    els.btnRun.disabled = false;
    els.btnStop.disabled = true;
  }

  function flashInvalid(el) {
    el.animate(
      [
        { boxShadow: "0 0 0 4px rgba(255,92,107,0.4)" },
        { boxShadow: "0 0 0 4px rgba(255,92,107,0)" },
      ],
      { duration: 600, iterations: 1 }
    );
    el.focus();
  }

  async function checkOne(cookie, opts) {
    const t0 = performance.now();
    try {
      const headers = {};
      const init = { method: opts.method, signal: opts.signal, redirect: "manual" };
      if (opts.sendAsHeader) {
        headers["Cookie"] = cookie.header;
      } else {
        init.credentials = "include";
      }
      // HEAD/GET should not carry bodies; POST/PUT send empty body for probing
      if (["POST", "PUT"].includes(opts.method)) {
        init.body = "";
      }
      init.headers = headers;

      const res = await fetch(opts.endpoint, init);
      const ms = Math.round(performance.now() - t0);
      let text = "";
      try {
        text = await res.clone().text();
      } catch {}
      const status = classify(res.status, text, opts);
      const detail = buildDetail(res, text, cookie);
      return { status, http: res.status, time: ms + "ms", detail };
    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      return {
        status: "bad",
        http: "—",
        time: ms + "ms",
        detail: err.name === "AbortError" ? "aborted" : err.message || "network error",
      };
    }
  }

  function classify(httpStatus, body, opts) {
    // Expired checks first if body keyword given
    if (opts.expiredContains && body && body.toLowerCase().includes(opts.expiredContains.toLowerCase())) {
      return "expired";
    }
    if (opts.validContains && body && body.toLowerCase().includes(opts.validContains.toLowerCase())) {
      return "valid";
    }
    if (opts.validCodes.includes(httpStatus)) return "valid";
    if (opts.expiredCodes.includes(httpStatus)) return "expired";
    return "bad";
  }

  function buildDetail(res, text, cookie) {
    const snippet = (text || "").replace(/\s+/g, " ").trim().slice(0, 90);
    const ct = res.headers.get("content-type") || "";
    return snippet || `${res.statusText || ""} ${ct}`.trim() || "—";
  }

  /* ---------- sample + export ---------- */
  function loadSample() {
    els.cookies.value =
`# Sample Netscape cookies (expired + valid looking)
.example.com\tTRUE\t/\tTRUE\t1893456000\tsessionid\ta1b2c3d4e5f6
.example.com\tTRUE\t/\tTRUE\t1500000000\tsessionid\tOLD-EXPIRED-TOKEN

# Header format
sessionid=zz99kk00; csrftoken=qq11mm22
auth_token=demo-valid-token; user=enz

# JSON format
[{"name":"sid","value":"fresh-session-2026","expires":1893456000}]`;
    els.endpoint.value = els.endpoint.value || "https://httpbin.org/cookies";
    els.cookies.dispatchEvent(new Event("input"));
  }

  function exportValid() {
    const rows = [...els.results.querySelectorAll('tr[data-status="valid"]')];
    if (!rows.length) return;
    const lines = rows.map((tr) => {
      const idx = Number(tr.querySelector(".idx").textContent) - 1;
      const r = state.rows[idx];
      return r?.cookie?.header || "";
    }).filter(Boolean);
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enz-valid-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- wiring ---------- */
  els.btnRun.addEventListener("click", runBatch);
  els.btnStop.addEventListener("click", () => {
    if (state.abort) state.abort.abort();
    state.running = false;
  });
  els.btnClear.addEventListener("click", () => {
    els.cookies.value = "";
    els.results.innerHTML = "";
    els.progressBar.style.width = "0%";
    updateCounts();
  });
  els.btnSample.addEventListener("click", loadSample);
  els.btnExport.addEventListener("click", exportValid);

  // keyboard: Ctrl/Cmd + Enter to run
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runBatch();
    }
  });

  renderPresets();
  updateCounts();
})();
