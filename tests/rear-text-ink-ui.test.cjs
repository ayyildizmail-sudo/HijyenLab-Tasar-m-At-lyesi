/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const {createCanvas}=require('@napi-rs/canvas'),PrintInks=require('../frontend/print-inks.js'),CombinedInks=require('../frontend/combined-inks.js'),RearLayout=require('../frontend/rear-layout.js'),ProductGeometry=require('../frontend/product-geometry.js');
const rearSource=fs.readFileSync('frontend/rear-preview.js','utf8'),inkSource=fs.readFileSync('frontend/print-inks-ui.js','utf8');
function harness(primaryColor='#153b67'){
 const nodes={},$=id=>nodes[id]||(nodes[id]={value:'',textContent:''}),primary=createCanvas(100,60);primary.getContext('2d').fillStyle=primaryColor;primary.getContext('2d').fillRect(10,10,80,40);
 let extras=Array.from({length:6},()=>({status:'estimated',colors:[primaryColor]})),extraRevision=0;
 const ctx={$,URL,PrintInks,CombinedInks,RearLayout,ProductGeometry,selectedProductId:'BM12',
  state:{removed:false,bg:'#ffffff',text:'',textPending:false,textColor:'#000000',extractionApproximate:false,photoLayout:null,logo:'primary',bgPantone:'',textPantone:'',recolor:false,recolorApplied:false},
  logoImg:primary,prepareLogo:()=>primary,document:{createElement:()=>createCanvas(1,1)},invalidateQuote(){},calculateRaw(){},refresh(){},calculate(){ctx.syncPrintInks();},isUnprinted:()=>false,
  rearRevision:0,rearSponsorPrepared:{method:'native-alpha-trim',inkSamples:[{rgb:[1,3,5].map(i=>parseInt(primaryColor.slice(i,i+2),16)),count:100}]},rearSponsorRecolor:'',rearSponsorFailure:'',rearSponsorReview:null,rearSponsorPending:false,
  rearContent:{instagram:'',website:'',phone:'',address:'',extra:'',inkColor:'',qrEnabled:false,qrUrl:'https://example.com/menu',sponsorHash:'primary-rear',sponsorName:'rear'},
  MultiLogo:{primaryFront:()=>primary,has:()=>extras.length>0,fingerprint:()=>[extraRevision],palettes:()=>extras}
 };
 vm.createContext(ctx);
 for(const name of ['effectiveRearInkColor','rearTextInkError','rearHasContent','rearQuoteSnapshot','resolvedRearQrInk','rearValidationError','rearMaterialDataURL']){
  const line=rearSource.split('\n').find(l=>l.startsWith(`function ${name}(`));assert.ok(line,`${name} actual source exists`);vm.runInContext(line,ctx);
 }
 for(const file of ['frontend/vendor/qrcodegen-v1.8.0.js','frontend/qr-preview.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 vm.runInContext(inkSource,ctx);
 return {ctx,nodes,extras(value){extras=value;extraRevision++;ctx.syncPrintInks();},update(fields={}){Object.assign(ctx.rearContent,fields);ctx.rearRevision++;ctx.syncPrintInks();}};
}
test('all eight navy logos, then website, then QR retain one plate and exact navy',()=>{
 const h=harness();assert.equal(h.nodes.inks.value,'1');h.update({website:'example.com'});assert.equal(h.nodes.inks.value,'1');assert.equal(h.ctx.effectiveRearInkColor(),'#153b67');assert.equal(h.ctx.rearQuoteSnapshot().inkColor,'#153b67');
 h.update({qrEnabled:true});assert.equal(h.nodes.inks.value,'1');assert.equal(h.ctx.resolvedRearQrInk(),'#153b67');assert.equal(h.ctx.rearValidationError(),'');
 // Actual snapshot calls the actual resolver during fingerprinting: no recursion.
 for(let i=0;i<10;i++){assert.doesNotThrow(()=>h.ctx.printInkFingerprint());h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'1');}
});
test('all five optional contact roles reuse navy without an extra plate',()=>{
 for(const role of ['instagram','website','phone','address','extra']){const h=harness();h.update({[role]:'örnek'});assert.equal(h.nodes.inks.value,'1',role);assert.equal(h.ctx.effectiveRearInkColor(),'#153b67');assert.equal(h.ctx.rearTextInkError(),'');}
});
test('sampled charcoal text keeps actual color without becoming a second explicit-gray plate',()=>{
 const h=harness('#2b2b2b');assert.equal(h.nodes.inks.value,'1');h.update({website:'example.com'});assert.equal(h.ctx.effectiveRearInkColor(),'#2b2b2b');assert.equal(h.nodes.inks.value,'1');
 h.update({inkColor:'#2b2b2b'});assert.equal(h.ctx.effectiveRearInkColor(),'#2b2b2b');assert.equal(h.nodes.inks.value,'1','Selecting the exact existing gray never duplicates its plate');h.update({inkColor:'#800d2e'});assert.equal(h.nodes.inks.value,'2','A genuinely different explicit ink is counted separately');
});
test('explicit rear color wins; explicit front color has priority over automatic palette',()=>{
 const h=harness();h.update({website:'example.com',inkColor:'#800d2e'});assert.equal(h.ctx.effectiveRearInkColor(),'#800d2e');assert.equal(h.nodes.inks.value,'2');
 h.ctx.state.recolor=true;h.ctx.state.recolorApplied=true;h.ctx.state.color='#245b47';h.ctx.syncPrintInks();assert.equal(h.ctx.effectiveRearInkColor(),'#800d2e');
 h.update({inkColor:''});assert.equal(h.ctx.effectiveRearInkColor(),'#245b47');assert.equal(h.ctx.rearTextInkDecision().source,'explicit-front');assert.equal(h.nodes.inks.value,'2');
});
test('unknown palette does not invent text ink; validation and export are blocked',()=>{
 const h=harness();h.update({website:'example.com'});h.extras([{status:'unknown',colors:[]}]);assert.equal(h.ctx.effectiveRearInkColor(),null);assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.combinedRearInkEstimate().count,null);
 assert.match(h.ctx.rearTextInkError(),/renk seçin/);assert.match(h.ctx.rearValidationError(),/renk seçin/);assert.throws(()=>h.ctx.rearMaterialDataURL({},'#ffffff'),/renk seçin/);
 assert.equal(h.ctx.rearQuoteSnapshot().inkColor,null);
});
test('same navy ground cannot use itself as text; existing light ink resolves dark ground',()=>{
 const h=harness();h.ctx.state.bg='#153b67';h.update({website:'example.com'});assert.equal(h.ctx.effectiveRearInkColor(),null);assert.equal(h.nodes.inks.value,'');assert.match(h.ctx.rearTextInkError(),/rengini seçin/);assert.throws(()=>h.ctx.rearMaterialDataURL({},'#153b67'),/rengini seçin/);
 h.extras([{status:'estimated',colors:['#bbbbbb']}]);assert.equal(h.ctx.effectiveRearInkColor(),'#bbbbbb');assert.equal(h.nodes.inks.value,'2');assert.equal(h.ctx.rearTextInkError(),'');
});
test('all three actual product profiles render the same selected text ink recorded in snapshot',()=>{
 for(const productId of ['BM12','BM15','BM545']){
  const h=harness();h.ctx.selectedProductId=productId;h.update({website:'example.com'});
  const profile=ProductGeometry.get(productId).rear||{source:RearLayout.SOURCE,safe:RearLayout.SAFE},{width,height}=profile.source,canvas=createCanvas(width,height),context=canvas.getContext('2d');
  const rendered=RearLayout.render(context,width,height,h.ctx.rearContent,{background:h.ctx.state.bg,inkColor:h.ctx.effectiveRearInkColor(),profile});
  assert.equal(rendered.textColor,h.ctx.rearQuoteSnapshot().inkColor);assert.equal(rendered.textColor,'#153b67');
  const contact=rendered.boxes.find(b=>b.type==='contact');assert.ok(contact);assert.ok(contact.y+contact.height<=profile.safe.seam.y);
  const pixels=context.getImageData(0,0,width,height).data;let opaque=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]===255){opaque++;assert.equal(pixels[i],21);assert.equal(pixels[i+1],59);assert.equal(pixels[i+2],103);}assert.ok(opaque>0);
 }
});
