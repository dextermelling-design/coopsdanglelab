/**
 * Coop's Fishing — depth charts, named fishing areas, and water-column temps.
 *
 * Areas are well-known public spots from DNR reports, NOAA charts, and
 * published reef / structure names — not secret waypoints. Depths are
 * typical ranges; water levels and fish move. Not for navigation.
 */

window.COOPS = window.COOPS || {};

/** Preferred water temps (°F) used to pick a fishing depth from the column. */
COOPS.speciesComfort = {
  Walleye: { min: 45, max: 74, sweet: [50, 65], icon: '🐟' },
  Sauger: { min: 42, max: 65, sweet: [46, 58], icon: '🐟' },
  'Smallmouth Bass': { min: 52, max: 75, sweet: [58, 70], icon: '🥉' },
  'Largemouth Bass': { min: 55, max: 80, sweet: [65, 76], icon: '🎣' },
  Bass: { min: 54, max: 78, sweet: [62, 74], icon: '🎣' },
  Muskie: { min: 50, max: 75, sweet: [60, 72], icon: '🦈' },
  'Northern Pike': { min: 40, max: 70, sweet: [50, 65], icon: '🦷' },
  'Yellow Perch': { min: 42, max: 68, sweet: [50, 62], icon: '🟡' },
  Crappie: { min: 50, max: 75, sweet: [58, 68], icon: '⚪' },
  Catfish: { min: 60, max: 85, sweet: [70, 82], icon: '🐱' },
  'Channel / Flathead Catfish': { min: 60, max: 85, sweet: [70, 82], icon: '🐱' },
  'Lake Trout': { min: 40, max: 55, sweet: [44, 52], icon: '🌊' },
  Salmon: { min: 46, max: 58, sweet: [50, 55], icon: '🌊' },
  'Salmon / Lake Trout (Great Lakes)': { min: 42, max: 58, sweet: [48, 54], icon: '🌊' },
  Smallmouth: { min: 52, max: 75, sweet: [58, 70], icon: '🥉' },
  'Spotted Bass': { min: 55, max: 80, sweet: [64, 76], icon: '🎣' },
  'Striped Bass': { min: 50, max: 75, sweet: [55, 68], icon: '🦓' },
  Redfish: { min: 55, max: 85, sweet: [65, 80], icon: '🔴' },
  'Speckled Trout': { min: 52, max: 82, sweet: [60, 75], icon: '💠' },
  Snook: { min: 65, max: 88, sweet: [72, 84], icon: '🌙' },
  Tarpon: { min: 72, max: 90, sweet: [75, 86], icon: '🪙' },
  Flounder: { min: 55, max: 82, sweet: [62, 75], icon: '🫓' },
  Steelhead: { min: 40, max: 60, sweet: [44, 55], icon: '🥈' },
  'Rainbow Trout': { min: 42, max: 65, sweet: [48, 58], icon: '🥈' },
  'Brown Trout': { min: 42, max: 65, sweet: [48, 58], icon: '🥈' },
  'Landlocked Salmon': { min: 44, max: 58, sweet: [48, 54], icon: '🌊' },
  Kokanee: { min: 42, max: 58, sweet: [46, 54], icon: '🌊' },
  'Mackinaw (Lake Trout)': { min: 40, max: 55, sweet: [44, 52], icon: '🌊' }
};

/** Typical surface temps. Pass latitude so Gulf water isn't iced in January. */
COOPS.seasonalSurfaceF = function (date, lat) {
  const m = (date || new Date()).getMonth();
  const mid = [33, 33, 38, 46, 56, 67, 74, 74, 67, 55, 44, 35][m];
  if (lat == null || Number.isNaN(lat)) return mid;
  let t = mid + (45 - lat) * 0.85;
  if (lat < 32) {
    const gulf = [58, 60, 66, 72, 78, 84, 86, 86, 83, 76, 68, 61][m];
    t = Math.max(t, gulf - 2);
  }
  if (lat > 55) {
    const north = [32, 32, 32, 34, 42, 50, 56, 56, 48, 40, 34, 32][m];
    t = Math.min(t, north);
  }
  return Math.round(Math.max(32, Math.min(90, t)));
};

/**
 * Model temperature vs depth from a surface reading.
 * Shallow / windy basins stay mixed. Deep lakes stratify in summer.
 * Rivers have almost no thermocline — holes run a few degrees cooler.
 */
COOPS.waterColumn = function (surfaceF, date, chart) {
  const maxD = Math.max(8, chart.maxDepth || 30);
  const mix = chart.mix || 'moderate';
  const month = (date || new Date()).getMonth();
  const T = surfaceF;

  let regime;
  if (T <= 39) regime = 'inverse';
  else if (mix === 'river') regime = 'river';
  else if (mix === 'coastal' || mix === 'shallow' || maxD < 28) regime = 'mixed-shallow';
  else if (T < 52 || month === 3 || month === 10) regime = 'turnover';
  else if (month >= 5 && month <= 8 && T >= 64) regime = 'stratified';
  else if (T >= 56) regime = 'forming';
  else regime = 'turnover';

  let mixedTo = maxD;
  let thermoH = 0;
  let hypo = T;

  if (regime === 'inverse') {
    mixedTo = 3;
    thermoH = Math.min(maxD - 3, 18);
    hypo = Math.min(39.5, T + 6);
  } else if (regime === 'mixed-shallow' || regime === 'turnover') {
    mixedTo = maxD;
    hypo = regime === 'mixed-shallow' ? T - (T > 68 ? Math.min(7, maxD / 8) : 1.5) : T - 0.8;
  } else if (regime === 'river') {
    mixedTo = Math.max(6, maxD * 0.35);
    thermoH = 0;
    hypo = T - (T > 70 ? 5 : T > 55 ? 2.5 : 0.8);
  } else if (regime === 'forming') {
    mixedTo = mix === 'deep' ? 16 : 12;
    thermoH = 12;
    hypo = mix === 'deep' ? Math.max(44, T - 16) : Math.max(50, T - 12);
  } else {
    // stratified
    const seasonalMix = [20, 20, 18, 14, 12, 16, 20, 24, 28, 32, 24, 20][month];
    mixedTo = mix === 'deep' ? seasonalMix + 8 : seasonalMix;
    mixedTo = Math.min(mixedTo, maxD * 0.55);
    thermoH = mix === 'deep' ? 22 : 14;
    hypo = mix === 'deep' ? Math.max(42, Math.min(50, T - 26)) : Math.max(48, T - 18);
  }

  hypo = Math.min(hypo, T - 0.4);
  const thermoBot = Math.min(maxD, mixedTo + thermoH);

  const step = maxD > 120 ? 10 : maxD > 50 ? 5 : 2;
  const samples = [];
  for (let z = 0; z <= maxD; z += step) {
    samples.push({ ft: z, f: tempAtDepth(z), layer: layerName(z) });
  }
  if (samples[samples.length - 1].ft !== maxD) {
    samples.push({ ft: maxD, f: tempAtDepth(maxD), layer: layerName(maxD) });
  }

  function tempAtDepth(z) {
    if (regime === 'inverse') {
      if (z <= 2) return T;
      if (z >= thermoBot) return hypo;
      const t = (z - 2) / Math.max(1, thermoBot - 2);
      return T + (hypo - T) * t;
    }
    if (z <= mixedTo) return T - (z / Math.max(1, mixedTo)) * 0.8;
    if (z >= thermoBot || thermoH < 2) {
      const tail = (z - thermoBot) / Math.max(1, maxD - thermoBot);
      return hypo - Math.min(2.5, tail * 2);
    }
    const t = (z - mixedTo) / thermoH;
    const s = t * t * (3 - 2 * t);
    return T - 0.8 - (T - 0.8 - hypo) * s;
  }

  function layerName(z) {
    if (regime === 'inverse') return z < 6 ? 'Ice / surface' : 'Deeper (near 39°F)';
    if (regime === 'river') return z < mixedTo ? 'Main flow' : 'Hole / slack';
    if (regime === 'mixed-shallow' || regime === 'turnover') return 'Mixed column';
    if (z <= mixedTo) return 'Epilimnion (warm mix)';
    if (z <= thermoBot) return 'Thermocline';
    return 'Hypolimnion (cold)';
  }

  return {
    surfaceF: T,
    maxDepth: maxD,
    regime,
    mixedTo: Math.round(mixedTo),
    thermoTop: Math.round(mixedTo),
    thermoBot: Math.round(thermoBot),
    hypoF: Math.round(hypo * 10) / 10,
    samples,
    tempAt: tempAtDepth,
    date: date || new Date()
  };
};

COOPS.regimeLabel = function (regime) {
  return (
    {
      inverse: 'Winter / inverse — coldest at the surface, ~39°F near bottom',
      turnover: 'Turnover — the whole column is nearly the same temp',
      'mixed-shallow': 'Shallow / wind-mixed — little or no thermocline',
      river: 'River — current mixes the column; holes run a bit cooler',
      forming: 'Thermocline forming — fish starting to stack on the break',
      stratified: 'Summer stratification — the thermocline is the bite line'
    }[regime] || regime
  );
};

