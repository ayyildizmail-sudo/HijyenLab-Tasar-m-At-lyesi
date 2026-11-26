/* Source-derived flat-color DESIGN proposal. Never an assertion about original inks. */
(function(root){'use strict';
const hue=c=>{const hi=Math.max(...c),lo=Math.min(...c),d=hi-lo;if(!d)return 0;return ((hi===c[0]?(c[1]-c[2])/d:hi===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4)*60+360)%360;};
const gap=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
const luminance=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const chroma=c=>Math.max(...c)-Math.min(...c);
const neutral=c=>chroma(c)<18||Math.max(...c)<45;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const hex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
// This is a complete-source adapter, not a segmenter: disconnected lettering,
// dots and holes are retained. White carrier evidence and graphics/texture
// checks replace the former single-connected-component veto.
function sourceEvidence(data,w,h){
 const n=w*h,substrate=new Uint8Array(n),candidate=new Uint8Array(n),queue=new Int32Array(n),borderTones=[];let tail=0,border=0,clear=0;
 for(let p=0;p<n;p++){
  const i=p*4,x=p%w,y=Math.floor(p/w),c=[data[i],data[i+1],data[i+2]],outside=x===0||y===0||x===w-1||y===h-1;
  candidate[p]=!data[i+3]||(Math.min(...c)>=235&&chroma(c)<=12)?1:0;
  // Exact white knockouts are always protected, including enclosed ones.
  if(!data[i+3]||c.every(v=>v===255)||(outside&&candidate[p])){substrate[p]=1;queue[tail++]=p;}
  if(outside){border++;if(candidate[p]){clear++;if(data[i+3])borderTones.push(luminance(c));}}
 }
 if(clear/border<.98)return {passed:false,reason:'clear-carrier-border-required'};
 // A white-connected near-white pixel is not automatically carrier: a pale
 // word/logo can be connected to white on every side. Protect coherent pale
 // cores distinct from the observed border, away from dark/color JPEG edge
 // ringing, then retain their non-exact-white antialias footprint. This is not
 // a blanket keep-all-near-white rule; unseeded compression tones still flood.
 const borderTone=borderTones.length?borderTones.sort((a,b)=>a-b)[Math.floor(borderTones.length/2)]:255;
 const pale=new Uint8Array(n),paleQueue=[];
 const paleTone=p=>candidate[p]&&data[p*4+3]===255&&Math.min(data[p*4],data[p*4+1],data[p*4+2])<254;
 for(let p=0;p<n;p++){
  const i=p*4;if(!paleTone(p)||Math.max(data[i],data[i+1],data[i+2])>borderTone-2)continue;
  const x=p%w,y=Math.floor(p/w);if(x<4||y<4||x>=w-4||y>=h-4)continue;
  const same=q=>paleTone(q)&&[0,1,2].every(k=>Math.abs(data[q*4+k]-data[i+k])<=1);
  if(!((same(p-1)&&same(p+1))||(same(p-w)&&same(p+w))||(same(p+1)&&same(p+w)&&same(p+w+1))))continue;
  let edgeRinging=false;
  for(let dy=-3;dy<=3&&!edgeRinging;dy++)for(let dx=-3;dx<=3&&!edgeRinging;dx++){const q=(y+dy)*w+x+dx;if(data[q*4+3]&&!candidate[q])edgeRinging=true;}
  if(!edgeRinging){pale[p]=1;paleQueue.push(p);}
 }
 const protectedPale=[];
 for(const seed of paleQueue){
  if(pale[seed]===2)continue;const component=[seed],tones=new Map();let touchesInk=false,mode=0;pale[seed]=2;
  for(let head=0;head<component.length;head++){
   const p=component[head],i=p*4,x=p%w,y=Math.floor(p/w),key=data[i]*65536+data[i+1]*256+data[i+2],count=(tones.get(key)||0)+1;tones.set(key,count);mode=Math.max(mode,count);
   for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1]){
    if(q<0)continue;if(data[q*4+3]&&!candidate[q])touchesInk=true;
    if(pale[q]!==2&&paleTone(q)){pale[q]=2;component.push(q);}
   }
  }
  // A varying light ramp attached to colored ink is edge/highlight evidence,
  // not a new pale glyph. Detached coherent lettering, or a stable pale core
  // with its antialias edge, remains foreground even next to another color.
  if(!touchesInk||mode/component.length>=.30)for(const p of component){candidate[p]=0;protectedPale.push(p);}
 }
 for(let head=0;head<tail;head++){
  const p=queue[head],x=p%w,y=Math.floor(p/w);
  for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(q>=0&&!substrate[q]&&candidate[q]){substrate[q]=1;queue[tail++]=q;}
 }
 let total=0,minX=w,minY=h,maxX=0,maxY=0;
 for(let p=0;p<n;p++)if(!substrate[p]&&data[p*4+3]){const x=p%w,y=Math.floor(p/w);total++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 if(total<12)return {passed:false,reason:'insufficient-color-artwork'};
 const occupancy=total/((maxX-minX+1)*(maxY-minY+1));
 // A filled photo/card rectangle is not evidence of a complete isolated logo.
 // A solid rectangular logo can instead use its already accepted native route.
 if(occupancy>.965)return {passed:false,reason:'rectangular-source-needs-review'};
 return {passed:true,reason:'complete-isolated-graphic',substrate,total,occupancy,protectedPalePixels:protectedPale.length,bounds:[minX,minY,maxX,maxY]};
}
function proposePixels(data,width,height){
 const decline=reason=>({applied:false,reason});
 if(!(data instanceof Uint8ClampedArray)||!Number.isInteger(width)||!Number.isInteger(height)||width<5||height<5||width*height>4000000||data.length!==width*height*4)return decline('unsupported-source-size');
 const n=width*height,color=p=>[data[p*4],data[p*4+1],data[p*4+2]];
 // Flatten RGB, not interior transparency: such a source needs explicit review.
 for(let p=0;p<n;p++){const alpha=data[p*4+3];if(alpha===0||alpha===255)continue;const x=p%width,y=Math.floor(p/width);let edge=false;for(let dy=-2;dy<=2&&!edge;dy++)for(let dx=-2;dx<=2&&!edge;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height||data[(yy*width+xx)*4+3]===0)edge=true;}if(!edge)return decline('interior-opacity-ramp-needs-review');}
 const evidence=sourceEvidence(data,width,height);if(!evidence.passed)return decline(evidence.reason);
 const {substrate,total}=evidence,bins=new Map(),binAt=new Uint16Array(n),coreAt=new Uint8Array(n),exactCoreColors=new Set();let corePixels=0,roughPixels=0;
 for(let p=0;p<n;p++){
  if(substrate[p]||!data[p*4+3])continue;
  const c=color(p),x=p%width,y=Math.floor(p/width),key=(c[0]>>4)*256+(c[1]>>4)*16+(c[2]>>4);binAt[p]=key;
  let core=data[p*4+3]>=250,flatCore=true,rough=0;
  for(const q of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1]){
   if(q<0||substrate[q]||data[q*4+3]<250){core=false;continue;}
   const delta=distance(c,color(q));if(delta>2)flatCore=false;if(delta>26)core=false;if(delta>48)rough++;
  }
  if(core){corePixels++;coreAt[p]=1;if(exactCoreColors.size<4)exactCoreColors.add(hex(c));}if(rough>=3)roughPixels++;
  let bin=bins.get(key);if(!bin){bin={key,count:0,cores:0,flatCores:0,sum:[0,0,0],coreSum:[0,0,0],min:c.slice(),max:c.slice(),samples:[]};bins.set(key,bin);}
  bin.count++;if(bin.samples.length<6)bin.samples.push(p);if(core){bin.cores++;if(flatCore)bin.flatCores++;}for(let k=0;k<3;k++){bin.sum[k]+=c[k];bin.min[k]=Math.min(bin.min[k],c[k]);bin.max[k]=Math.max(bin.max[k],c[k]);if(core)bin.coreSum[k]+=c[k];}
 }
 if(corePixels/total<.32||roughPixels/total>.18)return decline('photographic-or-noisy-source-needs-review');
 const preserveFlatColors=exactCoreColors.size>=2&&exactCoreColors.size<=3;
 const ranked=[...bins.values()].map(b=>Object.assign(b,{color:b.sum.map(v=>Math.round(v/b.count)),weight:b.cores*5+b.count})).sort((a,b)=>b.weight-a.weight||a.key-b.key),groups=[];
 // Local stable cores dominate over antialias/JPEG/metallic-edge samples.
 // Keep luminance modes separate until adjacency evidence permits a merge.
 for(const bin of ranked){
  let best=-1,bestCost=Infinity;
  for(let j=0;j<groups.length;j++){
   const c=groups[j].color,sameNeutral=neutral(c)&&neutral(bin.color),sameHue=!neutral(c)&&!neutral(bin.color)&&gap(hue(c),hue(bin.color))<=30;
   const close=distance(c,bin.color)<=35||(sameNeutral&&Math.abs(luminance(c)-luminance(bin.color))<=38)||(sameHue&&Math.abs(luminance(c)-luminance(bin.color))<=44);
   const cost=distance(c,bin.color),distinctFlatCore=(preserveFlatColors&&bin.cores>0&&groups[j].cores>0&&cost>2)||(bin.flatCores>=Math.max(16,bin.cores*.5)&&groups[j].flatCores>=Math.max(16,groups[j].cores*.5)&&cost>35);if(close&&!distinctFlatCore&&cost<bestCost){best=j;bestCost=cost;}
  }
  if(best<0){best=groups.length;groups.push({color:bin.color,weight:0,count:0,cores:0,flatCores:0,bins:[]});}
  const group=groups[best];group.weight+=bin.weight;group.count+=bin.count;group.cores+=bin.cores;group.flatCores+=bin.flatCores;group.bins.push(bin);bin.group=best;
 }
 const substantial=groups.filter(g=>g.cores>=Math.max(12,corePixels*.008));
 const hueFamilies=[];for(const g of substantial){if(neutral(g.color))continue;const angle=hue(g.color);if(!hueFamilies.some(h=>gap(h,angle)<34))hueFamilies.push(angle);}
 if(substantial.length>22||hueFamilies.length>7)return decline('photographic-color-complexity-needs-review');
 // Tiny compression-only clusters attach to their nearest learned source core;
 // their pixels remain present. Core-bearing small shapes stay independent.
 for(const g of groups)g.flatDominance=Math.max(...g.bins.map(b=>b.cores))/Math.max(1,g.cores);
 const coherentTinyBin=b=>{if(b.count<3||b.count>5||!b.max.every((v,k)=>v===b.min[k]))return false;const seen=new Set([b.samples[0]]);for(let pass=0;pass<5;pass++)for(const p of b.samples)if(b.samples.some(q=>seen.has(q)&&(Math.abs(p-q)===width||(Math.abs(p-q)===1&&Math.floor(p/width)===Math.floor(q/width)))))seen.add(p);return seen.size>=3;};
 // A coreless group lying on the blend line between a cored ink and the white substrate is
 // anti-aliasing at that ink's edge, not an independent ink; its pixels follow the ink.
 const toWhite=(c,a)=>{const v=a.map(n=>255-n),den=v.reduce((n,x)=>n+x*x,0);if(!den)return distance(c,a);const t=Math.max(0,Math.min(1,v.reduce((n,x,k)=>n+x*(c[k]-a[k]),0)/den));return distance(c,a.map((n,k)=>n+t*v[k]));};
 const edgeBlend=g=>g.cores===0&&groups.some(h=>h.cores>=Math.max(8,total*.0005)&&toWhite(g.color,h.color)<=16);
 const stable=groups.map((g,k)=>({g,k})).filter(({g})=>!edgeBlend(g)&&(g.cores>=Math.max(8,total*.0005)||g.bins.some(b=>(b.count>=6&&b.max.every((v,k)=>v-b.min[k]<=2))||coherentTinyBin(b))));
 if(!stable.length||stable.length>36)return decline('source-core-complexity-needs-review');
 const nearest=(c,list)=>list.reduce((best,j)=>distance(c,groups[j].color)<distance(c,groups[best].color)?j:best,list[0]);
 const stableIds=stable.map(v=>v.k),redirect=groups.map((g,k)=>stableIds.includes(k)?k:nearest(g.color,stableIds));
 const labels=new Int16Array(n).fill(-1);for(let p=0;p<n;p++)if(!substrate[p]&&data[p*4+3])labels[p]=redirect[bins.get(binAt[p]).group];
 const edges=new Map(),whiteEdges=new Map();
 for(let p=0;p<n;p++){const label=labels[p];if(label<0)continue;const x=p%width,y=Math.floor(p/width);if([x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1].some(q=>q>=0&&substrate[q]))whiteEdges.set(label,(whiteEdges.get(label)||0)+1);}
 function adjacent(a,b,p,q){
  if(a<0||b<0||a===b)return;const ca=color(p),cb=color(q),ga=groups[a],gb=groups[b];
  if(distance(ca,cb)<55||distance(ca,ga.color)>40||distance(cb,gb.color)>40)return;
  // Broad tonal boundaries and gray/black details are structural; fine same-
  // hue metallic/shadow tones may share ink. Different-hue details are kept.
  const differentFamily=neutral(ga.color)!==neutral(gb.color)||(!neutral(ga.color)&&gap(hue(ga.color),hue(gb.color))>38);
  const structuralTone=ga.flatDominance>.6&&gb.flatDominance>.6&&ga.cores>=8&&gb.cores>=8&&Math.abs(luminance(ca)-luminance(cb))>35;
  if(!differentFamily&&!structuralTone)return;
  const key=Math.min(a,b)+':'+Math.max(a,b);edges.set(key,(edges.get(key)||0)+1);
 }
 for(let p=0;p<n;p++){if(labels[p]<0)continue;const x=p%width,y=Math.floor(p/width);if(x+1<width)adjacent(labels[p],labels[p+1],p,p+1);if(y+1<height)adjacent(labels[p],labels[p+width],p,p+width);}
 // Smooth interior ramps provide positive evidence that tonal modes belong to
 // one ink family. Hue similarity alone is never enough: flat navy/blue areas
 // (including detached or JPEG-compressed ones) must keep their own inks.
 // Probe across an actual mode boundary, away from carrier/antialias pixels;
 // a short edge blend or JPEG ringing cannot qualify as a sustained ramp.
 const gradientEdges=new Map(),gradientModes=new Map();
 const sameFamily=(a,b)=>neutral(a)&&neutral(b)||(!neutral(a)&&!neutral(b)&&gap(hue(a),hue(b))<=38);
 function continuousRamp(p,q,step){
  const a=labels[p],b=labels[q];if(a<0||b<0||!coreAt[p]||!coreAt[q]||!sameFamily(groups[a].color,groups[b].color))return;
  const delta=distance(color(p),color(q));if(delta<.8||delta>18)return;
  for(const radius of [4,8,16]){
   const x=p%width,y=Math.floor(p/width);if(step===1?(x<radius||x+radius>=width):(y<radius||y+radius>=height))continue;
   const first=p-radius*step,last=p+radius*step;if(!coreAt[first]||!coreAt[last])continue;
   const start=color(first),end=color(last),net=distance(start,end);if(net<24||Math.abs(luminance(start)-luminance(end))<16||!sameFamily(start,end))continue;
   let length=0,changes=0,valid=true,previous=start;
   for(let k=1;k<=radius*2;k++){
    const at=first+k*step;if(!coreAt[at]){valid=false;break;}const next=color(at),delta=distance(previous,next);
    if(delta>18||!sameFamily(start,next)){valid=false;break;}length+=delta;if(delta>=.8)changes++;previous=next;
   }
   if(valid&&changes>=5&&length<=net*1.4){gradientModes.set(a,(gradientModes.get(a)||0)+1);if(a!==b){const key=Math.min(a,b)+':'+Math.max(a,b);gradientEdges.set(key,(gradientEdges.get(key)||0)+1);}return;}
  }
 }
 if(!preserveFlatColors)for(let p=0;p<n;p++){
  if(labels[p]<0||!coreAt[p])continue;const x=p%width,y=Math.floor(p/width);
  if(x+1<width)continuousRamp(p,p+1,1);if(y+1<height)continuousRamp(p,p+width,width);
 }
 const gradientLinks=new Set([...gradientEdges].filter(([,count])=>count>=2).map(([key])=>key));
 // Disconnected letters can occupy disjoint portions of the same continuous
 // ramp; requiring them to touch would preserve a false second/third tone.
 // Associate their modes only after sustained interior-ramp evidence exists.
 const rampAnchors=[...gradientModes].filter(([,count])=>count>=2).map(([id])=>id);
 for(const anchor of rampAnchors){
  const fringes=new Set();
  const family=stableIds.filter(id=>{
   const g=groups[id],edgeTint=g.cores<g.count*.18&&(whiteEdges.get(id)||0)>=g.count*.4&&chroma(g.color)>=3&&(gap(hue(groups[anchor].color),hue(g.color))<=38||(distance(g.color,[255,255,255])<28&&g.cores<g.count*.1));
   if(edgeTint)fringes.add(id);return sameFamily(groups[anchor].color,g.color)||edgeTint;
  });
  for(let i=0;i<family.length;i++)for(let j=i+1;j<family.length;j++){
   const a=family[i],b=family[j],key=Math.min(a,b)+':'+Math.max(a,b);
   if(!edges.has(key)||fringes.has(a)||fringes.has(b))gradientLinks.add(key);
  }
 }
 const conflicts=new Set([...edges].filter(([key,count])=>count>=2&&!gradientLinks.has(key)).map(([key])=>key));
 let clusters=stableIds.map(k=>({ids:[k],weight:groups[k].weight,color:groups[k].color}));
 const conflicting=(a,b)=>a.ids.some(i=>b.ids.some(j=>conflicts.has(Math.min(i,j)+':'+Math.max(i,j))));
 const similarity=(a,b)=>{
  const c=a.color,d=b.color,same=neutral(c)&&neutral(d)||(!neutral(c)&&!neutral(d)&&gap(hue(c),hue(d))<=38);
  return (same?.12:1)*(distance(c,d)+(!neutral(c)&&!neutral(d)?gap(hue(c),hue(d))*.6:50))*Math.min(a.weight,b.weight);
 };
 // Flatten each evidenced gradient family before applying the three-ink
 // ceiling. Three is a maximum, never the desired number of tonal steps.
 // The representative is an observed source core in the dominant source bin,
 // not an invented gold color, averaged metallic palette or user/brand lookup.
 function dominantSourceColor(ids){
  const candidates=ids.flatMap(id=>groups[id].bins).filter(bin=>bin.cores>0).sort((a,b)=>b.weight-a.weight||a.key-b.key);
  // Near-white JPEG/antialias fringes may outnumber a fine glyph's interiors;
  // they are not its dominant ink. Prefer a genuine non-carrier core band.
  const dominant=candidates.find(bin=>distance(bin.color,[255,255,255])>=52)||candidates[0];
  if(!dominant)return groups[ids[0]].color;
  const center=dominant.coreSum.map(v=>v/dominant.cores);let chosen=null,best=Infinity;
  for(let p=0;p<n;p++)if(coreAt[p]&&binAt[p]===dominant.key){const c=color(p),d=distance(c,center);if(d<best){chosen=c;best=d;}}
  return chosen||dominant.color;
 }
 let flattenedGradientFamilies=0;
 // Geçiş bağları zincirleme izlenir (mavi↔beyaz hale↔siyah). Hale/kenar kümesi köprü olup iki ayrı
 // renk ailesini (ör. mavi ve siyah) tek mürekkepte birleştirmesin: belirgin çekirdekli kümelerin aileleri uyuşmalı.
 const strongId=id=>groups[id].cores>=Math.max(12,corePixels*.02)&&distance(groups[id].color,[255,255,255])>=52;
 const familiesAgree=(x,y)=>{const A=x.ids.filter(strongId),B=y.ids.filter(strongId);return A.every(i=>B.every(j=>sameFamily(groups[i].color,groups[j].color)));};
 for(const key of gradientLinks){
  const [a,b]=key.split(':').map(Number),i=clusters.findIndex(c=>c.ids.includes(a)),j=clusters.findIndex(c=>c.ids.includes(b));
  if(i<0||j<0||i===j||conflicting(clusters[i],clusters[j])||!familiesAgree(clusters[i],clusters[j]))continue;
  const first=clusters[i],second=clusters[j],ids=first.ids.concat(second.ids);clusters[i]={ids,weight:first.weight+second.weight,color:dominantSourceColor(ids),gradient:true};clusters.splice(j,1);
 }
 flattenedGradientFamilies=clusters.filter(c=>c.gradient).length;
 // Gölgeli, çok renkli resim (maskot/illüstrasyon): birden çok renk geçişi ailesini düzleştirmek tasarımı bozar.
 // Öneri yapılmaz; görsel özgün renkleriyle kalır, baskı yöntemi teknik incelemede belirlenir.
 if(flattenedGradientFamilies>=3||(substantial.length>=6&&stableIds.length>=9))return decline('full-color-illustration-preserved');
 // Preserve an already-two/three-color logo, but merge tonal variants of the
 // same family first when reduction is needed. This is real pixel remapping.
 while(clusters.length>3){
  let pair=null,cost=Infinity;
  for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++)if(!conflicting(clusters[i],clusters[j])){const value=similarity(clusters[i],clusters[j]);if(value<cost){pair=[i,j];cost=value;}}
  if(!pair)return decline('contrasting-adjacencies-need-more-than-three-inks');
  const [i,j]=pair,a=clusters[i],b=clusters[j];clusters[i]={ids:a.ids.concat(b.ids),weight:a.weight+b.weight,color:a.weight>=b.weight?a.color:b.color};clusters.splice(j,1);
 }
 // Gradient/shadow-only modes can collapse below three. Do not add an ink to
 // fill the budget, and do not merge genuinely distinct source colors <=3.
 for(let i=0;i<clusters.length;i++)for(let j=clusters.length-1;j>i;j--){const a=clusters[i],b=clusters[j];const edgeOnly=c=>c.ids.every(id=>!groups[id].cores&&(whiteEdges.get(id)||0)>=groups[id].count*.25);const sameFamily=neutral(a.color)&&neutral(b.color)||(!neutral(a.color)&&!neutral(b.color)&&gap(hue(a.color),hue(b.color))<=38);if(!conflicting(a,b)&&((distance(a.color,b.color)<36&&!(preserveFlatColors&&a.ids.some(id=>groups[id].cores>0)&&b.ids.some(id=>groups[id].cores>0)))||(sameFamily&&(edgeOnly(a)||edgeOnly(b))))){clusters[i]={ids:a.ids.concat(b.ids),weight:a.weight+b.weight,color:a.weight>=b.weight?a.color:b.color};clusters.splice(j,1);}}
 const mapping=new Map();for(const cluster of clusters)for(const id of cluster.ids)mapping.set(id,cluster.color);
 for(const key of conflicts){const [a,b]=key.split(':').map(Number);if(distance(mapping.get(a),mapping.get(b))<45)return decline('rendered-contrast-needs-review');}
 // Every classified foreground pixel gets a nonwhite ink. No component/letter
 // deletion, dilation, inpainting, contour redraw or alpha normalization.
 const output=new Uint8ClampedArray(data),used=new Set();let changedPixels=0,whitePixels=0;
 for(let p=0;p<n;p++){
  const i=p*4;if(!data[i+3])continue;const target=substrate[p]?[255,255,255]:mapping.get(labels[p]);
  if(!target)return decline('unmapped-source-detail');
  if(target.some((v,k)=>v!==data[i+k]))changedPixels++;output.set(target,i);
  if(substrate[p])whitePixels++;else used.add(hex(target));
 }
 const palette=[...used];if(!palette.length||palette.length>3)return decline('rendered-palette-over-limit');
 const shape={passed:true,reason:evidence.reason,occupancy:evidence.occupancy,bounds:evidence.bounds,foregroundPixels:total,protectedPalePixels:evidence.protectedPalePixels,coreFraction:corePixels/total};
 return {applied:true,data:output,originalData:new Uint8ClampedArray(data),metadata:{method:'source-flat-flexo-proposal-v1',algorithmRevision:'continuous-source-family-v3',width,height,shapeEvidence:shape,actualProposedPalette:palette,proposedInkCount:palette.length,whiteIsSubstrate:true,alphaUnchanged:true,sourceOriginalPreserved:true,customerApprovalRequired:true,commercialPermission:false,physicalInkCountConfirmed:false,changedPixels,whitePixels,contrastEvidence:{method:'source-core-sharp-adjacencies',checkedPairs:conflicts.size,preserved:true},paletteReduction:{method:'continuous-family-then-weighted-cores-with-adjacency-guards',gradientEvidence:{method:'sustained-interior-source-ramps',linkedModePairs:gradientLinks.size,flattenedFamilies:flattenedGradientFamilies},sourceCoreGroupCount:stable.length,maximumProposedInks:3,actualRenderedInkCount:palette.length},sourceCoreGroupCount:stable.length,limitations:['New flat-color design proposal, not original ink count or print master','Source pixel positions and alpha retained; gradients, shadows and metallic texture are flattened','Carrier/foreground are inferred locally; review all lettering and holes, especially near-white details','Customer approval of this output and separate producer review required; not all photographs or incomplete sources can be adapted']}};
}
async function digest(bytes){const value=await root.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(value),v=>v.toString(16).padStart(2,'0')).join('');}
async function propose(data,width,height,options={}){if(!/^[a-f0-9]{64}$/i.test(options.sourceSHA256||''))return {applied:false,reason:'source-hash-required'};const result=proposePixels(data,width,height);if(!result.applied)return result;result.metadata=Object.freeze({...result.metadata,sourceSHA256:options.sourceSHA256,sourcePixelSHA256:await digest(result.originalData),outputPixelSHA256:await digest(result.data),actualProposedPalette:Object.freeze(result.metadata.actualProposedPalette)});return result;}
const api=Object.freeze({propose,proposePixels});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FlexoDesignProposal=api;
})(typeof globalThis!=='undefined'?globalThis:this);
