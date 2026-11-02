/* CommonJS test harness. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),Fragrance=require('../frontend/fragrance');
(async()=>{
const nodes={},storage=new Map(),calls=[],make=()=>({hidden:false,disabled:false,children:[],append(...items){this.children=this.children.filter(x=>!items.includes(x));this.children.push(...items)},before(){},focus(){},querySelector(){return make()}}),$=id=>nodes[id]||(nodes[id]=make());let invalidations=0,lastGo=null;
const payload={productFamily:'towels',source:'shared',seedVersion:'500-v1',accepted:true,percentages:{flambau:63,green_tea:19,bodrum_mandarin:11,lemon:7}};
const response=(revision,extra={})=>({ok:true,json:async()=>({...payload,revision,...extra})});
const ctx={Fragrance,$,state:{},step:4,latest:{value:100},document:{createElement:()=>make()},invalidateQuote(){invalidations++},designIssue:()=>false,showDesignIssue(){},rearQuoteReady:()=>true,hideRearPreview(){},showRearPreview(){},window:{scrollTo(){}},setTimeout:()=>1,clearTimeout(){},AbortController,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},go:n=>{lastGo=n;ctx.hideFragrance()},fetch:async(url,options)=>{calls.push({url,options});return response(options.body?JSON.parse(options.body).revision:undefined)}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('frontend/fragrance-ui.js','utf8'),ctx);
const select=id=>vm.runInContext(`(()=>{const r=fragranceButtons.get('${id}').radio;r.checked=true;r.onchange();})()`,ctx);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
assert.equal(ctx.fragranceReady(),false);assert.equal(ctx.fragranceSnapshot(),null);assert.equal($('fragranceContinue').disabled,true);assert.equal($('fragranceCards').children.length,5);
ctx.showFragrance();await tick();assert(calls[0].url.endsWith('?productFamily=towels'));
select('green_tea');assert(invalidations>0);assert.equal(ctx.latest,null);await $('fragranceContinue').onclick();assert.equal(lastGo,2);assert.equal(ctx.fragranceReady(),true);assert.equal(ctx.fragranceSnapshot().label,'Yeşil çay');assert.equal(ctx.fragranceSnapshot().productFamily,'towels');
const post=calls.find(c=>c.options.method==='POST'),body=JSON.parse(post.options.body);assert.deepEqual(Object.keys(body).sort(),['anonymousId','fragrance','productFamily','revision']);
select('lemon');await $('fragranceContinue').onclick();const latest=JSON.parse(calls.at(-1).options.body);assert.equal(latest.anonymousId,body.anonymousId);assert.equal(latest.revision,body.revision+1);await $('fragranceContinue').onclick();assert.equal(JSON.parse(calls.at(-1).options.body).revision,latest.revision);
// A pending POST never holds the quote hostage. Duplicate click sends once.
const pending=[];ctx.fetch=(url,options)=>new Promise((resolve,reject)=>pending.push({url,options,resolve,reject}));
select('flambau');lastGo=null;const first=$('fragranceContinue').onclick();assert.equal(lastGo,2);assert(ctx.fragranceReady());assert($('fragranceSyncStatus').textContent.includes('sürüyor'));await $('fragranceContinue').onclick();assert.equal(pending.length,1);
// Reopen/change while A is pending, save B first, then receive A failure.
select('green_tea');const second=$('fragranceContinue').onclick();assert.equal(pending.length,2);const secondBody=JSON.parse(pending[1].options.body);pending[1].resolve(response(secondBody.revision));await second;assert($('fragranceSyncStatus').textContent.includes('kaydedildi.'));pending[0].reject(Error('old network failure'));await first;assert.equal(ctx.fragranceSnapshot().id,'green_tea');assert($('fragranceSyncStatus').textContent.includes('kaydedildi.'));
// Late success also cannot replace a newer choice/failure status.
select('lemon');const third=$('fragranceContinue').onclick();select('flambau');const fourth=$('fragranceContinue').onclick();pending[3].reject(Error('offline'));await fourth;pending[2].resolve(response(JSON.parse(pending[2].options.body).revision));await third;assert.equal(ctx.fragranceSnapshot().id,'flambau');assert(ctx.fragranceReady());assert($('fragranceSyncStatus').textContent.includes('kaydedildiği doğrulanamadı'));
// Reset invalidates pending ACK; the async callback never navigates again.
select('lemon');const fifth=$('fragranceContinue').onclick();assert.equal(lastGo,2);ctx.resetFragrance();lastGo=null;pending[4].resolve(response(JSON.parse(pending[4].options.body).revision));await fifth;assert.equal(ctx.fragranceReady(),false);assert.equal(ctx.fragranceSnapshot(),null);assert.equal(lastGo,null);
// GET begun before confirmation cannot replace save result or pending text.
ctx.showFragrance();const read=pending[5];select('green_tea');const sixth=$('fragranceContinue').onclick();read.reject(Error('old GET failure'));await tick();assert($('fragranceSyncStatus').textContent.includes('sürüyor'));pending[6].resolve(response(JSON.parse(pending[6].options.body).revision));await sixth;assert($('fragranceSyncStatus').textContent.includes('kaydedildi.'));
// Navigation only hides UI: local confirmation survives and late ACK never forces navigation.
select('lemon');const seventh=$('fragranceContinue').onclick();ctx.hideFragrance();lastGo=1;pending[7].resolve(response(JSON.parse(pending[7].options.body).revision));await seventh;assert.equal(lastGo,1);assert(ctx.fragranceReady());
// Mismatched accepted revision cannot be claimed as saved.
ctx.fetch=async()=>response(999999);select('flambau');await $('fragranceContinue').onclick();assert(ctx.fragranceReady());assert($('fragranceSyncStatus').textContent.includes('kaydedildiği doğrulanamadı'));
// Storage failure cannot block immediate local quote confirmation either.
ctx.localStorage.setItem=()=>{throw Error('storage blocked')};select('green_tea');lastGo=null;await $('fragranceContinue').onclick();assert.equal(lastGo,2);assert(ctx.fragranceReady());assert($('fragranceSyncStatus').textContent.includes('kaydedildiği doğrulanamadı'));
// Recommendation order is stable, independent of backend preference statistics.
ctx.fetch=async()=>response(1);ctx.hideFragrance();vm.runInContext('fragranceStats.percentages={flambau:10,green_tea:20,bodrum_mandarin:30,lemon:40};',ctx);ctx.showFragrance();
const order=()=>vm.runInContext("$('fragranceCards').children.map(n=>[...fragranceButtons].find(([,v])=>v.label===n)[0]).join(',')",ctx);
assert.equal(order(),'flambau,green_tea,bodrum_mandarin,lemon,other');
vm.runInContext('fragranceStats.percentages={flambau:80,green_tea:10,bodrum_mandarin:6,lemon:4};syncFragrance();',ctx);assert.equal(order(),'flambau,green_tea,bodrum_mandarin,lemon,other');
ctx.hideFragrance();ctx.showFragrance();assert.equal(order(),'flambau,green_tea,bodrum_mandarin,lemon,other');await tick();
const ui=fs.readFileSync('frontend/fragrance-ui.js','utf8'),css=fs.readFileSync('frontend/style.css','utf8');assert(ui.includes("fragrancePrice.className='fragrancePriceSummary'"));assert(!ui.includes("fragrancePrice.className='notice"));assert(css.includes('.fragrancePriceSummary{display:block;'));assert.equal($('fragrancePriceValue').textContent.includes('Koku:'),true);
assert(!ui.includes('fragrancePreferenceDetails'),'no long statistical explanation');
assert(!/başlangıç|yüzde|%|fragrancePercent|fragranceStatsNote/i.test(ui),'no seeded percentages or distribution explanation in presentation');
assert(ui.includes('aria-describedby="fragrancePrivacyNote"'));
for(const fact of ['anonim tarayıcı kimliğiyle kaydedilir','İsim, telefon ve görsel gönderilmez'])assert(ui.includes(fact),fact);
const cards=$('fragranceCards').children;
assert.equal(cards.filter(card=>card.className.includes('fragranceRecommended')).length,1);
assert.equal(cards[0].children[0].value,'flambau');
assert.equal(cards[0].children[1].children[1].textContent,'HijyenLab önerisi');
for(const id of ['flambau','green_tea','bodrum_mandarin','lemon']){select(id);assert.equal(ctx.fragranceSnapshot().id,id);assert.equal(ctx.fragranceReady(),false);assert.equal($('fragranceContinue').disabled,false);assert(vm.runInContext('[...fragranceButtons.values()].every(v=>!v.radio.disabled)',ctx));}
// Failed legacy stats reads do not add distribution/error clutter or affect selection.
ctx.fetch=async()=>{throw Error('offline')};ctx.resetFragrance();ctx.showFragrance();await tick();assert.equal($('fragranceSyncStatus').hidden,true);assert.equal(order(),'flambau,green_tea,bodrum_mandarin,lemon,other');

const app=fs.readFileSync('frontend/app.js','utf8'),life=fs.readFileSync('frontend/processing-lifecycle.js','utf8');assert(app.includes("(n===2||n===3)&&typeof fragranceReady==='function'&&!fragranceReady()"));assert(app.slice(app.indexOf("async function renderQuote(){"),app.indexOf("function preparePhotoCutout")).includes("if(designIssue()){showDesignIssue();return;}if(typeof fragranceReady==='function'&&!fragranceReady()"));assert(app.includes("quoteSnapshot.fragrance.label"));assert(life.includes("fragrance:typeof fragranceSnapshot==='function'?fragranceSnapshot():null"));assert(app.split("\n").find(line=>line.startsWith("$('downloadQuote').onclick=")).includes("if(designIssue()){showDesignIssue();return;}if(!validateLead(true))return;if(typeof fragranceReady==='function'&&!fragranceReady()"));
const privacyHtml=fs.readFileSync('frontend/index.html','utf8');
// V81 removes the redundant result-screen notice, not the disclosures at each control.
const summary=privacyHtml.slice(privacyHtml.indexOf('<section id="summary"'),privacyHtml.indexOf('<p id="status"'));
assert(summary.includes('Gönderim yapılmadı.'));
assert(!summary.includes('Anonim koku tercihi'));
assert(ui.includes('Onaylanan koku tercihi anonim tarayıcı kimliğiyle kaydedilir. İsim, telefon ve görsel gönderilmez.'));
const request=fs.readFileSync('frontend/visitor-requests.js','utf8');
assert(request.includes('id="requestConsent" type="checkbox">'));
assert(request.includes('Yukarıdaki bilgilerle talebimin kaydedilmesine ve talebim için benimle iletişime geçilmesine izin veriyorum.'));
assert(request.includes("if(busy||submitted||!$('requestConsent').checked)return"));
// Wet-wipe choices must remain separate from towel percentages and network votes.
ctx.selectedProductId='BM21';ctx.resetFragrance();let wetCalls=0;ctx.fetch=async()=>{wetCalls++;throw Error('must not call towel statistics')};ctx.showFragrance();await tick();assert.equal(wetCalls,0);assert($('fragrancePrivacyNote').hidden);
select('lemon');await $('fragranceContinue').onclick();assert.equal(wetCalls,0);assert(ctx.fragranceReady());assert.equal(ctx.fragranceSnapshot().productFamily,'wet_wipes');assert.equal(ctx.fragranceSnapshot().id,'lemon');assert.throws(()=>ctx.fragranceSubmission('lemon'),/havlu istatistiğine/);
ctx.isUnprinted=()=>true;ctx.syncFragrance();assert.equal(ctx.fragranceSnapshot().id,'green_tea');assert.equal(ctx.fragranceSnapshot().fixed,true);assert(ctx.fragranceReady());ctx.selectedProductId='BM12';ctx.resetFragrance();assert.equal(ctx.fragranceSnapshot().id,'flambau');ctx.isUnprinted=()=>false;ctx.syncFragrance();assert(!$('fragrancePrivacyNote').hidden);
console.log('PASS fragrance UI: recommended Flambau first, all four selectable, no percentages or seed notes, immediate local confirmation, pending duplicate guard, revision ACK validation, GET/POST ordering, change/reset/navigation races, honest offline/storage failures');
})().catch(e=>{console.error(e);process.exitCode=1});
