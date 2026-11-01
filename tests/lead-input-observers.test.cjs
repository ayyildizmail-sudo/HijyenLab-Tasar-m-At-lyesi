'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
// Real presentation mounts with native-like mutation delivery (same-value
// attribute setters still enqueue records). No browser/device claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
const observers=[],events={},tasks=[],canceledTasks=new Set();let designChecks=0;
function mutation(target,type,name){for(const o of observers)if(o.node&&(target===o.node||o.options.subtree&&o.node.contains(target))&&o.options[type]&&(!o.options.attributeFilter||type!=='attributes'||o.options.attributeFilter.includes(name)))o.pending=true;}
class Node{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attrs={};this.dataset={};this.value='';this._text='';this.className='';this.classList={add:n=>{this.className+=' '+n;},contains:n=>this.className.split(' ').includes(n),toggle:(n,on)=>{const a=new Set(this.className.split(' ').filter(Boolean));if(on)a.add(n);else a.delete(n);this.className=[...a].join(' ');}};}
 get hidden(){return this.attrs.hidden!==undefined;}set hidden(v){if(v)this.setAttribute('hidden','');else this.removeAttribute('hidden');}
 get disabled(){return this.attrs.disabled!==undefined;}set disabled(v){if(v)this.setAttribute('disabled','');else this.removeAttribute('disabled');}
 get open(){return this.attrs.open!==undefined;}set open(v){if(v)this.setAttribute('open','');else this.removeAttribute('open');}
 get textContent(){return this._text;}set textContent(v){this._text=v;mutation(this,'childList');}
 setAttribute(k,v){this.attrs[k]=String(v);mutation(this,'attributes',k);}getAttribute(k){return this.attrs[k]??null;}
 removeAttribute(k){if(k in this.attrs){delete this.attrs[k];mutation(this,'attributes',k);}}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 detach(){if(this.parentElement){const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);mutation(p,'childList');}}
 append(...ns){for(const n of ns){n.detach();n.parentElement=this;this.children.push(n);mutation(this,'childList');}}
 prepend(n){this.append(n);this.children.unshift(this.children.pop());}
 before(n){const p=this.parentElement;n.detach();n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);mutation(p,'childList');}
 after(n){const p=this.parentElement;n.detach();n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);mutation(p,'childList');}
 get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
 matches(s){if(s==='*')return true;if(s==='[hidden]')return this.hidden;if(s==='[data-focus-action]')return !!this.dataset.focusAction;if(s==='dialog[open]')return this.tagName==='DIALOG'&&this.open;if(s[0]==='.')return this.classList.contains(s.slice(1));if(s[0]==='#')return this.id===s.slice(1);return this.tagName===s.toUpperCase();}
 closest(s){return this.matches(s)?this:this.parentElement?.closest(s)||null;}
 querySelectorAll(s){const parts=s.split(' '),last=parts.pop(),all=[];for(const c of this.children){if(c.matches(last)&&(!parts.length||c.parentElement.closest(parts.join(' '))))all.push(c);all.push(...c.querySelectorAll(s));}return all;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(t,f){(this.listeners??={})[t]=f;}focus(){doc.activeElement=this;}click(){this.onclick?.();}
}
const main=new Node('main'),nodes={};function add(id,tag='div',p=main){const n=new Node(tag);n.id=id;nodes[id]=n;p.append(n);return n;}
const picker=add('picker');picker.className='productPicker';
for(const id of ['design','pricing','summary','fragrancePanel','whiteCarrierPanel','photoEditor','pdfPicker','rearPreview'])add(id,'section').hidden=id!=='design';
const workspace=add('workspace','div',nodes.design);workspace.className='workspace';const visual=add('visual','div',workspace),preview=add('preview','div',visual);preview.className='preview';const action=add('actions','div',visual);action.className='simplePrimary';add('upload','label',action).className='primary';
add('next','button',action).className='primary';for(const id of ['approveInk','approveProductLayout','retryProductAsset'])add(id,'button',nodes.design).hidden=true;
add('simpleDetails','details',visual).append(new Node('summary'));add('simpleTools','div',visual);for(const id of ['simpleText','previewCaption','filename'])add(id,'div',visual);
for(const p of ['bg','text']){const l=add(p+'Label','label',nodes.design);add(p+'Pantone','input',l);add(p+'PantoneResult','div',nodes.design);}
add('review','button',nodes.pricing).className='primary';add('summaryBack','button',nodes.summary);
const quoteNotice=add('quoteNotice','p',nodes.summary);quoteNotice.className='notice';for(const id of ['downloadQuote','retryQuotePreview','quoteImage','quoteOpen','quoteDownloadPreview'])add(id,'div',nodes.summary);
for(const id of ['customerName','contactName','contactPhone','province','district'])add(id,'input',nodes.pricing);add('leadError','p',nodes.pricing).hidden=true;add('breakdown','div',add('priceArticle','article',nodes.pricing));
const draft=add('draftPanel');add('draftConsent','input',draft).checked=false;add('restoreDraft','button',draft).hidden=true;add('draftStatus','p',draft);add('status','p');
const doc={readyState:'complete',activeElement:null,body:new Node('body'),createElement:t=>{const n=new Node(t);if(t==='canvas'){const c=createCanvas(1,1);n.getContext=(...a)=>c.getContext(...a);n.toDataURL=(...a)=>c.toDataURL(...a);for(const k of ['width','height'])Object.defineProperty(n,k,{get:()=>c[k],set:v=>c[k]=v});}return n;},getElementById:id=>main.id===id?main:main.querySelector('#'+id),querySelector:s=>s==='main'?main:main.querySelector(s),addEventListener:(n,f)=>{(events[n]??=[]).push(f);}};
doc.body.append(main);let mode='printed';const state={logo:null,text:'',bg:'#ffffff'},browser={document:doc,ProductCatalog:require('../frontend/product-catalog.js'),DeclaredQuote:require('../frontend/declared-quote.js'),selectedProductId:'BM12',HijyenLabPrintMode:{get:()=>mode},setTimeout:f=>{tasks.push(f);return f;},clearTimeout:f=>canceledTasks.add(f),addEventListener:(n,f)=>{(events[n]??=[]).push(f);},MutationObserver:class{constructor(f){this.fn=f;observers.push(this);}observe(n,o){this.node=n;this.options=o;}}};
const ctx={window:browser,document:doc,MutationObserver:browser.MutationObserver,addEventListener:browser.addEventListener,setTimeout:browser.setTimeout,clearTimeout:browser.clearTimeout,$:id=>doc.getElementById(id),baseImage:{addEventListener(){}},selectedProductId:'BM12',step:1,approvedDesignFingerprint:null,latest:null,cancelCurrentProcessing(){},routeUploadedFile(){},selectProduct(){},openSimplePanel(){},syncSimpleUI(){},showDesignIssue(){},canReviewExtractedArtwork:()=>false,approvalQuestion:nodes.approveInk,state,isUnprinted:()=>mode==='unprinted',effectiveBackground:()=>state.bg,isDeclaredQuote:()=>false,designIssue:()=>{designChecks++;return false;},productRules:()=>browser.ProductCatalog.rules('BM12')};vm.createContext(ctx);
for(const file of ['text-design','product-geometry','combined-inks','text-design-ui'])vm.runInContext(fs.readFileSync('frontend/'+file+'.js','utf8'),ctx);
for(const file of ['experience-ui','customer-focus','welcome-layout','persona-ux','responsive-journey'])vm.runInContext(fs.readFileSync('frontend/'+file+'.js','utf8'),ctx);
function settle(label){let rounds=0,calls=0;while(observers.some(o=>o.pending)){assert(++rounds<=20,label+' must converge, not starve input');const pending=observers.filter(o=>o.pending);pending.forEach(o=>o.pending=false);for(const o of pending){calls++;o.fn();}}return calls;}
settle('boot');nodes.design.hidden=true;nodes.pricing.hidden=false;settle('pricing');const before=designChecks;
function event(t){for(const f of events[t]||[])f({isTrusted:true});while(tasks.length){const task=tasks.shift();if(!canceledTasks.delete(task))task();}return settle(t);}
const app=fs.readFileSync('frontend/app.js','utf8');
Object.assign(ctx,{$:id=>doc.getElementById(id),ShippingLocation:require('../frontend/shipping-location.js'),leadTouched:new Set(),leadSubmitted:false,step:2,CustomEvent:class{constructor(type){this.type=type;}},dispatchEvent:e=>{for(const f of events[e.type]||[])f(e);}});
vm.runInContext(app.slice(app.indexOf('function setQuotePreviewState('),app.indexOf('async function renderQuoteSafely(')),ctx);
vm.runInContext(app.slice(app.indexOf('function leadError('),app.indexOf('(function installLeadGate()')),ctx);
// Execute the real installed lead input handler body, rather than a hand-copied approximation.
const handler=app.match(/input.addEventListener\('input',\(\)=>\{(invalidateQuote\(\);syncLeadGate\([^}]*?)\}\)/)[1];
for(const value of ['N','Na','Narin test','', 'N']){nodes.customerName.value=value;vm.runInContext(handler,ctx);event('input');assert.equal(nodes.customerName.value,value);}
ctx.leadTouched.add('customerName');vm.runInContext('syncLeadGate()',ctx);settle('blur');
assert.equal(nodes.leadError.hidden,false,'one-character blur exposes validation');

