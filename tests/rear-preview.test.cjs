// Legacy artwork/unprinted fixture: declaration mode is explicitly inactive.
/* CommonJS test harness. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),app=fs.readFileSync('frontend/app.js','utf8'),rear=fs.readFileSync('frontend/rear-preview.js','utf8');
const nodes={},make=()=>({hidden:false,disabled:false,naturalWidth:1200,classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)}},removeAttribute(k){delete this[k]},focus(){},after(){}}),$=id=>nodes[id]||(nodes[id]=make());
const sourceImages=[];function ImageMock(){const image=make();image.naturalHeight=600;sourceImages.push(image);return image;}
let fingerprint='front-A',approved=true,issue=false,raf=[],goCalls=[];const state={logo:'unaltered-front',size:80,rotation:7,bg:'#990000'},initial=JSON.stringify(state);
const ctx={clearTimeout(){},setTimeout(){return 1;},invalidateQuote(){},latest:null,Image:ImageMock,state,$,step:1,designIssue:()=>issue,designFingerprint:()=>fingerprint,processingSession:{isApproved:()=>approved},showDesignIssue(){},imageData:()=> 'data:image/png;base64,FRONT',document:{createElement:()=>{const node=make();Object.defineProperty(node,'id',{set:id=>nodes[id]=node});return node;}},requestAnimationFrame:fn=>raf.push(fn),window:{matchMedia:()=>({matches:false}),scrollTo(){}},status(){},go:n=>goCalls.push(n)};ctx.isDeclaredQuote=()=>false;vm.createContext(ctx);vm.runInContext(rear,ctx);let renderedBackground;ctx.rearMaterialDataURL=(source,bg)=>{renderedBackground=bg;return 'data:image/png;base64,REAR';};
assert(ctx.showRearPreview());assert.equal(ctx.step,4);assert.equal($('rearPreview').hidden,false);
assert.equal($('rearFrontImage').src,'data:image/png;base64,FRONT');assert.equal(sourceImages.at(-1).src,'assets/bm12-back-blank.png');sourceImages.at(-1).onload();assert.equal(renderedBackground,state.bg);assert.equal($('rearBlankImage').src,'data:image/png;base64,REAR');assert.equal($('rearToPrice').disabled,true);assert(!$('rearFlipCard').classList.values.has('is-flipped'));
$('rearBlankImage').onload();while(raf.length)raf.shift()();assert($('rearFlipCard').classList.values.has('is-flipped'));assert.equal($('rearToPrice').disabled,false);assert.equal(JSON.stringify(state),initial);
$('rearToPrice').onclick();assert.equal(goCalls.pop(),2);$('backToFront').onclick();assert.equal(goCalls.pop(),1);
fingerprint='front-B';$('rearToPrice').onclick();assert.equal(goCalls.pop(),1);
ctx.resetRearPreview();assert.equal(ctx.step,1);assert(!$('rearFlipCard').classList.values.has('is-flipped'));assert.equal($('rearFrontImage').src,undefined);
state.bg='#102f59';ctx.showRearPreview();const staleSource=sourceImages.at(-1).onload;const stale=$('rearBlankImage').onload;ctx.resetRearPreview();staleSource();stale();assert.equal($('rearToPrice').disabled,true);
ctx.showRearPreview();sourceImages.at(-1).onload();assert.equal(renderedBackground,'#102f59');$('rearBlankImage').onerror();assert.equal($('rearAssetError').hidden,false);assert.equal($('rearToPrice').disabled,true);
// Truly empty rear can continue even if its decorative asset fails; nonempty/pending states cannot.
assert.equal($('skipEmptyRear').disabled,false);$('skipEmptyRear').onclick();assert.equal(goCalls.pop(),2);
vm.runInContext("rearContent.extra='Keep this';",ctx);ctx.syncRearSkip();assert($('skipEmptyRear').disabled);$('rearToPrice').onclick();assert.equal(goCalls.pop(),1);
vm.runInContext("rearContent.extra='';rearSponsorPending=true;",ctx);ctx.syncRearSkip();assert($('skipEmptyRear').disabled);const count=goCalls.length;$('skipEmptyRear').onclick();assert.equal(goCalls.length,count);vm.runInContext('rearSponsorPending=false;',ctx);
// Typing/rerender can supersede the first asset load; the latest successful render must still flip.
ctx.resetRearPreview();ctx.showRearPreview();const cancelledFirst=sourceImages.at(-1).onload;ctx.renderRearPreview(false);cancelledFirst();sourceImages.at(-1).onload();$('rearBlankImage').onload();while(raf.length)raf.shift()();assert($('rearFlipCard').classList.values.has('is-flipped'));assert.equal($('rearToPrice').disabled,false);
approved=false;assert.equal(ctx.showRearPreview(),false);approved=true;issue=true;assert.equal(ctx.showRearPreview(),false);
// Central route receives both native next/navigation and approved extracted logos.
const goCode=app.slice(app.indexOf('function go(n){'),app.indexOf("$('useMinimum').onclick"));let shown=0;const c={state:{logo:'x'},step:1,$,approveNativeDesignIfEligible(){},designIssue:()=>false,showRearPreview:()=>shown++,showDesignIssue(){},validateLead:()=>true};c.isUnprinted=()=>false;c.isDeclaredQuote=()=>false;c.canReviewExtractedArtwork=()=>false;vm.createContext(c);vm.runInContext(goCode,c);c.go(2);assert.equal(shown,1);
const nextHandler=app.match(/\$\('next'\)\.onclick=([^;]+);/);assert(nextHandler,'Native next handler must exist');vm.runInContext("$('next').onclick="+nextHandler[1]+';',c);$('next').onclick();assert.equal(shown,2,'Artwork next still routes through go(2) to approved rear preview');assert(fs.readFileSync('frontend/brand-region-ui.js','utf8').includes('refresh();go(2);'));
// Pending ordinary approval must use the real source-bound handler and advance
// once; a failed/stale source approval must not call the rear route.
c.approveInk={};c.canReviewExtractedArtwork=()=>true;c.refresh=()=>{};let approvalOK=true;c.approveCurrentDesign=()=>approvalOK;
const approvalLine=fs.readFileSync('frontend/brand-region-ui.js','utf8').split('\n').find(line=>line.startsWith('approveInk.onclick='));assert(approvalLine);vm.runInContext(approvalLine,c);
c.state.extractionApprovalRequired=true;$('next').onclick();assert.equal(shown,3);assert.equal(c.state.extractionApprovalRequired,false);
approvalOK=false;c.state.extractionApprovalRequired=true;$('next').onclick();assert.equal(shown,3);assert.equal(c.state.extractionApprovalRequired,true);
c.state.designProcessing=true;approvalOK=true;$('next').onclick();assert.equal(shown,3);c.state.designProcessing=false;

assert(fs.readFileSync('frontend/processing-lifecycle.js','utf8').includes("if(typeof resetRearPreview==='function')resetRearPreview();loading++"));
assert(fs.readFileSync('frontend/style.css','utf8').includes('@media(prefers-reduced-motion:reduce){.rearFlipCard{transition:none}}'));
assert(!/pricing\(/.test(rear)); // rear editor does not invent a separate price calculation
// Product switch/reset: an old source callback cannot overwrite the new product rear asset.
issue=false;ctx.currentProduct=()=>require('../frontend/product-catalog.js').get(ctx.selectedProductId||'BM12');
for(const id of ['BM21','BM15','BM545','BM12','BM21']){
 const stale=sourceImages.at(-1)?.onload;ctx.hideRearPreview();ctx.selectedProductId=id;fingerprint='product-'+id+'-'+sourceImages.length;
 ctx.showRearPreview();const active=sourceImages.at(-1);assert.equal(active.src,ctx.currentProduct().backAsset);
 $('rearBlankImage').src='pending-'+id;if(stale)stale();assert.equal($('rearBlankImage').src,'pending-'+id,'cancelled product cannot write rear source');
 active.onload();$('rearBlankImage').onload();while(raf.length)raf.shift()();assert.equal($('rearToPrice').disabled,false);
}
ctx.resetRearPreview();assert.equal(ctx.selectedProductId,'BM21');ctx.showRearPreview();assert.equal(sourceImages.at(-1).src,ctx.currentProduct().backAsset);
console.log('PASS front approval routing, animated rear, front-state preservation, stale callback/reset, asset failure, quote continuation and reduced motion');
