(() => {
  const $ = (sel) => document.querySelector(sel);
  const form = $('#checkForm');
  const submitBtn = $('#submitBtn');
  const clearBtn = $('#clearBtn');
  const resultsEl = $('#results');
  const tbody = $('#resultsTable tbody');
  const sumEls = {
    valid: $('#sumValid'), bad: $('#sumBad'), expired: $('#sumExpired'), error: $('#sumError')
  };
  let lastData = null;
  let currentFilter = 'all';

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderRows();
    });
  });

  $('#copyValid').addEventListener('click', () => {
    if (!lastData) return;
    const valid = lastData.results.filter((r) => r.state === 'valid').map((r) => r.cookie).join('\n');
    if (!valid) { flash('No valid cookies to copy'); return; }
    navigator.clipboard.writeText(valid).then(() => flash('Valid cookies copied'));
  });

  $('#downloadJson').addEventListener('click', () => {
    if (!lastData) return;
    const blob = new Blob([JSON.stringify(lastData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enz-staff-checker-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    resultsEl.hidden = true;
    tbody.innerHTML = '';
    lastData = null;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = $('#endpoint').value.trim();
    const method = $('#method').value;
    const cookies = $('#cookies').value;
    const timeoutMs = Number($('#timeoutMs').value || 15000);
    const concurrency = Number($('#concurrency').value || 5);
    let headers = {};
    const headersRaw = $('#headers').value.trim();
    if (headersRaw) {
      try {
        headers = JSON.parse(headersRaw);
        if (typeof headers !== 'object' || Array.isArray(headers)) throw new Error('must be an object');
      } catch (err) {
        flash('Extra headers must be a JSON object');
        return;
      }
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, method, cookies, headers, timeoutMs, concurrency })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        flash(data.error || `Request failed (${res.status})`);
        return;
      }
      lastData = data;
      render(data);
    } catch (err) {
      flash(err.message || 'Network error');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  function render(data) {
    sumEls.valid.textContent = data.summary.valid || 0;
    sumEls.bad.textContent = data.summary.bad || 0;
    sumEls.expired.textContent = data.summary.expired || 0;
    sumEls.error.textContent = data.summary.error || 0;
    resultsEl.hidden = false;
    renderRows();
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderRows() {
    if (!lastData) return;
    tbody.innerHTML = '';
    const rows = lastData.results.filter((r) => currentFilter === 'all' || r.state === currentFilter);
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><span class="tag ${escapeAttr(r.state)}">${escapeHtml(r.state)}</span></td>
        <td>${r.status || '—'}</td>
        <td><code>${escapeHtml(r.cookie)}</code></td>
        <td>${r.elapsedMs} ms</td>
        <td class="snippet">${escapeHtml(r.error ? `error: ${r.error}` : (r.snippet || ''))}</td>
      `;
      tbody.appendChild(tr);
    });
    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="text-align:center;color:var(--muted);padding:18px">No results in this filter.</td>`;
      tbody.appendChild(tr);
    }
  }

  let flashTimer = null;
  function flash(msg) {
    let el = document.getElementById('flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash';
      Object.assign(el.style, {
        position: 'fixed', bottom: '22px', left: '50%', transform: 'translateX(-50%)',
        background: '#111a2c', color: '#e6ecf7', border: '1px solid #223255',
        padding: '10px 16px', borderRadius: '10px', zIndex: 9999,
        boxShadow: '0 10px 30px rgba(0,0,0,.5)', fontSize: '14px'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.style.transition = 'opacity .3s ease'; el.style.opacity = '0'; }, 2200);
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/\s+/g, '-'); }
})();
