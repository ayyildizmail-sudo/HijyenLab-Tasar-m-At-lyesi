/* Extracts source pixels from a single bounded sign panel with contrasting lettering. */
(function (root) {
'use strict';
function fit(points) {
 const n=points.length;
 if(n<8)return null;
 const x=points.reduce((sum,p)=>sum+p[0],0)/n,y=points.reduce((sum,p)=>sum+p[1],0)/n;
 const spread=points.reduce((sum,p)=>sum+(p[0]-x)**2,0);
 if(!spread)return null;
 const slope=points.reduce((sum,p)=>sum+(p[0]-x)*(p[1]-y),0)/spread;
 const offset=y-slope*x;
 const residuals=points.map(p=>Math.abs(p[1]-slope*p[0]-offset)).sort((a,b)=>a-b);
 return residuals[Math.floor(n*.85)]<=2.4?{slope,offset}:null;
}
function intersect(horizontal,vertical) {
 const y=(horizontal.offset+horizontal.slope*vertical.offset)/(1-horizontal.slope*vertical.slope);
 return {x:vertical.slope*y+vertical.offset,y};
}
const luminance=([r,g,b])=>.2126*r+.7152*g+.0722*b;
const distance=(a,b)=>Math.max(...a.map((n,i)=>Math.abs(n-b[i])));
const hex=rgb=>'#'+rgb.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
function surfaceColors(pixels) {
 const buckets=new Map();
 for(let i=0;i<pixels.length;i+=4){
  if(pixels[i+3]<245)continue;
  const rgb=[pixels[i],pixels[i+1],pixels[i+2]];
  const key=rgb.map(n=>n>>4).join(',');
  const bin=buckets.get(key)||{count:0,sum:[0,0,0]};
  bin.count++;
  rgb.forEach((n,c)=>bin.sum[c]+=n);
  buckets.set(key,bin);
 }
 const seeds=[];
 for(const {count,sum} of [...buckets.values()].sort((a,b)=>b.count-a.count)){
  if(count<pixels.length/4*.009||seeds.length>=10)break;
  const rgb=sum.map(n=>n/count);
  if(seeds.every(seed=>distance(rgb,seed)>29))seeds.push(rgb);
 }
 return seeds;
}
function findSurfaces(pixels,w,h,color) {
 const surface=new Uint8Array(w*h);
 const tolerance=24;
 const greenRed=color[1]-color[0],greenBlue=color[1]-color[2];
 for(let i=0;i<surface.length;i++){
  const p=i*4;
  surface[i]=pixels[p+3]>=245&&Math.max(Math.abs(pixels[p]-color[0]),Math.abs(pixels[p+1]-color[1]),Math.abs(pixels[p+2]-color[2]))<=tolerance&&
   Math.abs(pixels[p+1]-pixels[p]-greenRed)<=12&&Math.abs(pixels[p+1]-pixels[p+2]-greenBlue)<=12?1:0;
 }
 const mask=surface.slice();
 for(let y=0;y<h;y++){
  let last=-1;
  for(let x=0;x<w;x++){
   if(!surface[y*w+x])continue;
   if(last>=0&&x-last<=w*.14)mask.fill(1,y*w+last+1,y*w+x);
   last=x;
  }
 }
 // A row of bright writing can split a solid carrier into separate pieces.
 // Join bounded gaps in both axes using only matching surface endpoints.
 if(h>w*1.15)for(let x=0;x<w;x++){
  let last=-1;
  for(let y=0;y<h;y++){
   if(!surface[y*w+x])continue;
   if(last>=0&&y-last<=w*.30)for(let p=last+1;p<y;p++)mask[p*w+x]=1;
   last=y;
  }
 }
 const queue=new Int32Array(mask.length),result=[];
 for(let i=0;i<mask.length;i++){
  if(!mask[i])continue;
  let end=1,left=w,right=0,top=h,bottom=0;
  queue[0]=i;mask[i]=0;
  for(let j=0;j<end;j++){
   const p=queue[j],x=p%w,y=Math.floor(p/w);
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(const q of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1]){
    if(q>=0&&mask[q]){mask[q]=0;queue[end++]=q;}
   }
  }
  const width=right-left+1,height=bottom-top+1;
  if(width<w*.34||height<22||width/height<.48||width/height>12||end<width*height*.43||left<2||right>w-3||bottom>h-3)continue;
  const topAt=Array(w).fill(h),bottomAt=Array(w).fill(-1),leftAt=Array(h).fill(w),rightAt=Array(h).fill(-1);
  let sampled=0;
  for(let j=0;j<end;j++){
   const p=queue[j],x=p%w,y=Math.floor(p/w);
   topAt[x]=Math.min(topAt[x],y);bottomAt[x]=Math.max(bottomAt[x],y);
   leftAt[y]=Math.min(leftAt[y],x);rightAt[y]=Math.max(rightAt[y],x);
   sampled+=surface[p];
  }
  if(sampled<end*.48)continue;
  result.push({box:[left,top,right+1,bottom+1],width,height,topAt,bottomAt,leftAt,rightAt,color});
 }
 // A thick band of light may still divide a tall physical panel. Merge
 // neighbors only when both side edges agree and the gap is short.
 const joined=[];
 if(h>w*1.15)for(const first of result){
  const [l,t,r,b]=first.box;
  const next=result.find(other=>{
   const [ol,ot,or]=other.box;
   return ot>=b&&ot-b<=Math.min(h*.055,first.width*.2)&&
    Math.abs(l-ol)<=w*.045&&Math.abs(r-or)<=w*.045&&ot-t>=first.width*.55;
  });
  if(!next)continue;
  const [nl,nt,nr,nb]=next.box;
  const left=Math.min(l,nl),right=Math.max(r,nr),width=right-left,height=nb-t;
  if(width>=height||width>w*.8)continue;
  joined.push({box:[left,t,right,nb],width,height,color,parts:[first,next]});
 }
 return [...joined,...result.filter(item=>item.box[1]>=2&&!joined.some(pair=>pair.parts.includes(item)))];
}
function planarCorners(surface,w,h,photo) {
 const {box:[left,top,right,bottom],width,height,topAt,bottomAt,leftAt,rightAt}=surface;
 const across=Array.from({length:width},(_,n)=>left+n).filter(x=>x>left+width*.12&&x<right-width*.12);
 const down=Array.from({length:height},(_,n)=>top+n).filter(y=>y>top+height*.32&&y<bottom-height*.32&&rightAt[y]-leftAt[y]>width*.8);
 const [upper,lower,west,east]=[fit(across.map(x=>[x,topAt[x]])),fit(across.map(x=>[x,bottomAt[x]])),fit(down.map(y=>[y,leftAt[y]])),fit(down.map(y=>[y,rightAt[y]]))];
 if(!upper||!lower||!west||!east||Math.abs(upper.slope)>.4||Math.abs(lower.slope)>.4||Math.abs(west.slope)>.45||Math.abs(east.slope)>.45)return null;
 const corners=[intersect(upper,west),intersect(upper,east),intersect(lower,east),intersect(lower,west)];
 const quad=corners.map(p=>({x:p.x/w,y:p.y/h}));
 return photo.valid(quad)?quad:null;
}
function separate(out,surface,inside,screen) {
 const ctx=out.getContext('2d'),frame=ctx.getImageData(0,0,out.width,out.height),d=frame.data;
 const baseLum=luminance(surface.color),threshold=54;
 const groups=new Map(),probes=[];
 for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
  const i=(y*out.width+x)*4;
  if(!inside(x,y,0))continue;
  const rgb=[d[i],d[i+1],d[i+2]];
  const delta=distance(rgb,surface.color);
  if(delta<threshold)continue;
  const light=luminance(rgb)-baseLum;
  const polarity=Math.abs(light)>45?(light>0?'light':'dark'):'chroma';
  const key=polarity==='chroma'?rgb.map((v,c)=>Math.sign(v-surface.color[c])).join(','):polarity;
  const group=groups.get(key)||[];
  group.push({x,y,rgb,delta,edge:!inside(x,y,2)});
  groups.set(key,group);
 }
 const ranked=[...groups.values()].sort((a,b)=>b.length-a.length);
 const primary=ranked[0];
 const area=out.width*out.height;
 if(!primary||primary.length<area*.013||primary.length>area*.36||
    primary.filter(p=>p.edge).length>Math.max(3,primary.length*(screen?.006:.015))||
    (ranked[1]?.length||0)>primary.length*.13)return false;
 const first=primary.reduce((x,p)=>Math.min(x,p.x),out.width),last=primary.reduce((x,p)=>Math.max(x,p.x),0);
 const top=primary.reduce((y,p)=>Math.min(y,p.y),out.height),bottom=primary.reduce((y,p)=>Math.max(y,p.y),0);
 const density=primary.length/((last-first+1)*(bottom-top+1));
 if(last-first<out.width*.23||density>.72)return false;
 const strongest=primary.map(p=>p.delta).sort((a,b)=>a-b)[Math.floor(primary.length*.68)];
 for(const p of primary)if(p.delta>=strongest)probes.push(p.rgb);
 const ink=[0,1,2].map(c=>probes.reduce((sum,rgb)=>sum+rgb[c],0)/probes.length);
 if(probes.filter(rgb=>distance(rgb,ink)>55).length>probes.length*.12)return false;
 // Reuse the same contrast direction for weak antialias pixels. Neighboring
 // pixels in a different color direction are never recolored into this ink.
 const vector=ink.map((v,c)=>v-surface.color[c]),norm=vector.reduce((n,v)=>n+v*v,0);
 const refine=baseLum<90&&luminance(ink)-baseLum>100;
 if(norm<3600)return false;
 for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
  const i=(y*out.width+x)*4,offset=[0,1,2].map(c=>d[i+c]-surface.color[c]);
  const t=offset.reduce((n,v,c)=>n+v*vector[c],0)/norm;
  const mismatch=Math.max(...offset.map((v,c)=>Math.abs(v-t*vector[c])));
  const a=inside(x,y,1)&&mismatch<55?Math.max(0,Math.min(255,(t-.29)*440)):0;
  d.set([...ink,refine?refineNeonInk(a):a],i);
 }
 ctx.putImageData(frame,0,0);
 return {refine};
}
// A monotonic coverage curve makes lettering cores solid and reduces the
// faint edge halo. Keep every supported pixel and every transparent counter.
function refineNeonInk(coverage) {
 if(coverage<=0)return 0;
 const t=coverage/255;
 return Math.max(1,Math.round(255*t*t/(t*t+(1-t)*(1-t))));
}
// Cold neon cores remain distinguishable from warm spotlights and uneven
// reflections even when the panel itself is broken up by the light spill.
function separateNeon(out,inside) {
 const ctx=out.getContext('2d'),frame=ctx.getImageData(0,0,out.width,out.height),d=frame.data;
 const rows=new Uint32Array(out.height);
 let edge=0,count=0,first=out.width,last=0;
 for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
  const i=(y*out.width+x)*4,[r,g,b]=d.subarray(i,i+3),lum=luminance([r,g,b]);
  const neutral=r<=g+8&&r<=b+7&&b-g<48;
  const coverage=inside(x,y,0)&&neutral?Math.max(0,Math.min(255,(lum-151)*3.3)):0;
  if(coverage>100){
   count++;rows[y]++;first=Math.min(first,x);last=Math.max(last,x);
   if(!inside(x,y,2))edge++;
  }
  d.set([245,249,250,refineNeonInk(coverage)],i);
 }
 const active=rows.reduce((sum,row)=>sum+(row>=2),0);
 if(count<out.width*out.height*.012||count>out.width*out.height*.23||
    last-first<out.width*.38||active<out.height*.3||edge>Math.max(3,count*.012))return false;
 ctx.putImageData(frame,0,0);
 return true;
}
function prepare(img,makeCanvas,photo,{screen=false}={}) {
 const scale=Math.min(1,600/Math.max(img.width,img.height));
 const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
 if(w<120||h<70)return null;
 const scan=makeCanvas(w,h),cx=scan.getContext('2d');
 cx.drawImage(img,0,0,w,h);
 const pixels=cx.getImageData(0,0,w,h).data;
 const candidates=[];
 for(const color of surfaceColors(pixels)){
  for(const surface of findSurfaces(pixels,w,h,color)){
   const {box:[l,t,r,b],width,height,topAt,bottomAt,leftAt,rightAt}=surface;
   if(screen&&width>w*.78)continue;
   const box=[l,t,r,b].map((v,i)=>Math.round(v/(i%2?h:w)*(i%2?img.height:img.width)));
   const quad=surface.parts?null:planarCorners(surface,w,h,photo);
   let out,inside;
   if(quad){
    const [a,p,c,e]=quad;
    const length=(u,v)=>Math.hypot((u.x-v.x)*img.width,(u.y-v.y)*img.height);
    const panel=photo.rectify(img,quad);
    const ratio=(length(a,e)+length(p,c))/(length(a,p)+length(e,c));
    const width=Math.min(panel.width,900,Math.floor(900/ratio));
    out=makeCanvas(width,Math.max(12,Math.round(width*ratio)));
    out.getContext('2d').drawImage(panel,0,0,out.width,out.height);
    inside=(x,y,margin)=>x>=margin&&y>=margin&&x<out.width-margin&&y<out.height-margin;
   }else{
    const [x,y,right,bottom]=box;
    const downscale=Math.min(1,900/Math.max(right-x,bottom-y));
    out=makeCanvas(Math.round((right-x)*downscale),Math.round((bottom-y)*downscale));
    out.getContext('2d').drawImage(img,x,y,right-x,bottom-y,0,0,out.width,out.height);
    inside=(x,y,margin)=>{
     if(surface.parts){
      const side=Math.max(2,Math.round(out.width*.045))+margin;
      return x>=side&&y>=margin&&x<out.width-side&&y<out.height-margin;
     }
     const sx=l+Math.floor(x*width/out.width),sy=t+Math.floor(y*height/out.height);
     return sx>=leftAt[sy]+margin&&sx<=rightAt[sy]-margin&&sy>=topAt[sx]+margin&&sy<=bottomAt[sx]-margin;
    };
   }
   const isTallDarkPanel=height>=width&&luminance(color)<85;
   const separated=!surface.parts&&separate(out,surface,inside,screen);
   const crispNeon=!!separated?.refine||!separated&&isTallDarkPanel&&separateNeon(out,inside);
   if(separated||crispNeon)candidates.push({canvas:out,ground:hex(color),quad,box,crispNeon});
   if(candidates.length>1)return {ambiguous:true};
  }
 }
 return candidates[0]||null;
}
const api={prepare,refineNeonInk};
if(typeof module!=='undefined')module.exports=api;
else root.IlluminatedSign=api;
})(typeof globalThis!=='undefined'?globalThis:this);
