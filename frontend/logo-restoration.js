/* Returns only complete current-source results; never grants design approval. */
(function(root){'use strict';
function create({fetcher,notify=()=>{}}){
 let active=null;
 function cancel(){active?.abort();active=null;}
 async function restore({file,identity,current}){
  cancel();
  if(!current()||!['image/png','image/jpeg'].includes(file.type))return null;
  const controller=new AbortController();active=controller;
  const timer=setTimeout(()=>controller.abort(),125000);
  const live=()=>active===controller&&!controller.signal.aborted&&current();
  try{
   const capability=await fetcher('/api/logo-restoration',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!live()||!capability.ok||!(await capability.json()).enabled)return null;
   if(!live())return null;
   notify('restoring');
   const response=await fetcher('/api/logo-restoration',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':file.type,'x-source-sha256':identity.sha256},body:file,signal:controller.signal});
   if(!live()||!response.ok)return null;
   if(response.headers.get('x-source-sha256')!==identity.sha256||response.headers.get('x-artwork-method')!=='ai-logo-reconstruction')return null;
   const blob=await response.blob();
   if(!live()||blob.type!=='image/png'||blob.size>18*1024*1024)return null;
   return {blob,method:'ai-logo-reconstruction',contentReviewRequired:true};
  }catch{return null;}
  finally{clearTimeout(timer);if(active===controller)active=null;}
 }
 return {restore,cancel};
}
if(typeof module!=='undefined')module.exports={create};else root.LogoRestoration={create};
})(typeof globalThis!=='undefined'?globalThis:this);
