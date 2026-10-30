/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const {createCanvas}=require('@napi-rs/canvas');
const PrintInks=require('../frontend/print-inks.js'),CombinedInks=require('../frontend/combined-inks.js'),Model=require('../frontend/multi-logo-model.js');
const source=fs.readFileSync('frontend/print-inks-ui.js','utf8');
function artwork(color){const image=createCanvas(100,60),ctx=image.getContext('2d');ctx.fillStyle=color;ctx.fillRect(10,10,80,40);return image;}
function palette(image){const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height);const p=PrintInks.estimate(pixels.data,image.width,image.height,{});return {status:p.uncertain?'unknown':'estimated',colors:p.colors,uncertain:p.uncertain};}
function harness(primaryColor='#142850'){
 const nodes={},$=id=>nodes[id]||(nodes[id]={value:'',textContent:''}),model=Model.create();
 let rear=false,qr=false,revision=0,primaryCalls=0,invalidations=0;
 const primary=artwork(primaryColor),ctx={$,state:{removed:false,bg:'#ffffff',text:'',textPending:false,textColor:'#000000',extractionApproximate:false,technicalFrameProposed:false,photoLayout:null,logo:'primary',bgPantone:'',textPantone:''},logoImg:primary,
  prepareLogo(){throw Error('Ink analysis must not sample the downscaled/composed row');},
  document:{createElement:()=>createCanvas(1,1)},PrintInks,CombinedInks,
  invalidateQuote(){invalidations++;},calculateRaw(){},refresh(){},calculate(){ctx.syncPrintInks();},
  rearHasContent:()=>rear,rearQuoteSnapshot:()=>({revision,extras:model.fingerprint('rear')}),
  rearContent:{phone:'',instagram:'',website:'',address:'',extra:'',get qrEnabled(){return qr;}},effectiveRearInkColor:()=>null,RearLayout:{textColor:()=> '#111111'},
  MultiLogo:{primaryFront(){primaryCalls++;return primary;},has:side=>model.list(side).length>0,fingerprint:side=>model.fingerprint(side),palettes:()=>['front','rear'].flatMap(side=>model.list(side).map(a=>a.status==='ready'?a.palette:{status:'unknown',colors:[]}))}
 };
 vm.createContext(ctx);vm.runInContext(source,ctx);
 function add(side,color,status='ready'){
  const file={name:`${color}.png`},token=model.begin(side,file);if(status!=='pending')model.finish(token,{status,palette:palette(artwork(color))});
  if(side==='rear'){rear=true;revision++;}ctx.syncPrintInks();return token.id;
 }
 return {ctx,nodes,model,add,primaryCalls:()=>primaryCalls,invalidations:()=>invalidations,setQr(value){rear=true;qr=value;revision++;ctx.syncPrintInks();},remove(side,id){model.remove(side,id);revision++;ctx.syncPrintInks();}};
}
test('primary pixels are sampled through MultiLogo.primaryFront, never composed prepareLogo',()=>{
 const h=harness();assert.equal(h.nodes.inks.value,'1');assert.equal(h.primaryCalls(),1);
 h.add('front','#800d2e');assert.equal(h.nodes.inks.value,'2');assert.equal(h.primaryCalls(),2);
 assert.equal(h.ctx.state.inkSelection.selectedCount,2);
});
test('front-only supplemental logo triggers union even when rear is empty',()=>{
 const h=harness();h.add('front','#800d2e');
 assert.equal(h.ctx.rearHasContent(),false);assert.equal(h.nodes.inks.value,'2');
 assert.match(h.nodes.inkEstimateNote.textContent,/Ön ve arka yüz birlikte: 2/);
});
test('all six supplemental palettes join both primary faces without repeated plate fees',()=>{
 const h=harness();h.ctx.rearSponsorPrepared={method:'native-alpha-trim',inkSamples:[{rgb:[20,40,80],count:100}]};h.ctx.rearSponsorRecolor='';
 for(const side of ['front','rear'])for(const color of ['#142850','#800d2e','#135b32'])h.add(side,color);
 assert.equal(h.nodes.inks.value,'3');assert.equal(h.ctx.combinedRearInkEstimate().count,3);
 assert.equal(h.model.list('front').length+h.model.list('rear').length,6);
 h.ctx.state.bg='#800d2e';h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'3');
});
test('unknown or pending supplemental source clears count, never presents free zero',()=>{
 const h=harness();h.add('front','#800d2e','pending');assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.state.inkSelection.selectedCount,null);
 assert.equal(h.ctx.combinedRearInkEstimate().count,null);assert.match(h.nodes.inkEstimateNote.textContent,/Bilinmeyen renk sıfır sayılmaz/);
});
test('QR selects darkest actual extra palette and recomputes when it is removed',()=>{
 const h=harness('#800d2e'),id=h.add('rear','#142850');h.setQr(true);
 assert.equal(h.ctx.combinedRearInkEstimate().qrColor,'#142850');assert.equal(h.nodes.inks.value,'2');
 h.remove('rear',id);assert.equal(h.ctx.combinedRearInkEstimate().qrColor,'#800d2e');assert.equal(h.nodes.inks.value,'1');
});
test('manual plate override persists unchanged but resets on supplemental revision',()=>{
 const h=harness();h.add('front','#800d2e');h.nodes.inks.value='5';h.nodes.inks.oninput();h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'5');
 const oldKey=h.ctx.printInkFingerprint(),before=h.invalidations();h.add('front','#135b32');
 assert.notEqual(h.ctx.printInkFingerprint(),oldKey);assert.equal(h.nodes.inks.value,'3');assert.ok(h.invalidations()>before);assert.equal(h.ctx.state.inkSelection.status,'estimated');
});
test('rear supplemental revision also resets manual override through rear snapshot',()=>{
 const h=harness();h.add('rear','#800d2e');h.nodes.inks.value='5';h.nodes.inks.oninput();assert.equal(h.nodes.inks.value,'5');
 h.add('rear','#135b32');assert.equal(h.nodes.inks.value,'3');
});
