/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser VM regression. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Fragrance = require('../frontend/fragrance.js');
(async () => {
 const nodes = {}, calls = [];
 const make = () => ({hidden:false,disabled:false,children:[],append(...items){this.children=this.children.filter(x=>!items.includes(x));this.children.push(...items);},before(){},querySelector(){return make();}});
 const $ = id => nodes[id] || (nodes[id]=make());
 const c = { Fragrance, $, selectedProductId:'BM12', selectedPrintMode:'printed', state:{}, latest:{}, step:1,
  document:{createElement:make}, invalidateQuote(){}, isUnprinted:()=>c.selectedPrintMode==='unprinted',
  isDeclaredQuote:()=>false, designIssue:()=>false, showDesignIssue(){throw Error('unexpected design guard');},
  rearQuoteReady:()=>true, hideRearPreview(){}, showRearPreview(){throw Error('unexpected rear navigation');},
  go(n){c.lastGo=n;c.hideFragrance();}, setTimeout,clearTimeout,AbortController,
  fetch:async(...args)=>{calls.push(args);throw Error('no network permitted');},
  localStorage:{getItem(){throw Error('no storage read');},setItem(){throw Error('no storage write');}}
 };
 vm.createContext(c); vm.runInContext(fs.readFileSync('frontend/fragrance-ui.js','utf8'),c);
 const select=id=>vm.runInContext(`{const r=fragranceButtons.get('${id}').radio;r.checked=true;r.onchange();}`,c);
 const order=()=>vm.runInContext("$('fragranceCards').children.map(n=>[...fragranceButtons].find(([,v])=>v.label===n)[0]).join(',')",c);
 const recommended=()=>vm.runInContext("[...fragranceButtons].filter(([,v])=>v.label.className.includes('fragranceRecommended')&&!v.badge.hidden).map(([id])=>id).join(',')",c);
 c.selectedProductId='OSHIBORI';c.resetFragrance();
 assert.equal(c.fragranceSnapshot().id,'green_tea');
 assert.equal(c.fragranceSnapshot().productFamily,'oshibori');
 assert.equal(c.fragranceReady(),false,'Printed default still requires explicit confirmation');
 assert.equal(order(),'green_tea,flambau,bodrum_mandarin,lemon');
 assert.equal(recommended(),'green_tea');
 assert.equal($('changeFragrance').hidden,false);
 c.showFragrance();assert.equal($('fragrancePrivacyNote').hidden,true);
 await $('fragranceContinue').onclick();assert.equal(c.fragranceReady(),true);assert.equal(c.lastGo,2);
 for(const mode of ['printed','unprinted']){
  c.selectedPrintMode=mode;c.resetFragrance();
  assert.equal(c.fragranceSnapshot().id,'green_tea');
  assert.equal(c.hasFixedProductFragrance(),false);
  assert.equal(c.fragranceReady(),mode==='unprinted');
  if(mode==='unprinted'){c.designIssue=()=>true;c.rearQuoteReady=()=>false;}
  for(const scent of ['green_tea','flambau','bodrum_mandarin','lemon']){
   c.showFragrance();assert.equal(vm.runInContext('fragrancePanel.hidden',c),false);
   select(scent);assert.equal(c.fragranceSnapshot().id,scent);
   assert.equal(c.fragranceSnapshot().fixed,undefined);
   assert(vm.runInContext('[...fragranceButtons.values()].every(v=>!v.radio.disabled)',c));
   await $('fragranceContinue').onclick();assert.equal(c.lastGo,2);assert(c.fragranceReady());
  }
  if(mode==='unprinted'){c.showFragrance();$('fragranceBack').onclick();assert.equal(c.lastGo,1);}
 }
 assert.equal(calls.length,0,'No Oshibori GET/POST preference service calls');
 assert.throws(()=>c.fragranceSubmission('green_tea'),/havlu istatistiğine/);
 await assert.rejects(()=>c.fragranceFetch({method:'GET'}),/havlu istatistiğine/);
 c.selectedProductId='BM12';c.resetFragrance();assert.equal(c.fragranceSnapshot().id,'flambau');assert.equal(c.fragranceSnapshot().fixed,true);
 assert.equal(recommended(),'flambau');assert.equal(order(),'flambau,green_tea,bodrum_mandarin,lemon');assert.equal($('changeFragrance').hidden,true);
 c.selectedProductId='BM21';c.resetFragrance();assert.equal(c.fragranceSnapshot().id,'green_tea');assert.equal(c.fragranceSnapshot().fixed,true);
 c.selectedPrintMode='printed';c.resetFragrance();assert.equal(c.fragranceSnapshot(),null);assert.equal(c.fragranceReady(),false);
 const unprintedSource=fs.readFileSync('frontend/unprinted-ui.js','utf8');
 assert(unprintedSource.includes("oshibori?(fragranceSnapshot()?.label||'Yeşil çay')"));
 assert(unprintedSource.includes("(oshibori?'':' · Baskısız ürünlerde sabit')"));
 console.log('PASS Oshibori fragrance: Green Tea first/default, all four scents both modes, explicit printed confirmation, selectable unprinted, no statistics, existing fixed scents unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
