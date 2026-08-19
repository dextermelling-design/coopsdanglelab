/**
 * Coop's Fishing — nationwide regions and featured waters.
 * Curated public destinations (not a complete lake database).
 */

window.COOPS = window.COOPS || {};

COOPS.regions = [
  { id: 'great-lakes', name: 'Great Lakes' },
  { id: 'midwest', name: 'Midwest' },
  { id: 'northeast', name: 'Northeast' },
  { id: 'mid-atlantic', name: 'Mid-Atlantic' },
  { id: 'southeast', name: 'Southeast' },
  { id: 'gulf', name: 'Gulf Coast' },
  { id: 'south', name: 'South & Ozarks' },
  { id: 'plains', name: 'Great Plains' },
  { id: 'rockies', name: 'Rockies' },
  { id: 'southwest', name: 'Southwest' },
  { id: 'west', name: 'California & West' },
  { id: 'pnw', name: 'Pacific Northwest' },
  { id: 'alaska', name: 'Alaska' }
];

COOPS.stateNames = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

COOPS.spotStates = function (spot) {
  if (spot.states && spot.states.length) return spot.states;
  return String(spot.state || '')
    .split(/[^A-Z]+/)
    .filter((x) => x.length === 2);
};

COOPS.filterSpots = function (opts) {
  const region = opts.region || 'all';
  const state = opts.state || 'all';
  const species = (opts.species || 'all').toLowerCase();
  const q = (opts.q || '').trim().toLowerCase();
  return (COOPS.spots || []).filter((s) => {
    if (region !== 'all' && s.regionId !== region) return false;
    if (state !== 'all' && COOPS.spotStates(s).indexOf(state) === -1) return false;
    if (species !== 'all') {
      const hit = (s.species || []).some((x) => x.toLowerCase().indexOf(species) !== -1);
      if (!hit) return false;
    }
    if (q) {
      const stateWords = COOPS.spotStates(s)
        .map((st) => st + ' ' + ((COOPS.stateNames || {})[st] || ''))
        .join(' ');
      const hay = (
        s.name +
        ' ' +
        s.state +
        ' ' +
        stateWords +
        ' ' +
        (s.region || '') +
        ' ' +
        (s.species || []).join(' ')
      ).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

COOPS.areasForSpot = function (spot) {
  if (!spot) return [];
  if (spot.areas && spot.areas.length) return spot.areas;
  const chart = (COOPS.depthCharts || []).find((c) => c.id === spot.id);
  return (chart && chart.areas) || [];
};

/** Ranked search across waters, states, species, and named fishing areas. */
COOPS.searchAll = function (raw) {
  const q = String(raw || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const out = [];

  (COOPS.spots || []).forEach((s) => {
    const name = (s.name || '').toLowerCase();
    const state = (s.state || '').toLowerCase();
    const region = (s.region || '').toLowerCase();
    const species = (s.species || []).join(' ').toLowerCase();
    const stateWords = COOPS.spotStates(s)
      .map((st) => st.toLowerCase() + ' ' + String((COOPS.stateNames || {})[st] || '').toLowerCase())
      .join(' ');
    const hay = name + ' ' + state + ' ' + region + ' ' + species + ' ' + stateWords;
    let score = 0;
    if (name === q) score += 20;
    if (name.indexOf(q) === 0) score += 12;
    if (name.indexOf(q) !== -1) score += 10;
    words.forEach((w) => {
      if (hay.indexOf(w) !== -1) score += 3;
    });
    if ((s.species || []).some((sp) => sp.toLowerCase().indexOf(q) !== -1)) score += 6;
    if (state.indexOf(q) !== -1 || COOPS.spotStates(s).some((st) => st.toLowerCase() === q)) score += 5;
    if (score) {
      out.push({
        type: 'water',
        score,
        id: s.id,
        label: s.name,
        sub: s.state + ' · ' + s.region + ' · ' + (s.species || []).slice(0, 3).join(', '),
        spot: s
      });
    }

    COOPS.areasForSpot(s).forEach((a) => {
      const an = (a.name || '').toLowerCase();
      const ah = (an + ' ' + (a.kind || '') + ' ' + (a.species || []).join(' ')).toLowerCase();
      if (an.indexOf(q) === -1 && !words.every((w) => ah.indexOf(w) !== -1)) return;
      if (q.length < 3 && an.indexOf(q) === -1) return;
      let as = 0;
      if (an.indexOf(q) === 0) as += 11;
      if (an.indexOf(q) !== -1) as += 8;
      words.forEach((w) => {
        if (ah.indexOf(w) !== -1) as += 2;
      });
      if (as) {
        out.push({
          type: 'area',
          score: as,
          id: s.id,
          areaId: a.id,
          label: a.name,
          sub: s.name + ' · ' + (a.depth || a.kind),
          spot: s,
          area: a
        });
      }
    });
  });

  out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return out.slice(0, 12);
};

function S(p) {
  return p;
}
function area(p) {
  return p;
}

COOPS.moreUsgs = [
  { id: '01463500', name: 'Delaware River @ Trenton', near: 'Mid-Atlantic / NJ–PA', species: 'Stripers, Shad, Bass' },
  { id: '01646500', name: 'Potomac River @ Little Falls', near: 'Washington, DC / Chesapeake', species: 'Stripers, Catfish' },
  { id: '02035000', name: 'James River @ Cartersville', near: 'Central Virginia', species: 'Bass, Catfish' },
  { id: '02169500', name: 'Congaree River @ Columbia', near: 'Midlands SC / Santee system', species: 'Catfish, Bass' },
  { id: '02359170', name: 'Apalachicola R. @ Chattahoochee', near: 'FL Panhandle / Gulf', species: 'Bass, Catfish' },
  { id: '07374000', name: 'Mississippi River @ Baton Rouge', near: 'Lower Mississippi / LA', species: 'Catfish, Bass' },
  { id: '08057000', name: 'Trinity River @ Dallas', near: 'North Texas', species: 'Catfish, Bass' },
  { id: '09380000', name: 'Colorado River @ Lees Ferry', near: 'Glen Canyon / Lake Powell AZ', species: 'Trout' },
  { id: '11447650', name: 'Sacramento River @ Freeport', near: 'Sacramento–San Joaquin Delta', species: 'Stripers, Bass' },
  { id: '14105700', name: 'Columbia River @ The Dalles', near: 'Columbia Gorge OR / WA', species: 'Salmon, Steelhead, Walleye' },
  { id: '14211720', name: 'Willamette River @ Portland', near: 'Lower Willamette / OR', species: 'Salmon, Steelhead, Bass' },
  { id: '15258000', name: 'Kenai River @ Soldotna', near: 'Kenai Peninsula AK', species: 'Salmon, Trout' }
];

COOPS.moreNdbc = [
  { id: '44013', name: 'Boston Buoy', near: 'Massachusetts Bay', species: 'Stripers, Bluefish' },
  { id: '44065', name: 'New York Harbor Entrance', near: 'NY / NJ Bight', species: 'Stripers, Fluke' },
  { id: '41009', name: 'Canaveral Buoy', near: 'East Central Florida', species: 'Inshore / nearshore' },
  { id: '42040', name: 'Mobile South Buoy', near: 'Alabama / Mississippi Sound', species: 'Redfish, Specks' },
  { id: '42019', name: 'Freeport TX Buoy', near: 'Upper Texas coast', species: 'Redfish, Specks' },
  { id: '46026', name: 'San Francisco Buoy', near: 'Central California', species: 'Stripers, Halibut' },
  { id: '46029', name: 'Columbia River Bar', near: 'OR / WA coast', species: 'Salmon, Bottomfish' },
  { id: '46088', name: 'New Dungeness', near: 'Strait of Juan de Fuca WA', species: 'Salmon, Halibut' }
];

COOPS.moreBait = [
  {
    species: 'Striped Bass',
    icon: '🦓',
    live: ['Bunker / menhaden', 'Eels', 'Herring', 'Bloodworms (inshore)'],
    artificial: ['Soft paddletails', 'Pencil poppers', 'Bucktails', 'Tins / metals', 'Swimbaits'],
    tips: 'Current is everything — rips, inlets, and river mouths. Dawn/dusk on the surface; deeper when the sun is high.',
    temp: 'Feed well 52–70°F; spring and fall migrations are the headline.'
  },
  {
    species: 'Redfish',
    icon: '🔴',
    live: ['Shrimp', 'Mullet', 'Croaker', 'Crabs'],
    artificial: ['Gold spoons', 'Paddletails', 'Fly shrimp', 'Weedless spoons on grass'],
    tips: 'Tailing fish on skinny flats, then deeper channels when it blows. Sight-fish when the water is clear.',
    temp: 'Active most of the year on the Gulf; 65–80°F is easy feeding.'
  },
  {
    species: 'Speckled Trout',
    icon: '💠',
    live: ['Live shrimp under a popping cork', 'Croaker', 'Mullet'],
    artificial: ['Soft plastics on jigheads', 'Topwater walkers (low light)', 'MirrOlure-style twitchbaits'],
    tips: 'Grass edges, points, and first guts behind the breakers. Slow down in cold snaps.',
    temp: 'Best 60–75°F; they sulk hard below the mid-50s.'
  },
  {
    species: 'Snook',
    icon: '🌙',
    live: ['Whitebait', 'Pilchards', 'Pinfish', 'Shrimp'],
    artificial: ['Walk-the-dog topwater', 'Soft jerkbaits', 'DOA shrimp', 'Flies on the flats'],
    tips: 'Inlets, mangrove points, and dock lights. Closed seasons and slot limits are strict — know the regs.',
    temp: 'Need 70°F+; a hard cold front can shut them down or kill fish in the shallows.'
  },
  {
    species: 'Steelhead / Trout',
    icon: '🥈',
    live: ['Roe / beads (where legal)', 'Worms', 'Nightcrawlers'],
    artificial: ['Spoons', 'Spinners', 'Jigs under a float', 'Nymphs and swung flies'],
    tips: 'Current seams and tailouts. Cold, oxygenated water. Match the hatch or the egg drop.',
    temp: 'Prefer 44–58°F. Summer trout sit in tailwaters and high-elevation lakes.'
  }
];

COOPS.moreSpots = [
  S({
    id: 'ontario-niagara', name: 'Lake Ontario / Niagara', state: 'NY', states: ['NY'],
    regionId: 'great-lakes', region: 'Great Lakes',
    species: ['Salmon', 'Steelhead', 'Smallmouth Bass', 'Lake Trout'],
    why: 'Tributary steelhead and a world-class summer salmon troll off the Niagara Bar and the south shore.',
    records: 'King salmon over 30 lb are regular; tributaries draw winter steelhead crowds.',
    best: 'Aug–Oct kings; Nov–Apr steelhead', lat: 43.26, lon: -79.05,
    mix: 'deep', maxDepth: 802, avgDepth: 283, acres: 'Eastern Great Lake',
    waterType: 'Deep Great Lake + river',
    notes: 'The lake is huge and cold. Smallmouth live on the 8–25 ft rock; kings live on the thermocline far offshore.',
    tempStations: ['44065'],
    areas: [
      area({ id: 'niag-bar', name: 'Niagara Bar', kind: 'Bar / troll', depth: '20–80 ft', depthFt: 40, lat: 43.27, lon: -79.05, structure: 'River plume mixing with the lake', species: ['Salmon', 'Smallmouth Bass'], season: 'Summer–fall', tip: 'Troll the color line where the Niagara dumps into Ontario.' }),
      area({ id: 'oak', name: 'Oak Orchard / point waters', kind: 'Port / troll', depth: '40–150 ft', depthFt: 80, lat: 43.37, lon: -78.19, structure: 'South-shore troll lanes', species: ['Salmon', 'Lake Trout'], season: 'July–October', tip: 'Downriggers on the 50–55°F band. Ignore the warm surface.' }),
      area({ id: 'salmon-riv', name: 'Salmon River (Pulaski)', kind: 'Tributary', depth: '2–10 ft', depthFt: 4, lat: 43.57, lon: -76.07, structure: 'Classic steelhead and king run river', species: ['Steelhead', 'Salmon'], season: 'September–April', tip: 'Wading water. Check regs and crowds on weekends.' }),
      area({ id: 'olcott', name: 'Thirty Mile / Olcott rock', kind: 'Rock', depth: '8–25 ft', depthFt: 14, lat: 43.34, lon: -78.72, structure: 'Nearshore smallmouth rock', species: ['Smallmouth Bass'], season: 'June–September', tip: 'Tubes and drop-shot when the lake lays down.' })
    ]
  }),
  S({
    id: 'superior-duluth', name: 'Lake Superior — Duluth / South Shore', state: 'MN / WI', states: ['MN', 'WI'],
    regionId: 'great-lakes', region: 'Great Lakes',
    species: ['Lake Trout', 'Salmon', 'Steelhead', 'Walleye'],
    why: 'Coldest, clearest Great Lake. Lakers and a surprise St. Louis River walleye run.',
    records: 'Coaster brook trout and fat lakers; river walleyes in spring.',
    best: 'June–Sept lakers; spring river eyes', lat: 46.78, lon: -92.10,
    mix: 'deep', maxDepth: 1332, avgDepth: 483, acres: 'Western Superior',
    waterType: 'Deep cold Great Lake',
    notes: 'Surface can sit in the 40s in June. Lakers are often shallower here than on Michigan because the whole lake is cold.',
    tempStations: ['45003'],
    areas: [
      area({ id: 'stlouis', name: 'St. Louis River estuary', kind: 'River mouth', depth: '6–20 ft', depthFt: 12, lat: 46.73, lon: -92.17, structure: 'Estuary and shipping canal', species: ['Walleye', 'Northern Pike'], season: 'April–June', tip: 'Spring walleye water. Then the lake itself is a trout game.' }),
      area({ id: 'south-shore', name: 'South shore troll', kind: 'Basin', depth: '60–180 ft', depthFt: 110, lat: 46.85, lon: -91.80, structure: 'Deep, clear troll water', species: ['Lake Trout', 'Salmon'], season: 'June–September', tip: 'Find 44–50°F and stay on it.' }),
      area({ id: 'apostle', name: 'Apostle Islands', kind: 'Island rock', depth: '10–80 ft', depthFt: 30, lat: 46.95, lon: -90.64, structure: 'Island perimeters and reefs', species: ['Lake Trout', 'Smallmouth Bass'], season: 'July–September', tip: 'Weather window required. Magical when it lays down.' })
    ]
  }),
  S({
    id: 'winnebago', name: 'Lake Winnebago', state: 'WI', states: ['WI'],
    regionId: 'midwest', region: 'Midwest',
    species: ['Walleye', 'White Bass', 'Sturgeon', 'Perch'],
    why: 'Wisconsin’s big, shallow walleye factory and the famous sturgeon spearing lake.',
    records: 'Huge sturgeon; excellent spring walleye and white bass runs on the Fox/Wolf.',
    best: 'April–June runs; winter ice', lat: 44.02, lon: -88.42,
    mix: 'shallow', maxDepth: 21, avgDepth: 15, acres: '~132,000 acres',
    waterType: 'Large shallow inland lake',
    notes: 'Almost no thermocline. Fish wind, mud, and river mouths.',
    tempStations: ['040851385'],
    areas: [
      area({ id: 'wolf-mouth', name: 'Wolf River / Partridge Lake', kind: 'River mouth', depth: '6–14 ft', depthFt: 9, lat: 44.20, lon: -88.70, structure: 'Spring run highway', species: ['Walleye', 'White Bass'], season: 'April–May', tip: 'The run is the show. Then they slide back into the lake.' }),
      area({ id: 'winn-reefs', name: 'Mid-lake reefs', kind: 'Reef', depth: '8–16 ft', depthFt: 12, lat: 44.00, lon: -88.40, structure: 'Rock piles on a mud lake', species: ['Walleye', 'Perch'], season: 'June–September', tip: 'Wind on a reef is a gift. Drift crawlers.' }),
      area({ id: 'fondy', name: 'Fond du Lac / south shore', kind: 'Shore / access', depth: '6–12 ft', depthFt: 8, lat: 43.80, lon: -88.45, structure: 'South basin flats', species: ['Walleye', 'Perch'], season: 'Ice and spring', tip: 'Stay mobile on ice. Schools roam.' })
    ]
  }),
  S({
    id: 'kentucky-lake', name: 'Kentucky Lake / Lake Barkley', state: 'KY / TN', states: ['KY', 'TN'],
    regionId: 'midwest', region: 'Midwest',
    species: ['Largemouth Bass', 'Crappie', 'Catfish', 'Sauger'],
    why: 'Twin TVA reservoirs — ledges, grass, and a national crappie reputation.',
    records: 'Giant spring crappie; ledge bass in summer; huge blues in the tailwaters.',
    best: 'March–May crappie; summer ledges', lat: 36.80, lon: -88.13,
    mix: 'moderate', maxDepth: 75, avgDepth: 18, acres: '~160,000 acres (pair)',
    waterType: 'Twin highland reservoirs',
    notes: 'Summer bass live on the main-lake ledges and the old river channel. Crappie use creek-arm brush.',
    tempStations: ['03290500'],
    areas: [
      area({ id: 'ky-ledges', name: 'Main-lake ledges', kind: 'Ledge', depth: '12–28 ft', depthFt: 18, lat: 36.85, lon: -88.13, structure: 'Channel swings and flats edges', species: ['Largemouth Bass'], season: 'June–September', tip: 'A Carolina rig or big worm on the break. Graph first.' }),
      area({ id: 'ky-creeks', name: 'Creek-arm brush', kind: 'Creek / timber', depth: '6–16 ft', depthFt: 10, lat: 36.70, lon: -88.05, structure: 'Flooded wood and stake beds', species: ['Crappie', 'Largemouth Bass'], season: 'March–May', tip: 'Spider-rig until you hit a school, then sit on them.' }),
      area({ id: 'ky-dam', name: 'Kentucky Dam tailwater', kind: 'Dam', depth: '15–40 ft', depthFt: 24, lat: 37.01, lon: -88.27, structure: 'Current and scoured hole', species: ['Catfish', 'Sauger'], season: 'Year-round; winter sauger', tip: 'Fish the boils. Heavy sinkers.' }),
      area({ id: 'barkley', name: 'Lake Barkley flats', kind: 'Flats', depth: '4–14 ft', depthFt: 8, lat: 36.82, lon: -87.98, structure: 'Shallower twin lake, grass and wood', species: ['Largemouth Bass', 'Crappie'], season: 'Spring', tip: 'When Kentucky is blown, Barkley often fishes friendlier.' })
    ]
  }),
  S({
    id: 'champlain', name: 'Lake Champlain', state: 'VT / NY', states: ['VT', 'NY'],
    regionId: 'northeast', region: 'Northeast',
    species: ['Largemouth Bass', 'Smallmouth Bass', 'Northern Pike', 'Landlocked Salmon'],
    why: 'A Great Lake that forgot to join the club — huge, diverse, and still a little wild.',
    records: 'Elite bass tournaments; salmon in the main lake; pike in the north end.',
    best: 'June–October', lat: 44.53, lon: -73.33,
    mix: 'moderate', maxDepth: 400, avgDepth: 64, acres: '~270,000 acres',
    waterType: 'Large glacial lake',
    notes: 'The Inland Sea and Missisquoi are weedy and warm. The main lake is deep and clear.',
    areas: [
      area({ id: 'missisquoi', name: 'Missisquoi Bay', kind: 'Weedy bay', depth: '4–12 ft', depthFt: 7, lat: 45.00, lon: -73.17, structure: 'North-end grass and pike', species: ['Northern Pike', 'Largemouth Bass'], season: 'May–September', tip: 'Frogs and spinnerbaits in the cabbage.' }),
      area({ id: 'inland-sea', name: 'Inland Sea', kind: 'Basin', depth: '10–40 ft', depthFt: 20, lat: 44.78, lon: -73.20, structure: 'Islands, weeds, and smallmouth rock', species: ['Smallmouth Bass', 'Largemouth Bass'], season: 'June–September', tip: 'A lake within the lake. Pick an island group.' }),
      area({ id: 'main-champ', name: 'Main lake / deep', kind: 'Basin', depth: '40–200 ft', depthFt: 80, lat: 44.45, lon: -73.30, structure: 'Thermocline salmon and laker water', species: ['Landlocked Salmon', 'Lake Trout'], season: 'June–September', tip: 'Troll the 50–55°F band.' }),
      area({ id: 'ticon', name: 'South lake / Ticonderoga', kind: 'Narrows', depth: '8–30 ft', depthFt: 16, lat: 43.85, lon: -73.40, structure: 'Narrow, weedy, bassy', species: ['Largemouth Bass', 'Northern Pike'], season: 'May–October', tip: 'Easier water than the big lake on a windy day.' })
    ]
  }),
  S({
    id: 'st-lawrence', name: 'St. Lawrence River', state: 'NY', states: ['NY'],
    regionId: 'northeast', region: 'Northeast',
    species: ['Smallmouth Bass', 'Muskie', 'Northern Pike', 'Walleye'],
    why: 'Clear current, 1,000 Islands rock, and some of the best smallmouth on the continent.',
    records: 'Giant smallmouth; muskie capital talk on both sides of the river.',
    best: 'June–October', lat: 44.33, lon: -75.98,
    mix: 'river', maxDepth: 250, avgDepth: 40, acres: 'Thousand Islands stretch',
    waterType: 'Big clear river',
    notes: 'Current seams and island drops. Water stays cooler than inland lakes.',
    areas: [
      area({ id: '1000i', name: 'Thousand Islands', kind: 'Island rock', depth: '8–35 ft', depthFt: 18, lat: 44.34, lon: -75.98, structure: 'Granite, current, and cribs', species: ['Smallmouth Bass', 'Muskie'], season: 'June–October', tip: 'Smallmouth on the rock; muskies on the weeds and breaks.' }),
      area({ id: 'clayton', name: 'Clayton / Alexandria Bay', kind: 'Town water', depth: '10–40 ft', depthFt: 20, lat: 44.34, lon: -75.92, structure: 'Access, shipping channel edges', species: ['Smallmouth Bass', 'Muskie'], season: 'Summer', tip: 'Watch the freighters. Fish the eddies they leave.' }),
      area({ id: 'ike', name: 'Ike / Goose Bay', kind: 'Bay', depth: '6–18 ft', depthFt: 10, lat: 44.37, lon: -75.85, structure: 'Weedy bays off the main flow', species: ['Northern Pike', 'Muskie', 'Largemouth Bass'], season: 'May–September', tip: 'Warm-water changeup when the main river is ripping.' })
    ]
  }),
  S({
    id: 'sebago', name: 'Sebago Lake', state: 'ME', states: ['ME'],
    regionId: 'northeast', region: 'Northeast',
    species: ['Landlocked Salmon', 'Lake Trout', 'Smallmouth Bass'],
    why: 'Maine’s big salmon lake — deep, clear, and a New England classic.',
    records: 'Historic landlocked salmon water; togue in the depths.',
    best: 'May–June surface; summer troll', lat: 43.85, lon: -70.57,
    mix: 'deep', maxDepth: 316, avgDepth: 101, acres: '~30,000 acres',
    waterType: 'Deep clear lake',
    notes: 'Ice-out salmon are a rite of spring. Then they go deep with the smelt.',
    areas: [
      area({ id: 'sebago-narrows', name: 'The Narrows', kind: 'Narrows', depth: '20–80 ft', depthFt: 40, lat: 43.87, lon: -70.60, structure: 'Neck between basins', species: ['Landlocked Salmon', 'Lake Trout'], season: 'May–September', tip: 'A natural funnel. Troll it early and late.' }),
      area({ id: 'sebago-deep', name: 'Main basin', kind: 'Basin', depth: '60–200 ft', depthFt: 110, lat: 43.85, lon: -70.55, structure: 'Deep, cold, smelt-driven', species: ['Lake Trout', 'Landlocked Salmon'], season: 'July–September', tip: 'Downriggers. Match the smelt depth.' }),
      area({ id: 'sebago-rock', name: 'Shoreline rock', kind: 'Rock', depth: '6–20 ft', depthFt: 12, lat: 43.82, lon: -70.50, structure: 'Smallmouth ledges', species: ['Smallmouth Bass'], season: 'June–August', tip: 'When salmon go deep, the bass bite saves the day.' })
    ]
  }),
  S({
    id: 'winnipesaukee', name: 'Lake Winnipesaukee', state: 'NH', states: ['NH'],
    regionId: 'northeast', region: 'Northeast',
    species: ['Lake Trout', 'Landlocked Salmon', 'Smallmouth Bass'],
    why: 'New Hampshire’s big lake — islands, deep holes, and a summer salmon troll.',
    records: 'Togue and salmon; island smallmouth.',
    best: 'Ice-out and June–Sept', lat: 43.60, lon: -71.32,
    mix: 'deep', maxDepth: 180, avgDepth: 43, acres: '~44,000 acres',
    waterType: 'Large island lake',
    areas: [
      area({ id: 'winn-deep', name: 'Broads / deep holes', kind: 'Basin', depth: '50–180 ft', depthFt: 90, lat: 43.60, lon: -71.32, structure: 'Open deep water', species: ['Lake Trout', 'Landlocked Salmon'], season: 'Summer troll; ice', tip: 'Find the smelt cloud, then the predators under it.' }),
      area({ id: 'winn-islands', name: 'Island rock', kind: 'Island', depth: '8–30 ft', depthFt: 16, lat: 43.62, lon: -71.38, structure: 'Granite island perimeters', species: ['Smallmouth Bass'], season: 'June–September', tip: 'Wind on rock. Tubes and topwater.' })
    ]
  }),
  S({
    id: 'cape-cod-canal', name: 'Cape Cod Canal', state: 'MA', states: ['MA'],
    regionId: 'northeast', region: 'Northeast',
    species: ['Striped Bass', 'Bluefish', 'Bonito'],
    why: 'A man-made rip that concentrates bait and stripers — one of the best shore fisheries in the East.',
    records: 'Cow bass from the banks on the right tide.',
    best: 'May–June and Sept–Oct', lat: 41.77, lon: -70.57,
    mix: 'coastal', maxDepth: 40, avgDepth: 22, acres: 'Canal / tidal',
    waterType: 'Tidal canal',
    notes: 'Tide is the whole game. Slack is often dead; moving water is when it happens.',
    tempStations: ['44013'],
    areas: [
      area({ id: 'ccc-east', name: 'East End / Sandwich', kind: 'Inlet', depth: '10–32 ft', depthFt: 20, lat: 41.77, lon: -70.50, structure: 'Canal mouth and rips', species: ['Striped Bass', 'Bluefish'], season: 'May–October', tip: 'Fish the moving tide. Heavy gear in the current.' }),
      area({ id: 'ccc-mid', name: 'Railroad bridge stretch', kind: 'Canal wall', depth: '15–35 ft', depthFt: 24, lat: 41.74, lon: -70.58, structure: 'Deep canal, riprap banks', species: ['Striped Bass'], season: 'June–October', tip: 'Cast up-current and swing. Watch your footing.' }),
      area({ id: 'ccc-west', name: 'West End / Buzzards Bay', kind: 'Mouth', depth: '12–30 ft', depthFt: 18, lat: 41.74, lon: -70.62, structure: 'Bay-side mouth', species: ['Striped Bass', 'Bluefish'], season: 'Summer–fall', tip: 'A second option when the east end is a zoo.' })
    ]
  }),
  S({
    id: 'narragansett', name: 'Narragansett Bay', state: 'RI', states: ['RI'],
    regionId: 'northeast', region: 'Northeast',
    species: ['Striped Bass', 'Bluefish', 'Tautog', 'Fluke'],
    why: 'A fertile Northeast estuary — stripers in the rivers, tautog on the rock, fluke on the sand.',
    records: 'Spring schoolie blitzes; fall cows on bait.',
    best: 'May–June and Sept–Nov', lat: 41.60, lon: -71.35,
    mix: 'coastal', maxDepth: 60, avgDepth: 18, acres: 'Estuary',
    waterType: 'Tidal bay',
    tempStations: ['44013'],
    areas: [
      area({ id: 'prov-river', name: 'Providence River', kind: 'River', depth: '8–25 ft', depthFt: 14, lat: 41.78, lon: -71.38, structure: 'Upper bay / urban river', species: ['Striped Bass'], season: 'April–June', tip: 'The first warming water. Schoolies and holdovers.' }),
      area({ id: 'newport-neck', name: 'Newport / Beavertail', kind: 'Rock / breachway', depth: '10–40 ft', depthFt: 20, lat: 41.45, lon: -71.40, structure: 'Ocean rock and rips', species: ['Striped Bass', 'Tautog'], season: 'June–October', tip: 'Surf and boat. Respect the swell.' }),
      area({ id: 'jamestown', name: 'Jamestown Bridge / west passage', kind: 'Channel', depth: '20–50 ft', depthFt: 30, lat: 41.53, lon: -71.40, structure: 'Deep passage', species: ['Striped Bass', 'Fluke'], season: 'Summer', tip: 'Current seams under the bridge.' })
    ]
  }),
  S({
    id: 'chesapeake', name: 'Chesapeake Bay', state: 'MD / VA', states: ['MD', 'VA'],
    regionId: 'mid-atlantic', region: 'Mid-Atlantic',
    species: ['Striped Bass', 'Redfish', 'Speckled Trout', 'Croaker'],
    why: 'The East’s great estuary. Rockfish are the headline; the lower bay fishes like the Gulf in summer.',
    records: 'Trophy stripers on the spring spawn and fall blitz; reds expanding north.',
    best: 'April–May spawn; Oct–Dec blitz', lat: 38.50, lon: -76.40,
    mix: 'coastal', maxDepth: 174, avgDepth: 21, acres: '~4,480 sq mi',
    waterType: 'Large tidal estuary',
    notes: 'Shallow and mixed except in the deep shipping channels. Severn, Choptank, and the Bay Bridge are named starting points.',
    tempStations: ['01646500'],
    areas: [
      area({ id: 'bay-bridge', name: 'Bay Bridge / Sandy Point', kind: 'Bridge / rock', depth: '10–50 ft', depthFt: 22, lat: 39.01, lon: -76.38, structure: 'Piers, rock, and the channel', species: ['Striped Bass'], season: 'Spring and fall', tip: 'Troll or jig the bridge. Night lights in summer.' }),
      area({ id: 'choptank', name: 'Choptank River', kind: 'River', depth: '6–25 ft', depthFt: 12, lat: 38.58, lon: -76.07, structure: 'Eastern Shore river', species: ['Striped Bass', 'White Perch'], season: 'April–June', tip: 'A spring highway. Then fish the mouth in fall.' }),
      area({ id: 'severn', name: 'Severn / Magothy', kind: 'River mouth', depth: '8–30 ft', depthFt: 14, lat: 39.00, lon: -76.47, structure: 'Western Shore rivers', species: ['Striped Bass'], season: 'Fall blitz', tip: 'Bait pinned in the mouths. Birds tell the truth.' }),
      area({ id: 'lower-bay', name: 'Lower bay / Eastern Shore VA', kind: 'Flats / channel', depth: '4–20 ft', depthFt: 10, lat: 37.55, lon: -75.95, structure: 'Grass, guts, and reds', species: ['Redfish', 'Speckled Trout', 'Striped Bass'], season: 'May–November', tip: 'Fishes more like the Carolinas than Baltimore.' })
    ]
  }),
  S({
    id: 'susquehanna-flats', name: 'Susquehanna Flats', state: 'MD', states: ['MD'],
    regionId: 'mid-atlantic', region: 'Mid-Atlantic',
    species: ['Striped Bass', 'Largemouth Bass'],
    why: 'The head of the Bay — grass flats and the spring rockfish spawn staging area.',
    records: 'Historic striper water; a grass-flat bass fishery in summer.',
    best: 'April–May stripers; summer bass', lat: 39.54, lon: -76.08,
    mix: 'shallow', maxDepth: 18, avgDepth: 6, acres: 'Upper Bay flats',
    waterType: 'Tidal grass flats',
    tempStations: ['01646500'],
    areas: [
      area({ id: 'flats-grass', name: 'Main flats grass', kind: 'Grass flat', depth: '2–8 ft', depthFt: 4, lat: 39.54, lon: -76.08, structure: 'Milfoil and hydrilla mats', species: ['Largemouth Bass', 'Striped Bass'], season: 'May–September', tip: 'Frogs and swim jigs. Watch the prop.' }),
      area({ id: 'flats-channel', name: 'Shipping / river channel', kind: 'Channel', depth: '10–18 ft', depthFt: 14, lat: 39.55, lon: -76.07, structure: 'Deeper cuts through the flats', species: ['Striped Bass'], season: 'April spawn', tip: 'Troll or drift the channel edges when the fish are staging.' })
    ]
  }),
  S({
    id: 'smith-mountain', name: 'Smith Mountain Lake', state: 'VA', states: ['VA'],
    regionId: 'mid-atlantic', region: 'Mid-Atlantic',
    species: ['Striped Bass', 'Largemouth Bass', 'Smallmouth Bass'],
    why: 'A clear Virginia highland reservoir famous for open-water stripers.',
    records: 'Stripers in the teens; quality spotted and largemouth bass.',
    best: 'April–June and fall', lat: 37.08, lon: -79.60,
    mix: 'moderate', maxDepth: 220, avgDepth: 55, acres: '~20,600 acres',
    waterType: 'Highland reservoir',
    areas: [
      area({ id: 'sml-dam', name: 'Dam / main basin', kind: 'Basin', depth: '40–120 ft', depthFt: 70, lat: 37.05, lon: -79.54, structure: 'Deep, clear striper water', species: ['Striped Bass'], season: 'Summer', tip: 'Live shad on downlines over bait clouds.' }),
      area({ id: 'sml-roanoke', name: 'Roanoke River arm', kind: 'River arm', depth: '10–40 ft', depthFt: 20, lat: 37.12, lon: -79.72, structure: 'Riverine, bass and spring stripers', species: ['Largemouth Bass', 'Striped Bass'], season: 'March–June', tip: 'Follow bait up the arm in spring.' }),
      area({ id: 'sml-points', name: 'Main-lake points', kind: 'Point', depth: '12–35 ft', depthFt: 20, lat: 37.08, lon: -79.62, structure: 'Long tapering points', species: ['Smallmouth Bass', 'Largemouth Bass'], season: 'May–October', tip: 'Drop-shot and shaky head in the clear water.' })
    ]
  }),
  S({
    id: 'delaware-bay', name: 'Delaware Bay', state: 'DE / NJ', states: ['DE', 'NJ'],
    regionId: 'mid-atlantic', region: 'Mid-Atlantic',
    species: ['Striped Bass', 'Weakfish', 'Flounder', 'Drum'],
    why: 'A wide, fertile bay — spring stripers, summer flounder, and a drum run.',
    records: 'Black drum in the spring; stripers on the rips.',
    best: 'May–June and Sept–Nov', lat: 39.12, lon: -75.20,
    mix: 'coastal', maxDepth: 140, avgDepth: 30, acres: 'Large tidal bay',
    waterType: 'Tidal bay',
    tempStations: ['01463500', '44065'],
    areas: [
      area({ id: 'cape-may-rip', name: 'Cape May rips', kind: 'Rip / inlet', depth: '15–40 ft', depthFt: 25, lat: 38.94, lon: -74.96, structure: 'Inlet current and shoals', species: ['Striped Bass', 'Flounder'], season: 'May–November', tip: 'Tide changes light it up.' }),
      area({ id: 'lewes', name: 'Lewes / Harbor of Refuge', kind: 'Harbor / rock', depth: '10–30 ft', depthFt: 16, lat: 38.79, lon: -75.11, structure: 'Breakwaters and rock', species: ['Striped Bass', 'Tautog'], season: 'Spring and fall', tip: 'Cast the rocks; troll the rips outside.' })
    ]
  }),
  S({
    id: 'okeechobee', name: 'Lake Okeechobee', state: 'FL', states: ['FL'],
    regionId: 'southeast', region: 'Southeast',
    species: ['Largemouth Bass', 'Crappie', 'Bluegill'],
    why: 'The Big O — miles of grass, reeds, and legendary Florida bass.',
    records: '10-lb class bass still happen; crappie in winter.',
    best: 'Dec–March peak; year-round', lat: 26.93, lon: -80.80,
    mix: 'shallow', maxDepth: 20, avgDepth: 9, acres: '~430,000 acres',
    waterType: 'Huge shallow lake',
    notes: 'No thermocline. Water level and grass condition matter more than depth.',
    tempStations: ['41009'],
    areas: [
      area({ id: 'moonshine', name: 'Moonshine Bay / Observation Shoal', kind: 'Grass / shoal', depth: '3–8 ft', depthFt: 5, lat: 26.90, lon: -80.95, structure: 'Peppergrass and reed edges', species: ['Largemouth Bass'], season: 'December–April', tip: 'Punch mats or burn a swim jig along the edge.' }),
      area({ id: 'clewiston', name: 'Clewiston rim canal', kind: 'Canal / wall', depth: '6–12 ft', depthFt: 8, lat: 26.75, lon: -80.93, structure: 'Rim canal and first marsh', species: ['Largemouth Bass', 'Crappie'], season: 'Year-round', tip: 'A windy-day home. Flip the wall and the first cut.' }),
      area({ id: 'indian-prairie', name: 'Indian Prairie / Harney Pond', kind: 'Marsh', depth: '2–7 ft', depthFt: 4, lat: 27.05, lon: -81.00, structure: 'West-side marsh and canals', species: ['Largemouth Bass'], season: 'Winter–spring', tip: 'When the lake is up, the marsh is magic.' }),
      area({ id: 'okin-crappie', name: 'Open-lake crappie', kind: 'Open lake', depth: '8–14 ft', depthFt: 11, lat: 26.95, lon: -80.80, structure: 'Outside grass line', species: ['Crappie'], season: 'December–March', tip: 'Troll or spider-rig the first deep edge.' })
    ]
  }),
  S({
    id: 'guntersville', name: 'Lake Guntersville', state: 'AL', states: ['AL'],
    regionId: 'southeast', region: 'Southeast',
    species: ['Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'Tennessee River grass lake — maybe the best big-bass reservoir in the country.',
    records: 'Tournament bags that look fake; 8–10 lb fish in the grass.',
    best: 'Feb–April and fall', lat: 34.48, lon: -86.20,
    mix: 'moderate', maxDepth: 60, avgDepth: 15, acres: '~69,000 acres',
    waterType: 'Grassy highland reservoir',
    areas: [
      area({ id: 'gunt-grass', name: 'Main-lake grass', kind: 'Grass', depth: '4–12 ft', depthFt: 7, lat: 34.50, lon: -86.20, structure: 'Milfoil and hydrilla mats', species: ['Largemouth Bass'], season: 'March–June', tip: 'Punch, frog, or swim a jig. The edge is the highway.' }),
      area({ id: 'gunt-ledges', name: 'River-channel ledges', kind: 'Ledge', depth: '12–25 ft', depthFt: 18, lat: 34.45, lon: -86.15, structure: 'Old Tennessee River swings', species: ['Largemouth Bass'], season: 'June–September', tip: 'When the grass gets too thick or too hot, the ledge bite starts.' }),
      area({ id: 'gunt-creeks', name: 'Creek arms', kind: 'Creek', depth: '5–15 ft', depthFt: 9, lat: 34.55, lon: -86.10, structure: 'Secondary points and docks', species: ['Largemouth Bass', 'Crappie'], season: 'February–April', tip: 'Pre-spawn staging. A jerkbait lake in the cold.' })
    ]
  }),
  S({
    id: 'santee-cooper', name: 'Santee Cooper (Marion / Moultrie)', state: 'SC', states: ['SC'],
    regionId: 'southeast', region: 'Southeast',
    species: ['Catfish', 'Striped Bass', 'Largemouth Bass', 'Crappie'],
    why: 'Two connected lakes — world-famous for giant blue cats and a historic striper fishery.',
    records: '100-lb class blues; spring crappie and bass in the cypress.',
    best: 'Year-round cats; spring bass/crappie', lat: 33.48, lon: -80.15,
    mix: 'moderate', maxDepth: 75, avgDepth: 16, acres: '~160,000 acres (pair)',
    waterType: 'Cypress / reservoir system',
    tempStations: ['02169500'],
    areas: [
      area({ id: 'marion-cypress', name: 'Lake Marion cypress', kind: 'Timber', depth: '4–14 ft', depthFt: 8, lat: 33.50, lon: -80.30, structure: 'Flooded cypress and stumps', species: ['Largemouth Bass', 'Crappie'], season: 'February–May', tip: 'Flip wood. Crappie suspend in the same trees.' }),
      area({ id: 'diversion', name: 'Diversion Canal', kind: 'Canal', depth: '10–30 ft', depthFt: 18, lat: 33.45, lon: -80.15, structure: 'The cut between Marion and Moultrie', species: ['Striped Bass', 'Catfish'], season: 'Year-round', tip: 'Current and bait. A natural funnel.' }),
      area({ id: 'moultrie-open', name: 'Lake Moultrie open', kind: 'Basin', depth: '15–60 ft', depthFt: 30, lat: 33.32, lon: -80.05, structure: 'Deeper, more open catfish/striper water', species: ['Catfish', 'Striped Bass'], season: 'Summer nights', tip: 'Drift cut bait for blues. Graph the humps.' })
    ]
  }),
  S({
    id: 'lanier', name: 'Lake Lanier', state: 'GA', states: ['GA'],
    regionId: 'southeast', region: 'Southeast',
    species: ['Spotted Bass', 'Striped Bass', 'Largemouth Bass'],
    why: 'Clear Atlanta highland lake — spots on the rocks, stripers chasing herring.',
    records: 'Giant spotted bass; a serious striper troll.',
    best: 'March–June and fall', lat: 34.20, lon: -83.98,
    mix: 'moderate', maxDepth: 160, avgDepth: 60, acres: '~38,000 acres',
    waterType: 'Clear highland reservoir',
    areas: [
      area({ id: 'lanier-main', name: 'Main-lake humps', kind: 'Hump', depth: '20–50 ft', depthFt: 30, lat: 34.20, lon: -83.98, structure: 'Herring-related striper/spot water', species: ['Striped Bass', 'Spotted Bass'], season: 'Summer', tip: 'Live herring. Watch the graph more than the bank.' }),
      area({ id: 'lanier-pockets', name: 'Pockets / docks', kind: 'Pocket', depth: '8–20 ft', depthFt: 12, lat: 34.25, lon: -84.05, structure: 'Docks and rocky pockets', species: ['Spotted Bass', 'Largemouth Bass'], season: 'Spring', tip: 'Shaky head and a wacky senko. Clear-water manners.' })
    ]
  }),
  S({
    id: 'chickamauga', name: 'Lake Chickamauga', state: 'TN', states: ['TN'],
    regionId: 'southeast', region: 'Southeast',
    species: ['Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'The Tennessee giant factory — grass, current, and 10-lb bass stories that keep coming true.',
    records: 'Regular double-digit largemouth; a Bassmaster favorite.',
    best: 'March–May', lat: 35.38, lon: -85.05,
    mix: 'moderate', maxDepth: 60, avgDepth: 17, acres: '~36,000 acres',
    waterType: 'Tennessee River reservoir',
    areas: [
      area({ id: 'chick-grass', name: 'Grass flats', kind: 'Grass', depth: '4–10 ft', depthFt: 6, lat: 35.38, lon: -85.05, structure: 'Milfoil and hydrilla', species: ['Largemouth Bass'], season: 'April–June', tip: 'A punching lake when the mats are right.' }),
      area({ id: 'chick-channel', name: 'River channel', kind: 'Channel', depth: '15–35 ft', depthFt: 22, lat: 35.35, lon: -85.02, structure: 'Current and ledges', species: ['Largemouth Bass', 'Catfish'], season: 'June–September', tip: 'Current on a ledge in summer.' })
    ]
  }),
  S({
    id: 'kerr', name: 'Kerr Lake (Buggs Island)', state: 'VA / NC', states: ['VA', 'NC'],
    regionId: 'southeast', region: 'Southeast',
    species: ['Largemouth Bass', 'Crappie', 'Striped Bass', 'Catfish'],
    why: 'A big Roanoke River reservoir that does a bit of everything well.',
    records: 'Strong crappie and a respectable striper run.',
    best: 'March–May', lat: 36.58, lon: -78.53,
    mix: 'moderate', maxDepth: 100, avgDepth: 30, acres: '~50,000 acres',
    waterType: 'Highland reservoir',
    areas: [
      area({ id: 'kerr-creeks', name: 'Creek arms', kind: 'Creek', depth: '8–20 ft', depthFt: 12, lat: 36.55, lon: -78.60, structure: 'Timber and secondary points', species: ['Crappie', 'Largemouth Bass'], season: 'March–May', tip: 'Spring crappie first, then bass on the same wood.' }),
      area({ id: 'kerr-main', name: 'Main lake / dam', kind: 'Basin', depth: '25–80 ft', depthFt: 40, lat: 36.60, lon: -78.45, structure: 'Open water stripers', species: ['Striped Bass'], season: 'Summer', tip: 'Live bait over bait balls.' })
    ]
  }),
  S({
    id: 'tampa-bay', name: 'Tampa Bay', state: 'FL', states: ['FL'],
    regionId: 'gulf', region: 'Gulf Coast',
    species: ['Snook', 'Redfish', 'Speckled Trout', 'Tarpon'],
    why: 'A big, fishy Gulf estuary inside a city — mangroves, bridges, and passes.',
    records: 'Snook and reds year-round; tarpon in the passes late spring.',
    best: 'April–June tarpon; year-round inshore', lat: 27.75, lon: -82.55,
    mix: 'coastal', maxDepth: 90, avgDepth: 11, acres: 'Large estuary',
    waterType: 'Gulf estuary',
    notes: 'Tide and wind more than a thermocline. Winter fish slide to deeper holes and power-plant water.',
    tempStations: ['41009'],
    areas: [
      area({ id: 'skyway', name: 'Sunshine Skyway / passes', kind: 'Pass / bridge', depth: '10–40 ft', depthFt: 22, lat: 27.62, lon: -82.65, structure: 'Bridge shadow and pass current', species: ['Snook', 'Tarpon', 'Redfish'], season: 'April–July tarpon', tip: 'Live bait in the pass. Night snook under the lights.' }),
      area({ id: 'weedon', name: 'Weedon Island / flats', kind: 'Flats', depth: '1–5 ft', depthFt: 2, lat: 27.85, lon: -82.60, structure: 'Grass flats and mangroves', species: ['Redfish', 'Speckled Trout', 'Snook'], season: 'Year-round', tip: 'Pole or troll-motor. Sight-fish on a sunny incoming.' }),
      area({ id: 'manatee', name: 'Manatee River / south bay', kind: 'River mouth', depth: '4–15 ft', depthFt: 8, lat: 27.52, lon: -82.57, structure: 'River and spoil islands', species: ['Snook', 'Redfish'], season: 'Fall–spring', tip: 'A winter hide when the flats get too cold.' })
    ]
  }),
  S({
    id: 'venice-la', name: 'Venice / Mississippi Delta', state: 'LA', states: ['LA'],
    regionId: 'gulf', region: 'Gulf Coast',
    species: ['Redfish', 'Speckled Trout', 'Flounder'],
    why: 'The end of the Mississippi — marsh, passes, and ridiculous inshore numbers.',
    records: 'Bull reds in the passes; limits of trout when the shrimp are in.',
    best: 'March–November', lat: 29.28, lon: -89.35,
    mix: 'coastal', maxDepth: 50, avgDepth: 8, acres: 'Delta marsh',
    waterType: 'River delta / marsh',
    tempStations: ['07374000', '42040'],
    areas: [
      area({ id: 'south-pass', name: 'South / Southwest Pass', kind: 'Pass', depth: '10–40 ft', depthFt: 20, lat: 28.99, lon: -89.14, structure: 'River mouths into the Gulf', species: ['Redfish', 'Speckled Trout'], season: 'April–October', tip: 'Tide ripping through a pass is the whole program.' }),
      area({ id: 'venice-marsh', name: 'Interior marsh', kind: 'Marsh', depth: '2–8 ft', depthFt: 4, lat: 29.28, lon: -89.38, structure: 'Ponds, cuts, and points', species: ['Redfish', 'Speckled Trout'], season: 'Year-round', tip: 'Cork-and-shrimp. Fish the drains on a falling tide.' }),
      area({ id: 'baptiste', name: 'Baptiste Collette / jumpoffs', kind: 'Jump-off', depth: '6–20 ft', depthFt: 12, lat: 29.35, lon: -89.20, structure: 'Deep holes next to skinny marsh', species: ['Speckled Trout', 'Redfish'], season: 'Winter–spring', tip: 'When it gets cold, trout stack in the first deep water.' })
    ]
  }),
  S({
    id: 'calcasieu', name: 'Calcasieu Lake (“Big Lake”)', state: 'LA', states: ['LA'],
    regionId: 'gulf', region: 'Gulf Coast',
    species: ['Redfish', 'Speckled Trout'],
    why: 'Southwest Louisiana’s big brackish lake — a trout factory with bull reds in the ship channel.',
    records: 'Heavy trout; 40-inch reds in the channel.',
    best: 'March–June and fall', lat: 29.90, lon: -93.28,
    mix: 'coastal', maxDepth: 40, avgDepth: 6, acres: '~50,000 acres + channel',
    waterType: 'Brackish lake / ship channel',
    tempStations: ['42019'],
    areas: [
      area({ id: 'calc-reefs', name: 'Lake reefs / oyster', kind: 'Reef', depth: '3–8 ft', depthFt: 5, lat: 29.90, lon: -93.28, structure: 'Oyster and shell', species: ['Speckled Trout', 'Redfish'], season: 'March–October', tip: 'Drift plastics over shell. Birds and slicks help.' }),
      area({ id: 'calc-channel', name: 'Ship channel', kind: 'Channel', depth: '20–40 ft', depthFt: 28, lat: 29.85, lon: -93.34, structure: 'Deep ship channel', species: ['Redfish', 'Speckled Trout'], season: 'Winter', tip: 'Bull reds live here when the lake is too cold or too fresh.' })
    ]
  }),
  S({
    id: 'galveston', name: 'Galveston Bay', state: 'TX', states: ['TX'],
    regionId: 'gulf', region: 'Gulf Coast',
    species: ['Speckled Trout', 'Redfish', 'Flounder'],
    why: 'Texas’s most-fished bay system — reefs, shorelines, and the Houston Ship Channel.',
    records: 'Solid trout and reds; fall flounder run through the passes.',
    best: 'April–June and Oct–Nov', lat: 29.50, lon: -94.80,
    mix: 'coastal', maxDepth: 50, avgDepth: 7, acres: 'Upper + lower bay',
    waterType: 'Gulf bay',
    tempStations: ['42019'],
    areas: [
      area({ id: 'east-bay', name: 'East Bay reefs', kind: 'Reef', depth: '3–8 ft', depthFt: 5, lat: 29.50, lon: -94.70, structure: 'Shell reefs', species: ['Speckled Trout', 'Redfish'], season: 'Spring–fall', tip: 'A cork over shell is never wrong.' }),
      area({ id: 'west-bay', name: 'West Bay / San Luis', kind: 'Bay / pass', depth: '3–12 ft', depthFt: 6, lat: 29.25, lon: -94.95, structure: 'Clearer west-side water', species: ['Speckled Trout', 'Redfish'], season: 'Year-round', tip: 'Wades well. Sight-fish on calm days.' }),
      area({ id: 'ship-ch', name: 'Houston Ship Channel', kind: 'Channel', depth: '20–45 ft', depthFt: 30, lat: 29.55, lon: -94.95, structure: 'Deep industrial channel', species: ['Speckled Trout', 'Redfish'], season: 'Winter', tip: 'Deep trout in the cold. Watch the ship traffic.' })
    ]
  }),
  S({
    id: 'mobile-bay', name: 'Mobile Bay', state: 'AL', states: ['AL'],
    regionId: 'gulf', region: 'Gulf Coast',
    species: ['Redfish', 'Speckled Trout', 'Flounder'],
    why: 'A big, muddy, fertile bay — jubilees, river mouths, and the ship channel.',
    records: 'Bull reds; trout on the reefs when the salt is in.',
    best: 'April–November', lat: 30.45, lon: -88.00,
    mix: 'coastal', maxDepth: 75, avgDepth: 10, acres: 'Large estuary',
    waterType: 'Gulf bay',
    tempStations: ['42040'],
    areas: [
      area({ id: 'mobile-channel', name: 'Ship channel / Mid-bay', kind: 'Channel', depth: '20–50 ft', depthFt: 30, lat: 30.45, lon: -88.01, structure: 'Dredged channel', species: ['Redfish', 'Speckled Trout'], season: 'Year-round', tip: 'When the bay is fresh after rain, the salt lives in the channel.' }),
      area({ id: 'fortuna', name: 'Fortuna / east reefs', kind: 'Reef', depth: '6–14 ft', depthFt: 9, lat: 30.40, lon: -87.90, structure: 'Public reefs and hard bottom', species: ['Speckled Trout'], season: 'Spring–fall', tip: 'Live shrimp. Move until you hit them.' })
    ]
  }),
  S({
    id: 'lake-fork', name: 'Lake Fork', state: 'TX', states: ['TX'],
    regionId: 'south', region: 'South & Ozarks',
    species: ['Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'Texas’s trophy bass lake — timber, hydrilla, and a still-serious chance at a giant.',
    records: 'Multiple state-record class fish; 13-lb dreams are why people drive here.',
    best: 'Feb–April', lat: 32.80, lon: -95.55,
    mix: 'moderate', maxDepth: 70, avgDepth: 18, acres: '~27,000 acres',
    waterType: 'Timbered reservoir',
    tempStations: ['08057000'],
    areas: [
      area({ id: 'fork-dam', name: 'Dam / main lake timber', kind: 'Timber', depth: '15–35 ft', depthFt: 22, lat: 32.80, lon: -95.52, structure: 'Standing timber and channel', species: ['Largemouth Bass'], season: 'February–April', tip: 'A big swimbait or a Carolina rig in the trees. Idle carefully.' }),
      area({ id: 'fork-creeks', name: 'Little Caney / creek arms', kind: 'Creek', depth: '6–18 ft', depthFt: 10, lat: 32.85, lon: -95.60, structure: 'Hydrilla and wood', species: ['Largemouth Bass', 'Crappie'], season: 'March–May', tip: 'Spawn creeks. Flip grass and wood.' })
    ]
  }),
  S({
    id: 'toledo-bend', name: 'Toledo Bend', state: 'TX / LA', states: ['TX', 'LA'],
    regionId: 'south', region: 'South & Ozarks',
    species: ['Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'The huge Sabine River reservoir — grass, timber, and room to get away from the crowd.',
    records: 'Giant lake, giant bags when the grass is right.',
    best: 'Feb–May', lat: 31.50, lon: -93.70,
    mix: 'moderate', maxDepth: 110, avgDepth: 24, acres: '~185,000 acres',
    waterType: 'Large timbered reservoir',
    areas: [
      area({ id: 'tb-south', name: 'South-end grass', kind: 'Grass', depth: '4–14 ft', depthFt: 8, lat: 31.25, lon: -93.65, structure: 'Hydrilla and milfoil', species: ['Largemouth Bass'], season: 'March–June', tip: 'Frog the mats; punch the thick stuff.' }),
      area({ id: 'tb-river', name: 'Old river channel', kind: 'Channel', depth: '20–50 ft', depthFt: 30, lat: 31.55, lon: -93.72, structure: 'Sabine channel swings', species: ['Largemouth Bass', 'Crappie'], season: 'Summer', tip: 'Summer home. Brush on the breaks.' })
    ]
  }),
  S({
    id: 'table-rock', name: 'Table Rock Lake', state: 'MO', states: ['MO'],
    regionId: 'south', region: 'South & Ozarks',
    species: ['Largemouth Bass', 'Smallmouth Bass', 'Spotted Bass', 'Crappie'],
    why: 'Clear Ozark highland lake — docks, bluffs, and a national bass reputation.',
    records: 'Smallmouth in the clear water; largemouth in the creeks.',
    best: 'April–June and fall', lat: 36.60, lon: -93.30,
    mix: 'moderate', maxDepth: 220, avgDepth: 70, acres: '~43,000 acres',
    waterType: 'Highland reservoir',
    areas: [
      area({ id: 'tr-james', name: 'James River arm', kind: 'River arm', depth: '10–35 ft', depthFt: 18, lat: 36.65, lon: -93.45, structure: 'Dirtier, bassier arm', species: ['Largemouth Bass'], season: 'March–May', tip: 'Spring staging. Docks and secondary points.' }),
      area({ id: 'tr-main', name: 'Main lake bluffs', kind: 'Bluff', depth: '15–50 ft', depthFt: 28, lat: 36.58, lon: -93.30, structure: 'Clear, steep, smallmouth', species: ['Smallmouth Bass', 'Spotted Bass'], season: 'May–October', tip: 'Drop-shot and a jerkbait. Clear-water stealth.' })
    ]
  }),
  S({
    id: 'bull-shoals', name: 'Bull Shoals Lake', state: 'AR / MO', states: ['AR', 'MO'],
    regionId: 'south', region: 'South & Ozarks',
    species: ['Largemouth Bass', 'Smallmouth Bass', 'Walleye', 'Trout'],
    why: 'Deep, clear White River reservoir — bass up top, trout in the tailwater below the dam.',
    records: 'Quality smallmouth; a famous trout tailwater at Cotter.',
    best: 'April–June; trout year-round below', lat: 36.37, lon: -92.70,
    mix: 'deep', maxDepth: 210, avgDepth: 75, acres: '~45,000 acres',
    waterType: 'Highland reservoir + tailwater',
    areas: [
      area({ id: 'bs-lake', name: 'Main-lake points', kind: 'Point', depth: '15–40 ft', depthFt: 25, lat: 36.37, lon: -92.70, structure: 'Long gravel points', species: ['Largemouth Bass', 'Walleye'], season: 'April–October', tip: 'Night walleye in summer. Bass on the windward points.' }),
      area({ id: 'bs-tail', name: 'White River tailwater', kind: 'Tailwater', depth: '3–12 ft', depthFt: 6, lat: 36.37, lon: -92.58, structure: 'Cold generation water', species: ['Rainbow Trout', 'Brown Trout'], season: 'Year-round', tip: 'Generation schedule is the bite clock. Sowbugs and worms.' })
    ]
  }),
  S({
    id: 'sam-rayburn', name: 'Sam Rayburn Reservoir', state: 'TX', states: ['TX'],
    regionId: 'south', region: 'South & Ozarks',
    species: ['Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'East Texas grass and timber — a Bassmaster classic that still produces giants.',
    records: 'Heavyweight largemouth; spring crappie.',
    best: 'Feb–May', lat: 31.10, lon: -94.30,
    mix: 'moderate', maxDepth: 80, avgDepth: 20, acres: '~114,000 acres',
    waterType: 'Grass / timber reservoir',
    areas: [
      area({ id: 'ray-grass', name: 'Caney / grass flats', kind: 'Grass', depth: '5–14 ft', depthFt: 8, lat: 31.10, lon: -94.30, structure: 'Hydrilla', species: ['Largemouth Bass'], season: 'March–June', tip: 'The grass line is the highway. A chatterbait lake.' }),
      area({ id: 'ray-river', name: 'Angelina river channel', kind: 'Channel', depth: '18–40 ft', depthFt: 26, lat: 31.15, lon: -94.35, structure: 'Old river and timber', species: ['Largemouth Bass', 'Crappie'], season: 'Summer', tip: 'Brush on the channel swing.' })
    ]
  }),
  S({
    id: 'sakakawea', name: 'Lake Sakakawea', state: 'ND', states: ['ND'],
    regionId: 'plains', region: 'Great Plains',
    species: ['Walleye', 'Northern Pike', 'Smallmouth Bass', 'Salmon'],
    why: 'A Missouri River giant — walleye water measured in miles, plus a quirky salmon program.',
    records: 'Consistent walleye; pike in the bays; chinook in the depths.',
    best: 'May–October; ice', lat: 47.60, lon: -102.20,
    mix: 'moderate', maxDepth: 180, avgDepth: 55, acres: '~368,000 acres',
    waterType: 'Mainstem Missouri reservoir',
    areas: [
      area({ id: 'sak-east', name: 'East end / Garrison', kind: 'Dam / basin', depth: '20–80 ft', depthFt: 40, lat: 47.50, lon: -101.42, structure: 'Deeper, clearer east end', species: ['Walleye', 'Salmon'], season: 'June–September', tip: 'Troll for salmon; jig or troll for eyes on the breaks.' }),
      area({ id: 'sak-bays', name: 'Creek bays', kind: 'Bay', depth: '8–25 ft', depthFt: 14, lat: 47.65, lon: -102.40, structure: 'Warming bays and points', species: ['Walleye', 'Northern Pike'], season: 'May–June', tip: 'Spring eyes in the bays, then they slide to the main lake.' })
    ]
  }),
  S({
    id: 'texoma', name: 'Lake Texoma', state: 'TX / OK', states: ['TX', 'OK'],
    regionId: 'plains', region: 'Great Plains',
    species: ['Striped Bass', 'Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'The inland striper capital — open water, river arms, and a guide industry built on it.',
    records: 'Stripers measured in pounds and in numbers. A bucket-list inland saltwater bite.',
    best: 'April–June and fall', lat: 33.85, lon: -96.70,
    mix: 'moderate', maxDepth: 100, avgDepth: 30, acres: '~89,000 acres',
    waterType: 'Prairie reservoir',
    tempStations: ['08057000'],
    areas: [
      area({ id: 'tex-main', name: 'Main lake / Washita arm', kind: 'Basin', depth: '20–60 ft', depthFt: 35, lat: 33.88, lon: -96.65, structure: 'Open-water stripers on shad', species: ['Striped Bass'], season: 'April–October', tip: 'Birds, boils, and planer boards. Stay on the school.' }),
      area({ id: 'tex-red', name: 'Red River arm', kind: 'River arm', depth: '10–30 ft', depthFt: 16, lat: 33.80, lon: -96.85, structure: 'Dirtier riverine water', species: ['Striped Bass', 'Largemouth Bass'], season: 'Spring', tip: 'Stripers push up the arm following shad.' })
    ]
  }),
  S({
    id: 'mcconaughy', name: 'Lake McConaughy', state: 'NE', states: ['NE'],
    regionId: 'plains', region: 'Great Plains',
    species: ['Walleye', 'Smallmouth Bass', 'White Bass', 'Catfish'],
    why: 'Nebraska’s big sandhill reservoir — clear, windswept, and a serious walleye lake.',
    records: 'Quality walleye and smallmouth; white bass boils in summer.',
    best: 'May–October', lat: 41.25, lon: -101.70,
    mix: 'moderate', maxDepth: 142, avgDepth: 45, acres: '~30,000 acres (varies)',
    waterType: 'Irrigation reservoir',
    notes: 'Water level swings hard with irrigation. Fish the current contour, not last year’s map.',
    areas: [
      area({ id: 'mac-dam', name: 'Kingsley Dam', kind: 'Dam', depth: '20–80 ft', depthFt: 40, lat: 41.22, lon: -101.67, structure: 'Deep, clear east end', species: ['Walleye', 'Smallmouth Bass'], season: 'June–September', tip: 'Smallmouth on the rocks; eyes on the first break.' }),
      area({ id: 'mac-west', name: 'West end / inlets', kind: 'Inlet', depth: '8–25 ft', depthFt: 14, lat: 41.27, lon: -101.90, structure: 'Shallower, incoming water', species: ['Walleye', 'White Bass'], season: 'Spring and fall', tip: 'White bass and eyes stack on incoming flow.' })
    ]
  }),
  S({
    id: 'flaming-gorge', name: 'Flaming Gorge', state: 'UT / WY', states: ['UT', 'WY'],
    regionId: 'rockies', region: 'Rockies',
    species: ['Lake Trout', 'Rainbow Trout', 'Kokanee', 'Smallmouth Bass'],
    why: 'A canyon reservoir that still grows legendary lake trout — and a beautiful kokanee bite.',
    records: '50-lb class lakers are the lore; kokanee limits in season.',
    best: 'May–September', lat: 41.00, lon: -109.55,
    mix: 'deep', maxDepth: 436, avgDepth: 120, acres: '~42,000 acres',
    waterType: 'Canyon reservoir',
    areas: [
      area({ id: 'gorge-canyon', name: 'Canyon country (south)', kind: 'Canyon', depth: '40–200 ft', depthFt: 90, lat: 40.92, lon: -109.42, structure: 'Steep, deep, laker water', species: ['Lake Trout'], season: 'June–September', tip: 'Vertical jig or troll the 45–52°F layer. Big baits for big fish.' }),
      area({ id: 'gorge-open', name: 'Open Wyoming basins', kind: 'Basin', depth: '20–80 ft', depthFt: 40, lat: 41.15, lon: -109.55, structure: 'Wider, slightly shallower basins', species: ['Kokanee', 'Rainbow Trout', 'Smallmouth Bass'], season: 'May–August', tip: 'Kokanee troll at first light. Smallmouth on the rocky banks.' })
    ]
  }),
  S({
    id: 'powell', name: 'Lake Powell', state: 'UT / AZ', states: ['UT', 'AZ'],
    regionId: 'rockies', region: 'Rockies',
    species: ['Striped Bass', 'Smallmouth Bass', 'Largemouth Bass', 'Walleye'],
    why: 'A flooded canyon maze — stripers boiling on shad, smallmouth on the sandstone.',
    records: 'Stripers by the hundreds when the boils are on; desert smallmouth.',
    best: 'May–June and Sept–Oct', lat: 37.05, lon: -111.30,
    mix: 'deep', maxDepth: 560, avgDepth: 130, acres: 'Varies with pool',
    waterType: 'Desert canyon reservoir',
    notes: 'Pool elevation changes everything. Coves appear and vanish. Always check current lake level.',
    tempStations: ['09380000'],
    areas: [
      area({ id: 'powell-wahweap', name: 'Wahweap / south', kind: 'Marina / canyon', depth: '20–120 ft', depthFt: 50, lat: 36.99, lon: -111.48, structure: 'Main channel and side canyons', species: ['Striped Bass', 'Smallmouth Bass'], season: 'May–October', tip: 'Watch for boils at first light. Smallmouth on any rocky point.' }),
      area({ id: 'powell-bullfrog', name: 'Bullfrog / mid-lake', kind: 'Canyon', depth: '20–100 ft', depthFt: 45, lat: 37.52, lon: -110.72, structure: 'Mid-lake access and canyons', species: ['Striped Bass', 'Smallmouth Bass'], season: 'June–September', tip: 'Less crowded than Wahweap. Same program.' })
    ]
  }),
  S({
    id: 'flathead', name: 'Flathead Lake', state: 'MT', states: ['MT'],
    regionId: 'rockies', region: 'Rockies',
    species: ['Lake Trout', 'Yellow Perch', 'Northern Pike'],
    why: 'The largest natural freshwater lake west of the Mississippi — deep, clear, and full of fat lakers.',
    records: 'Trophy lake trout; a controversial but real fishery.',
    best: 'May–October', lat: 47.90, lon: -114.10,
    mix: 'deep', maxDepth: 370, avgDepth: 165, acres: '~197,000 acres',
    waterType: 'Deep mountain lake',
    areas: [
      area({ id: 'flat-deep', name: 'Main basin', kind: 'Basin', depth: '80–250 ft', depthFt: 140, lat: 47.90, lon: -114.10, structure: 'Deep, clear laker water', species: ['Lake Trout'], season: 'June–September', tip: 'Downriggers or vertical jigs. Big fish eat lake trout too.' }),
      area({ id: 'flat-south', name: 'South bay / Polson', kind: 'Bay', depth: '10–50 ft', depthFt: 22, lat: 47.70, lon: -114.16, structure: 'Shallower south end', species: ['Yellow Perch', 'Northern Pike', 'Lake Trout'], season: 'May–September', tip: 'Perch and pike when you want a break from the deep.' })
    ]
  }),
  S({
    id: 'eleven-mile', name: 'Eleven Mile Reservoir', state: 'CO', states: ['CO'],
    regionId: 'rockies', region: 'Rockies',
    species: ['Rainbow Trout', 'Northern Pike', 'Kokanee', 'Smallmouth Bass'],
    why: 'A South Park stillwater — wind, trout, and a surprising pike bite at 8,600 feet.',
    records: 'Quality trout; pike that shock first-timers.',
    best: 'May–October; ice', lat: 38.93, lon: -105.50,
    mix: 'moderate', maxDepth: 105, avgDepth: 30, acres: '~3,400 acres',
    waterType: 'High-elevation reservoir',
    areas: [
      area({ id: 'em-dam', name: 'Dam / north shore', kind: 'Dam', depth: '15–60 ft', depthFt: 30, lat: 38.94, lon: -105.47, structure: 'Deeper, wind-swept', species: ['Rainbow Trout', 'Kokanee'], season: 'June–September', tip: 'Troll or float-and-fly. The wind is part of the deal.' }),
      area({ id: 'em-weeds', name: 'Weed edges', kind: 'Weed', depth: '6–14 ft', depthFt: 9, lat: 38.92, lon: -105.52, structure: 'Pike and trout in the same weeds', species: ['Northern Pike', 'Rainbow Trout'], season: 'June–August', tip: 'Wire leader if you’re throwing flash.' })
    ]
  }),
  S({
    id: 'roosevelt', name: 'Theodore Roosevelt Lake', state: 'AZ', states: ['AZ'],
    regionId: 'southwest', region: 'Southwest',
    species: ['Largemouth Bass', 'Smallmouth Bass', 'Crappie', 'Catfish'],
    why: 'Arizona’s biggest lake — desert canyons, a serious bass fishery, and winter crappie.',
    records: 'Quality bass; crappie when they school.',
    best: 'Feb–April and fall', lat: 33.67, lon: -111.16,
    mix: 'moderate', maxDepth: 189, avgDepth: 55, acres: '~21,000 acres (varies)',
    waterType: 'Desert reservoir',
    areas: [
      area({ id: 'tr-tonto', name: 'Tonto Creek / north', kind: 'Creek arm', depth: '10–40 ft', depthFt: 20, lat: 33.80, lon: -111.25, structure: 'Incoming water and coves', species: ['Largemouth Bass', 'Crappie'], season: 'February–April', tip: 'Spring staging. Check lake level first.' }),
      area({ id: 'tr-dam', name: 'Dam / main canyon', kind: 'Canyon', depth: '30–100 ft', depthFt: 50, lat: 33.67, lon: -111.16, structure: 'Deep, steep, summer home', species: ['Smallmouth Bass', 'Largemouth Bass'], season: 'May–September', tip: 'Drop-shot the breaks. Early and late.' })
    ]
  }),
  S({
    id: 'havasu', name: 'Lake Havasu', state: 'AZ / CA', states: ['AZ', 'CA'],
    regionId: 'southwest', region: 'Southwest',
    species: ['Smallmouth Bass', 'Largemouth Bass', 'Striped Bass'],
    why: 'Clear Colorado River reservoir — smallmouth on the rock, stripers in the channel.',
    records: 'Elite smallmouth water; a famous desert tournament lake.',
    best: 'Feb–May', lat: 34.48, lon: -114.36,
    mix: 'moderate', maxDepth: 90, avgDepth: 35, acres: '~19,000 acres',
    waterType: 'Desert river reservoir',
    areas: [
      area({ id: 'hav-main', name: 'Main lake rock', kind: 'Rock', depth: '8–25 ft', depthFt: 14, lat: 34.48, lon: -114.36, structure: 'Riprap, points, and islands', species: ['Smallmouth Bass'], season: 'February–May', tip: 'A drop-shot and a shaky head. Sight-fish the spawn.' }),
      area({ id: 'hav-channel', name: 'River channel', kind: 'Channel', depth: '20–50 ft', depthFt: 30, lat: 34.45, lon: -114.34, structure: 'Old Colorado channel', species: ['Striped Bass', 'Smallmouth Bass'], season: 'Summer', tip: 'Stripers roam the channel following shad.' })
    ]
  }),
  S({
    id: 'clear-lake', name: 'Clear Lake', state: 'CA', states: ['CA'],
    regionId: 'west', region: 'California & West',
    species: ['Largemouth Bass', 'Crappie', 'Catfish'],
    why: 'The Bass Capital of the West — fertile, weedy, and still kicking out giants.',
    records: 'Double-digit largemouth with real regularity.',
    best: 'Feb–May and fall', lat: 39.05, lon: -122.82,
    mix: 'shallow', maxDepth: 60, avgDepth: 27, acres: '~43,000 acres',
    waterType: 'Natural eutrophic lake',
    notes: 'Often mixed. Tules, docks, and the river mouths matter more than a deep thermocline.',
    areas: [
      area({ id: 'cl-tules', name: 'Tule beds / river mouths', kind: 'Tules', depth: '3–10 ft', depthFt: 6, lat: 39.10, lon: -122.88, structure: 'Rodman, Clear Lake keys, tules', species: ['Largemouth Bass'], season: 'February–May', tip: 'A frog and a swim jig. The spawn is the show.' }),
      area({ id: 'cl-main', name: 'Main lake / Oaks', kind: 'Basin', depth: '15–35 ft', depthFt: 22, lat: 39.02, lon: -122.80, structure: 'Deeper summer bass and bait', species: ['Largemouth Bass', 'Crappie'], season: 'June–September', tip: 'Deep docks and the first break when the shallows cook.' })
    ]
  }),
  S({
    id: 'sac-delta', name: 'Sacramento–San Joaquin Delta', state: 'CA', states: ['CA'],
    regionId: 'west', region: 'California & West',
    species: ['Largemouth Bass', 'Striped Bass', 'Catfish', 'Sturgeon'],
    why: 'A tidal maze of sloughs — big largemouth in the grass, stripers in the current.',
    records: 'Giant tidewater largemouth; legal sturgeon with a card.',
    best: 'March–June and fall', lat: 38.05, lon: -121.57,
    mix: 'river', maxDepth: 60, avgDepth: 12, acres: 'Delta tidal',
    waterType: 'Tidal estuary / sloughs',
    tempStations: ['11447650', '46026'],
    areas: [
      area({ id: 'delta-grass', name: 'Franks Tract / flooded islands', kind: 'Grass / tract', depth: '4–12 ft', depthFt: 7, lat: 38.05, lon: -121.61, structure: 'Tules, hyacinth, and flooded berms', species: ['Largemouth Bass'], season: 'March–June', tip: 'Punch and frog. Tide moving on a grass edge is money.' }),
      area({ id: 'delta-current', name: 'False River / main current', kind: 'Current', depth: '10–30 ft', depthFt: 16, lat: 38.06, lon: -121.67, structure: 'Tidal rivers', species: ['Striped Bass', 'Sturgeon'], season: 'Fall–spring', tip: 'Stripers want current. Sturgeon want bait on the bottom.' })
    ]
  }),
  S({
    id: 'tahoe', name: 'Lake Tahoe', state: 'CA / NV', states: ['CA', 'NV'],
    regionId: 'west', region: 'California & West',
    species: ['Mackinaw (Lake Trout)', 'Kokanee', 'Rainbow Trout'],
    why: 'An alpine inland sea — painfully clear, painfully deep, and a real mackinaw fishery.',
    records: 'Big macks from deep water; kokanee in summer.',
    best: 'May–October', lat: 39.10, lon: -120.03,
    mix: 'deep', maxDepth: 1645, avgDepth: 1000, acres: '~122,000 acres',
    waterType: 'Deep alpine lake',
    notes: 'The surface can be 68°F while 48°F water is just a short drop away. Lakers live deep in summer.',
    areas: [
      area({ id: 'tahoe-west', name: 'West shore / Rubicon', kind: 'Drop-off', depth: '40–200 ft', depthFt: 90, lat: 39.02, lon: -120.12, structure: 'Steep west-shore drop', species: ['Mackinaw (Lake Trout)'], season: 'June–September', tip: 'Find 48–52°F on the graph. That’s the program.' }),
      area({ id: 'tahoe-east', name: 'East shore / Cave Rock', kind: 'Drop-off', depth: '40–180 ft', depthFt: 80, lat: 39.04, lon: -119.95, structure: 'Nevada-side drops', species: ['Mackinaw (Lake Trout)', 'Kokanee'], season: 'Summer', tip: 'Kokanee first light; macks under them.' })
    ]
  }),
  S({
    id: 'columbia', name: 'Columbia River (Gorge / pools)', state: 'OR / WA', states: ['OR', 'WA'],
    regionId: 'pnw', region: 'Pacific Northwest',
    species: ['Salmon', 'Steelhead', 'Walleye', 'Sturgeon'],
    why: 'A West Coast salmon highway that also hides one of the country’s best walleye bites.',
    records: 'Summer walleye that rival Erie; kings and steelhead in season.',
    best: 'June–Sept walleye; salmon by run', lat: 45.65, lon: -121.15,
    mix: 'river', maxDepth: 180, avgDepth: 40, acres: 'Impounded mainstem',
    waterType: 'Big regulated river',
    tempStations: ['14105700', '46029'],
    areas: [
      area({ id: 'col-gorge', name: 'The Gorge pools', kind: 'Pool / current', depth: '15–60 ft', depthFt: 28, lat: 45.65, lon: -121.15, structure: 'Current seams, islands, and wing walls', species: ['Walleye', 'Steelhead'], season: 'June–September', tip: 'Bottom-bounce or troll. Current + bait = eyes.' }),
      area({ id: 'col-dalles', name: 'The Dalles / John Day tailraces', kind: 'Dam', depth: '20–80 ft', depthFt: 35, lat: 45.61, lon: -121.17, structure: 'Tailwater current', species: ['Walleye', 'Salmon', 'Sturgeon'], season: 'Year-round (by species)', tip: 'Know the season and the sanctuary lines. Heavy gear.' }),
      area({ id: 'col-mouth', name: 'Lower river / estuary', kind: 'Estuary', depth: '10–50 ft', depthFt: 22, lat: 46.20, lon: -123.80, structure: 'Tidal river', species: ['Salmon', 'Sturgeon'], season: 'August–September kings', tip: 'A different fishery than the Gorge. Tide and buoys.' })
    ]
  }),
  S({
    id: 'puget', name: 'Puget Sound', state: 'WA', states: ['WA'],
    regionId: 'pnw', region: 'Pacific Northwest',
    species: ['Salmon', 'Sea-run Cutthroat', 'Halibut', 'Lingcod'],
    why: 'An inland sea in a city — resident coho, winter blackmouth, and rock piles for bottomfish.',
    records: 'Blackmouth chinook in winter; pinks on odd years.',
    best: 'Year-round by species', lat: 47.70, lon: -122.45,
    mix: 'coastal', maxDepth: 930, avgDepth: 205, acres: 'Inland sea',
    waterType: 'Inland marine sea',
    tempStations: ['46088'],
    areas: [
      area({ id: 'puget-mid', name: 'Mid-Sound / Possession', kind: 'Passage', depth: '40–200 ft', depthFt: 90, lat: 47.90, lon: -122.40, structure: 'Tidal passages and banks', species: ['Salmon'], season: 'Winter blackmouth; summer coho', tip: 'Tide changes. Downrigger or mooch the bait.' }),
      area({ id: 'puget-south', name: 'South Sound inlets', kind: 'Inlet', depth: '10–60 ft', depthFt: 25, lat: 47.25, lon: -122.55, structure: 'Quieter inlets', species: ['Sea-run Cutthroat', 'Salmon'], season: 'Fall–spring', tip: 'Cutts along the beaches at first light.' })
    ]
  }),
  S({
    id: 'pend-oreille', name: 'Lake Pend Oreille', state: 'ID', states: ['ID'],
    regionId: 'pnw', region: 'Pacific Northwest',
    species: ['Lake Trout', 'Rainbow Trout', 'Kokanee', 'Smallmouth Bass'],
    why: 'A deep Idaho fjord-lake that still grows giant rainbows and macks.',
    records: 'Gerrard-strain rainbow lore; fat kamloops and lakers.',
    best: 'May–October', lat: 48.17, lon: -116.35,
    mix: 'deep', maxDepth: 1150, avgDepth: 540, acres: '~94,000 acres',
    waterType: 'Deep glacial lake',
    areas: [
      area({ id: 'lpo-deep', name: 'Main trench', kind: 'Trench', depth: '80–300 ft', depthFt: 160, lat: 48.17, lon: -116.35, structure: 'Very deep, very clear', species: ['Lake Trout', 'Rainbow Trout'], season: 'June–September', tip: 'Troll deep. This is not a bank-beating lake in summer.' }),
      area({ id: 'lpo-clark', name: 'Clark Fork delta', kind: 'Delta', depth: '10–40 ft', depthFt: 20, lat: 48.18, lon: -116.25, structure: 'Incoming river and shallower water', species: ['Rainbow Trout', 'Smallmouth Bass'], season: 'May–July', tip: 'A place to actually cast when the trench is a chore.' })
    ]
  }),
  S({
    id: 'rogue', name: 'Rogue River', state: 'OR', states: ['OR'],
    regionId: 'pnw', region: 'Pacific Northwest',
    species: ['Steelhead', 'Salmon', 'Smallmouth Bass'],
    why: 'A storied southwest Oregon river — summer steelhead, fall kings, and smallmouth in the lower.',
    records: 'Wild steelhead reputation; a jet-boat culture.',
    best: 'July–October steelhead; fall salmon', lat: 42.43, lon: -124.05,
    mix: 'river', maxDepth: 30, avgDepth: 8, acres: 'Free-flowing + runs',
    waterType: 'Coastal / canyon river',
    areas: [
      area({ id: 'rogue-lower', name: 'Lower Rogue / estuary', kind: 'Tidewater', depth: '6–20 ft', depthFt: 10, lat: 42.43, lon: -124.40, structure: 'Tidewater and first riffles', species: ['Salmon', 'Steelhead'], season: 'August–October', tip: 'Kings in the tide. Then they move up.' }),
      area({ id: 'rogue-canyon', name: 'Canyon / Grants Pass stretch', kind: 'Run / pool', depth: '3–12 ft', depthFt: 6, lat: 42.53, lon: -123.50, structure: 'Classic steelhead water', species: ['Steelhead', 'Smallmouth Bass'], season: 'July–October', tip: 'Swing a fly or bounce a bead. Smallmouth in the warm lows.' })
    ]
  }),
  S({
    id: 'kenai', name: 'Kenai River', state: 'AK', states: ['AK'],
    regionId: 'alaska', region: 'Alaska',
    species: ['Salmon', 'Rainbow Trout', 'Dolly Varden'],
    why: 'Alaska’s most famous river — sockeye traffic jams and the legend of the Kenai king.',
    records: 'The world-record king came from here. Sockeye by the tens of thousands.',
    best: 'July sockeye; mid-summer trout', lat: 60.50, lon: -151.05,
    mix: 'river', maxDepth: 25, avgDepth: 8, acres: 'Glacial river',
    waterType: 'Glacial / clear river',
    notes: 'Seasons and slots are tight and change. The river is crowded in July for a reason.',
    tempStations: ['15258000'],
    areas: [
      area({ id: 'kenai-lower', name: 'Lower river / Soldotna', kind: 'Run', depth: '4–14 ft', depthFt: 8, lat: 60.49, lon: -151.07, structure: 'Glacial-green, bank-to-bank sockeye', species: ['Salmon'], season: 'July', tip: 'Flip-and-strip sockeye. Book a slot and know the regs.' }),
      area({ id: 'kenai-mid', name: 'Middle river / Skilak', kind: 'River / lake', depth: '6–20 ft', depthFt: 10, lat: 60.43, lon: -150.45, structure: 'Clearer water, trout behind salmon', species: ['Rainbow Trout', 'Dolly Varden', 'Salmon'], season: 'July–September', tip: 'Trout eat eggs and flesh behind the reds. That’s the game.' })
    ]
  }),
  S({
    id: 'bristol', name: 'Naknek / Bristol Bay', state: 'AK', states: ['AK'],
    regionId: 'alaska', region: 'Alaska',
    species: ['Salmon', 'Rainbow Trout', 'Arctic Char'],
    why: 'The greatest sockeye run on earth, plus rainbows that live on the leftovers.',
    records: 'Millions of sockeye; leopard rainbows in the Naknek and the smaller rivers.',
    best: 'Late June–August', lat: 58.73, lon: -157.00,
    mix: 'river', maxDepth: 40, avgDepth: 10, acres: 'Bay + river system',
    waterType: 'Salmon river / lake system',
    areas: [
      area({ id: 'naknek-river', name: 'Naknek River', kind: 'River', depth: '4–16 ft', depthFt: 8, lat: 58.73, lon: -157.00, structure: 'Outlet river below Naknek Lake', species: ['Salmon', 'Rainbow Trout'], season: 'July–August', tip: 'Reds first, then trout on beads and flesh.' }),
      area({ id: 'naknek-lake', name: 'Naknek Lake', kind: 'Lake', depth: '20–540 ft', depthFt: 60, lat: 58.65, lon: -155.90, structure: 'Huge lake in Katmai country', species: ['Lake Trout', 'Arctic Char', 'Salmon'], season: 'June–August', tip: 'A different trip than the river. Bring a boat or a lodge.' })
    ]
  })
];

(function mergeNational() {
  COOPS.usgsStations = (COOPS.usgsStations || []).concat(COOPS.moreUsgs || []);
  COOPS.ndbcStations = (COOPS.ndbcStations || []).concat(COOPS.moreNdbc || []);
  COOPS.baitGuide = (COOPS.baitGuide || []).concat(COOPS.moreBait || []);
  const have = new Set((COOPS.spots || []).map((s) => s.id));
  (COOPS.moreSpots || []).forEach((s) => {
    if (!have.has(s.id)) COOPS.spots.push(s);
  });
})();
