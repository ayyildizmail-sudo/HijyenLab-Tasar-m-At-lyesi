/* Presentation only: keep existing handlers, values, approvals and commercial rules. */
(function (root) {
  'use strict';
  function priceChange(before, after) {
    if (!before || !after) return '';
    const parts = [];
    const reason = before.product !== after.product ? 'Ürün seçimi değişti.' : before.ground !== after.ground ? (after.ground === 'white' ? 'Beyaz zemin seçildi.' : 'Renkli / Pantone zemin seçildi.') : '';
    if (before.minimum !== after.minimum) parts.push('Minimum sipariş ' + after.minimum.toLocaleString('tr-TR') + ' adet.');
    if (before.unit !== after.unit) parts.push('Ürün birim bedeli ' + (after.unit / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL (KDV hariç).');
    if (!parts.length) return '';
    return [reason, ...parts, 'Klişe ve kargo ayrıca hesaplanır.'].filter(Boolean).join(' ');
  }
  function primaryId(context) {
    if (context.stage !== 'design') return ({ summary: 'discussDesign', pricing: 'review', fragrancePanel: 'fragranceContinue', photoEditor: 'confirmPhoto', whiteCarrierPanel: 'acceptWhiteCarrier', rearPreview: context.sponsorReview ? 'acceptRearSponsor' : context.rearEmpty ? 'skipEmptyRear' : 'rearToPrice' })[context.stage];
    if (context.productRetry) return 'retryProductAsset';
    if (context.productReview) return 'approveProductLayout';
    if (context.unprinted) return 'next';
    if (context.inkReview) return 'approveInk';
    return context.hasDesign && !context.blocked ? 'next' : 'focusUpload';
  }
  function mount(doc) {
    if (doc.getElementById('commercialChange')) return;
    const main = doc.querySelector('main'); if (!main) return;
    const get = id => doc.getElementById(id);
    const upload = doc.querySelector('.simplePrimary label'); if (upload) {
      upload.id = 'focusUpload'; upload.tabIndex = 0; upload.setAttribute('role', 'button');
      upload.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); get('unifiedUpload')?.click(); } });
    }
    const note = doc.createElement('p'); note.id = 'commercialChange'; note.className = 'commercialChange'; note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite'); note.setAttribute('aria-atomic', 'true');
    // One persistent live region, never inserted repeatedly during input.
    get('journeyProgress')?.after(note);
    let noteBasis = null;
    function wrap(id, title, nodes) {
      nodes = nodes.filter(Boolean); if (!nodes.length) return;
      const details = doc.createElement('details'); details.id = id; details.className = 'focusAdvanced';
      const summary = doc.createElement('summary'); summary.textContent = title; details.append(summary);
      nodes[0].before(details); details.append(...nodes); return details;
    }
    for (const prefix of ['bg', 'text']) {
      const label = get(prefix + 'Pantone')?.closest('label'), result = get(prefix + 'PantoneResult');
      wrap(prefix + 'PantoneOptions', 'Pantone kodu / baskı renk referansı (isteğe bağlı)', [label, result, result?.nextElementSibling?.matches('.pantoneNote') ? result.nextElementSibling : null]);
    }
    const sponsor = get('rearSponsorUpload')?.closest('details');
    const rearAdvanced = wrap('rearAdvancedOptions', 'QR ve sponsor logosu (isteğe bağlı)', [sponsor, get('rearQrEnabled')?.closest('label'), get('rearQrFields')]);
    const layout = get('simpleDetails')?.querySelector('summary'); if (layout) layout.textContent = 'Görsel boyutu, konum ve diğer detaylar';
    function visible(node) {
      if (!node || node.closest('[hidden]')) return false;
      for (let p = node.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open) return false;
      return true;
    }
    let previousRecovery = '';
    function sync() {
      // Notices describe a specific commercial snapshot, not the last click forever.
      // Async upload/accept/reset/restore may finish after the input event's timer.
      if (note.textContent && noteBasis !== JSON.stringify(commercialSnapshot())) {
        note.textContent = ''; noteBasis = null;
      }
      // Open on newly restored/added content or a newly surfaced recovery state, not on every render.
      for (const [id, used] of [['bgPantoneOptions', !!get('bgPantone')?.value], ['textPantoneOptions', !!get('textPantone')?.value], ['rearAdvancedOptions', !!get('rearQrEnabled')?.checked || !!get('rearSponsorName')?.textContent || !get('rearSponsorReview')?.hidden || !get('rearSponsorWarning')?.hidden]]) {
        const details = get(id); if (!details) continue;
        if (used && details.dataset.used !== 'true') details.open = true;
        details.dataset.used = String(used);
        const summary = details.querySelector('summary');
        if (summary && !summary.dataset.base) summary.dataset.base = summary.textContent;
        const label = summary?.dataset.base + (used ? ' · Kullanılıyor' : '');
        if (summary && summary.textContent !== label) summary.textContent = label;
      }
      const recovery = ['rearSponsorReview', 'rearSponsorWarning', 'retryRearSponsor', 'rearEditorError'].map(id => {
        const el = get(id); return el && !el.hidden ? id + ':' + (el.textContent || '') : '';
      }).filter(Boolean).join('|');
      if (recovery && recovery !== previousRecovery && rearAdvanced) {
        rearAdvanced.open = true;
        if (sponsor) sponsor.open = true;
        if (get('rearEditor')) get('rearEditor').open = true;
      }
      previousRecovery = recovery;
      const stage = ['summary', 'pricing', 'fragrancePanel', 'whiteCarrierPanel', 'photoEditor', 'pdfPicker', 'rearPreview', 'design'].find(id => visible(get(id)));
      // Contact typing must not prepare/compose artwork just to choose a pricing CTA.
      // Actual navigation and quote generation retain their full readiness checks.
      const context = { stage, unprinted: root.HijyenLabPrintMode?.get() === 'unprinted', hasDesign: typeof state !== 'undefined' && !!(state.logo || state.photoLayout), blocked: stage === 'design' && typeof designIssue === 'function' && designIssue(), productRetry: visible(get('retryProductAsset')), productReview: visible(get('approveProductLayout')) && !get('approveProductLayout').disabled, inkReview: visible(get('approveInk')), sponsorReview: visible(get('acceptRearSponsor')), rearEmpty: visible(get('skipEmptyRear')) };
      const activeDialog = main.querySelector('dialog[open]');
      const chosen = activeDialog ? [...activeDialog.querySelectorAll('.primary')].find(el => visible(el) && !el.disabled) : get(primaryId(context));
      const candidates = new Set([...main.querySelectorAll('.primary'), ...main.querySelectorAll('[data-focus-action]'), chosen].filter(Boolean));
      for (const el of candidates) {
        el.dataset.focusAction = 'true';
        el.classList.toggle('focusPrimary', el === chosen);
        el.classList.toggle('focusSecondary', el !== chosen);
      }
    }
    function commercialSnapshot() {
      if (typeof state === 'undefined' || typeof productRules !== 'function' || ((state.photoLayout || state.quoteSource==='source-reference') && state.photoQuoteBg === 'unknown')) return null;
      const rules = productRules(), white = effectiveBackground() === '#ffffff';
      return { mode: root.HijyenLabPrintMode?.get() || 'printed', product: rules.product, ground: white ? 'white' : 'colored', minimum: white ? rules.minimum.white : rules.minimum.colored, unit: white ? rules.whiteUnitKurus : rules.coloredUnitKurus };
    }
    // Capture before the existing handler, compare afterwards. No initial-load announcements or network work.
    let changePending = false, changeTicket = 0;
    function userChange(event) {
      if (!event.isTrusted || changePending) return;
      const before = commercialSnapshot(), ticket = ++changeTicket;
      changePending = true;
      // A macrotask runs after target handlers. Browser capture-listener microtasks
      // may run before those handlers; coalesce input/change without losing the first basis.
      root.setTimeout(() => {
        if (ticket !== changeTicket) return;
        changePending = false;
        const after = commercialSnapshot(), message = priceChange(before, after);
        if (!after) { if (note.textContent) note.textContent = ''; noteBasis = null; }
        else if (message) {
          noteBasis = JSON.stringify(after);
          if (note.textContent !== message) note.textContent = message;
        }
        sync();
      }, 0);
    }
    for (const type of ['click', 'input', 'change']) doc.addEventListener(type, userChange, true);
    new root.MutationObserver(sync).observe(main, { subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'open'], childList: false });
    root.addEventListener?.('hijyenlab:print-mode-change', sync);
    root.addEventListener?.('hijyenlab:quote-state', sync);
    sync();
  }
  const api = { priceChange, primaryId, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.HijyenLabCustomerFocus = api; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true }); else mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
