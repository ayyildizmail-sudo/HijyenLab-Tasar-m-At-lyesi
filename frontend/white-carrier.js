/* ISOLATED EXPERIMENT. White carrier / chromatic marking proposals, NOT semantic brand recognition. */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./ink-extraction.js'):root.LocalInkExtraction;
function fill(mask,w,h){const outside=new Uint8Array(w*h),q=[];function add(i){if(i>=0&&i<w*h&&!mask[i]&&!outside[i]){outside[i]=1;q.push(i);}}for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}for(let k=0;k<q.length;k++){const i=q[k],x=i%w;add(i-w);add(i+w);if(x)add(i-1);if(x<w-1)add(i+1);}return Uint8Array.from(outside,v=>1-v);}
function propose(data,w,h,sourceWidth=w,sourceHeight=h){
 if(data.length!==w*h*4)throw Error('RGBA size mismatch');
 const light=Float32Array.from({length:w*h},(_,i)=>{const j=i*4,lo=Math.min(data[j],data[j+1],data[j+2]),hi=Math.max(data[j],data[j+1],data[j+2]);return lo>160&&hi-lo<40?1:0;});
 const r=Math.max(1,Math.round(Math.max(w,h)/300)),clean=E.filter(E.filter(light,w,h,r,false),w,h,r),parts=E.components(clean,w,h).filter(p=>p.pts.length>w*h*.03&&p.pts.length<w*h*.65),out=[];
 for(const part of parts){
  let mx=0,my=0;for(const i of part.pts){mx+=i%w;my+=Math.floor(i/w);}mx/=part.pts.length;my/=part.pts.length;let xx=0,yy=0,xy=0;for(const i of part.pts){const x=i%w-mx,y=Math.floor(i/w)-my;xx+=x*x;yy+=y*y;xy+=x*y;}const delta=Math.hypot(xx-yy,2*xy),elongation=Math.sqrt((xx+yy+delta)/Math.max(1,xx+yy-delta));if(elongation<2||elongation>12)continue;
  const mask=new Uint8Array(w*h);for(const i of part.pts)mask[i]=1;const support=fill(mask,w,h),inner=E.filter(support,w,h,r,false);
  const color=Uint8Array.from(inner,(v,i)=>{const j=i*4,hi=Math.max(data[j],data[j+1],data[j+2]),lo=Math.min(data[j],data[j+1],data[j+2]);const l=(data[j]+data[j+1]+data[j+2])/3;return v&&((hi-lo>40&&l<210)||l<95)?1:0;});
  const comps=E.components(color,w,h).filter(p=>p.pts.length>=Math.max(3,w*h*.000015));if(!comps.length)continue;
  // Preserve every qualified component; never select a dominant hue or largest logo only.
  const total=comps.reduce((n,p)=>n+p.pts.length,0);if(total<30||total/part.pts.length>.35)continue;
  const x0=Math.min(...comps.map(p=>p.box[0])),y0=Math.min(...comps.map(p=>p.box[1])),x1=Math.max(...comps.map(p=>p.box[2])),y1=Math.max(...comps.map(p=>p.box[3])),pad=Math.max(4,Math.round(Math.max(x1-x0,y1-y0)*.08));
  const box=[Math.max(0,Math.floor((x0-pad)*sourceWidth/w)),Math.max(0,Math.floor((y0-pad)*sourceHeight/h)),Math.min(sourceWidth,Math.ceil((x1+pad)*sourceWidth/w)),Math.min(sourceHeight,Math.ceil((y1+pad)*sourceHeight/h))];
  const runs=[];for(let y=0;y<h;y++){let start=-1;for(let x=0;x<=w;x++){const v=x<w&&inner[y*w+x];if(v&&start<0)start=x;if(!v&&start>=0){runs.push([y,start,x]);start=-1;}}}
  out.push({carrierSupport:{width:w,height:h,sourceWidth,sourceHeight,runs},method:'white-carrier-chromatic-and-dark-components',methodVersion:'experiment-2',sourceCoordinates:'browser-decoded',box,carrierBox:part.box.map((v,i)=>v*(i%2?sourceHeight/h:sourceWidth/w)),carrierAngleRadians:.5*Math.atan2(2*xy,xx-yy),carrierElongation:elongation,componentCount:comps.length,components:comps.map(p=>({box:p.box.map((v,i)=>v*(i%2?sourceHeight/h:sourceWidth/w)),pixels:p.pts.length})),maskBasis:'Neutral-light elongated carrier, hole-filled support, all chromatic components independently of hue',limitations:['Heuristic proposal, not semantic brand/product recognition','Dark neutral markings retained as potential brand content; faint neutral markings remain uncertain','All chromatic objects on carrier are retained; multiple brands not semantically resolved','No perspective or nonplanar recovery','A white elongated card/menu may match; target/source review required']});
 }
 return out;
}
function extract(data,w,h,candidate){const b=candidate.box,cw=b[2]-b[0],ch=b[3]-b[1],raw=new Uint8ClampedArray(cw*ch*4);for(let y=0;y<ch;y++)raw.set(data.subarray(((b[1]+y)*w+b[0])*4,((b[1]+y)*w+b[2])*4),y*cw*4);
 if(w!==candidate.carrierSupport.sourceWidth||h!==candidate.carrierSupport.sourceHeight)throw Error('Source dimensions mismatch');
 return extractCrop(raw,cw,ch,candidate);
}
function extractCrop(raw,cw,ch,candidate){
 const b=candidate.box,supInfo=candidate.carrierSupport,w=supInfo.sourceWidth,h=supInfo.sourceHeight;
 if(![cw,ch,w,h,...b].every(Number.isSafeInteger)||cw<=0||ch<=0||w<=0||h<=0||b[0]<0||b[1]<0||b[2]>w||b[3]>h||cw!==b[2]-b[0]||ch!==b[3]-b[1]||raw.length!==cw*ch*4)throw Error('ROI dimensions or source box mismatch');
 // Source-resolution hysteresis: retain chromatic connected strokes, independent of their darkness.
 const sup=candidate.carrierSupport,support=new Uint8Array(sup.width*sup.height);for(const [y,x0,x1] of sup.runs)for(let x=x0;x<x1;x++)support[y*sup.width+x]=1;const inCarrier=i=>support[Math.min(sup.height-1,Math.floor((b[1]+Math.floor(i/cw))*sup.height/h))*sup.width+Math.min(sup.width-1,Math.floor((b[0]+i%cw)*sup.width/w))];
 const n=cw*ch,chroma=Float32Array.from({length:n},(_,i)=>Math.max(raw[i*4],raw[i*4+1],raw[i*4+2])-Math.min(raw[i*4],raw[i*4+1],raw[i*4+2])),lum=Float32Array.from({length:n},(_,i)=>(raw[i*4]+raw[i*4+1]+raw[i*4+2])/3),weak=Uint8Array.from(chroma,(c,i)=>inCarrier(i)&&(c>18||lum[i]<130)?1:0),keep=new Uint8Array(n);
 for(const p of E.components(weak,cw,ch))if(p.pts.filter(i=>chroma[i]>40||lum[i]<95).length>=3)for(const i of p.pts)keep[i]=1;
 const matte=new Uint8ClampedArray(raw.length);for(let i=0;i<n;i++)if(keep[i]){matte.set(raw.subarray(i*4,i*4+3),i*4);matte[i*4+3]=Math.round(Math.min(1,Math.max(0,(chroma[i]-18)/12,(130-lum[i])/35))*255);}

 const seeds=Uint8Array.from({length:cw*ch},(_,i)=>{const j=i*4,hi=Math.max(raw[j],raw[j+1],raw[j+2]),lo=Math.min(raw[j],raw[j+1],raw[j+2]);return hi-lo>40&&(raw[j]+raw[j+1]+raw[j+2])/3<180?1:0;}),parts=E.components(seeds,cw,ch).filter(p=>p.pts.length>=Math.max(3,cw*ch*.0001));
 const checks=parts.map(p=>({box:p.box,pixels:p.pts.length,retained:p.pts.filter(i=>matte[i*4+3]>=80).length}));if(checks.some(c=>c.retained/c.pixels<.9))return{ok:false,reason:'Chromatic component retention below 90%',checks};
 return{ok:true,data:matte,raw,width:cw,height:ch,checks,metadata:{...candidate,status:'needs-selection',candidates:[candidate],preservedRegions:[{box:b,reason:'All detected chromatic components; source crop includes carrier white; alpha semantics white-substrate only'}],excludedRegions:[],maskBasis:'Source-resolution chromatic hysteresis; original RGB retained without palette redraw. Source-neutral whites become alpha; white-ground preview only.',transformOrder:['decode orientation','low-resolution neutral carrier proposal','all-chromatic-component bounds mapped to decoded source','source-resolution crop','source-resolution chromatic connected hysteresis','per-component retention check'],limitations:[...candidate.limitations,'White-ground preview only; source-white/knockout intent unknown','No automatic correctness certificate; alpha and brand identity require visual review','No deskew applied; geometry remains photographic']}};
}
function deskew(result,angle){
 if(!result.ok)return result;
 const {data,width:w,height:h}=result,c=Math.cos(angle),s=Math.sin(angle),ow=Math.ceil(Math.abs(c)*w+Math.abs(s)*h),oh=Math.ceil(Math.abs(s)*w+Math.abs(c)*h),out=new Uint8ClampedArray(ow*oh*4);
 for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
  const dx=x+.5-ow/2,dy=y+.5-oh/2,sx=c*dx-s*dy+w/2-.5,sy=s*dx+c*dy+h/2-.5,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;let a=0,r=0,g=0,b=0;
  for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=x0+xx,py=y0+yy;if(px<0||py<0||px>=w||py>=h)continue;const q=(py*w+px)*4,wt=(xx?fx:1-fx)*(yy?fy:1-fy),aw=data[q+3]/255*wt;a+=aw;r+=data[q]*aw;g+=data[q+1]*aw;b+=data[q+2]*aw;}
  const j=(y*ow+x)*4;if(a){out[j]=r/a;out[j+1]=g/a;out[j+2]=b/a;out[j+3]=a*255;}
 }
 return{...result,data:out,width:ow,height:oh,raw:undefined,metadata:{...result.metadata,deskewRadians:-angle,orientationAmbiguous180:true,transformOrder:[...result.metadata.transformOrder,'reviewable carrier-axis rotation; 180-degree text orientation unresolved'],limitations:[...result.metadata.limitations,'Carrier axis is a deskew proposal, not proof of intended logo orientation']}};
}

const api={propose,extract,extractCrop,deskew};if(typeof module!=='undefined')module.exports=api;else root.WhiteCarrier=api;
})(typeof globalThis!=='undefined'?globalThis:this);
