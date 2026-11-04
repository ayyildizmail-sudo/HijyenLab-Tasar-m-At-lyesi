import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../frontend/focus-guidance.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../frontend/focus-guidance.css', import.meta.url), 'utf8');
function fixture({ engaged = true } = {}) {
  let writes = 0;
  const queues = [], observers = [], listeners = new Map();
  function simple(node, selector) {
    if (!node) return false;
    if (selector === '*') return true;
    const nth = selector.match(/:nth-of-type\((\d)\)/), first = selector.includes(':first-of-type');
    selector = selector.replace(/:nth-of-type\(\d\)|:first-of-type/g, '');
    if (nth || first) {
      const siblings = node.parentElement?.children.filter(s => s.tagName === node.tagName) || [];
      if (siblings.indexOf(node) !== (nth ? Number(nth[1]) - 1 : 0)) return false;
    }
    const tag = selector.match(/^[a-z]+/i)?.[0]; if (tag && node.tagName !== tag.toUpperCase()) return false;
    const id = selector.match(/#([\w-]+)/)?.[1]; if (id && node.id !== id) return false;
    for (const c of selector.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(c[1])) return false;
    for (const a of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) if (!node.hasAttribute(a[1]) || (a[2] !== undefined && node.getAttribute(a[1]) !== a[2])) return false;
    return true;
  }
  function matches(node, selector) {
    return selector.split(',').some(part => {
      const pieces = part.trim().replace(/\s*>\s*/g, '>').split(/(>|\s+)/).filter(Boolean).map(s => /^\s+$/.test(s) ? ' ' : s);
      let current = node, i = pieces.length - 1;
      if (!simple(current, pieces[i--])) return false;
      while (i >= 0) {
        const combinator = pieces[i--], target = pieces[i--];
        if (combinator === '>') { current = current.parentElement; if (!simple(current, target)) return false; }
        else { current = current.parentElement; while (current && !simple(current, target)) current = current.parentElement; if (!current) return false; }
      }
      return true;
    });
  }
  function mutation(node, type, attributeName) {
    for (const o of observers) if (o.targets.some(([target, opts]) => target === node && (type === 'childList' ? opts.childList : opts.attributes && opts.attributeFilter.includes(attributeName)))) o.records.push({ target: node, type, attributeName });
  }
  class Node {
    constructor(tag, id = '', classes = '') {
      this.tagName = tag.toUpperCase(); this.id = id; this.attrs = new Map(); this.children = []; this.parentElement = null; this.ownerDocument = doc;
      const classesSet = new Set(classes.split(' ').filter(Boolean));
      this.classList = { contains: c => classesSet.has(c), add: c => { if (!classesSet.has(c)) { classesSet.add(c); mutation(this, 'attributes', 'class'); } }, remove: c => { if (classesSet.delete(c)) mutation(this, 'attributes', 'class'); } };
      const styles = new Map(); this.style = { getPropertyValue: key => styles.get(key) || '', setProperty: (key, value) => { writes++; styles.set(key, value); } };
      this.type = 'text'; this.value = ''; this.checked = false; this.disabled = false;
    }
    get hidden() { return this.hasAttribute('hidden'); } set hidden(v) { if (v) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
    get open() { return this.hasAttribute('open'); } set open(v) { if (v) this.setAttribute('open', ''); else this.removeAttribute('open'); }
    get isConnected() { return this === doc.body || !!this.parentElement?.isConnected; }
    append(...nodes) { for (const n of nodes) { n.parentElement = this; this.children.push(n); } mutation(this, 'childList'); }
    setAttribute(key, value) { if (this.attrs.get(key) === value) return; writes++; this.attrs.set(key, value); mutation(this, 'attributes', key); }
    getAttribute(key) { return this.attrs.get(key) ?? null; }
    hasAttribute(key) { return this.attrs.has(key); }
    removeAttribute(key) { if (!this.attrs.has(key)) return; writes++; this.attrs.delete(key); mutation(this, 'attributes', key); }
    contains(node) { return !!node && (node === this || this.children.some(n => n.contains(node))); }
    matches(selector) { return matches(this, selector); }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
    querySelectorAll(selector) { const nodes = []; const visit = n => { for (const c of n.children) { if (c.matches(selector)) nodes.push(c); visit(c); } }; visit(this); return nodes; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, fn) { const k = this.id + ':' + type; if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); }
    removeEventListener(type, fn) { const k = this.id + ':' + type; listeners.set(k, (listeners.get(k) || []).filter(f => f !== fn)); }
  }
  const doc = { activeElement: null, readyState: 'complete', id: 'document',
    querySelectorAll: selector => doc.body.querySelectorAll(selector),
    querySelector: selector => doc.body.querySelector(selector),
    getElementById: id => doc.body.querySelector('#' + id),
    addEventListener(type, fn, opts) { (listeners.get(type) || listeners.set(type, []).get(type)).push({ fn, opts }); },
    removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).filter(e => e.fn !== fn)); }
  };
  doc.body = new Node('body');
  const add = (tag, id = '', parent = doc.body, classes = '') => { const n = new Node(tag, id, classes); parent.append(n); return n; };
  const main = add('main', 'main'); main.classList.add('welcomeEmpty');
  main.style.setProperty('--customer-decoration', '#b58a43');
  const intro = add('section', 'welcomeIntro', main); add('h1', 'welcomeTitle', intro); add('p', '', intro, 'welcomeDescription');
  const productContext = add('section', 'journeyProductContext', main), productSummary = add('div', 'journeyProductSummary', productContext);
  const description = add('p', 'journeyProductDescription', productSummary); add('strong', 'journeyProductName', description);
  add('button', 'journeyProductChange', productSummary);
  const picker = add('section', 'journeyProductControls', productContext, 'productPicker'); add('select', 'productSelect', picker);
  const modes = add('fieldset', '', picker, 'printModePicker'); add('input', 'printMode', modes).type = 'radio';
  const panels = {};
  for (const id of ['design', 'rearPreview', 'fragrancePanel', 'pricing', 'summary', 'pdfPicker', 'photoEditor', 'whiteCarrierPanel', 'brandRegionPanel']) { panels[id] = add('section', id, main); panels[id].hidden = id !== 'design'; add('h1', id + 'Heading', panels[id]); }
  const work = add('div', 'workspace', panels.design, 'workspace'), visual = add('div', '', work, 'visualSide');
  const logoPanel = add('section', 'logoDesignPanel', panels.design); logoPanel.hidden = true; add('h2', 'logoDesignTitle', logoPanel);
  const logoGroup = add('div', 'logoDesignInputGroup', logoPanel); add('label', 'logoDesignLabel', logoGroup); add('input', 'logoDesignInput', logoGroup);
  const logoOptional = add('details', 'logoDesignOptional', logoPanel); add('summary', 'logoDesignOptionalSummary', logoOptional); add('input', 'logoDesignWish', logoOptional);
  const logoMessage=add('p','logoDesignMessage',logoPanel);logoMessage.setAttribute('role','status');
  const logoChoices = add('div', 'logoDesignChoices', logoPanel);
  for (const id of ['name', 'symbol', 'badge']) { const card = add('article', '', logoChoices, 'logoDesignCard'); add('canvas', 'logoDesignCanvas-' + id, card); add('button', 'logoDesignChoose-' + id, card); }
  add('button', 'logoDesignCancel', logoPanel);
  const textPanel = add('section', 'textDesignPanel', panels.design); textPanel.hidden = true; add('h2', 'textDesignTitle', textPanel);
  const textInputGroup = add('div', 'textDesignInputGroup', textPanel); add('label', 'textDesignLabel', textInputGroup); add('input', 'textDesignInput', textInputGroup);
  const textMessage = add('p', 'textDesignMessage', textPanel); textMessage.setAttribute('role', 'status');
  const textChoices = add('div', 'textDesignChoices', textPanel);
  for (const id of ['simple', 'elegant', 'strong']) { const card = add('article', '', textChoices, 'textDesignCard'); add('canvas', 'textDesignCanvas-' + id, card); add('button', 'textDesignChoose-' + id, card); }
  add('button', 'textDesignCancel', textPanel);
  const preview = add('div', '', visual, 'preview'); add('canvas', 'package', preview);
  const action = add('div', '', visual, 'simplePrimary'); add('label', 'focusUpload', action); add('button', 'next', action);
  const noLogo = add('details', 'personaNoLogo', visual); add('summary', 'declarationSummary', noLogo);
  const declaration = add('div', 'declarationPanel', noLogo); add('button', 'declarationContinue', declaration);
  const edit = add('div', '', work, 'editSide'); edit.hidden = true; add('button', 'editClose', edit);
  for (const [id, input] of [['logoPanel', 'size'], ['bgPanel', 'bgPantone'], ['', 'text']]) { const panel = add('details', id, edit, 'editPanel'); add('summary', id + 'Summary', panel); add('input', input, panel); }
  add('section', 'frontMultiLogos', visual);
  const frontDetails = add('details', 'simpleDetails', visual); add('summary', 'frontDetailsSummary', frontDetails); add('button', 'download', frontDetails);
  const recovery = add('section', 'referenceRecovery', panels.design); recovery.hidden = true; add('button', 'recoveryStart', recovery);
  const rearEditor = add('details', 'rearEditor', panels.rearPreview); add('summary', 'rearSummary', rearEditor); add('h2', 'rearContactHeading', rearEditor);
  const rearFields = add('div', '', rearEditor, 'rearFieldGrid'); add('input', 'rearInstagram', rearFields); add('input', 'rearPhone', rearFields);
  const optional = add('details', '', rearEditor, 'rearOptional'); add('summary', 'rearExtraSummary', optional); add('input', 'rearExtra', optional);
  const advanced = add('details', 'rearAdvancedOptions', rearEditor); add('summary', 'rearAdvancedSummary', advanced);
  const sponsor = add('details', '', advanced, 'rearOptional'); add('summary', 'sponsorSummary', sponsor); add('input', 'rearSponsorUpload', sponsor).type = 'file';
  const region = add('section', 'rearSponsorRegionPanel', sponsor); add('input', 'rearRegionLeft', region).type = 'number';
  const sponsorReview = add('div', 'rearSponsorReview', sponsor); add('button', 'acceptRearSponsor', sponsorReview);
  const multi = add('section', 'rearMultiLogos', sponsor); add('input', 'logoScale', multi).type = 'range';
  const qr = add('div', 'rearQrFields', advanced); add('input', 'rearQrUrl', qr).type = 'url';
  const cards = add('div', 'fragranceCards', panels.fragrancePanel); cards.setAttribute('role', 'radiogroup');
  for (const id of ['flambau', 'green_tea', 'bodrum_mandarin', 'lemon']) { const label = add('label', '', cards, 'fragranceCard'); const radio = add('input', id, label); radio.type = 'radio'; add('span', id + 'Text', label); }
  const lead = add('section', 'leadFields', panels.pricing); add('h2', 'leadTitle', lead);
  for (const id of ['customerName', 'contactName', 'contactPhone']) { const label = add('label', '', lead); add('input', id, label); }
  const error = add('p', 'leadError', lead); error.setAttribute('role', 'alert'); error.hidden = true;
  const settings = add('article', '', panels.pricing); const fields = add('div', '', settings, 'fields'); for (const id of ['qty', 'cartonQty', 'province', 'district']) add(id.includes('Qty') || id === 'qty' ? 'input' : 'select', id, fields);
  const technical = add('details', '', settings, 'simpleTechnical'); add('summary', 'technicalSummary', technical); add('select', 'inks', technical);
  const price = add('article', '', panels.pricing); add('h2', 'priceTitle', price); add('div', 'breakdown', price);
  const summaryArticle = add('article', '', panels.summary); add('img', 'finalImage', summaryArticle); add('div', 'finalDetails', summaryArticle); add('button', 'downloadQuote', summaryArticle);
  const discussion = add('div', 'summaryDiscussion', panels.summary); add('button', 'discussDesign', discussion); add('button', 'summaryBack', panels.summary);
  const help = add('section', 'contactHelp', main); add('button', 'contactWhatsApp', help);
  const draft = add('details', 'welcomeDraftOptions', main); add('summary', 'draftSummary', draft); const draftPanel = add('section', 'draftPanel', draft); add('input', 'draftConsent', draftPanel).type = 'checkbox';
  const uploadRecovery = add('section', 'uploadRecovery', main); uploadRecovery.hidden = true;
  const helpDialog = add('dialog', 'contactHelpDialog'); add('textarea', 'contactMessage', helpDialog); add('button', 'helpClose', helpDialog);
  const advisor = add('dialog', 'productAdvisorDialog'); add('select', 'productAdvisorCategory', advisor); add('textarea', 'productAdvisorRequest', advisor);
  const browser = { document: doc, queueMicrotask: fn => queues.push(fn), MutationObserver: class { constructor(callback) { this.callback = callback; this.targets = []; this.records = []; observers.push(this); } observe(n, opts) { this.targets.push([n, opts]); } disconnect() { this.targets = []; } } };
  const context = { window: browser, module: { exports: {} }, Promise };
  vm.runInNewContext(source, context); const model = context.module.exports, controller = model.mount(doc);
  function flush() { let count = 0; while (queues.length || observers.some(o => o.records.length)) { assert(++count < 30, 'observers settle without recursion'); for (const o of observers) if (o.records.length) { const records = o.records.splice(0); o.callback(records); } while (queues.length) queues.shift()(); } }
  function dispatch(type, target, extra = {}) { if (type === 'focusin') doc.activeElement = target; for (const { fn } of listeners.get(type) || []) fn({ type, target, isTrusted: true, ...extra }); }
  function show(id) { doc.activeElement = null; for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== id; main.classList.remove('welcomeEmpty'); picker.hidden = true; flush(); }
  function focus(id) { const node = typeof id === 'string' ? doc.getElementById(id) : id; dispatch('focusin', node); return node; }
  flush();
  if (engaged) dispatch('pointerdown', doc.getElementById('productSelect'));
  return { doc, main, model, controller, panels, picker, description, action, visual, edit, rearEditor, sponsor, advanced, optional, lead, fields, error, helpDialog, advisor, rearFields, declaration, recovery, add, focus, dispatch, show, flush, observers, listeners, writes: () => writes };
}

