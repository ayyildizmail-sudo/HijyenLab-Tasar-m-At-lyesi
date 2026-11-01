/* Local optional rear design preview; shared front background, no order mutation. */
function tintRearPixels(data,background){
 if(!/^#[0-9a-f]{6}$/i.test(background))throw Error('Geçerli ambalaj rengi bulunamadı.');
 if(background.toLowerCase()==='#ffffff')return data;
 const rgb=background.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16));
 for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;const lum=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255,color=materialColor(rgb,lum);data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];}return data;
}
function rearPackageClip(context,w,h){if(typeof ProductGeometry!=='undefined'&&!ProductGeometry.isStandardRulo(globalThis.selectedProductId||'BM12')){ProductGeometry.clip(context,globalThis.selectedProductId,'back',w,h);return;}const points=[[3.2,7.4],[9.1,13.5],[12.3,15.2],[21,15.4],[33,16],[46,14.8],[57,14.8],[69,14.5],[83,14.3],[88.7,15.9],[91,12.2],[97,7.4],[97,93.5],[91,90],[89.5,88.9],[88.6,89.9],[86.7,88.4],[83,88.3],[70,87.5],[56,87],[45,86.8],[33,88.3],[20,88.4],[11.5,88.1],[9.1,90.4],[3.2,93.5]];context.beginPath();points.forEach((p,i)=>i?context.lineTo(p[0]*w/100,p[1]*h/100):context.moveTo(p[0]*w/100,p[1]*h/100));context.closePath();context.clip();}
function resolvedRearQrInk(){if(!rearContent.qrEnabled)return null;const result=typeof combinedRearInkEstimate==='function'?combinedRearInkEstimate():null;if(result?.status!=='estimated'||!result.qrColor)throw Error(result?.reason||'QR için mevcut baskı renklerinden okunabilir bir renk belirlenemedi. Tasarım rengini kontrol edin veya QR seçimini kaldırın.');return result.qrColor;}
function rearMaterialDataURL(source,background){const safetyError=typeof contentSafetyError==='function'?contentSafetyError('rear'):'';if(safetyError)throw Error(safetyError);const policyError=typeof visualPreviewPolicyError==='function'?visualPreviewPolicyError():typeof printPolicyError==='function'?printPolicyError():'';if(policyError)throw Error(policyError);const textError=rearTextInkError();if(textError)throw Error(textError);const c=document.createElement('canvas');const crop=typeof ProductGeometry!=='undefined'?ProductGeometry.get(globalThis.selectedProductId||'BM12').sourceRect:null,shape=crop?ProductGeometry.get(globalThis.selectedProductId).source:null;c.width=shape?shape.width:source.naturalWidth;c.height=shape?shape.height:source.naturalHeight;const context=c.getContext('2d',{willReadFrequently:true});context.save();rearPackageClip(context,c.width,c.height);if(crop)context.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,c.width,c.height);else context.drawImage(source,0,0);context.restore();if(background.toLowerCase()!=='#ffffff'){const pixels=context.getImageData(0,0,c.width,c.height);tintRearPixels(pixels.data,background);context.putImageData(pixels,0,0);}if(rearHasContent()){const qr=rearContent.qrEnabled?QRPreview.encodeUrl(rearContent.qrUrl):null;RearLayout.render(context,c.width,c.height,rearContent,{sponsorImage:globalThis.MultiLogo?MultiLogo.rearImage():rearSponsorImage,qrMatrix:qr?.modules||null,qrColor:qr?resolvedRearQrInk():null,background,inkColor:effectiveRearInkColor(),profile:typeof ProductGeometry!=='undefined'?ProductGeometry.get(globalThis.selectedProductId||'BM12').rear:undefined});}const url=c.toDataURL('image/png');c.width=c.height=1;if(!url.startsWith('data:image/png'))throw Error('Arka yüz önizlemesi hazırlanamadı.');return url;}
const rearContent={instagram:'',website:'',phone:'',address:'',extra:'',inkColor:'',qrEnabled:false,qrUrl:'',sponsorName:'',sponsorHash:''};
const rearTextFieldIds=['rearInstagram','rearWebsite','rearPhone','rearAddress','rearExtra','rearQrUrl'];
const rearComposingFields=new Set();
let rearInputPending=false;
function rearTextEditing(){return rearComposingFields.size>0||rearTextFieldIds.includes(document.activeElement?.id);}
function scheduleRearRefresh(delay=180){clearTimeout(rearRenderTimer);rearRenderTimer=setTimeout(()=>{rearRenderTimer=null;if(!rearPreview.hidden&&!rearTextEditing())renderRearPreview(false);},delay);}
let rearRevision=0,rearSponsorImage=null,rearSponsorOriginalImage=null,rearSponsorRecolor='',rearSponsorOperation=0,rearSponsorPending=false,rearSponsorReview=null,rearSponsorPrepared=null,rearSponsorWarning='',rearSponsorFailure='',rearSponsorSource=null,rearSponsorDiagnostics=[],rearSponsorRegion=null,rearSuggestedPrevious=null,rearRenderTimer=null,rearRenderedRevision=-1,rearRenderedData=null;
function effectiveRearInkColor(){if(typeof rearTextInkDecision==='function')return rearTextInkDecision().color;if(/^#[0-9a-f]{6}$/i.test(rearContent.inkColor))return rearContent.inkColor;if(state.recolor&&state.recolorApplied&&/^#[0-9a-f]{6}$/i.test(state.color))return state.color;return null;}
function rearTextInkError(){if(typeof rearTextInkDecision!=='function'||!['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim()))return '';const decision=rearTextInkDecision();return decision.ok?'':decision.reason;}
function rearHasContent(){if(typeof isUnprinted==='function'&&isUnprinted()||typeof isReferencePreview==='function'&&isReferencePreview())return false;return !!(rearContent.instagram.trim()||rearContent.website.trim()||rearContent.phone.trim()||rearContent.address.trim()||rearContent.extra.trim()||rearContent.sponsorHash||rearContent.qrEnabled);}
function rearEmptyForSkip(){return !rearHasContent()&&!rearSponsorSource&&!rearSponsorPending&&!rearSponsorReview&&!rearSponsorFailure;}
function rearContinueLabel(empty=false){const next=typeof fragranceReady==='function'&&!fragranceReady()?'koku seçimine geç':'fiyatı gör';return (empty?'Boş bırak ve ':'Onayla ve ')+next+' →';}
function syncRearSkip(){const empty=rearEmptyForSkip();$('skipEmptyRear').textContent=rearContinueLabel(true);$('rearToPrice').textContent=rearInputPending?'Yazdıklarımı önizle':rearContinueLabel();$('skipEmptyRear').hidden=!empty;$('skipEmptyRear').disabled=!empty;$('rearToPrice').hidden=empty;if(!empty)$('rearEditor').open=true;}
function rearQuoteSnapshot(){if(typeof isUnprinted==='function'&&isUnprinted()||typeof isReferencePreview==='function'&&isReferencePreview())return null;return {revision:rearRevision,instagram:rearContent.instagram.trim(),website:rearContent.website.trim(),phone:rearContent.phone.trim(),address:rearContent.address.trim(),extra:rearContent.extra.trim(),inkColor:effectiveRearInkColor(),sponsorHash:rearContent.sponsorHash||null,sponsorRecolor:rearSponsorRecolor||null,qr:rearContent.qrEnabled?{enabled:true,url:rearContent.qrUrl.trim(),inkRule:'darkest-existing-design-ink'}:null};}
function rearQuoteReady(){if(typeof isReferencePreview==='function'&&isReferencePreview())return !!globalThis.ReferenceRecovery?.current();if(typeof isUnprinted==='function'&&isUnprinted())return true;return !rearSponsorPending&&!rearSponsorReview&&!rearSponsorFailure&&(!rearHasContent()||(rearPreviewReady&&rearRenderedRevision===rearRevision&&!!rearRenderedData));}
function rearQuoteImage(){if(typeof isUnprinted==='function'&&isUnprinted())return null;return rearHasContent()&&rearQuoteReady()?rearRenderedData:null;}
function rearValidationError(){const safetyError=typeof contentSafetyError==='function'?contentSafetyError('rear'):'';if(safetyError)return safetyError;const policyError=typeof visualPreviewPolicyError==='function'?visualPreviewPolicyError():typeof printPolicyError==='function'?printPolicyError():'';if(policyError)return policyError;if(rearSponsorFailure)return rearSponsorFailure;if(rearSponsorPending)return 'Sponsor logosu ayrıştırılıyor; lütfen bekleyin.';if(rearSponsorReview)return 'Ayrıştırılan sponsor logosunu kontrol edip kullanmayı onaylayın.';const textError=rearTextInkError();if(textError)return textError;if(rearContent.qrEnabled){if(!rearContent.qrUrl.trim())return 'QR kod için menü veya bağlantı adresini yazın.';try{QRPreview.encodeUrl(rearContent.qrUrl);resolvedRearQrInk();}catch(e){return e.message;}}return '';}
function clearRearContent(){const active=document.activeElement;if(rearTextFieldIds.includes(active?.id))active.blur?.();rearInputPending=false;rearComposingFields.clear();rearSponsorOperation++;rearSponsorPending=false;rearSponsorReview=null;rearSponsorPrepared=null;rearSponsorWarning='';rearSponsorFailure='';rearSponsorSource=null;rearSponsorRegion=null;rearSponsorDiagnostics=[];rearSuggestedPrevious=null;rearSponsorImage=null;rearSponsorOriginalImage=null;rearSponsorRecolor='';Object.assign(rearContent,{instagram:'',website:'',phone:'',address:'',extra:'',inkColor:'',qrEnabled:false,qrUrl:'',sponsorName:'',sponsorHash:''});rearRevision++;if(typeof syncPrintInks==='function')syncPrintInks();rearRenderedData=null;rearRenderedRevision=-1;clearTimeout(rearRenderTimer);if($('rearInstagram')){for(const id of rearTextFieldIds)$(id).value='';syncRearFields();}}
function rearChanged(textInput=false){
 // Commit the literal field value and revoke stale output immediately. Pixel
 // analysis/policy checks and PNG encoding wait until the user leaves editing.
 rearRevision++;rearPreviewGeneration++;rearRenderedData=null;rearRenderedRevision=-1;rearPreviewReady=false;rearInputPending=true;
 invalidateQuote();latest=null;syncRearPreviewStatus();syncRearSkip();
 if(!textInput&&!rearTextEditing()){if(typeof syncPrintInks==='function')syncPrintInks();rearInputPending=false;}
 $('rearToPrice').disabled=!rearInputPending;$('rearToPrice').textContent=rearInputPending?'Yazdıklarımı önizle':rearContinueLabel();scheduleRearRefresh();
}
let rearPreviewGeneration=0,rearPreviewFingerprint=null,rearPreviewReady=false;
const rearPreview=document.createElement('section');rearPreview.id='rearPreview';rearPreview.hidden=true;
rearPreview.innerHTML='<h1 id="rearTitle" tabindex="-1">Arka yüz</h1><p class="subtitle">Arka yüze ekleme yapmak isteğe bağlıdır.</p><div class="rearFlipScene"><div id="rearPreviewStatus" class="rearPreviewStatus" role="status" hidden></div><div id="rearFlipCard" class="rearFlipCard"><div class="rearFlipFace rearFlipFront" aria-hidden="true"><img id="rearFrontImage" alt=""></div><div class="rearFlipFace rearFlipBack"><img id="rearBlankImage" alt="Boş arka ambalaj; ortadaki yapıştırma dikişi görünür"></div></div></div><p id="rearAssetError" role="alert" hidden>Arka yüz görseli yüklenemedi. <button id="retryRearAsset" class="outline" type="button">Yeniden dene</button></p><button id="skipEmptyRear" class="primary full" type="button">Boş bırak ve koku seçimine geç →</button><details id="rearEditor" class="rearEditor"><summary>Arka yüze bilgi veya logo ekle</summary><h2>Arka yüze ne ekleyelim?</h2><p class="hint">Hepsi isteğe bağlı. İstemediğiniz alanı boş bırakın.</p><div class="rearFieldGrid"><label>Instagram<input id="rearInstagram" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" type="text" maxlength="80" placeholder="@isletmeniz"></label><label>Web sitesi<input id="rearWebsite" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="url" type="text" maxlength="140" placeholder="www.ornek.com"></label><label>Telefon<input id="rearPhone" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" type="tel" maxlength="50" placeholder="+90 …"></label><label>Adres<input id="rearAddress" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" type="text" maxlength="220" placeholder="İsteğe bağlı adres"></label></div><details class="rearOptional"><summary>Ek yazı ve yazı rengi</summary><label>Ek yazı / slogan<input id="rearExtra" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" type="text" maxlength="140" placeholder="İsteğe bağlı işletme adı veya kısa slogan"></label><label>Arka yüz yazı rengi<select id="rearInkColor"><option value="">Ön yüzle uyumlu / otomatik</option><option value="#111111">Siyah</option><option value="#ffffff">Beyaz</option><option value="#102f59">Lacivert</option><option value="#800d2e">Bordo</option><option value="#245b47">Yeşil</option><option value="#b58a43">Altın tonu</option><option value="#edb9a1">Şeftali tonu</option></select></label><p class="hint">Bu ekran rengi önizlemesidir; Pantone veya baskı renk garantisi değildir.</p></details><details class="rearOptional"><summary>Sponsor logosu ekle</summary><p class="hint">Logo ya da uygun bir ürün fotoğrafı ekleyin. Ayrıştırılan logoyu kontrol ederek kullanın; karmaşık fotoğraflar işlenemeyebilir.</p><label class="rearSponsorPicker"><span id="rearSponsorPickerText">Sponsor görseli seç</span><input id="rearSponsorUpload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label><p id="rearSponsorName"></p><figure id="rearSponsorSourcePanel" hidden><figcaption>Yüklediğiniz özgün görsel · bu sayfada korunur</figcaption><img id="rearSponsorSourceImage" alt="Seçtiğiniz sponsor görseli"></figure><section id="rearSponsorRegionPanel" hidden><h3>Aynı görselden marka alanını seçin</h3><p class="hint">Ambalajın veya logonun tüm marka yazılarını içine alan bir kutu çizin. Ekran düğmeleri ve açıklamalar dışarıda kalsın. Yeni dosya gerekmez.</p><canvas id="rearSponsorRegionCanvas" aria-label="Tam marka alanını seçmek için sürükleyin"></canvas><details class="rearRegionFine"><summary>Alanı sayısal olarak ayarla (isteğe bağlı)</summary><div class="rearRegionCoordinates"><label>Sol (%)<input id="rearRegionLeft" type="number" min="0" max="100"></label><label>Üst (%)<input id="rearRegionTop" type="number" min="0" max="100"></label><label>Sağ (%)<input id="rearRegionRight" type="number" min="0" max="100"></label><label>Alt (%)<input id="rearRegionBottom" type="number" min="0" max="100"></label></div></details><p id="rearRegionMessage" role="status"></p><button id="previewRearRegion" class="primary" type="button" disabled>Seçtiğim alanı ayrıştır</button><button id="cancelRearRegion" class="outline" type="button">Seçimi iptal et</button></section><button id="retryRearSponsor" class="outline" type="button" hidden>Aynı görselle yeniden dene</button><details id="rearSponsorDiagnostics" hidden><summary>İşlem ayrıntıları</summary><pre id="rearSponsorDiagnosticText"></pre><p class="hint">Bu bilgiler yalnız cihazınızda gösterilir; otomatik gönderilmez.</p></details><div id="rearSponsorReview" hidden><p id="rearSponsorPaletteNote" class="notice light" hidden></p><p class="hint">Logo ve tüm marka yazıları kaldı mı? Fotoğrafın kendisi ambalaja yerleştirilmez.</p><div class="rearSponsorCompare"><figure><figcaption>Yüklediğiniz görsel</figcaption><img id="rearSponsorOriginal" alt="Özgün sponsor görseli"></figure><figure><figcaption>Ayrıştırılan logo</figcaption><img id="rearSponsorExtracted" alt="Sponsor logo önerisi"></figure></div><button id="acceptRearSponsor" class="primary" type="button">Bu logoyu kullan</button><button id="rejectRearSponsor" class="outline" type="button">Bu doğru değil · kaldır</button></div><p id="rearSponsorWarning" class="notice light" hidden></p><div id="rearContrastOptions" class="rearContrastOptions" hidden><p class="hint">Önce yalnız arka logo rengini değiştirmeyi deneyebilirsiniz. Zemin önerileri yalnız arka logo için hesaplanır; ön yüzdeki baskıyla uyumu ayrıca kontrol edin. Zemin seçimi iki yüzü değiştirir ve ön yüz yeniden onaylanır.</p><div id="rearContrastChoices" class="rearContrastChoices"></div><button id="rearContrastUndo" class="outline" type="button" hidden>Önceki zemin rengine dön</button></div><button id="removeRearSponsor" class="outline" type="button" hidden>Logoyu kaldır</button></details><label class="rearQrToggle"><input id="rearQrEnabled" type="checkbox"> QR kod ekle <small>(isteğe bağlı)</small></label><div id="rearQrFields" hidden><label>QR bağlantısı<input id="rearQrUrl" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="url" type="url" maxlength="512" placeholder="https://… menü, site veya sosyal medya bağlantısı"></label><div class="rearQuickLinks"><button id="rearQrWebsite" class="textButton" type="button">Web sitesini kullan</button><button id="rearQrInstagram" class="textButton" type="button">Instagram adresini kullan</button></div><p class="hint">QR, tasarımdaki mevcut renklerin en koyusuyla oluşturulur; ayrı siyah renk eklenmez. Baskıdan önce boyut ve telefonla okunurluk kontrol edilir.</p></div><p id="rearEditorError" class="actionHelp" role="alert" hidden></p><p id="rearPriceNote" class="notice light" hidden>Arka yüz içeriği eklendi. Ön ve arka yüzün toplam baskı renkleri/klişesi teknik incelemede netleşir; gösterilen ara toplam klişe bedelini içermez.</p></details><div class="rearActions"><button id="backToFront" class="outline" type="button">← Ön yüze dön</button><button id="rearToPrice" class="primary" type="button">Onayla ve koku seçimine geç →</button></div>';
$('design').after(rearPreview);
function resetRearPreview(){clearRearContent();rearPreviewGeneration++;rearPreviewFingerprint=null;rearPreviewReady=false;rearPreview.hidden=true;$('rearFlipCard').classList.remove('is-flipped');$('rearFrontImage').removeAttribute('src');if(step===4){step=1;$('design').hidden=false;}}
function hideRearPreview(){globalThis.HijyenLabJourneyMotion?.cancelAll();rearPreviewGeneration++;rearPreview.hidden=true;}
function showRearPreview(){
 globalThis.HijyenLabJourneyMotion?.cancelAll();
 if(typeof isUnprinted==='function'&&isUnprinted()){hideRearPreview();go(2);return;}
 if(designIssue()||!appliedFrontApproved()){showDesignIssue();return false;}
 rearPreviewFingerprint=designFingerprint();const front=typeof visualPreviewImageData==='function'?visualPreviewImageData():imageData();
 ['design','pricing','summary','photoEditor','pdfPicker','whiteCarrierPanel'].forEach(id=>{if($(id))$(id).hidden=true;});step=4;rearPreview.hidden=false;globalThis.HijyenLabJourneyMotion?.front();$('simpleTools').hidden=true;$('simpleDetails').hidden=true;
 $('rearFlipCard').classList.remove('is-flipped');$('rearFrontImage').src=front;$('rearEditor').open=!rearEmptyForSkip();syncRearFields();renderRearPreview(true);
 status('');globalThis.HijyenLabResponsiveJourney?.enter('rearPreview');return true;
}
function renderRearPreview(flip){
 if(rearTextEditing())return;
 clearTimeout(rearRenderTimer);rearRenderTimer=null;
 if(rearInputPending){if(typeof syncPrintInks==='function')syncPrintInks();rearInputPending=false;}
 $('rearToPrice').textContent=rearContinueLabel();
 const generation=++rearPreviewGeneration,revision=rearRevision,background=state.bg;if(rearSponsorPrepared&&typeof RearLogo!=='undefined'){rearSponsorWarning=[rearSponsorPrepared.paletteProposalNote,rearSponsorPrepared.method?.includes('photo')?rearSponsorPrepared.contrastWarning:'',RearLogo.contrastWarning(activeRearSponsor(),background)].filter(Boolean).join(' ');$('rearSponsorWarning').textContent=rearSponsorWarning;$('rearSponsorWarning').hidden=!rearSponsorWarning;}rearPreviewReady=false;syncRearSkip();$('rearToPrice').disabled=true;$('rearAssetError').hidden=true;$('rearEditorError').hidden=true;$('rearPriceNote').hidden=!rearHasContent();
 syncRearContrast();syncRearPreviewStatus();const error=rearValidationError();if(error){$('rearEditorError').textContent=error;$('rearEditorError').hidden=false;if(rearTextInkError()){const colorPanel=$('rearInkColor').closest('details');if(colorPanel)colorPanel.open=true;const choose=document.createElement('button');choose.type='button';choose.className='outline';choose.textContent='Yazı rengini seç';choose.onclick=()=>{$('rearInkColor').scrollIntoView({block:'center',behavior:'smooth'});$('rearInkColor').focus();};$('rearEditorError').append(choose);}return;}
 $('rearBlankImage').alt=globalThis.selectedProductId==='BM21'?'7 × 12 cm arka yüz yaklaşık önizlemesi; onaylı boş görsel kullanılır':'Boş arka ambalaj; ortadaki yapıştırma dikişi görünür';let renderedURL=null;const rear=$('rearBlankImage'),current=()=>generation===rearPreviewGeneration&&revision===rearRevision&&!rearPreview.hidden&&!rearTextEditing()&&rearPreviewFingerprint===designFingerprint();
 rear.onload=()=>{if(!current()||!renderedURL||rear.src!==renderedURL)return;if(!rear.naturalWidth){rear.onerror();return;}rearPreviewReady=true;syncRearSkip();syncRearPreviewStatus(true);rearRenderedRevision=revision;rearRenderedData=rear.src;$('rearToPrice').disabled=false;if(!flip)globalThis.HijyenLabJourneyMotion?.rear();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(current())$('rearFlipCard').classList.add('is-flipped');}));};
 rear.onerror=()=>{if(!current())return;rearPreviewReady=false;syncRearSkip();$('rearToPrice').disabled=true;$('rearAssetError').hidden=false;};
 const source=new Image();source.onload=()=>{if(!current())return;try{renderedURL=rearMaterialDataURL(source,background);rear.src=renderedURL;}catch(error){rearPreviewReady=false;syncRearSkip();$('rearToPrice').disabled=true;$('rearEditorError').textContent=error.message||'Arka yüz hazırlanamadı.';$('rearEditorError').hidden=false;}};source.onerror=()=>{if(current())rear.onerror();};source.src=typeof currentProduct==='function'?currentProduct().backAsset:'assets/bm12-back-blank.png';
}
function syncRearFields(){syncRearSkip();for(const [id,key]of [['rearInstagram','instagram'],['rearWebsite','website'],['rearPhone','phone'],['rearAddress','address'],['rearExtra','extra'],['rearInkColor','inkColor'],['rearQrUrl','qrUrl']]){const input=$(id);if(input!==document.activeElement&&!rearComposingFields.has(id)&&input.value!==rearContent[key])input.value=rearContent[key];}$('rearQrEnabled').checked=rearContent.qrEnabled;$('rearQrFields').hidden=!rearContent.qrEnabled;$('rearSponsorName').textContent=rearSponsorSource?.file.name||rearContent.sponsorName;syncRearSource();$('removeRearSponsor').hidden=!(rearContent.sponsorHash||rearSponsorReview||rearSponsorFailure||rearSponsorSource);$('rearSponsorReview').hidden=!rearSponsorReview;$('rearSponsorPaletteNote').textContent=rearSponsorReview?.prepared?.paletteProposalNote||'';$('rearSponsorPaletteNote').hidden=!rearSponsorReview?.prepared?.paletteProposalNote;$('rearSponsorWarning').hidden=!rearSponsorWarning;$('rearSponsorWarning').textContent=rearSponsorWarning;syncRearContrast();}
for(const [id,key]of [['rearInstagram','instagram'],['rearWebsite','website'],['rearPhone','phone'],['rearAddress','address'],['rearExtra','extra'],['rearInkColor','inkColor'],['rearQrUrl','qrUrl']])$(id).oninput=()=>{if(key==='inkColor'&&$(id).value&&typeof textColorAllowed==='function'&&!textColorAllowed($(id).value)){$(id).value=rearContent[key];status(PrintPolicy.CONTACT_MESSAGE);return;}rearContent[key]=$(id).value;rearChanged(key!=='inkColor');};
$('rearQrEnabled').onchange=()=>{rearContent.qrEnabled=$('rearQrEnabled').checked;if(!rearContent.qrEnabled){rearContent.qrUrl='';$('rearQrUrl').value='';}syncRearFields();rearChanged();};
$('rearQrWebsite').onclick=()=>{const value=rearContent.website.trim();if(!value){$('rearEditorError').textContent='Önce web sitesi alanını doldurun.';$('rearEditorError').hidden=false;return;}rearContent.qrUrl=/^https?:\/\//i.test(value)?value:'https://'+value;$('rearQrUrl').value=rearContent.qrUrl;syncRearFields();rearChanged();};
$('rearQrInstagram').onclick=()=>{const value=rearContent.instagram.trim();if(!value){$('rearEditorError').textContent='Önce Instagram adresini yazın.';$('rearEditorError').hidden=false;return;}rearContent.qrUrl=/^https?:\/\//i.test(value)?value:'https://www.instagram.com/'+value.replace(/^@/,'')+'/';$('rearQrUrl').value=rearContent.qrUrl;syncRearFields();rearChanged();};
function activeRearSponsor(){if(!rearSponsorPrepared)return null;if(!rearSponsorRecolor)return rearSponsorPrepared;return {...rearSponsorPrepared,inkSamples:[{rgb:[1,3,5].map(i=>parseInt(rearSponsorRecolor.slice(i,i+2),16)),count:1}]};}
function coloredRearLogo(color){const source=rearSponsorOriginalImage,c=document.createElement('canvas');c.width=source.width;c.height=source.height;const cx=c.getContext('2d');cx.drawImage(source,0,0);cx.globalCompositeOperation='source-in';cx.fillStyle=color;cx.fillRect(0,0,c.width,c.height);return c;}
function syncRearContrast(){if(typeof RearContrast==='undefined')return;const choices=$('rearContrastChoices'),active=activeRearSponsor(),suggestions=active?RearContrast.suggest(active.inkSamples,state.bg):[],canRecolor=rearSponsorPrepared&&RearContrast.singleInk(rearSponsorPrepared.inkSamples),poor=active&&RearContrast.score(active.inkSamples,state.bg)?.lowFraction>.2;choices.replaceChildren();$('rearContrastOptions').hidden=!suggestions.length&&!rearSuggestedPrevious&&!(canRecolor&&poor)&&!rearSponsorRecolor;$('rearContrastUndo').hidden=!rearSuggestedPrevious;if(!rearSponsorImage)return;
 const add=(image,color,text,action)=>{const button=document.createElement('button'),preview=document.createElement('img'),label=document.createElement('span');button.type='button';button.className='rearContrastChoice';preview.src=image.toDataURL('image/png');preview.alt=text;preview.style.backgroundColor=color;label.textContent=text;button.append(preview,label);button.onclick=action;choices.append(button);};
 if(canRecolor&&poor)for(const [color,name]of [['#ffffff','beyaz'],['#111111','siyah']]){const candidate=RearContrast.score([{rgb:[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),count:1}],state.bg);if(candidate.lowFraction>.2)continue;const preview=coloredRearLogo(color);add(preview,state.bg,'Yalnız arka logoyu '+name+' yap',()=>{rearSponsorImage=preview;rearSponsorRecolor=color;syncRearFields();rearChanged();});}
 if(rearSponsorRecolor)add(rearSponsorOriginalImage,state.bg,rearSponsorPrepared?.flatPrintProposal?.method==='rear-canonical-flat-proposal-v1'?'Onaylanan renk önerisine dön':'Özgün logo rengine dön',()=>{rearSponsorImage=rearSponsorOriginalImage;rearSponsorRecolor='';syncRearFields();rearChanged();});
 for(const suggestion of suggestions){if(state.whiteCarrierWhiteOnly&&suggestion.color!=='#ffffff')continue;add(rearSponsorImage,suggestion.color,'İki yüzü '+suggestion.label.toLocaleLowerCase('tr-TR')+' yap',()=>{rearSuggestedPrevious={bg:state.bg,bgSource:state.bgSource,bgPantone:state.bgPantone,bgDecisionPending:state.bgDecisionPending};chooseBackground(suggestion.color);rearChanged();go(1);status('İki yüzün zemini değişti; logo rengi korunuyor. Ön yüzü kontrol edip yeniden onaylayın.');});}}
$('rearContrastUndo').onclick=()=>{if(!rearSuggestedPrevious)return;const prior=rearSuggestedPrevious;rearSuggestedPrevious=null;chooseBackground(prior.bg);Object.assign(state,prior);refresh();rearChanged();go(1);status('Önceki zemin geri geldi. Ön yüzü kontrol edip yeniden onaylayın.');};
$('removeRearSponsor').onclick=()=>{rearSponsorSource=null;rearSponsorRegion=null;rearSponsorDiagnostics=[];rearSponsorOperation++;rearSponsorPending=false;rearSponsorReview=null;rearSponsorPrepared=null;rearSponsorWarning='';rearSponsorFailure='';rearSponsorImage=null;rearSponsorOriginalImage=null;rearSponsorRecolor='';rearContent.sponsorHash='';rearContent.sponsorName='';syncRearFields();rearChanged();};
function sponsorErrorText(error){return typeof error?.message==='string'?error.message.slice(0,500):'İşlem tamamlanamadı.';}
function syncRearSource(){
 syncRearRegion();const source=rearSponsorSource;$('rearSponsorPickerText').textContent=source?'Görseli değiştir':'Sponsor görseli seç';$('rearSponsorSourcePanel').hidden=!source?.data;
 if(source?.data)$('rearSponsorSourceImage').src=source.data;else $('rearSponsorSourceImage').removeAttribute('src');
 $('retryRearSponsor').hidden=!source||!rearSponsorFailure;$('retryRearSponsor').disabled=rearSponsorPending;
 $('rearSponsorDiagnostics').hidden=!rearSponsorDiagnostics.length;
 $('rearSponsorDiagnosticText').textContent=['Uygulama: V37',...rearSponsorDiagnostics.map(item=>item.stage+': '+item.message)].join('\n');
}
function syncRearPreviewStatus(ready=false){
 const blocked=!!(rearSponsorPending||rearSponsorReview||rearSponsorFailure),node=$('rearPreviewStatus');
 node.hidden=!blocked;
 node.textContent=rearSponsorPending?'Logo işleniyor. Önceki arka yüz önizlemesi gizlendi.':rearSponsorReview?'Aşağıdaki logo önerisini kontrol edip “Bu logoyu kullan” düğmesine dokunun.':rearSponsorFailure?'Logo yerleştirilemedi. Önceki arka yüz geçerli değildir. Aşağıdan yeniden deneyin veya logoyu kaldırın.':'';
 // Hide both faces: an old front/back snapshot must not masquerade as the new rear.
 $('rearFlipCard').hidden=blocked;
}
function rearRegionError(error){return ['SOURCE_REGION_REQUIRED','SCREEN_REGION_REQUIRED'].includes(error?.code);}
function rearRegionBox(box,w,h){return Array.isArray(box)&&box.length===4&&box.every(Number.isSafeInteger)&&box[0]>=0&&box[1]>=0&&box[2]<=w&&box[3]<=h&&box[2]-box[0]>=16&&box[3]-box[1]>=16&&(box[2]-box[0])*(box[3]-box[1])<=4000000;}
function syncRearRegion(){
 const region=rearSponsorRegion,panel=$('rearSponsorRegionPanel');panel.hidden=!region;
 if(!region)return;
 const canvas=$('rearSponsorRegionCanvas'),image=region.source.image,w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
 canvas.width=Math.min(900,w);canvas.height=Math.max(1,Math.round(h*canvas.width/w));
 const cx=canvas.getContext('2d');cx.drawImage(image,0,0,canvas.width,canvas.height);
 if(region.box){const b=region.box;cx.strokeStyle='#0875f2';cx.lineWidth=3;cx.strokeRect(b[0]*canvas.width/w,b[1]*canvas.height/h,(b[2]-b[0])*canvas.width/w,(b[3]-b[1])*canvas.height/h);}
 $('previewRearRegion').disabled=rearSponsorPending||!rearRegionBox(region.box,w,h);
 for(const [i,id]of ['rearRegionLeft','rearRegionTop','rearRegionRight','rearRegionBottom'].entries())$(id).value=region.box?+(region.box[i]*100/(i%2?h:w)).toFixed(2):'';
}
function setRearRegionBox(box){
 if(!rearSponsorRegion||rearSponsorPending)return;
 rearSponsorOperation++;rearSponsorReview=null;rearSponsorPrepared=null;rearSponsorImage=null;rearSponsorOriginalImage=null;rearContent.sponsorHash='';rearContent.sponsorName='';
 rearSponsorRegion.box=box;rearSponsorFailure='Seçtiğiniz alanı ayrıştırıp tüm marka ayrıntılarını kontrol edin.';
 $('rearRegionMessage').textContent=rearSponsorFailure;syncRearFields();rearChanged();
}
const rearRegionCanvas=$('rearSponsorRegionCanvas');
function rearRegionPoint(event){const r=rearRegionCanvas.getBoundingClientRect(),img=rearSponsorRegion.source.image,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;return [Math.round(Math.max(0,Math.min(1,(event.clientX-r.left)/r.width))*w),Math.round(Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))*h)];}
rearRegionCanvas.onpointerdown=event=>{if(!rearSponsorRegion||rearSponsorPending)return;rearSponsorRegion.drag=rearRegionPoint(event);rearRegionCanvas.setPointerCapture(event.pointerId);setRearRegionBox(null);};
rearRegionCanvas.onpointermove=event=>{if(!rearSponsorRegion?.drag||rearSponsorPending)return;const a=rearSponsorRegion.drag,b=rearRegionPoint(event);setRearRegionBox([Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])]);};
rearRegionCanvas.onpointerup=()=>{if(rearSponsorRegion)rearSponsorRegion.drag=null;};
rearRegionCanvas.onpointercancel=()=>{if(rearSponsorRegion){rearSponsorRegion.drag=null;setRearRegionBox(null);}};
for(const id of ['rearRegionLeft','rearRegionTop','rearRegionRight','rearRegionBottom'])$(id).onchange=()=>{if(!rearSponsorRegion||rearSponsorPending)return;const img=rearSponsorRegion.source.image,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,values=['rearRegionLeft','rearRegionTop','rearRegionRight','rearRegionBottom'].map(id=>$(id).value);if(values.some(v=>v===''))return;setRearRegionBox(values.map((v,i)=>Math.round(Number(v)*(i%2?h:w)/100)));};
$('previewRearRegion').onclick=()=>{const region=rearSponsorRegion;if(!region||rearSponsorPending||region.source!==rearSponsorSource)return;const img=region.source.image;if(!rearRegionBox(region.box,img.naturalWidth||img.width,img.naturalHeight||img.height))return;return processRearSponsor(region.source.file,{source:region.source,box:region.box.slice()});};
$('cancelRearRegion').onclick=()=>{rearSponsorOperation++;rearSponsorRegion=null;rearSponsorPending=false;rearSponsorReview=null;rearSponsorFailure='Alan seçimi iptal edildi. Aynı görselle yeniden deneyebilir veya logoyu kaldırabilirsiniz.';syncRearFields();rearChanged();};
// Canonical palette work runs only for a newly decoded sponsor, never from an
// input/refresh handler or on an already approved sponsor. Approval remains the
// existing original-versus-proposal review, with a current front binding.
function rearCanonicalPaletteContext(){
 if(typeof approvedFlatPhotoPalette!=='function')return null;
 const front=approvedFlatPhotoPalette(null,0,0);if(front?.inkIdentity!=='verified-rendered-flat-palette')return null;
 const input={front:{...front,status:'estimated'},background:state.bg,frontTextColor:state.text&&!state.textPending?state.textColor:null,additional:globalThis.MultiLogo?.palettes()||[],rear:{sponsor:{status:'none'},textColor:['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim())?rearContent.inkColor||null:null}};
 const combined=typeof CombinedInks!=='undefined'?CombinedInks.estimate(input):{status:'unknown'};
 if(combined.status!=='estimated'||combined.count<1||combined.count>3)return {ok:false,reason:'existing-palette-over-limit-or-unverified'};
 const colors=combined.colors.map(c=>c.toLowerCase());
 return {ok:true,colors,background:state.bg.toLowerCase(),frontDesignFingerprint:designFingerprint(),binding:JSON.stringify([designFingerprint(),state.processingResult?.flatPrintProposal?.outputPixelSHA256||null,state.bg.toLowerCase(),colors])};
}
function rearCanonicalGap(reason){
 const reasons={
  'existing-palette-over-limit-or-unverified':'Ön yüz, zemin ve ek yazıların ortak renkleri üç renk içinde doğrulanamadı.',
  'missing-prepared-pixels':'Ayrıştırılan sponsorun gerçek pikselleri doğrulanamadı.',
  'unverified-source-identity':'Sponsorun kaynak kimliği doğrulanamadı.',
  'proposal-engine-unavailable':'Düz renk öneri aracı bu sayfada yüklenemedi.',
  'canonical-contrast-or-roles':'Mevcut renklerle sponsorun ayrı renk alanları, küçük yazıları ve zemin karşıtlığı birlikte korunamadı.',
  'source-detail-would-disappear':'Bazı açık renkli sponsor ayrıntıları kaybolabileceği için otomatik uyarlama yapılmadı.',
  'rendered-pixels-mismatch':'Gösterilecek sponsor görüntüsü ile hesaplanan renkler doğrulanamadı.',
  'front-palette-changed':'Ön yüzün renkleri değişti; sponsor önerisini aynı görselle yeniden hazırlayın.',
  'interior-opacity-ramp-needs-review':'Sponsorun iç saydamlık geçişleri güvenle düz renge çevrilemedi.',
  'photographic-or-noisy-source-needs-review':'Sponsorun fotoğraf dokusu veya bulanıklığı küçük ayrıntıları koruyan renk önerisini engelliyor.',
  'photographic-color-complexity-needs-review':'Sponsorun renk dokusu düz logo renklerinden güvenle ayrılamadı.',
  'rectangular-source-needs-review':'Sponsorun dolu dikdörtgen alanı logo ile fotoğraf/taşıyıcı olarak güvenle ayrılamadı.',
  'contrasting-adjacencies-need-more-than-three-inks':'Birbirine değen sponsor renklerinin ayrımı mevcut üç renkle korunamadı.'
 };
 return (reasons[reason]||'Sponsorun tüm marka ayrıntıları mevcut renklerle güvenle korunamadı.')+' Özgün görsel korunuyor; bu denemede ortak palete uyarlanmış bir öneri sunulmadı.';
}
function rearCanonicalPixels(data,width,height,context){
 const decline=reason=>({applied:false,reason}),hex=c=>'#'+Array.from(c,v=>v.toString(16).padStart(2,'0')).join(''),rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
 if(!data||data.length!==width*height*4||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>4000000)return decline('missing-prepared-pixels');
 const white=(d,i)=>d[i]===255&&d[i+1]===255&&d[i+2]===255,dist=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
 // Already flat native graphics need no geometric classifier. All opaque color
 // roles, including one-pixel/small disconnected details, participate equally.
 const exact=new Set();for(let i=0;i<data.length;i+=4)if(data[i+3]===255&&!white(data,i)){exact.add(hex(data.subarray(i,i+3)));if(exact.size>3)break;}
 let flat=new Uint8ClampedArray(data),sourceColors=[...exact],simple=sourceColors.length>0&&sourceColors.length<=3;
 if(simple){const colors=sourceColors.map(rgb);for(let i=0;i<data.length;i+=4){if(!data[i+3]||white(data,i))continue;const color=Array.from(data.subarray(i,i+3)),nearest=colors.reduce((a,b)=>dist(color,a)<=dist(color,b)?a:b);if(dist(color,nearest)>(data[i+3]===255?0:Math.ceil(255/data[i+3])+2)){simple=false;break;}flat.set(nearest,i);}}
 if(!simple){
  if(typeof FlexoDesignProposal==='undefined')return decline('proposal-engine-unavailable');
  const result=FlexoDesignProposal.proposePixels(new Uint8ClampedArray(data),width,height);if(!result.applied)return result;
  flat=result.data;sourceColors=result.metadata.actualProposedPalette;
 }
 const source=sourceColors.map(rgb),target=context.colors.map(rgb),ground=rgb(context.background),labels=new Int8Array(width*height).fill(-1),counts=source.map(()=>0),exposed=new Set(),edges=new Set();
 for(let p=0;p<labels.length;p++){const i=p*4;if(!data[i+3])continue;if(white(flat,i)){if(!white(data,i))return decline('source-detail-would-disappear');continue;}const label=source.findIndex(c=>c.every((v,k)=>flat[i+k]===v));if(label<0)return decline('rendered-pixels-mismatch');labels[p]=label;counts[label]++;}
 for(let p=0;p<labels.length;p++){const a=labels[p];if(a<0)continue;const x=p%width,y=Math.floor(p/width);for(const q of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1]){const b=q<0?-1:labels[q];if(b<0)exposed.add(a);else if(b!==a)edges.add([Math.min(a,b),Math.max(a,b)].join(':'));}}
 const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,k)=>n+v*[.2126,.7152,.0722][k],0),ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 let best=null,bestCost=Infinity;const assignment=[],total=counts.reduce((a,b)=>a+b,0);
 function choose(index){
  if(index<source.length){for(let t=0;t<target.length;t++){assignment[index]=t;choose(index+1);}return;}
  for(let a=0;a<source.length;a++){
   if(exposed.has(a)&&ratio(target[assignment[a]],ground)<(counts[a]<total*.03?3:2))return;
   for(let b=a+1;b<source.length;b++){
    const boundary=edges.has(a+':'+b),same=assignment[a]===assignment[b];
    // Never collapse foreground/background, or independently colored roles when
    // a full distinct mapping exists. Near tonal siblings may share one ink.
    if(same&&(boundary||target.length>=source.length||dist(source[a],source[b])>65))return;
    if(boundary&&ratio(target[assignment[a]],target[assignment[b]])<Math.min(3,Math.max(1.3,ratio(source[a],source[b])*.65)))return;
   }
  }
  const cost=source.reduce((sum,c,i)=>sum+dist(c,target[assignment[i]])*Math.sqrt(counts[i]),0);
  if(cost<bestCost){bestCost=cost;best=assignment.slice();}
 }
 choose(0);if(!best)return decline('canonical-contrast-or-roles');
 const output=new Uint8ClampedArray(flat),used=new Set();let changedPixels=0;
 for(let p=0;p<labels.length;p++){if(labels[p]<0)continue;const i=p*4,color=target[best[labels[p]]];if(color.some((v,k)=>v!==data[i+k]))changedPixels++;output.set(color,i);used.add(hex(color));}
 return {applied:true,data:output,colors:[...used],changedPixels};
}
async function prepareRearCanonicalProposal(prepared,identity,current){
 const context=rearCanonicalPaletteContext();if(!context)return prepared;
 const decline=reason=>({...prepared,paletteProposalNote:rearCanonicalGap(reason),paletteProposalFailure:reason});
 if(!context.ok)return decline(context.reason);
 if(!/^[a-f0-9]{64}$/i.test(identity||''))return decline('unverified-source-identity');
 const source=prepared.data,width=prepared.width,height=prepared.height;
 const result=rearCanonicalPixels(source,width,height,context);if(!result.applied)return decline(result.reason);
 const make=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;},canvas=make(),cx=canvas.getContext('2d',{willReadFrequently:true}),pixels=cx.createImageData(width,height);pixels.data.set(result.data);cx.putImageData(pixels,0,0);
 const decoded=await loadImage(canvas.toDataURL('image/png'));if(!current())return prepared;
 cx.clearRect(0,0,width,height);cx.drawImage(decoded,0,0);const actual=cx.getImageData(0,0,width,height).data,seen=new Set(),samples=new Map();
 for(let i=0;i<actual.length;i+=4){if(actual[i+3]!==source[i+3])return decline('rendered-pixels-mismatch');if(!actual[i+3])continue;if(actual[i+3]===255){const color='#'+Array.from(actual.subarray(i,i+3),v=>v.toString(16).padStart(2,'0')).join('');if(color!=='#ffffff'&&!result.colors.includes(color))return decline('rendered-pixels-mismatch');if(color!=='#ffffff')seen.add(color);samples.set(color,(samples.get(color)||0)+1);}else for(let k=0;k<3;k++)if(Math.abs(actual[i+k]-result.data[i+k])>Math.ceil(255/actual[i+3])+1)return decline('rendered-pixels-mismatch');}
 if(seen.size!==result.colors.length)return decline('rendered-pixels-mismatch');
 const digest=async bytes=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 const sourcePixelSHA256=await digest(source),outputPixelSHA256=await digest(actual);if(!current())return prepared;
 if(rearCanonicalPaletteContext()?.binding!==context.binding)return decline('front-palette-changed');
 const metadata={method:'rear-canonical-flat-proposal-v1',sourceSHA256:identity,sourcePixelSHA256,outputPixelSHA256,width,height,actualProposedPalette:result.colors,proposedInkCount:result.colors.length,canonicalPalette:context.colors,frontDesignFingerprint:context.frontDesignFingerprint,frontPaletteBinding:context.binding,alphaUnchanged:true,whiteIsSubstrate:true,renderedPixelsVerified:true,sourceOriginalPreserved:true,customerApprovalRequired:true,physicalInkCountConfirmed:false,changedPixels:result.changedPixels};
 const next={...prepared,data:new Uint8ClampedArray(actual),canvas,canonicalSourceCanvas:prepared.canvas,flatPrintProposal:metadata,inkSamples:[...samples].map(([color,count])=>({rgb:[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),count})),paletteProposalNote:'Sponsor için ön yüz, yazılar ve zeminle ortak en fazla üç renkten oluşan bir fikir önerisi hazırlandı. Özgün görsel değişmedi. Küçük yazıları ve tüm marka ayrıntılarını karşılaştırıp onaylayın.'};
 next.contrastWarning=typeof RearLogo!=='undefined'?RearLogo.contrastWarning(next,state.bg):null;return next;
}
async function processRearSponsor(file,selection=null){
 if(selection&&selection.source!==rearSponsorSource)return;
 const operation=++rearSponsorOperation;
 rearSponsorSource={file,data:selection?.source.data||''};rearSponsorRegion=null;rearSponsorDiagnostics=[];rearSponsorImage=null;rearSponsorOriginalImage=null;rearSponsorRecolor='';rearSponsorReview=null;rearSponsorPrepared=null;rearSponsorWarning='';rearSponsorFailure='';rearContent.sponsorHash='';rearContent.sponsorName='';rearSponsorPending=true;syncRearFields();rearChanged();
 let stage='Dosya okuma';
 try{
  if(file.size>UploadFormat.MAX_BYTES)throw Error('Logo en fazla 8 MB olmalı.');
  const bytes=await file.arrayBuffer();if(operation!==rearSponsorOperation)return;
  const info=UploadFormat.inspect(new Uint8Array(bytes));
  if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(info.mime))throw Error('Sponsor logosunu PNG, JPG, WebP veya SVG olarak yükleyin.');
  let data;if(info.mime==='image/svg+xml')data=svgSafe(await file.text()).data;else data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Logo okunamadı.'));reader.readAsDataURL(file);});
  if(operation!==rearSponsorOperation)return;rearSponsorSource.data=data;syncRearSource();
  stage='Görseli açma';const image=await loadImage(data);if(operation!==rearSponsorOperation)return;
  rearSponsorSource.image=image;let input=image;
  if(selection){const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,b=selection.box;if(!rearRegionBox(b,w,h))throw Error('Seçilen alan geçerli değil veya 4 milyon piksel sınırını aşıyor.');input=document.createElement('canvas');input.width=b[2]-b[0];input.height=b[3]-b[1];input.getContext('2d').drawImage(image,b[0],b[1],input.width,input.height,0,0,input.width,input.height);rearSponsorRegion={source:rearSponsorSource,box:b.slice()};}
  let prepared;stage='Seçilen tam marka grubunu ayrıştırma';
  if(selection){prepared=await RearPhoto.prepareSelected(input,{background:state.bg});}
  else{stage='Düz logo ayrıştırma';
  try{prepared=await RearLogo.prepare(input,{background:state.bg});}
  catch(flatError){
   if(operation!==rearSponsorOperation)return;
   if(rearRegionError(flatError))throw flatError;
   rearSponsorDiagnostics.push({stage,message:sponsorErrorText(flatError)});stage='Fotoğrafta logo bölgesi arama';
   prepared=await RearPhoto.prepare(input,{background:state.bg});
  }}
  if(operation!==rearSponsorOperation)return;stage='Kaynak kimliğini doğrulama';
  const identity=await sourceIdentity(file,bytes);if(operation!==rearSponsorOperation)return;
  if(selection)prepared={...prepared,processing:{...prepared.processing,selectedRegion:selection.box.slice(),sourceDimensions:[image.naturalWidth||image.width,image.naturalHeight||image.height]}};
  stage='Ortak renkli sponsor önerisini doğrulama';prepared=await prepareRearCanonicalProposal(prepared,identity.sha256,()=>operation===rearSponsorOperation);if(operation!==rearSponsorOperation)return;
  rearSponsorRegion=null;rearSponsorPending=false;rearSponsorReview={operation,canvas:prepared.canvas,identity:identity.sha256,name:file.name,prepared};
  $('rearSponsorOriginal').src=data;$('rearSponsorExtracted').src=prepared.canvas.toDataURL('image/png');syncRearFields();rearChanged();
 }catch(error){
  if(operation!==rearSponsorOperation)return;
  rearSponsorPending=false;rearSponsorDiagnostics.push({stage,message:sponsorErrorText(error)});
  rearSponsorFailure='Bu denemede logo güvenle ayrıştırılamadı. Dosyanız aşağıda duruyor. Aynı görselle yeniden deneyebilir veya farklı bir görsel seçebilirsiniz.';
  if(rearRegionError(error)&&rearSponsorSource?.image){rearSponsorRegion={source:rearSponsorSource,box:selection?.box||null};rearSponsorFailure='Ekran öğeleri ile marka alanı karışabilir. Aşağıdaki özgün görselden tam marka alanını seçin.';}
  if(rearSponsorRegion)$('rearRegionMessage').textContent=rearRegionError(error)?rearSponsorFailure:sponsorErrorText(error);
  syncRearFields();rearChanged();$('rearEditorError').textContent=rearSponsorFailure;$('rearEditorError').hidden=false;rearPreviewReady=false;syncRearSkip();$('rearToPrice').disabled=true;
 }
}
$('rearSponsorUpload').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{await processRearSponsor(file);}finally{e.target.value='';}};
$('retryRearSponsor').onclick=()=>{if(rearSponsorPending||!rearSponsorSource)return;return processRearSponsor(rearSponsorSource.file);};
$('acceptRearSponsor').onclick=()=>{const proposal=rearSponsorReview;if(!proposal||proposal.operation!==rearSponsorOperation)return;const canonical=proposal.prepared.flatPrintProposal;if(canonical?.method==='rear-canonical-flat-proposal-v1'&&rearCanonicalPaletteContext()?.binding!==canonical.frontPaletteBinding){rearSponsorFailure=rearCanonicalGap('front-palette-changed');syncRearFields();rearChanged();return;}rearSponsorImage=proposal.canvas;rearSponsorOriginalImage=proposal.canvas;rearSponsorRecolor='';rearContent.sponsorHash=proposal.identity;rearContent.sponsorName=proposal.name;rearSponsorPrepared=proposal.prepared;rearSponsorFailure='';rearSponsorWarning=[proposal.prepared.paletteProposalNote,proposal.prepared.contrastWarning].filter(Boolean).join(' ');rearSponsorReview=null;syncRearFields();rearChanged();};
$('rejectRearSponsor').onclick=()=>$('removeRearSponsor').onclick();
$('backToFront').onclick=()=>go(1);
$('retryRearAsset').onclick=()=>showRearPreview();
$('rearToPrice').onclick=()=>{
 // Previewing newly typed text is not approval of an older rendered image.
 // A truly empty rear has no pixels to approve, including immediately after clearing text.
 if(rearInputPending){const active=document.activeElement;if(rearTextFieldIds.includes(active?.id))active.blur();if(!rearEmptyForSkip()){scheduleRearRefresh(0);return;}}
 if(rearValidationError()){ $('rearEditorError').textContent=rearValidationError();$('rearEditorError').hidden=false;globalThis.HijyenLabResponsiveJourney?.reveal('rearEditorError');return;}if(!rearQuoteReady()||(!rearEmptyForSkip()&&!rearPreviewReady)||rearPreviewFingerprint!==designFingerprint()||!processingSession.isApproved(designFingerprint())||designIssue()){go(1);status('Ön yüz değişti. Yeniden kontrol edip onaylayın.');return;}
 go(2);
};

$('skipEmptyRear').onclick=()=>{if(!rearEmptyForSkip())return;$('rearToPrice').onclick();};

// One response after a completed rear edit, never while entering text.
for(const id of rearTextFieldIds){
 const input=$(id);
 input.addEventListener?.('focus',()=>{globalThis.HijyenLabJourneyMotion?.cancelAll();clearTimeout(rearRenderTimer);if(!rearPreviewReady)rearPreviewGeneration++;});
 input.addEventListener?.('compositionstart',()=>{rearComposingFields.add(id);clearTimeout(rearRenderTimer);});
 input.addEventListener?.('compositionend',()=>{rearComposingFields.delete(id);input.oninput();});
 input.addEventListener?.('blur',()=>{
  // Let the next focus/input/composition event settle first. Switching directly
  // between rear fields must not block the next keyboard event with a redraw.
  if(rearInputPending||!rearPreviewReady)scheduleRearRefresh(0);
  else if(!rearPreview.hidden&&rearRenderedRevision===rearRevision)globalThis.HijyenLabJourneyMotion?.rear();
 });
}
