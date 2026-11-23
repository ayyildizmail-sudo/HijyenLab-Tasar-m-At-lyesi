/* Recognize a flat artwork panel inside uniform exterior padding. Not a photo/brand classifier. */
(function(root){'use strict';
const B=typeof module!=='undefined'?require('./background.js'):root.BackgroundAnalysis;
function detect(data,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<40||h<40||data.length!==w*h*4)return null;
 const rgb=i=>[data[i*4],data[i*4+1],data[i*4+2]],dist=(p,c)=>Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]);
 const padding=rgb(0);if(data[3]<240)return null;
 const pad=i=>data[i*4+3]>240&&dist(rgb(i),padding)<20;
 const row=y=>{let n=0;for(let x=0;x<w;x++)if(pad(y*w+x))n++;return n/w>.995;};
 const col=x=>{let n=0;for(let y=0;y<h;y++)if(pad(y*w+x))n++;return n/h>.995;};
 let top=0,bottom=h,left=0,right=w;while(top<h&&row(top))top++;while(bottom>top&&row(bottom-1))bottom--;
 while(left<w&&col(left))left++;while(right>left&&col(right-1))right--;
 const horizontal=top>=h*.025&&h-bottom>=h*.025,vertical=left>=w*.025&&w-right>=w*.025;
 if(!(horizontal||vertical)||bottom-top<h*.2||right-left<w*.2)return null;
 // Never discard a nonuniform transition strip: it may contain a thin logo stroke.
 const uniformRow=y=>{const c=rgb(y*w+left);for(let x=left;x<right;x++)if(dist(rgb(y*w+x),c)>24)return false;return true;};
 const uniformCol=x=>{const c=rgb(top*w+x);for(let y=top;y<bottom;y++)if(dist(rgb(y*w+x),c)>24)return false;return true;};
 if(top&&(!uniformRow(top)||!uniformRow(top+1)))return null;
 if(bottom<h&&(!uniformRow(bottom-1)||!uniformRow(bottom-2)))return null;
 if(left&&(!uniformCol(left)||!uniformCol(left+1)))return null;
 if(right<w&&(!uniformCol(right-1)||!uniformCol(right-2)))return null;
 // Two flat transition pixels are excluded only at detected padding boundaries.
 if(top)top+=2;if(bottom<h)bottom-=2;if(left)left+=2;if(right<w)right-=2;
 const cw=right-left,ch=bottom-top;if(cw<20||ch<20)return null;
 const ratio=Math.min(1,320/Math.max(cw,ch)),sw=Math.max(2,Math.round(cw*ratio)),sh=Math.max(2,Math.round(ch*ratio)),sample=new Uint8ClampedArray(sw*sh*4);
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const sx=Math.min(right-1,left+Math.floor((x+.5)*cw/sw)),sy=Math.min(bottom-1,top+Math.floor((y+.5)*ch/sh));sample.set(data.subarray((sy*w+sx)*4,(sy*w+sx)*4+4),(y*sw+x)*4);}
 const background=B.analyze(sample,sw,sh);if(!['white','color'].includes(background.kind)||background.confidence<.97||background.connected<.65)return null;
 if(dist(background.rgb,padding)<60)return null;
 const palette=new Map();let foreground=0,opaque=0;
 for(let i=0;i<sw*sh;i++){const j=i*4;if(sample[j+3]<240)return null;opaque++;const p=[sample[j],sample[j+1],sample[j+2]];if(dist(p,background.rgb)<=40)continue;foreground++;const key=p.map(v=>Math.floor(v/48)).join(',');palette.set(key,(palette.get(key)||0)+1);}
 const concentration=[...palette.values()].sort((a,b)=>b-a).slice(0,12).reduce((a,b)=>a+b,0)/Math.max(1,foreground);
 if(foreground<12||foreground/opaque>.35||concentration<.96)return null;
 return{box:[left,top,right,bottom],background:background.color,confidence:background.confidence,connected:background.connected,paletteConcentration:concentration,axis:horizontal&&vertical?'both':horizontal?'horizontal':'vertical'};
}
const api={detect};if(typeof module!=='undefined')module.exports=api;else root.FlatArtwork=api;
})(typeof window!=='undefined'?window:globalThis);
