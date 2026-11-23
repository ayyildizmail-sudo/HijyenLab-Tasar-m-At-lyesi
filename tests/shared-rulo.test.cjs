'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const C=require('../frontend/product-catalog.js'),G=require('../frontend/product-geometry.js'),R=require('../frontend/rear-layout.js'),U=require('../frontend/unprinted-flow.js');
function fn(s,n){const start=s.indexOf('function '+n+'(');assert(start>=0);let i=s.indexOf('{',start),depth=1;for(++i;depth;i++){if(s[i]==='{')depth++;else if(s[i]==='}')depth--;}return s.slice(start,i);}
(async()=>{
 const app=fs.readFileSync('frontend/app.js','utf8'),rear=fs.readFileSync('frontend/rear-preview.js','utf8');
 const front=await loadImage('frontend/'+C.get('BM12').frontAsset),back=await loadImage('frontend/'+C.get('BM12').backAsset);
 const art=createCanvas(180,70);art.getContext('2d').fillRect(10,10,160,50);
 const outputs={};
 for(const [id,white,colored,towel] of [['BM12',290,330,[25,30]],['BM11',350,400,[30,30]],['BM13',380,430,[30,35]]]){
  const p=C.get(id),r=p.priceRules;
  assert.equal(p.frontAsset,C.get('BM12').frontAsset);assert.equal(p.backAsset,C.get('BM12').backAsset);
  assert.equal(G.get(id),G.get('BM12'));assert.equal(G.isStandardRulo(id),true);assert.deepEqual(G.frame(id),G.frame('BM12'));assert.deepEqual(G.area(id),G.area('BM12'));
  assert.deepEqual(R.resolveProfile(G.get(id).rear),R.resolveProfile(G.get('BM12').rear));
  assert.deepEqual(p.towelDimensions,towel);assert.deepEqual(p.oppDimensions,[16,17]);assert.equal(r.whiteUnitKurus,white);assert.equal(r.coloredUnitKurus,colored);assert.equal(r.unitsPerBox,400);assert.deepEqual(r.minimum,{white:5200,colored:10000});
  assert.equal(U.pricing(400,'Muğla','Bodrum',r).subtotal,400*white);assert.equal(U.pricing(800,'İstanbul','',r).subtotal,800*white+40000);assert.throws(()=>U.pricing(401,'İstanbul','',r));
  const canvas=createCanvas(1600,850),scope={ProductGeometry:G,document:{createElement:()=>createCanvas(1,1)},selectedProductId:id,ctx:canvas.getContext('2d'),state:{bg:'#ffffff'},packageImage:front,isUnprinted:()=>true,rearTextInkError:()=>'',rearHasContent:()=>false};vm.createContext(scope);
  vm.runInContext(['draw','drawPhotoMockup','materialColor','fitLogoToPrintArea','initialTextLayout','isDeclaredQuote','canSelectFilmFinish','currentFilmFinish'].map(n=>fn(app,n)).join('\n')+'\n'+['rearPackageClip','rearMaterialDataURL','tintRearPixels'].map(n=>fn(rear,n)).join('\n'),scope);
  scope.draw(false);const blank=canvas.toBuffer('image/png');
  scope.drawPhotoMockup(scope.ctx,art,[[128,13,46]]);const photo=canvas.toBuffer('image/png');
  const rearWhite=scope.rearMaterialDataURL(back,'#ffffff'),rearColor=scope.rearMaterialDataURL(back,'#800d2e');
  outputs[id]={blank,photo,rearWhite,rearColor};
  if(id!=='BM12')for(const key of Object.keys(outputs[id]))assert.deepEqual(outputs[id][key],outputs.BM12[key],`${id} ${key} must exactly equal BM12 rendering`);
 }
 assert.equal(G.isStandardRulo('BM15'),false);assert.equal(G.isStandardRulo('BM545'),false);assert.equal(G.isStandardRulo('BM21'),false);
 console.log('PASS shared rulo: BM12/BM11/BM13 identical asset paths, profile identity, frame, safe areas and pixel-exact actual front/artwork/rear white+colored rendering; distinct cloth sizes and confirmed tariffs.');
})().catch(e=>{console.error(e);process.exitCode=1});
