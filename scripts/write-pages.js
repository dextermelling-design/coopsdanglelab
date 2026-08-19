const fs = require('fs');
const path = require('path');

function page({ file, id, title, desc, extraHead, extraScripts, body }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="icon" href="assets/images/logo-mark.jpg" type="image/jpeg">
  <link rel="apple-touch-icon" href="assets/images/logo-mark.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  ${extraHead || ''}
  <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body data-page="${id}">
<script src="assets/js/chrome.js"></script>
<main class="page-sheet">
${body}
</main>
<script src="assets/js/chrome-end.js"></script>
<script src="assets/js/data.js"></script>
<script src="assets/js/national.js"></script>
<script src="assets/js/depths.js"></script>
${extraScripts || ''}
<script src="assets/js/app.js"></script>
<script src="assets/js/track.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, '..', file), html);
  console.log('wrote', file);
}

page({
  file: 'temps.html',
  id: 'temps',
  title: "Live Water Temps | Coop's Fishing",
  desc: 'Live USGS and NOAA water temperatures near popular U.S. fisheries.',
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Conditions</span>
          <h2>Live water temperatures</h2>
          <p>
            Real-time readings from USGS stream gauges near popular U.S. fisheries,
            plus NOAA coastal and Great Lakes buoy water temperatures when available.
          </p>
        </div>
        <div class="section-tools">
          <button type="button" class="btn btn-primary btn-sm" id="refreshTemps">
            <i class="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
        </div>
        <p class="status-line" id="tempStatus">Loading…</p>
        <div class="temp-grid" id="tempGrid" aria-live="polite"></div>
        <p class="status-line" style="margin-top:1.25rem">
          <i class="fa-solid fa-circle-info"></i>
          USGS values are provisional. Lake surface temps are model estimates near the coordinates listed — actual fishing depths may differ.
          Always check local regs and ice safety.
        </p>
      </div>`
});

page({
  file: 'spots.html',
  id: 'spots',
  title: "Hot Spots | Coop's Fishing",
  desc: 'Featured U.S. fishing waters by region, state, and species.',
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Where to go</span>
          <h2>Featured U.S. fishing spots</h2>
          <p>
            Start with a region, then a state. These are well-known public destinations —
            not every pond in the country, and not secret waypoints.
          </p>
        </div>
        <div class="place-filter" id="spotFilters">
          <div class="filter-pills" id="regionPills" role="group" aria-label="Filter by region"></div>
          <div class="place-filter-row">
            <label>State <select id="stateSelect"></select></label>
            <label class="grow">Filter this list
              <input type="search" id="spotSearch" placeholder="Filter by name, state, or species…">
            </label>
            <span class="spot-count" id="spotCount"></span>
          </div>
          <div class="filter-pills species-pills" id="speciesPills" role="group" aria-label="Filter by species"></div>
        </div>
        <div class="spots-grid" id="spotsGrid"></div>
      </div>`
});

