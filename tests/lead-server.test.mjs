import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
import * as productionApi from '../server/lead-service.mjs';
// Explicit trusted SERVER fixture only: preserve DB/idempotency tests without enabling a provider.
// Default production denial/bypass/outage/revision tests live in content-safety.test.mjs.
const testModeration={adapter:{async assess({revision,policyVersion}){return {state:'approved',revision,policyVersion};}}};
const api={...productionApi,handleLeadIngest:(request,env,db,now)=>productionApi.handleLeadIngest(request,env,db,now,testModeration)};
import { renderAdminPage,renderOwnerSetupPage } from '../server/admin-page.mjs';
const origin='https://example.chatgpt.site',now=1800000000000,owner={userId:'site-scoped-fixture-owner'},env={ADMIN_USER_IDS:JSON.stringify([owner.userId]),LEAD_COLLECTION_ENABLED:'true',ANALYTICS_ENABLED:'true',LEAD_RETENTION_DAYS:'30',ANALYTICS_RETENTION_DAYS:'14'};
function database(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));return{sql,prepare(query){return{query,args:[],bind(...args){this.args=args;return this;},async all(){return{success:true,results:sql.prepare(query).all(...this.args)};}};},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>{const statement=sql.prepare(s.query);if(/^SELECT/.test(s.query))return{success:true,results:statement.all(...s.args)};const out=statement.run(...s.args);return{success:true,results:[],meta:{changes:Number(out.changes)}};});sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};}
function req(path,body,method='POST'){return new Request(origin+path,{method,headers:{origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function lead(extra={}){return{requestId:randomUUID(),kind:'complete',printMode:'printed',consent:{accepted:true,version:'lead-v1'},productId:'BM12',quantity:5200,fragrance:'lemon',contact:{companyName:'Fixture company',contactName:'Fixture contact',phone:'+90 555 000 00 00',email:'',province:'',district:''},design:{background:'#ffffff',frontInkColors:['#000000'],frontText:'Fixture',frontFont:'sans-serif',rearText:'',rearInkColor:'',qrEnabled:false,qrUrl:''},...extra};}
function event(extra={}){return{eventId:randomUUID(),sessionId:randomUUID(),consent:{accepted:true,version:'analytics-v1'},event:'visit',productId:null,...extra};}
const ingest=(db,p,e=env)=>api.handleLeadIngest(req('/api/leads',p),e,db,now);
async function expect(response,status){assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'private, no-store');return response.json();}
test('capabilities fail closed without explicit owner, flags and retention',()=>{for(const e of [{},{...env,ADMIN_USER_IDS:''},{...env,ADMIN_USER_IDS:'[1]'},{...env,LEAD_RETENTION_DAYS:''},{...env,LEAD_COLLECTION_ENABLED:'false'}])assert.equal(api.capabilities(e).leadEnabled,false);assert.equal(api.capabilities(env).leadEnabled,true);assert.equal(api.ownerAllowed({userId:'wrong',email:owner.userId},env),false);assert.equal(api.ownerAllowed(owner,{}),false);});
test('all private reads and writes deny anonymous/non-owner before database access',async()=>{for(const identity of [null,{userId:'outsider'}]){const status=identity?403:401;await expect(await api.handleAdminLeads(req('/api/admin/leads',undefined,'GET'),env,null,identity),status);await expect(await api.handleAdminStats(req('/api/admin/stats',undefined,'GET'),env,null,identity),status);await expect(await api.handleAdminStatus(req('/api/admin/leads/x/status',{} ,'PATCH'),env,null,identity,'x'),status);}});
test('explicit complete/partial consent, nullable unknowns, product quantity rules and exact schemas',()=>{assert.equal(api.validateLead(lead()),true);const partial=lead({kind:'contact_request',productId:null,quantity:null,fragrance:null,design:null});assert.equal(api.validateLead(partial),true);for(const p of [lead({quantity:0}),lead({quantity:5199}),lead({quantity:null}),lead({fragrance:null}),lead({productId:'invented'}),lead({consent:{accepted:false,version:'lead-v1'}}),lead({extra:'secret'}),{...partial,quantity:0},{...partial,contact:{...partial.contact,contactName:''}},{...partial,design:{image:'data:secret'}}])assert.equal(api.validateLead(p),false);});
test('lead retries are idempotent, changed payload conflicts, owner lists only metadata',async()=>{const db=database(),p=lead();await expect(await ingest(db,p),201);await expect(await ingest(db,p),200);await expect(await ingest(db,{...p,quantity:6000}),409);const result=await expect(await api.handleAdminLeads(req('/api/admin/leads',undefined,'GET'),env,db,owner,now),200);assert.equal(result.items.length,1);assert.equal(result.items[0].quantity,5200);assert.equal(result.items[0].status,'new');assert.equal('payload_hash' in result.items[0],false);assert.equal('phone_key' in result.items[0],false);});
test('disabled intake, origin, oversized/malformed and extra field rejection never write',async()=>{const db=database();await expect(await ingest(db,lead(),{}),503);for(const change of [r=>r.headers.delete('origin'),r=>r.headers.set('origin','https://evil.example'),r=>r.headers.set('sec-fetch-site','cross-site')]){const r=req('/api/leads',lead());change(r);await expect(await api.handleLeadIngest(r,env,db,now),403);}for(const r of [req('/api/leads',lead({unknown:'x'})),new Request(origin+'/api/leads',{method:'POST',headers:{origin,'content-type':'application/json'},body:' '.repeat(16385)}),req('/api/leads?x=1',lead())])await expect(await api.handleLeadIngest(r,env,db,now),400);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM leads').get().n,0);});
test('status CAS revision and audit are atomic; rejected edits do not create audit rows',async()=>{const db=database(),p=lead();await ingest(db,p);const patch=v=>api.handleAdminStatus(req('/api/admin/leads/'+p.requestId+'/status',v,'PATCH'),env,db,owner,p.requestId,now);const out=await expect(await patch({status:'contacted',revision:0}),200);assert.equal(out.revision,1);await expect(await patch({status:'closed',revision:0}),409);await expect(await patch({status:'sent_email',revision:1}),400);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM lead_status_audit').get().n,1);assert.equal(db.sql.prepare('SELECT status FROM leads').get().status,'contacted');});
test('analytics exact consent-only schema, stage dedup and unique session counts',async()=>{const db=database(),p=event();const send=x=>api.handleAnalytics(req('/api/analytics',x),env,db,now);await expect(await send(p),200);await expect(await send({...p,eventId:randomUUID()}),200);await expect(await send({...p,event:'design_started'}),409);await expect(await send({...p,eventId:randomUUID(),event:'design_started'}),200);await expect(await send({...p,eventId:randomUUID(),email:'private@example.test'}),400);await expect(await send({...p,eventId:randomUUID(),consent:{accepted:false,version:'analytics-v1'}}),400);const stats=await expect(await api.handleAdminStats(req('/api/admin/stats',undefined,'GET'),env,db,owner,now),200);assert.equal(stats.sessionCount,1);assert.equal(stats.counts.visit,1);assert.equal(stats.counts.design_started,1);assert.equal(JSON.stringify(stats).includes(p.sessionId),false);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM lead_analytics_events').get().n,2);});
test('expired private data is excluded and purge removes leads, audit and analytics without touching fragrance',async()=>{const db=database(),p=lead();await ingest(db,p);await api.handleAdminStatus(req('/api/admin/leads/x/status',{status:'closed',revision:0},'PATCH'),env,db,owner,p.requestId,now);await api.handleAnalytics(req('/api/analytics',event()),env,db,now);db.sql.prepare('INSERT INTO fragrance_preferences VALUES (?,?,?,?)').run('towels',randomUUID(),'lemon',1);await api.purgeExpired(db,now+31*86400000);for(const table of ['leads','lead_status_audit','lead_analytics_events'])assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM fragrance_preferences').get().n,1);});
test('rate limits are bounded and failures never expose request or database data',async()=>{const db=database();for(let i=0;i<3;i++)await expect(await ingest(db,lead()),201);await expect(await ingest(db,lead()),429);const out=await expect(await ingest(undefined,lead()),503);assert.deepEqual(out,{error:'service_unavailable'});});
test('admin shells never embed records and safely escape caller identity',()=>{assert.ok(!renderAdminPage().includes('Fixture contact'));const html=renderOwnerSetupPage({subject:'<script>alert(1)</script>',email:'"&'});assert.ok(!html.includes('<script>alert'));assert.ok(html.includes('&lt;script&gt;'));});

test('flags never confer admin access and public methods cannot list leads',async()=>{
 const outsider={userId:'fixture-not-owner'};
 for(const config of [{},{...env,ADMIN_USER_IDS:'[]'},{...env,ADMIN_USER_IDS:'[false]'},{...env,ADMIN_USER_IDS:'["fixture-other"]'},{...env,LEAD_COLLECTION_ENABLED:'false'}]){
  await expect(await api.handleAdminLeads(req('/api/admin/leads',undefined,'GET'),config,null,outsider),403);
 }
 await expect(await api.handleLeadIngest(req('/api/leads',undefined,'GET'),env,database(),now),405);
});
test('invalid admin pagination, status origins and atomic database failures remain safe',async()=>{
 const db=database(),p=lead();await ingest(db,p);
 for(const query of ['?limit=100','?offset=-1','?limit=1&limit=2','?email=private','?status=bad']) await expect(await api.handleAdminLeads(req('/api/admin/leads'+query,undefined,'GET'),env,db,owner,now),400);
 const request=req('/api/admin/leads/'+p.requestId+'/status',{status:'closed',revision:0},'PATCH');request.headers.set('origin','https://evil.example');await expect(await api.handleAdminStatus(request,env,db,owner,p.requestId,now),403);
 await assert.rejects(db.batch([db.prepare("UPDATE leads SET status='closed' WHERE id=?").bind(p.requestId),db.prepare('SELECT * FROM absent_fixture_table')]));
 assert.equal(db.sql.prepare('SELECT status FROM leads').get().status,'new');
});

test('explicit unprinted mode accepts only blank carton-multiple requests with normal consent/contact/fragrance',async()=>{
 const db=database();
 for(const [productId,carton] of Object.entries({BM12:400,BM15:500,BM545:625})){
  const p=lead({printMode:'unprinted',productId,quantity:carton,fragrance:'flambau',design:null});
  assert.equal(api.validateLead(p),true);await expect(await ingest(db,p),201);
  for(const quantity of [0,carton-1,carton+1,1000001])assert.equal(api.validateLead({...p,quantity}),false);
  assert.equal(api.validateLead({...p,quantity:carton*2}),true);
  assert.equal(api.validateLead({...p,design:lead().design}),false);
  assert.equal(api.validateLead({...p,fragrance:null}),false);
  for(const fragrance of ['lemon','green_tea','bodrum_mandarin'])assert.equal(api.validateLead({...p,fragrance}),false);
  assert.equal(api.validateLead({...p,consent:{accepted:false,version:'lead-v1'}}),false);
  assert.equal(api.validateLead({...p,contact:{...p.contact,phone:''}}),false);
 }
 const list=await expect(await api.handleAdminLeads(req('/api/admin/leads',undefined,'GET'),env,db,owner,now),200);
 assert.equal(list.items.length,3);assert.ok(list.items.every(x=>x.printMode==='unprinted'&&x.design===null));
 const missing=lead();delete missing.printMode;assert.equal(api.validateLead(missing),false);
 assert.equal(api.validateLead(lead({printMode:'automatic'})),false);
 assert.equal(api.validateLead(lead({printMode:'printed',quantity:400,design:null})),false);
 assert.equal(api.validateLead(lead({printMode:'unprinted',kind:'contact_request',productId:null,quantity:null,fragrance:null,design:null})),true);
 assert.equal(api.validateLead(lead({printMode:'unprinted',kind:'contact_request',productId:null,quantity:400,fragrance:null,design:null})),false);
});
test('print mode migration preserves existing printed lead, audit and fragrance inside transaction',()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();
 for(const file of files.filter(f=>!f.startsWith('0003')))sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const id=randomUUID();
 sql.prepare("INSERT INTO leads (id,kind,created_at,expires_at,status,revision,product_id,quantity,fragrance,contact_json,design_json,phone_key,consent_version,payload_hash) VALUES (?,'complete',1,100,'contacted',1,'BM12',5200,'lemon','{}','{}','5550000000','lead-v1','fixture')").run(id);
 sql.prepare("INSERT INTO lead_status_audit (lead_id,actor_id,changed_at,from_status,to_status,from_revision) VALUES (?,'fixture-owner',2,'new','contacted',0)").run(id);
 sql.prepare('INSERT INTO fragrance_preferences VALUES (?,?,?,?)').run('towels',randomUUID(),'lemon',3);
 const fragrance=sql.prepare('SELECT * FROM fragrance_preferences').all(),audit=sql.prepare('SELECT * FROM lead_status_audit').all();
 sql.exec('BEGIN');for(const file of files.filter(f=>f.startsWith('0003')))sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));sql.exec('COMMIT');
 assert.deepEqual(sql.prepare('SELECT * FROM fragrance_preferences').all(),fragrance);
 assert.deepEqual(sql.prepare('SELECT * FROM lead_status_audit').all(),audit);
 assert.equal(sql.prepare('SELECT print_mode FROM leads WHERE id=?').get(id).print_mode,'printed');
 assert.equal(sql.prepare('SELECT status FROM leads WHERE id=?').get(id).status,'contacted');
 assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.equal(sql.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
 sql.prepare("INSERT INTO lead_status_audit (lead_id,actor_id,changed_at,from_status,to_status,from_revision) VALUES (?,'fixture-owner',3,'contacted','closed',1)").run(id);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM lead_status_audit').get().n,2);
});

test('BM21 validation uses wet-wipe carton, printed minimum and fixed unprinted green tea',()=>{
 for(const quantity of [1000,2000,10000])assert.equal(api.validateLead(lead({productId:'BM21',printMode:'unprinted',quantity,fragrance:'green_tea',design:null})),true);
 for(const quantity of [999,1001,1500])assert.equal(api.validateLead(lead({productId:'BM21',printMode:'unprinted',quantity,fragrance:'green_tea',design:null})),false);
 assert.equal(api.validateLead(lead({productId:'BM21',printMode:'unprinted',quantity:1000,fragrance:'flambau',design:null})),false);
 assert.equal(api.validateLead(lead({productId:'BM21',quantity:9999})),false);assert.equal(api.validateLead(lead({productId:'BM21',quantity:10000})),true);
});

test('BM11 and BM13 accept confirmed printed minimum and unprinted full cartons only',()=>{
 for(const productId of ['BM11','BM13']){
  assert.equal(api.validateLead(lead({productId,quantity:5200})),true);
  assert.equal(api.validateLead(lead({productId,quantity:5199})),false);
  for(const quantity of [400,800])assert.equal(api.validateLead(lead({productId,printMode:'unprinted',quantity,fragrance:'flambau',design:null})),true);
  for(const quantity of [0,399,401,600])assert.equal(api.validateLead(lead({productId,printMode:'unprinted',quantity,fragrance:'flambau',design:null})),false);
  assert.equal(api.validateLead(lead({productId,printMode:'unprinted',quantity:400,fragrance:'green_tea',design:null})),false);
 }
});
