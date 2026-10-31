/* Candidate review is separate from committed design. No personal/text classification is claimed. */
let pendingWhiteCarrier=null;
const whiteCarrierPanel=document.createElement('section');whiteCarrierPanel.id='whiteCarrierPanel';whiteCarrierPanel.hidden=true;
whiteCarrierPanel.innerHTML='<h1>Kullanılacak logo bu mu?</h1><p class="subtitle">Fotoğraftan önerilen alanı orijinaliyle karşılaştırın.</p><div class="brandRegionCompare"><div><h2>Yüklediğiniz fotoğraf</h2><img id="whiteCarrierOriginal" alt="Yüklenen kaynak fotoğraf"></div><div><h2>Önerilen logo</h2><img id="whiteCarrierProposed" alt="Beyaz zeminde marka alanı önerisi"></div></div><p class="notice light">Yalnız marka ve gerekli yazılar kalmalı. İsim, telefon, ilgisiz yazı veya istemediğiniz başka bir marka varsa bu öneriyi kullanmayın. Tüm harfleri, simgeleri ve yönünü kontrol edin. Bu yöntem beyaz ambalaj önizlemesi içindir; baskı dosyası değildir.</p><button id="acceptWhiteCarrier" class="primary full">Evet, bu logoyu ambalajda göster</button><button id="rejectWhiteCarrier" class="back">Bu alan doğru değil · başka görsel yükle</button>';
$('design').before(whiteCarrierPanel);
function clearWhiteCarrierProposal(){pendingWhiteCarrier=null;whiteCarrierPanel.hidden=true;}
function showWhiteCarrierProposal(extracted,sourceData){
 const token=processingContext?.token;if(!token||!processingSession.isCurrent(token))return;
 const proposal={extracted,sourceData,token,previewReady:false,originalReady:false};pendingWhiteCarrier=proposal;
 // Never put this unconfirmed candidate or the raw packaging onto the mockup.
 state.logo=null;state.photoLayout=null;state.processingResult=null;state.removed=true;state.sourcePhoto=sourceData;state.sourceKind='candidate';state.designBlocked=false;state.extractionApproximate=false;state.extractionApprovalRequired=true;state.whiteCarrierWhiteOnly=false;logoImg=null;photoImg=null;
 invalidateQuote();refresh();['design','pricing','summary','photoEditor','pdfPicker'].forEach(id=>$(id).hidden=true);whiteCarrierPanel.hidden=false;
 const original=$('whiteCarrierOriginal'),preview=$('whiteCarrierProposed'),accept=$('acceptWhiteCarrier');accept.disabled=true;original.removeAttribute('src');preview.removeAttribute('src');const current=()=>pendingWhiteCarrier===proposal&&processingSession.isCurrent(token);const enable=()=>{if(current())accept.disabled=!(proposal.previewReady&&proposal.originalReady);};const fail=()=>{if(current()){proposal.previewReady=false;proposal.originalReady=false;accept.disabled=true;status('Logo önerisi açılamadı; başka bir görsel yükleyin.');}};original.onload=()=>{if(current()&&original.naturalWidth>0){proposal.originalReady=true;enable();}};original.onerror=fail;original.src=sourceData;const reader=new FileReader();reader.onload=()=>{if(!current())return;preview.onload=()=>{if(current()&&preview.naturalWidth>0){proposal.previewReady=true;enable();}};preview.onerror=fail;preview.src=reader.result;};reader.onerror=fail;reader.readAsDataURL(extracted.file);status('Logo alanı önerildi; görüntüler açıldıktan sonra karşılaştırın. Henüz ambalaja uygulanmadı.');
}
function automaticWhiteCarrierEligible(extracted){
 const p=extracted?.processing,o=p?.orientation;
 return !!(extracted?.whiteCarrier&&!extracted.sourceLimited&&!extracted.needsRegionSelection&&p?.carrierDomainEvidence?.basis==='independent-bounded-neutral-substrate'&&p.sourceCompleteness?.applicable===true&&p.sourceCompleteness.complete===true&&p.retention?.basis==='independent-uneroded-carrier-support'&&p.retention.passed===true&&p.rowRefinement?.basis==='independent-header-subtitle-component-regions'&&p.rowRefinement.passed===true&&p.rowRefinement.sourceRGBUnchanged===true&&o?.method==='chromatic-header-neutral-subtitle-layout'&&o.chromaticGlyphs>=4&&o.subtitleGlyphs>=4&&p.orientationAmbiguous180===false);
}
async function commitWhiteCarrier(proposal,automatic=false){
 const token=proposal?.token,sourceSHA=processingSession.getState?.().source?.sha256||null;
 const current=()=>processingContext?.token===token&&processingSession.isCurrent(token)&&(processingSession.getState?.().source?.sha256||null)===sourceSHA;
 if(!proposal||!current()||automatic&&(!sourceSHA||!automaticWhiteCarrierEligible(proposal.extracted)))return false;
 // White-carrier alpha has no proof for a colored substrate. Never overwrite an explicit customer choice.
 if(state.bgSource==='manual'&&(state.bg?.toLowerCase()!=='#ffffff'||state.bgPantone))return false;
 if(!automatic&&(!proposal.previewReady||!proposal.originalReady||pendingWhiteCarrier!==proposal))return false;
 const manualWhite=state.bgSource==='manual';
 state.logo=null;logoImg=null;state.designBlocked=true;state.extractionApprovalRequired=true;invalidateQuote();
 const expected=loading+1;await logoFileHandler({target:{files:[proposal.extracted.file],value:''}});
 if(!current()||loading!==expected||!automatic&&pendingWhiteCarrier!==proposal)return false;
 if(!state.logo||state.designBlocked){if(automatic){blockScreenshotSelection(proposal.sourceData);state.sourceKind='photo-region';globalThis.ReferenceRecovery?.sync();}return false;}
 const result=proposal.extracted.processing;
 stageProcessingResult(result.method,result.methodVersion,result.box,{maskBasis:result.maskBasis,transforms:result.transformOrder,limitations:result.limitations,extra:{...result,status:'ready',automaticPreviewApplied:automatic}});
 state.whiteCarrierWhiteOnly=true;state.sourcePhoto=proposal.sourceData;state.sourceKind='white-carrier-proposal';state.bg='#ffffff';state.bgPantone='';state.bgSource=manualWhite?'manual':'white-carrier-estimate';state.bgDecisionPending=false;state.bgDetection={kind:'transparent',color:'#ffffff',rgb:[255,255,255]};state.removeWhite=false;state.extractionApproximate=true;state.extractionApprovalRequired=true;state.logoName='Fotoğraftan ayrılan marka önizlemesi';
 finalizeProcessingResult();clearWhiteCarrierProposal();refresh();go(1);status('Marka ambalaja yerleştirildi. Harfleri ve yönünü kontrol edip tasarımı onaylayın.');return true;
}
async function applyAutomaticWhiteCarrier(extracted,sourceData){
 if(!automaticWhiteCarrierEligible(extracted))return false;
 return commitWhiteCarrier({extracted,sourceData,token:processingContext?.token},true);
}
$('acceptWhiteCarrier').onclick=async()=>{
 const proposal=pendingWhiteCarrier;if(!proposal)return;$('acceptWhiteCarrier').disabled=true;
 const applied=await commitWhiteCarrier(proposal);if(!applied&&pendingWhiteCarrier===proposal)$('acceptWhiteCarrier').disabled=false;
};
$('rejectWhiteCarrier').onclick=()=>{clearWhiteCarrierProposal();resetDesign();go(1);status('Başka bir logo veya daha uygun fotoğraf yükleyebilirsiniz.');};
