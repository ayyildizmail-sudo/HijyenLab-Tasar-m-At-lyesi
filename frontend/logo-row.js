(function(root){'use strict';
// Geometry only: inputs are visible artwork bounds, not original padded files.
// A composite image is ONE asset; this module never discovers/splits brands.
function layoutLogoRow(assets, area, options = {}) {
  if (!Array.isArray(assets) || assets.length < 1 || assets.length > 4) throw new Error('Expected 1–4 assets');
  if (!area || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(area[k])) || area.width <= 0 || area.height <= 0) throw new Error('Invalid safe rectangle');
  const gap = options.gap ?? 16;
  const widthCapRatio = options.widthCapRatio ?? (assets.length === 1 ? 1 : .6);
  if (!Number.isFinite(gap) || gap < 0 || !Number.isFinite(widthCapRatio) || widthCapRatio <= 0 || widthCapRatio > 1) throw new Error('Invalid layout options');
  const ids = new Set();
  const available = area.width - gap * (assets.length - 1);
  if (available <= 0) throw new Error('Gaps exceed safe width');
  const cap = available * widthCapRatio;
  const items = assets.map(asset => {
    if (!asset || typeof asset.id !== 'string' || !asset.id || ids.has(asset.id)) throw new Error('Unique asset IDs required');
    ids.add(asset.id);
    const { width, height } = asset;
    const opticalScale = asset.opticalScale ?? 1;
    if (![width, height, opticalScale].every(Number.isFinite) || width <= 0 || height <= 0 || opticalScale < .75 || opticalScale > 1.25) throw new Error('Invalid artwork dimensions or optical scale');
    const ratio = width / height;
    // Common nominal height with bounded optical adjustment. Width caps avoid
    // a panoramic wordmark consuming the complete row. Never stretch pixels.
    const h = Math.min(area.height * opticalScale, cap / ratio);
    return { id: asset.id, width: h * ratio, height: h, sourceWidth: width, sourceHeight: height, opticalScale };
  });
  const rawWidth = items.reduce((n, p) => n + p.width, 0);
  const rawHeight = Math.max(...items.map(p => p.height));
  const scale = Math.min(1, available / rawWidth, area.height / rawHeight);
  if (!(Number.isFinite(scale) && scale > 0)) throw new Error('Unrepresentable artwork dimensions');
  const groupWidth = rawWidth * scale + gap * (items.length - 1);
  let x = area.x + (area.width - groupWidth) / 2;
  const boxes = items.map(p => {
    const width = p.width * scale, height = p.height * scale;
    if (![width, height].every(v => Number.isFinite(v) && v > 0)) throw new Error('Unrepresentable artwork dimensions');
    const box = { ...p, x, y: area.y + (area.height - height) / 2, width, height };
    x += width + gap;
    return box;
  });
  return { boxes, gap, scale, bounds: { x: area.x + (area.width - groupWidth) / 2, y: area.y + (area.height - rawHeight * scale) / 2, width: groupWidth, height: rawHeight * scale }, previewOnly: true };
}
const api={layoutLogoRow};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LogoRow=api;
})(globalThis);
