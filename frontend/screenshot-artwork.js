/* Conservative phone-screen chrome detection, not general semantic logo recognition.
 * Returns an original-pixel central region proposal requiring visual confirmation.
 * Never reconstructs clipped artwork or treats arbitrary margins as screen controls. */
(function(root){'use strict';
// A composite page may contain a product photo AND an already isolated graphic.
// Analyze whitespace-separated panels, not a particular phone model, caption, brand or location.
// This is a review proposal: it does not infer that two representations are the same brand.
function composite(data,width,height){
 if(!data||data.length!==width*height*4||width<160||height<320||height/width<1.2||height/width>4)return null;
 const scale=Math.min(1,1000/height),w=Math.round(width*scale),h=Math.round(height*scale),ink=new Uint8Array(w*h),rows=new Uint32Array(h);let opaque=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(Math.min(height-1,Math.floor(y*height/h))*width+Math.min(width-1,Math.floor(x*width/w)))*4;
  if(data[i+3]<245)continue;opaque++;if(Math.min(data[i],data[i+1],data[i+2])<235){ink[y*w+x]=1;rows[y]++;}
 }
 if(opaque<w*h*.99)return null;
 const bands=[],gap=Math.max(3,Math.round(w*.018));let start=-1,last=-1;
 for(let y=0;y<h;y++)if(rows[y]>=2){if(start<0)start=y;else if(y-last>gap){bands.push([start,last+1]);start=y;}last=y;}
 if(start>=0)bands.push([start,last+1]);if(bands.length<3)return null;
 const panels=bands.map(([y0,y1])=>{let x0=w,x1=0,n=0;for(let y=y0;y<y1;y++)for(let x=0;x<w;x++)if(ink[y*w+x]){x0=Math.min(x0,x);x1=Math.max(x1,x+1);n++;}return{x0,y0,x1,y1,n,bw:x1-x0,bh:y1-y0,density:n/((x1-x0)*(y1-y0))};});
 // Require surrounding document/UI evidence. A stand-alone sparse logo is untouched.
 const dense=panels.some(p=>p.bw>w*.65&&p.density>.55&&(p.bh>w*.3||(p.bh>w*.06&&p.bh<w*.22)));
 const captions=panels.some(p=>p.bh<w*.10&&p.bw>w*.2);
 if(!dense||!captions)return null;
 const candidates=[];
 for(const p of panels){
  const {x0,x1,y0,y1,bw,bh,density}=p;
  if(bw<w*.22||bh<w*.18||bw/bh<.35||bw/bh>4||density<.025||density>.38||x0<w*.06||x1>w*.94||y0<gap||y1>h-gap)continue;
  // Plain paragraph text has no tall graphic stroke. Rectangular help-card borders
  // are not artwork evidence either; assess component geometry, never read the text.
  const seen=new Uint8Array(w*bh),queue=new Int32Array(bw*bh);let graphic=false;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const index=(y-y0)*w+x;if(!ink[y*w+x]||seen[index])continue;
   let head=0,tail=0,cx0=x,cx1=x,cy0=y,cy1=y;queue[tail++]=y*w+x;seen[index]=1;
   while(head<tail){const v=queue[head++],vx=v%w,vy=Math.floor(v/w);cx0=Math.min(cx0,vx);cx1=Math.max(cx1,vx);cy0=Math.min(cy0,vy);cy1=Math.max(cy1,vy);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=vx+dx,ny=vy+dy,ni=(ny-y0)*w+nx;if(nx<x0||nx>=x1||ny<y0||ny>=y1||seen[ni]||!ink[ny*w+nx])continue;seen[ni]=1;queue[tail++]=ny*w+nx;}
   }
   const cw=cx1-cx0+1,ch=cy1-cy0+1;if(ch<bh*.3||cw<bw*.12||tail/(cw*ch)>.55)continue;
   let edge=0;const rim=Math.max(1,Math.min(cw,ch)*.035);for(let j=0;j<tail;j++){const vx=queue[j]%w,vy=Math.floor(queue[j]/w);if(vx-cx0<rim||cx1-vx<rim||vy-cy0<rim||cy1-vy<rim)edge++;}
   if(edge/tail<.65)graphic=true;
  }
  if(graphic)candidates.push(p);
 }
 if(!candidates.length)return null;
 if(candidates.length!==1)return{needsSelection:true,reason:'Birden fazla ayrı grafik alanı bulundu; kullanacağınız logoyu seçin.'};
 const p=candidates[0],pad=Math.max(3,Math.round(w*.02)),index=panels.indexOf(p),previous=panels[index-1],next=panels[index+1];
 // Keep small adjacent typography instead of silently dropping an isolated tagline.
 // Close captions make this proposal ambiguous; the user can select the full group.
 if((previous&&p.y0-previous.y1<gap*2)||(next&&next.y0-p.y1<gap*2))return{needsSelection:true,reason:'Grafiğe yakın ek yazı var; marka alanının tamamını seçin.'};
 const top=Math.max(previous?previous.y1+1:0,p.y0-pad),bottom=Math.min(next?next.y0-1:h,p.y1+pad);
 return{box:[0,Math.floor(top*height/h),width,Math.ceil(bottom*height/h)],confidence:'isolated-composite-graphic',reason:'Fotoğraf ve arayüzden ayrı grafik alanı önerildi; tüm yazı ve simgeleri kontrol edin.',requiresConfirmation:true};
}
function detect(data,width,height){
 const panel=composite(data,width,height);if(panel)return panel;
 if(!data||data.length!==width*height*4||width<160||height<320||height/width<1.65||height/width>2.65)return null;
 const scale=Math.min(1,800/height),w=Math.round(width*scale),h=Math.round(height*scale),ink=new Uint8Array(w*h),dark=new Uint8Array(w*h),rows=new Uint32Array(h);let opaque=0,light=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.min(height-1,Math.floor(y/scale))*width+Math.min(width-1,Math.floor(x/scale)))*4,j=y*w+x;if(data[i+3]<245)continue;opaque++;const lo=Math.min(data[i],data[i+1],data[i+2]),hi=Math.max(data[i],data[i+1],data[i+2]);if(lo>240)light++;if(lo<235){ink[j]=1;rows[y]++;}if(hi<110)dark[j]=1;}
 if(opaque/(w*h)<.99||light/(w*h)<.65)return null;
 // Require a top-centered solid camera/status pill, not merely a row of text.
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let pill=null;
 for(let y=0;y<Math.floor(h*.12);y++)for(let x=0;x<w;x++){
  const start=y*w+x;if(!dark[start]||seen[start])continue;let head=0,tail=0;queue[tail++]=start;seen[start]=1;let x0=x,x1=x,y0=y,y1=y;
  while(head<tail){const p=queue[head++],px=p%w,py=Math.floor(p/w);x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);for(const n of [px?p-1:-1,px<w-1?p+1:-1,py?p-w:-1,py<h-1?p+w:-1])if(n>=0&&!seen[n]&&dark[n]){seen[n]=1;queue[tail++]=n;}}
  const bw=x1-x0+1,bh=y1-y0+1;if(y0<h*.08&&y1<h*.12&&bw>w*.18&&bw<w*.4&&bh>h*.012&&bh<h*.065&&bw/bh>2.5&&bw/bh<6&&Math.abs((x0+x1)/2-w/2)<w*.08&&tail/(bw*bh)>.72)pill={x0,x1,y0,y1};
 }
 if(!pill)return null;
 const mass=(x0,y0,x1,y1)=>{let n=0;for(let y=Math.max(0,Math.floor(y0));y<Math.min(h,Math.ceil(y1));y++)for(let x=Math.max(0,Math.floor(x0));x<Math.min(w,Math.ceil(x1));x++)n+=ink[y*w+x];return n;};
 // Clock/status at both sides and separate lower left/right viewer controls.
 if(mass(0,0,w*.3,h*.075)<w*h*.0005||mass(w*.7,0,w,h*.075)<w*h*.0005)return null;
 if(mass(0,pill.y1+2,w*.25,h*.16)<w*h*.00035||mass(w*.7,pill.y1+2,w,h*.16)<w*h*.00035)return null;
 // Centered, isolated bottom navigation control: chevron or short home indicator.
 let bottom={x0:w,y0:h,x1:-1,y1:-1,n:0};for(let y=Math.floor(h*.88);y<h;y++)for(let x=0;x<w;x++)if(ink[y*w+x]){bottom.x0=Math.min(bottom.x0,x);bottom.x1=Math.max(bottom.x1,x);bottom.y0=Math.min(bottom.y0,y);bottom.y1=Math.max(bottom.y1,y);bottom.n++;}
 const bw=bottom.x1-bottom.x0+1,bh=bottom.y1-bottom.y0+1;
 if(bottom.n<8||bottom.n>w*h*.008||bw<w*.035||bw>w*.38||bh>h*.035||Math.abs((bottom.x0+bottom.x1)/2-w/2)>w*.08)return null;
 const uncertain=reason=>({needsSelection:true,reason});
 if(mass(0,h*.12,w,h*.16)>w*h*.00005)return uncertain('Ekran araçları ile marka arasında ek içerik var; korunacak alanı seçin.');
 // Group ink rows, bridging small inter-letter gaps but not separate designs.
 const bands=[];let start=-1,last=-1;for(let y=Math.floor(h*.16);y<Math.floor(h*.88);y++){if(rows[y]>=Math.max(2,w*.002)){if(start<0)start=y;else if(y-last>h*.035){bands.push([start,last+1]);start=y;}last=y;}}if(start>=0)bands.push([start,last+1]);
 if(bands.length!==1)return uncertain('Ekran araçları bulundu; marka alanı tek bir güvenli bölge olarak ayrılamadı.');
 const [y0,y1]=bands[0];if(y0<h*.2||y1>h*.84||y1-y0<h*.12||y1-y0>h*.62)return uncertain('Ekran görüntüsündeki marka alanını seçin.');
 let x0=w,x1=-1,n=0;for(let y=y0;y<y1;y++)for(let x=0;x<w;x++)if(ink[y*w+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);n++;}
 if(x1-x0<w*.35||n/(w*(y1-y0))>.5)return uncertain('Merkezdeki alan temiz logo olarak doğrulanamadı; alanı seçin.');
 // Entire source width preserves border-touching curves; only verified blank bands removed.
 const pad=Math.max(3,Math.ceil(w*.02)),top=Math.max(Math.ceil(h*.16),y0-pad),bottomEdge=Math.min(Math.floor(h*.88),y1+pad);
 return{box:[0,Math.max(0,Math.floor(top/scale)),width,Math.min(height,Math.ceil(bottomEdge/scale))],confidence:'bounded-screen-chrome',reason:'Telefon ekranı araçları dışarıda bırakıldı; logoyu ve tüm yazıları kontrol edin.',requiresConfirmation:true};
}
const api={detect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScreenshotArtwork=api;
})(typeof globalThis!=='undefined'?globalThis:this);
