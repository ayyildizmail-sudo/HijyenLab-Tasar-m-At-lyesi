/* Opt-in local draft persistence only. No network, prices or approval tokens. Contact inputs require explicit opt-in. */
(function(root){'use strict';
const DB_NAME='hijyenlab-local-design-draft-v1',STORE='drafts',KEY='active';
const TTL_MS=7*24*60*60*1000,MAX_FILE_BYTES=8*1024*1024,MAX_TOTAL_BYTES=16*1024*1024,MAX_METADATA_BYTES=65536;
const TOP=['schemaVersion','productId','design','rear','fragrance','frontFile','rearFile','frontName','rearName'];
const DESIGN=['bg','color','textColor','text','font','textSize','tx','ty','x','y','size','rotation','recolorApplied','bgPantone','textPantone','requestedQuantity'];
const REAR=['instagram','website','phone','address','extra','inkColor','qrEnabled','qrUrl'];
const coordinators=new WeakMap();
const MIME=['','image/png','image/jpeg','image/svg+xml','application/pdf','image/heic','image/heif','image/webp','image/gif','image/bmp','image/x-ms-bmp','image/avif'];
class DraftError extends Error{constructor(code,message){super(message);this.name='DraftError';this.code=code;}}
function fail(code,message){throw new DraftError(code,message);}
function mapped(error){if(error instanceof DraftError)return error;return new DraftError(error?.name==='QuotaExceededError'?'QUOTA':'UNAVAILABLE','Yerel taslak depolaması kullanılamadı.');}
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))fail('INVALID','Taslak alanları geçersiz.');}
function str(value,max){if(typeof value!=='string'||value.length>max)fail('INVALID','Taslak metni sınırı aşıldı.');return value;}
function number(value,min,max){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail('INVALID','Taslak sayısal alanı geçersiz.');return value;}
function bool(value){if(typeof value!=='boolean')fail('INVALID','Taslak seçimi geçersiz.');return value;}
// CSS hex case has no visual meaning; canonicalize it before strict tariff comparisons.
function hex(value,empty=false){if(empty&&value==='')return value;if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))fail('INVALID','Taslak rengi geçersiz.');return value.toLowerCase();}
function topKeys(input){return input?.schemaVersion===4?TOP.concat('printMode','frontExtras','rearExtras','resume'):input?.schemaVersion===3?TOP.concat('printMode','frontExtras','rearExtras'):input?.schemaVersion===2?TOP.concat('printMode'):TOP;}
function validateResume(input){
 exact(input,['lead','cliche','stage','quoteSource','declaration','fragranceConfirmed','quantityInput','cartonInput','rearTone']);
 exact(input.lead,['customer','contact','phone','province','district']);const lead={};
 for(const [key,max] of [['customer',120],['contact',100],['phone',25],['province',100],['district',100]])lead[key]=str(input.lead[key],max);
 if(!['new','existing'].includes(input.cliche)||!['start','design','fragrance','pricing','summary'].includes(input.stage)||!['uploaded-artwork','customer-declared'].includes(input.quoteSource))fail('INVALID','Taslak devam alanları geçersiz.');
 let declaration=null;if(input.declaration!==null){exact(input.declaration,['version','ground','count']);const d=input.declaration;if(d.version!=='declared-inks-v1'||!['white','colored'].includes(d.ground)||(d.count!==null&&(!Number.isInteger(d.count)||d.count<1||d.count>6)))fail('INVALID','Taslak renk beyanı geçersiz.');declaration={version:d.version,ground:d.ground,count:d.count};}
 if((input.quoteSource==='customer-declared')!==(declaration!==null))fail('INVALID','Taslak renk beyanı akışı geçersiz.');
 for(const key of ['quantityInput','cartonInput']){str(input[key],24);if(!/^[-+0-9.eE]*$/.test(input[key]))fail('INVALID','Taslak adet girişi geçersiz.');}
 if(!['','#ffffff','#111111'].includes(input.rearTone))fail('INVALID','Taslak arka logo tonu geçersiz.');
 return {quantityInput:input.quantityInput,cartonInput:input.cartonInput,rearTone:input.rearTone,lead,cliche:input.cliche,stage:input.stage,quoteSource:input.quoteSource,declaration,fragranceConfirmed:bool(input.fragranceConfirmed)};
}
function validateV4(input){
 exact(input,topKeys(input));const resume=validateResume(input.resume);
 const quantity=input.design?.requestedQuantity;if(quantity!==null&&(!Number.isInteger(quantity)||quantity<0||quantity>1000000))fail('INVALID','Taslak adedi geçersiz.');
 const base={};for(const key of TOP)base[key]=input[key];base.printMode=input.printMode;
 // Input drafts may be incomplete (below minimum or not a full carton). Current catalog validates at resume, not at storage time.
 base.design={...input.design,requestedQuantity:null};base.schemaVersion=input.printMode==='unprinted'?2:3;
 if(input.printMode==='unprinted'){
  if(!Array.isArray(input.frontExtras)||input.frontExtras.length||!Array.isArray(input.rearExtras)||input.rearExtras.length||resume.quoteSource!=='uploaded-artwork')fail('INVALID','Baskısız taslak baskı içeriği taşıyamaz.');
 }else{base.frontExtras=input.frontExtras;base.rearExtras=input.rearExtras;}
 const clean=validate(base);clean.design.requestedQuantity=quantity;
 if(resume.quoteSource==='customer-declared'&&(clean.frontFile||clean.rearFile||clean.frontExtras.length||clean.rearExtras.length||clean.design.text.trim()||['instagram','website','phone','address','extra','qrUrl'].some(k=>clean.rear[k].trim())||clean.rear.qrEnabled))fail('INVALID','Görselsiz beyan taslağı tasarım içeriği taşıyamaz.');
 const result={...clean,schemaVersion:4,frontExtras:clean.frontExtras||[],rearExtras:clean.rearExtras||[],resume};
 if(new TextEncoder().encode(metadata(result)).length>MAX_METADATA_BYTES)fail('INVALID','Taslak alanları çok büyük.');return result;
}
function validate(input){
 if(input?.schemaVersion===4)return validateV4(input);
 exact(input,topKeys(input));if(![1,2,3].includes(input.schemaVersion)||!['BM12','BM11','BM13','BM15','BM545','BM21'].includes(input.productId))fail('INVALID','Taslak sürümü veya ürünü desteklenmiyor.');
 if(input.schemaVersion>=2&&!['printed','unprinted'].includes(input.printMode))fail('INVALID','Taslak baskı seçimi geçersiz.');
 if(input.schemaVersion===3&&input.printMode!=='printed')fail('INVALID','Çok logolu taslak yalnız baskılı tasarımı destekler.');
 if(input.schemaVersion===2&&input.printMode==='unprinted'){
  exact(input.design,['requestedQuantity']);const quantity=input.design.requestedQuantity;
  // Dual browser/CommonJS module; catalog remains the single source for carton sizes.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const catalog=typeof module!=='undefined'&&module.exports?require('./product-catalog.js'):root.ProductCatalog;const units=catalog.rules(input.productId).unitsPerBox;
  if(quantity!==null&&(!Number.isSafeInteger(quantity)||quantity<units||quantity>1000000||quantity%units!==0))fail('INVALID','Baskısız taslak adedi tam koli olmalıdır.');
  if(input.rear!==null||input.frontFile!==null||input.rearFile!==null||input.frontName!==''||input.rearName!=='')fail('INVALID','Baskısız taslak baskı görseli içeremez.');
  if(!['','flambau','green_tea','bodrum_mandarin','lemon'].includes(input.fragrance))fail('INVALID','Taslak kokusu geçersiz.');
  return {schemaVersion:2,printMode:'unprinted',productId:input.productId,design:{requestedQuantity:quantity},rear:null,fragrance:input.fragrance,frontFile:null,rearFile:null,frontName:'',rearName:''};
 }
 exact(input.design,DESIGN);exact(input.rear,REAR);const design={},rear={};
 for(const k of ['bg','color','textColor'])design[k]=hex(input.design[k]);
 design.text=str(input.design.text,500);if(!['sans-serif','serif','monospace','cursive'].includes(input.design.font))fail('INVALID','Taslak yazı tipi geçersiz.');design.font=input.design.font;
 for(const k of ['tx','ty','x','y'])design[k]=number(input.design[k],0,1600);
 design.textSize=number(input.design.textSize,1,200);design.size=number(input.design.size,1,300);design.rotation=number(input.design.rotation,-360,360);design.recolorApplied=bool(input.design.recolorApplied);
 for(const k of ['bgPantone','textPantone'])design[k]=str(input.design[k],80);
 design.requestedQuantity=input.design.requestedQuantity===null?null:number(input.design.requestedQuantity,1,1000000);
 if(design.requestedQuantity!==null&&!Number.isInteger(design.requestedQuantity))fail('INVALID','Taslak adedi geçersiz.');
 for(const k of ['instagram','website','phone','address','extra'])rear[k]=str(input.rear[k],1000);
 rear.inkColor=hex(input.rear.inkColor,true);rear.qrEnabled=bool(input.rear.qrEnabled);rear.qrUrl=str(input.rear.qrUrl,2048);
 if(!['','flambau','green_tea','bodrum_mandarin','lemon'].includes(input.fragrance))fail('INVALID','Taslak kokusu geçersiz.');
 const result={schemaVersion:input.schemaVersion,...(input.schemaVersion>=2?{printMode:'printed'}:{}),productId:input.productId,design,rear,fragrance:input.fragrance};let size=0;
 for(const side of ['front','rear']){
  const file=input[side+'File'],name=str(input[side+'Name'],255);
  if(file!==null&&(!(file instanceof Blob)||file.size===0||file.size>MAX_FILE_BYTES||!MIME.includes(file.type.toLowerCase())))fail('INVALID','Taslak görseli desteklenmiyor veya çok büyük.');
  if((file===null&&name!=='')||(file!==null&&name==='')||/[\u0000-\u001f]/.test(name))fail('INVALID','Taslak dosya adı geçersiz.');
  result[side+'File']=file;result[side+'Name']=name;size+=file?.size||0;
 }
 if(input.schemaVersion===3)for(const side of ['front','rear']){
  const extras=input[side+'Extras'];if(!Array.isArray(extras)||extras.length>3)fail('INVALID','Bir yüzde en fazla üç ek logo saklanabilir.');
  const ids=new Set();result[side+'Extras']=extras.map(item=>{
   exact(item,['id','file','name','opticalScale']);const id=str(item.id,128),name=str(item.name,255),file=item.file;
   if(!id.trim()||/[\u0000-\u001f]/.test(id)||ids.has(id))fail('INVALID','Ek logo kimliği geçersiz veya yinelenmiş.');ids.add(id);
   if(!(file instanceof Blob)||file.size===0||file.size>MAX_FILE_BYTES||!MIME.includes(file.type.toLowerCase()))fail('INVALID','Ek logo dosyası desteklenmiyor veya çok büyük.');
   if(!name||/[\u0000-\u001f]/.test(name))fail('INVALID','Ek logo dosya adı geçersiz.');
   const opticalScale=number(item.opticalScale,.75,1.25);size+=file.size;return {id,file,name,opticalScale};
  });
 }
 if(size>MAX_TOTAL_BYTES)fail('INVALID','Taslak toplam boyut sınırını aşıyor.');
 if(new TextEncoder().encode(metadata(result)).length>MAX_METADATA_BYTES)fail('INVALID','Taslak alanları çok büyük.');
 return result;
}
function envelope(input){exact(input,topKeys(input).concat(['savedAt','expiresAt']));const payload={};for(const k of topKeys(input))payload[k]=input[k];const result=validate(payload);if(!Number.isSafeInteger(input.savedAt)||input.savedAt<0||!Number.isSafeInteger(input.expiresAt)||input.expiresAt!==input.savedAt+TTL_MS)fail('INVALID','Taslak saklama süresi geçersiz.');return {...result,savedAt:input.savedAt,expiresAt:input.expiresAt};}
function fileMetadata(file){return file?{size:file.size,type:file.type}:null;}
function metadata(record){const value={...record,frontFile:fileMetadata(record.frontFile),rearFile:fileMetadata(record.rearFile)};if(record.schemaVersion>=3)for(const side of ['front','rear'])value[side+'Extras']=record[side+'Extras'].map(item=>({...item,file:fileMetadata(item.file)}));return JSON.stringify(value);}
async function equalSourceBytes(a,b){if(!await equalBytes(a.frontFile,b.frontFile)||!await equalBytes(a.rearFile,b.rearFile))return false;if(a.schemaVersion>=3)for(const side of ['front','rear']){const first=a[side+'Extras'],second=b[side+'Extras'];if(first.length!==second.length)return false;for(let i=0;i<first.length;i++)if(!await equalBytes(first[i].file,second[i].file))return false;}return true;}
async function equalBytes(a,b){if(a===null||b===null)return a===b;const x=new Uint8Array(await a.arrayBuffer()),y=new Uint8Array(await b.arrayBuffer());if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
function createStore(options={}){
 let idb;try{idb=options.indexedDB===undefined?root.indexedDB:options.indexedDB;}catch{idb=null;}const now=options.now||Date.now;let connection=null;
 const canCoordinate=idb&&(typeof idb==='object'||typeof idb==='function');let coordination=canCoordinate?coordinators.get(idb):null;if(!coordination){coordination={epoch:0,queue:Promise.resolve()};if(canCoordinate)coordinators.set(idb,coordination);}
 function serial(work){const next=coordination.queue.then(work,work).catch(error=>{throw mapped(error);});coordination.queue=next.catch(()=>{});return next;}
 function open(){if(!idb||typeof idb.open!=='function')return Promise.reject(new DraftError('UNAVAILABLE','Bu tarayıcı yerel taslak saklayamıyor.'));if(connection)return connection;
  connection=new Promise((resolve,reject)=>{let request,done=false;const rejectOnce=e=>{if(done)return;done=true;connection=null;reject(mapped(e));};try{request=idb.open(DB_NAME,1);}catch(e){rejectOnce(e);return;}
   request.onupgradeneeded=()=>{try{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);}catch(e){request.transaction?.abort();rejectOnce(e);}};
   request.onerror=()=>rejectOnce(request.error);request.onblocked=()=>rejectOnce(new DraftError('UNAVAILABLE','Başka bir sekme taslak depolamasını engelliyor.'));
   request.onsuccess=()=>{if(done){request.result.close();return;}done=true;const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
  });connection.catch(()=>{connection=null;});return connection;
 }
 async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{let tx,value;try{tx=db.transaction(STORE,mode);tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(mapped(tx.error));tx.onerror=()=>{};action(tx.objectStore(STORE),v=>{value=v;},tx);}catch(e){try{tx?.abort();}catch{}reject(mapped(e));}});}
 function save(payload){let clean;try{clean=validate(payload);}catch(e){return Promise.reject(mapped(e));}const ticket=coordination.epoch;
  return serial(async()=>{if(ticket!==coordination.epoch)fail('STALE','Bekleyen taslak kaydı iptal edildi.');const savedAt=now();if(!Number.isSafeInteger(savedAt)||savedAt<0||!Number.isSafeInteger(savedAt+TTL_MS))fail('INVALID','Cihaz zamanı geçersiz.');const record={...clean,savedAt,expiresAt:savedAt+TTL_MS};
   const stored=await transaction('readwrite',(store,result,tx)=>{if(ticket!==coordination.epoch){tx.abort();return;}store.put(record,KEY);const read=store.get(KEY);read.onsuccess=()=>result(read.result);}).catch(error=>{if(ticket!==coordination.epoch)fail('STALE','Bekleyen taslak kaydı iptal edildi.');throw error;});
   if(ticket!==coordination.epoch)fail('STALE','Bekleyen taslak kaydı iptal edildi.');let checked;try{checked=envelope(stored);}catch{fail('VERIFY_FAILED','Taslak kaydı doğrulanamadı.');}
   if(metadata(record)!==metadata(checked)||!await equalSourceBytes(record,checked))fail('VERIFY_FAILED','Taslak kaydı doğrulanamadı.');
   if(ticket!==coordination.epoch)fail('STALE','Bekleyen taslak kaydı iptal edildi.');return checked;
  });
 }
 function load(){return serial(async()=>{const record=await transaction('readwrite',(store,result)=>{const request=store.get(KEY);request.onsuccess=()=>{const data=request.result;if(data===undefined||data===null){result(null);return;}try{const checked=envelope(data);if(checked.savedAt>now())fail('INVALID','Taslak cihaz zamanıyla uyuşmuyor.');if(checked.expiresAt<=now()){store.delete(KEY);result(null);}else result(checked);}catch(error){result({readError:error});}};});if(record===undefined||record===null)return null;if(record.readError)throw record.readError;const checked=envelope(record);if(checked.savedAt>now())fail('INVALID','Taslak cihaz zamanıyla uyuşmuyor.');return checked;});}
 function clear(){coordination.epoch++;return serial(async()=>{await transaction('readwrite',(store,result)=>{store.delete(KEY);const read=store.get(KEY);read.onsuccess=()=>result(read.result);}).then(value=>{if(value!==undefined)fail('VERIFY_FAILED','Taslağın silindiği doğrulanamadı.');});});}
 return Object.freeze({save,load,clear});
}
const api=Object.freeze({createStore,validate,DraftError,TTL_MS,MAX_FILE_BYTES,MAX_TOTAL_BYTES,DB_NAME});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LocalDesignDraft=api;
})(typeof globalThis!=='undefined'?globalThis:this);
