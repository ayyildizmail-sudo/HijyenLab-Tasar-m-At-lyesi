/* CommonJS test harness. */
/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {palette,sample,contrast,eligible,completion}=require('../frontend/customer-theme.js');
test('palette is accessible and does not make pale gold text on white',()=>{
 for(const input of [[],['#ffffff'],['#fff200'],['#ff0000'],['#123456'],['url(bad)']])assert.ok(contrast(palette(input).accent)>=4.5);
 assert.equal(palette(['#fff200','#123456']).accent,'#123456');
 assert.equal(palette(['#fff200']).accent,'#800d2a');
 assert.equal(palette(['#123456']).tint.length,7);
});
test('sampling ignores white substrate, transparency and neutral photo noise',()=>{
 const pixels=new Uint8ClampedArray([255,255,255,255,0,0,255,0,130,130,130,255,24,48,120,255]);
 assert.deepEqual(sample(pixels),['#183078']);
});
test('source and processing invalidation fail closed without writing caller state',()=>{
 const value={logo:'primary',bg:'#ffffff'},session={status:'ready',source:{sha256:'a'.repeat(64)},result:{source:{sha256:'a'.repeat(64)}}};const before=JSON.stringify({value,session});
 assert.equal(eligible(value,session),true);
 for(const field of ['removed','photoLayout','designProcessing','designBlocked','extractionApproximate','screenSelectionRequired','productAssetPending','productAssetFailure'])assert.equal(eligible({...value,[field]:true},session),false,field);
 assert.equal(eligible(value,{...session,status:'cancelled'}),false);
 assert.equal(eligible(value,{...session,source:{sha256:'new'}}),false);
 assert.equal(JSON.stringify({value,session}),before);
});
test('completion depends on current approval, not merely an upload or stale fragrance',()=>{
 assert.deepEqual(completion({approved:false,fragrance:true}),{design:false,fragrance:false,quote:false});
 assert.deepEqual(completion({approved:true,fragrance:true}),{design:true,fragrance:true,quote:false});
 assert.equal(completion({approved:true,blank:true}).design,false);
 assert.equal(completion({approved:true,declared:true}).design,false);
});
test('mounted theme follows current source, approval, cancel and reset without stale colors',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),nodes=new Map(),styles={},callbacks={};let pixels=0,observer;
 function node(id){const attrs={};const n={id,hidden:false,textContent:'',dataset:{},style:{setProperty:(k,v)=>{styles[k]=v;}},setAttribute:(k,v)=>{attrs[k]=v;},hasAttribute:k=>k in attrs,removeAttribute:k=>{delete attrs[k];},after(n){nodes.set(n.id,n);},querySelectorAll:()=>[],getContext:()=>({drawImage(){},getImageData(){pixels++;return {data:new Uint8ClampedArray([24,48,120,255])};}})};nodes.set(id,n);return n;}
 const main=node('main'),progress=node('journeyProgress'),summary=node('summary');summary.hidden=true;
 const steps=['design','fragrance','quote'].map(id=>{const n=node(id);n.dataset.step=id;return n;});progress.querySelectorAll=()=>steps;
 const doc={readyState:'complete',querySelector:()=>main,getElementById:id=>nodes.get(id),createElement:()=>node('new'),addEventListener:(type,fn)=>{callbacks[type]=fn;}};
 const hash='a'.repeat(64);let approved=false;
 const session={operationId:1,designRevision:1,status:'ready',source:{sha256:hash},result:{source:{sha256:hash},method:'native-logo'}};
 const context={document:doc,queueMicrotask:fn=>fn(),addEventListener(){},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},state:{logo:'first',bg:'#ffffff',bgDetection:{kind:'transparent'}},logoImg:{},processingSession:{getState:()=>session,isApproved:()=>approved},designFingerprint:()=> 'current',fragranceReady:()=>true};context.window=context;
 vm.runInNewContext(fs.readFileSync('frontend/customer-theme.js','utf8'),context);
 assert.equal(styles['--customer-accent'],'#183078');assert.equal(pixels,1);assert.equal(steps[0].hasAttribute('data-complete'),false);
 approved=true;context.HijyenLabCustomerTheme.sync();assert.equal(steps[0].hasAttribute('data-complete'),true);assert.equal(nodes.get('customerJourneyNote').textContent,'Tasarım ve koku seçiminiz hazır.');
 context.state.designProcessing=true;session.operationId++;session.status='loading';approved=false;observer();assert.equal(styles['--customer-accent'],'#800d2a');assert.equal(steps[0].hasAttribute('data-complete'),false);
 const previous=pixels;session.status='cancelled';context.state.designProcessing=false;context.HijyenLabCustomerTheme.sync();assert.equal(pixels,previous);assert.equal(styles['--customer-accent'],'#800d2a');
 session.status='ready';session.result.method='photo-region';context.HijyenLabCustomerTheme.sync();assert.equal(pixels,previous,'never sample photos');
 session.result.flatPrintProposal={method:'source-flat-flexo-proposal-v1'};session.designRevision++;approved=true;
 context.approvedFlatPhotoPalette=()=>({colors:['#b01830','#183078']});
 context.HijyenLabCustomerTheme.sync();assert.equal(styles['--customer-accent'],'#183078','uses actual approved pixels, not palette ordering');
 const sampled=pixels;context.HijyenLabCustomerTheme.sync();assert.equal(pixels,sampled,'unchanged source/revision is cached');
 session.status='cancelled';approved=false;context.HijyenLabCustomerTheme.sync();assert.equal(styles['--customer-accent'],'#800d2a');assert.equal(pixels,sampled,'canceled proposal is never sampled');
 context.HijyenLabCustomerTheme.reset();assert.equal(nodes.get('customerJourneyNote').hidden,true);
 assert.equal(context.state.bg,'#ffffff','never changes package ground');
});
test('finite logo reveal survives navigation scroll, not dragging; offscreen never animates',()=>{
 const {create}=require('../frontend/journey-motion.js');const events={},pointer={},animations=[];let top=20;
 const saved={addEventListener:global.addEventListener,innerHeight:global.innerHeight};global.addEventListener=(name,fn)=>{events[name]=fn;};global.innerHeight=800;
 try{
  const packageNode={parentElement:null,getBoundingClientRect:()=>({top,height:150}),closest:()=>null,addEventListener:(name,fn)=>{pointer[name]=fn;},animate(){const a={cancel(){a.canceled=true;a.oncancel?.();}};animations.push(a);return a;}};
  const doc={getElementById:id=>id==='package'?packageNode:null,addEventListener(){},querySelectorAll:()=>[]};
  const api=create(doc,{matches:false,addEventListener(){}});api.logo();events.scroll();assert.equal(animations[0].canceled,undefined);
  pointer.pointermove({buttons:0});assert.equal(animations[0].canceled,undefined);
  pointer.pointermove({buttons:1});assert.equal(animations[0].canceled,true);
  top=900;api.logo();assert.equal(animations.length,1);
  top=-200;api.logo();assert.equal(animations.length,1);
 }finally{if(saved.addEventListener===undefined)delete global.addEventListener;else global.addEventListener=saved.addEventListener;if(saved.innerHeight===undefined)delete global.innerHeight;else global.innerHeight=saved.innerHeight;}
});
test('approved proposal chooses dominant readable exact ink, never bright gold or invented colors',()=>{
 const {rankProposal}=require('../frontend/customer-theme.js');
 const colors=['#183078','#b01830','#f0d818'];
 const pixels=new Uint8ClampedArray([
  ...Array(2).fill([24,48,120,255]).flat(),
  ...Array(8).fill([176,24,48,255]).flat(),
  ...Array(12).fill([240,216,24,255]).flat(),
  255,255,255,255,0,0,0,0
 ]);
 assert.deepEqual(rankProposal(colors,pixels),['#f0d818','#b01830','#183078']);
 assert.equal(palette(rankProposal(colors,pixels)).accent,'#b01830');
 assert.ok(rankProposal(colors,pixels).every(c=>colors.includes(c)));
 assert.deepEqual(colors,['#183078','#b01830','#f0d818'],'does not reorder commercial/source palette');
 assert.equal(palette(rankProposal(['#f0d818'],pixels)).accent,'#800d2a');
});
test('summary accents are card decoration only, never status, prices or image recoloring',()=>{
 const css=require('node:fs').readFileSync('frontend/customer-theme.css','utf8');
 assert.match(css,/#summary>article\{border-top:3px solid var\(--customer-accent\)\}/);
 assert.match(css,/#summary #journeyQuoteDescription\{border-bottom:1px solid var\(--customer-accent\);padding-bottom:12px\}/);
 const summaryRules=css.split('\n').filter(line=>line.startsWith('#summary'));
 assert.equal(summaryRules.length,2);
 assert.ok(summaryRules.every(line=>!/(?:\.notice|priceRow|journeyQuoteCosts|quoteImage|finalImage|filter:|background:|[^-]color:)/.test(line)));
});
