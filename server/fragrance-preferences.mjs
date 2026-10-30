/** Anonymous preference totals only. No names, contact data, IPs or event logs. */
export const SEED_VERSION = '500-v1';
export const SEED = Object.freeze({ flambau: 315, green_tea: 95, bodrum_mandarin: 55, lemon: 35 });
const KEYS = Object.keys(SEED);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AGGREGATE = 'SELECT fragrance, COUNT(*) AS count FROM fragrance_preferences WHERE product_family = ? GROUP BY fragrance';
const UPSERT = 'INSERT INTO fragrance_preferences (product_family, anonymous_id, fragrance, revision) VALUES (?, ?, ?, ?) ON CONFLICT(product_family, anonymous_id) DO UPDATE SET fragrance = excluded.fragrance, revision = excluded.revision WHERE excluded.revision > fragrance_preferences.revision';
const ACKNOWLEDGED = 'SELECT 1 AS accepted FROM fragrance_preferences WHERE product_family = ? AND anonymous_id = ? AND fragrance = ? AND revision = ?';
const MAX_BYTES = 256;
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
  }});
}
export function aggregatePayload(rows) {
  const counts = { ...SEED };
  for (const row of rows) {
    if (!KEYS.includes(row.fragrance) || !Number.isSafeInteger(row.count) || row.count < 0) throw new Error('Invalid aggregate');
    counts[row.fragrance] += row.count;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Aggregate overflow');
  const shares = KEYS.map((key, index) => ({key, index, exact: counts[key] * 100 / total}));
  const percentages = Object.fromEntries(shares.map(s => [s.key, Math.floor(s.exact)]));
  let remaining = 100 - Object.values(percentages).reduce((a, b) => a + b, 0);
  shares.sort((a,b) => (b.exact % 1) - (a.exact % 1) || a.index - b.index);
  for (const share of shares) if (remaining-- > 0) percentages[share.key]++;
  return {productFamily: 'towels', seedVersion: SEED_VERSION, source: 'shared', percentages};
}
async function boundedJson(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) throw new Error('body');
  if (!request.body) throw new Error('body');
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('body'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(data));
}
export async function handleFragrancePreferences(request, db) {
  const url = new URL(request.url);
  if (request.method === 'GET' && (url.searchParams.get('productFamily') !== 'towels' || [...url.searchParams.keys()].length !== 1)) return json({error: 'invalid_product_family'}, 400);
  if (request.method === 'POST' && url.search) return json({error: 'invalid_request'}, 400);
  if (!['GET','POST'].includes(request.method)) {
    const response = json({error: 'method_not_allowed'}, 405);
    response.headers.set('Allow', 'GET, POST'); return response;
  }
  let preference;
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');
    if (origin !== url.origin || (fetchSite && fetchSite !== 'same-origin')) return json({error: 'origin_not_allowed'}, 403);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) return json({error:'unsupported_media_type'},415);
    try { preference = await boundedJson(request); } catch { return json({error:'invalid_request'},400); }
    if (!preference || Array.isArray(preference) || typeof preference !== 'object' ||
      Object.keys(preference).length !== 4 || !Number.isSafeInteger(preference.revision) || preference.revision < 1 || preference.productFamily !== 'towels' || !Object.hasOwn(preference,'anonymousId') || !Object.hasOwn(preference,'fragrance') ||
      typeof preference.anonymousId !== 'string' || !UUID.test(preference.anonymousId) || !KEYS.includes(preference.fragrance)) return json({error:'invalid_request'},400);
  }
  try {
    if (!db) throw new Error('Unavailable');
    let result;
    if (preference) {
      // D1 batch is one transaction: upsert and aggregate cannot observe a partial write.
      const results = await db.batch([
        db.prepare(UPSERT).bind('towels', preference.anonymousId.toLowerCase(), preference.fragrance, preference.revision),
        db.prepare(AGGREGATE).bind('towels'),
        db.prepare(ACKNOWLEDGED).bind('towels', preference.anonymousId.toLowerCase(), preference.fragrance, preference.revision),
      ]);
      if (results.some(r => r.success === false)) throw new Error('Database failure');
      if (results[2]?.results?.[0]?.accepted !== 1) return json({error:'stale_preference'},409);
      result = results[1];
    } else { result = await db.prepare(AGGREGATE).bind('towels').all(); }
    if (result.success === false || !Array.isArray(result.results)) throw new Error('Database failure');
    return json({...aggregatePayload(result.results), ...(preference ? {accepted:true,revision:preference.revision} : {})});
  } catch { return json({error:'preferences_unavailable'},503); }
}