test('cold opening stays entirely clear through sync, hover, defaults and programmatic focus', () => {
  const f = fixture({ engaged: false });
  const clear = () => {
    assert.equal(f.controller.getActiveGroup(), null);
    assert.equal(f.doc.querySelectorAll('[data-focus-active]').length, 0);
    assert.equal(f.doc.querySelectorAll('[data-focus-passive]').length, 0);
  };
  clear();
  for (let i = 0; i < 3; i++) {
    f.controller.sync(); f.flush();
    f.dispatch('pointerover', f.doc.getElementById('productSelect'));
    f.focus('productSelect'); // native focus() can produce trusted focusin
    f.dispatch('change', f.doc.getElementById('productSelect'), { isTrusted: false });
    f.dispatch('pointerdown', f.main); clear();
  }
  f.helpDialog.open = true; f.focus('contactMessage'); f.flush(); clear();
  assert.match(css, /dialog\[data-focus-group\]\[data-focus-active\]\[open\]/);
});

test('trusted press, typing, selection and keyboard navigation each start real guidance', () => {
  for (const type of ['pointerdown', 'input', 'change']) {
    const f = fixture({ engaged: false }), control = f.doc.getElementById('productSelect');
    f.dispatch(type, control, { isTrusted: false }); assert.equal(f.controller.getActiveGroup(), null);
    f.dispatch(type, control); assert.equal(f.controller.getActiveGroup(), 'product', type);
    assert.equal(f.doc.getElementById('welcomeIntro').hasAttribute('data-focus-passive'), true);
    assert.equal(control.hasAttribute('data-focus-passive'), false);
  }
  const f = fixture({ engaged: false });
  f.dispatch('keydown', f.doc.body, { key: 'Tab' });
  assert.equal(f.controller.getActiveGroup(), null);
  f.focus('productSelect'); assert.equal(f.controller.getActiveGroup(), 'product');
});

