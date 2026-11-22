const test=require('node:test'),assert=require('node:assert/strict'),S=require('../frontend/source-context'),B=require('../frontend/background');
function frame(w,h){const p=new Uint8ClampedArray(w*h*4);p.fill(255);return {p,box(x,y,bw,bh,rgb=[0,0,0]){for(let yy=y;yy<y+bh;yy++)for(let xx=x;xx<x+bw;xx++)p.set([...rgb,255],(yy*w+xx)*4);}};}
test('phone status corners plus home indicator cannot enter the native artwork route',()=>{
 const f=frame(200,400);f.box(12,8,24,8);f.box(150,8,28,8);f.box(65,390,70,2);f.box(60,160,80,50,[40,60,90]);
 assert.equal(S.inspect(f.p,200,400).evidence,'phone-controls-and-home-bar');
 const tall=frame(200,400);tall.box(60,160,80,50,[40,60,90]);tall.box(65,390,70,2);assert.equal(S.phoneControls(tall.p,200,400),null);
});
test('white native artwork keeps shaded internal colors; edge-touching scenes do not qualify',()=>{
 const f=frame(160,120);f.box(50,35,60,45,[10,20,30]);for(let y=35;y<80;y++)for(let x=50;x<110;x++)f.p[(y*160+x)*4]=20+(x-50)*2;
 const before=Buffer.from(f.p),d=B.analyze(f.p,160,120);assert(B.inspectWhiteGraphic(f.p,160,120,d));assert.deepEqual(Buffer.from(f.p),before);
 f.box(0,0,100,90,[70,80,90]);assert(!B.inspectWhiteGraphic(f.p,160,120,B.analyze(f.p,160,120)));
});
