/* CommonJS test harness. */
/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { create } = require('../frontend/journey-motion.js');
function harness(reduced = false) {
  const nodes = new Map(), animations = []; let serial = 0, copies = 0;
  function node(id) {
    const classes = new Set();
    const n = { id, children: [], hidden: false, style: {}, width: 1600, height: 850, getBoundingClientRect() { return {left:12,top:40,width:390,height:207}; }, getContext() { return { clearRect() {}, drawImage() { copies++; } }; }, remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(x => x !== this); this.removed = true; }, before(child) { this.parentElement?.append(child); }, after(child) { this.parentElement?.append(child); }, removeAttribute(key) { delete this[key]; }, replaceChildren(...items) { this.children = []; for (const child of items) this.append(child); }, querySelectorAll(selector) { return selector === '[id]' ? this.children.filter(x => x.id) : this.children; }, cloneNode() { const copy = node('clone'+(++serial)); copy.className = this.className; return copy; }, classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x), toggle(x, yes) { if (yes) classes.add(x); else classes.delete(x); } },
      setAttribute() {}, addEventListener() {}, closest() { return this.hidden ? this : null; }, contains() { return false; },
      querySelector(selector) { return this.children.find(n => selector === '.journeyFieldCheck' ? n.className === 'journeyFieldCheck' : n.className === 'fragranceIcon'); },
      append(child) { this.children.push(child); child.parentElement = this; },
      animate(frames, options) { const a = { frames, options, canceled: false, cancel() { this.canceled = true; this.oncancel?.(); } }; animations.push(a); return a; }
    }; nodes.set(id, n); return n;
  }
  for (const id of ['package','productSelect','rearTitle','rearBlankImage','rearEditor','quoteImage','finalDetails']) node(id);
  const doc = { body: node('body'), getElementById: id => nodes.get(id) || [...nodes.values()].find(n => n.id === id), createElement: () => node('generated'+(++serial)), querySelectorAll: () => [...nodes.values()].filter(n => n.classList.contains('is-valid')) };
  const media = { matches: reduced, addEventListener(type, fn) { this.change = fn; } };
  return { api: create(doc, media), doc, nodes, node, media, animations, copies: () => copies };
}
test('eight semantic responses are finite; repeated action replaces instead of queues', () => {
  const h = harness(); h.api.product(); h.api.product();
  assert.equal(h.animations.length, 4); assert.ok(h.animations[0].canceled && h.animations[1].canceled);
  h.api.logo(); h.api.background(); h.api.front(); h.api.rear();
  const fragrance = h.node('card'), icon = h.node('icon'); icon.className = 'fragranceIcon'; fragrance.append(icon); h.api.fragrance(fragrance);
  const parent = h.node('label'), input = h.node('input'); parent.append(input); h.api.slot(input); h.api.lead(input, true, true); h.api.quote({}, true);
  assert.ok(h.animations.every(a => a.options.duration >= 200 && a.options.duration <= 400 && a.options.iterations === 1));
  h.api.reset(); assert.ok(h.animations.every(a => a.canceled)); assert.equal(parent.querySelector('.journeyFieldCheck').classList.contains('is-valid'), false);
});
test('lead typing clears without animation; independent completion only', () => {
  const h = harness(), parent = h.node('label'), input = h.node('input'); parent.append(input); h.api.slot(input); h.api.slot(input);
  assert.equal(parent.children.length, 2); h.api.lead(input, false, true); assert.equal(h.animations.length, 0);
  h.api.lead(input, true, true); assert.equal(h.animations.length, 1); h.api.lead(input, true, true); assert.equal(h.animations.length, 1);
  h.api.lead(input, false, false); assert.equal(h.animations.length, 1); assert.ok(h.animations[0].canceled);
});
test('invalid quote never animates; same ready token once; invalidation cancels', () => {
  const h = harness(), token = {}; h.api.quote(token, false); h.api.quote(null, true); assert.equal(h.animations.length, 0);
  h.api.quote(token, true); h.api.quote(token, true); assert.equal(h.animations.length, 2);
  h.api.quote(null, false); assert.ok(h.animations.every(a => a.canceled)); h.api.quote({}, true); assert.equal(h.animations.length, 4);
});
test('reduced motion including live preference change, hidden targets and restoration', () => {
  const h = harness(true); h.api.product(); assert.equal(h.animations.length, 0);
  h.media.matches = false; h.api.logo(); h.media.matches = true; h.media.change(); assert.ok(h.animations[0].canceled);
  h.media.matches = false; h.api.suspend(true); h.api.product(); assert.equal(h.animations.length, 1);
  h.api.suspend(false); h.nodes.get('package').hidden = true; h.api.logo(); assert.equal(h.animations.length, 1);
});
test('all explicit hook paths exist; no observer, frame loop, pixel readback or network in motion', () => {
  const source = fs.readFileSync('frontend/journey-motion.js','utf8');
  assert.doesNotMatch(source, /MutationObserver|requestAnimationFrame|setInterval|getImageData|prepareLogo|fetch\(/);
  for (const [file, hook] of [['product-ui','product'],['processing-lifecycle','logo'],['app','background'],['rear-preview','front'],['rear-preview','rear'],['fragrance-ui','fragrance'],['app','lead'],['app','quote']]) assert.ok(fs.readFileSync('frontend/'+file+'.js','utf8').includes('HijyenLabJourneyMotion?.'+hook+'('), hook);
});

test('actual surface sweep copies once and rapid replacement/cancel/reduced motion remove overlays', () => {
  const h = harness(); h.api.beforeBackground(); assert.equal(h.copies(), 1); const old = h.doc.body.children[0];
  h.api.quote(null, false); assert.equal(old.removed, undefined, 'price invalidation during color refresh must not cancel surface');
  h.api.background(); assert.equal(h.animations.at(-1).frames[1].clipPath, 'inset(0 0 0 100%)');
  h.api.beforeBackground(); assert.equal(old.removed, true); assert.equal(h.copies(), 2); assert.equal(h.doc.body.children.length, 1);
  h.api.background(); h.api.cancelAll(); assert.equal(h.doc.body.children.length, 0);
  h.api.beforeBackground(); h.media.matches = true; h.media.change(); assert.equal(h.doc.body.children.length, 0);
  h.api.beforeBackground(); assert.equal(h.copies(), 3, 'reduced motion performs no copy');
});
test('ready-only real quote composition uses current sources and rows without duplicate IDs or totals', () => {
  const h = harness(), parent = h.node('summary'), front = h.node('finalImage'), details = h.nodes.get('finalDetails'), breakdown = h.node('breakdown'); parent.append(front); parent.append(details);
  const row = h.node('real-price-row'); row.className = 'priceRow'; breakdown.append(row); details.append(h.node('summary-total'));
  const total = h.node('real-total'); total.className = 'priceRow total'; breakdown.append(total);
  const data = {front:'current-front',rear:'current-rear',breakdown,vat:'KDV hariç'}; h.api.quote({}, false, data); assert.equal(h.doc.getElementById('journeyQuoteFaces'), undefined);
  const token = {}; h.api.quote(token, true, data); assert.equal(front.src, data.front); assert.equal(h.doc.getElementById('journeyQuoteRear').src, data.rear);
  const costs = h.doc.getElementById('journeyQuoteCosts'); assert.equal(costs.children.length, 2); assert.equal(costs.children.filter(row => row.className === 'priceRow total').length, 1); assert.equal(costs.children[0].id, undefined); assert.equal(h.doc.getElementById('journeyQuoteNote').textContent, 'KDV hariç');
  const count = h.animations.length; h.api.quote(token, true, data); assert.equal(h.animations.length, count);
  h.api.quote(null, false); assert.equal(costs.children.length, 0); assert.equal(h.doc.getElementById('journeyQuoteRear').src, undefined); assert.ok(h.animations.every(a => a.canceled));
});

test('color controls get a current aspect-fit preview and visible local sweep, without artwork recomputation', () => {
  const h = harness(), panel = h.node('bgPanel'), controls = h.node('backgrounds'); panel.open = true; panel.append(controls);
  const preview = h.api.colorPreview(); assert.equal(preview.width, 640); assert.equal(preview.height, 340); assert.equal(preview.style.visibility, 'visible');
  h.nodes.get('package').getBoundingClientRect = () => ({left:0,top:-500,width:390,height:207});
  preview.getBoundingClientRect = () => ({left:10,top:100,width:320,height:140});
  h.api.beforeBackground(); const surface = h.doc.body.children[0]; assert.equal(surface.style.top, '100px'); assert.equal(surface.width, 640);
  h.api.hideColorPreview(); assert.equal(preview.style.visibility, 'hidden'); h.api.background(); assert.equal(preview.style.visibility, 'visible');
  h.api.reset(); assert.equal(preview.style.visibility, 'hidden'); assert.equal(h.doc.body.children.length, 0);
});
test('CSS integration overrides legacy hidden front only in composition and keeps one optional JPEG', () => {
  const css = fs.readFileSync('frontend/journey-motion.css','utf8'), source = fs.readFileSync('frontend/journey-motion.js','utf8'), app = fs.readFileSync('frontend/app.js','utf8');
  assert.match(css, /#summary #journeyQuoteFaces #finalImage\{display:block\}/);
  assert.match(css, /#journeyQuoteFaces img\[hidden\]\{display:none\}/);
  assert.match(source, /disclosure.open = false/); assert.match(source, /querySelectorAll\('\.priceRow'\)/);
  assert.doesNotMatch(css, /#summary #finalDetails\s*\{display:block/);
  const refresh = app.slice(app.indexOf('function refresh(){'), app.indexOf('for(const [id,key,items]'));
  assert.match(refresh, /^function refresh\(\)\{reconcileSourceGroundScope\(\);containLogoPlacement\(\);syncQuantity\(\);/);
  assert.ok(refresh.indexOf('hideColorPreview()') > 0 && refresh.indexOf('hideColorPreview()') < refresh.indexOf('syncSimpleUI()'), 'stale auxiliary preview is hidden before UI synchronization and redraw');
  assert.ok(refresh.indexOf('hideColorPreview()') < refresh.indexOf('draw()'));
});