test('restored stage is initially clear; returning to blank welcome resets intent', () => {
  const f = fixture({ engaged: false });
  f.show('pricing'); f.focus('contactName'); f.controller.sync();
  assert.equal(f.controller.getActiveGroup(), null, 'restored/programmatic stage is not user intent');
  f.dispatch('input', f.doc.getElementById('contactName'));
  assert.equal(f.controller.getActiveGroup(), 'quote-contact');
  f.show('design');
  f.main.classList.add('welcomeEmpty'); f.picker.hidden = false; f.flush();
  assert.equal(f.controller.getActiveGroup(), null);
  assert.equal(f.doc.querySelectorAll('[data-focus-passive]').length, 0);
  f.focus('productSelect'); f.dispatch('pointerover', f.doc.getElementById('focusUpload')); f.controller.sync();
  assert.equal(f.controller.getActiveGroup(), null, 'reset is stable through focus/hover/sync');
  f.dispatch('change', f.doc.getElementById('productSelect'));
  assert.equal(f.controller.getActiveGroup(), 'product');
});

test('initial product, upload, declaration and all stage defaults use the real existing groups', () => {
  const f = fixture(), { controller: c } = f;
  assert.equal(c.getActiveGroup(), 'product');
  assert.equal(f.description.hasAttribute('data-focus-passive'), false);
  f.dispatch('pointerdown', f.doc.getElementById('focusUpload')); assert.equal(c.getActiveGroup(), 'upload', 'first tap promotes before target handler');
  const noLogo = f.doc.getElementById('personaNoLogo'); noLogo.open = true; f.flush(); f.focus('declarationContinue'); assert.equal(c.getActiveGroup(), 'declaration-choices');
  for (const [stage, group] of [['pdfPicker','pdf'], ['photoEditor','photo'], ['whiteCarrierPanel','source-review'], ['rearPreview','rear'], ['fragrancePanel','fragrance'], ['pricing','quote-contact'], ['summary','summary-download']]) { f.show(stage); assert.equal(c.getActiveGroup(), group, stage); f.focus(stage + 'Heading'); assert.equal(c.getActiveGroup(), group, 'native heading focus retains useful panel'); }
  assert.equal(f.model.mount(f.doc), c, 'mount is idempotent');
});

