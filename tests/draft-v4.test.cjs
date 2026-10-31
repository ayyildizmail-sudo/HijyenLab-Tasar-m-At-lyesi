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
function resume(){return {quantityInput:'1e',cartonInput:'',rearTone:'#ffffff',lead:{customer:'Örnek Ltd',contact:'Test Kişisi',phone:'05',province:'Muğla',district:''},cliche:'existing',stage:'pricing',quoteSource:'uploaded-artwork',declaration:null,fragranceConfirmed:true};}
function v4(){return {...payload(),schemaVersion:4,printMode:'printed',frontExtras:[],rearExtras:[],resume:resume()};}
const rejects=(p,code='INVALID')=>assert.rejects(p,e=>e.code===code);
test('v4 all six products preserve incomplete lead and quantity, printed/unprinted',async()=>{
 const store=D.createStore({indexedDB:fakeIDB(),now:()=>100});
 for(const productId of ['BM12','BM11','BM13','BM15','BM545','BM21'])for(const printMode of ['printed','unprinted'])for(const quantity of [null,0,1,1000000]){
  const value={...v4(),productId,printMode};value.design.requestedQuantity=quantity;
  if(printMode==='unprinted')Object.assign(value,{design:{requestedQuantity:quantity},rear:null,frontFile:null,frontName:'',rearFile:null,rearName:''});
  await store.save(value);const got=await store.load();assert.equal(got.schemaVersion,4);assert.equal(got.design.requestedQuantity,quantity);assert.deepEqual(got.resume,value.resume);assert.deepEqual(got.frontExtras,[]);
 }
});
test('v4 declared flow supports partial or blocked declaration without saving artwork/price/token',()=>{
 for(const count of [null,1,2,3,4,5,6]){const value=v4();value.resume.quoteSource='customer-declared';value.resume.declaration={version:'declared-inks-v1',ground:'colored',count};value.design.text='';value.frontFile=null;value.frontName='';for(const k of ['instagram','website','phone','address','extra','qrUrl'])value.rear[k]='';assert.equal(D.validate(value).resume.declaration.count,count);
  for(const patch of [{frontFile:new Blob(['source'],{type:'image/png'}),frontName:'source.png'},{design:{...value.design,text:'not blank'}},{rear:{...value.rear,qrEnabled:true}},{resume:{...value.resume,approval:true}}])assert.throws(()=>D.validate({...value,...patch}),e=>e.code==='INVALID');
 }
});
test('v4 rejects unknown fields, bad ranges, invalid declaration and unsafe source representations',()=>{
 const value=v4();
 for(const patch of [{quote:{total:100}},{approvalToken:'old'},{frontExtras:null},{frontFile:'data:image/png;base64,eA=='},{frontFile:'blob:old'},{design:{...value.design,font:'url(evil)'}},{design:{...value.design,bg:'white'}},{design:{...value.design,requestedQuantity:NaN}},{design:{...value.design,requestedQuantity:1.5}},{design:{...value.design,requestedQuantity:1000001}},{resume:{...value.resume,quantityInput:'<script>'}},{resume:{...value.resume,cartonInput:'1'.repeat(25)}},{resume:{...value.resume,rearTone:'#123456'}},{resume:{...value.resume,stage:'payment'}},{resume:{...value.resume,cliche:'unknown'}},{resume:{...value.resume,lead:{...value.resume.lead,extra:'hidden'}}},{resume:{...value.resume,lead:{...value.resume.lead,phone:'1'.repeat(26)}}},{resume:{...value.resume,fragranceConfirmed:'yes'}},{resume:{...value.resume,quoteSource:'customer-declared'}},{resume:{...value.resume,declaration:{version:'declared-inks-v1',ground:'white',count:1}}}])assert.throws(()=>D.validate({...value,...patch}),e=>e.code==='INVALID');
});
test('v4 cloning and verified byte readback cover resume and extras',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100}),value=v4();value.frontExtras=[{id:'extra',file:new Blob(['extra'],{type:'image/png'}),name:'extra.png',opticalScale:1}];
 const saving=store.save(value);value.resume.lead.customer='mutated';value.frontExtras[0].name='changed.png';const saved=await saving;assert.equal(saved.resume.lead.customer,'Örnek Ltd');assert.equal(saved.frontExtras[0].name,'extra.png');
 idb.readTransform=r=>{if(r)r.frontExtras[0].file=new Blob(['wrong'],{type:'image/png'});return r;};await rejects(store.save({...value,frontExtras:[{...value.frontExtras[0],file:new Blob(['extra'],{type:'image/png'})}]}),'VERIFY_FAILED');
});
test('v4 expiry deletes valid only; corrupt old draft and future timestamp stay untouched',async()=>{
 const idb=fakeIDB();let now=100;const store=D.createStore({indexedDB:idb,now:()=>now});await store.save(v4());const good=structuredClone(idb.records.get('active'));
 now=100+D.TTL_MS;idb.records.set('active',{...good,unknown:true});await rejects(store.load());assert(idb.records.has('active'),'failed validation cannot delete old record');idb.records.set('active',good);assert.equal(await store.load(),null);
 now=100;idb.records.set('active',{...good,savedAt:101,expiresAt:101+D.TTL_MS});await rejects(store.load());assert(idb.records.has('active'));
});
test('v4 pending writes use order; revoke clear cannot resurrect, failures are not commits',async()=>{
 const idb=fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});await store.load();idb.paused=true;
 const first=store.save(v4());const later=v4();later.resume.lead.phone='0555';const second=store.save(later);await tick();idb.release();await first;await second;assert.equal((await store.load()).resume.lead.phone,'0555');
 idb.paused=true;const pending=store.save(v4()).catch(e=>e);await tick();const clearing=store.clear();idb.release();assert.equal((await pending).code,'STALE');await clearing;assert.equal(await store.load(),null);
 idb.quota=true;await rejects(store.save(v4()),'QUOTA');assert.equal(idb.records.size,0);idb.quota=false;idb.failCommit=true;await rejects(store.save(v4()),'UNAVAILABLE');assert.equal(idb.records.size,0);
});
