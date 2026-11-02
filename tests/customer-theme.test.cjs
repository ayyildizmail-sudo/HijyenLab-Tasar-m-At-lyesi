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
test('dominant pale brand colors remain visible as decoration, not text or invented ink',()=>{
 const colors=['#fff200','#123456'],before=colors.slice(),theme=palette(colors);
 assert.equal(theme.decoration,'#fff200');assert.equal(theme.accent,'#123456');assert.equal(theme.personalized,true);
 assert.equal(palette(['#fff200']).decoration,'#fff200');assert.equal(palette(['#fff200']).accent,'#800d2a');
 for(const input of [[],['#ffffff'],['url(bad)']])assert.equal(palette(input).personalized,false);
 assert.deepEqual(colors,before,'does not mutate the source palette');
});
test('theme text meets AA on white, actual app ground and generated tint across RGB samples',()=>{
 for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17){
  const color='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''),theme=palette([color]);
  assert.ok(contrast(theme.onDecoration,theme.decoration)>=4.5,`${color} readable primary action`);
  for(const bg of ['#ffffff','#f5f7fa',theme.tint])assert.ok(contrast(theme.accent,bg)>=4.5,`${color} text on ${bg}`);
  for(const text of ['#142d49','#34485f'])assert.ok(contrast(text,theme.tint)>=4.5,`${color} neutral card text ${text}`);
 }
});
test('card wash is visibly source-derived without changing the decoration or printing palette',()=>{
 const input=['#183078','#f0d818'],before=input.slice(),theme=palette(input);
 assert.equal(theme.tint,'#dfe2ec');
 assert.equal(theme.decoration,input[0]);assert.deepEqual(input,before);
 assert.notEqual(theme.tint,palette(['#b01830']).tint);
 assert.equal(palette(['#fff200']).tint,'#fffddb');
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
 const vm=require('node:vm'),fs=require('node:fs'),nodes=new Map(),styles={},callbacks={};let pixels=0,observer,pixelData=[24,48,120,255],pixelsUnavailable=false,printMode='printed';
 function node(id){const attrs={};const n={id,hidden:false,textContent:'',dataset:{},style:{setProperty:(k,v)=>{styles[k]=v;}},setAttribute:(k,v)=>{attrs[k]=v;},hasAttribute:k=>k in attrs,removeAttribute:k=>{delete attrs[k];},after(n){nodes.set(n.id,n);},querySelectorAll:()=>[],getContext:()=>({drawImage(){},getImageData(){pixels++;if(pixelsUnavailable)throw Error('unavailable');return {data:new Uint8ClampedArray(pixelData)};}})};nodes.set(id,n);return n;}
 const main=node('main'),progress=node('journeyProgress'),summary=node('summary');summary.hidden=true;
 const steps=['design','fragrance','quote'].map(id=>{const n=node(id);n.dataset.step=id;return n;});progress.querySelectorAll=()=>steps;
 const doc={readyState:'complete',querySelector:()=>main,getElementById:id=>nodes.get(id),createElement:()=>node('new'),addEventListener:(type,fn)=>{callbacks[type]=fn;}};
 const hash='a'.repeat(64);let approved=false;
 const session={operationId:1,designRevision:1,status:'ready',source:{sha256:hash},result:{source:{sha256:hash},method:'native-logo'}};
 const context={document:doc,queueMicrotask:fn=>fn(),addEventListener(){},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},state:{logo:'first',bg:'#ffffff',bgDetection:{kind:'transparent'}},logoImg:{},processingSession:{getState:()=>session,isApproved:()=>approved},designFingerprint:()=> 'current',fragranceReady:()=>true,HijyenLabPrintMode:{get:()=>printMode}};context.window=context;
 vm.runInNewContext(fs.readFileSync('frontend/customer-theme.js','utf8'),context);
 assert.equal(styles['--customer-accent'],'#183078');assert.equal(pixels,1);assert.equal(steps[0].hasAttribute('data-complete'),false);
 assert.equal(styles['--customer-decoration'],'#183078');assert.equal(styles['--customer-tint'],'#dfe2ec');assert.equal(main.hasAttribute('data-customer-theme'),true);
 approved=true;context.HijyenLabCustomerTheme.sync();assert.equal(steps[0].hasAttribute('data-complete'),true);assert.equal(nodes.get('customerJourneyNote').textContent,'Tasarım ve koku seçiminiz hazır.');
 context.state.designProcessing=true;session.operationId++;session.status='loading';approved=false;observer();assert.equal(styles['--customer-accent'],'#800d2a');assert.equal(styles['--customer-tint'],palette([]).tint);assert.equal(steps[0].hasAttribute('data-complete'),false);
 assert.equal(main.hasAttribute('data-customer-theme'),false,'new loading source clears personalized decoration');
 const previous=pixels;session.status='cancelled';context.state.designProcessing=false;context.HijyenLabCustomerTheme.sync();assert.equal(pixels,previous);assert.equal(styles['--customer-accent'],'#800d2a');
 session.status='ready';session.result.method='photo-region';context.HijyenLabCustomerTheme.sync();assert.equal(pixels,previous,'never sample photos');
 session.result.flatPrintProposal={method:'source-flat-flexo-proposal-v1'};session.designRevision++;approved=true;
 context.approvedFlatPhotoPalette=()=>({colors:['#b01830','#183078']});
 context.HijyenLabCustomerTheme.sync();assert.equal(styles['--customer-accent'],'#183078','uses actual approved pixels, not palette ordering');
 session.result.method='source-independent-emblem-proposal-v1';session.designRevision++;context.HijyenLabCustomerTheme.sync();assert.equal(styles['--customer-decoration'],'#183078','independent emblem uses verified approved palette');
 const sampled=pixels;context.HijyenLabCustomerTheme.sync();assert.equal(pixels,sampled,'unchanged source/revision is cached');
 session.status='cancelled';approved=false;context.HijyenLabCustomerTheme.sync();assert.equal(styles['--customer-accent'],'#800d2a');assert.equal(pixels,sampled,'canceled proposal is never sampled');
 context.HijyenLabCustomerTheme.reset();assert.equal(nodes.get('customerJourneyNote').hidden,true);
 assert.equal(main.hasAttribute('data-customer-theme'),false);
 session.status='ready';session.result.method='native-logo';delete session.result.flatPrintProposal;context.state.bgDetection.kind='color';pixelData=[240,216,24,255];session.operationId++;
 context.HijyenLabCustomerTheme.sync();assert.equal(styles['--customer-decoration'],'#f0d818','bounded colored native artwork also decorates the UI');assert.equal(styles['--customer-accent'],'#800d2a','pale source is never used for text');assert.equal(main.hasAttribute('data-customer-theme'),true);
 printMode='unprinted';context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),false);
 printMode='printed';context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),true);
 context.state.quoteSource='customer-declared';context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),false);
 context.state.quoteSource='uploaded-artwork';context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),true);
 context.state.bgDetection.kind='ambiguous';context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),false,'ambiguous source is not sampled');
 context.state.bgDetection.kind='transparent';pixelsUnavailable=true;context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),false,'unreadable pixels keep the default UI');
 pixelsUnavailable=false;session.designRevision++;context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),true,'later valid source can recover');
 context.state.removed=true;context.HijyenLabCustomerTheme.sync();assert.equal(main.hasAttribute('data-customer-theme'),false,'removing artwork removes personalization');
 assert.equal(context.state.bg,'#ffffff','never changes package ground');
});
test('finite logo-only reveal cancels fixed-overlay scroll and dragging; hover is stable and offscreen never animates',()=>{
 const {create}=require('../frontend/journey-motion.js'),{create:createLogoSettle}=require('../frontend/logo-settle.js');const events={},pointer={},animations=[],queued=[];let top=20;
 const saved={addEventListener:global.addEventListener,innerHeight:global.innerHeight,HijyenLabLogoSettle:global.HijyenLabLogoSettle};
 const listen=(name,fn)=>{(events[name]??=[]).push(fn);};global.addEventListener=listen;global.innerHeight=800;
 try{
  const node=tag=>({tagName:tag.toUpperCase(),style:{},children:[],width:1600,height:850,closest:()=>null,setAttribute(){},append(...items){this.children.push(...items);for(const item of items)item.parentElement=this;},remove(){this.parentElement.children=this.parentElement.children.filter(item=>item!==this);},getContext:()=>({drawImage(){}}),animate(frames,options){const a={frames,options,node:this,cancel(){a.canceled=true;a.oncancel?.();}};animations.push(a);return a;}});
  const packageNode=node('canvas');packageNode.style.opacity='';packageNode.getBoundingClientRect=()=>({left:10,top,width:400,height:212.5});packageNode.addEventListener=(name,fn)=>{pointer[name]=fn;};
  const body=node('body');body.append(packageNode);const doc={body,activeElement:body,getElementById:id=>id==='package'?packageNode:null,createElement:node,addEventListener:listen,querySelectorAll:()=>[]};
  const media={matches:false,addEventListener(){}};const settle=createLogoSettle(doc,media,{innerHeight:800,queueMicrotask:fn=>queued.push(fn),addEventListener:listen});global.HijyenLabLogoSettle=settle;
  const api=create(doc,media),data={canvas:packageNode,asset:{},printed:{},plan:{drawRect:{x:-200,y:-70,width:400,height:140},rotation:0},x:800,y:425,area:{left:280,right:1320,top:210,bottom:640}};
  function apply(token){api.logo({token,current:()=>true,render(){settle.beforeDraw();settle.capture(data);}});while(queued.length)queued.shift()();}
  apply('first');assert.equal(animations.length,1);assert.notEqual(animations[0].node,packageNode,'only copied logo layer animates');assert.equal(animations[0].options.iterations,1);assert.equal(animations[0].options.duration,780);
  for(const fn of events.scroll)fn();assert.equal(animations[0].canceled,true,'fixed-position overlay must disappear during scrolling');assert.equal(packageNode.style.opacity,'');
  apply('second');pointer.pointermove({buttons:0});assert.equal(animations[1].canceled,undefined,'hover does not interrupt');
  pointer.pointermove({buttons:1});assert.equal(animations[1].canceled,true,'drag cancels before coordinate mapping');assert.equal(packageNode.style.opacity,'');
  top=900;apply('below');assert.equal(animations.length,2);
  top=-300;apply('above');assert.equal(animations.length,2);
  top=20;apply('second');assert.equal(animations.length,2,'same applied source never replays after cancellation');
 }finally{for(const key of Object.keys(saved)){if(saved[key]===undefined)delete global[key];else global[key]=saved[key];}}
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
test('working frames are visible source-colored screen decoration, never canvas or layout changes',()=>{
 const css=require('node:fs').readFileSync('frontend/customer-theme.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const rule=css.match(/\.atelierLayout\[data-customer-theme\] :is\(#design \.preview,#rearPreview \.rearFlipScene\)\{([^}]+)\}/)?.[1];
 assert.ok(rule,'frame is limited to the front and rear working containers');
 assert.match(rule,/outline:3px solid var\(--customer-decoration\)/);
 assert.match(rule,/box-shadow:0 0 0 4px #142d4929/,'pale source hues keep a visible neutral outer hairline');
 assert.ok(!/background|padding|margin|width|height|position|transform|filter/.test(rule),'white working ground, artwork geometry and coordinates are untouched');
 assert.ok(!css.includes('52px'),'the rejected tiny heading marker is gone');
 const screen=css.indexOf('@media screen{');
 for(const match of css.matchAll(/\.atelierLayout\[data-customer-theme\]/g))assert.ok(match.index>screen,'all new personalized paint is screen-only and current-source gated');
});
test('logo tint follows selected product, completed progress, lead and quote-summary cards only',()=>{
 const css=require('node:fs').readFileSync('frontend/customer-theme.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const rules=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.atelierLayout[data-customer-theme]'));
 const tinted=rules.filter(line=>line.includes('background:var(--customer-tint)'));
 assert.equal(tinted.length,4,'not every panel gets a colored fill');
 for(const selector of ['#journeyProductSummary','#journeyProgress li:is([aria-current=step],[data-complete=true])','#leadFields{','#summary #journeyQuoteDescription'])assert.ok(tinted.some(rule=>rule.includes(selector)),selector);
 assert.match(css,/#journeyProductMode\{color:#34485f\}/);
 assert.match(css,/#leadFields>\.hint\{color:#34485f\}/);
 assert.match(css,/#summary #journeyQuoteDescription\{[^}]*color:#34485f/);
 assert.match(css,/#summary>article\{border-color:var\(--customer-decoration\);box-shadow:inset 0 3px 0 var\(--customer-decoration\)\}/);
 assert.ok(rules.every(line=>!/(?:canvas|contact|notice|actionHelp|priceRow|journeyQuoteCosts|quoteImage|finalImage|fragranceCard|company|::after|filter:)/.test(line)),'company, artwork, costs, semantic messages, fragrance cards, contacts and rear completion remain untouched');
 assert.ok(rules.every(line=>!/(?:padding|margin|width|height|position|transform):/.test(line)),'no layout, input or navigation geometry changes');
});

test('fragrance cards keep fixed flower-pink, leaf-green, mandarin and lemon palettes outside the customer theme',()=>{
 const fs=require('node:fs'),css=fs.readFileSync('frontend/style.css','utf8'),theme=fs.readFileSync('frontend/customer-theme.css','utf8');
 const rule=selector=>{const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return css.match(new RegExp(escaped+'\\{([^}]+)\\}'))?.[1]||'';};
 const expected={
  flambau:['#fff0f6','#df8eb1','#9d2459','#ffe2ee'],
  green_tea:['#edf8e8','#80b66a','#316523','#daf0ce'],
  bodrum_mandarin:['#fff5e9','#e5b16f','#ad570d','#fff0d8'],
  lemon:['#fffbe4','#dbc96c','#8c7412','#fff5bd'],
 };
 function luminance(hex){const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
 function ratio(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}
 for(const [id,colors]of Object.entries(expected)){
  const paletteRule=rule(`#fragranceCards .fragranceCard:has(input[value=${id}])`);
  ['tint','border','active','selected'].forEach((key,index)=>assert.ok(paletteRule.includes(`--fragrance-${key}:${colors[index]}`),`${id} ${key}`));
  for(const bg of [colors[0],colors[3]]){
   assert.ok(ratio('#182e4e',bg)>=4.5,`${id}: readable dark label`);
   assert.ok(ratio(colors[2],bg)>=3,`${id}: visible selected outline/radio`);
   assert.ok(ratio('#183153',bg)>=3,`${id}: visible keyboard focus`);
  }
 }
 const cardRules=css.split('\n').filter(line=>line.includes('.fragranceCard'));
 assert.ok(cardRules.every(line=>!line.includes('--customer-')),'logo-derived hue cannot recolor cards');
 assert.ok(!theme.replace(/\/\*[\s\S]*?\*\//g,'').includes('.fragranceCard'),'customer theme leaves semantic cards alone');
 assert.match(rule('#fragranceCards .fragranceCard'),/background:var\(--fragrance-tint\);color:#182e4e/);
 assert.match(rule('.fragranceRecommendation'),/color:var\(--fragrance-active\);background:var\(--fragrance-selected\)/,'recommendation badge follows its semantic palette');
});

test('fragrance selection and keyboard focus remain visible without relying on card hue alone',()=>{
 const fs=require('node:fs'),css=fs.readFileSync('frontend/style.css','utf8'),ui=fs.readFileSync('frontend/fragrance-ui.js','utf8');
 assert.match(css,/#fragranceCards \.fragranceCard:has\(input:checked\)\{[^}]*box-shadow:0 0 0 1px var\(--fragrance-active\)/);
 assert.match(css,/#fragranceCards \.fragranceCard:focus-within\{outline:3px solid #183153;outline-offset:3px\}/);
 assert.match(css,/\.fragranceCard input\{[^}]*accent-color:var\(--fragrance-active\)/);
 assert.ok(!css.split('\n').filter(line=>line.includes('.fragranceCard')).some(line=>/appearance:none|outline:none|display:none/.test(line)),'native checked dot and focus remain available');
 assert.ok(ui.includes("radio.type='radio';radio.name='fragrance';radio.value=item.id"),'native grouped radio controls remain the selection mechanism');
 assert.match(css,/@media\(max-width:560px\)\{\.fragranceCards\{grid-template-columns:1fr;gap:10px\}/,'existing mobile stack stays intact');
});

test('source-colored primary actions are visible and contrast-safe without recoloring scents',()=>{
 const css=require('node:fs').readFileSync('frontend/customer-theme.css','utf8');
 assert.match(css,/button\.primary\{background:var\(--customer-decoration\);color:var\(--customer-on-decoration\)/);
 assert.match(css,/button\.primary:focus-visible\{outline:3px solid var\(--customer-accent\)/);
 for(const color of ['#fff200','#183078','#f01818','#222222','#999999'])assert(contrast(palette([color]).onDecoration,color)>=4.5);
});