test('front edits, native disclosures and CSS-hidden reference recovery stay correctly owned', () => {
  const f = fixture(); f.show('design'); assert.equal(f.controller.getActiveGroup(), 'front-review');
  for (const [id, field, expected] of [['logoPanel', 'size', 'front-logo'], ['bgPanel', 'bgPantone', 'front-background'], ['', 'text', 'front-text']]) {
    f.doc.activeElement = null; f.edit.hidden = false; const panel = id ? f.doc.getElementById(id) : f.doc.getElementById(field).closest('details');
    for (const n of f.edit.querySelectorAll('details')) n.open = n === panel; f.flush(); f.focus(field); assert.equal(f.controller.getActiveGroup(), expected);
  }
  f.doc.activeElement = null; f.edit.hidden = true; f.flush(); assert.equal(f.controller.getActiveGroup(), 'front-review');
  const details = f.doc.getElementById('simpleDetails'); assert.equal(details.open, false);
  f.focus('frontDetailsSummary'); assert.equal(f.model.visible(f.doc.getElementById('frontDetailsSummary')), true); assert.equal(f.controller.getActiveGroup(), 'front-details');
  assert.equal(f.model.visible(f.doc.getElementById('download')), false, 'closed details hide content but not summary');
  f.doc.activeElement = null; f.doc.body.classList.add('referenceRecoveryActive'); f.recovery.hidden = false; f.flush();
  assert.equal(f.controller.getActiveGroup(), 'source-recovery'); assert.equal(f.model.visible(f.visual), false);
});

