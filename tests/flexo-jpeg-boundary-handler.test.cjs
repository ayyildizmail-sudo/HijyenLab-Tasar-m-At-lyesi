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

// Controlled JPEG re-encodes of the owner's re-upload; not the unavailable iOS bytes.
const directory=path.resolve(__dirname,'../../minor_hue_probe');
for(const name of ['q100s0.jpg','q80s0.jpg','q80s2.jpg','q90s2.jpg'])test('controlled JPEG family uses whole auto handler: '+name,{skip:!fs.existsSync(path.join(directory,name))},async()=>{
 const bytes=fs.readFileSync(path.join(directory,name)),sha=createHash('sha256').update(bytes).digest('hex'),c=setup();
 await c.$('unifiedUpload').onchange({target:{files:[new File([bytes],'arbitrary-name.jpeg',{type:'image/jpeg'})],value:'chosen'}});
 assert.deepEqual(c.unexpectedRoutes,[]);assert(c.extractionErrors.every(message=>message==='Recognized colored carrier could not be separated'));
 const s=c.processingSession.getState();assert.equal(s.status,'ready',JSON.stringify({lastStatus:c.lastStatus,state:s,diag:vm.runInContext('localDiagnostic',c)}));assert.equal(s.source.sha256,sha);assert.equal(s.result.method,'source-flat-flexo-proposal-v1');
 const p=s.result.flatPrintProposal;assert.equal(p.proposedInkCount,3);assert.equal(p.sourceSHA256,sha);assert(p.renderedPixelsVerified);assert(c.state.extractionApprovalRequired);assert(c.state.flexoOriginalLogo);assert(!c.state.designBlocked);assert(!c.processingSession.isApproved(c.designFingerprint()));
 const rendered=make(c.logoImg.width,c.logoImg.height),cx=rendered.getContext('2d');cx.drawImage(c.logoImg,0,0);const data=cx.getImageData(0,0,rendered.width,rendered.height).data;
 assert.equal(createHash('sha256').update(data).digest('hex'),p.outputPixelSHA256);const palette=new Set();for(let i=0;i<data.length;i+=4)if(data[i+3]&&!(data[i]===255&&data[i+1]===255&&data[i+2]===255))palette.add([data[i],data[i+1],data[i+2]].join(','));assert.equal(palette.size,3);
 assert(c.approveCurrentDesign());assert(c.processingSession.isApproved(c.designFingerprint()));c.state.text='changed';c.syncProcessingDesign();assert(!c.processingSession.isApproved(c.designFingerprint()));
});

test('q85 4:2:0 uses source evidence instead of continuous-gradient-only admission',{skip:!fs.existsSync(path.join(directory,'q85s2.jpg'))},async()=>{
 const bytes=fs.readFileSync(path.join(directory,'q85s2.jpg')),c=setup();await c.$('unifiedUpload').onchange({target:{files:[new File([bytes],'unrelated.jpeg',{type:'image/jpeg'})],value:'chosen'}});
 assert.equal(c.processingSession.getState().status,'ready');assert.equal(vm.runInContext('localDiagnostic.reason',c),'proposal-ready');assert.equal(c.processingSession.getState().result.flatPrintProposal.proposedInkCount,3);assert(!c.processingSession.isApproved(c.designFingerprint()));
});
