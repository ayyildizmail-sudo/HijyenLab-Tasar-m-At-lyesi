/* eslint-disable @typescript-eslint/no-require-imports -- Local VM regression harness. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ProductCatalog = require('../frontend/product-catalog.js');
const ProductGeometry = require('../frontend/product-geometry.js');
const Fragrance = require('../frontend/fragrance.js');
const ProcessingSession = require('../frontend/processing-session.js');
const source = name => fs.readFileSync(path.join(__dirname, '../frontend', name), 'utf8');

// 1 November owner clarification. BM545 is tested separately as unchanged legacy behavior.
const clarified = [
  ['BM15', [25, 25], 'flambau', 'Flambau'],
  ['BM12', [25, 30], 'flambau', 'Flambau'],
  ['BM11', [30, 30], 'flambau', 'Flambau'],
  ['BM13', [30, 35], 'flambau', 'Flambau'],
  ['BM21', [7, 12], 'green_tea', 'Yeşil çay'],
];

function fixture() {
  const nodes = new Map(), calls = [];
  const make = () => ({
    hidden: false, disabled: false, value: '', textContent: '', children: [],
    append(...items) { this.children = this.children.filter(item => !items.includes(item)); this.children.push(...items); },
    before() {}, prepend() {}, focus() {},
    querySelector() { return make(); }, querySelectorAll() { return []; },
    closest() { return make(); },
  });
  const $ = id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); };
  const c = {
    $, ProductCatalog, ProductGeometry, Fragrance,
    state: { logo: null, text: '', bg: '#ffffff', photoLayout: null, requestedQuantity: null },
    initial: { logo: null, text: '', bg: '#ffffff', photoLayout: null },
    selectedPrintMode: 'printed', selectedProductId: 'BM12', step: 1,
    latest: null, history: [], logoImg: null, photoImg: null, lastUploadedFile: null,
    printedModeMemory: null, approvedDesignFingerprint: null,
    rearPreviewGeneration: 0, rearPreviewReady: false, rearRenderedData: null,
    rearRenderedRevision: -1, tintedMaterialCache: null, packageImage: null,
    processedLogo: null, processedKey: null,
    document: { createElement: make, querySelectorAll: () => [], querySelector: id => $('selector:' + id), body: { dataset: {}, classList: { toggle() {} } } },
    window: { dispatchEvent() {} }, CustomEvent: class { constructor(type) { this.type = type; } },
    setTimeout, clearTimeout, AbortController,
    localStorage: { getItem() { throw Error('Unexpected storage read'); }, setItem() { throw Error('Unexpected storage write'); } },
    fetch: async (...args) => { calls.push(args); throw Error('Unexpected network request'); },
    isUnprinted: () => c.selectedPrintMode === 'unprinted', isDeclaredQuote: () => false,
    productRules: () => ProductCatalog.rules(c.selectedProductId),
    invalidateQuote() {}, cancelCurrentProcessing() {}, resetRegionEditor() {}, restoreProcessingResult() {},
    hideRearPreview() {}, showRearPreview() {}, rearQuoteReady: () => true,
    designIssue: () => false, showDesignIssue() {}, designFingerprint: () => 'fixture-art',
    processingSession: ProcessingSession.create(), syncProcessingDesign() {},
    freezeCommercial: value => value, leadValues: () => ({}),
    money: value => String(value / 100), cartonContentLabel: rules => String(rules.unitsPerBox),
    status() {}, containLogoPlacement() {}, approveCurrentDesign: () => true,
    loadImage: async name => ({ name }),
    go(n) { c.lastGo = n; }, refresh() { c.syncFragrance(); c.syncUnprintedUI(); },
    syncCommercialLabels() {},
    modePicker: make(), cartonLabel: make(), cartonInput: make(),
    printedDesignHeading: 'Tasarım', printedQuoteNote: 'Baskılı ürün', printedProductReview: 'Ürün kontrolü',
  };
  vm.createContext(c);
  vm.runInContext(source('fragrance-ui.js'), c);
  vm.runInContext(source('product-ui.js'), c);
  const modeSource = source('unprinted-ui.js');
  vm.runInContext(modeSource.slice(modeSource.indexOf('function syncUnprintedUI()'), modeSource.indexOf('\nglobalThis.HijyenLabPrintMode')), c);
  vm.runInContext(source('processing-lifecycle.js').split('\n').find(line => line.startsWith('function makeQuoteSnapshot()')), c);
  const selectFragrance = id => vm.runInContext(`{ const radio = fragranceButtons.get(${JSON.stringify(id)}).radio; radio.checked = true; radio.onchange(); }`, c);
  return { c, $, calls, selectFragrance };
}

test('clarified dimensions resolve only to existing verified catalog products', () => {
  for (const [id, dimensions] of clarified) {
    const product = ProductCatalog.get(id);
    assert.deepEqual(id === 'BM21' ? product.oppDimensions : product.towelDimensions, dimensions);
    assert.equal(product.type, id === 'BM21' ? 'mendil' : 'rulo');
  }
  assert.deepEqual(ProductCatalog.items.map(p => p.id).sort(), ['BM11', 'BM12', 'BM13', 'BM15', 'BM21', 'BM545']);
});

for (const [id, , expected, label] of clarified) {
  test(`${id}: fixed scent bypasses selection and agrees across labels and quote`, async () => {
    const { c, $, calls, selectFragrance } = fixture();
    selectFragrance('lemon');
    await c.selectProduct(id);
    await c.setPrintMode('unprinted');
    assert.equal(c.fragranceReady(), true);
    assert.equal(c.fragranceSnapshot().id, expected);
    assert.equal(c.fragranceSnapshot().label, label);
    assert.equal(c.fragranceSnapshot().fixed, true);
    assert.equal($('changeFragrance').hidden, true);
    assert.equal(vm.runInContext('[...fragranceButtons.values()].every(v => v.radio.disabled)', c), true);
    for (const option of Fragrance.OPTIONS) selectFragrance(option.id);
    assert.equal(c.fragranceSnapshot().id, expected, 'stale/programmatic radio changes cannot override fixed scent');
    c.showFragrance();
    assert.equal(c.lastGo, 2);
    assert.equal(vm.runInContext('fragrancePanel.hidden', c), true);
    await c.refreshFragranceStats();
    await $('fragranceContinue').onclick();
    assert.equal(calls.length, 0, 'fixed scent never sends preference statistics');
    for (const field of ['unprintedInfo', 'previewCaption', 'minimumNote', 'fragrancePriceValue']) assert.ok($(field).textContent.includes(label), field);
    $('qty').value = String(c.productRules().unitsPerBox);
    const quote = c.makeQuoteSnapshot();
    assert.equal(quote.fragrance.id, expected);
    assert.equal(quote.fragrance.label, label);
    const token = c.processingSession.quoteToken(quote);
    assert.ok(token);
    assert.ok(c.processingSession.isQuoteCurrent(token, quote));
    for (const option of Fragrance.OPTIONS.filter(option => option.id !== expected)) {
      assert.equal(c.processingSession.quoteToken({ ...quote, fragrance: { ...quote.fragrance, id: option.id } }), null);
    }
  });
}

test('unprinted product and print-mode round trips cannot carry a stale scent', async () => {
  const { c, $, selectFragrance } = fixture();
  selectFragrance('lemon');
  await c.setPrintMode('unprinted');
  for (const id of ['BM21', 'BM15', 'BM21', 'BM11', 'BM13', 'BM12']) {
    await c.selectProduct(id);
    assert.equal(c.fragranceSnapshot().id, id === 'BM21' ? 'green_tea' : 'flambau');
    assert.equal(vm.runInContext('fragranceChoice', c), '');
    assert.equal($('changeFragrance').hidden, true);
  }
  await c.setPrintMode('printed');
  assert.equal(c.fragranceSnapshot(), null);
  assert.equal(c.fragranceReady(), false);
  assert.equal($('changeFragrance').hidden, false);
  assert.equal(vm.runInContext('[...fragranceButtons.values()].every(v => !v.radio.disabled)', c), true);
});

test('all four printed fragrances remain selectable for every existing product', async () => {
  const { c, selectFragrance } = fixture();
  assert.deepEqual(Fragrance.OPTIONS.map(option => option.id), ['flambau', 'green_tea', 'bodrum_mandarin', 'lemon']);
  for (const product of ProductCatalog.items) {
    await c.selectProduct(product.id);
    for (const option of Fragrance.OPTIONS) {
      selectFragrance(option.id);
      assert.equal(c.fragranceSnapshot().id, option.id);
      assert.equal(c.fragranceReady(), false, 'selection still requires explicit printed confirmation');
    }
  }
});

test('folded 20×25 retains prior Flambau behavior without extending the clarification', async () => {
  const { c } = fixture();
  await c.selectProduct('BM545');
  await c.setPrintMode('unprinted');
  assert.deepEqual(ProductCatalog.get('BM545').towelDimensions, [20, 25]);
  assert.equal(c.fragranceSnapshot().id, 'flambau');
});

test('summary and downloaded quote use the same current fragrance snapshot; journey hides its step', () => {
  const app = source('app.js');
  assert.ok(app.includes('`Koku: ${fragranceSnapshot().label}`'));
  assert.ok(app.includes("' · Koku: '+quoteSnapshot.fragrance.label"));
  assert.ok(source('experience-ui.js').includes("steps.get('fragrance').hidden = blank"));
});
