/* CommonJS VM harness: Node require is intentional. */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),install=require('./helpers/content-safety-vm.cjs');
test('real VM loader rejects abusive state/contact and preserves benign tests, not a constant-pass stub',()=>{
 const fields={customerName:{value:'Müller'}},context={state:{text:'Şifa'},$:id=>fields[id]};install(context);
 assert.equal(context.contentSafetyError(),'');context.state.text='fuck you';assert.ok(context.contentSafetyError());context.showContentSafetyBlock();assert.ok(context.lastContentSafetyNotice);
 context.state.text='Şifa';fields.customerName.value='fick dich';assert.ok(context.contentSafetyError());
 vm.runInContext("const rearContent={extra:'hijo de puta'}",context);assert.ok(context.contentSafetyError('rear'));
});
