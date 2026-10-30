/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { layoutLogoRow } = require('../frontend/logo-row.js');
const area = { x: 260, y: 165, width: 1340, height: 200 };
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
function verify(assets, rect, options) {
  const result = layoutLogoRow(assets, rect, options);
  assert.equal(result.boxes.length, assets.length);
  result.boxes.forEach((box, i) => {
    assert.equal(box.id, assets[i].id);
    close(box.width / box.height, assets[i].width / assets[i].height);
    assert.ok(box.x >= rect.x - 1e-7 && box.y >= rect.y - 1e-7);
    assert.ok(box.x + box.width <= rect.x + rect.width + 1e-7);
    assert.ok(box.y + box.height <= rect.y + rect.height + 1e-7);
    close(box.y + box.height / 2, rect.y + rect.height / 2);
    if (i) close(box.x - result.boxes[i - 1].x - result.boxes[i - 1].width, result.gap);
  });
  close(result.bounds.x + result.bounds.width / 2, rect.x + rect.width / 2);
  return result;
}
test('single composite stays one intact asset and maximizes safe height/width', () => {
  const r = verify([{ id: 'bc-mualla-composite', width: 900, height: 300 }], area);
  close(r.boxes[0].height, 200); close(r.boxes[0].width, 600);
  const wide = verify([{ id: 'wide', width: 9000, height: 100 }], area);
  close(wide.boxes[0].width, area.width);
});
test('mixed aspect ratios, optical weights, and 1–4 rows', () => {
  const all = [{ id: 'square', width: 300, height: 300 }, { id: 'wide', width: 1200, height: 100 }, { id: 'tall', width: 60, height: 700, opticalScale: 1.25 }, { id: 'small', width: 400, height: 220, opticalScale: .75 }];
  for (let n = 1; n <= 4; n++) verify(all.slice(0, n), area, { gap: 24 });
});
test('front and rear 4+4 are independent geometry, never plate counts', () => {
  const assets = Array.from({ length: 4 }, (_, i) => ({ id: `a${i}`, width: 300 + i * 50, height: 200 }));
  const front = verify(assets, { x: 280, y: 210, width: 1040, height: 430 });
  const rear = verify(assets, area);
  assert.equal(front.boxes.length + rear.boxes.length, 8);
  assert.equal('inkCount' in front, false);
});
test('deterministic 5000-case geometry property sweep', () => {
  let seed = 71681;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let trial = 0; trial < 5000; trial++) {
    const n = 1 + Math.floor(rand() * 4);
    const rect = { x: rand() * 300, y: rand() * 300, width: 200 + rand() * 1500, height: 40 + rand() * 700 };
    const assets = Array.from({ length: n }, (_, i) => ({ id: String(i), width: 10 ** (rand() * 5), height: 10 ** (rand() * 5), opticalScale: .75 + rand() * .5 }));
    verify(assets, rect, { gap: rand() * rect.width / (n * 2), widthCapRatio: .2 + rand() * .8 });
  }
});
test('invalid inputs fail rather than emit clipped or nonfinite geometry', () => {
  const a = [{ id: 'a', width: 20, height: 20 }];
  for (const assets of [[], [...a, ...a], Array.from({ length: 5 }, (_, i) => ({ ...a[0], id: String(i) })), [{ ...a[0], height: 0 }], [{ ...a[0], width: Infinity }], [{ ...a[0], opticalScale: 2 }]]) assert.throws(() => layoutLogoRow(assets, area));
  assert.throws(() => layoutLogoRow(a, { ...area, height: -1 }));
  assert.throws(() => layoutLogoRow(a, area, { widthCapRatio: 0 }));
  assert.throws(() => layoutLogoRow([{ ...a[0], id: 'a' }, { ...a[0], id: 'b' }], area, { gap: 2000 }));
});
