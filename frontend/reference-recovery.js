/* Failed-photo recovery is a separate, local, incomplete estimate. It never approves artwork. */
(function(root){'use strict';
function eligible(s){return !!s.sourcePhoto&&s.designBlocked===true&&!s.designProcessing&&!s.logo&&!s.photoLayout&&['unsupported','photo-region','screen'].includes(s.sourceKind);}
function partialPrice(input,deps){
 if(input.policy?.blocked)throw Error(input.policy.reason);
 const error=deps.leadError(input.lead);if(error)throw Error(error[1]);
 if(!deps.validFragrance(input.fragrance))throw Error('Lütfen bir koku seçin.');
 if(!['white','color'].includes(input.ground))throw Error('Lütfen zemin fiyat varsayımını seçin.');
 const value=deps.pricing(input.quantity,input.ground==='white'?'#ffffff':'#102f59',input.lead.province,input.lead.district,'new',null,input.rules);
 // Deliberately omit complete total, tax/deposit and zero-valued plate from this contract.
 return {status:'partial-excludes-plate',plateCount:null,plate:null,product:value.base+value.color,shipping:value.shipping,subtotal:value.subtotal,boxes:value.boxes,ruleRevision:value.ruleRevision};
}
const api={eligible,partialPrice};if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
root.ReferenceRecovery=api;
// A reference is a source display, never an extracted logo or a print approval.
const style=document.createElement('style');style.textContent='body.referenceRecoveryActive #uploadRecovery,body.referenceRecoveryActive #designError,body.referenceRecoveryActive .workspace{display:none}#referenceRecovery img{display:block;max-width:100%;max-height:440px;object-fit:contain;margin:12px auto}';document.head.append(style);
const box=document.createElement('section');box.id='referenceRecovery';box.className='notice light';box.hidden=true;
box.innerHTML='<h2>Görsel ürüne yerleştirilemedi.</h2><p>Özgün görseliniz korundu.</p><img id="recoverySource" alt="Özgün görsel; ürüne uygulanmadı"><button id="recoveryStart" type="button" class="outline full">Yalnız ön fiyatı gör</button><p class="hint">Tasarım onayı değildir. Klişe bilinmiyorsa fiyata dahil edilmez.</p>';
document.querySelector('.workspace').before(box);
let source=null,referenceSource=null,referenceIdentity=null,accepting=false;
function hide(){box.hidden=true;document.body.classList.remove('referenceRecoveryActive');}
function clear(){hide();source=null;referenceSource=null;referenceIdentity=null;accepting=false;$('recoverySource').removeAttribute('src');}
function current(){
 if(!isReferencePreview()||!referenceSource||state.sourcePhoto!==referenceSource||!photoImg||state.designProcessing||state.designBlocked)return false;
 const live=processingSession.getState(),record=state.processingResult;
 return live.status==='ready'&&!live.error&&live.result?.method==='source-reference'&&record?.method==='source-reference'&&live.source?.sha256===referenceIdentity&&record.source?.sha256===referenceIdentity&&live.result.source?.sha256===referenceIdentity&&record.operation?.operationId===live.operationId&&live.result.operation?.operationId===live.operationId&&record.extractionRevision===live.result.extractionRevision;
}
function syncSummaryTitle(){
 const designTitle=document.querySelector('#design>h1');if(designTitle)designTitle.textContent=isReferencePreview()||eligible(state)?'Yüklediğiniz görsel':'Size özel ambalaj';
 const title=document.querySelector('#summary>h1');if(title)title.textContent=isReferencePreview()?'Referansa dayalı ön fiyat · Tasarım oluşturulmadı':'Tasarım ve teklif önizlemesi';
}
function sync(){
 syncSummaryTitle();
 if(isReferencePreview()){
  hide();
  if(step===1&&current()){
   $('recoverySource').src=referenceSource;
   $('recoveryStart').disabled=false;
   box.hidden=false;
   document.body.classList.add('referenceRecoveryActive');
  }
  const label=$('inks').closest?.('label');if(label?.firstChild)label.firstChild.textContent='Baskı renk sayısı (beyaz hariç) · İsteğe bağlı';for(const option of $('inks').options||[])option.hidden=option.value!==''&&(!Number.isInteger(Number(option.value))||Number(option.value)<1||Number(option.value)>3);$('previewCaption').textContent=referencePreviewLabel();$('photoQuoteBgLabel').hidden=false;$('photoPriceNote').hidden=false;$('photoPriceNote').textContent=referenceGroundLabel()+' · Baskı renkleri ve klişe teknik incelemede.';
  $('simpleTools').hidden=true;$('simpleDetails').hidden=true;document.querySelector('.previewTip').textContent='Özgün kaynak gösterilir; logo veya zemin değiştirilmedi.';$('next').textContent='Koku seçimine geç →';
  for(const id of ['mini','finalImage'])$(id).alt=referencePreviewLabel();return;
 }
 $('next').textContent=isUnprinted()?'Fiyatı gör →':typeof isDeclaredQuote==='function'&&isDeclaredQuote()?'Koku seçimine geç →':'Onayla ve arka yüze geç →';const label=$('inks').closest?.('label');if(label?.firstChild)label.firstChild.textContent='Tahmini baskı rengi sayısı (isterseniz düzeltin)';for(const option of $('inks').options||[])option.hidden=false;
 if(!eligible(state)||isUnprinted()){hide();return;}
 if(source!==state.sourcePhoto){source=state.sourcePhoto;$('recoverySource').src=source;}
 box.hidden=false;document.body.classList.add('referenceRecoveryActive');$('recoveryStart').disabled=accepting||!!state.productAssetPending||!!state.productAssetFailure;
}
async function accept(openPricing=true){
 if(accepting||!eligible(state)||isUnprinted()||state.productAssetPending||state.productAssetFailure)return false;
 const data=state.sourcePhoto,old=processingSession.getState(),ticket=loading;
 if(!/^[a-f0-9]{64}$/i.test(old.source?.sha256||''))return false;
 accepting=true;sync();
 try{
  const img=await loadImage(data);
  if(ticket!==loading||data!==state.sourcePhoto||processingSession.getState().operationId!==old.operationId||!eligible(state))return false;
  const previous=state.processingResult?.source?.sha256===old.source.sha256?state.processingResult:old.result,knownOriginal=previous?.referenceKnownActualInkCount??previous?.flatPrintProposal?.originalKnownActualInkCount;
  const token=processingSession.begin(old.source),frame={width:img.width,height:img.height,coordinateFrame:old.frame?.coordinateFrame||'browser-decoded'},bounds=[0,0,img.width,img.height];
  processingSession.decoded(token,frame);
  const record=processingSession.commit(token,{method:'source-reference',methodVersion:'v68',referenceKnownActualInkCount:Number.isInteger(knownOriginal)?knownOriginal:null,box:bounds,sourceCoordinates:frame.coordinateFrame,coordinateStatus:'recorded',candidates:[],preservedRegions:[{box:bounds,reason:'Entire source shown as reference; not applied artwork.'}],excludedRegions:[],maskBasis:'No masking or logo extraction.',transformOrder:['browser-decode','aspect-safe-reference-display'],limitations:['Reference only; selected product may differ.','No semantic logo extraction or confirmed printing inks.']});
  if(!record)return false;
  referenceSource=data;referenceIdentity=old.source.sha256;photoImg=img;state.quoteSource='source-reference';state.referenceInkDeclaration=null;state.processingResult=record;state.designBlocked=false;state.screenSelectionRequired=false;state.extractionSourceLimited=false;state.extractionApproximate=false;state.extractionApprovalRequired=false;state.bgDecisionPending=false;state.photoQuoteBg='unknown';state.bgPantone='';state.text='';state.textPending=false;state.inkSelection={status:'unknown',selectedCount:null,estimatedCount:null};
  $('inks').value='';printInkKey=null;latest=null;invalidateQuote();syncProcessingDesign();
  root.FlexoDesignUI?.bindReferenceDiagnostic(old.operationId,record);
  if(!openPricing){
   refresh();
   status('Özgün görsel gösteriliyor. Baskı renkleri ve klişe teknik incelemede.');
   return true;
  }
  refresh();return continuePrice();
 }catch(error){if(ticket===loading&&data===state.sourcePhoto)status(error.message||'Referans açılamadı. Görseli yeniden seçin.');return false;}finally{if(ticket===loading){accepting=false;sync();}}
}
function continuePrice(){if(!current()){showDesignIssue();return false;}if(typeof printPolicyError==='function'&&printPolicyError()){status(printPolicyError());return false;}const advanced=showFragrance();sync();return advanced;}
$('recoveryStart').onclick=()=>current()?continuePrice():accept();
api.showSourcePreview=()=>accept(false);
const beforeGo=go;go=function(){const result=beforeGo.apply(this,arguments);sync();return result;};
api.continuePrice=continuePrice;api.sync=sync;api.clear=clear;api.current=current;api.accept=accept;sync();
})(typeof globalThis!=='undefined'?globalThis:this);
