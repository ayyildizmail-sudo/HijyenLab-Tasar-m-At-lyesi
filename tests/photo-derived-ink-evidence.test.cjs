/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),PrintInks=require('../frontend/print-inks'),CombinedInks=require('../frontend/combined-inks'),PrintPolicy=require('../frontend/print-policy'),ProcessingSession=require('../frontend/processing-session');
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
function harness(c,{photo=true,method='white-carrier-chromatic-and-dark-components',proposal=null,approved=true,sourceSHA='a'.repeat(64)}={}){
 const nodes={},session=ProcessingSession.create(),token=session.begin({sha256:sourceSHA});session.decoded(token,{width:c.width,height:c.height,coordinateFrame:'browser-decoded'});
 const state={logo:'current-artwork',bg:'#ffffff',extractionApproximate:photo,processingResult:session.commit(token,{method,flatPrintProposal:proposal,methodVersion:'test',box:[0,0,c.width,c.height],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,c.width,c.height],reason:'current accepted source'}],excludedRegions:[],maskBasis:'original accepted source pixels',transformOrder:['decode'],limitations:[]})};
 const ctx={state,logoImg:c,prepareLogo:()=>c,PrintInks,CombinedInks,PrintPolicy,processingSession:session,designIssue:()=>false,$:id=>nodes[id]||(nodes[id]={value:'',textContent:''}),document:{createElement:()=>createCanvas(1,1)},invalidateQuote(){},calculateRaw(){},refresh(){},calculate(){}};
 vm.createContext(ctx);require('./helpers/content-safety-vm.cjs')(ctx);
 vm.runInContext(fs.readFileSync('frontend/brand-region-ui.js','utf8').split('\n').find(l=>l.startsWith('function designFingerprint()')),ctx);
 session.touchDesign(ctx.designFingerprint());if(approved)session.approve(ctx.designFingerprint());state.processingResult=session.getState().result;
 vm.runInContext(fs.readFileSync('frontend/print-inks-ui.js','utf8'),ctx);
 return {ctx,nodes,session,estimate:()=>vm.runInContext('frontArtworkInkEstimate',ctx)};
}
function blocks(colors){const c=createCanvas(240,100),g=c.getContext('2d');colors.forEach((v,i)=>{g.fillStyle=v;g.fillRect(8+i*230/colors.length,10,210/colors.length,80);});return c;}
test('photographic RGB clusters stay unchanged and unknown, not clamped to three',()=>{
 const c=blocks(['#d06707','#222123','#4f5052','#e6853b','#82573e']),d=pixels(c),before=Buffer.from(d),raw=PrintInks.estimate(d,c.width,c.height,{acceptedArtwork:true}),photo=PrintInks.estimate(d,c.width,c.height,{acceptedArtwork:true,photoDerived:true});
 assert.equal(raw.count,5);assert.equal(photo.count,5);assert.deepEqual(photo.colors,raw.colors);assert.equal(photo.uncertain,true);assert.equal(photo.physicalInkCount,null);assert.deepEqual(Buffer.from(d),before);
 const h=harness(c);assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.currentPrintPolicy().count,null);assert.equal(h.ctx.visualPreviewPolicyError(),'');assert(h.ctx.printPolicyError());h.nodes.inks.value='3';assert(h.ctx.printPolicyError(),'manual three cannot certify photography');h.ctx.state.designProcessing=true;assert(h.ctx.visualPreviewPolicyError(),'pending source cannot continue');
});
test('native three and four, screen four and pale gray remain honest',()=>{
 for(const colors of [['#d06707','#222123','#4f5052'],['#d06707','#222123','#4f5052','#008040']]){const h=harness(blocks(colors),{photo:false,method:'native-logo'});assert.equal(h.estimate().count,colors.length);assert.equal(h.estimate().uncertain,false);assert.equal(h.ctx.currentPrintPolicy().blocked,colors.length>3);}
 const screen=harness(blocks(['#dfdfdf','#a0a0a0','#606060','#101010']),{photo:true,method:'screen-chrome-region'});assert.equal(screen.estimate().count,4);assert.equal(screen.estimate().uncertain,false);assert(screen.ctx.visualPreviewPolicyError());
 const pale=harness(blocks(['#101010','#f5f5f5']),{photo:false,method:'native-logo'});assert.equal(pale.nodes.inks.value,'');assert(pale.ctx.printPolicyError());
});
const source=process.env.HIJYENLAB_PRIVATE_PHOTO_INK_SOURCE;
test('actual extracted photograph ordinary ink UI allows only current idea preview, not price',{skip:!source},async()=>{
 const im=await loadImage(source),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const before=Buffer.from(pixels(c)),raw=PrintInks.estimate(pixels(c),c.width,c.height,{acceptedArtwork:true}),h=harness(c);
 assert(raw.colors.length>3,'fixture exposes photographed RGB overcount');assert.equal(h.estimate().uncertain,true);assert.equal(h.estimate().physicalInkCount,null);assert(h.estimate().count>3,'diagnostic clusters preserved, not clamped');assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.currentPrintPolicy().count,null);assert.equal(h.ctx.visualPreviewPolicyError(),'');assert(h.ctx.printPolicyError());assert.deepEqual(Buffer.from(pixels(c)),before);
 h.session.begin({sha256:'b'.repeat(64)});assert(h.ctx.visualPreviewPolicyError(),'old pixels cannot approve a replacement');
});

