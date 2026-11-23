// Katalogdaki her ürünün teklif talebi, sunucunun kabul ettiği gibi veritabanına da yazılabilmelidir.
// Ayrıca ürün kısıtı değişikliği mevcut talepleri ve durum geçmişini korumalıdır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as productionApi from '../server/lead-service.mjs';
const require=createRequire(import.meta.url);
const catalog=require('../frontend/product-catalog.js');
const moderation={adapter:{async assess({revision,policyVersion}){return {state:'approved',revision,policyVersion};}}};
const origin='https://example.chatgpt.site',now=1800000000000;
const env={ADMIN_USER_IDS:JSON.stringify(['fixture-owner']),LEAD_COLLECTION_ENABLED:'true',ANALYTICS_ENABLED:'true',LEAD_RETENTION_DAYS:'30',ANALYTICS_RETENTION_DAYS:'14'};
const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();
function sqlite(files){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of files)sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));return sql;}
function d1(sql){return{sql,prepare(query){return{query,args:[],bind(...args){this.args=args;return this;},async all(){return{success:true,results:sql.prepare(query).all(...this.args)};}};},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>{const st=sql.prepare(s.query);if(/^SELECT/.test(s.query))return{success:true,results:st.all(...s.args)};const out=st.run(...s.args);return{success:true,results:[],meta:{changes:Number(out.changes)}};});sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};}
const minimum={BM12:5200,BM11:5200,BM13:5200,BM15:5000,BM545:5000,BM21:10000,OSHIBORI:3000};
function lead(productId,phone){return{requestId:randomUUID(),kind:'complete',printMode:'printed',consent:{accepted:true,version:'lead-v1'},productId,quantity:minimum[productId],fragrance:productId==='BM21'?'green_tea':'flambau',contact:{companyName:'Örnek işletme',contactName:'Örnek kişi',phone,email:'',province:'',district:''},design:{background:'#ffffff',frontInkColors:['#000000'],frontText:'Örnek',frontFont:'sans-serif',rearText:'',rearInkColor:'',qrEnabled:false,qrUrl:''}};}
const ingest=(db,body)=>productionApi.handleLeadIngest(new Request(origin+'/api/leads',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),env,db,now,moderation);

test('katalogdaki her ürünün talebi sunucu tarafından geçerli sayılır ve veritabanına yazılır',async()=>{
 const ids=catalog.items.map(item=>item.id);
 assert.deepEqual([...ids].sort(),Object.keys(minimum).sort(),'test, katalogdaki ürün listesini kapsamalı');
 for(const [i,id] of ids.entries()){
  const db=d1(sqlite(migrations)),body=lead(id,'+90 555 000 00 '+String(10+i));
  assert.equal(productionApi.validateLead(body),true,id+' sunucu doğrulaması');
  const response=await ingest(db,body);
  assert.equal(response.status,201,id+' talebi kaydedilmeli');
  assert.equal(db.sql.prepare('SELECT product_id FROM leads WHERE id=?').get(body.requestId)?.product_id,id);
 }
});

test('ürün kısıtı güncellemesi mevcut talepleri ve durum geçmişini korur',()=>{
 const before=migrations.filter(f=>f<'0004');
 const later=migrations.filter(f=>f>='0004');
 assert.ok(later.length>0,'ürün kısıtını güncelleyen yeni bir migration bulunmalı');
 const sql=sqlite(before);
 sql.prepare("INSERT INTO leads (id,kind,print_mode,created_at,expires_at,status,revision,product_id,quantity,fragrance,contact_json,design_json,phone_key,consent_version,payload_hash) VALUES ('eski-talep','complete','printed',1,2,'contacted',1,'BM12',5200,'lemon','{}','{}','k','lead-v1','h')").run();
 sql.prepare("INSERT INTO lead_status_audit (lead_id,actor_id,changed_at,from_status,to_status,from_revision) VALUES ('eski-talep','sahip',1,'new','contacted',0)").run();
 for(const f of later)sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 assert.deepEqual({...sql.prepare("SELECT id,status,revision,product_id FROM leads").get()},{id:'eski-talep',status:'contacted',revision:1,product_id:'BM12'});
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM lead_status_audit WHERE lead_id='eski-talep'").get().n,1);
 assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.throws(()=>sql.prepare("INSERT INTO leads (id,kind,print_mode,created_at,expires_at,product_id,contact_json,phone_key,consent_version,payload_hash) VALUES ('x','contact_request','printed',1,2,'BILINMEYEN','{}','k','v','h')").run(),/CHECK constraint failed/);
});
