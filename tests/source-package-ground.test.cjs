'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const P=require('../frontend/source-package-ground.js'),B=require('../frontend/background.js'),S=require('../frontend/source-ground-scope.js'),C=require('../frontend/combined-inks.js'),PrintInks=require('../frontend/print-inks.js');
const sha='a'.repeat(64);let cases=0;
function canvas(w=240,h=200,bg='#ffffff'){const c=createCanvas(w,h),x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);return c;}
function pixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}
function inspect(c){const data=pixels(c),before=Buffer.from(data),d=B.analyze(data,c.width,c.height),proposal=P.nativeProposal(data,c.width,c.height,d),product=P.detect(data,c.width,c.height);assert.deepEqual(Buffer.from(data),before);return {d,proposal,product};}
function scope(d,proposal,extra={}){return S.resolve({artifactKind:'native-artwork',sourceIdentity:sha,detection:{...d,packageGroundProposal:proposal?{...proposal,sourceIdentity:sha}:null},...extra});}
function mark(c){const x=c.getContext('2d');x.fillStyle='#ffffff';x.font='bold 24px sans-serif';x.fillText('MARK',55,c.height*.55);x.fillRect(60,c.height*.65,80,2);return c;}
for(const color of ['#621a1b','#123f79','#175737','#212121','#bb8833']){const c=mark(canvas(240,200,color)),r=inspect(c),s=scope(r.d,r.proposal);assert(r.proposal);assert.equal(r.product,null);assert.equal(s.packageColor,color);assert(s.packageGroundProposed);assert(s.requiresReview);assert.equal(s.sourceGroundVerified,false);assert.equal(s.allowColorRemoval,false);assert.equal(s.preserveArtwork,true);assert.equal(C.estimate({background:color,front:{status:'estimated',colors:[color,'#ffffff']}}).count,1);cases++;}
// Legitimate local panels with a visible exterior, circular badges, frames,
// and transparent artwork do not silently become full-package color.
const padded=canvas(),px=padded.getContext('2d');px.drawImage(mark(canvas(160,120,'#621a1b')),40,40);
const circle=canvas(),cx=circle.getContext('2d');cx.fillStyle='#123f79';cx.beginPath();cx.arc(120,100,80,0,Math.PI*2);cx.fill();
const framed=canvas(240,200,'#d2e6f1'),fx=framed.getContext('2d');fx.strokeStyle='#173722';fx.lineWidth=16;fx.strokeRect(0,0,240,200);fx.fillText('FRAME',70,100);
const alpha=canvas();alpha.getContext('2d').clearRect(0,0,240,200);alpha.getContext('2d').drawImage(mark(canvas(160,120,'#621a1b')),40,40);
const gradient=canvas(),gx=gradient.getContext('2d'),g=gx.createLinearGradient(0,0,240,200);g.addColorStop(0,'#123456');g.addColorStop(1,'#a0b0c0');gx.fillStyle=g;gx.fillRect(0,0,240,200);
for(const c of [padded,circle,framed,alpha,gradient]){const r=inspect(c);assert.equal(r.proposal,null);assert.equal(r.product,null);assert.equal(scope(r.d,r.proposal).packageColor,'#ffffff');cases++;}
const ready=inspect(mark(canvas(240,200,'#123f79')));
for(const [ground,core] of [['#123f79','#133f79'],['#175737','#185737']]){const c=mark(canvas(240,200,ground)),data=pixels(c),copy=Buffer.from(data),estimate={method:'accepted-artwork-core-palette',contentEvidence:{content:'flat-colors'},uncertain:false,count:2,colors:[core,'#ffffff']},before=JSON.stringify(estimate),canonical=P.canonicalGroundPalette(data,c.width,c.height,estimate,ground);assert.deepEqual(canonical.colors,[ground,'#ffffff']);assert.equal(canonical.count,estimate.count);assert.equal(JSON.stringify(estimate),before);assert.deepEqual(Buffer.from(data),copy);cases++;
 for(const changed of [{...estimate,uncertain:true},{...estimate,count:3,colors:[core,ground,'#ffffff']},{...estimate,count:3,colors:[core,'#'+(parseInt(ground.slice(1,3),16)+3).toString(16).padStart(2,'0')+ground.slice(3),'#ffffff']},{...estimate,method:'verified-rendered-flat-palette'}]){assert.equal(P.canonicalGroundPalette(data,c.width,c.height,changed,ground),changed);cases++;}
 assert.equal(P.canonicalGroundPalette(data,c.width,c.height,estimate,'#334455'),estimate);cases++;
}
assert(ready.proposal.foregroundBounds);assert(ready.proposal.foregroundBounds.right-ready.proposal.foregroundBounds.left<200);cases++;
const faint=mark(canvas(240,200,'#123f79')),fc=faint.getContext('2d');fc.fillStyle='#1c4983';fc.fillRect(20,155,12,8);const faintProposal=inspect(faint).proposal;assert(faintProposal.foregroundBounds.left<=20&&faintProposal.foregroundBounds.bottom>=163,'A separate faint near-ground ink must remain inside placement bounds');cases++;
for(const artifactKind of ['scene','isolated-brand','selected-brand-region']){assert.equal(scope(ready.d,ready.proposal,{artifactKind}).packageColor,'#ffffff');cases++;}
assert.equal(scope(ready.d,ready.proposal,{sourceIdentity:null}).packageColor,'#ffffff');
assert.equal(scope(ready.d,ready.proposal,{sourceIdentity:'b'.repeat(64)}).packageColor,'#ffffff');cases++;
assert.equal(scope(ready.d,ready.proposal,{customerChoice:{explicit:true,scope:'package',color:'#ffffff'}}).packageColor,'#ffffff');cases+=2;
function packet(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.12,y+h*.1);ctx.lineTo(x+w*.88,y+h*.1);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w*.88,y+h*.9);ctx.lineTo(x+w*.12,y+h*.9);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();}
const proof=canvas(600,360),proofx=proof.getContext('2d');proofx.fillStyle='#135737';proofx.fillRect(20,30,210,280);packet(proofx,280,40,280,110,'#135737');packet(proofx,280,190,280,110,'#135737');const evidence=inspect(proof).product;assert(evidence);assert.equal(evidence.carrierBoxes.length,2);assert.equal(evidence.corroboratingRegions.length,2);cases++;
const de={kind:'color',color:'#135737'},e={...evidence,sourceIdentity:sha,pageNumber:2};
const bound=scope(de,null,{packageEvidence:e,pageNumber:2});assert(bound.packageGroundProposed);assert.equal(bound.sourceGroundVerified,false);assert.equal(bound.packageColor,de.color);cases++;
for(const extra of [{sourceIdentity:'b'.repeat(64),pageNumber:2},{pageNumber:3},{pageNumber:2,detection:{kind:'color',color:'#832020'}}]){assert.equal(scope(de,null,{packageEvidence:e,...extra}).packageColor,'#ffffff');cases++;}
// A rectangular panel by itself is not independent product evidence.
const rectangle=canvas(400,300),rx=rectangle.getContext('2d');rx.fillStyle='#135737';rx.fillRect(50,60,300,180);assert.equal(inspect(rectangle).product,null);cases++;
// Select the unique marked packet, regardless of whether it is above/below.
const markedProof=canvas(600,360),mp=markedProof.getContext('2d');mp.drawImage(proof,0,0);mp.fillStyle='#ffffff';mp.font='bold 24px sans-serif';mp.fillText('BUSINESS',340,250);
const marked=P.prepareTechnicalProof(markedProof,createCanvas);assert(marked?.canvas);assert(marked.box[1]>180,'No top-position or brand-name hardcode');cases++;
mp.fillText('OTHER',350,100);assert.equal(P.prepareTechnicalProof(markedProof,createCanvas)?.needsSelection,true,'Competing marked faces must not be silently selected');cases++;
const sealProof=canvas(600,360),sp=sealProof.getContext('2d');sp.drawImage(proof,0,0);sp.fillStyle='#ffffff';sp.fillRect(285,235,8,15);sp.font='bold 24px sans-serif';sp.fillText('BUSINESS',340,250);assert.equal(P.prepareTechnicalProof(sealProof,createCanvas)?.needsSelection,true,'Marks outside straight body cannot be silently cropped');cases++;
// Execute the actual ingress helper: only the original frame is evidence, not
// a later extracted logo, and page changes must replace rather than inherit it.
const vm=require('node:vm'),lifecycle=fs.readFileSync('frontend/processing-lifecycle.js','utf8');
let frame=null,source={sha256:sha,pageNumber:1},calls=0;
const context={state:{sourcePackageGroundEvidence:{stale:true}},processingContext:{token:1},processingSession:{isCurrent:()=>true,getState:()=>({source}),decoded:(_token,value)=>{frame=value;}},frameOfContext:()=>frame,UploadFormat:{dimensions:()=>{}},document:{createElement:()=>createCanvas(1,1)},SourcePackageGround:{detect:(...args)=>{calls++;return P.detect(...args);}}};
vm.createContext(context);vm.runInContext(lifecycle.slice(lifecycle.indexOf('function captureSourcePackageGround('),lifecycle.indexOf('function stageProcessingResult(')),context);
context.recordDecodedFrame(proof);assert.equal(calls,1);assert.equal(context.state.sourcePackageGroundEvidence.sourceIdentity,sha);assert.equal(context.state.sourcePackageGroundEvidence.pageNumber,1);cases++;
context.recordDecodedFrame(rectangle);assert.equal(calls,1,'Extracted output must not replace original-source evidence');cases++;
frame=null;source={sha256:'b'.repeat(64),pageNumber:2};context.recordDecodedFrame(rectangle);assert.equal(context.state.sourcePackageGroundEvidence,null,'New unrelated page/source clears old product evidence');cases++;
frame=null;source={sha256:'b'.repeat(64),pageNumber:3};context.recordDecodedFrame(proof);assert.equal(context.state.sourcePackageGroundEvidence.sourceIdentity,source.sha256);assert.equal(context.state.sourcePackageGroundEvidence.pageNumber,3);cases++;
(async()=>{
 {const root=process.env.SOURCE_GROUND_PRIVATE_ROOT;assert(root,'SOURCE_GROUND_PRIVATE_ROOT is required: materialize the 3 private sources documented in docs/SOURCE_GROUND_SCOPE_20261031.md; do not skip customer regression fixtures');
  for(const [relative,type,sha256] of [['prior/PHOTO-2026-10-23-12-20-01.jpg','proof','f649f06276c8f255383302198bdb97763bfa225d5d492f5c0952659617db6aae'],['originals/PHOTO-2026-03-30-14-51-43.jpg','proof','498baf422fbccfb3b184ce01f0256808a53c645439dfa7ae8eb2765823f60747'],['originals/a9cdf382-1b9f-4984-aed3-6c0dc14eafd2.jpeg','native','d5c86d5303bd7dd53fac817de6705d8772a6032f26a2046a76c105418686297b']]){
   const bytes=fs.readFileSync(path.join(root,relative));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha256,relative+' private fixture bytes changed');
   const im=await loadImage(bytes),max=type==='native'?320:640,s=Math.min(1,max/Math.max(im.width,im.height)),c=canvas(Math.round(im.width*s),Math.round(im.height*s));c.getContext('2d').drawImage(im,0,0,c.width,c.height);const r=inspect(c);
   if(type==='proof'){assert(r.product);assert.equal(r.proposal,null);const result=P.prepareTechnicalProof(im,createCanvas);if(relative.startsWith('prior/')){assert(result?.canvas);assert.equal(result.processing.method,'technical-proof-single-marked-packet-body');assert(result.box[0]>im.width/2&&result.box[3]<im.height/2,'Only the retained marked packet, not dimensions/producer/footer/blank reverse');const original=createCanvas(result.canvas.width,result.canvas.height);original.getContext('2d').drawImage(im,result.box[0],result.box[1],original.width,original.height,0,0,original.width,original.height);assert.deepEqual(Buffer.from(pixels(result.canvas)),Buffer.from(pixels(original)),'Every original selected-body pixel is preserved, including white/gold letters and internal spaces');assert(result.foregroundBounds);cases++;
    const bytes=pixels(result.canvas),copy=Buffer.from(bytes),estimated=PrintInks.estimate(bytes,result.canvas.width,result.canvas.height,{acceptedArtwork:true}),canonical=P.canonicalGroundPalette(bytes,result.canvas.width,result.canvas.height,estimated,result.background);assert.equal(estimated.count,2,'Actual original crop has two independently estimated cores');assert.equal(canonical.count,estimated.count,'Never force a plate count');assert.deepEqual(canonical.sampledColors,estimated.colors);assert.equal(canonical.colors[1],estimated.colors[1],'Genuine foreground ink stays distinct');assert.equal(C.estimate({front:{status:'estimated',...canonical},background:result.background}).count,2,'The same exterior ground role is counted once');assert.deepEqual(Buffer.from(bytes),copy);cases++;
   }else{assert.equal(result?.needsSelection,true,'Two competing marked faces do not become guessed business artwork');cases++;}}else{assert.equal(r.product,null);assert(r.proposal);assert(r.proposal.foregroundBounds);const result=scope(r.d,r.proposal);assert.equal(result.packageColor,r.d.color);assert(result.packageGroundProposed);assert.equal(result.sourceGroundVerified,false);}cases++;
  }
 }
 console.log(`PASS source package ground: ${cases} cases; proposals vs product-layout evidence, local panels, source/page binding, unchanged pixels and ink deduplication; 3 SHA-verified actual private sources included`);
})().catch(e=>{console.error(e);process.exitCode=1;});
