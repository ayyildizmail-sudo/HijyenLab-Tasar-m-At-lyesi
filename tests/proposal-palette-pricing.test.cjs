/* eslint-disable @typescript-eslint/no-require-imports -- Native-canvas regression harness. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test'),{createHash}=require('node:crypto');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas'),CombinedInks=require('../frontend/combined-inks'),PrintInks=require('../frontend/print-inks'),PrintPolicy=require('../frontend/print-policy'),ProcessingSession=require('../frontend/processing-session'),ProductCatalog=require('../frontend/product-catalog');
const IDENTITY='verified-rendered-flat-palette',NAVY=['#133c80','#173e82','#c02020'],GRAY=['#111111','#171717','#c02020'];
const exact=colors=>({status:'estimated',colors,inkIdentity:IDENTITY});
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const digest=d=>createHash('sha256').update(d).digest('hex');
function artwork(colors){const c=createCanvas(180,80),g=c.getContext('2d');colors.forEach((v,i)=>{g.fillStyle=v;g.fillRect(8+i*170/colors.length,10,150/colors.length,60);});return c;}
function harness(colors=NAVY,{approved=true,photo=false,actualProposal=null}={}){
 const image=actualProposal?.image||artwork(colors),session=ProcessingSession.create(),sha=actualProposal?.metadata.sourceSHA256||'a'.repeat(64),token=session.begin({sha256:sha}),nodes={};session.decoded(token,{width:image.width,height:image.height,coordinateFrame:'browser-decoded'});
 const metadata={method:'source-flat-flexo-proposal-v1',width:image.width,height:image.height,sourceSHA256:sha,sourcePixelSHA256:digest(pixels(image)),outputPixelSHA256:digest(pixels(image)),actualProposedPalette:colors.slice(),proposedInkCount:colors.length,alphaUnchanged:true,whiteIsSubstrate:true,renderedPixelsVerified:true,originalKnownActualInkCount:4,...actualProposal?.metadata};
 const state={logo:'verified-rendered-proposal',bg:'#ffffff',text:'',textColor:'#ffffff',extractionApproximate:photo,processingResult:session.commit(token,{method:metadata.method,methodVersion:'v1',flatPrintProposal:metadata,box:[0,0,image.width,image.height],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,image.width,image.height],reason:'unchanged proposal geometry'}],excludedRegions:[],maskBasis:'source geometry retained',transformOrder:['decode','proposal','verified-PNG-roundtrip'],limitations:['not print master']})};
 let rear=false,revision=0,additional=[];
 const ctx={state,logoImg:image,prepareLogo:()=>image,PrintInks,CombinedInks,PrintPolicy,processingSession:session,ProductCatalog,designIssue:()=>false,$:id=>nodes[id]||(nodes[id]={value:'',textContent:''}),document:{createElement:()=>createCanvas(1,1)},invalidateQuote(){},calculateRaw(){},refresh(){},calculate(){ctx.syncPrintInks();},rearContent:{instagram:'',website:'',phone:'',address:'',extra:'',inkColor:'',qrEnabled:false},rearHasContent:()=>rear,rearQuoteSnapshot:()=>({revision}),MultiLogo:{primaryFront:()=>image,palettes:()=>additional,has:()=>additional.length>0,fingerprint:()=>JSON.stringify(additional)}};
 vm.createContext(ctx);require('./helpers/content-safety-vm.cjs')(ctx);vm.runInContext(fs.readFileSync('frontend/brand-region-ui.js','utf8').split('\n').find(l=>l.startsWith('function designFingerprint()')),ctx);session.touchDesign(ctx.designFingerprint());if(approved)session.approve(ctx.designFingerprint());state.processingResult=session.getState().result;
 vm.runInContext(fs.readFileSync('frontend/print-inks-ui.js','utf8'),ctx);const app=fs.readFileSync('frontend/app.js','utf8');vm.runInContext(app.slice(app.indexOf('function pricing('),app.indexOf('\nconst money=')),ctx);
 return {ctx,nodes,session,image,metadata,update(){revision++;ctx.syncPrintInks();},rear(value=true){rear=value;revision++;ctx.syncPrintInks();},extras(value){additional=value;revision++;ctx.syncPrintInks();},quote(){return ctx.pricing(5200,'#ffffff','İstanbul','Kadıköy','new',nodes.inks.value===''?null:Number(nodes.inks.value),ProductCatalog.rules('BM12'));}};
}
test('verified palette counts every rendered near navy and dark gray identity; legacy sampling is unchanged',()=>{
 for(const colors of [NAVY,GRAY]){const input={front:exact(colors),background:'#ffffff',rear:{qr:true}},r=CombinedInks.estimate(input);assert.equal(r.count,3);assert.deepEqual(r.colors,colors);assert.deepEqual(r.actualInkColors,colors);assert.equal(r.qrColor,colors[0]);assert.equal(r.inkIdentity,IDENTITY);assert.equal(CombinedInks.estimate({...input,front:{status:'estimated',colors}}).count,2,'no new exact-ink claim for original sampled colors');}
});
test('exact union crosses all faces, text, extras and ground without near-color clustering or white plate',()=>{
 const input={front:exact(NAVY),background:'#173e82',frontTextColor:'#c02020',additional:[{status:'estimated',colors:['#133c80','#ffffff']}],rear:{textColor:'#133c80',textColorFromExisting:true,qr:true,sponsor:{status:'estimated',palette:{uncertain:false,colors:['#173e82','#c02020']}}}};
 const r=CombinedInks.estimate(input);assert.equal(r.count,3);assert.deepEqual(r.colors,NAVY);assert.equal(r.qrColor,NAVY[0]);
 for(const patch of [{background:'#173e83'},{frontTextColor:'#173e83'},{additional:[{status:'estimated',colors:['#173e83']}]},{rear:{sponsor:{status:'estimated',palette:{uncertain:false,colors:['#173e83']}}}}]){const extra=CombinedInks.estimate({...input,...patch});assert.equal(extra.count,4);assert.equal(PrintPolicy.evaluate(extra).blocked,true);}
 assert.equal(CombinedInks.estimate({...input,additional:[{status:'unknown',colors:[]}]}).count,null);
});
test('approved actual pixels drive automatic three-plate amount, QR and repeated sync; cannot enter false manual count',()=>{
 for(const colors of [NAVY,GRAY]){const h=harness(colors);assert.equal(h.nodes.inks.value,'3');assert.equal(h.nodes.inks.disabled,true);assert.equal(h.ctx.currentPrintPolicy().blocked,false);assert.equal(h.quote().plate,300000);assert.equal(h.quote().subtotal,2068000);assert.equal(h.quote().totalStatus,'estimated-complete');
  h.nodes.inks.value='2';h.nodes.inks.oninput();assert.equal(h.nodes.inks.value,'3');assert.equal(h.ctx.state.inkSelection.selectedCount,3);
  h.nodes.inks.value='1';h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'3','cached sync cannot keep divergent numeric selection');
  h.ctx.rearContent.phone='555';h.ctx.rearContent.qrEnabled=true;h.rear();assert.equal(h.nodes.inks.value,'3');assert.equal(h.ctx.combinedRearInkEstimate().qrColor,colors[0]);assert.equal(h.ctx.rearTextInkDecision().color,colors[0]);assert.equal(h.quote().plate,300000);
  h.extras([{status:'estimated',colors:[colors[1]]}]);assert.equal(h.nodes.inks.value,'3');h.extras([{status:'estimated',colors:['#173e83']}]);assert.equal(h.ctx.currentPrintPolicy().blocked,true);assert.equal(h.nodes.inks.value,'4');assert.throws(()=>h.quote(),/WhatsApp/);
 }
});
test('only exact matching opaque cores authorize ink identities, including colors one channel apart',()=>{
 const h=harness(['#133c80','#143c80','#c02020']);assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0).count,3);assert.equal(h.nodes.inks.value,'3');
 h.image.getContext('2d').fillStyle='#153c80';h.image.getContext('2d').fillRect(10,12,4,4);assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0),null,'tolerance must not accept a distinct unlisted opaque ink');
 const duplicate=harness(['#133c80','#143c80','#c02020']);duplicate.ctx.state.processingResult.flatPrintProposal.actualProposedPalette=['#133c80','#133C80','#c02020'];assert.equal(duplicate.ctx.approvedFlatPhotoPalette(null,0,0),null);
});
test('approval, replacement, canceled source, wrong source and pending extra never become an automatic confirmed palette',()=>{
 const pending=harness(NAVY,{approved:false});assert.equal(pending.ctx.approvedFlatPhotoPalette(null,0,0),null);assert.equal(pending.session.isApproved(pending.ctx.designFingerprint()),false);assert.notEqual(vm.runInContext('frontArtworkInkEstimate.inkIdentity',pending.ctx),IDENTITY);
 for(const action of ['cancel','replace','source','revision']){const h=harness(),before=h.ctx.printInkFingerprint();if(action==='cancel')h.session.cancel();if(action==='replace')h.session.begin({sha256:'b'.repeat(64)});if(action==='source')h.ctx.state.processingResult.source.sha256='b'.repeat(64);if(action==='revision')h.session.touchDesign('other-design');h.ctx.syncPrintInks();assert.notEqual(h.ctx.printInkFingerprint(),before);assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0),null,action);assert.equal(h.ctx.currentPrintPolicy().blocked,true,action);}
 const uncertain=harness();uncertain.extras([{status:'unknown',colors:[]}]);assert.equal(uncertain.nodes.inks.value,'');assert.equal(uncertain.quote().plate,null);assert.equal(uncertain.quote().totalStatus,'partial-excludes-plate');
});
test('accepted rear proposal uses its actual exact canvas palette, not sampled near-color clusters',()=>{
 const h=harness(),canvas=artwork(NAVY.slice(0,2)),sourceHash='d'.repeat(64),data=pixels(canvas),prepared={canvas,data,width:canvas.width,height:canvas.height,method:'native-alpha-trim',flatPrintProposal:{method:'rear-canonical-flat-proposal-v1',sourceSHA256:sourceHash,sourcePixelSHA256:digest(data),outputPixelSHA256:digest(data),actualProposedPalette:NAVY.slice(0,2),proposedInkCount:2,renderedPixelsVerified:true,alphaUnchanged:true,whiteIsSubstrate:true}};
 h.ctx.rearContent.sponsorHash=sourceHash;h.ctx.rearSponsorPrepared=prepared;h.ctx.rearSponsorRecolor='';h.rear();assert.equal(h.ctx.acceptedRearInkPalette(prepared).count,2);assert.equal(h.nodes.inks.value,'3');assert.equal(h.quote().plate,300000);
 assert.equal(CombinedInks.estimate({front:{status:'none'},background:'#ffffff',rear:{sponsor:{status:'estimated',palette:h.ctx.acceptedRearInkPalette(prepared)}}}).count,2,'rear-only canonical output remains exact after front change');
 const original=Buffer.from(data);canvas.getContext('2d').fillStyle='#173e83';canvas.getContext('2d').fillRect(10,12,4,4);assert.equal(h.ctx.acceptedRearInkPalette(prepared).uncertain,true);assert.deepEqual(Buffer.from(data),original,'verification never mutates prepared pixels');h.update();assert.equal(h.nodes.inks.value,'');
 const copy={...prepared,canvas:artwork(NAVY.slice(0,2))};h.ctx.rearContent.sponsorHash='e'.repeat(64);assert.equal(h.ctx.acceptedRearInkPalette(copy).uncertain,true,'source mismatch fails closed');
});
test('accepted rear canonical union stays count-locked after approved front changes to native artwork',()=>{
 const h=harness(),canvas=artwork(NAVY),data=pixels(canvas),sourceHash='d'.repeat(64);
 h.ctx.rearSponsorPrepared={canvas,data,width:canvas.width,height:canvas.height,method:'native-alpha-trim',flatPrintProposal:{method:'rear-canonical-flat-proposal-v1',sourceSHA256:sourceHash,sourcePixelSHA256:digest(data),outputPixelSHA256:digest(data),actualProposedPalette:NAVY.slice(),proposedInkCount:3,renderedPixelsVerified:true,alphaUnchanged:true,whiteIsSubstrate:true}};
 h.ctx.rearSponsorRecolor='';h.ctx.rearContent.sponsorHash=sourceHash;h.rear();assert.equal(h.nodes.inks.disabled,true);assert.equal(h.nodes.inks.value,'3');
 const token=h.session.begin({sha256:'b'.repeat(64)});h.ctx.syncPrintInks();assert.equal(h.ctx.currentVisualArtworkReady(),false,'loading source cannot reuse front approval');assert.equal(h.session.isApproved(h.ctx.designFingerprint()),false);
 const native=artwork(['#c02020']);h.ctx.logoImg=native;h.ctx.prepareLogo=()=>native;h.ctx.MultiLogo.primaryFront=()=>native;h.ctx.state.logo='new-native-red';h.session.decoded(token,{width:native.width,height:native.height,coordinateFrame:'browser-decoded'});
 h.ctx.state.processingResult=h.session.commit(token,{method:'native-logo',methodVersion:'v1',box:[0,0,native.width,native.height],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,native.width,native.height],reason:'native artwork unchanged'}],excludedRegions:[],maskBasis:'native source pixels',transformOrder:['decode'],limitations:['not physical press separation']});h.session.touchDesign(h.ctx.designFingerprint());assert.equal(h.session.isApproved(h.ctx.designFingerprint()),false,'new native source needs its own approval');h.session.approve(h.ctx.designFingerprint());h.ctx.state.processingResult=h.session.getState().result;h.update();
 assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0),null,'front is genuinely native, not a proposal');assert.notEqual(vm.runInContext('frontArtworkInkEstimate.inkIdentity',h.ctx),IDENTITY);assert.equal(h.ctx.combinedRearInkEstimate().count,3);assert.equal(h.ctx.currentPrintPolicy().count,3);assert.equal(h.nodes.inks.disabled,true,'rear exact proposal locks the full union');
 for(const attempt of ['1','2','', '3']){h.nodes.inks.value=attempt;h.nodes.inks.oninput();assert.equal(h.nodes.inks.value,'3');assert.equal(h.ctx.state.inkSelection.selectedCount,3);assert.equal(h.quote().plate,300000);assert.equal(h.quote().subtotal,2068000);}
 h.nodes.inks.value='2';h.ctx.syncPrintInks();assert.equal(h.nodes.inks.value,'3','cached refresh cannot keep lower manual value');assert.equal(h.nodes.inks.disabled,true);
 // The same retained rear data must not hijack the explicit reference-only mode.
 h.ctx.isReferencePreview=()=>true;assert.equal(h.ctx.currentCanonicalInkEstimate(),null);h.ctx.isReferencePreview=()=>false;
 h.session.cancel();h.ctx.syncPrintInks();assert.equal(h.ctx.currentVisualArtworkReady(),false);assert.equal(h.session.isApproved(h.ctx.designFingerprint()),false);
});


test('actual single-family gradient PNG approval drives one canonical plate, never a count clamp',async()=>{
 const source=require('./helpers/single-family-gradient.cjs').gradientArtwork(),before=pixels(source),sourceSHA256=digest(source.toBuffer('image/png'));
 const proposal=await require('../frontend/flexo-design-proposal').propose(before,source.width,source.height,{sourceSHA256});assert(proposal.applied,proposal.reason);assert.equal(proposal.metadata.proposedInkCount,1);
 const output=createCanvas(source.width,source.height);output.getContext('2d').putImageData(new ImageData(proposal.data,source.width,source.height),0,0);const decoded=await loadImage(output.toBuffer('image/png'));output.getContext('2d').clearRect(0,0,output.width,output.height);output.getContext('2d').drawImage(decoded,0,0);assert.deepEqual(pixels(output),proposal.data);
 const metadata={...proposal.metadata,outputPixelSHA256:digest(pixels(output)),renderedPixelsVerified:true},h=harness(metadata.actualProposedPalette,{approved:false,actualProposal:{image:output,metadata}});
 assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0),null,'source output is not price-authoritative before its actual appearance is approved');assert.equal(h.session.isApproved(h.ctx.designFingerprint()),false);
 h.session.approve(h.ctx.designFingerprint());h.ctx.state.processingResult=h.session.getState().result;h.ctx.syncPrintInks();assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0).count,1);assert.equal(h.nodes.inks.value,'1');assert.equal(h.nodes.inks.disabled,true);assert.equal(h.quote().plate,100000);assert.equal(h.quote().subtotal,1868000);assert.equal(h.quote().totalStatus,'estimated-complete');
 for(const value of ['2','3','']){h.nodes.inks.value=value;h.nodes.inks.oninput();assert.equal(h.nodes.inks.value,'1');assert.equal(h.quote().plate,100000);}
 assert.equal(h.ctx.state.processingResult.flatPrintProposal.outputPixelSHA256,digest(pixels(output)));assert.equal(h.ctx.state.processingResult.flatPrintProposal.sourcePixelSHA256,digest(before));
 h.ctx.state.logo='replacement-source';h.session.touchDesign(h.ctx.designFingerprint());h.ctx.syncPrintInks();assert.equal(h.ctx.approvedFlatPhotoPalette(null,0,0),null,'source/appearance change still revokes canonical proposal authority');
});