/** Depths where the column matches a species' preferred temps. */
COOPS.fishDepthAdvice = function (column, speciesName, chart) {
  const key = Object.keys(COOPS.speciesComfort).find(
    (k) => k.toLowerCase() === String(speciesName).toLowerCase() ||
      String(speciesName).toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(String(speciesName).toLowerCase())
  );
  const comfort = COOPS.speciesComfort[key] || COOPS.speciesComfort[speciesName];
  if (!comfort) return null;

  const hits = [];
  const loose = [];
  const step = column.maxDepth > 80 ? 2 : 1;
  for (let z = 0; z <= column.maxDepth; z += step) {
    const f = column.tempAt(z);
    if (f >= comfort.sweet[0] && f <= comfort.sweet[1]) hits.push(z);
    else if (f >= comfort.min && f <= comfort.max) loose.push(z);
  }

  const use = hits.length ? hits : loose;
  const cold =
    /trout|salmon|laker/i.test(String(speciesName)) ||
    (comfort.sweet[1] <= 55);
  let band = use.length
    ? { lo: use[0], hi: use[use.length - 1], fLo: column.tempAt(use[0]), fHi: column.tempAt(use[use.length - 1]) }
    : null;

  // Don't send people to the dead hypolimnion on a 200-ft lake.
  if (band && (column.regime === 'stratified' || column.regime === 'forming') && !cold) {
    const cap = Math.max(band.lo + 6, column.thermoBot + (chart.mix === 'deep' ? 18 : 10));
    if (band.hi > cap) {
      band = { ...band, hi: Math.round(Math.min(band.hi, cap)) };
      band.fHi = column.tempAt(band.hi);
    }
  }

  const tooWarm = !band && column.samples.every((s) => s.f > comfort.max);
  const tooCold = !band && column.samples.every((s) => s.f < comfort.min);

  let headline;
  let detail;
  if (tooWarm) {
    headline = `Column is warmer than ${speciesName} prefer`;
    detail = `Fish the deepest holes (${Math.round(column.maxDepth * 0.7)}–${column.maxDepth} ft), shade, current, and first/last light. Handle fish fast.`;
  } else if (tooCold) {
    headline = `Column is colder than the usual ${speciesName} feed`;
    detail = 'Work the warmest shallow water — dark bottom, north banks, midday sun. Slow the presentation.';
  } else if (band) {
    const zone = hits.length ? 'sweet-spot' : 'acceptable';
    const almostWhole = band.lo <= 2 && band.hi >= column.maxDepth * 0.85;
    if (almostWhole && (column.regime === 'mixed-shallow' || column.regime === 'turnover' || column.regime === 'river')) {
      headline = 'Whole column is in range — fish the structure';
      detail = `${Math.round(band.fLo)}–${Math.round(band.fHi)}°F top to bottom. Depth matters less than reefs, current, and low light. Start on the named areas below.`;
    } else if (column.regime === 'river' && band.lo >= column.maxDepth * 0.55) {
      headline = `Fish the holes (~${band.lo}–${band.hi} ft)`;
      detail = `Surface is ${column.surfaceF}°F; only the slower, deeper water is in the ${comfort.sweet[0]}–${comfort.sweet[1]}°F band. Tailwaters and outside-bend holes first.`;
    } else {
      headline = `Fish ${band.lo}–${band.hi} ft`;
      detail = `${zone === 'sweet-spot' ? 'Sweet-spot' : 'Usable'} water is ${Math.round(band.fLo)}–${Math.round(band.fHi)}°F at those depths.`;
      if (column.regime === 'stratified' || column.regime === 'forming') {
        detail += ` Thermocline sits ~${column.thermoTop}–${column.thermoBot} ft — start on that break.`;
      }
    }
  }

  const areas = (chart.areas || []).filter((a) => {
    if (!band) return tooWarm && a.depthFt >= chart.maxDepth * 0.45;
    const mid = a.depthFt || 12;
    return mid >= band.lo - 4 && mid <= band.hi + 6;
  });

  return {
    species: speciesName,
    comfort,
    band,
    tooWarm,
    tooCold,
    headline,
    detail,
    areas
  };
};

function A(partial) {
  return partial;
}

