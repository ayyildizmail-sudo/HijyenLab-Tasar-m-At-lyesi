/* Preview-only safety rectangle; does not claim a manufacturer-certified print profile. */
(function(root){'use strict';
const AREA=Object.freeze({left:280,right:1320,top:210,bottom:640});
function bounds(p){if(!p||![p.width,p.height,p.x,p.y,p.rotation].every(Number.isFinite)||p.width<=0||p.height<=0)return null;const a=p.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),hx=(p.width*c+p.height*s)/2,hy=(p.width*s+p.height*c)/2;return{left:p.x-hx,right:p.x+hx,top:p.y-hy,bottom:p.y+hy,hx,hy};}
function contains(p,area=AREA){const b=bounds(p),e=1e-7;return !!b&&b.left>=area.left-e&&b.right<=area.right+e&&b.top>=area.top-e&&b.bottom<=area.bottom+e;}
function contain(p,area=AREA){const b=bounds(p);if(!b)return null;const scale=Math.min(1,(area.right-area.left)/(2*b.hx),(area.bottom-area.top)/(2*b.hy)),hx=b.hx*scale,hy=b.hy*scale;return{...p,width:p.width*scale,height:p.height*scale,x:Math.max(area.left+hx,Math.min(area.right-hx,p.x)),y:Math.max(area.top+hy,Math.min(area.bottom-hy,p.y)),scale};}
const api={AREA,bounds,contains,contain};if(typeof module!=='undefined')module.exports=api;else root.LogoPlacement=api;
})(typeof globalThis!=='undefined'?globalThis:this);
