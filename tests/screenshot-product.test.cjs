const assert=require('assert/strict'),D=require('../frontend/screenshot-artwork'),P=require('../frontend/print-policy');
const results=[];function check(n,fn){try{fn();results.push({name:n,pass:true});}catch(e){results.push({name:n,pass:false,error:e.message});}}
function page({dy=0,gray=false,second=false,ui=true,shell=true,marks=true,flatShell=false,grayCount=4}={}){const w=400,h=800,data=new Uint8ClampedArray(w*h*4).fill(255);function rect(x,y,bw,bh,c){for(let yy=y;yy<y+bh;yy++)for(let xx=x;xx<x+bw;xx++)data.set([...c,255],(yy*w+xx)*4);}function word(x,y,c,n=5){for(let i=0;i<n;i++){rect(x+i*9,y,3,22,c);rect(x+i*9,y+9,7,3,c);}}if(ui){word(70,65,[30,40,70],12);word(85,660,[20,70,120],10);}function packet(y){if(shell){for(let sx=35;sx<365;sx++){let tone=flatShell?195:145+Math.round((sx-35)*80/329);rect(sx,y,1,130,[tone,tone,tone]);}rect(49,y+9,302,112,[250,250,250]);}if(marks){word(98,y+40,[20,20,20]);word(230,y+40,[180,20,20]);for(let x=100;x<143;x+=7)rect(x,y+71,3,4,[20,20,20]);if(gray)word(165,y+83,[175,175,175],grayCount);}}packet(220+dy);if(second)packet(430);return{data,w,h,body:[98,260+dy,273,295+dy],gray:[165,303+dy,199,325+dy]};}
function detect(f){return D.productPanel(f.data,f.w,f.h);}function contains(a,b){return a[0]<=b[0]&&a[1]<=b[1]&&a[2]>=b[2]&&a[3]>=b[3];}
for(const dy of [-35,0,70])check('two groups + small subtitle, shift '+dy,()=>{const f=page({dy}),r=detect(f);assert.ok(r?.box,'must propose');assert.ok(contains(r.box,f.body),'must keep both groups and subtitle');assert.ok(r.box[1]>200+dy&&r.box[3]<350+dy,'must exclude shell/UI');});
check('flat bordered UI card not packet',()=>assert.equal(detect(page({flatShell:true})),null));
check('weak gray third group cannot silently disappear',()=>{const f=page({gray:true}),r=detect(f);assert.ok(!r?.box||contains(r.box,f.gray),'unsafe partial proposal drops weak gray brand');});
check('single faint neutral emblem not silently dropped',()=>{const f=page({gray:true,grayCount:1}),r=detect(f);assert.ok(!r?.box||contains(r.box,[165,303,172,325]),'single faint symbol dropped');});
check('two packets ambiguous',()=>{assert.equal(detect(page({second:true}))?.needsSelection,true);});
check('plain flat logo unchanged',()=>assert.equal(detect(page({shell:false,ui:false})),null));
check('packet without page UI unchanged',()=>assert.equal(detect(page({ui:false})),null));
check('foil/UI without brand not artwork',()=>assert.equal(detect(page({marks:false})),null));
check('four ink policy blocks',()=>assert.equal(P.evaluate({count:4,hasArtwork:true}).blocked,true));
check('uncertain ink blocks',()=>assert.equal(P.evaluate({status:'unknown',hasArtwork:true}).blocked,true));


const fs=require('fs'),vm=require('vm'),path=require('path');const source=fs.readFileSync(path.join(__dirname,'../frontend/app.js'),'utf8');const scope={};vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('function removeScreenshotGuide('),source.indexOf('async function prepareScreenshotProduct(')),scope);
function guideFixture(solid=false){const w=300,h=150,data=new Uint8ClampedArray(w*h*4);function dot(x,y,c=[180,185,190]){data.set([...c,255],(y*w+x)*4);}for(let x=10;x<=290;x++)if(solid||x%6<3){dot(x,12);dot(x,138);}for(let y=12;y<=138;y++)if(solid||y%6<3){dot(10,y);dot(290,y);}for(let y=50;y<75;y++)for(let x=80;x<85;x++)dot(x,y,[30,30,30]);return{data,w,h};}
check('complete dashed screen guide removed without dark mark loss',()=>{const f=guideFixture(),before=f.data.slice();const r=scope.removeScreenshotGuide(f.data,f.w,f.h);assert.ok(r?.removedPixels>0);for(let y=50;y<75;y++)for(let x=80;x<85;x++){let i=(y*f.w+x)*4;assert.deepEqual(f.data.slice(i,i+4),before.slice(i,i+4));}});
check('solid light brand frame untouched',()=>{const f=guideFixture(true),before=f.data.slice();assert.equal(scope.removeScreenshotGuide(f.data,f.w,f.h),null);assert.deepEqual(f.data,before);});
check('incomplete dotted typography untouched',()=>{const f=guideFixture();for(let y=110;y<f.h;y++)for(let x=0;x<f.w;x++)f.data[(y*f.w+x)*4+3]=0;const before=f.data.slice();assert.equal(scope.removeScreenshotGuide(f.data,f.w,f.h),null);assert.deepEqual(f.data,before);});
check('detector input pixels immutable',()=>{const f=page({gray:true}),before=f.data.slice();detect(f);assert.deepEqual(f.data,before);});
(async()=>{
 const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');const c={ScreenshotArtwork:D,PhotoFidelity:require('../frontend/photo-fidelity'),RearPhoto:require('../frontend/rear-photo'),LocalInkExtraction:require('../frontend/ink-extraction'),ImageData,File:class{constructor(parts,name){this.parts=parts;this.name=name;}},document:{createElement(){const canvas=createCanvas(1,1);canvas.toBlob=fn=>fn(canvas.toBuffer('image/png'));return canvas;}}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function removeScreenshotGuide('),source.indexOf('async function prepareScreenshotArtwork(')),c);
 const f=page({gray:true,grayCount:1}),canvas=createCanvas(f.w,f.h);canvas.getContext('2d').putImageData(new ImageData(f.data,f.w,f.h),0,0);const result=await c.prepareScreenshotProduct(canvas);
 check('single automatic approximate output, no alternative choice',()=>{assert.ok(result?.file);assert.ok(!result.requiresChoice);assert.ok(!result.alternatives);});
 if(result?.file){const im=await loadImage(result.file.parts[0]),out=createCanvas(im.width,im.height);out.getContext('2d').drawImage(im,0,0);const pixels=out.getContext('2d').getImageData(0,0,out.width,out.height).data,b=result.processing.box;
 check('faint emblem source pixels retained in final PNG',()=>{let retained=0;for(let y=303;y<325;y++)for(let x=165;x<172;x++){const raw=(y*f.w+x)*4,px=x-b[0],py=y-b[1];if(f.data[raw]!==175)continue;assert.ok(px>=0&&py>=0&&px<out.width&&py<out.height);const i=(py*out.width+px)*4;assert.equal(pixels[i],175);assert.equal(pixels[i+3],255);retained++;}assert.ok(retained>50);});
 check('tiny subtitle source pixels retained in final PNG',()=>{for(let x=100;x<143;x+=7){const i=((291-b[1])*out.width+x-b[0])*4;assert.equal(pixels[i],20);assert.equal(pixels[i+3],255);}});
 }
 console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
