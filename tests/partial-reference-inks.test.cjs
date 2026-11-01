/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test');
const {createCanvas}=require('@napi-rs/canvas'),PrintInks=require('../frontend/print-inks'),CombinedInks=require('../frontend/combined-inks'),PrintPolicy=require('../frontend/print-policy'),ProcessingSession=require('../frontend/processing-session');
function harness({reference=true,colors=['#222222','#777777','#d04010'],photo=false}={}){
 const image=createCanvas(240,90),g=image.getContext('2d');colors.forEach((color,i)=>{g.fillStyle=color;g.fillRect(i*75+5,5,65,80);});
 const nodes={},session=ProcessingSession.create(),token=session.begin({sha256:'a'.repeat(64)});session.decoded(token,{width:image.width,height:image.height,coordinateFrame:'browser-decoded'});
 const state={quoteSource:reference?'source-reference':'uploaded-artwork',sourcePhoto:reference?'source-image':null,sourceKind:reference?'reference':'native',logo:reference?null:'native-pixels',removed:reference,bg:'#ffffff',extractionApproximate:photo,processingResult:session.commit(token,{method:reference?'source-reference':photo?'photo-ink-extraction':'native-logo',methodVersion:'v68',box:[0,0,240,90],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,240,90],reason:'source retained'}],excludedRegions:[],maskBasis:'source pixels',transformOrder:['decode'],limitations:[]})};
 let sourceValid=true;const ctx={state,logoImg:reference?null:image,prepareLogo:()=>image,PrintInks,CombinedInks,PrintPolicy,processingSession:session,isReferencePreview:()=>state.quoteSource==='source-reference',ReferenceRecovery:{current:()=>sourceValid},designIssue:()=>state.designBlocked||false,$:id=>nodes[id]||(nodes[id]={value:'',textContent:''}),document:{createElement:()=>createCanvas(1,1)},invalidateQuote(){},calculateRaw(){},refresh(){},calculate(){}};
 vm.createContext(ctx);require('./helpers/content-safety-vm.cjs')(ctx);vm.runInContext(fs.readFileSync('frontend/brand-region-ui.js','utf8').split('\n').find(line=>line.startsWith('function designFingerprint()')),ctx);
 session.touchDesign(ctx.designFingerprint());session.approve(ctx.designFingerprint());state.processingResult=session.getState().result;vm.runInContext(fs.readFileSync('frontend/print-inks-ui.js','utf8'),ctx);
 return {ctx,nodes,session,invalidateSource:()=>{sourceValid=false;},read:code=>vm.runInContext(code,ctx)};
}
test('reference has unknown inks, not zero, and an approved source gets only partial status',()=>{
 const h=harness();assert.equal(h.nodes.inks.value,'');assert.equal(h.nodes.inks.disabled,false);assert.equal(h.ctx.state.inkSelection.selectedCount,null);assert.equal(h.read('frontArtworkInkEstimate.physicalInkCount'),null);assert.equal(h.ctx.currentPrintPolicy().status,'partial-excludes-plate');assert.equal(h.ctx.printPolicyError(),'');
 h.nodes.inks.value='2';h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.state.inkSelection.selectedCount,null);
});
test('unknown source cannot bypass known fourth rear or supplemental ink or injected manual fourth',()=>{
 const h=harness();h.ctx.MultiLogo={palettes:()=>[{status:'estimated',colors:['#111111','#ff0000','#00ff00','#0000ff']}]};assert(h.ctx.currentPrintPolicy().blocked);h.ctx.MultiLogo={palettes:()=>[{status:'estimated',colors:['#111111','#ff0000','#00ff00','#0000ff']},{status:'unknown',colors:[]}]};assert(h.ctx.currentPrintPolicy().blocked,'unknown fifth does not erase four already known inks');delete h.ctx.MultiLogo;h.nodes.inks.value='4';assert(h.ctx.currentPrintPolicy().blocked);
});
test('replacement, canceled operation, stale fingerprint, unapproved revision and failed source remain blocked',()=>{
 const patches=[h=>h.session.begin({sha256:'b'.repeat(64)}),h=>h.session.cancel(),h=>h.ctx.state.bg='#112244',h=>h.session.touchDesign('changed'),h=>{h.ctx.state.designBlocked=true;},h=>h.invalidateSource(),h=>{h.ctx.state.processingResult.source.sha256='b'.repeat(64);},h=>{h.ctx.state.processingResult.method='native-logo';}];
 for(const patch of patches){const h=harness();patch(h);assert(h.ctx.printPolicyError(),'stale or wrong source cannot obtain partial quote');}
});
test('real gray remains a third native ink and a fourth native ink is not excused as photography',()=>{
 const h=harness({reference:false});assert.equal(h.nodes.inks.value,'3');assert.equal(h.read('frontArtworkInkEstimate.count'),3);assert(h.read('frontArtworkInkEstimate.colors.includes("#777777")'));assert.equal(h.ctx.currentPrintPolicy().blocked,false);
 const four=harness({reference:false,colors:['#111111','#777777','#d04010','#0055ff']});assert.equal(four.nodes.inks.value,'4');assert(four.ctx.currentPrintPolicy().blocked);
});
test('photo RGB uncertainty can progress only as partial and manual three cannot certify it',()=>{
 const h=harness({reference:false,photo:true,colors:['#111111','#777777','#d04010']});assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.currentPrintPolicy().status,'partial-excludes-plate');h.nodes.inks.value='3';assert(h.ctx.printPolicyError());h.nodes.inks.value='';h.ctx.state.designProcessing=true;assert(h.ctx.printPolicyError());
});

