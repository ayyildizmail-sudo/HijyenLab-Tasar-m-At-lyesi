/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness. */
// İki sekme aynı tarayıcı taslak deposunu paylaşır. Bir sekme, diğer sekmenin
// kendisinden sonra kaydettiği taslağın üzerine sessizce yazmamalıdır.
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../frontend/draft-store.js');

// Tek tarayıcı profilini temsil eden, sekmeler arasında paylaşılan IndexedDB taklidi.
function sharedIDB(){
 const records=new Map();let created=false;
 const db={objectStoreNames:{contains:()=>created},createObjectStore(){created=true;},close(){},transaction(){
  const snapshot=new Map(Array.from(records,([k,v])=>[k,structuredClone(v)])),tasks=[];let done=false,aborted=false;
  const tx={error:null,abort(){if(done||aborted)return;aborted=true;setImmediate(()=>tx.onabort?.());},objectStore(){return {
   put(value,key){return req(()=>{snapshot.set(key,structuredClone(value));return key;});},
   get(key){return req(()=>structuredClone(snapshot.get(key)));},
   delete(key){return req(()=>{snapshot.delete(key);});}};}};
  function req(action){const r={result:undefined};tasks.push({action,r});setImmediate(pump);return r;}
  function pump(){if(done||aborted)return;const t=tasks.shift();if(t){t.r.result=t.action();t.r.onsuccess?.();setImmediate(pump);return;}done=true;records.clear();for(const [k,v] of snapshot)records.set(k,v);tx.oncomplete?.();}
  setImmediate(pump);return tx;
 }};
 return {records,open(){const r={result:db};setImmediate(()=>{if(!created)r.onupgradeneeded?.();r.onsuccess?.();});return r;}};
}
function payload(text){return {schemaVersion:1,productId:'BM12',design:{bg:'#ffffff',color:'#102f59',textColor:'#800d2e',text,font:'sans-serif',textSize:60,tx:800,ty:520,x:800,y:425,size:100,rotation:0,recolorApplied:false,bgPantone:'',textPantone:'',requestedQuantity:null},rear:{instagram:'',website:'',phone:'',address:'',extra:'',inkColor:'',qrEnabled:false,qrUrl:''},fragrance:'lemon',frontFile:new Blob([text],{type:'image/png'}),frontName:text+'.png',rearFile:null,rearName:''};}
const tab=idb=>D.createStore({indexedDB:idb,now:()=>1000});

test('ikinci sekme, birinci sekmenin kaydettiği taslağın üzerine sessizce yazamaz',async()=>{
 const idb=sharedIDB(),a=tab(idb),b=tab(idb);
 await a.save(payload('Tasarim-A'));
 await assert.rejects(b.save(payload('Tasarim-B')),e=>e.code==='CONFLICT');
 assert.equal((await a.load()).design.text,'Tasarim-A');
});

test('aynı sekme kendi taslağını art arda güncelleyebilir',async()=>{
 const idb=sharedIDB(),a=tab(idb);
 await a.save(payload('A1'));await a.save(payload('A2'));
 assert.equal((await a.load()).design.text,'A2');
});

test('taslağı açan sekme devam edebilir; geride kalan sekme çakışma alır',async()=>{
 const idb=sharedIDB(),a=tab(idb),b=tab(idb);
 await a.save(payload('A1'));
 assert.equal((await b.load()).design.text,'A1');
 await b.save(payload('B1'));
 await assert.rejects(a.save(payload('A2')),e=>e.code==='CONFLICT');
 assert.equal((await b.load()).design.text,'B1');
});

test('kullanıcı açıkça seçerse sekme taslağı değiştirebilir',async()=>{
 const idb=sharedIDB(),a=tab(idb),b=tab(idb);
 await a.save(payload('A1'));
 await b.save(payload('B1'),{force:true});
 assert.equal((await a.load()).design.text,'B1');
});

test('silinmiş taslaktan sonra başka sekme yeni taslak kaydedebilir',async()=>{
 const idb=sharedIDB(),a=tab(idb),b=tab(idb);
 await a.save(payload('A1'));await a.clear();
 await b.save(payload('B1'));
 assert.equal((await a.load()).design.text,'B1');
});

test('düzeltmeden önce kaydedilmiş eski taslak yeni sürümde kaydı engellemez',async()=>{
 const idb=sharedIDB(),old=tab(idb);
 await old.save(payload('Eski'));
 for(const key of [...idb.records.keys()])if(key!=='active')idb.records.delete(key);
 const b=tab(idb);await b.save(payload('Yeni'));
 assert.equal((await b.load()).design.text,'Yeni');
});

test('çakışma kaydı taslak verisini değiştirmez ve kayıt biçimi aynı kalır',async()=>{
 const idb=sharedIDB(),a=tab(idb),b=tab(idb);
 const saved=await a.save(payload('A1'));
 await assert.rejects(b.save(payload('B1')),e=>e.code==='CONFLICT');
 assert.deepEqual(Object.keys(await a.load()).sort(),Object.keys(saved).sort());
 assert.deepEqual(Object.keys(idb.records.get('active')).sort(),Object.keys(saved).sort());
});
