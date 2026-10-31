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
async function run(image,name){const f=new File([image.toBuffer('image/jpeg',85)],name+'.jpeg',{type:'image/jpeg'});route=null;proposal=null;await context.routeImageCandidate(f);return route;}
function flat(color,texture=false){const c=make(320,240),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,320,240);if(texture){const d=ctx.getImageData(0,0,320,240);let seed=817;for(let i=0;i<d.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed%19)-9;for(let k=0;k<3;k++)d.data[i+k]=Math.max(0,Math.min(255,d.data[i+k]+noise));}ctx.putImageData(d,0,0);}ctx.fillStyle='#102f59';ctx.font='italic bold 45px sans-serif';ctx.fillText('BRAND',75,125);return c;}
(async()=>{
 const source=await loadImage(path.join(__dirname,'fixtures/photo-frame-geometry/source.jpeg'));
 for(const box of [[350,300,1020,850],[410,380,960,800]])for(const scale of [1,.5]){const[x,y,x1,y1]=box,c=make(Math.round((x1-x)*scale),Math.round((y1-y)*scale));c.getContext('2d').drawImage(source,x,y,x1-x,y1-y,0,0,c.width,c.height);assert.equal(await run(c,'same-generic-name'),'photo','textured physical crop cannot silently enter uncorrected flat-logo path');assert(proposal?.needsRegionSelection,'partial subtitle-only proposal must not reach acceptance');assert(!proposal.file,'no partial file can be committed');assert(proposal.processing.retention.retainedFraction<.9);}
 const full=await context.extractPhotoInk(source);assert(full?.file&&full.whiteCarrier&&!full.needsRegionSelection,'original full-photo proposal must remain supported');
 for(const color of ['#ffffff','#f5f6fa','#e4d7d3','#808080','#f3e6be','#b9dff5','#14243e']){const c=flat(color);assert.equal(await run(c,'same-generic-name'),'logo','uniform '+color+' and intentional italic typography must keep the logo route');}
 const texture=flat('#ad4863',true),pixels=texture.getContext('2d').getImageData(0,0,320,240).data,before=Buffer.from(pixels),detection=B.analyze(pixels,320,240),surface=B.inspectSurface(pixels,320,240,detection);
 assert(surface.photoLike,'textured coloured carrier also requires the photo route');assert.equal(detection.kind,'color');assert.notEqual(detection.color,'#ffffff');assert.deepEqual(Buffer.from(pixels),before,'classification never edits texture/colour');
 assert.equal(await run(texture,'same-generic-name'),'photo');
 const explicitFile=new File([texture.toBuffer('image/jpeg',85)],'textured-artwork.jpeg',{type:'image/jpeg'});route=null;await context.routeImageCandidate(explicitFile);assert.equal(route,'photo');
 await context.routeImageCandidate(explicitFile,'logo');assert.equal(route,'logo','texture-only hint must retain explicit artwork override');
 assert(!B.inspectSurface(new Uint8ClampedArray(4),1,1,{kind:'white',rgb:[255,255,255]}).photoLike);
 // Routing to a physical-photo proposal is not permission to commit a white ground.
 assert(app.includes('if(extracted?.whiteCarrier){showWhiteCarrierProposal(extracted,data);return;}'));
 assert(app.indexOf('if(extracted?.needsRegionSelection)')<app.indexOf('if(extracted?.whiteCarrier){showWhiteCarrierProposal'),'completeness rejection precedes proposal panel');
 // A complete marked area on a textured colour is not rejected solely for its colour.
 const whole=B.sourceRetention(pixels,320,240,detection,[0,0,320,240],320,240);assert(whole.applicable&&whole.ok&&whole.retainedFraction===1);
 console.log('PASS photo-surface routing: four real cropped variants; seven uniform coloured/white/italic logos; textured coloured carrier; immutable pixels; explicit white-carrier review retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