COOPS.depthCharts = [
  {
    id: 'erie-west',
    mix: 'shallow',
    maxDepth: 62,
    avgDepth: 24,
    acres: 'Western basin ~1,260 sq mi',
    waterType: 'Shallow Great Lakes basin',
    notes:
      'The western basin averages about 24 ft and is reef-studded. Wind usually mixes the column, so summer bottom temps are only a few degrees cooler than the surface. Fish structure and light more than a deep thermocline.',
    sources: [
      { name: 'ODNR Lake Erie fishing reports', url: 'https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources/fishing-reports-forecasts' },
      { name: 'NOAA Erie & St. Clair bathymetry', url: 'https://www.ngdc.noaa.gov/mgg/greatlakes/erie.html' },
      { name: 'Michigan DNR weekly report', url: 'https://www.michigan.gov/dnr/things-to-do/fishing/weekly' }
    ],
    tempStations: ['04193500', '45005', '45216'],
    profile: [
      { x: 0, d: 6, label: 'Maumee Bay' },
      { x: 18, d: 14, label: 'Inner reefs' },
      { x: 38, d: 22, label: 'Niagara / Crib' },
      { x: 55, d: 16, label: 'West Sister' },
      { x: 72, d: 28, label: 'Island cuts' },
      { x: 88, d: 38, label: 'East shelf' },
      { x: 100, d: 50, label: 'Toward central' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M70 90 C200 40 430 30 610 70 C700 95 750 150 770 220 L790 310 C770 400 640 460 480 470 C400 500 330 495 250 460 C150 470 70 420 48 330 C30 250 40 150 70 90 Z' },
        { depth: 10, d: 'M120 140 C230 90 430 80 580 120 C660 145 700 190 715 250 L725 320 C700 390 580 425 450 430 C360 450 290 440 220 400 C150 400 105 350 100 280 C95 210 100 165 120 140 Z' },
        { depth: 20, d: 'M200 180 C320 140 480 145 580 190 C640 220 660 260 665 300 C650 360 540 390 420 388 C330 400 270 370 230 330 C190 290 185 220 200 180 Z' },
        { depth: 35, d: 'M430 210 C520 200 590 230 610 280 C600 330 520 355 430 348 C360 340 340 290 360 240 C380 215 400 212 430 210 Z' }
      ],
      islands: [
        { d: 'M255 200 a22 14 0 1 0 0.1 0 Z', name: 'West Sister' },
        { d: 'M520 300 a16 11 0 1 0 0.1 0 Z', name: 'S. Bass' },
        { d: 'M555 275 a12 8 0 1 0 0.1 0 Z', name: 'M. Bass' },
        { d: 'M575 248 a10 7 0 1 0 0.1 0 Z', name: 'N. Bass' },
        { d: 'M630 325 a20 13 0 1 0 0.1 0 Z', name: 'Kelleys' },
        { d: 'M690 155 a36 20 -18 1 0 0.1 0 Z', name: 'Pelee' }
      ],
      labels: [
        { x: 95, y: 400, text: 'Toledo / Maumee' },
        { x: 400, y: 30, text: 'Ontario' },
        { x: 430, y: 488, text: 'Ohio shore' },
        { x: 760, y: 360, text: 'Central basin →' }
      ]
    },
    areas: [
      A({ id: 'maumee-bay', name: 'Maumee Bay', kind: 'River mouth / flats', depth: '4–12 ft', depthFt: 8, lat: 41.70, lon: -83.42, x: 95, y: 350, structure: 'Mud/sand flats, river plume, spring staging water', species: ['Walleye', 'Yellow Perch'], season: 'March–May run; night trolling early', tip: 'The river dumps warming, dirty water. Jig or troll the color line when the run is on.' }),
      A({ id: 'niagara', name: 'Niagara Reef', kind: 'Reef', depth: '8–18 ft', depthFt: 13, lat: 41.667, lon: -83.048, x: 280, y: 275, structure: 'Classic limestone spawn reef — one of the named western-basin rock piles', species: ['Walleye', 'Smallmouth Bass'], season: 'April–June on top; edges after spawn', tip: 'Jig the crown in cold water. Once fish slide off, troll the 18–25 ft break.' }),
      A({ id: 'toussaint', name: 'Toussaint Reef', kind: 'Reef', depth: '6–16 ft', depthFt: 11, lat: 41.63, lon: -83.05, x: 250, y: 330, structure: 'Shallow bedrock reef, often paired with nearby cans in reports', species: ['Walleye'], season: 'April–June', tip: 'Spinner harnesses and jigs. Watch the seas — this water stacks up fast in a west wind.' }),
      A({ id: 'crib', name: 'Crib Reef', kind: 'Reef', depth: '8–16 ft', depthFt: 12, lat: 41.68, lon: -83.12, x: 210, y: 280, structure: 'Low-profile reef west of Niagara, a regular in ODNR / charter reports', species: ['Walleye'], season: 'Spring spawn through early summer', tip: 'Work the upwind face. Fish often slide a cast off the rock, not on the peak.' }),
      A({ id: 'locust', name: 'Locust Point / Turtle', kind: 'Reef / point', depth: '8–18 ft', depthFt: 13, lat: 41.60, lon: -83.08, x: 200, y: 370, structure: 'Nearshore reefs and the Locust Point / Turtle complex', species: ['Walleye', 'Smallmouth Bass'], season: 'April–June, plus fall', tip: 'Good first stop out of the western ports when the run is still in close.' }),
      A({ id: 'west-sister', name: 'West Sister Island', kind: 'Island / shoal', depth: '12–25 ft', depthFt: 18, lat: 41.739, lon: -83.105, x: 255, y: 200, structure: 'Island shoal and deeper cuts; smallmouth + post-spawn eyes', species: ['Walleye', 'Smallmouth Bass'], season: 'May–September', tip: 'Cast rock on the island; troll the deeper cuts when the sun gets high.' }),
      A({ id: 'bass-islands', name: 'Bass Islands / Put-in-Bay', kind: 'Island rock', depth: '12–30 ft', depthFt: 20, lat: 41.654, lon: -82.811, x: 535, y: 295, structure: 'Steep island rock, cribs, and cuts — smallmouth factory', species: ['Smallmouth Bass', 'Walleye', 'Yellow Perch'], season: 'June–October smallmouth', tip: 'Tubes and drop-shot the rock. Walleye troll the deeper cuts between islands.' }),
      A({ id: 'kelleys', name: 'Kelleys Island', kind: 'Island / reef', depth: '15–35 ft', depthFt: 24, lat: 41.604, lon: -82.697, x: 630, y: 325, structure: 'Island perimeter, nearby reefs, perch and walleye water', species: ['Walleye', 'Yellow Perch', 'Smallmouth Bass'], season: 'Summer–fall', tip: 'Perch schools slide around the island. Mark bait, then drop.' }),
      A({ id: 'cans', name: 'Outside cans / shelf', kind: 'Basin / troll', depth: '22–42 ft', depthFt: 30, lat: 41.78, lon: -82.95, x: 400, y: 175, structure: 'Deeper western-basin troll water and navigation cans', species: ['Walleye'], season: 'June–October trolling', tip: 'Once reefs empty, the school is often suspended over 25–40 ft. Match spoon/crank depth to the bait.' })
    ]
  },
  {
    id: 'saginaw',
    mix: 'shallow',
    maxDepth: 48,
    avgDepth: 16,
    acres: 'Inner bay mean ~15 ft; outer ~48 ft',
    waterType: 'Great Lakes bay',
    notes:
      'Inner Saginaw Bay is a big, dirty, shallow walleye pond. The outer bay and Charity Island area drop off and can hold a real thermocline in midsummer.',
    sources: [
      { name: 'Michigan DNR weekly fishing report', url: 'https://www.michigan.gov/dnr/things-to-do/fishing/weekly' },
      { name: 'NOAA Lake Huron bathymetry', url: 'https://www.ngdc.noaa.gov/mgg/greatlakes/huron.html' }
    ],
    tempStations: ['45008'],
    profile: [
      { x: 0, d: 8, label: 'River mouth' },
      { x: 25, d: 14, label: 'Inner bay' },
      { x: 50, d: 18, label: 'Bars / reefs' },
      { x: 75, d: 28, label: 'Charities' },
      { x: 100, d: 46, label: 'Outer bay' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M260 470 C180 420 120 330 130 230 C145 120 260 50 420 40 C560 32 680 80 740 160 C790 230 780 320 700 360 C620 400 560 430 520 470 L260 470 Z' },
        { depth: 10, d: 'M300 430 C230 380 190 300 200 230 C215 140 310 90 430 85 C550 80 650 120 690 185 C730 245 700 310 630 345 C560 380 520 420 490 445 L300 430 Z' },
        { depth: 20, d: 'M360 360 C300 310 290 240 320 190 C360 130 470 120 560 155 C620 185 640 240 610 290 C570 340 500 370 430 375 C390 378 370 370 360 360 Z' },
        { depth: 35, d: 'M500 160 C560 155 610 190 620 230 C615 270 560 290 510 270 C470 250 460 200 480 170 C488 162 494 160 500 160 Z' }
      ],
      islands: [
        { d: 'M575 175 a14 10 0 1 0 0.1 0 Z', name: 'Charity' },
        { d: 'M600 198 a7 5 0 1 0 0.1 0 Z', name: 'Little Charity' }
      ],
      labels: [
        { x: 250, y: 488, text: 'Saginaw River' },
        { x: 80, y: 240, text: 'Pinconning' },
        { x: 700, y: 80, text: 'Au Gres / Tawas' },
        { x: 720, y: 400, text: 'Caseville →' }
      ]
    },
    areas: [
      A({ id: 'sag-mouth', name: 'Saginaw River mouth', kind: 'River mouth', depth: '6–14 ft', depthFt: 10, lat: 43.65, lon: -83.85, x: 300, y: 445, structure: 'Plume, spoils, and the first open-bay flats', species: ['Walleye', 'Yellow Perch', 'Catfish'], season: 'April–June, plus night summer', tip: 'Spring walleye stack in the lower river and just outside. Follow the dirty/clean edge.' }),
      A({ id: 'quanicassee', name: 'Quanicassee / Callahan Reef', kind: 'Reef / bar', depth: '8–16 ft', depthFt: 12, lat: 43.58, lon: -83.62, x: 430, y: 400, structure: 'Southeast inner-bay rock and the slot toward North Island', species: ['Walleye'], season: 'May–July', tip: 'A regular in DNR weekly reports — crawler harnesses in 8–16 ft.' }),
      A({ id: 'pinconning', name: 'Pinconning Bar', kind: 'Bar', depth: '8–16 ft', depthFt: 12, lat: 43.85, lon: -83.92, x: 220, y: 280, structure: 'West-side bar and flats', species: ['Walleye', 'Yellow Perch'], season: 'Spring and fall', tip: 'Troll the bar edge; perch often mix with eyes here in cool water.' }),
      A({ id: 'spoils', name: 'Spoils Island', kind: 'Island / dump', depth: '8–14 ft', depthFt: 11, lat: 43.72, lon: -83.75, x: 340, y: 350, structure: 'Spoils and nearby 11-ft troll water', species: ['Walleye'], season: 'Late spring–summer', tip: 'DNR reports often mention north of Spoils in about 11 ft.' }),
      A({ id: 'charity', name: 'Charity Island', kind: 'Island / humps', depth: '15–35 ft', depthFt: 24, lat: 44.03, lon: -83.43, x: 575, y: 175, structure: 'Humps around the Charities and the slot south of the islands', species: ['Walleye', 'Smallmouth Bass', 'Yellow Perch'], season: 'June–September', tip: 'Fish the east and north humps. Give the islands a wide berth on the north side.' }),
      A({ id: 'augres', name: 'Au Gres / Tawas', kind: 'Outer bay', depth: '12–28 ft', depthFt: 20, lat: 44.15, lon: -83.55, x: 680, y: 140, structure: 'Northeast outer-bay breaks and points', species: ['Walleye', 'Yellow Perch'], season: 'Summer–fall', tip: 'When the inner bay muddies or overheats, slide to the cleaner outer bay.' }),
      A({ id: 'outer-slot', name: 'Outer bay / slot', kind: 'Basin', depth: '20–48 ft', depthFt: 34, lat: 44.10, lon: -83.30, x: 620, y: 230, structure: 'Deeper outer Saginaw Bay toward Lake Huron', species: ['Walleye'], season: 'July–September', tip: 'If a thermocline sets up, troll the break rather than the mud-flat 12-ft program.' })
    ]
  },
  {
    id: 'st-clair',
    mix: 'shallow',
    maxDepth: 27,
    avgDepth: 11,
    acres: '~430 sq mi',
    waterType: 'Shallow connecting Great Lake',
    notes:
      'Average depth is only about 11 ft. St. Clair almost never builds a real thermocline — muskies, smallmouth, and walleye roam weed and sand in 6–16 ft. The shipping channel is the only true deep water.',
    sources: [
      { name: 'Michigan DNR weekly report', url: 'https://www.michigan.gov/dnr/things-to-do/fishing/weekly' },
      { name: 'NOAA Erie & St. Clair bathymetry', url: 'https://www.ngdc.noaa.gov/mgg/greatlakes/erie.html' }
    ],
    tempStations: ['04165500'],
    profile: [
      { x: 0, d: 5, label: 'Flats' },
      { x: 25, d: 10, label: 'Anchor Bay' },
      { x: 50, d: 13, label: 'Main lake' },
      { x: 70, d: 24, label: 'Channel' },
      { x: 100, d: 12, label: 'Metro / miles' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M250 40 C360 20 500 50 600 120 C690 190 730 300 680 390 C630 470 500 500 370 480 C250 460 170 390 150 300 C130 200 160 80 250 40 Z' },
        { depth: 8, d: 'M280 90 C380 70 500 100 570 170 C640 240 650 330 600 390 C540 440 430 450 340 420 C260 390 230 310 235 230 C240 150 250 105 280 90 Z' },
        { depth: 14, d: 'M360 180 C430 160 510 200 540 260 C555 310 520 350 460 360 C390 370 340 330 335 270 C332 220 340 190 360 180 Z' },
        { depth: 22, d: 'M390 200 L470 330 L445 345 L365 215 Z' }
      ],
      islands: [
        { d: 'M300 70 L360 55 L400 90 L370 140 L300 150 L270 110 Z', name: 'Harsens / Flats' }
      ],
      labels: [
        { x: 320, y: 28, text: 'St. Clair River' },
        { x: 200, y: 160, text: 'Anchor Bay' },
        { x: 400, y: 490, text: 'Detroit River →' },
        { x: 680, y: 430, text: 'Grosse Pointe' }
      ]
    },
    areas: [
      A({ id: 'flats', name: 'St. Clair Flats', kind: 'Delta / weeds', depth: '3–10 ft', depthFt: 6, lat: 42.58, lon: -82.65, x: 330, y: 100, structure: 'Delta channels, cabbage, and skinny water at the north end', species: ['Muskie', 'Smallmouth Bass', 'Northern Pike'], season: 'June–October', tip: 'Figure-8 every cast. Sight-fish or burn bucktails over the grass.' }),
      A({ id: 'anchor', name: 'Anchor Bay', kind: 'Bay / grass', depth: '6–14 ft', depthFt: 10, lat: 42.63, lon: -82.75, x: 230, y: 150, structure: 'Weedy bay, sand, and tournament-winning grass', species: ['Muskie', 'Smallmouth Bass', 'Walleye'], season: 'Year-round; late fall muskies 9–11 ft', tip: 'Shallow grass early; slide to 10–14 ft sand/weed edges in summer.' }),
      A({ id: 'clinton', name: 'Clinton River / spillway', kind: 'River mouth', depth: '6–12 ft', depthFt: 8, lat: 42.59, lon: -82.82, x: 210, y: 250, structure: 'Warm river water dumping onto the lake flats', species: ['Muskie', 'Walleye', 'Smallmouth Bass'], season: 'Fall baitfish push; spring walleye', tip: 'In fall, fish where the river meets the lake — usually 6–10 ft.' }),
      A({ id: 'miles', name: 'Mile Roads', kind: 'Open-lake flats', depth: '10–16 ft', depthFt: 13, lat: 42.48, lon: -82.78, x: 280, y: 340, structure: 'The named mile-road troll/cast water off the MI shore', species: ['Smallmouth Bass', 'Muskie', 'Walleye'], season: 'Summer–fall', tip: 'Deep cranks on the 10–15 ft zone. Cover water until you hit a pack.' }),
      A({ id: 'metro', name: 'Metro Beach / Selfridge', kind: 'Park / flats', depth: '6–12 ft', depthFt: 9, lat: 42.57, lon: -82.81, x: 220, y: 300, structure: 'Park shoreline, weeds, and nearby flats', species: ['Smallmouth Bass', 'Muskie'], season: 'May–October', tip: 'Easy access water that still wins tournaments when the grass is right.' }),
      A({ id: 'channel', name: 'Shipping channel', kind: 'Channel', depth: '20–27 ft', depthFt: 24, lat: 42.47, lon: -82.70, x: 430, y: 270, structure: 'Dredged N–S channel — the lake’s only deep water', species: ['Walleye', 'Muskie'], season: 'Midsummer heat', tip: 'When the flats hit the upper 70s, the channel edges hold the coolest water in the lake.' }),
      A({ id: 'thames', name: 'Thames River mouth (ON)', kind: 'River mouth', depth: '6–12 ft', depthFt: 8, lat: 42.32, lon: -82.45, x: 620, y: 380, structure: 'Ontario river mouth and nearby 16–17 ft summer muskie water', species: ['Muskie', 'Walleye'], season: 'July–October', tip: 'A lot of summer muskie traffic is on the Ontario side in mid-teens.' })
    ]
  },
  {
    id: 'mille-lacs',
    mix: 'moderate',
    maxDepth: 43,
    avgDepth: 29,
    acres: '~128,000 acres',
    waterType: 'Large inland lake',
    notes:
      'Max depth is only about 42–43 ft, but the lake stratifies. Summer walleyes live on the mud in the mid-20s to low-30s, right on or just above the thermocline. South-end rock is the smallmouth and early-season walleye program.',
    sources: [
      { name: 'MN DNR LakeFinder — Mille Lacs', url: 'https://www.dnr.state.mn.us/lakefind/lake.html?id=48000200' },
      { name: 'MN DNR lake maps', url: 'https://www.dnr.state.mn.us/lakefind/index.html' }
    ],
    tempStations: [],
    profile: [
      { x: 0, d: 8, label: 'Weeds' },
      { x: 20, d: 16, label: 'Rock / gravel' },
      { x: 45, d: 24, label: 'Reef tops' },
      { x: 70, d: 32, label: 'Mud flats' },
      { x: 100, d: 42, label: 'Deep mud' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M140 120 C220 40 400 25 560 55 C680 80 730 170 740 270 C745 360 680 440 540 470 C380 500 220 460 150 370 C90 280 90 180 140 120 Z' },
        { depth: 12, d: 'M200 150 C270 85 420 75 550 110 C640 140 680 210 685 285 C688 355 630 415 520 435 C370 460 240 420 195 340 C165 275 170 190 200 150 Z' },
        { depth: 22, d: 'M270 190 C350 140 480 145 560 190 C620 230 630 300 590 350 C530 400 400 410 320 370 C260 335 245 250 270 190 Z' },
        { depth: 32, d: 'M360 230 C430 200 520 220 545 280 C550 330 490 360 410 355 C350 350 330 290 360 230 Z' }
      ],
      islands: [],
      labels: [
        { x: 160, y: 80, text: 'Garrison / west' },
        { x: 600, y: 60, text: 'Isle Harbor' },
        { x: 380, y: 490, text: 'Wealthwood / south rock' },
        { x: 400, y: 200, text: 'Mud (north)' }
      ]
    },
    areas: [
      A({ id: 'graveyard', name: 'South shore / Graveyard', kind: 'Rock / point', depth: '6–18 ft', depthFt: 12, lat: 46.18, lon: -93.60, x: 400, y: 440, structure: 'Gravel point and south-end rock that warms first', species: ['Walleye', 'Smallmouth Bass'], season: 'Opener through June; smallmouth all summer', tip: 'Start here when the lake is still cold. Then slide to mid-lake gravel and mud.' }),
      A({ id: 'seven-mile', name: 'Seven-Mile / mid gravel', kind: 'Reef', depth: '12–22 ft', depthFt: 17, lat: 46.25, lon: -93.62, x: 420, y: 280, structure: 'Named mid-lake gravel reefs', species: ['Walleye', 'Smallmouth Bass'], season: 'June–August', tip: 'Classic mid-lake rock. Eyes on top in low light, off the edge in the sun.' }),
      A({ id: 'four-five', name: '4-Mile & 5-Mile gravel', kind: 'Reef', depth: '14–24 ft', depthFt: 18, lat: 46.20, lon: -93.58, x: 460, y: 340, structure: 'South-accessible mid-lake gravel, popular on ice too', species: ['Walleye', 'Smallmouth Bass'], season: 'Open water and ice', tip: 'Same program as Seven-Mile — rock in low light, mud nearby midday.' }),
      A({ id: 'mud', name: 'North mud flats', kind: 'Mud flat', depth: '22–34 ft', depthFt: 28, lat: 46.32, lon: -93.65, x: 400, y: 180, structure: 'The big north-half mud where summer walleyes live', species: ['Walleye', 'Yellow Perch'], season: 'July–September; prime ice', tip: 'If the thermocline is at 26 ft, start there. Rippin’ raps and crawler rigs.' }),
      A({ id: 'stalbans', name: "St. Alban's Bay", kind: 'Bay', depth: '6–16 ft', depthFt: 10, lat: 46.32, lon: -93.78, x: 200, y: 160, structure: 'West-side bay, weeds, and inside turns', species: ['Walleye', 'Northern Pike', 'Muskie'], season: 'Early season and fall', tip: 'Warm pocket. Pike and eyes use the weeds before they slide to rock and mud.' }),
      A({ id: 'isle', name: 'Isle Harbor / east', kind: 'Harbor / rock', depth: '8–20 ft', depthFt: 14, lat: 46.14, lon: -93.47, x: 640, y: 380, structure: 'East-side access, nearby rock and gravel', species: ['Walleye', 'Smallmouth Bass'], season: 'June–September', tip: 'Three-Mile and Agate Bay rock is the east-side smallmouth/eye program.' }),
      A({ id: 'garrison', name: 'Garrison / west points', kind: 'Points', depth: '8–22 ft', depthFt: 15, lat: 46.29, lon: -93.82, x: 190, y: 250, structure: 'Indian Point, Sherman’s Point, and the west breaks', species: ['Walleye', 'Smallmouth Bass', 'Muskie'], season: 'June–October', tip: 'Wind-blown west points in summer. Muskie along the cabbage edges.' })
    ]
  },
  {
    id: 'green-bay',
    mix: 'moderate',
    maxDepth: 120,
    avgDepth: 40,
    acres: 'Bay of Lake Michigan',
    waterType: 'Great Lakes bay',
    notes:
      'The Fox and the lower bay are shallow and warm first (walleye). Mid and northern Green Bay deepen toward Door County and will stratify. Muskies use weeds, reefs, and the 8–18 ft edges; salmon and trout hold on the outer thermocline.',
    sources: [
      { name: 'Wisconsin DNR lake & river maps', url: 'https://dnr.wisconsin.gov/topic/Fishing/questions/lakemaps' },
      { name: 'NOAA Lake Michigan bathymetry', url: 'https://www.ngdc.noaa.gov/mgg/greatlakes/michigan.html' }
    ],
    tempStations: ['040851385', '45161', '45007'],
    profile: [
      { x: 0, d: 10, label: 'Fox mouth' },
      { x: 25, d: 18, label: 'Lower bay' },
      { x: 50, d: 32, label: 'Peshtigo' },
      { x: 75, d: 55, label: 'Chambers' },
      { x: 100, d: 90, label: 'Outer / Door' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M220 470 C180 360 170 240 210 140 C250 50 360 25 470 40 C540 52 580 100 600 170 L720 40 L760 80 L640 220 C700 280 720 360 680 430 C620 480 480 495 340 490 C280 488 240 485 220 470 Z' },
        { depth: 15, d: 'M260 440 C230 340 230 240 265 160 C300 85 400 70 480 95 C530 115 555 170 560 230 C600 300 590 380 530 430 C460 470 340 465 260 440 Z' },
        { depth: 35, d: 'M340 360 C320 280 340 200 390 160 C450 115 520 160 535 230 C545 300 510 360 450 385 C400 400 355 390 340 360 Z' },
        { depth: 70, d: 'M480 180 C530 175 575 220 580 280 C570 340 510 350 470 310 C450 270 450 200 480 180 Z' }
      ],
      islands: [
        { d: 'M520 210 a18 12 0 1 0 0.1 0 Z', name: 'Chambers' }
      ],
      labels: [
        { x: 200, y: 488, text: 'Fox / Green Bay city' },
        { x: 150, y: 200, text: 'Oconto / Peshtigo' },
        { x: 700, y: 30, text: 'Door County' },
        { x: 560, y: 120, text: 'Sturgeon Bay' }
      ]
    },
    areas: [
      A({ id: 'fox', name: 'Fox River / De Pere', kind: 'River', depth: '8–20 ft', depthFt: 12, lat: 44.45, lon: -88.06, x: 250, y: 455, structure: 'Locks, current seams, and the river mouth into the bay', species: ['Walleye', 'Smallmouth Bass'], season: 'March–May walleye; night summer', tip: 'The spring run is the headline. Then fish the first bay flats off the mouth.' }),
      A({ id: 'longtail', name: 'Long Tail Point', kind: 'Point / flats', depth: '4–14 ft', depthFt: 8, lat: 44.63, lon: -87.98, x: 300, y: 380, structure: 'Long sand/grass point north of the city', species: ['Walleye', 'Smallmouth Bass', 'Muskie'], season: 'May–July', tip: 'Shallow and weedy. Great first-warming water.' }),
      A({ id: 'peshtigo', name: 'Peshtigo Reef', kind: 'Reef', depth: '8–22 ft', depthFt: 15, lat: 45.05, lon: -87.58, x: 340, y: 200, structure: 'Named mid-bay reef off the Peshtigo / Oconto shore', species: ['Walleye', 'Smallmouth Bass', 'Muskie'], season: 'June–September', tip: 'Classic structure in a bay that can otherwise look featureless.' }),
      A({ id: 'sturgeon', name: 'Sturgeon Bay', kind: 'Bay / weeds', depth: '6–20 ft', depthFt: 12, lat: 44.83, lon: -87.38, x: 560, y: 250, structure: 'Weeds, docks, and the ship canal cut', species: ['Muskie', 'Smallmouth Bass', 'Walleye'], season: 'June–October muskie', tip: 'Little Sturgeon and the main bay weeds are a muskie staple.' }),
      A({ id: 'chambers', name: 'Chambers Island', kind: 'Island / deep', depth: '20–70 ft', depthFt: 40, lat: 45.18, lon: -87.35, x: 520, y: 210, structure: 'Island breaks into real Green Bay depth', species: ['Walleye', 'Smallmouth Bass', 'Salmon'], season: 'Summer', tip: 'Smallmouth on the rock; deeper breaks for eyes and the first salmon water.' }),
      A({ id: 'sister', name: 'Northern bay / Sister Bay', kind: 'Clear rock', depth: '8–30 ft', depthFt: 16, lat: 45.19, lon: -87.12, x: 620, y: 90, structure: 'Clear Door County rock and weeds', species: ['Muskie', 'Smallmouth Bass'], season: 'July–October', tip: 'Sight-fishing water. Big muskies roam the 8–18 ft edges.' })
    ]
  },
  {
    id: 'lotw',
    mix: 'moderate',
    maxDepth: 210,
    avgDepth: 26,
    acres: '~950,000 acres (U.S. + Canada)',
    waterType: 'Border lake / island water',
    notes:
      'Four Mile and Zippel are the famous MN walleye basins (often 18–32 ft). The Northwest Angle and Canadian island water hold muskies and true deep holes. The lake is a maze — fish a basin, not the whole map.',
    sources: [
      { name: 'MN DNR LakeFinder — Lake of the Woods', url: 'https://www.dnr.state.mn.us/lakefind/lake.html?id=39000200' },
      { name: 'MN DNR LakeFinder', url: 'https://www.dnr.state.mn.us/lakefind/index.html' }
    ],
    tempStations: [],
    profile: [
      { x: 0, d: 10, label: 'Bays' },
      { x: 25, d: 22, label: 'Four Mile' },
      { x: 50, d: 30, label: 'Big Traverse' },
      { x: 75, d: 55, label: 'Island holes' },
      { x: 100, d: 90, label: 'NW deep' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M80 300 C70 200 140 80 280 60 C400 45 520 80 620 50 C720 20 780 90 760 180 C800 250 740 320 700 360 C760 420 700 480 560 470 C420 460 360 420 300 430 C200 450 90 400 80 300 Z' },
        { depth: 15, d: 'M140 300 C140 210 200 120 300 110 C420 100 540 130 620 110 C690 95 720 150 700 210 C740 270 680 330 620 350 C660 400 580 430 460 420 C360 410 220 390 160 340 C140 325 138 312 140 300 Z' },
        { depth: 30, d: 'M240 280 C250 200 340 170 430 185 C530 200 600 230 610 290 C600 340 520 360 430 350 C340 340 250 330 240 280 Z' },
        { depth: 60, d: 'M520 140 C580 130 640 160 650 210 C640 250 580 255 540 230 C510 205 505 160 520 140 Z' }
      ],
      islands: [
        { d: 'M400 220 a40 22 0 1 0 0.1 0 Z', name: 'Island cluster' },
        { d: 'M480 260 a18 12 0 1 0 0.1 0 Z', name: '' }
      ],
      labels: [
        { x: 180, y: 400, text: 'Baudette / Rainy R.' },
        { x: 280, y: 200, text: 'Four Mile / Zippel' },
        { x: 620, y: 40, text: 'NW Angle' },
        { x: 700, y: 380, text: 'Sabaskong' }
      ]
    },
    areas: [
      A({ id: 'fourmile', name: 'Four Mile Bay', kind: 'Basin', depth: '18–32 ft', depthFt: 24, lat: 48.85, lon: -94.70, x: 280, y: 220, structure: 'Go-to MN walleye basin just out of Baudette / Wheelers Point', species: ['Walleye', 'Sauger', 'Yellow Perch'], season: 'Year-round; famous ice', tip: 'Most visiting anglers live here. Drift crawlers or jig the mud in the mid-20s.' }),
      A({ id: 'zippel', name: 'Zippel Bay', kind: 'Bay / basin', depth: '16–30 ft', depthFt: 22, lat: 48.86, lon: -94.85, x: 220, y: 200, structure: 'West of Four Mile, same walleye factory', species: ['Walleye', 'Sauger'], season: 'Open water and ice', tip: 'If Four Mile is crowded or blown out, slide to Zippel and keep the same depth.' }),
      A({ id: 'rainy', name: 'Rainy River mouth', kind: 'River mouth', depth: '8–20 ft', depthFt: 14, lat: 48.71, lon: -94.60, x: 200, y: 370, structure: 'Current, spring run, and fall bait', species: ['Walleye', 'Sauger'], season: 'April–May and October', tip: 'The river is the spring and late-fall highway. Fish current seams and the first lake basin.' }),
      A({ id: 'traverse', name: 'Big Traverse', kind: 'Open basin', depth: '20–36 ft', depthFt: 28, lat: 48.95, lon: -94.75, x: 360, y: 260, structure: 'Big open MN water between the south shore and the islands', species: ['Walleye', 'Sauger', 'Northern Pike'], season: 'Summer troll / drift', tip: 'Cover water. Marks come in waves — stay on a school.' }),
      A({ id: 'nwangle', name: 'Northwest Angle', kind: 'Island / deep', depth: '15–70 ft', depthFt: 32, lat: 49.35, lon: -95.15, x: 620, y: 90, structure: 'Island rock, muskies, and deeper Canadian-side holes', species: ['Muskie', 'Walleye', 'Northern Pike'], season: 'June–October', tip: 'A different lake than Four Mile. Hire a local or pick one island group and learn it.' }),
      A({ id: 'sabaskong', name: 'Sabaskong Bay', kind: 'Bay', depth: '12–40 ft', depthFt: 22, lat: 49.15, lon: -94.15, x: 700, y: 360, structure: 'Ontario bay, weeds and rock, muskie reputation', species: ['Muskie', 'Walleye', 'Smallmouth Bass'], season: 'July–October', tip: 'Trophy muskie water. Figure-8s and big rubber on weed/rock edges.' })
    ]
  },
  {
    id: 'devils',
    mix: 'moderate',
    maxDepth: 60,
    avgDepth: 18,
    acres: '~160,000+ acres (still changing)',
    waterType: 'Flooded prairie lake',
    notes:
      'A flooded landscape of roads, timber, and bays. Depths jump from skinny flats to 20–40 ft holes. Perch and walleye roam; pike use the grass. Ice fishing is a major season.',
    sources: [
      { name: 'ND Game & Fish — Devils Lake', url: 'https://gf.nd.gov/fishing' }
    ],
    tempStations: [],
    profile: [
      { x: 0, d: 6, label: 'Flats' },
      { x: 30, d: 14, label: 'Bays' },
      { x: 55, d: 24, label: 'Channels' },
      { x: 80, d: 36, label: 'Holes' },
      { x: 100, d: 50, label: 'Deep hole' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M80 220 C60 140 140 70 250 90 C330 50 430 80 500 60 C600 35 700 90 740 170 C780 250 720 330 680 360 C740 420 650 480 520 460 C400 445 360 400 300 410 C200 430 90 360 80 220 Z' },
        { depth: 12, d: 'M150 230 C150 160 230 130 320 145 C400 110 500 130 560 120 C640 110 690 170 690 230 C700 300 630 350 540 355 C450 360 380 340 320 350 C230 365 155 310 150 230 Z' },
        { depth: 25, d: 'M280 240 C300 190 390 185 460 200 C540 215 580 250 560 300 C530 340 440 345 370 325 C310 308 270 280 280 240 Z' }
      ],
      islands: [
        { d: 'M400 200 a16 10 0 1 0 0.1 0 Z', name: '' }
      ],
      labels: [
        { x: 160, y: 120, text: 'West Bay' },
        { x: 620, y: 80, text: 'East Bay' },
        { x: 200, y: 400, text: 'Minnewaukan' },
        { x: 500, y: 430, text: 'Creel / Six-Mile' }
      ]
    },
    areas: [
      A({ id: 'creel', name: 'Creel Bay', kind: 'Bay', depth: '10–28 ft', depthFt: 16, lat: 48.11, lon: -98.93, x: 480, y: 380, structure: 'Town bay, access, and nearby structure', species: ['Walleye', 'Yellow Perch', 'Northern Pike'], season: 'Ice and open water', tip: 'Easy starting water. Move if you’re not on perch schools.' }),
      A({ id: 'eastbay', name: 'East Bay', kind: 'Basin', depth: '12–35 ft', depthFt: 22, lat: 48.10, lon: -98.85, x: 640, y: 200, structure: 'Larger east basin with deeper holes', species: ['Walleye', 'Yellow Perch'], season: 'Summer and ice', tip: 'Summer eyes often hold 18–28 ft on the first drop off the flats.' }),
      A({ id: 'westbay', name: 'West Bay', kind: 'Basin', depth: '10–30 ft', depthFt: 18, lat: 48.12, lon: -99.05, x: 200, y: 180, structure: 'West basin and connecting cuts', species: ['Walleye', 'Yellow Perch', 'Northern Pike'], season: 'Year-round', tip: 'Windward shoreline + the first deep cut is the usual program.' }),
      A({ id: 'sixmile', name: 'Six-Mile Bay', kind: 'Bay', depth: '8–24 ft', depthFt: 14, lat: 48.05, lon: -99.05, x: 300, y: 400, structure: 'Southern bay with grass and perch', species: ['Yellow Perch', 'Walleye', 'Northern Pike'], season: 'Ice is famous here', tip: 'Stay mobile for perch. Pike cruise the remaining weeds.' }),
      A({ id: 'minn', name: 'Minnewaukan Flats', kind: 'Flats / timber', depth: '4–16 ft', depthFt: 8, lat: 48.07, lon: -99.25, x: 140, y: 360, structure: 'Flooded flats, roads, and timber', species: ['Northern Pike', 'Walleye'], season: 'Spring and fall', tip: 'Skinny, snaggy, and full of pike. Pitch jigs; bring extras.' }),
      A({ id: 'blacktiger', name: 'Black Tiger Bay', kind: 'Bay', depth: '10–26 ft', depthFt: 16, lat: 48.00, lon: -98.95, x: 520, y: 420, structure: 'South-end bay with mixed structure', species: ['Walleye', 'Yellow Perch'], season: 'Open water and ice', tip: 'Another “move until you mark them” perch/eye bay.' })
    ]
  },
  {
    id: 'mississippi',
    mix: 'river',
    maxDepth: 60,
    avgDepth: 18,
    acres: 'Pools 4–9 (Pepin to Prairie du Chien)',
    waterType: 'Big-river pools',
    notes:
      'No classic lake thermocline. The navigation channel, wing dams, tailwaters, and backwaters each fish differently. Lake Pepin is the deep “lake” in the stretch; most wing-dam bites are 8–18 ft.',
    sources: [
      { name: 'USACE Mississippi River pools', url: 'https://www.mvp.usace.army.mil/' },
      { name: 'WI DNR river maps', url: 'https://dnr.wisconsin.gov/topic/Fishing/questions/lakemaps' }
    ],
    tempStations: ['05420500'],
    profile: [
      { x: 0, d: 8, label: 'Backwater' },
      { x: 25, d: 14, label: 'Wing dam' },
      { x: 50, d: 22, label: 'Channel' },
      { x: 75, d: 40, label: 'Pepin' },
      { x: 100, d: 18, label: 'Tailwater' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M360 20 C430 40 450 80 420 120 C490 160 470 210 410 240 C480 280 500 330 430 370 C500 410 480 460 400 490 L340 490 C280 450 300 410 250 380 C310 340 280 290 230 260 C300 210 280 160 240 120 C310 80 300 40 360 20 Z' },
        { depth: 10, d: 'M370 50 C410 70 415 105 385 135 C430 170 420 210 380 235 C430 275 440 325 385 360 C430 400 420 450 375 475 L350 475 C320 445 330 410 300 385 C345 350 330 305 300 275 C345 235 335 190 305 155 C345 120 340 80 370 50 Z' },
        { depth: 22, d: 'M375 90 C395 110 390 140 370 165 C400 195 395 230 370 255 C400 290 405 330 375 360 C400 395 395 440 370 460 L355 458 C340 435 345 400 325 375 C350 345 345 305 325 280 C350 250 345 210 325 185 C350 155 348 120 375 90 Z' }
      ],
      islands: [
        { d: 'M250 200 a20 40 0 1 0 0.1 0 Z', name: 'Islands / sloughs' },
        { d: 'M470 300 a16 28 0 1 0 0.1 0 Z', name: '' }
      ],
      labels: [
        { x: 480, y: 40, text: 'Pool 4 / Lake Pepin' },
        { x: 120, y: 250, text: 'Backwaters' },
        { x: 520, y: 280, text: 'Wing dams' },
        { x: 430, y: 490, text: 'Pool 8–9' }
      ]
    },
    areas: [
      A({ id: 'pepin', name: 'Lake Pepin (Pool 4)', kind: 'River lake', depth: '15–60 ft', depthFt: 32, lat: 44.45, lon: -92.30, x: 390, y: 70, structure: 'The widest, deepest pool — a real lake on the river', species: ['Walleye', 'Sauger', 'White Bass'], season: 'Year-round; winter sauger', tip: 'Troll or jig the breaks. This is where a summer thermocline can actually show up.' }),
      A({ id: 'wingdams', name: 'Wing dams (Pools 5–8)', kind: 'Wing dam', depth: '8–18 ft', depthFt: 12, lat: 44.00, lon: -91.50, x: 430, y: 260, structure: 'Rock dikes sticking into current — the classic Midwest river spot', species: ['Walleye', 'Smallmouth Bass', 'Catfish'], season: 'May–October', tip: 'Hit the eddy behind the tip and the current seam. Three dams, then move.' }),
      A({ id: 'tailwater', name: 'Lock & dam tailwaters', kind: 'Dam', depth: '12–35 ft', depthFt: 20, lat: 43.87, lon: -91.31, x: 380, y: 330, structure: 'Scoured holes and current below the gates', species: ['Walleye', 'Sauger', 'Catfish'], season: 'Winter eyes; summer cats', tip: 'Sauger stack in the tailrace in cold water. Watch the red lights and stay legal.' }),
      A({ id: 'pool8', name: 'Pool 8 (La Crosse)', kind: 'Pool', depth: '8–25 ft', depthFt: 15, lat: 43.81, lon: -91.25, x: 370, y: 400, structure: 'Islands, side channels, and a well-known fishery', species: ['Walleye', 'Bass', 'Catfish'], season: 'Spring and fall', tip: 'Fish current in the main river; flip wood in the sloughs for bass.' }),
      A({ id: 'pool9', name: 'Pool 9 / Harpers Ferry', kind: 'Pool', depth: '8–28 ft', depthFt: 16, lat: 43.20, lon: -91.15, x: 370, y: 460, structure: 'Lower stretch toward Prairie du Chien', species: ['Walleye', 'Catfish', 'Bass'], season: 'Spring–fall', tip: 'Same river playbook: dams, wing dams, and backwater wood.' }),
      A({ id: 'backwaters', name: 'Backwaters / sloughs', kind: 'Backwater', depth: '2–10 ft', depthFt: 5, lat: 43.90, lon: -91.28, x: 250, y: 280, structure: 'Wood, pads, and warm skinny water off the channel', species: ['Largemouth Bass', 'Crappie', 'Northern Pike'], season: 'May–September', tip: 'When the main river is blown, the sloughs still fish. Pitch jigs in the wood.' })
    ]
  },
  {
    id: 'ohio',
    mix: 'river',
    maxDepth: 70,
    avgDepth: 22,
    acres: 'Locks & dams from OH / IN / KY',
    waterType: 'Big river',
    notes:
      'Catfish own the deep holes and dam tailraces. Bass use banks, wood, and current breaks. Sauger winter in the tailwaters. Like the Mississippi, the “thermocline” is really just cooler, slower holes.',
    sources: [
      { name: 'ODNR Ohio River fishing', url: 'https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources/fishing-reports-forecasts' }
    ],
    tempStations: ['03290500'],
    profile: [
      { x: 0, d: 8, label: 'Bank' },
      { x: 30, d: 16, label: 'Dike' },
      { x: 55, d: 28, label: 'Channel' },
      { x: 80, d: 50, label: 'Hole' },
      { x: 100, d: 24, label: 'Tailwater' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M40 220 C140 160 240 280 340 200 C440 120 540 260 640 180 C720 130 780 200 780 260 C780 330 700 360 620 320 C520 400 420 280 320 350 C220 410 120 300 40 340 Z' },
        { depth: 12, d: 'M60 250 C150 200 250 290 350 230 C450 170 540 280 640 220 C710 185 750 230 750 270 C745 315 680 330 610 300 C520 360 420 270 330 330 C230 380 140 300 60 320 Z' },
        { depth: 28, d: 'M120 270 C200 240 300 300 400 260 C500 220 600 290 680 255 C710 245 720 270 710 290 C680 310 580 300 500 280 C400 310 300 280 200 300 C160 308 130 290 120 270 Z' }
      ],
      islands: [],
      labels: [
        { x: 80, y: 180, text: 'Cincinnati stretch' },
        { x: 360, y: 140, text: 'Markland pool' },
        { x: 620, y: 150, text: 'Louisville / McAlpine' },
        { x: 400, y: 430, text: 'Current →' }
      ]
    },
    areas: [
      A({ id: 'mcalpine', name: 'McAlpine / Louisville', kind: 'Dam tailwater', depth: '15–45 ft', depthFt: 28, lat: 38.27, lon: -85.75, x: 660, y: 230, structure: 'Falls of the Ohio and the McAlpine tailrace', species: ['Catfish', 'Sauger', 'Bass'], season: 'Year-round; winter sauger', tip: 'Fish the boils and the first hole below the dam. Heavy weights in current.' }),
      A({ id: 'markland', name: 'Markland Dam pool', kind: 'Dam / pool', depth: '12–40 ft', depthFt: 24, lat: 38.78, lon: -84.96, x: 400, y: 250, structure: 'Pool and tailwater on the Cincinnati–Warsaw stretch', species: ['Catfish', 'Bass', 'Sauger'], season: 'Late spring–fall cats', tip: 'Flatheads want live bait on wood in the dark. Blues roam the channel breaks.' }),
      A({ id: 'cincy', name: 'Cincinnati / urban banks', kind: 'Bank / current', depth: '8–25 ft', depthFt: 14, lat: 39.09, lon: -84.51, x: 180, y: 260, structure: 'Seawalls, creek mouths, and current seams', species: ['Bass', 'Catfish'], season: 'May–October', tip: 'Smallmouth on current breaks; skip docks and wood for largemouth.' }),
      A({ id: 'holes', name: 'Outside-bend holes', kind: 'Hole', depth: '30–70 ft', depthFt: 45, lat: 38.50, lon: -85.40, x: 500, y: 300, structure: 'Deep outside bends — summer catfish hotels', species: ['Catfish'], season: 'June–September nights', tip: 'Anchor on the lip, bait in the hole. This is where trophy blues and flatheads live.' }),
      A({ id: 'dikes', name: 'Wing dikes / creek mouths', kind: 'Dike', depth: '8–20 ft', depthFt: 12, lat: 37.97, lon: -87.57, x: 300, y: 320, structure: 'Current breaks and bait funnels', species: ['Catfish', 'Bass', 'Sauger'], season: 'Spring–fall', tip: 'Same as the Mississippi: tip of the dike, eddy, then the next one.' })
    ]
  },
  {
    id: 'traverse',
    mix: 'deep',
    maxDepth: 620,
    avgDepth: 180,
    acres: 'East + west arms of Grand Traverse Bay',
    waterType: 'Deep clear Great Lakes bay',
    notes:
      'Two deep arms split by Old Mission Peninsula. Smallmouth live on the 8–25 ft rock. Lake trout and salmon live on the thermocline and deeper — often 60–150+ ft in summer. Surface temp tells you almost nothing about the laker layer.',
    sources: [
      { name: 'Michigan DNR weekly report', url: 'https://www.michigan.gov/dnr/things-to-do/fishing/weekly' },
      { name: 'NOAA Lake Michigan bathymetry', url: 'https://www.ngdc.noaa.gov/mgg/greatlakes/michigan.html' }
    ],
    tempStations: ['45007', '45161'],
    profile: [
      { x: 0, d: 8, label: 'Rock' },
      { x: 20, d: 25, label: 'Points' },
      { x: 40, d: 70, label: 'First break' },
      { x: 65, d: 180, label: 'Thermocline' },
      { x: 100, d: 400, label: 'Deep basin' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M180 480 L200 200 C210 80 300 30 400 80 L400 200 C400 30 520 20 600 90 C670 150 690 280 680 480 L520 480 L520 210 C510 160 450 160 440 220 L440 480 Z' },
        { depth: 25, d: 'M230 470 L245 220 C255 120 330 80 385 120 L385 230 C400 120 500 90 575 140 C630 185 645 300 640 470 L560 470 L555 230 C545 190 500 195 490 250 L490 470 L390 470 L385 250 C375 190 330 195 320 250 L315 470 Z' },
        { depth: 80, d: 'M280 470 L290 260 C300 180 350 160 365 230 L365 470 Z' },
        { depth: 80, d: 'M500 470 L505 270 C520 190 580 180 600 260 L605 470 Z' },
        { depth: 200, d: 'M310 470 L318 320 C328 270 350 280 352 340 L355 470 Z' },
        { depth: 200, d: 'M530 470 L538 340 C548 280 575 290 585 350 L588 470 Z' }
      ],
      islands: [
        { d: 'M300 300 a8 6 0 1 0 0.1 0 Z', name: 'Power Is.' },
        { d: 'M560 250 a7 5 0 1 0 0.1 0 Z', name: 'Marion' }
      ],
      labels: [
        { x: 250, y: 60, text: 'West arm' },
        { x: 560, y: 50, text: 'East arm' },
        { x: 360, y: 160, text: 'Old Mission' },
        { x: 330, y: 492, text: 'Traverse City' }
      ]
    },
    areas: [
      A({ id: 'oldmission', name: 'Old Mission points', kind: 'Peninsula rock', depth: '8–30 ft', depthFt: 16, lat: 44.99, lon: -85.48, x: 420, y: 140, structure: 'Steep rocky points on both sides of the peninsula', species: ['Smallmouth Bass', 'Lake Trout'], season: 'June–September smallmouth', tip: 'The smallmouth bite is a rock program. Lakers slide off the same points into 80+ ft.' }),
      A({ id: 'bowers', name: 'Bowers Harbor', kind: 'Harbor / drop', depth: '10–80 ft', depthFt: 28, lat: 44.88, lon: -85.55, x: 340, y: 280, structure: 'West-arm harbor with a fast drop to deep water', species: ['Smallmouth Bass', 'Lake Trout', 'Salmon'], season: 'Summer', tip: 'Cast the shallows; if you want trout, you’re quickly into thermocline water.' }),
      A({ id: 'suttons', name: 'Suttons Bay', kind: 'Bay', depth: '8–40 ft', depthFt: 18, lat: 44.98, lon: -85.65, x: 250, y: 200, structure: 'West-arm bay, rock and some weeds', species: ['Smallmouth Bass', 'Salmon'], season: 'June–September', tip: 'Smallmouth first. Watch for salmon pushing bait into the bay in fall.' }),
      A({ id: 'elkrapids', name: 'Elk Rapids', kind: 'Point / east arm', depth: '10–90 ft', depthFt: 30, lat: 44.90, lon: -85.41, x: 600, y: 280, structure: 'East-arm access and a steep break', species: ['Smallmouth Bass', 'Lake Trout', 'Salmon'], season: 'Summer troll + smallmouth', tip: 'A launch that puts you on deep structure in minutes.' }),
      A({ id: 'power', name: 'Power / Marion Islands', kind: 'Island rock', depth: '8–40 ft', depthFt: 18, lat: 44.87, lon: -85.57, x: 300, y: 300, structure: 'Island perimeters — prime smallmouth', species: ['Smallmouth Bass'], season: 'June–September', tip: 'Tubes, ned, and topwater when the wind ripples the clear water.' }),
      A({ id: 'basin', name: 'Deep basins (lakers)', kind: 'Basin', depth: '80–250 ft', depthFt: 140, lat: 45.05, lon: -85.50, x: 320, y: 380, structure: 'Thermocline and deep water of both arms', species: ['Lake Trout', 'Salmon'], season: 'July–September', tip: 'Ignore the 74°F surface. Find 48–52°F on the graph and troll that layer.' })
    ]
  },
  {
    id: 'pelican',
    mix: 'moderate',
    maxDepth: 163,
    avgDepth: 28,
    acres: 'Alexandria chain (Carlos, Darling, Le Homme Dieu)',
    waterType: 'Connected glacial lakes',
    notes:
      'The Alexandria chain fishes like several lakes. Carlos is the deep, clear walleye basin (163 ft). Darling is shallower, weedy, and pike/bass friendly. A summer thermocline sets up on Carlos; Darling stays more mixed.',
    sources: [
      { name: 'MN DNR LakeFinder — Lake Carlos', url: 'https://www.dnr.state.mn.us/lakefind/lake.html?id=21005700' },
      { name: 'MN DNR LakeFinder', url: 'https://www.dnr.state.mn.us/lakefind/index.html' }
    ],
    tempStations: [],
    profile: [
      { x: 0, d: 8, label: 'Weeds' },
      { x: 30, d: 18, label: 'Darling' },
      { x: 55, d: 32, label: 'Carlos break' },
      { x: 80, d: 70, label: 'Carlos hole' },
      { x: 100, d: 140, label: 'Deep Carlos' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M80 260 C90 160 180 120 280 150 C330 80 450 70 540 130 C620 40 740 90 760 200 C780 300 700 380 600 370 C540 430 430 450 340 400 C250 460 120 400 80 260 Z' },
        { depth: 15, d: 'M150 260 C165 190 240 175 300 200 C350 140 460 140 520 185 C590 120 690 160 700 230 C710 300 640 340 560 330 C500 375 420 380 350 345 C270 385 170 340 150 260 Z' },
        { depth: 40, d: 'M520 200 C580 170 660 200 670 250 C665 300 600 315 550 295 C510 280 500 230 520 200 Z' }
      ],
      islands: [],
      labels: [
        { x: 160, y: 150, text: 'Darling' },
        { x: 400, y: 90, text: "Le Homme Dieu" },
        { x: 640, y: 80, text: 'Carlos (deep)' },
        { x: 300, y: 460, text: 'Alexandria chain' }
      ]
    },
    areas: [
      A({ id: 'carlos-main', name: 'Lake Carlos main basin', kind: 'Deep basin', depth: '25–163 ft', depthFt: 45, lat: 45.95, lon: -95.36, x: 650, y: 230, structure: 'Deep, clear walleye lake of the chain', species: ['Walleye', 'Northern Pike', 'Largemouth Bass'], season: 'June–September', tip: 'Summer eyes sit on the first break and the thermocline, not the 160-ft hole.' }),
      A({ id: 'carlos-break', name: 'Carlos shoreline break', kind: 'Break / rock', depth: '12–28 ft', depthFt: 18, lat: 45.94, lon: -95.34, x: 580, y: 180, structure: 'Points and the 15–25 ft contour', species: ['Walleye', 'Smallmouth Bass'], season: 'May–October', tip: 'The money water. Wind-blown points in low light.' }),
      A({ id: 'darling', name: 'Lake Darling', kind: 'Weedy lake', depth: '6–20 ft', depthFt: 12, lat: 45.85, lon: -95.37, x: 200, y: 240, structure: 'Shallower, weedy, bass and pike', species: ['Largemouth Bass', 'Northern Pike', 'Walleye'], season: 'May–September', tip: 'Flip grass and wood. Less about a thermocline, more about cover.' }),
      A({ id: 'lhd', name: 'Le Homme Dieu', kind: 'Mid-depth lake', depth: '10–40 ft', depthFt: 20, lat: 45.93, lon: -95.32, x: 420, y: 160, structure: 'Connected mid-chain lake with mixed structure', species: ['Walleye', 'Largemouth Bass', 'Northern Pike'], season: 'May–September', tip: 'A happy medium — some weeds, some deeper breaks.' }),
      A({ id: 'channels', name: 'Chain channels', kind: 'Channel', depth: '6–14 ft', depthFt: 8, lat: 45.90, lon: -95.35, x: 360, y: 300, structure: 'Cuts between lakes — current and ambush water', species: ['Walleye', 'Northern Pike', 'Largemouth Bass'], season: 'Spring and evening', tip: 'Fish moving water at dusk. Pike camp in the eddies.' })
    ]
  },
  {
    id: 'shelbyville',
    mix: 'moderate',
    maxDepth: 67,
    avgDepth: 19,
    acres: '~11,100 acres',
    waterType: 'Flooded timber reservoir',
    notes:
      'A Kaskaskia River reservoir with a dam on the south end and long timbered arms. Crappie use brush; muskies use weeds and points; cats use the old river channel. Summer thermocline often 14–22 ft.',
    sources: [
      { name: 'Illinois DNR — Lake Shelbyville', url: 'https://dnr.illinois.gov/fishing.html' },
      { name: 'USACE Lake Shelbyville', url: 'https://www.mvs.usace.army.mil/Missions/Recreation/Lake-Shelbyville/' }
    ],
    tempStations: ['05586300'],
    profile: [
      { x: 0, d: 8, label: 'Coves' },
      { x: 30, d: 16, label: 'Points' },
      { x: 55, d: 28, label: 'Channel' },
      { x: 80, d: 45, label: 'Dam' },
      { x: 100, d: 60, label: 'Stilling' }
    ],
    chart: {
      viewBox: '0 0 800 500',
      bands: [
        { depth: 0, d: 'M360 30 C430 60 410 120 370 160 C480 140 560 180 540 250 C640 230 700 300 640 350 C720 370 700 440 600 450 C520 490 420 470 360 430 C300 470 200 450 180 380 C120 400 80 340 130 300 C80 260 140 200 200 210 C180 140 260 80 360 30 Z' },
        { depth: 14, d: 'M360 80 C400 100 390 145 360 170 C450 165 520 200 510 255 C590 250 640 305 590 345 C650 365 640 420 560 425 C490 455 410 430 360 400 C320 435 240 420 220 370 C180 385 160 335 195 310 C160 280 200 235 250 240 C240 180 300 120 360 80 Z' },
        { depth: 30, d: 'M380 200 C450 210 490 260 470 310 C520 330 500 390 430 395 C370 400 330 360 340 310 C300 300 320 240 380 200 Z' }
      ],
      islands: [],
      labels: [
        { x: 300, y: 24, text: 'Kaskaskia arm' },
        { x: 80, y: 280, text: 'Wolf / Findlay' },
        { x: 640, y: 480, text: 'Dam' },
        { x: 700, y: 250, text: 'Lithia / east coves' }
      ]
    },
    areas: [
      A({ id: 'dam', name: 'Dam / stilling basin', kind: 'Dam', depth: '25–67 ft', depthFt: 40, lat: 39.41, lon: -88.78, x: 600, y: 450, structure: 'Deepest water, old river channel, summer cats and suspended fish', species: ['Catfish', 'Muskie', 'Crappie'], season: 'Summer nights; winter', tip: 'When the coves are 82°F, this is the coolest water on the lake.' }),
      A({ id: 'channel', name: 'Old river channel', kind: 'Channel', depth: '18–40 ft', depthFt: 26, lat: 39.45, lon: -88.76, x: 430, y: 320, structure: 'Drowned Kaskaskia channel winding through the lake', species: ['Catfish', 'Crappie', 'Walleye'], season: 'June–September', tip: 'Follow the channel on electronics. Crappie hang on channel swings with brush.' }),
      A({ id: 'lithia', name: 'Lithia Springs / east coves', kind: 'Cove / timber', depth: '6–20 ft', depthFt: 12, lat: 39.48, lon: -88.70, x: 640, y: 280, structure: 'Flooded timber and spring crappie coves', species: ['Crappie', 'Largemouth Bass', 'Catfish'], season: 'April–June crappie', tip: 'Spider-rig or shoot docks/brush. Move coves until you hit a school.' }),
      A({ id: 'wolf', name: 'Wolf Creek / Findlay', kind: 'Arm / weeds', depth: '6–22 ft', depthFt: 12, lat: 39.52, lon: -88.73, x: 180, y: 300, structure: 'Upper arms, weeds, muskie and bass water', species: ['Muskie', 'Largemouth Bass', 'Crappie'], season: 'Spring crappie; summer–fall muskie', tip: 'Muskie along weed walls and points. Figure-8 on every cast.' }),
      A({ id: 'points', name: 'Main-lake points', kind: 'Point', depth: '10–25 ft', depthFt: 16, lat: 39.46, lon: -88.75, x: 400, y: 260, structure: 'Secondary points that kiss the channel', species: ['Muskie', 'Bass', 'Crappie'], season: 'May–October', tip: 'The thermocline plus a point plus brush is the summer trifecta.' })
    ]
  }
];

