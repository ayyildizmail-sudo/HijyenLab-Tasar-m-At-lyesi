/* Discovery is supplementary evidence. A web match never grants artwork approval. */
(function(root){'use strict';
function create({fetcher,encode,notify=()=>{},timeout=12000}){
 let active=null,capability=null;
 const attempted=new Set();
 function cancel(){active?.abort();active=null;}
 async function discover({identity,file,current,needed}){
  cancel();
  if(!needed||!identity||!current()||attempted.has(identity))return null;
  const controller=new AbortController();active=controller;
  const timer=setTimeout(()=>controller.abort(),timeout);
  const live=()=>active===controller&&!controller.signal.aborted&&current();
  try{
   if(capability===null){
    const response=await fetcher('/api/logo-source-search',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    if(!live())return null;
    if(!response.ok)return {status:'unavailable'};
    capability=(await response.json()).enabled===true;
   }
   if(!live())return null;
   if(!capability)return {status:'unconfigured'};
   const body=await encode(file);
   if(!live()||!body||body.size>1024*1024)return null;
   attempted.add(identity);
   if(attempted.size>16)attempted.delete(attempted.values().next().value);
   notify({status:'searching',identity});
   const response=await fetcher('/api/logo-source-search',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':body.type},body,signal:controller.signal});
   if(!live())return null;
   if(!response.ok){notify({status:'unavailable',identity});return {status:'unavailable'};}
   const data=await response.json();
   if(!live())return null;
   const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
   const matches=(Array.isArray(data.matches)?data.matches:[]).slice(0,10).map(m=>({image:https(m.image),source:https(m.source)})).filter(m=>m.image&&m.source);
   const result={status:matches.length?'candidates':'no_match',identity,verified:false,matches};
   notify(result);return result;
  }catch{if(active===controller&&current())notify({status:'unavailable',identity});return null;}
  finally{clearTimeout(timer);if(active===controller)active=null;}
 }
 return {discover,cancel};
}
const api={create};
if(typeof module!=='undefined')module.exports=api;else root.LogoSourceDiscovery=api;
})(typeof globalThis!=='undefined'?globalThis:this);
