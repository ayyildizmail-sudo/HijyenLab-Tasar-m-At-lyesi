/* Presentation/navigation only. Reuse live controls; never change design, price or consent state. */
(function (root) {
  'use strict';
  const panels = ['summary', 'pricing', 'fragrancePanel', 'whiteCarrierPanel', 'photoEditor', 'pdfPicker', 'rearPreview', 'design'];
  let controller = null;
  function working(value, panel) {
    return panel !== 'design' || !!(value.logo || value.photoLayout || value.sourcePhoto || value.designProcessing || value.designBlocked || value.screenSelectionRequired);
  }
  function editing(node) {
    return !!node && (node.isContentEditable || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || (node.tagName === 'INPUT' && !['button', 'submit', 'reset', 'file', 'checkbox', 'radio'].includes(node.type)));
  }
  function mount(doc) {
    if (doc.getElementById('journeyProductContext')) return controller;
    const main = doc.querySelector('main'), picker = doc.querySelector('.productPicker');
    if (!main || !picker) return null;
    const get = id => doc.getElementById(id);
    const visible = node => !!node && !node.closest('[hidden]');
    const activePanel = () => panels.find(id => visible(get(id))) || 'design';
    const value = () => typeof state === 'undefined' ? {} : state;
    const make = (tag, id, text) => { const node = doc.createElement(tag); node.id = id; if (text) node.textContent = text; return node; };
    const context = make('section', 'journeyProductContext'); context.setAttribute('aria-label', 'Seçili ürün ve baskı tercihi');
    const summary = make('div', 'journeyProductSummary');
    const description = make('p', 'journeyProductDescription');
    const product = make('strong', 'journeyProductName'), mode = make('span', 'journeyProductMode');
    const change = make('button', 'journeyProductChange', 'Değiştir'); change.type = 'button'; change.className = 'outline';
    // Move the whole original picker once. All inputs, event handlers, advisor and mode guards survive.
    if (!picker.id) picker.id = 'journeyProductControls';
    change.setAttribute('aria-controls', picker.id);
    description.append(product, mode); summary.append(description, change);
    picker.before(context); context.append(summary, picker);
    let started = working(value(), activePanel()), expanded = false, ticket = 0, pendingNavigation = null;
    const frame = root.requestAnimationFrame || (fn => root.setTimeout(fn, 0));
    let previousEntry = activePanel() + ':' + (started ? 'work' : 'start');
    const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const hide = (node, yes) => { if (node.hidden !== yes) node.hidden = yes; };
    function sync() {
      if (working(value(), activePanel())) started = true;
      const catalog = root.ProductCatalog?.get(root.selectedProductId || root.ProductCatalog.defaultId);
      put(product, catalog?.label || get('productSelect')?.selectedOptions?.[0]?.textContent || 'Seçili ürün');
      put(mode, root.HijyenLabPrintMode?.get() === 'unprinted' ? 'Baskısız' : 'Logolu / Baskılı');
      main.classList.toggle('journeyStarted', started);
      hide(summary, !started); hide(picker, started && !expanded);
      const open = String(!started || expanded);
      if (change.getAttribute('aria-expanded') !== open) change.setAttribute('aria-expanded', open);
      put(change, expanded ? 'Kapat' : 'Değiştir');
    }
    function finishNavigation(settled) {
      const pending = pendingNavigation; pendingNavigation = null;
      if (pending) for (const callback of pending.listeners) callback(settled);
    }
    function cancelNavigation() { ++ticket; finishNavigation(false); }
    function afterNavigation(callback) {
      if (!pendingNavigation) { callback(true); return () => {}; }
      const pending = pendingNavigation; pending.listeners.add(callback);
      return () => pending.listeners.delete(callback);
    }
    const scrollPosition = () => Number(root.scrollY ?? doc.scrollingElement?.scrollTop ?? 0);
    function schedule(target, panel) {
      cancelNavigation();
      const operation = ++ticket, pending = { listeners: new Set(), started: false, endPosition: null, endFrames: 0 };
      // Registered before rAF: source-completion microtasks can wait for the heading/scroll, not race it.
      pendingNavigation = pending;
      frame(() => {
        if (operation !== ticket || pendingNavigation !== pending) return;
        // A newer transition, open modal, or typing owns attention. Never steal focus or open a keyboard.
        if (doc.hidden || !visible(target) || (panel && activePanel() !== panel) || doc.querySelector('dialog[open]') || editing(doc.activeElement)) { finishNavigation(false); return; }
        const heading = target.querySelector('h1, h2, [role="heading"]') || target;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(heading.tagName) || heading.isContentEditable) { finishNavigation(false); return; }
        heading.tabIndex = -1;
        heading.focus?.({ preventScroll: true });
        pending.started = true;
        heading.scrollIntoView?.({ block: 'start', behavior: root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        let previous = scrollPosition(), stable = 0, frames = 0, moved = false;
        const observe = () => {
          if (operation !== ticket || pendingNavigation !== pending) return;
          if (doc.hidden) { finishNavigation(false); return; }
          const current = scrollPosition(); moved ||= Math.abs(current - previous) > .5;
          stable = Math.abs(current - previous) <= .5 ? stable + 1 : 0; previous = current;
          // A late scrollend from an older smooth scroll cannot release a still-moving newer entry.
          if (pending.endPosition !== null) {
            if (Math.abs(current - pending.endPosition) > .5) { pending.endPosition = null; pending.endFrames = 0; }
            else if (++pending.endFrames >= 2) { finishNavigation(true); return; }
          }
          // Native scrollend plus stable frames is authoritative after motion. Stable-position fallback covers unsupported
          // browsers and no-op scrolling; a still-moving viewport times out by skipping optional motion.
          if (stable >= 6 && (!('onscrollend' in doc) || !moved)) { finishNavigation(true); return; }
          if (++frames >= 120) { finishNavigation(false); return; }
          frame(observe);
        };
        frame(observe);
      });
    }
    doc.addEventListener('scrollend', event => { if (pendingNavigation?.started && (!event.target || event.target === doc)) { pendingNavigation.endPosition = scrollPosition(); pendingNavigation.endFrames = 0; } });
    // Cancellation only: these never scroll, focus, render artwork or modify an input.
    for (const type of ['pointerdown', 'keydown', 'input', 'change', 'wheel', 'touchstart']) doc.addEventListener(type, cancelNavigation, { capture: true, passive: true });
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancelNavigation(); });
    function enter(id, options = {}) {
      const target = get(id); if (!visible(target)) return;
      sync();
      const entry = id + ':' + (started ? 'work' : 'start');
      if (entry === previousEntry) return;
      previousEntry = entry; expanded = false; cancelNavigation(); sync();
      const review = id === 'design' ? ['productReview', 'referenceRecovery'].map(get).find(visible) || target : target;
      if (!options.quiet) schedule(review, id);
    }
    function reveal(id) {
      const target = typeof id === 'string' ? get(id) : id;
      if (visible(target)) schedule(target, null);
    }
    change.onclick = () => { expanded = !expanded; sync(); };
    const rearEditor = get('rearEditor');
    rearEditor?.querySelector('summary')?.addEventListener('click', () => {
      // Native summary activation (including keyboard) only, not scripted open/toggle or typing.
      root.setTimeout(() => { if (rearEditor.open && visible(rearEditor)) reveal(rearEditor); }, 0);
    });
    // Observers only maintain concise copy and disclosure. Navigation is explicitly requested at panel entry.
    if (root.MutationObserver) new root.MutationObserver(sync).observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
    doc.addEventListener('change', sync);
    root.addEventListener?.('hijyenlab:print-mode-change', sync);
    controller = { sync, enter, reveal, afterNavigation }; sync(); return controller;
  }
  const api = { working, editing, mount, enter: (id, options) => controller?.enter(id, options), reveal: id => controller?.reveal(id), afterNavigation: callback => controller ? controller.afterNavigation(callback) : (callback(true), () => {}) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.HijyenLabResponsiveJourney = api; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true }); else mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
