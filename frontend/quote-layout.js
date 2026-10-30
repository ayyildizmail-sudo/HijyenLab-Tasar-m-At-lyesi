/* Quote-only geometry. Crops transparent canvas margins, never changes package artwork. */
(function(root){'use strict';
function alphaVisibleBounds(rgba,width,height){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||!rgba||rgba.length!==width*height*4)throw Error('Teklif görselinin piksel verisi geçerli değil.');
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=rgba[(y*width+x)*4+3];if(!Number.isFinite(alpha)||alpha<0||alpha>255)throw Error('Teklif görselinin saydamlık verisi geçerli değil.');if(alpha>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 if(right<left)throw Error('Teklif için görünür ambalaj bulunamadı.');
 return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
function validRect(r){return r&&['x','y','width','height'].every(k=>Number.isFinite(r[k]))&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0;}
function pairPlan(frontBounds,backBounds,allocatedRect,options={}){
 if(!validRect(frontBounds)||!validRect(backBounds)||!validRect(allocatedRect))throw Error('Teklif ön ve arka yüz ölçüleri geçerli değil.');
 const direction=options.direction||'vertical',gap=options.gap===undefined?30:options.gap,maxWidth=options.maxWidth===undefined?1180:options.maxWidth,maxHeight=options.maxHeight===undefined?330:options.maxHeight;
 if(!['vertical','horizontal'].includes(direction)||![gap,maxWidth,maxHeight].every(Number.isFinite)||gap<0||maxWidth<=0||maxHeight<=0)throw Error('Teklif görsel yerleşimi geçerli değil.');
 const r=allocatedRect,pw=direction==='vertical'?r.width:(r.width-gap)/2,ph=direction==='vertical'?(r.height-gap)/2:r.height;
 if(pw<=0||ph<=0)throw Error('Teklif görsellerine ayrılan alan yetersiz.');
 const panels=[0,1].map(i=>({x:r.x+(direction==='horizontal'?i*(pw+gap):0),y:r.y+(direction==='vertical'?i*(ph+gap):0),width:pw,height:ph}));
 const width=Math.min(pw,maxWidth,Math.min(ph,maxHeight)*frontBounds.width/frontBounds.height,Math.min(ph,maxHeight)*backBounds.width/backBounds.height);
 if(!Number.isFinite(width)||width<=0)throw Error('Teklif görselleri bu alana yerleştirilemiyor.');
 const faces=[frontBounds,backBounds].map((b,i)=>{const height=width*b.height/b.width,p=panels[i];return {source:{...b},destination:{x:p.x+(p.width-width)/2,y:p.y+(p.height-height)/2,width,height},panel:p};});
 return {front:faces[0],back:faces[1],commonWidth:width,direction};
}
const api={alphaVisibleBounds,pairPlan};if(typeof module!=='undefined')module.exports=api;else root.QuoteLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this);
