/* Deterministic, client-only background classification and reversible edge mask. */
(function(root){
'use strict';
const distance=(a,b)=>Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
const hex=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function edgeMask(data,w,h,rgb,tolerance=32){const seen=new Uint8Array(w*h),mask=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;function add(i){if(i<0||i>=w*h||seen[i])return;seen[i]=1;const j=i*4;if(data[j+3]<20||distance([data[j],data[j+1],data[j+2]],rgb)<=tolerance){mask[i]=1;queue[tail++]=i;}}for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}while(head<tail){const i=queue[head++];if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w);}return {mask,count:tail};}
// Classification-scale connectivity is not permission to erase at a different
// scale. Recompute against original pixels and fail closed on disagreement.
function assessMaskAgreement(data,w,h,detection){
 if(!detection||detection.maskAllowed===false||!['white','color'].includes(detection.kind)||!Array.isArray(detection.rgb)||data.length!==w*h*4)
  return {allowed:false,reason:'ground-mask-not-authorized'};
 const region=edgeMask(data,w,h,detection.rgb,detection.tolerance||32),actual=region.count/(w*h),expected=detection.connected;
 if(!Number.isFinite(expected))return {...region,allowed:false,reason:'missing-mask-evidence',actual};
 const delta=Math.abs(actual-expected),allowed=delta<=.08&&(Math.min(actual,expected)>=.25||delta<=Math.max(.025,expected*.4));
 return {...region,allowed,reason:allowed?'scale-consistent-ground':'mask-scale-disagreement',actual,expected};
}
// Compare the outer colour with several inward contours and the whole plane.
// A framing stroke can dominate the border without being removable ground.
function inspectFramedGround(data,w,h,edgeRGB){
 if(Math.min(w,h)<64||w*h>160000)return null;
 const bins=new Map();let total=0;
 const pad=Math.max(1,Math.round(Math.min(w,h)*.025));
 for(let y=pad;y<h-pad;y++)for(let x=pad;x<w-pad;x++){
  const i=(y*w+x)*4;if(data[i+3]<240)continue;total++;
  const rgb=[data[i],data[i+1],data[i+2]],key=rgb.map(v=>Math.round(v/16)).join(',');
  if(!bins.has(key))bins.set(key,{n:0,sum:[0,0,0]});const b=bins.get(key);b.n++;rgb.forEach((v,k)=>b.sum[k]+=v);
 }
 const winner=[...bins.values()].sort((a,b)=>b.n-a.n)[0];
 if(!winner||winner.n/total<.5)return null;
 const rgb=winner.sum.map(v=>Math.round(v/winner.n));if(distance(rgb,edgeRGB)<80)return null;
 const contours=[.025,.04,.06].map(f=>{
  const p=Math.max(1,Math.round(Math.min(w,h)*f));let n=0,edge=0,plane=0;
  function sample(x,y){const i=(y*w+x)*4;if(data[i+3]<240)return;n++;const c=[data[i],data[i+1],data[i+2]];if(distance(c,edgeRGB)<32)edge++;if(distance(c,rgb)<28)plane++;}
  for(let x=p;x<w-p;x++){sample(x,p);sample(x,h-1-p);}for(let y=p+1;y<h-1-p;y++){sample(p,y);sample(w-1-p,y);}
  return {inset:f,edgeFraction:edge/Math.max(1,n),planeFraction:plane/Math.max(1,n)};
 });
 if(contours.filter(c=>c.edgeFraction<.35&&c.planeFraction>.65).length<2)return null;
 const flat=inspectFlatGraphic(data,w,h);if(!flat.flatGraphic)return null;
 return {rgb,color:hex(rgb),interiorFraction:winner.n/total,contours};
}
function analyze(data,w,h){if(w<2||h<2||data.length!==w*h*4)return {kind:'ambiguous',reason:'invalid'};const sides=[[],[],[],[]],border=Math.max(1,Math.floor(Math.min(w,h)*.025));let allTransparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<32)allTransparent++;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=(y*w+x)*4,p=[data[j],data[j+1],data[j+2],data[j+3]];if(y<border)sides[0].push(p);if(x>=w-border)sides[1].push(p);if(y>=h-border)sides[2].push(p);if(x<border)sides[3].push(p);}const edges=sides.flat(),transparent=edges.filter(p=>p[3]<32).length/edges.length;if(allTransparent/(w*h)>=.025||(transparent>=.25&&allTransparent/(w*h)>=.005))return {kind:'transparent',color:'#ffffff',rgb:[255,255,255],confidence:transparent};const opaque=edges.filter(p=>p[3]>240);if(opaque.length/edges.length<.8)return {kind:'ambiguous',reason:'mixed-alpha'};const bins=new Map();for(const p of opaque){const key=p.slice(0,3).map(v=>Math.floor(v/16)).join(',');if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p);}const candidates=[...bins.values()].sort((a,b)=>b.length-a.length).slice(0,12);let best=[];for(const group of candidates){const center=[0,1,2].map(k=>group.reduce((s,p)=>s+p[k],0)/group.length);const cluster=opaque.filter(p=>distance(p,center)<=28);if(cluster.length>best.length)best=cluster;}if(!best.length)return {kind:'ambiguous',reason:'no-color'};const rgb=[0,1,2].map(k=>{const values=best.map(p=>p[k]).sort((a,b)=>a-b);return values[Math.floor(values.length/2)];});const coverage=opaque.filter(p=>distance(p,rgb)<=30).length/edges.length;const perSide=sides.map(side=>side.filter(p=>p[3]>240&&distance(p,rgb)<=30).length/side.length);const region=edgeMask(data,w,h,rgb,32),connected=region.count/(w*h);const lumBins=new Uint32Array(16);let foreground=0;for(let i=0;i<w*h;i++){if(!region.mask[i]&&data[i*4+3]>240){const j=i*4,lum=Math.round((data[j]+data[j+1]+data[j+2])/3);lumBins[Math.min(15,Math.floor(lum/16))]++;foreground++;}}let entropy=0;for(const n of lumBins){if(n){const p=n/foreground;entropy-=p*Math.log2(p);}}if(foreground/(w*h)>.25&&entropy>2.7)return {kind:'ambiguous',reason:'photo-or-proof',suggestedColor:hex(rgb),confidence:coverage};const frame=inspectFramedGround(data,w,h,rgb);if(frame){const white=Math.min(...frame.rgb)>=245&&Math.max(...frame.rgb)-Math.min(...frame.rgb)<=12;return {kind:white?'white':'color',reason:'preserved-frame-ground',color:white?'#ffffff':frame.color,sourceGroundColor:frame.color,rgb:frame.rgb,confidence:frame.interiorFraction,connected:0,maskAllowed:false,preserveArtwork:true,groundEvidence:frame,edgeRGB:rgb};}const coherentSmall=Math.min(w,h)>=32&&Math.min(w,h)<64&&w*h<=32000&&coverage>=.85&&perSide.filter(v=>v>=.95).length>=3&&connected>=.65&&inspectFlatGraphic(data,w,h).flatGraphic;if(!coherentSmall&&(coverage<.8||Math.min(...perSide)<.65||connected<.12))return {kind:'ambiguous',reason:'nonuniform',suggestedColor:hex(rgb),confidence:coverage};const white=Math.min(...rgb)>=245&&Math.max(...rgb)-Math.min(...rgb)<=12;return {kind:white?'white':'color',color:white?'#ffffff':hex(rgb),rgb,confidence:coverage,connected,tolerance:32,...(coherentSmall?{reason:'coherent-small-flat-ground',sourceLimited:true}: {})};}
// A flat edge colour is not proof of a flat digital logo. Paper fibres and
// photographic noise can share its average RGB. This routes to photo review;
// it does NOT infer white paper, change pixels, or claim semantic recognition.
function inspectSurface(data,w,h,detection){
 const empty={photoLike:false,reason:'insufficient-background-evidence'};
 if(!detection||!['white','color'].includes(detection.kind)||!detection.rgb||w<96||h<96||w*h>160000||data.length!==w*h*4)return empty;
 const mask=edgeMask(data,w,h,detection.rgb,35).mask,tiles=new Map(),residuals=[];
 const lum=i=>(data[i*4]+data[i*4+1]+data[i*4+2])/3;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x,ids=[i,i-1,i+1,i-w,i+w];
  if(!ids.every(j=>mask[j]&&data[j*4+3]>240))continue;
  const values=ids.map(lum),range=Math.max(...values)-Math.min(...values);
  // Exclude print edges, not shadows by their brightness or hue.
  if(range>=18)continue;
  const residual=Math.abs(values[0]-(values[1]+values[2]+values[3]+values[4])/4);
  const key=Math.floor(y/20)*Math.ceil(w/20)+Math.floor(x/20);
  if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(residual);residuals.push(residual);
 }
 const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
 const eligible=[...tiles.values()].filter(a=>a.length>=120);
 if(eligible.length<8||residuals.length<w*h*.25)return empty;
 const medianResidual=median(residuals),texturedTileFraction=eligible.filter(a=>median(a)>=1.25).length/eligible.length;
 return {photoLike:medianResidual>=1.25&&texturedTileFraction>=.55,reason:'edge-connected-surface-texture',medianResidual,texturedTileFraction,sampledPixels:residuals.length,tiles:eligible.length};
}
// Evidence for a ready flat graphic, independent of how much blank margin it has.
// Sample stable interiors, not JPEG/antialiased edge colours. This is a routing
// hint, never an extraction mask; screenshots/context are checked first.
function inspectFlatGraphic(data,w,h){
 const no={flatGraphic:false};
 if(w<32||h<32||w*h>160000||data.length!==w*h*4)return no;
 const bins=new Map();let total=0,stable=0;
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;if(data[i*4+3]<240)continue;total++;
  const ids=[i,i-2,i+2,i-2*w,i+2*w];
  if(![0,1,2].every(k=>{const v=ids.map(j=>data[j*4+k]);return Math.max(...v)-Math.min(...v)<=8;}))continue;
  stable++;const rgb=[0,1,2].map(k=>data[i*4+k]),key=rgb.map(v=>Math.round(v/16)).join(',');
  if(!bins.has(key))bins.set(key,{n:0,sum:[0,0,0]});const b=bins.get(key);b.n++;rgb.forEach((v,k)=>b.sum[k]+=v);
 }
 if(!total||stable/total<.35)return {...no,stableFraction:stable/Math.max(1,total)};
 const groups=[...bins.values()].sort((a,b)=>b.n-a.n),palette=[];let represented=0;
 for(const b of groups){const rgb=b.sum.map(v=>v/b.n);if(palette.some(c=>distance(c,rgb)<=20)){represented+=b.n;continue;}if(palette.length<6){palette.push(rgb);represented+=b.n;}}
 // At native small sizes a genuine stroke may never contain a 5px cross.
 // Admit an extra palette endpoint only from a coherent 3px line, not from
 // isolated extrema/noise, and only in the bounded low-resolution path.
 let thinStrokeSamples=0;
 if(Math.min(w,h)<64&&w*h<=32000){
  const thinBins=new Map();
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=y*w+x,rgb=[0,1,2].map(k=>data[i*4+k]);
   if(data[i*4+3]<240||palette.some(c=>distance(c,rgb)<60))continue;
   const pairs=[[i-1,i+1],[i-w,i+w],[i-w-1,i+w+1],[i-w+1,i+w-1]];
   if(!pairs.some(ids=>ids.every(j=>data[j*4+3]>240&&distance(rgb,[0,1,2].map(k=>data[j*4+k]))<=24)))continue;
   const key=rgb.map(v=>Math.round(v/24)).join(',');
   if(!thinBins.has(key))thinBins.set(key,{n:0,sum:[0,0,0]});
   const b=thinBins.get(key);b.n++;rgb.forEach((v,k)=>b.sum[k]+=v);
  }
  for(const b of [...thinBins.values()].sort((a,b)=>b.n-a.n)){
   if(b.n<Math.max(8,w*h*.0015))continue;
   const rgb=b.sum.map(v=>v/b.n);
   if(palette.length<6&&!palette.some(c=>distance(c,rgb)<=40)){palette.push(rgb);thinStrokeSamples+=b.n;}
  }
 }
 const concentration=represented/stable;
 let covered=0,transitions=0,opaque=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;if(data[i*4+3]<240)continue;opaque++;const rgb=[0,1,2].map(k=>data[i*4+k]);
  if(palette.some(c=>distance(c,rgb)<=24)){covered++;continue;}
  // Antialias/JPEG colours must lie between nearby palette colours at a real
  // spatial edge. A smooth gradient cannot explain its whole surface this way.
  const neighbors=[Math.max(0,x-2)+y*w,Math.min(w-1,x+2)+y*w,x+Math.max(0,y-2)*w,x+Math.min(h-1,y+2)*w].map(j=>[0,1,2].map(k=>data[j*4+k]));
  if(!neighbors.some(c=>distance(c,rgb)>28))continue;
  let explained=false;for(let a=0;a<palette.length&&!explained;a++)for(let b=a+1;b<palette.length;b++){
   const p=palette[a],v=palette[b].map((c,k)=>c-p[k]),den=v.reduce((n,c)=>n+c*c,0);if(!den)continue;
   const t=Math.max(0,Math.min(1,v.reduce((n,c,k)=>n+c*(rgb[k]-p[k]),0)/den));
   if(distance(rgb,p.map((c,k)=>c+t*v[k]))<=36){explained=true;break;}
  }
  if(explained)transitions++;
 }
 const paletteCoverage=covered/Math.max(1,opaque),explainedCoverage=(covered+transitions)/Math.max(1,opaque);
 return {flatGraphic:concentration>=.975&&paletteCoverage>=.72&&explainedCoverage>=.96,stableFraction:stable/total,concentration,paletteCoverage,explainedCoverage,paletteSize:palette.length,thinStrokeSamples};
}
// On a tightly cropped, textured single surface, a tiny subtitle is not the
// whole visible marking. Compare against SOURCE coordinates, before transforms.
function sourceRetention(data,w,h,detection,box,sourceW,sourceH){
 const surface=inspectSurface(data,w,h,detection);
 if(!surface.photoLike)return {applicable:false};
 if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)||!(sourceW>0&&sourceH>0))return {applicable:true,ok:false,reason:'missing-source-region'};
 const bg=detection.rgb,bgLum=(bg[0]+bg[1]+bg[2])/3;let total=0,inside=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const j=(y*w+x)*4;if(data[j+3]<240)continue;
  const rgb=[data[j],data[j+1],data[j+2]],lum=(rgb[0]+rgb[1]+rgb[2])/3;
  if(!(bgLum-lum>35||(distance(rgb,bg)>55&&Math.max(...rgb)-Math.min(...rgb)>35)))continue;
  total++;const sx=(x+.5)*sourceW/w,sy=(y+.5)*sourceH/h;
  if(sx>=box[0]&&sx<box[2]&&sy>=box[1]&&sy<box[3])inside++;
 }
 const retainedFraction=total?inside/total:0;
 return {applicable:true,ok:total>=24&&retainedFraction>=.9,retainedFraction,total,inside,reason:'source-marking-coverage',surface};
}
// Digital artwork on a large clean white exterior can contain shaded letters.
// This evidence does not flatten gradients or authorize photographic extraction.
function inspectWhiteGraphic(data,w,h,detection){
 if(data?.length!==w*h*4||w<32||h<32||w*h>160000||detection?.kind!=='white'||detection.maskAllowed===false)return false;
 const mask=edgeMask(data,w,h,[255,255,255],12);if(mask.count/(w*h)<.65)return false;
 let left=w,top=h,right=0,bottom=0,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(mask.mask[i]||data[i*4+3]<240)continue;count++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(count<24||left<2||top<2||right>w-3||bottom>h-3)return false;
 return !inspectSurface(data,w,h,detection).photoLike;
}
const api={analyze,edgeMask,assessMaskAgreement,hex,inspectSurface,inspectFlatGraphic,sourceRetention,inspectWhiteGraphic};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BackgroundAnalysis=api;
})(typeof window!=='undefined'?window:globalThis);
