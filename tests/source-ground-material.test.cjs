'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Renderer=require('../frontend/print-renderer.js'),app=fs.readFileSync('frontend/app.js','utf8');
const sha='a'.repeat(64),c={state:{bg:'#621a1b',bgDetection:{color:'#621a1b'},groundScope:{sourceIdentity:sha,packageGroundProposed:true}},processingSession:{getState:()=>({source:{sha256:sha}})}};vm.createContext(c);
for(const name of ['materialColor','sourceGroundMaterialResponse'])vm.runInContext(app.split('\n').find(l=>l.startsWith('function '+name+'(')),c);
assert.equal(c.sourceGroundMaterialResponse(),c.materialColor);
for(const lum of [30,80,120,180,220,250,255]){
 const ink=new Uint8ClampedArray([98,26,27,255,100,30,34,255,255,255,255,255,98,26,27,0]);
 const material=new Uint8ClampedArray(Array.from({length:4},()=>[lum,lum,lum,255]).flat());
 const before=Buffer.from(ink),out=Renderer.shade(ink,material,4,1,undefined,c.sourceGroundMaterialResponse());
 assert.deepEqual(Array.from(out.slice(0,3)),Array.from(c.materialColor([98,26,27],lum/255)),'Ground pixel exactly matches underlying package material');
 assert.notDeepEqual(Array.from(out.slice(4,7)),Array.from(out.slice(0,3)),'Near-ground foreground ink remains distinct; no color-key erasure');
 assert.equal(out[7],255);assert.equal(out[11],255,'White lettering stays opaque');assert.equal(out[15],0,'Transparent holes remain transparent');
 assert.deepEqual(Buffer.from(ink),before,'Source ink RGB/alpha untouched');
}
for(const patch of [{recolorApplied:true},{bg:'#ffffff'},{groundScope:{sourceIdentity:'b'.repeat(64),packageGroundProposed:true}},{groundScope:{sourceIdentity:sha,scope:'logo-local'}}]){const before={...c.state};Object.assign(c.state,patch);assert.equal(c.sourceGroundMaterialResponse(),null);Object.assign(c.state,before);delete c.state.recolorApplied;}
c.state.groundScope={sourceIdentity:sha,customerChosen:true};assert.equal(c.sourceGroundMaterialResponse(),null,'Manual unrelated local panel keeps existing renderer');c.state.bgDetection.packageGroundProposal={sourceIdentity:sha};assert.equal(c.sourceGroundMaterialResponse(),c.materialColor,'Explicit same-ground native preview still seamless');
console.log('PASS source-bound material matching: identical ground transfer, similar foreground and white detail preserved, no alpha/source/palette edits; local/manual/stale guards');
