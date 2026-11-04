/* eslint-disable @typescript-eslint/no-require-imports -- Deterministic local rendering regression. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');
const Gallery=require('./helpers/private-gallery-harness.cjs'),Geometry=require('../frontend/product-geometry.js'),Catalog=require('../frontend/product-catalog.js'),Renderer=require('../frontend/print-renderer.js');
const app=fs.readFileSync('frontend/app.js','utf8');
const drawStart=app.indexOf('function draw(selected='),drawEnd=app.indexOf('\nfunction refresh()',drawStart),drawCode=app.slice(drawStart,drawEnd);
// The baseline removes exactly the two performance guards, leaving the same drawing algorithm.
const oldCode=drawCode.replace('if(globalThis.HijyenLabOpeningExamples?.coversPreview?.()&&state.removed&&!state.logo&&!state.text&&!state.photoLayout&&!state.sourcePhoto&&!isUnprinted()&&!isDeclaredQuote())return;','').replace('if((state.removed||!logoImg)&&(!state.text||state.textPending))return;','');
function harness(source,options={}){
 const calls={readbacks:0,shade:0,canvas:0,beforeDraw:0},events={};
 function canvas(w,h){const c=createCanvas(w,h),cx=c.getContext('2d'),get=cx.getImageData.bind(cx);cx.getImageData=(...args)=>{calls.readbacks++;return get(...args);};return c;}
 const target=canvas(1600,850),logo=createCanvas(160,80),lc=logo.getContext('2d');lc.fillStyle='#173b67';lc.fillRect(5,10,150,60);
 const scope={console,ImageData,addEventListener:(name,fn)=>events[name]=fn,document:{createElement:()=>{calls.canvas++;return canvas(1,1);}},canvas:target,ctx:target.getContext('2d'),step:1,selectedProductId:options.product||'BM12',state:{bg:options.bg||'#ffffff',removed:!options.logo,text:options.text||'',textPending:!!options.pending,textColor:'#800d2e',textSize:38,font:'sans-serif',tx:800,ty:520,x:800,y:425,rotation:0,...options.state},logoImg:options.logo?logo:null,packageImage:options.image,tintedMaterialCache:null,ProductGeometry:Geometry,isUnprinted:()=>!!options.unprinted,isDeclaredQuote:()=>!!options.declared,contentSafetyError:()=>false,currentPrintArea:()=>Geometry.area(options.product||'BM12'),prepareLogo:()=>logo,visibleLogoPlan:()=>({width:160,height:80,sourceRect:{x:0,y:0,width:160,height:80},drawRect:{x:-80,y:-40}}),drawVisibleLogo:(cx,img)=>cx.drawImage(img,-80,-40),PrintRenderer:{shade:(...args)=>{calls.shade++;return Renderer.shade(...args);}},HijyenLabOpeningExamples:{coversPreview:()=>!!options.covered},HijyenLabLogoSettle:{beforeDraw:()=>calls.beforeDraw++,capture(){}},tintRearPixels(){}};
 vm.createContext(scope);vm.runInContext(app.split('\n').find(l=>l.startsWith('function materialColor(')),scope);vm.runInContext(fs.readFileSync('frontend/product-ui.js','utf8').split('\n').find(l=>l.startsWith('function renderAlternateProductMaterial(')),scope);vm.runInContext(source,scope);return{scope,calls,target,events};
}
test('blank welcome skips 2 full raster reads and 1.36 million pixel shading without changing output',async()=>{
 for(const product of ['BM12','BM15','BM545','BM21','BM11','BM13','OSHIBORI']){
  const image=await loadImage('frontend/'+Catalog.get(product).frontAsset);
  for(const bg of ['#ffffff','#800d2e']){const a=harness(oldCode,{image,product,bg}),b=harness(drawCode,{image,product,bg});a.scope.draw();b.scope.draw();assert.deepEqual(b.target.toBuffer('image/png'),a.target.toBuffer('image/png'),product+' '+bg);assert.equal(a.calls.shade,1);assert.equal(b.calls.shade,0);assert.equal(a.calls.readbacks-b.calls.readbacks,2);assert.equal(a.calls.canvas-b.calls.canvas,2);}
 }
});
test('logo, text, pending text, unprinted and declared output remains pixel-identical',async()=>{
 const image=await loadImage('frontend/assets/bm12-blank.png');
 for(const options of [{logo:true},{text:'ÖRNEK'},{text:'ÖRNEK',pending:true},{logo:true,text:'ÖRNEK'},{unprinted:true},{declared:true}]){const a=harness(oldCode,{image,...options}),b=harness(drawCode,{image,...options});a.scope.draw();b.scope.draw();assert.deepEqual(b.target.toBuffer('image/png'),a.target.toBuffer('image/png'),JSON.stringify(options));if(options.logo||options.text&&!options.pending)assert.equal(b.calls.shade,1);}
});
test('covered preview does zero canvas work; visible transition resumes latest product/artwork',async()=>{
 const image=await loadImage('frontend/assets/bm12-blank.png'),options={image,covered:true},h=harness(drawCode,options);h.scope.draw();assert.deepEqual(h.calls,{readbacks:0,shade:0,canvas:0,beforeDraw:0});options.covered=false;h.events['hijyenlab:opening-preview-visible']();assert.equal(h.calls.shade,0);assert(h.calls.canvas>0);h.scope.state.removed=false;h.scope.logoImg=createCanvas(20,20);h.events['hijyenlab:opening-preview-visible']();assert.equal(h.calls.shade,1);
});
test('gallery visibility event fires once after actual uncover, including upload cancel and draft/artwork',()=>{
 for(const transition of ['finish','upload','draft','text','processing','no-gallery-product']){const h=Gallery(),states=[];h.root.addEventListener('hijyenlab:opening-preview-visible',()=>states.push({covered:h.root.HijyenLabOpeningExamples.coversPreview(),hidden:h.nodes.openingExamples.hidden,main:h.main.classes.has('showOpeningExamples')}));h.complete();assert(h.root.HijyenLabOpeningExamples.coversPreview());if(transition==='finish'){for(let i=0;i<5;i++){h.tick();h.complete();}}else if(transition==='upload')h.upload.listeners.click();else{if(transition==='draft')h.state.logo='restored-source';if(transition==='text')h.state.textDesign={};if(transition==='processing')h.state.designProcessing=true;if(transition==='no-gallery-product')h.root.selectedProductId='BM15';h.sync();}assert.deepEqual(states,[{covered:false,hidden:true,main:false}],transition);h.sync();assert.equal(states.length,1,transition+' repeated sync');}
});
test('product-to-product galleries and background/foreground preserve deferral without stale reveal',()=>{
 const h=Gallery();let count=0;h.root.addEventListener('hijyenlab:opening-preview-visible',()=>count++);h.complete();h.doc.hidden=true;h.events.visibilitychange();h.root.selectedProductId='BM545';h.sync();h.complete();assert(h.root.HijyenLabOpeningExamples.coversPreview());assert.equal(count,0);h.doc.hidden=false;h.events.visibilitychange();h.tick();h.complete();h.tick();assert.equal(count,1);assert(!h.root.HijyenLabOpeningExamples.coversPreview());
});
test('stale gallery visibility never suppresses synchronous logo, text or quote-mode rendering',async()=>{
 const image=await loadImage('frontend/assets/bm12-blank.png');
 for(const options of [{logo:true},{text:'New text'},{text:'Pending text',pending:true},{unprinted:true},{declared:true},{state:{logo:'source retained'},image:null}]){const a=harness(oldCode,{image,covered:true,...options}),b=harness(drawCode,{image,covered:true,...options});a.scope.draw();b.scope.draw();assert.equal(b.calls.beforeDraw,1);assert.deepEqual(b.target.toBuffer('image/png'),a.target.toBuffer('image/png'),JSON.stringify(options));}
});
