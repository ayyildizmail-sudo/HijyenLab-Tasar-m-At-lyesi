/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ProcessingSession=require('../frontend/processing-session.js');
const read=name=>fs.readFileSync('frontend/'+name+'.js','utf8');
function setup(method='native-logo'){
 const session=ProcessingSession.create(),token=session.begin({sha256:'a'.repeat(64)});session.decoded(token,{width:100,height:80,coordinateFrame:'browser-decoded'});
 const record=session.commit(token,{method,methodVersion:'test',box:[0,0,100,80],sourceCoordinates:'browser-decoded',candidates:[],preservedRegions:[{box:[0,0,100,80],reason:'original pixels'}],excludedRegions:[],maskBasis:'source',transformOrder:['decode'],limitations:[]});
 const c={state:{logo:method==='source-reference'?null:'pixels',processingResult:record},logoImg:{},photoImg:{},processingSession:session,designFingerprint:()=>c.fingerprint,fingerprint:'current',isReferencePreview:()=>method==='source-reference',isDeclaredQuote:()=>false,isUnprinted:()=>false,placementIssue:()=>false,designIssue:()=>false,showDesignIssue(){c.issues++;},issues:0,syncProcessingDesign(){session.touchDesign(c.fingerprint);},finalizeProcessingResult(){},status(){},go(n){c.destination=n;},approvedDesignFingerprint:null};vm.createContext(c);
 for(const name of ['appliedFrontCurrent','appliedFrontApproved','approveCurrentDesign','approveNativeDesignIfEligible'])vm.runInContext(read('processing-lifecycle').split('\n').find(l=>l.startsWith('function '+name+'(')),c);
 vm.runInContext(read('app').split('\n').find(l=>l.startsWith('function approveFrontAndContinue(')),c);session.touchDesign(c.fingerprint);return c;
}
test('actual normal front handler requires applied pixels and explicit click before rear route',()=>{
 const c=setup();assert(!c.appliedFrontApproved());c.approveNativeDesignIfEligible();assert(!c.appliedFrontApproved(),'navigation/refresh cannot manufacture visual approval');assert(c.approveFrontAndContinue());assert(c.appliedFrontApproved());assert.equal(c.destination,2);c.fingerprint='changed-layout';assert(!c.appliedFrontApproved());
});
test('missing rendered pixels, wrong source/revision/op and source-reference cannot approve front',()=>{
 for(const mutate of [c=>c.logoImg=null,c=>c.state.processingResult.source.sha256='b'.repeat(64),c=>c.state.processingResult.extractionRevision++,c=>c.state.processingResult.operation.operationId++,c=>c.state.designProcessing=true,c=>c.state.designBlocked=true]){const c=setup();mutate(c);assert(!c.approveFrontAndContinue());assert.equal(c.destination,undefined);}
 const ref=setup('source-reference');assert(!ref.approveFrontAndContinue());assert(!ref.processingSession.approve('current'));assert(!ref.appliedFrontApproved());
});
test('reference-only price token never approves design and binds source, operation and revision',()=>{
 const c=setup('source-reference'),s=c.processingSession,live=s.getState();const snapshot={quoteSource:'source-reference',designApproval:false,design:'current',reference:{artworkApplied:false,sourceSHA256:live.source.sha256,operationId:live.operationId,extractionRevision:live.result.extractionRevision},rear:null};
 assert(!s.isApproved('current'));const token=s.quoteToken(snapshot);assert(token);assert(s.isQuoteCurrent(token,snapshot));assert(!s.isApproved('current'));
 for(const changed of [{...snapshot,designApproval:true},{...snapshot,reference:{...snapshot.reference,sourceSHA256:'b'.repeat(64)}},{...snapshot,reference:{...snapshot.reference,extractionRevision:99}},{...snapshot,reference:{...snapshot.reference,operationId:99}},{...snapshot,design:'stale'}]){assert.equal(s.quoteToken(changed),null);assert(!s.isQuoteCurrent(token,changed));}
 s.touchDesign('changed');assert(!s.isQuoteCurrent(token,snapshot));
});