const PhotoFlatProposal=require('../frontend/photo-flat-proposal');
const rowAudit={passed:true,basis:'independent-header-subtitle-component-regions',componentRetention:[{pixels:100,retained:100}],neutralRetention:[{pixels:100,retained:100}]};
const propose=c=>PhotoFlatProposal.propose(pixels(c),c.width,c.height,{rowRefinement:rowAudit,sourceSHA256:'a'.repeat(64)});
test('flat photo proposal preserves geometry, original and two/three families; rejects distinct four and separate gray',async()=>{
 for(const colors of [['#cc681d','#292929'],['#cc681d','#165cb4','#292929']]){const c=blocks(colors),before=Buffer.from(pixels(c)),r=await propose(c);assert.equal(r.applied,true);assert.equal(r.metadata.proposedInkCount,colors.length);assert.deepEqual(Buffer.from(pixels(c)),before);for(let i=3;i<r.data.length;i+=4)assert.equal(r.data[i],before[i]);assert.equal(r.metadata.customerApprovalRequired,true);assert.equal(r.metadata.commercialPermission,false);}
 const holes=blocks(['#cc681d','#292929']);holes.getContext('2d').fillStyle='white';holes.getContext('2d').fillRect(20,20,8,8);const protectedWhite=await propose(holes);assert.equal(protectedWhite.applied,true);assert.deepEqual(Array.from(protectedWhite.data.slice((22*holes.width+22)*4,(22*holes.width+22)*4+4)),[255,255,255,255]);
 assert.equal((await propose(blocks(['#cf3120','#165cb4','#108030','#292929']))).applied,false);
 assert.equal((await propose(blocks(['#cc681d','#292929','#aaaaaa']))).applied,false);
 for(const colors of [['#2040d0','#101868','#292929'],['#df7822','#804012','#292929'],['#df3022','#df7822','#292929']])assert.equal((await propose(blocks(colors))).applied,false,'independent same-hue inks must not collapse');
 const c=blocks(['#cc681d','#292929']);assert.equal((await PhotoFlatProposal.propose(pixels(c),c.width,c.height,{rowRefinement:rowAudit,sourceSHA256:'a'.repeat(64),knownActualInkCount:4})).applied,false);
 assert.equal((await PhotoFlatProposal.propose(pixels(c),c.width,c.height,{sourceSHA256:'a'.repeat(64)})).applied,false);
});
test('only currently approved actually rendered flat proposal contributes its palette',async()=>{
 const c=blocks(['#cc681d','#292929']),r=await propose(c),out=createCanvas(c.width,c.height),g=out.getContext('2d'),image=g.createImageData(c.width,c.height);image.data.set(r.data);g.putImageData(image,0,0);const metadata={...r.metadata,renderedPixelsVerified:true};
 const approved=harness(out,{proposal:metadata});assert.equal(approved.nodes.inks.value,'2');assert.equal(approved.ctx.currentPrintPolicy().blocked,false);
 const pending=harness(out,{proposal:metadata,approved:false});assert.equal(pending.nodes.inks.value,'');assert(pending.ctx.printPolicyError());
 for(const patch of [{sourceSHA256:'b'.repeat(64)},{renderedPixelsVerified:false},{originalKnownActualInkCount:4},{actualProposedPalette:['#ff0000','#000000']}]){const h=harness(out,{proposal:{...metadata,...patch}});assert.equal(h.nodes.inks.value,'');assert(h.ctx.printPolicyError());if(patch.originalKnownActualInkCount)assert(h.ctx.visualPreviewPolicyError(),'known original four still requires contact');}
 approved.ctx.state.logo='replacement';approved.ctx.syncPrintInks();assert.equal(approved.nodes.inks.value,'');
});
test('actual audited extracted photograph becomes explicit two-ink rendered proposal only after normal approval',{skip:!source},async()=>{
 const im=await loadImage(source),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);
 const evidence=JSON.parse(fs.readFileSync(require('node:path').join(require('node:path').dirname(source),'route-replay.json'),'utf8'));const findAudit=o=>{if(o?.rowRefinement)return o.rowRefinement;for(const v of Object.values(o||{}))if(v&&typeof v==='object'){const found=findAudit(v);if(found)return found;}};
 const r=await PhotoFlatProposal.propose(pixels(c),c.width,c.height,{rowRefinement:findAudit(evidence),sourceSHA256:'a'.repeat(64)});assert.equal(r.applied,true,r.reason);assert.equal(r.metadata.proposedInkCount,2);const out=createCanvas(c.width,c.height),g=out.getContext('2d'),image=g.createImageData(c.width,c.height);image.data.set(r.data);g.putImageData(image,0,0);const metadata={...r.metadata,renderedPixelsVerified:true};
 const h=harness(out,{proposal:metadata});assert.equal(h.nodes.inks.value,'2');assert.equal(h.ctx.currentPrintPolicy().blocked,false);assert.equal(h.estimate().method,'approved-rendered-flat-photo-proposal');const pending=harness(out,{proposal:metadata,approved:false});assert.equal(pending.nodes.inks.value,'');assert(pending.ctx.printPolicyError());
});

