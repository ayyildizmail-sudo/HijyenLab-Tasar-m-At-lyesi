/* Geometric document/UI context guard, not OCR or a screenshot certainty classifier.
 * Multiple filled control-like panels on a light portrait page require source-region selection.
 * No brand name, caption, hue, device, or source coordinate is assumed. */
(function(root){'use strict';
function inspect(data,w,h){
 if(!data||data.length!==w*h*4||w<80||h<120||h/w<1.2||w*h>400000)return null;
 const mask=new Uint8Array(w*h);let light=0,opaque=0;
 for(let i=0;i<w*h;i++){const j=i*4;if(data[j+3]<245)continue;opaque++;const lo=Math.min(data[j],data[j+1],data[j+2]),hi=Math.max(data[j],data[j+1],data[j+2]);if(lo>230)light++;if((lo+hi)/2<210)mask[i]=1;}
 if(opaque<w*h*.98||light<w*h*.5)return null;
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),panels=[];
 for(let i=0;i<mask.length;i++){if(!mask[i]||seen[i])continue;let head=0,tail=1,x0=i%w,x1=x0,y0=Math.floor(i/w),y1=y0;queue[0]=i;seen[i]=1;
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const n of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}}
  const bw=x1-x0+1,bh=y1-y0+1;if(bw>w*.25&&bh>w*.035&&bh<w*.25&&bw/bh>2.5&&tail/(bw*bh)>.65)panels.push({box:[x0,y0,x1+1,y1+1],density:tail/(bw*bh)});
 }
 if(panels.length<2||!panels.some(p=>p.box[2]-p.box[0]>w*.55))return null;
 return {needsSelection:true,reason:'Ekran veya belge üzerinde birden fazla ayrı alan var. Düğme ve açıklamaları almamak için yalnız ambalajın veya marka grubunun bulunduğu alanı seçin.',evidence:'multiple-filled-panels-on-light-page',panels:panels.map(p=>p.box)};
}
function inspectImage(img,options={}){const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,scale=Math.min(1,600/Math.max(w,h)),make=options.createCanvas||((w,h)=>{const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;}),c=make(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));try{const cx=c.getContext('2d');cx.drawImage(img,0,0,c.width,c.height);return inspect(cx.getImageData(0,0,c.width,c.height).data,c.width,c.height);}finally{c.width=c.height=1;}}
function assertRegion(img,options={}){const result=inspectImage(img,options);if(result){const error=Error(result.reason);error.code='SOURCE_REGION_REQUIRED';error.sourceContext=result;throw error;}}
const api={inspect,inspectImage,assertRegion};if(typeof module!=='undefined')module.exports=api;else root.SourceContext=api;
})(typeof globalThis!=='undefined'?globalThis:this);
