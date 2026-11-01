/* Source-derived flat-color DESIGN proposal. Never an assertion about original inks. */
(function(root){'use strict';
const hue=c=>{const hi=Math.max(...c),lo=Math.min(...c),d=hi-lo;if(!d)return 0;return ((hi===c[0]?(c[1]-c[2])/d:hi===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4)*60+360)%360;};
const gap=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
const luminance=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const hex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
// Positive shape evidence, not filename/source-role inference: one compact,
// nonrectangular connected mark, with a clear outside carrier. No row extraction.
function compactMark(data,w,h){
 const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let total=0,border=0,clear=0;
 for(let p=0;p<w*h;p++){const i=p*4,x=p%w,y=Math.floor(p/w),r=data[i],g=data[i+1],b=data[i+2],ink=data[i+3]>=128&&(Math.min(r,g,b)<238||Math.max(r,g,b)-Math.min(r,g,b)>5);if(ink){mask[p]=1;total++;}if(x===0||y===0||x===w-1||y===h-1){border++;if(!ink)clear++;}}
 if(!total||clear/border<.98)return {passed:false,reason:'clear-carrier-border-required'};
 let dominant=null;
 for(let p=0;p<w*h;p++){if(!mask[p]||seen[p])continue;let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0;queue[0]=p;seen[p]=1;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const j of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(j>=0&&mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}
  if(!dominant||tail>dominant.size)dominant={size:tail,minX,minY,maxX,maxY};
 }
 const occupancy=dominant.size/((dominant.maxX-dominant.minX+1)*(dominant.maxY-dominant.minY+1)),retained=dominant.size/total,aspect=(dominant.maxX-dominant.minX+1)/(dominant.maxY-dominant.minY+1);
 return {passed:retained>=.96&&occupancy>=.50&&occupancy<=.90&&aspect>=.4&&aspect<=2.5,reason:'compact-single-mark-required',occupancy,dominantFraction:retained};
}
function proposePixels(data,width,height){
 const decline=reason=>({applied:false,reason});
 if(!(data instanceof Uint8ClampedArray)||!Number.isInteger(width)||!Number.isInteger(height)||width<5||height<5||width*height>4000000||data.length!==width*height*4)return decline('unsupported-source-size');
 for(let p=0;p<width*height;p++){const alpha=data[p*4+3];if(alpha===0||alpha===255)continue;const x=p%width,y=Math.floor(p/width);let edge=false;for(let dy=-2;dy<=2&&!edge;dy++)for(let dx=-2;dx<=2&&!edge;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height||data[(yy*width+xx)*4+3]===0)edge=true;}if(!edge)return decline('interior-opacity-ramp-needs-review');}
 const shape=compactMark(data,width,height);if(!shape.passed)return decline(shape.reason);
 const n=width*height,bins=Array.from({length:24},()=>[]),neutral=[];let visible=0,white=0;
 const color=p=>[data[p*4],data[p*4+1],data[p*4+2]];
 const isWhite=c=>Math.min(...c)>=238&&Math.max(...c)-Math.min(...c)<=5;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,i=p*4,c=color(p);if(!data[i+3])continue;visible++;if(isWhite(c)){white++;continue;}
  const hi=Math.max(...c),chroma=hi-Math.min(...c);
  // Independent flat gray cores are not JPEG edges or black outlines.
  if(data[i+3]===255&&chroma<18&&hi>=85&&hi<238&&x>=2&&y>=2&&x<width-2&&y<height-2){let stable=true;for(let dy=-2;dy<=2&&stable;dy++)for(let dx=-2;dx<=2&&stable;dx++){const q=((y+dy)*width+x+dx)*4;if(data[q+3]!==255||[0,1,2].some(k=>Math.abs(data[q+k]-c[k])>3))stable=false;}if(stable)return decline('independent-gray-core-needs-review');}
  if(chroma<30||hi<45){neutral.push(p);continue;}
  // Learn hue families only from local cores, not interpolated edge mixtures.
  if(data[i+3]<250||x<1||y<1||x>=width-1||y>=height-1)continue;
  let core=true;for(const q of [p-1,p+1,p-width,p+width])if(data[q*4+3]<250||Math.hypot(...color(q).map((v,k)=>v-c[k]))>25)core=false;
  if(core)bins[Math.floor((hue(c)+7.5)%360/15)].push(p);
 }
 if(!visible||white/visible>.98)return decline('insufficient-color-artwork');
 const ranked=bins.map((points,k)=>({points,hue:k*15})).filter(b=>b.points.length>=8).sort((a,b)=>b.points.length-a.points.length||a.hue-b.hue),families=[];
 for(const bin of ranked){let family=families.find(f=>gap(f.hue,bin.hue)<=38);if(!family){family={hue:bin.hue,points:[]};families.push(family);}for(const p of bin.points)family.points.push(p);}
 if(!families.length||families.length>3)return decline('distinct-chromatic-families-over-limit');
 if(families.some(f=>f.points.length<Math.max(12,visible*.0001)))return decline('minor-chromatic-family-needs-review');
 const colors=families.map(f=>[0,1,2].map(k=>median(f.points.map(p=>data[p*4+k]))));
 let darkest=colors.reduce((best,c,k)=>luminance(c)<luminance(colors[best])?k:best,0);
 // Dark neutral edges can share an existing dark chromatic ink ONLY in this
 // new, explicitly labelled adaptation. Never revise the source ink estimate.
 const hasDarkNeutral=neutral.some(p=>Math.max(...color(p))<85);
 if(hasDarkNeutral&&luminance(colors[darkest])>=100){if(colors.length===3)return decline('no-dark-ink-for-neutral-outlines');const points=neutral.filter(p=>Math.max(...color(p))<85);colors.push([0,1,2].map(k=>median(points.map(p=>data[p*4+k]))));darkest=colors.length-1;}
 const output=new Uint8ClampedArray(data),used=new Set();let changedPixels=0,whitePixels=0;
 for(let p=0;p<n;p++){const i=p*4;if(!data[i+3])continue;const c=color(p),hi=Math.max(...c),chroma=hi-Math.min(...c);let target;
  if(c.every(v=>v===255)){target=[255,255,255];whitePixels++;}
  else if((hi>=150&&chroma<18)||(Math.min(...c)>=215&&chroma<45)){
   // A pale compression/highlight pixel may share a nearby light source hue.
   // Exact white holes remain white; no dilation, inpainting or alpha change.
   const x=p%width,y=Math.floor(p/width);let witness=-1,bestDistance=Infinity;
   for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const xx=x+dx,yy=y+dy,d=dx*dx+dy*dy;if(xx<0||yy<0||xx>=width||yy>=height||d>=bestDistance)continue;const q=yy*width+xx,v=color(q);if(data[q*4+3]<250||Math.max(...v)-Math.min(...v)<35||luminance(v)<140)continue;const angle=hue(v),k=families.reduce((best,f,j)=>gap(f.hue,angle)<gap(families[best].hue,angle)?j:best,0);if(luminance(colors[k])>=140){witness=k;bestDistance=d;}}
   target=witness>=0?colors[witness]:[255,255,255];if(witness<0)whitePixels++;
  }
  else if(chroma<12||hi<35)target=colors[darkest];
  else {const angle=hue(c);let index=families.reduce((best,f,k)=>gap(f.hue,angle)<gap(families[best].hue,angle)?k:best,0);if(gap(families[index].hue,angle)>45&&data[i+3]>=250){const x=p%width,y=Math.floor(p/width);for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1]]){let coherent=true;for(let step=1;step<4;step++){const xx=x+dx*step,yy=y+dy*step;if(xx<0||yy<0||xx>=width||yy>=height){coherent=false;break;}const q=yy*width+xx;if(data[q*4+3]<250||Math.hypot(...color(q).map((v,k)=>v-c[k]))>15){coherent=false;break;}}if(coherent)return decline('minor-independent-hue-needs-review');}}target=colors[index];}
  if(target.some((v,k)=>v!==c[k]))changedPixels++;output.set(target,i);if(target[0]!==255||target[1]!==255||target[2]!==255)used.add(hex(target));
 }
 const palette=[...used];if(palette.length!==colors.length||palette.length>3)return decline('palette-family-loss');
 return {applied:true,data:output,originalData:new Uint8ClampedArray(data),metadata:{method:'source-flat-flexo-proposal-v1',width,height,shapeEvidence:shape,actualProposedPalette:palette,proposedInkCount:palette.length,whiteIsSubstrate:true,alphaUnchanged:true,sourceOriginalPreserved:true,customerApprovalRequired:true,commercialPermission:false,physicalInkCountConfirmed:false,changedPixels,whitePixels,neutralEdgesShareDarkInk:hasDarkNeutral,limitations:['New flat-color design proposal, not original ink count or print master','Source pixel positions and alpha retained; gradients and texture are flattened','Near-white JPEG tones become substrate white; dark outlines share the darkest proposed ink','Customer approval of this output and separate producer review required']}};
}
async function digest(bytes){const value=await root.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(value),v=>v.toString(16).padStart(2,'0')).join('');}
async function propose(data,width,height,options={}){if(!/^[a-f0-9]{64}$/i.test(options.sourceSHA256||''))return {applied:false,reason:'source-hash-required'};const result=proposePixels(data,width,height);if(!result.applied)return result;result.metadata=Object.freeze({...result.metadata,sourceSHA256:options.sourceSHA256,sourcePixelSHA256:await digest(result.originalData),outputPixelSHA256:await digest(result.data),actualProposedPalette:Object.freeze(result.metadata.actualProposedPalette)});return result;}
const api=Object.freeze({propose,proposePixels});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FlexoDesignProposal=api;
})(typeof globalThis!=='undefined'?globalThis:this);
