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
// A screenshot can contain an already extracted, but oblique, mark. An oval
// is not evidence of a circle: retain both axes and correct only measured shear.
function frameGeometry(data,w,h,options={}){
 if(![w,h].every(n=>Number.isSafeInteger(n)&&n>0)||w*h>4e6||data.length!==w*h*4)return {ok:false,reason:'Invalid or oversized image'};
 let border=0,white=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(data[i+3]!==255)return {ok:false,reason:'Affine screenshot correction requires opaque white substrate'};if(x<2||y<2||x>=w-2||y>=h-2){border++;if(Math.min(data[i],data[i+1],data[i+2])>=245)white++;}}if(white/Math.max(1,border)<.98)return {ok:false,reason:'Affine screenshot correction requires quiet white border'};
 const mask=Uint8Array.from({length:w*h},(_,i)=>data[i*4+3]>150&&Math.min(data[i*4],data[i*4+1],data[i*4+2])<(options.threshold||180)?1:0);
 const parts=E.components(mask,w,h).filter(p=>p.pts.length>=12);if(parts.length<4||parts.length>160)return {ok:false,reason:'Insufficient isolated frame evidence'};
 const x0=Math.min(...parts.map(p=>p.box[0])),x1=Math.max(...parts.map(p=>p.box[2])),y0=Math.min(...parts.map(p=>p.box[1])),y1=Math.max(...parts.map(p=>p.box[3])),bw=x1-x0,bh=y1-y0;
 const arcs=parts.filter(p=>{const a=p.box[2]-p.box[0],b=p.box[3]-p.box[1];return a>bw*(options.fragments ? .15 : .45)&&b>bh*.13&&b<bh*.48&&p.pts.length/(a*b)<(options.fragments ? .16 : .11);});
 if(!arcs.some(p=>p.box[3]<y0+bh*.48)||!arcs.some(p=>p.box[1]>y0+bh*.52))return {ok:false,reason:'No independent upper and lower frame arcs'};
 // Two separate horizontal rules provide an independent front-on axis. A
 // decorative tilted ellipse without that evidence must remain untouched.
 let ruleParts=parts;
 if(options.fragments){
  // Join only short, near-collinear rule fragments separated by small gaps.
  // This is evidence grouping; no source pixel is joined or reconstructed.
  const segments=parts.filter(p=>{const a=p.box[2]-p.box[0],b=p.box[3]-p.box[1];return a>3*b&&b<bh*.035;}).map(p=>({box:p.box.slice()})).sort((a,b)=>a.box[0]-b.box[0]),joined=[];
  for(const p of segments){const b=p.box,q=joined.find(q=>{const a=q.box;return b[0]-a[2]>=0&&b[0]-a[2]<bw*.04&&Math.abs((a[1]+a[3]-b[1]-b[3])/2)<=Math.max(2,bh*.012);});if(q)q.box=[q.box[0],Math.min(q.box[1],b[1]),b[2],Math.max(q.box[3],b[3])];else joined.push(p);}
  ruleParts=joined;
 }
 const rules=ruleParts.filter(p=>{const a=p.box[2]-p.box[0],b=p.box[3]-p.box[1];return a>bw*.15&&a>8*b&&b<bh*.05;});
 let baseline=null;for(let i=0;i<rules.length;i++)for(let j=i+1;j<rules.length;j++){const a=rules[i].box,b=rules[j].box,dx=(b[0]+b[2]-a[0]-a[2])/2,dy=(b[1]+b[3]-a[1]-a[3])/2;if(Math.abs(dx)>bw*.35&&Math.abs(dy/dx)<.025)baseline={slope:dy/dx,boxes:[a,b]};}
 if(!baseline)return {ok:false,reason:'No independent near-level rule pair'};
 const scan=Array.from({length:h},()=>[]);for(const arc of arcs)for(const i of arc.pts)scan[Math.floor(i/w)].push(i%w);
 const points=[];for(let y=0;y<h;y++){const row=scan[y];if(!row.length)continue;const lo=Math.min(...row),hi=Math.max(...row),span=hi-lo;if(span>bw*.25&&span<bw*.78)points.push({x:(lo+hi)/2,y});}
 if(points.length<Math.max(24,bh*.25)||!points.some(p=>p.y<y0+bh*.25)||!points.some(p=>p.y>y0+bh*.75))return {ok:false,reason:'Insufficient bilateral arc coverage'};
 const fit=ps=>{const n=ps.length,mx=ps.reduce((s,p)=>s+p.x,0)/n,my=ps.reduce((s,p)=>s+p.y,0)/n,shear=ps.reduce((s,p)=>s+(p.y-my)*(p.x-mx),0)/ps.reduce((s,p)=>s+(p.y-my)**2,0),residual=Math.sqrt(ps.reduce((s,p)=>s+(p.x-mx-shear*(p.y-my))**2,0)/n);return {mx,my,shear,residual};};
 let fitted=fit(points),retained=points;
 if(options.fragments){
  // Broken outer/inner strokes can disagree on a minority of scanlines.
  // Trim at most 20%, then require both distant arc bands and the original
  // strict residual bound; agreement across intensity thresholds is separate.
  retained=points.slice().sort((a,b)=>Math.abs(a.x-fitted.mx-fitted.shear*(a.y-fitted.my))-Math.abs(b.x-fitted.mx-fitted.shear*(b.y-fitted.my))).slice(0,Math.ceil(points.length*.8));
  if(!retained.some(p=>p.y<y0+bh*.25)||!retained.some(p=>p.y>y0+bh*.75))return {ok:false,reason:'Fragment inliers do not cover both arcs'};
  fitted=fit(retained);
 }
 const {my,shear,residual}=fitted,n=points.length;
 if(residual>Math.max(.9,bw*.004)||Math.abs(shear)>.3)return {ok:false,reason:'Frame is asymmetric or outside bounded affine scope',residual};
 return {ok:true,shear,centerY:my,residual,sampleRows:n,retainedRows:retained.length,baseline,method:'bilateral-frame-affine-rectification',methodVersion:'1',limitations:['Review-only affine rectification from frame symmetry and independent level rules; not recovery of an original master.','Oval proportions retained; no circle assumption, OCR, redrawing or nonlinear letter reconstruction.']};
}
function correctFrame(result){
 if(result.geometry?.applied||result.metadata?.geometry?.applied)return result;
 const geometry=frameGeometry(result.data,result.width,result.height);if(!geometry.ok||Math.abs(geometry.shear)<.025)return {...result,geometry:{...geometry,applied:false}};
 const w=result.width,h=result.height,k=geometry.shear,pad=Math.ceil(Math.abs(k)*h/2)+2,ow=w+2*pad;if(ow*h>4e6)return {...result,geometry:{ok:false,applied:false,reason:'Affine canvas exceeds budget'}};
 // Inverse affine sampling of the complete source, including every small word
 // and symbol. No component is removed or independently repositioned.
 const out=new Uint8ClampedArray(ow*h*4);out.fill(255);
 for(let y=0;y<h;y++)for(let x=0;x<ow;x++){const sx=x-pad+k*(y-h/2),lo=Math.floor(sx),f=sx-lo,j=(y*ow+x)*4;for(let c=0;c<4;c++){const a=lo>=0&&lo<w?result.data[(y*w+lo)*4+c]:255,b=lo+1>=0&&lo+1<w?result.data[(y*w+lo+1)*4+c]:255;out[j+c]=a*(1-f)+b*f;}}
 return {...result,data:out,width:ow,height:h,geometry:{...geometry,applied:true},metadata:{...result.metadata,geometry:{...geometry,applied:true},transformOrder:[...(result.metadata?.transformOrder||[]),'whole-source affine shear rectification'],limitations:[...(result.metadata?.limitations||[]),...geometry.limitations]}};
}
// Photo extractors already supply an alpha matte. White is analysis-only:
// never bake a white rectangle into the output or discard source alpha/color.
function correctPhotoFrame(result){
 if(result.geometry?.applied||result.metadata?.geometry?.applied)return result;
 const {data,width:w,height:h}=result;if(![w,h].every(n=>Number.isSafeInteger(n)&&n>0)||w*h>4e6||data?.length!==w*h*4)return {...result,geometry:{ok:false,applied:false,reason:'Invalid or oversized photo matte'}};
 const analysis=new Uint8ClampedArray(data.length);for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;for(let c=0;c<3;c++)analysis[i+c]=data[i+c]*a+255*(1-a);analysis[i+3]=255;}
 let geometry=frameGeometry(analysis,w,h);if(!geometry.ok){const candidates=[160,180,200].map(threshold=>frameGeometry(analysis,w,h,{threshold,fragments:true})).filter(g=>g.ok);if(candidates.length>=2&&Math.max(...candidates.map(g=>g.shear))-Math.min(...candidates.map(g=>g.shear))<.015){const chosen=candidates.sort((a,b)=>a.residual-b.residual)[0];geometry={...chosen,methodVersion:'2',evidence:'paired arc fragments and collinear rule fragments; threshold consensus',thresholdEstimates:candidates.map(g=>g.shear)};}}if(!geometry.ok||Math.abs(geometry.shear)<.025)return {...result,geometry:{...geometry,applied:false,status:geometry.ok?'already-aligned':'insufficient-evidence'}};
 const k=geometry.shear,pad=Math.ceil(Math.abs(k)*h/2)+2,ow=w+2*pad;if(ow*h>4e6)return {...result,geometry:{ok:false,applied:false,reason:'Affine canvas exceeds budget'}};
 const out=new Uint8ClampedArray(ow*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<ow;x++){const sx=x-pad+k*(y-h/2),lo=Math.floor(sx),f=sx-lo,j=(y*ow+x)*4;let alpha=0,r=0,g=0,b=0;for(let n=0;n<2;n++){const px=lo+n;if(px<0||px>=w)continue;const q=(y*w+px)*4,aw=data[q+3]/255*(n?f:1-f);alpha+=aw;r+=data[q]*aw;g+=data[q+1]*aw;b+=data[q+2]*aw;}if(alpha){out[j]=r/alpha;out[j+1]=g/alpha;out[j+2]=b/alpha;out[j+3]=alpha*255;}}
 const applied={...geometry,applied:true,status:'corrected',alphaPreserved:true,analysisBasis:'temporary white composite of extracted photo matte'};
 return {...result,data:out,width:ow,height:h,geometry:applied,metadata:{...result.metadata,geometry:applied,transformOrder:[...(result.metadata?.transformOrder||result.metadata?.transforms||[]),'whole-source premultiplied-alpha affine shear rectification'],limitations:[...(result.metadata?.limitations||[]),...geometry.limitations]}};
}
// Residual print-plane approximation only after an evidenced carrier transform.
// Independent cap and baseline supports must converge; parallel intentional tilt
// and stem/italic slant are not evidence. No horizontal coordinates are changed.
function correctPrintedPlanes(result,carrier){
 const {data,width:w,height:h}=result;
 if(carrier?.method!=='white-carrier-boundary-planar'||!Array.isArray(carrier.inkRegions)||carrier.inkRegions.length<2)return result;
 const mask=Uint8Array.from({length:w*h},(_,i)=>data[i*4+3]>100?1:0),columns=new Uint32Array(w);for(let i=0;i<mask.length;i++)if(mask[i])columns[i%w]++;
 const spans=[];let start=-1,last=-1;for(let x=0;x<w;x++)if(columns[x]){if(start<0)start=x;else if(x-last>Math.max(20,h*.25)){spans.push([Math.max(0,start-3),Math.min(w,last+4)]);start=x;}last=x;}if(start>=0)spans.push([Math.max(0,start-3),Math.min(w,last+4)]);if(spans.length<2||spans.length>3)return result;
 const fit=points=>{const mx=points.reduce((s,p)=>s+p[0],0)/points.length,my=points.reduce((s,p)=>s+p[1],0)/points.length,den=points.reduce((s,p)=>s+(p[0]-mx)**2,0);if(!den)return null;const a=points.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/den,b=my-a*mx,res=Math.sqrt(points.reduce((s,p)=>s+(p[1]-a*p[0]-b)**2,0)/points.length);return {a,b,res};};
 const plans=[];
 for(const span of spans){
  const estimates=[];
  for(const threshold of [100,150,200]){
   const parts=E.components(Uint8Array.from({length:w*h},(_,i)=>i%w>=span[0]&&i%w<span[1]&&data[i*4+3]>threshold?1:0),w,h).filter(p=>p.pts.length>=12);
   if(!parts.length)break;const gy0=Math.min(...parts.map(p=>p.box[1])),gy1=Math.max(...parts.map(p=>p.box[3])),gh=gy1-gy0;
   const letters=parts.filter(p=>{const bw=p.box[2]-p.box[0],bh=p.box[3]-p.box[1];return bh>gh*.55&&bh<gh*.95&&bw>bh*.12&&bw<bh*1.3&&p.pts.length/(bw*bh)>.12;});
   if(letters.length<5||letters.length>20)break;
   const heights=letters.map(p=>p.box[3]-p.box[1]),height=medianValue(heights);if(Math.max(...heights)/Math.min(...heights)>1.3||span[1]-span[0]<height*3)break;
   const tops=[],bottoms=[];for(const p of letters){const ys=p.pts.map(i=>Math.floor(i/w)).sort((a,b)=>a-b),lo=ys[Math.floor(ys.length*.03)],hi=ys[Math.floor(ys.length*.97)],upper=p.pts.filter(i=>Math.floor(i/w)<=lo),lower=p.pts.filter(i=>Math.floor(i/w)>=hi);tops.push([upper.reduce((s,i)=>s+i%w,0)/upper.length,upper.reduce((s,i)=>s+Math.floor(i/w),0)/upper.length]);bottoms.push([lower.reduce((s,i)=>s+i%w,0)/lower.length,lower.reduce((s,i)=>s+Math.floor(i/w),0)/lower.length]);}
   const top=fit(tops),bottom=fit(bottoms);if(!top||!bottom||Math.max(top.res,bottom.res)>height*.025||Math.max(Math.abs(top.a),Math.abs(bottom.a))>.105||Math.abs(bottom.a-top.a)<.008||Math.abs(bottom.a)<.0175)break;
   estimates.push({top,bottom,n:letters.length,height,gy0,gy1});
  }
  if(estimates.length!==3||['top','bottom'].some(k=>Math.max(...estimates.map(e=>e[k].a))-Math.min(...estimates.map(e=>e[k].a))>.005))continue;
  const p=estimates[1],center=(span[0]+span[1])/2,topY=p.top.a*center+p.top.b,bottomY=p.bottom.a*center+p.bottom.b,targetH=bottomY-topY;
  const projected=[];for(const x of span)for(const y of [p.gy0-2,p.gy1+2])projected.push(topY+(y-(p.top.a*x+p.top.b))*targetH/((p.bottom.a-p.top.a)*x+p.bottom.b-p.top.b));
  if(Math.min(...projected)<1||Math.max(...projected)>h-2)continue;
  plans.push({...p,span,topY,targetH,thresholdAgreement:true});
 }
 if(!plans.length)return result;
 const out=data.slice();for(const p of plans)for(let x=p.span[0];x<p.span[1];x++)for(let y=0;y<h;y++){
  const sy=p.top.a*x+p.top.b+(y-p.topY)*((p.bottom.a-p.top.a)*x+p.bottom.b-p.top.b)/p.targetH,y0=Math.floor(sy),f=sy-y0,j=(y*w+x)*4;let a=0,r=0,g=0,b=0;for(let k=0;k<2;k++){const yy=y0+k;if(yy<0||yy>=h)continue;const q=(yy*w+x)*4,aw=data[q+3]/255*(k?f:1-f);a+=aw;r+=data[q]*aw;g+=data[q+1]*aw;b+=data[q+2]*aw;}out.fill(0,j,j+4);if(a){out[j]=r/a;out[j+1]=g/a;out[j+2]=b/a;out[j+3]=a*255;}}
 return {...result,data:out,printedPlanes:{method:'independent-cap-baseline-photo-rectification',applied:true,groups:plans,limitations:['Residual print-plane approximation from independent cap and baseline supports; not an original master.','Horizontal positions and italic stem slant retained; no OCR, redraw, or curved-surface recovery.']}};
}
function medianValue(values){return values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];}

const api={correctPrintedPlanes,estimate,correct,frameGeometry,correctFrame,correctPhotoFrame};if(typeof module!=='undefined')module.exports=api;else root.MarkOrientation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