test('optional customer-declared two inks gives a labeled scenario, never a measured count',()=>{
 const h=harness();h.nodes.inks.value='2';h.nodes.inks.oninput();h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'2');assert.equal(h.ctx.state.inkSelection.status,'customer-declared');assert.equal(h.ctx.state.inkSelection.estimatedCount,null);assert.equal(h.ctx.currentPrintPolicy().status,'customer-declared');assert.match(h.nodes.inkEstimateNote.textContent,/Seçiminize göre ön fiyat/);
 const app=fs.readFileSync('frontend/app.js','utf8');vm.runInContext(app.split('\n').find(l=>l.startsWith('function pricing(')),h.ctx);const rules=require('../frontend/product-catalog').rules('BM12');const price=h.ctx.pricing(5200,'#ffffff','İstanbul','','new',2,rules);assert.equal(price.subtotal,1968000);assert.equal(price.plate,200000);assert.equal(price.plateUnknown,false);assert.match(app,/Klişe \(müşteri beyanı:/);
});
test('source product rear and ground changes revoke declaration, quantity alone does not',()=>{
 for(const change of [h=>{h.ctx.state.sourcePhoto='new';},h=>{h.ctx.selectedProductId='BM21';},h=>{h.ctx.rearQuoteSnapshot=()=>({text:'new'});},h=>{h.ctx.state.photoQuoteBg='color';}]){
  const h=harness();h.nodes.inks.value='2';h.nodes.inks.oninput();h.ctx.syncPrintInks();change(h);h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.state.inkSelection.selectedCount,null);
 }
 const h=harness();h.nodes.inks.value='2';h.nodes.inks.oninput();h.ctx.state.requestedQuantity=20000;h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'2');
});
test('customer declaration cannot bypass known four original or additional inks',()=>{
 const h=harness();h.nodes.inks.value='2';h.nodes.inks.oninput();h.ctx.syncPrintInks();h.ctx.state.processingResult.referenceKnownActualInkCount=4;assert(h.ctx.currentPrintPolicy().blocked);delete h.ctx.state.processingResult.referenceKnownActualInkCount;h.ctx.MultiLogo={palettes:()=>[{status:'estimated',colors:['#111111','#ff0000','#00ff00','#0000ff']}]};assert(h.ctx.currentPrintPolicy().blocked);
});