COOPS.buildDepthChart = function (spot) {
  if (!spot) return null;
  const existing = (COOPS.depthCharts || []).find((c) => c.id === spot.id);
  if (existing) return existing;

  const maxD = spot.maxDepth || 40;
  const avgD = spot.avgDepth || Math.round(maxD * 0.4);
  const mix = spot.mix || 'moderate';
  const areas = (spot.areas || []).map((a, i) => {
    if (a.x != null && a.y != null) return a;
    const t = (i + 0.5) / Math.max(1, spot.areas.length);
    return Object.assign({}, a, {
      x: 140 + t * 520 + (i % 2) * 18,
      y: 140 + (i % 3) * 90
    });
  });

  const bands = genericBands(mix, maxD);
  const profile =
    spot.profile ||
    [
      { x: 0, d: Math.max(4, Math.round(avgD * 0.35)), label: 'Shallow' },
      { x: 35, d: avgD, label: 'Typical' },
      { x: 70, d: Math.round((avgD + maxD) / 2), label: 'Break' },
      { x: 100, d: maxD, label: 'Deep' }
    ];

  return {
    id: spot.id,
    mix,
    maxDepth: maxD,
    avgDepth: avgD,
    acres: spot.acres || '',
    waterType: spot.waterType || 'Fishery',
    notes: spot.notes || spot.why || '',
    sources: spot.sources || [],
    tempStations: spot.tempStations || [],
    profile,
    chart: {
      viewBox: '0 0 800 500',
      bands,
      islands: [],
      labels: [
        { x: 40, y: 36, text: spot.name },
        { x: 40, y: 480, text: 'Schematic — not a nav chart' }
      ]
    },
    areas
  };
};

