const assert=require('node:assert/strict'),fs=require('node:fs'),D=require('../frontend/draft-store.js');
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
const tests=[];function test(name,run){tests.push({name,run});}
const rejects=(promise,code)=>assert.rejects(promise,e=>e.code===code);
test('save resolves only verified committed readback; load preserves source bytes and seven-day expiry',async()=>{
 const idb=fakeIDB();let now=100000;const store=D.createStore({indexedDB:idb,now:()=>now}),saved=await store.save(payload());assert.equal(saved.savedAt,now);assert.equal(saved.expiresAt,now+D.TTL_MS);assert.equal(await saved.frontFile.text(),'source pixels');now+=1000;const loaded=await store.load();assert.equal(loaded.savedAt,100000);assert.equal(loaded.expiresAt,saved.expiresAt);assert.equal(loaded.rear.address,'Printed business address');
});
test('expiry removes only this draft, clear preserves unrelated records',async()=>{
 const idb=fakeIDB();let now=1000;const store=D.createStore({indexedDB:idb,now:()=>now});await store.save(payload());idb.records.set('unrelated',{value:1});now+=D.TTL_MS;assert.equal(await store.load(),null);assert(!idb.records.has('active'));assert(idb.records.has('unrelated'));await store.save(payload());await store.clear();assert.equal(await store.load(),null);assert(idb.records.has('unrelated'));
});
test('partial, forbidden customer/price/approval fields, unknown schema and blob URL reject before writes',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});
 for(const patch of [{schemaVersion:2},{customerName:'Alice'},{contactPhone:'123'},{province:'Muğla'},{quote:{total:1}},{approved:true},{frontFile:'blob:temporary'}])await rejects(store.save({...payload(),...patch}),'INVALID');
 const partial=payload();delete partial.design.x;await rejects(store.save(partial),'INVALID');assert.equal(idb.opens,0);
});
test('bounds, invalid content types and malformed name/file combinations are rejected',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb});
 await rejects(store.save({...payload(),frontFile:new Blob([new Uint8Array(D.MAX_FILE_BYTES+1)],{type:'image/png'})}),'INVALID');
 await rejects(store.save({...payload(),frontFile:new Blob(['x'],{type:'text/html'})}),'INVALID');
 await rejects(store.save({...payload(),frontName:''}),'INVALID');await rejects(store.save({...payload(),rearName:'orphan.png'}),'INVALID');
 for(const patch of [{x:Infinity},{x:1601},{rotation:361},{text:'x'.repeat(501)},{font:'url(evil)'},{requestedQuantity:1.5},{bg:'red'}])await rejects(store.save({...payload(),design:{...payload().design,...patch}}),'INVALID');
 await rejects(store.save({...payload(),rear:{...payload().rear,qrUrl:'x'.repeat(2049)}}),'INVALID');assert.equal(idb.records.size,0);
});
test('supported raw image formats remain bounded local sources, not trusted decoded output',async()=>{const store=D.createStore({indexedDB:fakeIDB(),now:()=>100});for(const type of ['image/webp','image/gif','image/bmp','image/x-ms-bmp','image/avif']){const saved=await store.save({...payload(),frontFile:new Blob(['raw source'],{type})});assert.equal(saved.frontFile.type,type);}});
test('corrupt stored envelopes are not returned as resumable drafts',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});await store.save(payload());const good=structuredClone(idb.records.get('active'));
 for(const patch of [{schemaVersion:99},{expiresAt:good.expiresAt+1},{customerName:'bad'},{frontFile:'blob:lost'}]){idb.records.set('active',{...good,...patch});await rejects(store.load(),'INVALID');}
});
test('quota/private-browser/aborted transaction never report saved or partial committed data',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});idb.quota=true;await rejects(store.save(payload()),'QUOTA');assert.equal(idb.records.size,0);idb.quota=false;idb.failCommit=true;await rejects(store.save(payload()),'UNAVAILABLE');assert.equal(idb.records.size,0);
 await rejects(D.createStore({indexedDB:null}).load(),'UNAVAILABLE');const blocked=fakeIDB();blocked.blocked=true;await rejects(D.createStore({indexedDB:blocked}).load(),'UNAVAILABLE');
});
test('readback validates metadata and actual Blob bytes, not just size',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});idb.readTransform=v=>v?{...v,frontFile:new Blob(['wrong  pixels'],{type:'image/png'})}:v;await rejects(store.save(payload()),'VERIFY_FAILED');
 idb.readTransform=v=>v?{...v,design:{...v.design,text:'corrupted'}}:v;await rejects(store.save(payload()),'VERIFY_FAILED');
});
test('clear invalidates queued and in-flight saves; no resurrection after delete resolves',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});await store.load();idb.paused=true;const a=store.save(payload()).catch(e=>e),b=store.save(payload()).catch(e=>e);await tick();await tick();const clear=store.clear();idb.release();assert.equal((await a).code,'STALE');assert.equal((await b).code,'STALE');await clear;assert.equal(await store.load(),null);
});
test('rapid serialized saves keep latest snapshot and do not retain mutable caller references',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100}),a=payload(),first=store.save(a);a.design.text='mutated after save call';const b=payload();b.design.text='latest';const second=store.save(b);assert.equal((await first).design.text,'Logo yazısı');await second;assert.equal((await store.load()).design.text,'latest');assert.equal(idb.records.size,1);
});
test('two store handles in the same page share deletion ordering',async()=>{const idb=fakeIDB(),a=D.createStore({indexedDB:idb,now:()=>100}),b=D.createStore({indexedDB:idb,now:()=>100});await a.load();idb.paused=true;const pending=a.save(payload()).catch(e=>e);await tick();const clear=b.clear();idb.release();assert.equal((await pending).code,'STALE');await clear;assert.equal(await a.load(),null);});
test('v2 printed drafts retain artwork while legacy v1 remains readable',async()=>{const store=D.createStore({indexedDB:fakeIDB(),now:()=>100});const old=await store.save(payload());assert.equal(old.schemaVersion,1);assert.equal(old.printMode,undefined);const next=await store.save({...payload(),schemaVersion:2,printMode:'printed'});assert.equal(next.printMode,'printed');assert.equal((await store.load()).design.text,'Logo yazısı');});
function blankDraft(productId,quantity){return{schemaVersion:2,printMode:'unprinted',productId,design:{requestedQuantity:quantity},rear:null,fragrance:'lemon',frontFile:null,frontName:'',rearFile:null,rearName:''};}
test('v2 unprinted drafts roundtrip only product, whole-carton quantity and fragrance',async()=>{const store=D.createStore({indexedDB:fakeIDB(),now:()=>100});for(const [id,units] of [['BM12',400],['BM15',500],['BM545',625],['BM21',1000]])for(const count of [1,2]){const value=blankDraft(id,units*count);await store.save(value);const result=await store.load();assert.equal(result.printMode,'unprinted');assert.deepEqual(result.design,{requestedQuantity:units*count});assert.equal(result.rear,null);assert.equal(result.frontFile,null);assert.equal(result.rearFile,null);}});
test('unprinted drafts reject inherited artwork, invalid mode and fractional/zero/non-carton quantities',async()=>{const store=D.createStore({indexedDB:fakeIDB(),now:()=>100}),blank=blankDraft('BM12',400);for(const value of [0,-400,1,399,401,400.5,Infinity,1000400])await rejects(store.save({...blank,design:{requestedQuantity:value}}),'INVALID');for(const patch of [{printMode:'unknown'},{frontFile:payload().frontFile,frontName:'logo.png'},{rear:payload().rear},{design:{...blank.design,text:'ghost'}},{rearName:'old.png'}])await rejects(store.save({...blank,...patch}),'INVALID');});
test('draft colour spelling is canonical without changing white, grey or pastel intent',async()=>{
 const vm=require('node:vm'),groundFunction=fs.readFileSync('frontend/app.js','utf8').split('\n').find(line=>line.startsWith('function effectiveBackground()'));
 for(const [input,expected,isWhite] of [['#FFFFFF','#ffffff',true],['#F5F6FA','#f5f6fa',false],['#FAF7E8','#faf7e8',false],['#808080','#808080',false]]){
  const p=payload();p.design.bg=input;p.design.color='#AABBCC';p.rear.inkColor='#ABCDEF';
  const normalized=D.validate(p);assert.equal(normalized.design.bg,expected);assert.equal(normalized.design.color,'#aabbcc');assert.equal(normalized.rear.inkColor,'#abcdef');
  const scope={state:{...normalized.design,photoLayout:null},isUnprinted:()=>false};vm.createContext(scope);vm.runInContext(groundFunction,scope);
  assert.equal(scope.effectiveBackground()==='#ffffff',isWhite,'rendered RGB and commercial white identity must agree');
  const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});await store.save(p);
  // Simulate an otherwise valid older envelope with upper-case CSS colour strings.
  idb.records.get('active').design.bg=input;
  assert.equal((await store.load()).design.bg,expected,'legacy stored case is normalized at read boundary');
 }
});
test('implementation performs no network and never stores persistent object URLs',()=>{const code=fs.readFileSync('frontend/draft-store.js','utf8');assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|createObjectURL|localStorage/.test(code));});
(async()=>{for(const t of tests){await t.run();console.log('PASS',t.name);}console.log('PASS draft store',tests.length,'tests (deterministic IndexedDB transaction adapter; real-browser QA remains required)');})().catch(e=>{console.error(e);process.exitCode=1;});
