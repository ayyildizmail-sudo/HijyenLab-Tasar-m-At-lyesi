const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const source=fs.readFileSync('tests/reset-source-lifecycle.test.cjs','utf8'),scope={require,__dirname};
 vm.runInNewContext(source.slice(0,source.indexOf('async function test('))+';globalThis.h=setup();',scope);
 scope.h.c.logoImg={};scope.h.c.photoImg=null;return scope.h;
}
test('actual upload lifecycle starts supplementary search for small artwork and revokes its token on reset',async()=>{
 const h=harness(),calls=[];let cancellations=0;
 h.c.contentSafetyError=()=>null;
 h.c.HijyenLabSourceDiscoveryClient={cancel:()=>cancellations++,discover:input=>{calls.push(input);return Promise.resolve(null);}};
 await h.c.routeUploadedFile(h.file('small.png'));
 assert.equal(calls.length,1);assert.equal(calls[0].needed,true);assert.equal(calls[0].current(),true);
 assert.equal(h.c.state.logo,'small.png');assert.equal(h.c.state.extractionApprovalRequired,false);
 h.c.cancelCurrentProcessing('reset');assert.equal(calls[0].current(),false);assert(cancellations>=2);
});
test('content safety failures never start a source lookup',async()=>{
 const h=harness();h.c.contentSafetyError=()=>true;
 h.c.HijyenLabSourceDiscoveryClient={cancel(){},discover(){assert.fail('unsafe source must not be sent');}};
 await h.c.routeUploadedFile(h.file('unsafe.png'));
});
