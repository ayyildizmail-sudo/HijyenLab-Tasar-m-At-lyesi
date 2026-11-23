/* Ürün/tabela fotoğrafı yerleştirilemediğinde: fotoğraftaki baskılı yüzeyi bulup baskıyı temizleyerek logo olarak önerir.
   Tamamen tarayıcıda çalışır; görsel hiçbir yere gönderilmez. Yön için isteğe bağlı küçük yerel model (PP-OCR yön
   sınıflandırıcısı, ONNX) yalnız gerektiğinde yüklenir; yüklenemezse geometrik kanıt kullanılır.
   Sonuç normal logo yükleme yolundan geçer ve müşteri onayı olmadan teklife giremez. */
(function(root){'use strict';
if(typeof document==='undefined'||!root.ProductPhoto||typeof showDesignIssue!=='function'||typeof routeUploadedFile!=='function'||typeof state==='undefined')return;
const PREFIX='urun-fotografi-',isGenerated=f=>typeof f?.name==='string'&&f.name.startsWith(PREFIX);
const tried=new WeakSet(),claimed=new WeakSet();let running=false,lastError=null,lastResult=null,noteFor=null,modelPromise=null;
const note=document.createElement('p');note.id='productPhotoNote';note.className='hint';note.setAttribute('role','status');note.hidden=true;
(document.querySelector('.simplePrimary')||document.getElementById('status')||document.body).before(note);
const currentFile=()=>typeof lastUploadedFile==='undefined'?null:lastUploadedFile;
function syncNote(){if(!noteFor)return;const c=currentFile();if((c&&c.name!==noteFor)||state.removed){note.hidden=true;note.textContent='';noteFor=null;}}
function placementFailed(){
 if(state.designProcessing||state.textDesign||state.logoDesign||state.technicalSheetDetected)return false;
 if(typeof isReferencePreview==='function'&&isReferencePreview())return true;
 return !!state.designBlocked&&!state.logo&&!state.photoLayout&&!state.screenSelectionRequired;
}
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('script'));document.head.append(s);});}
// Yerel yön modeli: ilk kullanımda yüklenir, sonra önbellekte kalır.
function orientationModel(){
 if(!modelPromise)modelPromise=(async()=>{
  if(typeof WebAssembly==='undefined')return null;
  const base='vendor/onnxruntime-web-1.20.1/';if(!root.ort)await loadScript(base+'ort.wasm.min.js');
  const ort=root.ort;if(!ort)return null;ort.env.wasm.wasmPaths=new URL(base,document.baseURI).href;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  const session=await ort.InferenceSession.create(new URL('models/ppocr-mobile-v2-cls.onnx',document.baseURI).href,{executionProviders:['wasm']});
  return async tensors=>{const out=[];for(const t of tensors){const r=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',t,[1,3,48,192])});out.push(r[session.outputNames[0]].data[0]);}return out;};
 })().catch(error=>{lastError='orientation-model:'+String(error?.message||error);return null;});
 return modelPromise;
}
const AUTO_MIN_PLACE=.6,AUTO_MIN_ASK=.3,GLYPH_MIN_PLACE=.45,GLYPH_MIN_ASK=.2;
// Kararsız sonuç: önizleme + "Bunu kullan / 180° çevir / Kullanma". Müşteri seçmeden ambalaja hiçbir şey konmaz.
const card=document.createElement('div');card.id='productPhotoChoice';card.className='notice light';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-label','Fotoğraftan ayrılan baskı');
card.innerHTML='<p><strong>Fotoğraftaki baskıyı böyle ayırdık.</strong> Doğru görünüyorsa kullanın.</p><img alt="Fotoğraftan ayrılan baskı önizlemesi" style="display:block;max-width:100%;max-height:220px;margin:8px auto;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px"><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button type="button" class="primary" data-act="use">Bunu kullan</button><button type="button" class="outline" data-act="rotate">180° çevir</button><button type="button" class="outline" data-act="no">Kullanma</button></div>';
card.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;width:min(92vw,460px);max-height:80vh;overflow:auto;box-shadow:0 8px 30px rgba(0,0,0,.25);background:#fff';document.body.append(card);
function rotate180(c){const r=document.createElement('canvas');r.width=c.width;r.height=c.height;const g=r.getContext('2d');g.translate(c.width,c.height);g.rotate(Math.PI);g.drawImage(c,0,0);return r;}
function ask(canvas){return new Promise(resolve=>{let current=canvas;const img=card.querySelector('img');const show=()=>{img.src=current.toDataURL('image/png');};show();card.hidden=false;
 const done=v=>{card.hidden=true;card.onclick=null;resolve(v);};card.onclick=e=>{const act=e.target?.dataset?.act;if(act==='use')done(current);else if(act==='no')done(null);else if(act==='rotate'){current=rotate180(current);show();}};
 card.scrollIntoView?.({block:'nearest'});});}
function decode(file){if(typeof createImageBitmap==='function')return createImageBitmap(file);return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});}
async function attempt(){
 const file=currentFile();
 if(running||!file||tried.has(file)||isGenerated(file)||!/^image\/(jpeg|png|webp|heic|heif|bmp|avif)$/i.test(file.type||'')||!placementFailed())return;
 tried.add(file);claimed.add(file);running=true;
 try{
  const image=await decode(file),max=2000,s=Math.min(1,max/Math.max(image.width,image.height)),c=document.createElement('canvas');c.width=Math.round(image.width*s);c.height=Math.round(image.height*s);
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,c.width,c.height);if(typeof image.close==='function')image.close();
  const same=()=>{const x=currentFile();return !!x&&(x===file||(x.name===file.name&&x.size===file.size));};if(!same()||!placementFailed())return;
  const classify=await orientationModel();if(!same()||!placementFailed())return;
  const result=await root.ProductPhoto.extract(g.getImageData(0,0,c.width,c.height).data,c.width,c.height,{classify});lastResult=result;
  if(!result.ok||!same()||!placementFailed())return;
  let out=document.createElement('canvas');out.width=result.image.w;out.height=result.image.h;out.getContext('2d').putImageData(new ImageData(result.image.data,result.image.w,result.image.h),0,0);
  // Güven kademesi: emin → doğrudan; kararsız → müşteriye tek dokunuşla sor; emin değil → hiçbir şey koyma (mevcut davranış)
  // Harf oranı: mürekkebin yazı satırlarına ait kısmı (gösterge, süs, efekt parçalarında düşük)
  const confidence=result.confidence??0,glyph=result.glyphFraction??0;if(confidence<AUTO_MIN_ASK||glyph<GLYPH_MIN_ASK)return;
  if(confidence<AUTO_MIN_PLACE||glyph<GLYPH_MIN_PLACE){const choice=await ask(out);if(!same()||!placementFailed())return;if(!choice)return;out=choice;}
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob||!same())return;
  const generated=new File([blob],PREFIX+Date.now().toString(36)+'.png',{type:'image/png'});tried.add(generated);
  root.HijyenLabProductPhoto={source:'local-product-photo-v1',palette:result.palette,surface:result.surface,quarterTurns:result.quarterTurns,orientationSource:result.orientationSource};
  await routeUploadedFile(generated,'logo');
  const mine=()=>currentFile()?.name===generated.name;
  for(let i=0;i<80&&!(mine()&&!state.designProcessing&&state.logo);i++)await new Promise(r=>setTimeout(r,100));
  if(mine()){noteFor=generated.name;note.textContent='Fotoğraftaki ürünün baskısı ayrıldı, düzleştirildi ve temizlendi. Yazıları ve logoyu kontrol edip onaylayın; uygun değilse görseli değiştirebilirsiniz.';note.hidden=false;}
 }catch(error){lastError=String(error?.message||error);}
 finally{running=false;}
}
const previous=showDesignIssue;showDesignIssue=function(...args){const out=previous.apply(this,args);setTimeout(attempt,0);return out;};
if(typeof refresh==='function'){const previousRefresh=refresh;refresh=function(...args){const out=previousRefresh.apply(this,args);syncNote();const f=currentFile();if(!running&&f&&!tried.has(f)&&!isGenerated(f)&&placementFailed())setTimeout(attempt,0);return out;};}
root.HijyenLabProductPhotoUI=Object.freeze({asking:()=>!card.hidden,attempt,placementFailed,claims:f=>!!f&&claimed.has(f),busy:()=>running,lastError:()=>lastError,lastResult:()=>lastResult&&{ok:lastResult.ok,reason:lastResult.reason,diagnostics:lastResult.diagnostics}});
})(globalThis);
