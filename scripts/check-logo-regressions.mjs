// Release gate: test source files and private test fixtures, never generated/public assets.
import { access, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixtures = [
  'tests/fixtures/screenshot-artwork/source.jpeg',
  'tests/fixtures/composite-screenshot/source.jpeg',
  'tests/fixtures/technical-frame/source.jpeg',
];
const suites = [
  'tests/frame-geometry.test.cjs',
  'tests/screenshot-artwork.test.cjs',
  'tests/composite-screenshot.test.cjs',
  'tests/screenshot-background.test.cjs',
  'tests/screenshot-integration.test.cjs',
];
for (const path of [...fixtures, ...suites]) {
  const url = new URL(`../${path}`, import.meta.url);
  await access(url);
  if (!(await stat(url)).isFile() || !(await stat(url)).size) throw new Error(`Required logo regression input missing or empty: ${path}`);
}
for (const suite of suites) {
  console.log(`[logo release gate] ${suite}`);
  const result = spawnSync(process.execPath, [suite], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Logo regression gate failed: ${suite} (status ${result.status}, signal ${result.signal})`);
}
console.log('[logo release gate] All screenshot regressions passed.');
