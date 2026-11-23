/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness. */
// Canlı uygulama işleme oturumunu tasarıma bağlı (bindQuoteDesign) oluşturur. Ön yüzde birden fazla logo
// varken multi-logo-ui.js tasarım parmak izini JSON.stringify([taban, ekLogolar]) biçiminde sarar.
// Teklif jetonu bu sarılmış parmak izinde de üretilebilmeli; ürün/kaynak/sürüm bağı ise korunmalı.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Session=require('../frontend/processing-session.js');
const SHA='a'.repeat(64);

function readySession(){
 const s=Session.create({bindQuoteDesign:true}),token=s.begin({sha256:SHA});
 s.decoded(token,{width:100,height:80,coordinateFrame:'browser-decoded'});
 s.commit(token,{method:'native-logo',methodVersion:'test',box:[0,0,100,80],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,100,80],reason:'original pixels'}],excludedRegions:[],maskBasis:'source',transformOrder:['decode'],limitations:[]});
 return s;
}
// multi-logo-ui.js'teki gerçek sarmalayıcıyı çalıştırır (kopya değil).
function wrapLikeMultiLogo(base,extras){
 const src=fs.readFileSync(require.resolve('../frontend/multi-logo-ui.js'),'utf8');
 const line=src.split('\n').find(l=>l.startsWith('const oldFingerprint=designFingerprint;'));assert.ok(line,'multi-logo-ui.js sarmalayıcı satırı bulunamadı');
 const c={designFingerprint:()=>base,has:side=>side==='front',fingerprint:()=>extras};vm.createContext(c);
 vm.runInContext(line+';globalThis.__fp=designFingerprint;',c);return c.__fp();
}
const base=JSON.stringify(['BM12','uploaded-artwork',null,false,null,false,null,'kaynak','#ffffff']);
function quote(s,design,product='BM12'){s.touchDesign(design);assert.equal(s.approve(design),true);const st=s.getState();return s.quoteToken({quoteSource:'uploaded-artwork',design,sourceSHA256:st.source.sha256,designRevision:st.designRevision,product});}

test('tek logolu tasarımda teklif jetonu üretilir (kontrol)',()=>{
 assert.ok(quote(readySession(),base));
});

test('iki logolu (sarılmış parmak izli) tasarımda teklif jetonu üretilir',()=>{
 const wrapped=wrapLikeMultiLogo(base,'ek-logolar');
 assert.notEqual(wrapped,base,'sarmalayıcı parmak izini değiştirmeli');
 assert.equal(JSON.parse(wrapped)[0],base,'ilk öğe taban parmak izinin kendisidir');
 assert.ok(quote(readySession(),wrapped),'iki logolu teklif üretilemiyor');
});

test('sarılmış parmak izinde de farklı ürün için jeton verilmez',()=>{
 assert.equal(quote(readySession(),wrapLikeMultiLogo(base,'ek-logolar'),'BM15'),null);
});

test('sarılmış parmak izinde kaynak ya da sürüm uyuşmazsa jeton verilmez',()=>{
 const s=readySession(),wrapped=wrapLikeMultiLogo(base,'ek-logolar');s.touchDesign(wrapped);s.approve(wrapped);const st=s.getState();
 const ok={quoteSource:'uploaded-artwork',design:wrapped,sourceSHA256:st.source.sha256,designRevision:st.designRevision,product:'BM12'};
 assert.ok(s.quoteToken(ok));
 assert.equal(s.quoteToken({...ok,sourceSHA256:'b'.repeat(64)}),null);
 assert.equal(s.quoteToken({...ok,designRevision:st.designRevision+1}),null);
 assert.equal(s.quoteToken({...ok,design:base}),null);
});

test('bozuk parmak izi jeton üretmez',()=>{
 const s=readySession();s.touchDesign('{bozuk');s.approve('{bozuk');const st=s.getState();
 assert.equal(s.quoteToken({quoteSource:'uploaded-artwork',design:'{bozuk',sourceSHA256:st.source.sha256,designRevision:st.designRevision,product:'BM12'}),null);
});
