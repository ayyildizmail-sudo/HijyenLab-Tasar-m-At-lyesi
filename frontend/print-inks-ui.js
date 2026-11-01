// Estimate printing separations from artwork pixels, never the shaded mockup.
let printInkKey=null,printInkEstimate=null,printInkManual=false,frontInkStatus="unknown",frontMonochrome=false,frontArtworkInkEstimate=null;
function printInkFingerprint(){return JSON.stringify([state.quoteSource,state.sourcePhoto,state.photoQuoteBg,state.logo,state.photoLayout,state.screenCropApplied,state.technicalFrameProposed,state.extractionApproximate,state.extractionApprovalRequired,state.processingResult?.method,state.processingResult?.flatPrintProposal?.outputPixelSHA256,state.removed,state.removeWhite,state.bg,state.bgPantone,state.recolorApplied,state.color,state.textPending?'':state.text,state.textColor,state.textPantone,typeof rearQuoteSnapshot==='function'?rearQuoteSnapshot():null,globalThis.MultiLogo?.fingerprint('front')||null]);}
let frontInkNoteText='';
function cleanNeutralArtwork(data,w,h){if(!data)return false;let n=0,dark=0,colored=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<220)continue;const r=data[i],g=data[i+1],b=data[i+2];if(Math.min(r,g,b)>238)continue;n++;if(Math.max(r,g,b)-Math.min(r,g,b)>18)colored++;if(Math.max(r,g,b)<120)dark++;}return n>=20&&dark>=10&&colored===0;}
function neutralArtworkInk(data){const bins=new Map();for(let i=0;i<data.length;i+=4){const rgb=[data[i],data[i+1],data[i+2]];if(data[i+3]<220||Math.max(...rgb)>=120||Math.max(...rgb)-Math.min(...rgb)>18)continue;const color='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');bins.set(color,(bins.get(color)||0)+1);}return [...bins.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}
// Near-white overshoot is not substrate: only tiny components beside verified
// light-gray solid cores may be JPEG ringing. Lines/patches remain unresolved.
function paleCoreEdgeRemnants(data,w,h,estimate){
 if(estimate?.uncertain||estimate?.method!=='accepted-artwork-core-palette')return false;
 const anchors=(estimate.colors||[]).map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))).filter(c=>Math.min(...c)>210&&Math.max(...c)<238&&Math.max(...c)-Math.min(...c)<18);
 if(!anchors.length)return false;
 const pale=p=>data[p*4+3]>=220&&Math.min(data[p*4],data[p*4+1],data[p*4+2])>=238&&Math.max(data[p*4],data[p*4+1],data[p*4+2])<255;
 const seen=new Uint8Array(w*h);
 for(let p=0;p<w*h;p++){
  if(seen[p]||!pale(p))continue;
  const component=[p];seen[p]=1;
  for(let n=0;n<component.length;n++){const q=component[n],x=q%w,y=Math.floor(q/w);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx<0||yy<0||xx>=w||yy>=h||seen[j]||!pale(j))continue;seen[j]=1;component.push(j);}
   if(component.length>3)return false;
  }
  for(const q of component){const x=q%w,y=Math.floor(q/w);let near=false;
   for(let dy=-6;dy<=6&&!near;dy++)for(let dx=-6;dx<=6&&!near;dx++){const xx=x+dx,yy=y+dy;if(xx<1||yy<1||xx>=w-1||yy>=h-1)continue;const j=(yy*w+xx)*4,c=[data[j],data[j+1],data[j+2]];
    if(data[j+3]<220||!anchors.some(a=>Math.hypot(...a.map((v,k)=>v-c[k]))<=12))continue;
    near=true;
   }
   if(!near)return false;
  }
 }
 return true;
}
function stablePaleRun(data,w,h,confirmedWhiteCarrier=false){
 const pale=p=>data[p*4+3]>=220&&Math.min(data[p*4],data[p*4+1],data[p*4+2])>=238&&Math.max(data[p*4],data[p*4+1],data[p*4+2])<255;
 for(let p=0;p<w*h;p++){if(!pale(p))continue;const px=p%w,py=Math.floor(p/w);
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1]]){
   const points=[0,1,2,3].map(n=>[px+dx*n,py+dy*n]);
   if(!points.every(([xx,yy])=>xx>=0&&xx<w&&yy<h&&pale(yy*w+xx)&&[0,1,2].every(k=>Math.abs(data[(yy*w+xx)*4+k]-data[p*4+k])<=1)))continue;
   // A confirmed white-matte edge has both transparent carrier and actual
   // darker ink immediately beside it. Embedded or detached pale lines do not.
   const matteEdge=confirmedWhiteCarrier&&points.every(([x,y])=>{let transparent=false,ink=false;
    for(let sy=-2;sy<=2;sy++)for(let sx=-2;sx<=2;sx++){const xx=x+sx,yy=y+sy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=(yy*w+xx)*4;if(data[j+3]===0||(data[j]===255&&data[j+1]===255&&data[j+2]===255))transparent=true;if(data[j+3]>=220&&Math.min(data[j],data[j+1],data[j+2])<238)ink=true;}
    return transparent&&ink;
   });
   if(!matteEdge)return true;
  }
 }return false;
}
function paleForegroundUnresolved(data,w,h,confirmedWhiteCarrier=false,nativeEstimate=null){
 if(!data)return false;let transparent=false,pale=0;
 for(let i=0;i<data.length;i+=4){if(data[i+3]===0)transparent=true;if(data[i+3]>=220&&Math.min(data[i],data[i+1],data[i+2])>=238&&Math.max(data[i],data[i+1],data[i+2])<255)pale++;}
 if(!transparent)return false;
 if(stablePaleRun(data,w,h,confirmedWhiteCarrier))return true;
 if(pale<=8)return false;
 // Native-alpha pale artwork remains unresolved unless verified gray cores
 // spatially explain tiny ringing. Confirmed white carrier permits matte remnants.
 // A stable pale patch is still potential ink, not free white substrate.
 if(!confirmedWhiteCarrier||!w||!h)return !paleCoreEdgeRemnants(data,w,h,nativeEstimate);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=(y*w+x)*4;if(data[i+3]<220||Math.min(data[i],data[i+1],data[i+2])<238||Math.max(data[i],data[i+1],data[i+2])>=255)continue;
  let stable=true;for(let dy=-2;dy<=2&&stable;dy++)for(let dx=-2;dx<=2&&stable;dx++){const j=((y+dy)*w+x+dx)*4;if(data[j+3]<220)stable=false;for(let k=0;k<3;k++)if(data[j+k]===255||Math.abs(data[j+k]-data[i+k])>1)stable=false;}
  if(stable)return true;
 }
 return false;
}
const rearAnalyzedInkCache=new WeakMap();
function acceptedRearInkPalette(prepared){
 if(!prepared?.data||!prepared.width||!prepared.height)return undefined;
 if(!rearAnalyzedInkCache.has(prepared)){
  const estimate=PrintInks.estimate(prepared.data,prepared.width,prepared.height,{acceptedArtwork:true});
  // Only source-verified white background from the ready-graphic path may
  // explain pale JPEG edge remnants. Native alpha and stable pale ink remain
  // unresolved; a method name alone is not white-carrier evidence.
  const confirmedWhiteCarrier=prepared.method==='ready-flat-graphic-source-pixels'&&Array.isArray(prepared.background)&&prepared.background.length===3&&prepared.background.every(v=>Number.isFinite(v)&&v>=245&&v<=255)&&Math.max(...prepared.background)-Math.min(...prepared.background)<=12;
  if(paleForegroundUnresolved(prepared.data,prepared.width,prepared.height,confirmedWhiteCarrier,estimate))estimate.uncertain=true;
  rearAnalyzedInkCache.set(prepared,estimate);
 }
 return rearAnalyzedInkCache.get(prepared);
}
function rearInkBaseInput(){
 const prepared=typeof rearSponsorPrepared!=='undefined'?rearSponsorPrepared:null;
 const sponsor=prepared?{status:'estimated',inkSamples:prepared.inkSamples||[],method:prepared.method,recolor:rearSponsorRecolor||null,palette:acceptedRearInkPalette(prepared)}:{status:'none'};
 if(typeof rearSponsorFailure!=='undefined'&&(rearSponsorFailure||rearSponsorReview||rearSponsorPending))sponsor.status='unknown';
 return {front:{status:frontInkStatus,colors:frontArtworkInkEstimate?.colors||[],monochrome:false},frontTextColor:state.text&&!state.textPending?state.textColor:null,background:state.bg,additional:globalThis.MultiLogo?.palettes()||[],rear:{textColor:null,qr:false,sponsor}};
}
function baseRearInkEstimate(){return typeof CombinedInks==='undefined'?{status:'unknown',count:null}:CombinedInks.estimate(rearInkBaseInput());}
function allowedTextPalette(side='rear'){
 const input=rearInkBaseInput();
 if(side==='front'&&typeof rearContent!=='undefined'&&['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim())&&rearContent.inkColor)input.rear.textColor=rearContent.inkColor;
 if(side==='front')input.frontTextColor=null;
 const base=CombinedInks.estimate(input);
 return {status:base.status,colors:base.actualInkColors||base.colors||[],count:base.count};
}
function textColorAllowed(color,side='rear'){
 if(typeof PrintPolicy==='undefined')return true;
 const palette=allowedTextPalette(side);
 return PrintPolicy.permitsTextColor(palette.colors,color);
}
function currentFlexoProductionPolicy(){
 if(typeof FlexoPolicy==='undefined'||!state.logo||state.removed||state.photoLayout||state.designProcessing||state.designBlocked||state.extractionSourceLimited)return null;
 // Lighting on a photographic extraction is not evidence of an artwork gradient.
 const nativeArtwork=!state.extractionApproximate;
 const content=nativeArtwork?frontArtworkInkEstimate?.contentEvidence?.content||'unknown':'unknown';
 const policy=FlexoPolicy.evaluate({substrate:'white-opp',sourceRole:'original-artwork',inkEvidence:'rgb-estimate',artwork:{content}});
 const adaptationRequired=content==='continuous-gradient';
 return {...policy,content,adaptationRequired,visualPreviewOnly:adaptationRequired,notice:adaptationRequired?'Bu görselin baskı önizlemesi için renk uyarlaması gerekiyor. Sürekli degrade bu üretimde desteklenmiyor; tram yalnız üreticinin bu işe özel doğruladığı sınırlı uygulamalarda değerlendirilebilir.':''};
}
// Visual acceptance and unknown press separation are independent. A partial
// quote is permitted only for the current accepted pixels/source, never stale
// extraction output or a guessed manual count.
function referenceInkDeclarationKey(){return JSON.stringify([processingSession.getState().source?.sha256,designFingerprint(),state.photoQuoteBg,typeof rearQuoteSnapshot==='function'?rearQuoteSnapshot():null]);}
function referenceDeclaredInkCount(){const d=state.referenceInkDeclaration;return d&&d.key===referenceInkDeclarationKey()&&Number.isInteger(d.count)&&d.count>=1&&d.count<=3?d.count:null;}
function currentReferenceInkReady(){
 if(typeof isReferencePreview!=='function'||!isReferencePreview()||!state.sourcePhoto||state.designProcessing||state.designBlocked||state.productAssetPending||state.productAssetFailure||state.productReviewRequired)return false;
 if(typeof processingSession==='undefined'||typeof designFingerprint!=='function'||!globalThis.ReferenceRecovery?.current())return false;
 const live=processingSession.getState(),record=state.processingResult,fingerprint=designFingerprint();
 return live.status==='ready'&&!live.error&&record?.method==='source-reference'&&!!live.result&&live.fingerprint===fingerprint&&live.result.designRevision===live.designRevision&&record.operation?.operationId===live.operationId&&record.extractionRevision===live.result.extractionRevision&&/^[a-f0-9]{64}$/i.test(live.source?.sha256||'')&&record.source?.sha256===live.source.sha256&&live.result.source?.sha256===live.source.sha256;
}
function knownExtraInkLimit(estimate){
 if(frontArtworkInkEstimate?.uncertain===false&&Number.isInteger(frontArtworkInkEstimate.count)&&frontArtworkInkEstimate.count>PrintPolicy.MAX_PRINT_INKS)return frontArtworkInkEstimate.count;
 if(estimate?.status==='estimated'&&Number.isInteger(estimate.count)&&estimate.count>PrintPolicy.MAX_PRINT_INKS)return estimate.count;
 // For an unknown photo/reference, its RGB clusters are not known inks. Only
 // separately established rear/additional/text/background inks can cap it.
 const input=rearInkBaseInput();if(frontInkStatus!=='estimated')input.front={status:'estimated',colors:[],monochrome:false};
 if(typeof rearContent!=='undefined'&&['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim())&&rearContent.inkColor)input.rear.textColor=rearContent.inkColor;
 const known=CombinedInks.estimate(input);
 return (known.colors?.length||0)>PrintPolicy.MAX_PRINT_INKS?known.colors.length:null;
}
function currentPrintPolicy(){
 if(typeof isDeclaredQuote==='function'&&isDeclaredQuote())return {blocked:false}; // The independent declaration gate is not an artwork policy bypass.
 if(typeof PrintPolicy==='undefined'||(typeof isUnprinted==='function'&&isUnprinted()))return {blocked:false};
 const originalKnown=state.processingResult?.referenceKnownActualInkCount??state.processingResult?.flatPrintProposal?.originalKnownActualInkCount;
 if(Number.isInteger(originalKnown)&&originalKnown>PrintPolicy.MAX_PRINT_INKS&&!(state.processingResult?.flatPrintProposal?.method==='source-flat-flexo-proposal-v1'&&approvedFlatPhotoPalette(null,0,0,true)))return PrintPolicy.evaluate({count:originalKnown,status:'estimated'});
 const input=rearInkBaseInput();
 if(typeof rearContent!=='undefined'&&['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim())&&rearContent.inkColor)input.rear.textColor=rearContent.inkColor;
 const estimate=CombinedInks.estimate(input);
 const hasArtwork=!!((state.logo&&!state.removed)||state.photoLayout||(typeof isReferencePreview==='function'&&isReferencePreview()));
 let result=PrintPolicy.evaluate({...estimate,hasArtwork,detectedCount:frontArtworkInkEstimate?.count??null,count:estimate.count??(estimate.colors?.length>PrintPolicy.MAX_PRINT_INKS?estimate.colors.length:null)});
 const production=currentFlexoProductionPolicy();
 if(production?.adaptationRequired&&!(Number.isInteger(result.count)&&result.count>PrintPolicy.MAX_PRINT_INKS))return {...result,blocked:true,count:null,status:'contact-required',reason:production.notice,production};
 const selected=$('inks').value===''?null:Number($('inks').value);
 const selectedResult=PrintPolicy.evaluate({count:selected,status:selected===null?'unknown':'estimated'});
 const knownOverLimit=knownExtraInkLimit(estimate);
 if(knownOverLimit!==null)return PrintPolicy.evaluate({count:knownOverLimit,status:'estimated'});
 if(selectedResult.blocked)return selectedResult;
 const reference=typeof isReferencePreview==='function'&&isReferencePreview();
 if(reference&&currentReferenceInkReady()&&referenceDeclaredInkCount()===selected&&selected!==null)return {blocked:false,count:selected,status:'customer-declared',reason:'Müşteri renk beyanına göre ön fiyat; otomatik renk ölçümü veya baskı onayı değildir.'};
 const unknown=reference||frontInkStatus==='unknown'||estimate.status==='unknown';
 if(unknown&&selected===null&&(reference?currentReferenceInkReady():currentVisualArtworkReady()))result={blocked:false,count:null,status:'partial-excludes-plate',reason:'Baskı renkleri teknik incelemede; yalnız ürün ve kargo ara toplamı. Klişe ve KDV hariç; kesin teklif değildir.'};
 return result;
}
function printPolicyError(){const policy=currentPrintPolicy();return policy.blocked?policy.reason:'';}
// A current, accepted idea preview is not approval of separations or pricing.
// Use the processing authority, never a source-kind label alone, to reject stale
// outputs left on screen during replacement, failure, cancellation or selection.
function currentVisualArtworkReady(previewOnly=false){
 if(!state.logo||state.removed||state.photoLayout||typeof logoImg==='undefined'||!logoImg||!(logoImg.width>0&&logoImg.height>0))return false;
 if(state.designProcessing||state.designBlocked||state.extractionSourceLimited||(!previewOnly&&state.extractionApprovalRequired)||state.screenSelectionRequired||state.bgDecisionPending||state.productAssetPending||state.productAssetFailure||state.productReviewRequired||(state.textPending&&state.text?.trim()))return false;
 if(['unsupported','candidate','photo-region','photo','screen'].includes(state.sourceKind))return false;
 if(typeof designIssue!=='function'||designIssue(previewOnly)||typeof designFingerprint!=='function'||typeof processingSession==='undefined')return false;
 const live=processingSession.getState(),record=state.processingResult,result=live.result,fingerprint=designFingerprint();
 if(live.status!=='ready'||live.error||!record||!result||live.fingerprint!==fingerprint||result.designRevision!==live.designRevision)return false;
 if(result.operation?.operationId!==live.operationId||record.operation?.operationId!==live.operationId||record.extractionRevision!==result.extractionRevision)return false;
 if(!/^[a-f0-9]{64}$/i.test(result.source?.sha256||'')||record.source?.sha256!==result.source.sha256||live.source?.sha256!==result.source.sha256)return false;
 if(result.status==='needs-selection'||!result.method||!result.frame?.width||!result.frame?.height)return false;
 return previewOnly||!state.extractionApproximate||processingSession.isApproved(fingerprint);
}
function visualPreviewPolicyError(){
 const policy=currentPrintPolicy();if(!policy.blocked)return '';
 const front=typeof frontArtworkInkEstimate==='undefined'?null:frontArtworkInkEstimate,combined=typeof printInkEstimate==='undefined'?null:printInkEstimate;
 // A provisional photo/shadow cluster count is not confirmed extra ink. Keep
 // its financial block, but do not turn it into a visual-completeness verdict.
 const knownOverLimit=(Number.isInteger(policy.count)&&policy.count>3)||(front?.uncertain===false&&Number.isInteger(front.count)&&front.count>3)||(combined?.uncertain===false&&((Number.isInteger(combined.count)&&combined.count>3)||(combined.colors?.length||0)>3));
 if(!knownOverLimit&&frontInkStatus==='unknown'&&policy.count===null&&currentVisualArtworkReady())return '';
 return policy.reason;
}
function pendingFlatPhotoNotice(){
 if(state.extractionApprovalRequired!==true)return '';
 const palette=approvedFlatPhotoPalette(null,0,0,true);
 return palette?`Logo önizlemesi ${palette.count} baskı rengiyle hazır; tasarımınızı onaylayarak devam edin.`:'';
}
function deferUncertainPrintNotice(policy){return policy?.blocked===true&&policy.count===null&&state.extractionApprovalRequired===true&&!!state.logo&&!state.removed&&!state.designBlocked&&!state.designProcessing&&!state.extractionSourceLimited;}
function syncPrintPolicyNotice(){
 if(typeof document==='undefined'||typeof document.querySelector!=='function'||typeof PrintPolicy==='undefined')return;
 const policy=currentPrintPolicy(),previewNotice=policy.count===null?pendingFlatPhotoNotice():'';let panel=document.querySelector('#printPolicyNotice');
 if(!panel&&policy.blocked){
  panel=document.createElement('section');panel.id='printPolicyNotice';panel.className='notice';panel.setAttribute('role','status');
  const message=document.createElement('p');message.dataset.policyMessage='';
  const whatsapp=document.createElement('button');whatsapp.type='button';whatsapp.className='primary';whatsapp.textContent='WhatsApp’tan görüşelim';whatsapp.onclick=()=>document.querySelector('#contactWhatsApp')?.click();
  const telephone=document.createElement('button');telephone.type='button';telephone.className='outline';telephone.textContent='Telefonla ara';telephone.onclick=()=>document.querySelector('#contactTelephone')?.click();
  panel.append(message,whatsapp,telephone);document.querySelector('#status')?.before(panel);
 }
 if(panel){panel.hidden=!policy.blocked||deferUncertainPrintNotice(policy);if(policy.blocked){panel.querySelector('[data-policy-message]').textContent=previewNotice||policy.reason;for(const button of panel.querySelectorAll('button'))button.hidden=!!previewNotice;
  const candidates=[document.querySelector('#rearToPrice'),document.querySelector('#review'),document.querySelector('.simplePrimary'),document.querySelector('#next')];
  const target=candidates.find(node=>node&&!node.hidden&&!node.closest('[hidden]')&&node.getClientRects?.().length);
  if(target)target.before(panel);
 }}
 if(policy.blocked){if(typeof latest!=='undefined')latest=null;invalidateQuote();if($('review'))$('review').disabled=true;}
}
function rearTextInkDecision(){
 const chosen=typeof rearContent!=='undefined'?rearContent.inkColor:'';
 if(/^#[0-9a-f]{6}$/i.test(chosen||''))return textColorAllowed(chosen)?{ok:true,color:chosen,source:'explicit-rear'}:{ok:false,color:null,reason:PrintPolicy.CONTACT_MESSAGE};
 if(state.recolor&&state.recolorApplied&&/^#[0-9a-f]{6}$/i.test(state.color||''))return {ok:true,color:state.color,source:'explicit-front'};
 const base=baseRearInkEstimate();
 if(base.status!=='estimated')return {ok:false,color:null,reason:'Mevcut baskı renkleri henüz net değil. Arka yazı için bir renk seçin; yeni renk klişe tahminini değiştirebilir.'};
 return {...CombinedInks.selectTextInk(base.actualInkColors||base.colors,state.bg),source:'existing-palette'};
}
function combinedRearInkEstimate(){
 if(typeof CombinedInks==='undefined')return {status:'unknown',count:null};
 const rear=typeof rearHasContent==='function'&&rearHasContent(),input=rearInkBaseInput();
 const hasText=rear&&['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim());
 const decision=hasText?rearTextInkDecision():null;
 input.rear.textColor=decision?.ok?decision.color:null;input.rear.textColorFromExisting=['existing-palette','explicit-front'].includes(decision?.source);input.rear.qr=!!(rear&&rearContent.qrEnabled);
 const estimate=CombinedInks.estimate(input);
 return decision&&!decision.ok?{...estimate,status:'unknown',count:null,qrColor:null,reason:decision.reason}:estimate;
}
function syncRearInkNote(){
 if(typeof isReferencePreview==='function'&&isReferencePreview()){syncPrintInks();return;}
 const note=$('inkEstimateNote'),rear=typeof rearHasContent==='function'&&rearHasContent();
 if(note.textContent&&!note.textContent.startsWith('Ön ve arka yüz'))frontInkNoteText=note.textContent;
 $('inks').disabled=false;
 if((rear||globalThis.MultiLogo?.has('front'))&&!printInkManual){const combined=combinedRearInkEstimate();$('inks').value=combined.status==='estimated'?String(combined.count):'';state.inkSelection={status:combined.status==='estimated'?'estimated':'unknown',estimatedCount:combined.count,selectedCount:combined.count,colors:combined.colors||[],reason:combined.reason,designKey:printInkFingerprint()};note.textContent=combined.status==='estimated'?`Ön ve arka yüz birlikte: ${combined.count} tahmini klişe. Aynı renk ve zemin bir kez; beyaz hariç. Kesin baskı ayrımı sipariş öncesinde onaylanır.`:'Ön ve arka yüz: bu kaynaktaki baskı renkleri güvenle ayrılmadı; klişe bedeli henüz toplama dahil değil. Bilinmeyen renk sıfır sayılmaz.';}
 else if(!rear&&frontInkNoteText)note.textContent=frontInkNoteText;
 syncPrintPolicyNotice();
 if($('rearPriceNote'))$('rearPriceNote').textContent=$('inks').value===''?'Arka yüz dahil renk ayrımı belirsiz. Gösterilen ara toplam klişe bedelini içermez.':`Ön ve arka yüz için ${$('inks').value} tahmini klişe fiyat hesabına dahil edilir. Aynı renk bir kez, beyaz hariç.`;
}
function approvedFlatPhotoPalette(data,w,h,previewOnly=false){
 const proposal=state.processingResult?.flatPrintProposal;
 if(!proposal||!['audited-photo-glyph-flat-proposal-v1','source-flat-flexo-proposal-v1'].includes(proposal.method)||proposal.renderedPixelsVerified!==true||(proposal.originalKnownActualInkCount>3&&proposal.method!=='source-flat-flexo-proposal-v1')||!proposal.alphaUnchanged||!proposal.whiteIsSubstrate||state.recolorApplied||(!previewOnly&&state.extractionApprovalRequired)||!currentVisualArtworkReady(previewOnly)||(!previewOnly&&!processingSession.isApproved(designFingerprint())))return null;
 if(proposal.sourceSHA256!==state.processingResult?.source?.sha256||!['sourcePixelSHA256','outputPixelSHA256'].every(k=>/^[a-f0-9]{64}$/i.test(proposal[k]||'')))return null;
 const colors=proposal.actualProposedPalette;
 if(!Array.isArray(colors)||colors.length<1||colors.length>3||proposal.proposedInkCount!==colors.length||colors.some(c=>!/^#[a-f0-9]{6}$/i.test(c)||c.toLowerCase()==='#ffffff'))return null;
 if(!logoImg||logoImg.width!==proposal.width||logoImg.height!==proposal.height||proposal.width*proposal.height>(proposal.method==='source-flat-flexo-proposal-v1'?4000000:2500000))return null;
 const layer=document.createElement('canvas');layer.width=w=logoImg.width;layer.height=h=logoImg.height;const context=layer.getContext('2d',{willReadFrequently:true});context.drawImage(logoImg,0,0);data=context.getImageData(0,0,w,h).data;
 const rgb=colors.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),seen=new Set();
 // Verify the actually drawn prepared artwork, not the old photo estimate.
 // Resizing/PNG premultiplication may perturb AA; every opaque core must still
 // agree with a proposed ink, and every declared ink must be visibly present.
 if(!data||data.length!==w*h*4)return null;
 for(let i=0;i<data.length;i+=4){if(data[i+3]<250||[0,1,2].every(k=>data[i+k]===255))continue;const index=rgb.findIndex(c=>c.every((v,k)=>Math.abs(v-data[i+k])<=2));if(index<0)return null;seen.add(index);}
 if(seen.size!==colors.length)return null;
 const approved=processingSession.isApproved(designFingerprint());
 return {count:colors.length,colors:colors.slice(),uncertain:false,method:proposal.method==='source-flat-flexo-proposal-v1'?(approved?'approved-rendered-flat-flexo-proposal':'pending-rendered-flat-flexo-proposal'):'approved-rendered-flat-photo-proposal',contentEvidence:{content:'flat-colors',basis:approved?'customer-approved-rendered-proposal':'rendered-proposal-pending-approval',physicalInksConfirmed:false},reason:approved?'Onaylanan düz renkli fikir tasarımındaki baskı renkleri; beyaz ambalaj rengi hariç.':'Onayınızı bekleyen yeni düz renkli tasarım önerisi; özgün görselin baskı ayrımı değildir.'};
}
function photographicInkSource(){
 if(state.photoLayout)return true;
 if(!state.extractionApproximate)return false;
 // Screenshot artwork is not necessarily a photo. Only actual photographic
 // extraction routes get this uncertainty; native/screen four-ink cores stay four.
 return ['white-carrier-proposal','screen-product-preview'].includes(state.sourceKind)||[
  'white-carrier-chromatic-and-dark-components','photo-ink-extraction',
  'screen-product-shell-whole-group-matte','screen-product-white-carrier',
  'bounded-colored-carrier-source-pixels'
 ].includes(state.processingResult?.method);
}
function syncPrintInks(){
 if(typeof isReferencePreview==='function'&&isReferencePreview()){
  printInkKey=printInkFingerprint();printInkManual=false;frontInkStatus='unknown';frontMonochrome=false;
  frontArtworkInkEstimate={count:null,colors:[],uncertain:true,physicalInkCount:null,method:'source-reference-not-separated'};
  printInkEstimate={...frontArtworkInkEstimate,status:'unknown'};
  const declared=referenceDeclaredInkCount();if(declared===null)state.referenceInkDeclaration=null;
  $('inks').value=declared===null?'':String(declared);$('inks').disabled=false;
  state.inkSelection={status:declared===null?'unknown':'customer-declared',selectedCount:declared,estimatedCount:null,reason:'Customer statement only; source reference does not establish printing separations.',designKey:referenceInkDeclarationKey()};
  $('inkEstimateNote').textContent=declared===null?'İsterseniz toplam 1–3 baskı rengini seçin; beyaz hariç, renkli zemin ve iki yüz dahil. Seçmezseniz klişe hariç ara toplam gösterilir.':'Seçiminize göre ön fiyat: '+declared+' renk · Müşteri renk beyanı; otomatik ölçüm veya baskı onayı değildir. Beyaz hariç, renkli zemin ve iki yüz dahil.';
  frontInkNoteText=$('inkEstimateNote').textContent;syncPrintPolicyNotice();return;
 }
 if(typeof isDeclaredQuote==='function'&&isDeclaredQuote()){
  const d=state.declaration;$('inks').value=DeclaredQuote.valid(d)?String(d.count):'';$('inks').disabled=true;
  state.inkSelection={status:'customer-declared',selectedCount:DeclaredQuote.valid(d)?d.count:null,estimatedCount:null};
  $('inkEstimateNote').textContent='Müşteri renk beyanı; görsel kontrolü yapılmamıştır. Sayıyı değiştirmek için tasarım adımına dönün.';return;
 }
 $('inks').disabled=false;

 const key=printInkFingerprint();if(key===printInkKey){syncRearInkNote();return;}
 printInkKey=key;printInkManual=false;invalidateQuote();
 let pixels=null,w=0,h=0;
 const image=!state.removed&&logoImg?(globalThis.MultiLogo?MultiLogo.primaryFront():prepareLogo()):state.photoLayout?photoImg:null;
 if(image){const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(image.width,image.height));canvas.width=w=Math.max(1,Math.round(image.width*scale));canvas.height=h=Math.max(1,Math.round(image.height*scale));const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,w,h);pixels=c.getImageData(0,0,w,h).data;}
 const photoDerived=photographicInkSource();
 const nativeEstimate=PrintInks.estimate(pixels,w,h,{acceptedArtwork:!!image&&!state.photoLayout,photoDerived});
 const nativeMonochromeSafe=!nativeEstimate.uncertain&&nativeEstimate.count<=1;
 frontMonochrome=nativeMonochromeSafe&&!!image&&!state.photoLayout&&(!state.extractionApproximate||state.technicalFrameProposed||state.screenCropApplied)&&cleanNeutralArtwork(pixels,w,h)&&!(state.recolor&&state.recolorApplied);
 frontArtworkInkEstimate=!(state.recolor&&state.recolorApplied)&&!frontMonochrome?nativeEstimate:PrintInks.estimate(pixels,w,h,{acceptedArtwork:!!image&&!state.photoLayout,photoDerived,recolor:state.recolor&&state.recolorApplied?state.color:frontMonochrome?neutralArtworkInk(pixels):null});
 if(!(state.recolor&&state.recolorApplied)&&paleForegroundUnresolved(pixels,w,h,state.removeWhite&&state.bgDetection?.kind==='white',!state.extractionApproximate&&!state.photoLayout?nativeEstimate:null))frontArtworkInkEstimate.uncertain=true;
 const approvedProposal=approvedFlatPhotoPalette(pixels,w,h);if(approvedProposal)frontArtworkInkEstimate=approvedProposal;
 printInkEstimate={...frontArtworkInkEstimate};
 const neutralFrameTones=!frontMonochrome&&state.technicalFrameProposed&&printInkEstimate.colors.length>1&&printInkEstimate.colors.every(c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<20;});
 const neutralToneCount=printInkEstimate.colors.filter(c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<24;}).length;
 const sourceInkUnverified=!approvedProposal&&!frontMonochrome&&(!!state.extractionApproximate||!!state.photoLayout)&&neutralToneCount>1;
 frontInkStatus=!sourceInkUnverified&&!neutralFrameTones&&!frontArtworkInkEstimate.uncertain?'estimated':'unknown';
 const frontCombined=CombinedInks.estimate({front:{status:frontInkStatus,colors:frontArtworkInkEstimate.colors},background:state.bg,frontTextColor:state.text&&!state.textPending?state.textColor:null});
 printInkEstimate={...frontArtworkInkEstimate,...frontCombined,uncertain:frontCombined.status!=='estimated'};
 $('inks').value=frontCombined.status==='estimated'?String(frontCombined.count):'';
 state.inkSelection={status:$('inks').value===''?'unknown':'estimated',estimatedCount:printInkEstimate.count??frontArtworkInkEstimate.count,selectedCount:$('inks').value===''?null:Number($('inks').value),reason:$('inks').value===''?'Photo tones or separation uncertainty; not missing color names.':'Distinct nonwhite palette estimate; not physical press separation.',designKey:key};
 const uncertain=printInkEstimate.uncertain||state.extractionApproximate||!!state.photoLayout||!!state.bgPantone||!!state.textPantone;
 $('inkEstimateNote').textContent=($('inks').value===''?(sourceInkUnverified?'Fotoğraf veya ayrıştırılmış önizlemedeki tonların gerçek baskı rengi sayısı henüz doğrulanmadı; klişe bedeli teknik incelemede kesinleşir. ':(state.screenCropApplied||neutralFrameTones)?'Gri tonların ayrı baskı rengi olup olmadığı net değil; klişe bedeli teknik incelemede kesinleşir. ':'Bu görselin klişe sayısı teknik inceleme gerektiriyor. '):`Otomatik tahmin: ${printInkEstimate.count} klişe. `)+(uncertain?'Fotoğraf ve ton geçişleri baskı rengi sayısını belirsiz bırakabilir; teknik incelemede doğrulanır. ':'Görselden yaklaşık hesaplandı; gerekirse düzeltebilirsiniz. ')+'Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';
 state.productionCompatibility=currentFlexoProductionPolicy();
 if(state.productionCompatibility?.adaptationRequired)$('inkEstimateNote').textContent=state.productionCompatibility.notice+' '+$('inkEstimateNote').textContent;
 syncRearInkNote();
 const pendingNotice=pendingFlatPhotoNotice();if(pendingNotice){$('inkEstimateNote').textContent=pendingNotice;frontInkNoteText=pendingNotice;}
}
const calculateBeforePrintInks=calculateRaw;calculateRaw=function(){syncPrintInks();invalidateQuote();return calculateBeforePrintInks();};
const refreshBeforePrintInks=refresh;refresh=function(){const result=refreshBeforePrintInks();syncPrintInks();return result;};
$('inks').oninput=()=>{if(typeof isReferencePreview==='function'&&isReferencePreview()){const value=$('inks').value,count=value===''?null:Number(value);state.referenceInkDeclaration=Number.isInteger(count)&&count>=1&&count<=3?{count,key:referenceInkDeclarationKey()}:null;invalidateQuote();calculate();return;}printInkManual=true;state.inkSelection={status:$('inks').value===''?'unknown':'user-selected',estimatedCount:printInkEstimate?.count??null,selectedCount:$('inks').value===''?null:Number($('inks').value),reason:'User correction, not technical press confirmation.',designKey:printInkFingerprint()};invalidateQuote();$('inkEstimateNote').textContent='Klişe sayısını siz düzelttiniz. Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';calculate();};
syncPrintInks();
