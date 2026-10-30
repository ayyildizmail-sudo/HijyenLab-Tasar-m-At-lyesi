const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('frontend/app.js','utf8'),html=fs.readFileSync('frontend/index.html','utf8'),cases=[];
function check(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(e){cases.push({name,status:'FAIL',error:e.message});}}
const model={};vm.createContext(model);vm.runInContext(source.slice(source.indexOf('function pricing('),source.indexOf('\nconst money=')),model);
const white=model.pricing(5200,'#ffffff','İstanbul','Kadıköy','new',1),colored=model.pricing(10000,'#102f59','İstanbul','Kadıköy','new',1),bodrum=model.pricing(5200,'#ffffff','Muğla','Bodrum','new',1);
function setup(price,inks='1'){
 const elements={},values={qty:String(price===colored?10000:5200),inks,province:'İstanbul',district:'Kadıköy',cliche:'new',customerName:'Deneme İşletmesi',contactName:'Test Yetkilisi',contactPhone:'05000000001'};
 const el=id=>elements[id]||(elements[id]={value:values[id]||'',children:[],replaceChildren(){this.children=[];},append(...nodes){this.children.push(...nodes);},removeAttribute(){}});
 const drawn=[],cx=new Proxy({getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4).fill(255)};},fillText(text,...position){drawn.push({text,position});}},{get(t,k){return k in t?t[k]:()=>{};}});
 const context={QuoteLayout:require('../frontend/quote-layout.js'),makeQuoteSnapshot:()=>({price:context.latest,rules:model.productRules()}),processingSession:{quoteToken:()=>({}),isQuoteCurrent:()=>true},state:{bgPantone:'',textPantone:''},latest:price,$:el,document:{createElement(type){if(type==='canvas')return{getContext:()=>cx,toDataURL:()=> 'data:image/jpeg;test'};return{children:[],append(...nodes){this.children.push(...nodes);}}; } },designIssue:()=>false,showDesignIssue(){},validateLead:()=>true,leadFingerprint:()=> 'same',loadImage:async()=>({width:1600,height:850}),imageData:()=> 'image',money:v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(v/100),status(){},invalidateQuote(){context.invalidated=true;},syncQuantity:()=>inks==='2'?10000:5200,effectiveBackground:()=>price===colored?'#102f59':'#ffffff',pricing:model.pricing,productRules:model.productRules};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const VAT_EXCLUSION_NOTE'),source.indexOf('const $=')),context);
 vm.runInContext(source.slice(source.indexOf('async function renderQuote(){'),source.indexOf('function preparePhotoCutout(')),context);
 vm.runInContext(source.slice(source.indexOf('function calculateRaw(){'),source.indexOf("\n$('province')")),context);
 return{context,el,drawn};
}
(async()=>{
 check('Internal white tax-inclusive arithmetic preserved',()=>{assert.equal(white.subtotal,1868000);assert.equal(white.tax,373600);assert.equal(white.total,2241600);});
 check('Internal colored tax arithmetic preserved',()=>{assert.equal(colored.subtotal,3900000);assert.equal(colored.total,4680000);});
 check('Bodrum shipping and exclusive subtotal unchanged',()=>{assert.equal(bodrum.shipping,0);assert.equal(bodrum.subtotal,1608000);});
 for(const [name,price]of [['white',white],['colored',colored]]){
  const h=setup(price);await h.context.renderQuote();const texts=h.drawn.map(x=>x.text);
  check(`${name} JPEG keeps verified legal identity and contact details`,()=>{assert.ok(texts.includes('İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.'));assert.ok(texts.includes('info@hijyenlab.com · www.hijyenlab.com'));});
  check(`${name} actual JPEG renderer shows exclusive subtotal`,()=>{assert.ok(texts.includes(h.context.money(price.subtotal)));assert.ok(!texts.includes(h.context.money(price.total)));});
  check(`${name} actual JPEG renderer includes rule-based carton content`,()=>assert.ok(texts.includes('Koli içi: 400 adet · '+price.boxes+' koli')));
  check(`${name} actual JPEG renderer labels exclusive and exact note`,()=>{assert.ok(texts.includes('KDV hariç tahmini toplam'));assert.ok(texts.includes('Fiyatlara %20 KDV dahil değildir.'));assert.ok(!texts.includes('KDV (%20)'));});
 }
 const failed=setup(white);failed.context.loadImage=async()=>{throw Error('asset unavailable');};await failed.context.renderQuote();check('Missing original logo prevents unbranded JPEG, never silently replaces logo',()=>{assert.equal(failed.context.invalidated,true);assert.ok(!failed.el('quoteImage').src);assert.ok(!failed.drawn.some(x=>x.text==='HijyenLab'));});
 const unknown={...white,plateUnknown:true,plate:0,subtotal:white.subtotal-white.plate};unknown.tax=Math.round(unknown.subtotal*.2);unknown.total=unknown.subtotal+unknown.tax;
 const h=setup(unknown,'');await h.context.renderQuote();check('Unknown cliché remains explicit, not zero-cost promise',()=>{const texts=h.drawn.map(x=>x.text);assert.ok(texts.includes('KDV ve klişe hariç tahmini toplam'));assert.ok(texts.includes('Renk ayrımı belirsiz — toplama dahil değil'));assert.ok(texts.includes(h.context.money(1768000)));});
 const ui=setup(white);ui.context.calculateRaw();const rows=ui.el('breakdown').children;
 check('Actual price DOM rows exclude tax amount',()=>{const labels=rows.map(r=>r.children[0].textContent);assert.ok(!labels.includes('KDV (%20)'));assert.ok(labels.includes('KDV hariç tahmini toplam'));assert.equal(rows.at(-1).children[1].textContent,ui.context.money(1868000));});
 check('Price panel and notes carry exact exclusion sentence',()=>assert.equal((html.match(/Fiyatlara %20 KDV dahil değildir\./g)||[]).length,2));
 check('Review uses subtotal and same exact note',()=>{const go=source.slice(source.indexOf('function go(n)'),source.indexOf("\n$('useMinimum')"));assert.ok(go.includes('money(latest.subtotal)'));assert.ok(go.includes('VAT_EXCLUSION_NOTE'));assert.ok(!go.includes('money(latest.total)'));});
 check('No invoiceless toggle introduced',()=>assert.ok(!html.includes('value="faturasiz"')&&!source.includes('invoiceFree')));
 fs.writeFileSync('tests/vat-display-results.json',JSON.stringify(cases,null,2));console.log(cases);if(cases.some(x=>x.status==='FAIL'))process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
