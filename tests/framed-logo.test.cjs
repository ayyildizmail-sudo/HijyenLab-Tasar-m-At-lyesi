// Dikdörtgen çerçeveli logo (ör. çerçeve içinde iki satır yazı) fotoğrafı: çerçeve çember sanılıp logo ezilmemeli,
// çerçeve dik açılı çıkmalı, oran korunmalı. Müşteri görseli kullanılmaz; sahne burada çizilir.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const PP=require('../frontend/product-photo.js');
GlobalFonts.registerFromPath(path.join(__dirname,'../frontend/assets/fonts/redraw/fs-montserrat-500.woff2'),'FrameM5');
function scene({aspect=2,rot=-.04,W=1400,H=1700}){const c=createCanvas(W,H),g=c.getContext('2d');
 g.fillStyle='#b9b6ad';g.fillRect(0,0,W,H);g.strokeStyle='#8f8b82';g.lineWidth=10;for(let k=-3;k<6;k++){g.beginPath();g.moveTo(k*400,0);g.lineTo(k*400+900,H);g.stroke();}
 g.save();g.translate(W*.5,H*.5);g.rotate(rot);g.fillStyle='#e9e9e7';g.fillRect(-520,-260,1040,520); // poşet
 const fh=300,fw=fh*aspect*.0+fh*aspect;g.strokeStyle='#111';g.lineWidth=14;g.strokeRect(-fw/2,-fh/2,fw,fh);
 g.fillStyle='#111';g.textAlign='center';g.textBaseline='middle';g.font='150px FrameM5';g.fillText('BONO',0,-30);g.font='bold 52px FrameM5';g.fillText('B U R G E R',0,90);g.restore();
 return c;}
async function run(c){const r=await PP.extract(c.getContext('2d').getImageData(0,0,c.width,c.height).data,c.width,c.height,{});return r;}
for(const aspect of [1.6,2])test(`çerçeveli logo (oran ${aspect}): ezilmez, oran korunur`,async()=>{
 const r=await run(scene({aspect}));assert.equal(r.ok,true,r.reason);const got=r.image.w/r.image.h;
 assert.ok(Math.abs(Math.log(got/aspect))<Math.log(1.15),`oran ${got.toFixed(2)} ≈ ${aspect} olmalı`);
});
test('çerçeve dik açılı çıkar (sol ve sağ kenar dikey)',async()=>{const r=await run(scene({aspect:2,rot:.05}));assert.equal(r.ok,true);
 const {data,w,h}=r.image,dark=(x,y)=>{const i=(y*w+x)*4;return data[i+3]>128&&data[i]<100;};
 const leftAt=y=>{for(let x=0;x<w*.3;x++)if(dark(x,y))return x;return -1;};const a=leftAt(Math.round(h*.25)),b=leftAt(Math.round(h*.75));
 assert.ok(a>=0&&b>=0,'sol kenar bulunmalı');assert.ok(Math.abs(a-b)<=w*.01,`sol kenar eğik: ${a} / ${b}`);});
