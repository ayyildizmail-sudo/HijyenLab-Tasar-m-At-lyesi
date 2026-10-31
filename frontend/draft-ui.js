/* Opt-in, device-only design drafts. Replays validated sources, never persisted approval/quote. */
(function(root){
'use strict';
const DESIGN_KEYS=['bg','color','textColor','text','font','textSize','tx','ty','x','y','size','rotation','recolorApplied','bgPantone','textPantone','requestedQuantity'];
let resumeIntent=null,rearToneIntent='',incomingFrontFile=null;
const REAR_KEYS=['instagram','website','phone','address','extra','inkColor','qrEnabled','qrUrl'];
function pick(value,keys){return Object.fromEntries(keys.map(key=>[key,value[key]]));}
function printMode(){return root.HijyenLabPrintMode?.get()||'printed';}
function field(id){return typeof document==='undefined'?'':document.getElementById(id)?.value||'';}
function stageSnapshot(){if(typeof resumeIntent!=='undefined'&&resumeIntent)return resumeIntent;if(typeof document!=='undefined'&&document.getElementById('uploadStart')?.hidden===false)return 'start';return ({1:'design',2:'pricing',3:'summary',5:'fragrance'})[typeof step==='number'?step:1]||'design';}
function snapshot(){
 const blank=printMode()==='unprinted',declared=typeof isDeclaredQuote==='function'&&isDeclaredQuote();
 const front=!blank&&!declared&&(!state.removed||state.photoLayout||state.designProcessing||(state.designBlocked&&state.sourcePhoto))?(state.designProcessing&&incomingFrontFile?incomingFrontFile:lastUploadedFile):null,rear=!blank&&!declared?rearSponsorSource?.file||null:null;
 const quantity=Number.isSafeInteger(state.requestedQuantity)&&state.requestedQuantity>=0&&state.requestedQuantity<=1000000?state.requestedQuantity:null;
 return {schemaVersion:4,printMode:blank?'unprinted':'printed',productId:root.selectedProductId||'BM12',design:blank?{requestedQuantity:quantity}:{...pick(state,DESIGN_KEYS),requestedQuantity:quantity},rear:blank?null:pick(rearContent,REAR_KEYS),fragrance:fragranceSnapshot()?.id||'',frontFile:front||null,frontName:front?.name||'',rearFile:rear,rearName:rear?.name||'',frontExtras:!blank&&!declared&&root.MultiLogo?MultiLogo.snapshot('front'):[],rearExtras:!blank&&!declared&&root.MultiLogo?MultiLogo.snapshot('rear'):[],resume:{lead:{customer:field('customerName'),contact:field('contactName'),phone:field('contactPhone'),province:field('province'),district:field('district')},cliche:field('cliche')||'new',stage:stageSnapshot(),quoteSource:declared?'customer-declared':'uploaded-artwork',declaration:declared?{...state.declaration}:null,fragranceConfirmed:typeof fragranceConfirmed==='string'&&!!fragranceConfirmed&&fragranceConfirmed===fragranceSnapshot()?.id,quantityInput:field('qty'),cartonInput:field('cartonQty'),rearTone:!blank&&typeof rearSponsorRecolor==='string'?rearSponsorRecolor||rearToneIntent:''}};
}
const fileIds=new WeakMap();let fileSequence=0;function fileKey(file,name){if(!file)return null;if(!fileIds.has(file))fileIds.set(file,++fileSequence);return[name,file.size,file.lastModified||0,fileIds.get(file)];}
function keyOf(p){return JSON.stringify({...p,frontFile:fileKey(p.frontFile,p.frontName),rearFile:fileKey(p.rearFile,p.rearName),...(p.schemaVersion>=3?{frontExtras:p.frontExtras.map(a=>({...a,file:fileKey(a.file,a.name)})),rearExtras:p.rearExtras.map(a=>({...a,file:fileKey(a.file,a.name)}))}:{})});}
const api={snapshot,keyOf,DESIGN_KEYS,REAR_KEYS};root.HijyenLabDraftUI=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document==='undefined'||!root.LocalDesignDraft)return;
const store=root.LocalDesignDraft.createStore();
const panel=document.createElement('section');panel.className='draftPanel';panel.id='draftPanel';panel.innerHTML='<label class="draftConsent"><input type="checkbox" id="draftConsent"> Bu cihazda taslağımı sakla</label><p class="hint">Seçimler, görseller, iletişim ve teklif için yazdığınız bilgiler · yalnız bu cihaz ve tarayıcıda, 7 gün.</p><details><summary>Saklama bilgisi</summary><p class="hint">İşletme adı, yetkili kişi, telefon, il/ilçe, adet, klişe, koku, ürün/baskı seçimi, renk beyanı ve tasarım kaynakları bu tarayıcıda saklanır; taslak dışarı gönderilmez. Ortak cihazda açmayın. Taslağı sil ile saklamayı kapatabilirsiniz. Son başarılı kayıttan itibaren 7 gün sonra taslak sonraki açılışta silinir. Ani kapanmada yalnız son başarılı kayıt döner. Başka cihazda açılmaz; tarayıcı verileri silinirse veya özel gezinme kapanırsa kaybolabilir. Eski teklif tutarı, JPG ve görsel onayları saklanmaz.</p></details><p id="draftStatus" role="status" class="hint"></p><div class="draftActions"><button type="button" id="restoreDraft" class="outline" hidden>Taslağı yeniden aç ve kontrol et</button><button type="button" id="replaceDraft" class="outline" hidden>Bu çalışmayı taslak olarak sakla</button><button type="button" id="deleteDraft" class="textButton" hidden>Taslağı sil</button></div>';
const anchor=document.querySelector('.productPicker')||$('uploadStart');anchor.before(panel);
const CONSENT_KEY='hijyenlab-design-draft-optin-v2',LEGACY_KEY='hijyenlab-design-draft-optin-v1';
let enabled=false,offer=null,restoring=false,generation=0,timer=null,lastKey='',saving=false,dirty=false,initializing=true,firstDirtyAt=0,initialInteraction=false,loadFailed=false;
function say(message){if($('draftStatus').textContent!==message)$('draftStatus').textContent=message;}
function consent(value){enabled=value;$('draftConsent').checked=value;try{if(value)localStorage.setItem(CONSENT_KEY,'yes');else [CONSENT_KEY,LEGACY_KEY].forEach(key=>localStorage.removeItem(key));}catch{/* Current-session consent still works; storage unavailable is reported by save. */}}
function schedule(){if(!enabled||restoring||offer||initializing||loadFailed)return;try{if(keyOf(snapshot())===lastKey)return;}catch{}dirty=true;if(!firstDirtyAt)firstDirtyAt=Date.now();clearTimeout(timer);say('Değişiklikler henüz kaydedilmedi…');timer=setTimeout(save,Math.max(0,Math.min(650,2000-(Date.now()-firstDirtyAt))));}
async function save(){
 clearTimeout(timer);if(!enabled||restoring||offer||initializing||loadFailed)return;if(saving){dirty=true;return;}
 let payload,key;try{payload=snapshot();key=keyOf(payload);}catch{say('Taslak hazırlanamadı; son değişiklikler kaydedilmedi.');return;}
 if(key===lastKey){dirty=false;firstDirtyAt=0;return;}const ticket=generation;saving=true;dirty=false;firstDirtyAt=0;say('Taslak bu cihazda kaydediliyor…');
 try{await store.save(payload);if(ticket!==generation||!enabled)return;lastKey=key;$('deleteDraft').hidden=false;
 // Commit belongs to this snapshot only. Newer input must never be labelled saved.
 if(keyOf(snapshot())===key){say('Son kaydedilen taslak bu cihazda hazır. Ani kapanmada bu noktadan devam edilir.');}else{dirty=true;say('Yeni değişiklikler henüz kaydedilmedi…');}
 }catch(error){if(ticket!==generation)return;say(error.code==='QUOTA'?'Cihazda yer kalmadı; son değişiklikler kaydedilemedi.':'Taslak bu cihazda kaydedilemedi. Açık sayfadaki çalışmanız duruyor; sayfayı kapatırsanız korunmayabilir.');}
 finally{saving=false;if(dirty&&enabled&&!restoring&&!offer)save();}
}
async function remove(){if(restoring)cancelRestore();generation++;clearTimeout(timer);dirty=false;firstDirtyAt=0;loadFailed=false;offer=null;resumeIntent=null;rearToneIntent='';consent(false);$('restoreDraft').hidden=true;$('replaceDraft').hidden=true;try{await store.clear();lastKey='';$('deleteDraft').hidden=true;say('Cihazdaki taslak silindi. Açık tasarımınız değişmedi.');}catch{say('Cihazdaki taslağın silindiği doğrulanamadı. Yeniden silmeyi deneyin.');$('deleteDraft').hidden=false;}}
function cancelRestore(){if(!restoring)return;generation++;restoring=false;cancelCurrentProcessing('draft-interrupted');rearSponsorOperation++;rearSponsorPending=false;if(root.MultiLogo)MultiLogo.cancelPending();state.extractionApprovalRequired=!!(state.logo||state.photoLayout);approvedDesignFingerprint=null;invalidateQuote();$('restoreDraft').disabled=false;say('Geri yükleme durduruldu. Mevcut tasarımı kontrol edin.');}
function setSavedSelect(id,value){const select=$(id);select.value=value;if(select.value!==value){const option=document.createElement('option');option.value=value;option.textContent=value+' (yeniden kontrol edin)';option.disabled=true;select.append(option);select.value=value;}}
function showLocalFragrance(){
 if(designIssue())return;
 if(typeof rearQuoteReady==='function'&&!rearQuoteReady())return;
 for(const id of ['design','pricing','summary','photoEditor','pdfPicker','whiteCarrierPanel','uploadStart','simpleTools','simpleDetails'])if($(id))$(id).hidden=true;
 if(typeof hideRearPreview==='function')hideRearPreview();$('fragrancePanel').hidden=false;step=5;syncFragrance();
}
function restoreLeadInputs(resume){if(!resume)return;const lead=resume.lead;for(const [id,key] of [['customerName','customer'],['contactName','contact'],['contactPhone','phone']])$(id).value=lead[key];setSavedSelect('province',lead.province);setDistrict();setSavedSelect('district',lead.district);$('cliche').value=resume.cliche;$('qty').value=resume.quantityInput;if($('cartonQty'))$('cartonQty').value=resume.cartonInput;}
async function restore(){if(!offer||restoring)return;const payload=offer,ticket=++generation;restoring=true;$('restoreDraft').disabled=true;say('Kaynak görseller yeniden kontrol ediliyor…');try{
 restoreLeadInputs(payload.resume);
 const mode=payload.printMode||'printed';if(mode==='unprinted'&&!root.HijyenLabPrintMode)throw Error('Baskısız ürün akışı kullanılamıyor.');if(root.HijyenLabPrintMode)await root.HijyenLabPrintMode.set(mode);if(ticket!==generation)return;
 resetDesign();lastUploadedFile=null;await selectProduct(payload.productId);if(ticket!==generation)return;
 if(payload.resume?.quoteSource==='customer-declared'){state.quoteSource='customer-declared';state.declaration={...payload.resume.declaration};}
 if(payload.resume){
  restoreLeadInputs(payload.resume);
  // Contact values are restored as plain input values, never markup or implicit submission.
  resumeIntent=payload.resume.stage;rearToneIntent=payload.resume.rearTone;
 }
 if(mode==='printed'&&payload.frontFile)await routeUploadedFile(new File([payload.frontFile],payload.frontName,{type:payload.frontFile.type}));if(ticket!==generation)return;
 // Only validated original inputs above establish the artwork. Saved settings confer no approval.
 Object.assign(state,payload.design);state.textPending=!!state.text;state.textPlaced=false;state.productReviewRequired=!!(state.logo||state.photoLayout);state.extractionApprovalRequired=!!(state.logo||state.photoLayout);approvedDesignFingerprint=null;
 if(mode==='printed'){Object.assign(rearContent,payload.rear);syncRearFields();rearChanged();}
 if(mode==='printed'&&payload.rearFile)await processRearSponsor(new File([payload.rearFile],payload.rearName,{type:payload.rearFile.type}));if(ticket!==generation)return;
 if(payload.schemaVersion>=3&&(payload.frontExtras.length||payload.rearExtras.length)){if(!root.MultiLogo)throw Error('Çoklu logo taslağı açılamıyor.');for(const side of ['front','rear'])for(const asset of payload[side+'Extras']){if(ticket!==generation)return;const restored=await MultiLogo.add(side,new File([asset.file],asset.name,{type:asset.file.type}),{id:asset.id,opticalScale:asset.opticalScale,restore:true});if(ticket!==generation)return;if(!restored)throw Error('Ek logo geri yüklenemedi.');}}
 resetFragrance();if(Fragrance.validId(payload.fragrance)){fragranceChoice=payload.fragrance;fragranceConfirmed=payload.resume?.fragranceConfirmed?payload.fragrance:'';syncFragrance();}

 latest=null;invalidateQuote();containLogoPlacement();syncProductReview();refresh();
 // All original sources use current processing. No previous artwork approval is trusted.
 if($('photoEditor').hidden&&$('pdfPicker').hidden)go(1);
 if(payload.resume){
  const target=payload.resume.stage,safe=mode==='unprinted'||payload.resume.quoteSource==='customer-declared';
  if(safe&&typeof designIssue==='function'&&!designIssue()){
   if(target==='fragrance'&&mode!=='unprinted')showLocalFragrance();
   else if(['pricing','summary'].includes(target)){
    if(mode==='unprinted'||fragranceReady()){go(2);}
    else showLocalFragrance();
   }
  }else if(target==='start'&&!payload.frontFile&&typeof showUploadStart==='function')showUploadStart();
  // Keep interrupted raw quantity entry rather than pretending it was a valid quote.
  if(payload.resume.quantityInput!==$('qty').value){$('qty').value=payload.resume.quantityInput;latest=null;invalidateQuote();$('breakdown').textContent='Kaydettiğiniz adet tamamlanmamış veya güncel ürün koşullarıyla farklı. Adedi kontrol ederek yeniden hesaplayın.';$('boxes').textContent='';if($('deliveryNote'))$('deliveryNote').textContent='';}
  if($('cartonQty'))$('cartonQty').value=payload.resume.cartonInput;
  if(target==='summary'&&safe&&typeof step==='number'&&step===2&&latest&&validateLead(false))go(3);
 }
 offer=null;$('restoreDraft').hidden=true;$('replaceDraft').hidden=true;lastKey=keyOf(snapshot());
 say('Taslağınıza kaldığınız yerden devam edebilirsiniz. '+(mode==='unprinted'?'Baskısız ürün ve teklif bilgileriniz geri yüklendi.':payload.frontFile||payload.rearFile?'Bilgileriniz korundu; kaynak görselleri ve yerleşimi yeniden kontrol edin.':'Seçimleriniz ve teklif bilgileriniz geri yüklendi.')+' Teklif güncel kurallarla yeniden hesaplanır.'+(!enabled?' İletişim bilgileri dahil yeni değişiklikleri saklamak için yukarıdaki seçimi açın.':''));

 }catch{if(ticket===generation)say('Taslağın tamamı geri yüklenemedi. Kaynakları yeniden seçebilir veya tekrar deneyebilirsiniz. Eski teklif/onay kullanılmadı.');}
 finally{if(ticket===generation){restoring=false;$('restoreDraft').disabled=false;}}
}
if($('acceptRearSponsor')){const accept=$('acceptRearSponsor').onclick;$('acceptRearSponsor').onclick=function(...args){const result=accept?.apply(this,args);if(rearToneIntent&&rearSponsorPrepared&&RearContrast.singleInk(rearSponsorPrepared.inkSamples)){rearSponsorImage=coloredRearLogo(rearToneIntent);rearSponsorRecolor=rearToneIntent;rearToneIntent='';syncRearFields();rearChanged();}return result;};}
$('draftConsent').onchange=()=>{if($('draftConsent').checked){consent(true);schedule();}else remove();};$('deleteDraft').onclick=remove;$('restoreDraft').onclick=restore;$('replaceDraft').onclick=()=>{if(restoring)return;loadFailed=false;offer=null;$('restoreDraft').hidden=true;$('replaceDraft').hidden=true;lastKey='';consent(true);save();};
document.addEventListener('change',e=>{if(e.target.id==='unifiedUpload')incomingFrontFile=e.target.files?.[0]||null;},true);
for(const event of ['input','change','pointerup','click'])document.addEventListener(event,e=>{if(panel.contains(e.target))return;if(initializing&&e.isTrusted)initialInteraction=true;if(restoring&&e.isTrusted)cancelRestore();if(e.isTrusted&&e.type==='click')resumeIntent=null;schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});root.addEventListener('pagehide',save);
root.addEventListener('storage',e=>{if((e.key===null||[CONSENT_KEY,LEGACY_KEY].includes(e.key))&&e.newValue!=='yes'){remove();}});
// Catch completed asynchronous extraction and non-input edits; unchanged snapshots never rewrite storage.
setInterval(()=>{if(enabled&&!restoring&&!offer&&!initializing)save();},2000);
(async()=>{const initGeneration=generation;let legacyConsent=false;try{enabled=localStorage.getItem(CONSENT_KEY)==='yes';legacyConsent=localStorage.getItem(LEGACY_KEY)==='yes';}catch{}$('draftConsent').checked=enabled;
 try{const loaded=await store.load();if(initGeneration!==generation)return;offer=loaded;
  if(offer){$('restoreDraft').hidden=false;$('replaceDraft').hidden=false;$('deleteDraft').hidden=false;if((enabled||legacyConsent)&&!initialInteraction){await restore();}else say('Bu cihazda bir taslak var. Açmak için Taslağı yeniden aç seçeneğini kullanın. Yeni bilgiler izniniz olmadan kaydedilmez.');}
  else say(enabled?'Taslak saklama açık. Değişiklikler yalnız bu cihazda kaydedilir.':'Taslak saklama kapalı. Sayfadan ayrılırsanız yeni bilgiler korunmaz.');
 }catch{if(initGeneration!==generation)return;loadFailed=true;say('Bu tarayıcıdaki taslak okunamadı. Önceki kayıt değiştirilmedi. Yenisiyle değiştirmeyi veya silmeyi seçebilirsiniz.');$('deleteDraft').hidden=false;$('replaceDraft').hidden=false;}
 finally{initializing=false;}})();

api.save=save;api.restore=restore;api.remove=remove;
})(globalThis);
