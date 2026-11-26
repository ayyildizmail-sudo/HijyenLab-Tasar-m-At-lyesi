/* Ürün/tabela fotoğrafı yerleştirilemediğinde: fotoğraftaki baskılı yüzeyi bulup baskıyı temizleyerek logo olarak önerir.
   Tamamen tarayıcıda çalışır; görsel hiçbir yere gönderilmez. Yön için isteğe bağlı küçük yerel model (PP-OCR yön
   sınıflandırıcısı, ONNX) yalnız gerektiğinde yüklenir; yüklenemezse geometrik kanıt kullanılır.
   Sonuç normal logo yükleme yolundan geçer ve müşteri onayı olmadan teklife giremez. */
(function(root){'use strict';
if(typeof document==='undefined'||!root.ProductPhoto||typeof showDesignIssue!=='function'||typeof routeUploadedFile!=='function'||typeof state==='undefined')return;
const PREFIX='urun-fotografi-',isGenerated=f=>typeof f?.name==='string'&&f.name.startsWith(PREFIX);
const tried=new WeakSet(),claimed=new WeakSet();let running=false,lastError=null,lastResult=null,noteFor=null,modelPromise=null,ortPromise=null,recPromise=null;
const note=document.createElement('p');note.id='productPhotoNote';note.className='hint';note.setAttribute('role','status');note.hidden=true;
(document.querySelector('.simplePrimary')||document.getElementById('status')||document.body).before(note);
// İşlem sürerken ekranın üstünde sabit bilgi şeridi (telefonda "oluşturulamadı" yazısı tek başına görünmesin). İki yol ortak kullanır.
if(!root.HijyenLabPhotoBusy){let count=0;const bar=document.createElement('div');bar.id='photoBusyBanner';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');bar.hidden=true;
 bar.style.cssText='position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:1001;max-width:min(92vw,420px);padding:10px 16px;border-radius:999px;background:#12324f;color:#fff;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:center';
 bar.textContent='Fotoğraf işleniyor… Logo ve yazı aranıyor.';document.body.append(bar);
 // işlem sürerken uygulamanın "yerleştirilemedi / oluşturulamadı" uyarıları gizlenir (fotoğraf ve "Görseli değiştir" kalır); iş bitince sonuç ne ise o görünür
 const st=document.createElement('style');st.textContent='body.photoBusy #referenceRecovery>h2,body.photoBusy #referenceRecovery>p{display:none!important}body.photoBusy #status{visibility:hidden}';document.head.append(st);
 root.HijyenLabPhotoBusy=Object.freeze({on(){count++;bar.hidden=false;document.body.classList.add('photoBusy');},off(){count=Math.max(0,count-1);if(!count){bar.hidden=true;document.body.classList.remove('photoBusy');}},active:()=>count>0});}
const busy=root.HijyenLabPhotoBusy;
const currentFile=()=>typeof lastUploadedFile==='undefined'?null:lastUploadedFile;
function syncNote(){if(!noteFor)return;const c=currentFile();if((c&&c.name!==noteFor)||state.removed){note.hidden=true;note.textContent='';noteFor=null;}}
function placementFailed(){
 if(state.designProcessing||state.textDesign||state.logoDesign)return false;
 if(state.technicalSheetDetected)return !state.logo; // teknik çizim: sayfa konmaz, içindeki paket tasarımı aranır (yalnız müşteri onayıyla)
 if(typeof isReferencePreview==='function'&&isReferencePreview())return true;
 return !!state.designBlocked&&!state.logo&&!state.photoLayout&&!state.screenSelectionRequired;
}
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('script'));document.head.append(s);});}
// Yerel yön modeli: ilk kullanımda yüklenir, sonra önbellekte kalır.
function orientationModel(){
 if(!modelPromise)modelPromise=(async()=>{
  const ort=await runtime();if(!ort)return null;
  const session=await ort.InferenceSession.create(new URL('models/ppocr-mobile-v2-cls.onnx',document.baseURI).href,{executionProviders:['wasm']});
  return async tensors=>{const out=[];for(const t of tensors){const r=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',t,[1,3,48,192])});out.push(r[session.outputNames[0]].data[0]);}return out;};
 })().catch(error=>{lastError='orientation-model:'+String(error?.message||error);return null;});
 return modelPromise;
}
// ONNX çalışma ortamı (yerel, WebAssembly): yön ve yazı tanıma modelleri ortak kullanır
function runtime(){
 if(!ortPromise)ortPromise=(async()=>{if(typeof WebAssembly==='undefined')return null;const base='vendor/onnxruntime-web-1.20.1/';if(!root.ort)await loadScript(base+'ort.wasm.min.js');
  const ort=root.ort;if(!ort)return null;ort.env.wasm.wasmPaths=new URL(base,document.baseURI).href;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;return ort;})().catch(()=>null);
 return ortPromise;
}
// Yazıları temiz yazı tipiyle yeniden çizme: yerel metin tanıma modeli (PP-OCRv3) + paketteki açık lisanslı yazı tipleri.
// İlk kullanımda yüklenir; yüklenemezse yazılar fotoğraftaki temizlenmiş hâliyle kalır (mevcut davranış).
// Metin tanıma modeli (yalnız model; yazı tipleri ayrı ve yalnız gerektiğinde yüklenir — telefonda ilk yük hafif kalır)
function recognizer(){
 if(!recPromise)recPromise=(async()=>{const TR=root.TextRedraw;if(!TR)return null;const ort=await runtime();if(!ort)return null;
  const [session,keysText]=await Promise.all([ort.InferenceSession.create(new URL('models/ppocr-v3-rec.onnx',document.baseURI).href,{executionProviders:['wasm']}),fetch(new URL('models/ppocr-v3-rec-keys.txt',document.baseURI).href).then(r=>{if(!r.ok)throw new Error('keys');return r.text();})]);
  const keys=['blank',...keysText.split('\n'),' '];
  const recognize=async(tensor,width)=>{const r=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',tensor,[1,3,48,width])});const o=r[session.outputNames[0]];return {probs:o.data,T:o.dims[1],C:o.dims[2],keys};};
  return {recognize,TR};
 })().catch(error=>{lastError='text-model:'+String(error?.message||error);return null;});
 return recPromise;
}
let fontPromise=null;
function redrawFonts(){
 if(!fontPromise)fontPromise=(async()=>{const TR=root.TextRedraw;if(!TR||typeof FontFace==='undefined'||!document.fonts)return [];
  await Promise.all(TR.FONTS.map(f=>new FontFace(f.family,`url(${new URL('assets/fonts/redraw/'+f.file+'.woff2',document.baseURI).href})`).load().then(face=>document.fonts.add(face)).catch(()=>null)));
  return TR.FONTS.filter(f=>document.fonts.check(`20px "${f.family}"`));})().catch(()=>[]);
 return fontPromise;
}
// Yazıları temiz yazı tipiyle yeniden çizme: model hazırsa kullanılır; yazı tipleri ancak yeniden çizme başladığında yüklenir.
async function textRedrawKit(){
 const rk=await recognizer();if(!rk)return null;const TR=rk.TR;
 const createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 return {recognize:rk.recognize,createCanvas,redrawText:{...TR,redraw:async opts=>{const loaded=await redrawFonts();if(!loaded.length)return {replaced:0,lines:[]};return TR.redraw({...opts,fonts:opts.fonts?opts.fonts.filter(f=>loaded.includes(f)):loaded});}}};
}
const MISREAD_MIN_SCORE=.2;
// Kamera fotoğrafı yanlışlıkla hazır logo sayılıp sahnenin tamamı ambalaja konduysa (yalnız JPEG/HEIC fotoğraflar)
// Yalnız uygulama fotoğrafın tamamını ham logo olarak koyduysa (native-logo); ışıklı tabela vb. özel yolların sonucuna dokunulmaz
function photoTakenAsLogo(file){const method=state.processingResult?.method||'native-logo';return method==='native-logo'&&!state.designProcessing&&!state.textDesign&&!state.logoDesign&&!!state.logo&&!state.photoLayout&&!state.technicalSheetDetected&&/^image\/(jpeg|heic|heif)$/i.test(file?.type||'')&&!isGenerated(file)&&!(typeof lastUploadedFile!=='undefined'&&isGenerated(lastUploadedFile));}
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
// Kararsız sonucu müşteriye sormak için içerikte okunabilir yazı olmalı: duvar, tente, dükkân içi gibi yanlış yüzeyler sorulmaz
function askable(result,sheet){if(sheet||result.method==='local-annotated-print')return true;if((result.glyphFractionRaw??0)<.5)return false;
 const lines=result.textRedraw?.lines;if(!Array.isArray(lines))return true;return lines.some(l=>(l.conf??0)>=.85);}
let waits=new WeakMap();
async function attempt(){
 const file=currentFile();
 const failed=placementFailed(),misread=!failed&&photoTakenAsLogo(file);
 if(running||!file||tried.has(file)||isGenerated(file)||!/^image\/(jpeg|png|webp|heic|heif|bmp|avif)$/i.test(file.type||'')||(!failed&&!misread))return;
 // Önce hızlı tabela yolu: o karar verene kadar bekle (en çok ~15 sn); yerleştirdiyse bu yol hiç çalışmaz
 const SL=root.HijyenLabSignLetteringUI;
 if(SL){const st=SL.state(file),n=waits.get(file)||0;
  if((st==='running'||(st===undefined&&SL.wants(file)))&&n<150){waits.set(file,n+1);setTimeout(attempt,100);return;}
  if(st==='placed')return;}
 const stillValid=()=>failed?placementFailed():photoTakenAsLogo(currentFile());
 tried.add(file);claimed.add(file);running=true;let placed=false;busy.on();
 try{
  const image=await decode(file),max=2048,s=Math.min(1,max/Math.max(image.width,image.height)),c=document.createElement('canvas');c.width=Math.round(image.width*s);c.height=Math.round(image.height*s);
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,c.width,c.height);if(typeof image.close==='function')image.close();
  const same=()=>{const x=currentFile();return !!x&&(x===file||(x.name===file.name&&x.size===file.size));};if(!same()||!stillValid())return;
  // Logo sanılan fotoğraf: içinde belirgin, dikdörtgen, görselden küçük bir baskılı yüzey yoksa dokunma (düz logo dosyaları)
  if(misread){const sf=root.ProductPhoto.findSurface(g.getImageData(0,0,c.width,c.height).data,c.width,c.height).best;if(!sf||sf.score<MISREAD_MIN_SCORE||sf.rectangularity<.8||sf.area>.75)return;}
  const [classify,kit]=await Promise.all([orientationModel(),textRedrawKit()]);if(!same()||!stillValid())return;
  const result=await root.ProductPhoto.extract(g.getImageData(0,0,c.width,c.height).data,c.width,c.height,{classify,...(kit||{})});lastResult=result;
  if(!result.ok||!same()||!stillValid())return;
  let out=document.createElement('canvas');out.width=result.image.w;out.height=result.image.h;out.getContext('2d').putImageData(new ImageData(result.image.data,result.image.w,result.image.h),0,0);
  // Güven kademesi: emin → doğrudan; kararsız → müşteriye tek dokunuşla sor; emin değil → hiçbir şey koyma (mevcut davranış)
  // Harf oranı: mürekkebin yazı satırlarına ait kısmı (gösterge, süs, efekt parçalarında düşük)
  const confidence=result.confidence??0,raw=result.glyphFractionRaw??result.glyphFraction??0,glyph=result.glyphFraction??0,sheet=!!state.technicalSheetDetected;
  // Ham oran (temizlik öncesi) düşükse içerik yazı değildir: reddet. Kendiliğinden yerleştirme temizlenmiş logodaki orana bakar.
  if(sheet?(confidence<.9||raw<.1):(confidence<AUTO_MIN_ASK||raw<GLYPH_MIN_ASK))return;
  const auto=!sheet&&confidence>=AUTO_MIN_PLACE&&glyph>=GLYPH_MIN_PLACE;
  if(!auto&&!askable(result,sheet))return;
  if(!auto){const choice=await ask(out);if(!same()||!stillValid())return;if(!choice)return;out=choice;}
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob||!same())return;
  const generated=new File([blob],PREFIX+Date.now().toString(36)+'.png',{type:'image/png'});tried.add(generated);
  root.HijyenLabProductPhoto={source:'local-product-photo-v1',palette:result.palette,surface:result.surface,quarterTurns:result.quarterTurns,orientationSource:result.orientationSource};
  await routeUploadedFile(generated,'logo');placed=true;
  const mine=()=>currentFile()?.name===generated.name;
  for(let i=0;i<80&&!(mine()&&!state.designProcessing&&state.logo);i++)await new Promise(r=>setTimeout(r,100));
  if(mine()){noteFor=generated.name;note.textContent='Fotoğraftaki ürünün baskısı ayrıldı, düzleştirildi ve temizlendi. Yazıları ve logoyu kontrol edip onaylayın; uygun değilse görseli değiştirebilirsiniz.';note.hidden=false;}
 }catch(error){lastError=String(error?.message||error);}
 finally{running=false;busy.off();if(!placed){
   // yerleştirilemedi: tabela yolu yedek olarak denenir (şablon sonucu ya da yerel metin tanıma)
   if(SL)SL.fallback(file).catch(()=>{});}}
}
const previous=showDesignIssue;showDesignIssue=function(...args){const out=previous.apply(this,args);setTimeout(attempt,0);return out;};
if(typeof refresh==='function'){const previousRefresh=refresh;refresh=function(...args){const out=previousRefresh.apply(this,args);syncNote();const f=currentFile();if(!running&&f&&!tried.has(f)&&!isGenerated(f)&&(placementFailed()||photoTakenAsLogo(f)))setTimeout(attempt,0);return out;};}
const ppWants=f=>!!f&&!tried.has(f)&&!isGenerated(f)&&/^image\/(jpeg|png|webp|heic|heif|bmp|avif)$/i.test(f.type||'')&&(placementFailed()||photoTakenAsLogo(f));
root.HijyenLabProductPhotoUI=Object.freeze({asking:()=>!card.hidden,attempt,recognizer,wants:ppWants,placementFailed,claims:f=>!!f&&claimed.has(f),busy:()=>running,lastError:()=>lastError,lastResult:()=>lastResult&&{ok:lastResult.ok,reason:lastResult.reason,diagnostics:lastResult.diagnostics}});
})(globalThis);
