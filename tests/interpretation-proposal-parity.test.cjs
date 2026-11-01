/* eslint-disable @typescript-eslint/no-require-imports -- Real legacy browser handlers in a local canvas VM. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto,createHash}=require('node:crypto');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');
const app=fs.readFileSync(path.join(__dirname,'../frontend/app.js'),'utf8');
const read=name=>fs.readFileSync(path.join(__dirname,'../frontend/'+name+'.js'),'utf8');
function make(w=1,h=1){const c=createCanvas(w,h);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}
class Reader{readAsDataURL(file){file.arrayBuffer().then(b=>{this.result='data:'+file.type+';base64,'+Buffer.from(b).toString('base64');this.onload();},e=>this.onerror(e));}}
function setup(){
 const els={},c={File,FileReader:Reader,ImageData,loadImage,crypto:webcrypto,Uint8Array,Uint8ClampedArray,document:{createElement:()=>make()},loading:0,photoSourceFiles:new WeakSet(),lastUploadedFile:null,selectedPdfLogoFile:null,photoKind:'photo',photoRectified:null,photoTouched:false,logoImg:null,photoImg:null,processedLogo:null,processedKey:null,printInkKey:null,printInkManual:false,activePdf:null,activePdfTask:null,pdfRenderTasks:new Set(),approvedDesignFingerprint:null,state:{bg:'#ffffff',bgPantone:'',bgSource:'scope-white-default'},$ :id=>els[id]||(els[id]={replaceChildren(){},removeAttribute(){}}),status(message){c.lastStatus=message;},remember(){},refresh(){},go(){},showDesignIssue(){},syncPrintInks(){},resetRegionEditor(){},invalidateQuote(){c.processingSession?.invalidateQuotes();},requestAnimationFrame:fn=>fn(),placementIssue:()=>false,designFingerprint:()=>JSON.stringify([c.state.logo,c.state.bg,c.state.text||'']),unexpectedRoutes:[],preparePhotoSource(){c.unexpectedRoutes.push('editor');throw Error('Unexpected editor route outside this focused harness');},applyAutomaticWhiteCarrier(){c.unexpectedRoutes.push('carrier');throw Error('Unexpected carrier application outside this focused harness');},backgroundFeedback(){},PantoneApprox:{extractInks:()=>[]}};
 for(const [name,file]of Object.entries({ProcessingSession:'processing-session',UploadFormat:'upload-format',BackgroundAnalysis:'background',PhotoReference:'photo',FlatArtwork:'flat-artwork',ScreenshotArtwork:'screenshot-artwork',TechnicalFrame:'technical-frame',MarkOrientation:'mark-orientation',LocalInkExtraction:'ink-extraction',ColoredFidelity:'colored-fidelity',PhotoFidelity:'photo-fidelity',WhiteCarrier:'white-carrier',LightSurface:'light-surface',SourceGroundScope:'source-ground-scope',PrintInks:'print-inks',FlexoDesignProposal:'flexo-design-proposal'}))c[name]=require('../frontend/'+file+'.js');
 c.SourceContext={inspectImage:img=>require('../frontend/source-context.js').inspectImage(img,{createCanvas:make})};c.RearPhoto=require('../frontend/rear-photo.js');c.StandardPhoto={prepare:img=>require('../frontend/standard-photo.js').prepare(img,{createCanvas:make})};
 vm.createContext(c);
 function run(a,b){const start=app.indexOf(a),end=app.indexOf(b,start);assert(start>=0&&end>start,a);vm.runInContext(app.slice(start,end),c);}
 for(const [a,b]of [['async function extractStandardPhotoInk(','const prepareSourceWithoutInk='],['async function extractWhiteCarrierProposal(','// Help drafts'],['function analyzeLogo(','function prepareLogo('],['async function prepareFlatArtwork(','// Original brand asset'],['function removeScreenshotGuide(','function blockScreenshotSelection('],['function screenshotWhiteBackground(','async function extractWhiteCarrierProposal('],['async function routeImageCandidate(',"$('unifiedUpload').onchange"]])run(a,b);
 for(const prefix of ['function prepareLogo(', 'function blockScreenshotSelection(', "$('upload').onchange=async", "$('photoUpload').onchange=async",'const prepareSourceWithoutInk=','preparePhotoSource=async function'])vm.runInContext(app.split('\n').find(l=>l.startsWith(prefix)),c);
 c.logoFileHandler=c.$('upload').onchange;c.photoFileHandler=c.$('photoUpload').onchange;
 const realExtract=c.extractPhotoInk;c.extractionErrors=[];c.extractPhotoInk=async(...args)=>{try{return await realExtract(...args);}catch(error){c.extractionErrors.push(error.message);throw error;}};
 vm.runInContext(read('processing-lifecycle'),c);
 const roundtrip=read('white-carrier-ui');vm.runInContext(roundtrip.slice(roundtrip.indexOf('function verifyFlatProposalRoundtrip'),roundtrip.indexOf('let flatProposalDiagnosticURL')),c);
 const ui=read('flexo-design-ui');c.root=c;vm.runInContext(ui.slice(ui.indexOf('const METHOD'),ui.indexOf('const panel=')),c);c.FlexoDesignUI={prepare:c.prepare};
 // Actual public event adapter; browser rendering/scrolling are intentionally inert.
 vm.runInContext(app.split('\n').find(l=>l.startsWith("$('unifiedUpload').onchange=")),c);
 vm.runInContext(app.split('\n').find(l=>l.startsWith("$('asLogo').onclick=")),c);
 return c;
}
const fixture=path.resolve(__dirname,'../../actual_phone_tunatan/09abf115-64bf-4a17-be84-bb5d78bcefa9(1).jpeg');
const SHA='2832f9269d51f1dff36cec5f2522bae2571274fbf66aa20d4c4f0b922ea02299';
const privateOptions={skip:!fs.existsSync(fixture)};
function file(){return new File([fs.readFileSync(fixture)],'unrelated-source.jpeg',{type:'image/jpeg'});}
function result(c){assert.deepEqual(c.unexpectedRoutes,[],'fixture must not exercise omitted editor/carrier application');assert(c.extractionErrors.every(message=>message==='Recognized colored carrier could not be separated'),'only the real extractor’s supported refusal may trigger fallback, never a missing harness dependency: '+c.extractionErrors.join('; '));const s=c.processingSession.getState();assert.equal(s.status,'ready',c.lastStatus);assert.equal(s.source.sha256,SHA);assert.equal(s.result.method,'source-flat-flexo-proposal-v1');assert.equal(s.result.flatPrintProposal.proposedInkCount,3);assert.equal(s.result.flatPrintProposal.sourceSHA256,SHA);assert(s.result.flatPrintProposal.renderedPixelsVerified);const rendered=make(c.logoImg.width,c.logoImg.height),cx=rendered.getContext('2d');cx.drawImage(c.logoImg,0,0);assert.equal(createHash('sha256').update(cx.getImageData(0,0,rendered.width,rendered.height).data).digest('hex'),s.result.flatPrintProposal.outputPixelSHA256,'metadata binds actual decoded output pixels');assert(c.state.extractionApprovalRequired);assert(c.state.flexoOriginalLogo);assert(!c.state.designBlocked);assert(!c.processingSession.isApproved(c.designFingerprint()));return s;}
test('exact private source uses real upload, photo and logo handlers with equivalent rendered proposal',privateOptions,async()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'),SHA);
 const outputs=[];
 for(const mode of ['auto','photo','logo']){const c=setup();if(mode==='auto')await c.$('unifiedUpload').onchange({target:{files:[file()],value:'chosen'}});else await c.routeUploadedFile(file(),mode);const s=result(c);outputs.push(s.result.flatPrintProposal.outputPixelSHA256);}
 assert.equal(new Set(outputs).size,1,'hints cannot change this source’s verified proposal pixels');
});
test('photo then logo retry is a fresh operation, preserves source hash and revokes old approval',privateOptions,async()=>{
 const c=setup();await c.routeUploadedFile(file(),'photo');const first=result(c);assert(c.approveCurrentDesign());assert(c.processingSession.isApproved(c.designFingerprint()));await c.$('asLogo').onclick();const next=result(c);assert(next.operationId>first.operationId);assert(next.designRevision>first.designRevision);assert.equal(next.result.flatPrintProposal.outputPixelSHA256,first.result.flatPrintProposal.outputPixelSHA256);
 c.state.text='new revision';c.syncProcessingDesign();assert(!c.processingSession.isApproved(c.designFingerprint()));
 c.cancelCurrentProcessing('cancel');assert.equal(c.processingSession.getState().status,'cancelled');assert(!c.approveCurrentDesign());
});
test('cancel and new source during async proposal cannot commit old pixels or metadata',privateOptions,async()=>{
 for(const action of ['cancel','fresh']){const c=setup(),original=c.FlexoDesignProposal;let started,resolve;const ready=new Promise(r=>started=r);c.FlexoDesignProposal={async propose(...args){const p=await original.propose(...args);started();await new Promise(r=>resolve=r);return p;}};
 const pending=c.routeUploadedFile(file(),'photo');await ready;
 if(action==='cancel')c.cancelCurrentProcessing('cancel');else {const blank=make(40,40);blank.getContext('2d').fillRect(0,0,40,40);await c.routeUploadedFile(new File([blank.toBuffer('image/png')],'new.png',{type:'image/png'}),'logo');}
 const before=c.processingSession.getState();resolve();await pending;const after=c.processingSession.getState();assert.equal(after.operationId,before.operationId);assert.equal(after.source.sha256,before.source.sha256);assert.notEqual(after.result?.flatPrintProposal?.sourceSHA256,SHA);if(action==='cancel')assert.equal(after.status,'cancelled');
 }
});
