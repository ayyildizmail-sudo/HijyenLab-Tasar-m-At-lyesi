/* Screen-only attention guidance. Existing controls, input handlers and artwork stay owned by their modules. */
(function (root) {
  'use strict';
  const GROUP = 'data-focus-group', ACTIVE = 'data-focus-active', PASSIVE = 'data-focus-passive';
  // Stable, real containers: descendants added later inherit their existing group's ownership.
  const GROUPS = Object.freeze([
    ['product-context', '#journeyProductContext'],
    ['product', '.productPicker'],
    ['upload', '.simplePrimary'],
    ['logo-create', '#logoDesignPanel'],
    ['logo-entry', '#logoDesignInputGroup'],
    ['logo-options', '#logoDesignOptional'],
    ['logo-style', '#logoDesignChoices'],
    ['text-create', '#textDesignPanel'],
    ['text-entry', '#textDesignInputGroup'],
    ['text-style', '#textDesignChoices'],
    ['declaration', '#personaNoLogo'],
    ['declaration-choices', '#declarationPanel'],
    ['pdf', '#pdfPicker'],
    ['photo', '#photoEditor'],
    ['photo-details', '#photoEditor > details'],
    ['source-review', '#whiteCarrierPanel'],
    ['source-region', '#brandRegionPanel'],
    ['front', '#design'],
    ['front-review', '#design .visualSide'],
    ['front-edit', '#design .editSide'],
    ['front-logo', '#logoPanel'],
    ['front-background', '#bgPanel'],
    ['front-text', '#design .editPanel:nth-of-type(3)'],
    ['front-background-choice', '#backgroundChoice'],
    ['front-details', '#simpleDetails'],
    ['source-interpretation', '#inputOverride, #visibleInterpretation'],
    ['front-extra-logos', '#frontMultiLogos'],
    ['front-comparison', '#flexoProposalNote'],
    ['source-recovery', '#referenceRecovery'],
    ['product-review', '#productReview'],
    ['rear', '#rearPreview'],
    ['rear-edit', '#rearEditor'],
    ['rear-contact', '.rearFieldGrid'],
    ['rear-optional', '#rearEditor .rearOptional'],
    ['rear-advanced', '#rearAdvancedOptions'],
    ['rear-region', '#rearSponsorRegionPanel'],
    ['rear-sponsor-review', '#rearSponsorReview'],
    ['rear-contrast', '#rearContrastOptions'],
    ['rear-extra-logos', '#rearMultiLogos'],
    ['rear-qr', '#rearQrFields'],
    ['fragrance', '#fragrancePanel'],
    ['quote', '#pricing'],
    ['quote-contact', '#leadFields'],
    ['quote-settings', '#pricing > article:first-of-type'],
    ['quote-technical', '#pricing .simpleTechnical'],
    ['quote-fragrance', '#fragrancePriceSummary'],
    ['quote-conditions', '#pricing .priceNotes'],
    ['summary', '#summary'],
    ['summary-download', '#summary > article'],
    ['summary-discussion', '#summaryDiscussion'],
    ['draft', '#welcomeDraftOptions, #draftPanel'],
    ['draft-prompt', '#personaDraftPrompt'],
    ['analytics-choice', '#analyticsChoice'],
    ['upload-recovery', '#uploadRecovery'],
    ['help', '#contactHelp'],
    ['advisor-dialog', '#productAdvisorDialog'],
    ['help-dialog', '#contactHelpDialog'],
    ['request-dialog', '#visitorRequestDialog']
  ].map(pair => Object.freeze(pair)));
  const STAGES = Object.freeze(['summary', 'pricing', 'fragrancePanel', 'whiteCarrierPanel', 'photoEditor', 'pdfPicker', 'brandRegionPanel', 'rearPreview', 'logoDesignPanel', 'textDesignPanel', 'design']);
  const CONTEXTS = '#journeyProductDescription, #welcomeIntro, #leadFields > h2, #rearEditor > h2';
  const PROTECTED = 'input, select, textarea, button, a, label, summary, canvas, [role="alert"], [role="status"], [aria-live], [aria-invalid="true"]';
  const REVEALED_WORK = '#referenceRecovery, #uploadRecovery, #backgroundChoice, #productReview, #rearSponsorRegionPanel, #rearSponsorReview, #rearQrFields, #design .editSide';
  function visible(node) {
    if (!node || node.isConnected === false) return false;
    if (node.ownerDocument?.body?.classList.contains('referenceRecoveryActive') && node.closest('.workspace, #uploadRecovery, #designError')) return false;
    if ((node.ownerDocument?.body?.classList.contains('logoDesignEditing') || node.ownerDocument?.body?.classList.contains('textDesignEditing')) && node.closest('#design > .workspace, #welcomeIntro, #personaNoLogo, #welcomeUploadHint, #productReview')) return false;
    if ((node.ownerDocument?.body?.classList.contains('logoDesignSource') || node.ownerDocument?.body?.classList.contains('textDesignSource')) && node.closest('#logoPanel')) return false;
    for (let parent = node; parent; parent = parent.parentElement) {
      if (parent.hidden || (parent.tagName === 'DIALOG' && !parent.open)) return false;
      if (parent !== node && parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector('summary')?.contains(node)) return false;
    }
    return true;
  }
  function editing(node) {
    return !!node && (node.isContentEditable || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' ||
      (node.tagName === 'INPUT' && !['button', 'submit', 'reset', 'file', 'checkbox', 'radio'].includes(node.type)));
  }
  function passiveAllowed(node, active, picker) {
    if (!visible(node) || !active || active.contains(node) || node.contains(active)) return false;
    if (node.matches(PROTECTED) || node.querySelector(PROTECTED)) return false;
    // The current product stays perfectly clear while choosing/changing it. Only
    // its collapsed, noninteractive description becomes gently secondary later.
    if (node.id === 'journeyProductDescription' && visible(picker)) return false;
    return true;
  }
  function mount(doc) {
    if (doc.__hijyenLabFocusGuidance) return doc.__hijyenLabFocusGuidance;
    const main = doc.querySelector('main'); if (!main) return null;
    let active = null, stage = '', queued = false, disposed = false, opening = main.classList.contains('welcomeEmpty');
    let engaged = false, keyboardIntent = false;
    const groups = new Set(), contexts = new Set(), listeners = [];
    const get = id => doc.getElementById(id);
    const attr = (node, name, yes) => {
      if (yes && !node.hasAttribute(name)) node.setAttribute(name, 'true');
      else if (!yes && node.hasAttribute(name)) node.removeAttribute(name);
    };
    const observe = node => observer?.observe(node, { attributes: true, attributeFilter: ['hidden', 'open'] });
    function register(node, name) {
      if (!node || groups.has(node)) return;
      node.setAttribute(GROUP, name); groups.add(node); observe(node);
    }
    function discover() {
      for (const [name, selector] of GROUPS) for (const node of doc.querySelectorAll(selector)) register(node, name);
      // Both rearOptional disclosures have different jobs. Resolve the sponsor
      // container by its real input instead of depending on its sibling index.
      const sponsor = get('rearSponsorUpload')?.closest('details');
      if (sponsor) { register(sponsor, 'rear-sponsor'); if (sponsor.getAttribute(GROUP) !== 'rear-sponsor') sponsor.setAttribute(GROUP, 'rear-sponsor'); }
      for (const node of doc.querySelectorAll(CONTEXTS)) contexts.add(node);
    }
    function nearest(node) {
      if (!node?.closest) return null;
      const dialog = node.closest('dialog');
      if (dialog?.open) { register(dialog, 'dialog'); return dialog; }
      return node.closest('[' + GROUP + ']');
    }
    const activeDialog = () => [...groups].find(node => node.tagName === 'DIALOG' && node.open && visible(node));
    const currentStage = () => STAGES.find(id => visible(get(id))) || '';
    function context() {
      for (const node of contexts) attr(node, PASSIVE, passiveAllowed(node, active, doc.querySelector('.productPicker')));
    }
    function activate(node) {
      if (!engaged || !visible(node)) return;
      const dialog = activeDialog(); if (dialog && node !== dialog) node = dialog;
      if (active === node) return;
      if (active) attr(active, ACTIVE, false);
      active = node; attr(active, ACTIVE, true);
      if (active.tagName === 'DIALOG') {
        const hue = main.style.getPropertyValue('--customer-decoration') || '#800d2a';
        if (active.style.getPropertyValue('--focus-guidance-accent') !== hue) active.style.setProperty('--focus-guidance-accent', hue);
      }
      context();
    }
    function defaultGroup(id) {
      if (id === 'logoDesignPanel') return get('logoDesignInputGroup') || get(id);
      if (id === 'textDesignPanel') return get('textDesignInputGroup') || get(id);
      if (id === 'pricing') return get('leadFields') || get(id);
      if (id === 'summary') return doc.querySelector('#summary > article') || get(id);
      if (id === 'design') {
        const openEditor = [...doc.querySelectorAll('#design .editPanel[open]')].find(visible);
        if (openEditor) return openEditor;
        const recovery = ['uploadRecovery', 'referenceRecovery', 'productReview', 'backgroundChoice'].map(get).find(visible);
        if (recovery) return recovery;
        if (main.classList.contains('welcomeEmpty')) return doc.querySelector('.productPicker') || doc.querySelector('.simplePrimary');
        return doc.querySelector('#design .visualSide') || get(id);
      }
      return get(id);
    }
    function sync(preferred) {
      queued = false; if (disposed) return;
      const previousStage = stage;
      const nextStage = currentStage(), changed = nextStage !== stage; stage = nextStage;
      const nextOpening = main.classList.contains('welcomeEmpty'), openingChanged = opening !== nextOpening; opening = nextOpening;
      // A fresh blank welcome is a new start, not the last task's attention state.
      if (opening && stage === 'design' && (openingChanged || (changed && previousStage))) {
        engaged = false; keyboardIntent = false;
        if (active) attr(active, ACTIVE, false);
        active = null;
      }
      if (!engaged) { context(); return; }
      const dialog = activeDialog();
      if (dialog) { activate(dialog); context(); return; }
      const focused = visible(doc.activeElement) ? nearest(doc.activeElement) : null;
      // Existing native navigation focuses a heading. Keep its useful default
      // subpanel (e.g. quote contact) rather than framing the entire long section.
      if (focused && editing(doc.activeElement)) activate(focused);
      else if (changed || (stage === 'design' && openingChanged)) activate(defaultGroup(stage));
      else if (preferred && visible(preferred)) activate(preferred);
      else if (!visible(active) || active?.tagName === 'DIALOG') activate(defaultGroup(stage));
      else if (!active) activate(defaultGroup(stage));
      context();
    }
    function schedule(preferred) {
      if (queued) return;
      queued = true;
      (root.queueMicrotask || (fn => Promise.resolve().then(fn)))(() => sync(preferred));
    }
    const observer = root.MutationObserver ? new root.MutationObserver(records => {
      let preferred = null, changed = false, additions = false;
      for (const record of records) {
        // Direct body/main additions only: never observe text/price/field churn.
        if (record.type === 'childList') { additions = true; changed = true; continue; }
        if (record.target === main && record.attributeName === 'class') { changed = true; continue; }
        if (!groups.has(record.target)) continue;
        changed = true;
        // Becoming eligible is not a request to edit: optional extra logos and
        // source comparisons must never steal the appearance-review frame.
        if ((record.attributeName === 'open' && record.target.open) || (record.attributeName === 'hidden' && !record.target.hidden && record.target.matches(REVEALED_WORK))) preferred = record.target;
      }
      if (additions) discover();
      if (changed) schedule(preferred);
    }) : null;
    function attention(event) {
      // Browser focus() also emits trusted focusin: only actual input intent may
      // start guidance. Hover and initialization must leave the welcome clear.
      if (event.type === 'keydown') {
        if (event.isTrusted && event.key === 'Tab') keyboardIntent = true;
        else if (event.isTrusted && !event.metaKey && !event.ctrlKey && !event.altKey &&
          (event.key === 'Enter' || event.key === ' ' || event.key?.startsWith('Arrow'))) {
          // Native keyboard activation/selection is deliberate, like a press.
        } else return;
        if (event.key === 'Tab') return;
      }
      let node = nearest(event.target);
      if (!engaged) {
        const control = event.target?.closest?.('input, select, textarea, button, a, label, summary, [contenteditable="true"]');
        const intent = event.isTrusted && (
          (event.type === 'focusin' && keyboardIntent) ||
          (['pointerdown', 'input', 'change', 'keydown'].includes(event.type) && control));
        if (!intent || !node || !visible(node)) return;
        engaged = true; keyboardIntent = false;
      }
      if (event.type === 'focusin' && /^H[1-6]$/.test(event.target?.tagName || '') && STAGES.includes(node?.id)) node = defaultGroup(node.id);
      // A drifting mouse is not a request to leave a field being edited.
      // Native focus and an intentional first press can still switch immediately.
      if (event.type === 'pointerover' && editing(doc.activeElement) && nearest(doc.activeElement) !== node) return;
      // Constant-time fast path for pointer movement inside the same panel.
      if (!node || node === active) return;
      activate(node);
    }
    function listen(node, type, fn, options) {
      node.addEventListener(type, fn, options); listeners.push(() => node.removeEventListener(type, fn, options));
    }
    discover();
    // Intent checks are constant-time; repeated input causes no writes, layout or bitmap work.
    // Capture runs before the target action/default so the first tap/keystroke
    // always acts on an already crisp, fully enabled real control.
    for (const type of ['focusin', 'pointerdown', 'pointerover', 'keydown', 'input', 'change']) listen(doc, type, attention, { capture: true, passive: true });
    listen(doc, 'close', () => sync(), true);
    if (observer) { observer.observe(doc.body, { childList: true }); observer.observe(main, { childList: true, attributes: true, attributeFilter: ['class'] }); }
    main.setAttribute('data-focus-guidance', 'true');
    const controller = Object.freeze({
      sync() { discover(); sync(); },
      getActiveGroup() { return active?.getAttribute(GROUP) || null; },
      destroy() {
        disposed = true; observer?.disconnect(); for (const remove of listeners) remove();
        for (const node of groups) { attr(node, ACTIVE, false); node.removeAttribute(GROUP); }
        for (const node of contexts) attr(node, PASSIVE, false);
        main.removeAttribute('data-focus-guidance'); delete doc.__hijyenLabFocusGuidance;
      }
    });
    doc.__hijyenLabFocusGuidance = controller; sync(); return controller;
  }
  const api = Object.freeze({ GROUPS, STAGES, visible, editing, passiveAllowed, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabFocusGuidance = api;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true });
    else mount(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
