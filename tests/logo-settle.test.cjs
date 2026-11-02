/* eslint-disable @typescript-eslint/no-require-imports */
/* Synthetic DOM/native-canvas coverage, not a browser/iOS certification. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');
const {create,geometry,displayRect,DURATION}=require('../frontend/logo-settle.js');
const area={left:280,right:1320,top:210,bottom:640};
const plan={drawRect:{x:-200,y:-70,width:400,height:140},rotation:0};
function harness(nativeMicrotasks=false){
 const queued=[],events={},animations=[];let copies=0,created=0;
 const node=tag=>({tagName:tag.toUpperCase(),style:{},children:[],attrs:{},width:1600,height:850,append(...items){this.children.push(...items);for(const c of items)c.parentElement=this;},remove(){this.parentElement.children=this.parentElement.children.filter(c=>c!==this);},setAttribute(k,v){this.attrs[k]=v;},closest(){return this.hidden?this:null;},getBoundingClientRect(){return {left:20,top:50,width:800,height:425};},getContext(){return {drawImage(){copies++;}};},animate(frames,options){const a={frames,options,node:this,cancel(){this.canceled=true;this.oncancel?.();}};animations.push(a);return a;}});
 const canvas=node('canvas');canvas.style.opacity='';const body=node('body');body.append(canvas);
 const doc={body,activeElement:body,hidden:false,getElementById:id=>id==='package'?canvas:null,createElement:tag=>{created++;return node(tag);},addEventListener(t,f){(events[t]??=[]).push(f);}};
 const env={innerHeight:900,queueMicrotask:f=>nativeMicrotasks?queueMicrotask(f):queued.push(f),addEventListener(t,f){(events[t]??=[]).push(f);}};
 const media={matches:false,addEventListener(t,f){this.change=f;}};const api=create(doc,media,env);
 const data={canvas,asset:{},printed:{},plan,x:800,y:425,area};let valid=true,renders=0;
 const request=(token='source:1')=>api.request({token,current:()=>valid,render:()=>{renders++;api.beforeDraw();api.capture(data);}});
 return {api,doc,env,canvas,media,data,animations,events,request,setValid:v=>valid=v,flush(){while(queued.length)queued.shift()();},event(t,e={target:{tagName:"INPUT",type:"text"}}){for(const f of events[t]||[])f(e);},copies:()=>copies,created:()=>created,renders:()=>renders,overlay:()=>body.children.find(n=>n.className==='logoSettlePreview')};
}
test('one slower, clearly staged logo-only shrink/grow/settle; actual package geometry untouched; repeat does not replay',()=>{
 const h=harness();assert(h.request());assert.equal(h.created(),0,'no allocations before committed response');h.flush();
 const a=h.animations[0];assert.equal(a.options.duration,DURATION);assert.equal(DURATION,1400);assert.equal(a.options.iterations,1);assert.equal(a.options.fill,undefined);assert.deepEqual(a.frames.map(f=>f.transform),['scale(1)','scale(.88)','scale(1.035)','scale(1)']);assert.deepEqual(a.frames.map(f=>f.offset),[0,.28,.72,1]);assert.equal(a.options.easing,'linear');assert.ok(a.frames.slice(0,-1).every(f=>f.easing==='cubic-bezier(.4,0,.2,1)'),'each visible phase eases gently without changing its allotted duration');assert.ok(a.frames.slice(1).every((f,i)=>(f.offset-a.frames[i].offset)*DURATION>=390),'shrink, grow and settle are individually perceivable, not a fast bounce');assert.notEqual(a.node,h.canvas);assert.equal(h.canvas.style.transform,undefined);assert.equal(h.canvas.style.opacity,'0');assert.equal(h.copies(),2);
 const overlay=h.overlay();assert.equal(overlay.attrs['aria-hidden'],'true');assert.equal(overlay.style.pointerEvents,'none');assert.equal(overlay.style.width,'800px');assert.equal(overlay.style.height,'425px');
 a.onfinish();assert.equal(h.canvas.style.opacity,'');assert.equal(h.overlay(),undefined);assert.equal(h.request(),false);h.api.capture(h.data);h.api.beforeDraw();assert.equal(h.copies(),2);assert.equal(h.renders(),1);
});
test('largest-fit, rotated and asymmetrically anchored complete marks never grow beyond safe area',()=>{
 for(const rotation of [0,15,90,135,180])for(const offset of [0,70]){
  const radians=rotation*Math.PI/180,c=Math.abs(Math.cos(radians)),s=Math.abs(Math.sin(radians)),scale=Math.min(1040/(600*c+220*s),430/(600*s+220*c));
  const p={rotation,drawRect:{x:-300*scale+offset,y:-110*scale,width:600*scale,height:220*scale}},x=800-offset*Math.cos(radians),y=425-offset*Math.sin(radians),g=geometry(p,x,y,area);assert(g);
  for(const factor of [1,.88,g.peak,1])for(const [side,center]of [['left',g.center.x],['right',g.center.x],['top',g.center.y],['bottom',g.center.y]]){const v=center+(g.bounds[side]-center)*factor;assert(side==='left'||side==='top'?v>=area[side]-1e-6:v<=area[side]+1e-6);}
  assert(Math.abs(g.peak-1)<1e-6,'largest fit caps overshoot instead of clipping letters');
 }
 assert.equal(geometry(plan,200,425,area),null,'unsafe geometry skips rather than clipping logo');
});
test('a largest-fit logo still visibly shrinks and grows without an unsafe overshoot or extra bounce',()=>{
 const h=harness();h.data.plan={rotation:0,drawRect:{x:-520,y:-215,width:1040,height:430}};h.request();h.flush();
 const animation=h.animations[0];assert.deepEqual(animation.frames.map(f=>f.transform),['scale(1)','scale(.88)','scale(1)','scale(1)']);assert.equal(animation.options.duration,1400);assert.equal(animation.options.iterations,1);
 animation.onfinish();assert.equal(h.canvas.style.opacity,'');assert.equal(h.overlay(),undefined);
});
test('aspect-fit overlay follows constrained desktop/mobile canvas without stretching material',()=>{
 for(const rect of [{left:10,top:20,width:740,height:340},{left:0,top:0,width:320,height:260},{left:5,top:6,width:390,height:207.1875}]){const fit=displayRect({width:1600,height:850},rect);assert(Math.abs(fit.width/fit.height-1600/850)<1e-12);assert(fit.width<=rect.width&&fit.height<=rect.height);assert.equal(fit.left+(fit.width/2),rect.left+rect.width/2);assert.equal(fit.top+(fit.height/2),rect.top+rect.height/2);}
});
test('reduced motion, hidden document, typing, restoration and missing WAAPI are instant and allocate no captures',()=>{
 for(const setup of [h=>h.media.matches=true,h=>h.doc.hidden=true,h=>h.canvas.hidden=true,h=>h.doc.activeElement={tagName:'INPUT',type:'text'},h=>h.api.suspend(true)]){const h=harness();setup(h);h.request();h.flush();assert.equal(h.copies(),0);assert.equal(h.renders(),0);assert.equal(h.canvas.style.opacity,'');}
 const noWAAPI=harness(),make=noWAAPI.doc.createElement;noWAAPI.doc.createElement=tag=>{const node=make(tag);delete node.animate;return node;};noWAAPI.request();noWAAPI.flush();assert.equal(noWAAPI.copies(),0);assert.equal(noWAAPI.canvas.style.opacity,'');
 const h=harness();h.request();h.flush();h.media.matches=true;h.media.change();assert.equal(h.overlay(),undefined);assert.equal(h.canvas.style.opacity,'');h.media.matches=false;assert.equal(h.request(),false);
});
test('cancel, navigation guard, reupload supersession, redraw and stale finish cannot restore stale overlay',()=>{
 for(const event of ['pointerdown','input','focusin','change','scroll','resize','pagehide']){const h=harness();h.request();h.flush();h.event(event);assert.equal(h.overlay(),undefined,event);assert.equal(h.canvas.style.opacity,'');assert.equal(h.request(),false);}
 const hidden=harness();hidden.request();hidden.flush();hidden.doc.hidden=true;hidden.event('visibilitychange');assert.equal(hidden.overlay(),undefined);
 const nav=harness();nav.request();nav.setValid(false);nav.flush();assert.equal(nav.copies(),0);
 const h=harness();h.request('old');h.request('new');h.flush();assert.equal(h.animations.length,1);const stale=h.animations[0].onfinish;h.request('latest');h.flush();assert.equal(h.animations.length,2);stale();assert(h.overlay());h.api.beforeDraw();assert.equal(h.overlay(),undefined);assert.equal(h.canvas.style.opacity,'');assert.equal(h.request('latest'),false);
 const reset=harness();reset.request();reset.api.reset();reset.flush();assert.equal(reset.copies(),0);
});
test('navigation wait allocates nothing, survives controller heading/scroll, and cancels stale or user-interrupted requests',()=>{
 const h=harness();let ready,unsubscribed=0;h.env.HijyenLabResponsiveJourney={afterNavigation(fn){ready=fn;return()=>unsubscribed++;}};
 h.request('wait');h.flush();assert.equal(h.copies(),0);assert.equal(h.renders(),0);h.event('focusin',{target:{tagName:'H1'}});h.event('scroll');ready(true);assert.equal(h.animations.length,1);h.event('scroll');assert.equal(h.overlay(),undefined,'visible fixed layer still cancels on every scroll');
 h.request('second');h.flush();const stale=ready;h.request('third');h.flush();assert.equal(unsubscribed,1);stale(true);assert.equal(h.animations.length,1);ready(false);assert.equal(h.animations.length,1);
 h.request('input');h.flush();h.event('input');ready(true);assert.equal(h.animations.length,1);assert.equal(unsubscribed,2);
 h.request('reduced');h.flush();h.media.matches=true;h.media.change();ready(true);assert.equal(h.animations.length,1);assert.equal(unsubscribed,3);
});
test('explicit source lifecycle hook rejects errors, source/op drift, text/multi-logo/reference/unprinted; never alters approval',()=>{
 const text=fs.readFileSync('frontend/processing-lifecycle.js','utf8'),start=text.indexOf('function presentAppliedLogo('),end=text.indexOf('\nfunction syncProcessingDesign',start),events=[];
 const record={source:{sha256:'a'.repeat(64)},operation:{operationId:7},extractionRevision:2,method:'native-logo'},live={status:'ready',operationId:7,source:record.source,result:record};
 const c={state:{logo:'source',processingResult:record,extractionApprovalRequired:true},logoImg:{},processingSession:{getState:()=>live},step:1,isUnprinted:()=>false,isReferencePreview:()=>false,isDeclaredQuote:()=>false,HijyenLabJourneyMotion:{logo:e=>events.push(e)},draw(){},MultiLogo:{frontComposite:()=>false,pending:()=>false},approvedDesignFingerprint:'unchanged'};vm.createContext(c);vm.runInContext(text.slice(start,end),c);c.presentAppliedLogo(record);assert.equal(events.length,1);assert(events[0].current());
 for(const [field,value]of [['text','Existing text'],['designProcessing',true],['designBlocked',true],['extractionSourceLimited',true],['removed',true],['photoLayout','pixels'],['productAssetPending',true],['productAssetFailure',true]]){const previous=c.state[field];c.state[field]=value;assert.equal(events[0].current(),false,field);c.state[field]=previous;}
 for(const [field,value]of [['status','failed'],['error','failure'],['operationId',8],['source',{sha256:'b'.repeat(64)}],['result',{extractionRevision:3}]]){const old=live[field];live[field]=value;assert.equal(events[0].current(),false,field);live[field]=old;}
 for(const name of ['isUnprinted','isReferencePreview','isDeclaredQuote']){c[name]=()=>true;assert.equal(events[0].current(),false,name);c[name]=()=>false;}c.MultiLogo.frontComposite=()=>true;assert(!events[0].current());c.MultiLogo.frontComposite=()=>false;c.MultiLogo.pending=()=>true;assert(!events[0].current());c.MultiLogo.pending=()=>false;c.step=2;assert(!events[0].current());
 assert.equal(c.approvedDesignFingerprint,'unchanged');assert.equal(c.state.extractionApprovalRequired,true);c.presentAppliedLogo({...record,method:'source-reference'});assert.equal(events.length,1);
 assert.equal((text.match(/presentAppliedLogo\(record\)/g)||[]).length,2,'only success commit and function declaration, not refresh/approval/restore');
 const source=fs.readFileSync('frontend/logo-settle.js','utf8');assert.doesNotMatch(source,/getImageData|toDataURL|requestAnimationFrame|setInterval|MutationObserver|fetch\(/);
});
function fn(s,n){const start=s.indexOf('function '+n+'(');let i=s.indexOf('{',start),depth=1;for(++i;depth;i++){if(s[i]==='{')depth++;else if(s[i]==='}')depth--;}return s.slice(start,i);}
test('actual renderer pixels/export and design state are byte-identical before/during/after presentation',async()=>{
 const app=fs.readFileSync('frontend/app.js','utf8'),art=createCanvas(320,120);art.getContext('2d').fillStyle='#184c9a';art.getContext('2d').fillRect(0,0,320,120);
 const canvas=createCanvas(1600,850),material=await loadImage('frontend/assets/bm12-blank.png'),state={bg:'#ffffff',removed:false,x:800,y:425,rotation:0,text:'',textColor:'#000',textSize:30,font:'Arial',tx:800,ty:650,size:100};
 const ctx={canvas,ctx:canvas.getContext('2d'),state,step:1,logoImg:art,packageImage:material,document:{createElement:()=>createCanvas(1,1)},ImageData,PrintRenderer:require('../frontend/print-renderer.js'),ProductGeometry:require('../frontend/product-geometry.js'),currentPrintArea:()=>area,isUnprinted:()=>false,isDeclaredQuote:()=>false,isReferencePreview:()=>false,contentSafetyError:()=>'',prepareLogo:()=>art,visibleLogoPlan:()=>({...plan,sourceRect:{x:0,y:0,width:320,height:120},width:400,height:140}),drawVisibleLogo:(c,img,p)=>c.drawImage(img,0,0,img.width,img.height,p.drawRect.x,p.drawRect.y,p.drawRect.width,p.drawRect.height),tintedMaterialCache:null};vm.createContext(ctx);vm.runInContext(fn(app,'draw')+'\n'+fn(app,'materialColor'),ctx);
 for(const ground of ['#ffffff','#102f59']){state.bg=ground;ctx.draw(false);const before=canvas.toBuffer('image/png'),design=JSON.stringify(state),h=harness();h.data.canvas=h.canvas;
  ctx.HijyenLabLogoSettle={beforeDraw:()=>h.api.beforeDraw(),capture(data){const exact=createCanvas(1600,850),ec=exact.getContext('2d');ec.drawImage(data.asset,0,0);ec.drawImage(data.printed,0,0);assert.deepEqual(exact.toBuffer('image/png'),canvas.toBuffer('image/png'),'overlay base plus full-size logo equals actual renderer pixels');h.data={...data,canvas:h.canvas};h.api.capture(h.data);}};
  h.api.request({token:ground,current:()=>true,render:()=>ctx.draw(false)});h.flush();assert(h.overlay());assert.deepEqual(canvas.toBuffer('image/png'),before);assert.equal(JSON.stringify(state),design);h.animations[0].onfinish();assert.deepEqual(canvas.toBuffer('image/png'),before);ctx.draw(false);assert.equal(h.animations.length,1);assert.deepEqual(canvas.toBuffer('image/png'),before);delete ctx.HijyenLabLogoSettle;
 }
});

// Real responsive controller + real source commit/semantic hook + real animation
// controller, with a deterministic browser event/scroll model (not browser QA).
function navigationHarness(nativeScrollEnd=true){
 const frames=new Map(),microtasks=[],docEvents={},winEvents={},animations=[];let serial=0,time=0,scrollTarget=null,scrolled=0,copies=0;
 const state={logo:null,removed:false,text:'',bg:'#ffffff'},browser={innerHeight:800,scrollX:0,scrollY:0,state};
 const dispatch=(map,type,event={})=>{for(const fn of [...(map[type]||[])])fn({type,...event});};
 const listen=(map,type,fn)=>{(map[type]??=[]).push(fn);},unlisten=(map,type,fn)=>{map[type]=(map[type]||[]).filter(f=>f!==fn);};
 class Node{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attrs={};this.hidden=false;this.width=1600;this.height=850;this.textContent='';this.listeners={};const classes=new Set();this.classList={contains:c=>classes.has(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c),add:c=>classes.add(c),remove:c=>classes.delete(c)};}
  append(...nodes){for(const node of nodes){if(node.parentElement)node.remove();this.children.push(node);node.parentElement=this;}}
  before(node){const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),0,node);node.parentElement=parent;}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  closest(){return this.hidden?this:this.parentElement?.closest()||null;}
  querySelector(selector){return this.children.find(n=>selector==='summary'?n.tagName==='SUMMARY':selector.includes('h1')&&['H1','H2'].includes(n.tagName))||null;}
  querySelectorAll(){return [];}
  addEventListener(t,f){listen(this.listeners,t,f);}removeEventListener(t,f){unlisten(this.listeners,t,f);}
  getBoundingClientRect(){return{left:20,top:(this.id==='package'?520:450)-browser.scrollY,width:400,height:this.id==='package'?212.5:40};}
  focus(){doc.activeElement=this;dispatch(docEvents,'focusin',{target:this});}
  scrollIntoView(){scrolled++;scrollTarget=438;}
  getContext(){return{drawImage(){copies++;}};}
  animate(frames,options){const a={frames,options,node:this,cancel(){this.canceled=true;this.oncancel?.();}};animations.push(a);return a;}
 }
 const body=new Node('body'),main=new Node('main'),picker=new Node('div');body.append(main);main.append(picker);
 const nodes=new Map();function add(id,tag='div',parent=main){const node=new Node(tag);node.id=id;nodes.set(id,node);parent.append(node);return node;}
 add('productSelect','select',picker);for(const id of ['design','rearPreview','fragrancePanel','pricing','summary','pdfPicker','photoEditor','whiteCarrierPanel']){const panel=add(id,'section');panel.hidden=id!=='design';add(id+'Heading','h1',panel);}const canvas=add('package','canvas',nodes.get('design'));canvas.style.opacity='';
 const doc={body,readyState:'complete',activeElement:body,hidden:false,documentElement:{scrollHeight:2000,clientHeight:800,scrollTop:0},scrollingElement:{scrollHeight:2000,clientHeight:800,scrollTop:0},getElementById:id=>nodes.get(id)||null,querySelector:s=>s==='main'?main:s==='.productPicker'?picker:null,querySelectorAll:()=>[],createElement:tag=>new Node(tag),addEventListener:(t,f)=>listen(docEvents,t,f),removeEventListener:(t,f)=>unlisten(docEvents,t,f)};
 if(nativeScrollEnd){doc.onscrollend=null;browser.onscrollend=null;}
 Object.assign(browser,{window:browser,document:doc,ProductCatalog:{defaultId:'BM12',get:()=>({label:'Rulo'})},HijyenLabPrintMode:{get:()=> 'printed'},queueMicrotask:fn=>microtasks.push(fn),requestAnimationFrame:fn=>{const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:fn=>{const id=++serial;frames.set(id,fn);return id;},clearTimeout:id=>frames.delete(id),performance:{now:()=>time},getComputedStyle:()=>({scrollMarginTop:'12px'}),matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(t,f)=>listen(winEvents,t,f),removeEventListener:(t,f)=>unlisten(winEvents,t,f)});
 const context=vm.createContext(browser);for(const name of ['logo-settle','journey-motion','responsive-journey'])vm.runInContext(fs.readFileSync('frontend/'+name+'.js','utf8'),context);
 const session=require('../frontend/processing-session.js').create(),token=session.begin({sha256:'c'.repeat(64),mime:'image/svg+xml'});session.decoded(token,{width:100,height:80,coordinateFrame:'browser-decoded'});
 Object.assign(browser,{processingSession:session,processingContext:{token,produced:true,pending:{method:'native-logo',methodVersion:'test',box:[0,0,100,80],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,100,80],reason:'original pixels'}],excludedRegions:[],maskBasis:'source',transformOrder:['decode'],limitations:[]}},frameOfContext:()=>session.getState().frame,designFingerprint:()=> 'unchanged-design',logoImg:{},step:1,isUnprinted:()=>false,isReferencePreview:()=>false,isDeclaredQuote:()=>false,draw(){browser.HijyenLabLogoSettle.beforeDraw();browser.HijyenLabLogoSettle.capture({canvas,asset:{},printed:{},plan,x:800,y:425,area});}});
 const lifecycle=fs.readFileSync('frontend/processing-lifecycle.js','utf8');for(const name of ['requiresNativeContentReview','finalizeProcessingResult','presentAppliedLogo'])vm.runInContext(fn(lifecycle,name),context);
 const micro=()=>{while(microtasks.length)microtasks.shift()();};
 return{browser,doc,animations,canvas,session,apply(){state.logo='source';browser.HijyenLabResponsiveJourney.enter('design');browser.finalizeProcessingResult();micro();},frame(){time+=16;const work=[...frames.values()];frames.clear();for(const f of work)f(time);micro();},scroll(y){browser.scrollY=y;doc.documentElement.scrollTop=doc.scrollingElement.scrollTop=y;dispatch(winEvents,'scroll');dispatch(docEvents,'scroll');},end(){dispatch(docEvents,'scrollend');dispatch(winEvents,'scrollend');micro();},input(type){dispatch(docEvents,type,{target:{tagName:'INPUT',type:'text'}});micro();},settle(){for(let i=0;i<12&&frames.size;i++)this.frame();},pending:()=>frames.size,scrolled:()=>scrolled,target:()=>scrollTarget,copies:()=>copies};
}
test('actual successful source commit waits for section focus and smooth-scroll settlement, then plays exactly once',()=>{
 for(const native of [true,false]){
  const h=navigationHarness(native);h.apply();assert.equal(h.session.getState().status,'ready');assert.equal(h.animations.length,0,'must not start in source commit microtask before navigation frame');assert.equal(h.copies(),0);
  h.frame();assert.equal(h.scrolled(),1);assert.equal(h.animations.length,0,'programmatic heading focus starts no overlay');
  for(const y of [80,200,360,438]){h.scroll(y);h.frame();assert.equal(h.animations.length,0,'moving viewport has no fixed overlay');if(native&&y===200){h.end();h.frame();assert.equal(h.animations.length,0,'a stale prior scrollend cannot release the moving viewport');}}
  if(native){h.end();assert.equal(h.animations.length,0,'native end awaits observed stable position');}h.settle();assert.equal(h.animations.length,1,'first successful upload visibly settles only after its section move');assert.equal(h.animations[0].options.duration,1400);assert.equal(h.canvas.style.opacity,'0');
  h.animations[0].onfinish();assert.equal(h.canvas.style.opacity,'');h.browser.HijyenLabResponsiveJourney.enter('design');h.browser.draw();h.settle();assert.equal(h.animations.length,1,'same-step redraw never repeats');assert.equal(h.pending(),0,'settlement leaves no frame loop');
 }
});
test('user work or newer navigation while awaiting section settlement prevents deferred logo replay',()=>{
 for(const type of ['pointerdown','input','keydown','wheel','touchstart']){const h=navigationHarness();h.apply();h.frame();h.input(type);h.scroll(438);h.end();h.settle();assert.equal(h.animations.length,0,type);assert.equal(h.canvas.style.opacity,'');}
 const h=navigationHarness();h.apply();h.frame();h.doc.getElementById('design').hidden=true;h.doc.getElementById('pricing').hidden=false;h.browser.step=2;h.browser.HijyenLabResponsiveJourney.enter('pricing');h.scroll(438);h.end();h.settle();assert.equal(h.animations.length,0);assert.equal(h.canvas.style.opacity,'');
});

test('real photographed independent-emblem upload triggers the longer animation while normal approval remains pending',async()=>{
 // Reuse the actual public-upload fixture harness, not a stub logo or a static SVG.
 // Its image decoding, local-emblem algorithm, adapter, PNG verification and
 // source-bound processing commit all run unchanged; DOM timing is modeled here.
 const source=fs.readFileSync('tests/customer-ground-upload-independent.test.cjs','utf8'),boundary=source.indexOf("test('normal upload gives");assert(boundary>0);
 const fixture={require,__dirname:__dirname,File,Blob,Buffer,console,process};vm.runInNewContext(source.slice(0,boundary)+'\nglobalThis.fixtureSetup=setup;globalThis.fixtureUpload=upload;',fixture);
 const file=process.env.HIJYENLAB_PRIVATE_BIRTAT||require('node:path').resolve(__dirname,'../../new_failure_1139/original/cc25b83c-fa4b-41c0-8467-0bd3990faa63.jpeg');assert(fs.existsSync(file),'Actual independent-emblem source fixture is required');
 const bytes=fs.readFileSync(file),hash=require('node:crypto').createHash;assert.equal(hash('sha256').update(bytes).digest('hex'),'90036dd9686bac49827a66501def598f160664b7e71f99c55f1b8b191ba1c26b');
 const c=fixture.fixtureSetup(),h=harness(true),requests=[];c.step=1;c.isUnprinted=()=>false;c.isReferencePreview=()=>false;c.isDeclaredQuote=()=>false;
 c.HijyenLabJourneyMotion={logo(event){requests.push(event);h.api.request(event);},reset:()=>h.api.reset()};
 c.draw=()=>{h.api.beforeDraw();h.api.capture(h.data);};
 await fixture.fixtureUpload(c,new File([bytes],'customer-package-photo.jpg',{type:'image/jpeg'}));
 const live=c.processingSession.getState();assert.equal(live.status,'ready',c.lastStatus);assert.equal(live.result.method,'source-independent-emblem-proposal-v2');assert(c.state.extractionApprovalRequired);assert(c.state.nativeContentReviewRequired);assert.equal(c.processingSession.isApproved(c.designFingerprint()),false);assert.equal(requests.length,1);assert(requests[0].current(),'pending ordinary appearance approval must not suppress presentation of an applied logo');assert.equal(h.animations.length,1,'native microtask runs after route finally clears processing, without manually delaying the response');
 const stateBefore=JSON.stringify(c.state),recordBefore=JSON.stringify(live),pixelsBefore=c.state.logo;
 h.flush();assert.equal(h.animations.length,1);assert.equal(h.animations[0].options.duration,1400);assert.deepEqual(h.animations[0].frames.map(f=>f.transform),['scale(1)','scale(.88)','scale(1.035)','scale(1)']);h.animations[0].onfinish();
 assert.equal(c.state.logo,pixelsBefore);assert.equal(JSON.stringify(c.state),stateBefore);assert.equal(JSON.stringify(c.processingSession.getState()),recordBefore);assert.equal(c.processingSession.isApproved(c.designFingerprint()),false);
 c.draw();c.presentAppliedLogo(c.state.processingResult);h.flush();assert.equal(h.animations.length,1,'neither redraw nor a repeated committed record replays the sequence');
});