page({
  file: 'bait.html',
  id: 'bait',
  title: "Bait Guide | Coop's Fishing",
  desc: 'Best live bait and artificials by species for Midwest to Gulf fishing.',
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">What to throw</span>
          <h2>Best bait by species</h2>
          <p>
            Live bait and artificials by species — Midwest walleye water to Gulf redfish flats.
            Mix presentations with water temp and solunar windows.
          </p>
        </div>
        <div class="bait-grid" id="baitGrid"></div>
      </div>`
});

page({
  file: 'about.html',
  id: 'about',
  title: "About | Coop's Fishing",
  desc: "How to use Coop's Fishing and where the water data comes from.",
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Coop's Fishing</span>
          <h2>How to use this desk</h2>
          <p>Stack the odds: right water, right temp, right bait, right window.</p>
        </div>
        <div class="about-grid">
          <div class="about-card">
            <h3>Game plan</h3>
            <ul>
              <li><strong>Temps first</strong> — <a href="temps.html">see which waters</a> are in the species' sweet spot.</li>
              <li><strong>Pick a spot</strong> — <a href="spots.html">filter by region or state</a>, then open trophy notes and seasonal timing.</li>
              <li><strong>Read the depth chart</strong> — <a href="depths.html">named reefs, bays, and holes</a>, then fish the temp layer those species want.</li>
              <li><strong>Match the bait</strong> — <a href="bait.html">live and artificial options</a> by fish.</li>
              <li><strong>Check the sky</strong> — <a href="charts.html">major/minor solunar periods</a> and golden hour for low-light bites.</li>
            </ul>
          </div>
          <div class="about-card">
            <h3>Data sources</h3>
            <ul>
              <li><strong>USGS Water Data API</strong> — continuous water temperature at river/stream gauges near popular U.S. fisheries.</li>
              <li><strong>NOAA NDBC</strong> — Great Lakes buoy water temps (via Netlify function proxy).</li>
              <li><strong>Depth &amp; areas</strong> — public structure from DNR reports and NOAA Great Lakes bathymetry; column temps are modeled from the surface reading (not a probe).</li>
              <li><strong>Solar &amp; lunar</strong> — calculated in your browser (approx. rise/set &amp; solunar windows).</li>
            </ul>
            <p style="margin:1rem 0 0;font-size:0.9rem;opacity:0.85">
              Solunar theory is a traditional angler tool — combine it with weather fronts, barometer, and local reports.
              Always follow state regulations and practice safe catch-and-release on trophy fish.
            </p>
          </div>
        </div>
      </div>`
});

page({
  file: 'usage.html',
  id: 'about',
  title: "Usage | Coop's Fishing",
  desc: "Page-view totals for Coop's Fishing beta.",
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Beta</span>
          <h2>How people use the desk</h2>
          <p>Simple page views so we can see which tools get opened. No cookies, no ad trackers.</p>
        </div>
        <div id="usagePanel"></div>
      </div>`
});

page({
  file: 'depths.html',
  id: 'depths',
  title: "Depth Charts | Coop's Fishing",
  desc: 'Depth charts, named fishing areas, and how deep to fish from surface temperature.',
  extraHead:
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">',
  extraScripts:
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>',
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Where they sit</span>
          <h2>Depth charts &amp; fishing areas</h2>
          <p>
            Named public structure for each hotspot — reefs, bays, channels, dams —
            plus a water-column model that turns today’s surface temp into
            <strong>how deep to fish</strong> for the species on that water.
          </p>
        </div>
        <div class="place-filter" id="depthFilters">
          <div class="filter-pills" id="depthRegionPills" role="group" aria-label="Depth chart region"></div>
          <div class="place-filter-row">
            <label>State <select id="depthStateSelect"></select></label>
            <label class="grow">Water <select id="depthWaterSelect"></select></label>
          </div>
        </div>
        <div class="depth-overview" id="depthOverview"></div>
        <div class="depth-stage">
          <div class="depth-panel">
            <div class="depth-panel-head">
              <h3><i class="fa-solid fa-map"></i> Fishing areas</h3>
              <p class="muted small">Tap a numbered pin. Coords are public area centers — not secret waypoints.</p>
            </div>
            <div id="depthMap" class="depth-map" role="img" aria-label="Map of fishing areas"></div>
          </div>
          <div class="depth-panel">
            <div class="depth-panel-head">
              <h3><i class="fa-solid fa-layer-group"></i> Depth schematic</h3>
              <p class="muted small">Stylized bathymetry for planning — not a navigation chart.</p>
            </div>
            <div id="depthSchematic" class="depth-schematic"></div>
            <div class="depth-legend" id="depthLegend"></div>
          </div>
        </div>
        <div class="depth-profile-card">
          <h3><i class="fa-solid fa-chart-area"></i> Cross-section</h3>
          <div id="depthProfile"></div>
        </div>
        <div class="depth-howto" id="depthHowto">
          <div class="depth-panel-head depth-howto-head">
            <div>
              <h3><i class="fa-solid fa-temperature-arrow-down"></i> How deep to fish</h3>
              <p class="muted small" id="columnStatus">Modeled from surface temp and this lake’s mix type.</p>
            </div>
            <form class="surf-form" id="surfForm">
              <label>Surface temp (°F)
                <input type="number" id="surfTempInput" min="32" max="95" step="0.1" inputmode="decimal">
              </label>
              <button type="button" class="btn btn-ghost btn-sm" id="useLiveSurf" style="color:var(--navy);border-color:#c5d0da;background:#fff">
                <i class="fa-solid fa-satellite-dish"></i> Use live
              </button>
              <button type="submit" class="btn btn-primary btn-sm">Update column</button>
            </form>
          </div>
          <div class="column-grid">
            <div id="columnChart"></div>
            <div id="columnAdvice"></div>
          </div>
        </div>
        <div id="areaDetail" class="area-detail" hidden></div>
        <div class="areas-grid" id="areasGrid"></div>
        <p class="status-line" style="margin-top:1.25rem">
          <i class="fa-solid fa-circle-info"></i>
          Areas come from official DNR reports, NOAA Great Lakes bathymetry, and well-known public fishing names.
          Not a navigation chart. Always check local regs.
        </p>
      </div>`
});

