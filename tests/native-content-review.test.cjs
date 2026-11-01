/* eslint-disable @typescript-eslint/no-require-imports -- Browser lifecycle contract test. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../frontend/processing-lifecycle.js'),'utf8'),c={};vm.createContext(c);vm.runInContext(source.split('\n').find(l=>l.startsWith('function requiresNativeContentReview(')),c);
test('opaque whole-raster source needs ordinary visual review, not semantic autoapproval',()=>{for(const kind of ['white','color','ambiguous',undefined])assert(c.requiresNativeContentReview('native-logo',{mime:'image/jpeg'},{kind}));assert(!c.requiresNativeContentReview('native-logo',{mime:'image/svg+xml'},{kind:'white'}));assert(!c.requiresNativeContentReview('native-logo',{mime:'image/png'},{kind:'transparent'}));assert(!c.requiresNativeContentReview('screen-chrome-region',{mime:'image/jpeg'},{kind:'white'}));});
test('review travels with source record and restore never recovers approval',()=>{assert.match(source,/pending.contentReviewRequired=true;state.nativeContentReviewRequired=true;state.extractionApprovalRequired=true/);assert.match(source,/state.nativeContentReviewRequired=!!record.contentReviewRequired;state.extractionApprovalRequired=!!state.extractionApproximate\|\|state.nativeContentReviewRequired/);const app=fs.readFileSync(require.resolve('../frontend/app.js'),'utf8');assert.match(app,/İstenmeyen kişi adı, telefon veya kart bilgisi varsa onaylamayın/);assert.match(app,/Bu görünümü onayla/);});

test('one visible visual approval advances directly through the source-bound handler',()=>{
 const app=fs.readFileSync(require.resolve('../frontend/app.js'),'utf8'),region=fs.readFileSync(require.resolve('../frontend/brand-region-ui.js'),'utf8');
 assert.match(app,/\$\('next'\)\.hidden=canReviewExtractedArtwork\(\)&&step===1/);
 assert.match(region,/approveInk.onclick=\(\)=>\{[^\n]+approveCurrentDesign\(\)[^\n]+state.extractionApprovalRequired=false;refresh\(\);go\(2\)/);
 const nodes={next:{}},calls=[],ctx={ $:id=>nodes[id],isDeclaredQuote:()=>false,isReferencePreview:()=>false,approveFrontAndContinue:()=>calls.push(2),canReviewExtractedArtwork:()=>true,approveInk:{onclick:()=>calls.push('approve-and-advance')},go:n=>calls.push(n)};vm.createContext(ctx);
 vm.runInContext(app.match(/\$\('next'\)\.onclick=[^;]+;/)[0],ctx);ctx.$('next').onclick();assert.deepEqual(calls,['approve-and-advance']);
 ctx.canReviewExtractedArtwork=()=>false;ctx.$('next').onclick();assert.deepEqual(calls,['approve-and-advance',2]);
});
