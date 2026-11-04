/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS browser-contract harness. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ProcessingSession=require('../frontend/processing-session.js');
const code=fs.readFileSync(require.resolve('../frontend/reference-recovery.js'),'utf8');
function harness(){
 const nodes=new Map(),node=()=>({hidden:false,disabled:false,textContent:'',classList:{add(){},remove(){}},before(){},append(){},removeAttribute(){}}),get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const session=ProcessingSession.create(),identity={sha256:'a'.repeat(64),name:'source.jpg'},token=session.begin(identity);session.decoded(token,{width:900,height:500,coordinateFrame:'browser-decoded'});session.fail(token,'unresolved');
 const c={document:{createElement:node,head:{append(){}},body:node(),querySelector:get},$:get,processingSession:session,state:{sourcePhoto:'original',sourceKind:'unsupported',designBlocked:true,requestedQuantity:20000,bg:'#ffffff'},loading:7,photoImg:null,printInkKey:null,latest:null,isUnprinted:()=>false,isReferencePreview:()=>c.state.quoteSource==='source-reference'&&!!c.state.sourcePhoto,referencePreviewLabel:()=> 'reference',referenceGroundLabel:()=> 'unknown ground',invalidateQuote(){},status(message){c.message=message;},refresh(){},showFragrance(){c.step=5;return true;},go(n){c.step=n;},loadImage:async()=>({width:900,height:500}),syncProcessingDesign(){session.touchDesign('reference-fingerprint');},approveCurrentDesign(){session.touchDesign('reference-fingerprint');return session.approve('reference-fingerprint');}};
 vm.createContext(c);vm.runInContext(code,c);return c;
}
test('reference acceptance preserves source, quantity and real provenance, enters price-only fragrance flow without artwork approval without fabricated artwork',async()=>{
 const c=harness();assert(await c.ReferenceRecovery.accept(),c.message);assert.equal(c.step,5);assert.equal(c.processingSession.isApproved('reference-fingerprint'),false);assert.equal(c.state.sourcePhoto,'original');assert.equal(c.state.requestedQuantity,20000);assert.equal(c.state.photoQuoteBg,'unknown');assert.equal(c.state.logo,undefined);assert.equal(c.state.photoLayout,undefined);assert.equal(c.state.inkSelection.selectedCount,null);assert(c.ReferenceRecovery.current());assert.equal(c.processingSession.getState().result.method,'source-reference');assert.equal(c.processingSession.getState().source.sha256,'a'.repeat(64));
});
test('replacement and cancel while image decode pending cannot accept stale reference',async()=>{
 for(const mutation of [c=>{c.loading++;c.state.sourcePhoto='new';},c=>c.processingSession.cancel()]){
  const c=harness();let release;c.loadImage=()=>new Promise(resolve=>{release=resolve;});const pending=c.ReferenceRecovery.accept();mutation(c);release({width:900,height:500});assert.equal(await pending,false);assert.notEqual(c.state.quoteSource,'source-reference');assert.equal(c.step,undefined);
 }
});
test('repeated acceptance is single-flight, reset revokes source authority',async()=>{
 const c=harness();let release;c.loadImage=()=>new Promise(resolve=>{release=resolve;});const pending=c.ReferenceRecovery.accept();assert.equal(await c.ReferenceRecovery.accept(),false);release({width:900,height:500});assert(await pending,c.message);c.ReferenceRecovery.clear();assert.equal(c.ReferenceRecovery.current(),false);
});
test('tampered source, pending assets and wrong processing record cannot pass',async()=>{
 const c=harness();c.state.productAssetPending=true;assert.equal(await c.ReferenceRecovery.accept(),false);c.state.productAssetPending=false;assert(await c.ReferenceRecovery.accept(),c.message);c.state.sourcePhoto='another';assert.equal(c.ReferenceRecovery.current(),false);c.state.sourcePhoto='original';c.state.processingResult.method='native-logo';assert.equal(c.ReferenceRecovery.current(),false);
});
test('reference labels and ground provenance remain in ordinary summary and JPG',()=>{
 const app=fs.readFileSync(require.resolve('../frontend/app.js'),'utf8'),life=fs.readFileSync(require.resolve('../frontend/processing-lifecycle.js'),'utf8');
 assert.match(app,/referencePreviewLabel\(\),referenceGroundLabel\(\)/);assert.match(app,/quoteSnapshot.reference.groundLabel/);assert.match(app,/quoteSnapshot.quoteSource==='source-reference'&&side==='front'/);assert.match(life,/artworkApplied:false/);assert.match(life,/ground:state.photoQuoteBg/);
});

test('automatic failed-photo reference stays on design until the customer chooses pricing', async () => {
 const c=harness();
 c.step=1;
 assert(await c.ReferenceRecovery.showSourcePreview(),c.message);
 assert.equal(c.step,1);
 assert(c.ReferenceRecovery.current());
 assert.equal(c.$('recoverySource').src,'original');
 assert.equal(c.state.inkSelection.selectedCount,null);
 assert.equal(c.processingSession.isApproved('reference-fingerprint'),false);
 assert(c.$('recoveryStart').onclick());
 assert.equal(c.step,5);
});

test('a failed decode from a replaced source cannot overwrite the current status', async () => {
 const c=harness();
 let reject;
 c.loadImage=()=>new Promise((_,fail)=>{reject=fail;});
 const pending=c.ReferenceRecovery.showSourcePreview();
 c.loading++;
 c.ReferenceRecovery.clear();
 c.status('new source');
 reject(Error('old decode'));
 assert.equal(await pending,false);
 assert.equal(c.message,'new source');
});