page({
  file: 'charts.html',
  id: 'charts',
  title: "Lunar & Solar Charts | Coop's Fishing",
  desc: 'Solunar feeding windows, moon phase, sunrise and golden hour for U.S. fishing waters.',
  extraScripts: '<script src="assets/js/astro.js"></script>',
  body: `<div class="wrap">
        <div class="section-head">
          <span class="eyebrow">When to fish</span>
          <h2>Lunar &amp; solar charts</h2>
          <p>
            Moon phase, rise/set, solunar major &amp; minor feeding periods, plus sunrise, sunset,
            and golden hour. Pick a featured water or use your location.
          </p>
        </div>
        <div class="astro-controls">
          <label>Location <select id="locationSelect"></select></label>
          <button type="button" class="btn btn-ghost btn-sm" id="useMyLocation" style="color:var(--navy);border-color:#c5d0da;background:#fff">
            <i class="fa-solid fa-location-crosshairs"></i> Use my location
          </button>
          <span id="customLocLabel"></span>
          <div class="date-nav">
            <button type="button" class="btn btn-ghost btn-sm" id="astroPrev" style="color:var(--navy);border-color:#c5d0da;background:#fff" aria-label="Previous day">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span id="astroDateLabel"></span>
            <button type="button" class="btn btn-ghost btn-sm" id="astroNext" style="color:var(--navy);border-color:#c5d0da;background:#fff" aria-label="Next day">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="astroToday">Today</button>
          </div>
        </div>
        <div class="astro-grid">
          <div class="astro-card">
            <h3><i class="fa-solid fa-moon" style="color:var(--lake)"></i> Moon phase</h3>
            <div class="phase-box" id="phaseDisplay"></div>
            <div class="rating-box" id="dayRating"></div>
          </div>
          <div class="astro-card">
            <h3><i class="fa-solid fa-sun" style="color:var(--amber)"></i> Solar chart</h3>
            <div id="solarPanel"></div>
          </div>
          <div class="astro-card">
            <h3><i class="fa-solid fa-fish-fins" style="color:var(--moss)"></i> Solunar periods</h3>
            <div id="solunarPanel"></div>
          </div>
          <div class="astro-card">
            <h3><i class="fa-regular fa-calendar" style="color:var(--lake)"></i> Monthly moon calendar</h3>
            <span id="moonMonthLabel"></span>
            <div class="moon-calendar" id="moonCalendar"></div>
            <p class="muted small" style="margin-top:0.75rem">Tap a day to load that date's charts. Peak days (new/full) are highlighted.</p>
          </div>
          <div class="astro-card timeline-card">
            <h3><i class="fa-solid fa-timeline" style="color:var(--coral)"></i> 24-hour bite timeline</h3>
            <div id="dayTimeline"></div>
          </div>
        </div>
      </div>`
});