function genericBands(mix, maxD) {
  if (mix === 'river') {
    return [
      { depth: 0, d: 'M40 210 C150 150 250 270 360 200 C470 130 570 260 680 190 C740 155 780 210 780 255 C780 320 700 350 610 310 C510 380 410 270 310 340 C210 400 110 300 40 330 Z' },
      { depth: 12, d: 'M80 245 C180 200 280 285 390 235 C500 185 600 285 690 235 C735 210 750 245 748 270 C740 305 650 320 560 290 C460 340 370 275 280 315 C190 350 120 285 80 300 Z' },
      { depth: Math.min(30, Math.round(maxD * 0.45)), d: 'M140 265 C240 235 340 290 440 260 C540 230 630 285 700 255 C720 248 728 268 720 282 C680 300 580 295 490 275 C390 300 300 275 220 295 C180 305 155 280 140 265 Z' }
    ];
  }
  if (mix === 'coastal') {
    return [
      { depth: 0, d: 'M40 80 C180 40 400 50 620 90 C720 115 780 180 790 280 L790 430 C650 470 400 480 180 450 C80 430 30 360 40 280 Z' },
      { depth: 8, d: 'M80 140 C220 100 430 110 600 150 C690 175 730 230 735 300 L730 390 C600 420 380 425 180 395 C100 375 75 300 80 230 Z' },
      { depth: 20, d: 'M220 200 C360 170 520 190 620 240 C670 270 680 320 650 355 C560 385 380 385 260 350 C200 330 195 250 220 200 Z' }
    ];
  }
  const deepHole = mix === 'deep';
  return [
    { depth: 0, d: 'M120 90 C250 30 520 25 680 90 C760 130 790 230 770 330 C740 430 560 480 380 470 C200 460 80 380 70 260 C60 160 80 115 120 90 Z' },
    { depth: deepHole ? 20 : 12, d: 'M180 140 C290 85 510 85 640 145 C710 185 730 260 710 330 C680 400 530 435 370 425 C220 415 145 345 140 255 C135 180 150 155 180 140 Z' },
    { depth: deepHole ? 60 : 25, d: 'M270 190 C370 150 500 155 590 205 C640 240 645 305 600 345 C540 385 400 395 310 360 C250 330 240 245 270 190 Z' },
    { depth: deepHole ? 150 : 40, d: 'M360 230 C430 210 510 225 545 275 C555 310 510 340 440 342 C380 344 345 300 360 230 Z' }
  ];
}

COOPS.depthChartById = function (id) {
  const found = (COOPS.depthCharts || []).find((c) => c.id === id);
  if (found) return found;
  const spot = (COOPS.spots || []).find((s) => s.id === id);
  const built = COOPS.buildDepthChart(spot);
  return built || (COOPS.depthCharts && COOPS.depthCharts[0]) || null;
};

COOPS.BAND_COLORS = {
  0: '#8fd9cc',
  8: '#6ecfc0',
  10: '#5bc4c8',
  12: '#4db8d0',
  14: '#3aa8c0',
  15: '#2f9bb8',
  20: '#2b7fa8',
  22: '#27749c',
  25: '#1f6a90',
  28: '#1a5f82',
  30: '#175776',
  32: '#14506e',
  35: '#124862',
  40: '#0e3d5c',
  60: '#0b334c',
  70: '#092a40',
  80: '#082438',
  200: '#04141f'
};

COOPS.bandColor = function (depth) {
  const keys = Object.keys(COOPS.BAND_COLORS)
    .map(Number)
    .sort((a, b) => a - b);
  let c = COOPS.BAND_COLORS[0];
  for (const k of keys) {
    if (depth >= k) c = COOPS.BAND_COLORS[k];
  }
  return c;
};
