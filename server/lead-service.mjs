import { guardTransmission } from '../lib/content-safety-server.mjs';
// Same-Site lead intake and opt-in aggregate analytics. Server authorization is mandatory.
export const LEAD_CONSENT_VERSION='lead-v1',ANALYTICS_CONSENT_VERSION='analytics-v1';
export const EVENTS=Object.freeze(['visit','design_started','design_ready','fragrance_selected','quote_viewed','whatsapp_clicked','phone_clicked']);
export const STATUSES=Object.freeze(['new','contacted','quote_sent','closed']);
const PRODUCTS=['BM12','BM11','BM13','BM15','BM545','BM21'],FRAGRANCES=['flambau','green_tea','bodrum_mandarin','lemon'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,DAY=86400000;
export function adminIds(env={}){try{const ids=JSON.parse(env.ADMIN_USER_IDS||'[]');return Array.isArray(ids)&&ids.length>0&&ids.length<=10&&ids.every(x=>typeof x==='string'&&x.length>0&&x.length<=256&&x.trim()===x)?ids:[];}catch{return [];}}
const days=(value,max)=>typeof value==='string'&&/^\d+$/.test(value)&&+value>=1&&+value<=max?+value:null;
export function capabilities(env={}){const configured=adminIds(env).length>0,leadRetentionDays=days(env.LEAD_RETENTION_DAYS,365),analyticsRetentionDays=days(env.ANALYTICS_RETENTION_DAYS,90);return {leadEnabled:configured&&env.LEAD_COLLECTION_ENABLED==='true'&&leadRetentionDays!==null,analyticsEnabled:configured&&env.ANALYTICS_ENABLED==='true'&&analyticsRetentionDays!==null,imagesEnabled:false,emailEnabled:false,leadConsentVersion:LEAD_CONSENT_VERSION,analyticsConsentVersion:ANALYTICS_CONSENT_VERSION};}
export function ownerAllowed(identity,env={}){return !!identity&&typeof identity.userId==='string'&&adminIds(env).includes(identity.userId);}
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'}});}
const error=(code,status)=>reply({error:code},status);
function ownerError(identity,env){return !identity?error('authentication_required',401):!ownerAllowed(identity,env)?error('forbidden',403):null;}
function mutationAllowed(request){return request.headers.get('origin')===new URL(request.url).origin&&(!request.headers.get('sec-fetch-site')||request.headers.get('sec-fetch-site')==='same-origin');}
function exact(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(k=>keys.includes(k));}
const text=(v,max,min=0)=>typeof v==='string'&&v.length<=max&&v.trim().length>=min&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const uuid=v=>typeof v==='string'&&UUID.test(v);
async function body(request,max=16384){if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))throw Error('type');const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||+length>max))throw Error('body');if(!request.body)throw Error('body');const reader=request.body.getReader(),chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('body');}chunks.push(value);}}finally{reader.releaseLock();}const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}
function consent(value,version){return exact(value,['accepted','version'])&&value.accepted===true&&value.version===version;}
function validateDesign(value){const hasTextStyle=Object.hasOwn(value||{},'frontTextStyle');return exact(value,['background','frontInkColors','frontText','frontFont','rearText','rearInkColor','qrEnabled','qrUrl',...(hasTextStyle?['frontTextStyle']:[])])&&(!hasTextStyle||(['simple','classic','bold'].includes(value.frontTextStyle)&&value.frontFont===(value.frontTextStyle==='classic'?'serif':'sans-serif')&&text(value.frontText,240,1)))&&color(value.background)&&Array.isArray(value.frontInkColors)&&value.frontInkColors.length<=8&&value.frontInkColors.every(color)&&text(value.frontText,500)&&['sans-serif','serif','monospace','cursive'].includes(value.frontFont)&&text(value.rearText,1000)&&(value.rearInkColor===''||color(value.rearInkColor))&&typeof value.qrEnabled==='boolean'&&text(value.qrUrl,2048);}
export function validateLead(value){
 if(!exact(value,['requestId','kind','printMode','consent','productId','quantity','fragrance','contact','design'])||!['printed','unprinted'].includes(value.printMode)||!uuid(value.requestId)||!['complete','contact_request'].includes(value.kind)||!consent(value.consent,LEAD_CONSENT_VERSION))return false;
 const partial=value.kind==='contact_request';
 if(!(PRODUCTS.includes(value.productId)||(partial&&value.productId===null))||!((Number.isInteger(value.quantity)&&value.quantity>=1&&value.quantity<=1000000)||(partial&&value.quantity===null))||!(FRAGRANCES.includes(value.fragrance)||(partial&&value.fragrance===null))||!(value.printMode==='unprinted'?value.design===null:(validateDesign(value.design)||(partial&&value.design===null))))return false;
 if(value.printMode==='unprinted'&&value.fragrance!==null&&value.fragrance!==(value.productId==='BM21'?'green_tea':'flambau'))return false;
 if(value.printMode==='unprinted'&&value.quantity!==null){const carton={BM12:400,BM11:400,BM13:400,BM15:500,BM545:625,BM21:1000}[value.productId];if(!carton||value.quantity<carton||value.quantity%carton!==0)return false;}
 if(value.printMode==='printed'&&!partial&&value.quantity<(['BM12','BM11','BM13'].includes(value.productId)?5200:value.productId==='BM21'?10000:5000))return false;
 const c=value.contact;if(!exact(c,['companyName','contactName','phone','email','province','district'])||!text(c.companyName,120,partial?0:1)||!text(c.contactName,120,1)||!text(c.phone,32,1)||!/^\+?[0-9 ()-]+$/.test(c.phone)||c.phone.replace(/\D/g,'').length<7||c.phone.replace(/\D/g,'').length>15||!text(c.email,254)||!text(c.province,80)||!text(c.district,80))return false;
 return c.email===''||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email);
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
async function digest(value){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(value))));return [...new Uint8Array(data)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function successful(results){if(!Array.isArray(results)||results.some(r=>r.success===false))throw Error('database');return results;}
export function handleCapabilities(request,env){if(request.method!=='GET')return error('method_not_allowed',405);return reply(capabilities(env));}
// moderationOptions is server-only dependency injection; routes never populate it from client/env.
export async function handleLeadIngest(request,env,db,now=Date.now(),moderationOptions={}){
 if(request.method!=='POST')return error('method_not_allowed',405);if(!capabilities(env).leadEnabled)return error('collection_disabled',503);if(!mutationAllowed(request))return error('origin_not_allowed',403);if(new URL(request.url).search)return error('invalid_request',400);
 let value;try{value=await body(request);}catch{return error('invalid_request',400);}if(!validateLead(value))return error('invalid_request',400);
 const moderation=await guardTransmission(value,moderationOptions);
 if(!moderation.allowed)return error(moderation.state==='blocked'?'content_blocked':moderation.state==='review_needed'?'content_review_needed':'content_check_unavailable',moderation.state==='blocked'?422:moderation.state==='review_needed'?409:503);
 const id=value.requestId.toLowerCase(),phone=value.contact.phone.replace(/\D/g,''),expires=now+days(env.LEAD_RETENTION_DAYS,365)*DAY;
 try{const hash=await digest({...value,requestId:id}),results=successful(await db.batch([
  db.prepare(`INSERT INTO leads (id,kind,print_mode,created_at,expires_at,status,revision,product_id,quantity,fragrance,contact_json,design_json,phone_key,consent_version,payload_hash) SELECT ?,?,?,?,?,'new',0,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM leads WHERE created_at>=?)<20 AND (SELECT COUNT(*) FROM leads WHERE phone_key=? AND created_at>=?)<3 ON CONFLICT(id) DO NOTHING`).bind(id,value.kind,value.printMode,now,expires,value.productId,value.quantity,value.fragrance,JSON.stringify(value.contact),value.design===null?null:JSON.stringify(value.design),phone,LEAD_CONSENT_VERSION,hash,now-60000,phone,now-DAY),
  db.prepare('SELECT id,payload_hash,expires_at FROM leads WHERE id=?').bind(id)
 ]));const row=results[1].results?.[0];if(!row)return error('rate_limited',429);if(row.payload_hash!==hash)return error('idempotency_conflict',409);if(row.expires_at<=now)return error('request_expired',409);return reply({accepted:true,requestId:id},results[0].meta?.changes===0?200:201);
 }catch{return error('service_unavailable',503);}
}
export function validateAnalytics(value){return exact(value,['eventId','sessionId','consent','event','productId'])&&uuid(value.eventId)&&uuid(value.sessionId)&&consent(value.consent,ANALYTICS_CONSENT_VERSION)&&EVENTS.includes(value.event)&&(value.productId===null||PRODUCTS.includes(value.productId));}
export async function handleAnalytics(request,env,db,now=Date.now()){
 if(request.method!=='POST')return error('method_not_allowed',405);if(!capabilities(env).analyticsEnabled)return error('collection_disabled',503);if(!mutationAllowed(request))return error('origin_not_allowed',403);if(new URL(request.url).search)return error('invalid_request',400);
 let value;try{value=await body(request,1024);}catch{return error('invalid_request',400);}if(!validateAnalytics(value))return error('invalid_request',400);
 const id=value.eventId.toLowerCase(),session=value.sessionId.toLowerCase(),day=new Date(now).toISOString().slice(0,10),key=[day,session,value.event,value.productId||'-'].join('|');
 try{const results=successful(await db.batch([
  db.prepare(`INSERT OR IGNORE INTO lead_analytics_events (event_id,session_id,event_name,product_id,day,occurred_at,expires_at,dedup_key,consent_version) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM lead_analytics_events WHERE occurred_at>=?)<600 AND (SELECT COUNT(*) FROM lead_analytics_events WHERE session_id=? AND occurred_at>=?)<60`).bind(id,session,value.event,value.productId,day,now,now+days(env.ANALYTICS_RETENTION_DAYS,90)*DAY,key,ANALYTICS_CONSENT_VERSION,now-60000,session,now-60000),
  db.prepare('SELECT event_id,session_id,event_name,product_id,dedup_key FROM lead_analytics_events WHERE event_id=? OR dedup_key=?').bind(id,key)
 ]));const rows=results[1].results||[],existing=rows.find(r=>r.event_id===id);if(existing&&(existing.session_id!==session||existing.event_name!==value.event||existing.product_id!==value.productId||existing.dedup_key!==key))return error('idempotency_conflict',409);if(!rows.some(r=>r.dedup_key===key))return error('rate_limited',429);return reply({accepted:true,eventId:id});
 }catch{return error('service_unavailable',503);}
}
export async function purgeExpired(db,now=Date.now()){return successful(await db.batch([db.prepare('DELETE FROM lead_status_audit WHERE lead_id IN (SELECT id FROM leads WHERE expires_at<=?)').bind(now),db.prepare('DELETE FROM leads WHERE expires_at<=?').bind(now),db.prepare('DELETE FROM lead_analytics_events WHERE expires_at<=?').bind(now)]));}
function leadRow(row){return {id:row.id,kind:row.kind,printMode:row.print_mode,createdAt:row.created_at,expiresAt:row.expires_at,status:row.status,revision:row.revision,productId:row.product_id,quantity:row.quantity,fragrance:row.fragrance,contact:JSON.parse(row.contact_json),design:row.design_json===null?null:JSON.parse(row.design_json)};}
export async function handleAdminLeads(request,env,db,identity,now=Date.now()){
 const denied=ownerError(identity,env);if(denied)return denied;if(request.method!=='GET')return error('method_not_allowed',405);
 const q=new URL(request.url).searchParams;if([...q.keys()].some(k=>!['offset','limit','status'].includes(k))||[...q.keys()].length!==new Set(q.keys()).size)return error('invalid_request',400);const offset=q.get('offset')||'0',limit=q.get('limit')||'25',status=q.get('status');if(!/^\d+$/.test(offset)||+offset>10000||!/^\d+$/.test(limit)||+limit<1||+limit>50||(status&&!STATUSES.includes(status)))return error('invalid_request',400);
 try{await purgeExpired(db,now);const result=await db.prepare('SELECT * FROM leads WHERE expires_at>?'+(status?' AND status=?':'')+' ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').bind(now,...(status?[status]:[]),+limit+1,+offset).all();if(result.success===false)throw Error('db');const rows=result.results;return reply({items:rows.slice(0,+limit).map(leadRow),nextOffset:rows.length>+limit?+offset+(+limit):null});}catch{return error('service_unavailable',503);}
}
export async function handleAdminStatus(request,env,db,identity,id,now=Date.now()){
 const denied=ownerError(identity,env);if(denied)return denied;if(request.method!=='PATCH')return error('method_not_allowed',405);if(!mutationAllowed(request))return error('origin_not_allowed',403);if(!uuid(id)||new URL(request.url).search)return error('invalid_request',400);
 let value;try{value=await body(request,256);}catch{return error('invalid_request',400);}if(!exact(value,['status','revision'])||!STATUSES.includes(value.status)||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>=Number.MAX_SAFE_INTEGER)return error('invalid_request',400);
 try{const results=successful(await db.batch([
  db.prepare('INSERT INTO lead_status_audit (lead_id,actor_id,changed_at,from_status,to_status,from_revision) SELECT id,?,?,status,?,revision FROM leads WHERE id=? AND revision=? AND expires_at>?').bind(identity.userId,now,value.status,id,value.revision,now),
  db.prepare('UPDATE leads SET status=?,revision=revision+1 WHERE id=? AND revision=? AND expires_at>?').bind(value.status,id,value.revision,now),
  db.prepare('SELECT id,status,revision FROM leads WHERE id=? AND expires_at>?').bind(id,now)
 ]));const row=results[2].results?.[0];if(!row)return error('not_found',404);if(results[1].meta?.changes!==1)return error('revision_conflict',409);return reply({updated:true,id:row.id,status:row.status,revision:row.revision});}catch{return error('service_unavailable',503);}
}
export async function handleAdminStats(request,env,db,identity,now=Date.now()){
 const denied=ownerError(identity,env);if(denied)return denied;if(request.method!=='GET')return error('method_not_allowed',405);const q=new URL(request.url).searchParams,window=q.get('days')||'30';if([...q.keys()].some(k=>k!=='days')||q.getAll('days').length>1||!/^\d+$/.test(window)||+window<1||+window>90)return error('invalid_request',400);
 try{await purgeExpired(db,now);const results=successful(await db.batch([
  db.prepare('SELECT COUNT(DISTINCT session_id) AS count FROM lead_analytics_events WHERE occurred_at>=? AND expires_at>?').bind(now-(+window)*DAY,now),
  db.prepare('SELECT event_name,COUNT(DISTINCT session_id) AS count FROM lead_analytics_events WHERE occurred_at>=? AND expires_at>? GROUP BY event_name').bind(now-(+window)*DAY,now),
  db.prepare('SELECT day,event_name,COUNT(DISTINCT session_id) AS count FROM lead_analytics_events WHERE occurred_at>=? AND expires_at>? GROUP BY day,event_name ORDER BY day').bind(now-(+window)*DAY,now)
 ]));const counts=Object.fromEntries(EVENTS.map(e=>[e,0])),daily=new Map();for(const row of results[1].results)if(EVENTS.includes(row.event_name))counts[row.event_name]=row.count;for(const row of results[2].results){if(!daily.has(row.day))daily.set(row.day,Object.fromEntries(EVENTS.map(e=>[e,0])));if(EVENTS.includes(row.event_name))daily.get(row.day)[row.event_name]=row.count;}const cap=capabilities(env);return reply({windowDays:+window,retentionDays:days(env.ANALYTICS_RETENTION_DAYS,90),collectionEnabled:cap.leadEnabled,analyticsEnabled:cap.analyticsEnabled,emailEnabled:false,imagesEnabled:false,sessionCount:results[0].results[0].count,counts,byDay:[...daily].map(([day,counts])=>({day,counts})),meaning:'anonymous_session_stage_reach'});}catch{return error('service_unavailable',503);}
}
