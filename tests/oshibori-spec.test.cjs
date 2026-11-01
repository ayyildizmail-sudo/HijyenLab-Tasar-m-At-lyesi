/* eslint-disable @typescript-eslint/no-require-imports -- Browser/CommonJS module or Node regression harness. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const spec = require('../frontend/oshibori-spec.js');
const catalog = require('../frontend/product-catalog.js');
const fragrance = require('../frontend/fragrance.js');

assert.equal(spec.productCode, null, 'No invented manufacturer SKU');
assert.deepEqual(spec.cloth.dimensionsCm, [22.5, 24.5]);
assert.equal(spec.cloth.cottonPercent, 100);
assert.equal(spec.cloth.weightGramsPerTowel, 15);
assert.equal('gsm' in spec.cloth, false, '15 g is per towel, not per square metre');
assert.equal(spec.cloth.productionCity, 'Denizli');
assert.equal(spec.cloth.productionCountry, 'Türkiye');
assert.equal(spec.packaging.referenceProductId, 'BM12');
assert.equal(spec.packaging.useSameFrontAndBackMockup, true);
assert.notDeepEqual(spec.cloth.dimensionsCm, catalog.get('BM12').towelDimensions);
assert.equal(spec.unitsPerBox, 250);
assert.deepEqual(spec.printModes, {
  printed: { available: true, minimumUnits: 3000 },
  unprinted: { available: true, minimumUnits: 250 }
});
assert.deepEqual(spec.fragrance.options, ['green_tea', 'flambau', 'bodrum_mandarin', 'lemon']);
assert(spec.fragrance.options.every(fragrance.validId));
assert.equal(spec.fragrance.defaultId, 'green_tea');
assert.equal(spec.fragrance.recommendedId, 'green_tea');
assert.equal(spec.fragrance.fixed, false);
assert.deepEqual(spec.fragrance.appliesTo, ['printed', 'unprinted']);
assert.equal(spec.fragrance.preferenceStatisticsFamily, null);
assert.equal(spec.unitPrice.currency, 'USD');
assert.equal(spec.unitPrice.minorUnits / spec.unitPrice.minorUnitsPerMajor, 1);
assert.equal(spec.unitPrice.appliesToAllFragrances, true);
assert.equal(spec.unitPrice.appliesToAllGrounds, true);
assert.equal(spec.unitPrice.vatIncluded, false);
assert.equal(spec.unitPrice.vatPercent, 20);
assert.equal(spec.quoteAvailability.enabled, false);
assert.deepEqual(spec.quoteAvailability.pending, ['live-tcmb-rate']);
for (const key of ['exchangeRate']) assert.equal(spec.quoteAvailability[key], null);
assert.equal('priceRules' in spec, false, 'Cannot be passed off as a verified TL catalog product');
assert.equal(catalog.get('OSHIBORI').priceRules.fxPending, true);
assert.deepEqual(catalog.items.filter(p=>p.id!=='OSHIBORI').map(p => [p.id, p.priceRules.whiteUnitKurus, p.priceRules.coloredUnitKurus]), [
  ['BM12', 290, 330], ['BM11', 350, 400], ['BM13', 380, 430],
  ['BM15', 250, 300], ['BM21', 140, 140], ['BM545', 240, 290]
]);
assert.throws(() => { spec.unitPrice.currency = 'TRY'; }, TypeError);
assert.throws(() => { spec.cloth.dimensionsCm[0] = 25; }, TypeError);
assert.throws(() => { spec.fragrance.options.push('unknown'); }, TypeError);
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync('frontend/oshibori-spec.js', 'utf8'), context);
assert.equal(context.HijyenLabOshiboriSpec.unitPrice.currency, 'USD');
assert(Object.isFrozen(context.HijyenLabOshiboriSpec.quoteAvailability.pending));
assert(!fs.readFileSync('frontend/index.html', 'utf8').includes('oshibori-spec.js'), 'Pending spec must not enable a customer quote flow');
console.log('PASS Oshibori confirmed specification: dimensions, 15 g per towel, shared packet, all scents/Green Tea default, USD 1, pending quote policy and unchanged TL catalog');
