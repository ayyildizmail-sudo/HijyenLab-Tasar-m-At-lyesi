/* Delivery location validation only; no price or freight-rate policy.
 * Province names verified 2026-10-30 against Ministry's full 81-province directory:
 * https://www.aile.gov.tr/sgbd/istatistik-sayfalari/il-verileri/
 * Muğla district names verified against official district directorate list:
 * https://mugla.tarimorman.gov.tr/Menu/69/
 * No external lookup occurs in the customer application.
 */
(function(root){'use strict';
const provinces=Object.freeze(['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce']);
const muglaDistricts=Object.freeze(['Bodrum','Dalaman','Datça','Fethiye','Kavaklıdere','Köyceğiz','Marmaris','Menteşe','Milas','Ortaca','Seydikemer','Ula','Yatağan']);
function error(province,district){if(!provinces.includes(province))return ['province','Lütfen teslimat ilinizi seçin.'];if(province==='Muğla'&&!muglaDistricts.includes(district))return ['district','Lütfen Muğla için teslimat ilçenizi seçin.'];return null;}
function label(province,district){return province==='Muğla'&&muglaDistricts.includes(district)?province+' / '+district:provinces.includes(province)?province:'';}
function isBodrum(province,district){return province==='Muğla'&&district==='Bodrum';}
const api=Object.freeze({provinces,muglaDistricts,error,label,isBodrum});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShippingLocation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
