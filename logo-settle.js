/* One finite presentation of a newly applied logo. Never writes artwork pixels,
 * placement, approval or quote state; the real canvas remains the export source. */
(function(root){'use strict';
const DURATION=1400;
const PHASE_EASING='cubic-bezier(.4,0,.2,1)';
function geometry(plan,x,y,area){
 const d=plan?.drawRect,r=(plan?.rotation||0)*Math.PI/180;
 if(!d||![d.x,d.y,d.width,d.height,x,y,area?.left,area?.right,area?.top,area?.bottom,r].every(Number.isFinite)||d.width<=0||d.height<=0)return null;
 const corners=[[d.x,d.y],[d.x+d.width,d.y],[d.x+d.width,d.y+d.height],[d.x,d.y+d.height]].map(([a,b])=>({x:x+a*Math.cos(r)-b*Math.sin(r),y:y+a*Math.sin(r)+b*Math.cos(r)}));
 const bounds={left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
 if(bounds.left<area.left-1e-6||bounds.right>area.right+1e-6||bounds.top<area.top-1e-6||bounds.bottom>area.bottom+1e-6)return null;
 // Animate around the visible mark's center, not the package or an asymmetric
 // source anchor. Even a largest-fit mark stays wholly inside its safe rectangle.
 const center={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2};
 const room=Math.min((center.x-area.left)/(center.x-bounds.left),(area.right-center.x)/(bounds.right-center.x),(center.y-area.top)/(center.y-bounds.top),(area.bottom-center.y)/(bounds.bottom-center.y));
 return {bounds,center,peak:Math.max(1,Math.min(1.035,room))};
}
function displayRect(canvas,rect){
 const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height),width=canvas.width*scale,height=canvas.height*scale;
 return {left:rect.left+(rect.width-width)/2,top:rect.top+(rect.height-height)/2,width,height};
}
function create(doc,media,env=root){
 let queued=null,armed=null,active=null,suspended=false,stopWaiting=null;
 const seen=new Set(),schedule=env.queueMicrotask?.bind(env)|| (fn=>Promise.resolve().then(fn));
 function editing(node){return !!node&&(node.isContentEditable||['TEXTAREA','SELECT'].includes(node.tagName)||node.tagName==='INPUT'&&!['radio','checkbox','color','button','submit','range','file'].includes(node.type));}
 function eligible(canvas){
  if(suspended||media?.matches||doc.hidden||!canvas||canvas.closest?.('[hidden]'))return false;
  if(editing(doc.activeElement))return false;
  for(let p=canvas.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return false;
  const rect=canvas.getBoundingClientRect?.();
  return !!rect&&rect.width>0&&rect.height>0&&rect.top+rect.height>0&&rect.top<(env.innerHeight||Infinity);
 }
 function cancel(){
  armed=null;
  const old=active;active=null;
  if(!old)return;
  old.animation.onfinish=old.animation.oncancel=null;
  old.animation.cancel();old.overlay.remove();
  old.canvas.style.opacity=old.opacity;
 }
 function reset(){queued=null;const stop=stopWaiting;stopWaiting=null;stop?.();cancel();}
 function request(event){
  if(!event?.token||typeof event.current!=='function'||typeof event.render!=='function'||seen.has(event.token))return false;
  reset();queued=event;
  // Let the successful apply's synchronous refresh/go(1) finish. Those existing
  // navigation cancellations cannot erase this not-yet-started success response;
  // a different source, actual navigation, reset or hidden tab fails the guard.
  schedule(()=>{
   if(queued!==event)return;seen.add(event.token);
   const ready=settled=>{
    if(queued!==event)return;queued=null;stopWaiting=null;
    if(!settled||!event.current()||!eligible(doc.getElementById('package')))return;
    armed=event;
    try{event.render();}catch{cancel();}finally{armed=null;}
   };
   // A first apply may schedule section focus/smooth scroll for the next frame.
   // Wait for that controller's observed settlement, not an arbitrary delay.
   const journey=env.HijyenLabResponsiveJourney;
   if(journey?.afterNavigation){const stop=journey.afterNavigation(ready);if(queued===event)stopWaiting=stop;}
   else ready(true);
  });
  return true;
 }
 function beforeDraw(){if(active)cancel();}
 function capture({canvas,asset,printed,plan,x,y,area}){
  const event=armed;armed=null;
  if(!event||!event.current()||!eligible(canvas))return false;
  const fit=geometry(plan,x,y,area);if(!fit)return false;
  const rect=displayRect(canvas,canvas.getBoundingClientRect()),overlay=doc.createElement('div'),base=doc.createElement('canvas'),clip=doc.createElement('div'),logo=doc.createElement('canvas');
  if(!logo.animate)return false;
  for(const node of [base,logo]){node.width=canvas.width;node.height=canvas.height;Object.assign(node.style,{position:'absolute',inset:'0',width:'100%',height:'100%',maxWidth:'none',pointerEvents:'none'});}
  Object.assign(overlay.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',pointerEvents:'none',zIndex:'10',overflow:'hidden'});
  overlay.className='logoSettlePreview';overlay.setAttribute('aria-hidden','true');
  Object.assign(clip.style,{position:'absolute',inset:'0',pointerEvents:'none',clipPath:`inset(${(area.top-2)/canvas.height*100}% ${(canvas.width-area.right-2)/canvas.width*100}% ${(canvas.height-area.bottom-2)/canvas.height*100}% ${(area.left-2)/canvas.width*100}%)`});
  logo.style.transformOrigin=`${fit.center.x/canvas.width*100}% ${fit.center.y/canvas.height*100}%`;
  try{base.getContext('2d').drawImage(asset,0,0);logo.getContext('2d').drawImage(printed,0,0);}catch{return false;}
  clip.append(logo);overlay.append(base,clip);doc.body.append(overlay);
  const opacity=canvas.style.opacity;
  // Opacity preserves geometry and hit testing, unlike display/visibility. Input
  // capture cancels this layer before any drag coordinates are interpreted.
  canvas.style.opacity='0';
  let animation;
  // Show the shrink itself, rather than first appearing already small. One
  // deliberate shrink/grow/settle is easier to follow; its peak is still the
  // geometry-capped value and the real computed final placement never changes.
  try{animation=logo.animate([{transform:'scale(1)',offset:0,easing:PHASE_EASING},{transform:'scale(.97)',offset:.28,easing:PHASE_EASING},{transform:`scale(${fit.peak})`,offset:.72,easing:PHASE_EASING},{transform:'scale(1)',offset:1}],{duration:DURATION,easing:'linear',iterations:1});}
  catch{overlay.remove();canvas.style.opacity=opacity;return false;}
  const entry={overlay,canvas,opacity,animation};active=entry;
  const done=()=>{if(active===entry){active=null;overlay.remove();canvas.style.opacity=opacity;}};
  animation.onfinish=done;animation.oncancel=done;
  return true;
 }
 for(const type of ['pointerdown','input','change','keydown','wheel','touchstart'])doc.addEventListener?.(type,reset,{capture:true,passive:true});
 // Programmatic section-heading focus belongs to navigation; editable focus is
 // user work and cancels both pending and visible feedback.
 doc.addEventListener?.('focusin',event=>{if(editing(event.target))reset();},true);
 // Waiting has no fixed overlay yet. The navigation controller owns its scroll;
 // any scroll after capture still removes the fixed layer immediately.
 env.addEventListener?.('scroll',cancel,{capture:true,passive:true});
 for(const type of ['resize','pagehide'])env.addEventListener?.(type,reset,{capture:true,passive:true});
 doc.addEventListener?.('visibilitychange',()=>{if(doc.hidden)reset();});
 media?.addEventListener?.('change',()=>{if(media.matches)reset();});
 return Object.freeze({request,beforeDraw,capture,cancel,reset,suspend(value){suspended=!!value;if(suspended)reset();}});
}
const api={create,geometry,displayRect,DURATION};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.HijyenLabLogoSettle=create(root.document,root.matchMedia?.('(prefers-reduced-motion: reduce)'));
})(typeof window!=='undefined'?window:globalThis);
