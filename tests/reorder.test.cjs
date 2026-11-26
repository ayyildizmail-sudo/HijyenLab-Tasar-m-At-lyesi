'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert=require('node:assert/strict'),R=require('../frontend/reorder.js');
const code=R.newCode(n=>Uint8Array.from({length:n},(_,i)=>i*37));
assert.match(code,/^HL-[A-HJ-NP-Z2-9]{6}$/);assert(!/[IO01]/.test(code.slice(3)));
const order={v:1,c:code,p:'BM21',l:'7 × 12 cm Islak Mendil',f:'Yeşil çay',q:10000,m:'printed'};
const link=R.linkFor(order,'https://x.example/app/?a=1#old');
assert(link.startsWith('https://x.example/app/?a=1#tekrar='));
assert.deepEqual(R.fromHash(link.slice(link.indexOf('#'))),order,'round trip with Turkish chars');
for(const bad of [{...order,c:'HL-1234'},{...order,p:'BM99'},{...order,q:0},{...order,q:1.5},{...order,m:'x'},{...order,l:''},{...order,v:2}])assert.equal(R.encode(bad),null);
assert.equal(R.fromHash('#tekrar=bozuk!!'),null);assert.equal(R.fromHash('#tekrar=QUJDREVGR0hJSktM'),null);assert.equal(R.fromHash(''),null);
const tampered=R.encode({...order,l:'A\n\u0007B'});assert.equal(R.decode(tampered).l,'A B');
const m=R.message(order,15000);
assert.match(m,/Sipariş kodu: HL-/);assert.match(m,/Adet: 15\.000/);assert.match(m,/Önceki adet: 10\.000/);assert.match(m,/Koku: Yeşil çay/);
assert(!/data:|image/i.test(link),'link carries no image');
console.log('PASS reorder: code alphabet, link round trip, strict validation, message with code and quantities, no image in link.');
