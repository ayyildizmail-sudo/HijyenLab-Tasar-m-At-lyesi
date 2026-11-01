/** Read-only TCMB indicative USD ForexSelling feed. No database or paid provider. */
export const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const MAX_BYTES = 128 * 1024;
const CACHE_MS = 5 * 60_000;
// A closed provider must not silently supply a weeks-old commercial price.
const MAX_PUBLICATION_AGE_DAYS = 10;
const DAY_MS = 86_400_000;

export function turkeyDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function cacheSlot(now) {
  const day = turkeyDate(now);
  return `${day}/${now.getTime() >= Date.parse(`${day}T15:30:00+03:00`) ? 'published' : 'before-publication'}`;
}
function attribute(tag, name) {
  const matches = [...tag.matchAll(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'g'))];
  if (matches.length !== 1) throw new Error('Invalid TCMB attribute');
  return matches[0][2];
}
function element(block, name) {
  const matches = [...block.matchAll(new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`, 'g'))];
  if (matches.length !== 1) throw new Error('Invalid TCMB field');
  return matches[0][1];
}
export function parseTcmbXml(xml, now = new Date()) {
  if (typeof xml !== 'string' || xml.length > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Invalid TCMB XML');
  const roots = [...xml.matchAll(/<Tarih_Date\b([^>]*)>/g)];
  if (roots.length !== 1 || !/<\/Tarih_Date>\s*$/.test(xml)) throw new Error('Invalid TCMB root');
  const date = attribute(roots[0][1], 'Tarih');
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) throw new Error('Invalid TCMB date');
  const [day, month, year] = date.split('.');
  const rateDate = `${year}-${month}-${day}`;
  if (attribute(roots[0][1], 'Date') !== `${month}/${day}/${year}`) throw new Error('Inconsistent TCMB date');
  const requestedDate = turkeyDate(now);
  const age = (Date.parse(requestedDate) - Date.parse(rateDate)) / DAY_MS;
  if (!validDate(rateDate) || age < 0 || age > MAX_PUBLICATION_AGE_DAYS) throw new Error('Unusable TCMB publication date');
  const blocks = [...xml.matchAll(/<Currency\b([^>]*)>([\s\S]*?)<\/Currency>/g)]
    .filter(match => /\b(?:CurrencyCode|Kod)\s*=\s*["']USD["']/.test(match[1]));
  if (blocks.length !== 1 || attribute(blocks[0][1], 'CurrencyCode') !== 'USD' || attribute(blocks[0][1], 'Kod') !== 'USD') throw new Error('Invalid TCMB USD currency');
  if (element(blocks[0][2], 'Unit') !== '1') throw new Error('Invalid TCMB unit');
  const rawRate = element(blocks[0][2], 'ForexSelling');
  if (!/^\d+(?:\.\d{1,8})?$/.test(rawRate)) throw new Error('Invalid TCMB selling rate');
  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid TCMB selling rate');
  return Object.freeze({currency:'USD', baseCurrency:'TRY', rateType:'ForexSelling', rate, rateDate, requestedDate,
    fetchedAt:now.toISOString(), source:'TCMB', sourceUrl:TCMB_URL, isPreviousPublication:rateDate !== requestedDate});
}
async function boundedText(response) {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_BYTES || !response.body) throw new Error('Invalid TCMB body');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error('TCMB body too large');
      text += decoder.decode(value, {stream:true});
    }
    return text + decoder.decode();
  } finally { await reader.cancel().catch(() => {}); }
}
export function createTcmbRateService({ fetchImpl = fetch, now = () => new Date(), timeoutMs = 12_000 } = {}) {
  let cached = null, pending = null;
  async function getRate() {
    const current = now(), slot = cacheSlot(current);
    if (cached && cached.slot === slot && current.getTime() >= cached.at && current.getTime() - cached.at < CACHE_MS) return cached.rate;
    if (pending?.slot === slot) return pending.promise;
    const promise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // Workers does not support redirect:'error'; manual + non-2xx rejection never follows redirects.
        const response = await fetchImpl(TCMB_URL, {method:'GET', redirect:'manual', headers:{Accept:'application/xml'}, cache:'no-store', signal:controller.signal});
        if (!response.ok) throw new Error('TCMB unavailable ' + response.status);
        const xml = await boundedText(response), finished = now();
        // Refuse requests crossing the calendar day/publication boundary; retry explicitly.
        if (cacheSlot(finished) !== slot) throw new Error('TCMB request crossed publication boundary');
        const rate = parseTcmbXml(xml, finished);
        cached = {slot, at:finished.getTime(), rate};
        return rate;
      } finally { clearTimeout(timer); }
    })();
    pending = {slot, promise};
    try { return await promise; }
    finally { if (pending?.promise === promise) pending = null; }
  }
  return {getRate};
}
const service = createTcmbRateService();
export async function handleExchangeRate(request, rateService = service) {
  const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
  if (request.method !== 'GET') return new Response(JSON.stringify({error:'method_not_allowed'}), {status:405, headers:{...headers, Allow:'GET'}});
  // No user-controlled provider URLs, dates, credentials or currencies.
  if (new URL(request.url).search) return new Response(JSON.stringify({error:'invalid_query'}), {status:400, headers});
  try { return new Response(JSON.stringify(await rateService.getRate()), {headers}); }
  catch { return new Response(JSON.stringify({error:'tcmb_rate_unavailable', message:'TCMB USD döviz satış kuru şu anda doğrulanamıyor. Teklif oluşturulmadı; lütfen yeniden deneyin.'}), {status:503, headers}); }
}
