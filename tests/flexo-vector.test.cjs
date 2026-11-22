const test=require('node:test'),assert=require('node:assert/strict'),{trace}=require('../frontend/flexo-vector'),{createCanvas,loadImage}=require('@napi-rs/canvas');
test('paths preserve all disconnected marks, holes and source pixels after SVG rendering',async()=>{
 const width=40,height=32,data=new Uint8ClampedArray(width*height*4),put=(x,y,rgb,a=255)=>data.set([...rgb,a],(y*width+x)*4);
 for(let y=4;y<25;y++)for(let x=3;x<28;x++)if(x<6||x>24||y<7||y>21)put(x,y,[100,20,40]);
 put(33,2,[100,20,40]);put(33,29,[20,60,90]);put(35,29,[20,60,90],128);
 const result=trace(data,width,height);assert(result.ok);assert.equal(result.inkCount,2);assert(!result.svg.includes('<image'));assert(!result.svg.includes('base64'));assert.equal(result.productionApproved,false);
 const img=await loadImage(Buffer.from(result.svg)),canvas=createCanvas(width,height);canvas.getContext('2d').drawImage(img,0,0);
 const actual=canvas.getContext('2d').getImageData(0,0,width,height).data;
 for(let i=0;i<data.length;i+=4){assert.equal(actual[i+3],data[i+3]);if(data[i+3]===255)assert.deepEqual(Array.from(actual.subarray(i,i+3)),Array.from(data.subarray(i,i+3)));}
});
test('photographic palettes, empty art, oversized frames and excessive paths decline',()=>{
 const data=new Uint8ClampedArray(4*4*4);for(let i=0;i<16;i++)data.set([i*10,30,60,255],i*4);
 assert.equal(trace(data,4,4).ok,false);assert.equal(trace(new Uint8ClampedArray(16),2,2).ok,false);assert.equal(trace(data,4,4,{maxPixels:10}).ok,false);
 const two=new Uint8ClampedArray([0,0,0,255,255,0,0,255]);assert.equal(trace(two,2,1,{maxRuns:1}).ok,false);
});
