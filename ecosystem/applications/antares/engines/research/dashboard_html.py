"""
dashboard_html.py

Part-8 of the roadmap: "Final User Experience" -
    "Create a simple, elite operational interface. The user should not
    see hundreds of confusing research pages. The interface should
    make the intelligence understandable immediately and expose real
    platform data, not static cards."

This is v1 of that interface: one plain HTML page, vanilla JS, no
build step or frontend framework - it calls the same real API
endpoints built in Days 4-8 directly via fetch(), so everything shown
on screen is live data from the actual database, not hard-coded demo
content.

Kept as a separate file (instead of an inline string inside main.py)
just to keep main.py focused on routing, not HTML/CSS/JS.
"""

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Organizational Futures — Dashboard</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; margin: 0; background: #0f1117; color: #e6e6e6; }
  header { padding: 20px 32px; border-bottom: 1px solid #2a2d3a; }
  header h1 { margin: 0; font-size: 20px; }
  header p { margin: 4px 0 0; color: #9aa0ac; font-size: 13px; }
  main { padding: 24px 32px; max-width: 1100px; margin: 0 auto; }
  .stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
  .stat-card { background: #171a24; border: 1px solid #2a2d3a; border-radius: 10px; padding: 16px 20px; min-width: 140px; }
  .stat-card .label { color: #9aa0ac; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .stat-card .value { font-size: 28px; font-weight: 600; margin-top: 4px; }
  section { background: #171a24; border: 1px solid #2a2d3a; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  section h2 { margin-top: 0; font-size: 15px; color: #cfd3dc; }
  form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  input, textarea { background: #0f1117; border: 1px solid #2a2d3a; color: #e6e6e6; border-radius: 6px; padding: 8px 10px; font-size: 13px; }
  input[type=text] { flex: 1; min-width: 200px; }
  textarea { width: 100%; min-height: 60px; }
  button { background: #4c6ef5; border: none; color: white; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  button:hover { background: #3b5bdb; }
  button.secondary { background: #2a2d3a; }
  button.secondary:hover { background: #363a4a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #2a2d3a; vertical-align: top; }
  th { color: #9aa0ac; font-weight: 500; }
  .tag { display: inline-block; background: #22283b; color: #9db4ff; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin: 1px; }
  .tag.candidate { color: #ffd57a; }
  .tag.hypothesized { color: #ffb3b3; }
  pre { background: #0f1117; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
  #status { font-size: 12px; color: #7fdc9c; margin-left: 8px; }
</style>
</head>
<body>

<header>
  <h1>Organizational Futures</h1>
  <p>Antares — Emerging &amp; Decentralized Organizational Intelligence (v1, live data)</p>
</header>

<main>

  <div class="stats" id="stats"></div>

  <section>
    <h2>New Organizational Signal</h2>
    <form id="signal-form">
      <input type="text" id="signal-title" placeholder="Title" required>
      <button type="submit">Create Signal</button>
      <span id="status"></span>
    </form>
    <textarea id="signal-description" placeholder="Describe the organizational observation..." required></textarea>
  </section>

  <section>
    <h2>Signals</h2>
    <button class="secondary" onclick="detectPatterns()">Run Pattern Detection</button>
    <table id="signals-table">
      <thead><tr><th>Title</th><th>Dimensions Matched</th><th>Actions</th></tr></thead>
      <tbody></tbody>
    </table>
  </section>

  <section>
    <h2>Patterns</h2>
    <table id="patterns-table">
      <thead><tr><th>Name</th><th>Status</th><th>Confidence</th><th>Actions</th></tr></thead>
      <tbody></tbody>
    </table>
  </section>

  <section>
    <h2>Future Models</h2>
    <table id="models-table">
      <thead><tr><th>Name</th><th>Confidence</th><th>Actions</th></tr></thead>
      <tbody></tbody>
    </table>
  </section>

  <section>
    <h2>Candidate Capabilities</h2>
    <table id="capabilities-table">
      <thead><tr><th>Name</th><th>Status</th><th>Evidence Summary</th></tr></thead>
      <tbody></tbody>
    </table>
  </section>

  <section id="trace-section" style="display:none;">
    <h2>Intelligence Trace</h2>
    <pre id="trace-output"></pre>
  </section>

</main>

<script>
async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function loadStats() {
  const [signals, patterns, models, capabilities] = await Promise.all([
    api('/signals'), api('/patterns'), api('/models'), api('/candidate-capabilities')
  ]);
  const stats = document.getElementById('stats');
  const items = [
    ['Signals', signals.length], ['Patterns', patterns.length],
    ['Future Models', models.length], ['Candidate Capabilities', capabilities.length]
  ];
  stats.innerHTML = items.map(([label, value]) =>
    `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`
  ).join('');
  return { signals, patterns, models, capabilities };
}

async function loadSignals() {
  const signals = await api('/signals');
  const tbody = document.querySelector('#signals-table tbody');
  const rows = await Promise.all(signals.slice(-15).reverse().map(async s => {
    const impacts = await api(`/signals/${s.id}/analysis`);
    const dims = impacts.map(i => `<span class="tag">${i.dimension_name || i.dimension_id.slice(0,6)}</span>`).join(' ') || '<span style="color:#666">not analyzed</span>';
    return `<tr>
      <td>${s.title}</td>
      <td>${dims}</td>
      <td>
        <button class="secondary" onclick="analyzeSignal('${s.id}')">Analyze</button>
        <button class="secondary" onclick="traceSignal('${s.id}')">Trace</button>
      </td>
    </tr>`;
  }));
  tbody.innerHTML = rows.join('');
}

async function loadPatterns() {
  const patterns = await api('/patterns');
  const tbody = document.querySelector('#patterns-table tbody');
  tbody.innerHTML = patterns.slice(-15).reverse().map(p => `<tr>
    <td>${p.name}</td>
    <td><span class="tag">${p.status}</span></td>
    <td><span class="tag ${p.confidence}">${p.confidence}</span></td>
    <td><button class="secondary" onclick="buildModel('${p.id}')">Build Model</button></td>
  </tr>`).join('');
}

async function loadModels() {
  const models = await api('/models');
  const tbody = document.querySelector('#models-table tbody');
  tbody.innerHTML = models.slice(-15).reverse().map(m => `<tr>
    <td>${m.name}</td>
    <td><span class="tag ${m.confidence}">${m.confidence}</span></td>
    <td><button class="secondary" onclick="buildCapability('${m.id}')">Suggest Capability</button></td>
  </tr>`).join('');
}

async function loadCapabilities() {
  const capabilities = await api('/candidate-capabilities');
  const tbody = document.querySelector('#capabilities-table tbody');
  tbody.innerHTML = capabilities.slice(-15).reverse().map(c => `<tr>
    <td>${c.name}</td>
    <td><span class="tag candidate">${c.status}</span></td>
    <td style="max-width:400px;">${(c.evidence_summary || '').slice(0, 160)}</td>
  </tr>`).join('');
}

async function refreshAll() {
  await loadStats();
  await loadSignals();
  await loadPatterns();
  await loadModels();
  await loadCapabilities();
}

document.getElementById('signal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('signal-title').value;
  const description = document.getElementById('signal-description').value;
  const statusEl = document.getElementById('status');
  try {
    await api('/signals?check_duplicates=false', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ title, description, source: 'dashboard' })
    });
    statusEl.textContent = 'Signal created.';
    document.getElementById('signal-title').value = '';
    document.getElementById('signal-description').value = '';
    await refreshAll();
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
  }
});

async function analyzeSignal(id) {
  await api(`/signals/${id}/analyze`, { method: 'POST' });
  await refreshAll();
}

async function detectPatterns() {
  await api('/patterns/detect', { method: 'POST' });
  await refreshAll();
}

async function buildModel(patternId) {
  await api('/models/build', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ pattern_ids: [patternId] })
  });
  await refreshAll();
}

async function buildCapability(modelId) {
  await api('/capabilities/build', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ model_id: modelId })
  });
  await refreshAll();
}

async function traceSignal(id) {
  const trace = await api(`/intelligence/trace/${id}`);
  document.getElementById('trace-section').style.display = 'block';
  document.getElementById('trace-output').textContent = JSON.stringify(trace, null, 2);
  document.getElementById('trace-section').scrollIntoView({ behavior: 'smooth' });
}

refreshAll();
</script>

</body>
</html>
"""
