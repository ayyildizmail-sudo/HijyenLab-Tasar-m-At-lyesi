const fs=require('fs'),assert=require('assert/strict'),app=fs.readFileSync('frontend/app.js','utf8'),html=fs.readFileSync('frontend/index.html','utf8');
assert(html.includes('Baskı grafiği sipariş öncesinde hazırlanıp onayınıza sunulur.'));
assert(app.includes('Baskı grafiği ve kesin fiyat, sipariş öncesinde onayınıza sunulur.'));
assert(html.includes('Bu uygulama sipariş veya ödeme almaz; müşteri talebi ancak ayrıca açılan talep formunda açık izninizle gönderilir.'));
assert(html.includes('Yalnızca bu ekranda önizleme oluşturulur; hiçbir yere gönderilmez.'));
assert(!html.includes('Bu demo sipariş, ödeme veya müşteri/teklif kaydı oluşturmaz.'));
const visitor=fs.readFileSync('frontend/visitor-requests.js','utf8');
assert(visitor.includes('!flags.leadEnabled'));
assert(visitor.includes("!$('requestConsent').checked"));
assert(!/href=["']tel:/.test(html)); // no invented contact number or automatic phone submission
console.log('PASS Turkish preview/phone handoff without invented contact or durable-submission claim');

assert(!app.includes("Aytuğ")&&!html.includes("Aytuğ"));assert(!app.includes("Fiyat kaynağı:"));

assert.ok(!/kaynak fiyat|Kaynak teslim süresi|Fiyat kaynağı|Aytuğ|AYTUĞ/.test(html));
