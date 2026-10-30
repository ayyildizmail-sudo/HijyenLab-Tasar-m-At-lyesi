/* Geometric technical-outline proposal, not proof that a border is non-brand art.
 * Original pixels only; all proposals require explicit visual confirmation. */
(function(root){'use strict';
function detect(data,w,h){
 if(!data||data.length!==w*h*4||w<100||h<100||w*h>5000000)return null;
 const ink=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let light=0,opaque=0;
 for(let i=0;i<w*h;i++){const j=i*4;if(data[j+3]<245)continue;opaque++;const low=Math.min(data[j],data[j+1],data[j+2]);if(low>240)light++;if(low<210)ink[i]=1;}
 if(opaque/(w*h)<.99||light/(w*h)<.8)return null;
 const components=[];
 for(let start=0;start<w*h;start++){if(!ink[start]||seen[start])continue;let head=0,tail=0;queue[tail++]=start;seen[start]=1;const pixels=[];let x0=w,y0=h,x1=-1,y1=-1;
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);pixels.push(p);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const n=ny*w+nx;if(ink[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}}}
  components.push({pixels,x0,y0,x1,y1});
 }
 let candidate=null;
 for(const c of components){const cw=c.x1-c.x0+1,ch=c.y1-c.y0+1;if(cw<w*.55||ch<h*.55||c.x0<2||c.y0<2||c.x1>w-3||c.y1>h-3||c.pixels.length/(cw*ch)>.035)continue;
  const left=new Int32Array(ch).fill(w),right=new Int32Array(ch).fill(-1),count=new Uint32Array(ch);
  for(const p of c.pixels){const y=Math.floor(p/w)-c.y0,x=p%w;left[y]=Math.min(left[y],x);right[y]=Math.max(right[y],x);count[y]++;}
  const edgeBand=Math.max(2,Math.ceil(ch*.02)),topRows=Array.from({length:edgeBand},(_,i)=>i),bottomRows=Array.from({length:edgeBand},(_,i)=>ch-1-i);
  const top=topRows.reduce((a,b)=>count[b]>count[a]?b:a),bottom=bottomRows.reduce((a,b)=>count[b]>count[a]?b:a),topSpan=right[top]-left[top]+1,bottomSpan=right[bottom]-left[bottom]+1;
  if(count[top]<cw*.85||count[bottom]<cw*.55||count[bottom]<bottomSpan*.85||topSpan/bottomSpan<1.08||topSpan/bottomSpan>1.55)continue;
  let valid=true,lastL=-1,lastR=w,totalSideRows=0;const maxThickness=Math.max(4,Math.ceil(cw*.018));
  for(let y=edgeBand;y<ch-edgeBand;y++){if(right[y]<0||count[y]>maxThickness*2){valid=false;break;}const l=left[y],r=right[y];if(r-l<bottomSpan*.85||l<lastL-2||r>lastR+2){valid=false;break;}lastL=l;lastR=r;totalSideRows++;}
  if(!valid||totalSideRows<ch*.9)continue;
  // Every side-row pixel must lie close to its two boundaries, not attached artwork.
  for(const p of c.pixels){const y=Math.floor(p/w)-c.y0,x=p%w;if(y>=edgeBand&&y<ch-edgeBand&&x-left[y]>maxThickness&&right[y]-x>maxThickness){valid=false;break;}}
  if(!valid)continue;if(candidate)return{needsSelection:true,reason:'Birden fazla olası teknik çerçeve var; korunacak alanı seçin.'};candidate={c,left,right};
 }
 if(!candidate)return null;
 const {c,left,right}=candidate,framePixels=new Set(c.pixels),gap=Math.max(4,Math.round(Math.min(c.x1-c.x0,c.y1-c.y0)*.035));let x0=w,y0=h,x1=-1,y1=-1,n=0;
 for(let i=0;i<w*h;i++)if(ink[i]&&!framePixels.has(i)){const x=i%w,y=Math.floor(i/w);if(y<=c.y0+gap||y>=c.y1-gap||x<=left[y-c.y0]+gap||x>=right[y-c.y0]-gap)return{needsSelection:true,reason:'Çerçeveye yakın veya dışında ek içerik var; korunacak alanı seçin.'};x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);n++;}
 if(n<20||x1-x0<(c.x1-c.x0)*.15||y1-y0<(c.y1-c.y0)*.08)return null;
 const pad=Math.max(3,Math.ceil(Math.max(x1-x0,y1-y0)*.025));
 return{box:[Math.max(c.x0+gap,x0-pad),Math.max(c.y0+gap,y0-pad),Math.min(c.x1-gap,x1+pad+1),Math.min(c.y1-gap,y1+pad+1)],requiresConfirmation:true,confidence:'thin-tapered-frame-proposal',reason:'İnce dış çizgi teknik çerçeve olabilir. Kaldırılan çizginin markanın parçası olmadığını ve tüm yazıların korunduğunu kontrol edin.'};
}
const api={detect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TechnicalFrame=api;
})(typeof globalThis!=='undefined'?globalThis:this);
