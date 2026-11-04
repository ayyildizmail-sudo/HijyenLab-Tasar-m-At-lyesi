/* eslint-disable @typescript-eslint/no-require-imports -- bounded DOM/layout unit harness. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const api=require('../frontend/first-viewport.js');
test('viewport budget includes controls, fixed help and clearance with safe limits',()=>{
 for(const [h,t,a,f,e]of [[757,335.64,73,61,275],[844,352.14,73,61,320],[667,352.14,73,61,168],[568,350,73,0,133],[657,335.64,73,61,175]])assert.equal(api.canvasLimit(h,t,a,f),e);
 assert.equal(api.canvasLimit(0,0,0),320);assert.equal(api.canvasLimit(NaN,0,0),320);assert.equal(api.canvasLimit(300,290,73,61),100);assert.equal(api.canvasLimit(10000,0,0),320);
});
function harness({height=757,top=335.64,footer=61,opening=true}={}){
 let writes=0,moves=0,limit=320;const frames=[],callbacks=[],listeners={};
 const panel={hidden:false,dataset:{},style:{setProperty(k,v){assert.equal(k,'--first-viewport-canvas-height');writes++;limit=parseFloat(v);}},querySelector:s=>s==='canvas'?canvas:null,getBoundingClientRect:()=>({height:limit+218,bottom:top+limit+73})};
 const canvas={width:1600,height:850,getBoundingClientRect:()=>({width:818,height:limit,top,bottom:top+limit})};
 const main={classList:{contains:()=>opening}},context={before(n){assert.equal(n,panel);moves++;}},design={hidden:false},help={getBoundingClientRect:()=>({height:footer})};
 const nodes={openingExamples:panel,journeyProductContext:context,design,contactHelp:help,welcomeIntro:{},journeyProgress:{}};
 const active={},doc={readyState:'complete',activeElement:active,getElementById:id=>nodes[id],querySelector:s=>s==='main'?main:s==='header'?{}:null,addEventListener:(e,f)=>{listeners[e]=f;}};
 const root={document:doc,innerHeight:height,scrollY:0,visualViewport:{height,addEventListener:(e,f)=>{listeners['vv-'+e]=f;}},getComputedStyle:()=>({position:footer?'fixed':'static'}),requestAnimationFrame:f=>{frames.push(f);return frames.length;},addEventListener:(e,f)=>{listeners['root-'+e]=f;},ResizeObserver:class{constructor(f){callbacks.push(f);}observe(){}},MutationObserver:class{constructor(f){callbacks.push(f);}observe(){}}};
 vm.runInNewContext(fs.readFileSync('frontend/first-viewport.js','utf8'),{window:root});
 return{root,doc,panel,canvas,design,listeners,callbacks,active,flush(){while(frames.length)frames.shift()();},stats:()=>({writes,moves,limit}),setOpening(v){opening=v;},setTop(v){top=v;}};
}
test('mount moves original gallery once without canvas resizing or focus changes',()=>{
 const h=harness();h.flush();assert.deepEqual(h.stats(),{writes:1,moves:1,limit:275});assert.equal(h.canvas.width,1600);assert.equal(h.canvas.height,850);assert.equal(h.doc.activeElement,h.active);assert.equal(h.root.HijyenLabFirstViewport.mount(h.doc),null);assert.equal(h.stats().moves,1);
});
test('resize and mutation callbacks converge, and respond to viewport changes',()=>{
 const h=harness();h.flush();for(let n=0;n<20;n++){h.callbacks.forEach(f=>f());h.flush();}assert.equal(h.stats().writes,1);assert.equal(h.stats().moves,1);
 h.root.visualViewport.height=657;h.listeners['vv-resize']();h.flush();assert.equal(h.stats().limit,175);assert.equal(h.stats().writes,2);
});
test('scroll does not inflate gallery; hidden, working and non-design views are untouched',()=>{
 const h=harness();h.flush();h.root.scrollY=200;h.setTop(135.64);h.listeners.change();h.flush();assert.equal(h.stats().writes,1);
 h.panel.hidden=true;h.root.visualViewport.height=500;h.listeners.change();h.flush();assert.equal(h.stats().writes,1);
 h.panel.hidden=false;h.setOpening(false);h.listeners.change();h.flush();assert.equal(h.stats().writes,1);
 h.setOpening(true);h.design.hidden=true;h.listeners.change();h.flush();assert.equal(h.stats().writes,1);
});
test('static help spends no height; no source, price, focus, storage or control mutation',()=>{
 const h=harness({height:568,top:350,footer:0});h.flush();assert.equal(h.stats().limit,133);
 const css=fs.readFileSync('frontend/first-viewport.css','utf8'),source=fs.readFileSync('frontend/first-viewport.js','utf8');assert(css.includes('object-fit:contain'));assert(!/#package|#pricing|#rear/.test(css));assert(!/fetch\(|\.focus\(|\.scrollIntoView\(|state\.|\.value\s*=|\.checked\s*=|localStorage|sessionStorage/.test(source));
});
