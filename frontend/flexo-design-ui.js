/* Source-derived flat-ink proposal; never an original-ink certification. */
(function(root){'use strict';
const METHOD='source-flat-flexo-proposal-v1';
async function prepare(current,{allowReferenceRecovery=false}={}){
 const fallback=allowReferenceRecovery&&state.designBlocked&&!state.logo&&!state.photoLayout&&!!state.sourcePhoto&&['unsupported','photo-region'].includes(state.sourceKind);
 if(!root.FlexoDesignProposal||!current()||(!fallback&&(!state.logo||!logoImg||state.photoLayout||state.designBlocked||state.extractionApproximate||state.screenCropApplied||state.technicalFrameProposed||state.extractionSourceLimited||state.recolorApplied||processingContext?.pending?.method||!['white','transparent','ambiguous'].includes(state.bgDetection?.kind))))return false;
 const source=processingSession.getState().source;if(!/^[a-f0-9]{64}$/i.test(source?.sha256||''))return false;
 const img=fallback?await loadImage(state.sourcePhoto):prepareLogo();if(!current())return false;
 if(fallback&&(typeof SourceContext==='undefined'||SourceContext.inspectImage(img)))return false;
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
 if(c.width*c.height>4000000)return false;
 const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);const before=cx.getImageData(0,0,c.width,c.height);
 const estimate=PrintInks.estimate(before.data,c.width,c.height,{acceptedArtwork:true});
 if(estimate.contentEvidence?.content!=='continuous-gradient')return false;
 const proposal=await FlexoDesignProposal.propose(before.data,c.width,c.height,{sourceSHA256:source.sha256});if(!current()||!proposal.applied)return false;
 cx.putImageData(new ImageData(proposal.data,c.width,c.height),0,0);const encoded=c.toDataURL('image/png'),decoded=await loadImage(encoded);if(!current())return false;
 cx.clearRect(0,0,c.width,c.height);cx.drawImage(decoded,0,0);const actual=cx.getImageData(0,0,c.width,c.height).data;
 if(!verifyFlatProposalRoundtrip(proposal.data,actual))return false;
 const digest=await crypto.subtle.digest('SHA-256',actual);if(!current())return false;
 const actualHash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 const original=fallback?state.sourcePhoto:state.logo;state.flexoOriginalLogo=original;state.logo=encoded;logoImg=decoded;processedLogo=null;processedKey=null;
 if(fallback){state.designBlocked=false;state.extractionSourceLimited=false;state.screenSelectionRequired=false;state.sourceKind='logo';state.sourcePhoto=null;state.photoLayout=null;state.removed=false;state.quoteSource='uploaded-artwork';if(state.bgSource!=='manual'){state.bg='#ffffff';state.bgPantone='';state.bgSource='scope-white-default';}state.bgDecisionPending=false;photoImg=null;markProcessingOutput();globalThis.ReferenceRecovery?.clear();}
 state.bgDetection={kind:'transparent',color:'#ffffff',rgb:[255,255,255],maskAllowed:false};state.removeWhite=false;
 state.extractionApprovalRequired=true;state.nativeContentReviewRequired=true;state.extractionApproximate=false;state.recolor=false;state.recolorApplied=false;
 const frame=frameOfContext(),flatPrintProposal={...proposal.metadata,proposalPixelSHA256:proposal.metadata.outputPixelSHA256,outputPixelSHA256:actualHash,renderedPixelsVerified:true,originalKnownActualInkCount:estimate.uncertain===false?estimate.count:null};
 stageProcessingResult(METHOD,'v1',[0,0,frame.width,frame.height],{maskBasis:'Existing prepared artwork geometry and alpha retained; source RGB replaced by explicit proposal inks.',transforms:['browser-decode','existing-native-artwork-preparation','source-derived-flat-ink-proposal','verified-PNG-roundtrip','aspect-safe-fit'],limitations:['Proposed flat-color reinterpretation; original remains available.','Not physical spot separation, print master or production approval.'],extra:{contentReviewRequired:true,flatPrintProposal}});
 printInkKey=null;invalidateQuote();return true;
}
const panel=document.createElement('div');panel.id='flexoProposalNote';panel.className='notice light';panel.hidden=true;panel.innerHTML='<strong>Düz renkli flekso tasarım önerisi</strong><p id="flexoProposalDescription"></p><details><summary>Özgün görseli karşılaştır</summary><img id="flexoProposalOriginal" alt="Uyarlanmamış özgün logo" style="display:block;max-width:100%;max-height:300px;object-fit:contain;margin:auto"></details>';
document.querySelector('.preview').after(panel);
function sync(){const p=state.processingResult?.flatPrintProposal,active=p?.method===METHOD&&!!state.logo&&!state.removed&&!state.designBlocked&&!state.designProcessing;panel.hidden=!active;if(!active)return;$('flexoProposalOriginal').src=state.flexoOriginalLogo||'';$('flexoProposalDescription').textContent=`Geçişler ${p.proposedInkCount} düz baskı rengine uyarlandı; beyaz ambalaj rengi sayılmaz. Harfleri, şekli ve renkleri kontrol edip normal ön yüz onayıyla devam edin. Bu yeni öneridir; özgün görselin renk sayısı veya baskıya hazır dosya değildir.`;if(canReviewExtractedArtwork())approvalQuestion.textContent='Bu düz renkli öneride marka, harfler ve renkler uygun mu? Onayınız yalnız bu yeni tasarımın ön fiyatı içindir; baskı onayı değildir.';}
const beforeSync=syncSimpleUI;syncSimpleUI=function(){const result=beforeSync.apply(this,arguments);sync();return result;};
root.FlexoDesignUI=Object.freeze({prepare,sync});
})(typeof globalThis!=='undefined'?globalThis:this);
