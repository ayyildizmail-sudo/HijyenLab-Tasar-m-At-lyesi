'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../frontend/source-ground-scope.js'),C=require('../frontend/combined-inks.js');
const sha='a'.repeat(64),base={artifactKind:'native-artwork',detection:{kind:'color',color:'#123456',confidence:1,connected:1}};
for(const shape of ['circle','square','rectangle',null]){const r=S.resolve({...base,shape});assert.equal(r.packageColor,'#ffffff');assert.equal(r.scope,'logo-local');assert(r.preserveLocalPanel);assert.equal(r.allowColorRemoval,false);assert(r.mayPlaceArtwork);}
for(const artifactKind of ['scene','unknown',undefined]){const r=S.resolve({...base,artifactKind});assert.equal(r.packageColor,'#ffffff');assert.equal(r.mayPlaceArtwork,false);}
const manual={explicit:true,scope:'package',color:'#800D2E'};
assert.equal(S.resolve({...base,customerChoice:manual}).packageColor,'#800d2e');
assert.equal(S.resolve({...base,artifactKind:'scene',customerChoice:manual}).mayPlaceArtwork,false,'Manual color never authorizes whole photo placement');
for(const choice of [{...manual,explicit:false},{...manual,scope:'logo-local'},{...manual,color:'invalid'}])assert.equal(S.resolve({...base,customerChoice:choice}).packageColor,'#ffffff');
const product={sourceIdentity:sha,reviewed:true,scope:'package',basis:'product-region',color:'#ff0000'};
assert.equal(S.resolve({...base,sourceIdentity:sha,packageEvidence:product}).packageColor,'#ff0000');
for(const e of [{...product,sourceIdentity:'b'.repeat(64)},{...product,reviewed:false},{...product,basis:'edge-color'},{...product,scope:'logo-local'}])assert.equal(S.resolve({...base,sourceIdentity:sha,packageEvidence:e}).packageColor,'#ffffff');
assert.equal(S.resolve({...base,packageEvidence:product}).packageColor,'#ffffff','Missing current source identity cannot trust stale product evidence');
assert.equal(S.resolve({...base,sourceIdentity:sha,packageEvidence:product,customerChoice:manual}).packageColor,'#800d2e','Explicit choice wins');
for(const kind of ['white','transparent'])assert.equal(S.resolve({...base,detection:{kind,color:'#ffffff'}}).packageColor,'#ffffff');
assert.equal(S.resolve({...base,detection:{kind:'white',maskAllowed:false}}).allowWhiteExteriorRemoval,false);
assert.equal(S.resolve({...base,artifactKind:'selected-brand-region'}).packageColor,'#ffffff');
assert.equal(S.resolve({...base,artifactKind:'isolated-brand'}).preserveArtwork,true);
const snapshot=JSON.stringify(base);S.resolve(base);assert.equal(JSON.stringify(base),snapshot);
const inks=['#000000','#ff0000','#ffff00'];const counted=C.estimate({background:'#ffffff',front:{status:'estimated',colors:[...inks,'#ffffff']}});assert.equal(counted.count,3);assert.deepEqual(counted.actualInkColors,inks,'Original3 roles survive; white OPP does not force reduction');
const browser={};vm.createContext(browser);vm.runInContext(fs.readFileSync('frontend/source-ground-scope.js','utf8'),browser);assert.equal(browser.SourceGroundScope.resolve(base).packageColor,'#ffffff');
console.log('PASS source ground scope: local panels/scene vs source-bound product; explicit choice; no alpha deletion;3 original inks + white OPP zero');
