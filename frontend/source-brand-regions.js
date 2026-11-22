/* Independent source-region evidence. Regions are proposals, never semantic or print certification. */
(function(root){'use strict';
const node=typeof module!=='undefined',E=node?require('./ink-extraction.js'):root.LocalInkExtraction;
const VERSION=1;
const lum=(data,i)=>(data[i]+data[i+1]+data[i+2])/3;
const area=b=>(b[2]-b[0])*(b[3]-b[1]);
const overlap=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
function frameSupport(data,w,h,box){
 const cx=(box[0]+box[2]-1)/2,cy=(box[1]+box[3]-1)/2,rx=(box[2]-box[0])/2,ry=(box[3]-box[1])/2,flags=[],observations=[];
 for(let i=0;i<144;i++){
  const t=i*Math.PI*2/144,cos=Math.cos(t),sin=Math.sin(t);let best=null;
  const sample=r=>{const x=Math.round(cx+rx*r*cos),y=Math.round(cy+ry*r*sin);return x>=0&&x<w&&y>=0&&y<h?{x,y,l:lum(data,(y*w+x)*4)}:null;};
  for(let r=.88;r<=1.10;r+=.008){const p=sample(r),a=sample(r-.05),b=sample(r+.05);if(!p||!a||!b)continue;const contrast=Math.min(a.l,b.l)-p.l;if(p.l<150&&(!best||contrast>best.contrast))best={...p,contrast,r};}
  const passed=!!best&&best.contrast>25;flags.push(passed);if(passed)observations.push({x:best.x,y:best.y,sector:Math.floor(i/6),contrast:best.contrast});
 }
 const sectors=Array.from({length:24},(_,s)=>flags.slice(s*6,s*6+6).filter(Boolean).length),supported=flags.filter(Boolean).length;
 return {passed:supported/144>=.9&&sectors.filter(n=>n>=3).length>=23,fraction:supported/144,sectors:sectors.filter(n=>n>=3).length,observations,proposalEllipse:{cx,cy,rx,ry},basis:'observed-dark-local-contrast-outline-not-reconstructed',shapeReconstructed:false};
}
function detect(data,w,h,{sourceIdentity=null}={}){
 if(!data||data.length!==w*h*4||w<16||h<16||w*h>1e6)return {version:VERSION,regions:[],reason:'source-raster-out-of-bounds'};
 const mask=Uint8Array.from({length:w*h},(_,i)=>data[i*4+3]>=220&&lum(data,i*4)<110?1:0),parts=E.components(mask,w,h).filter(p=>p.pts.length>=100).map(p=>({box:p.box,pixels:p.pts.length,fill:p.pts.length/area(p.box)})),arcs=parts.filter(p=>p.fill<.2&&p.box[2]-p.box[0]>=50&&p.box[3]-p.box[1]>=40&&p.box[0]>3&&p.box[1]>3&&p.box[2]<w-3&&p.box[3]<h-3);
 if(arcs.length>40)return {version:VERSION,regions:[],reason:'too-many-independent-outline-hypotheses'};
 const proposals=[];
 for(let i=0;i<arcs.length;i++)for(let j=i;j<arcs.length;j++){
  const a=arcs[i].box,b=arcs[j].box,box=[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])],bw=box[2]-box[0],bh=box[3]-box[1];
  if(bw/bh<.6||bw/bh>1.6||area(box)>w*h*.4)continue;
  const support=frameSupport(data,w,h,box);if(!support.passed)continue;
  proposals.push({box,support,anchorKind:'observed-enclosing-outline',independentOfTextCandidate:true});
 }
 proposals.sort((a,b)=>b.support.fraction-a.support.fraction||area(b.box)-area(a.box));const regions=[];
 for(const p of proposals){if(regions.some(r=>overlap(r.box,p.box)/Math.min(area(r.box),area(p.box))>.75))continue;regions.push({...p,id:'source-region-'+regions.length,sourceIdentity,sourceWidth:w,sourceHeight:h,sourceCoordinates:'analysis-raster',status:'needs_region_confirmation',automaticApprovalAllowed:false,semanticCompletenessVerified:false,contaminationVerified:false});if(regions.length>=4)break;}
 return {version:VERSION,sourceIdentity,regions,reason:regions.length?'independent-enclosed-region-proposals':'no-supported-enclosed-source-region',semanticCompletenessVerified:false};
}
function coverage(region,candidateBox){
 const valid=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>b[0]&&b[3]>b[1];
 if(!region?.independentOfTextCandidate||!valid(region.box)||!valid(candidateBox))return {status:'unknown',passed:false,reason:'independent-region-or-candidate-mapping-missing'};
 const fraction=overlap(region.box,candidateBox)/area(region.box);
 return {status:fraction>=.995?'covered':'missing',passed:fraction>=.995,fraction,sourceRegion:region.box.slice(),candidateBox:candidateBox.slice(),basis:'independently-detected-source-region-not-candidate-bounds'};
}
function assess({region,candidateBox,source,rendered,sourceIdentity,confirmed=false}={}){
 const unknown={status:'unknown',passed:false};
 const result={version:VERSION,sourceIdentity:sourceIdentity||null,coverage:{...unknown},retention:{...unknown},contamination:{...unknown},automaticApprovalAllowed:false,semanticCompletenessVerified:false};
 if(!region||!source||source.width!==region.sourceWidth||source.height!==region.sourceHeight||!sourceIdentity||sourceIdentity!==region.sourceIdentity){result.reason='source-region-identity-or-coordinate-mismatch';return result;}
 if(!Array.isArray(candidateBox)||candidateBox.length!==4){result.reason='candidate-mapping-missing';return result;}
 result.coverage=coverage(region,candidateBox);
 // No source-to-render correspondence means retention stays unknown. Do not substitute a local crop self-test.
 if(rendered&&rendered.width===source.width&&rendered.height===source.height&&rendered.data?.length===source.data.length){
  const {data,width:w}=source,[x0,y0,x1,y1]=region.box,groups=[];const dark=new Uint8Array(w*source.height),color=new Uint8Array(dark.length);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*w+x,j=i*4,r=data[j],g=data[j+1],b=data[j+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(data[j+3]<220)continue;dark[i]=lum(data,j)<100?1:0;color[i]=hi>80&&(hi-lo)/Math.max(1,hi)>.65?1:0;}
  for(const [role,mask]of [['dark-mark',dark],['chromatic-mark',color]])for(const p of E.components(mask,w,source.height)){if(p.pts.length<4)continue;const retained=p.pts.reduce((n,i)=>n+(rendered.data[i*4+3]>=128?1:0),0);groups.push({role,box:p.box,pixels:p.pts.length,retained,coverage:retained/p.pts.length});}
  result.retention={status:groups.length&&groups.every(g=>g.coverage>=.95)?'retained':'missing',passed:!!groups.length&&groups.every(g=>g.coverage>=.95),groups,basis:'independent-source-dark-and-chromatic-components-alpha-retention',limitations:['Alpha coverage does not verify letter identity, colors, thin pale marks or source legibility.']};
 }
 // Source content inside a frame can still be a menu or multiple logos. Human region confirmation does not certify extraction.
 result.contamination={status:'unknown',passed:false,regionReviewed:!!confirmed,basis:confirmed?'explicit-source-region-review-is-not-independent-contamination-proof':'no-independent-content-classification'};
 result.reason=!result.coverage.passed?'source-region-truncated':!result.retention.passed?'source-mark-retention-unverified':!result.contamination.passed?'source-region-needs-confirmation':'bounded-region-evidence-only';
 return result;
}
const api={VERSION,detect,frameSupport,coverage,assess};if(node)module.exports=api;else root.SourceBrandRegions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
