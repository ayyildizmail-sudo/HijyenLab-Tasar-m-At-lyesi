'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
// Reuse the existing native-like mutation harness without changing its production assertions.
// Add the actual motion module plus reserved field adornments; this exercises real
// input handlers and the other presentation observers together, without a browser claim.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/lead-input-observers.test.cjs','utf8');
harness=harness.replace("['experience-ui','customer-focus','welcome-layout','persona-ux'", "['experience-ui','customer-focus','welcome-layout','persona-ux','journey-motion'");
harness=harness.replace("function settle(label)", "ctx.HijyenLabJourneyMotion=browser.HijyenLabJourneyMotion;for(const id of ['customerName','contactName','contactPhone']){const label=new Node('label');nodes[id].before(label);label.append(nodes[id]);browser.HijyenLabJourneyMotion.slot(nodes[id]);}\nfunction settle(label)");
harness=harness.replace("fn({isTrusted:true})", "fn({isTrusted:true,target:nodes.customerName})");
harness=harness.replace("vm.runInContext(handler,ctx);event('input');", "vm.runInContext(handler,ctx);ctx.input=nodes.customerName;vm.runInContext(app.match(/input.addEventListener\\('input',\\(\\)=>\\{(globalThis.HijyenLabJourneyMotion[^}]+)\\}/)[1],ctx);event('input');");
harness=harness.replace("four real mounts", "five real mounts including journey motion");
vm.runInNewContext(harness,{require,console},{filename:'journey-motion-observers-harness.cjs'});
