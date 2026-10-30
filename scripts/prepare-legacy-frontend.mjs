// Canonical frontend is source-controlled outside the generated build directory.
import { cp, mkdir, rm } from 'node:fs/promises';
// Fail before touching public assets if a logo regression or required fixture is missing.
await import('./check-logo-regressions.mjs');
await rm('public', {recursive:true, force:true});
await mkdir('public', {recursive:true});
await cp('frontend', 'public', {recursive:true, filter: path => !path.endsWith('/package.json')});