assert.equal(designChecks,before,'lead typing never evaluates artwork');
// Mirror the contact gate's repeated quote invalidation attributes, including
// same-value writes, then ensure the complete observer graph stops.
const download=add('testDownload','button',nodes.summary),hidden=add('testHidden','div',nodes.summary);
for(let i=0;i<50;i++){download.disabled=true;hidden.hidden=true;event('hijyenlab:quote-state');assert(settle('repeated invalidation')<=20);}
nodes.pricing.hidden=true;nodes.design.hidden=false;event('change');assert(designChecks>before,'back restores design readiness evaluation');
mode='unprinted';event('hijyenlab:print-mode-change');mode='printed';event('hijyenlab:print-mode-change');
assert(!observers.some(o=>o.pending));
// New text mount participates in the same native-like observer graph. Pricing
// typing above remains artwork-free; text editing never replaces its active input.
ctx.step=1;ctx.isUnprinted=()=>mode==='unprinted';ctx.packageImage=null;ctx.currentProduct=()=>browser.ProductCatalog.get('BM12');ctx.remember=()=>{};ctx.refresh=()=>ctx.syncSimpleUI();ctx.go=n=>{ctx.step=n;};ctx.processingSession={cancel(){},invalidateQuotes(){}};
state.textDesign=ctx.TextDesign.descriptor('Şükrü Işık','simple','BM12');state.textDesignEditing=true;ctx.HijyenLabTextDesignUI.sync();event('change');
const input=doc.getElementById('textDesignInput');input.focus();input.selectionStart=3;for(const value of ['Şükrü Işık','Şükrü Işık Özen','']){input.value=value;input.listeners.input();event('input');assert.equal(input.value,value);assert.equal(input.selectionStart,3);assert(settle('text edit')<=20);}
state.textDesign=null;state.textDesignEditing=false;ctx.HijyenLabTextDesignUI.sync();event('change');assert(!observers.some(o=>o.pending));
console.log('PASS integrated observers: six real mounts converge on boot, input/clear/retype, repeated invalidation, back and mode transitions; pricing performs zero artwork checks.');
