/* Estimated spot-ink palette from artwork pixels, never from mockup material.
 * Screen RGB cannot establish physical ink separations. White is substrate;
 * clustering removes small JPEG/antialias variations, not semantic content.
 */
(function(root){'use strict';
const rgb=v=>Array.isArray(v)?v:typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v)?[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)):null;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const white=c=>Math.min(...c)>=238&&Math.max(...c)-Math.min(...c)<18;
const hex=c=>'#'+c.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
// A preview-only second pass for already isolated artwork. Unsupported shades
// may be edge/matte/light variations, but two genuine flat inks retain their
// own local cores even when they have the same hue. This never edits artwork.
function artworkCorePalette(data,width,height,clusters){
 const support=clusters.map(()=>0),segmentDistance=(p,a,b)=>{const v=b.map((n,k)=>n-a[k]),den=v.reduce((n,x)=>n+x*x,0);if(!den)return dist(p,a);const t=Math.max(0,Math.min(1,v.reduce((n,x,k)=>n+x*(p[k]-a[k]),0)/den));return dist(p,a.map((n,k)=>n+t*v[k]));};
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const i=(y*width+x)*4,c=[data[i],data[i+1],data[i+2]];if(data[i+3]<220||white(c))continue;
  let core=true;for(let dy=-1;dy<=1&&core;dy++)for(let dx=-1;dx<=1&&core;dx++){const j=((y+dy)*width+x+dx)*4;if(data[j+3]<220||dist(c,[data[j],data[j+1],data[j+2]])>12)core=false;}
  if(!core)continue;let best=-1,delta=48;clusters.forEach((k,n)=>{const d=dist(c,k.color);if(d<delta){best=n;delta=d;}});if(best>=0)support[best]++;
 }
 const kept=clusters.filter((_,i)=>support[i]>=4),removed=clusters.filter((_,i)=>support[i]<4);
 if(!kept.length||kept.length>6||!removed.length)return null;
 // A stable ink-sized patch is retained above. Only unsupported, explained
 // shades are omitted; a new unrelated colour remains unresolved, not free.
 let total=0,explained=0;
 for(let i=0;i<data.length;i+=4){const c=[data[i],data[i+1],data[i+2]];if(data[i+3]<220||white(c))continue;total++;
  if(kept.some(k=>Math.min(segmentDistance(c,k.color,[255,255,255]),segmentDistance(c,k.color,[0,0,0]))<=32))explained++;
 }
 const coverage=total?explained/total:0;
 if(coverage<.97||removed.some(k=>Math.min(...kept.map(a=>Math.min(segmentDistance(k.color,a.color,[255,255,255]),segmentDistance(k.color,a.color,[0,0,0]))))>32))return null;
 return {colors:kept.map(k=>k.color),evidence:{coreSupport:support,explainedFraction:coverage,discardedUnsupportedShades:removed.length}};
}
// A continuous spatial colour ramp is not a set of flat spot inks, even when
// quantisation happens to create fewer than six bins. JPEG texture interrupts
// this strictly monotonic run; it is not classified as a ramp by hue alone.
function hasContinuousRamp(data,width,height){
 if(!data)return false;
 for(let y=0;y<height;y+=Math.max(1,Math.floor(height/48))){let start=null,previous=null,direction=[0,0,0],run=0;
  for(let x=0;x<width;x++){const i=(y*width+x)*4,c=[data[i],data[i+1],data[i+2]];
   if(data[i+3]<220||white(c)){start=previous=null;run=0;direction=[0,0,0];continue;}
   const delta=previous&&c.map((v,k)=>v-previous[k]);
   const smooth=delta&&Math.hypot(...delta)<=8&&delta.every((v,k)=>!direction[k]||!v||Math.sign(v)===direction[k]);
   if(!smooth){start=c;run=1;direction=[0,0,0];}else{run++;delta.forEach((v,k)=>{if(v)direction[k]=Math.sign(v);});if(run>=32&&dist(start,c)>64)return true;}
   previous=c;
  }
 }
 return false;
}
function estimate(data,width,height,options={}){
 const palette=[],explicitColors=[],add=(c,explicit=false)=>{if(!c||(explicit?c.every(v=>v===255):white(c)))return;const exact=explicitColors.some(p=>dist(p,c)===0),differentExplicit=explicitColors.some(p=>dist(p,c)>0&&dist(p,c)<48);if(!exact&&((explicit&&differentExplicit)||!palette.some(p=>dist(p,c)<48)))palette.push(c);if(explicit&&!exact)explicitColors.push(c);};
 const background=rgb(options.background),text=rgb(options.textColor),recolor=rgb(options.recolor);
 add(background,true);let stable=0,visible=0,visibleNonWhite=0,bins=new Map(),unresolvedColors=[];
 if(data&&data.length===width*height*4){
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;if(data[i+3]<220)continue;visible++;
   const c=[data[i],data[i+1],data[i+2]];if(white(c))continue;visibleNonWhite++;
   let same=0,neighbors=0;
   for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;neighbors++;const j=(ny*width+nx)*4;if(data[j+3]>=220&&dist(c,[data[j],data[j+1],data[j+2]])<25)same++;}
   // Reject transition pixels rather than treating every anti-aliased shade as ink.
   if(neighbors&&same<Math.min(3,neighbors)){if(Math.max(...c)-Math.min(...c)>24)unresolvedColors.push(c);continue;}stable++;
   const key=c.map(v=>Math.floor(v/24)).join(',');let b=bins.get(key);if(!b){b={n:0,sum:[0,0,0]};bins.set(key,b);}b.n++;c.forEach((v,k)=>b.sum[k]+=v);
  }
 }
 let unexplained=0,clusters=[];
 if(recolor){if(visible)add(recolor,true);}else{
  for(const b of [...bins.values()].sort((a,b)=>b.n-a.n)){
   const c=b.sum.map(v=>v/b.n),found=clusters.find(k=>dist(k.color,c)<48);
   if(found){found.n+=b.n;continue;}
   if(b.n<Math.max(4,stable*.001)){unexplained+=b.n;continue;}
   clusters.push({color:c,n:b.n});
  }
  for(const c of clusters)add(c.color);
 }
 add(text,true);
 const dominantCoverage=stable?[...bins.values()].sort((a,b)=>b.n-a.n).slice(0,12).reduce((n,b)=>n+b.n,0)/stable:1;
 const anchors=palette.concat([[255,255,255]]);
 const blend=c=>{for(let i=0;i<anchors.length;i++)for(let j=i+1;j<anchors.length;j++){const a=anchors[i],b=anchors[j],v=b.map((n,k)=>n-a[k]),den=v.reduce((n,x)=>n+x*x,0);if(!den)continue;const t=Math.max(0,Math.min(1,v.reduce((n,x,k)=>n+x*(c[k]-a[k]),0)/den));if(dist(c,a.map((n,k)=>n+t*v[k]))<22)return true;}return false;};
 const unresolved=unresolvedColors.filter(c=>!palette.some(p=>dist(p,c)<60)&&!blend(c)).length;
 const ramp=!recolor&&hasContinuousRamp(data,width,height);
 const uncertain=ramp||palette.length>6||(!recolor&&unresolved>Math.max(8,visible*.002))||palette.some(c=>Math.min(...c)>210&&Math.max(...c)-Math.min(...c)<18)||(!recolor&&dominantCoverage<.88)||(!recolor&&stable>0&&unexplained/stable>.06)||(!recolor&&visibleNonWhite>20&&stable===0);
 if(uncertain&&!ramp&&options.acceptedArtwork===true&&!recolor&&data&&data.length===width*height*4){
  const resolved=artworkCorePalette(data,width,height,clusters);
  if(resolved){const result=estimate(null,0,0,{background:options.background,textColor:options.textColor});
   const inks=resolved.colors.slice();for(const color of result.colors){const c=rgb(color);if(!inks.some(p=>dist(p,c)<48))inks.push(c);}
   // Explicit colours stay distinct from one another, including very close RGB.
   const explicit=[background,text].filter(c=>c&&!c.every(v=>v===255));if(explicit.length===2&&dist(explicit[0],explicit[1])>0&&dist(explicit[0],explicit[1])<48&&inks.filter(p=>explicit.some(c=>dist(p,c)<48)).length<2)inks.push(explicit[1]);
   if(inks.length<=6)return {count:inks.length,visibleNonWhite,colors:inks.map(hex),uncertain:false,method:'accepted-artwork-core-palette',evidence:resolved.evidence,reason:'Ayrıştırılmış görseldeki renk çekirdeklerinden yaklaşık klişe hesabı; baskı ayrımı garantisi değildir.'};
  }
 }
 return{count:palette.length,visibleNonWhite,colors:palette.map(hex),uncertain,reason:uncertain?'Renk ayrımı bu görselde güvenilir değil; teknik kontrol gerekli.':'Yaklaşık baskı rengi sayısı; teknik kontrolde kesinleşir.'};
}
const api={estimate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrintInks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
