const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas'),B=require('../frontend/background'),P=require('../frontend/source-package-ground');
test('source-bound package ground becomes a layer without recoloring or losing white marks',()=>{
 const image=createCanvas(100,80),c=image.getContext('2d');c.fillStyle='#742c40';c.fillRect(0,0,100,80);c.fillStyle='white';c.fillRect(25,20,50,8);c.fillRect(45,35,10,30);
 const original=Buffer.from(c.getImageData(0,0,100,80).data),source='a'.repeat(64),app=fs.readFileSync('frontend/app.js','utf8');
 const context={logoImg:image,processedKey:null,processedLogo:null,state:{logo:'current',bg:'#742c40',bgDetection:{kind:'color',color:'#742c40'},groundScope:{sourceIdentity:source,packageGroundProposed:true}},processingSession:{getState:()=>({source:{sha256:source}})},BackgroundAnalysis:B,document:{createElement:()=>createCanvas(1,1)}};
 vm.createContext(context);vm.runInContext(app.slice(app.indexOf('function prepareScopedPackageLayer('),app.indexOf('function prepareLogo(')),context);
 const output=context.prepareScopedPackageLayer().getContext('2d').getImageData(0,0,100,80).data;
 assert.equal(output[3],0);assert.equal(output[(22*100+30)*4+3],255);assert.deepEqual(Array.from(output.slice((22*100+30)*4,(22*100+30)*4+3)),[255,255,255]);assert.deepEqual(Buffer.from(c.getImageData(0,0,100,80).data),original);
 context.state.groundScope.sourceIdentity='b'.repeat(64);assert.equal(context.prepareScopedPackageLayer(),null);
 context.state.groundScope.sourceIdentity=source;context.state.bg='#ffffff';assert.equal(context.prepareScopedPackageLayer(),null);
});
test('smooth digital colored field with white marks gets an appearance proposal, dark competing marks decline',()=>{
 const width=160,height=100,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([150+Math.round(x/15),100+Math.round(x/15),60+Math.round(x/15),255],(y*width+x)*4);
 for(let y=30;y<60;y++)for(let x=40;x<120;x++)data.set([255,255,255,255],(y*width+x)*4);
 const detection=B.analyze(data,width,height),result=P.nativeProposal(data,width,height,detection);assert(result);assert.equal(result.sourceGroundVerified,false);
 // Source is never rewritten by proposal generation.
 assert.deepEqual(Array.from(data.slice((35*width+50)*4,(35*width+50)*4+4)),[255,255,255,255]);
});
