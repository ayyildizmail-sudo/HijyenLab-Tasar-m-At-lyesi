/* Public category labels approved by Hakan Bey, 30 October 2026.
 * Only explicitly approved groups below have mappings. All others remain null.
 * Add categories here as needed; never include private customer names, counts or examples.
 */
(function (root) {
  'use strict';
  const sharedApprovedMapping = Object.freeze({
    approved: true,
    primary: Object.freeze({ productId: 'BM12', reason: 'Rulo biçiminde sunulur; açılmış havlu ölçüsü 25 × 30 cm, koli içeriği 400 adettir.' }),
    alternatives: Object.freeze([
      Object.freeze({ productId: 'BM545', condition: 'Katlı havlu isterseniz', reason: 'Rulo yerine katlı biçimde sunulur; koli içeriği 625 adettir.' }),
      Object.freeze({ catalogPending: true, label: '7 × 12 cm Islak Mendil', condition: 'Islak mendil isterseniz', reason: 'Islak mendil tercihinde 7 × 12 cm seçeneği.' })
    ])
  });
  const mapped = new Set(['restaurant-cafe-patisserie', 'hotel-accommodation', 'school-education', 'hospital-dental-health', 'shop-jeweler-retail']);
  const healthApprovedMapping = Object.freeze({ ...sharedApprovedMapping,
    primary: Object.freeze({ productId: 'BM12', reason: 'Tıbbi işlem dışında müşteriye sunulan rulo havlu; koli içeriği 400 adettir.' })
  });
  const additionalLargeApprovedMapping = Object.freeze({ ...sharedApprovedMapping,
    alternatives: Object.freeze([...sharedApprovedMapping.alternatives,
      Object.freeze({ catalogPending: true, label: '30 × 30 cm Rulo Islak Havlu', condition: 'Ek seçenek', reason: 'Bu grup için ek 30 × 30 cm seçeneği.' })
    ])
  });
  const expandedLargeApprovedMapping = Object.freeze({ ...sharedApprovedMapping,
    alternatives: Object.freeze([...additionalLargeApprovedMapping.alternatives,
      Object.freeze({ catalogPending: true, label: '30 × 35 cm Rulo Islak Havlu', condition: 'Ek seçenek', reason: 'Bu grup için ek 30 × 35 cm seçeneği.' })
    ])
  });
  const personalApprovedMapping = Object.freeze({
    approved: true,
    choices: Object.freeze([
      Object.freeze({ productId: 'BM15', reason: 'Rulo biçiminde sunulur; koli içeriği 500 adettir.' }),
      Object.freeze({ productId: 'BM12', reason: 'Rulo biçiminde sunulur; koli içeriği 400 adettir.' }),
      Object.freeze({ catalogPending: true, label: '30 × 30 cm Rulo Islak Havlu', condition: 'Seçenek', reason: '30 × 30 cm rulo seçeneği.' }),
      Object.freeze({ catalogPending: true, label: '30 × 35 cm Rulo Islak Havlu', condition: 'Seçenek', reason: '30 × 35 cm rulo seçeneği.' }),
      Object.freeze({ productId: 'BM545', reason: 'Rulo yerine katlı biçimde sunulur; koli içeriği 625 adettir.' }),
      Object.freeze({ catalogPending: true, label: '7 × 12 cm Islak Mendil', condition: 'Seçenek', reason: '7 × 12 cm ıslak mendil seçeneği.' })
    ])
  });
  const categories = [
    ['restaurant-cafe-patisserie', 'Restoran / kafe / pastane'],
    ['hotel-accommodation', 'Otel / konaklama'],
    ['school-education', 'Okul / eğitim'],
    ['hospital-dental-health', 'Hastane / diş kliniği / sağlık'],
    ['automotive-dealer-service', 'Otomotiv / galeri / servis'],
    ['shop-jeweler-retail', 'Mağaza / kuyumcu / perakende'],
    ['company-office-corporate', 'Şirket / ofis / kurumsal'],
    ['spa-care-center', 'SPA / bakım merkezi'],
    ['tourism-transport', 'Turizm / ulaşım'],
    ['personal-private-event', 'Kişisel kullanım / özel etkinlik']
  ].map(([id, label]) => Object.freeze({ id, label, mapping: id === 'personal-private-event' ? personalApprovedMapping : ['spa-care-center', 'tourism-transport'].includes(id) ? expandedLargeApprovedMapping : ['automotive-dealer-service', 'company-office-corporate'].includes(id) ? additionalLargeApprovedMapping : id === 'hospital-dental-health' ? healthApprovedMapping : mapped.has(id) ? sharedApprovedMapping : null }));
  // “Diğer / Emin değilim” is appended by the view, not duplicated in the category data.
  const config = Object.freeze({ categories: Object.freeze(categories) });
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.HijyenLabProductAdvisorConfig = config;
})(typeof window !== 'undefined' ? window : globalThis);
