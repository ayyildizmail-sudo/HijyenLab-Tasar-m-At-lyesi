/* eslint-disable @typescript-eslint/no-require-imports -- Unit harness loads local CommonJS-compatible browser modules and native canvas. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const L=require('../frontend/logo-design.js'),G=require('../frontend/product-geometry.js');
const measure=(text,font)=>{const c=createCanvas(1,1).getContext('2d');c.font=font;return c.measureText(text).width;};
const make=(x={})=>L.descriptor({name:'Karamel Dondurma',productId:'BM12',...x});
function render(d){const p=L.layout(d,G.area(d.productId),measure);assert.equal(p.ok,true,JSON.stringify(d));const c=createCanvas(Math.ceil(p.width+p.size),Math.ceil(p.height+p.size)),ctx=c.getContext('2d');L.paint(ctx,p,c.width/2,c.height/2);return{p,c,data:ctx.getImageData(0,0,c.width,c.height).data};}
test('strict descriptor preserves name and optional values, owns color array',()=>{const colors=['#245b47'];const d=make({name:'İŞIL Çağrı & Özgür',colors});colors.push('#111111');assert.deepEqual(d.colors,['#245b47']);assert.equal(d.name,'İŞIL Çağrı & Özgür');assert.deepEqual(L.colorsFor(make()),['#102f59']);for(const invalid of [{unknown:true},{name:'x'.repeat(121)},{name:'x\ny'},{colors:['#ffffff']},{colors:['#111111','#111111']},{colors:['#111111','#245b47','#800d2e']},{sector:'invented'},{variation:-1},{variation:1.5},{style:'initials'},{productId:'missing'},{wish:'x'.repeat(181)}])assert.throws(()=>L.validate({...d,...invalid}));});
test('empty and unbreakable long names are recoverable layout errors, never truncated',()=>{assert.equal(L.layout(make({name:'   '}),G.area('BM12'),measure).ok,false);assert.equal(L.layout(make({name:'W'.repeat(120)}),G.area('BM12'),measure).ok,false);const p=L.layout(make({name:'Ayşe Yılmaz'}),G.area('BM12'),measure);assert.equal(p.sourceText,'Ayşe Yılmaz');assert.equal(p.lines.join(' '),'Ayşe Yılmaz');});
test('all products, sectors, styles, variations render only actual selected flat inks',()=>{for(const productId of L.PRODUCTS)for(const sector of L.SECTORS.map(s=>s.id))for(const style of L.STYLES.map(s=>s.id))for(let variation=0;variation<3;variation++){const d=make({productId,sector,style,variation,colors:['#102f59','#ad5424']}),{p,c,data}=render(d);const actual=L.palette(data,c.width,c.height,L.colorsFor(d));assert.ok(actual,JSON.stringify(d));assert.ok(actual.length>=1&&actual.length<=2);assert.equal(p.lines.join(' '),d.name);const a=G.area(productId);assert.ok(p.width<=(a.right-a.left)*.86);assert.ok(p.height<=(a.bottom-a.top)*.78);}});
test('one color has no hidden second ink, and three compositions differ',()=>{const outputs=[];for(const style of L.STYLES.map(s=>s.id)){const d=make({style,sector:'icecream'}),{c,data}=render(d);assert.deepEqual(L.palette(data,c.width,c.height,L.colorsFor(d)),['#102f59']);outputs.push(c.toBuffer('image/png').toString('base64'));}assert.equal(new Set(outputs).size,3);});
test('palette rejects unexpected opaque pixels, malformed buffers and empty art',()=>{assert.equal(L.palette(new Uint8ClampedArray([255,0,0,255]),1,1,['#102f59']),null);assert.equal(L.palette(new Uint8ClampedArray(4),1,1,['#102f59']),null);assert.equal(L.palette(new Uint8ClampedArray(3),1,1,['#102f59']),null);assert.deepEqual(L.palette(new Uint8ClampedArray([16,47,89,255]),1,1,['#102f59']),['#102f59']);});
test('limited short wish matching is honest, selected sector wins, no personal initials invented',()=>{assert.equal(L.wishHint(make({wish:'Dondurma olsun'})).symbol,'icecream');assert.equal(L.wishHint(make({wish:'dondurma',sector:'cafe'})).symbol,'cafe');assert.equal(L.wishHint(make({wish:'yalnız yazı'})).symbol,'none');assert.equal(L.wishHint(make({wish:'bir uzay gemisi'})).matched,false);for(const name of ['AY','Ayşe Yılmaz','İpek & Çağrı'])assert.equal(render(make({name})).p.sourceText,name);});
test('canonical per-ink mask raster survives PNG decode across every product, sector, composition and variation',async()=>{
 const {loadImage}=require('@napi-rs/canvas');
 for(const productId of L.PRODUCTS)for(const sector of L.SECTORS.map(s=>s.id))for(const style of L.STYLES.map(s=>s.id))for(let variation=0;variation<3;variation++){
  const d=make({productId,sector,style,variation,colors:['#102f59','#ad5424']}),p=L.layout(d,G.area(productId),measure),c=L.raster(p,createCanvas),image=await loadImage(c.toBuffer('image/png')),decoded=createCanvas(c.width,c.height),ctx=decoded.getContext('2d');ctx.drawImage(image,0,0);
  assert.deepEqual(L.palette(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height,L.colorsFor(d)),L.colorsFor(d),JSON.stringify(d));
 }
});
test('mask RGB is irrelevant to exact recipe; arbitrary unexpected artwork RGB remains rejected',()=>{
 const d=make({sector:'icecream',style:'symbol',variation:2,colors:['#102f59','#ad5424']}),p=L.layout(d,G.area('BM12'),measure),target=createCanvas(Math.ceil(p.width+p.size),Math.ceil(p.height+p.size)),ctx=target.getContext('2d');
 const distortedMask=(w,h)=>{const c=createCanvas(w,h),cx=c.getContext('2d'),read=cx.getImageData.bind(cx);cx.getImageData=(...args)=>{const result=read(...args);for(let i=0;i<result.data.length;i+=4){result.data[i]=41;result.data[i+1]=213;result.data[i+2]=17;}return result;};return c;};
 assert.equal(L.rasterize(ctx,p,target.width/2,target.height/2,distortedMask),target);
 assert.deepEqual(L.palette(ctx.getImageData(0,0,target.width,target.height).data,target.width,target.height,L.colorsFor(d)),L.colorsFor(d));
 assert.equal(L.palette(new Uint8ClampedArray([41,213,17,255]),1,1,L.colorsFor(d)),null);
});
test('canonical raster fails closed for cross-ink mask overlap instead of creating or hiding a third ink',()=>{
 const d=make({colors:['#102f59','#ad5424']}),p=L.layout(d,G.area('BM12'),measure),c=createCanvas(Math.ceil(p.width+p.size),Math.ceil(p.height+p.size));
 const overlappingMask=(w,h)=>{const mask=createCanvas(w,h),ctx=mask.getContext('2d'),read=ctx.getImageData.bind(ctx);ctx.getImageData=(...args)=>{const data=read(...args);data.data[3]=255;return data;};return mask;};
 assert.throws(()=>L.rasterize(c.getContext('2d'),p,c.width/2,c.height/2,overlappingMask),/çakıştı/);
});
