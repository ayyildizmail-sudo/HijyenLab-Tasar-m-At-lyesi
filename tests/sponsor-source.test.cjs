const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const Shared=require('../frontend/standard-photo'),Rear=require('../frontend/rear-photo'),Logo=require('../frontend/rear-logo'),Context=require('../frontend/source-context'),W=require('../frontend/white-carrier');
const fixture=n=>path.join(__dirname,'fixtures/sponsor-source',n),options={createCanvas};
function pixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}
function canvas(img){const c=createCanvas(img.width,img.height);c.getContext('2d').drawImage(img,0,0);return c;}
function crop(img,b){const c=createCanvas(b[2]-b[0],b[3]-b[1]);c.getContext('2d').drawImage(img,b[0],b[1],c.width,c.height,0,0,c.width,c.height);return c;}
function ink(c,b){const d=pixels(c);let n=0;for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++)if(d[(y*c.width+x)*4+3]>100)n++;return n;}
(async()=>{
 const packet=await loadImage(fixture('packet.jpeg')),screen=await loadImage(fixture('screen.jpeg')),before=canvas(await loadImage(fixture('front-before.png')));
 assert.equal(Context.inspectImage(packet,options),null);assert(Context.inspectImage(screen,options)?.needsSelection);
 const front=await Shared.prepare(packet,options),rear=await Rear.prepare(packet,options);
 assert.equal(front.canvas.width,before.width);assert.equal(front.canvas.height,before.height);assert.deepEqual(pixels(front.canvas),pixels(before),'shared refactor keeps all original front RGBA unchanged');
 assert.equal(rear.method,'rear-shared-standard-photo');assert.deepEqual(rear.sourceBounds,[125,800,742,1033]);assert.deepEqual(pixels(rear.canvas),pixels(front.canvas),'same packet gives same complete group front/rear');
 // Full groups are evidence, not one favored brand: both marks, both taglines, divider.
 for(const box of [[20,30,270,180],[305,10,315,200],[330,25,600,190]])assert(ink(rear.canvas,box)>50);
 for(const engine of [Logo,Rear])await assert.rejects(()=>engine.prepare(screen,options),e=>e.code==='SOURCE_REGION_REQUIRED');
 const gray=canvas(screen),gx=gray.getContext('2d'),gp=gx.getImageData(0,0,gray.width,gray.height);for(let i=0;i<gp.data.length;i+=4){const l=Math.round(.2126*gp.data[i]+.7152*gp.data[i+1]+.0722*gp.data[i+2]);gp.data[i]=gp.data[i+1]=gp.data[i+2]=l;}gx.putImageData(gp,0,0);assert(Context.inspectImage(gray,options)?.needsSelection);await assert.rejects(()=>Rear.prepare(gray,options),e=>e.code==='SOURCE_REGION_REQUIRED');
 // Simulate explicit user-drawn full packet ROI. Runtime has no fixture coordinates.
 const selected=crop(screen,[80,590,630,840]),chosen=await Rear.prepareSelected(selected,options);assert.equal(chosen.canvas.width,550);assert.equal(chosen.canvas.height,250);assert.equal(chosen.method,'rear-user-selected-whole-group-photo');
 for(const box of [[80,65,245,180],[265,45,285,205],[290,65,480,205]])assert(ink(chosen.canvas,box)>50,'complete selected group stays present');
 // The small neutral tagline must not disappear while broad group checks pass.
 const selectedRaw=pixels(selected),oldMatte=require('../frontend/photo-fidelity').matte(selectedRaw,selected.width,selected.height).data,finalPixels=pixels(chosen.canvas);let oldFine=0,newFine=0,restoredExact=0;
 for(let y=0;y<250;y++)for(let x=0;x<550;x++){const j=(y*550+x)*4,inFine=x>=320&&x<450&&y>=178&&y<198;if(inFine){if(oldMatte[j+3]>100)oldFine++;if(finalPixels[j+3]>100)newFine++;}
  if(finalPixels[j+3]!==oldMatte[j+3]){assert(inFine,'no distant UI border or packet artifacts resurrected');assert.equal(finalPixels[j+3],255);assert.deepEqual(Array.from(finalPixels.subarray(j,j+3)),Array.from(selectedRaw.subarray(j,j+3)),'weak details use original source RGB, not generated text');restoredExact++;}
 }
 assert(newFine>oldFine*4&&newFine>=200);assert(restoredExact>=150);assert.equal(chosen.processing.fineDetails.restoredPixels,restoredExact);assert.match(chosen.contrastWarning,/Küçük veya soluk yazılar/);
 await assert.rejects(()=>Rear.prepareSelected(screen,options),e=>e.code==='SOURCE_REGION_REQUIRED');
 // Distinct physical carriers cannot be silently joined by the shared route.
 const two=createCanvas(600,500),tx=two.getContext('2d');tx.fillStyle='#666';tx.fillRect(0,0,600,500);for(const y of [80,300]){tx.fillStyle='#f5f5f5';tx.fillRect(50,y,500,140);for(const [a,b,col]of [[180,220,'#0014aa'],[230,270,'#b40014'],[280,320,'#149600']]){tx.fillStyle=col;tx.fillRect(a,y+35,b-a,23);}tx.fillStyle='#191919';tx.fillRect(195,y+80,110,7);}assert.equal(W.propose(pixels(two),600,500).length,2);await assert.rejects(()=>Rear.prepare(two,options),/birden fazla ambalaj/);
 const app=fs.readFileSync('frontend/app.js','utf8');assert(app.includes('SourceContext.inspectImage(img)){blockScreenshotSelection(data);return;}'),'front uses existing source selection after screenshot proposal, before generic extraction');
 assert(!/IMG_5255|BODRUM|Mualla|ÇAĞIN|\[80,590/.test(fs.readFileSync('frontend/source-context.js','utf8')+fs.readFileSync('frontend/standard-photo.js','utf8')+fs.readFileSync('frontend/rear-photo.js','utf8')));
 console.log('PASS real packet whole group + pixel-exact front refactor + rear parity; screenshot/button and grayscale blocked; user-selected full group completes; distinct carriers refuse ambiguity');
})().catch(e=>{console.error(e);process.exitCode=1;});
