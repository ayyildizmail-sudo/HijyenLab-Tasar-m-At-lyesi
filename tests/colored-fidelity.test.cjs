const A=require('assert/strict'),F=require('../frontend/colored-fidelity'),fs=require('fs');
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
function model(){return{modelVersion:1,width:10,height:10,background:[230,180,20],ink:[10,40,100],whiteInk:[245,245,245],support:new Uint8Array(100).fill(1)};}
function fixture(){const m=model(),p=F.plan({box:[2,2,8,8],refinement:m},100,100),d=new Uint8ClampedArray(p.width*p.height*4);for(let i=0;i<d.length;i+=4)d.set([...m.background,255],i);return{m,p,d};}
test('source-coordinate ROI uses native resolution',()=>{const{p}=fixture();A.deepEqual(p.box,[20,20,80,80]);A.equal(p.width,60);});
test('one-source-pixel ink remains sharp rather than resized coarse alpha',()=>{const{m,p,d}=fixture(),i=(30*60+30)*4;d.set([...m.ink,255],i);const r=F.refine(d,60,60,p,m);A(r);A.deepEqual(Array.from(r.data.slice(i,i+4)),[...m.ink,255]);A.equal(r.data[i+7],0);A.equal(r.checks.retainedPixels,1);});
test('genuine white source stroke retained',()=>{const{m,p,d}=fixture(),i=(30*60+29)*4;d.set([...m.whiteInk,255],i);const r=F.refine(d,60,60,p,m);A.deepEqual(Array.from(r.data.slice(i,i+4)),[245,245,245,255]);});
test('mixed edge coverage estimated from original pixel',()=>{const{m,p,d}=fixture(),i=200;d.set(m.ink.map((v,k)=>Math.round((v+m.background[k])/2)).concat(255),i);const r=F.refine(d,60,60,p,m);A(Math.abs(r.data[i+3]-128)<=1);for(let k=0;k<3;k++)A(Math.abs(r.data[i+k]-m.ink[k])<=1);});
test('outside selected support is not imported',()=>{const{m,p,d}=fixture();m.support.fill(0);d.set([...m.ink,255],100);A.equal(F.refine(d,60,60,p,m),null);});
test('empty carrier remains rejected',()=>{const{m,p,d}=fixture();A.equal(F.refine(d,60,60,p,m),null);});
test('large native ROI blocked before allocation',()=>A.equal(F.plan({box:[0,0,10,10],refinement:model()},3000,3000),null));
test('malformed geometry and models rejected',()=>{const{m,p,d}=fixture();A.equal(F.plan({box:[-1,0,5,5],refinement:m},100,100),null);A.equal(F.refine(d,60,60,{...p,sourceWidth:0},m),null);A.equal(F.refine(d,60,60,p,{...m,ink:m.background}),null);A.equal(F.refine(d,60,60,p,{...m,support:[]}),null);});
test('unmodelled saturated third ink rejected instead of recolored',()=>{const{m,p,d}=fixture();for(let y=20;y<30;y++)for(let x=20;x<30;x++)d.set([250,0,0,255],(y*60+x)*4);A.equal(F.refine(d,60,60,p,m),null);});
test('ink clipped at output boundary rejected',()=>{const{m,p,d}=fixture();for(let x=0;x<8;x++)d.set([...m.ink,255],x*4);A.equal(F.refine(d,60,60,p,m),null);});
test('partial source alpha is never made opaque',()=>{const{m,p,d}=fixture();d.set([...m.ink,100],200);const r=F.refine(d,60,60,p,m);A.equal(r.data[203],100);});
test('nonuniform scale maps both axes and checks dimensions',()=>{const m=model(),p=F.plan({box:[1,2,4,5],refinement:m},90,120);A.deepEqual(p.box,[9,24,36,60]);A.equal(F.refine(new Uint8ClampedArray(4),1,1,p,m),null);});
test('module never writes generated letters or calls external service',()=>{const s=fs.readFileSync('frontend/colored-fidelity.js','utf8');A(!/fetch\(|fillText|strokeText|Lucia|\.jpeg/.test(s));});
console.log(count+' tests passed');
