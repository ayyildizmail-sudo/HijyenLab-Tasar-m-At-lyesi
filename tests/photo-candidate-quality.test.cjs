/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression harness. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Q=require('../frontend/photo-candidate-quality.js'),S=require('../frontend/standard-photo.js');
function layer(color='#fff',fraction=1){const c=createCanvas(200,100),x=c.getContext('2d');x.fillStyle=color;x.fillRect(30,20,140*fraction,60);return c;}
function px(c){return c.getContext('2d').getImageData(0,0,c.width,c.height);}
test('white artwork is visible on dark ground, not on white; black native content stays valid',()=>{
 const white=px(layer());assert.equal(Q.assessPixels(white,{ground:'#16345a'}).accepted,true);assert.equal(Q.assessPixels(white,{ground:'#ffffff'}).reason,'insufficient-ground-contrast');assert.equal(Q.assessPixels(px(layer('#111')),{ground:'#ffffff'}).accepted,true);
});
test('actual rendered layer is inspected, not merely valid source alpha',()=>{
 const original=layer(),empty=createCanvas(200,100);assert.equal(Q.assess(original,{canvas:original,background:'#16345a'},{createCanvas,renderedCanvas:empty}).reason,'empty-rendered-artwork');assert.equal(Q.assess(original,{canvas:original,background:'#16345a'},{createCanvas,renderedCanvas:original,ground:'#ffffff'}).reason,'insufficient-ground-contrast');
});
test('significant source contrast loss rejected; complete/resized/cropped layers remain valid',()=>{
 const source=px(layer()),partial=px(layer('#fff',.14));assert.equal(Q.assessPixels(partial,{source,ground:'#16345a'}).reason,'source-light-content-lost');assert.equal(Q.assessPixels(source,{source,ground:'#16345a'}).accepted,true);
 const rendered=createCanvas(140,60);rendered.getContext('2d').drawImage(layer(),30,20,140,60,0,0,140,60);assert.equal(Q.assessPixels(source,{rendered:px(rendered),ground:'#16345a'}).accepted,true);
});
test('empty, invalid ground and unreadable layers fail closed with explicit evidence',()=>{
 assert.equal(Q.assessPixels(px(createCanvas(20,20)),{ground:'#ffffff'}).reason,'empty-candidate');assert.equal(Q.assessPixels(px(layer()),{ground:'unknown'}).reason,'ground-unverified');assert.equal(Q.assess(null,{}, {createCanvas}).reason,'quality-inspection-unavailable');
 const id={sha256:'exact-upload-test'};assert.deepEqual(Q.assess(layer(),{canvas:layer('#000'),background:'#fff'}, {createCanvas,ground:'#ffffff',sourceIdentity:id}).evidence.sourceIdentity,id);
});
test('white-carrier and native layers do not invent direct crop correspondence',()=>{
 const image=layer('#111'),result={canvas:image,whiteCarrier:true,background:'#ffffff',processing:{sourceCoordinates:'browser-decoded',box:[0,0,200,100]}};const verdict=Q.assess(image,result,{createCanvas});assert(verdict.accepted,JSON.stringify(verdict));assert.equal(verdict.evidence.sourceComparison,undefined);
});
test('complete colored carrier extraction remains eligible',async()=>{
 const image=createCanvas(600,900),x=image.getContext('2d');x.fillStyle='#eeeeee';x.fillRect(0,0,600,900);x.fillStyle='#77343d';x.fillRect(60,100,480,680);x.fillStyle='#eeeeee';x.fillRect(130,200,35,130);x.fillRect(130,200,130,12);x.fillRect(370,480,22,110);x.fillStyle='#464646';x.fillRect(240,650,100,2);const result=await S.prepareColoredApprox(image,createCanvas);assert(result);const verdict=Q.assess(image,result,{createCanvas});assert(verdict.accepted,JSON.stringify(verdict));
});
test('mandatory hash-verified Giritli original rejects partial extraction',async()=>{
 const fixture=require('./private-photo-fixtures.cjs').fixture('giritli');const image=await loadImage(fixture.bytes),result=await S.prepare(image,{createCanvas}),before=Buffer.from(result.canvas.getContext('2d').getImageData(0,0,result.canvas.width,result.canvas.height).data),verdict=Q.assess(image,result,{createCanvas,sourceIdentity:{sha256:fixture.sha256,libraryFileId:fixture.libraryFileId}});assert.equal(verdict.accepted,false);assert.equal(verdict.reason,'source-light-content-lost');assert(verdict.evidence.lightRetention<.45);assert.deepEqual(Buffer.from(result.canvas.getContext('2d').getImageData(0,0,result.canvas.width,result.canvas.height).data),before,'inspection cannot edit the candidate');console.log(JSON.stringify({method:result.processing.method,verdict}));
});
