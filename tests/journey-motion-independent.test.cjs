'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
// Independent finite-animation/controller review. No browser or iOS claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('frontend/journey-motion.js','utf8'),context={module:{exports:{}}};vm.runInNewContext(source,context);
const listeners={},animations=[],nodes={};
class Element{
 constructor(id,tag='div',parent=null){this.id=id;this.tagName=tag.toUpperCase();this.parentElement=parent;this.children=[];if(parent)parent.children.push(this);this.hidden=false;this.open=true;this.attrs={};this.className='';this.type='text';this.style={};this.width=1600;this.height=850;this.isConnected=true;this.classList={contains:n=>this.className.split(' ').includes(n),add:n=>{if(!this.classList.contains(n))this.className+=' '+n;},remove:n=>{this.className=this.className.split(' ').filter(v=>v!==n).join(' ');},toggle:(n,on)=>on?this.classList.add(n):this.classList.remove(n)};}
 matches(s){return s.split(',').some(q=>{q=q.trim();if(q==='.priceRow:not(.total)')return this.classList.contains('priceRow')&&!this.classList.contains('total');if(q==='[id]')return !!this.id;if(q==='[hidden]')return this.hidden;if(q==='details:not([open])')return this.tagName==='DETAILS'&&!this.open;if(q[0]==='.')return q.slice(1).split('.').every(c=>this.classList.contains(c));if(q==='[contenteditable="true"]'||q==='[contenteditable]')return !!this.isContentEditable;return this.tagName===q.toUpperCase();});}
 closest(s){return this.matches(s)?this:this.parentElement?.closest(s)||null;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 append(n){n.parentElement=this;this.children.push(n);}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];if(k==='id')this.id='';if(k==='src')this.src='';}
 remove(){const p=this.parentElement;if(p)p.children=p.children.filter(c=>c!==this);this.parentElement=null;}
 before(n){const p=this.parentElement;n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);}
 after(n){const p=this.parentElement;n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);}
 replaceChildren(...items){this.children=[];items.forEach(n=>this.append(n));}
 cloneNode(){const n=new Element(this.id,this.tagName);n.className=this.className;n.textContent=this.textContent;return n;}
 getBoundingClientRect(){return{left:10,top:20,width:800,height:425};}
 getContext(){return{drawImage(){},clearRect(){}};}
 addEventListener(t,fn,capture){(this.events??={})[t]=fn;(this.capture??={})[t]=capture;}
 animate(frames,options){const animation={node:this,frames,options,cancelled:false,cancel(){this.cancelled=true;this.oncancel?.();}};animations.push(animation);return animation;}
}
const body=new Element('body','body');const doc={body,activeElement:body,hidden:false,visibilityState:'visible',getElementById:id=>nodes[id]||find(body,id),createElement:tag=>new Element('',tag),querySelectorAll:s=>body.querySelectorAll(s),addEventListener:(t,fn)=>{(listeners[t]??=[]).push(fn);}};
function add(id,tag='div',parent=body){return nodes[id]=new Element(id,tag,parent);}
function find(n,id){if(n.id===id)return n;for(const c of n.children){const v=find(c,id);if(v)return v;}return null;}
const media={matches:false,addEventListener(t,fn){this.changed=fn;}};
for(const id of ['package','productSelect','rearTitle','rearBlankImage','quoteImage','finalDetails'])add(id);
const rearEditor=add('rearEditor','details'),label=add('companyLabel','label'),company=add('customerName','input',label),other=add('contactName','input');
const card=add('fragranceCard'),icon=add('icon','span',card);icon.className='fragranceIcon';
const api=context.module.exports.create(doc,media);
const live=()=>animations.filter(a=>!a.cancelled&&!a.finished);
function finish(){for(const a of live()){a.finished=true;a.onfinish?.();}}
function event(type,target=body){for(const fn of listeners[type]||[])fn({target,type,isTrusted:true});}
api.slot(company);api.slot(company);assert.equal(label.querySelectorAll('.journeyFieldCheck').length,1,'one reserved check only');const check=label.querySelector('.journeyFieldCheck');assert.equal(check.attrs['aria-hidden'],'true');
api.product();assert.equal(live().length,2);api.product();assert.equal(live().length,2,'new product cancels previous animations');
for(const a of animations){assert.equal(a.options.iterations,1);assert(a.options.duration>0&&a.options.duration<=500,'short finite duration');assert.equal(a.options.fill,undefined,'no retained transform');}
api.reset();assert.equal(live().length,0);
api.rear();assert.equal(live().length,1);media.matches=true;media.changed();assert.equal(live().length,0);api.product();api.rear();api.background();api.front();api.rear();api.fragrance(card);assert.equal(live().length,0,'reduced motion suppresses all presentation motion');media.matches=false;
nodes.rearBlankImage.hidden=true;api.rear();assert.equal(live().length,0,'hidden target does not animate');nodes.rearBlankImage.hidden=false;
api.suspend(true);api.product();api.rear();api.quote({},true);assert.equal(live().length,0,'restoring drafts has no animation');api.suspend(false);
api.lead(company,false,false);assert(!check.classList.contains('is-valid'));api.lead(company,true,true);assert(check.classList.contains('is-valid'));assert.equal(live().length,1);api.lead(company,true,true);assert.equal(live().length,1,'duplicate blur does not restart animation');api.lead(company,false,false);assert.equal(live().length,0);assert(!check.classList.contains('is-valid'));
api.reset();doc.activeElement=add('rearText','input',rearEditor);api.rear();assert.equal(live().length,0,'rear edit never animates while typing');doc.activeElement=body;const token={revision:1};api.quote(token,false);assert.equal(live().length,0,'invalid/pending quote never assembles');api.quote(token,true);assert.equal(live().length,2);finish();const count=animations.length;api.quote(token,true);assert.equal(animations.length,count,'same quote token is idempotent');api.quote({},true);assert.equal(live().length,2);api.quote(null,false);assert.equal(live().length,0,'invalidated quote cancels pending presentation');
api.rear();doc.activeElement=other;event('focusin',other);event('input',other);assert.equal(live().length,0,'starting to type cancels existing motion');api.rear();assert.equal(live().length,0,'async feedback completion cannot move while a text field is active');
doc.activeElement=body;api.rear();assert.equal(live().length,1);doc.hidden=true;doc.visibilityState='hidden';event('visibilitychange');assert.equal(live().length,0,'background document cancels active motion');api.rear();assert.equal(live().length,0,'background document cannot start motion');doc.hidden=false;doc.visibilityState='visible';
api.reset();doc.activeElement=company;api.lead(company,true,true);assert.equal(live().length,0,'focused field cannot animate');doc.activeElement=body;
api.rear();assert.equal(nodes.package.capture.pointerdown,true);nodes.package.events.pointerdown();assert.equal(live().length,0,'pointerdown cancels before coordinate mapping');api.rear();assert.equal(nodes.package.capture.pointermove,true);nodes.package.events.pointermove({buttons:0});assert.equal(live().length,1,'hover preserves finite presentation');nodes.package.events.pointermove();assert.equal(live().length,1,'missing synthetic event does not throw or imply drag');nodes.package.events.pointermove({buttons:1});assert.equal(live().length,0,'drag cancels async-arrived motion before coordinate mapping');
const details=add('testClosed','details');details.open=false;const oldParent=nodes.rearBlankImage.parentElement;nodes.rearBlankImage.parentElement=details;api.rear();assert.equal(live().length,0,'closed details never animate');nodes.rearBlankImage.parentElement=oldParent;
api.rear();const stale=live()[0];api.rear();stale.onfinish();api.cancelAll();assert.equal(live().length,0,'stale animation callback cannot remove or resurrect newer animation');
api.reset();api.beforeBackground();const surface=body.querySelector('.journeySurfaceSweep');assert(surface);assert.equal(surface.style.pointerEvents,'none');assert.equal(surface.attrs['aria-hidden'],'true');api.quote(null,false);assert.equal(body.querySelector('.journeySurfaceSweep'),surface,'quote invalidation during color refresh preserves pending reveal');api.background();assert.equal(live().length,1);finish();assert(!body.querySelector('.journeySurfaceSweep'),'surface removed on finish');api.beforeBackground();api.cancelAll();assert(!body.querySelector('.journeySurfaceSweep'),'unstarted surface removed on cancel');
const front=add('finalImage','img'),breakdown=add('breakdown');const row=add('cost','div',breakdown);row.className='priceRow';row.textContent='Existing price';const total=add('total','div',breakdown);total.className='priceRow total';api.quote({},true,{front:'data:front',rear:'data:rear',breakdown,vat:'VAT excluded'});assert.equal(front.src,'data:front');assert.equal(find(body,'journeyQuoteRear').src,'data:rear');assert.equal(find(body,'journeyQuoteCosts').children.length,2,'copies existing price rows including one total');assert.equal(find(body,'journeyQuoteCosts').children[0].id,'','cost clone has no ID');assert.equal(find(body,'journeyQuoteCosts').children[0].textContent,row.textContent,'cost text preserved verbatim');assert.equal(row.id,'cost','original price row unchanged');assert.equal(find(body,'journeyQuoteCosts').querySelectorAll('.total').length,1,'exactly one total');assert.equal(find(body,'journeyQuoteNote').textContent,'VAT excluded');api.quote(null,false);assert.equal(live().length,0);assert.equal(find(body,'journeyQuoteCosts').children.length,0);assert.equal(find(body,'journeyQuoteRear').hidden,true);
const bgPanel=add('bgPanel','details');add('backgrounds','div',bgPanel);api.colorPreview();const local=find(body,'journeyColorPreview');assert(local);assert.equal(local.style.visibility,'visible');api.hideColorPreview();assert.equal(local.style.visibility,'hidden','stale color copy hidden without resize');api.colorPreview();api.reset();assert.equal(local.style.visibility,'hidden','reset cannot retain stale local color');
assert(!/MutationObserver|requestAnimationFrame|setInterval|setTimeout|fetch\(|getImageData|toDataURL|prepareLogo|designIssue/.test(source),'motion is event-only and does no image/network work');
console.log('PASS independent journey controller: finite/cancelled motion, reduced-motion, draft suspension, reserved checks, quote token idempotency, no-typing and hidden-document safety.');
