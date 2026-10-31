'use strict';
// Focused CSS contract; actual browser geometry is a separate release QA check.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync('frontend/contact-help.css', 'utf8');
function rule(selector) {
  const start = css.indexOf(selector + ' {');
  assert(start >= 0, `Missing rule: ${selector}`);
  const block = css.slice(start + selector.length + 2, css.indexOf('}', start));
  return Object.fromEntries(block.split(';').filter(x => x.includes(':')).map(x => {
    const colon = x.indexOf(':');
    return [x.slice(0, colon).trim(), x.slice(colon + 1).trim()];
  }));
}
const controls = rule('#contactHelp :is(a, button)');
const actions = rule('#contactHelp .contactHelpActions');
assert.equal(controls.width, '48px'); assert.equal(controls.height, '48px');
assert.equal(controls['min-width'], '48px'); assert.equal(controls['min-height'], '44px');
assert.equal(controls['border-radius'], '12px');
assert.equal(controls.color, '#fff'); assert.equal(controls.background, '#1877f2');
const whatsapp = rule('#contactHelp #contactWhatsApp');
assert.equal(whatsapp.color, '#fff'); assert.equal(whatsapp.background, '#25d366');
assert.equal(actions.gap, '32px');
assert.equal((css.match(/#contactHelp \.contactHelpActions\s*\{/g) || []).length, 1,
  'No compact media rule may override the approved 32px edge gap');
assert.equal(controls.flex, '0 0 48px');
assert.equal(rule('#contactHelp :is(a, button):focus-visible').outline, '3px solid #075dc9');
assert.equal(rule('#contactHelp :is(a, button):focus-visible')['outline-offset'], '3px');
assert(css.includes('env(safe-area-inset-bottom)'));
assert(css.includes('env(safe-area-inset-left)') && css.includes('env(safe-area-inset-right)'));
assert(css.includes('body.contactHelpEditing #contactHelp { position: static; }'));
assert(css.includes('@media (max-height: 500px), (max-width: 320px)'));
assert(css.includes('var(--contact-help-height, 60px) + 16px'));
assert(css.includes('scroll-padding-bottom') && css.includes('scroll-margin-bottom'));
// The unshrinking icon pair occupies 128px. At tested portrait widths,
// normal 16px side gutters + 6px inner gap leave ample help-text width.
// This is a geometry budget, not a claim of measured rendered text/keyboard behavior.
for (const viewport of [320, 390, 430]) {
  const pairWidth = 2 * parseFloat(controls.width) + parseFloat(actions.gap);
  assert.equal(pairWidth, 128);
  const promptBudget = viewport - 2 * 16 - 6 - pairWidth;
  assert(promptBudget >= 154, `${viewport}px viewport retains help-text space`);
  assert(pairWidth + 2 * 6 <= viewport - 2 * 16, 'Focus outlines fit inside viewport');
}
assert(!css.includes('border-radius: 50%'));
console.log('PASS contact icon CSS: 48px iOS squares, solid green/blue and white art, invariant 32px gap, focus/touch/safe-area/static guards, 320/390/430px geometry budgets. Browser rendering checked separately.');
