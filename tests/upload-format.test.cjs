const a=require('node:assert/strict'), {inspect,dimensions}=require('../frontend/upload-format.js');let n=0;function test(name,f){f();n++;console.log('PASS',name)}
const png=Buffer.alloc(24);png.set([137,80,78,71,13,10,26,10]);png.write('IHDR',12);png.writeUInt32BE(200,16);png.writeUInt32BE(100,20);
test('PNG signature/dimensions',()=>a.equal(inspect(png).width,200));
test('PNG bytes independent of filename/mime',()=>a.equal(inspect(png).type,'png'));
test('PNG bomb blocked before decoder',()=>{const b=Buffer.from(png);b.writeUInt32BE(90000,16);a.throws(()=>inspect(b));});
test('Empty blocked',()=>a.throws(()=>inspect(new Uint8Array())));
test('oversize blocked',()=>a.throws(()=>inspect(new Uint8Array(8*1024*1024+1))));
test('HTML not accepted as SVG',()=>a.throws(()=>inspect(Buffer.from('<html><svg></svg></html>'))));
test('SVG requires sanitizer',()=>a.equal(inspect(Buffer.from('<svg onload="alert(1)"></svg>')).requiresSanitizer,true));
test('PDF requires page selection',()=>a.equal(inspect(Buffer.from('%PDF-1.7\n')).requiresPagePicker,true));
test('Fake PNG extension text blocked',()=>a.throws(()=>inspect(Buffer.from('this is not a png'))));
const gif=Buffer.from('47494638396164003200','hex');test('GIF dimensions',()=>a.equal(inspect(gif).height,50));
const tiff=Buffer.from('49492a0008000000','hex');test('TIFF recognized but needs decoder',()=>a.equal(inspect(tiff).needsDecoder,true));
const ftyp=brand=>{let b=Buffer.alloc(20);b.writeUInt32BE(20);b.write('ftyp',4);b.write(brand,8);b.write('mif1',16);return b;};
test('HEIC distinguished',()=>a.equal(inspect(ftyp('heic')).type,'heif'));
test('AVIF preferred over mif1',()=>a.equal(inspect(ftyp('avif')).type,'avif'));
test('zero/negative dimensions rejected',()=>{a.throws(()=>dimensions(0,1));a.throws(()=>dimensions(-3,3));});
console.log(JSON.stringify({pass:n,fail:0,scope:'header recognition and limits only; no browser codec or visual fidelity tests'}));
