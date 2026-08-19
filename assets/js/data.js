/* Coop's Fishing — core spots, bait, and live-temp stations */

window.COOPS = window.COOPS || {};

/**
 * Feedback. On Netlify, the form posts into Site → Forms (no email required).
 * Optional: set `email` for a FormSubmit backup. Local serve.py still writes
 * feedback/submissions.jsonl.
 */
COOPS.feedback = {
  email: '',
  endpoint: '/api/feedback'
};

/**
 * Optional local override for magic-link accounts.
 * Prefer Netlify env: SUPABASE_URL + SUPABASE_ANON_KEY (read via /api/config).
 */
COOPS.supabase = {
  url: '',
  anonKey: ''
};

/**
 * USGS monitoring locations with continuous water temperature (param 00010).
 * IDs verified against api.waterdata.usgs.gov continuous collection.
 */
COOPS.usgsStations = [
  { id: '040851385', name: 'Fox River @ Green Bay', near: 'Green Bay / Lake Michigan WI', species: 'Walleye, Muskie' },
  { id: '04087000', name: 'Milwaukee River @ Milwaukee', near: 'Milwaukee / Lake Michigan WI', species: 'Bass, Salmon runs' },
  { id: '04193500', name: 'Maumee River @ Waterville', near: 'Toledo / Lake Erie OH', species: 'Walleye' },
  { id: '04165500', name: 'Clinton River @ Mt. Clemens', near: 'Lake St. Clair MI', species: 'Muskie, Bass, Walleye' },
  { id: '04166500', name: 'River Rouge @ Detroit', near: 'Detroit River / Lake Erie MI', species: 'Bass, Walleye' },
  { id: '05420500', name: 'Mississippi River @ Clinton', near: 'IA / IL border pools', species: 'Walleye, Catfish, Bass' },
  { id: '05586300', name: 'Illinois River @ Florence', near: 'Central Illinois', species: 'Catfish, Bass' },
  { id: '03290500', name: 'Kentucky River @ Lockport', near: 'Near Ohio River KY', species: 'Catfish, Bass' }
];

/**
 * NOAA NDBC buoys / stations with water temp (WTMP).
 * Fetched via local /api/ndbc/ proxy (CORS blocked on ndbc.noaa.gov from browsers).
 */
COOPS.ndbcStations = [
  { id: '45161', name: 'Lake Michigan — Mid-Lake Buoy', near: 'Open Lake Michigan', species: 'Salmon, Trout, Smallmouth' },
  { id: '45216', name: 'Lake Erie Buoy', near: 'Lake Erie open water', species: 'Walleye, Perch' },
  { id: '45005', name: 'Lake Erie — West Buoy', near: 'Western Lake Erie', species: 'Walleye' },
  { id: '45007', name: 'Lake Michigan — South Buoy', near: 'Southern Lake Michigan', species: 'Salmon, Trout' },
  { id: '45008', name: 'Lake Huron Buoy', near: 'Open Lake Huron', species: 'Walleye, Trout' },
  { id: '45003', name: 'Lake Superior Buoy', near: 'Western Lake Superior', species: 'Lake trout' }
];

