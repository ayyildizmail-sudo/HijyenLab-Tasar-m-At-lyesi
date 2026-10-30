// Canonical frontend is source-controlled outside the generated build directory.
import { cp, mkdir, rm } from 'node:fs/promises';
// Release builds fail before touching assets if a regression or required fixture is missing.
// Dev previews prepare assets quickly; every build/publication still runs this gate.
const previewOnly = process.argv.slice(2).join(' ') === '--preview-only';
if (!previewOnly) await import('./check-logo-regressions.mjs');
await rm('public', {recursive:true, force:true});
await mkdir('public', {recursive:true});
await cp('frontend', 'public', {recursive:true, filter: path => !path.endsWith('/package.json')});
