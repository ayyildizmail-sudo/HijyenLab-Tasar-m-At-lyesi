/* TCMB USD selling snapshot. No saved rate, fallback, or mixed-currency arithmetic. */
(function(root){'use strict';
let snapshot=null,pending=null;
function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function valid(value,now=new Date()){
 if(!value||value.currency!=='USD'||value.baseCurrency!=='TRY'||value.rateType!=='ForexSelling'||value.source!=='TCMB'||value.sourceUrl!=='https://www.tcmb.gov.tr/kurlar/today.xml'||!Number.isFinite(value.rate)||value.rate<=0||value.rate>100000||value.requestedDate!==today(now))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value.rateDate)||value.rateDate>value.requestedDate||!Number.isFinite(Date.parse(value.fetchedAt))||today(new Date(value.fetchedAt))!==value.requestedDate||Date.parse(value.fetchedAt)>now.getTime()+60000)return false;
 const fetched=Date.parse(value.fetchedAt);if(now.getTime()-fetched>300000)return false;const cutoff=Date.parse(value.requestedDate+'T15:30:00+03:00');if(fetched<cutoff&&now.getTime()>=cutoff)return false;
 if(!Number.isFinite(Date.parse(value.rateDate+'T00:00:00Z')))return false;
 if(new Date(value.rateDate+'T00:00:00Z').toISOString().slice(0,10)!==value.rateDate)return false;
 const age=(Date.parse(value.requestedDate)-Date.parse(value.rateDate))/86400000;
 return age>=0&&age<=10&&value.isPreviousPublication===(value.rateDate<value.requestedDate);
}
function get(){return valid(snapshot)?snapshot:null;}
function accept(value){if(!valid(value))throw Error('Güncel TCMB döviz satış kuru doğrulanamadı.');snapshot=Object.freeze({...value});return snapshot;}
async function request(){if(get())return get();if(pending)return pending;pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('/api/exchange-rate',{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!response.ok)throw Error('TCMB kuru alınamadı. Fiyat oluşturulmadı; yeniden deneyin.');return accept(await response.json());}finally{clearTimeout(timer);}})();try{return await pending;}finally{pending=null;}}
function note(value){return value?.source==='TCMB'&&Number.isFinite(value.rate)?'Birim: 1 USD + KDV · TCMB döviz satış: '+value.rate.toLocaleString('tr-TR',{minimumFractionDigits:4,maximumFractionDigits:6})+' TL · Kur tarihi: '+value.rateDate+(value.isPreviousPublication?' (son yayımlanan kur)':''):'';}
const api=Object.freeze({today,valid,get,accept,request,note});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OshiboriFX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
