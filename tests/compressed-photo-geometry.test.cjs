const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas'),M=require('../frontend/mark-orientation'),R=require('../frontend/rear-photo');
const app=fs.readFileSync('frontend/app.js','utf8');
function make(w=1,h=1){const c=createCanvas(w,h);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}
class Reader{readAsDataURL(file){file.arrayBuffer().then(b=>{this.result='data:image/png;base64,'+Buffer.from(b).toString('base64');this.onload();},e=>this.onerror(e));}}
const context={document:{createElement:()=>make()},loadImage,ImageData,File,FileReader:Reader,loading:0,requestAnimationFrame:f=>f(),MarkOrientation:M};
for(const [name,file]of Object.entries({LocalInkExtraction:'ink-extraction',ColoredFidelity:'colored-fidelity',BackgroundAnalysis:'background',PhotoFidelity:'photo-fidelity',WhiteCarrier:'white-carrier',LightSurface:'light-surface'}))context[name]=require('../frontend/'+file+'.js');
context.StandardPhoto={prepare:img=>require('../frontend/standard-photo').prepare(img,{createCanvas:make})};
vm.createContext(context);vm.runInContext(app.slice(app.indexOf('async function extractStandardPhotoInk('),app.indexOf('const prepareSourceWithoutInk='))+app.slice(app.indexOf('async function extractWhiteCarrierProposal('),app.indexOf('// Help drafts')),context);
async function decoded(file){const image=await loadImage(Buffer.from(await file.arrayBuffer())),canvas=make(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0);return {data:canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height,canvas};}
function sum(data,c){let n=0;for(let i=0;i<data.length;i+=4)n+=c===3?data[i+3]:data[i+c]*data[i+3]/255;return n;}
(async()=>{
 const img=await loadImage(path.join(__dirname,'fixtures/photo-frame-geometry/source.jpeg'));
 for(const [scale,quality] of [[.75,60],[.5,90]]){
  const input=make(Math.round(img.width*scale),Math.round(img.height*scale));input.getContext('2d').drawImage(img,0,0,input.width,input.height);
  const source=await loadImage(input.toBuffer('image/jpeg',quality)),before=await context.extractUnnormalizedPhotoInk(source),proposal=await context.extractPhotoInk(source);
  assert.ok(before?.whiteCarrier&&proposal?.whiteCarrier);const a=await decoded(before.file),b=await decoded(proposal.file),g=proposal.processing.geometry;
  assert.equal(g.applied,true);assert.equal(g.status,'corrected');assert.equal(g.methodVersion,'2');assert.ok(g.thresholdEstimates.length>=2);assert.ok(Math.max(...g.thresholdEstimates)-Math.min(...g.thresholdEstimates)<.015);assert.ok(g.shear>.11&&g.shear<.14);assert.ok(g.retainedRows>=g.sampleRows*.8);
  assert.equal(a.height,b.height);assert.equal(b.data[3],0);for(let k=0;k<4;k++)assert.ok(Math.abs(sum(b.data,k)/sum(a.data,k)-1)<.005);
  const post=M.correctPhotoFrame({data:b.data,width:b.width,height:b.height});assert.equal(post.geometry.applied,false);assert.ok(post.geometry.ok,JSON.stringify(post.geometry));assert.ok(Math.abs(post.geometry.shear)<.012);
  console.log('PASS compressed photo',input.width,input.height,quality,JSON.stringify({before:g.shear,after:post.geometry.shear,thresholds:g.thresholdEstimates,retained:g.retainedRows,total:g.sampleRows}));
 }
 // Clean/native artwork is not routed through the recovery fallback in correctFrame.
 // In photo analysis too, an upright oval stays upright; a tilted decorative oval
 // without independent level rules, and italic text alone, must stay untouched.
 for(const kind of ['upright','decorative-tilt','italic-text','asymmetric']){
  const c=make(500,400),x=c.getContext('2d');x.strokeStyle='#18374b';x.fillStyle='#18374b';x.lineWidth=3;
  if(kind==='italic-text'){x.font='italic 42px serif';x.fillText('ALPHA BETA',70,180);x.font='italic 18px serif';x.fillText('EXAMPLE TEXT',160,240);}
  else{if(kind==='decorative-tilt')x.transform(1,0,.15,1,-30,0);x.beginPath();x.ellipse(250,200,160,145,0,Math.PI*1.12,Math.PI*1.88);x.stroke();x.beginPath();x.ellipse(250,200,160,145,0,Math.PI*.12,Math.PI*.88);x.stroke();if(kind!=='decorative-tilt'){x.fillRect(130,215,80,3);x.fillRect(290,215,80,3);}if(kind==='asymmetric')x.clearRect(0,0,250,180);}
  const f={data:x.getImageData(0,0,500,400).data,width:500,height:400},original=f.data.slice(),r=M.correctPhotoFrame(f);assert.equal(r.geometry.applied,false,kind+JSON.stringify(r.geometry));assert.equal(r.geometry.status,kind==='upright'?'already-aligned':'insufficient-evidence');assert.deepEqual(f.data,original);assert.equal(r.data,f.data);
 }
 console.log('PASS clean upright, decorative tilt, italic text and asymmetric abstentions; no source-pixel modification');
})().catch(e=>{console.error(e);process.exitCode=1;});
