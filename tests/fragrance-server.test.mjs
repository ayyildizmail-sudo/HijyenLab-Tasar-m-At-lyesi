import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { handleFragrancePreferences, aggregatePayload, SEED } from '../server/fragrance-preferences.mjs';
const origin = 'https://example.chatgpt.site';
function database() {
  const sql = new DatabaseSync(':memory:');
  for (const f of readdirSync(new URL('../drizzle/', import.meta.url)).filter(x => x.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL('../drizzle/'+f, import.meta.url),'utf8'));
  const db = {
    sql,
    prepare(query) {
      return { query, args:[], bind(...args) { this.args=args; return this; }, async all() { return {success:true,results:sql.prepare(query).all(...this.args)}; } };
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const result=statements.map(s => ({success:true, results: s.query.startsWith('SELECT') ? sql.prepare(s.query).all(...s.args) : (sql.prepare(s.query).run(...s.args), [])}));
        sql.exec('COMMIT'); return result;
      } catch(e) { sql.exec('ROLLBACK'); throw e; }
    },
  }; return db;
}
const get = (query='?productFamily=towels') => new Request(origin+'/api/fragrance-preferences'+query);
const post = (anonymousId, fragrance, extra={}) => new Request(origin+'/api/fragrance-preferences', {method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({productFamily:'towels',anonymousId,fragrance,revision:1,...extra})});
async function response(req,db,status=200) { const r=await handleFragrancePreferences(req,db);assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');return r.json(); }
function counts(db) {return db.sql.prepare('SELECT fragrance, COUNT(*) AS count FROM fragrance_preferences GROUP BY fragrance').all();}
test('immutable seed is towels-only 63/19/11/7 without exposing counts or IDs', async()=>{
 const db=database();const p=await response(get(),db);
 assert.deepEqual(p,{productFamily:'towels',seedVersion:'500-v1',source:'shared',percentages:{flambau:63,green_tea:19,bodrum_mandarin:11,lemon:7}});
 assert.deepEqual(counts(db),[]);assert.equal(Object.values(SEED).reduce((a,b)=>a+b),500);
});
test('new, retry, refresh and changed choice count one UUID once',async()=>{
 const db=database(),id=randomUUID();await response(post(id,'lemon'),db);await response(post(id,'lemon'),db);await response(get(),db);
 assert.deepEqual(counts(db).map(r=>({...r})),[{fragrance:'lemon',count:1}]);
 await response(post(id.toUpperCase(),'green_tea',{revision:2}),db);
 assert.deepEqual(counts(db).map(r=>({...r})),[{fragrance:'green_tea',count:1}]);
});
test('parallel independent IDs and duplicate retries retain all votes',async()=>{
 const db=database();const ids=Array.from({length:120},randomUUID);
 await Promise.all(ids.flatMap(id=>[response(post(id,'lemon'),db),response(post(id,'lemon'),db)]));
 assert.deepEqual(counts(db).map(r=>({...r})),[{fragrance:'lemon',count:120}]);
 const p=await response(get(),db);assert.equal(Object.values(p.percentages).reduce((a,b)=>a+b),100);assert.equal(p.percentages.lemon,25);
});
test('new handler/redeployment does not recreate seed or reset votes',async()=>{
 const db=database(),id=randomUUID();await response(post(id,'flambau'),db);
 const second=await import('../server/fragrance-preferences.mjs?redeploy');
 assert.equal((await second.handleFragrancePreferences(get(),db)).status,200);
 assert.deepEqual(counts(db).map(r=>({...r})),[{fragrance:'flambau',count:1}]);
 for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql'))) {
  const migration=readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8');
  // Lead-only schema rebuilds may copy lead rows; fragrance state must never be rewritten or dropped.
  assert.doesNotMatch(migration,/\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|REPLACE\s+INTO|UPDATE|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE)\s+[`"]?fragrance_preferences\b/i);
 }
});
test('invalid family, fields, enum, UUID and injection do not write',async()=>{
 const db=database(),id=randomUUID();
 for(const [req,status] of [[get(''),400],[get('?productFamily=wetwipes'),400],[get('?productFamily=towels&anonymousId='+id),400],[post(id,'lemon',{productFamily:'wetwipes'}),400],[post(id,'unknown'),400],[post('x\'); DROP TABLE fragrance_preferences;--','lemon'),400],[post(id,'lemon',{name:'customer'}),400]]) await response(req,db,status);
 assert.deepEqual(counts(db),[]);
});
test('same-origin, content-type and bounded raw bodies are enforced',async()=>{
 const db=database(),id=randomUUID();
 for(const originValue of ['https://evil.example','null',null]) {
  const req=post(id,'lemon'); if(originValue) req.headers.set('origin',originValue); else req.headers.delete('origin');await response(req,db,403);
 }
 let req=post(id,'lemon');req.headers.set('sec-fetch-site','cross-site');await response(req,db,403);
 req=post(id,'lemon');req.headers.set('content-type','text/plain');await response(req,db,415);
 await response(new Request(origin+'/api/fragrance-preferences',{method:'POST',headers:{origin,'content-type':'application/json'},body:' '.repeat(257)}),db,400);
 await response(new Request(origin+'/api/fragrance-preferences',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{broken'}),db,400);
 await response(new Request(origin+'/api/fragrance-preferences',{method:'DELETE'}),db,405);
 assert.deepEqual(counts(db),[]);
});
test('database failures never claim seed is live shared data or expose internals',async()=>{
 await response(get(),undefined,503);
 const bad={prepare(){throw Error('secret stack');}};
 assert.deepEqual(await response(get(),bad,503),{error:'preferences_unavailable'});
 await response(post(randomUUID(),'lemon'),{prepare(){return {bind(){return this;}};},async batch(){throw Error('secret');}},503);
});
test('failed atomic batch rolls back and percentages sum100',async()=>{
 const db=database();await assert.rejects(db.batch([db.prepare('INSERT INTO fragrance_preferences VALUES (?, ?, ?, ?)').bind('towels',randomUUID(),'lemon',1),db.prepare('SELECT * FROM missing_table')]));assert.deepEqual(counts(db),[]);
 for(let n=0;n<1000;n++) {const p=aggregatePayload([{fragrance:'lemon',count:n}]);assert.equal(Object.values(p.percentages).reduce((a,b)=>a+b),100);}
});

test('late and duplicated older revisions cannot overwrite the newer preference',async()=>{
 const db=database(),id=randomUUID();await response(post(id,'green_tea',{revision:3}),db);
 await Promise.all([response(post(id,'lemon',{revision:1}),db,409),response(post(id,'flambau',{revision:2}),db,409),response(post(id,'lemon',{revision:3}),db,409)]);
 assert.deepEqual(counts(db).map(r=>({...r})),[{fragrance:'green_tea',count:1}]);
 for(const revision of [0,-1,1.5,'2',9007199254740992,null]) await response(post(id,'lemon',{revision}),db,400);
});

// DDL foreign-key actions are not data-changing migration statements.
test('migration DML guard rejects real writes but allows foreign-key actions',()=>{
 const dml=/\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|REPLACE\s+INTO|UPDATE\s+[`"\w]+\s+SET|DELETE\s+FROM)\b/i;
 for(const sql of ['INSERT INTO fragrance_preferences VALUES (1);','INSERT OR REPLACE INTO fragrance_preferences VALUES (1);','REPLACE INTO fragrance_preferences VALUES (1);','UPDATE fragrance_preferences SET revision=0;','DELETE FROM fragrance_preferences;']) assert.match(sql,dml);
 assert.doesNotMatch('FOREIGN KEY (lead_id) REFERENCES leads(id) ON UPDATE no action ON DELETE cascade',dml);
});
