/* Fragrance preferences: seed is declared business input, never a fabricated visitor count. */
(function(root){'use strict';
const OPTIONS=Object.freeze([
 {id:'flambau',label:'Flambau çiçeği',seed:315},
 {id:'green_tea',label:'Yeşil çay',seed:95},
 {id:'bodrum_mandarin',label:'Bodrum mandalinası',seed:55},
 {id:'lemon',label:'Limon',seed:35}
].map(Object.freeze));
function validId(id){return OPTIONS.some(item=>item.id===id);}
function seedStats(){return {productFamily:'towels',seedVersion:'500-v1',source:'seed',percentages:Object.fromEntries(OPTIONS.map(item=>[item.id,item.seed/5]))};}
function normalizeStats(payload){
 if(!payload||payload.productFamily!=='towels'||payload.seedVersion!=='500-v1'||payload.source!=='shared'||!payload.percentages||typeof payload.percentages!=='object')throw Error('Güncel tercih istatistiği doğrulanamadı.');
 const p=payload.percentages,keys=Object.keys(p);
 if(keys.length!==4||keys.some(key=>!validId(key))||OPTIONS.some(item=>!Number.isInteger(p[item.id])||p[item.id]<0||p[item.id]>100)||Object.values(p).reduce((a,b)=>a+b,0)!==100)throw Error('Tercih yüzdeleri tutarlı değil.');
 return {productFamily:'towels',seedVersion:'500-v1',source:'shared',percentages:Object.fromEntries(OPTIONS.map(item=>[item.id,p[item.id]]))};
}
const api={OPTIONS,validId,seedStats,normalizeStats};if(typeof module!=='undefined')module.exports=api;else root.Fragrance=api;
})(typeof globalThis!=='undefined'?globalThis:this);
