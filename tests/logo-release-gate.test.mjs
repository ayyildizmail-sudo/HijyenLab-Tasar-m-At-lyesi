import assert from 'node:assert/strict';
import {mkdtemp, mkdir, cp, writeFile, readFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
const tmp=await mkdtemp(join(tmpdir(),'logo-release-gate-'));
try {
  await mkdir(join(tmp,'scripts'));await mkdir(join(tmp,'public'));
  await writeFile(join(tmp,'public','sentinel.txt'),'untouched');
  for(const file of ['check-logo-regressions.mjs','prepare-legacy-frontend.mjs'])await cp(new URL(`../scripts/${file}`,import.meta.url),join(tmp,'scripts',file));
  const run=()=>spawnSync(process.execPath,['scripts/prepare-legacy-frontend.mjs'],{cwd:tmp,encoding:'utf8'});
  const missing=run();assert.notEqual(missing.status,0);assert.match(missing.stderr,/ENOENT/);
  const gateSource=await readFile(new URL('../scripts/check-logo-regressions.mjs',import.meta.url),'utf8');
  const inputs=[...gateSource.matchAll(/'((?:tests\/)[^']+)'/g)].map(match=>match[1]);
  assert(inputs.includes('tests/sponsor-source.test.cjs'));assert(inputs.includes('tests/fixtures/sponsor-source/packet.jpeg'));
  for(const file of inputs){await mkdir(dirname(join(tmp,file)),{recursive:true});await writeFile(join(tmp,file),/\.[cm]js$/.test(file)?'process.exit(7);':'required fixture');}
  const failed=run();assert.notEqual(failed.status,0);assert.match(failed.stderr,/Logo regression gate failed/);
  assert.equal(await readFile(join(tmp,'public/sentinel.txt'),'utf8'),'untouched');
  for(const file of inputs.filter(x=>/\.[cm]js$/.test(x)))await writeFile(join(tmp,file),'process.exit(0);');
  await mkdir(join(tmp,'frontend'));await writeFile(join(tmp,'frontend/index.html'),'frontend only');
  const passed=run();assert.equal(passed.status,0,passed.stderr);assert.equal(await readFile(join(tmp,'public/index.html'),'utf8'),'frontend only');
  await assert.rejects(access(join(tmp,'public/tests')));
  console.log('PASS missing fixture and failed test stop before public mutation; passing gate copies frontend only.');
} finally {await rm(tmp,{recursive:true,force:true});}

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(pkg.scripts.prebuild,'node scripts/prepare-legacy-frontend.mjs');
assert(!pkg.scripts.build.includes('--preview-only'));
assert(!(await readFile(new URL('../scripts/build-verified.sh',import.meta.url),'utf8')).includes('--preview-only'));
