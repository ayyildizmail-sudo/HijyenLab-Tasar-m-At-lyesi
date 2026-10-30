const assert=require('node:assert/strict'),R=require('../dist/rear-logo.js');
const cases=[];const test=(n,f)=>cases.push([n,f]);
function fixture(bg=[250,247,238,255]){const w=120,h=80,d=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++)d.set(bg,i*4);return {w,h,d};}
function rect(f,x0,y0,x1,y1,c){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)f.d.set(c,(y*f.w+x)*4);}
function core(){const f=fixture();rect(f,20,20,100,45,[5,65,35,255]);rect(f,35,25,45,35,[250,247,238,255]);rect(f,30,55,90,58,[5,65,35,255]);return f;}
test('Cream removed, all words/swash extent and inner counter kept',()=>{const f=core(),r=R.extractRGBA(f.d,f.w,f.h);assert(r.ok);assert.deepEqual(r.sourceBounds,[18,18,102,60]);assert.equal(r.data[((30-18)*r.width+40-18)*4+3],0);assert.equal(r.data[((56-18)*r.width+40-18)*4+3],255);});
test('Opaque source ink unchanged',()=>{const f=core(),before=Buffer.from(f.d),r=R.extractRGBA(f.d,f.w,f.h);assert.deepEqual(Array.from(r.data.slice((4*r.width+4)*4,(4*r.width+4)*4+4)),[5,65,35,255]);assert.deepEqual(Buffer.from(f.d),before);});
test('Multicolor second mark retained',()=>{const f=core();rect(f,80,50,95,60,[180,30,20,255]);const r=R.extractRGBA(f.d,f.w,f.h);assert(r.ok);assert(r.inkSamples.some(s=>s.rgb[0]>150&&s.rgb[1]<50));});
test('Native alpha retains white stroke and semitransparent pixels',()=>{const f=fixture([0,0,0,0]);rect(f,25,20,80,60,[255,255,255,255]);rect(f,80,20,81,60,[255,255,255,90]);const r=R.extractRGBA(f.d,f.w,f.h);assert(r.ok);assert.equal(r.method,'native-alpha-trim');assert(r.data.some((v,i)=>i%4===3&&v===90));});
test('Tight native alpha accepts edge-touching ink without trimming content',()=>{const f=fixture([0,0,0,0]);rect(f,0,5,80,60,[5,65,35,255]);const r=R.extractRGBA(f.d,f.w,f.h);assert(r.ok);assert.equal(r.sourceBounds[0],0);});
test('Native faint alpha is not silently cropped',()=>{const f=fixture([0,0,0,0]);rect(f,25,20,80,60,[5,65,35,255]);rect(f,3,30,4,35,[5,65,35,8]);const r=R.extractRGBA(f.d,f.w,f.h);assert(r.ok);assert.equal(r.sourceBounds[0],1);});
test('Antialiased cream edge unmatted instead of left as opaque cream fringe',()=>{const f=core();rect(f,19,20,20,45,[128,156,137,255]);const r=R.extractRGBA(f.d,f.w,f.h);assert(r.ok);const i=((25-r.sourceBounds[1])*r.width+19-r.sourceBounds[0])*4;assert(r.data[i+3]>100&&r.data[i+3]<160);assert(r.data[i]<30);});
test('Blank rejects',()=>{const f=fixture();assert(!R.extractRGBA(f.d,f.w,f.h).ok);});
test('Clipped logo rejects',()=>{const f=core();rect(f,0,25,30,35,[0,50,20,255]);assert(!R.extractRGBA(f.d,f.w,f.h).ok);});
test('Unsupported textured scene rejects instead of raw paste',()=>{const f=fixture();for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)f.d.set([(x*17+y*11)%256,(x*7+y*23)%256,(x*31+y*13)%256,255],(y*f.w+x)*4);assert(!R.extractRGBA(f.d,f.w,f.h).ok);});
test('Dark carrier not assumed removable',()=>{const f=fixture([90,40,50,255]);rect(f,20,20,80,60,[230,210,190,255]);assert(!R.extractRGBA(f.d,f.w,f.h).ok);});
test('Malformed or oversized source bounded',()=>{assert(!R.extractRGBA([],5000,5000).ok);assert(!R.extractRGBA([],2,2).ok);});
test('Low contrast warns without recoloring',()=>{const f=core(),r=R.extractRGBA(f.d,f.w,f.h),before=Buffer.from(r.data);assert(R.contrastWarning(r,'#641c34'));assert.equal(R.contrastWarning(r,'#ffffff'),null);assert.deepEqual(Buffer.from(r.data),before);});
for(const [n,f] of cases){f();console.log('PASS '+n);}console.log(`${cases.length} PASS`);
