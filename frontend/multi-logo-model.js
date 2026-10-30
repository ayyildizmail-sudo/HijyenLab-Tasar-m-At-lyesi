/* Supplemental source state only. Primary/composite artwork remains one asset. */
(function(root){'use strict';
function create(){
 const sides={front:[],rear:[]},epochs={front:0,rear:0};let sequence=0,revision=0;
 function side(key){if(!Object.hasOwn(sides,key))throw Error('Geçersiz yüz.');return sides[key];}
 function begin(key,file,options={}){const items=side(key);let id=options.id;if(!id){do{id=`logo-${++sequence}`;}while(['front','rear'].some(s=>sides[s].some(p=>p.id===id)));}const index=items.findIndex(p=>p.id===id),scale=options.opticalScale??1;
  if(typeof id!=='string'||!id||id.length>128||!Number.isFinite(scale)||scale<.75||scale>1.25)throw Error('Logo bilgileri geçersiz.');
  if(index<0&&items.length>=3)throw Error('Bir yüzde en fazla dört logo olabilir.');
  const item=Object.freeze({id,file,name:file.name,opticalScale:scale,version:++revision,status:'pending'}),token={side:key,id,version:item.version,epoch:epochs[key]};
  sides[key]=index<0?[...items,item]:items.map((p,i)=>i===index?item:p);return token;
 }
 function current(token){return !!token&&epochs[token.side]===token.epoch&&side(token.side).some(p=>p.id===token.id&&p.version===token.version);}
 function finish(token,values){if(!current(token))return false;sides[token.side]=side(token.side).map(p=>p.id===token.id?Object.freeze({...p,...values,id:p.id,file:p.file,name:p.name,opticalScale:p.opticalScale,version:++revision}):p);return true;}
 function remove(key,id){const items=side(key);sides[key]=items.filter(p=>p.id!==id);revision++;}
 function move(key,id,delta){const items=side(key).slice(),i=items.findIndex(p=>p.id===id),j=i+delta;if(i<0||j<0||j>=items.length)return false;[items[i],items[j]]=[items[j],items[i]];sides[key]=items;revision++;return true;}
 function scale(key,id,value){if(!Number.isFinite(value)||value<.75||value>1.25)throw Error('Logo boyutu geçersiz.');sides[key]=side(key).map(p=>p.id===id?Object.freeze({...p,opticalScale:value}):p);revision++;}
 function reset(key){side(key);epochs[key]++;sides[key]=[];revision++;}
 function cancelPending(key){side(key);epochs[key]++;sides[key]=side(key).map(p=>p.status==='pending'?Object.freeze({...p,version:++revision,status:'failed',error:'Yükleme durduruldu; dosyanızı yeniden seçebilirsiniz.'}):p);}
 function restore(key,items){if(!Array.isArray(items)||items.length>3)throw Error('Logo geçmişi geçersiz.');reset(key);sides[key]=items.map(p=>Object.freeze({...p,version:++revision,...(p.status==='pending'?{status:'failed',error:'Bu yükleme tamamlanmadı; dosyayı yeniden seçin.'}:{})}));}
 function list(key){return side(key).slice();}
 function fingerprint(key){return side(key).map(p=>[p.id,p.version,p.identity||null,p.status,p.opticalScale]);}
 return {begin,current,finish,remove,move,scale,reset,cancelPending,restore,list,fingerprint};
}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MultiLogoModel=api;
})(globalThis);
