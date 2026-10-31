'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),M=require('../frontend/mark-orientation'),F=require('../frontend/photo-fidelity'),S=require('../frontend/standard-photo');
function synthetic(kind='perspective'){
 const w=650,h=220,c=createCanvas(w,h),x=c.getContext('2d');x.fillStyle='#111';x.fillRect(25,80,90,50);x.fillStyle='#cc2200';
 for(let i=0;i<(kind==='sparse'?3:7);i++){const left=250+i*45;x.beginPath();x.moveTo(left+10,70);x.lineTo(left+35,70);x.lineTo(left+25,150);x.lineTo(left,150);x.closePath();x.fill();if(i===1||i===5)x.fillRect(left+12,50,16,12);}
 const raw=x.getImageData(0,0,w,h).data,data=raw.slice();
 for(let y=0;y<h;y++)for(let xx=230;xx<w;xx++){const top=70+(kind==='parallel'?.03:.01)*(xx-400),bottom=150+(kind==='parallel'?.03:.04)*(xx-400)+(kind==='curved'?14*Math.sin((xx-250)/35):0),sy=Math.round(70+(y-top)*80/(bottom-top)),j=(y*w+xx)*4;data.fill(0,j,j+4);if(sy>=0&&sy<h)data.set(raw.subarray((sy*w+xx)*4,(sy*w+xx)*4+4),j);}
 return {data,width:w,height:h};
}
const carrier={method:'white-carrier-boundary-planar',inkRegions:[[20,30,120,180],[240,30,620,180]]};
test('photo-only residual planes preserve X, italic stems, dots, independent neighbor and source pixels',()=>{
 const r=synthetic(),saved=r.data.slice(),out=M.correctPrintedPlanes(r,carrier);assert.equal(out.printedPlanes?.applied,true);assert.equal(out.printedPlanes.groups[0].n,7);assert.deepEqual(r.data,saved);
 for(let y=0;y<r.height;y++)for(let x=0;x<200;x++)for(let k=0;k<4;k++)assert.equal(out.data[(y*r.width+x)*4+k],saved[(y*r.width+x)*4+k]);
 const bounds=d=>{const xs=new Set();let n=0;for(let i=3;i<d.length;i+=4)if(d[i]){xs.add(((i-3)/4)%r.width);n+=d[i];}return {xs:[...xs].sort((a,b)=>a-b),n};};
 assert.deepEqual(bounds(out.data).xs,bounds(saved).xs);assert.ok(Math.abs(bounds(out.data).n/bounds(saved).n-1)<.025);assert.equal(M.correctPrintedPlanes(out,carrier).printedPlanes?.groups[0]?.top.a,out.printedPlanes.groups[0].top.a);
});
for(const kind of ['parallel','sparse','curved'])test(kind+' ambiguous/decorative row is unchanged',()=>{const r=synthetic(kind),out=M.correctPrintedPlanes(r,carrier);assert.equal(out.data,r.data);assert.equal(out.printedPlanes,undefined);});
test('clean/noncarrier and a single detected mark never get printed-plane correction',()=>{const r=synthetic();for(const c of [null,{}, {...carrier,inkRegions:[[0,0,650,220]]}])assert.equal(M.correctPrintedPlanes(r,c),r);});
for(const kind of ['square','line','tiny-text'])for(const position of ['top','bottom'])test('genuine detached gray '+kind+' '+position+' is not a crease',()=>{
 const w=300,h=160,cv=createCanvas(w,h),g=cv.getContext('2d');g.fillStyle='white';g.fillRect(0,0,w,h);g.fillStyle='#111';g.fillRect(30,60,80,40);g.fillStyle='#c81e00';g.fillRect(160,60,90,40);g.fillStyle='#666';const y=position==='top'?5:145;if(kind==='square')g.fillRect(135,y,5,5);if(kind==='line')g.fillRect(130,y,30,2);if(kind==='tiny-text'){g.font='10px sans-serif';g.fillText('ID',135,y+9);}const d=g.getImageData(0,0,w,h).data,c={box:[0,0,w,h],quad:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],inkRegions:[[25,55,115,105],[155,55,255,105]],limitations:[]};const a=F.rectifyCrop(d,w,h,c),b=F.rectifyCrop(d,w,h,{...c,inkRegions:[]});assert.deepEqual(a.data,b.data);assert.deepEqual(a.excludedRegions,[]);
});
test('private exact packet uses its own pixels, removes source-connected carrier residue, rectifies supported row',{skip:process.env.HIJYENLAB_PRIVATE_PACKET_GEOMETRY?false:'Private source not supplied; no customer asset bundled'},async()=>{
 const im=await loadImage(fs.readFileSync(process.env.HIJYENLAB_PRIVATE_PACKET_GEOMETRY)),r=await S.prepare(im,{createCanvas});assert.ok(r?.whiteCarrier);assert.equal(r.processing.printedPlanes?.applied,true);assert.equal(r.processing.printedPlanes.groups[0].n,7);assert.ok(r.processing.excludedRegions.length>=2);
 const d=r.canvas.getContext('2d').getImageData(0,0,r.canvas.width,r.canvas.height).data;let detachedNeutral=0;for(let y=0;y<r.canvas.height;y++)for(let x=0;x<r.canvas.width;x++){const i=(y*r.canvas.width+x)*4;if(d[i+3]>60&&(y<r.canvas.height*.1||y>r.canvas.height*.8)&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<30)detachedNeutral++;}assert.equal(detachedNeutral,0);
});
for(const kind of ['square','line','tiny-text'])test('sharp real gray '+kind+' survives a shaded path connected to exterior substrate',()=>{
 const w=300,h=200,c=createCanvas(w,h),x=c.getContext('2d');x.fillStyle='#a0a0a0';x.fillRect(0,0,w,h);x.fillStyle='white';x.fillRect(0,40,w,140);x.fillStyle='#b4b4b4';x.fillRect(125,40,55,55);x.fillStyle='#111';x.fillRect(30,100,70,35);x.fillStyle='#c81e00';x.fillRect(200,100,70,35);x.fillStyle='#666';if(kind==='square')x.fillRect(145,50,5,5);if(kind==='line')x.fillRect(135,50,30,2);if(kind==='tiny-text'){x.font='10px sans-serif';x.fillText('ID',140,60);}const raw=x.getImageData(0,0,w,h).data,g={box:[0,0,w,h],quad:[{x:0,y:40},{x:w,y:40},{x:w,y:180},{x:0,y:180}],inkRegions:[[25,95,105,140],[195,95,275,140]],limitations:[]};const baseline=F.rectifyCrop(raw,w,h,{...g,inkRegions:[]}),result=F.rectifyCrop(raw,w,h,g);assert.deepEqual(result.data,baseline.data);assert.deepEqual(result.excludedRegions,[]);
});
