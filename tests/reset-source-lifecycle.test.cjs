/* eslint-disable @typescript-eslint/no-require-imports -- Browser lifecycle regression uses the existing CommonJS VM harness. */
// Independent QA regressions migrated unchanged in behavior to portable repository paths.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),repo=require('path').resolve(__dirname,'..'),P=require(repo+'/frontend/processing-session.js'),U=require(repo+'/frontend/upload-format.js');const source=fs.readFileSync(repo+'/frontend/processing-lifecycle.js','utf8'),bytes=fs.readFileSync(repo+'/tests/fixtures/sample.png'),out=[];const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function setup(){const els={},calls=[],c={ProcessingSession:P,UploadFormat:U,placementIssue:()=>false,crypto:crypto.webcrypto,state:{logo:null,photoLayout:null,designBlocked:false,extractionApproximate:false},activePdf:null,activePdfTask:null,pdfRenderTasks:new Set(),loading:0,approvedDesignFingerprint:null,printInkKey:null,printInkManual:false,selectedPdfLogoFile:null,regionSource:null,photoRectified:null,photoTouched:false,photoSourceFiles:new WeakSet(),File:class{constructor(parts,name,o){this.parts=parts;this.name=name;this.type=o.type;this.size=bytes.length;}},$ :id=>els[id]||(els[id]={children:[],replaceChildren(){this.children=[]},removeAttribute(k){delete this[k]},append(...n){this.children.push(...n)}}),resetRegionEditor(){},showDesignIssue(){c.lastIssueBusy=c.state.designProcessing;},invalidateQuote(){if(c.processingSession)c.processingSession.invalidateQuotes();},status(){},syncPrintInks(){},designFingerprint:()=>JSON.stringify([c.state.logo,c.state.bg]),refresh(){c.syncProcessingDesign();c.approveNativeDesignIfEligible();},routeImageCandidate:async(f,mode)=>{calls.push({name:f.name,mode});c.recordDecodedFrame({width:100,height:80});c.stageProcessingResult('test-native','v25',[0,0,100,80]);c.state.logo=f.name;c.state.designBlocked=false;c.state.extractionApproximate=false;c.state.extractionApprovalRequired=false;c.markProcessingOutput();},};vm.createContext(c);vm.runInContext(source,c);function file(name,delay){return{name,type:'image/png',size:bytes.length,arrayBuffer:()=>delay?delay.promise:Promise.resolve(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))};}return{c,calls,file};}
async function test(name,f){try{await f();out.push({name,status:'PASS'});}catch(e){out.push({name,status:'FAIL',error:e.message});}}

const app=fs.readFileSync(repo+'/frontend/app.js','utf8'),multi=fs.readFileSync(repo+'/frontend/multi-logo-ui.js','utf8');
function realResetSetup(){
 const h=setup(),c=h.c,oldRoute=c.routeImageCandidate;
 c.File.prototype.arrayBuffer=()=>Promise.resolve(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 c.initial={logo:null,photoLayout:null,removed:true,designProcessing:false};c.history=[];c.lastUploadedFile=null;c.photoSourceImg=null;c.photoSourceData=null;c.photoQuad=null;c.photoCandidates=[];c.photoSourceMask=null;c.photoDrag=null;
 c.remember=()=>c.history.push({...c.state});c.go=()=>{};c.list=()=>[];c.reset=()=>{};c.rearContent={sponsorHash:''};c.logoImg=null;c.photoImg=null;
 c.routeImageCandidate=async(f,mode)=>{c.lastUploadedFile=f;c.$('inputOverride').hidden=false;await oldRoute(f,mode);};
 c.refresh=()=>{for(const id of ['selectBrandRegion','visibleInterpretation'])c.$(id).hidden=!c.lastUploadedFile;};
 const reset=app.slice(app.indexOf('function resetDesign(){'),app.indexOf("$('reset').onclick=resetDesign;"));
 vm.runInContext(reset+"$('reset').onclick=resetDesign;",c);
 vm.runInContext(app.split('\n').find(l=>l.startsWith('const previousReset=')),c);
 // Reproduce the actual later replacement that bypassed the button-only cleanup.
 vm.runInContext(multi.split('\n').find(l=>l.startsWith('const oldReset=')),c);
 vm.runInContext(app.split('\n').find(l=>l.startsWith("$('asLogo').onclick=")),c);
 return h;
}
(async()=>{
await test('Real reset with multi-logo wrapper removes recovery source and cannot resurrect it',async()=>{
 const h=realResetSetup(),c=h.c;await c.routeUploadedFile(h.file('old.png'));c.selectedPdfLogoFile=h.file('old-page.png');c.photoSourceImg={};c.photoSourceData='old-data';c.refresh();assert.equal(c.$('visibleInterpretation').hidden,false);
 const oldToken=vm.runInContext('processingContext.token',c);c.$('reset').onclick();
 assert.equal(c.lastUploadedFile,null);assert.equal(c.selectedPdfLogoFile,null);assert.equal(c.photoSourceImg,null);assert.equal(c.photoSourceData,null);assert.equal(c.state.logo,null);assert(!c.processingSession.isCurrent(oldToken));
 for(const id of ['inputOverride','visibleInterpretation','selectBrandRegion','photoEditor','pdfPicker','photoLogoCorrection','placePdfLogo'])assert.equal(c.$(id).hidden,true,id);
 const count=h.calls.length;await c.$('asLogo').onclick();await c.$('asPhoto').onclick();assert.equal(h.calls.length,count);assert.equal(c.state.logo,null);
});
await test('Retry before reset and fresh upload after reset both still work',async()=>{
 const h=realResetSetup(),c=h.c;await c.routeUploadedFile(h.file('first.png'));await c.$('asLogo').onclick();assert.equal(h.calls.length,2);assert.equal(h.calls[1].mode,'logo');c.$('reset').onclick();await c.routeUploadedFile(h.file('new.png'));assert.equal(c.state.logo,'new.png');assert.equal(c.lastUploadedFile.name,'new.png');assert.equal(c.$('visibleInterpretation').hidden,false);await c.$('asPhoto').onclick();assert.equal(h.calls.at(-1).mode,'photo');
});
await test('Reset invalidates in-flight decode and its finally cannot restore source or design',async()=>{
 const h=realResetSetup(),c=h.c,d=deferred();const pending=c.routeUploadedFile(h.file('pending.png',d));c.$('reset').onclick();d.resolve(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));await pending;assert.equal(h.calls.length,0);assert.equal(c.lastUploadedFile,null);assert.equal(c.state.logo,null);assert.equal(c.state.designProcessing,false);
});
await test('Programmatic reset uses same boundary; ordinary cancel retains retry source',async()=>{
 const h=realResetSetup(),c=h.c;await c.routeUploadedFile(h.file('retry.png'));c.cancelCurrentProcessing('cancel');assert.equal(c.lastUploadedFile.name,'retry.png');await c.$('asLogo').onclick();assert.equal(c.state.logo,'retry.png');c.resetDesign();assert.equal(c.lastUploadedFile,null);await c.$('asLogo').onclick();assert.equal(c.state.logo,null);
});
console.log(out);if(out.some(x=>x.status==='FAIL'))process.exitCode=1;
})();
