/* Geometric document/UI context guard, not OCR or a screenshot certainty classifier.
 * Multiple filled control-like panels on a light portrait page require source-region selection.
 * No brand name, caption, hue, device, or source coordinate is assumed. */
(function(root){'use strict';
function phoneControls(data,w,h){
 if(!data||data.length!==w*h*4||w<80||h/w<1.5||w*h>400000)return null;
 const dark=(x,y)=>{const i=(y*w+x)*4;return data[i+3]>240&&Math.max(data[i],data[i+1],data[i+2])<85;};
 let home=false;
 for(let y=Math.floor(h*.94);y<h-1&&!home;y++){
  let left=Math.floor(w*.2),right=Math.ceil(w*.8),start=-1;
  for(let x=left;x<right;x++){
   if(dark(x,y)&&start<0)start=x;
   if((!dark(x,y)||x===right-1)&&start>=0){const end=x,length=end-start,center=(start+end)/2;if(length>=w*.22&&length<=w*.55&&Math.abs(center-w/2)<w*.06&&length>4){const pad=Math.max(2,Math.ceil(w*.02));if(y-pad>=0&&y+pad<h&&!dark(Math.floor(center),y-pad)&&!dark(Math.floor(center),y+pad))home=true;}start=-1;}
  }
 }
 // Independent controls in both top corners corroborate the bottom home bar.
 let left=0,right=0,center=0;for(let y=0;y<Math.ceil(Math.min(h*.045,w*.085));y++)for(let x=0;x<w;x++)if(dark(x,y)){if(x<w*.28)left++;else if(x>w*.68)right++;else center++;}
 if(left<w*h*.0004||right<w*h*.0004||center>(left+right)*2)return null;
 // iOS captures may omit the home indicator. Independent green/blue help
 // controls on a light lower page corroborate the status corners instead.
 let green=0,blue=0,gx=0,bx=0,light=0,total=0;
 for(let y=Math.floor(h*.75);y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]<240)continue;total++;if(Math.min(r,g,b)>220)light++;if(x>w*.55&&g>120&&g>r*1.4&&g>b*1.15){green++;gx+=x;}if(x>w*.55&&b>120&&b>r*1.5&&b>g*1.15){blue++;bx+=x;}}
 const help=light/Math.max(1,total)>.6&&green>w*h*.0005&&blue>w*h*.0005&&Math.abs(gx/green-bx/blue)>w*.08;
 if(!home&&!help)return null;
 return {needsSelection:true,evidence:home?'phone-controls-and-home-bar':'phone-status-and-help-controls',reason:'Telefon ekranı marka değildir; marka alanı ayrılmadan tasarıma uygulanamaz.',panels:[]};
}
// Fixed paired footer controls plus independent status marks identify a mobile
// design preview. Use shape and saturation so site theme colors can vary.
function mobilePreviewControls(data,w,h){
 if(h/w<1.7||h/w>2.7)return false;
 let topLeft=0,topRight=0;
 for(let y=0;y<h*.045;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  if(Math.max(data[i],data[i+1],data[i+2])>=95)continue;
  if(x<w*.26)topLeft++;
  else if(x>w*.73)topRight++;
 }
 if(Math.min(topLeft,topRight)<w*h*.00025)return false;
 let pairedRows=0;
 for(let y=Math.floor(h*.875);y<h*.97;y++){
  const runs=[];
  let start=-1;
  for(let x=Math.floor(w*.60);x<w;x++){
   const i=(y*w+x)*4, r=data[i],g=data[i+1],b=data[i+2];
   const saturated=x<w-1&&Math.max(r,g,b)-Math.min(r,g,b)>100;
   if(saturated&&start<0)start=x;
   if(!saturated&&start>=0){if(x-start>w*.06&&x-start<w*.15)runs.push([start,x]);start=-1;}
  }
  if(runs.length===2&&runs[1][0]-runs[0][1]>w*.035&&runs[1][1]>w*.91)pairedRows++;
 }
 return pairedRows>h*.028;
}
function inspect(data,w,h){
 const controls=phoneControls(data,w,h);if(controls)return controls;
 if(!data||data.length!==w*h*4||w<80||h<120||h/w<1.2||w*h>400000)return null;
 const mask=new Uint8Array(w*h);let light=0,opaque=0;
 for(let i=0;i<w*h;i++){const j=i*4;if(data[j+3]<245)continue;opaque++;const lo=Math.min(data[j],data[j+1],data[j+2]),hi=Math.max(data[j],data[j+1],data[j+2]);if(lo>230)light++;if((lo+hi)/2<210)mask[i]=1;}
 if(opaque<w*h*.98||light<w*h*.5)return null;
 if(mobilePreviewControls(data,w,h))return {
  needsSelection:true,evidence:'mobile-preview-controls',
  reason:'Telefon arayüzü görselden güvenle ayrılamadı.',panels:[]
 };
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
const api={inspect,inspectImage,assertRegion,phoneControls};if(typeof module!=='undefined')module.exports=api;else root.SourceContext=api;
})(typeof globalThis!=='undefined'?globalThis:this);
