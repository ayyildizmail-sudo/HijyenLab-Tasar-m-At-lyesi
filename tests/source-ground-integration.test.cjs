'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../frontend/source-ground-scope.js'),app=fs.readFileSync('frontend/app.js','utf8');
const helpers=app.slice(app.indexOf('function applySourceGroundScope('),app.indexOf('function prepareLogo('));
const sha='a'.repeat(64),elements=new Map();
const c={SourceGroundScope:S,state:{logo:'native',bg:'#111111',bgSource:'auto',bgDetection:{kind:'color',color:'#111111',maskAllowed:true},removeWhite:true},processingSession:{getState:()=>({source:{sha256:sha}})},isDeclaredQuote:()=>false,isUnprinted:()=>false};
vm.createContext(c);vm.runInContext(helpers,c);
c.applySourceGroundScope();assert.equal(c.state.bg,'#ffffff');assert.equal(c.state.removeWhite,false);assert.equal(c.state.bgDetection.maskAllowed,false);assert.equal(c.state.groundScope.sourceIdentity,sha);
// Actual prepareLogo bypass protects inverse white letters and local black panel;
// no canvas, pixel redraw or global color deletion may be invoked.
c.logoImg={sourcePixels:'untouched'};vm.runInContext(app.split('\n').find(l=>l.startsWith('function prepareLogo()')),c);assert.equal(c.prepareLogo(),c.logoImg);
// Explicit customer color remains authoritative through a new upload and product refresh.
c.state.bg='#800d2e';c.state.bgSource='manual';c.state.bgDetection={kind:'color',color:'#000000'};c.applySourceGroundScope();assert.equal(c.state.bg,'#800d2e');c.reconcileSourceGroundScope();assert.equal(c.state.bg,'#800d2e');
// Source changes bind new metadata, never reuse old product proof.
c.processingSession.getState=()=>({source:{sha256:'b'.repeat(64)}});c.reconcileSourceGroundScope();assert.equal(c.state.groundScope.sourceIdentity,'b'.repeat(64));assert.equal(c.state.bg,'#800d2e');
// Undo restores old nonmanual state but guard does not recertify the old colored canvas.
c.state={logo:'old',bg:'#222222',bgSource:'auto',bgDetection:{kind:'color',color:'#222222'},groundScope:null};c.reconcileSourceGroundScope();assert.equal(c.state.bg,'#ffffff');
// Legacy draft stays recoverable, no unsupported manual intent inferred.
c.state={logo:'restored',bg:'#765432',bgSource:'auto',bgDetection:{kind:'color',color:'#765432'}};c.restoreSourceGroundIntent({bg:'#765432',bgPantone:'original note'});assert.equal(c.state.bg,'#ffffff');assert.equal(c.state.restoredGroundCandidate.color,'#765432');assert.equal(c.state.restoredGroundCandidate.pantone,'original note');
c.restoreSourceGroundIntent({bg:'#800d2e',bgPantone:'',backgroundIntent:{kind:'manual',color:'#800d2e'}});assert.equal(c.state.bg,'#800d2e');assert.equal(c.state.bgSource,'manual');assert.equal(c.state.restoredGroundCandidate,null);
// Interrupted/loading state is not rewritten or certified mid-flight.
c.state.designProcessing=true;c.state.groundScope=null;c.reconcileSourceGroundScope();assert.equal(c.state.groundScope,null);
assert(!app.includes('state.bg=extracted.background'),'Unreviewed photo/table sample cannot become whole package ground');
assert(app.includes("applySourceGroundScope('isolated-brand')"));
assert(app.includes("applySourceGroundScope('native-artwork')"));
assert(app.includes('state={...initial}'),'Reset discards source metadata');
const ui=fs.readFileSync('frontend/brand-region-ui.js','utf8');assert(ui.includes("applySourceGroundScope('selected-brand-region')"));assert(ui.includes('drawImage(rectified,0,0)'),'Selected local panel uses original ROI pixels, not sampled-color synthesis');assert(ui.includes('if(!result.ok)throw Error(result.reason)'),'Uniform-edge/foreground-retention validation remains before selected-region import');assert(!ui.includes('state.bg=BackgroundAnalysis.hex(suggested.rgb)'));
assert(!ui.includes('fillRect('),'Do not manufacture a local colored backing from table/fabric samples');
const draft=fs.readFileSync('frontend/draft-ui.js','utf8');assert(draft.includes('restoreSourceGroundIntent(payload.design)'));assert(draft.includes("state.restoredGroundCandidate?.color||state.bg"),'Legacy ground proposal survives a later draft save');
const html=fs.readFileSync('frontend/index.html','utf8');assert(html.indexOf('source-ground-scope.js')<html.indexOf('src="app.js'));
console.log('PASS source-ground integration: actual upload/prepareLogo helpers, manual choice, sourcechange, undo/product refresh, legacy draft recovery, photo/table and selected-panel route guards');
