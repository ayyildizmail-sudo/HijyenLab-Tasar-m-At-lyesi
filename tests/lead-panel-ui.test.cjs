'use strict';
// DOM-contract tests only; this harness does not claim real-browser or live-service QA.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
class Element {
  constructor(tag) { this.tagName=tag;this.children=[];this.value='';this.textContent='';this.checked=false;this.disabled=false;this.hidden=false;this.listeners={};this.attrs={}; }
  append(...nodes) { for(const n of nodes){n.parent=this;this.children.push(n);} }
  before(n) { this.parent.children.splice(this.parent.children.indexOf(this),0,n);n.parent=this.parent; }
  replaceChildren(...nodes) { this.children=[];this.append(...nodes); }
  setAttribute(k,v) { this.attrs[k]=v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(k,fn) { (this.listeners[k]??=[]).push(fn); }
  fire(k,e={}) { for(const fn of this.listeners[k]||[])fn(e); }
  focus() { this.focused=true; }
  showModal() { this.open=true; }
  close() { this.open=false;this.fire('close'); }
  set innerHTML(value) { this.html=value;for(const m of value.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const n=new Element(m[1]);n.id=m[2];this.append(n);} }
}
function find(root,id) { if(root.id===id)return root;for(const n of root.children){const found=find(n,id);if(found)return found;}return null; }
function fixture(admin=false) {
 const body=new Element('body'),main=new Element('main'),footer=new Element('footer');body.append(main);main.append(footer);
 const add=(id,parent=main)=>{const n=new Element('div');n.id=id;parent.append(n);return n;};
 if(admin) for(const id of ['adminApp','adminStatus','adminRefresh','adminStatusFilter','adminLoadMore','adminLeads','adminStats'])add(id);
 else { add('summary');add('contactHelp'); }
 const doc={body,createElement:t=>new Element(t),getElementById:id=>find(body,id),querySelector:s=>s==='main'?main:s==='footer'?footer:null,listeners:{},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}};
 return {doc,get:id=>doc.getElementById(id)};
}
const id='11111111-1111-4111-8111-111111111111';
function load(file,extras={}) { const sandbox={module:{exports:{}},AbortController,setTimeout,clearTimeout,queueMicrotask,crypto:{randomUUID:()=>id},MutationObserver:class{observe(){}},addEventListener(){},...extras};vm.runInNewContext(fs.readFileSync('frontend/'+file,'utf8'),sandbox);return {api:sandbox.module.exports,root:sandbox}; }
const ok=data=>({ok:true,json:async()=>data});
const bad=status=>({ok:false,status});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const partial=()=>({kind:'contact_request',printMode:'printed',productId:null,quantity:null,fragrance:null,contact:{companyName:'',contactName:'Test kişi',phone:'05001234567',email:'',province:'',district:''},design:null});
const lead=()=>({id,kind:'contact_request',printMode:'printed',createdAt:1000,expiresAt:2000,status:'new',revision:0,productId:null,quantity:null,fragrance:null,contact:{companyName:'<script>test</script>',contactName:'Test kişi',phone:'05001234567'},design:null});
const stats={sessionCount:0,counts:{visit:0},analyticsEnabled:false,collectionEnabled:false,windowDays:30};

