# Coop's Fishing

Nationwide fishing desk: featured U.S. waters by region and state, live water temps, depth charts, bait by species, and lunar/solar charts.

## Open (recommended)

From this folder, start the local server so Great Lakes buoy temps can load:

```powershell
cd "C:\Users\dexte\Coops fishing"
python serve.py
```

Then open **http://localhost:8765**

USGS river temps also work if you open `index.html` directly (CORS allowed). NOAA NDBC buoys need `serve.py` because the browser blocks direct NDBC requests.

## Pages

Sticky top nav. Each tool is its own URL so Netlify / Google Analytics can see real usage:

| URL | Page |
|-----|------|
| `/` or `index.html` | Home |
| `temps.html` | Live water temps |
| `spots.html` | Featured waters |
| `depths.html` | Depth charts & how deep to fish |
| `bait.html` | Bait guide |
| `charts.html` | Lunar & solar |
| `about.html` | How to use the desk |
| `usage.html` | First-party page-view totals |

Old `#temps` hashes on the home page redirect to the new files.

## Features

| Section | What it does |
|--------|----------------|
| **Live water temps** | USGS water temp near featured U.S. fisheries + NOAA coastal / Great Lakes buoys |
| **Hot spots** | Curated destinations nationwide — filter by region, state, species, or name |
| **Depth charts** | Named public fishing areas, stylized bathymetry, map pins, and a surface-temp → depth column that recommends how deep to fish |
| **Bait guide** | Live & artificial recommendations for walleye, bass, pike, muskie, cats, crappie, perch, salmon/lakers |
| **Lunar & solar** | Moon phase, monthly calendar, solunar major/minor windows, sunrise/sunset, golden hour, 24h timeline |

## Project layout

```
Coops fishing/
  index.html
  assets/css/styles.css
  assets/js/data.js      # core Midwest spots, bait, station list
  assets/js/national.js  # regions, extra U.S. waters, extra gauges
  assets/js/depths.js    # fishing areas, bathymetry, water-column model
  assets/js/astro.js     # moon/sun/solunar math
  assets/js/app.js         # UI + live fetches
  assets/js/chrome.js      # sticky top nav
  assets/js/track.js       # page-view beacon
  temps.html spots.html depths.html bait.html charts.html about.html usage.html
  netlify.toml
  netlify/functions/
```

## Feedback (Netlify)

The floating **Feedback** button posts to a Netlify function (`/api/feedback`) and also to **Netlify Forms**.

1. Open the Netlify site → **Forms** → `feedback` for the inbox
2. Turn on **Form notifications** if you want each note emailed
3. Function logs also print each submission (Functions → `feedback` → logs)

Redeploy after this change so the form is registered and the function is live.

Local (`python serve.py`) still appends notes to `feedback/submissions.jsonl`.

## Deploy on Netlify

Publish the folder as-is (`netlify.toml` sets publish to `.`).

- No build command needed
- Buoy water temps go through `netlify/functions/ndbc` (NDBC blocks browser CORS)
- Feedback goes to Netlify Forms — enable form emails in the dashboard before you post the link

USGS river temps load directly from the browser.
