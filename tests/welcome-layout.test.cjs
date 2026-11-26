'use strict';
// The .cjs VM harness intentionally loads Node built-ins synchronously.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('frontend/welcome-layout.js','utf8'),ctx={module:{exports:{}}};vm.runInNewContext(source,ctx);
const {isOpening}=ctx.module.exports;
assert.equal(isOpening({},true),true);assert.equal(isOpening({},false),false);
for(const key of ['logo','photoLayout','sourcePhoto','designProcessing','designBlocked','screenSelectionRequired'])assert.equal(isOpening({[key]:true},true),false,key);
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.textContent='';this.hidden=false;this.open=false;this.attrs={};this.classes=new Set();this.classList={add:n=>this.classes.add(n),toggle:(n,on)=>{if(on)this.classes.add(n);else this.classes.delete(n);},contains:n=>this.classes.has(n)};}
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);}}
 before(n){const p=this.parentElement;p.children.splice(p.children.indexOf(this),0,n);n.parentElement=p;}
 after(n){const p=this.parentElement;p.children.splice(p.children.indexOf(this)+1,0,n);n.parentElement=p;}
 setAttribute(k,v){this.attrs[k]=v;}
}
const main=new Node('main'),nodes={},events={},state={};let sync,observerCount=0;
function add(id,tag='div',parent=main){const node=new Node(tag);node.id=id;nodes[id]=node;parent.append(node);return node;}
function find(node,id){if(node.id===id)return node;for(const child of node.children){const value=find(child,id);if(value)return value;}return null;}
const picker=add('productPicker'),design=add('design','section'),action=add('actions','div',design),upload=add('upload','label',action);upload.textContent='Görsel yükle';upload.setAttribute('for','unifiedUpload');let uploadCalls=0;const handler=()=>uploadCalls++;upload.onclick=handler;
const draft=add('draftPanel','section'),consent=add('draftConsent','input',draft);consent.checked=false;const restore=add('restoreDraft','button',draft);restore.hidden=true;let restored=0;const restoreHandler=()=>restored++;restore.onclick=restoreHandler;add('draftStatus','p',draft);add('status','p');
const doc={readyState:'complete',createElement:tag=>new Node(tag),getElementById:id=>find(main,id),querySelector:s=>({'main':main,'.productPicker':picker,'.simplePrimary':action,'.simplePrimary label':upload}[s]||null),addEventListener:(name,fn)=>{(events[name]??=[]).push(fn);}};
let printMode='printed';const modeEvents={};
const browser={document:doc,HijyenLabPrintMode:{get:()=>printMode},addEventListener:(name,fn)=>{modeEvents[name]=fn;},MutationObserver:class{constructor(fn){sync=fn;observerCount++;}observe(){}}};vm.runInNewContext(source,{window:browser,state});
const get=id=>doc.getElementById(id),options=get('welcomeDraftOptions');
assert(main.classList.contains('atelierLayout'));assert(main.classList.contains('welcomeEmpty'));assert.equal(upload.textContent,'Logo veya görsel yükle');assert.equal(get('welcomeIntro').hidden,false);assert.equal(get('welcomeUploadHint').hidden,false);
assert.equal(upload.attrs.for,'unifiedUpload');assert.equal(upload.onclick,handler);upload.onclick();assert.equal(uploadCalls,1);assert.equal(get('draftPanel'),draft);assert.equal(get('draftConsent'),consent);assert.equal(get('restoreDraft'),restore);assert.equal(draft.parentElement,options);assert.equal(options.open,false);assert.equal(consent.checked,false);assert.equal(restore.onclick,restoreHandler);
const size=main.children.length;browser.HijyenLabWelcome.mount(doc);assert.equal(main.children.length,size);assert.equal(observerCount,1);assert.equal(events.change.length,1);
for(const key of ['designProcessing','designBlocked','screenSelectionRequired','sourcePhoto','logo','photoLayout']){state[key]=true;sync();assert(!main.classList.contains('welcomeEmpty'),key);assert.equal(get('welcomeIntro').hidden,true);assert.equal(upload.textContent,'Görsel yükle');delete state[key];sync();assert(main.classList.contains('welcomeEmpty'),'reset '+key);}
design.hidden=true;sync();assert(!main.classList.contains('welcomeEmpty'));design.hidden=false;sync();assert(main.classList.contains('welcomeEmpty'),'back to empty design');
restore.hidden=false;sync();assert.equal(options.open,true);assert.match(options.children[0].textContent,/Kaydedilmiş taslağınız var/);options.open=false;sync();assert.equal(options.open,false,'same restore offer respects manual collapse');restore.onclick();assert.equal(restored,1);restore.hidden=true;sync();restore.hidden=false;sync();assert.equal(options.open,true,'new restore offer reopens');
restore.hidden=true;sync();options.open=false;nodes.draftStatus.textContent='Taslak okunamadı';sync();assert.equal(options.open,true);options.open=false;sync();assert.equal(options.open,false);nodes.draftStatus.textContent='Taslak kaydedilemedi';sync();assert.equal(options.open,true,'new error reopens');nodes.draftStatus.textContent='';sync();
assert.equal(consent.checked,false,'composition never enables storage');consent.checked=true;events.change[0]();assert.equal(consent.checked,true);assert.match(options.children[0].textContent,/saklama açık/);consent.checked=false;events.change[0]();assert.equal(consent.checked,false);assert.equal(options.children[0].textContent,'Taslak saklama ve devam etme');
assert.equal(upload.onclick,handler);assert.equal(restore.onclick,restoreHandler);assert(!/fetch\(|localStorage|sessionStorage|\.checked\s*=/.test(source));
console.log('PASS welcome layout: opening/pending/error/back/reset, idempotent mount, original upload/restore nodes and handlers, unchanged storage consent, secondary draft controls, new restore/error reopening with manual collapse preserved.');

assert.equal(isOpening({},true,true),false,'blank unprinted is not logo onboarding');
printMode='unprinted';modeEvents['hijyenlab:print-mode-change']();assert(main.classList.contains('unprintedMode'));assert(!main.classList.contains('welcomeEmpty'));assert.equal(get('welcomeIntro').hidden,true);assert.equal(get('welcomeUploadHint').hidden,true);assert.equal(upload.onclick,handler);assert.equal(consent.checked,false);
printMode='printed';modeEvents['hijyenlab:print-mode-change']();assert(!main.classList.contains('unprintedMode'));assert(main.classList.contains('welcomeEmpty'));assert.equal(get('welcomeIntro').hidden,false);assert.equal(upload.textContent,'Logo veya görsel yükle');assert.equal(upload.attrs.for,'unifiedUpload');
console.log('PASS welcome explicit unprinted/printed events preserve native upload and opt-in while hiding logo onboarding.');

{
 const api=ctx.module.exports;
 assert.equal(api.DELIVERY_DAYS,25);
 assert.equal(api.deliveryDate(new Date(2026,10,26)),'21 Aralık 2026');
 assert.equal(api.deliveryDate(new Date(2026,11,20)),'14 Ocak 2027','year rollover');
 assert.match(api.deliveryText(new Date(2026,10,26),'BM12'),/^Bugün onaylarsanız tahmini teslim: 21 Aralık 2026 \(25 takvim günü\)\.$/);
 assert.match(api.deliveryText(new Date(2026,10,26),'OSHIBORI'),/teyit edilir/);
 console.log('PASS welcome delivery date: today + 25 calendar days, year rollover, Oshibori confirmation note.');
}
