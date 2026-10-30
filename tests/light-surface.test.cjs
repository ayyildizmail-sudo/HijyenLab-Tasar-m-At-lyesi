const assert=require('assert/strict'),fs=require('fs'),L=require('../frontend/light-surface');
assert.deepEqual(L.propose(new Uint8Array(4),0,1),[]);
const w=400,h=240,a=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){a.set([205,205,205,255],i*4);}
assert.deepEqual(L.propose(a,w,h),[]);
function rect(x,y,r,b,color){for(let yy=y;yy<b;yy++)for(let xx=x;xx<r;xx++)a.set([...color,255],(yy*w+xx)*4);}
for(let k=0;k<4;k++){const x=130+k*27;rect(x,90,x+3,120,[100,66,35]);rect(x,90,x+18,93,[100,66,35]);rect(x+15,90,x+18,120,[100,66,35]);}
for(let k=0;k<8;k++)rect(145+k*9,128,148+k*9,134,[100,66,35]);
let ps=L.propose(a,w,h);assert.equal(ps.length,1);assert(ps[0].box[0]<130&&ps[0].box[2]>229);assert.equal(ps[0].method,'light-surface-localized-marking');
const b=ps[0].box,cw=b[2]-b[0],ch=b[3]-b[1],raw=new Uint8ClampedArray(cw*ch*4);for(let y=0;y<ch;y++)raw.set(a.subarray(((y+b[1])*w+b[0])*4,((y+b[1])*w+b[2])*4),y*cw*4);
assert(L.extractCrop(raw,cw,ch,ps[0]).ok);assert.equal(L.extractCrop(raw,cw-1,ch,ps[0]).ok,false);
const empty=new Uint8ClampedArray(raw.length);for(let i=0;i<empty.length;i+=4)empty.set([205,205,205,255],i);assert.equal(L.extractCrop(empty,cw,ch,ps[0]).ok,false);
const app=fs.readFileSync('frontend/app.js','utf8');assert(app.includes('const prior=await extractLegacyPhotoInk(img);if(prior)return prior;'));assert(app.includes('if(candidates.length!==1||ticket!==loading)return null;'));assert(app.includes("whiteCarrier:true,processing:result.metadata"));assert(!/YAZZ|GRAVAS|F7B90B68/i.test(fs.readFileSync('frontend/light-surface.js','utf8')));
console.log('PASS bounded light-surface proposals, blank/mismatch refusal, legacy-path priority and review requirement');