test('only tiny translucent alpha-connected neutral fringe can borrow a nearby real dark core',async()=>{
 for(const kind of ['connected','detached','opaque','long-line']){const c=blocks(['#cc681d','#292929']),g=c.getContext('2d');if(kind!=='detached'){g.fillStyle='rgba(140,140,140,0.2)';g.fillRect(228,40,3,2);}g.fillStyle=kind==='opaque'?'#aaaaaa':'rgba(170,170,170,0.5)';g.fillRect(231,40,kind==='long-line'?1:2,kind==='long-line'?5:2);const r=await propose(c);assert.equal(r.applied,kind==='connected',kind);if(r.applied)assert.equal(r.metadata.explainedEdgeIslands,1);}
});
const browserAudit=process.env.HIJYENLAB_PRIVATE_BROWSER_PHOTO_AUDIT;
test('exact downloaded browser RGBA explains only three tiny AA islands and yields approved two-ink proposal',{skip:!browserAudit},async()=>{
 const a=JSON.parse(fs.readFileSync(browserAudit,'utf8')),data=new Uint8ClampedArray(a.rgba),before=Buffer.from(data),r=await PhotoFlatProposal.propose(data,a.width,a.height,a);assert.equal(r.applied,true,r.reason);assert.equal(r.metadata.proposedInkCount,2);assert.equal(r.metadata.explainedEdgeIslands,3);assert.deepEqual(Buffer.from(data),before);for(let i=3;i<data.length;i+=4)assert.equal(r.data[i],data[i]);
 const out=createCanvas(a.width,a.height),g=out.getContext('2d'),image=g.createImageData(a.width,a.height);image.data.set(r.data);g.putImageData(image,0,0);const h=harness(out,{proposal:{...r.metadata,renderedPixelsVerified:true},sourceSHA:a.sourceSHA256});assert.equal(h.nodes.inks.value,'2');assert.equal(h.ctx.currentPrintPolicy().blocked,false);
});
test('verified awaiting-approval flat logo gets neutral preview wording, never commercial permission',async()=>{
 const c=blocks(['#cc681d','#292929']),r=await propose(c),h=harness(c,{proposal:{...r.metadata,renderedPixelsVerified:true},approved:false});h.ctx.state.extractionApprovalRequired=true;
 const message={textContent:''},buttons=[{hidden:false},{hidden:false}],panel={hidden:false,querySelector:()=>message,querySelectorAll:()=>buttons};h.ctx.document.querySelector=selector=>selector==='#printPolicyNotice'?panel:null;
 h.ctx.syncPrintInks();assert.match(message.textContent,/Logo önizlemesi 2 baskı rengiyle hazır/);assert.match(h.nodes.inkEstimateNote.textContent,/tasarımınızı onaylayarak/);assert(buttons.every(b=>b.hidden));assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.currentPrintPolicy().blocked,true);assert(h.ctx.printPolicyError());assert(h.ctx.visualPreviewPolicyError(),'no premature approval/navigation');
 h.ctx.state.logo='different-unapproved-pixels';h.ctx.syncPrintInks();assert.equal(h.ctx.pendingFlatPhotoNotice(),'');assert(buttons.every(b=>!b.hidden));assert.doesNotMatch(message.textContent,/önizlemesi 2/);
 const known=harness(c,{proposal:{...r.metadata,renderedPixelsVerified:true,originalKnownActualInkCount:4},approved:false});known.ctx.state.extractionApprovalRequired=true;assert.equal(known.ctx.pendingFlatPhotoNotice(),'');assert.equal(known.ctx.currentPrintPolicy().count,4);
});
