/* Whole-mark rotation from agreeing text-like component baselines; never OCR or ellipse normalization. */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./ink-extraction.js'):root.LocalInkExtraction;
function rows(data,w,h){const mask=Uint8Array.from({length:w*h},(_,i)=>data[i*4+3]>150?1:0),cs=E.components(mask,w,h).map(p=>{const[x,y,x1,y1]=p.box;return{box:p.box,x:(x+x1)/2,y:(y+y1)/2,b:y1,w:x1-x,h:y1-y,n:p.pts.length}}).filter(p=>p.n>=8&&p.h>=8&&p.h<h*.7&&p.w>p.h*.18&&p.w<p.h*2.5&&p.n/(p.w*p.h)>.07);if(cs.length>160)return [];let rows=[];for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const a=cs[i],b=cs[j];if(Math.max(a.h,b.h)/Math.min(a.h,b.h)>1.4||Math.abs(a.x-b.x)<Math.max(a.h,b.h)*1.3)continue;const slope=(b.b-a.b)/(b.x-a.x);if(Math.abs(slope)>.65)continue;const members=cs.filter(c=>Math.max(c.h,a.h)/Math.min(c.h,a.h)<1.4&&Math.abs(c.b-a.b-slope*(c.x-a.x))<a.h*.13);if(members.length<3)continue;const span=Math.max(...members.map(p=>p.x))-Math.min(...members.map(p=>p.x));if(span<a.h*2.5)continue;const unique=[...members].sort((a,b)=>a.x-b.x);if(unique.some((p,k)=>k&&p.x-unique[k-1].x<Math.min(p.w,unique[k-1].w)*.5))continue;let n=members.length,mx=members.reduce((s,p)=>s+p.x,0)/n,my=members.reduce((s,p)=>s+p.b,0)/n,sl=members.reduce((s,p)=>s+(p.x-mx)*(p.b-my),0)/members.reduce((s,p)=>s+(p.x-mx)**2,0),res=Math.sqrt(members.reduce((s,p)=>s+(p.b-my-sl*(p.x-mx))**2,0)/n);rows.push({angle:Math.atan(sl)*180/Math.PI,n,res,span,h:a.h,boxes:members.map(p=>p.box)});}return rows.sort((a,b)=>(b.n*3+b.span/b.h-b.res/b.h*10)-(a.n*3+a.span/a.h-a.res/a.h*10))}

function estimate(data,w,h){
 if(![w,h].every(n=>Number.isSafeInteger(n)&&n>0)||w*h>4e6||data.length!==w*h*4)return {ok:false,reason:'Invalid or oversized image'};
 const candidates=rows(data,w,h),unique=[];
 for(const row of candidates){if(row.n<4||row.res/row.h>.1)continue;const ids=new Set(row.boxes.map(b=>b.join(',')));if(unique.some(other=>other.boxes.some(b=>ids.has(b.join(',')))))continue;unique.push(row);}
 if(unique.length<2)return {ok:false,reason:'Fewer than two independent text-like rows',rows:unique};
 const anchor=unique[0],agree=unique.filter(r=>Math.abs(r.angle-anchor.angle)<=2);
 if(agree.length<2||unique.some(r=>r.span>anchor.span*.5&&Math.abs(r.angle-anchor.angle)>3))return {ok:false,reason:'Row orientation disagreement',rows:unique};
 const weight=agree.reduce((s,r)=>s+r.span,0),degrees=agree.reduce((s,r)=>s+r.angle*r.span,0)/weight;
 if(Math.abs(degrees)>30)return {ok:false,reason:'Orientation outside bounded near-horizontal scope',rows:agree};
 return {ok:true,degrees,radians:degrees*Math.PI/180,rows:agree,method:'independent-mark-row-baselines',methodVersion:'1',limitations:['Text-like alignment proposal; no OCR or semantic identity guarantee.','Rotation only: perspective, curvature and intended decorative slant are not reconstructed.']};
}
function correct(result){
 const estimateResult=estimate(result.data,result.width,result.height);if(!estimateResult.ok||Math.abs(estimateResult.degrees)<.75)return {...result,orientation:{...estimateResult,applied:false}};
 const w=result.width,h=result.height,angle=estimateResult.radians,c=Math.cos(angle),s=Math.sin(angle),ow=Math.ceil(Math.abs(c)*w+Math.abs(s)*h)+2,oh=Math.ceil(Math.abs(s)*w+Math.abs(c)*h)+2;if(ow*oh>4e6)return {...result,orientation:{ok:false,applied:false,reason:'Rotated canvas exceeds budget'}};
 const out=new Uint8ClampedArray(ow*oh*4);
 for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){const dx=x+.5-ow/2,dy=y+.5-oh/2,sx=c*dx-s*dy+w/2-.5,sy=s*dx+c*dy+h/2-.5,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;let alpha=0,r=0,g=0,b=0;for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=x0+xx,py=y0+yy;if(px<0||py<0||px>=w||py>=h)continue;const q=(py*w+px)*4,wt=(xx?fx:1-fx)*(yy?fy:1-fy),a=result.data[q+3]/255*wt;alpha+=a;r+=result.data[q]*a;g+=result.data[q+1]*a;b+=result.data[q+2]*a;}if(alpha){const j=(y*ow+x)*4;out[j]=r/alpha;out[j+1]=g/alpha;out[j+2]=b/alpha;out[j+3]=alpha*255;}}
 return {...result,data:out,width:ow,height:oh,orientation:{...estimateResult,applied:true,correctionDegrees:-estimateResult.degrees},metadata:{...result.metadata,orientation:{...estimateResult,applied:true,correctionDegrees:-estimateResult.degrees},transformOrder:[...(result.metadata?.transformOrder||[]),'whole-mark rotation from agreeing source-row baselines'],limitations:[...(result.metadata?.limitations||[]),...estimateResult.limitations]}};
}
const api={estimate,correct};if(typeof module!=='undefined')module.exports=api;else root.MarkOrientation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
