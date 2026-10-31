// Server-owned final-transmission gate. No provider configured and no external requests.
import safety from '../frontend/content-safety.js';
export const POLICY_VERSION=safety.POLICY_VERSION;
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export async function contentRevision(value){const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
// Only server code may inject an adapter. Never construct one from request/approval fields.
// Adapter receives exact snapshot + SHA-256 revision; must assess ALL text/image/QR content.
export async function guardTransmission(value,{adapter=null,timeoutMs=5000}={}){
 const snapshot=JSON.parse(JSON.stringify(value));
 const fields={};
 function collect(item,path=''){if(typeof item==='string')fields[path]=item;else if(item&&typeof item==='object')for(const [key,val] of Object.entries(item))collect(val,path?path+'.'+key:key);}
 collect(snapshot);
 const local=safety.assess({fields,hasImages:!!snapshot.design?.images?.length,hasQr:!!snapshot.design?.qrEnabled});
 const revision=await contentRevision(snapshot);
 const deny=(state,reason)=>({allowed:false,state,reason,revision,policyVersion:POLICY_VERSION});
 if(local.state==='blocked')return deny('blocked',local.reason);
 if(local.state==='review_needed')return deny('review_needed',local.reason);
 if(!adapter||typeof adapter.assess!=='function')return deny('service_unavailable','context_service_unconfigured');
 let timer;
 const controller=new AbortController();
 try{
  const deadline=Number.isFinite(timeoutMs)?Math.min(5000,Math.max(1,timeoutMs)):5000;
  const reviewed=await Promise.race([Promise.resolve().then(()=>adapter.assess({content:snapshot,revision,policyVersion:POLICY_VERSION,signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},deadline);})]);
  if(!reviewed||reviewed.revision!==revision||reviewed.policyVersion!==POLICY_VERSION)return deny('not_checked','stale_or_invalid_review');
  if(reviewed.state==='blocked'||reviewed.state==='review_needed')return deny(reviewed.state,'context_review');
  if(reviewed.state!=='approved')return deny('not_checked','incomplete_review');
  return {allowed:true,state:'approved',revision,policyVersion:POLICY_VERSION,legalApproval:false};
 }catch{return deny('service_unavailable','context_service_unavailable');}finally{clearTimeout(timer);}
}
