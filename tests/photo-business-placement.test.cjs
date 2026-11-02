'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),V=require('../frontend/visible-artwork.js');
const app=fs.readFileSync('frontend/app.js','utf8'),start=app.indexOf('function visibleLogoPlan('),end=app.indexOf('function drawVisibleLogo(',start),measured={width:539,height:225,bounds:{left:0,top:0,right:539,bottom:225},empty:false,basis:'source-alpha'};
const G=require('../frontend/product-geometry.js');
let area;const c={VisibleArtwork:V,state:{size:100,rotation:0},currentPrintArea:()=>area,visibleLogoMeasurement:()=>({measured,anchorBounds:null})};vm.createContext(c);vm.runInContext(app.slice(start,end),c);
for(const id of ['BM12','BM11','BM13','BM15','BM545','BM21','OSHIBORI']){
 area=G.area(id);
 c.state.photoPlacementProfile=null;const normal=c.visibleLogoPlan({});c.state.photoPlacementProfile='photo-business-block';const inset=c.visibleLogoPlan({});
 assert(Math.abs(inset.width/normal.width-.84)<1e-10);assert(Math.abs(inset.height/normal.height-.84)<1e-10);assert(Math.abs(inset.width/inset.height-539/225)<1e-10);
 assert.equal(inset.center.x,(area.left+area.right)/2);assert.equal(inset.center.y,(area.top+area.bottom)/2);assert(Math.abs(inset.drawRect.x+inset.width/2)<1e-10);assert(Math.abs(inset.drawRect.y+inset.height/2)<1e-10);
 assert(inset.width<=(area.right-area.left)*.84+1e-8);assert(inset.height<=(area.bottom-area.top)*.84+1e-8);
 assert.equal(c.visibleLogoPlan({}).width,inset.width,'Repeated render does not progressively shrink');
 c.state.photoPlacementProfile=null;assert.equal(c.visibleLogoPlan({}).width,normal.width,'Native/SETTAR paths retain prior fit');
}
assert(app.includes('state.photoPlacementProfile=null;state.sourceGroundPlacement=null;state.logoName=f.name'),'Replacement clears prior business-block fit');
console.log('PASS photo multi-row business-block: 16% proportional inset, centered safe margins across product areas, stable refresh and unchanged native/other photo fit');
