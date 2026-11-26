'use strict';
// Single source: frontend/product-catalog.js. The server copy must be regenerated when the catalog changes,
// and the hard-coded product id lists in the browser code must not drift from the catalog.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawnSync}=require('node:child_process'),C=require('../frontend/product-catalog.js'),F=require('../frontend/fragrance.js'),V=require('../frontend/visitor-requests.js');
const check=spawnSync(process.execPath,['scripts/sync-commercial-rules.mjs','--check'],{encoding:'utf8'});
assert.equal(check.status,0,check.stdout+check.stderr);
const s=C.commercialSummary(),ids=C.items.map(i=>i.id);
assert.deepEqual([...s.products],ids);
for(const id of ids){const r=C.rules(id);assert.equal(s.minimumWhite[id],r.minimum.white);assert.equal(s.minimumColored[id],r.minimum.colored);assert.equal(s.cartons[id],r.unitsPerBox);}
for(const v of Object.values(s.unprintedFragrance))assert(v===null||F.OPTIONS.some(o=>o.id===v));
const sorted=[...ids].sort().join(',');
for(const file of fs.readdirSync('frontend').filter(f=>f.endsWith('.js'))){const text=fs.readFileSync('frontend/'+file,'utf8');for(const m of text.matchAll(/\[\s*'BM12'\s*,(?:\s*'[A-Z0-9]+'\s*,?)+\]/g)){const list=[...m[0].matchAll(/'([A-Z0-9]+)'/g)].map(x=>x[1]).sort().join(',');assert.equal(list,sorted,file+' has a product list that differs from the catalog');}}
const base={contact:{contactName:'Ad Soyad',phone:'0532 000 00 00'},design:null,printMode:'unprinted'};
assert.ok(!V.requestError({...base,productId:'BM21',fragrance:'green_tea',quantity:1000}));
assert.match(V.requestError({...base,productId:'BM21',fragrance:'flambau',quantity:1000})||'',/koku/i);
assert.ok(!V.requestError({...base,productId:'BM15',fragrance:'flambau',quantity:1000}));
assert.ok(V.requestError({...base,productId:'BM15',fragrance:'flambau',quantity:700}),'BM15 carton is 500');
console.log('PASS commercial rules: server copy generated from catalog, browser product lists and request checks follow the catalog.');
