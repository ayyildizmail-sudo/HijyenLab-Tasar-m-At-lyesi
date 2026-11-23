/* Owner-confirmed product specification, 1 November 2026.
 * Intentionally NOT a ProductCatalog entry: USD conversion requires a fresh TCMB snapshot.
 * This module cannot price, select or submit an incomplete product.
 */
(function (root) {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const specification = freeze({
    specificationKey: 'oshibori', // Internal specification key, not a manufacturer SKU.
    productCode: null,
    label: 'Oshibori',
    source: 'Owner confirmations, 1 November 2026',
    cloth: {
      dimensionsCm: [22.5, 24.5],
      material: 'cotton',
      cottonPercent: 100,
      weightGramsPerTowel: 15,
      productionCity: 'Denizli',
      productionCountry: 'Türkiye'
    },
    packaging: { referenceProductId: 'BM12', useSameFrontAndBackMockup: true },
    unitsPerBox: 250,
    printModes: {
      printed: { available: true, minimumUnits: 3000 },
      unprinted: { available: true, minimumUnits: 250 }
    },
    fragrance: {
      options: ['green_tea', 'flambau', 'bodrum_mandarin', 'lemon'],
      recommendedId: 'green_tea',
      defaultId: 'green_tea',
      appliesTo: ['printed', 'unprinted'],
      fixed: false,
      preferenceStatisticsFamily: null
    },
    unitPrice: {
      currency: 'USD',
      minorUnits: 100,
      minorUnitsPerMajor: 100,
      appliesTo: ['printed', 'unprinted'],
      appliesToAllFragrances: true,
      appliesToAllGrounds: true,
      vatIncluded: false,
      vatPercent: 20
    },
    quoteAvailability: {
      enabled: false,
      pending: ['live-tcmb-rate'],
      exchangeRate: null,
      plateCharge: {currency:'TRY',minorUnits:100000,per:'ink'},
      freightCharge: {currency:'TRY',minorUnits:20000,per:'carton',bodrumFree:true}
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = specification;
  else root.HijyenLabOshiboriSpec = specification;
})(typeof globalThis !== 'undefined' ? globalThis : this);
