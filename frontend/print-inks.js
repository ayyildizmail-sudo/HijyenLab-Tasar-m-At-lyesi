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
function artworkCorePalette(data,width,height,clusters,radius=1,spatialPairs=false,allowFlat=false){
 const support=clusters.map(()=>0),segmentDistance=(p,a,b)=>{const v=b.map((n,k)=>n-a[k]),den=v.reduce((n,x)=>n+x*x,0);if(!den)return dist(p,a);const t=Math.max(0,Math.min(1,v.reduce((n,x,k)=>n+x*(p[k]-a[k]),0)/den));return dist(p,a.map((n,k)=>n+t*v[k]));};
 for(let y=radius;y<height-radius;y++)for(let x=radius;x<width-radius;x++){
  const i=(y*width+x)*4,c=[data[i],data[i+1],data[i+2]];if(data[i+3]<220||white(c))continue;
  let core=true;for(let dy=-radius;dy<=radius&&core;dy++)for(let dx=-radius;dx<=radius&&core;dx++){const j=((y+dy)*width+x+dx)*4;if(data[j+3]<220||dist(c,[data[j],data[j+1],data[j+2]])>12)core=false;}
  if(!core)continue;let best=-1,delta=48;clusters.forEach((k,n)=>{const d=dist(c,k.color);if(d<delta){best=n;delta=d;}});if(best>=0)support[best]++;
 }
 const kept=clusters.filter((_,i)=>support[i]>=4),removed=clusters.filter((_,i)=>support[i]<4);
 if(!kept.length||kept.length>6||(!removed.length&&!allowFlat))return null;
 // Validating a flat palette does not require deleting an unsupported shade.
 // A thin real mark may have no square core. Do not erase a detached line
 // just because its RGB lies on an ink-to-black/white blend segment.
 for(let i=0;i<data.length&&removed.length;i+=4){
  if(data[i+3]<220)continue;const c=[data[i],data[i+1],data[i+2]];
  if(white(c)||!removed.some(k=>dist(c,k.color)<=12)||kept.some(k=>dist(c,k.color)<48))continue;
  const x=i/4%width,y=Math.floor(i/4/width);let near=false;
  for(let dy=-6;dy<=6&&!near;dy++)for(let dx=-6;dx<=6&&!near;dx++){
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const j=(yy*width+xx)*4;
   if(data[j+3]>=220&&kept.some(k=>dist([data[j],data[j+1],data[j+2]],k.color)<48))near=true;
  }
  if(!near)return null;
 }
 // A stable ink-sized patch is retained above. Only unsupported, explained
 // shades are omitted; a new unrelated colour remains unresolved, not free.
 function localPair(c,index){
  if(!spatialPairs)return false;const edgeColors=kept.map(k=>k.color).concat([[255,255,255]]);const x=index/4%width,y=Math.floor(index/4/width);
  for(let a=0;a<edgeColors.length;a++)for(let b=a+1;b<edgeColors.length;b++){
   if(segmentDistance(c,edgeColors[a],edgeColors[b])>48)continue;
   let nearA=false,nearB=false;
   for(let dy=-6;dy<=6&&!(nearA&&nearB);dy++)for(let dx=-6;dx<=6&&!(nearA&&nearB);dx++){
    const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const j=(yy*width+xx)*4;if(data[j+3]<220)continue;
    const p=[data[j],data[j+1],data[j+2]];if(dist(p,edgeColors[a])<48)nearA=true;if(dist(p,edgeColors[b])<48)nearB=true;
   }
   if(nearA&&nearB)return true;
  }return false;
 }
 let total=0,explained=0,pairExplained=0;
 for(let i=0;i<data.length;i+=4){const c=[data[i],data[i+1],data[i+2]];if(data[i+3]<220||white(c))continue;total++;
  if(kept.some(k=>Math.min(segmentDistance(c,k.color,[255,255,255]),segmentDistance(c,k.color,[0,0,0]))<=32))explained++;else if(localPair(c,i)){explained++;pairExplained++;}
 }
 const coverage=total?explained/total:0;
 if(coverage<.97||removed.some(k=>Math.min(...kept.map(a=>Math.min(segmentDistance(k.color,a.color,[255,255,255]),segmentDistance(k.color,a.color,[0,0,0]))))>32&&!(spatialPairs&&kept.some(a=>kept.some(b=>segmentDistance(k.color,a.color,b.color)<=32)))))return null;
 return {colors:kept.map(k=>k.color),evidence:{coreSupport:support,explainedFraction:coverage,discardedUnsupportedShades:removed.length,coreRadius:radius,spatialPairPixels:pairExplained}};
}
// Preserve coherent one-pixel strokes that the square-core sampler cannot
// represent. A detached run is not antialiasing of a distant palette anchor.
function hasDetachedColorRun(data,width,height,colors){
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,c=[data[i],data[i+1],data[i+2]];
  if(data[i+3]<220||white(c)||dist(c,[255,255,255])<48||colors.some(a=>dist(c,a)<48))continue;
  const run=[[1,0],[0,1],[1,1],[-1,1]].some(([dx,dy])=>{
   for(let n=1;n<4;n++){const xx=x+dx*n,yy=y+dy*n;if(xx<0||xx>=width||yy>=height)return false;const j=(yy*width+xx)*4;if(data[j+3]<220||dist(c,[data[j],data[j+1],data[j+2]])>12)return false;}return true;
  });
  if(!run)continue;let near=false;
  for(let dy=-6;dy<=6&&!near;dy++)for(let dx=-6;dx<=6&&!near;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const j=(yy*width+xx)*4;if(data[j+3]>=220&&colors.some(a=>dist(a,[data[j],data[j+1],data[j+2]])<48))near=true;}
  if(!near)return true;
 }return false;
}
// A continuous spatial colour ramp is not a set of flat spot inks, even when
// quantisation happens to create fewer than six bins. JPEG texture interrupts
// this strictly monotonic run; it is not classified as a ramp by hue alone.
function hasContinuousRamp(data,width,height,alphaOnly=false){
 if(!data)return false;
 for(const vertical of [false,true]){const across=vertical?width:height,along=vertical?height:width;
  for(let row=0;row<across;row+=Math.max(1,Math.floor(across/48))){let start=null,previous=null,direction=[0,0,0],run=0;
   for(let col=0;col<along;col++){const x=vertical?row:col,y=vertical?col:row,i=(y*width+x)*4,source=[data[i],data[i+1],data[i+2]],c=alphaOnly?[data[i+3],data[i+3],data[i+3]]:source;
    let usable=alphaOnly?data[i+3]>0:data[i+3]>=220&&!white(source);
    // Opacity is a tone only inside an existing mark. Do not classify its
    // transparent antialias boundary as a continuous artwork gradient.
    if(alphaOnly&&usable){if(x<1||y<1||x>=width-1||y>=height-1)usable=false;
     for(let dy=-1;dy<=1&&usable;dy++)for(let dx=-1;dx<=1&&usable;dx++){const j=((y+dy)*width+x+dx)*4;if(!data[j+3]||dist(source,[data[j],data[j+1],data[j+2]])>12)usable=false;}
    }
    if(!usable){start=previous=null;run=0;direction=[0,0,0];continue;}
    const delta=previous&&c.map((v,k)=>v-previous[k]);
    const smooth=delta&&Math.hypot(...delta)<=8&&delta.every((v,k)=>!direction[k]||!v||Math.sign(v)===direction[k]);
    if(!smooth){start=c;run=1;direction=[0,0,0];}else{run++;delta.forEach((v,k)=>{if(v)direction[k]=Math.sign(v);});if(run>=32&&dist(start,c)>64)return true;}
    previous=c;
   }
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
 const opacityRamp=hasContinuousRamp(data,width,height,true);
 const ramp=opacityRamp||(!recolor&&hasContinuousRamp(data,width,height));
 let uncertain=ramp||palette.length>6||(!recolor&&unresolved>Math.max(8,visible*.002))||palette.some(c=>Math.min(...c)>210&&Math.max(...c)-Math.min(...c)<18)||(!recolor&&dominantCoverage<.88)||(!recolor&&stable>0&&unexplained/stable>.06)||(!recolor&&visibleNonWhite>20&&stable===0);
 if(!ramp&&options.acceptedArtwork===true&&!recolor&&data&&data.length===width*height*4){
  const resolved=(uncertain?artworkCorePalette(data,width,height,clusters):null)||artworkCorePalette(data,width,height,clusters,2,true)||artworkCorePalette(data,width,height,clusters,1,false,true);
  // Cleanup cannot turn an already-certain over-limit palette into a payable
  // in-limit count. Proximity alone cannot distinguish a real fourth thin ink.
  if(resolved&&((!uncertain&&palette.length>3&&resolved.colors.length<=3)||hasDetachedColorRun(data,width,height,resolved.colors)))uncertain=true;
  else if(resolved){const result=estimate(null,0,0,{background:options.background,textColor:options.textColor});
   const inks=resolved.colors.slice();for(const color of result.colors){const c=rgb(color);if(!inks.some(p=>dist(p,c)<48))inks.push(c);}
   // Explicit colours stay distinct from one another, including very close RGB.
   const explicit=[background,text].filter(c=>c&&!c.every(v=>v===255));if(explicit.length===2&&dist(explicit[0],explicit[1])>0&&dist(explicit[0],explicit[1])<48&&inks.filter(p=>explicit.some(c=>dist(p,c)<48)).length<2)inks.push(explicit[1]);
   if(inks.length<=6)return {contentEvidence:{content:'flat-colors',basis:'accepted-artwork-core-palette',physicalInksConfirmed:false},count:inks.length,visibleNonWhite,colors:inks.map(hex),uncertain:false,method:'accepted-artwork-core-palette',evidence:resolved.evidence,reason:'Ayrıştırılmış görseldeki renk çekirdeklerinden yaklaşık klişe hesabı; baskı ayrımı garantisi değildir.'};
  }
 }
 return{contentEvidence:{content:ramp?'continuous-gradient':data&&options.acceptedArtwork===true&&!uncertain?'flat-colors':'unknown',basis:opacityRamp?'continuous-artwork-opacity-ramp':ramp?'continuous-artwork-rgb-ramp':'rgb-palette-estimate',physicalInksConfirmed:false},count:palette.length,visibleNonWhite,colors:palette.map(hex),uncertain,reason:uncertain?'Renk ayrımı bu görselde güvenilir değil; teknik kontrol gerekli.':'Yaklaşık baskı rengi sayısı; teknik kontrolde kesinleşir.'};
}
const api={estimate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrintInks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
