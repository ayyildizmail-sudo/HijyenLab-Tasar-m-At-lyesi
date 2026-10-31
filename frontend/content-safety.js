/* Local business-policy hints only. No network, OCR, legal verdict or production approval. */
(function(root){'use strict';
const POLICY_VERSION='content-policy-local-v1';
const STATES=Object.freeze(['clear_local','blocked','review_needed','not_checked','service_unavailable']);
// Deliberately small, high-specificity seed phrases. Not a complete language dictionary.
const PHRASES=Object.freeze(['siktir git','orospu çocuğu','fuck you','motherfucker','son of a bitch','fick dich','hurensohn','va te faire foutre','hijo de puta','vaffanculo','сука блядь','иди нахуй','ابن القحبة']);
function normalize(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/\u0130/g,'i').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').replace(/i\u0307/g,'i').replace(/\s+/gu,' ').trim();}
function letters(value){return normalize(value).replace(/[^\p{L}\p{N}]/gu,'');}
const exact=new Set(PHRASES.map(letters));
function result(state,reason,field){return {state,reason,field:field||null,policyVersion:POLICY_VERSION,legalApproval:false,serverApproval:false};}
function checkText(value,field){
 if(typeof value!=='string')return result('not_checked','missing_text',field);
 const normalized=normalize(value);
 if(!normalized)return result('clear_local','no_local_match',field);
 // Entire-field comparison avoids Scunthorpe/brand substring false positives.
 // Separator/zero-width obfuscation of an otherwise exact phrase is covered.
 if(exact.has(letters(normalized)))return result('blocked','explicit_abuse_phrase',field);
 // Longer contexts may quote, condemn, or report abuse. Never auto-convict them.
 for(const phrase of PHRASES){const p=normalize(phrase),at=normalized.indexOf(p);if(at>=0){const before=normalized.slice(0,at),after=normalized.slice(at+p.length);if((!before||!/[\p{L}\p{N}]$/u.test(before))&&(!after||! /^[\p{L}\p{N}]/u.test(after)))return result('review_needed','context_required',field);}}
 return result('clear_local','no_local_match',field);
}
function assess(input){
 if(!input||typeof input!=='object')return result('not_checked','missing_input');
 const fields=input.fields&&typeof input.fields==='object'?input.fields:{};
 let pending=null;
 for(const [name,value] of Object.entries(fields)){const checked=checkText(value,name);if(checked.state==='blocked')return checked;if(checked.state==='review_needed')pending=checked;}
 if(pending)return pending;
 // Image presence/poor OCR is NOT unsafe, nor a reason to interrupt preview.
 if(input.hasImages||input.hasQr)return result('not_checked',input.hasImages?'image_context_unconfigured':'link_context_unconfigured');
 return result('clear_local','no_local_match');
}
function assessPayload(payload){
 const fields={};
 function collect(value,path){if(typeof value==='string')fields[path]=value;else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value))collect(item,path?path+'.'+key:key);}
 collect(payload,'');return assess({fields});
}
function message(check,stage='preview'){
 if(check?.state==='blocked')return 'Bu ifade içerik kurallarımıza uygun değil. Lütfen metni düzenleyin; diğer seçimleriniz korunur.';
 if(check?.state==='review_needed')return stage==='preview'?'':'Bu içerik için ek kontrol gerekiyor. Tasarımınızı düzenleyebilir veya destek isteyebilirsiniz.';
 if(stage==='preview')return '';
 return 'İçerik kontrolü henüz tamamlanmadı. Tasarımınızı düzenlemeye devam edebilirsiniz; şu anda gönderim yapılmadı.';
}
const api=Object.freeze({POLICY_VERSION,STATES,normalize,checkText,assess,assessPayload,message});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HijyenContentSafety=api;
})(typeof globalThis!=='undefined'?globalThis:this);
