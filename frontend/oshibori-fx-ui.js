/* Fetch only on explicit entry to pricing/retry; never on contact-field edits. */
const oshiboriRatePanel=document.createElement('div');
oshiboriRatePanel.id='oshiboriRatePanel';oshiboriRatePanel.className='fragrancePriceSummary oshiboriRateSummary';oshiboriRatePanel.hidden=true;
const oshiboriRateText=document.createElement('p'),oshiboriRateRetry=document.createElement('button');
oshiboriRateText.setAttribute('role','status');oshiboriRateRetry.type='button';oshiboriRateRetry.className='outline';oshiboriRateRetry.textContent='TCMB kurunu yeniden dene';
oshiboriRatePanel.append(oshiboriRateText,oshiboriRateRetry);$('pricing').prepend(oshiboriRatePanel);
let oshiboriRateLoading=false;
function syncOshiboriRate(){const active=globalThis.selectedProductId==='OSHIBORI';oshiboriRatePanel.hidden=!active;if(!active)return;const rate=OshiboriFX.get();oshiboriRateText.textContent=rate?OshiboriFX.note(rate)+' · Ürün satırı toplamı kuruşa yuvarlanır.':oshiboriRateLoading?'TCMB döviz satış kuru alınıyor…':'Güncel TCMB kuru alınmadan fiyat hesaplanmaz.';oshiboriRateRetry.hidden=!!rate;oshiboriRateRetry.disabled=oshiboriRateLoading;}
async function ensureOshiboriRate(){if(globalThis.selectedProductId!=='OSHIBORI'||oshiboriRateLoading)return;syncOshiboriRate();if(OshiboriFX.get())return;oshiboriRateLoading=true;syncOshiboriRate();try{await OshiboriFX.request();if(globalThis.selectedProductId==='OSHIBORI'){invalidateQuote();latest=null;syncCommercialLabels();calculate();}}catch(error){if(globalThis.selectedProductId==='OSHIBORI'){latest=null;invalidateQuote();$('breakdown').textContent=error.message;}}finally{oshiboriRateLoading=false;syncOshiboriRate();}}
oshiboriRateRetry.onclick=()=>ensureOshiboriRate();
syncOshiboriRate();
