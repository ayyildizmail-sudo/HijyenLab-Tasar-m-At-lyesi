/* eslint-disable @typescript-eslint/no-require-imports -- Node-only independent regression harness. */
'use strict';
// Fails closed if a relevant passing regression becomes orphaned from release checks.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.HIJYENLAB_SOURCE||process.cwd());
const source=fs.readFileSync(path.join(root,'scripts/check-logo-regressions.mjs'),'utf8');
const gated=new Set([...source.matchAll(/'(tests\/[^']+\.test\.(?:cjs|mjs))'/g)].map(m=>m[1]));
const required=[
 'tests/draft-multitab.test.cjs','tests/lead-product-catalog.test.mjs','tests/multi-logo-quote-token.test.cjs','tests/sign-lettering.test.cjs','tests/frame-badge-sheet.test.cjs','tests/flexo-family-bridge.test.cjs',
 'tests/first-viewport.test.cjs', 'tests/drag-geometry.test.cjs', 'tests/startup-preview-performance.test.cjs','tests/rear-layout-spacing-private.test.cjs',
 'tests/welcome-layout.test.cjs','tests/opening-examples.test.cjs','tests/opening-examples-mobile.test.cjs','tests/opening-examples-accessibility.test.cjs',
 'tests/responsive-journey.test.cjs','tests/navigation-scroll-stability.test.cjs','tests/mobile-contact-layout.test.cjs','tests/contact-help.test.cjs',
 'tests/rear-input-responsiveness.test.cjs','tests/rear-layout.test.cjs','tests/rear-layout-profiles.test.cjs','tests/rear-display-shape.test.cjs',
 'tests/rear-contrast.test.cjs','tests/rear-text-ink.test.cjs','tests/rear-text-ink-ui.test.cjs','tests/rear-qr-decode.test.cjs',
 'tests/product-choice-carryover.test.cjs','tests/draft-resume-independent.test.cjs','tests/draft-resume-ui-independent.test.cjs','tests/logo-release-gate.test.mjs'
];
const report={check:'critical topical suite release-gate membership',source:root,totalGated:gated.size,required:required.length,missing:required.filter(f=>!gated.has(f))};
console.log(JSON.stringify(report,null,2));
if(report.missing.length&&!process.argv.includes('--report'))process.exitCode=1;
