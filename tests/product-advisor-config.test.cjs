'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
function load(file) { const ctx = { module: { exports: {} } }; vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx); return ctx.module.exports; }
const config = load('frontend/product-advisor-config.js'), advisor = load('frontend/product-advisor.js');
const expected = ['Restoran / kafe / pastane', 'Otel / konaklama', 'Okul / eğitim', 'Hastane / diş kliniği / sağlık', 'Otomotiv / galeri / servis', 'Mağaza / kuyumcu / perakende', 'Şirket / ofis / kurumsal', 'SPA / bakım merkezi', 'Turizm / ulaşım', 'Kişisel kullanım / özel etkinlik'];
assert.deepEqual(Array.from(config.categories, category => category.label), expected);
assert.equal(new Set(config.categories.map(category => category.id)).size, 10);
assert(Object.isFrozen(config) && Object.isFrozen(config.categories));
for (const category of config.categories) { assert(Object.isFrozen(category)); assert.deepEqual(Object.keys(category).sort(), ['id', 'label', 'mapping']); }
const model = advisor.model(config, ['BM12', 'BM11', 'BM13', 'BM15', 'BM545', 'BM21']);
assert.equal(model.categories.length, 10); assert.equal(model.enabled, true);
const approvedIds = ['restaurant-cafe-patisserie', 'hotel-accommodation', 'school-education', 'hospital-dental-health', 'automotive-dealer-service', 'shop-jeweler-retail', 'company-office-corporate', 'spa-care-center', 'tourism-transport'];
for (const category of model.categories) {
  if (approvedIds.includes(category.id)) {
    assert.equal(category.primary.productId, 'BM12');
    assert.equal(category.alternatives.length, ['spa-care-center', 'tourism-transport'].includes(category.id) ? 4 : ['automotive-dealer-service', 'company-office-corporate'].includes(category.id) ? 3 : 2);
    assert.equal(category.alternatives[0].productId, 'BM545');
    assert.equal(category.alternatives[0].condition, 'Katlı havlu isterseniz');
    assert.equal(category.alternatives[1].catalogPending, undefined);
    assert.equal(category.alternatives[1].productId, 'BM21');
    assert.equal(model.canSelect(category.id, 'BM21'), true);
    assert.equal(model.canSelect(category.id, 'BM12'), true);
    assert.equal(model.canSelect(category.id, 'BM545'), true);
    assert.equal(model.canSelect(category.id, 'BM15'), false);
    assert.equal(model.canSelect(category.id, undefined), false);
    assert.equal(model.canSelect(category.id, '7x12'), false);
  } else if (category.id === 'personal-private-event') {
    assert.equal(category.primary, null);
    assert.equal(category.alternatives.length, 6);
    assert.equal(category.alternatives.filter(choice => choice.catalogPending).length, 0);
    for (const id of ['BM12', 'BM11', 'BM13', 'BM15', 'BM545', 'BM21']) assert.equal(model.canSelect(category.id, id), true);
    for (const id of ['7x12', '30x30', '30x35']) assert.equal(model.canSelect(category.id, id), false);
  } else {
    assert.equal(config.categories.find(item => item.id === category.id).mapping, null);
    assert.equal(category.primary, null); assert.equal(category.alternatives.length, 0);
  }
}
assert.equal(model.result('automotive-dealer-service').alternatives[2].catalogPending, undefined);
assert.equal(model.result('automotive-dealer-service').alternatives[2].productId, 'BM11');
assert.equal(model.canSelect('automotive-dealer-service', '30x30'), false);
assert.equal(model.result('company-office-corporate').alternatives[2].productId, 'BM11');
assert.equal(model.result('company-office-corporate').alternatives[2].catalogPending, undefined);
assert.equal(model.canSelect('company-office-corporate', '30x30'), false);
assert.equal(model.result('spa-care-center').alternatives[2].productId, 'BM11');
assert.equal(model.result('spa-care-center').alternatives[3].productId, 'BM13');
assert.equal(model.result('spa-care-center').alternatives[3].catalogPending, undefined);
assert.equal(model.canSelect('spa-care-center', '30x35'), false);
assert.equal(model.categories.filter(category => category.alternatives.some(choice => choice.productId === 'BM13')).length, 3);
assert.equal(model.result('tourism-transport').alternatives[2].productId, 'BM11');
assert.equal(model.result('tourism-transport').alternatives[3].productId, 'BM13');
assert.equal(model.result('tourism-transport').alternatives[3].catalogPending, undefined);
assert.equal(model.canSelect('tourism-transport', '30x35'), false);
assert(model.result('hospital-dental-health').primary.reason.includes('Tıbbi işlem dışında'));
assert.equal(model.errors.length, 0);
assert(config.categories.every(category => category.mapping.approved === true));
assert.equal(config.categories.some(category => category.id === advisor.UNKNOWN_ID), false);
const browser = {}; vm.runInNewContext(fs.readFileSync('frontend/product-advisor-config.js', 'utf8'), { window: browser }); assert.equal(browser.HijyenLabProductAdvisorConfig.categories.length, 10);
console.log('PASS approved category config: exact ten public labels, unique immutable entries, all ten approved mappings; personal six neutral choices; auto/company/SPA/tourism 30x30 enabled and SPA/tourism 30x35 enabled, conditional folded choice, 7x12 enabled as verified BM21, unmapped categories remain disabled, built-in other/unsure not duplicated.');
