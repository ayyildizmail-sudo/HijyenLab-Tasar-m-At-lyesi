/* Silent, finite presentation responses. Never reads pixels, prices or customer values. */
(function (root) {
  'use strict';
  function create(doc, media) {
    const active = new Map();
    let suspended = false, quoteToken = null, surface = null;
    const cleanups = new Map(), quoteNodes = new Set();
    const get = id => doc.getElementById(id);
    function cancel(node) { const old = active.get(node); if (old) { active.delete(node); old.cancel(); } const cleanup = cleanups.get(node); cleanups.delete(node); cleanup?.(); }
    function cancelAll() { for (const node of [...active.keys()]) cancel(node); if (surface) { surface.remove(); surface = null; } }
    const textField = node => node?.tagName === 'TEXTAREA' || (node?.tagName === 'INPUT' && !['radio','checkbox','color','button','submit','range','file'].includes(node.type));
    function eligible(node) {
      if (!node) return false;
      const editing = textField(doc.activeElement);
      const rect = node.getBoundingClientRect?.();
      const offscreen = rect && (rect.top + rect.height <= 0 || rect.top >= (root.innerHeight || Infinity));
      let closed = false;
      for (let parent = node.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS' && !parent.open) closed = true;
      return !(suspended || media?.matches || doc.hidden || editing || offscreen || closed || node.closest?.('[hidden]') || !node.animate);
    }
    function play(node, frames, duration = 280, cleanup) {
      if (!node) return;
      cancel(node);
      if (!eligible(node)) { cleanup?.(); return; }
      if (cleanup) cleanups.set(node, cleanup);
      const animation = node.animate(frames, { duration, easing: 'cubic-bezier(.2,.7,.2,1)', iterations: 1 });
      active.set(node, animation);
      const done = () => { if (active.get(node) === animation) { active.delete(node); const cleanup = cleanups.get(node); cleanups.delete(node); cleanup?.(); } };
      animation.onfinish = done; animation.oncancel = done;
    }
    const settle = node => play(node, [{ transform: 'translateY(-5px) rotate(-.65deg)', opacity: .9 }, { transform: 'translateY(0) rotate(0)', opacity: 1 }], 340);
    const highlight = node => play(node, [{ boxShadow: '0 0 0 3px #0876e82e' }, { boxShadow: '0 0 0 0px #0876e800' }]);
    function slot(input) {
      if (!input || input.parentElement?.querySelector('.journeyFieldCheck')) return;
      input.parentElement.classList.add('journeyField');
      const check = doc.createElement('span'); check.className = 'journeyFieldCheck'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
      input.parentElement.append(check);
    }
    function lead(input, valid, completed) {
      const check = input?.parentElement?.querySelector('.journeyFieldCheck');
      if (!check) return;
      const was = check.classList.contains('is-valid');
      check.classList.toggle('is-valid', !!valid && !!completed);
      if (!completed || !valid) cancel(check);
      else if (!was) play(check, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], 220);
    }
    function reset() {
      cancelAll(); hideColorPreview(); quoteToken = null;
      for (const check of doc.querySelectorAll('.journeyFieldCheck.is-valid')) check.classList.remove('is-valid');
    }
    function hideColorPreview() {
      const preview = get('journeyColorPreview');
      if (preview) preview.style.visibility = 'hidden';
    }
    function colorPreview() {
      const panel = get('bgPanel'), source = get('package');
      if (!panel?.open || panel.closest?.('[hidden]') || !source) return null;
      let preview = get('journeyColorPreview');
      if (!preview) {
        preview = doc.createElement('canvas'); preview.id = 'journeyColorPreview'; preview.width = 640; preview.height = 340;
        preview.setAttribute('aria-label', 'Seçili ambalaj renginin güncel önizlemesi');
        get('backgrounds')?.before(preview);
      }
      const ctx = preview.getContext('2d'), scale = Math.min(640 / source.width, 340 / source.height);
      ctx.clearRect(0, 0, 640, 340);
      ctx.drawImage(source, (640 - source.width * scale) / 2, (340 - source.height * scale) / 2, source.width * scale, source.height * scale);
      preview.style.visibility = 'visible'; return preview;
    }
    function beforeBackground() {
      if (surface) cancel(surface);
      if (surface) { surface.remove(); surface = null; }
      const main = get('package'), local = get('journeyColorPreview');
      const mainRect = main?.getBoundingClientRect();
      const mainVisible = mainRect && mainRect.top >= 0 && mainRect.top + mainRect.height <= (root.innerHeight || Infinity);
      const source = !mainVisible && local?.style.visibility === 'visible' ? local : main;
      if (!eligible(source)) return;
      // One bounded bitmap copy per committed color action; no readback or artwork preparation.
      const rect = source.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const copy = doc.createElement('canvas');
      copy.width = source.width; copy.height = source.height;
      copy.setAttribute('aria-hidden', 'true'); copy.className = 'journeySurfaceSweep';
      Object.assign(copy.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', objectFit: 'contain', pointerEvents: 'none', zIndex: '10' });
      try { copy.getContext('2d').drawImage(source, 0, 0); } catch { return; }
      surface = copy; doc.body.append(copy);
    }
    function background() {
      colorPreview();
      const copy = surface;
      if (!copy) return;
      play(copy, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], 320, () => { copy.remove(); if (surface === copy) surface = null; });
    }
    function composeQuote(data) {
      if (!data?.front) return null;
      const front = get('finalImage');
      if (!front) return null;
      let faces = get('journeyQuoteFaces');
      if (!faces) { faces = doc.createElement('div'); faces.id = 'journeyQuoteFaces'; front.before(faces); faces.append(front); }
      let rear = get('journeyQuoteRear');
      if (!rear) { rear = doc.createElement('img'); rear.id = 'journeyQuoteRear'; rear.alt = 'Onaylanan arka yüz önizlemesi'; faces.append(rear); }
      front.src = data.front; rear.hidden = !data.rear;
      if (data.rear) rear.src = data.rear; else rear.removeAttribute('src');
      faces.classList.toggle('has-rear', !!data.rear);
      let costs = get('journeyQuoteCosts');
      if (!costs) { costs = doc.createElement('div'); costs.id = 'journeyQuoteCosts'; get('finalDetails').before(costs); }
      costs.replaceChildren();
      // One primary offer: real current cost rows, including exactly one total.
      for (const row of data.breakdown?.querySelectorAll('.priceRow') || []) {
        const copy = row.cloneNode(true); copy.removeAttribute('id');
        for (const identified of copy.querySelectorAll('[id]')) identified.removeAttribute('id');
        costs.append(copy);
      }
      let note = get('journeyQuoteNote');
      if (!note) { note = doc.createElement('p'); note.id = 'journeyQuoteNote'; note.className = 'hint'; costs.after(note); }
      note.textContent = data.vat || '';
      let description = get('journeyQuoteDescription');
      if (!description) { description = doc.createElement('p'); description.id = 'journeyQuoteDescription'; description.className = 'hint'; faces.after(description); }
      description.textContent = [...get('finalDetails').children].slice(0, 3).map(row => row.textContent).join(' · ');
      const downloadPreview = get('quoteDownloadPreview');
      if (downloadPreview && !get('journeyQuoteJpeg')) {
        const disclosure = doc.createElement('details'); disclosure.id = 'journeyQuoteJpeg';
        const heading = doc.createElement('summary'); heading.textContent = 'JPG önizlemesini aç';
        downloadPreview.before(disclosure); disclosure.append(heading, downloadPreview);
      }
      const disclosure = get('journeyQuoteJpeg'); if (disclosure) { disclosure.hidden = false; disclosure.open = false; }
      faces.hidden = false; costs.hidden = false; note.hidden = false; description.hidden = false;
      return { front, rear: data.rear ? rear : null, rows: [...costs.children] };
    }
    function quote(token, ready, data) {
      if (!ready || !token) { for (const node of quoteNodes) cancel(node); quoteNodes.clear(); cancel(get('quoteImage')); cancel(get('finalDetails')); for (const id of ['journeyQuoteFaces','journeyQuoteCosts','journeyQuoteNote','journeyQuoteDescription','journeyQuoteJpeg']) { const node = get(id); if (node) node.hidden = true; } const costs = get('journeyQuoteCosts'); if (costs) costs.replaceChildren(); const rear = get('journeyQuoteRear'); if (rear) { rear.hidden = true; rear.removeAttribute('src'); } return; }
      if (token === quoteToken) return;
      quoteToken = token;
      const composition = composeQuote(data);
      if (composition) {
        for (const node of [composition.front, composition.rear, ...composition.rows]) if (node) quoteNodes.add(node);
        play(composition.front, [{ transform: 'translateX(-12px) rotate(-1deg)' }, { transform: 'translateX(0) rotate(0)' }], 340);
        play(composition.rear, [{ transform: 'translateX(12px) rotate(1deg)' }, { transform: 'translateX(0) rotate(0)' }], 340);
        composition.rows.forEach((row, index) => play(row, [{ transform: 'translateX(' + (index % 2 ? 8 : -8) + 'px)', opacity: .7 }, { transform: 'translateX(0)', opacity: 1 }], 260 + Math.min(index, 5) * 20));
        return;
      }
      play(get('quoteImage'), [{ opacity: .65, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], 360);
      play(get('finalDetails'), [{ opacity: .65 }, { opacity: 1 }], 300);
    }
    for (const event of ['pointerdown', 'pointermove']) get('package')?.addEventListener?.(event, e => { if (event === 'pointermove' && !e?.buttons) return; cancelAll(); hideColorPreview(); }, true);
    get('bgPanel')?.addEventListener?.('toggle', () => { if (get('bgPanel').open) colorPreview(); else hideColorPreview(); });
    // Cancellation only: no values, validation, artwork or layout reads on typing.
    for (const event of ['focusin', 'input']) doc.addEventListener?.(event, e => { if (textField(e.target)) cancelAll(); }, true);
    root.addEventListener?.('pagehide', cancelAll);
    // Only the fixed-position color copy is invalid during scrolling. DOM-attached
    // finite feedback follows its target and should survive navigation's own scroll.
    root.addEventListener?.('scroll', () => { if (surface) { cancel(surface); surface?.remove(); surface = null; } }, { capture: true, passive: true });
    root.addEventListener?.('resize', cancelAll);
    doc.addEventListener?.('visibilitychange', () => { if (doc.hidden) cancelAll(); });
    media?.addEventListener?.('change', () => { if (media.matches) cancelAll(); });
    return Object.freeze({
      product() { highlight(get('productSelect')); settle(get('package')); },
      logo() { play(get('package'), [{ opacity: .65, transform: 'scale(.995)' }, { opacity: 1, transform: 'scale(1)' }], 300); },
      beforeBackground, background, colorPreview, hideColorPreview,
      front() { highlight(get('rearTitle')); },
      rear() { if (!get('rearEditor')?.contains(doc.activeElement)) settle(get('rearBlankImage')); },
      fragrance(node) { settle(node?.querySelector('.fragranceIcon')); highlight(node); },
      slot, lead, quote, reset, cancelAll,
      suspend(value) { suspended = !!value; if (suspended) reset(); }
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
  else root.HijyenLabJourneyMotion = create(root.document, root.matchMedia?.('(prefers-reduced-motion: reduce)'));
})(typeof window !== 'undefined' ? window : globalThis);
