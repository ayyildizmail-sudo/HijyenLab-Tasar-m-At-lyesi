/* Review-only localized marking proposals. No OCR, brand recognition, or physical-plane claim. */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./ink-extraction.js'):root.LocalInkExtraction;
const F=typeof module!=='undefined'?require('./photo-fidelity.js'):root.PhotoFidelity;
function propose(data,w,h,sourceW=w,sourceH=h){
 if(![w,h,sourceW,sourceH].every(x=>Number.isSafeInteger(x)&&x>0)||w*h>1e6||data.length!==w*h*4)return [];
 const n=w*h,lum=Float32Array.from({length:n},(_,i)=>(data[i*4]+data[i*4+1]+data[i*4+2])/3),r=Math.max(2,Math.round(Math.max(w,h)/120)),bg=E.filter(E.filter(lum,w,h,r),w,h,r,false);
 const mask=Uint8Array.from(lum,(l,i)=>bg[i]-l>20&&(Math.max(data[i*4],data[i*4+1],data[i*4+2])-Math.min(data[i*4],data[i*4+1],data[i*4+2])>28||l<100)?1:0);
 // Texture-aware substrate evidence only: final mask and lettering use original pixels.
 const smooth=new Float32Array(n);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0,count=0;for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){sum+=lum[yy*w+xx];count++;}smooth[y*w+x]=sum/count;}
 const surfaceBg=E.filter(E.filter(smooth,w,h,r),w,h,r,false);
 const allParts=E.components(mask,w,h).filter(p=>p.pts.length>=3),denseBlocks=allParts.filter(p=>{const a=p.box[2]-p.box[0],b=p.box[3]-p.box[1];return Math.min(a,b)>20&&Math.max(a,b)/Math.min(a,b)<1.5&&p.pts.length/(a*b)>.3;}),parts=allParts.filter(p=>!denseBlocks.some(q=>p.box[0]>=q.box[0]-2&&p.box[1]>=q.box[1]-2&&p.box[2]<=q.box[2]+2&&p.box[3]<=q.box[3]+2)),clean=new Uint8Array(n);for(const p of parts)for(const i of p.pts)clean[i]=1;
 const groups=[...E.detect(data,w,h).map(p=>({...p,existingDetector:true})),...E.components(E.filter(clean,w,h,r+1),w,h)],out=[];
 for(const group of groups){
  const [x0,y0,x1,y1]=group.box,bw=x1-x0,bh=y1-y0;if(Math.min(bw,bh)<20||Math.max(bw,bh)/Math.min(bw,bh)>5||Math.min(x0,y0,w-x1,h-y1)<r||bw*bh>n*.3)continue;
  const members=parts.filter(p=>p.box[0]>=x0&&p.box[1]>=y0&&p.box[2]<=x1&&p.box[3]<=y1),ink=members.reduce((s,p)=>s+p.pts.length,0);if(members.length<3||ink<60||ink/(bw*bh)<.025||ink/(bw*bh)>.4)continue;
  // Dense matrix-like blocks are not silently treated as branding or removed from a group.
  if(members.some(p=>{const a=p.box[2]-p.box[0],b=p.box[3]-p.box[1];return p.pts.length>ink*.45&&p.pts.length/(a*b)>.4&&Math.max(a,b)/Math.min(a,b)<1.6;}))continue;
  if(denseBlocks.some(p=>Math.max(x0,p.box[0])<Math.min(x1,p.box[2])&&Math.max(y0,p.box[1])<Math.min(y1,p.box[3])))continue;
  let light=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*w+x,j=i*4;if(lum[i]>115&&Math.max(data[j],data[j+1],data[j+2])-Math.min(data[j],data[j+1],data[j+2])<65)light++;}if(light/(bw*bh)<.78)continue;
  let border=0,quiet=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(x<x0+2||x>=x1-2||y<y0+2||y>=y1-2){const i=y*w+x,j=i*4;border++;if(lum[i]>115&&surfaceBg[i]-smooth[i]<18&&Math.max(data[j],data[j+1],data[j+2])-Math.min(data[j],data[j+1],data[j+2])<65)quiet++;}
  if(quiet/Math.max(1,border)<.92)continue;
  const box=[Math.floor(x0*sourceW/w),Math.floor(y0*sourceH/h),Math.ceil(x1*sourceW/w),Math.ceil(y1*sourceH/h)];if((box[2]-box[0])*(box[3]-box[1])>4e6)continue;
  if(out.some(p=>{const b=p.box,intersection=Math.max(0,Math.min(b[2],box[2])-Math.max(b[0],box[0]))*Math.max(0,Math.min(b[3],box[3])-Math.max(b[1],box[1]));return intersection/Math.min((b[2]-b[0])*(b[3]-b[1]),(box[2]-box[0])*(box[3]-box[1]))>.8;}))continue;
  out.push({box,sourceWidth:sourceW,sourceHeight:sourceH,method:'light-surface-localized-marking',methodVersion:'1',sourceCoordinates:'browser-decoded',componentCount:members.length,quietBorderRatio:quiet/border,limitations:['Review-only marking proposal, not semantic brand recognition.','No perspective or curved-surface correction; photographed geometry retained.','White-ground preview only; all words and symbols require comparison.']});
 }
 return out;
}
function extractCrop(raw,w,h,candidate){
 if(raw.length!==w*h*4||w!==candidate.box[2]-candidate.box[0]||h!==candidate.box[3]-candidate.box[1]||w*h>4e6)return {ok:false,reason:'ROI mismatch or budget'};
 const result=F.matte(raw,w,h);if(!E.preservesChromaticInk(raw,result.data,w,h))return {ok:false,reason:'Chromatic component loss'};
 let retained=0,boundary=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(result.data[(y*w+x)*4+3]>100){retained++;if(x<2||y<2||x>=w-2||y>=h-2)boundary++;}}
 if(retained<30||retained>w*h*.5||boundary>Math.max(3,retained*.002))return {ok:false,reason:'Empty, overfilled, or clipped marking'};
 return {...result,ok:true,width:w,height:h,metadata:{...candidate,status:'needs-selection',candidates:[candidate],maskBasis:'Source-resolution local substrate/foreground estimate; no redrawn letters',transformOrder:['browser-decode','local-contrast marking proposal','source-resolution ROI','local alpha estimate','review before placement'],limitations:[...candidate.limitations,...result.limitations]}};
}
const api={propose,extractCrop};if(typeof module!=='undefined')module.exports=api;else root.LightSurface=api;
})(typeof globalThis!=='undefined'?globalThis:this);
