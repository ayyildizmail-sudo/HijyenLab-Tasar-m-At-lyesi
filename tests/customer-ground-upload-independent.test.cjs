/* eslint-disable @typescript-eslint/no-require-imports -- Real legacy browser handlers in a local canvas VM. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto,createHash}=require('node:crypto');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');
const app=fs.readFileSync(path.join(__dirname,'../frontend/app.js'),'utf8');
const read=name=>fs.readFileSync(path.join(__dirname,'../frontend/'+name+'.js'),'utf8');
function make(w=1,h=1){const c=createCanvas(w,h);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}
class Reader{readAsDataURL(file){file.arrayBuffer().then(b=>{this.result='data:'+file.type+';base64,'+Buffer.from(b).toString('base64');this.onload();},e=>this.onerror(e));}}
function setup(){
 const els={},c={File,FileReader:Reader,ImageData,loadImage,crypto:webcrypto,Uint8Array,Uint8ClampedArray,document:{createElement:()=>make()},loading:0,photoSourceFiles:new WeakSet(),lastUploadedFile:null,selectedPdfLogoFile:null,photoKind:'photo',photoRectified:null,photoTouched:false,logoImg:null,photoImg:null,processedLogo:null,processedKey:null,printInkKey:null,printInkManual:false,activePdf:null,activePdfTask:null,pdfRenderTasks:new Set(),approvedDesignFingerprint:null,state:{bg:'#ffffff',bgPantone:'',bgSource:'scope-white-default'},$ :id=>els[id]||(els[id]={replaceChildren(){},removeAttribute(){}}),status(message){c.lastStatus=message;},remember(){},refresh(){c.reconcileSourceGroundScope?.();},go(){},showDesignIssue(){},syncPrintInks(){},resetRegionEditor(){},invalidateQuote(){c.processingSession?.invalidateQuotes();},requestAnimationFrame:fn=>fn(),placementIssue:()=>false,designFingerprint:()=>JSON.stringify([c.state.logo,c.state.bg,c.state.text||'']),unexpectedRoutes:[],preparePhotoSource(){c.unexpectedRoutes.push('editor');throw Error('Unexpected editor route outside this focused harness');},applyAutomaticWhiteCarrier(){c.unexpectedRoutes.push('carrier');throw Error('Unexpected carrier application outside this focused harness');},backgroundFeedback(){},PantoneApprox:{extractInks:()=>[]}};
 for(const [name,file]of Object.entries({SourcePackageGround:'source-package-ground',ProcessingSession:'processing-session',UploadFormat:'upload-format',BackgroundAnalysis:'background',PhotoReference:'photo',FlatArtwork:'flat-artwork',ScreenshotArtwork:'screenshot-artwork',TechnicalFrame:'technical-frame',MarkOrientation:'mark-orientation',LocalInkExtraction:'ink-extraction',ColoredFidelity:'colored-fidelity',PhotoFidelity:'photo-fidelity',WhiteCarrier:'white-carrier',LightSurface:'light-surface',SourceGroundScope:'source-ground-scope',PrintInks:'print-inks',FlexoDesignProposal:'flexo-design-proposal'}))c[name]=require('../frontend/'+file+'.js');
 c.SourceContext={inspectImage:img=>require('../frontend/source-context.js').inspectImage(img,{createCanvas:make})};c.RearPhoto=require('../frontend/rear-photo.js');c.StandardPhoto={prepare:img=>require('../frontend/standard-photo.js').prepare(img,{createCanvas:make})};
 vm.createContext(c);
 function run(a,b){const start=app.indexOf(a),end=app.indexOf(b,start);assert(start>=0&&end>start,a);vm.runInContext(app.slice(start,end),c);}
 for(const [a,b]of [['function applySourceGroundScope(','function prepareLogo('],['async function extractStandardPhotoInk(','const prepareSourceWithoutInk='],['async function extractWhiteCarrierProposal(','// Help drafts'],['function analyzeLogo(','function prepareLogo('],['async function prepareFlatArtwork(','// Original brand asset'],['function removeScreenshotGuide(','function blockScreenshotSelection('],['function screenshotWhiteBackground(','async function extractWhiteCarrierProposal('],['async function routeImageCandidate(',"$('unifiedUpload').onchange"]])run(a,b);
 for(const prefix of ['function prepareLogo(', 'function blockScreenshotSelection(', "$('upload').onchange=async", "$('photoUpload').onchange=async",'const prepareSourceWithoutInk=','preparePhotoSource=async function'])vm.runInContext(app.split('\n').find(l=>l.startsWith(prefix)),c);
 c.logoFileHandler=c.$('upload').onchange;c.photoFileHandler=c.$('photoUpload').onchange;
 const realExtract=c.extractPhotoInk;c.extractionErrors=[];c.extractPhotoInk=async(...args)=>{try{return await realExtract(...args);}catch(error){c.extractionErrors.push(error.message);throw error;}};
 vm.runInContext(read('processing-lifecycle'),c);
 const roundtrip=read('white-carrier-ui');vm.runInContext(roundtrip.slice(roundtrip.indexOf('function verifyFlatProposalRoundtrip'),roundtrip.indexOf('let flatProposalDiagnosticURL')),c);
 c.AdaptedPhotoProposal=require('../frontend/adapted-photo-proposal.js');c.currentPrintArea=()=>require('../frontend/product-geometry.js').area(c.selectedProductId||'BM12');c.currentVisualArtworkReady=preview=>!c.state.designProcessing&&!c.state.designBlocked&&c.processingSession.getState().status==='ready'&&(preview||!c.state.extractionApprovalRequired);vm.runInContext(read('adapted-photo-ui'),c);
 const ui=read('flexo-design-ui');c.root=c;vm.runInContext(ui.slice(ui.indexOf('const METHOD'),ui.indexOf('const panel=')),c);c.FlexoDesignUI={prepare:c.prepare,sync(){}};
 // Actual public event adapter; browser rendering/scrolling are intentionally inert.
 vm.runInContext(app.split('\n').find(l=>l.startsWith("$('unifiedUpload').onchange=")),c);
 vm.runInContext(app.split('\n').find(l=>l.startsWith("$('asLogo').onclick=")),c);
 return c;
}

function flatFile(kind='full') {
 const canvas=make(400,240),x=canvas.getContext('2d');
 x.fillStyle=kind==='full'?'#702533':'#ffffff';x.fillRect(0,0,400,240);
 if(kind==='panel'){x.fillStyle='#702533';x.fillRect(55,40,290,160);}
 if(kind==='circle'){x.fillStyle='#702533';x.beginPath();x.arc(200,120,90,0,Math.PI*2);x.fill();}
 x.fillStyle=kind==='white'?'#152849':'#ffffff';x.font='bold 30px sans-serif';x.fillText('SOURCE BRAND',70,130);
 return new File([canvas.toBuffer('image/png')],'independent-artwork.png',{type:'image/png'});
}
async function upload(c,file){await c.$('unifiedUpload').onchange({target:{files:[file],value:'chosen'}});}
function pixelHash(image){const p=make(image.width,image.height);p.getContext('2d').fillStyle='#ffffff';p.getContext('2d').fillRect(0,0,p.width,p.height);p.getContext('2d').drawImage(image,0,0);return createHash('sha256').update(p.getContext('2d').getImageData(0,0,p.width,p.height).data).digest('hex');}
function nonwhiteHistogram(image){const p=make(image.width,image.height),x=p.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,p.width,p.height);x.drawImage(image,0,0);const d=x.getImageData(0,0,p.width,p.height).data,h={};for(let i=0;i<d.length;i+=4){const k=Array.from(d.slice(i,i+3)).join(',');if(k!=='255,255,255')h[k]=(h[k]||0)+1;}return h;}
test('normal upload gives fullbleed proposal, preserves exact pixels, approval and replacement identity',async()=>{
 const c=setup(),f=flatFile();await upload(c,f);
 assert.equal(c.processingSession.getState().status,'ready',c.lastStatus);
 assert.equal(c.state.bg,'#702533');assert.equal(c.state.groundScope.packageGroundProposed,true);
 assert.equal(c.state.groundScope.sourceGroundVerified,false);
 const original=await loadImage(Buffer.from(await f.arrayBuffer()));
 assert.equal(pixelHash(c.prepareLogo()),pixelHash(original),'source letter and ground pixels stay unchanged');
 assert.equal(c.processingSession.isApproved(c.designFingerprint()),false);
 assert(c.approveCurrentDesign());assert(c.processingSession.isApproved(c.designFingerprint()));
 c.isUnprinted=()=>false;c.isDeclaredQuote=()=>false;
 vm.runInContext(app.split('\n').find(l=>l.startsWith('function effectiveBackground()')),c);
 assert.equal(c.effectiveBackground(),'#702533','commercial resolver sees proposed colored package');
 const rendered=make(c.logoImg.width,c.logoImg.height);rendered.getContext('2d').drawImage(c.prepareLogo(),0,0);
 const estimate=c.PrintInks.estimate(rendered.getContext('2d').getImageData(0,0,rendered.width,rendered.height).data,rendered.width,rendered.height,{background:c.state.bg,acceptedArtwork:true});
 const combined=require('../frontend/combined-inks').estimate({front:{status:'estimated',colors:estimate.colors},background:c.state.bg});
 assert.equal(combined.count,1,'white reverse lettering adds zero inks; burgundy ground counted once');
 const beforeCancel=JSON.stringify(c.processingSession.getState());
 await c.$('unifiedUpload').onchange({target:{files:[],value:''}});
 assert.equal(JSON.stringify(c.processingSession.getState()),beforeCancel,'cancelled file picker retains accepted current source');
 const identity=c.processingSession.getState().source.sha256;
 await upload(c,flatFile('white'));
 assert.notEqual(c.processingSession.getState().source.sha256,identity);
 assert.equal(c.state.bg,'#ffffff');assert.equal(c.state.groundScope.packageGroundProposed,false);
 assert(!c.state.sourcePackageGroundEvidence);assert(!c.processingSession.isApproved(c.designFingerprint()));
});
test('normal upload keeps bounded local rectangles/circles on white package',async()=>{
 for(const kind of ['panel','circle']){const c=setup(),f=flatFile(kind);await upload(c,f);assert.equal(c.processingSession.getState().status,'ready',kind+': '+c.lastStatus);assert.equal(c.state.bg,'#ffffff',kind);assert.equal(c.state.groundScope.packageGroundProposed,false,kind);console.log(kind, c.processingSession.getState().result.method);assert.equal(c.state.groundScope.allowColorRemoval,false);const colors=nonwhiteHistogram(c.prepareLogo());assert(colors['112,37,51']>10000,kind+' local burgundy panel retained');}
});
test('explicit manual ground stays authoritative through ordinary fullbleed upload',async()=>{
 const c=setup();c.state.bg='#123456';c.state.bgSource='manual';await upload(c,flatFile());assert.equal(c.state.bg,'#123456');assert.equal(c.state.bgSource,'manual');
});
function assertCanonicalQuote(c,expectedCount){
 const image=c.prepareLogo(),scale=Math.min(1,1200/Math.max(image.width,image.height)),width=Math.round(image.width*scale),height=Math.round(image.height*scale),raster=make(width,height),ctx=raster.getContext('2d');ctx.drawImage(image,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height).data;
 const raw=c.PrintInks.estimate(pixels,width,height,{acceptedArtwork:true});
 vm.runInContext(read('print-inks-ui').split('\n').find(line=>line.startsWith('function canonicalSourceGroundPalette(')),c);
 const canonical=c.canonicalSourceGroundPalette(raw,pixels,width,height),C=require('../frontend/combined-inks');
 const combined=C.estimate({front:{status:'estimated',colors:canonical.colors,inkIdentity:canonical.inkIdentity},background:c.state.bg});
 assert.equal(combined.count,expectedCount,'Source-demonstrated ground role counted once with original foreground');assert(canonical.colors.includes(c.state.bg),'Displayed package ground matches canonical palette');
 vm.runInContext(app.split('\n').find(line=>line.startsWith('function pricing(')),c);const rules=require('../frontend/product-catalog').get('BM12').priceRules,price=c.pricing(10000,c.state.bg,'Muğla','Bodrum','new',combined.count,rules);
 assert.equal(price.minimum,10000);assert.equal(price.plate,expectedCount*100000,'1000 TL per canonical role, no extra plate');
 const saved={...c.state};c.state.bg='#83322f';c.state.groundScope={...c.state.groundScope,customerChosen:true};assert.equal(c.canonicalSourceGroundPalette(raw,pixels,width,height),raw,'Manual nearby extra ground is not silently aliased');const manual=C.estimate({front:{status:'estimated',colors:raw.colors},background:c.state.bg});assert.equal(manual.count,expectedCount+1,'Explicit additional near ground remains a real extra ink');Object.assign(c.state,saved);
}
test('actual NOA technical proof ordinary upload isolates one original business body',async()=>{
 const root=process.env.SOURCE_GROUND_PRIVATE_ROOT||path.resolve(__dirname,'../../noa_phone_inspect'),file=path.join(root,'prior/PHOTO-2026-10-23-12-20-01.jpg');
 assert(fs.existsSync(file),'Required original NOA private proof missing: set SOURCE_GROUND_PRIVATE_ROOT');
 const c=setup(),bytes=fs.readFileSync(file);await upload(c,new File([bytes],'unrelated-technical-proof.jpg',{type:'image/jpeg'}));
 const live=c.processingSession.getState();assert.equal(live.status,'ready',c.lastStatus);
 assert.equal(live.result.method,'technical-proof-single-marked-packet-body');
 assert.notEqual(c.state.bg,'#ffffff');assert(c.state.extractionApprovalRequired);assert(!c.processingSession.isApproved(c.designFingerprint()));
 assert(c.logoImg.width>c.logoImg.height,'isolated horizontal packet body, not whole square proof');
 assert.equal(live.source.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert(c.approveCurrentDesign());assert(c.processingSession.isApproved(c.designFingerprint()));
 assertCanonicalQuote(c,2);
 await upload(c,flatFile('white'));assert.equal(c.state.bg,'#ffffff');assert(!c.state.sourcePackageGroundEvidence);assert(!c.processingSession.isApproved(c.designFingerprint()));
});


test('actual fullbleed native artwork shares canonical package ground and plate price',async()=>{
 const root=process.env.SOURCE_GROUND_PRIVATE_ROOT||path.resolve(__dirname,'../../noa_phone_inspect'),bytes=fs.readFileSync(path.join(root,'originals/a9cdf382-1b9f-4984-aed3-6c0dc14eafd2.jpeg'));
 const c=setup();await upload(c,new File([bytes],'unrelated-native-artwork.jpg',{type:'image/jpeg'}));assert.equal(c.processingSession.getState().status,'ready');assert(c.approveCurrentDesign());assertCanonicalQuote(c,1);
});
