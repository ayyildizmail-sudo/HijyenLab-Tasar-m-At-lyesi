/* Pricing basis only: never edits source pixels or claims ink/vector extraction. */
(function(root){'use strict';
function classify(data,mask=null){let count=0,colored=0,neutral=0,bright=0,dark=0;for(let n=0;n<data.length/4;n++){if(mask&&!mask[n])continue;const j=n*4;if(data[j+3]<240)continue;const r=data[j],g=data[j+1],b=data[j+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);count++;if(hi-lo>35)colored++;if(hi-lo<32&&hi>110)neutral++;if(lo>185&&hi-lo<35)bright++;if(hi<90)dark++;}if(count<30)return'unknown';if(colored/count>.55||dark/count>.65)return'color';if(neutral/count>.72&&bright/count>.15&&colored/count<.15)return'white';return'unknown';}
function agree(results){return results.length&&results.every(x=>x===results[0]&&x!=='unknown')?results[0]:'unknown';}
const api={classify,agree};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QuoteBasis=api;
})(typeof window!=='undefined'?window:globalThis);
