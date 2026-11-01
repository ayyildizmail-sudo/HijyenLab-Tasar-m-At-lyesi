/* eslint-disable @typescript-eslint/no-require-imports */
// Real installer/handlers under a small DOM harness + source CSS contract.
// Not browser geometry, native keyboard, or physical iPhone verification.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('frontend/app.js','utf8'),html=fs.readFileSync('frontend/index.html','utf8'),css=fs.readFileSync('frontend/style.css','utf8');
const nodes={};
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.value='';this.hidden=false;this.textContent='';this.attrs={};}
 set id(value){this._id=value;nodes[value]=this;}get id(){return this._id;}
 append(n){this.children.push(n);n.parentElement=this;}insertBefore(n,before){this.children.splice(this.children.indexOf(before),0,n);n.parentElement=this;}
 querySelector(tag){return this.children.find(n=>n.tagName===tag.toUpperCase())||null;}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(t,f){(this.listeners[t]??=[]).push(f);}
 fire(t){for(const f of this.listeners[t]||[])f();}replaceChildren(){this.children=[];}add(n){this.children.push(n);}
 closest(){return this.parentElement;}focus(){active=this.id;}scrollIntoView(){scrolled=this.id;}
}
let active='',scrolled='';const add=(id,tag='div')=>{const n=new Node(tag);n.id=id;return n;};
for(const id of ['pricing','breakdown','quoteImage','quoteOpen','quoteDownloadPreview','province','district','districtField'])add(id);
const article=new Node('article');nodes.pricing.append(article);article.append(nodes.breakdown);
const ctx={$:id=>nodes[id],document:{createElement:tag=>new Node(tag)},ShippingLocation:require('../frontend/shipping-location.js'),leadTouched:new Set(),leadSubmitted:false,step:2,calculate(){},go(){},status(){},Option:function(text,value){this.text=text;this.value=value;}};
vm.createContext(ctx);
const start=app.indexOf('function setDistrict(){');vm.runInContext(app.slice(start,app.indexOf('\n',start)),ctx);
vm.runInContext(app.slice(app.indexOf('function leadError('),app.indexOf('// Inspect bytes before routing;')),ctx);
for(const [id,type,autocomplete] of [['customerName','text','organization'],['contactName','text','name'],['contactPhone','tel','tel']]){
 const input=nodes[id];assert.equal(input.type,type);assert.equal(input.autocomplete,autocomplete);assert.equal(input.required,true);assert.equal(input.parentElement.tagName,'LABEL');assert(input.parentElement.textContent,'label remains named, not replaced by placeholder');
}
assert.match(html,/<select[^>]*id="province"/);assert.match(html,/<select[^>]*id="district"/);
assert(nodes.province.children.some(n=>n.value==='Muğla'));assert.equal(nodes.leadError.hidden,true);
function type(id,value){nodes[id].value=value;nodes[id].fire('input');}
type('customerName','Test Otel');nodes.customerName.fire('blur');type('contactName','Ayşe');nodes.contactName.fire('blur');type('contactPhone','05321234567');nodes.contactPhone.fire('blur');
assert.equal(nodes.leadError.hidden,true,'empty delivery is absent from contact banner');assert.equal(article.hidden,true,'empty province still blocks quote');
let prevented=false;nodes.quoteOpen.onclick({preventDefault(){prevented=true;}});assert(prevented);assert.equal(active,'province');assert.equal(scrolled,'province');assert.equal(nodes.leadError.hidden,true);
nodes.province.value='Muğla';ctx.setDistrict();nodes.province.fire('change');assert.equal(nodes.district.required,true);assert.equal(nodes.districtField.hidden,false);assert.equal(ctx.validateLead(true),false);assert.equal(active,'district');assert.equal(nodes.leadError.hidden,true);
nodes.district.value='Bodrum';nodes.district.fire('change');assert.equal(article.hidden,false);
for(const value of ['', 'A','Ayşe']){type('contactName',value);nodes.contactName.fire('blur');assert.equal(nodes.contactName.value,value);assert.equal(article.hidden,value.length<2);assert.equal(nodes.leadError.hidden,value.length>=2);}
nodes.province.value='Antalya';ctx.setDistrict();nodes.province.fire('change');assert.equal(nodes.district.required,false);assert.equal(nodes.districtField.hidden,true);assert.equal(ctx.validateLead(false),true);
// The ID-specific rule beats the later generic welcome-layout focus selector.
const inputRule=css.match(/#leadFields input \{([^}]+)\}/)[1],focusRule=css.match(/#leadFields input:focus-visible \{([^}]+)\}/)[1];
assert.match(inputRule,/margin-top: 8px/);assert.match(inputRule,/font-size: max\(16px, 1rem\)/);assert.match(css,/\.leadFields input\{[^}]*min-height:44px/);
const outline=Number(focusRule.match(/outline: (\d+)px/)[1]),offset=Number(focusRule.match(/outline-offset: (-?\d+)px/)[1]);assert(outline>=2);assert(outline+offset<=0,'focus outline has zero outward extent toward label');
assert.match(fs.readFileSync('frontend/welcome-layout.css','utf8'),/\.atelierLayout :is\([^}]+:focus-visible/);
console.log('PASS real contact installer and input/blur/change/click handlers: labeled telephone field, touch-state validation, delivery gating/focus, Muğla rule, repeated typing. CSS contract: 8px gap, inset visible focus, 16px font, 44px target. Browser/device geometry NOT_RUN.');
