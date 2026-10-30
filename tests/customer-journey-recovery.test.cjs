/* CommonJS test harness. */
/* eslint-disable @typescript-eslint/no-require-imports */
/* Actual quote renderer + UI status/retry helpers, with controlled asynchronous assets. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('frontend/app.js','utf8');
const fixture=fs.readFileSync('tests/v27-independent-commercial-renderer.test.cjs','utf8');
const fixtureContext={require,__dirname};vm.createContext(fixtureContext);
vm.runInContext(fixture.slice(0,fixture.indexOf('async function test('))+'\nglobalThis.getSetup=setup;',fixtureContext);
function setup(){const h=fixtureContext.getSetup();h.note={setAttribute(){}};h.el('summary').querySelector=()=>h.note;
vm.runInContext(source.slice(source.indexOf('function setQuotePreviewState('),source.indexOf('async function renderQuote(){')),h.c);
vm.runInContext(source.slice(source.indexOf('function invalidateQuote(){'),source.indexOf('function syncLeadGate(){')),h.c);return h;}
(async()=>{
let h=setup(),job=h.c.renderQuoteSafely();assert.match(h.note.textContent,/hazırlanıyor/);assert(h.el('downloadQuote').disabled);assert(h.el('retryQuotePreview').hidden);
h.waits[0].reject(Error('missing asset'));await job;assert.match(h.note.textContent,/oluşturulamadı/);assert(!h.el('retryQuotePreview').hidden);assert(!h.el('quoteImage').src);
job=h.c.renderQuoteSafely();h.waits[1].resolve({width:100,height:50});await job;assert.match(h.note.textContent,/hazır\./);assert(!h.el('downloadQuote').disabled);assert(h.el('quoteImage').src);
// Changing quantity invalidates the old image and an older delayed failure cannot replace new success.
const old=h.c.renderQuoteSafely();h.el('qty').value='20000';h.c.latest={...h.c.latest,base:6600000,subtotal:7300000};h.c.invalidateQuote();assert(!h.el('quoteImage').src);assert(h.el('downloadQuote').disabled);
const fresh=h.c.renderQuoteSafely();h.waits[3].resolve({width:100,height:50});await fresh;const published=h.el('quoteImage').src;h.waits[2].reject(Error('old failure'));await old;assert.equal(h.el('quoteImage').src,published);assert.match(h.note.textContent,/hazır\./);assert(h.drawn.flat().some(t=>String(t).includes('20000 adet')));
// Generic canvas/render exceptions have a retry path too.
h=setup();h.c.renderQuote=async()=>{throw Error('canvas failure')};await h.c.renderQuoteSafely();assert.match(h.note.textContent,/oluşturulamadı/);assert(!h.el('retryQuotePreview').hidden);
// Price edit and retry call the existing guarded route; no direct bypass or sending.
const buttons=[],nodes={};const context={$:id=>nodes[id]||(nodes[id]={before(b){buttons.push(b)}}),document:{createElement:()=>({})},setQuotePreviewState(){},go:n=>context.route=n};vm.createContext(context);vm.runInContext(source.slice(source.indexOf('(function installQuoteRecovery(){'),source.indexOf('// A bounded screenshot-chrome detector')),context);buttons.find(b=>b.id==='editQuoteDetails').onclick();assert.equal(context.route,2);buttons.find(b=>b.id==='retryQuotePreview').onclick();assert.equal(context.route,3);
console.log('PASS journey recovery: pending/error/retry/ready, stale render failure, new quantity JPEG, generic exception, guarded price edit/retry routes.');
})().catch(e=>{console.error(e);process.exitCode=1});
