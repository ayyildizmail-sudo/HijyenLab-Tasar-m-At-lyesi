/* Refine an already detected colored-carrier proposal at source resolution.
 * Not semantic recognition. The bounded two-ink/carrier model is approximate. */
(function(root){'use strict';
const MAX_ROI_PIXELS=4000000;
function validRGB(a){return Array.isArray(a)&&a.length===3&&a.every(v=>Number.isFinite(v)&&v>=0&&v<=255);}
function validModel(m){return m&&m.modelVersion===1&&Number.isSafeInteger(m.width)&&Number.isSafeInteger(m.height)&&m.width>0&&m.height>0&&m.width*m.height<=1440000&&m.support?.length===m.width*m.height&&validRGB(m.background)&&validRGB(m.ink)&&validRGB(m.whiteInk);}
function plan(detection,sourceWidth,sourceHeight){
 const m=detection?.refinement,b=detection?.box;
 if(!validModel(m)||![sourceWidth,sourceHeight].every(v=>Number.isSafeInteger(v)&&v>0)||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]<0||b[1]<0||b[2]>m.width||b[3]>m.height||b[2]<=b[0]||b[3]<=b[1])return null;
 const sx=sourceWidth/m.width,sy=sourceHeight/m.height;
 const box=[Math.max(0,Math.floor(b[0]*sx)),Math.max(0,Math.floor(b[1]*sy)),Math.min(sourceWidth,Math.ceil(b[2]*sx)),Math.min(sourceHeight,Math.ceil(b[3]*sy))];
 const width=box[2]-box[0],height=box[3]-box[1];if(width*height>MAX_ROI_PIXELS)return null;
 return{box,width,height,sourceWidth,sourceHeight,analysisWidth:m.width,analysisHeight:m.height};
}
function refine(data,width,height,p,m){
 if(!validModel(m)||!p||![p.sourceWidth,p.sourceHeight,p.width,p.height].every(n=>Number.isSafeInteger(n)&&n>0)||!Array.isArray(p.box)||p.box.length!==4||!p.box.every(Number.isSafeInteger)||p.box[0]<0||p.box[1]<0||p.box[2]>p.sourceWidth||p.box[3]>p.sourceHeight||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>MAX_ROI_PIXELS||data.length!==width*height*4||p.width!==width||p.height!==height||p.box[2]-p.box[0]!==width||p.box[3]-p.box[1]!==height||p.analysisWidth!==m.width||p.analysisHeight!==m.height)return null;
 const bg=m.background,v=m.ink.map((x,k)=>x-bg[k]),z=m.whiteInk.map((x,k)=>x-bg[k]),aa=v.reduce((s,x)=>s+x*x,0),bb=z.reduce((s,x)=>s+x*x,0),ab=v.reduce((s,x,k)=>s+x*z[k],0),det=aa*bb-ab*ab;if(det<100)return null;
 const out=new Uint8ClampedArray(data.length);let retained=0,residualTotal=0,maxResidual=0,incompatiblePixels=0,boundaryInkPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const ax=Math.min(m.width-1,Math.max(0,Math.floor((p.box[0]+x+.5)*m.width/p.sourceWidth))),ay=Math.min(m.height-1,Math.max(0,Math.floor((p.box[1]+y+.5)*m.height/p.sourceHeight)));
  if(!m.support[ay*m.width+ax])continue;
  const j=(y*width+x)*4;if(!data[j+3])continue;
  let vd=0,zd=0;for(let k=0;k<3;k++){const d=data[j+k]-bg[k];vd+=v[k]*d;zd+=z[k]*d;}
  const c1=Math.max(0,Math.min(1,(bb*vd-ab*zd)/det)),c2=Math.max(0,Math.min(1,(aa*zd-ab*vd)/det)),alpha=Math.min(1,c1+c2);
  if(alpha<.02)continue;
  let residual=0;for(let k=0;k<3;k++){
   // Unmatting estimates edge color; opaque source cores remain exact RGB.
   out[j+k]=alpha>=.995?data[j+k]:Math.max(0,Math.min(255,(data[j+k]-bg[k]*(1-alpha))/alpha));
   residual+=(data[j+k]-(bg[k]+c1*v[k]+c2*z[k]))**2;
  }
  out[j+3]=Math.round(alpha*data[j+3]/255*255);retained++;residual=Math.sqrt(residual);residualTotal+=residual;maxResidual=Math.max(maxResidual,residual);if(alpha>.15&&residual>45)incompatiblePixels++;if(alpha>.25&&(x<2||y<2||x>=width-2||y>=height-2))boundaryInkPixels++;
 }
 if(!retained||incompatiblePixels/retained>.05||boundaryInkPixels>3)return null;
 return{data:out,width,height,background:bg.slice(),box:p.box.slice(),method:'colored-source-resolution-matte',methodVersion:'1',checks:{retainedPixels:retained,meanModelResidual:residualTotal/retained,maxModelResidual:maxResidual,incompatiblePixels,boundaryInkPixels},limitations:['Existing colored-carrier proposal, not semantic brand recognition.','Fine alpha is estimated from original source pixels; edge RGB is estimated by unmatting.','A fixed residual/boundary guard rejects obvious model mismatch or clipped support; it does not verify arbitrary extra ink, glare, white-detail completeness or physical print colors.','Planar perspective and curved packaging are not corrected by this module.'],requiresApproval:true};
}
const api={MAX_ROI_PIXELS,plan,refine};if(typeof module!=='undefined')module.exports=api;else root.ColoredFidelity=api;
})(typeof globalThis!=='undefined'?globalThis:this);
