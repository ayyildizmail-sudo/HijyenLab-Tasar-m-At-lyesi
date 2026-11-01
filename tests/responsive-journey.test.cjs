/* eslint-disable @typescript-eslint/no-require-imports */
// Execute the actual presentation controller. Native device geometry/keyboard QA is separate.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('frontend/responsive-journey.js', 'utf8');
let mutations = 0, focused = [], scrolled = [], frames = [], timeouts = [], observers = [], listeners = {}, mode = 'printed';
class Node {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null; this._hidden = false; this._text = ''; this.attrs = {}; this.classes = new Set(); this.classList = { toggle: (key, on) => { if (this.classes.has(key) !== on) { mutations++; if (on) this.classes.add(key); else this.classes.delete(key); } }, contains: key => this.classes.has(key) }; }
  set hidden(v) { if (this._hidden !== v) mutations++; this._hidden = v; } get hidden() { return this._hidden; }
  set textContent(v) { if (this._text !== v) mutations++; this._text = v; } get textContent() { return this._text; }
  append(...children) { for (const child of children) { if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1); child.parentElement = this; this.children.push(child); mutations++; } }
  before(node) { const parent = this.parentElement; parent.children.splice(parent.children.indexOf(this), 0, node); node.parentElement = parent; mutations++; }
  setAttribute(key, value) { this.attrs[key] = value; mutations++; } getAttribute(key) { return this.attrs[key]; }
  closest(selector) { if (selector === '[hidden]' && this.hidden) return this; return this.parentElement?.closest(selector) || null; }
  querySelector(selector) { const found = this.children.find(child => selector === 'summary' ? child.tagName === 'SUMMARY' : selector.includes('h1') && ['H1', 'H2'].includes(child.tagName)); return found || null; }
  addEventListener(type, fn) { (this.listeners ||= {})[type] = fn; }
  focus(options) { doc.activeElement = this; focused.push([this, options]); }
  scrollIntoView(options) { scrolled.push([this, options]); }
}
const main = new Node('main'), body = new Node('body'); body.append(main);
function find(node, id) { if (node.id === id) return node; for (const child of node.children) { const found = find(child, id); if (found) return found; } return null; }
function add(id, tag = 'div', parent = main) { const node = new Node(tag); node.id = id; parent.append(node); return node; }
const picker = add(''), select = add('productSelect', 'select', picker), radio = add('printMode', 'input', picker); radio.type = 'radio'; radio.checked = true;
let changes = 0; const productHandler = () => changes++; select.onchange = productHandler; select.value = 'BM12';
const panelIds = ['design', 'rearPreview', 'fragrancePanel', 'pricing', 'summary', 'pdfPicker', 'photoEditor', 'whiteCarrierPanel'];
for (const id of panelIds) { const panel = add(id, 'section'); panel.hidden = id !== 'design'; add(id + 'Heading', 'h1', panel); }
const error = add('uploadRecovery', 'section'); error.hidden = true;
const rearEditor = add('rearEditor', 'details', find(main, 'rearPreview')), rearSummary = add('rearEditorSummary', 'summary', rearEditor); add('rearEditorHeading', 'h2', rearEditor);
const field = add('rearInstagram', 'input', rearEditor); field.type = 'text'; field.value = 'Logo & yazı';
const state = {}, modeListeners = {}; let reduced = false, dialog = null;
const doc = { readyState: 'complete', activeElement: null, createElement: tag => new Node(tag), getElementById: id => find(body, id), querySelector: selector => selector === 'main' ? main : selector === '.productPicker' ? picker : selector === 'dialog[open]' ? dialog : null, addEventListener: (type, fn) => (listeners[type] ||= []).push(fn) };
const browser = { document: doc, selectedProductId: 'BM12', ProductCatalog: { defaultId: 'BM12', get: id => ({ label: id === 'BM12' ? '25 × 30 cm Rulo Islak Havlu' : '20 × 25 cm Katlı Islak Havlu' }) }, HijyenLabPrintMode: { get: () => mode }, MutationObserver: class { constructor(fn) { observers.push(fn); } observe() {} }, addEventListener: (type, fn) => { modeListeners[type] = fn; }, requestAnimationFrame: fn => frames.push(fn), setTimeout: fn => timeouts.push(fn), matchMedia: () => ({ matches: reduced }) };
vm.runInNewContext(source, { window: browser, state });
const api = browser.HijyenLabResponsiveJourney, get = id => doc.getElementById(id), sync = () => observers.forEach(fn => fn()), flush = () => { let limit = 300; while (frames.length) { assert(limit-- > 0, 'navigation settle is bounded'); const queue = frames; frames = []; queue.forEach(fn => fn()); } }, clearAttention = () => { doc.activeElement = null; focused = []; scrolled = []; };
function show(id) { for (const panel of panelIds) get(panel).hidden = panel !== id; api.enter(id); }
assert.equal(get('journeyProductSummary').hidden, true); assert.equal(picker.hidden, false); assert.equal(frames.length, 0, 'initial mount never scrolls');
assert.equal(get('productSelect'), select); assert.equal(select.onchange, productHandler); assert.equal(get('printMode'), radio); assert.equal(radio.checked, true);
const initialObservers = observers.length; api.mount(doc); assert.equal(observers.length, initialObservers); assert.equal(listeners.change.length, 2); assert.equal(listeners.input.length, 1, 'typing has only a pending-navigation cancellation listener');
state.logo = 'unchanged-source'; api.enter('design'); flush(); assert.equal(scrolled[0][0], get('designHeading')); assert.equal(focused[0][0].tagName, 'H1'); assert.equal(focused[0][1].preventScroll, true); assert.equal(picker.hidden, true); assert.equal(get('journeyProductSummary').hidden, false); assert.equal(get('journeyProductMode').textContent, 'Logolu / Baskılı');
clearAttention(); get('journeyProductChange').onclick(); assert.equal(picker.hidden, false); assert.equal(get('journeyProductChange').attrs['aria-expanded'], 'true'); assert.equal(get('journeyProductChange').attrs['aria-controls'], picker.id); assert.equal(changes, 0, 'disclosure never invokes product change or approval invalidation');
select.onchange(); assert.equal(changes, 1); get('journeyProductChange').onclick(); assert.equal(picker.hidden, true); assert.equal(select.value, 'BM12'); assert.equal(state.logo, 'unchanged-source'); assert.equal(frames.length, 0);
clearAttention(); for (const id of ['rearPreview', 'fragrancePanel', 'pricing', 'summary', 'pricing', 'pdfPicker', 'photoEditor', 'design', 'whiteCarrierPanel', 'design']) { show(id); flush(); assert.equal(scrolled.at(-1)[0], get(id + 'Heading'), id); }
assert.equal(scrolled.length, 10, 'same numeric step subpanels still navigate');
const attention = scrolled.length; api.enter('design'); sync(); flush(); assert.equal(scrolled.length, attention, 'repeat same actual panel is inert');
const stable = mutations; sync(); sync(); assert.equal(mutations, stable, 'observer converges; no DOM churn');
clearAttention(); show('rearPreview'); show('fragrancePanel'); flush(); assert.equal(scrolled.length, 1, 'newer navigation cancels older queued target'); assert.equal(scrolled[0][0], get('fragrancePanelHeading'));
clearAttention(); reduced = true; show('pricing'); flush(); assert.equal(scrolled[0][1].behavior, 'auto'); reduced = false;
clearAttention(); show('rearPreview'); doc.activeElement = field; flush(); assert.equal(scrolled.length, 0, 'typing wins over pending transition'); assert.equal(focused.length, 0); for (const text of ['x', 'İ', 'Logo & yazı']) { field.value = text; sync(); } assert.equal(field.value, 'Logo & yazı'); assert.equal(frames.length, 0);
error.hidden = false; api.reveal('uploadRecovery'); flush(); assert.equal(scrolled.length, 0, 'async error never steals typing focus');
clearAttention(); api.reveal('uploadRecovery'); flush(); assert.equal(scrolled[0][0], error); assert.equal(focused[0][0].tagName, 'SECTION');
clearAttention(); dialog = new Node('dialog'); show('pricing'); flush(); assert.equal(scrolled.length, 0, 'open modal owns attention'); dialog = null;
clearAttention(); api.reveal('uploadRecovery'); for (const id of panelIds) get(id).hidden = id !== 'fragrancePanel'; api.enter('fragrancePanel', { quiet: true }); flush(); assert.equal(scrolled.length, 0, 'automatic local fragrance resume records stage without stealing attention');
clearAttention(); show('pricing'); flush(); assert.equal(scrolled[0][0], get('pricingHeading'), 'later explicit transition works after quiet resume');
clearAttention(); mode = 'unprinted'; modeListeners['hijyenlab:print-mode-change'](); assert.equal(get('journeyProductMode').textContent, 'Baskısız'); browser.selectedProductId = 'BM545'; listeners.change.at(-1)(); assert.match(get('journeyProductName').textContent, /Katlı/); assert.equal(frames.length, 0, 'copy/mode updates never scroll'); assert.equal(changes, 1); assert.equal(field.value, 'Logo & yazı');
clearAttention(); show('rearPreview'); flush(); clearAttention();
rearEditor.open = true; rearSummary.listeners.click(); while (timeouts.length) timeouts.shift()(); flush(); assert.equal(scrolled[0][0], get('rearEditorHeading'), 'explicit rear disclosure reveals first work fields');
clearAttention(); rearEditor.open = false; sync(); rearEditor.open = true; sync(); flush(); assert.equal(scrolled.length, 0, 'scripted details open/recovery/typing never navigates');
rearSummary.listeners.click(); rearEditor.open = false; while (timeouts.length) timeouts.shift()(); flush(); assert.equal(scrolled.length, 0, 'quick disclosure close cancels reveal');
// Optional post-entry motion waits for actual navigation and cannot outlive user intent.
const singleFrame = () => { const queue = frames; frames = []; queue.forEach(fn => fn()); };
let results = []; clearAttention(); api.afterNavigation(ok => results.push(ok)); assert.deepEqual(results, [true], 'idle navigation resolves immediately');
results = []; doc.onscrollend = null; browser.scrollY = 0; show('pricing'); const unsubscribe = api.afterNavigation(ok => results.push(ok)); assert.deepEqual(results, [], 'entry is pending before first rAF'); singleFrame(); assert.deepEqual(results, [], 'heading focus alone is not settled');
for (let i = 1; i <= 8; i++) { browser.scrollY = i * 40; singleFrame(); } assert.deepEqual(results, [], 'moving viewport never releases optional animation');
listeners.scrollend[0]({ target: doc }); assert.deepEqual(results, [], 'native event alone cannot release a new scroll'); browser.scrollY += 40; singleFrame(); assert.deepEqual(results, [], 'motion after a stale scrollend invalidates that event'); listeners.scrollend[0]({ target: doc }); singleFrame(); assert.deepEqual(results, []); singleFrame(); assert.deepEqual(results, [true], 'current scrollend requires two stable frames'); unsubscribe(); flush(); assert.deepEqual(results, [true], 'settled callback fires once');
results = []; show('summary'); api.afterNavigation(ok => results.push(ok)); show('pricing'); assert.deepEqual(results, [false], 'newer navigation cancels old subscribers'); flush();
for (const type of ['pointerdown', 'keydown', 'input', 'change', 'wheel', 'touchstart']) { results = []; api.reveal('uploadRecovery'); api.afterNavigation(ok => results.push(ok)); listeners[type][0]({}); flush(); assert.deepEqual(results, [false], type + ' cancels pending entry without starting new scrolling'); }
results = []; api.reveal('uploadRecovery'); api.afterNavigation(ok => results.push(ok)); doc.hidden = true; listeners.visibilitychange[0](); flush(); assert.deepEqual(results, [false]); doc.hidden = false;
results = []; api.reveal('uploadRecovery'); const removeWaiting = api.afterNavigation(ok => results.push(ok)); removeWaiting(); flush(); assert.deepEqual(results, [], 'unsubscribe drops optional animation');
delete doc.onscrollend; results = []; api.reveal('uploadRecovery'); api.afterNavigation(ok => results.push(ok)); singleFrame(); assert.deepEqual(results, []); flush(); assert.deepEqual(results, [true], 'unsupported/no-op navigation resolves from stable positions');
results = []; api.reveal('uploadRecovery'); api.afterNavigation(ok => results.push(ok)); singleFrame(); for (let i = 0; i < 120; i++) { browser.scrollY += 2; singleFrame(); } assert.deepEqual(results, [false], 'continuously moving viewport has bounded cancel, never falsely settled'); assert.equal(frames.length, 0);
const css = fs.readFileSync('frontend/responsive-journey.css', 'utf8');
assert.match(css, /photoCompare > div:nth-child\(2\) \{ min-height: 0/); assert.match(css, /max-height: min\(230px, 42svh\)/); assert.match(css, /object-fit: contain/); assert.match(css, /max-height: 600px/); assert.match(css, /--customer-decoration/);
assert(!/cloneNode|innerHTML|selectProduct\(|setPrintMode\(|\.value\s*=|\.checked\s*=|fetch\(|localStorage/.test(source), 'presentation has no design/control/consent mutation');
const app = fs.readFileSync('frontend/app.js', 'utf8'), rear = fs.readFileSync('frontend/rear-preview.js', 'utf8'), fragrance = fs.readFileSync('frontend/fragrance-ui.js', 'utf8');
for (const text of [app, rear, fragrance]) assert(!/scrollTo\(\{top:0/.test(text), 'supported main panels do not return to document top');
for (const id of ['pdfPicker', 'photoEditor']) assert(app.includes("HijyenLabResponsiveJourney?.enter('" + id + "')"));
assert(rear.includes("HijyenLabResponsiveJourney?.enter('rearPreview')")); assert(fragrance.includes("HijyenLabResponsiveJourney?.enter('fragrancePanel')"));
assert(app.includes("HijyenLabResponsiveJourney?.enter(['design','pricing','summary'][n-1])"));
assert(fs.readFileSync('frontend/experience-ui.js', 'utf8').includes("HijyenLabResponsiveJourney?.reveal('uploadRecovery')"));
console.log('PASS responsive journey: real controls/guards retained, initial vs compact layout, accessible disclosure, all panel entries and same-step returns, no typing/observer navigation, reduced motion, modal/newer-entry cancellation, responsive non-cropping CSS. Browser/device geometry NOT_RUN.');
