'use strict';
// CommonJS VM harness follows the existing test runner.
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
function load(path) { const context = { module: { exports: {} } }; vm.runInNewContext(fs.readFileSync(path, 'utf8'), context); return context.module.exports; }
const source = fs.readFileSync('frontend/persona-ux.js', 'utf8');
const api = load('frontend/persona-ux.js'), catalog = load('frontend/product-catalog.js');
for (const [id, min, carton] of [['BM12','5.200','400'], ['BM15','5.000','500'], ['BM545','5.000','625']]) {
  const product = catalog.get(id);
  assert.match(api.minimumCopy(product, 'printed', 'white'), new RegExp(min + ' adet'));
  assert.match(api.minimumCopy(product, 'printed', 'colored'), /10.000 adet/);
  assert.match(api.minimumCopy(product, 'printed', 'unknown'), new RegExp(min + ', renkli zeminde 10.000'));
  assert.match(api.minimumCopy(product, 'unprinted', 'colored'), new RegExp('En az 1 koli ve tam koli katları.*' + carton));
  const printed = api.productFacts(product, 'printed').join(' '), blank = api.productFacts(product, 'unprinted').join(' ');
  assert(printed.includes(product.towelDimensions.join(' × ')));
  assert.match(printed, /Bu ölçü ambalaj ölçüsü değildir/);
  assert.match(printed, /Kokuyu tasarım kontrolünden sonra seçersiniz/);
  assert.match(printed, /baskıya hazır dosya değildir/);
  assert.match(blank, /Beyaz, baskısız ambalaj · Flambau koku sabit/);
  assert(!/TL|₺|sertifika|raf ömrü|teslim süresi/.test(printed + blank));
}
const wipe=catalog.get('BM21');assert.match(api.productFacts(wipe,'printed').join(' '),/Ambalaj: 7 × 12 cm/);assert.match(api.productFacts(wipe,'unprinted').join(' '),/Yeşil çay koku sabit/);assert(!api.productFacts(wipe,'printed').join(' ').includes('Açılmış havlu'));
const context = { seen: false, consented: false, hasRestore: false, mode: 'printed', designVisible: true };
assert.equal(api.draftPromptEligible({}, context), false);
assert.equal(api.draftPromptEligible({ text: 'name', sourcePhoto: 'pending' }, context), false);
assert.equal(api.draftPromptEligible({ logo: 'image' }, context), true);
assert.equal(api.draftPromptEligible({ photoLayout: {} }, context), true);
for (const key of ['designProcessing','designBlocked','productAssetPending','productAssetFailure','screenSelectionRequired']) assert.equal(api.draftPromptEligible({logo:'image',[key]:true},context),false,key);
for (const change of [{seen:true},{consented:true},{hasRestore:true},{mode:'unprinted'},{designVisible:false}]) assert.equal(api.draftPromptEligible({logo:'image'},{...context,...change}),false);
// Real mount in a small DOM harness, including moving existing controls and repeated syncs.
class Node {
  constructor(tag) { this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.textContent='';this.hidden=false;this.open=false;this.attrs={};this.moves=0; }
  detach() { if(this.parentElement) { const a=this.parentElement.children;a.splice(a.indexOf(this),1); } }
  append(...nodes) { for(const n of nodes){n.detach();n.parentElement=this;this.children.push(n);n.moves++;} }
  before(n) { const p=this.parentElement;n.detach();n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);n.moves++; }
  after(n) { const p=this.parentElement;n.detach();n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);n.moves++; }
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k]??null;}
  get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
  focus(){this.focused=true;}
  click(){this.onclick?.();}
  addEventListener(name,fn){this['on'+name]=fn;}
}
const main=new Node('main'), nodes={}, events={}; let sync, observers=0, mode='printed';
function add(id,tag='div',parent=main){const n=new Node(tag);n.id=id;nodes[id]=n;parent.append(n);return n;}
function find(node,id){if(node.id===id)return node;for(const child of node.children){const n=find(child,id);if(n)return n;}return null;}
const picker=add('picker'),design=add('design'),visual=add('visual','div',design),preview=add('preview','div',visual),action=add('actions','div',visual),upload=add('upload','label',action);upload.attrs.for='unifiedUpload';const next=add('next','button',action),hint=add('welcomeUploadHint','p',visual);add('simpleDetails','details',visual);
const draft=add('welcomeDraftOptions','details'),consent=add('draftConsent','input',draft),restore=add('restoreDraft','button',draft);consent.checked=false;restore.hidden=true;
const sharing=add('sharing'),contact=add('contactWhatsApp','button');let helpCalls=0;contact.onclick=()=>helpCalls++;
const doc={readyState:'complete',createElement:tag=>new Node(tag),getElementById:id=>find(main,id),querySelector:s=>({'main':main,'.productPicker':picker,'.simplePrimary':action,'.preview':preview,'#summaryDiscussion .hint':sharing}[s]||null),addEventListener:(name,fn)=>{(events[name]??=[]).push(fn);}};
const state={bg:'#ffffff',bgPantone:''}, browser={document:doc,ProductCatalog:catalog,DeclaredQuote:require('../frontend/declared-quote.js'),selectedProductId:'BM12',HijyenLabPrintMode:{get:()=>mode},HijyenLabWelcome:{isOpening:(v,visible,blank)=>visible&&!blank&&!v.logo&&!v.photoLayout&&!v.designProcessing&&!v.designBlocked&&!v.sourcePhoto&&!v.screenSelectionRequired},addEventListener:(name,fn)=>{events[name]=[fn];},MutationObserver:class{constructor(fn){sync=fn;observers++;}observe(){}}};
const actualGroundFunction=fs.readFileSync('frontend/app.js','utf8').split('\n').find(line=>line.startsWith('function effectiveBackground()'));
vm.runInNewContext(actualGroundFunction+'\n'+source,{window:browser,state,isUnprinted:()=>mode==='unprinted',isDeclaredQuote:()=>state.quoteSource==='customer-declared'});
const get=id=>doc.getElementById(id),at=n=>visual.children.indexOf(n);
state.bg='#FFFFFF';sync();assert.match(get('personaMinimum').textContent,/Beyaz.*5.200/,'uppercase white renders the white minimum in the mounted UI');
state.bg='#F5F6FA';sync();assert.match(get('personaMinimum').textContent,/Renkli.*10.000/,'explicit pale grey retains coloured tariff');
state.bg='#ffffff';sync();assert.match(get('personaMinimum').textContent,/Beyaz.*5.200/);
assert(at(action)<at(preview));assert.equal(action.nextElementSibling,get('personaNoLogo'),'second CTA follows upload');assert.equal(get('personaNoLogo').nextElementSibling,hint,'helper follows both CTAs');assert.equal(hint.nextElementSibling,preview,'both CTAs precede package');assert(at(get('personaProductFacts'))>at(preview),'optional product facts follow package');assert.equal(upload.attrs.for,'unifiedUpload');assert.equal(next.parentElement,action);
assert.equal(get('personaNoLogo').hidden,false);assert.match(sharing.textContent,/1 · JPG’yi kaydet → 2 · WhatsApp’ı aç → 3 · Görseli ekle/);
let moves=action.moves+hint.moves+get('personaNoLogo').moves;sync();sync();assert.equal(action.moves+hint.moves+get('personaNoLogo').moves,moves,'stable observer no node churn');
browser.HijyenLabPersonaUX.mount(doc);assert.equal(observers,1,'idempotent mount');
assert.equal(get('declarationContinue').disabled,true,'no default count');state.quoteSource='customer-declared';state.declaration=browser.DeclaredQuote.create('white',2);get('personaNoLogo').open=false;get('personaNoLogo').ontoggle();assert.equal(get('personaNoLogo').open,false,'active declaration can collapse without reopening');delete state.quoteSource;delete state.declaration;assert.equal(get('personaNoLogo').children[0].textContent,'Görsel yüklemeden fiyat al');
state.designProcessing=true;sync();assert.equal(get('personaProductFacts').parentElement,picker,'facts return to picker outside opening');assert(at(action)>at(preview));assert.equal(get('personaDraftPrompt').hidden,true);
state.designProcessing=false;state.designBlocked=true;sync();assert.equal(get('personaDraftPrompt').hidden,true);
state.designBlocked=false;state.logo='real';sync();assert.equal(get('personaDraftPrompt').hidden,false);assert.equal(consent.checked,false);
get('personaDraftOptions').click();assert.equal(draft.open,true);assert.equal(consent.focused,true);assert.equal(consent.checked,false);assert.equal(get('personaDraftPrompt').hidden,true);
sync();assert.equal(get('personaDraftPrompt').hidden,true,'no repeated prompt');
state.logo=null;sync();assert(at(get('personaProductFacts'))>at(preview),'reset returns facts after package');assert(at(action)<at(preview),'reset returns native upload early');state.logo='new';sync();assert.equal(get('personaDraftPrompt').hidden,true,'once per page session');
design.hidden=true;sync();assert.equal(get('personaNoLogo').hidden,true);design.hidden=false;state.logo=null;sync();assert(at(action)<at(preview),'back opening');
mode='unprinted';sync();assert(at(action)>at(preview));assert.equal(get('personaNoLogo').hidden,true);assert.match(get('personaMinimum').textContent,/En az 1 koli/);
browser.selectedProductId='BM545';sync();assert.match(get('personaMinimum').textContent,/625/);assert.match(get('personaProductFacts').children[1].textContent,/20 × 25/);
mode='printed';state.bg='#123456';sync();assert.match(get('personaMinimum').textContent,/Renkli.*10.000/);state.photoLayout={};state.photoQuoteBg='unknown';sync();assert.match(get('personaMinimum').textContent,/beyaz zeminde 5.000, renkli zeminde 10.000/);
assert(!/fetch\(|localStorage|sessionStorage|\.checked\s*=|\.save\(|selectProduct\(/.test(source),'presentation cannot enable storage, send or change selections');
console.log('PASS persona UX: catalog facts/minima, all products/modes/unknown ground, native node preservation, no observer churn, upload pending/error/reset/back, once-only opt-in prompt, shared-device copy and manual JPG sharing.');

const compactCSS=fs.readFileSync('frontend/persona-ux.css','utf8');
assert.match(compactCSS,/\.atelierLayout\.welcomeEmpty #simpleDetails \{ display: none; \}/,'only empty opening hides placement controls');
assert.match(compactCSS,/#focusUpload \{ min-height: 52px;/,'large native upload target');
assert.match(compactCSS,/#productAdvisorButton \{ grid-column: 2; grid-row: 1; min-height: 44px;/,'optional adviser retains touch target');
console.log('PASS compact opening: paired CTAs before preview, facts after preview, reset restores ordering, non-opening facts preserved, native action and 44px adviser retained.');
