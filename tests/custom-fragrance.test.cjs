'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Fragrance=require('../frontend/fragrance.js');
(async()=>{
const nodes={},calls=[],events=[];let invalidations=0;
const make=()=>({value:'',hidden:false,disabled:false,children:[],listeners:{},append(...items){this.children=this.children.filter(x=>!items.includes(x));this.children.push(...items);},before(){},querySelector(){return make();},addEventListener(n,fn){(this.listeners[n]??=[]).push(fn);},dispatchEvent(e){events.push(e.type);for(const fn of this.listeners[e.type]||[])fn(e);}});
const $=id=>nodes[id]||(nodes[id]=make());$('qty').value='10000';
const c={Fragrance,$,state:{},step:1,latest:{},selectedProductId:'BM12',selectedPrintMode:'printed',document:{createElement:make},Event,
 invalidateQuote(){invalidations++;},isUnprinted:()=>c.selectedPrintMode==='unprinted',isDeclaredQuote:()=>false,designIssue:()=>false,showDesignIssue(){},rearQuoteReady:()=>true,hideRearPreview(){},showRearPreview(){},go(n){c.lastGo=n;c.hideFragrance();},setTimeout,clearTimeout,AbortController,
 fetch:async(...args)=>{calls.push(args);throw Error('unexpected network');},localStorage:{getItem(){throw Error('unexpected storage');},setItem(){throw Error('unexpected storage');}}};
vm.createContext(c);vm.runInContext(fs.readFileSync('frontend/fragrance-ui.js','utf8'),c);
const select=id=>vm.runInContext(`{const r=fragranceButtons.get('${id}').radio;r.checked=true;r.onchange();}`,c);
const name=value=>{$('customFragranceName').value=value;$('customFragranceName').oninput();};
assert.equal(Fragrance.OPTIONS.length,4);assert.equal(Fragrance.validId('other'),false);assert.equal(Fragrance.CHOICES.at(-1).id,'other');
assert.equal($('fragranceCards').children.at(-1).children[0].value,'other');
select('other');assert.equal($('customFragranceFields').hidden,false);assert.equal($('customFragranceName').required,true);assert.equal(c.fragranceMinimumQuantity(),20000);assert.equal(c.fragranceReady(),false);assert.equal($('fragranceContinue').disabled,true);
await $('fragranceContinue').onclick();assert.equal(c.lastGo,undefined);
name('   ');assert.equal(c.fragranceSnapshot(),null);assert.equal($('fragranceContinue').disabled,true);
name('  Lavanta  çiçeği  ');assert.equal(c.fragranceSnapshot().customName,'Lavanta çiçeği');assert.equal(c.fragranceSnapshot().label,'Diğer: Lavanta çiçeği');assert.equal($('customFragranceName').value,'  Lavanta  çiçeği  ','no per-keystroke trim/writeback');assert.equal($('fragranceContinue').disabled,true);
await $('fragranceContinue').onclick();assert.equal(c.lastGo,undefined);assert.equal($('qty').value,'10000','never silently increases quantity');
$('customFragranceQuantity').onclick();assert.equal($('qty').value,'20000');assert.deepEqual(events,['input','change']);assert.equal($('fragranceContinue').disabled,false);
await $('fragranceContinue').onclick();assert.equal(c.lastGo,2);assert.equal(c.fragranceReady(),true);assert.equal(calls.length,0);assert.equal($('fragrancePrivacyNote').hidden,true);
assert.throws(()=>c.fragranceSubmission('other'),/Özel koku/);await assert.rejects(()=>c.fragranceFetch({method:'POST',body:JSON.stringify({fragrance:'other',customName:'Lavanta'})}),/Özel koku/);assert.equal(calls.length,0);
$('qty').value='19999';$('qty').dispatchEvent(new Event('change'));assert.equal(c.fragranceReady(),false);assert.equal($('fragranceContinue').disabled,true);
$('qty').value='20000';$('qty').dispatchEvent(new Event('change'));assert.equal(c.fragranceReady(),false,'lowering quantity revokes confirmation');await $('fragranceContinue').onclick();assert(c.fragranceReady());
name('<img src=x onerror=alert(1)>');assert.equal(c.fragranceReady(),false);assert.equal($('fragrancePriceValue').textContent,'Koku: Diğer: <img src=x onerror=alert(1)>','untrusted name is text, not HTML');
name('x'.repeat(100));assert.equal(c.fragranceSnapshot().customName.length,80);
name('Lavanta');await $('fragranceContinue').onclick();const snapshot=c.fragranceSnapshot();c.resetFragrance();assert.equal($('customFragranceName').value,'');c.restoreFragrance(snapshot,true);assert(c.fragranceReady());assert.equal(c.fragranceSnapshot().customName,'Lavanta');
select('lemon');$('qty').value='10000';assert.equal(c.fragranceMinimumQuantity(),0);assert.equal(c.fragranceError(),'');assert.equal($('customFragranceFields').hidden,true);assert.equal($('customFragranceName').required,false);
c.selectedPrintMode='unprinted';c.syncFragrance();assert.equal(c.fragranceSnapshot().id,'flambau');assert(c.fragranceReady());assert.equal(vm.runInContext("fragranceButtons.get('other').label.hidden",c),true);
c.selectedProductId='BM21';c.syncFragrance();assert.equal(c.fragranceSnapshot().id,'green_tea');
c.selectedProductId='OSHIBORI';c.resetFragrance();select('other');name('Nane');$('qty').value='19999';assert.equal(c.fragranceReady(),false);$('customFragranceQuantity').onclick();await $('fragranceContinue').onclick();assert(c.fragranceReady());assert.equal(c.fragranceSnapshot().customName,'Nane');assert.equal(calls.length,0);
c.productRules=()=>({unitsPerBox:3000,minimum:{white:9000,colored:12000}});c.selectedPrintMode='printed';c.syncFragrance();assert.equal(c.fragranceOrderMinimum(),21000);assert.equal($('customFragranceQuantity').textContent,'Adedi 21.000 yap (7 koli)');assert.equal(c.fragranceReady(),false);$('customFragranceQuantity').onclick();assert.equal($('qty').value,'21000');await $('fragranceContinue').onclick();assert(c.fragranceReady());
c.productRules=()=>({unitsPerBox:3000,minimum:{white:25000,colored:30000}});assert.equal(c.fragranceOrderMinimum(),27000,'higher product minimum also rounds up');
assert(invalidations>0);assert.match(fs.readFileSync('frontend/style.css','utf8'),/input\[value=other\].*--fragrance-tint:#f4f5f7/);
console.log('PASS custom fragrance: fifth gray choice, required bounded literal name, explicit 20k quantity action, confirmation invalidation, local restore, fixed scent isolation, no custom network/storage statistics.');
})().catch(e=>{console.error(e);process.exitCode=1;});
