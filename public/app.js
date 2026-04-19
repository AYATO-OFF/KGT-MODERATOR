const $ = (sel) => document.querySelector(sel);

const counters = { checked: 0, valid: 0, bad: 0, expired: 0 };
function bumpCounter(verdict) {
  counters.checked += 1;
  if (verdict === 'valid') counters.valid += 1;
  if (verdict === 'bad') counters.bad += 1;
  if (verdict === 'expired') counters.expired += 1;
  $('#stat-checked').textContent = counters.checked;
  $('#stat-valid').textContent = counters.valid;
  $('#stat-bad').textContent = counters.bad;
  $('#stat-expired').textContent = counters.expired;
}

function setLoading(btn, loading) {
  const label = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.spinner');
  if (loading) {
    btn.setAttribute('disabled', 'true');
    if (label) label.textContent = 'Working…';
    if (spinner) spinner.hidden = false;
  } else {
    btn.removeAttribute('disabled');
    if (label) label.textContent = btn.dataset.label || label.textContent;
    if (spinner) spinner.hidden = true;
  }
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function checkOne({ endpoint, cookie, method, headers }) {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, cookie, method, headers }),
  });
  return res.json();
}

function renderResult(container, data) {
  if (!data || data.ok === false) {
    container.hidden = false;
    container.innerHTML = `
      <div class="result-head">
        <div><b>Request failed</b></div>
        <span class="verdict bad">ERROR</span>
      </div>
      <pre class="preview">${escapeHtml(data && data.error ? data.error : 'Unknown error')}</pre>
    `;
    return;
  }
  const v = data.classification || 'unknown';
  const vLabel = { valid: 'VALID', bad: 'BAD', expired: 'EXPIRED', unknown: 'UNKNOWN' }[v];
  container.hidden = false;
  container.innerHTML = `
    <div class="result-head">
      <div><b>HTTP ${data.status}</b> <span class="muted">· ${escapeHtml(data.statusText || '')}</span></div>
      <span class="verdict ${v}">● ${vLabel}</span>
    </div>
    <div class="meta">
      <div class="m"><span>Elapsed</span><b>${data.elapsedMs} ms</b></div>
      <div class="m"><span>Redirect</span><b>${escapeHtml(data.location || '—')}</b></div>
      <div class="m"><span>Set-Cookie</span><b>${escapeHtml((data.setCookie || '—').slice(0, 120))}</b></div>
      <div class="m"><span>Sent cookie</span><b>${escapeHtml(data.cookieEcho || '—')}</b></div>
    </div>
    <pre class="preview">${escapeHtml(data.preview || '(empty response body)')}</pre>
  `;
  bumpCounter(v);
}

$('#checker-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#btn-check');
  btn.dataset.label = 'Check cookie';
  const endpoint = $('#endpoint').value.trim();
  const cookie = $('#cookie').value.trim();
  const method = $('#method').value;
  let headers = {};
  const rawHeaders = $('#headers').value.trim();
  if (rawHeaders) {
    try { headers = JSON.parse(rawHeaders); }
    catch (_) {
      renderResult($('#result'), { ok: false, error: 'Extra headers must be valid JSON.' });
      return;
    }
  }
  setLoading(btn, true);
  try {
    const data = await checkOne({ endpoint, cookie, method, headers });
    renderResult($('#result'), data);
  } catch (err) {
    renderResult($('#result'), { ok: false, error: err.message });
  } finally {
    setLoading(btn, false);
  }
});

$('#btn-clear').addEventListener('click', () => {
  $('#endpoint').value = '';
  $('#cookie').value = '';
  $('#headers').value = '';
  $('#result').hidden = true;
});

$('#bulk-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#btn-bulk');
  btn.dataset.label = 'Run bulk check';
  const endpoint = $('#bulk-endpoint').value.trim();
  const raw = $('#bulk-cookies').value;
  const cookies = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!cookies.length) return;
  const rowsEl = $('#bulk-rows');
  rowsEl.innerHTML = '';
  $('#bulk-result').hidden = false;

  setLoading(btn, true);
  try {
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const row = document.createElement('div');
      row.className = 'bulk-row';
      row.innerHTML = `
        <div>${i + 1}</div>
        <div class="cookie-prev">${escapeHtml(cookie.slice(0, 80))}${cookie.length > 80 ? '…' : ''}</div>
        <div>…</div>
        <div><span class="verdict unknown">CHECKING</span></div>
        <div>—</div>
      `;
      rowsEl.appendChild(row);
      try {
        const data = await checkOne({ endpoint, cookie, method: 'GET', headers: {} });
        const v = data.classification || 'unknown';
        const label = { valid: 'VALID', bad: 'BAD', expired: 'EXPIRED', unknown: 'UNKNOWN' }[v];
        row.innerHTML = `
          <div>${i + 1}</div>
          <div class="cookie-prev">${escapeHtml(cookie.slice(0, 80))}${cookie.length > 80 ? '…' : ''}</div>
          <div>${data.status ?? '—'}</div>
          <div><span class="verdict ${v}">● ${label}</span></div>
          <div>${data.elapsedMs ?? '—'} ms</div>
        `;
        bumpCounter(v);
      } catch (err) {
        row.innerHTML = `
          <div>${i + 1}</div>
          <div class="cookie-prev">${escapeHtml(cookie.slice(0, 80))}${cookie.length > 80 ? '…' : ''}</div>
          <div>—</div>
          <div><span class="verdict bad">● ERROR</span></div>
          <div>—</div>
        `;
      }
    }
  } finally {
    setLoading(btn, false);
  }
});

$('#btn-bulk-clear').addEventListener('click', () => {
  $('#bulk-endpoint').value = '';
  $('#bulk-cookies').value = '';
  $('#bulk-result').hidden = true;
  $('#bulk-rows').innerHTML = '';
});
