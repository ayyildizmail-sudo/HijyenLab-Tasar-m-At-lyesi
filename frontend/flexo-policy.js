/* Permanent production capability policy. RGB preview samples are not press separations.
 * This module grants no quote, order, producer confirmation or design approval.
 */
(function(root){'use strict';
const RULESET='white-opp-three-spot-flat-v1',MAX_SPOT_INKS=3;
const COLOR=/^#[0-9a-f]{6}$/i,validColor=c=>typeof c==='string'&&COLOR.test(c),white=c=>validColor(c)&&c.toLowerCase()==='#ffffff';
function countPhysicalInks({spotInks=[],ground=null,substrate='white-opp'}={}){
 if(substrate!=='white-opp')return {known:false,count:null,reason:'unsupported-substrate'};
 if(!Array.isArray(spotInks))return {known:false,count:null,reason:'invalid-spot-ink-evidence'};
 const ids=new Set();
 for(const ink of spotInks){if(!ink||typeof ink.id!=='string'||!ink.id.trim()||!validColor(ink.solidRgb))return {known:false,count:null,reason:'invalid-spot-ink-evidence'};if(!white(ink.solidRgb))ids.add(ink.id);}
 if(ground){if(!validColor(ground.rgb))return {known:false,count:null,reason:'invalid-ground'};if(!white(ground.rgb)){if(typeof ground.spotInkId!=='string'||!ground.spotInkId.trim())return {known:false,count:null,reason:'colored-ground-ink-unresolved'};ids.add(ground.spotInkId);}}
 return {known:true,count:ids.size,inkIds:[...ids],whiteIsUnprintedSubstrate:true};
}
function validTramProfile(profile,artwork){
 return !!profile&&profile.producerConfirmed===true&&typeof profile.profileId==='string'&&!!profile.profileId.trim()&&typeof profile.confirmationId==='string'&&!!profile.confirmationId.trim()&&profile.process==='spot-ink-tram'&&profile.sourceSHA256===artwork?.sourceSHA256&&/^[a-f0-9]{64}$/i.test(profile.sourceSHA256||'')&&Number.isInteger(profile.designRevision)&&profile.designRevision===artwork?.designRevision&&typeof profile.spotInkId==='string'&&Array.isArray(profile.approvedTintRange)&&profile.approvedTintRange.length===2&&profile.approvedTintRange.every(Number.isFinite)&&profile.approvedTintRange[0]>=0&&profile.approvedTintRange[1]<=1&&profile.approvedTintRange[0]<=profile.approvedTintRange[1];
}
function evaluate(input={}){
 const artwork=input.artwork||{},physical=countPhysicalInks(input),reasons=[];
 const trustedPhysical=['producer-confirmed','explicit-spot-artwork'].includes(input.inkEvidence);
 const physicalCount=trustedPhysical&&physical.known?physical.count:null,declaredKnown=Number.isInteger(input.knownActualInkCount)&&input.knownActualInkCount>=0?input.knownActualInkCount:null;
 const knownCount=physicalCount===null?declaredKnown:declaredKnown===null?physicalCount:Math.max(physicalCount,declaredKnown);
 if(physicalCount!==null&&declaredKnown!==null&&physicalCount!==declaredKnown)reasons.push('conflicting-physical-ink-evidence');
 if(input.substrate&&input.substrate!=='white-opp')reasons.push('unsupported-substrate');
 if(knownCount!==null&&knownCount>MAX_SPOT_INKS)reasons.push('more-than-three-actual-inks');
 if(Number.isInteger(input.originalKnownActualInkCount)&&input.originalKnownActualInkCount>MAX_SPOT_INKS)reasons.push('original-over-limit-needs-producer-review');
 const content=artwork.content||'unknown';
 if(content==='continuous-gradient')reasons.push('continuous-gradient-not-supported');
 else if(content==='tram-tint'){
  const p=input.tramProfile,tints=artwork.tints;
  if(!validTramProfile(p,artwork)||!Array.isArray(tints)||!tints.length||!tints.every(t=>t.spotInkId===p.spotInkId&&Number.isFinite(t.coverage)&&t.coverage>=p.approvedTintRange[0]&&t.coverage<=p.approvedTintRange[1])||!physical.inkIds?.includes(p.spotInkId))reasons.push('job-specific-producer-tram-profile-required');
  // A confirmed limited tram profile is not a general gradient capability.
  reasons.push('partial-tram-requires-production-review');
 }else if(content!=='flat-colors')reasons.push('artwork-print-content-unresolved');
 if(input.sourceRole==='packaging-photo'||input.sourceRole==='mockup')reasons.push('lighting-rgb-is-not-ink-evidence');
 if(input.sourceRole==='adapted-proposal')reasons.push('adapted-design-awaits-current-revision-approval');
 if(knownCount===null)reasons.push('physical-ink-count-unresolved');
 if(!physical.known&&trustedPhysical)reasons.push(physical.reason);
 return Object.freeze({ruleset:RULESET,maxSpotInks:MAX_SPOT_INKS,substrate:'white-opp',whiteInkCount:0,knownActualInkCount:knownCount,sourceRole:input.sourceRole||'original-artwork',status:reasons.length?'technical-review-required':'within-production-envelope',blocked:reasons.length>0,reasons:[...new Set(reasons)],continuousGradientsSupported:false,tram:'producer-confirmed-job-specific-only',commercialPermission:false,estimateOnly:true});
}
const api=Object.freeze({RULESET,MAX_SPOT_INKS,countPhysicalInks,validTramProfile,evaluate});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FlexoPolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this);
