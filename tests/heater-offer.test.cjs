'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert=require('node:assert/strict'),fs=require('node:fs'),H=require('../frontend/heater-offer.js'),C=require('../frontend/product-catalog.js');
for(const item of C.items)assert.equal(H.applies(item.id),item.id!=='BM21',item.id);
assert.equal(H.applies(undefined),false);
assert.match(H.OFFER.priceLine,/350 USD \+ KDV/);assert.match(H.OFFER.priceLine,/350 TL \+ KDV/);assert.match(H.OFFER.excluded,/dahil değildir/);
const text=JSON.stringify(H.OFFER);assert(!/garanti|UV|steril|mikrop/i.test(text),'no unapproved claims');
assert(fs.existsSync('frontend/'+H.OFFER.image));
const app=fs.readFileSync('frontend/app.js','utf8');
assert(app.includes('if(heaterImage)y+=heaterOffer.drawQuote('),'quote canvas draws the offer after the notes');
assert(app.indexOf('if(heaterImage)y+=heaterOffer.drawQuote(')>app.indexOf('money(quoted.subtotal)'),'offer drawn after the total');
assert(!/heater/i.test(app.slice(app.indexOf('function pricing('),app.indexOf('function pricing(')+3000)),'pricing never includes the heater');
const calls=[];const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(...a)=>calls.push([k,...a]),set:(t,k,v)=>{t[k]=v;return true;}});
assert.equal(H.drawQuote(ctx,{width:900,height:602},70,100,1260),H.QUOTE_HEIGHT);assert(calls.some(c=>c[0]==='drawImage'));
console.log('PASS heater offer: every product except BM21, approved price/specs, outside total, drawn after the total.');
