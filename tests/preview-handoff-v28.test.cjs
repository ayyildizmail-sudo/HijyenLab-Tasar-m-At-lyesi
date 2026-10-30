const fs=require('fs'),assert=require('assert/strict'),app=fs.readFileSync('frontend/app.js','utf8'),html=fs.readFileSync('frontend/index.html','utf8');
assert(html.includes('Telefonla görüşme sonrası Aytuğ Bey baskı grafiğini hazırlayıp onayınıza sunacaktır.'));
assert(app.includes('Bu yalnız önizlemedir. Telefonla görüşme sonrası Aytuğ Bey baskı grafiğini hazırlar.'));
assert(html.includes('Bu demo sipariş, ödeme veya müşteri/teklif kaydı oluşturmaz.'));
assert(!/href=["']tel:/.test(html)); // no invented contact number or automatic phone submission
console.log('PASS Turkish preview/phone handoff without invented contact or durable-submission claim');
