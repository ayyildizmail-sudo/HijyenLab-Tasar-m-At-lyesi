/* Keep source coverage exactly once. Material affects RGB, never the ink alpha. */
(function(root){'use strict';
function shade(ink,material,width,height,clip={left:0,right:width}){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||ink.length!==width*height*4||material.length!==ink.length)throw Error('Print raster dimensions mismatch');const out=new Uint8ClampedArray(ink.length);for(let i=0;i<ink.length;i+=4){const x=(i/4)%width;if(x<clip.left||x>=clip.right)continue;const a=ink[i+3]*material[i+3]/255;if(!a)continue;out[i]=ink[i]*material[i]/255;out[i+1]=ink[i+1]*material[i+1]/255;out[i+2]=ink[i+2]*material[i+2]/255;out[i+3]=a;}return out;}
const api={shade};if(typeof module!=='undefined')module.exports=api;else root.PrintRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this);
