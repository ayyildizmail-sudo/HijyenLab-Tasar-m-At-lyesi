/* Placement-only flat-raster evidence; never authorizes masks, recolor or ink counts. */
(function(root){'use strict';
const B=typeof module!=='undefined'?require('./background.js'):root.BackgroundAnalysis;
const clamp=v=>Math.max(0,Math.min(1,v));
const quantile=(a,q)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor((b.length-1)*q)];};
function analyzeCoverage(data,width,height){
 if(data.length!==width*height*4||width<4||height<4)throw Error('Invalid pixels');
 const border=[[],[],[]];for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x<2||y<2||x>=width-2||y>=height-2){const i=(y*width+x)*4;for(let k=0;k<3;k++)border[k].push(data[i+k]);}
 const background=border.map(v=>quantile(v,.5)),bg=background.reduce((a,b)=>a+b)/3;if(bg>80)throw Error('Not a dark flat carrier');
 let flat=0;const bright=[];for(let i=0;i<data.length;i+=4){const lum=(data[i]+data[i+1]+data[i+2])/3;if(Math.hypot(...background.map((v,k)=>v-data[i+k]))<16)flat++;if(lum>bg+32&&Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<24)bright.push(lum);}
 if(flat/(width*height)<.65||bright.length<8)throw Error('Not supported: requires mostly flat dark carrier and pale single ink');
 const ink=quantile(bright,.95);if(ink-bg<100)throw Error('Insufficient source contrast');
 const alpha=new Float32Array(width*height);let rejectedChromatic=0;
 for(let p=0;p<alpha.length;p++){const i=p*4,lum=(data[i]+data[i+1]+data[i+2])/3,coverage=(lum-bg)/(ink-bg),a=clamp(coverage),expected=background.map(v=>v+coverage*(ink-v));const residual=Math.hypot(...expected.map((v,k)=>v-data[i+k]));if(residual>24){rejectedChromatic++;continue;}alpha[p]=a*(data[i+3]/255);}
 if(rejectedChromatic/(width*height)>.02)throw Error('Multiple colors or photographic contamination; no single-white-ink claim');
 return {alpha,background,estimatedSourceInk:ink,rejectedChromatic,flatFraction:flat/(width*height)};
}
function topology(alpha,width,height,threshold=.5){const seen=new Uint8Array(alpha.length),components=[];for(let p=0;p<alpha.length;p++){if(seen[p]||alpha[p]<threshold)continue;const queue=[p];seen[p]=1;let minX=width,minY=height,maxX=0,maxY=0;for(let n=0;n<queue.length;n++){const q=queue[n],x=q%width,y=Math.floor(q/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx<0||yy<0||xx>=width||yy>=height||seen[j]||alpha[j]<threshold)continue;seen[j]=1;queue.push(j);}}components.push({pixels:queue.length,box:[minX,minY,maxX+1,maxY+1]});}return components.sort((a,b)=>b.pixels-a.pixels);}
function inspectPlacement(data,width,height,{backgroundAnalysis,flatGraphic}={}){
 const rejected=reason=>({trusted:false,reason,sourceWidth:width,sourceHeight:height});
 if(!backgroundAnalysis||!['color','white'].includes(backgroundAnalysis.kind)||flatGraphic?.flatGraphic!==true)return rejected('No independent flat-carrier evidence');
 if(Math.max(width,height)>512||width<4||height<4||data.length!==width*height*4)return rejected('Outside bounded small-raster scope');
 for(let i=3;i<data.length;i+=4)if(data[i]<250)return rejected('Use native-alpha placement instead');
 const carrier=backgroundAnalysis.rgb;if(!Array.isArray(carrier)||carrier.length!==3)return rejected('Missing carrier RGB');
 const mean=carrier.reduce((a,b)=>a+b)/3;if(mean>80&&mean<175)return rejected('Insufficient carrier polarity');
 const inverse=mean>=175,pixels=inverse?Uint8ClampedArray.from(data,(v,i)=>i%4===3?v:255-v):data;let result;
 try{result=analyzeCoverage(pixels,width,height);}catch(error){return rejected(error.message);}
 // A separate faint solid ink must not disappear from placement evidence just
 // because a brighter family sets the coverage endpoint. Decline instead.
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const a=result.alpha[y*width+x];if(a<.1||a>=.4)continue;let solid=true;for(let dy=-1;dy<=1&&solid;dy++)for(let dx=-1;dx<=1&&solid;dx++)if(Math.abs(result.alpha[(y+dy)*width+x+dx]-a)>.03)solid=false;if(solid)return rejected('Independent faint solid ink may be omitted');}
 const sets=[.4,.5,.6].map(t=>topology(result.alpha,width,height,t));
 if(!sets[1].length||sets.some(a=>a.length!==sets[1].length))return rejected('Unstable foreground component evidence');
 const bounds=[width,height,0,0];for(const component of sets[1]){bounds[0]=Math.min(bounds[0],component.box[0]);bounds[1]=Math.min(bounds[1],component.box[1]);bounds[2]=Math.max(bounds[2],component.box[2]);bounds[3]=Math.max(bounds[3],component.box[3]);}
 if(bounds[0]===0||bounds[1]===0||bounds[2]===width||bounds[3]===height)return rejected('Foreground touches source frame');
 return {trusted:true,bounds,sourceWidth:width,sourceHeight:height,basis:'flat-carrier-relative half-coverage anchor; all stable components included; placement only',componentCount:sets[1].length,sourcePixelsMustRemainUnchanged:true,sourceFrame:[0,0,width,height],polarity:inverse?'dark-on-light':'pale-on-dark',flatFraction:result.flatFraction};
}
function inspect(data,w,h){if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<4||h<4||Math.max(w,h)>512||!data||data.length!==w*h*4)return {trusted:false,reason:'Outside bounded small-raster scope'};for(let i=3;i<data.length;i+=4)if(data[i]<250)return {trusted:false,reason:'Use native-alpha placement instead'};const e=inspectPlacement(data,w,h,{backgroundAnalysis:B.analyze(data,w,h),flatGraphic:B.inspectFlatGraphic(data,w,h)});return e.trusted?{...e,anchorBounds:{left:e.bounds[0],top:e.bounds[1],right:e.bounds[2],bottom:e.bounds[3]}}:e;}
const api={inspect};if(typeof module!=='undefined')module.exports=api;else root.FlatPlacementEvidence=api;
})(typeof globalThis!=='undefined'?globalThis:this);
