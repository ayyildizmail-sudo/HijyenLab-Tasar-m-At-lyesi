const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas'),M=require('../frontend/mark-orientation'),R=require('../frontend/rear-photo');
const app=fs.readFileSync('frontend/app.js','utf8');
function make(w=1,h=1){const c=createCanvas(w,h);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}
class Reader{readAsDataURL(file){file.arrayBuffer().then(b=>{this.result='data:image/png;base64,'+Buffer.from(b).toString('base64');this.onload();},e=>this.onerror(e));}}
const context={document:{createElement:()=>make()},loadImage,ImageData,File,FileReader:Reader,loading:0,requestAnimationFrame:f=>f(),MarkOrientation:M};
for(const [name,file]of Object.entries({LocalInkExtraction:'ink-extraction',ColoredFidelity:'colored-fidelity',BackgroundAnalysis:'background',PhotoFidelity:'photo-fidelity',WhiteCarrier:'white-carrier',LightSurface:'light-surface'}))context[name]=require('../frontend/'+file+'.js');
vm.createContext(context);vm.runInContext(app.slice(app.indexOf('async function extractStandardPhotoInk('),app.indexOf('const prepareSourceWithoutInk='))+app.slice(app.indexOf('async function extractWhiteCarrierProposal('),app.indexOf('// Help drafts')),context);
async function decoded(file){const image=await loadImage(Buffer.from(await file.arrayBuffer())),canvas=make(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0);return {data:canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height,canvas};}
function sum(data,c){let n=0;for(let i=0;i<data.length;i+=4)n+=c===3?data[i+3]:data[i+c]*data[i+3]/255;return n;}
(async()=>{
 const img=await loadImage(path.join(__dirname,'fixtures/photo-frame-geometry/source.jpeg')),before=await context.extractUnnormalizedPhotoInk(img),result=await context.extractPhotoInk(img);assert.ok(before?.whiteCarrier);assert.ok(result?.whiteCarrier);assert.ok(result.processing.geometry.applied,JSON.stringify(result.processing));assert.ok(result.processing.geometry.alphaPreserved);assert.ok(result.processing.transformOrder.includes('whole-source premultiplied-alpha affine shear rectification'));
 const a=await decoded(before.file),b=await decoded(result.file);assert.equal(b.height,a.height);assert.ok(b.width>a.width);assert.equal(b.data[3],0);assert.equal(M.correctPhotoFrame({data:b.data,width:b.width,height:b.height}).geometry.applied,false);
 for(let c=0;c<4;c++)assert.ok(Math.abs(sum(b.data,c)/sum(a.data,c)-1)<.005,'premultiplied channel '+c+' retained');
 // The same corrected file is the one the actual comparison panel consumes.
 const ui=fs.readFileSync('frontend/white-carrier-ui.js','utf8');assert.ok(ui.includes('reader.readAsDataURL(extracted.file)'));assert.ok(app.includes('const extracted=await extractUnnormalizedPhotoInk(img)'));assert.ok(app.includes('extracted=await extractPhotoInk(img)'));
 // Legacy white-carrier and planar-rectified early returns cannot bypass
 // normalization: same wrapper and same alpha matte, independent metadata.
 const actualExtractor=context.extractUnnormalizedPhotoInk;
 for(const method of ['white-carrier-chromatic-and-dark-components','white-carrier-boundary-planar']){context.extractUnnormalizedPhotoInk=async()=>({...before,processing:{...before.processing,method}});const routed=await context.extractPhotoInk(img);assert.ok(routed.processing.geometry.applied);assert.equal(routed.processing.method,method);}
 context.extractUnnormalizedPhotoInk=actualExtractor;
 const variants=[];
 for(const [name,scale,angle]of [['downscaled',.75,0],['rotated',1,5]]){const width=Math.ceil(img.width*scale),height=Math.ceil(img.height*scale),v=make(width,height),vc=v.getContext('2d');vc.fillStyle='#fff';vc.fillRect(0,0,width,height);vc.translate(width/2,height/2);vc.rotate(angle*Math.PI/180);vc.drawImage(img,-width/2,-height/2,width,height);const proposal=await context.extractPhotoInk(v);assert.ok(proposal?.whiteCarrier,name+' must remain photo proposal');assert.ok(proposal.processing.geometry?.applied,name+': '+JSON.stringify(proposal.processing.geometry));variants.push({name,geometry:proposal.processing.geometry});}
 const rear=await R.prepare(img,{createCanvas:make});assert.ok(rear.processing.geometry.applied,JSON.stringify(rear.processing));assert.ok(rear.reviewRequired);assert.ok(rear.processing.geometry.alphaPreserved);
 fs.mkdirSync('tests/evidence/v48',{recursive:true});fs.writeFileSync('tests/evidence/v48/photo-proposal-before.png',a.canvas.toBuffer('image/png'));fs.writeFileSync('tests/evidence/v48/photo-proposal-after.png',b.canvas.toBuffer('image/png'));fs.writeFileSync('tests/evidence/v48/rear-photo-proposal-after.png',rear.canvas.toBuffer('image/png'));fs.writeFileSync('tests/evidence/v48/photo-geometry-results.json',JSON.stringify({front:result.processing,rear:rear.processing,variants},null,2));
 console.log('PASS actual original photo through full front proposal route and rear route; alpha + premultiplied RGB retained; no second correction',JSON.stringify(result.processing.geometry));
})().catch(e=>{console.error(e);process.exitCode=1;});
