/* Geometry only: never edits source pixels or infers a brand from photographic colors. */
(function(root){'use strict';
function measure(data,width,height,options={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||!data||data.length!==width*height*4)throw TypeError('Invalid source pixels');
 const foreground=options.foregroundMask;
 if(foreground&&(!options.maskTrusted||foreground.length!==width*height))throw TypeError('Foreground mask requires explicit trusted provenance and source dimensions');
 let hasTransparency=false;for(let i=3;i<data.length;i+=4)if(data[i]!==255){hasTransparency=true;break;}
 if(options.sourceKind==='photo'||options.sourceKind==='unresolved')return full('unresolved-source');
 if(!foreground&&!hasTransparency)return full('opaque-source-without-foreground-evidence');
 let left=width,top=height,right=0,bottom=0,count=0;
 // No minimum component size, opacity threshold, hue ranking or selected dominant logo.
 // A one-pixel dot/descender or a distant member of a lockup contributes to the union.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(data[i*4+3]===0||foreground&&!foreground[i])continue;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);count++;}
 if(!count)return {empty:true,width,height,bounds:null,basis:foreground?'trusted-foreground-mask':'source-alpha',count:0};
 return {empty:false,width,height,bounds:{left,top,right,bottom},basis:foreground?'trusted-foreground-mask':'source-alpha',count,maskProvenance:foreground?options.maskProvenance||'caller-supplied':null};
 function full(reason){return {empty:false,width,height,bounds:{left:0,top:0,right:width,bottom:height},basis:'full-source-conservative',reason,count:null};}
}
function plan(measured,area,options={}){
 if(!measured||measured.empty)return null;
 const b=measured.bounds,margin=options.margin??0,rotation=options.rotation??0,size=options.size??100;
 if(!b||![b.left,b.top,b.right,b.bottom,area?.left,area?.top,area?.right,area?.bottom,margin,rotation,size].every(Number.isFinite)||margin<0||size<=0||size>100||b.left<0||b.top<0||b.right>measured.width||b.bottom>measured.height||b.right<=b.left||b.bottom<=b.top)throw TypeError('Invalid artwork geometry');
 const safe={left:area.left+margin,top:area.top+margin,right:area.right-margin,bottom:area.bottom-margin};
 if(safe.right<=safe.left||safe.bottom<=safe.top)throw TypeError('Empty safe print area');
 const anchor=options.anchorBounds||b;if(options.anchorBounds&&!options.anchorTrusted)throw TypeError('Placement anchor requires trusted independent evidence');if(![anchor.left,anchor.top,anchor.right,anchor.bottom].every(Number.isFinite)||anchor.left<b.left||anchor.top<b.top||anchor.right>b.right||anchor.bottom>b.bottom||anchor.right<=anchor.left||anchor.bottom<=anchor.top)throw TypeError('Invalid placement anchor');
 const ax=(anchor.left+anchor.right)/2,ay=(anchor.top+anchor.bottom)/2;
 const width=b.right-b.left,height=b.bottom-b.top,radians=rotation*Math.PI/180,c=Math.abs(Math.cos(radians)),s=Math.abs(Math.sin(radians));
 const cs=Math.cos(radians),sn=Math.sin(radians),corners=[[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]].map(([x,y])=>({x:(x-ax)*cs-(y-ay)*sn,y:(x-ax)*sn+(y-ay)*cs}));
 const relative={left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
 // Fit ALL retained pixels, even when an independent anchor ignores faint export noise.
 const scale=Math.min((safe.right-safe.left)/(2*Math.max(-relative.left,relative.right)),(safe.bottom-safe.top)/(2*Math.max(-relative.top,relative.bottom)))*size/100;
 const center={x:(safe.left+safe.right)/2,y:(safe.top+safe.bottom)/2};
 return {sourceRect:{x:b.left,y:b.top,width,height},anchorBounds:anchor,center,rotation,scale,width:width*scale,height:height*scale,rotatedBounds:{left:center.x+relative.left*scale,right:center.x+relative.right*scale,top:center.y+relative.top*scale,bottom:center.y+relative.bottom*scale},safe,basis:measured.basis,
 // Canvas: translate(center); rotate(rotation); drawImage(source,...sourceRect,...drawRect).
 drawRect:{x:(b.left-ax)*scale,y:(b.top-ay)*scale,width:width*scale,height:height*scale},
 // Equivalent full-source transform; no faint source pixels are deleted by anchor choice.
 fullSourceRect:{x:-ax*scale,y:-ay*scale,width:measured.width*scale,height:measured.height*scale}};
}
const api={measure,plan};if(typeof module!=='undefined')module.exports=api;else root.VisibleArtwork=api;
})(typeof globalThis!=='undefined'?globalThis:this);
