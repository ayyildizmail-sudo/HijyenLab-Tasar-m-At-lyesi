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
// Derived PNGs retain their source candidate without replacing the original upload.
const whiteCarrierFlatSources=new WeakMap();
function verifyFlatProposalRoundtrip(expected,actual){
 if(expected.length!==actual.length)return false;
 for(let i=0;i<expected.length;i+=4){const a=expected[i+3];if(a!==actual[i+3])return false;if(!a)continue;const white=expected[i]===255&&expected[i+1]===255&&expected[i+2]===255,tolerance=a===255||white?0:Math.ceil(255/a);for(let k=0;k<3;k++)if(Math.abs(expected[i+k]-actual[i+k])>tolerance)return false;}return true;
}
// Local QA readout only: reason codes, never source pixels, names or arbitrary errors.
let flatProposalDiagnosticURL=null;
function flatProposalDiagnostic(code,artifacts=null){
 if(!['localhost','127.0.0.1','[::1]'].includes(globalThis.location?.hostname))return;
 let node=document.getElementById('flatProposalDiagnostic');if(!node){node=document.createElement('p');node.id='flatProposalDiagnostic';node.setAttribute('role','status');$('design').append(node);}node.textContent='Yerel test · flat-proposal: '+code;if(flatProposalDiagnosticURL){URL.revokeObjectURL(flatProposalDiagnosticURL);flatProposalDiagnosticURL=null;}if(artifacts){const png=document.createElement('a');png.textContent=' Tanı PNG indir';png.download='flat-proposal-input.png';png.href=artifacts.dataURL;node.append(png);const audit=document.createElement('a');audit.textContent=' Tanı verisini indir';audit.download='flat-proposal-audit.json';flatProposalDiagnosticURL=URL.createObjectURL(new Blob([JSON.stringify(artifacts.audit)],{type:'application/json'}));audit.href=flatProposalDiagnosticURL;node.append(audit);}
}
async function prepareWhiteCarrierFlatProposal(extracted,sourceSHA,current){
 if(!globalThis.PhotoFlatProposal?.propose){flatProposalDiagnostic('module-missing');return extracted;}
 let diagnosticStep='read-source';flatProposalDiagnostic(diagnosticStep);
 const read=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Önizleme okunamadı.'));r.readAsDataURL(file);});
 try{
  const dataURL=await read(extracted.file);if(!current())return null;
  diagnosticStep='decode-source';const img=await loadImage(dataURL);if(!current())return null;
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
  const cx=canvas.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);const pixels=cx.getImageData(0,0,canvas.width,canvas.height);
  diagnosticStep='propose';const flat=await PhotoFlatProposal.propose(pixels.data,canvas.width,canvas.height,{rowRefinement:extracted.processing.rowRefinement,knownActualInkCount:extracted.processing.originalKnownActualInkCount,sourceSHA256:sourceSHA});if(!current())return null;if(!flat.applied){flatProposalDiagnostic('declined:'+String(flat.reason||'unknown').replace(/[^a-z0-9-]/gi,'').slice(0,80),(['localhost','127.0.0.1','[::1]'].includes(globalThis.location?.hostname)?{dataURL,audit:{width:canvas.width,height:canvas.height,sourceSHA256:sourceSHA,rowRefinement:extracted.processing.rowRefinement,knownActualInkCount:extracted.processing.originalKnownActualInkCount,rgba:Array.from(pixels.data)}}:null));return extracted;}
  diagnosticStep='write-proposal';cx.putImageData(new ImageData(flat.data,canvas.width,canvas.height),0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!current())return null;if(!blob){flatProposalDiagnostic('encode-empty');return extracted;}
  const file=new File([blob],'marka-duz-renk-onizleme.png',{type:'image/png'}),encoded=await read(file);if(!current())return null;
  diagnosticStep='decode-proposal';const decoded=await loadImage(encoded);if(!current())return null;if((decoded.naturalWidth||decoded.width)!==canvas.width||(decoded.naturalHeight||decoded.height)!==canvas.height){flatProposalDiagnostic('decoded-size-mismatch');return extracted;}cx.clearRect(0,0,canvas.width,canvas.height);cx.drawImage(decoded,0,0);
  const actual=cx.getImageData(0,0,canvas.width,canvas.height).data;
  diagnosticStep='digest-rendered';const digest=await crypto.subtle.digest('SHA-256',actual);if(!current())return null;
  const actualHash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(flat.metadata.sourceSHA256!==sourceSHA){flatProposalDiagnostic('source-hash-mismatch');return extracted;}if(!verifyFlatProposalRoundtrip(flat.data,actual)){flatProposalDiagnostic('roundtrip-mismatch');return extracted;}flatProposalDiagnostic('applied:'+flat.metadata.proposedInkCount);
  whiteCarrierFlatSources.set(file,{file:extracted.file,dataURL,sourceSHA256:sourceSHA});
  return {...extracted,file,processing:{...extracted.processing,flatPrintProposal:Object.freeze({...flat.metadata,proposalPixelSHA256:flat.metadata.outputPixelSHA256,outputPixelSHA256:actualHash,renderedPixelsVerified:true}),transformOrder:[...extracted.processing.transformOrder,'bounded audited flat-color idea proposal; source retained; PNG pixels verified']}};
 }catch(error){if(!current())return null;flatProposalDiagnostic('exception:'+diagnosticStep);return extracted;}
}
async function commitWhiteCarrier(proposal,automatic=false){
 const token=proposal?.token,sourceSHA=processingSession.getState?.().source?.sha256||null;
 const current=()=>processingContext?.token===token&&processingSession.isCurrent(token)&&(processingSession.getState?.().source?.sha256||null)===sourceSHA;
 if(!proposal||!current()||automatic&&(!sourceSHA||!automaticWhiteCarrierEligible(proposal.extracted)))return false;
 // White-carrier alpha has no proof for a colored substrate. Never overwrite an explicit customer choice.
 if(state.bgSource==='manual'&&(state.bg?.toLowerCase()!=='#ffffff'||state.bgPantone))return false;
 if(!automatic&&(!proposal.previewReady||!proposal.originalReady||pendingWhiteCarrier!==proposal))return false;
 const manualWhite=state.bgSource==='manual',beforePreparation=loading;
 const prepared=automatic?await prepareWhiteCarrierFlatProposal(proposal.extracted,sourceSHA,()=>current()&&loading===beforePreparation):proposal.extracted;
 if(!prepared||!current()||loading!==beforePreparation)return false;
 state.logo=null;logoImg=null;state.designBlocked=true;state.extractionApprovalRequired=true;invalidateQuote();
 const expected=loading+1;await logoFileHandler({target:{files:[prepared.file],value:''}});
 if(!current()||loading!==expected||!automatic&&pendingWhiteCarrier!==proposal)return false;
 if(!state.logo||state.designBlocked){if(automatic){blockScreenshotSelection(proposal.sourceData);state.sourceKind='photo-region';globalThis.ReferenceRecovery?.sync();}return false;}
 const result=prepared.processing;
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
