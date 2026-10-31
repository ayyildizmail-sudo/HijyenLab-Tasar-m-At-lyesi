/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression/prototype for legacy browser modules. */
'use strict';
// Offline deterministic flat-color proposal adapter. Never an extractor or quote gate.
const crypto=require('node:crypto'),Policy=require('../frontend/flexo-policy.js');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
function propose({data,width,height,mask,whiteKnockoutMask=null,acceptance,current,targetPalette,groundRgb='#ffffff',originalKnownActualInkCount=null}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>4000000||!(data instanceof Uint8ClampedArray||Buffer.isBuffer(data))||data.length!==width*height*4)throw Error('Invalid or oversized artwork pixels');
 if(!(mask instanceof Uint8Array)||mask.length!==width*height||!mask.some(Boolean)||mask.some(v=>v!==0&&v!==1))throw Error('Accepted binary artwork mask required');
 if(whiteKnockoutMask&&(!(whiteKnockoutMask instanceof Uint8Array)||whiteKnockoutMask.length!==mask.length||whiteKnockoutMask.some(v=>v!==0&&v!==1)))throw Error('Invalid protected white knockout mask');
 if(whiteKnockoutMask)for(let p=0;p<mask.length;p++){const i=p*4;if(whiteKnockoutMask[p]&&data[i+3]&&!(data[i]===255&&data[i+1]===255&&data[i+2]===255))throw Error('Protected white knockout contains nonwhite source color; cannot certify a flat proposed palette');}
 if(acceptance?.kind!=='accepted-brand-artwork'||acceptance.approved!==true||acceptance.sourceRole!=='artwork'||acceptance.sourceLimited||acceptance.pending||!['accepted-artwork-alpha','accepted-foreground-mask'].includes(acceptance.maskBasis))throw Error('Only already accepted complete brand artwork can be adapted; never photos or pending proposals');
 if(!/^[a-f0-9]{64}$/i.test(acceptance.sourceSHA256||'')||!Number.isInteger(acceptance.operationId)||!Number.isInteger(acceptance.designRevision)||acceptance.operationId!==current?.operationId||acceptance.designRevision!==current?.designRevision||acceptance.sourceSHA256!==current?.sourceSHA256||current.status!=='ready'||current.approved!==true)throw Error('Stale artwork acceptance');
 // Keep genuine antialias coverage at a mask edge, but do not label an
 // interior opacity ramp 'flat'. Flattening that ramp would change geometry
 // or invent an unapproved tram process, so this adapter declines it.
 for(let p=0;p<mask.length;p++){const alpha=data[p*4+3];if(!mask[p]||alpha===0||alpha===255)continue;const x=p%width,y=Math.floor(p/width);let edge=false;for(let dy=-2;dy<=2&&!edge;dy++)for(let dx=-2;dx<=2&&!edge;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height||!mask[yy*width+xx]||data[(yy*width+xx)*4+3]===0)edge=true;}if(!edge)throw Error('Interior opacity tint/ramp needs separate producer review; alpha will not be flattened');}
 const sourcePixelSHA256=digest(data),maskSHA256=digest(mask);
 if(acceptance.pixelSHA256!==sourcePixelSHA256||acceptance.maskSHA256!==maskSHA256||acceptance.whiteMaskSHA256!==(whiteKnockoutMask?digest(whiteKnockoutMask):null))throw Error('Acceptance does not match current pixels and masks');
 if(!Array.isArray(targetPalette)||!targetPalette.length||targetPalette.some(c=>!/^#[0-9a-f]{6}$/i.test(c))||!/^#[0-9a-f]{6}$/i.test(groundRgb))throw Error('Explicit proposed palette and ground required');
 const palette=[...new Set(targetPalette.map(c=>c.toLowerCase()))];
 // Existing white stays substrate. Quantizing a nonwhite mark to white could
 // erase its visible geometry, so this bounded adapter does not offer that move.
 if(palette.includes('#ffffff'))throw Error('White is a protected substrate knockout, not a target ink for this adapter');
 const proposedInks=[...new Set(palette.concat(groundRgb.toLowerCase()==='#ffffff'?[]:[groundRgb.toLowerCase()]))];
 if(proposedInks.length>Policy.MAX_SPOT_INKS)throw Error('Proposed palette plus colored ground exceeds three inks');
 const ground=rgb(groundRgb);
 for(let p=0;p<mask.length;p++){const i=p*4;if(mask[p]||!data[i+3]||whiteKnockoutMask?.[p])continue;const white=data[i]===255&&data[i+1]===255&&data[i+2]===255;if(!white&&!ground.every((v,k)=>v===data[i+k]))throw Error('Accepted mask omits visible nonwhite source content');}
 const colors=palette.map(rgb),output=new Uint8ClampedArray(data),used=new Set();let changedPixels=0,retainedWhitePixels=0;
 for(let p=0;p<mask.length;p++){const i=p*4;if(!mask[p]||!data[i+3])continue;if(whiteKnockoutMask?.[p]||(data[i]===255&&data[i+1]===255&&data[i+2]===255)){retainedWhitePixels++;continue;}
  let best=0,distance=Infinity;for(let n=0;n<colors.length;n++){const d=colors[n].reduce((sum,v,k)=>sum+(v-data[i+k])**2,0);if(d<distance){distance=d;best=n;}}
  used.add(palette[best]);if(colors[best].some((v,k)=>v!==data[i+k]))changedPixels++;for(let k=0;k<3;k++)output[i+k]=colors[best][k];
 }
 const actualProposedPalette=[...new Set([...used,...(groundRgb.toLowerCase()==='#ffffff'?[]:[groundRgb.toLowerCase()])])];
 const metadata={method:'accepted-artwork-flat-color-proposal-v1',sourceSHA256:acceptance.sourceSHA256,sourcePixelSHA256,maskSHA256,operationId:acceptance.operationId,sourceDesignRevision:acceptance.designRevision,width,height,targetPalette:palette,actualProposedPalette,groundRgb:groundRgb.toLowerCase(),originalKnownActualInkCount,outputSHA256:digest(output)};
 const proposalId=digest(JSON.stringify(metadata));
 return {data:output,originalData:new Uint8ClampedArray(data),...metadata,proposalId,status:'proposed-design',customerApprovalRequired:true,approvalBinding:{proposalId,sourceSHA256:acceptance.sourceSHA256,operationId:acceptance.operationId,sourceDesignRevision:acceptance.designRevision,requiresNewDesignRevision:true},sourceOriginalPreserved:true,alphaUnchanged:true,changedPixels,retainedWhitePixels,whiteIsSubstrate:true,proposedInkCount:actualProposedPalette.length,physicalInkCountConfirmed:false,commercialPermission:false,originalOverLimitStillContact:Number.isInteger(originalKnownActualInkCount)&&originalKnownActualInkCount>3,financialPolicy:Policy.evaluate({sourceRole:'adapted-proposal',originalKnownActualInkCount,artwork:{content:'flat-colors'},inkEvidence:'unknown'}),limitations:['A proposed flat-color reinterpretation, not the original design','RGB nearest-color mapping is not physical spot separation or tram simulation','No new stroke, OCR, missing-geometry completion, extraction or photo relighting','Source alpha and protected white holes remain unchanged; color boundaries may change','Customer approval must bind this proposal to a new current design revision; producer review remains separate']};
}
module.exports={propose,digest};
