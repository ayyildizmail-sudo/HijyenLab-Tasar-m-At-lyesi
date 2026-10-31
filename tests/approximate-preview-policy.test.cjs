/* Visual-only unknown-ink previews never certify colors or unlock prices. */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test');
const ui=fs.readFileSync('frontend/print-inks-ui.js','utf8'),app=fs.readFileSync('frontend/app.js','utf8'),rear=fs.readFileSync('frontend/rear-preview.js','utf8');
const ProcessingSession=require('../frontend/processing-session.js');
const fingerprintSource=fs.readFileSync('frontend/brand-region-ui.js','utf8').split('\n').find(line=>line.startsWith('function designFingerprint()'));
function setup({approximate=true,sourceKind='screen-product-preview',method='screen-product-white-carrier',approved=true}={}){
 const state={sourceKind,extractionApproximate:approximate,whiteCarrierWhiteOnly:true,logo:'source-pixels',removed:false,bg:'#ffffff'};
 let policy={blocked:true,count:null,detectedCount:2,reason:'financial-unknown'};
 const session=ProcessingSession.create(),token=session.begin({sha256:'a'.repeat(64)});session.decoded(token,{width:100,height:50,coordinateFrame:'browser-decoded'});
 state.processingResult=session.commit(token,{method,methodVersion:'test',box:[0,0,100,50],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,100,50],reason:'actual supplied artwork'}],excludedRegions:[],maskBasis:'original source pixels',transformOrder:['decode'],limitations:['idea preview, not press separations']});
 const c={state,logoImg:{width:100,height:50},processingSession:session,frontInkStatus:'unknown',frontArtworkInkEstimate:{count:2,uncertain:true},printInkEstimate:{colors:['#111111','#dfdfdf'],uncertain:true},designIssue:()=>false,currentPrintPolicy:()=>policy,draw(){},canvas:{toDataURL:()=> 'data:image/png;base64,VISUAL'}};
 vm.createContext(c);require('./helpers/content-safety-vm.cjs')(c);vm.runInContext(fingerprintSource,c);session.touchDesign(c.designFingerprint());if(approved)session.approve(c.designFingerprint());state.processingResult=session.getState().result;
 vm.runInContext(ui.slice(ui.indexOf('function printPolicyError('),ui.indexOf('function syncPrintPolicyNotice(')),c);vm.runInContext(app.slice(app.indexOf('function visualPreviewImageData('),app.indexOf("$('download').onclick")),c);
 return{c,state,session,token,setPolicy:p=>policy=p};
}
test('accepted current idea-preview routes render in-app without certifying ink count or export',()=>{
 for(const options of [{approximate:false,sourceKind:null,method:'native-logo',approved:false},{approximate:false,sourceKind:null,method:'native-logo'}, {method:'screen-chrome-region',sourceKind:null},{method:'manual-perspective-region',sourceKind:null},{method:'photo-ink-extraction',sourceKind:null},{method:'native-logo',sourceKind:null},{method:'white-carrier',sourceKind:'white-carrier-proposal'},{}]){
  const {c,state,session}=setup(options),before=JSON.stringify({state,session:session.getState(),palette:c.frontArtworkInkEstimate});
  assert.equal(c.visualPreviewPolicyError(),'');assert.equal(c.visualPreviewImageData(),'data:image/png;base64,VISUAL');assert.equal(c.printPolicyError(),'financial-unknown');assert.throws(()=>c.imageData(),/financial-unknown/);
  assert.equal(JSON.stringify({state,session:session.getState(),palette:c.frontArtworkInkEstimate}),before,'preview does not approve, recolor, assign ink count or mutate processing');
 }
});
test('known four-plus ink evidence never gets visual unknown exception',()=>{
 for(const patch of [{count:4},{count:7}]){const{c,setPolicy}=setup();setPolicy({blocked:true,reason:'four-ink',...patch});assert.equal(c.visualPreviewPolicyError(),'four-ink');assert.throws(()=>c.visualPreviewImageData(),/four-ink/);}
 for(const change of [c=>{c.frontArtworkInkEstimate.count=4;c.frontArtworkInkEstimate.uncertain=false;},c=>{c.printInkEstimate.colors=['#111111','#555555','#aaaaaa','#eeeeee'];c.printInkEstimate.uncertain=false;}]){const{c}=setup();change(c);assert.equal(c.visualPreviewPolicyError(),'financial-unknown');}
});
test('no current image, partial source, pending input or failed design can bypass the gate',()=>{
 for(const patch of [{logo:null},{removed:true},{photoLayout:'raw-photo'},{designProcessing:true},{designBlocked:true},{extractionSourceLimited:true},{screenSelectionRequired:true},{extractionApprovalRequired:true},{bgDecisionPending:true},{productAssetPending:true},{productAssetFailure:'failed'},{productReviewRequired:true},{sourceKind:'unsupported'},{sourceKind:'candidate'},{sourceKind:'photo-region'},{sourceKind:'photo'},{sourceKind:'screen'},{textPending:true,text:'NOT PLACED'}]){const{c,state}=setup();Object.assign(state,patch);assert.equal(c.visualPreviewPolicyError(),'financial-unknown',JSON.stringify(patch));}
 for(const mutate of [c=>c.logoImg=null,c=>c.logoImg.width=0,c=>c.designIssue=()=>true,c=>delete c.designIssue,c=>delete c.processingSession]){const{c}=setup();mutate(c);assert.equal(c.visualPreviewPolicyError(),'financial-unknown');}
});
test('lifecycle pending, failed, cancelled and stale replacement cannot reuse visible old artwork',()=>{
 for(const mutate of [h=>h.session.begin({sha256:'b'.repeat(64)}),h=>h.session.fail(h.token,'decode failed'),h=>h.session.cancel(),h=>{const t=h.session.begin({sha256:'b'.repeat(64)});h.session.pendingSelection(t,'choose full brand');},h=>h.state.logo='new unprocessed pixels',h=>h.state.processingResult.operation.operationId++,h=>h.state.processingResult.source.sha256='b'.repeat(64),h=>h.state.processingResult.extractionRevision++,h=>h.state.processingResult=null]){const h=setup();mutate(h);assert.equal(h.c.visualPreviewPolicyError(),'financial-unknown');}
});
test('approximate extraction needs current user acceptance; native does not manufacture approval',()=>{
 const extracted=setup({approved:false});assert.equal(extracted.c.visualPreviewPolicyError(),'financial-unknown');
 const native=setup({approximate:false,sourceKind:null,method:'native-logo',approved:false});assert.equal(native.c.visualPreviewPolicyError(),'');assert.equal(native.session.isApproved(native.c.designFingerprint()),false);
 const changed=setup();changed.state.bg='#eeeeee';changed.session.touchDesign(changed.c.designFingerprint());changed.state.processingResult=changed.session.getState().result;assert.equal(changed.c.visualPreviewPolicyError(),'financial-unknown','old acceptance is not valid after design edit');
});
test('pending text still blocks visual snapshot',()=>{const{c,state}=setup();state.textPending=true;state.text='NOT PLACED';assert.throws(()=>c.visualPreviewImageData());});
test('only front to rear navigation uses visual gate; pricing and quote still financial',()=>{const go=app.slice(app.indexOf('function go(n)'),app.indexOf("$('next').onclick",app.indexOf('function go(n)')));assert.match(go,/n===2&&step===1&&typeof visualPreviewPolicyError/);assert.match(app.slice(app.indexOf('function calculateRaw()'),app.indexOf('function go(n)')),/printPolicyError\(\)/);assert.match(app.slice(app.indexOf('function downloadLocalImage('),app.indexOf('function visualPreviewImageData(')),/printPolicyError\(\)/);assert.match(rear,/const front=typeof visualPreviewImageData==='function'\?visualPreviewImageData\(\):imageData\(\)/);});
test('rear material renders visual-only while financial policy remains unresolved',()=>{const{c}=setup();Object.assign(c,{rearTextInkError:()=>'',rearHasContent:()=>false,rearPackageClip(){},document:{createElement:()=>({getContext:()=>({save(){},restore(){},drawImage(){}}),toDataURL:()=> 'data:image/png;base64,REAR'})}});vm.runInContext(rear.slice(rear.indexOf('function rearMaterialDataURL('),rear.indexOf('const rearContent=')),c);assert.equal(c.rearMaterialDataURL({naturalWidth:100,naturalHeight:50},'#ffffff'),'data:image/png;base64,REAR');assert.equal(c.printPolicyError(),'financial-unknown');});
test('actual calculation, quote rendering and download handlers still reject visually allowed unknown inks',async()=>{
 const {c}=setup(),nodes={};let invalidated=0;
 Object.assign(c,{$:id=>nodes[id]||(nodes[id]={value:'',textContent:''}),latest:{subtotal:123},invalidateQuote(){invalidated++;},status(){},isDeclaredQuote:()=>false});
 assert.equal(c.visualPreviewPolicyError(),'');
 vm.runInContext(app.split('\n').find(line=>line.startsWith('function calculateRaw()')),c);c.calculateRaw();assert.equal(c.latest,null);assert.equal(nodes.review.disabled,true);assert.equal(nodes.breakdown.textContent,'financial-unknown');
 vm.runInContext(app.slice(app.indexOf('async function renderQuote(){'),app.indexOf('\nfunction preparePhotoCutout')),c);await c.renderQuote();
 vm.runInContext(app.split('\n').find(line=>line.startsWith("$('downloadQuote').onclick=")),c);nodes.downloadQuote.onclick();
 vm.runInContext(app.slice(app.indexOf('function downloadLocalImage('),app.indexOf('function visualPreviewImageData(')),c);assert.throws(()=>c.downloadLocalImage('data:image/png;base64,VISUAL','preview.png'),/financial-unknown/);
 assert.equal(invalidated,3);assert.equal(c.processingSession.isApproved(c.designFingerprint()),true,'visual approval is not a commercial override');
});

test('uncertain five shadow clusters may be shown as an idea, never certified or priced',()=>{const {c,setPolicy}=setup();c.frontArtworkInkEstimate={count:5,uncertain:true,colors:['#111111','#555555','#999999','#bbbbbb','#dddddd']};c.printInkEstimate={status:'unknown',count:null,uncertain:true,colors:c.frontArtworkInkEstimate.colors};setPolicy({blocked:true,count:null,detectedCount:5,reason:'financial-unknown'});assert.equal(c.visualPreviewPolicyError(),'');assert.equal(c.visualPreviewImageData(),'data:image/png;base64,VISUAL');assert.equal(c.printPolicyError(),'financial-unknown');assert.throws(()=>c.imageData(),/financial-unknown/);assert.equal(c.frontArtworkInkEstimate.count,5);assert.equal(c.frontArtworkInkEstimate.uncertain,true);});
