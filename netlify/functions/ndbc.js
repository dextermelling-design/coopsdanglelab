/**
 * Proxy NOAA NDBC realtime text → JSON { c, when, source, station }.
 * Used on Netlify so the browser is not blocked by NDBC CORS.
 */
function parseNdbc(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 3) return null;
  for (let i = 2; i < Math.min(lines.length, 40); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 15) continue;
    const wtmp = parts[14];
    if (!wtmp || wtmp === 'MM' || wtmp === '999' || wtmp === '99.0') continue;
    const c = parseFloat(wtmp);
    if (Number.isNaN(c) || c < -2 || c > 40) continue;
    const [yy, mo, dd, hh, mm] = parts;
    const when = `${yy}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`;
    return { c, when, source: 'NOAA NDBC' };
  }
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };
  const raw = (event.queryStringParameters && event.queryStringParameters.id) || '';
  const station = String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!station) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'bad station id' }) };
  }

  try {
    const res = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${station}.txt`, {
      headers: { 'User-Agent': 'CoopsFishing/1.0 (Netlify function)' }
    });
    if (!res.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: `NDBC HTTP ${res.status}`, station })
      };
    }
    const parsed = parseNdbc(await res.text());
    if (!parsed) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'no water temperature in recent rows', station })
      };
    }
    parsed.station = station;
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (e) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: String(e && e.message ? e.message : e), station })
    };
  }
};
