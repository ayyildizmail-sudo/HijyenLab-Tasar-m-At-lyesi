/* Bounded local-emblem fallback. No service calls or semantic text generation. */
(function(root){'use strict';
const METHOD='source-independent-emblem-proposal-v1';
const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');
function make(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function palette(data){const colors=new Set();for(let i=0;i<data.length;i+=4){if(data[i+3]!==255||data[i]===255&&data[i+1]===255&&data[i+2]===255)continue;colors.add(hex([data[i],data[i+1],data[i+2]]));if(colors.size>3)return null;}return colors.size?[...colors].sort():null;}
function diagnostic(stage,reason){root.recordProcessingDiagnostic?.('independent-emblem:'+stage,reason);}
async function prepare(current){
 if(!root.LocalEmblem||!current()||!state.designBlocked||!state.sourcePhoto||state.logo||state.photoLayout)return false;
 const original=state.sourcePhoto,session=processingSession.getState(),source=session.source,operation=session.operationId;
 if(!/^[a-f0-9]{64}$/i.test(source?.sha256||''))return false;
 const live=()=>current()&&state.sourcePhoto===original&&processingSession.getState().operationId===operation&&processingSession.getState().source?.sha256===source.sha256;
 const decline=reason=>{diagnostic('validation',reason);return false;};
 try{
  const image=await loadImage(original);if(!live())return false;
  const result=await LocalEmblem.prepare(image,{createCanvas:make,trace:event=>diagnostic(event.stage||'detector',event.reason||JSON.stringify(event))});if(!live())return false;
  if(!result?.canvas)return decline(result?.reason||'no-unambiguous-local-emblem');
  const frame=frameOfContext(),p=result.processing,box=p?.box,output=result.canvas,w=output.width,h=output.height;
  if(!frame||frame.width!==image.width||frame.height!==image.height||!p?.localFieldPreserved||!p.flatFieldProposal||p.requiresApproval!==true||!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)||box[0]<0||box[1]<0||box[2]>frame.width||box[3]>frame.height||box[2]<=box[0]||box[3]<=box[1])return decline('missing-source-region-contract');
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||w*h>4000000)return decline('unsupported-output-size');
  const pixels=output.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,colors=palette(pixels);if(!colors)return decline('not-a-one-to-three-flat-ink-proposal');
  const encoded=output.toDataURL('image/png'),decoded=await loadImage(encoded);if(!live())return false;
  const roundtrip=make(w,h),rc=roundtrip.getContext('2d');rc.drawImage(decoded,0,0);const actual=rc.getImageData(0,0,w,h).data;
  if(!verifyFlatProposalRoundtrip(pixels,actual)||JSON.stringify(palette(actual))!==JSON.stringify(colors))return decline('PNG-palette-or-alpha-mismatch');
  const sourceCanvas=make(image.width,image.height),sc=sourceCanvas.getContext('2d');sc.drawImage(image,0,0);
  const [sourceHash,outputHash]=await Promise.all([hash(sc.getImageData(0,0,image.width,image.height).data),hash(actual)]);if(!live())return false;
  const host=p.surroundingFieldEvidence||p.annulusEvidence,hostColor=host?.color||p.surroundingFieldColor,requestedGround=/^#[a-f0-9]{6}$/i.test(result.background||'')?result.background.toLowerCase():'#ffffff';
  const boundedHost=host?.basis==='source-local-exterior-annulus'&&host.scope==='local-surrounding-field'&&Number.isFinite(host.inlierFraction)&&host.inlierFraction>=.7&&host.sectors>=8&&hostColor?.toLowerCase()===requestedGround;
  const background=state.bgSource==='manual'?state.bg:requestedGround==='#ffffff'||boundedHost?requestedGround:'#ffffff';
  if(requestedGround!=='#ffffff'&&!boundedHost&&state.bgSource!=='manual')diagnostic('ground','host-field-unverified-white-default');
  if(new Set([...colors,...(background==='#ffffff'?[]:[background])]).size>3)return decline('combined-palette-over-three');
  state.flexoOriginalLogo=original;state.logo=encoded;logoImg=decoded;processedLogo=null;processedKey=null;
  state.sourcePhoto=null;state.photoLayout=null;photoImg=null;state.sourceKind='independent-emblem';state.quoteSource='uploaded-artwork';state.removed=false;state.designBlocked=false;state.extractionSourceLimited=false;state.screenSelectionRequired=false;state.extractionApproximate=false;state.extractionApprovalRequired=true;state.nativeContentReviewRequired=true;
  state.removeWhite=false;state.recolor=false;state.recolorApplied=false;state.bg=background;state.bgPantone=state.bgSource==='manual'?state.bgPantone:'';state.bgSource=state.bgSource==='manual'?'manual':'independent-emblem-proposal';
  state.groundScope={sourceIdentity:source.sha256,packageColor:background,scope:'package',basis:'independent-emblem-appearance-proposal',customerChosen:state.bgSource==='manual',sourceGroundVerified:false,requiresReview:true,preserveLocalPanel:true,mayPlaceArtwork:true,allowColorRemoval:false};
  state.bgDecisionPending=false;state.bgDetection={kind:'transparent',color:'#ffffff',rgb:[255,255,255],maskAllowed:false};state.photoPlacementProfile=null;state.sourceGroundPlacement=null;state.restoredGroundCandidate=null;state.size=90;state.rotation=0;const area=currentPrintArea();state.x=(area.left+area.right)/2;state.y=(area.top+area.bottom)/2;
  const flatPrintProposal={method:'source-flat-flexo-proposal-v1',adaptationMethod:METHOD,sourceSHA256:source.sha256,sourcePixelSHA256:sourceHash,outputPixelSHA256:outputHash,renderedPixelsVerified:true,width:w,height:h,actualProposedPalette:colors,proposedInkCount:colors.length,groundRgb:background,whiteIsSubstrate:true,alphaUnchanged:true,originalKnownActualInkCount:null,physicalInksConfirmed:false};
  markProcessingOutput();root.ReferenceRecovery?.clear();stageProcessingResult(METHOD,'1',box,{maskBasis:'Source-derived local emblem mask; white local field is an explicit flat appearance proposal, not measured metal/substrate.',transforms:p.transforms||[],limitations:p.limitations||[],extra:{contentReviewRequired:true,independentEmblem:p,flatPrintProposal}});
  diagnostic('result','proposal-ready');printInkKey=null;invalidateQuote();return true;
 }catch(error){return live()?decline(error?.message||'local-emblem-processing-error'):false;}
}
function restoreGroundIntent(design){const record=state.processingResult,live=processingSession.getState(),p=record?.flatPrintProposal;if(record?.method!==METHOD||!state.logo||!logoImg||live.source?.sha256!==p?.sourceSHA256||record.source?.sha256!==p?.sourceSHA256||live.result?.method!==METHOD||live.result?.flatPrintProposal?.outputPixelSHA256!==p?.outputPixelSHA256||logoImg.width!==p?.width||logoImg.height!==p?.height||SourceGroundScope.restoreIntent(design).customerChoice)return false;if(!/^#[a-f0-9]{6}$/i.test(p?.groundRgb||''))return false;state.bg=p.groundRgb;state.bgSource='independent-emblem-proposal';state.bgPantone='';state.groundScope={sourceIdentity:p.sourceSHA256,packageColor:state.bg,scope:'package',basis:'independent-emblem-appearance-proposal',customerChosen:false,sourceGroundVerified:false};state.restoredGroundCandidate=null;return true;}
root.IndependentEmblemUI=Object.freeze({prepare,restoreGroundIntent,METHOD});
})(globalThis);
