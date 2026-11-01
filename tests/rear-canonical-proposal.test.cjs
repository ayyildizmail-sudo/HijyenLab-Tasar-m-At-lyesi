/* eslint-disable @typescript-eslint/no-require-imports -- Node/native canvas regression harness, not browser QA. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto,createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const source=fs.readFileSync('frontend/rear-preview.js','utf8'),sha='b'.repeat(64),canonical=['#102f59','#a32b37','#c28f38'];
function fixture(){
 const canvas=createCanvas(150,100),g=canvas.getContext('2d');
 g.fillStyle='#0c294d';g.fillRect(8,8,60,36);g.fillStyle='#ae2536';g.fillRect(68,8,54,36);
 g.fillStyle='#bf8832';g.fillRect(18,52,90,7);
 // Deliberately disconnected small print, dots, enclosed white and alpha edge.
 g.fillStyle='#0c294d';for(const [x,y,w,h]of [[12,76,3,10],[22,76,4,10],[30,82,2,2],[110,70,4,13],[124,70,3,13]])g.fillRect(x,y,w,h);
 g.fillStyle='#fff';g.fillRect(22,20,8,10);g.fillStyle='rgba(12,41,77,.5)';g.fillRect(8,7,60,1);
 return {canvas,data:g.getImageData(0,0,150,100).data,width:150,height:100,method:'native-alpha-trim',inkSamples:[]};
}
function harness(){
 const nodes={},make=()=>({hidden:false,disabled:false,value:'',textContent:'',naturalWidth:1200,naturalHeight:600,classList:{add(){},remove(){}},removeAttribute(k){delete this[k];},after(){},append(){},replaceChildren(){},addEventListener(){}}),$=id=>nodes[id]||(nodes[id]=make());
 const h={$,nodes,Uint8ClampedArray,crypto:webcrypto,state:{logo:'front',bg:'#ffffff',text:'',textColor:'#102f59',processingResult:{flatPrintProposal:{outputPixelSHA256:'c'.repeat(64)}}},palette:canonical.slice(),front:'front-1',latest:null,step:4,
 document:{activeElement:null,createElement(tag){if(tag==='canvas')return createCanvas(1,1);const n=make();Object.defineProperty(n,'id',{set:id=>nodes[id]=n});return n;}},
 loadImage,CombinedInks:require('../frontend/combined-inks.js'),FlexoDesignProposal:require('../frontend/flexo-design-proposal.js'),RearLogo:{...require('../frontend/rear-logo.js'),prepare:(image,options)=>require('../frontend/rear-logo.js').prepare(image,{...options,createCanvas})},
 approvedFlatPhotoPalette(){return h.palette?{inkIdentity:'verified-rendered-flat-palette',colors:h.palette,count:h.palette.length}:null;},
 designFingerprint:()=>h.front,clearTimeout(){},setTimeout(){return 1;},invalidateQuote(){},status(){},go(){},
 UploadFormat:{MAX_BYTES:8*1024*1024,inspect:()=>({mime:'image/png'})},FileReader:function(){this.readAsDataURL=file=>{this.result=file.url;this.onload();};},sourceIdentity:async()=>({sha256:sha}),
 processingSession:{isApproved:()=>true,getState:()=>({})},appliedFrontApproved:()=>true,designIssue:()=>false,showDesignIssue(){},imageData:()=>'',Image:make,requestAnimationFrame:fn=>fn(),window:{matchMedia:()=>({matches:false})}
 };
 vm.createContext(h);vm.runInContext(source,h);h.read=code=>vm.runInContext(code,h);return h;
}
function colors(data){const s=new Set();for(let i=0;i<data.length;i+=4)if(data[i+3]===255&&!data.subarray(i,i+3).every(v=>v===255))s.add('#'+Array.from(data.subarray(i,i+3),v=>v.toString(16).padStart(2,'0')).join(''));return [...s].sort();}
function file(prepared,name='sponsor.png'){const bytes=prepared.canvas.toBuffer('image/png');return {name,size:bytes.length,url:prepared.canvas.toDataURL('image/png'),arrayBuffer:async()=>bytes};}
test('real PNG roundtrip maps all separated small roles to actual canonical inks; alpha/geometry/source retained',async()=>{
 const h=harness(),prepared=fixture(),before=prepared.data.slice(),originalPNG=prepared.canvas.toDataURL('image/png'),result=await h.prepareRearCanonicalProposal(prepared,sha,()=>true);
 assert(result.flatPrintProposal,result.paletteProposalNote);assert.notEqual(result.canvas,prepared.canvas);assert.equal(result.canonicalSourceCanvas,prepared.canvas);assert.deepEqual(prepared.data,before);assert.equal(prepared.canvas.toDataURL('image/png'),originalPNG);
 assert.deepEqual(colors(result.data),canonical.slice().sort());assert.deepEqual(result.data,result.canvas.getContext('2d').getImageData(0,0,150,100).data);
 for(let i=0;i<before.length;i+=4){assert.equal(result.data[i+3],before[i+3]);if(before[i+3]&&!before.subarray(i,i+3).every(v=>v===255))assert(!result.data.subarray(i,i+3).every(v=>v===255),'foreground may not disappear into white');if(before[i+3]===255&&before.subarray(i,i+3).every(v=>v===255))assert(result.data.subarray(i,i+3).every(v=>v===255),'enclosed white hole remains');}
 for(const [x,y]of [[12,76],[22,76],[30,82],[110,70],[124,70]])assert.equal(result.data[(y*150+x)*4+3],255,'small disconnected source geometry');
 assert.equal(result.flatPrintProposal.sourceSHA256,sha);assert.equal(result.flatPrintProposal.outputPixelSHA256,createHash('sha256').update(result.data).digest('hex'));assert.equal(result.flatPrintProposal.sourcePixelSHA256,createHash('sha256').update(before).digest('hex'));
 assert.equal(result.flatPrintProposal.renderedPixelsVerified,true);assert.equal(result.flatPrintProposal.physicalInkCountConfirmed,false);
});
test('insufficient roles or low-contrast palette visibly declines without changing sponsor pixels',async()=>{
 for(const palette of [['#102f59'],['#fefefe','#fdfdfd','#fcfcfc']]){
  const h=harness();h.palette=palette;const prepared=fixture(),before=prepared.data.slice(),result=await h.prepareRearCanonicalProposal(prepared,sha,()=>true);
  assert.equal(result.flatPrintProposal,undefined);assert.equal(result.paletteProposalFailure,'canonical-contrast-or-roles');assert.match(result.paletteProposalNote,/küçük yazıları|karşıtlığı/);assert.equal(result.canvas,prepared.canvas);assert.deepEqual(result.data,before);
 }
});
test('true fourth ground/text is never squeezed into three by sponsor adaptation',async()=>{
 const h=harness();h.state.bg='#553911';let result=await h.prepareRearCanonicalProposal(fixture(),sha,()=>true);assert.equal(result.flatPrintProposal,undefined);assert.equal(result.paletteProposalFailure,'existing-palette-over-limit-or-unverified');
 h.state.bg='#ffffff';h.state.text='Front text';h.state.textColor='#000000';result=await h.prepareRearCanonicalProposal(fixture(),sha,()=>true);assert.equal(result.flatPrintProposal,undefined);assert.equal(result.paletteProposalFailure,'existing-palette-over-limit-or-unverified');
});
test('unverified front does not trigger proposal; no source identity bypass',async()=>{
 const h=harness(),prepared=fixture();h.palette=null;assert.equal(await h.prepareRearCanonicalProposal(prepared,sha,()=>true),prepared);h.palette=canonical;const result=await h.prepareRearCanonicalProposal(prepared,'wrong',()=>true);assert.equal(result.flatPrintProposal,undefined);assert.equal(result.paletteProposalFailure,'unverified-source-identity');
});
test('new upload remains uncommitted until reviewed; old approved sponsor never changes on later palette changes',async()=>{
 const h=harness(),prepared=fixture();await h.processRearSponsor(file(prepared));assert.equal(h.read('rearContent.sponsorHash'),'');assert(h.read('rearSponsorReview.prepared.flatPrintProposal'));assert.equal(h.$('rearSponsorReview').hidden,false);assert.equal(h.$('rearSponsorPaletteNote').hidden,false);assert.equal(h.$('rearSponsorSourceImage').src,prepared.canvas.toDataURL('image/png'));
 h.$('acceptRearSponsor').onclick();assert.equal(h.read('rearContent.sponsorHash'),sha);const accepted=h.read('rearSponsorImage'),bytes=accepted.toDataURL('image/png');assert.equal(h.read('rearSponsorPrepared.canonicalSourceCanvas')===accepted,false);
 h.palette=['#000000'];h.front='front-2';h.syncRearFields();assert.equal(h.read('rearSponsorImage'),accepted);assert.equal(accepted.toDataURL('image/png'),bytes,'approved sponsor cannot be silently remapped by front changes');
});
test('front revision changes during or before acceptance never approve a stale canonical suggestion',async()=>{
 const h=harness();await h.processRearSponsor(file(fixture()));h.front='front-2';h.$('acceptRearSponsor').onclick();assert.equal(h.read('rearContent.sponsorHash'),'');assert.equal(h.read('rearSponsorImage'),null);assert.match(h.read('rearSponsorFailure'),/Ön yüzün renkleri değişti/);
 const prepared=fixture();h.front='front-3';const normalLoad=h.loadImage;h.loadImage=async url=>{const decoded=await normalLoad(url);h.front='front-4';return decoded;};const result=await h.prepareRearCanonicalProposal(prepared,sha,()=>true);assert.equal(result.flatPrintProposal,undefined);assert.equal(result.paletteProposalFailure,'front-palette-changed');
});
test('replacement during canonical PNG decode cannot resurrect source, review or image',async()=>{
 const h=harness(),normalLoad=h.loadImage;let decodeResolve,enteredResolve,calls=0;const entered=new Promise(resolve=>{enteredResolve=resolve;});h.loadImage=async url=>{calls++;if(calls===2)return new Promise(resolve=>{decodeResolve=async()=>resolve(await normalLoad(url));enteredResolve();});return normalLoad(url);};
 const pending=h.processRearSponsor(file(fixture()));await Promise.race([entered,pending.then(()=>{throw Error('Upload completed without reaching canonical decode');})]);assert(decodeResolve);h.$('removeRearSponsor').onclick();await decodeResolve();await pending;
 assert.equal(h.read('rearSponsorImage'),null);assert.equal(h.read('rearSponsorReview'),null);assert.equal(h.read('rearSponsorSource'),null);assert.equal(h.read('rearContent.sponsorHash'),'');
});
test('canonical proposal and accepted palette count agree exactly, including a later distinct fourth ground',async()=>{
 const h=harness(),result=await h.prepareRearCanonicalProposal(fixture(),sha,()=>true);h.result=result;h.read('rearSponsorPrepared=result; rearContent.sponsorHash="'+sha+'"');
 // Exercise the actual shared pixel-verified palette function without bootstrap UI.
 h.PrintInks=require('../frontend/print-inks.js');const ink=fs.readFileSync('frontend/print-inks-ui.js','utf8'),begin=ink.indexOf('const rearAnalyzedInkCache='),end=ink.indexOf('\nfunction rearInkBaseInput',begin);vm.runInContext(ink.slice(begin,end),h);
 const accepted=h.acceptedRearInkPalette(result);assert.equal(accepted.uncertain,false);assert.deepEqual(Array.from(accepted.colors).sort(),canonical.slice().sort());
 const input={front:{status:'estimated',inkIdentity:'verified-rendered-flat-palette',colors:canonical},background:'#ffffff',rear:{sponsor:{status:'estimated',palette:accepted}}};assert.equal(h.CombinedInks.estimate(input).count,3);input.background='#10305a';assert.equal(h.CombinedInks.estimate(input).count,4,'nearby new ground remains an actual fourth ink');
});
