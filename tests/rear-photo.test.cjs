const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),{createCanvas}=require('@napi-rs/canvas'),RearPhoto=require('../frontend/rear-photo.js');
const src=fs.readFileSync('frontend/rear-photo.js','utf8');
const make=(w,h)=>createCanvas(w,h);function photo(){const c=make(500,340),x=c.getContext('2d');x.fillStyle='#646464';x.fillRect(0,0,500,340);x.fillStyle='#f5f5f5';x.fillRect(30,100,440,140);for(const [a,b,col]of [[180,220,'#0014aa'],[230,270,'#b40014'],[280,320,'#149600']]){x.fillStyle=col;x.fillRect(a,135,b-a,23);}x.fillStyle='#191919';x.fillRect(195,180,110,7);return c;}
function mocked(engine){const scope={SourceContext:{assertRegion(){}},WhiteCarrier:engine,LightSurface:{propose:()=>[]},MarkOrientation:{correct:r=>r}};vm.createContext(scope);vm.runInContext(src,scope);return scope.RearPhoto;}
(async()=>{
 const input=photo(),before=input.toBuffer('image/png'),r=await RearPhoto.prepare(input,{createCanvas:make,background:'#000000'});assert(r.canvas.width>0);assert.equal(r.reviewRequired,true);assert.equal(r.method,'rear-shared-standard-photo');assert.deepEqual(input.toBuffer('image/png'),before);assert(r.limitations.length);assert(r.contrastWarning);
 // Real localized-light-surface path, not only mocked candidate acceptance.
 const light=make(400,240),lc=light.getContext('2d');lc.fillStyle='#cdcdcd';lc.fillRect(0,0,400,240);lc.fillStyle='#644223';for(let k=0;k<4;k++){const x=130+k*27;lc.fillRect(x,90,3,30);lc.fillRect(x,90,18,3);lc.fillRect(x+15,90,3,30);}for(let k=0;k<8;k++)lc.fillRect(145+k*9,128,3,6);const lr=await RearPhoto.prepare(light,{createCanvas:make});assert.equal(lr.method,'rear-light-surface-photo');assert(lr.canvas.width>0);
 const blank=make(400,240);blank.getContext('2d').fillRect(0,0,400,240);await assert.rejects(()=>RearPhoto.prepare(blank,{createCanvas:make}),/ayrılamadı/);
 await assert.rejects(()=>RearPhoto.prepare({width:0,height:1},{createCanvas:make}),/boyutu/);
 const ambiguous=mocked({propose:()=>[{box:[0,0,30,30]},{box:[40,40,70,70]}],extractCrop:()=>{throw Error('must not extract');}});await assert.rejects(()=>ambiguous.prepare(input,{createCanvas:make}),/birden fazla ambalaj/);
 const invalid=mocked({propose:()=>[{box:[-1,0,20,20]}],extractCrop:()=>{throw Error('must not extract');}});await assert.rejects(()=>invalid.prepare(input,{createCanvas:make}),/geçerli değil/);
 // Large image never creates full-image canvas; oversized ROI is rejected before allocation.
 const big=make(2500,2000),allocations=[],bounded=(w,h)=>{allocations.push([w,h]);return make(w,h);};let scan;
 const over=mocked({propose:(pixels,w,h)=>{scan=[w,h];return [{box:[0,0,2500,2000]}];},extractCrop:()=>{throw Error('must not extract');}});await assert.rejects(()=>over.prepare(big,{createCanvas:bounded}),/çok büyük/);assert(Math.max(...scan)<=600);assert.equal(allocations.length,1);assert(allocations[0][0]*allocations[0][1]<=360000);
 const bad=mocked({propose:()=>[{box:[0,0,30,30]}],extractCrop:()=>({ok:false})});await assert.rejects(()=>bad.prepare(input,{createCanvas:make}),/ayrılamadı/);
 assert(!/\bloading\b|\.dispatchEvent|handleFile|handleUpload|window\.state|fetch\(/.test(src));
 console.log('PASS rear photo: real white carrier + light surface, preserved input, review gate, ambiguity/blank/ROI bounds, 600px scan and no front state');
})().catch(e=>{console.error(e);process.exitCode=1;});
