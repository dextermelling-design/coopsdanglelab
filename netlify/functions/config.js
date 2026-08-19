/**
 * Public client config. Anon/publishable key is meant for the browser (RLS protects data).
 * Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify site env vars.
 */
function clean(v) {
  return String(v || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  };
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      url: clean(process.env.SUPABASE_URL),
      anonKey: clean(process.env.SUPABASE_ANON_KEY)
    })
  };
};
