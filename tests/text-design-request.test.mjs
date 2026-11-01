import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validateLead} from '../server/lead-service.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),TextDesign=require('../frontend/text-design.js'),Safety=require('../frontend/content-safety.js');
function payload(style='bold') {return {requestId:'a91320aa-8dc0-4233-a039-6bfabb233def',kind:'complete',printMode:'printed',consent:{accepted:true,version:'lead-v1'},productId:'BM12',quantity:5200,fragrance:'lemon',contact:{companyName:'Örnek',contactName:'Şükrü Işık',phone:'05001234567',email:'',province:'İstanbul',district:'Kadıköy'},design:{background:'#ffffff',frontInkColors:['#102f59'],frontText:'Şükrü Işık Çığ Özen',frontFont:style==='classic'?'serif':'sans-serif',frontTextStyle:style,rearText:'',rearInkColor:'',qrEnabled:false,qrUrl:''}};}
test('strict optional front text style preserves all three looks and legacy lead shape',()=>{
 for(const style of ['simple','classic','bold'])assert(validateLead(payload(style)));
 const legacy=payload();delete legacy.design.frontTextStyle;assert(validateLead(legacy));
 for(const change of [p=>p.design.frontTextStyle='automatic-ai-logo',p=>p.design.frontFont='cursive',p=>p.design.frontText='',p=>p.design.frontText='x'.repeat(241),p=>p.design.sourcePNG='data:image/png;base64,private',p=>p.printMode='unprinted']){const p=payload();change(p);assert.equal(validateLead(p),false);}
});
test('actual lead context sends exact generated text/style/color, never raster/descriptor/source hash',()=>{
 const source=fs.readFileSync('frontend/app.js','utf8'),start=source.indexOf('globalThis.getHijyenLabLeadRequestContext=function(kind)'),end=source.indexOf('// Measurement context',start);
 const c={state:{logo:'data:image/png;base64,private',text:'',font:'sans-serif',textDesign:TextDesign.descriptor('Şükrü Işık Çığ Özen','bold','BM12'),bg:'#ffffff',requestedQuantity:5200},TextDesign,isUnprinted:()=>false,getHijyenLabSummaryHelpContext:()=>({quantity:5200}),leadValues:()=>({customer:'Örnek',contact:'Şükrü Işık',phone:'05001234567',province:'İstanbul',district:'Kadıköy'}),fragranceSnapshot:()=>({id:'lemon'}),currentProduct:()=>({id:'BM12'}),rearContent:{qrEnabled:false,qrUrl:''},Number};vm.createContext(c);vm.runInContext(source.slice(start,end),c);
 const result=c.getHijyenLabLeadRequestContext('complete');assert.equal(result.design.frontText,c.state.textDesign.text);assert.equal(result.design.frontTextStyle,'bold');assert.equal(result.design.frontFont,'sans-serif');assert.equal(result.design.frontInkColors[0],TextDesign.INK);const json=JSON.stringify(result);assert(!json.includes('base64'));assert(!json.includes('textDesign'));assert(!json.includes('sha256'));assert(validateLead({...JSON.parse(json),requestId:payload().requestId,consent:payload().consent}));
 c.state.textDesign={...c.state.textDesign,text:'fuck you'};assert.equal(Safety.assessPayload(c.getHijyenLabLeadRequestContext('complete')).state,'blocked');
});
