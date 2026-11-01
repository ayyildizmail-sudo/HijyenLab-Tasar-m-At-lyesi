/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness matches the browser dual-mode modules. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../frontend/reference-recovery.js'),ProductCatalog=require('../frontend/product-catalog.js'),PrintPolicy=require('../frontend/print-policy.js'),ShippingLocation=require('../frontend/shipping-location.js'),Fragrance=require('../frontend/fragrance.js');
const app=fs.readFileSync(require.resolve('../frontend/app.js'),'utf8');
const FX=require('../frontend/oshibori-fx.js'),now=new Date(),date=FX.today(now);FX.accept({currency:'USD',baseCurrency:'TRY',rateType:'ForexSelling',rate:42.1234,rateDate:date,requestedDate:date,fetchedAt:now.toISOString(),source:'TCMB',sourceUrl:'https://www.tcmb.gov.tr/kurlar/today.xml',isPreviousPublication:false});
const context={PrintPolicy,ShippingLocation,ProductCatalog};vm.createContext(context);
for(const name of ['pricing','leadError']){const line=app.split('\n').find(line=>line.startsWith('function '+name+'('));vm.runInContext(line,context);}
const deps={pricing:context.pricing,leadError:context.leadError,validFragrance:Fragrance.validId};
const input=(extra={})=>({quantity:5200,ground:'white',fragrance:'lemon',rules:ProductCatalog.rules('BM12'),policy:{blocked:false},lead:{customer:'Test işletme',contact:'Test Kişi',phone:'05321234567',province:'İstanbul',district:''},...extra});
test('only failed source with no prepared artwork is eligible',()=>{const s={sourcePhoto:'data:image/jpeg;base64,x',sourceKind:'unsupported',designBlocked:true};assert(R.eligible(s));for(const extra of [{designProcessing:true},{logo:'logo'},{photoLayout:'photo'},{designBlocked:false},{sourcePhoto:null},{sourceKind:'photo'}])assert(!R.eligible({...s,...extra}));});
test('product + shipping matches existing tariff while plate stays unknown and no exact/deposit total exists',()=>{const p=R.partialPrice(input(),deps);assert.equal(p.product,1508000);assert.equal(p.shipping,260000);assert.equal(p.subtotal,1768000);assert.equal(p.plate,null);assert.equal(p.plateCount,null);assert.equal(p.status,'partial-excludes-plate');for(const key of ['total','tax','deposit'])assert(!(key in p));});
test('Bodrum free delivery and colored minimum use existing rules',()=>{const p=R.partialPrice(input({quantity:10000,ground:'color',lead:{...input().lead,province:'Muğla',district:'Bodrum'}}),deps);assert.equal(p.shipping,0);assert.equal(p.product,3300000);assert.throws(()=>R.partialPrice(input({ground:'color'}),deps),/10.000/);});
test('all catalogue products retain their tariffs and carton rounding',()=>{for(const product of ProductCatalog.items){const rules=product.priceRules,q=rules.minimum.white,p=R.partialPrice(input({rules,quantity:q}),deps);assert.equal(p.product,Math.round(q*rules.whiteUnitKurus));assert.equal(p.boxes,Math.ceil(q/rules.unitsPerBox));assert.equal(p.shipping,p.boxes*rules.freightPerBoxKurus);}});
test('company contact phone delivery fragrance and explicit ground are mandatory',()=>{for(const key of ['customer','contact','phone','province'])assert.throws(()=>R.partialPrice(input({lead:{...input().lead,[key]:''}}),deps));assert.throws(()=>R.partialPrice(input({lead:{...input().lead,province:'Muğla',district:''}}),deps));assert.throws(()=>R.partialPrice(input({fragrance:''}),deps),/koku/);assert.throws(()=>R.partialPrice(input({ground:''}),deps),/zemin/);});
test('known four inks and uncertain-contact policy cannot be bypassed',()=>{for(const estimate of [{count:4},{count:7},{count:null,status:'unknown',hasArtwork:true}]){const policy=PrintPolicy.evaluate(estimate);assert(policy.blocked);assert.throws(()=>R.partialPrice(input({policy}),deps),/WhatsApp/);}});
test('regression wiring preserves normal guard and clears recovery before new async ingress',()=>{const lifecycle=fs.readFileSync(require.resolve('../frontend/processing-lifecycle.js'),'utf8');assert.match(lifecycle,/ReferenceRecovery\?\.clear\(\);[^\n]*if\(state.designBlocked\)\{state.sourcePhoto=null;state.sourceKind=null;\}/);assert.match(lifecycle,/function cancelCurrentProcessing[^\n]+ReferenceRecovery\?\.clear/);assert.match(app,/function designIssue\(allowPendingApproval=false\)[^\n]+state.designBlocked/);const draft=fs.readFileSync(require.resolve('../frontend/draft-ui.js'),'utf8');assert.match(draft,/state.designBlocked&&state.sourcePhoto/);});
test('reference UI uses ordinary choices, not a second duplicate form or blank mockup',()=>{
 const code=fs.readFileSync(require.resolve('../frontend/reference-recovery.js'),'utf8');
 assert.match(code,/Yalnız ön fiyatı gör/);assert.match(code,/referenceRecoveryActive \.workspace\{display:none/);
 for(const id of ['recoveryProduct','recoveryFragrance','recoveryGround','recoveryCustomer','recoveryCalculate'])assert(!code.includes(id));
 assert.match(code,/refresh\(\);return continuePrice\(\)/);assert.match(code,/state.photoQuoteBg='unknown'/);
});
test('new ingress clears old design error before asynchronous decode',()=>{
 const code=fs.readFileSync(require.resolve('../frontend/processing-lifecycle.js'),'utf8');const ingress=code.slice(code.indexOf('async function routeUploadedFile'),code.indexOf('const token=processingSession.begin'));
 assert.match(ingress,/\$\('designError'\)\.hidden=true;\$\('designError'\)\.textContent=''/);
});

test('reference summary never labels the unprocessed source as a prepared design',()=>{
 const code=fs.readFileSync(require.resolve('../frontend/reference-recovery.js'),'utf8'),title={textContent:''},designTitle={textContent:''};let reference=true;
 const c={state:{},eligible:R.eligible,document:{querySelector:selector=>{assert(['#summary>h1','#design>h1'].includes(selector));return selector==='#summary>h1'?title:designTitle;}},isReferencePreview:()=>reference};
 vm.createContext(c);vm.runInContext(code.slice(code.indexOf('function syncSummaryTitle(){'),code.indexOf('function sync(){')),c);
 c.syncSummaryTitle();assert.equal(title.textContent,'Referansa dayalı ön fiyat · Tasarım oluşturulmadı');
 assert.equal(designTitle.textContent,'Yüklediğiniz görsel');
 reference=false;c.syncSummaryTitle();assert.equal(title.textContent,'Tasarım ve teklif önizlemesi');assert.equal(designTitle.textContent,'Size özel ambalaj');
 c.state={sourcePhoto:'original',sourceKind:'unsupported',designBlocked:true};c.syncSummaryTitle();assert.equal(designTitle.textContent,'Yüklediğiniz görsel');
 c.state={logo:'recovered',designBlocked:false};c.syncSummaryTitle();assert.equal(designTitle.textContent,'Size özel ambalaj');
});
