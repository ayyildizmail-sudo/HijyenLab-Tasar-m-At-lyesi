/* 3D package view in the quote summary: front and back previews on one turnable packet.
 * Pointer drag, arrow keys and buttons turn it; one slow turn plays when it first appears
 * (skipped under reduced motion). Uses only the images the app already rendered. */
(function (root) {
  'use strict';
  const clampTilt = x => Math.max(-25, Math.min(25, x));
  function norm(deg) { return ((deg % 360) + 360) % 360; }
  // Light from upper left: brightness of the face that is currently toward the viewer.
  function shading(yaw) {
    const r = norm(yaw) * Math.PI / 180, facing = Math.abs(Math.cos(r));
    return { dark: +(0.42 * (1 - facing)).toFixed(3), shine: +(Math.max(0, Math.sin(r)) * 0.18).toFixed(3), shadow: +(0.55 + 0.45 * facing).toFixed(3) };
  }
  function side(yaw) { const n = norm(yaw); return n > 90 && n < 270 ? 'back' : 'front'; }

  function create(doc, id, title) {
    const wrap = doc.createElement('section'); wrap.id = id; wrap.className = 'pkg3d'; wrap.hidden = true;
    wrap.innerHTML = '<h2></h2><div class="pkg3dStage" tabindex="0" role="img" aria-label="Paketin 3D görünümü. Sürükleyerek veya ok tuşlarıyla döndürün."><div class="pkg3dShadow"></div><img class="pkg3dFlat" alt=""><div class="pkg3dObj"><div class="pkg3dFace pkg3dFront"><img alt=""></div><div class="pkg3dFace pkg3dBack"><img alt=""></div></div></div><div class="pkg3dButtons"><button type="button" class="outline" data-to="0">Ön yüz</button><button type="button" class="outline" data-to="180">Arka yüz</button><button type="button" class="outline" data-spin>Döndür</button></div><p class="hint">Parmağınızla veya fareyle sürükleyerek çevirin. Görünüm yaklaşık önizlemedir.</p>';
    wrap.querySelector('h2').textContent = title;
    const stage = wrap.querySelector('.pkg3dStage'), obj = wrap.querySelector('.pkg3dObj'), shadow = wrap.querySelector('.pkg3dShadow');
    const front = wrap.querySelector('.pkg3dFront img'), back = wrap.querySelector('.pkg3dBack img'), flat = wrap.querySelector('.pkg3dFlat');
    let yaw = 0, pitch = 0, anim = 0, drag = null;
    const reduced = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    function paint() {
      moving();
      obj.style.transform = 'rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
      const s = shading(yaw);
      const light = 'drop-shadow(0 2px 2px rgba(20,40,60,.18)) brightness(' + (1 - s.dark + s.shine).toFixed(3) + ')';
      front.style.filter = light; back.style.filter = light;
      shadow.style.transform = 'scaleX(' + s.shadow + ')';
      stage.dataset.side = side(yaw);
    }
    let settle = 0;
    // While still and square to the viewer, show the plain full-resolution image instead of the 3D layer.
    function rest() {
      if (anim || drag) return;
      const n = norm(yaw);
      if ((n < 0.5 || n > 359.5 || Math.abs(n - 180) < 0.5) && Math.abs(pitch) < 0.5) {
        const src = (side(yaw) === 'back' ? back : front).src;
        if (src && flat.src !== src) flat.src = src;
        stage.classList.add('is-flat');
      }
    }
    function moving() { stage.classList.remove('is-flat'); root.clearTimeout(settle); settle = root.setTimeout(rest, 150); }
    function stop() { if (anim) root.cancelAnimationFrame(anim); anim = 0; }
    function animateTo(target, ms) {
      stop();
      if (reduced()) { yaw = target; paint(); return; }
      const from = yaw, t0 = root.performance.now();
      const tick = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; yaw = from + (target - from) * e; paint(); anim = k < 1 ? root.requestAnimationFrame(tick) : 0; };
      anim = root.requestAnimationFrame(tick);
    }
    function nearest(target) { const base = Math.round((yaw - target) / 360) * 360; return target + base; }
    stage.addEventListener('pointerdown', e => { stop(); drag = { x: e.clientX, y: e.clientY, yaw, pitch }; stage.setPointerCapture?.(e.pointerId); });
    stage.addEventListener('pointermove', e => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * 0.6; pitch = clampTilt(drag.pitch - (e.clientY - drag.y) * 0.25); paint(); });
    const end = () => { if (!drag) return; drag = null; pitch = 0; animateTo(nearest(side(yaw) === 'back' ? 180 : 0), 380); };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stop(); yaw += e.key === 'ArrowLeft' ? -15 : 15; paint(); }
    });
    wrap.querySelectorAll('[data-to]').forEach(b => b.addEventListener('click', () => animateTo(nearest(Number(b.dataset.to)), 700)));
    wrap.querySelector('[data-spin]').addEventListener('click', () => animateTo(yaw + 360, 2200));
    let shownFor = '';
    let pending = '';
    function show(frontSrc, backSrc, spin = true) {
      const key = frontSrc + '|' + backSrc;
      if (key === shownFor) { wrap.hidden = false; return; }
      if (key === pending) return;
      pending = key;
      Promise.all([trim(doc, frontSrc), trim(doc, backSrc)]).then(([f, b]) => {
        if (pending !== key) return;
        pending = ''; shownFor = key; front.src = f; back.src = b; wrap.hidden = false;
        if (spin) { yaw = 0; pitch = 0; paint(); root.setTimeout(() => { if (shownFor === key) animateTo(360, 2600); }, 400); } else paint();
      }).catch(() => { if (pending === key) pending = ''; });
    }
    function hide() { stop(); wrap.hidden = true; }
    paint();
    function reset() { shownFor = ''; }
    return { el: wrap, show, hide, reset };
  }

  // Crop transparent margins so front and back packets fill the same box at the same scale.
  function alphaBox(data, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function trim(doc, src) {
    return new Promise((resolve, reject) => {
      const img = new root.Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight, c = doc.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const box = alphaBox(g.getImageData(0, 0, w, h).data, w, h);
          if (!box || (box.w === w && box.h === h)) return resolve(src);
          const o = doc.createElement('canvas'); o.width = box.w; o.height = box.h;
          o.getContext('2d').drawImage(c, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
          resolve(o.toDataURL('image/png'));
        } catch (e) { resolve(src); }
      };
      img.onerror = reject; img.src = src;
    });
  }

  function rearSource(doc) {
    let rendered = null;
    try { rendered = typeof root.rearQuoteImage === 'function' ? root.rearQuoteImage() : null; } catch { rendered = null; }
    if (typeof rendered === 'string' && rendered) return rendered;
    try { if (typeof rearRenderedData === 'string' && rearRenderedData) return rearRenderedData; } catch { /* not loaded */ }
    const blank = doc.getElementById('rearBlankImage')?.src;
    return blank && !blank.endsWith('/') ? blank : null;
  }

  function blankRear(doc) {
    return new Promise(resolve => {
      const id = root.selectedProductId || 'BM12';
      let asset = null; try { asset = root.ProductCatalog?.get(id)?.backAsset; } catch { asset = null; }
      if (!asset) return resolve(null);
      const img = new root.Image();
      img.onload = () => {
        let url = null;
        try { if (typeof rearMaterialDataURL === 'function' && typeof state !== 'undefined') url = rearMaterialDataURL(img, state.bg || '#ffffff'); } catch { url = null; }
        resolve(url || img.src);
      };
      img.onerror = () => resolve(null);
      img.src = asset;
    });
  }
  function frontNow() {
    try { return typeof visualPreviewImageData === 'function' ? visualPreviewImageData() : typeof imageData === 'function' ? imageData() : null; } catch { return null; }
  }
  // Design step: a button under the live preview opens the same turnable packet.
  function mountDesign(doc) {
    const preview = doc.querySelector('#design .preview'), actions = doc.getElementById('simpleTools') || doc.querySelector('#design .actions');
    if (!preview || !actions || doc.getElementById('package3dDesign')) return;
    const viewer = create(doc, 'package3dDesign', '3D görünüm');
    const note = doc.createElement('p'); note.className = 'hint pkg3dIssue'; note.setAttribute('role', 'status'); note.hidden = true;
    preview.after(viewer.el, note);
    const button = doc.createElement('button'); button.type = 'button'; button.id = 'open3d'; button.className = 'outline'; button.textContent = '◐ 3D gör'; button.setAttribute('aria-expanded', 'false');
    actions.append(button);
    let open = false, timer = 0;
    async function refresh(spin) {
      const f = frontNow(), b = await blankRear(doc);
      if (!open) return;
      if (!f || !b) { viewer.hide(); note.textContent = '3D görünüm için önce tasarımdaki uyarıyı giderin.'; note.hidden = false; return; }
      note.hidden = true; viewer.show(f, b, spin);
    }
    button.addEventListener('click', () => {
      open = !open; button.setAttribute('aria-expanded', String(open)); button.textContent = open ? '◐ 3D kapat' : '◐ 3D gör';
      if (open) { viewer.reset(); refresh(true); viewer.el.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); } else { viewer.hide(); note.hidden = true; }
    });
    const later = () => { if (!open) return; root.clearTimeout(timer); timer = root.setTimeout(() => refresh(false), 700); };
    for (const ev of ['change', 'input', 'pointerup', 'click']) doc.getElementById('design').addEventListener(ev, e => { if (!viewer.el.contains(e.target) && e.target !== button) later(); });
    new root.MutationObserver(() => { if (doc.getElementById('design').hidden && open) button.click(); }).observe(doc.getElementById('design'), { attributes: true, attributeFilter: ['hidden'] });
  }

  function mount(doc) {
    const summary = doc.getElementById('summary');
    mountDesign(doc);
    if (!summary || doc.getElementById('package3d')) return;
    const viewer = create(doc, 'package3d', 'Paketi döndürün');
    const anchor = doc.getElementById('finalDetails');
    if (anchor) anchor.before(viewer.el); else summary.append(viewer.el);
    const sync = () => {
      const img = doc.getElementById('finalImage')?.src || '';
      const backSrc = rearSource(doc);
      if (summary.hidden || !img.startsWith('data:image/') || !backSrc) { if (!viewer.el.hidden) viewer.hide(); return; }
      viewer.show(img, backSrc);
    };
    new root.MutationObserver(sync).observe(summary, { subtree: true, attributes: true, attributeFilter: ['hidden', 'src'] });
    sync();
  }

  const api = { shading, side, alphaBox, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabPackage3D = api;
    const start = () => mount(root.document);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