/** Top Midwest fishing spots */
COOPS.spots = [
  {
    id: 'erie-west',
    tempStations: ['04193500', '45005', '45216'],
    name: 'Lake Erie — Western Basin',
    state: 'OH / MI',
    states: ['OH', 'MI'],
    regionId: 'great-lakes',
    region: 'Great Lakes',
    species: ['Walleye', 'Smallmouth Bass', 'Yellow Perch'],
    why: 'Often called the walleye capital of the world. Spring and fall runs produce numbers and trophy fish.',
    records: 'Consistent double-digit walleye; famous for tournament-winning bags.',
    best: 'May–June & Sept–Oct',
    lat: 41.70, lon: -83.00
  },
  {
    id: 'saginaw',
    tempStations: ['45008'],
    name: 'Saginaw Bay',
    state: 'MI',
    states: ['MI'],
    regionId: 'great-lakes',
    region: 'Great Lakes',
    species: ['Walleye', 'Yellow Perch', 'Bass'],
    why: 'Lake Huron’s trophy walleye factory — big fish and solid numbers year after year.',
    records: 'Known for 10+ lb walleye; strong perch fishery in winter.',
    best: 'Spring spawn & fall',
    lat: 43.90, lon: -83.60
  },
  {
    id: 'st-clair',
    tempStations: ['04165500'],
    name: 'Lake St. Clair',
    state: 'MI',
    states: ['MI'],
    regionId: 'great-lakes',
    region: 'Great Lakes',
    species: ['Muskie', 'Smallmouth Bass', 'Walleye'],
    why: 'World-class muskie water between Lake Huron and Lake Erie. Clear water, structure, and big fish.',
    records: 'Regular 50"+ muskies; elite smallmouth fishery.',
    best: 'June–Oct (muskie peak late summer)',
    lat: 42.50, lon: -82.70
  },
  {
    id: 'mille-lacs',
    name: 'Mille Lacs Lake',
    state: 'MN',
    states: ['MN'],
    regionId: 'midwest',
    region: 'Midwest',
    species: ['Smallmouth Bass', 'Walleye', 'Muskie'],
    why: 'Legendary Minnesota multi-species lake. Smallmouth can be absurd; walleye and muskie still draw travelers.',
    records: 'Top-tier smallmouth destination; historic walleye reputation.',
    best: 'June–Sept',
    lat: 46.25, lon: -93.65
  },
  {
    id: 'green-bay',
    tempStations: ['040851385', '45161', '45007'],
    name: 'Green Bay / Fox River',
    state: 'WI',
    states: ['WI'],
    regionId: 'great-lakes',
    region: 'Great Lakes',
    species: ['Walleye', 'Muskie', 'Smallmouth'],
    why: 'Upper Green Bay and the Fox produce heavy muskies and excellent walleye — river and bay options.',
    records: '56–58" class muskies reported in northern bay stretches in recent years.',
    best: 'Spring walleye; summer–fall muskie',
    lat: 44.52, lon: -88.01
  },
  {
    id: 'lotw',
    name: 'Lake of the Woods',
    state: 'MN',
    states: ['MN'],
    regionId: 'midwest',
    region: 'Midwest',
    species: ['Walleye', 'Muskie', 'Northern Pike', 'Sauger'],
    why: 'Vast border water. Ice or open water, it’s a bucket-list Midwest trip for walleye and big toothy critters.',
    records: 'Consistent walleye limits; trophy muskie and pike potential.',
    best: 'Year-round (prime ice mid-winter)',
    lat: 49.00, lon: -94.80
  },
  {
    id: 'devils',
    name: 'Devils Lake',
    state: 'ND',
    states: ['ND'],
    regionId: 'plains',
    region: 'Great Plains',
    species: ['Walleye', 'Yellow Perch', 'Northern Pike'],
    why: 'One of the hottest multi-species fisheries on the northern plains — open water and ice both shine.',
    records: 'Perch and walleye size can be outstanding; popular winter destination.',
    best: 'Ice season & fall',
    lat: 48.10, lon: -98.90
  },
  {
    id: 'mississippi',
    tempStations: ['05420500'],
    name: 'Mississippi River (Pools 4–9)',
    state: 'MN / WI / IA',
    states: ['MN', 'WI', 'IA'],
    regionId: 'midwest',
    region: 'Midwest',
    species: ['Walleye', 'Sauger', 'Catfish', 'Bass'],
    why: 'Wing dams, current seams, and backwaters. A classic Midwest river system for mixed bags.',
    records: 'Strong sauger/walleye winter bite; big channel and flathead cats in summer.',
    best: 'Spring & winter for eyes; summer cats',
    lat: 44.20, lon: -91.90
  },
  {
    id: 'ohio',
    tempStations: ['03290500'],
    name: 'Ohio River',
    state: 'OH / IN / KY',
    states: ['OH', 'IN', 'KY'],
    regionId: 'midwest',
    region: 'Midwest',
    species: ['Catfish', 'Bass', 'Sauger'],
    why: 'Miles of bank and boat access for catfish and bass; underrated for numbers and size.',
    records: 'Blue and flathead cats pushing trophy class near dams and deep holes.',
    best: 'Late spring–fall',
    lat: 38.25, lon: -85.75
  },
  {
    id: 'traverse',
    tempStations: ['45007', '45161'],
    name: 'Grand Traverse Bay',
    state: 'MI',
    states: ['MI'],
    regionId: 'great-lakes',
    region: 'Great Lakes',
    species: ['Smallmouth Bass', 'Lake Trout', 'Salmon'],
    why: 'Crystal water, steep structure, and aggressive smallmouth — plus seasonal salmon/trout action.',
    records: 'Smallmouth regularly push 4–6+ lb in peak seasons.',
    best: 'June–Sept',
    lat: 44.95, lon: -85.55
  },
  {
    id: 'pelican',
    name: 'Pelican Lake / Alexandria Chain',
    state: 'MN',
    states: ['MN'],
    regionId: 'midwest',
    region: 'Midwest',
    species: ['Walleye', 'Largemouth Bass', 'Northern Pike'],
    why: 'Classic Minnesota resort-country fishing with solid walleye and bass opportunities.',
    records: 'Reliable multi-species action for family trips and serious anglers alike.',
    best: 'May–Sept',
    lat: 45.88, lon: -95.35
  },
  {
    id: 'shelbyville',
    tempStations: ['05586300'],
    name: 'Lake Shelbyville',
    state: 'IL',
    states: ['IL'],
    regionId: 'midwest',
    region: 'Midwest',
    species: ['Muskie', 'Crappie', 'Bass', 'Catfish'],
    why: 'Central Illinois reservoir known for muskie potential and strong panfish/catfish.',
    records: 'State-record caliber muskie talk; excellent spring crappie.',
    best: 'Spring crappie; summer–fall muskie',
    lat: 39.45, lon: -88.75
  }
];

