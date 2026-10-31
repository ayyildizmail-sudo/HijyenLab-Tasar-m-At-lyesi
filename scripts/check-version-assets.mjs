// Read-only post-versioning check. Run after version-assets.py, before build.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const frontend = new URL('../frontend/', import.meta.url);
const html = await readFile(new URL('index.html', frontend), 'utf8');
const failures = [];
let checked = 0;
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
  const reference = match[1];
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) continue;
  const url = new URL(reference, frontend);
  const version = url.searchParams.get('v');
  if (version === null) continue;
  if (!url.href.startsWith(frontend.href)) { failures.push(`${reference}: outside frontend`); continue; }
  url.search = ''; url.hash = '';
  try {
    const hash = createHash('sha256').update(await readFile(url)).digest('hex').slice(0, 12);
    checked++;
    if (version !== hash) failures.push(`${reference}: expected v=${hash}`);
  } catch (error) { failures.push(`${reference}: ${error.code || error.message}`); }
}
if (!checked) failures.push('No local versioned references found');
if (failures.length) {
  console.error('[asset versions] FAIL\n' + failures.join('\n'));
  process.exitCode = 1;
} else console.log(`[asset versions] PASS ${checked} local index references match frontend bytes`);
