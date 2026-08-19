/**
 * Accept feedback JSON and keep a copy even if Netlify Forms
 * has not registered the HTML form yet.
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid json' }) };
  }

  if (String(data.website || data._honey || '').trim()) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const message = String(data.message || '').trim();
  if (message.length < 4) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'message too short' }) };
  }

  const rec = {
    when: String(data.when || new Date().toISOString()).slice(0, 40),
    kind: String(data.kind || 'idea').slice(0, 40),
    message: message.slice(0, 2000),
    water: String(data.water || '').slice(0, 120),
    name: String(data.name || '').slice(0, 80),
    email: String(data.email || '').slice(0, 120),
    href: String(data.href || '').slice(0, 300)
  };

  console.log('FEEDBACK', JSON.stringify(rec));

  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('feedback');
    const id = rec.when.replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
    await store.setJSON(id, rec);
  } catch (e) {
    console.log('blob save skipped', e && e.message);
  }

  try {
    const site = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
    if (site) {
      await fetch(site.replace(/\/$/, '') + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'feedback',
          kind: rec.kind,
          message: rec.message,
          water: rec.water,
          name: rec.name,
          email: rec.email,
          href: rec.href,
          when: rec.when,
          website: ''
        }).toString()
      });
    }
  } catch (e) {
    console.log('forms forward skipped', e && e.message);
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
