/* Visual composition only: reuse the real preview, upload label and all existing controls. */
(function (root) {
  'use strict';
  const DELIVERY_DAYS = 25;
  function deliveryDate(now, days = DELIVERY_DAYS) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function deliveryText(now, productId) {
    if (productId === 'OSHIBORI') return 'Oshibori için teslim tarihi sipariş aşamasında teyit edilir.';
    return 'Bugün onaylarsanız tahmini teslim: ' + deliveryDate(now) + ' (' + DELIVERY_DAYS + ' takvim günü).';
  }
  function isOpening(value, designVisible, unprinted = false) {
    return !unprinted && !!designVisible && !value.logoDesign && !value.textDesign && !value.logo && !value.photoLayout && !value.sourcePhoto && !value.designProcessing && !value.designBlocked && !value.screenSelectionRequired;
  }
  function mount(doc) {
    if (doc.getElementById('welcomeIntro')) return;
    const main = doc.querySelector('main'), picker = doc.querySelector('.productPicker'), design = doc.getElementById('design');
    if (!main || !picker || !design) return;
    main.classList.add('atelierLayout');
    const intro = doc.createElement('section'); intro.id = 'welcomeIntro'; intro.setAttribute('aria-labelledby', 'welcomeTitle');
    const eyebrow = doc.createElement('p'); eyebrow.className = 'welcomeEyebrow'; eyebrow.textContent = 'HijyenLab Tasarım Atölyesi';
    const title = doc.createElement('h1'); title.id = 'welcomeTitle'; title.textContent = 'Elinizdeki her logo görselinden mendil tasarımı';
    const description = doc.createElement('p'); description.className = 'welcomeDescription'; description.textContent = 'Dosya, fotoğraf, ekran görüntüsü.';
    const delivery = doc.createElement('p'); delivery.id = 'welcomeDelivery';
    intro.append(eyebrow, title, description, delivery); picker.before(intro);
    const upload = doc.querySelector('.simplePrimary label'), originalUploadText = upload?.textContent;
    const hint = doc.createElement('p'); hint.id = 'welcomeUploadHint'; hint.textContent = 'Görseliniz yoksa renk sayısını belirterek ilerleyin.';
    const privacy = doc.createElement('small'); privacy.textContent = 'Gerekirse daha net logo kaynağı aranır.'; hint.append(privacy);
    doc.querySelector('.simplePrimary')?.after(hint);
    const draft = doc.getElementById('draftPanel'); let draftOptions = null, draftSummary = null, previousDraftAttention = '';
    if (draft) {
      draftOptions = doc.createElement('details'); draftOptions.id = 'welcomeDraftOptions';
      draftSummary = doc.createElement('summary'); draftSummary.textContent = 'Taslak saklama ve devam etme';
      draftOptions.append(draftSummary, draft);
      const status = doc.getElementById('status'); if (status) status.before(draftOptions); else main.append(draftOptions);
    }
    function sync() {
      const unprinted = root.HijyenLabPrintMode?.get() === 'unprinted';
      const opening = isOpening(typeof state === 'undefined' ? {} : state, !design.hidden, unprinted);
      main.classList.toggle('unprintedMode', unprinted);
      main.classList.toggle('welcomeEmpty', opening);
      if (intro.hidden === opening) intro.hidden = !opening;
      const when = deliveryText(new Date(), root.selectedProductId);
      if (delivery.textContent !== when) delivery.textContent = when;
      if (hint.hidden === opening) hint.hidden = !opening;
      const label = opening ? 'Logo veya görsel yükle' : originalUploadText;
      if (upload && upload.textContent !== label) upload.textContent = label;
      if (draftOptions) {
        const restore = doc.getElementById('restoreDraft'), status = doc.getElementById('draftStatus')?.textContent || '';
        const hasRestore = !!restore && !restore.hidden;
        const attention = /okunamadı|kaydedilemedi|doğrulanamadı|durduruldu|yüklenemedi/.test(status) ? status : hasRestore ? 'restore' : '';
        if (attention && attention !== previousDraftAttention) draftOptions.open = true;
        previousDraftAttention = attention;
        const summary = hasRestore ? 'Kaydedilmiş taslağınız var · Devam et' : doc.getElementById('draftConsent')?.checked ? 'Taslak saklama açık · Bu cihazda' : 'Taslak saklama ve devam etme';
        if (draftSummary.textContent !== summary) draftSummary.textContent = summary;
      }
    }
    new root.MutationObserver(sync).observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
    doc.addEventListener('change', sync); doc.addEventListener('input', sync);
    root.addEventListener?.('hijyenlab:print-mode-change', sync);
    sync();
  }
  const api = { isOpening, mount, deliveryDate, deliveryText, DELIVERY_DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.HijyenLabWelcome = api; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true }); else mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
