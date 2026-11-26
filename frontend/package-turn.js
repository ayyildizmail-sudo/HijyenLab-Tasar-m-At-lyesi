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

  function create(doc) {
    const wrap = doc.createElement('section'); wrap.id = 'package3d'; wrap.hidden = true;
    wrap.innerHTML = '<h2>Paketi döndürün</h2><div class="pkg3dStage" tabindex="0" role="img" aria-label="Paketin 3D görünümü. Sürükleyerek veya ok tuşlarıyla döndürün."><div class="pkg3dShadow"></div><div class="pkg3dObj"><div class="pkg3dFace pkg3dFront"><img alt=""></div><div class="pkg3dFace pkg3dBack"><img alt=""></div></div></div><div class="pkg3dButtons"><button type="button" class="outline" data-to="0">Ön yüz</button><button type="button" class="outline" data-to="180">Arka yüz</button><button type="button" class="outline" data-spin>Döndür</button></div><p class="hint">Parmağınızla veya fareyle sürükleyerek çevirin. Görünüm yaklaşık önizlemedir.</p>';
    const stage = wrap.querySelector('.pkg3dStage'), obj = wrap.querySelector('.pkg3dObj'), shadow = wrap.querySelector('.pkg3dShadow');
    const front = wrap.querySelector('.pkg3dFront img'), back = wrap.querySelector('.pkg3dBack img');
    let yaw = 0, pitch = -6, anim = 0, drag = null;
    const reduced = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    function paint() {
      obj.style.transform = 'rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
      const s = shading(yaw);
      const light = 'drop-shadow(0 2px 2px rgba(20,40,60,.18)) brightness(' + (1 - s.dark + s.shine).toFixed(3) + ')';
      front.style.filter = light; back.style.filter = light;
      shadow.style.transform = 'scaleX(' + s.shadow + ')';
      stage.dataset.side = side(yaw);
    }
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
    const end = () => { if (!drag) return; drag = null; animateTo(nearest(side(yaw) === 'back' ? 180 : 0), 380); };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stop(); yaw += e.key === 'ArrowLeft' ? -15 : 15; paint(); }
    });
    wrap.querySelectorAll('[data-to]').forEach(b => b.addEventListener('click', () => animateTo(nearest(Number(b.dataset.to)), 700)));
    wrap.querySelector('[data-spin]').addEventListener('click', () => animateTo(yaw + 360, 2200));
    let shownFor = '';
    let pending = '';
    function show(frontSrc, backSrc) {
      const key = frontSrc + '|' + backSrc;
      if (key === shownFor) { wrap.hidden = false; return; }
      if (key === pending) return;
      pending = key;
      Promise.all([trim(doc, frontSrc), trim(doc, backSrc)]).then(([f, b]) => {
        if (pending !== key) return;
        pending = ''; shownFor = key; front.src = f; back.src = b; wrap.hidden = false;
        yaw = 0; pitch = -6; paint(); root.setTimeout(() => { if (shownFor === key) animateTo(360, 2600); }, 400);
      }).catch(() => { if (pending === key) pending = ''; });
    }
    function hide() { stop(); wrap.hidden = true; }
    paint();
    return { el: wrap, show, hide };
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

  function mount(doc) {
    const summary = doc.getElementById('summary');
    if (!summary || doc.getElementById('package3d')) return;
    const viewer = create(doc);
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
