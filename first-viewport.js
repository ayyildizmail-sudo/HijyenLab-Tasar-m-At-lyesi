/* Opening composition only: keep original controls, rendering, values and event handlers. */
(function(root){
 'use strict';
 const MIN_CANVAS_HEIGHT=100,MAX_CANVAS_HEIGHT=320,CLEARANCE=12;
 function canvasLimit(viewportHeight,canvasTop,afterCanvas,fixedFooterHeight=0){
  if(![viewportHeight,canvasTop,afterCanvas,fixedFooterHeight].every(Number.isFinite)||viewportHeight<=0)return MAX_CANVAS_HEIGHT;
  return Math.max(MIN_CANVAS_HEIGHT,Math.min(MAX_CANVAS_HEIGHT,Math.floor(viewportHeight-canvasTop-afterCanvas-fixedFooterHeight-CLEARANCE)));
 }
 function mount(doc){
  const panel=doc.getElementById('openingExamples'),context=doc.getElementById('journeyProductContext'),main=doc.querySelector('main'),design=doc.getElementById('design');
  if(!panel||!context||!main||!design||panel.dataset.firstViewportMounted==='true')return null;
  const canvas=panel.querySelector('canvas');if(!canvas)return null;
  panel.dataset.firstViewportMounted='true';
  // Move once, not on every sample/change. DOM, visual and keyboard order agree.
  context.before(panel);
  let frame=null,previousLimit=null;
  function update(){
   frame=null;if(panel.hidden||design.hidden||!main.classList.contains('welcomeEmpty'))return;
   const box=canvas.getBoundingClientRect(),card=panel.getBoundingClientRect();
   if(box.width<=0||card.height<=0)return;
   const help=doc.getElementById('contactHelp'),helpBox=help?.getBoundingClientRect(),helpStyle=help&&root.getComputedStyle(help);
   const footer=helpBox&&helpStyle.position==='fixed'?helpBox.height:0;
   const viewport=root.visualViewport?.height||root.innerHeight;
   const limit=canvasLimit(viewport,box.top+(root.scrollY||0),Math.max(0,card.bottom-box.bottom),footer);
   if(limit===previousLimit)return;
   previousLimit=limit;panel.style.setProperty('--first-viewport-canvas-height',limit+'px');
  }
  function schedule(){if(frame!==null)return;frame=root.requestAnimationFrame(update);}
  const resize=typeof root.ResizeObserver==='function'?new root.ResizeObserver(schedule):null;
  for(const node of [panel,doc.querySelector('header'),doc.getElementById('welcomeIntro'),doc.getElementById('journeyProgress'),doc.getElementById('contactHelp')])if(node)resize?.observe(node);
  const observer=typeof root.MutationObserver==='function'?new root.MutationObserver(schedule):null;
  observer?.observe(panel,{attributes:true,attributeFilter:['hidden']});
  observer?.observe(main,{attributes:true,attributeFilter:['class']});
  doc.addEventListener('change',schedule);root.addEventListener('resize',schedule,{passive:true});root.visualViewport?.addEventListener('resize',schedule,{passive:true});
  schedule();return {update,schedule};
 }
 const api={canvasLimit,mount,MIN_CANVAS_HEIGHT,MAX_CANVAS_HEIGHT,CLEARANCE};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else{root.HijyenLabFirstViewport=api;if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>mount(root.document),{once:true});else mount(root.document);}
})(typeof window!=='undefined'?window:globalThis);
