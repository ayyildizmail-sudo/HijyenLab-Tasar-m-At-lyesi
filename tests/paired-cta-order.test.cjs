'use strict';
/* Exercise the real welcome and persona mounts together, not isolated reorder helpers. */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('frontend/persona-ux.js','utf8');
const catalog=require('../frontend/product-catalog.js');
let mutations=0;
class Node {
  constructor(tag) { this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.textContent='';this.hidden=false;this.open=false;this.attrs={};this.moves=0;this.classList={add(){},toggle(){}}; }
  get hidden(){return this._hidden;} set hidden(v){this._hidden=v;mutations++;}
  get disabled(){return this._disabled;} set disabled(v){this._disabled=v;mutations++;}
  get textContent(){return this._textContent;} set textContent(v){this._textContent=v;mutations++;}
  get open(){return this._open;} set open(v){this._open=v;mutations++;}
  detach() { if(this.parentElement) { const a=this.parentElement.children;a.splice(a.indexOf(this),1); } }
  append(...nodes) { for(const n of nodes){n.detach();n.parentElement=this;this.children.push(n);n.moves++;mutations++;} }
  before(n) { const p=this.parentElement;n.detach();n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);n.moves++;mutations++; }
  after(n) { const p=this.parentElement;n.detach();n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);n.moves++;mutations++; }
  setAttribute(k,v){this.attrs[k]=v;mutations++;}
  getAttribute(k){return this.attrs[k]??null;}
  get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
  focus(){this.focused=true;}
  click(){this.onclick?.();}
  addEventListener(name,fn){this['on'+name]=fn;}
}
const main=new Node('main'), nodes={}, events={}; let mode='printed';const callbacks=[];
function add(id,tag='div',parent=main){const n=new Node(tag);n.id=id;nodes[id]=n;parent.append(n);return n;}
function find(node,id){if(node.id===id)return node;for(const child of node.children){const n=find(child,id);if(n)return n;}return null;}
const picker=add('picker'),design=add('design'),visual=add('visual','div',design),preview=add('preview','div',visual),action=add('actions','div',visual),upload=add('upload','label',action);upload.attrs.for='unifiedUpload';const next=add('next','button',action);add('simpleDetails','details',visual);
const draft=add('draftPanel','section'),consent=add('draftConsent','input',draft),restore=add('restoreDraft','button',draft);consent.checked=false;restore.hidden=true;
const sharing=add('sharing'),contact=add('contactWhatsApp','button');let helpCalls=0;contact.onclick=()=>helpCalls++;
const doc={readyState:'complete',createElement:tag=>new Node(tag),getElementById:id=>find(main,id),querySelector:s=>({'main':main,'.productPicker':picker,'.simplePrimary':action,'.simplePrimary label':upload,'.preview':preview,'#summaryDiscussion .hint':sharing}[s]||null),addEventListener:(name,fn)=>{(events[name]??=[]).push(fn);}};
const state={bg:'#ffffff',bgPantone:''}, browser={document:doc,ProductCatalog:catalog,DeclaredQuote:require('../frontend/declared-quote.js'),selectedProductId:'BM12',HijyenLabPrintMode:{get:()=>mode},HijyenLabWelcome:{isOpening:(v,visible,blank)=>visible&&!blank&&!v.logo&&!v.photoLayout&&!v.designProcessing&&!v.designBlocked&&!v.sourcePhoto&&!v.screenSelectionRequired},addEventListener:(name,fn)=>{events[name]=[fn];},MutationObserver:class{constructor(fn){callbacks.push(fn);}observe(){}}};
const actualGroundFunction=fs.readFileSync('frontend/app.js','utf8').split('\n').find(line=>line.startsWith('function effectiveBackground()'));
const context={window:browser,state,isUnprinted:()=>mode==='unprinted',isDeclaredQuote:()=>state.quoteSource==='customer-declared',startDeclaredQuote(){state.quoteSource='customer-declared';state.declaration=browser.DeclaredQuote.create();},setDeclaration(ground,count){state.declaration=browser.DeclaredQuote.create(ground,count);}};
vm.runInNewContext(fs.readFileSync('frontend/welcome-layout.js','utf8'),context);
vm.runInNewContext(actualGroundFunction+'\n'+source,context);
const get=id=>doc.getElementById(id),at=n=>visual.children.indexOf(n);

const noLogo=get('personaNoLogo'),title=noLogo.children[0],hint=get('welcomeUploadHint');
function settle(label){
  let stable=false;
  for(let i=0;i<8;i++){const before=mutations;callbacks.forEach(fn=>fn());if(mutations===before){stable=true;break;}}
  assert(stable,label+' observers converge');
  const before=mutations;for(let i=0;i<30;i++)callbacks.forEach(fn=>fn());
  assert.equal(mutations,before,label+' repeated observers do not move nodes or rewrite attrs');
  assert.equal(action.nextElementSibling,noLogo,label+' canonical secondary');
  assert.equal(noLogo.nextElementSibling,hint,label+' canonical helper');
}
function opening(label){settle(label);assert.equal(hint.nextElementSibling,preview,label+' two actions above preview');assert.equal(noLogo.hidden,false);}
opening('cold empty');
assert.equal(title.tagName,'SUMMARY','native keyboard-accessible disclosure is retained');
assert.equal(title.attrs['aria-controls'],'declarationPanel');
assert.equal(title.attrs['aria-expanded'],'false');
noLogo.open=true;noLogo.ontoggle();opening('open declaration');assert.equal(title.attrs['aria-expanded'],'true');
assert.equal(get('declarationContinue').disabled,true,'opening does not invent an ink count');
noLogo.open=false;noLogo.ontoggle();opening('close declaration');assert.equal(title.attrs['aria-expanded'],'false');
state.quoteSource='customer-declared';state.declaration=browser.DeclaredQuote.create('colored',2);opening('declared restore');assert.equal(get('declarationContinue').disabled,false);
for(const id of ['BM12','BM11','BM13','BM15','BM21','BM545']){browser.selectedProductId=id;opening('switch '+id);}
state.logo='actual-upload';delete state.quoteSource;delete state.declaration;settle('real upload');assert(at(action)>at(preview));assert.equal(noLogo.hidden,true);
state.logo=null;opening('reset');
mode='unprinted';settle('unprinted');assert.equal(noLogo.hidden,true);assert(at(action)>at(preview));
mode='printed';opening('return printed');
state.text='typed';settle('text only');assert.equal(noLogo.hidden,true);state.text='';opening('text reset');
assert.equal(upload.attrs.for,'unifiedUpload');assert.equal(next.parentElement,action);
const css=fs.readFileSync('frontend/persona-ux.css','utf8');
assert.match(css,/\.atelierLayout\.welcomeEmpty #personaNoLogo > summary \{[\s\S]*?min-height: 56px;[\s\S]*?background: #e7f1fc; color: #153b67;/);
assert.match(css,/\.atelierLayout\.welcomeEmpty \.simplePrimary \{\s*width: 100%; max-width: none; margin: 8px 0 12px;/);
console.log('PASS paired CTA integrated observer convergence: cold/open/close, declared restore, six products, uploaded artwork, reset, unprinted, text and repeated sync; native summary + guarded expanded state.');