/** Best bait / lure by species — Midwest focused */
COOPS.baitGuide = [
  {
    species: 'Walleye',
    icon: '🐟',
    live: ['Leeches', 'Nightcrawlers', 'Fathead minnows', 'Rainbow chubs'],
    artificial: ['Jig + minnow / plastic', 'Rippin’ raps / lipless cranks', 'Deep diving crankbaits', 'Bottom bouncers + spinner harness', 'Blade baits (fall/winter)'],
    tips: 'Match bait size to forage. Leeches and crawlers shine mid-summer on slow presentations. When water is cool, minnows and aggressive jigs often win.',
    temp: 'Best feed often 45–65°F water; deep summer bite as water warms.'
  },
  {
    species: 'Largemouth Bass',
    icon: '🎣',
    live: ['Nightcrawlers', 'Shiners (where legal)', 'Crawfish'],
    artificial: ['Texas-rig plastics', 'Jigs (football / flipping)', 'Spinnerbaits', 'Squarebill crankbaits', 'Topwater frogs & poppers', 'Ned rigs'],
    tips: 'Cover and edges first — weeds, docks, wood. Cloudy days favor topwater and spinnerbaits; bright high sun push fish deep into cover.',
    temp: 'Active above ~55°F; peak aggression in 65–78°F.'
  },
  {
    species: 'Smallmouth Bass',
    icon: '🥉',
    live: ['Leeches', 'Minnows', 'Crawlers'],
    artificial: ['Tube jigs', 'Ned / drop-shot', 'Soft jerkbaits', 'Crankbaits (shad / craw)', 'Topwater walking baits', 'Hair jigs'],
    tips: 'Rocky structure, points, and clear water are the smallie playbook. Finesse when pressured; reaction baits when wind chops the surface.',
    temp: 'Strong from 50°F up; late spring and fall are trophy windows.'
  },
  {
    species: 'Northern Pike',
    icon: '🦷',
    live: ['Large suckers / chubs (check regs)', 'Dead bait under tip-ups (ice)'],
    artificial: ['Spinnerbaits', 'Spoons', 'Inline spinners', 'Jerkbaits / minnow baits', 'Swimbaits', 'Buzzbaits'],
    tips: 'Weed edges and shallow bays early/late. Wire leaders save lures. Slow roll spinnerbaits or burn spoons over cabbage.',
    temp: 'Cold-water killers; also hot shallow in spring and fall.'
  },
  {
    species: 'Muskie',
    icon: '🦈',
    live: ['Large suckers (where legal)', 'Follow local live-bait rules carefully'],
    artificial: ['Bucktails / inlines', 'Glide baits', 'Rubber swimbaits', 'Topwater props & walkers', 'Crankbaits (big profile)', 'Jerkbaits'],
    tips: 'Figure-8 at boat side every retrieve. Cover water, then work high-percentage structure thoroughly. Fall = big fish season.',
    temp: 'Peak often 60–72°F; fall trophies as water cools into the 50s.'
  },
  {
    species: 'Channel / Flathead Catfish',
    icon: '🐱',
    live: ['Cut bait (shad, sucker)', 'Nightcrawlers', 'Chicken liver (channel)', 'Live bluegill / goldfish where legal (flathead)'],
    artificial: ['Stink baits / dip baits', 'Punch bait', 'Scented soft baits'],
    tips: 'Current seams, holes below dams, and woody cover. Night bite is real in summer heat. Fresh cut bait beats old bait.',
    temp: 'Channels feed hard 70°F+; flatheads prowl warm nights.'
  },
  {
    species: 'Crappie',
    icon: '⚪',
    live: ['Crappie minnows / fatheads', 'Wax worms', 'Small leeches'],
    artificial: ['1/16–1/32 oz jigs (tube, hair, plastic)', 'Road runners', 'Small spoons (ice)', 'Tiny crankbaits'],
    tips: 'Spring = shallow brush and docks. Summer = suspend over deeper brush or weed edges. Chartreuse, white, and black/chartreuse are staples.',
    temp: 'Spawn action ~58–68°F; winter school tight over structure.'
  },
  {
    species: 'Yellow Perch',
    icon: '🟡',
    live: ['Minnows', 'Worms', 'Maggots / spikes (ice)'],
    artificial: ['Small jigs tipped with bait', 'Spoons', 'Drop-shot micro plastics'],
    tips: 'Schools move — stay mobile. Great Lakes perch often suspend or hold near bottom structure. Keep baits small.',
    temp: 'Solid year-round; ice and cool spring/fall are classic.'
  },
  {
    species: 'Salmon / Lake Trout (Great Lakes)',
    icon: '🌊',
    live: ['Cut bait (limited use)'],
    artificial: ['Spoons', 'Flies / dodgers', 'J-plugs', 'Downrigger crankbaits', 'Jigging raps (lakers)'],
    tips: 'Troll temperature breaks and thermoclines. Match spoon color to light: bright on cloudy days, natural when sunny.',
    temp: 'Chinook often prefer ~50–55°F bands; lakers deeper cold water.'
  }
];

/** Water temp fishing guide ranges (°F) */
COOPS.tempBands = [
  { min: 32, max: 40, label: 'Ice / Frigid', tip: 'Ice fishing or deep slow presentations. Perch, walleye, and trout can still feed.' },
  { min: 40, max: 50, label: 'Cold', tip: 'Pre-spawn movement. Jigs, blade baits, and live minnows. Focus mid-day warmth.' },
  { min: 50, max: 60, label: 'Cool', tip: 'Prime walleye and smallmouth windows. Spawn starts for many species.' },
  { min: 60, max: 70, label: 'Ideal Multi-Species', tip: 'Bass, walleye, muskie, and panfish all active. Topwater and reaction baits shine.' },
  { min: 70, max: 80, label: 'Warm', tip: 'Early/late low light. Deeper structure midday. Catfish night bite heats up.' },
  { min: 80, max: 95, label: 'Hot', tip: 'Fish deep, shade, current. Dawn/dusk only for many species. Handle fish carefully.' }
];
