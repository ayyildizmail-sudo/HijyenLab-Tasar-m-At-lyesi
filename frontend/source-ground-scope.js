/* Scope, not color recognition: an image's border is never proof of package ground.
 * This pure contract changes no source pixels, palette, plate count or records. */
(function(root){'use strict';
const color=v=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v)?v.toLowerCase():null;
const identity=v=>typeof v==='string'&&/^[a-f\d]{64}$/i.test(v)?v.toLowerCase():null;
function resolve(input={}){
 const detection=input.detection||{},choice=input.customerChoice,evidence=input.packageEvidence;
 const trustedArtwork=['native-artwork','selected-brand-region','isolated-brand'].includes(input.artifactKind);
 const sampled=color(detection.color)||color(input.localBackground);
 const result={sourceIdentity:identity(input.sourceIdentity),packageColor:'#ffffff',scope:'unknown',basis:'white-default-not-source-ground-proof',preserveArtwork:true,preserveLocalPanel:true,allowColorRemoval:false,allowWhiteExteriorRemoval:false,mayPlaceArtwork:trustedArtwork,localBackground:sampled,customerChosen:false,sourceGroundVerified:false,packageGroundProposed:false,preserveInkRoles:true,whiteOppInkCount:0,requiresReview:!trustedArtwork};
 // Customer intent is authoritative for the package only, never permission to
 // paste an unisolated photograph or erase a logo's local reverse-contrast field.
 if(choice?.explicit===true&&choice.scope==='package'&&color(choice.color)){
  return {...result,packageColor:color(choice.color),scope:'package',basis:'explicit-customer-package-choice',customerChosen:true};
 }
 // A source-bound reviewed product region is a distinct future integration path.
 // Pixel edge color, confidence, circle/rectangle shape and generic praise are NOT evidence.
 const source=identity(input.sourceIdentity);
 if(source&&identity(evidence?.sourceIdentity)===source&&evidence?.scope==='package'&&evidence?.reviewed===true&&evidence?.basis==='product-region'&&color(evidence?.color)){
  return {...result,packageColor:color(evidence.color),scope:'package',basis:'reviewed-source-product-region',sourceGroundVerified:true};
 }
 if(input.artifactKind==='scene')return {...result,scope:'scene',basis:'scene-not-package-ground'};
 if(!trustedArtwork)return result;
 // Geometry is evidence for a bounded proposal, not a claim of semantic or
 // physical ink verification. Bind to the source AND current PDF page, and
 // require the placed artwork's local color to agree. Use that exact local
 // color to avoid inventing a second near-identical ground ink.
 const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
 const agrees=(a,b)=>a&&b&&Math.hypot(...rgb(a).map((v,i)=>v-rgb(b)[i]))<=24;
 if(source&&identity(evidence?.sourceIdentity)===source&&evidence?.scope==='package'&&evidence?.basis==='detected-product-layout'&&evidence?.verifiedGeometry===true&&evidence?.preserveSourcePixels===true&&Array.isArray(evidence.carrierBoxes)&&evidence.carrierBoxes.length&&Array.isArray(evidence.corroboratingRegions)&&evidence.corroboratingRegions.length&&(evidence.pageNumber??null)===(input.pageNumber??null)&&agrees(sampled,color(evidence.color))){
  return {...result,packageColor:sampled,scope:'package',basis:'detected-product-layout-proposal',packageGroundProposed:true,requiresReview:true};
 }
 const proposal=detection.packageGroundProposal;
 if(source&&identity(proposal?.sourceIdentity)===source&&input.artifactKind==='native-artwork'&&proposal?.basis==='native-fullbleed-appearance-proposal'&&proposal.fullBleed===true&&proposal.flatGraphic===true&&proposal.opaque===true&&proposal.preserveSourcePixels===true&&color(proposal.color)===sampled){
  return {...result,packageColor:sampled,scope:'package',basis:proposal.basis,packageGroundProposed:true,requiresReview:true};
 }
 if(detection.kind==='transparent')return {...result,scope:'artwork',basis:'transparent-artwork-white-package',requiresReview:false};
 if(detection.kind==='white')return {...result,scope:'artwork',basis:'white-artwork-white-package',allowWhiteExteriorRemoval:detection.maskAllowed!==false,requiresReview:false};
 return {...result,scope:'logo-local',basis:'local-artwork-ground-not-package',requiresReview:true};
}
// Legacy draft colors carry no proof of customer intent. Keep the saved color
// recoverable as a proposal while returning a safe white default.
function restoreIntent(design={}){
 const intent=design.backgroundIntent,saved=color(design.bg);
 if(intent?.kind==='manual'&&color(intent.color)&&color(intent.color)===saved)return {customerChoice:{explicit:true,scope:'package',color:saved},unconfirmedColor:null};
 return {customerChoice:null,unconfirmedColor:color(intent?.color)||saved};
}
const api=Object.freeze({resolve,restoreIntent});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SourceGroundScope=api;
})(typeof globalThis!=='undefined'?globalThis:this);
