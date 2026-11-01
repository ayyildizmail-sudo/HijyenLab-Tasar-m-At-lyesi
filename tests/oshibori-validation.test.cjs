/* eslint-disable @typescript-eslint/no-require-imports -- Browser/CommonJS module or Node regression harness. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Draft=require('../frontend/draft-store.js'),Visitor=require('../frontend/visitor-requests.js');
const scents=['green_tea','flambau','bodrum_mandarin','lemon'];
function lead(extra={}){return {requestId:'11111111-1111-4111-8111-111111111111',kind:'complete',printMode:'printed',consent:{accepted:true,version:'lead-v1'},productId:'OSHIBORI',quantity:3000,fragrance:'green_tea',contact:{companyName:'Fixture',contactName:'Fixture person',phone:'05550000000',email:'',province:'İstanbul',district:''},design:{background:'#ffffff',frontInkColors:['#000000'],frontText:'',frontFont:'sans-serif',rearText:'',rearInkColor:'',qrEnabled:false,qrUrl:''},...extra};}
test('server accepts Oshibori minima and every scent without changing fixed-scent legacy products',async()=>{
 const {validateLead}=await import('../server/lead-service.mjs');
 for(const fragrance of scents){
  for(const ground of ['#ffffff','#ff0000'])assert(validateLead(lead({fragrance,design:{...lead().design,background:ground}})));
  for(const quantity of [250,500,3000]){const p=lead({printMode:'unprinted',quantity,fragrance,design:null});assert(validateLead(p));assert.equal(Visitor.requestError(p),'');}
 }
 for(const quantity of [1,249,251,299])assert(!validateLead(lead({printMode:'unprinted',quantity,design:null})));
 assert(!validateLead(lead({quantity:2999})));assert(Visitor.requestError(lead({quantity:2999})));
 assert(!validateLead(lead({fragrance:'unknown'})));
 assert(!validateLead(lead({productId:'BM12',printMode:'unprinted',quantity:400,design:null,fragrance:'green_tea'})));
 assert(!validateLead(lead({productId:'BM21',printMode:'unprinted',quantity:1000,design:null,fragrance:'lemon'})));
});
test('Oshibori local drafts retain all scents and no price or exchange-rate data',()=>{
 for(const fragrance of scents){const input={schemaVersion:2,printMode:'unprinted',productId:'OSHIBORI',design:{requestedQuantity:250},rear:null,fragrance,frontFile:null,rearFile:null,frontName:'',rearName:''};
  assert.equal(Draft.validate(input).fragrance,fragrance);
  assert.throws(()=>Draft.validate({...input,fxSnapshot:{rate:1}}));
  assert.throws(()=>Draft.validate({...input,design:{requestedQuantity:251}}));
 }
});
test('quote tokens bind canonical FX-bearing rules and fail closed without fresh validation',()=>{
 let fresh=true;
 const rules={product:'OSHIBORI',revision:'fixture-rate-date',currency:'TRY',fxSnapshot:{source:'TCMB',rateDate:'2026-11-01',rate:40}};
 const context={ProductCatalog:{validRules:r=>fresh&&JSON.stringify(r)===JSON.stringify(rules)},DeclaredQuote:{snapshotValid:()=>false}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('frontend/processing-session.js','utf8'),context);
 const session=context.ProcessingSession.create();
 const snapshot={product:'OSHIBORI',printMode:'unprinted',quantity:'250',design:null,rear:null,inkCount:'0',cliche:'none',fragrance:{id:'lemon',productFamily:'oshibori'},rules,ruleVersion:rules.revision,price:{rules,ruleRevision:rules.revision}};
 const token=session.quoteToken(snapshot);assert(token);assert(session.isQuoteCurrent(token,snapshot));
 const different=structuredClone(snapshot);different.rules.fxSnapshot.rate=41;assert(!session.isQuoteCurrent(token,different));assert.equal(session.quoteToken(different),null);
 assert.equal(session.quoteToken({...snapshot,rules:undefined}),null);
 assert.equal(session.quoteToken({...snapshot,price:{...snapshot.price,rules:{currency:'USD'}}}),null);
 assert.equal(session.quoteToken({...snapshot,fragrance:{id:'unknown'}}),null);
 fresh=false;assert(!session.isQuoteCurrent(token,snapshot));assert.equal(session.quoteToken(snapshot),null);
});

test('declared Oshibori quotes validate exact canonical FX rules and reject source/price tampering',()=>{
 const C=require('../frontend/product-catalog.js'),FX=require('../frontend/oshibori-fx.js'),D=require('../frontend/declared-quote.js'),S=require('../frontend/processing-session.js');
 const day=FX.today(),rate={currency:'USD',baseCurrency:'TRY',rateType:'ForexSelling',rate:40.1234,rateDate:day,requestedDate:day,fetchedAt:new Date().toISOString(),source:'TCMB',sourceUrl:'https://www.tcmb.gov.tr/kurlar/today.xml',isPreviousPublication:false};
 const rules=C.rules('OSHIBORI',rate);assert(C.validRules(rules));
 for(const ground of ['white','colored'])for(const fragrance of scents){
  const q=3000,base=Math.round(q*rules.whiteUnitKurus),plate=100000,shipping=12*20000;
  const price={base,color:0,plate,shipping,boxes:12,subtotal:base+plate+shipping,plateUnknown:false,rules,ruleRevision:rules.revision};
  const s={quoteSource:'customer-declared',printMode:'printed',product:'OSHIBORI',declaration:D.create(ground,1),design:null,rear:null,designApproval:false,ruleVersion:rules.revision,quantity:String(q),inkCount:'1',cliche:'new',rules,price,lead:{customer:'Fixture',contact:'Fixture',phone:'05550000000',province:'İstanbul',district:''},fragrance:{id:fragrance,productFamily:'oshibori'}};
  assert(D.snapshotValid(s));assert(S.create().quoteToken(s));
  const wrong=structuredClone(s);wrong.rules.fxSnapshot.source='unverified';assert(!D.snapshotValid(wrong));
  assert(!D.snapshotValid({...s,fragrance:{id:fragrance,productFamily:'towels'}}));
  assert(!D.snapshotValid({...s,price:{...price,base:base+1}}));
 }
});
