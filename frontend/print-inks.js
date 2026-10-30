/* Estimated spot-ink palette from artwork pixels, never from mockup material.
 * Screen RGB cannot establish physical ink separations. White is substrate;
 * clustering removes small JPEG/antialias variations, not semantic content.
 */
(function(root){'use strict';
const rgb=v=>Array.isArray(v)?v:typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v)?[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)):null;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const white=c=>Math.min(...c)>=238&&Math.max(...c)-Math.min(...c)<18;
const hex=c=>'#'+c.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
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
 const uncertain=palette.length>6||(!recolor&&unresolved>Math.max(8,visible*.002))||palette.some(c=>Math.min(...c)>210&&Math.max(...c)-Math.min(...c)<18)||(!recolor&&dominantCoverage<.88)||(!recolor&&stable>0&&unexplained/stable>.06)||(!recolor&&visibleNonWhite>20&&stable===0);
 return{count:palette.length,visibleNonWhite,colors:palette.map(hex),uncertain,reason:uncertain?'Renk ayrımı bu görselde güvenilir değil; teknik kontrol gerekli.':'Yaklaşık baskı rengi sayısı; teknik kontrolde kesinleşir.'};
}
const api={estimate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrintInks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
