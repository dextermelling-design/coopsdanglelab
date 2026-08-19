/**
 * Coop's Fishing — live water temps, UI wiring, charts
 */

(function () {
  'use strict';

  const DEFAULT_LAT = 39.8;
  const DEFAULT_LON = -98.6; // geographic center of the Lower 48

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const HASH_PAGES = {
    '#temps': 'temps.html',
    '#spots': 'spots.html',
    '#depths': 'depths.html',
    '#bait': 'bait.html',
    '#charts': 'charts.html',
    '#about': 'about.html'
  };
  if (HASH_PAGES[location.hash]) {
    location.replace(HASH_PAGES[location.hash]);
  }

  function currentFile() {
    const name = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return name || 'index.html';
  }

  function depthsUrl(waterId, areaId) {
    const q = new URLSearchParams();
    if (waterId) q.set('water', waterId);
    if (areaId) q.set('area', areaId);
    const s = q.toString();
    return 'depths.html' + (s ? '?' + s : '');
  }

  /** Latest live readings, reused by the depth-column model. */
  let liveTempReadings = [];
  let selectedChartId = 'erie-west';
  let selectedAreaId = null;
  let surfTempF = null;
  let surfTempSource = 'seasonal';
  let depthMap = null;
  let depthMarkers = [];

  const placeFilter = { region: 'all', state: 'all', species: 'all', q: '' };
  const depthFilter = { region: 'all', state: 'all' };

  const SPECIES_CHIPS = [
    { id: 'all', label: 'All species' },
    { id: 'bass', label: 'Bass' },
    { id: 'walleye', label: 'Walleye' },
    { id: 'muskie', label: 'Muskie' },
    { id: 'catfish', label: 'Catfish' },
    { id: 'crappie', label: 'Crappie' },
    { id: 'striped', label: 'Stripers' },
    { id: 'redfish', label: 'Redfish' },
    { id: 'trout', label: 'Trout / salmon' },
    { id: 'snook', label: 'Snook' }
  ];

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  function fmtTemp(c, unit) {
    if (c == null || Number.isNaN(c)) return '—';
    if (unit === 'C') return `${c.toFixed(1)}°C`;
    return `${cToF(c).toFixed(1)}°F`;
  }

  function tempBand(f) {
    return (COOPS.tempBands || []).find((b) => f >= b.min && f < b.max) || null;
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    return new Date(iso).toLocaleString();
  }

  /* ---------- Live water temperatures ---------- */

  /**
   * New USGS Water Data API (waterservices.usgs.gov IV is often 503).
   * CORS: Access-Control-Allow-Origin: *
   * Docs: https://api.waterdata.usgs.gov/
   */
  function pickLatestTemp(features) {
    let best = null;
    for (const f of features || []) {
      const p = f.properties || {};
      const c = parseFloat(p.value);
      if (Number.isNaN(c) || c < -40 || c > 50) continue;
      const when = p.time;
      if (!best || (when && when > best.when)) {
        best = { c, when, unit: p.unit_of_measure || 'degC' };
      }
    }
    return best;
  }

  async function fetchUsgsStationTemp(stationId) {
    // Prefer last 24h; fall back to 3 days if sparse reporting
    for (const window of ['P1D', 'P3D']) {
      const url =
        'https://api.waterdata.usgs.gov/ogcapi/v0/collections/continuous/items' +
        `?monitoring_location_id=USGS-${stationId}` +
        `&parameter_code=00010&time=${window}&limit=500&f=json`;

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) continue;
        throw new Error(`USGS ${stationId} HTTP ${res.status}`);
      }
      const data = await res.json();
      const best = pickLatestTemp(data.features);
      if (best) {
        return {
          id: stationId,
          c: best.c,
          f: cToF(best.c),
          when: best.when,
          source: 'USGS Water Data'
        };
      }
    }
    return null;
  }

  async function fetchUsgsTemps() {
    const jobs = COOPS.usgsStations.map(async (st) => {
      try {
        const live = await fetchUsgsStationTemp(st.id);
        if (!live) return null;
        return {
          title: st.name,
          subtitle: st.near,
          species: st.species,
          ...live
        };
      } catch (e) {
        console.warn('USGS station failed', st.id, e);
        return null;
      }
    });
    return (await Promise.all(jobs)).filter(Boolean);
  }

  /**
   * Parse NOAA NDBC realtime text.
   * Columns: YY MM DD hh mm ... ATMP WTMP ...
   * WTMP is water temperature °C; "MM" = missing.
   */
  function parseNdbcText(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 3) return null;
    // Find first data row with a valid WTMP
    for (let i = 2; i < Math.min(lines.length, 40); i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length < 15) continue;
      // Standard realtime2 layout: indices 0-4 time, 13=ATMP, 14=WTMP
      const wtmp = parts[14];
      if (!wtmp || wtmp === 'MM' || wtmp === '999' || wtmp === '99.0') continue;
      const c = parseFloat(wtmp);
      if (Number.isNaN(c) || c < -2 || c > 40) continue;
      const [yy, mo, dd, hh, mm] = parts;
      const when = `${yy}-${mo.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00Z`;
      return { c, when };
    }
    return null;
  }

  async function fetchNdbcTemp(stationId) {
    // Prefer local proxy (serve.py) — NDBC blocks browser CORS
    const urls = [
      `/api/ndbc/${stationId}`,
      `/.netlify/functions/ndbc?id=${encodeURIComponent(stationId)}`,
      `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`
    ];
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        // JSON proxy response
        if (text.trim().startsWith('{')) {
          const j = JSON.parse(text);
          if (j.error) throw new Error(j.error);
          if (j.c != null) {
            return {
              id: stationId,
              c: j.c,
              f: cToF(j.c),
              when: j.when,
              source: 'NOAA NDBC'
            };
          }
        }
        const parsed = parseNdbcText(text);
        if (!parsed) continue;
        return {
          id: stationId,
          c: parsed.c,
          f: cToF(parsed.c),
          when: parsed.when,
          source: 'NOAA NDBC'
        };
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
    return null;
  }

  async function fetchNdbcTemps() {
    const stations = COOPS.ndbcStations || [];
    const jobs = stations.map(async (st) => {
      try {
        const live = await fetchNdbcTemp(st.id);
        if (!live) return null;
        return {
          title: st.name,
          subtitle: st.near,
          species: st.species,
          ...live
        };
      } catch (e) {
        console.warn('NDBC failed', st.id, e);
        return null;
      }
    });
    return (await Promise.all(jobs)).filter(Boolean);
  }

  async function fetchAllLiveTemps() {
    let usgs = [];
    let ndbc = [];
    try {
      usgs = await fetchUsgsTemps();
    } catch (e) {
      console.warn('USGS temps', e);
    }
    try {
      ndbc = await fetchNdbcTemps();
    } catch (e) {
      console.warn('NDBC temps', e);
    }
    liveTempReadings = [...usgs, ...ndbc];
    return { usgs, ndbc, results: liveTempReadings };
  }

  async function loadWaterTemps() {
    const grid = $('#tempGrid');
    const status = $('#tempStatus');
    if (!grid) {
      const silent = await fetchAllLiveTemps();
      if (silent.results.length && $('#depths')) {
        applyLiveSurfaceTemp(false);
        renderDepths();
      }
      return;
    }

    status.textContent = 'Pulling live gauges from USGS & NOAA…';
    grid.innerHTML = skeletonCards(6);

    const { usgs, ndbc, results } = await fetchAllLiveTemps();

    if (!results.length) {
      status.innerHTML =
        'Could not load live temps. ' +
        'If you opened the HTML file directly, run <code>python serve.py</code> in the Coops fishing folder and open <strong>http://localhost:8765</strong>.';
      grid.innerHTML = `<p class="empty-msg">No live readings right now. Click Refresh, or start the local server (<code>python serve.py</code>).</p>`;
      return;
    }

    results.sort((a, b) => b.f - a.f);

    const parts = [];
    if (usgs.length) parts.push(`<strong>USGS</strong> ${usgs.length} river/stream`);
    if (ndbc.length) parts.push(`<strong>NOAA NDBC</strong> ${ndbc.length} Great Lakes buoy`);
    status.innerHTML = `Live · ${parts.join(' · ')} · ${results.length} total readings`;

    if (typeof renderDepths === 'function' && $('#depths')) {
      applyLiveSurfaceTemp(false);
      renderDepths();
    }

    grid.innerHTML = results
      .map((r) => {
        const band = tempBand(r.f);
        const bandClass = bandClassName(r.f);
        return `
          <article class="temp-card ${bandClass}">
            <div class="temp-card-top">
              <div>
                <h3>${escapeHtml(r.title)}</h3>
                <p class="muted">${escapeHtml(r.subtitle || '')}</p>
              </div>
              <div class="temp-readout">
                <span class="temp-f">${r.f.toFixed(1)}°</span>
                <span class="temp-unit">F</span>
                <span class="temp-c">${r.c.toFixed(1)}°C</span>
              </div>
            </div>
            <div class="temp-meta">
              <span><i class="fa-solid fa-fish"></i> ${escapeHtml(r.species || '')}</span>
              <span><i class="fa-regular fa-clock"></i> ${escapeHtml(timeAgo(r.when))}</span>
            </div>
            ${
              band
                ? `<p class="temp-tip"><strong>${band.label}:</strong> ${band.tip}</p>`
                : ''
            }
            <p class="source-tag">${escapeHtml(r.source)}</p>
          </article>`;
      })
      .join('');
  }

  function bandClassName(f) {
    if (f < 45) return 'band-cold';
    if (f < 60) return 'band-cool';
    if (f < 72) return 'band-ideal';
    if (f < 80) return 'band-warm';
    return 'band-hot';
  }

  function skeletonCards(n) {
    return Array.from({ length: n }, () => `<div class="temp-card skeleton"></div>`).join('');
  }

  /* ---------- Spots / place filter ---------- */

  function renderSpots() {
    const grid = $('#spotsGrid');
    if (!grid) return;
    const list = COOPS.filterSpots(placeFilter);
    const total = (COOPS.spots || []).length;
    const count = $('#spotCount');
    if (count) {
      count.textContent = list.length === total ? `${total} waters` : `${list.length} of ${total}`;
    }
    if (!list.length) {
      grid.innerHTML = '<p class="empty-msg">No waters match that region / state / species. Clear a filter and try again.</p>';
      return;
    }
    grid.innerHTML = list
      .map((s) => {
        const chart = COOPS.depthChartById(s.id);
        const depthLine = chart
          ? `<p class="spot-depth"><i class="fa-solid fa-ruler-vertical"></i> Avg ${chart.avgDepth} ft · Max ${chart.maxDepth} ft · ${chart.areas.length} areas</p>
             <a class="spot-chart-link" href="${depthsUrl(s.id)}">Depth chart &amp; how deep to fish →</a>`
          : '';
        return `
      <article class="spot-card">
        <div class="spot-badge">${escapeHtml(s.region)}</div>
        <h3>${escapeHtml(s.name)}</h3>
        <p class="spot-state"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(s.state)}</p>
        <div class="species-tags">
          ${s.species.map((x) => `<span class="tag">${escapeHtml(x)}</span>`).join('')}
        </div>
        <p class="spot-why">${escapeHtml(s.why)}</p>
        <div class="spot-records">
          <strong><i class="fa-solid fa-trophy"></i> Record / trophy notes</strong>
          <p>${escapeHtml(s.records)}</p>
        </div>
        <p class="spot-best"><i class="fa-solid fa-calendar-days"></i> Best: ${escapeHtml(s.best)}</p>
        ${depthLine}
      </article>`;
      })
      .join('');

  }

  function statesInRegion(regionId) {
    const set = new Set();
    (COOPS.spots || []).forEach((s) => {
      if (regionId !== 'all' && s.regionId !== regionId) return;
      COOPS.spotStates(s).forEach((st) => set.add(st));
    });
    return [...set].sort();
  }

  function fillStateSelect(sel, regionId, current) {
    if (!sel) return;
    const states = statesInRegion(regionId);
    const names = COOPS.stateNames || {};
    const opts = ['<option value="all">All states</option>'].concat(
      states.map((st) => `<option value="${st}">${escapeHtml(names[st] || st)} (${st})</option>`)
    );
    sel.innerHTML = opts.join('');
    sel.value = states.indexOf(current) !== -1 ? current : 'all';
  }

  function renderRegionPills(host, current, onPick) {
    if (!host) return;
    const regions = COOPS.regions || [];
    host.innerHTML =
      `<button type="button" data-region="all" class="${current === 'all' ? 'active' : ''}">All regions</button>` +
      regions
        .map(
          (r) =>
            `<button type="button" data-region="${r.id}" class="${current === r.id ? 'active' : ''}">${escapeHtml(r.name)}</button>`
        )
        .join('');
    host.querySelectorAll('[data-region]').forEach((btn) => {
      btn.addEventListener('click', () => onPick(btn.dataset.region));
    });
  }

  function renderSpeciesPills() {
    const host = $('#speciesPills');
    if (!host) return;
    host.innerHTML = SPECIES_CHIPS.map(
      (s) =>
        `<button type="button" data-species="${s.id}" class="${placeFilter.species === s.id ? 'active' : ''}">${escapeHtml(s.label)}</button>`
    ).join('');
    host.querySelectorAll('[data-species]').forEach((btn) => {
      btn.addEventListener('click', () => {
        placeFilter.species = btn.dataset.species;
        renderSpeciesPills();
        renderSpots();
      });
    });
  }

  function syncSpotFilterChrome() {
    renderRegionPills($('#regionPills'), placeFilter.region, (id) => {
      placeFilter.region = id;
      placeFilter.state = 'all';
      fillStateSelect($('#stateSelect'), id, 'all');
      syncSpotFilterChrome();
      renderSpots();
    });
    renderSpeciesPills();
  }

  /* ---------- Depth charts, areas, column temps ---------- */

  function applyDepthQuery() {
    const q = new URLSearchParams(location.search);
    const water = q.get('water');
    const area = q.get('area');
    if (water) {
      selectedChartId = water;
      const spot = (COOPS.spots || []).find((s) => s.id === water);
      if (spot) {
        depthFilter.region = spot.regionId || 'all';
        depthFilter.state = 'all';
      }
    }
    if (area) selectedAreaId = area;
  }

  function openDepthChart(id, areaId) {
    if (!$('#depths')) {
      location.href = depthsUrl(id, areaId);
      return;
    }
    selectedChartId = id;
    selectedAreaId = areaId || null;
    const spot = (COOPS.spots || []).find((s) => s.id === id);
    if (spot) {
      depthFilter.region = spot.regionId || 'all';
      depthFilter.state = 'all';
    }
    applyLiveSurfaceTemp(false);
    renderDepths();
    history.replaceState(null, '', depthsUrl(id, areaId));
  }

  function chartForSelection() {
    return COOPS.depthChartById(selectedChartId);
  }

  function spotForChart(chart) {
    return (COOPS.spots || []).find((s) => s.id === chart.id);
  }

  function applyLiveSurfaceTemp(force) {
    const chart = chartForSelection();
    const match = pickLiveTempForChart(chart);
    if (match) {
      surfTempF = Math.round(match.f * 10) / 10;
      surfTempSource = match.source + ' · ' + match.title;
      const input = $('#surfTempInput');
      if (input) input.value = String(surfTempF);
      return;
    }
    if (force || surfTempF == null) {
      const spot = spotForChart(chart);
      surfTempF = COOPS.seasonalSurfaceF(new Date(), spot && spot.lat);
      surfTempSource = 'seasonal estimate for this latitude (no live gauge)';
      const input = $('#surfTempInput');
      if (input) input.value = String(surfTempF);
    }
  }

  function pickLiveTempForChart(chart) {
    if (!liveTempReadings.length) return null;
    const ids = new Set(chart.tempStations || []);
    const byId = liveTempReadings.find((r) => ids.has(r.id));
    if (byId) return byId;
    const spot = spotForChart(chart);
    if (!spot) return liveTempReadings[0];
    const needle = (spot.name + ' ' + spot.state).toLowerCase();
    return (
      liveTempReadings.find((r) => {
        const hay = (r.title + ' ' + (r.subtitle || '')).toLowerCase();
        return needle.split(/[^a-z]+/).some((w) => w.length > 4 && hay.includes(w));
      }) || null
    );
  }

  function renderDepths() {
    if (!$('#depths')) return;
    ensureChartInFilter();
    const chart = chartForSelection();
    if (!chart) return;

    try {
      renderDepthPills(chart);
      renderDepthOverview(chart);
      renderSchematic(chart);
      renderProfile(chart);
      renderAreas(chart);
      renderAreaDetail(chart);
      renderColumn(chart);
    } catch (e) {
      console.warn('Depth chart render', e);
    }
    renderDepthMap(chart);
  }

  function renderDepthPills(chart) {
    renderRegionPills($('#depthRegionPills'), depthFilter.region, (id) => {
      depthFilter.region = id;
      depthFilter.state = 'all';
      const next = COOPS.filterSpots({ region: id, state: 'all' });
      if (next.length && !next.some((s) => s.id === selectedChartId)) {
        selectedChartId = next[0].id;
        selectedAreaId = null;
        applyLiveSurfaceTemp(true);
      }
      renderDepths();
    });

    fillStateSelect($('#depthStateSelect'), depthFilter.region, depthFilter.state);
    const stateSel = $('#depthStateSelect');
    if (stateSel) depthFilter.state = stateSel.value;

    const waters = COOPS.filterSpots({ region: depthFilter.region, state: depthFilter.state });
    const waterSel = $('#depthWaterSelect');
    if (waterSel) {
      waterSel.innerHTML = waters
        .map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.state)})</option>`)
        .join('');
      if (waters.some((s) => s.id === selectedChartId)) waterSel.value = selectedChartId;
    }
    return chart;
  }

  function ensureChartInFilter() {
    const waters = COOPS.filterSpots({ region: depthFilter.region, state: depthFilter.state });
    if (waters.length && !waters.some((s) => s.id === selectedChartId)) {
      selectedChartId = waters[0].id;
      selectedAreaId = null;
      applyLiveSurfaceTemp(false);
    }
  }

  function shortChartName(c) {
    const spot = spotForChart(c);
    return spot ? spot.name.replace(' — ', ' · ') : c.id;
  }

  function renderDepthOverview(chart) {
    const host = $('#depthOverview');
    if (!host) return;
    const spot = spotForChart(chart);
    const src = (chart.sources || [])
      .map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`)
      .join('');
    host.innerHTML = `
      <div class="depth-stats">
        <h3>${escapeHtml(spot ? spot.name : chart.id)}</h3>
        <p class="muted">${escapeHtml(chart.waterType)} · ${escapeHtml(chart.acres)}</p>
        <p>${escapeHtml(chart.notes)}</p>
        <div class="depth-stat-row">
          <span>Mix type <strong>${escapeHtml(chart.mix)}</strong></span>
          <span>Named areas <strong>${chart.areas.length}</strong></span>
        </div>
        <div class="depth-sources">${src}</div>
      </div>
      <div class="depth-kpis">
        <div class="depth-kpi"><span>Average depth</span><strong>${chart.avgDepth} ft</strong></div>
        <div class="depth-kpi"><span>Max depth</span><strong>${chart.maxDepth} ft</strong></div>
        <div class="depth-kpi"><span>Surface used</span><strong>${surfTempF != null ? surfTempF.toFixed(1) + '°' : '—'}</strong></div>
        <div class="depth-kpi"><span>Column source</span><strong style="font-size:0.85rem;line-height:1.25">${escapeHtml(shortSource(surfTempSource))}</strong></div>
      </div>`;
  }

  function shortSource(s) {
    if (!s) return '—';
    return s.length > 42 ? s.slice(0, 40) + '…' : s;
  }

  function renderSchematic(chart) {
    const host = $('#depthSchematic');
    const legend = $('#depthLegend');
    if (!host) return;
    const c = chart.chart;
    const bands = (c.bands || [])
      .map((b) => `<path d="${b.d}" fill="${COOPS.bandColor(b.depth)}" stroke="none"></path>`)
      .join('');
    const islands = (c.islands || [])
      .map(
        (isl) =>
          `<path d="${isl.d}" fill="#e4d5b5" stroke="#5c4a32" stroke-width="1.2"></path>` +
          (isl.name
            ? `<text class="dc-label" x="${labelX(isl.d)}" y="${labelY(isl.d)}" text-anchor="middle">${escapeHtml(isl.name)}</text>`
            : '')
      )
      .join('');
    const labels = (c.labels || [])
      .map((l) => `<text class="dc-label" x="${l.x}" y="${l.y}">${escapeHtml(l.text)}</text>`)
      .join('');
    const pins = chart.areas
      .map((a, i) => {
        const on = a.id === selectedAreaId;
        return `<g class="dc-pin ${on ? 'is-on' : ''}" data-area="${a.id}" transform="translate(${a.x},${a.y})">
          <circle class="dc-pin-hit" r="16"></circle>
          <circle class="dc-pin-dot" r="11"></circle>
          <text y="4">${i + 1}</text>
        </g>`;
      })
      .join('');
    host.innerHTML = `
      <svg viewBox="${c.viewBox || '0 0 800 500'}" role="img" aria-label="Depth schematic">
        <defs>
          <pattern id="dcGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(90,70,40,0.12)" stroke-width="0.6"/>
          </pattern>
        </defs>
        <rect width="800" height="500" fill="#efe6d4"></rect>
        <rect width="800" height="500" fill="url(#dcGrid)"></rect>
        ${bands}
        ${islands}
        ${labels}
        ${pins}
      </svg>`;
    host.querySelectorAll('[data-area]').forEach((g) => {
      g.addEventListener('click', () => {
        selectedAreaId = g.getAttribute('data-area');
        renderDepths();
      });
    });

    if (legend) {
      const uniq = [...new Set((c.bands || []).map((b) => b.depth))].sort((a, b) => a - b);
      legend.innerHTML = uniq
        .map((d, i) => {
          const next = uniq[i + 1];
          const label = next == null ? `${d}+ ft` : `${d}–${next} ft`;
          return `<span><i style="background:${COOPS.bandColor(d)}"></i>${label}</span>`;
        })
        .join('');
    }
  }

  function labelX(d) {
    const m = /M\s*([\d.]+)/.exec(d);
    return m ? Number(m[1]) : 0;
  }
  function labelY(d) {
    const m = /M\s*[\d.]+\s+([\d.]+)/.exec(d);
    return m ? Number(m[1]) - 14 : 0;
  }

  function renderProfile(chart) {
    const host = $('#depthProfile');
    if (!host) return;
    const pts = chart.profile || [];
    if (!pts.length) {
      host.innerHTML = '';
      return;
    }
    const W = 800;
    const H = 170;
    const maxD = Math.max(...pts.map((p) => p.d), 10) * 1.15;
    const xy = pts.map((p) => [20 + (p.x / 100) * (W - 40), 28 + (p.d / maxD) * (H - 50)]);
    const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const fill = `${line} L${xy[xy.length - 1][0].toFixed(1)},${H - 12} L${xy[0][0].toFixed(1)},${H - 12} Z`;
    const labels = pts
      .map((p, i) => {
        const [x, y] = xy[i];
        return `<text x="${x}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#5c4a32" font-weight="600">${escapeHtml(p.label)}</text>
                <text x="${x}" y="${H - 2}" text-anchor="middle" font-size="10" fill="#8a7a62">${p.d} ft</text>`;
      })
      .join('');
    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Depth cross-section">
        <rect width="${W}" height="${H}" fill="#f7f1e4" rx="10"></rect>
        <path d="${fill}" fill="#4db8d9" opacity="0.35"></path>
        <path d="${line}" fill="none" stroke="#1a4a6e" stroke-width="2.4"></path>
        ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#0f2744"></circle>`).join('')}
        ${labels}
      </svg>`;
  }

  function renderAreas(chart) {
    const host = $('#areasGrid');
    if (!host) return;
    host.innerHTML = chart.areas
      .map((a, i) => {
        const on = a.id === selectedAreaId;
        return `
        <button type="button" class="area-card ${on ? 'is-on' : ''}" data-area="${a.id}">
          <div style="display:flex;align-items:center;gap:0.55rem">
            <span class="area-num">${i + 1}</span>
            <div>
              <h4>${escapeHtml(a.name)}</h4>
              <div class="area-kind">${escapeHtml(a.kind)} · ${escapeHtml(a.depth)}</div>
            </div>
          </div>
          <p>${escapeHtml(a.structure)}</p>
          <div class="species-tags">${a.species.map((x) => `<span class="tag">${escapeHtml(x)}</span>`).join('')}</div>
        </button>`;
      })
      .join('');
    host.querySelectorAll('[data-area]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedAreaId = btn.dataset.area;
        renderDepths();
        $('#areaDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  function renderAreaDetail(chart) {
    const host = $('#areaDetail');
    if (!host) return;
    const area = chart.areas.find((a) => a.id === selectedAreaId);
    if (!area) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    const coord = `${area.lat.toFixed(3)}°, ${area.lon.toFixed(3)}°`;
    host.innerHTML = `
      <h3>${escapeHtml(area.name)}</h3>
      <p class="area-kind">${escapeHtml(area.kind)} · typical ${escapeHtml(area.depth)} · ${escapeHtml(coord)}</p>
      <p>${escapeHtml(area.tip)}</p>
      <p class="muted small" style="margin-top:0.45rem"><i class="fa-solid fa-calendar-days"></i> ${escapeHtml(area.season)}</p>
      <p class="muted small">${escapeHtml(area.structure)}</p>`;
  }

  function renderColumn(chart) {
    if (surfTempF == null) applyLiveSurfaceTemp(true);
    const input = $('#surfTempInput');
    if (input && document.activeElement !== input) input.value = String(surfTempF);

    const col = COOPS.waterColumn(Number(surfTempF), new Date(), chart);
    const status = $('#columnStatus');
    if (status) {
      status.textContent = `${COOPS.regimeLabel(col.regime)} · surface ${col.surfaceF}°F (${surfTempSource})`;
    }

    const chartHost = $('#columnChart');
    if (chartHost) {
      const H = 420;
      const W = 260;
      const top = 28;
      const bot = H - 24;
      const span = bot - top;
      const yOf = (ft) => top + (ft / col.maxDepth) * span;
      const tMin = Math.min(...col.samples.map((s) => s.f), 32);
      const tMax = Math.max(...col.samples.map((s) => s.f), 80);
      const xOf = (f) => 70 + ((f - tMin) / Math.max(1, tMax - tMin)) * 150;

      const path = col.samples
        .map((s, i) => `${i ? 'L' : 'M'}${xOf(s.f).toFixed(1)},${yOf(s.ft).toFixed(1)}`)
        .join(' ');

      let thermo = '';
      if (col.regime === 'stratified' || col.regime === 'forming') {
        const y1 = yOf(col.thermoTop);
        const y2 = yOf(col.thermoBot);
        thermo = `<rect x="28" y="${y1}" width="210" height="${Math.max(8, y2 - y1)}" fill="rgba(231,111,81,0.12)"></rect>
          <text x="32" y="${y1 + 14}" font-size="10" fill="#c45c3e" font-weight="700">Thermocline ${col.thermoTop}–${col.thermoBot} ft</text>`;
      }

      const ticks = col.samples
        .filter((_, i) => i % Math.ceil(col.samples.length / 8) === 0)
        .map(
          (s) =>
            `<text x="24" y="${yOf(s.ft) + 4}" font-size="10" text-anchor="end" fill="#5c6b7a">${s.ft} ft</text>
             <text x="${xOf(s.f) + 6}" y="${yOf(s.ft) + 4}" font-size="10" fill="#0f2744">${s.f.toFixed(0)}°</text>`
        )
        .join('');

      chartHost.innerHTML = `
        <svg class="column-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Temperature by depth">
          <rect width="${W}" height="${H}" rx="12" fill="#f4f8fa"></rect>
          ${thermo}
          <path d="${path}" fill="none" stroke="#2b7a9e" stroke-width="3" stroke-linecap="round"></path>
          ${col.samples.map((s) => `<circle cx="${xOf(s.f)}" cy="${yOf(s.ft)}" r="3" fill="#0f2744"></circle>`).join('')}
          ${ticks}
          <text x="130" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#5c6b7a">Temp (°F) vs depth</text>
        </svg>`;
    }

    const adviceHost = $('#columnAdvice');
    if (adviceHost) {
      const spot = spotForChart(chart);
      const species = (spot && spot.species) || [];
      const cards = species
        .map((name) => {
          const adv = COOPS.fishDepthAdvice(col, name, chart);
          if (!adv) return '';
          const cls = adv.tooWarm ? 'too-warm' : adv.tooCold ? 'too-cold' : '';
          const areaBtns = adv.areas
            .slice(0, 5)
            .map((a) => `<button type="button" data-area="${a.id}">${escapeHtml(a.name)}</button>`)
            .join('');
          const range = `${adv.comfort.sweet[0]}–${adv.comfort.sweet[1]}°F ideal`;
          return `
            <article class="advice-card ${cls}">
              <h4>${escapeHtml(name)} <span class="muted small">${range}</span></h4>
              <div class="headline">${escapeHtml(adv.headline)}</div>
              <p class="muted small">${escapeHtml(adv.detail)}</p>
              ${areaBtns ? `<div class="advice-areas">${areaBtns}</div>` : ''}
            </article>`;
        })
        .join('');
      adviceHost.innerHTML =
        cards || '<p class="muted">No species advice for this water.</p>';
      adviceHost.querySelectorAll('[data-area]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedAreaId = btn.dataset.area;
          renderDepths();
        });
      });
    }
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (window.__leafletP) return window.__leafletP;
    window.__leafletP = new Promise((resolve, reject) => {
      const urls = [
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
      ];
      const tryUrl = (i) => {
        if (i >= urls.length) {
          reject(new Error('Leaflet failed to load'));
          return;
        }
        const s = document.createElement('script');
        s.src = urls[i];
        s.async = true;
        s.onload = () => (window.L ? resolve(window.L) : tryUrl(i + 1));
        s.onerror = () => tryUrl(i + 1);
        document.head.appendChild(s);
      };
      tryUrl(0);
    });
    return window.__leafletP;
  }

  function renderDepthMap(chart) {
    const el = $('#depthMap');
    if (!el) return;
    if (typeof L === 'undefined') {
      if (!el.dataset.waiting) {
        el.dataset.waiting = '1';
        el.innerHTML = '<p class="empty-msg" style="padding:1rem">Loading map…</p>';
      }
      loadLeaflet()
        .then(() => {
          delete el.dataset.waiting;
          el.innerHTML = '';
          depthMap = null;
          renderDepthMap(chart);
        })
        .catch(() => {
          el.innerHTML =
            '<p class="empty-msg" style="padding:1rem">Map tiles need a network connection. The schematic and area list still work.</p>';
        });
      return;
    }
    if (!depthMap) {
      depthMap = L.map(el, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 16,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(depthMap);
    }
    depthMarkers.forEach((m) => m.remove());
    depthMarkers = [];
    const bounds = [];
    chart.areas.forEach((a, i) => {
      const on = a.id === selectedAreaId;
      const icon = L.divIcon({
        className: 'dc-map-pin' + (on ? ' is-on' : ''),
        html: `<span>${i + 1}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = L.marker([a.lat, a.lon], { icon })
        .addTo(depthMap)
        .bindPopup(
          `<strong>${escapeHtml(a.name)}</strong><br>${escapeHtml(a.kind)} · ${escapeHtml(a.depth)}`
        );
      marker.on('click', () => {
        selectedAreaId = a.id;
        renderDepths();
      });
      depthMarkers.push(marker);
      bounds.push([a.lat, a.lon]);
    });
    if (bounds.length) {
      depthMap.fitBounds(bounds, { padding: [28, 28], maxZoom: 11 });
    }
    setTimeout(() => depthMap.invalidateSize(), 80);
  }

  function initDepthControls() {
    $('#surfForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = parseFloat($('#surfTempInput')?.value);
      if (!Number.isNaN(v)) {
        surfTempF = v;
        surfTempSource = 'manual entry';
        renderDepths();
      }
    });
    $('#useLiveSurf')?.addEventListener('click', () => {
      applyLiveSurfaceTemp(true);
      if (!pickLiveTempForChart(chartForSelection())) {
        surfTempSource = 'seasonal estimate (no live gauge for this water)';
      }
      renderDepths();
    });
  }

  /* ---------- Bait guide ---------- */

  function renderBait() {
    const grid = $('#baitGrid');
    if (!grid) return;
    grid.innerHTML = COOPS.baitGuide
      .map(
        (b) => `
      <article class="bait-card">
        <header>
          <span class="bait-icon">${b.icon}</span>
          <h3>${escapeHtml(b.species)}</h3>
        </header>
        <div class="bait-cols">
          <div>
            <h4>Live / Natural</h4>
            <ul>${b.live.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
          </div>
          <div>
            <h4>Artificial</h4>
            <ul>${b.artificial.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
          </div>
        </div>
        <p class="bait-tips">${escapeHtml(b.tips)}</p>
        <p class="bait-temp"><i class="fa-solid fa-temperature-half"></i> ${escapeHtml(b.temp)}</p>
      </article>`
      )
      .join('');
  }

  /* ---------- Lunar / Solar UI ---------- */

  let chartLat = DEFAULT_LAT;
  let chartLon = DEFAULT_LON;
  let chartDate = new Date();

  function setLocationFromSelect() {
    const sel = $('#locationSelect');
    if (!sel) return;
    const val = sel.value;
    if (val === 'custom') return;
    const [lat, lon] = val.split(',').map(Number);
    chartLat = lat;
    chartLon = lon;
    renderAstro();
  }

  function renderAstro() {
    const day = COOPS.astro.dayAstro(chartDate, chartLat, chartLon);
    const phaseEl = $('#phaseDisplay');
    const solarEl = $('#solarPanel');
    const solunarEl = $('#solunarPanel');
    const monthEl = $('#moonCalendar');
    const ratingEl = $('#dayRating');
    const dateLabel = $('#astroDateLabel');

    if (dateLabel) {
      dateLabel.textContent = chartDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    if (phaseEl) {
      phaseEl.innerHTML = `
        <div class="phase-emoji">${day.phase.emoji}</div>
        <div>
          <h3>${day.phase.name}</h3>
          <p class="muted">${day.phase.pct}% illuminated · age ${day.phase.age.toFixed(1)} days</p>
          <div class="moon-bar"><div class="moon-bar-fill" style="width:${day.phase.pct}%"></div></div>
        </div>`;
    }

    if (ratingEl) {
      const stars = '★'.repeat(day.rating) + '☆'.repeat(5 - day.rating);
      ratingEl.innerHTML = `
        <span class="rating-stars">${stars}</span>
        <span class="rating-label">${COOPS.astro.ratingLabel(day.rating)} fishing day</span>
        <p class="muted small">Solunar rating favors new &amp; full moons — use with weather, temp, and local knowledge.</p>`;
    }

    if (solarEl) {
      const dl = day.dayLengthHrs != null ? `${day.dayLengthHrs.toFixed(1)} hrs` : '—';
      solarEl.innerHTML = `
        <div class="astro-row"><span>Sunrise</span><strong>${COOPS.astro.formatTime(day.sunrise)}</strong></div>
        <div class="astro-row"><span>Solar noon</span><strong>${COOPS.astro.formatTime(day.solarNoon)}</strong></div>
        <div class="astro-row"><span>Sunset</span><strong>${COOPS.astro.formatTime(day.sunset)}</strong></div>
        <div class="astro-row"><span>Day length</span><strong>${dl}</strong></div>
        <div class="astro-row highlight"><span>Golden hour AM</span><strong>${
          day.goldenMorning
            ? COOPS.astro.formatTime(day.goldenMorning.start) + ' – ' + COOPS.astro.formatTime(day.goldenMorning.end)
            : '—'
        }</strong></div>
        <div class="astro-row highlight"><span>Golden hour PM</span><strong>${
          day.goldenEvening
            ? COOPS.astro.formatTime(day.goldenEvening.start) + ' – ' + COOPS.astro.formatTime(day.goldenEvening.end)
            : '—'
        }</strong></div>
        <div class="astro-row"><span>Blue hour AM</span><strong>${
          day.blueMorning
            ? COOPS.astro.formatTime(day.blueMorning.start) + ' – ' + COOPS.astro.formatTime(day.blueMorning.end)
            : '—'
        }</strong></div>
        <div class="astro-row"><span>Blue hour PM</span><strong>${
          day.blueEvening
            ? COOPS.astro.formatTime(day.blueEvening.start) + ' – ' + COOPS.astro.formatTime(day.blueEvening.end)
            : '—'
        }</strong></div>`;
    }

    if (solunarEl) {
      const blocks = [
        ...day.majors.map((m) => ({ ...m, cls: 'major' })),
        ...day.minors.map((m) => ({ ...m, cls: 'minor' }))
      ].sort((a, b) => a.peak - b.peak);

      solunarEl.innerHTML = `
        <div class="astro-row"><span>Moonrise</span><strong>${COOPS.astro.formatTime(day.moonrise)}</strong></div>
        <div class="astro-row"><span>Moonset</span><strong>${COOPS.astro.formatTime(day.moonset)}</strong></div>
        <h4 class="solunar-heading">Predicted feeding windows</h4>
        ${
          blocks.length
            ? blocks
                .map(
                  (b) => `
            <div class="solunar-block ${b.cls}">
              <div class="solunar-label">${escapeHtml(b.label)}</div>
              <div class="solunar-time">${COOPS.astro.formatTime(b.start)} – ${COOPS.astro.formatTime(b.end)}</div>
              <div class="solunar-peak">Peak ~ ${COOPS.astro.formatTime(b.peak)}</div>
            </div>`
                )
                .join('')
            : '<p class="muted">Could not compute periods for this location/date.</p>'
        }
        <p class="muted small">Majors ≈ moon overhead/underfoot (±1 hr). Minors ≈ moonrise/moonset (±30 min). Classic solunar theory — not a guarantee.</p>`;

      // Day timeline chart
      renderTimeline(day);
    }

    if (monthEl) {
      const year = chartDate.getFullYear();
      const month = chartDate.getMonth();
      const days = COOPS.astro.monthPhases(year, month);
      const monthName = chartDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      $('#moonMonthLabel').textContent = monthName;
      monthEl.innerHTML = days
        .map((d) => {
          const isToday =
            d.date.getDate() === chartDate.getDate() &&
            d.date.getMonth() === chartDate.getMonth() &&
            d.date.getFullYear() === chartDate.getFullYear();
          const isPeak = d.pct < 5 || d.pct > 95 || (d.pct > 45 && d.pct < 55 && (d.name.includes('Quarter')));
          const isFullNew = d.name === 'Full Moon' || d.name === 'New Moon';
          return `
            <button type="button" class="moon-day ${isToday ? 'is-today' : ''} ${isFullNew ? 'is-peak' : ''}"
              data-day="${d.day}" title="${d.name} · ${d.pct}%">
              <span class="md-num">${d.day}</span>
              <span class="md-emoji">${d.emoji}</span>
            </button>`;
        })
        .join('');

      monthEl.querySelectorAll('.moon-day').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dayNum = parseInt(btn.dataset.day, 10);
          chartDate = new Date(year, month, dayNum, 12, 0, 0);
          renderAstro();
        });
      });
    }
  }

  function renderTimeline(day) {
    const el = $('#dayTimeline');
    if (!el) return;

    const start = new Date(chartDate.getFullYear(), chartDate.getMonth(), chartDate.getDate(), 0, 0, 0);
    const px = (d) => {
      if (!d) return null;
      const mins = (d - start) / 60000;
      return Math.max(0, Math.min(100, (mins / (24 * 60)) * 100));
    };

    const segments = [];
    // night / day background handled in CSS; mark solar
    if (day.sunrise && day.sunset) {
      const a = px(day.sunrise);
      const b = px(day.sunset);
      segments.push(`<div class="tl-daylight" style="left:${a}%;width:${b - a}%"></div>`);
    }
    day.majors.forEach((m) => {
      const a = px(m.start);
      const b = px(m.end);
      if (a == null) return;
      segments.push(
        `<div class="tl-major" style="left:${a}%;width:${Math.max(1.5, b - a)}%" title="${m.label}"></div>`
      );
    });
    day.minors.forEach((m) => {
      const a = px(m.start);
      const b = px(m.end);
      if (a == null) return;
      segments.push(
        `<div class="tl-minor" style="left:${a}%;width:${Math.max(1, b - a)}%" title="${m.label}"></div>`
      );
    });
    // now marker if today
    const now = new Date();
    if (
      now.getFullYear() === chartDate.getFullYear() &&
      now.getMonth() === chartDate.getMonth() &&
      now.getDate() === chartDate.getDate()
    ) {
      const n = px(now);
      segments.push(`<div class="tl-now" style="left:${n}%"></div>`);
    }

    el.innerHTML = `
      <div class="tl-track">${segments.join('')}</div>
      <div class="tl-hours">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
      </div>
      <div class="tl-legend">
        <span><i class="swatch major"></i> Major</span>
        <span><i class="swatch minor"></i> Minor</span>
        <span><i class="swatch day"></i> Daylight</span>
        <span><i class="swatch now"></i> Now</span>
      </div>`;
  }

  /* ---------- Helpers ---------- */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initNav() {
    const btn = $('#menuBtn');
    const menu = $('#mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', () => menu.classList.toggle('open'));
      $$('#mobileMenu a').forEach((a) => a.addEventListener('click', () => menu.classList.remove('open')));
    }
    const file = currentFile();
    $$('.nav-links a, #mobileMenu a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('?')[0];
      const isHome = file === 'index.html' && (href === 'index.html' || href === './' || href === '/');
      a.classList.toggle('active', href === file || isHome);
    });
  }

  function initFeedback() {
    const modal = $('#feedbackModal');
    const form = $('#feedbackForm');
    const status = $('#fbStatus');
    const submit = $('#fbSubmit');
    if (!modal || !form) return;

    const water = $('#fbWater');
    if (water && !(water.options.length > 1)) {
      const groups = {};
      (COOPS.spots || []).forEach((s) => {
        const rid = s.regionId || 'other';
        if (!groups[rid]) groups[rid] = [];
        groups[rid].push(s);
      });
      (COOPS.regions || []).forEach((r) => {
        const list = groups[r.id] || [];
        if (!list.length) return;
        const og = document.createElement('optgroup');
        og.label = r.name;
        list.forEach((s) => {
          const opt = document.createElement('option');
          opt.value = s.name;
          opt.textContent = s.name + ' (' + s.state + ')';
          og.appendChild(opt);
        });
        water.appendChild(og);
      });
    }

    const open = () => {
      modal.classList.remove('is-closed');
      document.body.style.overflow = 'hidden';
      $('#fbMessage')?.focus();
    };
    const close = () => {
      modal.classList.add('is-closed');
      document.body.style.overflow = '';
    };

    $$('[data-open-feedback], #mobileFeedback').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        open();
      });
    });
    $('#feedbackClose')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('is-closed')) close();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.website && form.website.value) return;
      const payload = {
        kind: (form.kind && form.kind.value) || 'idea',
        message: ($('#fbMessage')?.value || '').trim(),
        water: $('#fbWater')?.value || '',
        name: ($('#fbName')?.value || '').trim(),
        email: ($('#fbEmail')?.value || '').trim(),
        href: location.href,
        when: new Date().toISOString()
      };
      if (payload.message.length < 4) {
        setFbStatus('Tell me a little more — a sentence is enough.', 'err');
        return;
      }
      submit.disabled = true;
      setFbStatus('Sending…', '');
      try {
        const ok = await sendFeedback(payload);
        if (!ok) throw new Error('not delivered');
        form.reset();
        setFbStatus('Got it. Thanks — this is how the desk gets better.', 'ok');
        setTimeout(close, 1400);
      } catch (err) {
        setFbStatus('Could not send just now. Try again in a minute, or email the note to the site owner.', 'err');
      } finally {
        submit.disabled = false;
      }
    });

    function setFbStatus(text, cls) {
      if (!status) return;
      status.textContent = text;
      status.className = 'fb-status' + (cls ? ' ' + cls : '');
    }
  }

  async function sendFeedback(payload) {
    const cfg = COOPS.feedback || {};
    const encoded = new URLSearchParams({
      'form-name': 'feedback',
      kind: payload.kind,
      message: payload.message,
      water: payload.water,
      name: payload.name,
      email: payload.email,
      href: payload.href,
      when: payload.when,
      website: ''
    }).toString();

    // Netlify Function — works even if Forms has not registered yet
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return true;
    } catch (e) {
      /* not on Netlify / no function */
    }

    // Netlify Forms AJAX
    for (const url of ['/', '/index.html', '/?form-name=feedback']) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encoded
        });
        if (res.ok || res.status === 303 || res.status === 302) return true;
      } catch (e) {
        /* try next */
      }
    }

    const endpoints = [];
    if (cfg.endpoint && cfg.endpoint !== '/api/feedback') {
      endpoints.push({ type: 'local', url: cfg.endpoint });
    }
    if (cfg.email && /@/.test(cfg.email)) {
      endpoints.push({
        type: 'formsubmit',
        url: 'https://formsubmit.co/ajax/' + encodeURIComponent(cfg.email)
      });
    }

    for (const ep of endpoints) {
      try {
        const body =
          ep.type === 'formsubmit'
            ? {
                ...payload,
                _subject: "Coop's Fishing feedback: " + payload.kind,
                _template: 'table',
                _captcha: 'false'
              }
            : payload;
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) return true;
      } catch (e) {
        /* try the next delivery path */
      }
    }

    if (cfg.email && /@/.test(cfg.email)) {
      const subject = encodeURIComponent("Coop's Fishing feedback: " + payload.kind);
      const body = encodeURIComponent(
        payload.message +
          '\n\nWater: ' +
          (payload.water || 'n/a') +
          '\nFrom: ' +
          (payload.name || 'anonymous') +
          ' ' +
          (payload.email || '')
      );
      window.location.href = 'mailto:' + cfg.email + '?subject=' + subject + '&body=' + body;
      return true;
    }
    return false;
  }

  function initSearch() {
    wireSearchBox($('#globalSearch'), $('#searchResults'), $('#searchForm'));
    wireSearchBox($('#heroSearch'), $('#heroSearchResults'), $('#heroSearchForm'));

    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      ($('#globalSearch') || $('#heroSearch'))?.focus();
    });
  }

  function wireSearchBox(input, panel, form) {
    if (!input || !panel) return;
    let active = -1;
    let items = [];

    const run = () => {
      items = COOPS.searchAll(input.value);
      active = items.length ? 0 : -1;
      renderSearchPanel(panel, items, active);
    };

    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!items.length) return;
        active = (active + 1) % items.length;
        renderSearchPanel(panel, items, active);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        active = (active - 1 + items.length) % items.length;
        renderSearchPanel(panel, items, active);
      } else if (e.key === 'Escape') {
        panel.hidden = true;
        input.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active >= 0 && items[active]) goToSearchHit(items[active], input, panel);
      }
    });
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (active >= 0 && items[active]) goToSearchHit(items[active], input, panel);
      else if (items[0]) goToSearchHit(items[0], input, panel);
    });
    panel.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('[data-search-i]');
      if (!btn) return;
      const hit = items[Number(btn.dataset.searchI)];
      if (hit) goToSearchHit(hit, input, panel);
    });
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== input) panel.hidden = true;
    });
  }

  function renderSearchPanel(panel, items, active) {
    if (!panel) return;
    if (!items.length) {
      const q = ($('#globalSearch')?.value || $('#heroSearch')?.value || '').trim();
      panel.hidden = q.length < 2;
      panel.innerHTML = q.length >= 2 ? '<p class="search-empty">No waters or areas match that search.</p>' : '';
      return;
    }
    panel.hidden = false;
    panel.innerHTML = items
      .map((hit, i) => {
        const ico = hit.type === 'area' ? 'fa-location-dot' : 'fa-water';
        return `<button type="button" class="search-hit ${i === active ? 'is-on' : ''}" data-search-i="${i}" role="option">
          <span class="search-hit-ico ${hit.type}"><i class="fa-solid ${ico}"></i></span>
          <span><strong>${escapeHtml(hit.label)}</strong><span>${escapeHtml(hit.sub)}</span></span>
        </button>`;
      })
      .join('');
  }

  function goToSearchHit(hit, input, panel) {
    if (panel) panel.hidden = true;
    if (input) {
      input.value = hit.label;
      input.blur();
    }
    location.href = depthsUrl(hit.id, hit.areaId || null);
  }

  function initFilters() {
    fillStateSelect($('#stateSelect'), 'all', 'all');
    syncSpotFilterChrome();
    $('#stateSelect')?.addEventListener('change', (e) => {
      placeFilter.state = e.target.value;
      renderSpots();
    });
    let searchTimer;
    $('#spotSearch')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        placeFilter.q = e.target.value;
        renderSpots();
      }, 150);
    });
    $('#depthStateSelect')?.addEventListener('change', (e) => {
      depthFilter.state = e.target.value;
      const waters = COOPS.filterSpots({ region: depthFilter.region, state: depthFilter.state });
      if (waters.length && !waters.some((s) => s.id === selectedChartId)) {
        selectedChartId = waters[0].id;
        selectedAreaId = null;
        applyLiveSurfaceTemp(true);
      }
      renderDepths();
    });
    $('#depthWaterSelect')?.addEventListener('change', (e) => {
      selectedChartId = e.target.value;
      selectedAreaId = null;
      applyLiveSurfaceTemp(true);
      renderDepths();
    });
  }

  function fillLocationSelect() {
    const sel = $('#locationSelect');
    if (!sel) return;
    const groups = {};
    (COOPS.spots || []).forEach((s) => {
      const rid = s.regionId || 'other';
      if (!groups[rid]) groups[rid] = [];
      groups[rid].push(s);
    });
    const regions = COOPS.regions || [];
    let html = '<option value="39.8,-98.6">Center of the Lower 48 (default)</option>';
    regions.forEach((r) => {
      const list = groups[r.id] || [];
      if (!list.length) return;
      html += `<optgroup label="${escapeHtml(r.name)}">`;
      list.forEach((s) => {
        html += `<option value="${s.lat},${s.lon}">${escapeHtml(s.name)}</option>`;
      });
      html += '</optgroup>';
    });
    html += '<option value="custom">Custom (use my location)</option>';
    sel.innerHTML = html;
  }

  function initAstroControls() {
    $('#locationSelect')?.addEventListener('change', setLocationFromSelect);
    $('#astroPrev')?.addEventListener('click', () => {
      chartDate = new Date(chartDate.getFullYear(), chartDate.getMonth(), chartDate.getDate() - 1, 12);
      renderAstro();
    });
    $('#astroNext')?.addEventListener('click', () => {
      chartDate = new Date(chartDate.getFullYear(), chartDate.getMonth(), chartDate.getDate() + 1, 12);
      renderAstro();
    });
    $('#astroToday')?.addEventListener('click', () => {
      chartDate = new Date();
      renderAstro();
    });
    $('#refreshTemps')?.addEventListener('click', () => loadWaterTemps());

    // geolocation optional
    $('#useMyLocation')?.addEventListener('click', () => {
      if (!navigator.geolocation) return alert('Geolocation not available in this browser.');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          chartLat = pos.coords.latitude;
          chartLon = pos.coords.longitude;
          const sel = $('#locationSelect');
          if (sel) sel.value = 'custom';
          $('#customLocLabel').textContent = `${chartLat.toFixed(2)}°, ${chartLon.toFixed(2)}°`;
          renderAstro();
        },
        () => alert('Could not get location. Pick a preset instead.')
      );
    });
  }

  /* ---------- Boot ---------- */

  function boot() {
    if (window.__COOPS_BOOTED__) return;
    window.__COOPS_BOOTED__ = true;
    initNav();
    initSearch();
    initFeedback();
    initFilters();
    fillLocationSelect();
    initAstroControls();
    initDepthControls();
    applyDepthQuery();
    applyLiveSurfaceTemp(true);
    renderSpots();
    renderBait();
    renderAstro();
    renderDepths();
    if ($('#tempGrid') || $('#depths')) loadWaterTemps();
    if ($('#depths')) {
      requestAnimationFrame(() => renderDepths());
    }
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
    renderUsage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function renderUsage() {
    const el = $('#usagePanel');
    if (!el) return;
    el.textContent = 'Loading usage…';
    fetch('/api/hit')
      .then((r) => r.json())
      .then((data) => {
        const all = (data && data.all) || { pages: {}, total: 0 };
        const day = (data && data.day) || { pages: {}, total: 0 };
        const names = {
          home: 'Home',
          index: 'Home',
          temps: 'Water Temps',
          spots: 'Hot Spots',
          depths: 'Depth Charts',
          bait: 'Bait Guide',
          charts: 'Lunar & Solar',
          about: 'About',
          usage: 'Usage'
        };
        const rows = Object.keys(all.pages || {})
          .sort((a, b) => all.pages[b] - all.pages[a])
          .map((k) => {
            const label = names[k] || k;
            const n = all.pages[k] || 0;
            const d = (day.pages && day.pages[k]) || 0;
            return `<tr><td>${escapeHtml(label)}</td><td>${d}</td><td>${n}</td></tr>`;
          })
          .join('');
        el.innerHTML =
          '<p class="muted">Page views since this tracker went live. Today vs all time.</p>' +
          '<table class="usage-table"><thead><tr><th>Page</th><th>Today</th><th>All time</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="3">No views yet.</td></tr>') +
          '</tbody></table>' +
          '<p class="muted small">Total: ' +
          (all.total || 0) +
          ' · Today: ' +
          (day.total || 0) +
          '</p>';
      })
      .catch(() => {
        el.textContent = 'Usage stats are only available on the live Netlify site.';
      });
  }
})();
