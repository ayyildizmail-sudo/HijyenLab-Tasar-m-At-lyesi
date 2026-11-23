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

async function attempt(){
 const file=currentFile();
 const failed=placementFailed(),misread=!failed&&photoTakenAsLogo(file);
 if(running||!file||tried.has(file)||isGenerated(file)||!/^image\/(jpeg|png|webp|heic|heif|bmp|gif|avif)$/i.test(file.type||'')||(!failed&&!misread))return;
 tried.add(file);running=true;
 try{
  fontsReady=fontsReady||root.SignLettering.loadFonts().catch(()=>false);
  if(!await fontsReady)return;
  const image=await decode(file);
  const same=()=>{const c=currentFile();return !!c&&(c===file||(c.name===file.name&&c.size===file.size));};
  const still=()=>same()&&(failed?placementFailed():photoTakenAsLogo(currentFile()));
  if(!still())return;
  const result=root.SignLettering.fromImage(image,{createCanvas:makeCanvas});
  if(typeof image.close==='function')image.close();
  if(!result.ok||!still()||(misread&&!looksLikeScene(result)))return;
  const blob=await new Promise(resolve=>result.canvas.toBlob(resolve,'image/png'));
  if(!blob||!same())return;
  const generated=new File([blob],PREFIX+Date.now().toString(36)+'.png',{type:'image/png'});tried.add(generated);
  root.HijyenLabSignLettering={source:'local-sign-lettering-v1',word:result.word,weight:result.weight,color:result.color};
  await routeUploadedFile(generated,'logo');
  // Uygulamanın kendi işlemesi ("Logo yüklendi.") bittikten sonra açıklamayı göster
  const isMine=()=>currentFile()?.name===generated.name;
  for(let i=0;i<80&&!(isMine()&&!state.designProcessing&&state.logo);i++)await new Promise(r=>setTimeout(r,100));
  if(isMine()){noteFor=generated.name;note.textContent=`Fotoğraftaki yazıdan logo oluşturuldu: ${result.word}. Harfler düz yazı tipiyle yeniden çizildi, renk fotoğraftan alındı. Kontrol edip onaylayın; uygun değilse görseli değiştirebilirsiniz.`;note.hidden=false;}
 }catch(error){lastError=String(error?.message||error);/* Yerel deneme başarısızsa mevcut hata mesajı ve yollar aynen kalır. */}
 finally{running=false;}
}
// Mevcut iki vazgeçme yolu: desteklenmeyen fotoğraf showDesignIssue(), ekran görüntüsü refresh() ile sonlanır
const previous=showDesignIssue;
showDesignIssue=function(...args){const out=previous.apply(this,args);setTimeout(attempt,0);return out;};
if(typeof refresh==='function'){const previousRefresh=refresh;refresh=function(...args){const out=previousRefresh.apply(this,args);syncNote();const f=currentFile();if(!running&&f&&!tried.has(f)&&!isGenerated(f)&&(placementFailed()||photoTakenAsLogo(f)))setTimeout(attempt,0);return out;};}
root.HijyenLabSignLetteringUI=Object.freeze({attempt,placementFailed,lastError:()=>lastError});
})(globalThis);
