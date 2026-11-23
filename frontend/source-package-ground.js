/* Bounded package-layout evidence, not a general scene/brand recognizer.
 * A colored rectangle alone is NEVER package evidence. Require an independent
 * sealed-packet silhouette and a second matching layout/packet region.
 * Read-only pixels; no masking, recoloring, or generated brand details. */
/* eslint-disable @typescript-eslint/no-require-imports -- Shared browser/CommonJS pure pixel module, exercised directly by Node regression tests. */
(function(root){'use strict';
const B=typeof module!=='undefined'&&module.exports?require('./background.js'):root.BackgroundAnalysis;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const median=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
const hex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
function foregroundBounds(data,w,h,detection){
 if(!data||data.length!==w*h*4||w<32||h<32||w*h>160000||detection?.kind!=='color'||!/^#[a-f0-9]{6}$/i.test(detection.color||''))return null;
 const rgb=[1,3,5].map(i=>parseInt(detection.color.slice(i,i+2),16));let left=w,top=h,right=0,bottom=0,count=0;
 // Intentionally low threshold: include faint solid details, white holes and
 // antialias fringes. Noise can make this decline; it must never justify deleting
 // pixels. The full original raster remains the drawn source, not this box.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(data[i+3]<250)return null;if(distance([data[i],data[i+1],data[i+2]],rgb)>8){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);count++;}}
 if(count<12||count>w*h*.35||left<2||top<2||right>w-2||bottom>h-2||right-left<4||bottom-top<4)return null;
 return {left:Math.max(0,left-2),top:Math.max(0,top-2),right:Math.min(w,right+2),bottom:Math.min(h,bottom+2)};
}
function canonicalGroundPalette(data,w,h,estimate,background){
 // One physical role can acquire a one-channel difference between an edge
 // median and a JPEG/core cluster centroid. Alias ONLY that independently
 // supported exterior role; never change pixels, force a count, or merge inks.
 if(!estimate||estimate.uncertain!==false||estimate.method!=='accepted-artwork-core-palette'||estimate.contentEvidence?.content!=='flat-colors'||!Array.isArray(estimate.colors)||estimate.count!==estimate.colors.length||!/^#[a-f0-9]{6}$/i.test(background||'')||!data||data.length!==w*h*4||!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||w*h>4000000)return estimate;
 const parse=c=>typeof c==='string'&&/^#[a-f0-9]{6}$/i.test(c)?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):null,ground=parse(background),palette=estimate.colors.map(parse);if(palette.some(c=>!c)||Math.min(...ground)>230)return estimate;
 const near=palette.map((c,i)=>({i,delta:distance(c,ground)})).filter(v=>v.delta<=32);if(near.length!==1||near[0].delta===0||near[0].delta>4)return estimate;
 const scale=Math.min(1,320/Math.max(w,h)),sw=Math.round(w*scale),sh=Math.round(h*scale),sample=new Uint8ClampedArray(sw*sh*4);
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const sx=Math.min(w-1,Math.floor((x+.5)*w/sw)),sy=Math.min(h-1,Math.floor((y+.5)*h/sh));sample.set(data.subarray((sy*w+sx)*4,(sy*w+sx)*4+4),(y*sw+x)*4);}
 const detection=B.analyze(sample,sw,sh);if(detection.kind!=='color'||detection.maskAllowed===false||detection.confidence<.985||detection.connected<.65||distance(detection.rgb,ground)>4)return estimate;
 const selected=near[0].i,colors=estimate.colors.slice();colors[selected]=background.toLowerCase();
 return {...estimate,colors,sampledColors:estimate.colors.slice(),groundRole:{basis:'source-connected-exterior-core-identity',sampledColor:estimate.colors[selected],canonicalColor:background.toLowerCase(),maxRGBDelta:4,preserveSourcePixels:true,physicalInksConfirmed:false}};
}
// An appearance recommendation, NOT evidence of the original package. The
// normal front-appearance approval and an alternative local-panel view remain
// authoritative. Only an opaque, flat, edge-to-edge field is eligible.
function nativeProposal(data,w,h,detection){
 // Halkayla bölünmüş rozet dış zemini "bağlı zemin" oranını düşürür; yalnız bu doğrulanmış durumda oran şartı aranmaz.
 const badgeCandidate=data&&data.length===w*h*4&&detection?.kind==='color'&&detection.connected<.65&&root.FrameTrim?.badgeGround?root.FrameTrim.badgeGround(data,w,h):null;
 if(!data||data.length!==w*h*4||w<32||h<32||w*h>160000||detection?.kind!=='color'||detection.maskAllowed===false||(detection.connected<.65&&!badgeCandidate)||!/^#[a-f0-9]{6}$/i.test(detection.color||''))return null;
 const flat=B.inspectFlatGraphic(data,w,h);if(!flat.flatGraphic)return null;
 const rgb=[1,3,5].map(i=>parseInt(detection.color.slice(i,i+2),16));let edge=0,matched=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(data[i+3]<250)return null;if(x<2||y<2||x>=w-2||y>=h-2){edge++;if(distance([data[i],data[i+1],data[i+2]],rgb)<=24)matched++;}}
 const strict=detection.confidence>=.97&&matched/edge>=.985;
 let groundEvidence=null;
 let smoothLightMark=false;
 if(!strict&&Math.min(w,h)>=64&&!B.inspectSurface(data,w,h,detection).photoLike){
  let edgeTotal=0,edgeNear=0,foreground=0,lightMark=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,c=[data[i],data[i+1],data[i+2]],gap=distance(c,rgb);
   if(x<3||y<3||x>=w-3||y>=h-3){edgeTotal++;if(gap<=40)edgeNear++;}
   if(gap>48){foreground++;if(Math.min(...c)>220&&Math.max(...c)-Math.min(...c)<18)lightMark++;}
  }
  // Bounded digital light-on-color appearance proposal. No photographic
  // surface, frame, competing dark marks or arbitrary edge hue is promoted.
  smoothLightMark=edgeNear/Math.max(1,edgeTotal)>=.97&&foreground>=24&&lightMark/foreground>=.98&&foreground/(w*h)<.3;
 }
 // Yuvarlak rozet düz renkli kare zeminin ortasında: kenara bağlı zemin rozeti tamamen çevreler (frame-trim.js).
 // Ambalaj zemini olarak bu renk önerilir; rozet özgün renkleriyle korunur.
 let badgeGround=false;
 if(!strict&&!smoothLightMark&&root.FrameTrim?.badgeGround){const badge=badgeCandidate||root.FrameTrim.badgeGround(data,w,h);if(badge&&distance([1,3,5].map(i=>parseInt(badge.color.slice(i,i+2),16)),rgb)<=24){badgeGround=true;groundEvidence={basis:'badge-exterior-ground',badgeBox:badge.box};}}
 if(!strict&&!smoothLightMark&&!badgeGround){
  // A separate bounded path for tiny native artwork, NOT a relaxed global
  // border threshold. Recompute evidence from this frame (not caller metadata).
  const measured=B.analyze(data,w,h);
  if(Math.min(w,h)>=64||w*h>32000||measured.reason!=='coherent-small-flat-ground'||measured.color!==detection.color||measured.connected<.65)return null;
  const sides=[[],[],[],[]],insets=[[],[],[],[]];
  const match=(x,y)=>{const i=(y*w+x)*4;return distance([data[i],data[i+1],data[i+2]],rgb)<=24?1:0;};
  for(let x=0;x<w;x++){sides[0].push(match(x,0),match(x,1));sides[2].push(match(x,h-1),match(x,h-2));insets[0].push(match(x,2));insets[2].push(match(x,h-3));}
  for(let y=0;y<h;y++){sides[1].push(match(w-1,y),match(w-2,y));sides[3].push(match(0,y),match(1,y));insets[1].push(match(w-3,y));insets[3].push(match(2,y));}
  const fraction=a=>a.reduce((sum,v)=>sum+v,0)/a.length,coverage=sides.map(fraction),failed=coverage.map((v,i)=>v<.985?i:-1).filter(i=>i>=0);
  if(failed.length!==1||fraction(insets[failed[0]])<.985)return null;
  groundEvidence={basis:'coherent-small-flat-thin-boundary',boundarySide:['top','right','bottom','left'][failed[0]],maxBoundaryWidth:2,sideCoverage:coverage,insetCoverage:fraction(insets[failed[0]]),sourceLimited:true};
 }
 return {basis:'native-fullbleed-appearance-proposal',...(groundEvidence?{groundEvidence}: {}),...(smoothLightMark?{groundEvidence:{basis:'smooth-digital-field-with-light-mark'},appearanceOnly:true}:{}),color:detection.color.toLowerCase(),fullBleed:true,flatGraphic:true,opaque:true,sourceGroundVerified:false,preserveSourcePixels:true,width:w,height:h,foregroundBounds:foregroundBounds(data,w,h,detection)};
}
function detect(data,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<100||h<100||w*h>640*640||!data||data.length!==w*h*4)return null;
 const bins=new Map();let opaque=0;
 for(let i=0;i<w*h;i++){const j=i*4;if(data[j+3]<245)continue;opaque++;const rgb=[data[j],data[j+1],data[j+2]];if(Math.min(...rgb)>230)continue;const key=rgb.map(v=>Math.floor(v/24)).join(',');if(!bins.has(key))bins.set(key,{n:0,sum:[0,0,0]});const b=bins.get(key);b.n++;rgb.forEach((v,k)=>b.sum[k]+=v);}
 if(opaque<w*h*.98)return null;
 const colors=[];for(const b of [...bins.values()].sort((a,b)=>b.n-a.n)){if(b.n<w*h*.015)break;const rgb=b.sum.map(v=>v/b.n);if(!colors.some(c=>distance(c,rgb)<36))colors.push(rgb);if(colors.length===10)break;}
 const candidates=[];
 for(const color of colors){
  const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),regions=[];
  for(let i=0;i<w*h;i++){const j=i*4;if(data[j+3]>=245&&distance([data[j],data[j+1],data[j+2]],color)<=32)mask[i]=1;}
  for(let seed=0;seed<mask.length;seed++){
   if(!mask[seed]||seen[seed])continue;let head=0,tail=0,x0=w,y0=h,x1=0,y1=0;queue[tail++]=seed;seen[seed]=1;
   while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);for(const q of [y?p-w:-1,y<h-1?p+w:-1,x?p-1:-1,x<w-1?p+1:-1])if(q>=0&&mask[q]&&!seen[q]){seen[q]=1;queue[tail++]=q;}}
   const bw=x1-x0,bh=y1-y0,area=bw*bh;if(tail<w*h*.025||bw<30||bh<20||tail/area<.65||x0<2||y0<2||x1>w-2||y1>h-2)continue;
   const top=new Int32Array(bw).fill(h),bottom=new Int32Array(bw).fill(-1),rgb=[[],[],[]];
   for(let k=0;k<tail;k++){const p=queue[k],x=p%w-x0,y=Math.floor(p/w);top[x]=Math.min(top[x],y);bottom[x]=Math.max(bottom[x],y);if(k%7===0)for(let c=0;c<3;c++)rgb[c].push(data[p*4+c]);}
   const segment=(a,from,to)=>Array.from(a).slice(Math.floor(bw*from),Math.max(Math.floor(bw*from)+1,Math.ceil(bw*to)));
   const t=median(segment(top,.3,.7)),b=median(segment(bottom,.3,.7));
   const ends=[[.005,.06],[.94,.995]].map(([l,r])=>({top:median(segment(top,l,r)),bottom:median(segment(bottom,l,r))}));
   const packet=bw/bh>=1.5&&bw/bh<=5&&ends.every(e=>t-e.top>=bh*.025&&e.bottom-b>=bh*.025&&t-e.top<bh*.24&&e.bottom-b<bh*.24);
   const rectangle=tail/area>.85&&median(Array.from(top).map(y=>Math.abs(y-y0)))<=2&&median(Array.from(bottom).map(y=>Math.abs(y-(y1-1))))<=2;
   regions.push({box:[x0,y0,x1,y1],area,coverage:tail/area,packet,rectangle,rgb:rgb.map(median)});
  }
  const packets=regions.filter(r=>r.packet);if(!packets.length)continue;
  for(const packet of packets){const corroboration=regions.filter(r=>r!==packet&&(r.packet||r.rectangle)&&r.area>=packet.area*.45&&r.area<=packet.area*5&&distance(r.rgb,packet.rgb)<=24);if(corroboration.length)candidates.push({packet,corroboration});}
 }
 if(!candidates.length)return null;
 // Different package colors on one proof are genuinely ambiguous.
 if(candidates.some(c=>distance(c.packet.rgb,candidates[0].packet.rgb)>24))return null;
 const best=candidates.sort((a,b)=>b.packet.area-a.packet.area)[0];
 return {scope:'package',basis:'detected-product-layout',color:hex(best.packet.rgb),verifiedGeometry:true,confidence:'bounded-layout',width:w,height:h,carrierBoxes:[best.packet.box,...best.corroboration.filter(r=>r.packet).map(r=>r.box)],corroboratingRegions:best.corroboration.map(r=>({box:r.box,kind:r.packet?'sealed-packet':'flat-layout',color:hex(r.rgb)})),preserveSourcePixels:true};
}
function prepareTechnicalProof(image,createCanvas){
 if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width*image.height>4000000)return null;
 const scale=Math.min(1,640/Math.max(image.width,image.height)),scan=createCanvas(Math.round(image.width*scale),Math.round(image.height*scale)),sc=scan.getContext('2d');sc.drawImage(image,0,0,scan.width,scan.height);
 const sourcePixels=sc.getImageData(0,0,scan.width,scan.height).data,evidence=detect(sourcePixels,scan.width,scan.height);
 // The flat layout is independent document evidence. Two objects in a scene
 // alone are not permission to select one or paste photographic surroundings.
 if(!evidence||!evidence.corroboratingRegions.some(r=>r.kind==='flat-layout'))return null;
 const candidates=[];let uncertain=false;
 for(const carrier of evidence.carrierBoxes){
  const cw=carrier[2]-carrier[0],ch=carrier[3]-carrier[1];
  // Interior straight body only: exclude seals and exterior gray page/shadow.
  // Never infer missing marks beyond the body or silently clip touching ink.
  const box=[carrier[0]+cw*.08,carrier[1]+ch*.15,carrier[2]-cw*.08,carrier[3]-ch*.15].map((v,i)=>Math.round(v*(i%2?image.height/scan.height:image.width/scan.width)));
  // Verify that the chosen straight body does not leave other markings on the
  // seals/shoulders. The enclosing field determines silhouette interior; gray
  // document exterior is excluded, but contrasting interior marks are retained.
  const ground=[1,3,5].map(i=>parseInt(evidence.color.slice(i,i+2),16)),scanBox=box.map((v,i)=>v*(i%2?scan.height/image.height:scan.width/image.width));let outsideMarks=0;
  for(let x=carrier[0]+2;x<carrier[2]-2;x++){let top=-1,bottom=-1;for(let y=carrier[1];y<carrier[3];y++){const i=(y*scan.width+x)*4;if(distance([sourcePixels[i],sourcePixels[i+1],sourcePixels[i+2]],ground)<=24){if(top<0)top=y;bottom=y;}}if(top<0)continue;for(let y=top+2;y<bottom-1;y++){if(x>=scanBox[0]&&x<scanBox[2]&&y>=scanBox[1]&&y<scanBox[3])continue;const i=(y*scan.width+x)*4;if(distance([sourcePixels[i],sourcePixels[i+1],sourcePixels[i+2]],ground)>24)outsideMarks++;}}
  if(outsideMarks>4){uncertain=true;continue;}
  const out=createCanvas(box[2]-box[0],box[3]-box[1]),oc=out.getContext('2d');oc.drawImage(image,box[0],box[1],out.width,out.height,0,0,out.width,out.height);
  const ratio=Math.min(1,320/Math.max(out.width,out.height)),small=createCanvas(Math.round(out.width*ratio),Math.round(out.height*ratio)),c=small.getContext('2d');c.drawImage(out,0,0,small.width,small.height);const data=c.getImageData(0,0,small.width,small.height).data,detection=B.analyze(data,small.width,small.height);
  if(detection.kind!=='color'||detection.confidence<.97||detection.connected<.65||distance(detection.rgb,[1,3,5].map(i=>parseInt(evidence.color.slice(i,i+2),16)))>24){uncertain=true;continue;}
  let contrast=0;for(let i=0;i<data.length;i+=4)if(distance([data[i],data[i+1],data[i+2]],detection.rgb)>24)contrast++;
  if(contrast<12)continue; // genuinely blank reverse face, not a design choice
  const bounds=foregroundBounds(data,small.width,small.height,detection);
  if(!bounds||!B.inspectFlatGraphic(data,small.width,small.height).flatGraphic){uncertain=true;continue;}
  candidates.push({canvas:out,box,background:detection.color,carrierBox:carrier.map((v,i)=>v*(i%2?image.height/scan.height:image.width/scan.width)),foregroundBounds:bounds,foregroundFrame:{width:small.width,height:small.height}});
 }
 if(uncertain||candidates.length!==1)return {needsSelection:true,basis:'technical-proof-competing-or-uncertain-marked-faces',candidates:candidates.map(({box,background})=>({box,background})),evidence};
 const result=candidates[0];return {...result,evidence,processing:{method:'technical-proof-single-marked-packet-body',methodVersion:'1',box:result.box,carrierBox:result.carrierBox,sourceCoordinates:'browser-decoded',preserveSourcePixels:true,automaticSelectionBasis:'Only one independently bounded packet body has retained flat markings; blank reverse excluded.',appearanceApprovalRequired:true,limitations:['Bounded technical-proof layout, not semantic business-name recognition.','Original packet-body pixels retained; compare all business markings before appearance approval.']}};
}
const api=Object.freeze({detect,nativeProposal,foregroundBounds,prepareTechnicalProof,canonicalGroundPalette});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SourcePackageGround=api;
})(typeof globalThis!=='undefined'?globalThis:this);