test('rear contact, text, sponsor region/review, extra logos and QR switch before interaction', () => {
  const f = fixture(); f.show('rearPreview'); f.rearEditor.open = true; f.advanced.open = true; f.sponsor.open = true; f.optional.open = true; f.flush();
  for (const [id, expected] of [['rearInstagram','rear-contact'], ['rearExtra','rear-optional'], ['rearSponsorUpload','rear-sponsor'], ['rearRegionLeft','rear-region'], ['acceptRearSponsor','rear-sponsor-review'], ['logoScale','rear-extra-logos'], ['rearQrUrl','rear-qr']]) {
    f.dispatch('pointerdown', f.doc.getElementById(id)); assert.equal(f.controller.getActiveGroup(), expected); f.focus(id); assert.equal(f.controller.getActiveGroup(), expected);
  }
  const stable = f.doc.getElementById('rearMultiLogos'); const replacement = f.add('input', 'replacementRange', stable); replacement.type = 'range';
  f.focus(replacement); assert.equal(f.controller.getActiveGroup(), 'rear-extra-logos', 'new row controls inherit stable owner');
});

test('typing after intent is inert: no queued work, no value changes or repeated frame writes', () => {
  const f = fixture(); f.show('pricing'); const input = f.focus('contactName');
  const before = f.writes();
  for (const value of ['A','Ad','Adı','İşletme & e-posta','😀İŞLETME']) { input.value = value; f.dispatch('input', input); f.dispatch('pointerover', input); f.flush(); assert.equal(input.value, value); }
  assert.equal(f.writes(), before); assert.equal(f.listeners.has('pointermove'), false);
  f.dispatch('pointerover', f.description); assert.equal(f.controller.getActiveGroup(), 'quote-contact', 'a drifting mouse never steals the writing frame'); assert.equal(f.writes(), before);
  f.error.hidden = false; f.flush(); assert.equal(f.controller.getActiveGroup(), 'quote-contact'); assert.equal(f.writes(), before + 1, 'unobserved validation leaves have no guidance work');
  f.doc.activeElement = null; f.focus('province'); assert.equal(f.controller.getActiveGroup(), 'quote-settings'); assert.equal(f.doc.getElementById('province').disabled, false);
  for (const observer of f.observers) for (const [, options] of observer.targets) assert.notEqual(options.subtree, true, 'no whole-tree typing/characterData observation');
});

