/* eslint-disable @typescript-eslint/no-require-imports -- Legacy browser regression harness. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),source=fs.readFileSync('frontend/app.js','utf8'),ctx={ShippingLocation:require('../frontend/shipping-location.js')};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function leadError('),source.indexOf('function leadValues(')),ctx);const valid={customer:'Test Otel',contact:'Ayşe Yılmaz',phone:'+90 (532) 123 45 67',province:'Muğla',district:'Bodrum'},cases=[['Valid formatted Turkish contact',()=>assert.equal(ctx.leadError(valid),null)],['Whitespace company rejected',()=>assert.equal(ctx.leadError({...valid,customer:'   '})[0],'customerName')],['Whitespace contact rejected',()=>assert.equal(ctx.leadError({...valid,contact:'   '})[0],'contactName')],['Numeric-only contact rejected',()=>assert.equal(ctx.leadError({...valid,contact:'123'})[0],'contactName')],['Short phone rejected',()=>assert.equal(ctx.leadError({...valid,phone:'123'})[0],'contactPhone')],['Letters in phone rejected',()=>assert.equal(ctx.leadError({...valid,phone:'abc5321234567'})[0],'contactPhone')],['Repeated fake phone rejected',()=>assert.equal(ctx.leadError({...valid,phone:'0000000000'})[0],'contactPhone')],['Missing province rejected',()=>assert.equal(ctx.leadError({...valid,province:''})[0],'province')],['Muğla missing district rejected',()=>assert.equal(ctx.leadError({...valid,district:''})[0],'district')],['Non-Muğla blank district accepted',()=>assert.equal(ctx.leadError({...valid,province:'Antalya',district:''}),null)],['Unknown province rejected',()=>assert.equal(ctx.leadError({...valid,province:'Diğer il',district:''})[0],'province')],['Quote navigation gate present',()=>assert.ok(source.includes('if(n===3&&!validateLead(true))return'))],['Quote rendering revalidates after async work',()=>assert.ok(source.includes("if((typeof printPolicyError==='function'&&printPolicyError())||!processingSession.isQuoteCurrent(quoteJob,makeQuoteSnapshot())||!validateLead(false)||designIssue())return"))],['Download revalidates',()=>assert.ok(source.split("\n").find(line=>line.startsWith("$('downloadQuote').onclick=")).includes("if(designIssue()){showDesignIssue();return;}if(!validateLead(true))return"))],['Quote cleared on contact edit',()=>assert.ok(source.includes("input.addEventListener('input',()=>{invalidateQuote();syncLeadGate(true);})"))],['Price breakdown hidden without required data',()=>assert.ok(source.includes("if(article.hidden!==!ok)article.hidden=!ok"))]];
const results=cases.map(([name,test])=>{try{test();return{name,status:'PASS'}}catch(e){return{name,status:'FAIL',error:e.message}}});fs.writeFileSync('tests/lead-gate-results.json',JSON.stringify(results,null,2));console.log(results);if(results.some(r=>r.status==='FAIL'))process.exit(1);

// Exercise notification mutations separately from validity: observer-driven repeat checks must be no-ops.
let text='',hidden=true,writes=0,currentError=['customerName','Müşteri / işletme adını yazın.'];
const notice={get textContent(){return text},set textContent(value){text=value;writes++},get hidden(){return hidden},set hidden(value){hidden=value;writes++}};
const field={focus(){},scrollIntoView(){}};
const gate={leadTouched:new Set(),leadSubmitted:false,step:2,$:id=>id==='leadError'?notice:field,leadValues:()=>({}),leadError:()=>currentError,status(){},go(){}};
vm.createContext(gate);vm.runInContext(source.slice(source.indexOf('function validateLead('),source.indexOf('function invalidateQuote(')),gate);
assert.equal(gate.validateLead(false),false);assert.equal(hidden,true);assert.equal(writes,0);
gate.leadTouched.add('customerName');gate.validateLead(false);assert.equal(hidden,false);assert.match(text,/işletme/);assert.equal(writes,2);
for(let i=0;i<100;i++)gate.validateLead(false);assert.equal(writes,2,'unchanged errors do not mutate observed DOM');
currentError=null;assert.equal(gate.validateLead(false),true);assert.equal(hidden,true);assert.equal(text,'');assert.equal(writes,4);
for(let i=0;i<100;i++)gate.validateLead(false);assert.equal(writes,4,'valid repeat checks do not mutate observed DOM');
currentError=['contactPhone','Geçerli bir telefon numarası yazın.'];gate.validateLead(true);assert.equal(hidden,false);assert.match(text,/telefon/);
assert(source.includes("err.hidden=true;err.setAttribute('role','alert')"));
assert.match(fs.readFileSync('frontend/style.css','utf8'),/#leadError:empty, #leadError\[hidden\]\s*\{\s*display:\s*none;/);
console.log('PASS validation notice: hidden on install/untouched/valid, touched/submitted errors visible, role alert retained, repeated checks cause zero mutations, empty/hidden CSS removes layout.');

// A lead edit invalidates once; invalid blur/calculation still invalidate.
let invalidations=0,articleWrites=0,articleHidden=true,validLead=false;
const article={get hidden(){return articleHidden;},set hidden(v){articleHidden=v;articleWrites++;}};
const syncContext={$:id=>id==='breakdown'?{closest:()=>article}:{},validateLead:()=>validLead,invalidateQuote:()=>invalidations++};
vm.createContext(syncContext);vm.runInContext(source.slice(source.indexOf('function syncLeadGate('),source.indexOf('(function installLeadGate()')),syncContext);
syncContext.syncLeadGate(true);assert.equal(invalidations,0);assert.equal(articleWrites,0);
syncContext.syncLeadGate();assert.equal(invalidations,1,'invalid blur still invalidates');
validLead=true;syncContext.syncLeadGate(true);assert.equal(articleWrites,1);assert.equal(articleHidden,false);
for(let i=0;i<100;i++)syncContext.syncLeadGate(true);assert.equal(articleWrites,1,'unchanged lead gate never rewrites hidden');
console.log('PASS lead gate input avoids duplicate invalidation; blur preserves invalidation; hidden writes are transition-only.');

// Delivery stays required, but is never duplicated in the contact-panel banner.
for (const [id,message] of [['province','Lütfen teslimat ilinizi seçin.'],['district','Lütfen Muğla için teslimat ilçenizi seçin.']]) {
  currentError=[id,message];gate.leadSubmitted=false;gate.leadTouched.clear();
  assert.equal(gate.validateLead(false),false);assert.equal(hidden,true);assert.equal(text,'');
  gate.leadTouched.add(id);assert.equal(gate.validateLead(false),false);assert.equal(hidden,true);
  let focused=false;field.focus=()=>{focused=true;};
  assert.equal(gate.validateLead(true),false);assert.equal(focused,true,'submission still focuses delivery field');
  assert.equal(hidden,true);assert.equal(text,'','delivery never enters contact banner, even after submit');
  const mutations=writes;for(let i=0;i<30;i++)gate.validateLead(false);assert.equal(writes,mutations);
}
currentError=['contactPhone','Geçerli bir telefon numarası yazın.'];gate.leadSubmitted=false;gate.leadTouched.clear();
assert.equal(gate.validateLead(false),false);assert.equal(hidden,true,'untouched phone stays quiet');
gate.leadTouched.add('contactPhone');gate.validateLead(false);assert.equal(hidden,false,'touched phone validation retained');
console.log('PASS delivery banner removed; untouched/touched/submitted province and Muğla district still block quote, focus field, no observer churn.');
