'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas'),B=require('../frontend/background.js');
const app=fs.readFileSync('frontend/app.js','utf8');
function make(w=1,h=1){const c=createCanvas(w,h);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}
class Reader{readAsDataURL(file){file.arrayBuffer().then(b=>{this.result='data:image/jpeg;base64,'+Buffer.from(b).toString('base64');this.onload();},e=>this.onerror(e));}}
let route=null,proposal=null;
const context={document:{createElement:()=>make()},File,FileReader:Reader,ImageData,loadImage,loading:0,photoSourceFiles:new WeakSet(),lastUploadedFile:null,selectedPdfLogoFile:null,sameProcessingSource:()=>false,$:()=>({}),state:{},status(){},recordDecodedFrame(){},stageProcessingResult(){},refresh(){},go(){},blockScreenshotSelection:()=>{route='selection';},logoFileHandler:async()=>{context.loading++;route='logo';},photoFileHandler:async e=>{route='photo';const image=await loadImage(Buffer.from(await e.target.files[0].arrayBuffer()));proposal=await context.extractPhotoInk(image);},PantoneApprox:{extractInks:()=>[]}};
for(const [name,file]of Object.entries({BackgroundAnalysis:'background',PhotoReference:'photo',FlatArtwork:'flat-artwork',ScreenshotArtwork:'screenshot-artwork',TechnicalFrame:'technical-frame',MarkOrientation:'mark-orientation',LocalInkExtraction:'ink-extraction',ColoredFidelity:'colored-fidelity',PhotoFidelity:'photo-fidelity',WhiteCarrier:'white-carrier',LightSurface:'light-surface'}))context[name]=require('../frontend/'+file+'.js');
context.SourceContext={inspectImage:img=>require('../frontend/source-context.js').inspectImage(img,{createCanvas:make})};
context.StandardPhoto={prepare:img=>require('../frontend/standard-photo.js').prepare(img,{createCanvas:make})};context.requestAnimationFrame=fn=>fn();
vm.createContext(context);
for(const [a,b]of [['async function extractStandardPhotoInk(','const prepareSourceWithoutInk='],['async function extractWhiteCarrierProposal(','// Help drafts'],['function analyzeLogo(','function prepareLogo('],['async function prepareFlatArtwork(','// Original brand asset'],['async function prepareScreenshotArtwork(','function blockScreenshotSelection('],['function screenshotWhiteBackground(','async function extractWhiteCarrierProposal('],['async function routeImageCandidate(',"$('unifiedUpload').onchange"]])vm.runInContext(app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a))),context);

const {test}=require('node:test'),crypto=require('node:crypto');
test('private raw photo through current extraction, prepareLogo, and front/rear quote palette',{skip:process.env.HIJYENLAB_PRIVATE_RAW_INK_FIXTURE?false:'NOT_RUN: private raw photograph not supplied via HIJYENLAB_PRIVATE_RAW_INK_FIXTURE'},async()=>{
 const bytes=fs.readFileSync(process.env.HIJYENLAB_PRIVATE_RAW_INK_FIXTURE),image=await loadImage(bytes),extracted=await context.extractPhotoInk(image);
 assert(extracted?.file&&extracted.whiteCarrier&&!extracted.needsRegionSelection,'current raw photo must produce reviewable whole-brand artwork');
 context.logoImg=await loadImage(Buffer.from(await extracted.file.arrayBuffer()));context.processedLogo=null;context.processedKey=null;
 context.state={logo:'private-current-extract',removed:false,removeWhite:false,bg:'#ffffff',bgDetection:{kind:'transparent',color:'#ffffff',rgb:[255,255,255]},whiteCarrierWhiteOnly:true,extractionApproximate:true,photoLayout:null,text:'',textPending:false};
 vm.runInContext(app.slice(app.indexOf('function prepareLogo('),app.indexOf('function backgroundFeedback(')),context);
 const prepared=context.prepareLogo(),pixels=prepared.getContext('2d').getImageData(0,0,prepared.width,prepared.height).data;
 const PrintInks=require('../frontend/print-inks.js'),CombinedInks=require('../frontend/combined-inks.js'),baseline=PrintInks.estimate(pixels,prepared.width,prepared.height,{background:'#ffffff'}),current=PrintInks.estimate(pixels,prepared.width,prepared.height,{background:'#ffffff',acceptedArtwork:true});
 assert.equal(current.count,3);assert.equal(current.uncertain,false);
 const nodes={},$=id=>nodes[id]||(nodes[id]={value:'',textContent:''});Object.assign(context,{$,PrintInks,CombinedInks,invalidateQuote(){},calculateRaw(){},calculate(){},rearHasContent:()=>true,rearQuoteSnapshot:()=>({revision:context.revision}),revision:0,rearContent:{instagram:'sample',website:'',phone:'',address:'',extra:'',inkColor:'',qrEnabled:false}});
 vm.runInContext(fs.readFileSync('frontend/print-inks-ui.js','utf8'),context);assert.equal(nodes.inks.value,'3','full current prepared artwork must survive UI pale/shadow guards');
 context.rearContent.inkColor='#000000';context.revision++;context.syncPrintInks();assert.equal(nodes.inks.value,'4','explicit rear black remains a fourth ink, for policy to block rather than clamp');
 const evidence={source:'Private raw photograph via HIJYENLAB_PRIVATE_RAW_INK_FIXTURE; no asset bytes bundled',sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceDimensions:[image.width,image.height],extractMethod:extracted.processing.method,extractedDimensions:[context.logoImg.width,context.logoImg.height],preparedDimensions:[prepared.width,prepared.height],geometry:extracted.processing.geometry,baseline,current,uiAutomaticExistingRearCount:3,uiExplicitBlackRearCount:4,scope:'Actual extractPhotoInk + prepareLogo + syncPrintInks offline. Reviewable proposal accepted by harness; not browser visual approval or geometry guarantee.'};
 fs.mkdirSync('tests/evidence/v54',{recursive:true});fs.writeFileSync('tests/evidence/v54/private-raw-palette.json',JSON.stringify(evidence,null,2)+'\n');
});
