'use strict';
// CommonJS test runner loads Node built-ins synchronously for the isolated VM harness.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { module: { exports: {} } }; const source = fs.readFileSync('frontend/customer-focus.js', 'utf8'); vm.runInNewContext(source, context);
const { priceChange, primaryId } = context.module.exports;
const white = { product: 'BM12', ground: 'white', minimum: 5200, unit: 290 }, colored = { ...white, ground: 'colored', minimum: 10000, unit: 330 };
assert.equal(priceChange(null, white), ''); assert.equal(priceChange(white, white), '');
assert.match(priceChange(white, colored), /Renkli.*10.000.*3,30 TL.*KDV hariç/);
assert.match(priceChange(colored, white), /Beyaz.*5.200.*2,90 TL/);
assert.match(priceChange(white, { ...white, product: 'BM15', minimum: 5000, unit: 250 }), /Ürün seçimi.*5.000.*2,50 TL/);
assert.match(priceChange(white, colored), /Klişe ve kargo ayrıca/);
assert.equal(primaryId({stage:'design'}), 'focusUpload');
assert.equal(primaryId({stage:'design',hasDesign:true}), 'next');
assert.equal(primaryId({stage:'design',hasDesign:true,blocked:true}), 'focusUpload');
assert.equal(primaryId({stage:'design',hasDesign:true,blocked:true,inkReview:true}), 'approveInk');
assert.equal(primaryId({stage:'design',hasDesign:true,productReview:true}), 'approveProductLayout');
assert.equal(primaryId({stage:'design',productReview:true,productRetry:true}), 'retryProductAsset');
assert.equal(primaryId({stage:'rearPreview',rearEmpty:true}), 'skipEmptyRear');
assert.equal(primaryId({stage:'rearPreview',rearEmpty:false}), 'rearToPrice');
assert.equal(primaryId({stage:'rearPreview',sponsorReview:true}), 'acceptRearSponsor');
for (const [stage,id] of [['pricing','review'],['summary','discussDesign'],['fragrancePanel','fragranceContinue'],['photoEditor','confirmPhoto'],['whiteCarrierPanel','acceptWhiteCarrier']]) assert.equal(primaryId({stage}),id);
assert(!/fetch\(|localStorage|sessionStorage/.test(source));
assert(source.includes('if (!event.isTrusted || changePending) return;'));
console.log('PASS customer focus: readiness/reapproval/retry/back choices; exact tariff-delta explanations, initial/repeated suppression, unknown is not zero.');

// DOM-level integration: real mount, event capture and existing-node preservation.
class Node {
  constructor(tag) { this.tagName=tag.toUpperCase(); this.children=[]; this.parentElement=null; this.dataset={}; this.attrs={}; this.hidden=false; this.open=false; this.value=''; this.textContent=''; this.className=''; this.writes=0; this.classList={toggle:(name,on)=>{const s=new Set(this.className.split(' ').filter(Boolean));if(on)s.add(name);else s.delete(name);this.className=[...s].join(' ');},contains:name=>this.className.split(' ').includes(name)}; }
  append(...nodes) { for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);} }
  before(n){const p=this.parentElement;if(!p)return;p.children.splice(p.children.indexOf(this),0,n);n.parentElement=p;}
  after(n){const p=this.parentElement;if(!p)return;p.children.splice(p.children.indexOf(this)+1,0,n);n.parentElement=p;}
  addEventListener(type,fn){(this.listeners??={})[type]=fn;}
  setAttribute(k,v){this.attrs[k]=v;}
  matches(s){return s==='[hidden]'?this.hidden:s==='[data-focus-action]'?!!this.dataset.focusAction:s.startsWith('.')?this.classList.contains(s.slice(1)):this.tagName===s.toUpperCase();}
  closest(s){if(this.matches(s))return this;return this.parentElement?.closest(s)||null;}
  querySelectorAll(s){const out=[];for(const n of this.children){if(n.matches(s))out.push(n);out.push(...n.querySelectorAll(s));}return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
}
const main=new Node('main'), nodes={},events={},tasks=[],microtasks=[]; let sync;
function add(id,tag='div',parent=main){const n=new Node(tag);n.id=id;nodes[id]=n;parent.append(n);return n;}
for(const id of ['design','summary','pricing','fragrancePanel','whiteCarrierPanel','photoEditor','pdfPicker','rearPreview'])add(id,'section').hidden=id!=='design';
add('journeyProgress');const action=add('actions','div',nodes.design);action.className='simplePrimary';const upload=add('uploadLabel','label',action);upload.className='primary';
for(const id of ['next','approveInk','approveProductLayout','retryProductAsset']){const n=add(id,'button',nodes.design);n.className='primary';n.hidden=id!=='next';}
for(const id of ['skipEmptyRear','rearToPrice']){const n=add(id,'button',nodes.rearPreview);n.className='primary';}
const editor=add('rearEditor','details',nodes.rearPreview);editor.open=true;
const sponsor=add('sponsorOptions','details',editor);sponsor.open=true;
add('sponsorSummary','summary',sponsor);add('rearSponsorUpload','input',sponsor);add('rearSponsorName','p',sponsor);
const sponsorReview=add('rearSponsorReview','div',sponsor);sponsorReview.hidden=true;add('acceptRearSponsor','button',sponsorReview).className='primary';add('rearSponsorWarning','p',sponsor).hidden=true;
const qrLabel=add('qrLabel','label',editor);const qr=add('rearQrEnabled','input',qrLabel);qr.checked=false;const qrFields=add('rearQrFields','div',editor);qrFields.hidden=true;const qrUrl=add('rearQrUrl','input',qrFields);qrUrl.value='https://example.test/menu';add('rearEditorError','p',editor).hidden=true;
for(const prefix of ['bg','text']){const label=add(prefix+'Label','label',nodes.design);add(prefix+'Pantone','input',label);add(prefix+'PantoneResult','div',nodes.design);}
const detail=add('simpleDetails','details',nodes.design);add('simpleSummary','summary',detail);
const doc={readyState:'complete',createElement:t=>new Node(t),getElementById:id=>[main,...main.querySelectorAll('*')].find(n=>n.id===id)||find(main,id),querySelector:s=>s==='main'?main:s==='.simplePrimary label'?upload:null,addEventListener:(type,fn,capture)=>{assert.equal(capture,true);(events[type]??=[]).push(fn);}};
function find(n,id){if(n.id===id)return n;for(const c of n.children){const found=find(c,id);if(found)return found;}return null;}
let rules={product:'BM12',minimum:{white:5200,colored:10000},whiteUnitKurus:290,coloredUnitKurus:330};let ground='#ffffff',blocked=false;
const state={logo:null,photoLayout:null,photoQuoteBg:'white',bgPantone:''};
Object.defineProperty(state,'bg',{get:()=>ground,set:value=>{ground=value;}});
let printMode='printed';const modeEvents={};
const browser={document:doc,HijyenLabPrintMode:{get:()=>printMode},addEventListener:(name,fn)=>{modeEvents[name]=fn;},queueMicrotask:fn=>microtasks.push(fn),setTimeout:fn=>tasks.push(fn),MutationObserver:class{constructor(fn){sync=fn;}observe(){}}};
const actualGroundFunction=fs.readFileSync('frontend/app.js','utf8').split('\n').find(line=>line.startsWith('function effectiveBackground()'));
assert(actualGroundFunction,'real application ground resolver available');
vm.runInNewContext(actualGroundFunction+'\n'+source,{window:browser,state,productRules:()=>rules,isUnprinted:()=>printMode==='unprinted',designIssue:()=>blocked});
const get=id=>doc.getElementById(id), primary=id=>assert(get(id).classList.contains('focusPrimary'),id+' should be primary');
assert.equal(get('commercialChange').textContent,'');assert.equal(get('commercialChange').attrs['aria-live'],'polite');
let chooserOpens=0,prevented=0;const fileInput=add('unifiedUpload','input');fileInput.click=()=>chooserOpens++;assert.equal(upload.attrs.role,'button');assert.equal(upload.tabIndex,0);for(const key of ['Enter',' '])upload.listeners.keydown({key,preventDefault:()=>prevented++});assert.equal(chooserOpens,2);assert.equal(prevented,2);
primary('focusUpload');const count=main.children.length;browser.HijyenLabCustomerFocus.mount(doc);assert.equal(main.children.length,count);assert.equal(events.click.length,1);
state.logo='data:image/png;fixture';sync();primary('next');assert(!upload.classList.contains('focusPrimary'));
blocked=true;nodes.approveInk.hidden=false;sync();primary('approveInk');nodes.approveInk.hidden=true;nodes.approveProductLayout.hidden=false;sync();primary('approveProductLayout');nodes.retryProductAsset.hidden=false;sync();primary('retryProductAsset');
nodes.retryProductAsset.hidden=true;nodes.approveProductLayout.hidden=true;blocked=false;sync();primary('next');
nodes.design.hidden=true;nodes.rearPreview.hidden=false;sync();primary('skipEmptyRear');nodes.skipEmptyRear.hidden=true;sync();primary('rearToPrice');
sponsorReview.hidden=false;sync();primary('acceptRearSponsor');assert.equal(get('rearAdvancedOptions').open,true);sponsorReview.hidden=true;sync();primary('rearToPrice');
nodes.rearPreview.hidden=true;nodes.design.hidden=false;sync();primary('next');
assert.equal(get('rearQrUrl'),qrUrl);assert.equal(qrUrl.value,'https://example.test/menu');assert.equal(get('rearQrEnabled'),qr);assert.equal(qr.checked,false);assert.equal(nodes.bgPantone.closest('details').id,'bgPantoneOptions');
nodes.bgPantone.value='186 C';sync();assert.equal(get('bgPantoneOptions').open,true);assert.match(get('bgPantoneOptions').querySelector('summary').textContent,/Kullanılıyor/);get('bgPantoneOptions').open=false;sync();assert.equal(get('bgPantoneOptions').open,false,'explicitly collapsed used controls remain collapsed');
qr.checked=true;sync();assert.equal(get('rearAdvancedOptions').open,true);assert.match(get('rearAdvancedOptions').querySelector('summary').textContent,/Kullanılıyor/);
const advanced=get('rearAdvancedOptions');advanced.open=false;sponsor.open=false;editor.open=false;
nodes.rearSponsorWarning.textContent='Yeni kontrast uyarısı';nodes.rearSponsorWarning.hidden=false;sync();
assert(advanced.open&&sponsor.open&&editor.open,'late recovery reopens nested groups even when already used');
advanced.open=false;sponsor.open=false;editor.open=false;sync();assert.equal(advanced.open,false,'unchanged warning respects manual collapse');assert.equal(sponsor.open,false);assert.equal(editor.open,false);
sponsorReview.hidden=false;sync();assert(advanced.open&&sponsor.open&&editor.open,'new review reopens recovery after collapse');
sponsorReview.hidden=true;nodes.rearSponsorWarning.hidden=true;sync();
const note=get('commercialChange');let noteValue=note.textContent,noteWrites=0;Object.defineProperty(note,'textContent',{get:()=>noteValue,set:value=>{noteWrites++;noteValue=value;}});
function flushTasks(){while(tasks.length)tasks.shift()();}
function event(type,change=()=>{},trusted=true,flush=true){for(const fn of events[type]){fn({isTrusted:trusted});while(microtasks.length)microtasks.shift()();}change();if(flush)flushTasks();}
event('change',()=>{ground='#102f59';});assert.match(note.textContent,/10.000.*3,30 TL/);assert.equal(noteWrites,1);
event('change');sync();assert.equal(noteWrites,1,'repeat and observer do not reannounce');
event('change',()=>{rules={product:'BM15',minimum:{white:5000,colored:10000},whiteUnitKurus:250,coloredUnitKurus:300};});assert.match(note.textContent,/Ürün seçimi.*3,00 TL/);assert.equal(noteWrites,2);
event('click',()=>{ground='#ffffff';},false);assert.equal(noteWrites,2,'synthetic change is not announced');
event('input',()=>{state.photoLayout='fixture';state.photoQuoteBg='unknown';});assert.equal(note.textContent,'','unknown commercial basis clears stale announcement');
state.photoLayout=null;state.photoQuoteBg='white';ground='#ffffff';
const writesBeforeCoalescing=noteWrites;
event('input',()=>{ground='#102f59';},true,false);assert.equal(tasks.length,1);assert.equal(noteWrites,writesBeforeCoalescing,'capture checkpoint cannot announce before target');
event('change',()=>{},true,false);assert.equal(tasks.length,1,'input/change share one macrotask');flushTasks();
assert.match(note.textContent,/Renkli.*10.000.*3,00 TL/,'coalesced change retains initial white basis');assert.equal(noteWrites,writesBeforeCoalescing+1);
event('change');assert.equal(noteWrites,writesBeforeCoalescing+1);
// Async source acceptance changes ground after the click timer has already run.
// This reproduced on live V52: coloured notice survived a white carrier acceptance.
for (const transition of ['white-carrier-accept', 'white-flat-logo-upload', 'reset', 'draft-restore']) {
  ground='#ffffff'; sync();
  event('change',()=>{ground='#102f59';});
  assert.match(note.textContent,/Renkli.*10.000/);
  event('click'); // asynchronous decode/accept has not completed at this checkpoint
  ground='#ffffff';
  sync(); // real refresh/visibility observer after decode
  assert.equal(note.textContent,'',transition+' must discard the obsolete coloured-price notice');
}
// Quote invalidation also synchronizes the notice without waiting for DOM mutations.
ground='#ffffff';sync();event('change',()=>{ground='#102f59';});
ground='#ffffff';modeEvents['hijyenlab:quote-state']();assert.equal(note.textContent,'');
// Silent asynchronous data changes must not create a new announcement or infer colour.
ground='#faf7e8';sync();assert.equal(note.textContent,'');
event('change',()=>{ground='#ffffff';});assert.match(note.textContent,/Beyaz/);
ground='#faf7e8';sync();assert.equal(note.textContent,'','explicit pale colour is not relabelled white');
console.log('PASS customer focus DOM mount: idempotency; upload/ready/reapproval/retry/rear/back; preserved advanced values and restored discovery; trusted capture/macrotask changes and input/change coalescing; no initial/repeat announcements; unknown clears notice.');

assert.equal(primaryId({stage:'design',unprinted:true,hasDesign:false}), 'next');
assert.equal(primaryId({stage:'design',unprinted:true,productRetry:true}), 'retryProductAsset');
state.logo=null;blocked=false;nodes.approveInk.hidden=true;nodes.approveProductLayout.hidden=true;nodes.retryProductAsset.hidden=true;printMode='unprinted';modeEvents['hijyenlab:print-mode-change']();primary('next');assert(!upload.classList.contains('focusPrimary'));
printMode='printed';modeEvents['hijyenlab:print-mode-change']();primary('focusUpload');state.logo='fixture';blocked=true;nodes.approveInk.hidden=false;modeEvents['hijyenlab:print-mode-change']();primary('approveInk');
console.log('PASS customer focus explicit mode gives blank unprinted continuation without weakening printed upload/reapproval guards.');
