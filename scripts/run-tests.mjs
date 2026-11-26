// Test gate: runs every tests/*.test.cjs file and prints one summary.
//   PASS     test passed
//   PRIVATE  test is listed in tests/private-fixture-tests.json AND stopped only because a private
//            customer photo is not on this machine (never silently skipped; always listed)
//   FAIL     anything else -> exit code 1
// Also runs the commercial-rules sync check and the asset version check.
//   node scripts/run-tests.mjs            (all)
//   node scripts/run-tests.mjs name ...   (only files whose name contains one of the words)
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privateList = JSON.parse(readFileSync(path.join(root, 'tests/private-fixture-tests.json'), 'utf8'));
const privateNames = new Set(Object.keys(privateList.tests));
const marker = /private[ -_]?(photo )?(fixture|proof|source|root)|_PRIVATE_[A-Z_]+|fixture is required|fixture missing/i;
const filter = process.argv.slice(2);
const files = readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.cjs') && (!filter.length || filter.some(w => f.includes(w)))).sort();
const result = { pass: [], private: [], fail: [] };
for (const file of files) {
  const name = file.replace(/\.test\.cjs$/, '');
  const run = spawnSync(process.execPath, [path.join('tests', file)], { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || '');
  if (run.status === 0) result.pass.push(name);
  else if (privateNames.has(name) && marker.test(output)) result.private.push(name);
  else result.fail.push({ name, reason: (output.match(/(AssertionError[^\n]*|Error[^\n]*|not ok[^\n]*)/) || [run.error?.message || 'exit ' + run.status])[0].slice(0, 200) });
}
const checks = [['commercial rules', ['scripts/sync-commercial-rules.mjs', '--check']], ['asset versions', ['scripts/check-version-assets.mjs']]];
const checkFails = [];
if (!filter.length) for (const [label, args] of checks) { const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' }); if (r.status !== 0) checkFails.push(label + ': ' + (r.stdout + r.stderr).trim().split('\n').pop()); }
console.log(`\nTEST KAPISI: ${files.length} dosya | geçti ${result.pass.length} | gizli görsel bekliyor ${result.private.length} | başarısız ${result.fail.length}`);
if (result.private.length) console.log('Gizli müşteri görseli olmadan çalışamayanlar (tests/private-fixture-tests.json):\n  ' + result.private.join('\n  '));
for (const f of result.fail) console.log('BAŞARISIZ ' + f.name + ' — ' + f.reason);
for (const c of checkFails) console.log('KONTROL BAŞARISIZ ' + c);
process.exit(result.fail.length || checkFails.length ? 1 : 0);
