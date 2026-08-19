/**
 * Record a page view. GET returns totals for usage.html.
 */
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  let store;
  try {
    const { getStore } = require('@netlify/blobs');
    store = getStore('usage');
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true }) };
  }

  if (event.httpMethod === 'GET') {
    const day = (event.queryStringParameters && event.queryStringParameters.day) || new Date().toISOString().slice(0, 10);
    const key = 'day-' + day;
    const data = (await store.get(key, { type: 'json' })) || { day, pages: {}, total: 0 };
    const all = (await store.get('all', { type: 'json' })) || { pages: {}, total: 0 };
    return { statusCode: 200, headers, body: JSON.stringify({ day: data, all }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'GET or POST' }) };
  }

  let data = {};
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    data = {};
  }
  const page = String(data.path || 'unknown')
    .replace(/[^a-z0-9_-]/gi, '')
    .slice(0, 40) || 'unknown';
  const day = new Date().toISOString().slice(0, 10);

  async function bump(key) {
    const cur = (await store.get(key, { type: 'json' })) || { pages: {}, total: 0, day: key === 'all' ? undefined : day };
    cur.pages[page] = (cur.pages[page] || 0) + 1;
    cur.total = (cur.total || 0) + 1;
    if (key !== 'all') cur.day = day;
    await store.setJSON(key, cur);
    return cur;
  }

  const today = await bump('day-' + day);
  await bump('all');
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, today }) };
};
