// Independent decoder verifies the actual rear compositor output, not encoder metadata.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{createCanvas}=require('@napi-rs/canvas'),jsQR=require('./qr-vendor/jsQR-1.4.0.js'),RearLayout=require('../frontend/rear-layout.js');
const scope={URL};vm.createContext(scope);for(const file of ['frontend/vendor/qrcodegen-v1.8.0.js','frontend/qr-preview.js'])vm.runInContext(fs.readFileSync(file,'utf8'),scope);
const qr=scope.QRPreview.encodeUrl('https://hijyenlab.com/menu'),results=[];
for(const background of ['#000000','#deb843'])for(const fields of [{},{instagram:'@hijyenlab',website:'hijyenlab.com',phone:'+90 555 111 22 33',address:'Bodrum / Muğla'}]){
 const canvas=createCanvas(1857,847),ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,1857,847);
 const layout=RearLayout.render(ctx,1857,847,fields,{background,qrColor:'#000000',qrMatrix:qr.modules}),box=layout.boxes.find(b=>b.type==='qr');assert(box);assert(box.moduleSize>=2);assert.equal(box.quietModules,4);
 // Decode the complete customer-facing canvas, including colored carrier and contact text.
 const pixels=ctx.getImageData(0,0,1857,847),decoded=jsQR(pixels.data,1857,847,{inversionAttempts:'dontInvert'});assert(decoded,'QR not decoded from actual rear layout');assert.equal(decoded.data,qr.url);
 const q=4*box.moduleSize,x=Math.ceil(box.x),y=Math.ceil(box.y),w=Math.floor(box.width),h=Math.floor(box.height);
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)if(dx<q||dy<q||dx>=w-q||dy>=h-q)assert.deepEqual(Array.from(ctx.getImageData(x+dx,y+dy,1,1).data),[255,255,255,255],'Quiet zone contaminated');
 results.push({background,withContact:!!fields.instagram,decoded:decoded.data,modulePixels:box.moduleSize,quietZoneModules:box.quietModules,status:'PASS'});
}
const prefix='https://example.com/menu?data=',long=scope.QRPreview.encodeUrl(prefix+'a'.repeat(512-prefix.length)),ctx=createCanvas(1857,847).getContext('2d');assert.throws(()=>RearLayout.render(ctx,1857,847,{}, {background:'#000000',qrColor:'#000000',qrMatrix:long.modules}),/uzun|kısa/);
fs.writeFileSync('tests/rear-qr-decode-results.json',JSON.stringify({decoder:'jsQR 1.4.0 independent decoder',renderer:'RearLayout.render full 1857x847 canvas',results,longUrlSafelyRejected:true},null,2)+'\n');console.log('PASS: four actual rear layouts independently decoded; black/gold carriers, optional contact text, opaque quiet zone and oversized URL rejection');
for(const color of ['#102f59','#800d2e','#245b47']){
 const canvas=createCanvas(1857,847),cx=canvas.getContext('2d'),layout=RearLayout.render(cx,1857,847,{}, {qrMatrix:qr.modules,qrColor:color}),box=layout.boxes[0];const im=cx.getImageData(0,0,1857,847);assert.equal(jsQR(im.data,1857,847).data,qr.url);const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));assert.deepEqual(Array.from(cx.getImageData(box.x+4*box.moduleSize,box.y+4*box.moduleSize,1,1).data),[...rgb,255]);assert.deepEqual(Array.from(cx.getImageData(box.x,box.y,1,1).data),[255,255,255,255]);
 const direct=createCanvas(440,440),dc=direct.getContext('2d');scope.QRPreview.draw(dc,qr,30,30,380,color);assert.equal(jsQR(dc.getImageData(0,0,440,440).data,440,440).data,qr.url);
}
for(const color of [undefined,null,'','#fff','red','#ffffff','#ffff00','#cccccc']){const cv=createCanvas(1857,847),cx=cv.getContext('2d');assert.throws(()=>RearLayout.render(cx,1857,847,{}, {qrMatrix:qr.modules,qrColor:color}),/QR renk|QR rengi/);assert.throws(()=>scope.QRPreview.draw(cx,qr,0,0,300,color),/QR renk|QR rengi/);assert(cx.getImageData(0,0,1857,847).data.every(v=>v===0));}
console.log('PASS navy/burgundy/green QR independently decoded by both renderers; exact ink retained, missing/light colors rejected without fallback');
