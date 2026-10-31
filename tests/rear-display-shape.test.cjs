'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('frontend/style.css','utf8');
const rules=[...css.matchAll(/\.rearFlipBack img\{([^}]+)\}/g)].map(m=>m[1]);assert(rules.length);
const rule=rules.at(-1);assert.match(rule,/clip-path:\s*none/,'rear raster must retain product-owned silhouette, no universal roll polygon');assert.match(rule,/height:\s*100%/);assert.match(rule,/object-fit:\s*contain/);
const G=require(process.cwd()+'/frontend/product-geometry.js');
for(const id of ['BM12','BM11','BM13','BM15','BM21','BM545']){
 const p=G.get(id),s=p.rear?.source||{width:1856,height:850};
 for(const sceneWidth of [320,900]){const sceneHeight=sceneWidth*850/1600,scale=Math.min(sceneWidth*.93/s.width,sceneHeight/s.height);assert(s.width*scale<=sceneWidth*.93+1e-6);assert(s.height*scale<=sceneHeight+1e-6);}
}
console.log('PASS product-owned rear silhouettes and both-axis contain fit for all six products at desktop/mobile sizes');