test('asynchronous optional eligibility cannot steal review or upload attention', () => {
  const f = fixture(); f.show('design');
  const extras = f.doc.getElementById('frontMultiLogos'); extras.hidden = true; f.flush();
  f.dispatch('pointerdown', f.doc.getElementById('focusUpload')); assert.equal(f.controller.getActiveGroup(), 'upload');
  extras.hidden = false; f.flush(); assert.equal(f.controller.getActiveGroup(), 'upload');
  const compare = f.add('details', 'flexoProposalNote', f.visual); compare.hidden = true; f.controller.sync(); f.flush();
  compare.hidden = false; f.flush(); assert.equal(f.controller.getActiveGroup(), 'upload', 'new optional comparison stays passive');
  f.main.classList.add('welcomeEmpty'); f.picker.hidden = false; f.doc.activeElement = null; f.flush();
  f.dispatch('pointerdown', f.doc.getElementById('focusUpload'));
  f.main.classList.remove('welcomeEmpty'); f.picker.hidden = true; extras.hidden = true; f.flush();
  assert.equal(f.controller.getActiveGroup(), 'front-review', 'completed opening enters actual appearance review');
});

test('text-only entry and three style previews share guidance without per-key work or hidden legacy owners', () => {
  const f = fixture(); f.show('design'); const panel = f.doc.getElementById('textDesignPanel');
  f.doc.body.classList.add('textDesignEditing'); f.doc.body.classList.add('textDesignSource'); panel.hidden = false; f.flush();
  assert.equal(f.controller.getActiveGroup(), 'text-entry'); assert.equal(f.model.visible(f.visual), false, 'CSS-hidden legacy preview cannot own attention');
  assert.equal(f.model.visible(f.doc.getElementById('logoPanel')), false);
  f.focus('textDesignTitle'); assert.equal(f.controller.getActiveGroup(), 'text-entry', 'native heading reveal retains entry group');
  const input = f.focus('textDesignInput'), before = f.writes();
  for (const value of ['İ', 'İŞ', 'İŞLETMEM', '', 'İŞLETMEM & Çay']) { input.value = value; f.dispatch('input', input); f.dispatch('pointerover', f.doc.getElementById('textDesignChoose-simple')); f.flush(); assert.equal(f.controller.getActiveGroup(), 'text-entry'); assert.equal(input.value, value); }
  assert.equal(f.writes(), before, 'preview typing produces zero guidance writes');
  for (const id of ['simple', 'elegant', 'strong']) { const button = f.doc.getElementById('textDesignChoose-' + id); f.dispatch('pointerdown', button); assert.equal(f.controller.getActiveGroup(), 'text-style', 'first press promotes complete comparison'); f.focus(button); assert.equal(button.disabled, false); assert.equal(f.doc.getElementById('textDesignCanvas-' + id).hasAttribute('data-focus-passive'), false); }
  assert.equal(f.doc.getElementById('textDesignMessage').hasAttribute('data-focus-passive'), false, 'validation stays clear');
  f.focus('textDesignCancel'); assert.equal(f.controller.getActiveGroup(), 'text-create');
  f.doc.activeElement = null; f.doc.body.classList.remove('textDesignEditing'); panel.hidden = true; f.flush(); assert.equal(f.controller.getActiveGroup(), 'front-review', 'selected text source returns to real appearance review');
  const html = fs.readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8');
  assert(html.indexOf('src="text-design-ui.js') < html.indexOf('src="focus-guidance.js'), 'initial text nodes exist before focus mount; no per-input rediscovery hook');
});

