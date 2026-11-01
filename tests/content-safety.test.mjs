import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {guardTransmission,contentRevision,POLICY_VERSION} from '../lib/content-safety-server.mjs';
import {handleLeadIngest} from '../server/lead-service.mjs';
const require=createRequire(import.meta.url),safety=require('../frontend/content-safety.js');
const normal={contact:{companyName:'Şifa Café',contactName:'Ali'},design:{frontText:'HijyenLab',rearText:'',qrEnabled:false}};
test('benign multilingual names, substrings, political/religious/news context stay quiet',()=>{
 const cases=['Scunthorpe','Classical Glass','Dickson','Siktaş','Fucking village tourism','Şifa Café','Müller','مرحبا','שלום','你好','Светлана','Barış ve demokrasi','Ramazanınız mübarek olsun','Terör saldırısını kınıyoruz','PKK hakkında haber','ISIS historical reporting','السلام عليكم','Talih','Platform Şans Oyunları','Talih Turizm A.Ş.','Şans Oyunları Araştırma Merkezi','Terörle Mücadele Derneği','Kumar bağımlılığı farkındalık semineri'];
 for(const text of cases){const out=safety.checkText(text);assert.equal(out.state,'clear_local',text);assert.equal(safety.message(out,'preview'),'');assert.equal(out.legalApproval,false);}
});
test('high-specificity full-field profanity and separator/Unicode evasion block',()=>{
 for(const text of ['SİKTİR GİT','s i k t i r g i t','f.u.c.k y.o.u','ＦＵＣＫ ＹＯＵ','fu\u200bck you','FICK DICH','hijo de puta','иди нахуй','ابن القحبة','fuck you!!!','(siktir git)'])assert.equal(safety.checkText(text).state,'blocked',text);
});
test('whole-field paired quotations require context instead of automatic rejection or approval',()=>{
 for(const text of ['"fuck you"',"'siktir git'",'“SİKTİR GİT”','‘hijo de puta’','«fick dich»','‹hurensohn›','„motherfucker“','「иди нахуй」','『ابن القحبة』','“f.u.c.k y.o.u”','“fu\u200bck you”','"ＦＵＣＫ ＹＯＵ".','“fuck you!”']){
  const out=safety.checkText(text,'frontText');assert.equal(out.state,'review_needed',text);assert.equal(out.reason,'quotation_context_required');assert.equal(out.field,'frontText');assert.equal(out.legalApproval,false);assert.equal(out.serverApproval,false);assert.equal(safety.message(out,'preview'),'');assert.match(safety.message(out,'submit'),/ret kararı değildir/);assert.match(safety.message(out,'submit'),/gönderim yapılmadı/);
 }
 // A quote in one field cannot override a separate explicit abusive field.
 assert.equal(safety.assess({fields:{frontText:'“fuck you”',rearText:'siktir git'}}).state,'blocked');
});
test('quotation/context is review, not a criminal accusation or substring block',()=>{
 const out=safety.checkText('Please do not say fuck you to customers');assert.equal(out.state,'review_needed');assert.equal(safety.message(out,'preview'),'');assert.ok(!safety.message(out,'submit').includes('suç'));
 assert.equal(safety.checkText('motherfuckerbrand').state,'clear_local');
});
test('image/QR/poor OCR are unassessed, never unsafe and never block ordinary preview',()=>{
 for(const input of [{hasImages:true},{hasImages:true,ocrQuality:'poor'},{hasQr:true}]){const out=safety.assess({...input,fields:{frontText:'Clean'}});assert.equal(out.state,'not_checked');assert.equal(safety.message(out,'preview'),'');}
 assert.equal(safety.assess(null).state,'not_checked');
});
test('unconfigured final service fails closed including blank/unprinted and forged client approvals',async()=>{
 for(const value of [normal,{contact:{contactName:'Ali'},design:null},{...normal,approved:true,serverApproval:true,state:'approved'}]){const out=await guardTransmission(value);assert.equal(out.allowed,false);assert.equal(out.state,'service_unavailable');}
});
test('quoted and contextual text never receive final transmission approval or invoke a review service',async()=>{
 let reviewed=false;const adapter={assess:async()=>{reviewed=true;throw Error('must not be called');}};
 for(const frontText of ['“fuck you”','Please do not say fuck you to customers']){
  const out=await guardTransmission({...normal,design:{...normal.design,frontText}},{adapter});assert.equal(out.allowed,false);assert.equal(out.state,'review_needed');
 }
 assert.equal(reviewed,false);
 for(const companyName of ['Talih','Platform Şans Oyunları']){
  const out=await guardTransmission({...normal,contact:{...normal.contact,companyName}});assert.equal(out.allowed,false);assert.equal(out.state,'service_unavailable');
 }
});
test('all string fields are locally screened without forwarding, including null-design requests',async()=>{
 for(const value of [{design:null,contact:{contactName:'fuck you'}},{...normal,notes:'siktir git'},{...normal,contact:{district:'fick dich'}}]){const out=await guardTransmission(value);assert.equal(out.allowed,false);assert.equal(out.state,'blocked');}
});
test('trusted adapter verdict binds exact bytes/content revision and policy; no forged or stale approval',async()=>{
 const revision=await contentRevision(normal),adapter={assess:async()=>({state:'approved',revision,policyVersion:POLICY_VERSION})};
 assert.equal((await guardTransmission(normal,{adapter})).allowed,true);
 for(const value of [{...normal,design:{...normal.design,rearText:'new'}},{...normal,contact:{companyName:'Other'}}]){const out=await guardTransmission(value,{adapter});assert.equal(out.allowed,false);assert.equal(out.reason,'stale_or_invalid_review');}
 assert.equal((await guardTransmission(normal,{adapter:{assess:async()=>({state:'approved',revision,policyVersion:'old'})}})).allowed,false);
});
test('adapter errors and inconclusive responses fail closed without exposing data',async()=>{
 assert.equal((await guardTransmission(normal,{adapter:{assess:async()=>{throw Error('secret');}}})).state,'service_unavailable');
 assert.equal((await guardTransmission(normal,{adapter:{assess:async()=>({state:'clear_local',revision:await contentRevision(normal),policyVersion:POLICY_VERSION})}})).allowed,false);
});
test('canonical lead handler blocks before database write, disabled flags unchanged',async()=>{
 const p={requestId:'00000000-0000-4000-8000-000000000001',kind:'complete',printMode:'unprinted',consent:{accepted:true,version:'lead-v1'},productId:'BM12',quantity:400,fragrance:'flambau',design:null,contact:{companyName:'Clean',contactName:'Ali',phone:'05550000000',email:'',province:'',district:''}};
 const request=()=>new Request('https://example.test/api/leads',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(p)});
 const env={ADMIN_USER_IDS:'["owner"]',LEAD_COLLECTION_ENABLED:'true',LEAD_RETENTION_DAYS:'30'};
 let wrote=false;const db={batch(){wrote=true;throw Error('must not write');}};
 const r=await handleLeadIngest(request(),env,db);assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'content_check_unavailable'});assert.equal(wrote,false);
 assert.deepEqual(await (await handleLeadIngest(request(),{},db)).json(),{error:'collection_disabled'});
 p.contact.contactName='fuck you';assert.equal((await handleLeadIngest(request(),env,db)).status,422);assert.equal(wrote,false);
 p.contact.contactName='Ali';p.serverApproval=true;assert.equal((await handleLeadIngest(request(),env,db)).status,400);delete p.serverApproval;
 for(const adapter of [{assess:async()=>{throw Error('provider unavailable');}},{assess:async()=>({state:'approved',revision:'stale',policyVersion:POLICY_VERSION})}]){assert.equal((await handleLeadIngest(request(),env,db,Date.now(),{adapter})).status,503);assert.equal(wrote,false);}
});
test('gate is wired in canonical handler, not only the client or thin route',()=>{
 const source=readFileSync(new URL('../server/lead-service.mjs',import.meta.url),'utf8');assert.ok(source.indexOf('await guardTransmission(value,moderationOptions)')<source.indexOf('db.batch(['));
});
test('hung adapter times out rather than leaving submission pending forever',async()=>{
 const out=await guardTransmission(normal,{timeoutMs:5,adapter:{assess:()=>new Promise(()=>{})}});assert.equal(out.allowed,false);assert.equal(out.state,'service_unavailable');
});
