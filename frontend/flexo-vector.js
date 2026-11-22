/* Exact flat-ink paths. No raster embedding, invented curves or palette reduction. */
(function(root){'use strict';
function trace(data,width,height,{maxPixels=1000000,maxRuns=120000,maxInks=3}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>maxPixels||data?.length!==width*height*4)return {ok:false,reason:'pixel-limit-or-invalid-frame'};
 const inks=new Set(),groups=new Map();let runs=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;){
  let i=(y*width+x)*4,a=data[i+3];if(!a){x++;continue;}
  const rgb=Array.from(data.subarray(i,i+3)),color='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
  if(color!=='#ffffff')inks.add(color);
  if(inks.size>maxInks)return {ok:false,reason:'non-flat-or-more-than-three-inks'};
  const key=color+':'+a;let right=x+1;
  while(right<width){i=(y*width+right)*4;if(data[i]!==rgb[0]||data[i+1]!==rgb[1]||data[i+2]!==rgb[2]||data[i+3]!==a)break;right++;}
  if(++runs>maxRuns)return {ok:false,reason:'path-complexity-limit'};
  if(!groups.has(key))groups.set(key,{color,alpha:a,paths:[],active:new Map()});
  const group=groups.get(key),span=x+':'+right,previous=group.active.get(span);
  if(previous&&previous.y+previous.height===y)previous.height++;
  else{const rect={x,y,width:right-x,height:1};group.paths.push(rect);group.active.set(span,rect);}
  x=right;
 }
 if(!groups.size)return {ok:false,reason:'empty-artwork'};
 const paths=[...groups.values()].map(g=>'<path fill="'+g.color+'" fill-opacity="'+(g.alpha/255)+'" d="'+g.paths.map(r=>'M'+r.x+' '+r.y+'h'+r.width+'v'+r.height+'h-'+r.width+'Z').join('')+'"/>').join('');
 return {ok:true,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'">'+paths+'</svg>',inkCount:inks.size,pathGroups:groups.size,pixelRuns:runs,basis:'exact-flat-source-pixel-boundaries',productionApproved:false};
}
const api={trace};if(typeof module!=='undefined')module.exports=api;else root.FlexoVector=api;
})(typeof globalThis!=='undefined'?globalThis:this);
