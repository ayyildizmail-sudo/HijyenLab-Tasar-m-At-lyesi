const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),app=fs.readFileSync('frontend/app.js','utf8'),rear=fs.readFileSync('frontend/rear-preview.js','utf8');
const nodes={},make=()=>({hidden:false,disabled:false,naturalWidth:1200,classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)}},removeAttribute(k){delete this[k]},focus(){},after(){}}),$=id=>nodes[id]||(nodes[id]=make());
const sourceImages=[];function ImageMock(){const image=make();image.naturalHeight=600;sourceImages.push(image);return image;}
let fingerprint='front-A',approved=true,issue=false,raf=[],goCalls=[];const state={logo:'unaltered-front',size:80,rotation:7,bg:'#990000'},initial=JSON.stringify(state);
const ctx={clearTimeout(){},setTimeout(){return 1;},invalidateQuote(){},latest:null,Image:ImageMock,state,$,step:1,designIssue:()=>issue,designFingerprint:()=>fingerprint,processingSession:{isApproved:()=>approved},showDesignIssue(){},imageData:()=> 'data:image/png;base64,FRONT',document:{createElement:()=>{const node=make();Object.defineProperty(node,'id',{set:id=>nodes[id]=node});return node;}},requestAnimationFrame:fn=>raf.push(fn),window:{matchMedia:()=>({matches:false}),scrollTo(){}},status(){},go:n=>goCalls.push(n)};vm.createContext(ctx);vm.runInContext(rear,ctx);let renderedBackground;ctx.rearMaterialDataURL=(source,bg)=>{renderedBackground=bg;return 'data:image/png;base64,REAR';};
assert(ctx.showRearPreview());assert.equal(ctx.step,4);assert.equal($('rearPreview').hidden,false);
assert.equal($('rearFrontImage').src,'data:image/png;base64,FRONT');assert.equal(sourceImages.at(-1).src,'assets/bm12-back-blank.png');sourceImages.at(-1).onload();assert.equal(renderedBackground,state.bg);assert.equal($('rearBlankImage').src,'data:image/png;base64,REAR');assert.equal($('rearToPrice').disabled,true);assert(!$('rearFlipCard').classList.values.has('is-flipped'));
$('rearBlankImage').onload();while(raf.length)raf.shift()();assert($('rearFlipCard').classList.values.has('is-flipped'));assert.equal($('rearToPrice').disabled,false);assert.equal(JSON.stringify(state),initial);
$('rearToPrice').onclick();assert.equal(goCalls.pop(),2);$('backToFront').onclick();assert.equal(goCalls.pop(),1);
fingerprint='front-B';$('rearToPrice').onclick();assert.equal(goCalls.pop(),1);
ctx.resetRearPreview();assert.equal(ctx.step,1);assert(!$('rearFlipCard').classList.values.has('is-flipped'));assert.equal($('rearFrontImage').src,undefined);
state.bg='#102f59';ctx.showRearPreview();const staleSource=sourceImages.at(-1).onload;const stale=$('rearBlankImage').onload;ctx.resetRearPreview();staleSource();stale();assert.equal($('rearToPrice').disabled,true);
ctx.showRearPreview();sourceImages.at(-1).onload();assert.equal(renderedBackground,'#102f59');$('rearBlankImage').onerror();assert.equal($('rearAssetError').hidden,false);assert.equal($('rearToPrice').disabled,true);
// Typing/rerender can supersede the first asset load; the latest successful render must still flip.
ctx.resetRearPreview();ctx.showRearPreview();const cancelledFirst=sourceImages.at(-1).onload;ctx.renderRearPreview(false);cancelledFirst();sourceImages.at(-1).onload();$('rearBlankImage').onload();while(raf.length)raf.shift()();assert($('rearFlipCard').classList.values.has('is-flipped'));assert.equal($('rearToPrice').disabled,false);
approved=false;assert.equal(ctx.showRearPreview(),false);approved=true;issue=true;assert.equal(ctx.showRearPreview(),false);
// Central route receives both native next/navigation and approved extracted logos.
const goCode=app.slice(app.indexOf('function go(n){'),app.indexOf("$('useMinimum').onclick"));let shown=0;const c={state:{logo:'x'},step:1,$,approveNativeDesignIfEligible(){},designIssue:()=>false,showRearPreview:()=>shown++,showDesignIssue(){},validateLead:()=>true};vm.createContext(c);vm.runInContext(goCode,c);c.go(2);assert.equal(shown,1);
assert(app.includes("$('next').onclick=()=>go(2)"));assert(fs.readFileSync('frontend/brand-region-ui.js','utf8').includes('refresh();go(2);'));
assert(fs.readFileSync('frontend/processing-lifecycle.js','utf8').includes("if(typeof resetRearPreview==='function')resetRearPreview();loading++"));
assert(fs.readFileSync('frontend/style.css','utf8').includes('@media(prefers-reduced-motion:reduce){.rearFlipCard{transition:none}}'));
assert(!/pricing\(/.test(rear)); // rear editor does not invent a separate price calculation
console.log('PASS front approval routing, animated rear, front-state preservation, stale callback/reset, asset failure, quote continuation and reduced motion');
