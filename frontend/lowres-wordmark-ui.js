/* Source-bound small flat wordmark proposal. Original file and customer ground intent remain unchanged. */
(function(root){'use strict';
const METHOD='source-lowres-wordmark-proposal-v1';
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');
async function prepare(current){
 const evidence=state.bgDetection?.packageGroundProposal,smallFlat=evidence?.fullBleed===true&&evidence.flatGraphic===true&&evidence.opaque===true&&Math.min(evidence.width,evidence.height)>=32&&Math.min(evidence.width,evidence.height)<64&&evidence.width*evidence.height<=32000;
 if(!root.LowResWordmark||!current()||!state.logo||!logoImg||state.photoLayout||state.designBlocked||state.extractionApproximate||state.screenCropApplied||state.technicalFrameProposed||state.recolorApplied||processingContext?.pending?.method||!smallFlat)return false;
 const session=processingSession.getState(),source=session.source,operation=session.operationId,original=state.logo,input=logoImg;
 if(!/^[a-f0-9]{64}$/i.test(source?.sha256||'')||evidence.sourceIdentity!==source.sha256)return false;
 const live=()=>current()&&state.logo===original&&logoImg===input&&processingSession.getState().operationId===operation&&processingSession.getState().source?.sha256===source.sha256;
 const decline=reason=>{root.recordProcessingDiagnostic?.('lowres-wordmark',reason);return false;};
 try{
  const result=await LowResWordmark.prepare(input,{createCanvas:make});if(!live())return false;
  const canvas=result?.canvas,p=result?.processing,frame=frameOfContext();
  if(!canvas||!p||!frame||frame.width!==input.width||frame.height!==input.height||!Array.isArray(p.box)||p.box.length!==4||p.box.some((v,i)=>v!==[0,0,frame.width,frame.height][i])||p.appearanceApprovalRequired!==true)return decline('missing-source-frame-contract');
  const audit=p.topologyAudit;if(audit?.passed!==true||audit.sourceComponents!==audit.outputComponents||audit.sourceHoles!==audit.outputHoles||!(audit.corePixels>0)||audit.retainedCorePixels/audit.corePixels<.995)return decline('missing-source-topology-audit');
  if(canvas.width<input.width||canvas.height<input.height||canvas.width*canvas.height>4000000||Math.abs(canvas.width/canvas.height-input.width/input.height)>.02)return decline('invalid-output-geometry');
  const before=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
  for(let i=0;i<before.length;i+=4){if(before[i+3]!==255)return decline('nonopaque-field-output');if(before[i]===255&&before[i+1]===255&&before[i+2]===255)continue;colors.add('#'+Array.from(before.subarray(i,i+3),v=>v.toString(16).padStart(2,'0')).join(''));}
  if(colors.size<1||colors.size>2||!colors.has(state.bgDetection.color.toLowerCase()))return decline('output-does-not-match-original-ground-role');
  const encoded=canvas.toDataURL('image/png'),decoded=await loadImage(encoded);if(!live())return false;
  const check=make(canvas.width,canvas.height);check.getContext('2d').drawImage(decoded,0,0);const actual=check.getContext('2d').getImageData(0,0,check.width,check.height).data;
  if(!verifyFlatProposalRoundtrip(before,actual))return decline('PNG-roundtrip-mismatch');
  const originalCanvas=make(input.width,input.height);originalCanvas.getContext('2d').drawImage(input,0,0);
  const [sourceHash,outputHash]=await Promise.all([hash(originalCanvas.getContext('2d').getImageData(0,0,input.width,input.height).data),hash(actual)]);if(!live())return false;
  const b=p.foregroundBounds;if(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=0&&b[1]>=0&&b[2]<=frame.width&&b[3]<=frame.height&&b[2]>b[0]&&b[3]>b[1])state.bgDetection={...state.bgDetection,packageGroundProposal:{...evidence,foregroundBounds:{left:b[0],top:b[1],right:b[2],bottom:b[3]},foregroundBasis:'source-matte-all-components'}};
  state.flexoOriginalLogo=original;state.logo=encoded;logoImg=decoded;processedLogo=null;processedKey=null;state.removeWhite=false;state.recolor=false;state.recolorApplied=false;state.extractionApprovalRequired=true;state.nativeContentReviewRequired=true;state.extractionApproximate=false;
  const flatPrintProposal={method:'source-flat-flexo-proposal-v1',adaptationMethod:METHOD,algorithmRevision:p.methodVersion||'1',sourceSHA256:source.sha256,sourcePixelSHA256:sourceHash,outputPixelSHA256:outputHash,renderedPixelsVerified:true,width:canvas.width,height:canvas.height,actualProposedPalette:[...colors],proposedInkCount:colors.size,groundRgb:state.bg,whiteIsSubstrate:true,alphaUnchanged:true,originalKnownActualInkCount:null,physicalInksConfirmed:false};
  stageProcessingResult(METHOD,'1',p.box,{maskBasis:p.maskBasis||'Bounded source-derived wordmark matte; no typeface substitution.',transforms:p.transforms||[],limitations:p.limitations||[],extra:{contentReviewRequired:true,lowResWordmark:p,flatPrintProposal}});
  printInkKey=null;invalidateQuote();return true;
 }catch(error){return live()?decline(error?.message||'wordmark-proposal-failed'):false;}
}
root.LowResWordmarkUI=Object.freeze({prepare,METHOD});
})(globalThis);
