/* One source-to-device raster step. No sharpening, reconstruction or source mutation. */
(function(root){'use strict';
const MAX_EDGE=2048,MAX_PIXELS=2097152,ASPECT=1000/610;
function positive(x,fallback){return Number.isFinite(Number(x))&&Number(x)>0?Number(x):fallback;}
function plan(cssWidth,cssHeight,dpr,crop){
 if(!Array.isArray(crop)||crop.length!==4||!crop.every(Number.isFinite)||crop[2]<=0||crop[3]<=0)return null;
 const boxW=positive(cssWidth,321),boxH=positive(cssHeight,boxW/ASPECT),w=Math.min(boxW,boxH*ASPECT),h=w/ASPECT,ratio=Math.min(positive(dpr,1),8),fit=Math.min(w/crop[2],h/crop[3]);
 // A high-DPR display cannot recover more detail than the actual source crop.
 const density=Math.min(ratio,1/fit,MAX_EDGE/w,MAX_EDGE/h,Math.sqrt(MAX_PIXELS/(w*h)));
 let width=Math.max(1,Math.round(w*density)),height=Math.max(1,Math.round(h*density));
 const overshoot=Math.max(width/MAX_EDGE,height/MAX_EDGE,Math.sqrt(width*height/MAX_PIXELS),Math.min(width/crop[2],height/crop[3]));
 if(overshoot>1){width=Math.max(1,Math.floor(width/overshoot));height=Math.max(1,Math.floor(height/overshoot));}
 const scale=Math.min(width/crop[2],height/crop[3]);
 return {width,height,bytes:width*height*4,cssWidth:w,cssHeight:h,dpr:ratio,sourceLimited:fit*ratio>1,scale,x:(width-crop[2]*scale)/2,y:(height-crop[3]*scale)/2,drawWidth:crop[2]*scale,drawHeight:crop[3]*scale};
}
const api={plan,MAX_EDGE,MAX_PIXELS};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HijyenLabGalleryRaster=api;
})(typeof window!=='undefined'?window:globalThis);
