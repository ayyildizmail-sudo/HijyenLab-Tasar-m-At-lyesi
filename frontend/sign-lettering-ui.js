/* Fotoğraf ambalaja yerleştirilemediğinde: fotoğraftaki tabela/yazı harflerinden yerel logo önerisi.
   Tamamen tarayıcıda çalışır; görsel hiçbir yere gönderilmez. Sonuç normal logo yükleme yolundan geçer
   ve müşteri onayı olmadan teklife giremez. Emin olunmazsa mevcut "yerleştirilemedi" davranışı aynen kalır. */
(function(root){'use strict';
if(typeof document==='undefined'||!root.SignLettering||typeof showDesignIssue!=='function'||typeof routeUploadedFile!=='function'||typeof state==='undefined')return;
const tried=new WeakSet();let running=false,fontsReady=null,noteFor=null,lastError=null;
// Müşteriye açıklama: ortak durum satırı sonradan yenilendiği için ayrı, kalıcı not alanı
const note=document.createElement('p');note.id='signLetteringNote';note.className='hint';note.setAttribute('role','status');note.hidden=true;
(document.querySelector('.simplePrimary')||document.getElementById('status')||document.body).before(note);
// Uygulama yüklenen dosyanın kopyasını tutabilir; üretilen dosya benzersiz adıyla tanınır
const PREFIX='fotograftaki-yazi-',isGenerated=file=>typeof file?.name==='string'&&file.name.startsWith(PREFIX);
// İşlem sürerken ekranın üstünde sabit bilgi şeridi (telefonda "oluşturulamadı" yazısı tek başına görünmesin). İki yol ortak kullanır.
if(!root.HijyenLabPhotoBusy){let count=0;const bar=document.createElement('div');bar.id='photoBusyBanner';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');bar.hidden=true;
 bar.style.cssText='position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:1001;max-width:min(92vw,420px);padding:10px 16px;border-radius:999px;background:#12324f;color:#fff;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:center';
 bar.textContent='Fotoğraf işleniyor… Logo ve yazı aranıyor.';document.body.append(bar);
 root.HijyenLabPhotoBusy=Object.freeze({on(){count++;bar.hidden=false;},off(){count=Math.max(0,count-1);if(!count)bar.hidden=true;},active:()=>count>0});}
const busy=root.HijyenLabPhotoBusy;
const currentFile=()=>typeof lastUploadedFile==='undefined'?null:lastUploadedFile;
function syncNote(){if(!noteFor)return;const current=currentFile();if((current&&current.name!==noteFor)||state.removed){note.hidden=true;note.textContent='';noteFor=null;}}

// Yalnız mevcut akışın vazgeçtiği durumlar: desteklenmeyen fotoğraf veya ekran görüntüsü
function placementFailed(){
 if(state.designProcessing||state.textDesign||state.logoDesign)return false;
 if(typeof isReferencePreview==='function'&&isReferencePreview())return true; // "Özgün görsel gösteriliyor" — yerleştirilemedi
 return !!state.designBlocked&&!state.logo&&!state.photoLayout&&(!!state.screenSelectionRequired||!!root.ReferenceRecovery?.eligible?.(state));
}
// Kamera fotoğrafı yanlışlıkla hazır logo sayılıp sahnenin tamamı ambalaja kondu mu? (yalnız JPEG/HEIC fotoğraflar)
function photoTakenAsLogo(file){
 return !state.designProcessing&&!state.textDesign&&!state.logoDesign&&!!state.logo&&!state.photoLayout&&/^image\/(jpeg|heic|heif)$/i.test(file?.type||'');
}
// Sahne fotoğrafında yazı görüntünün küçük bir kısmıdır ve arka plan çok renklidir; düz zeminli logo dosyasında değildir
const looksLikeScene=result=>result.coverage<.25&&result.sceneColors>=25; // ölçüm: fotoğraflar ≥38, düz zeminli logolar ≤15
function decode(file){
 if(typeof createImageBitmap==='function')return createImageBitmap(file);
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});
}
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

