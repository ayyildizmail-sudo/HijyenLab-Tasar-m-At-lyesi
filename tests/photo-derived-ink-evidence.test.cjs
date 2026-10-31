/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),PrintInks=require('../frontend/print-inks'),CombinedInks=require('../frontend/combined-inks'),PrintPolicy=require('../frontend/print-policy'),ProcessingSession=require('../frontend/processing-session');
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
function harness(c,{photo=true,method='white-carrier-chromatic-and-dark-components'}={}){
 const nodes={},session=ProcessingSession.create(),token=session.begin({sha256:'a'.repeat(64)});session.decoded(token,{width:c.width,height:c.height,coordinateFrame:'browser-decoded'});
 const state={logo:'current-artwork',bg:'#ffffff',extractionApproximate:photo,processingResult:session.commit(token,{method,methodVersion:'test',box:[0,0,c.width,c.height],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,c.width,c.height],reason:'current accepted source'}],excludedRegions:[],maskBasis:'original accepted source pixels',transformOrder:['decode'],limitations:[]})};
 const ctx={state,logoImg:c,prepareLogo:()=>c,PrintInks,CombinedInks,PrintPolicy,processingSession:session,designIssue:()=>false,$:id=>nodes[id]||(nodes[id]={value:'',textContent:''}),document:{createElement:()=>createCanvas(1,1)},invalidateQuote(){},calculateRaw(){},refresh(){},calculate(){}};
 vm.createContext(ctx);require('./helpers/content-safety-vm.cjs')(ctx);
 vm.runInContext(fs.readFileSync('frontend/brand-region-ui.js','utf8').split('\n').find(l=>l.startsWith('function designFingerprint()')),ctx);
 session.touchDesign(ctx.designFingerprint());session.approve(ctx.designFingerprint());state.processingResult=session.getState().result;
 vm.runInContext(fs.readFileSync('frontend/print-inks-ui.js','utf8'),ctx);
 return {ctx,nodes,session,estimate:()=>vm.runInContext('frontArtworkInkEstimate',ctx)};
}
function blocks(colors){const c=createCanvas(240,100),g=c.getContext('2d');colors.forEach((v,i)=>{g.fillStyle=v;g.fillRect(8+i*230/colors.length,10,210/colors.length,80);});return c;}
test('photographic RGB clusters stay unchanged and unknown, not clamped to three',()=>{
 const c=blocks(['#d06707','#222123','#4f5052','#e6853b','#82573e']),d=pixels(c),before=Buffer.from(d),raw=PrintInks.estimate(d,c.width,c.height,{acceptedArtwork:true}),photo=PrintInks.estimate(d,c.width,c.height,{acceptedArtwork:true,photoDerived:true});
 assert.equal(raw.count,5);assert.equal(photo.count,5);assert.deepEqual(photo.colors,raw.colors);assert.equal(photo.uncertain,true);assert.equal(photo.physicalInkCount,null);assert.deepEqual(Buffer.from(d),before);
 const h=harness(c);assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.currentPrintPolicy().count,null);assert.equal(h.ctx.visualPreviewPolicyError(),'');assert(h.ctx.printPolicyError());h.nodes.inks.value='3';assert(h.ctx.printPolicyError(),'manual three cannot certify photography');h.ctx.state.designProcessing=true;assert(h.ctx.visualPreviewPolicyError(),'pending source cannot continue');
});
test('native three and four, screen four and pale gray remain honest',()=>{
 for(const colors of [['#d06707','#222123','#4f5052'],['#d06707','#222123','#4f5052','#008040']]){const h=harness(blocks(colors),{photo:false,method:'native-logo'});assert.equal(h.estimate().count,colors.length);assert.equal(h.estimate().uncertain,false);assert.equal(h.ctx.currentPrintPolicy().blocked,colors.length>3);}
 const screen=harness(blocks(['#dfdfdf','#a0a0a0','#606060','#101010']),{photo:true,method:'screen-chrome-region'});assert.equal(screen.estimate().count,4);assert.equal(screen.estimate().uncertain,false);assert(screen.ctx.visualPreviewPolicyError());
 const pale=harness(blocks(['#101010','#f5f5f5']),{photo:false,method:'native-logo'});assert.equal(pale.nodes.inks.value,'');assert(pale.ctx.printPolicyError());
});
const source=process.env.HIJYENLAB_PRIVATE_PHOTO_INK_SOURCE;
test('actual extracted photograph ordinary ink UI allows only current idea preview, not price',{skip:!source},async()=>{
 const im=await loadImage(source),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const before=Buffer.from(pixels(c)),raw=PrintInks.estimate(pixels(c),c.width,c.height,{acceptedArtwork:true}),h=harness(c);
 assert(raw.colors.length>3,'fixture exposes photographed RGB overcount');assert.equal(h.estimate().uncertain,true);assert.equal(h.estimate().physicalInkCount,null);assert(h.estimate().count>3,'diagnostic clusters preserved, not clamped');assert.equal(h.nodes.inks.value,'');assert.equal(h.ctx.currentPrintPolicy().count,null);assert.equal(h.ctx.visualPreviewPolicyError(),'');assert(h.ctx.printPolicyError());assert.deepEqual(Buffer.from(pixels(c)),before);
 h.session.begin({sha256:'b'.repeat(64)});assert(h.ctx.visualPreviewPolicyError(),'old pixels cannot approve a replacement');
});