test('capabilities fail closed for absent, false, malformed, and unsupported consent versions',()=>{
 const {api}=load('visitor-requests.js');
 for(const value of [undefined,null,{}, {leadEnabled:'true'}, {leadEnabled:true,leadConsentVersion:'future'}])assert.equal(api.capabilities(value).leadEnabled,false);
 assert.equal(api.capabilities({leadEnabled:true,leadConsentVersion:'lead-v1'}).leadEnabled,true);
 assert.equal(api.capabilities({analyticsEnabled:true,analyticsConsentVersion:'analytics-v1'}).analyticsEnabled,true);
 const f=fixture();api.mount(f.doc,api.capabilities(null));assert.equal(f.get('requestContact'),null);assert.equal(f.get('analyticsChoice'),null);
});
test('analytics consent excludes history, deduplicates enum stages, strips PII, and stops new events after withdrawal',async()=>{
 let stage='quote_viewed',seq=0;const sent=[];const {api}=load('visitor-requests.js');
 const telemetry=api.createAnalytics({uuid:()=>`11111111-1111-4111-8111-${String(++seq).padStart(12,'0')}`,context:()=>({stage,productId:'BM12',phone:'never',url:'never',logo:'never'}),fetcher:async(path,opts)=>{const p=JSON.parse(opts.body);sent.push(p);return ok({accepted:true,eventId:p.eventId});}});
 telemetry.observe();await telemetry.emit('phone_clicked');assert.equal(sent.length,0);
 telemetry.enable();telemetry.observe();await tick();assert.deepEqual(sent.map(x=>x.event),['visit']);
 await telemetry.emit('design_started');await telemetry.emit('design_started');await telemetry.emit('arbitrary text');stage='design_ready';telemetry.observe();await tick();
 assert.deepEqual(sent.map(x=>x.event),['visit','design_started','design_ready']);
 for(const p of sent)assert.deepEqual(Object.keys(p).sort(),['consent','event','eventId','productId','sessionId']);
 telemetry.disable();stage='quote_viewed';telemetry.observe();await telemetry.emit('phone_clicked');assert.equal(sent.length,3);
 telemetry.enable();await tick();assert.notEqual(sent[0].sessionId,sent.at(-1).sessionId);
});
test('lead form is explicit, partial unknowns stay null, retry reuses id, edits revoke consent, pending close/repeat is blocked',async()=>{
 const f=fixture(),sent=[];let response,context=partial();const {api}=load('visitor-requests.js',{getHijyenLabLeadRequestContext:()=>context,fetch:async(path,opts)=>{sent.push(JSON.parse(opts.body));return new Promise(resolve=>{response=resolve;});}});
 api.mount(f.doc,{leadEnabled:true,analyticsEnabled:false});api.mount(f.doc,{leadEnabled:true,analyticsEnabled:false});
 f.get('requestContact').onclick();assert.equal(f.get('requestConsent').checked,false);assert.equal(f.get('requestSend').disabled,true);assert.match(f.get('requestPreview').textContent,/Adet: Belirtilmedi/);
 await f.get('requestSend').onclick();assert.equal(sent.length,0);
 f.get('requestConsent').checked=true;f.get('requestConsent').onchange();const pending=f.get('requestSend').onclick();await f.get('requestSend').onclick();assert.equal(sent.length,1);assert.equal(sent[0].quantity,null);assert.equal(sent[0].productId,null);assert.equal(sent[0].fragrance,null);
 assert.equal(f.get('requestCancel').disabled,true);let prevented=false;f.get('visitorRequestDialog').fire('cancel',{preventDefault(){prevented=true;}});assert.equal(prevented,true);
 response(bad(503));await pending;assert.equal(f.get('requestSend').disabled,false);assert.match(f.get('requestStatus').textContent,/doğrulanamadı/);
 const retry=f.get('requestSend').onclick();assert.equal(sent[1].requestId,sent[0].requestId);response(ok({accepted:true,requestId:id}));await retry;assert.match(f.get('requestStatus').textContent,/kaydedildi/);assert.equal(f.get('requestSend').disabled,true);
 f.get('requestName').value='Yeni kişi';f.get('requestName').oninput();assert.equal(f.get('requestConsent').checked,false);assert.equal(f.get('requestSend').disabled,true);
 assert.match(f.get('visitorRequestDialog').html,/Görsel dosyanız ve JPG teklif gönderilmez/);
});
test('lead form refuses changed delivery/design and does not infer success from unverified replies',async()=>{
 const f=fixture();let context=partial(),calls=0;const {api}=load('visitor-requests.js',{getHijyenLabLeadRequestContext:()=>context,fetch:async()=>{calls++;return ok({accepted:true,requestId:'wrong'});}});
 api.mount(f.doc,{leadEnabled:true});f.get('requestContact').onclick();f.get('requestConsent').checked=true;
 context={...context,contact:{...context.contact,province:'İstanbul'}};await f.get('requestSend').onclick();assert.equal(calls,0);assert.match(f.get('requestStatus').textContent,/değişti/);
 f.get('requestCancel').onclick();f.get('requestContact').onclick();f.get('requestConsent').checked=true;await f.get('requestSend').onclick();assert.equal(calls,1);assert.match(f.get('requestStatus').textContent,/doğrulanamadı/);
 assert.match(api.requestError(null),/adını/);assert.match(api.requestError({...partial(),contact:{...partial().contact,phone:'a05001234567'}}),/Geçerli/);
});
test('owner UI renders empty/zero truthfully and purges private rows on auth loss',async()=>{
 const f=fixture(true);let deny=false;const {api}=load('admin-panel.js',{fetch:async(path)=>deny?bad(403):ok(path.includes('/stats')?stats:{items:[],nextOffset:null})});
 const panel=api.mount(f.doc);await tick();assert.match(f.get('adminLeads').children[0].textContent,/henüz talep yok/);assert.equal(f.get('adminLoadMore').hidden,true);
 deny=true;await panel.load();assert.equal(f.get('adminLeads').children.length,0);assert.equal(f.get('adminStats').children.length,0);assert.match(f.get('adminStatus').textContent,/yetkiniz/);
});
test('owner status is revision checked, uses /status, never optimistic, handles conflicts, deduplicates pages',async()=>{
 const f=fixture(true),calls=[];let resolvePatch,offset=0;const row=lead();const {api}=load('admin-panel.js',{fetch:async(path,opts)=>{calls.push({path,opts});if(opts.method==='PATCH')return new Promise(resolve=>{resolvePatch=resolve;});if(path.includes('/stats'))return ok(stats);return ok({items:[{...row}],nextOffset:offset++===0?25:null});}});
 const panel=api.mount(f.doc);await tick();let article=f.get('adminLeads').children[0];assert.equal(article.children[0].children[0].textContent,'<script>test</script>');
 let actions=article.children.at(-1),select=actions.children[0].children[1],save=actions.children[1],feedback=actions.children[2];select.value='contacted';const pending=save.onclick();assert.equal(article.children[0].children[1].textContent,'Yeni');await save.onclick();assert.equal(calls.filter(c=>c.opts.method==='PATCH').length,1);assert.equal(calls.at(-1).path,`/api/admin/leads/${id}/status`);assert.equal(JSON.parse(calls.at(-1).opts.body).revision,0);
 resolvePatch(bad(409));await pending;assert.equal(select.value,'new');assert.match(feedback.textContent,/başka bir işlemde/);assert.equal(article.children[0].children[1].textContent,'Yeni');
 select.value='contacted';const next=save.onclick();resolvePatch(ok({updated:true,id,status:'contacted',revision:1}));await next;assert.equal(article.children[0].children[1].textContent,'İletişime geçildi');assert.match(feedback.textContent,/e-posta gönderilmedi/);
 await panel.load(true);assert.equal(f.get('adminLeads').children.length,1);assert.equal(f.get('adminLoadMore').hidden,true);
});
test('owner load serializes requests and malformed/denied responses never display stale data',async()=>{
 const f=fixture(true);let resolveList,calls=0;const {api}=load('admin-panel.js',{fetch:async(path)=>{calls++;if(path.includes('/stats'))return ok(stats);return new Promise(resolve=>{resolveList=resolve;});}});
 const panel=api.mount(f.doc);await panel.load();assert.equal(calls,2);resolveList(ok({items:[lead()],nextOffset:-1}));await tick();assert.equal(f.get('adminLeads').children.length,0);assert.match(f.get('adminStatus').textContent,/doğrulanamadı/);assert.equal(f.get('adminRefresh').disabled,false);
});
test('real application provider preserves unknown partials and reuses existing contact fields without images or price',()=>{
 const source=fs.readFileSync('frontend/app.js','utf8'),start=source.indexOf('globalThis.getHijyenLabLeadRequestContext=function'),end=source.indexOf('// Measurement context',start);
 const sandbox={isUnprinted:()=>false,UnprintedFlow:{validQuantity:(q,r)=>Number.isSafeInteger(q)&&q>=r.perCarton&&q%r.perCarton===0},productRules:()=>({perCarton:400}),state:{requestedQuantity:null,text:'',logo:null,photoLayout:null,bg:'#ffffff',font:'sans-serif'},rearContent:{},leadValues:()=>({customer:'İşletme',contact:'Yetkili',phone:'05001234567',province:'',district:''}),fragranceSnapshot:()=>null,currentProduct:()=>({id:'BM12'}),getHijyenLabSummaryHelpContext:()=>null};
 vm.runInNewContext(source.slice(start,end),sandbox);let p=sandbox.getHijyenLabLeadRequestContext('contact_request');
 assert.equal(p.quantity,null);assert.equal(p.fragrance,null);assert.equal(p.design,null);assert.equal(p.contact.contactName,'Yetkili');assert.equal(p.contact.email,'');assert.equal(sandbox.getHijyenLabLeadRequestContext('complete'),null);
 sandbox.state.logo='sensitive-image';sandbox.state.text='Displayed text';sandbox.state.recolorApplied=true;sandbox.state.color='#123456';sandbox.rearContent={extra:'Rear text',qrEnabled:false};p=sandbox.getHijyenLabLeadRequestContext('contact_request');
 assert.equal(p.design.frontText,'Displayed text');assert(!JSON.stringify(p).includes('sensitive-image'));assert(!('price' in p));assert.equal(p.quantity,null);
 sandbox.getHijyenLabSummaryHelpContext=()=>({quantity:5200});sandbox.fragranceSnapshot=()=>({id:'lemon'});p=sandbox.getHijyenLabLeadRequestContext('complete');assert.equal(p.quantity,5200);assert.equal(p.fragrance,'lemon');assert.equal(p.printMode,'printed');
 sandbox.isUnprinted=()=>true;sandbox.fragranceSnapshot=()=>({id:'flambau'});sandbox.getHijyenLabSummaryHelpContext=()=>({quantity:400});p=sandbox.getHijyenLabLeadRequestContext('complete');assert.equal(p.printMode,'unprinted');assert.equal(p.design,null);assert.equal(p.quantity,400);assert.equal(p.fragrance,'flambau');assert(!JSON.stringify(p).includes('Displayed text'));assert(!JSON.stringify(p).includes('Rear text'));
 sandbox.state.requestedQuantity=401;p=sandbox.getHijyenLabLeadRequestContext('contact_request');assert.equal(p.quantity,null);assert.equal(p.design,null);
});
test('owner unverified status response does not mutate local persisted badge',async()=>{
 const f=fixture(true);const {api}=load('admin-panel.js',{fetch:async(path,opts)=>ok(opts.method==='PATCH'?{updated:true,id,status:'closed',revision:0}:path.includes('/stats')?stats:{items:[lead()],nextOffset:null})});
 api.mount(f.doc);await tick();const article=f.get('adminLeads').children[0],actions=article.children.at(-1),select=actions.children[0].children[1];select.value='closed';await actions.children[1].onclick();assert.equal(article.children[0].children[1].textContent,'Yeni');assert.equal(select.value,'new');assert.match(actions.children[2].textContent,/doğrulanamadı/);
});
test('unprinted request requires explicit mode and whole cartons, null design is valid, preview is exact',async()=>{
 const f=fixture(),sent=[];let context={...partial(),kind:'complete',printMode:'unprinted',productId:'BM545',quantity:625,fragrance:'flambau',contact:{...partial().contact,companyName:'Test işletme'}};
 const {api}=load('visitor-requests.js',{getHijyenLabLeadRequestContext:()=>context,fetch:async(path,opts)=>{const p=JSON.parse(opts.body);sent.push(p);return ok({accepted:true,requestId:p.requestId});}});
 assert.equal(api.requestError(context),'');assert.match(api.requestError({...context,fragrance:'lemon'}),/Flambau/);assert.match(api.requestError({...context,printMode:undefined}),/Baskılı veya baskısız/);assert.match(api.requestError({...context,quantity:626}),/tam koli/);assert.match(api.requestError({...context,design:{frontText:'stale'}}),/tasarım bilgisi gönderilmez/);
 for(const [productId,quantity] of [['BM12',400],['BM15',500],['BM545',625]])assert.equal(api.requestError({...context,productId,quantity}),'');
 assert.equal(api.requestError({...context,kind:'contact_request',productId:null,quantity:null,fragrance:null}),'');
 api.mount(f.doc,{leadEnabled:true});f.get('requestComplete').onclick();assert.match(f.get('requestPreview').textContent,/Baskı seçimi: Baskısız/);assert.match(f.get('requestPreview').textContent,/Baskısız; klişe uygulanmaz/);assert(!f.get('requestPreview').textContent.includes('Henüz yok'));
 f.get('requestConsent').checked=true;await f.get('requestSend').onclick();assert.equal(sent[0].printMode,'unprinted');assert.equal(sent[0].design,null);assert.equal(sent[0].quantity,625);
 f.get('requestCancel').onclick();f.get('requestComplete').onclick();f.get('requestConsent').checked=true;context={...context,printMode:'printed'};await f.get('requestSend').onclick();assert.equal(sent.length,1);assert.match(f.get('requestStatus').textContent,/değişti/);
});
test('owner unprinted enquiry is labeled explicitly, not as absent design, and legacy mode stays unknown',async()=>{
 const f=fixture(true),row={...lead(),printMode:'unprinted',productId:'BM15',quantity:500,design:null};const {api}=load('admin-panel.js',{fetch:async(path)=>ok(path.includes('/stats')?stats:{items:[row,{...lead(),id:'legacy',printMode:undefined}],nextOffset:null})});
 api.mount(f.doc);await tick();const [article,legacy]=f.get('adminLeads').children;assert.equal(article.children[0].children[2].textContent,'Baskısız');assert(article.children.some(n=>n.textContent==='Baskısız; klişe uygulanmaz'));assert.equal(legacy.children[0].children[2].textContent,'Baskı seçimi belirtilmedi');
});
