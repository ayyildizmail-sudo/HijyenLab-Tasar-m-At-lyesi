'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert=require('node:assert/strict'),S=require('../frontend/sample-request.js');
const ok={name:'Ayşe Yılmaz',phone:'0532 123 45 67',address:'Atatürk Cad. No:5 Bodrum / Muğla',products:['BM21'],scents:[]};
assert.equal(S.validate(ok),null);
assert.equal(S.validate({...ok,name:'Ayşe'}).field,'sampleName');
assert.equal(S.validate({...ok,phone:'123'}).field,'samplePhone');
assert.equal(S.validate({...ok,phone:'abc 1234567890'}).field,'samplePhone');
assert.equal(S.validate({...ok,address:'Bodrum'}).field,'sampleAddress');
assert.equal(S.validate({...ok,products:[]}).field,'sampleProducts');
assert.equal(S.validate({...ok,products:['FAKE']}).field,'sampleProducts');
const m=S.message({...ok,products:['BM12','OSHIBORI'],scents:['lemon','x']});
assert.match(m,/ücretsiz numune/);assert.match(m,/Ad soyad: Ayşe Yılmaz/);assert.match(m,/25 × 30 cm Rulo Islak Havlu, Oshibori/);assert.match(m,/Koku tercihim: Limon$/);
assert.match(S.message(ok),/Koku tercihim: Fark etmez/);
assert(!/adet|miktar/i.test(m),'no quantity promise');
assert.equal(S.message({...ok,name:'A\nB  C'}).split('\n')[1],'Ad soyad: A B C','control chars flattened');
assert(S.link(ok).startsWith('https://wa.me/905425699869?text='));
console.log('PASS sample request: validation, allowlisted products/scents, no quantity promise, WhatsApp link.');