test('local-logo name and three real style previews share guidance without per-key work or hidden legacy owners', () => {
  const f = fixture(); f.show('design'); const panel = f.doc.getElementById('logoDesignPanel');
  f.doc.body.classList.add('logoDesignEditing'); f.doc.body.classList.add('logoDesignSource'); panel.hidden = false; f.flush();
  assert.equal(f.controller.getActiveGroup(), 'logo-entry'); assert.equal(f.model.visible(f.visual), false, 'CSS-hidden legacy preview cannot own attention');
  assert.equal(f.model.visible(f.doc.getElementById('logoPanel')), false);
  f.focus('logoDesignTitle'); assert.equal(f.controller.getActiveGroup(), 'logo-entry', 'native heading reveal retains entry group');
  const input = f.focus('logoDesignInput'), before = f.writes();
  for (const value of ['İ', 'İŞ', 'İŞLETMEM', '', 'İŞLETMEM & Çay']) { input.value = value; f.dispatch('input', input); f.dispatch('pointerover', f.doc.getElementById('logoDesignChoose-name')); f.flush(); assert.equal(f.controller.getActiveGroup(), 'logo-entry'); assert.equal(input.value, value); }
  assert.equal(f.writes(), before, 'preview typing produces zero guidance writes');
  for (const id of ['name', 'symbol', 'badge']) { const button = f.doc.getElementById('logoDesignChoose-' + id); f.dispatch('pointerdown', button); assert.equal(f.controller.getActiveGroup(), 'logo-style', 'first press promotes complete comparison'); f.focus(button); assert.equal(button.disabled, false); assert.equal(f.doc.getElementById('logoDesignCanvas-' + id).hasAttribute('data-focus-passive'), false); }
  assert.equal(f.doc.getElementById('logoDesignMessage').hasAttribute('data-focus-passive'), false, 'validation stays clear');
  const optional=f.doc.getElementById('logoDesignOptional');optional.open=true;f.flush();f.focus('logoDesignWish');assert.equal(f.controller.getActiveGroup(),'logo-options');
  f.focus('logoDesignCancel'); assert.equal(f.controller.getActiveGroup(), 'logo-create');
  f.doc.activeElement = null; f.doc.body.classList.remove('logoDesignEditing'); panel.hidden = true; f.flush(); assert.equal(f.controller.getActiveGroup(), 'front-review', 'selected local logo source returns to real appearance review');
  const html = fs.readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8');
  assert(html.indexOf('src="logo-design-ui.js') < html.indexOf('src="focus-guidance.js'), 'initial logo nodes exist before focus mount; no per-input rediscovery hook');
});

test('passive treatment excludes controls, current product selection, monetary evidence and alerts', () => {
  const f = fixture(); f.show('pricing'); assert.equal(f.description.getAttribute('data-focus-passive'), 'true');
  for (const id of ['leadFields','leadError','breakdown','finalDetails','contactHelp','contactWhatsApp','package','fragranceCards']) assert.equal(f.doc.getElementById(id).hasAttribute('data-focus-passive'), false, id);
  f.dispatch('pointerover', f.description); assert.equal(f.description.hasAttribute('data-focus-passive'), false, 'passive context clears before a tap');
  f.picker.hidden = false; f.flush(); assert.equal(f.description.hasAttribute('data-focus-passive'), false, 'current product remains crisp while changing');
  const risky = f.add('p', '', f.main); f.add('button', '', risky); assert.equal(f.model.passiveAllowed(risky, f.lead, f.picker), false);
  f.show('fragrancePanel'); for (const id of ['flambau','green_tea','bodrum_mandarin','lemon']) { f.focus(id); assert.equal(f.controller.getActiveGroup(), 'fragrance'); assert.equal(f.doc.getElementById(id).checked, false); }
});

