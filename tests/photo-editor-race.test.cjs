'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('dist/app.js','utf8'),start=src.indexOf("$('editPhotoRegion').onclick="),end=src.indexOf("$('photoQuoteBg').onchange",start),handler=src.slice(start,end);
const tests=[];
function setup(){let resolve,reject;const els={},quad=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],c={loading:0,state:{sourcePhoto:'A',sourceKind:'artwork',sourceQuad:quad,sourceMask:'A-mask',photoFlip:false},$:id=>els[id]||(els[id]={}),loadImage:()=>new Promise((r,j)=>{resolve=r;reject=j;}),showPhotoEditor(){c.editorOpened=true;},status(s){c.message=s;},photoSourceData:null,photoSourceImg:null,photoKind:null,photoQuad:null,photoSourceMask:null,photoTouched:false,photoCandidates:[],photoAdjust:false,photoFlip:false};vm.createContext(c);vm.runInContext(handler,c);return{c,run:()=>els.editPhotoRegion.onclick(),resolve:v=>resolve(v),reject:v=>reject(v)};}
async function test(name,fn){try{await fn();tests.push({name,status:'PASS'});}catch(error){tests.push({name,status:'FAIL',error:error.message});}}
(async()=>{
await test('New source B rejects delayed editor A without global writes',async()=>{const s=setup(),p=s.run();s.c.state={...s.c.state,sourcePhoto:'B',sourceMask:'B-mask'};s.resolve({source:'A'});await p;assert(!s.c.editorOpened);assert.equal(s.c.photoSourceData,null);assert.equal(s.c.photoSourceImg,null);});
await test('Reset loading token rejects delayed editor result',async()=>{const s=setup(),p=s.run();s.c.loading++;s.resolve({source:'A'});await p;assert(!s.c.editorOpened);assert.equal(s.c.photoSourceImg,null);});
await test('Same-source newer upload invalidates delayed editor result',async()=>{const s=setup(),p=s.run();s.c.loading+=2;s.resolve({source:'A'});await p;assert(!s.c.editorOpened);});
await test('Unchanged source opens coherent original image and geometry',async()=>{const s=setup(),p=s.run();s.resolve({source:'A'});await p;assert(s.c.editorOpened);assert.equal(s.c.photoSourceData,'A');assert.equal(s.c.photoSourceMask,'A-mask');assert.equal(s.c.photoSourceImg.source,'A');assert.notEqual(s.c.photoQuad,s.c.state.sourceQuad);assert.deepEqual(JSON.parse(JSON.stringify(s.c.photoQuad)),s.c.state.sourceQuad);});
await test('Changed geometry before decode cannot mix with old source',async()=>{const s=setup(),p=s.run();s.c.state.sourceQuad=[{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}];s.resolve({source:'A'});await p;assert(!s.c.editorOpened);});
await test('Current image rejection gives useful error and no editor',async()=>{const s=setup(),p=s.run();s.reject(Error('bad image'));await p;assert.equal(s.c.message,'bad image');assert(!s.c.editorOpened);});
await test('Obsolete image rejection cannot overwrite new status',async()=>{const s=setup(),p=s.run();s.c.loading++;s.c.message='new success';s.reject(Error('old failure'));await p;assert.equal(s.c.message,'new success');});
console.log(JSON.stringify({tests},null,2));fs.writeFileSync('tests/photo-editor-race-results.json',JSON.stringify({tests},null,2));if(tests.some(t=>t.status==='FAIL'))process.exitCode=1;
})();
