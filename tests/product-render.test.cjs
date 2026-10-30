'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto'),{createCanvas,loadImage}=require('@napi-rs/canvas'),G=require('../frontend/product-geometry.js'),C=require('../frontend/product-catalog.js');
const OUT='/workspace/scratch/d698780c5c28/product39-evidence';fs.mkdirSync(OUT,{recursive:true});
function fn(source,name){const start=source.indexOf('function '+name+'(');assert(start>=0);let i=source.indexOf('{',start),depth=1;for(++i;depth;i++){if(source[i]==='{')depth++;else if(source[i]==='}')depth--;}return source.slice(start,i);}
const scope={};vm.createContext(scope);vm.runInContext(fn(fs.readFileSync('frontend/app.js','utf8'),'materialColor')+'\n'+fn(fs.readFileSync('frontend/rear-preview.js','utf8'),'tintRearPixels'),scope);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const results=[];for(const id of ['BM15','BM545'])for(const side of ['front','back']){
 const asset=path.join('frontend',C.get(id)[side+'Asset']),before=hash(fs.readFileSync(asset)),img=await loadImage(asset),profile=G.get(id),expected=side==='front'?profile.source:profile.rear.source;assert.equal(img.width,expected.width);assert.equal(img.height,expected.height);
 for(const [name,color]of [['white','#ffffff'],['burgundy','#800d2e']]){
 const native=createCanvas(img.width,img.height),ctx=native.getContext('2d');ctx.save();G.clip(ctx,id,side,img.width,img.height);ctx.drawImage(img,0,0);ctx.restore();
 const pixels=ctx.getImageData(0,0,img.width,img.height),alpha=Uint8Array.from(pixels.data.filter((_,i)=>i%4===3));scope.tintRearPixels(pixels.data,color);assert.deepEqual(Uint8Array.from(pixels.data.filter((_,i)=>i%4===3)),alpha,'Tint must not restore clipped background');ctx.putImageData(pixels,0,0);
 for(const [x,y]of [[0,0],[img.width-1,0],[0,img.height-1],[img.width-1,img.height-1],[Math.floor(img.width/2),Math.floor(img.height*.05)]])assert.equal(ctx.getImageData(x,y,1,1).data[3],0,'Exterior alpha must stay zero');assert(ctx.getImageData(Math.floor(img.width/2),Math.floor(img.height/2),1,1).data[3]>240,'Center must remain opaque');
 const output=createCanvas(side==='front'?1600:img.width,side==='front'?850:img.height),out=output.getContext('2d');out.fillStyle='#eef1f5';out.fillRect(0,0,output.width,output.height);const frame=side==='front'?G.frame(id):{x:0,y:0,width:img.width,height:img.height};assert(Math.abs(frame.width/frame.height-img.width/img.height)<1e-9);out.drawImage(native,frame.x,frame.y,frame.width,frame.height);
 const file=path.join(OUT,`${id.toLowerCase()}-${side}-${name}.png`);fs.writeFileSync(file,output.toBuffer('image/png'));results.push({id,side,color,file,source:[img.width,img.height],renderAspect:frame.width/frame.height,status:'PASS'});
 }assert.equal(hash(fs.readFileSync(asset)),before,'Raw image must not change');
 }
 assert(Math.abs(G.frame('BM15').width/G.frame('BM15').height-G.frame('BM545').width/G.frame('BM545').height)>.5,'Different product aspect must remain distinct');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({scope:'Code-native silhouette clipping before runtime material tint; source images unchanged; not browser screenshot or print validation',results},null,2));console.log('PASS four product assets × white/burgundy: source dimensions, clip-before-tint alpha, native aspect, distinct silhouettes and unchanged raw assets; evidence '+OUT);
})().catch(e=>{console.error(e);process.exitCode=1;});
