/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node test matches the browser/CommonJS draft module. */
const assert=require('node:assert/strict'),D=require('../frontend/draft-store.js');
const tick=()=>new Promise(r=>setImmediate(r));
function fakeIDB(){
 const api={records:new Map(),opens:0,quota:false,failCommit:false,paused:false,pumps:[],readTransform:null,blocked:false};let created=false;
 const db={objectStoreNames:{contains:()=>created},createObjectStore(){created=true},close(){},transaction(name,mode){
  assert.equal(name,'drafts');const snapshot=new Map(Array.from(api.records,([k,v])=>[k,structuredClone(v)])),tasks=[];let scheduled=false,aborted=false,finished=false;
  const tx={error:null,abort(){if(aborted||finished)return;aborted=true;setImmediate(()=>tx.onabort?.());},objectStore(){return {put(value,key){return request(()=>{if(api.quota){const e=Error('quota');e.name='QuotaExceededError';throw e;}snapshot.set(key,structuredClone(value));return key;});},get(key){return request(()=>{const v=structuredClone(snapshot.get(key));return api.readTransform?api.readTransform(v,key):v;});},delete(key){return request(()=>{snapshot.delete(key);});}};}};
  function request(action){const req={result:undefined};tasks.push({action,req});schedule();return req;}
  function schedule(){if(scheduled||aborted||finished)return;scheduled=true;setImmediate(()=>{scheduled=false;if(api.paused){api.pumps.push(pump);return;}pump();});}
  function pump(){if(aborted||finished)return;if(tasks.length){const {action,req}=tasks.shift();try{req.result=action();req.onsuccess?.();}catch(e){tx.error=e;tx.onerror?.();tx.abort();return;}schedule();}else{if(api.failCommit){tx.error=Error('aborted commit');tx.abort();return;}finished=true;if(mode==='readwrite')api.records=snapshot;tx.oncomplete?.();}}
  schedule();return tx;
 }};
 api.open=()=>{api.opens++;const request={result:db};setImmediate(()=>{if(api.blocked){request.onblocked?.();return;}if(!created)request.onupgradeneeded?.();request.onsuccess?.();});return request;};
 api.release=()=>{api.paused=false;api.pumps.splice(0).forEach(fn=>fn());};api.db=db;return api;
}
function payload(){return {schemaVersion:1,productId:'BM12',design:{bg:'#ffffff',color:'#102f59',textColor:'#800d2e',text:'Logo yazısı',font:'sans-serif',textSize:60,tx:800,ty:520,x:800,y:425,size:100,rotation:0,recolorApplied:false,bgPantone:'',textPantone:'',requestedQuantity:null},rear:{instagram:'brand',website:'example.com',phone:'printed business phone',address:'Printed business address',extra:'',inkColor:'',qrEnabled:false,qrUrl:''},fragrance:'lemon',frontFile:new Blob(['source pixels'],{type:'image/png'}),frontName:'source.png',rearFile:null,rearName:''};}

const {test}=require('node:test');
function multi(){return {...payload(),schemaVersion:3,printMode:'printed',frontExtras:[{id:'front-1',file:new Blob(['front-extra'],{type:'image/png'}),name:'extra.png',opticalScale:1}],rearExtras:[{id:'rear-1',file:new Blob(['rear-extra'],{type:'image/svg+xml'}),name:'back.svg',opticalScale:.75}]};}
const rejects=(promise,code)=>assert.rejects(promise,e=>e.code===code);
test('v3 roundtrip retains original files, all six extras, order and bounded optical sizing',async()=>{
 const value=multi();for(const side of ['front','rear'])value[side+'Extras']=Array.from({length:3},(_,i)=>({id:side+'-'+i,file:new Blob([side+' logo '+i],{type:'image/png'}),name:side+i+'.png',opticalScale:[.75,1,1.25][i]}));
 const store=D.createStore({indexedDB:fakeIDB(),now:()=>100});await store.save(value);const got=await store.load();assert.equal(got.schemaVersion,3);assert.equal(got.printMode,'printed');assert.equal(await got.frontFile.text(),'source pixels');
 for(const side of ['front','rear'])for(let i=0;i<3;i++){assert.equal(got[side+'Extras'][i].id,side+'-'+i);assert.equal(await got[side+'Extras'][i].file.text(),side+' logo '+i);assert.equal(got[side+'Extras'][i].opticalScale,[.75,1,1.25][i]);}
});
test('v3 rejects extras with invalid IDs, files, bounds, or forbidden state',()=>{
 const base=multi(),item=base.frontExtras[0];
 for(const patch of [{id:''},{id:' '},{id:'x'.repeat(129)},{id:'bad\nname'},{name:''},{file:null},{file:'blob:temporary'},{file:new Blob([],{type:'image/png'})},{file:new Blob(['x'],{type:'text/html'})},{opticalScale:.749},{opticalScale:1.251},{opticalScale:NaN},{approved:true},{quote:{total:1}},{prepared:'data:image/png;base64,x'}])assert.throws(()=>D.validate({...base,frontExtras:[{...item,...patch}]}),e=>e.code==='INVALID');
 for(const extras of [null,{},[item,item],Array.from({length:4},(_,i)=>({...item,id:String(i)}))])assert.throws(()=>D.validate({...base,frontExtras:extras}),e=>e.code==='INVALID');
 for(const patch of [{printMode:'unprinted'},{schemaVersion:2},{approved:true},{quote:{total:1}}])assert.throws(()=>D.validate({...base,...patch}),e=>e.code==='INVALID');
});
test('v3 enforces per-file and aggregate existing byte limits including primary inputs',()=>{
 const base=multi(),item=base.frontExtras[0];
 assert.throws(()=>D.validate({...base,frontExtras:[{...item,file:new Blob([new Uint8Array(D.MAX_FILE_BYTES+1)],{type:'image/png'})}]}),e=>e.code==='INVALID');
 const big=new Blob([new Uint8Array(D.MAX_FILE_BYTES)],{type:'image/png'});
 assert.throws(()=>D.validate({...base,frontFile:big,frontExtras:[{...item,file:big}]}),e=>e.code==='INVALID');
});
test('v3 readback compares actual extra bytes even when metadata is unchanged',async()=>{
 for(const side of ['front','rear']){
  const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});
  idb.readTransform=value=>{if(!value)return value;const entry=value[side+'Extras'][0];entry.file=new Blob(['x'.repeat(entry.file.size)],{type:entry.file.type});return value;};
  await rejects(store.save(multi()),'VERIFY_FAILED');
 }
});
test('v3 validation copies array/item metadata rather than retaining mutable caller aliases',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100}),value=multi();
 const saving=store.save(value);value.frontExtras[0].name='mutated.png';value.rearExtras.length=0;
 const saved=await saving;assert.equal(saved.frontExtras[0].name,'extra.png');assert.equal(saved.rearExtras.length,1);
});
test('v3 supports empty supplemental arrays without altering v1/v2 compatibility',async()=>{
 const store=D.createStore({indexedDB:fakeIDB(),now:()=>100});
 for(const value of [payload(),{...payload(),schemaVersion:2,printMode:'printed'},{...multi(),frontExtras:[],rearExtras:[]}]){await store.save(value);assert.equal((await store.load()).schemaVersion,value.schemaVersion);}
});
test('delete invalidates in-flight v3 save and does not resurrect supplemental sources',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});await store.load();idb.paused=true;
 const saving=store.save(multi()).catch(e=>e);await tick();await tick();const clearing=store.clear();idb.release();assert.equal((await saving).code,'STALE');await clearing;assert.equal(await store.load(),null);
});
