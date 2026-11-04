/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const app=fs.readFileSync('frontend/app.js','utf8'),unprinted=fs.readFileSync('frontend/unprinted-ui.js','utf8'),reference=fs.readFileSync('frontend/reference-recovery.js','utf8');
const Catalog=require('../frontend/product-catalog.js');
function element(){return {value:'',children:[],hidden:false,append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},closest(){return this;},classList:{toggle(){},remove(){}}};}
function modeHarness(){
 const nodes={},$=id=>nodes[id]||(nodes[id]=element());let mode='printed';
 const c={$ ,state:{requestedQuantity:null},productRules:()=>Catalog.rules('BM12'),printedDesignHeading:'Design',printedQuoteNote:'Quote',printedProductReview:'Review',modePicker:{querySelectorAll:()=>[]},cartonLabel:element(),cartonInput:element(),document:{querySelector:$,querySelectorAll:()=>[],body:{dataset:{},classList:{toggle(){}}}},isUnprinted:()=>mode==='unprinted',isDeclaredQuote:()=>mode==='declared',isReferencePreview:()=>mode==='reference',money:String,cartonContentLabel:()=>'',hide(){},eligible:()=>false};
 vm.createContext(c);vm.runInContext(unprinted.slice(unprinted.indexOf('function syncUnprintedUI(){'),unprinted.indexOf('async function setPrintMode')),c);
 // The reference controller also writes the main label after navigation.
 Object.assign(c,{referencePreviewLabel:()=>'',referenceGroundLabel:()=>'',box:element(),step:1,current:()=>false});
 vm.runInContext(reference.slice(reference.indexOf('function syncSummaryTitle(){'),reference.indexOf('async function accept(')),c);
 return {c,$,mode:value=>{mode=value;}};
}
test('main button survives refresh/navigation and names the next step in every mode',()=>{
 const h=modeHarness();
 for(const mode of ['printed','declared','unprinted','reference','printed','unprinted']){
  h.mode(mode);const expected=mode==='printed'?/arka yüze geç/:mode==='unprinted'?/Fiyatı gör/:/Koku seçimine geç/;
  h.c.syncUnprintedUI();assert.match(h.$('next').textContent,expected,mode+' after refresh');
  h.c.sync();assert.match(h.$('next').textContent,expected,mode+' after navigation');
 }
 assert.match(app,/approveInk\.textContent='Bu görünümü onayla · Arka yüze geç →'/);
 // Declaration/reference have no invented design approval; they call the existing fragrance step.
 assert.match(app,/function continueDeclaredQuote\(\).*return showFragrance\(\);/);
 assert.match(reference,/function continuePrice\(\).*\bshowFragrance\(\)/);
});
function priceHarness(product,ground,inks){
 if(product==='OSHIBORI'){const FX=require('../frontend/oshibori-fx.js'),now=new Date(),date=FX.today(now);FX.accept({currency:'USD',baseCurrency:'TRY',rateType:'ForexSelling',rate:42.1234,rateDate:date,requestedDate:date,fetchedAt:now.toISOString(),source:'TCMB',sourceUrl:'https://www.tcmb.gov.tr/kurlar/today.xml',isPreviousPublication:false});}
 const nodes={},$=id=>nodes[id]||(nodes[id]=element());
 const c={$ ,ProductCatalog:Catalog,selectedProductId:product,state:{requestedQuantity:null,bg:ground,bgPantone:''},isUnprinted:()=>false,isDeclaredQuote:()=>false,isReferencePreview:()=>false,status(){},document:{createElement:element,querySelectorAll:()=>[$('vatNote')],querySelector:$}};
 vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('const VAT_EXCLUSION_NOTE'),app.indexOf('const $=')),c);
 vm.runInContext(app.slice(app.indexOf('function pricing('),app.indexOf("$('province').onchange")),c);
 vm.runInContext(app.slice(app.indexOf('function syncCommercialLabels(){'),app.indexOf('function pricing(')),c);
 $('inks').value=inks;$('province').value='Muğla';$('district').value='Bodrum';$('cliche').value='new';c.calculateRaw();c.syncCommercialLabels();
 return {c,$,latest:()=>vm.runInContext('latest',c),rows:()=>$('breakdown').children};
}
for(const product of Catalog.items)for(const ground of ['#ffffff','#102f59'])test(`${product.id} price breakdown already spells out quantity, unit price, colors/plate, shipping and VAT`,()=>{
 const h=priceHarness(product.id,ground,'2'),p=h.latest(),rows=h.rows(),rules=product.priceRules;
 const quantity=ground==='#ffffff'?rules.minimum.white:rules.minimum.colored,unit=ground==='#ffffff'?rules.whiteUnitKurus:rules.coloredUnitKurus;
 assert(p);assert.equal(rows.length,4);assert.equal(rows[0].children[0].textContent,'Ürün bedeli');
 const money=n=>(n/100).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL';
 assert.equal(rows[0].children[0].children[0].textContent,quantity.toLocaleString('tr-TR')+' × '+(product.id==='OSHIBORI'?rules.fxSnapshot.rate.toLocaleString('tr-TR',{maximumFractionDigits:6})+' TL':money(unit)));
 assert.equal(rows[0].children[1].textContent,money(Math.round(quantity*unit)));
 assert.equal(rows[1].children[0].textContent,'Klişe bedeli');assert.match(rows[1].children[0].children[0].textContent,/2 renk × /);assert.equal(rows[1].children[1].textContent,money(2*rules.platePerInkKurus));
 assert.equal(rows[2].children[0].textContent,'Kargo');assert.match(rows[2].children[0].children[0].textContent,/Bodrum/);assert.equal(rows[2].children[1].textContent,money(0));
 assert.equal(rows[3].children[0].textContent,'Toplam (KDV hariç)');assert.equal(h.$('vatNote').textContent,`Fiyatlara %${rules.vatPercent} KDV dahil değildir.`);
 h.$('province').value='İstanbul';h.$('district').value='';h.c.calculateRaw();assert.equal(h.latest().shipping,Math.ceil(quantity/rules.unitsPerBox)*rules.freightPerBoxKurus);
 h.$('inks').value='';h.c.calculateRaw();assert.equal(h.rows()[1].children[1].textContent,'Belirlenecek');assert.equal(h.rows()[3].children[0].textContent,'Ara toplam (KDV ve klişe hariç)');
});