// Sıra (ürün fotoğrafı yöntemiyle birlikte):
//  1) Bu hızlı yol önce çalışır (harf şablonları, ~1 sn). Fotoğraftaki TEK yazı satırı kesin okunursa hemen yerleşir.
//  2) Başka yazı satırları da varsa (ambalaj, kartvizit) ya da okunamazsa karar ürün fotoğrafı yöntemine bırakılır.
//  3) O yöntem yerleştiremezse bu yol yedek olarak devreye girer: önce şablon sonucu, sonra yerel metin tanıma modeliyle okuma
//     (yalnız tek satırlı tabelada; yarım/yanlış satır üretmemek için).
const states=new WeakMap(),deferred=new WeakMap();
const sameAs=file=>{const c=currentFile();return !!c&&(c===file||(c.name===file.name&&c.size===file.size));};
const wants=file=>!!file&&!isGenerated(file)&&/^image\/(jpeg|png|webp|heic|heif|bmp|gif|avif)$/i.test(file.type||'')&&(placementFailed()||photoTakenAsLogo(file));
const showBusy=on=>{on?busy.on():busy.off();};
async function place(file,result){
 const blob=await new Promise(resolve=>result.canvas.toBlob(resolve,'image/png'));
 if(!blob||!sameAs(file))return false;
 const generated=new File([blob],PREFIX+Date.now().toString(36)+'.png',{type:'image/png'});tried.add(generated);
 root.HijyenLabSignLettering={source:'local-sign-lettering-v1',word:result.word,weight:result.weight,color:result.color,reader:result.reader||'template'};
 await routeUploadedFile(generated,'logo');
 const isMine=()=>currentFile()?.name===generated.name;
 for(let i=0;i<80&&!(isMine()&&!state.designProcessing&&state.logo);i++)await new Promise(r=>setTimeout(r,100));
 if(isMine()){noteFor=generated.name;note.textContent=`Fotoğraftaki yazıdan logo oluşturuldu: ${result.word}. Harfler düz yazı tipiyle yeniden çizildi, renk fotoğraftan alındı. Kontrol edip onaylayın; uygun değilse görseli değiştirebilirsiniz.`;note.hidden=false;}
 return true;
}
async function attempt(){
 const file=currentFile();
 const failed=placementFailed(),misread=!failed&&photoTakenAsLogo(file);
 if(running||!file||tried.has(file)||isGenerated(file)||!/^image\/(jpeg|png|webp|heic|heif|bmp|gif|avif)$/i.test(file.type||'')||(!failed&&!misread))return;
 tried.add(file);running=true;states.set(file,'running');showBusy(true);
 const coordinated=!!root.HijyenLabProductPhotoUI;
 try{
  fontsReady=fontsReady||root.SignLettering.loadFonts().catch(()=>false);
  if(!await fontsReady){states.set(file,'failed');return;}
  const image=await decode(file);
  const still=()=>sameAs(file)&&(failed?placementFailed():photoTakenAsLogo(currentFile()));
  if(!still()){states.set(file,'failed');return;}
  const result=root.SignLettering.fromImage(image,{createCanvas:makeCanvas});
  if(typeof image.close==='function')image.close();
  const sceneOk=r=>!misread||looksLikeScene(r);
  if(result.ok&&sceneOk(result)&&(!coordinated||result.otherRows===0)){
   if(still()&&await place(file,result)){states.set(file,'placed');return;}
   states.set(file,'failed');return;}
  deferred.set(file,{result:result.ok&&sceneOk(result)?result:null,misread});states.set(file,'deferred');
  // ürün fotoğrafı yolu bu dosya için çalışmayacaksa yedek hemen denenir
  if(!root.HijyenLabProductPhotoUI?.wants?.(file))setTimeout(()=>fallback(file),0);
 }catch(error){lastError=String(error?.message||error);states.set(file,'failed');/* Yerel deneme başarısızsa mevcut hata mesajı ve yollar aynen kalır. */}
 finally{running=false;showBusy(false);}
}
// Ürün fotoğrafı yöntemi yerleştiremediğinde çağrılır
async function fallback(file){
 if(!file||states.get(file)!=='deferred')return false;const d=deferred.get(file);deferred.delete(file);states.set(file,'failed');
 const still=()=>sameAs(file)&&(placementFailed()||photoTakenAsLogo(currentFile()));if(!still())return false;
 let shown=false;
 try{
  if(d?.result){if(await place(file,d.result)){states.set(file,'placed');return true;}return false;}
  const kit=await root.HijyenLabProductPhotoUI?.recognizer?.();if(!kit||!still())return false;
  showBusy(true);shown=true;
  const image=await decode(file);
  const read=async(img,box)=>{const r=kit.TR.recTensor(img,box),out=await kit.recognize(r.tensor,r.width);const ch=kit.TR.ctcDecode(out.probs,out.T,out.C,out.keys);if(!ch.length)return null;return {text:ch.map(c=>c.ch).join(''),conf:ch.reduce((a,c)=>a+c.p,0)/ch.length};};
  const r=await root.SignLettering.fromImageAsync(image,{createCanvas:makeCanvas,read});if(typeof image.close==='function')image.close();
  if(r.ok&&r.reader==='ocr'&&r.otherRows===0&&(!d?.misread||looksLikeScene(r))&&still()&&await place(file,r)){states.set(file,'placed');return true;}
 }catch(error){lastError=String(error?.message||error);}
 finally{if(shown)showBusy(false);}
 return false;
}
// Mevcut iki vazgeçme yolu: desteklenmeyen fotoğraf showDesignIssue(), ekran görüntüsü refresh() ile sonlanır
const previous=showDesignIssue;
showDesignIssue=function(...args){const out=previous.apply(this,args);setTimeout(attempt,0);return out;};
if(typeof refresh==='function'){const previousRefresh=refresh;refresh=function(...args){const out=previousRefresh.apply(this,args);syncNote();const f=currentFile();if(!running&&f&&!tried.has(f)&&!isGenerated(f)&&(placementFailed()||photoTakenAsLogo(f)))setTimeout(attempt,0);return out;};}
root.HijyenLabSignLetteringUI=Object.freeze({attempt,fallback,placementFailed,wants,state:f=>f?states.get(f):undefined,busy:()=>running,lastError:()=>lastError});
})(globalThis);
