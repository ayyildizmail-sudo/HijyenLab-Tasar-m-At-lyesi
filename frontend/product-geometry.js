/* Viewed-source preview silhouettes, not certified physical printing dimensions. */
(function(root){'use strict';
const profiles={
 BM21:{source:{width:1140,height:665},sourceRect:{x:56,y:296,width:1140,height:658},front:[[0,0],[1,0],[1,1],[0,1]],back:[[0,0],[1,0],[1,1],[0,1]],rear:{source:{width:1140,height:665},safe:{upper:{x:90,y:85,width:960,height:490}},seamless:true}},
 BM12:{area:{left:280,right:1320,top:210,bottom:640}},
 BM15:{source:{width:2060,height:763},front:[[.025,.095],[.04,.095],[.12,.19],[.24,.185],[.50,.185],[.88,.185],[.90,.165],[.97,.095],[.972,.105],[.972,.905],[.965,.915],[.89,.855],[.70,.845],[.50,.83],[.27,.84],[.13,.86],[.10,.87],[.025,.915]],back:[[.035,.10],[.10,.17],[.33,.18],[.60,.17],[.88,.17],[.968,.095],[.968,.93],[.89,.885],[.69,.865],[.48,.86],[.30,.885],[.105,.89],[.035,.935]],rear:{source:{width:2060,height:763},safe:{upper:{x:330,y:157,width:1400,height:175},seam:{x:68,y:362,width:1930,height:100}}}},
 BM545:{source:{width:1635,height:962},front:[[.03,.09],[.11,.175],[.125,.181],[.145,.173],[.49,.175],[.66,.19],[.87,.175],[.89,.16],[.972,.09],[.972,.955],[.89,.91],[.87,.905],[.65,.905],[.49,.885],[.15,.895],[.11,.915],[.10,.91],[.03,.955]],back:[[.043,.095],[.125,.175],[.29,.19],[.48,.18],[.84,.175],[.865,.185],[.88,.175],[.962,.095],[.962,.91],[.88,.875],[.86,.87],[.67,.86],[.49,.85],[.28,.865],[.115,.87],[.043,.91]],rear:{source:{width:1616,height:973},safe:{upper:{x:291,y:205,width:1034,height:192},seam:{x:65,y:430,width:1495,height:130}}}}
};
// User confirmed identical outer packets; only the inner cloth dimensions differ.
profiles.BM11=profiles.BM13=profiles.BM12;
function isStandardRulo(id){return get(id)===profiles.BM12;}
function get(id){if(!profiles[id])throw Error('Ürün geometrisi bulunamadı.');return profiles[id];}
function frame(id){const p=get(id);if(isStandardRulo(id))return {x:100,y:107,width:1400,height:636};const scale=Math.min(1400/p.source.width,700/p.source.height),width=p.source.width*scale,height=p.source.height*scale;return{x:(1600-width)/2,y:(850-height)/2,width,height};}
function area(id){if(isStandardRulo(id))return {...profiles.BM12.area};const f=frame(id);if(id==='BM21')return{left:f.x+f.width*.09,right:f.x+f.width*.91,top:f.y+f.height*.14,bottom:f.y+f.height*.86};return{left:f.x+f.width*.18,right:f.x+f.width*.82,top:f.y+f.height*.25,bottom:f.y+f.height*.78};}
function clip(ctx,id,side,width,height,x=0,y=0){const points=get(id)[side];if(!points)throw Error('Ürün dış hat profili bulunamadı.');ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(x+a*width,y+b*height):ctx.moveTo(x+a*width,y+b*height));ctx.closePath();ctx.clip();}
const api={get,frame,area,clip,isStandardRulo};if(typeof module!=='undefined')module.exports=api;else root.ProductGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
