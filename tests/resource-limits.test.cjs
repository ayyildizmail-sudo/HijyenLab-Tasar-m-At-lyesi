const assert=require('node:assert/strict'),R=require('../frontend/upload-format.js');const cases=[];
function test(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(e){cases.push({name,status:'FAIL',error:e.message});}}
function png(w,h){const b=Buffer.alloc(24);b.set([137,80,78,71,13,10,26,10]);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;}
function jpeg(w,h){const b=Buffer.alloc(15);b.set([255,216,255,192,0,11,8]);b.writeUInt16BE(h,7);b.writeUInt16BE(w,9);return b;}
test('Unified cap is exactly 24 million pixels',()=>assert.equal(R.MAX_PIXELS,24000000));
test('Exactly 24M decoded pixels accepted',()=>assert.deepEqual(R.dimensions(6000,4000),{width:6000,height:4000}));
test('24M plus one cannot be accepted (also exceeds side bound)',()=>assert.throws(()=>R.dimensions(1,24000001)));
test('Over-pixel-cap dimensions rejected while each side is within limit',()=>assert.throws(()=>R.dimensions(6000,4001)));
test('Previously accepted binary24Mi pixel range is rejected',()=>assert.throws(()=>R.dimensions(5000,5000)));
test('PNG header24M accepted before decode',()=>assert.equal(R.inspect(png(6000,4000)).dimensionsVerified,true));
test('PNG header over24M rejected before decode',()=>assert.throws(()=>R.inspect(png(6000,4001))));
test('JPEG header24M accepted before decode',()=>assert.equal(R.inspect(jpeg(6000,4000)).width,6000));
test('JPEG header25M rejected before decode',()=>assert.throws(()=>R.inspect(jpeg(5000,5000))));
test('Eight MiB byte cap preserved',()=>assert.equal(R.MAX_BYTES,8*1024*1024));
test('Maximum individual side remains16384',()=>{assert.equal(R.MAX_SIDE,16384);assert.throws(()=>R.dimensions(16385,1));});
console.log(JSON.stringify(cases,null,2));if(cases.some(x=>x.status==='FAIL'))process.exit(1);
