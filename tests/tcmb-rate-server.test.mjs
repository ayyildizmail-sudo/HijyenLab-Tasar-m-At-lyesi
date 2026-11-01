import test from 'node:test';
import assert from 'node:assert/strict';
import { TCMB_URL, turkeyDate, parseTcmbXml, createTcmbRateService, handleExchangeRate } from '../server/tcmb-rate-service.mjs';
// Synthetic fixtures only; no commercial fallback value is bundled in the service.
const xml = (date='30.10.2026', rate='49.1234') => `<?xml version="1.0"?><Tarih_Date Tarih="${date}" Date="${date.slice(3,5)}/${date.slice(0,2)}/${date.slice(6)}"><Currency Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit><ForexSelling>99</ForexSelling></Currency><Currency Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexBuying>48</ForexBuying><ForexSelling>${rate}</ForexSelling><BanknoteSelling>88</BanknoteSelling></Currency></Tarih_Date>`;
const sunday = new Date('2026-11-01T18:00:00Z');
const request = () => new Request('https://example.chatgpt.site/api/exchange-rate');
test('selects USD ForexSelling, not banknote/buying/EUR; preserves holiday publication date', () => {
  const r = parseTcmbXml(xml(), sunday);
  assert.equal(r.rate,49.1234); assert.equal(r.rateDate,'2026-10-30'); assert.equal(r.requestedDate,'2026-11-01');
  assert.equal(r.isPreviousPublication,true); assert.equal(r.sourceUrl,TCMB_URL); assert.equal(r.rateType,'ForexSelling'); assert.equal(r.fetchedAt,sunday.toISOString());
});
test('Istanbul calendar, same-day and before-publication semantics', () => {
  assert.equal(turkeyDate(new Date('2026-11-01T21:01:00Z')),'2026-11-02');
  assert.equal(parseTcmbXml(xml(),new Date('2026-10-30T13:00:00Z')).isPreviousPublication,false);
  assert.equal(parseTcmbXml(xml(),new Date('2026-11-02T10:00:00Z')).rateDate,'2026-10-30');
});
test('invalid, future, too-old dates, malformed/ambiguous values and entities fail closed', () => {
  for (const body of [xml('02.11.2026'),xml('31.02.2026'),xml('01.10.2026'),xml().replace('10/30/2026','10/29/2026'),xml().replace('<Unit>1</Unit><ForexBuying>','<Unit>100</Unit><ForexBuying>'),xml().replace('Kod="USD"','Kod="EUR"'),xml().replace('<ForexSelling>49.1234</ForexSelling>',''),xml().replace('</Tarih_Date>',''),xml().replace('</Currency></Tarih_Date>','<ForexSelling>3</ForexSelling></Currency></Tarih_Date>'),'<!DOCTYPE foo>'+xml(),xml()+ ' '.repeat(131073),...['0','-2','NaN','Infinity','49,1234','1e2',''].map(v=>xml('30.10.2026',v))]) assert.throws(()=>parseTcmbXml(body,sunday));
});
test('short cache and in-flight dedup use fixed HTTPS URL without sending visitor data', async () => {
  let count=0;
  const svc=createTcmbRateService({now:()=>sunday,fetchImpl:async (url,options)=>{count++;assert.equal(url,TCMB_URL);assert.equal(options.redirect,'manual');assert.deepEqual(options.headers,{Accept:'application/xml'});return new Response(xml());}});
  const rates=await Promise.all(Array.from({length:12},()=>svc.getRate()));
  assert.equal(count,1);assert.ok(rates.every(r=>r===rates[0]));await svc.getRate();assert.equal(count,1);
});
test('expired cache never becomes offline fallback; retry can recover', async () => {
  let now=sunday,count=0,offline=false;
  const svc=createTcmbRateService({now:()=>now,fetchImpl:async()=>{count++;if(offline)throw Error('offline');return new Response(xml());}});
  await svc.getRate();now=new Date(sunday.getTime()+300001);offline=true;await assert.rejects(svc.getRate());
  offline=false;await svc.getRate();assert.equal(count,3);
});
test('cache invalidates at Istanbul midnight and 15:30 publication boundary', async () => {
  for(const [before,after] of [['2026-11-01T20:59:00Z','2026-11-01T21:00:00Z'],['2026-11-02T12:29:00Z','2026-11-02T12:30:00Z']]) {
    let now=new Date(before),count=0;
    const svc=createTcmbRateService({now:()=>now,fetchImpl:async()=>{count++;return new Response(xml());}});
    await svc.getRate();now=new Date(after);assert.equal((await svc.getRate()).requestedDate,turkeyDate(now));assert.equal(count,2);
  }
});
test('network, status, redirect, oversize and timeout failures return honest 503 with no price', async()=>{
  const failures=[async()=>{throw Error('network');},async()=>new Response('down',{status:503}),async()=>new Response('',{status:302}),async()=>new Response(xml(),{headers:{'content-length':'999999'}}),async()=>new Response('x'.repeat(131073)),async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout'))))];
  for(const fetchImpl of failures){const svc=createTcmbRateService({now:()=>sunday,fetchImpl,timeoutMs:10});const r=await handleExchangeRate(request(),svc);assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();assert.equal(body.error,'tcmb_rate_unavailable');assert.equal(body.rate,undefined);}
});
test('handler returns snapshot, refuses mutations and ignores no arbitrary query',async()=>{
  const svc=createTcmbRateService({now:()=>sunday,fetchImpl:async()=>new Response(xml())});
  const response=await handleExchangeRate(request(),svc);assert.equal(response.status,200);assert.equal((await response.json()).source,'TCMB');
  assert.equal((await handleExchangeRate(new Request(request(),{method:'POST'}),svc)).status,405);
  assert.equal((await handleExchangeRate(new Request(request().url+'?url=https://evil.test'),svc)).status,400);
});
