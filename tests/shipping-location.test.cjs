'use strict';const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),S=require('../frontend/shipping-location.js');
assert.equal(S.provinces.length,81);assert.equal(new Set(S.provinces).size,81);assert.equal(S.muglaDistricts.length,13);assert.equal(new Set(S.muglaDistricts).size,13);assert.deepEqual(S.muglaDistricts,['Bodrum','Dalaman','Datça','Fethiye','Kavaklıdere','Köyceğiz','Marmaris','Menteşe','Milas','Ortaca','Seydikemer','Ula','Yatağan']);
for(const p of S.provinces.filter(p=>p!=='Muğla'))for(const d of ['',undefined,'Bodrum','obsolete district']){assert.equal(S.error(p,d),null);assert.equal(S.label(p,d),p);assert.equal(S.isBodrum(p,d),false);}
for(const d of S.muglaDistricts){assert.equal(S.error('Muğla',d),null);assert.equal(S.label('Muğla',d),'Muğla / '+d);assert.equal(S.isBodrum('Muğla',d),d==='Bodrum');}
for(const d of ['',undefined,null,'bodrum','Bodrum ','İstanbul','Merkez']){assert.equal(S.error('Muğla',d)[0],'district');assert.equal(S.isBodrum('Muğla',d),false);}
for(const p of ['',undefined,null,'Mugla','muğla','Muğla ','Atlantis']){assert.equal(S.error(p,'Bodrum')[0],'province');assert.equal(S.isBodrum(p,'Bodrum'),false);assert.equal(S.label(p,'Bodrum'),'');}
assert.throws(()=>S.provinces.push('X'),TypeError);assert.throws(()=>{S.muglaDistricts[0]='X';},TypeError);assert(Object.isFrozen(S));
const browser={};vm.createContext(browser);vm.runInContext(fs.readFileSync('frontend/shipping-location.js','utf8'),browser);assert.equal(browser.ShippingLocation.provinces.length,81);assert.equal(browser.ShippingLocation.isBodrum('Muğla','Bodrum'),true);
console.log('PASS shipping location: 81 provinces, 13 Muğla districts, optional non-Muğla district, strict Bodrum, required valid Muğla district, immutable arrays and browser UMD');
