/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const {createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('frontend/rear-preview.js','utf8'),inkSource=fs.readFileSync('frontend/print-inks-ui.js','utf8');
function harness(){
 const nodes={},timers=new Map(),images=[],calls={inks:0,pixels:0,render:0,invalidations:0,go:[]};let timerId=0;
 const doc={activeElement:null};
 function make(id=''){
  const listeners={};let value='';
  return {id,hidden:false,disabled:false,textContent:'',naturalWidth:1200,naturalHeight:600,writes:0,
   get value(){return value;},set value(next){value=String(next);this.writes++;},
   userValue(next){value=next;},classList:{add(){},remove(){}},after(){},append(){},replaceChildren(){},
   removeAttribute(key){delete this[key];},closest(){return null;},
   addEventListener(type,fn){(listeners[type]||=[]).push(fn);},
   emit(type){for(const fn of listeners[type]||[])fn({target:this});},
   focus(){if(doc.activeElement===this)return;doc.activeElement?.blur();doc.activeElement=this;this.emit('focus');},
   blur(){if(doc.activeElement===this)doc.activeElement=null;this.emit('blur');}
  };
 }
 const $=id=>nodes[id]||(nodes[id]=make(id));
 doc.createElement=tag=>{if(tag==='canvas')return createCanvas(1,1);const node=make();Object.defineProperty(node,'id',{get(){return this._id;},set(id){this._id=id;nodes[id]=this;}});return node;};
 const logo=createCanvas(100,60);logo.getContext('2d').fillStyle='#153b67';logo.getContext('2d').fillRect(10,10,80,40);
 const PrintInks=require('../frontend/print-inks.js');
 const ctx={$,document:doc,Image:function(){const image=make();images.push(image);return image;},
  state:{logo:'native-front',bg:'#ffffff',text:'',textColor:'#000000',removed:false,removeWhite:false},logoImg:logo,photoImg:null,
  prepareLogo:()=>logo,PrintInks:{...PrintInks,estimate(...args){calls.pixels++;return PrintInks.estimate(...args);}},CombinedInks:require('../frontend/combined-inks.js'),
  latest:{total:1},step:1,invalidateQuote(){calls.invalidations++;},calculateRaw(){},refresh(){},calculate(){},
  designIssue:()=>false,designFingerprint:()=> 'approved-front',appliedFrontApproved:()=>true,processingSession:{isApproved:()=>true},
  showDesignIssue(){},imageData:()=> 'front-original',requestAnimationFrame:fn=>fn(),window:{matchMedia:()=>({matches:false}),scrollTo(){}},status(){},go:n=>calls.go.push(n),
  clearTimeout:id=>timers.delete(id),setTimeout:fn=>{timers.set(++timerId,fn);return timerId;}
 };
 vm.createContext(ctx);vm.runInContext(inkSource,ctx);vm.runInContext(source,ctx);
 const actualSync=ctx.syncPrintInks;ctx.syncPrintInks=()=>{assert.equal(ctx.rearTextEditing(),false,'expensive ink/policy path may not run during rear editing');calls.inks++;return actualSync();};
 ctx.rearMaterialDataURL=()=>{calls.render++;calls.rendered=JSON.parse(vm.runInContext('JSON.stringify(rearContent)',ctx));return 'data:image/png;base64,REAR'+calls.render;};
 function settle(){let n=0;while(timers.size){assert(++n<20,'bounded deferred work');const jobs=[...timers.values()];timers.clear();for(const fn of jobs)fn();}}
 function complete(){images.at(-1).onload();$('rearBlankImage').onload();}
 ctx.showRearPreview();complete();calls.inks=calls.pixels=calls.render=0;
 return {ctx,$,doc,calls,images,settle,complete,read:code=>vm.runInContext(code,ctx),type(id,value){const node=$(id);node.userValue(value);node.oninput();}};
}
test('typing/clearing/retyping and switching rear fields do zero ink scans or PNG work; blur flushes latest values once',()=>{
 const h=harness(),front=JSON.stringify(h.ctx.state),web='  Ornek.COM/İşletme?A=1  ';
 h.$('rearWebsite').focus();h.type('rearWebsite',web);h.settle();
 h.$('rearInstagram').focus();h.settle();
 const writes=h.$('rearWebsite').writes;
 for(let i=0;i<100;i++){h.type('rearInstagram',i%3===0?'':`Hijyenlab_İşletme_${i}`);h.settle();h.ctx.syncRearFields();}
 assert.equal(h.calls.inks,0);assert.equal(h.calls.pixels,0);assert.equal(h.calls.render,0);
 assert.equal(h.$('rearWebsite').value,web);assert.equal(h.$('rearWebsite').writes,writes,'unrelated text fields are not rewritten');
 assert.equal(h.read('rearContent.website'),web);assert.equal(h.read('rearContent.instagram'),'');
 assert.equal(h.ctx.latest,null);assert.equal(h.ctx.rearQuoteReady(),false);assert.equal(h.$('rearToPrice').textContent,'Yazdıklarımı önizle');
 h.type('rearInstagram','@Çağrı_şölen');h.$('rearInstagram').blur();assert.equal(h.calls.inks,0,'blur does not block the next focus event');h.settle();
 assert.equal(h.calls.inks,1);assert(h.calls.pixels>0,'real ink estimator ran after editing');assert.equal(h.ctx.rearQuoteReady(),false);
 h.complete();assert.equal(h.calls.render,1);assert.equal(h.calls.rendered.instagram,'@Çağrı_şölen');assert.equal(h.calls.rendered.website,web);
 assert.equal(h.$('inks').value,'1','automatic existing navy text does not invent a plate');assert.equal(h.ctx.rearQuoteReady(),true);
 assert.equal(h.ctx.state.logo,JSON.parse(front).logo);assert.equal(h.ctx.state.bg,JSON.parse(front).bg);
});
test('IME final input is verbatim; asynchronous field sync never replaces active composition',()=>{
 const h=harness(),node=h.$('rearWebsite');node.focus();node.emit('compositionstart');
 h.type('rearWebsite','tas');node.userValue('tasarım.İST');h.ctx.syncRearFields();assert.equal(node.value,'tasarım.İST','state-sync cannot overwrite an uncommitted composition');
 node.blur();h.settle();assert.equal(h.calls.inks,0,'composition remains protected across blur');
 node.userValue('  tasarım.İST/Çığ  ');node.emit('compositionend');node.oninput();h.settle();
 assert.equal(h.calls.inks,1);h.complete();assert.equal(h.calls.rendered.website,'  tasarım.İST/Çığ  ');assert.equal(node.value,'  tasarım.İST/Çığ  ');
 assert.equal(h.read('rearContent.instagram'),'');assert.equal(h.read('rearContent.qrUrl'),'','website never implicitly fills QR');
});
test('preview button flushes edits, but only a later approval of the current image can continue',()=>{
 const h=harness();h.$('rearPhone').focus();h.type('rearPhone','+90 555 123 45 67');
 h.$('rearToPrice').onclick();assert.equal(h.calls.inks,0);assert.deepEqual(h.calls.go,[]);h.settle();assert.equal(h.calls.inks,1);
 assert.equal(h.$('rearToPrice').disabled,true);assert.equal(h.ctx.rearQuoteReady(),false);
 h.complete();h.$('rearToPrice').onclick();assert.deepEqual(h.calls.go,[2]);
});
test('in-flight source/image callbacks cannot certify or overwrite a newer typed revision',()=>{
 const h=harness();h.ctx.renderRearPreview(false);const staleSource=h.images.at(-1).onload,staleImage=h.$('rearBlankImage').onload;
 h.$('rearAddress').focus();h.type('rearAddress','Yeni adres');staleSource();staleImage();assert.equal(h.calls.render,0);assert.equal(h.ctx.rearQuoteReady(),false);
 h.$('rearAddress').blur();h.settle();h.$('rearBlankImage').onload();assert.equal(h.ctx.rearQuoteReady(),false,'old displayed load cannot approve before this render produced a URL');
 staleSource();staleImage();assert.equal(h.calls.render,0);h.complete();assert.equal(h.calls.rendered.address,'Yeni adres');assert.equal(h.ctx.rearQuoteReady(),true);
 h.$('rearExtra').focus();h.type('rearExtra','stale');h.ctx.resetRearPreview();h.settle();staleSource();staleImage();
 assert.equal(h.$('rearExtra').value,'');assert.equal(h.read('rearContent.extra'),'');assert.equal(h.$('rearPreview').hidden,true);
});
test('post-edit explicit rear color still recalculates real combined inks and rejects stale front approval',()=>{
 const h=harness();h.$('rearWebsite').focus();h.type('rearWebsite','ornek.com');h.$('rearWebsite').blur();h.settle();h.complete();
 h.$('rearInkColor').value='#800d2e';h.$('rearInkColor').oninput();assert.equal(h.$('inks').value,'2');assert.equal(h.ctx.rearQuoteReady(),false);h.settle();h.complete();
 h.ctx.processingSession.isApproved=()=>false;h.$('rearToPrice').onclick();assert.deepEqual(h.calls.go,[1]);
});
test('explicit QR helpers still update the focused QR field without rewriting website or Instagram',()=>{
 const h=harness();h.$('rearWebsite').focus();h.type('rearWebsite','  Ornek.COM/Çığ  ');h.$('rearQrUrl').focus();h.type('rearQrUrl','unfinished');
 h.$('rearQrWebsite').onclick();assert.equal(h.$('rearQrUrl').value,'https://Ornek.COM/Çığ');assert.equal(h.read('rearContent.qrUrl'),'https://Ornek.COM/Çığ');
 assert.equal(h.$('rearWebsite').value,'  Ornek.COM/Çığ  ');assert.equal(h.read('rearContent.instagram'),'');assert.equal(h.calls.inks,0);
 h.$('rearQrEnabled').checked=false;h.$('rearQrEnabled').onchange();assert.equal(h.$('rearQrUrl').value,'');assert.equal(h.read('rearContent.qrUrl'),'');
});
test('identity/link fields request no browser spelling correction, capitalization or autofill',()=>{
 for(const id of ['rearInstagram','rearWebsite','rearPhone','rearAddress','rearExtra','rearQrUrl']){
  const tag=source.match(new RegExp('<input id="'+id+'"[^>]+>'))?.[0];assert(tag,id);
  for(const attribute of ['autocomplete="off"','autocorrect="off"','autocapitalize="none"','spellcheck="false"'])assert(tag.includes(attribute),id+' '+attribute);
  if(['rearWebsite','rearQrUrl'].includes(id))assert(tag.includes('inputmode="url"'));
 }
});

// Empty rear never needs a second preview tap, even immediately after deleting old text.
test('clearing every rear field skips in one action without stale content, rendering or lost front guards',()=>{
 const h=harness();
 for(const id of ['rearInstagram','rearWebsite','rearPhone','rearAddress','rearExtra']){h.$(id).focus();h.type(id,'Previous '+id);}
 h.doc.activeElement.blur();h.settle();h.complete();assert(h.ctx.rearQuoteImage());
 for(const id of ['rearInstagram','rearWebsite','rearPhone','rearAddress','rearExtra']){h.$(id).focus();h.type(id,'');}
 const scans=h.calls.inks,renders=h.calls.render;
 assert.equal(h.ctx.rearEmptyForSkip(),true);assert.equal(h.read('rearInputPending'),true);
 h.$('skipEmptyRear').onclick();assert.deepEqual(h.calls.go,[2]);assert.equal(h.doc.activeElement,null);
 assert.equal(h.calls.inks,scans);assert.equal(h.calls.render,renders);assert.equal(h.ctx.rearQuoteImage(),null);
 assert.equal(h.read('rearRenderedData'),null);assert.equal(h.ctx.latest,null);
 for(const field of ['instagram','website','phone','address','extra'])assert.equal(h.ctx.rearQuoteSnapshot()[field],'');
 h.ctx.processingSession.isApproved=()=>false;h.$('skipEmptyRear').onclick();assert.deepEqual(h.calls.go,[2,1]);
 h.ctx.processingSession.isApproved=()=>true;h.ctx.designFingerprint=()=> 'changed-front';h.$('skipEmptyRear').onclick();assert.deepEqual(h.calls.go,[2,1,1]);
});
test('empty skip stays unavailable for QR, sponsor sources, pending/reviewed logos and failures',()=>{
 const h=harness();
 for(const setup of ["rearContent.qrEnabled=true", "rearContent.sponsorHash='accepted'", "rearSponsorSource={file:{}}", "rearSponsorPending=true", "rearSponsorReview={}", "rearSponsorFailure='failed'"]){
  h.read("rearContent.qrEnabled=false;rearContent.sponsorHash='';rearSponsorSource=null;rearSponsorPending=false;rearSponsorReview=null;rearSponsorFailure='';"+setup);
  h.ctx.syncRearSkip();assert.equal(h.$('skipEmptyRear').hidden,true);assert.equal(h.$('skipEmptyRear').disabled,true);
  h.$('skipEmptyRear').onclick();assert.deepEqual(h.calls.go,[]);
 }
});
for(const ready of [false,true])for(const filled of [false,true])test(`rear label matches actual next route: fragrance ready=${ready}, content=${filled}`,()=>{
 const h=harness();h.ctx.fragranceReady=()=>ready;
 if(filled){h.$('rearExtra').focus();h.type('rearExtra','Approved text');h.$('rearExtra').blur();h.settle();h.complete();}
 h.ctx.syncRearSkip();const button=h.$(filled?'rearToPrice':'skipEmptyRear');
 assert.match(button.textContent,ready?/fiyatı gör/:/koku seçimine geç/);
 // Exercise the actual central go(2), not a fake destination selection.
 const app=fs.readFileSync('frontend/app.js','utf8');
 Object.assign(h.ctx,{isUnprinted:()=>false,isDeclaredQuote:()=>false,isReferencePreview:()=>false,simpleReady:false,showFragrance:()=>{h.ctx.destination='fragrance';},hideFragrance(){},draw(){}});
 h.doc.querySelectorAll=()=>[];
 vm.runInContext(app.slice(app.indexOf('function go(n){'),app.indexOf("$('useMinimum').onclick")),h.ctx);
 button.onclick();
 if(ready){assert.equal(h.ctx.step,2);assert.equal(h.$('pricing').hidden,false);assert.equal(h.ctx.destination,undefined);}
 else assert.equal(h.ctx.destination,'fragrance');
});