test('body-level and late dialogs own visual attention without changing native focus/controls', () => {
  const f = fixture(); f.show('pricing'); f.focus('contactName'); f.helpDialog.open = true; f.focus('contactMessage'); f.flush();
  assert.equal(f.controller.getActiveGroup(), 'help-dialog'); assert.equal(f.helpDialog.style.getPropertyValue('--focus-guidance-accent'), '#b58a43');
  assert.equal(f.doc.activeElement.id, 'contactMessage'); assert.equal(f.helpDialog.hasAttribute('data-focus-passive'), false);
  f.dispatch('pointerdown', f.doc.getElementById('province')); assert.equal(f.controller.getActiveGroup(), 'help-dialog', 'background cannot steal native modal attention');
  f.helpDialog.open = false; f.doc.activeElement = null; f.flush(); assert.equal(f.controller.getActiveGroup(), 'quote-contact');
  const request = f.add('dialog', 'visitorRequestDialog'); const consent = f.add('input', 'requestConsent', request); consent.type = 'checkbox'; request.open = true; f.flush(); f.focus(consent);
  assert.equal(f.controller.getActiveGroup(), 'request-dialog'); assert.equal(consent.checked, false); assert.equal(consent.disabled, false);
  const activeBefore = f.doc.activeElement; f.controller.destroy(); f.flush(); assert.equal(f.doc.activeElement, activeBefore); assert.equal(request.hasAttribute('data-focus-group'), false);
});

test('source/CSS contract preserves performance, navigation, safety, sensory colors and real exports', () => {
  assert(!/\.focus\(|\.blur\(|scrollIntoView|scrollTo\(|requestAnimationFrame|setTimeout|createElement|cloneNode|innerHTML|replaceChildren|getContext|getImageData|toDataURL|fetch\(|localStorage|\.value\s*=|\.checked\s*=|\.disabled\s*=|\binert\b/.test(source));
  assert(!/characterData|subtree\s*:\s*true/.test(source));
  assert(!/addEventListener\(['"](?:keyup|composition|pointermove)/.test(source));
  assert.match(css, /blur\(\.55px\)/); assert.match(css, /opacity: \.78/);
  for (const preference of ['prefers-reduced-motion', 'prefers-reduced-transparency', 'prefers-contrast', 'forced-colors']) assert(css.includes(preference));
  assert.match(css, /@media print/); assert.match(css, /filter: none !important/);
  assert(!/backdrop-filter|pointer-events|position:\s*fixed|z-index|animation:|\.fragranceCard[^}]*background|\.fragranceCard[^}]*color/.test(css));
  const registered = fixture().model.GROUPS.map(pair => pair[1]).join(' ');
  for (const selector of ['.productPicker', '.simplePrimary', '#personaNoLogo', '#pdfPicker', '#photoEditor', '#whiteCarrierPanel', '#bgPanel', '#leadFields', '#rearQrFields', '#rearSponsorRegionPanel', '#rearMultiLogos', '#fragrancePanel', '#pricing', '#summary', '#welcomeDraftOptions', '#analyticsChoice', '#productAdvisorDialog', '#contactHelpDialog', '#visitorRequestDialog']) assert(registered.includes(selector), selector);
});


test('passive product copy retains WCAG text contrast on every possible existing customer tint', () => {
  const luminance = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const copy = [0x25, 0x3c, 0x54];
  let minimum = Infinity;
  for (let r = 219; r <= 255; r += 3) for (let g = 219; g <= 255; g += 3) for (let b = 219; b <= 255; b += 3) {
    const background = [r, g, b], blended = copy.map((c, i) => c * .78 + background[i] * .22);
    const ratio = (luminance(background) + .05) / (luminance(blended) + .05);
    minimum = Math.min(minimum, ratio);
  }
  assert(minimum >= 4.5, 'minimum unblurred composited copy contrast: ' + minimum);
  assert.match(css, /color: #253c54/);
});
