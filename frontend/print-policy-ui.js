/* Picker-only policy UI. Artwork, original logo colors and plate counts are never edited here. */
(function(){
 'use strict';
 const byId=id=>document.getElementById(id),hex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
 let explicitFront=!!state.text?.trim()||!!state.textPantone||(typeof initial!=='undefined'&&state.textColor!==initial.textColor);
 const style=document.createElement('style');
 style.textContent='.printPolicyPalette{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.printPolicyPalette button{min-width:44px;min-height:44px;display:flex;align-items:center;gap:6px;padding:8px;border:1px solid #687588;border-radius:8px;background:#fff;color:#17243b}.printPolicyPalette button[aria-pressed="true"]{outline:2px solid #173c68;outline-offset:1px}.printPolicyPalette i{display:inline-block;width:20px;height:20px;border:1px solid #687588;border-radius:50%}#rearInkColor,#textCustom,#textPantone{min-height:44px}#textColors button{min-width:44px;min-height:44px}.printPolicyNotice{font-size:14px;line-height:1.5;margin:8px 0}';
 document.head.appendChild(style);
 function palette(side){const result=allowedTextPalette(side),colors=[...new Set((result.colors||[]).map(hex).filter(c=>c&&c!=='#ffffff'))];return {...result,colors,capped:colors.length>=PrintPolicy.MAX_PRINT_INKS};}
 function makePanel(anchor,side){
  if(!anchor)return null;
  const box=document.createElement('div');box.id=side+'PrintPolicy';
  const note=document.createElement('p');note.id=side+'PrintPolicyNote';note.className='printPolicyNotice';note.setAttribute('role','status');note.setAttribute('aria-live','polite');
  const choices=document.createElement('div');choices.className='printPolicyPalette';choices.setAttribute('role','group');choices.setAttribute('aria-label','Mevcut baskı renkleri');
  box.append(note,choices);anchor.insertAdjacentElement('afterend',box);return {box,note,choices,key:''};
 }
 const front=makePanel(byId('textColors'),'front'),rear=makePanel(byId('rearInkColor')?.closest('label')||byId('rearInkColor'),'rear');
 function choose(side,color){
  if(!textColorAllowed(color,side))return;
  if(side==='front'){explicitFront=true;remember();state.textColor=color;state.textPantone='';refresh();}
  else{const select=byId('rearInkColor');select.value=color;select.dispatchEvent(new Event('input',{bubbles:true}));}
  sync();
 }
 function renderPanel(panel,side,p,current,hasText){
  if(!panel)return;
  const invalid=hasText&&!!current&&!textColorAllowed(current,side);
  panel.note.textContent=p.colors.length>PrintPolicy.MAX_PRINT_INKS?PrintPolicy.CONTACT_MESSAGE:invalid?'Bu yazı rengi dördüncü baskı rengini ekliyor. Mevcut renklerden birini seçin; seçiminiz kendiliğinden değiştirilmedi.':p.capped?'En fazla 3 baskı rengi. Yazı için mevcut renklerden birini seçin. Beyaz yeni mürekkep eklemez.':p.colors.length?'Yazıda mevcut baskı renklerini kullanabilirsiniz. Beyaz yeni mürekkep eklemez.':'';
  const colors=p.colors.length?[...p.colors,'#ffffff']:[],key=JSON.stringify(colors);
  if(panel.key!==key){panel.key=key;panel.choices.replaceChildren();for(const [index,color] of colors.entries()){const button=document.createElement('button');button.type='button';button.dataset.ink=color;button.setAttribute('aria-label',color==='#ffffff'?'Beyaz · mürekkepsiz alan':'Mevcut baskı rengi '+color.toUpperCase());const dot=document.createElement('i');dot.style.backgroundColor=color;dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=color==='#ffffff'?'Beyaz':'Renk '+(index+1);button.title=color.toUpperCase();button.append(dot,label);button.onclick=()=>choose(side,color);panel.choices.appendChild(button);}}
  for(const button of panel.choices.children){button.setAttribute('aria-pressed',String(hex(current)===button.dataset.ink));button.disabled=!textColorAllowed(button.dataset.ink,side);}
  panel.box.hidden=!panel.note.textContent&&!colors.length;
 }
 function sync(){
  const f=palette('front'),r=palette('rear');
  renderPanel(front,'front',f,state.textColor,!!state.text?.trim());
  if(byId('textColors'))byId('textColors').hidden=f.capped;
  // CustomerFocus may wrap Pantone controls after this module initializes.
  if(byId('textPantoneOptions'))byId('textPantoneOptions').hidden=f.capped;
  for(const button of byId('textColors')?.querySelectorAll('[data-color]')||[]){const prohibited=!textColorAllowed(button.dataset.color,'front');button.disabled=prohibited;button.hidden=prohibited;}
  for(const id of ['textCustom','textPantone']){const input=byId(id);if(input){input.disabled=f.capped;const label=input.closest('label');if(label)label.hidden=f.capped;}}
  if(byId('textPantoneResult'))byId('textPantoneResult').hidden=f.capped;
  const select=byId('rearInkColor');
  if(select){const current=rearContent.inkColor||'';for(const option of [...select.options])if(option.dataset.policyOption)option.remove();
   for(const color of [...r.colors,...(current?[current]:[])])if(![...select.options].some(o=>hex(o.value)===hex(color))){const option=document.createElement('option');option.value=color;option.textContent=color.toLowerCase()==='#ffffff'?'Beyaz':r.colors.includes(color)?'Renk '+(r.colors.indexOf(color)+1):'Seçili renk';option.title=color.toUpperCase();option.dataset.policyOption='true';select.appendChild(option);}
   for(const option of select.options){const prohibited=!!option.value&&!textColorAllowed(option.value,'rear');option.disabled=prohibited;option.hidden=prohibited&&option.value!==current;}
   select.value=current;select.setAttribute('aria-describedby','rearPrintPolicyNote');renderPanel(rear,'rear',r,current,['instagram','website','phone','address','extra'].some(k=>rearContent[k]?.trim()));
  }
 }
 // Only a new, untouched front text gets a palette default. Restored or explicit
 // fourth inks remain intact, visibly invalid, until the customer chooses a repair.
 byId('text')?.addEventListener('input',()=>{if(state.text?.trim()||explicitFront)return;const p=palette('front');if(p.status!=='estimated')return;const choice=CombinedInks.selectTextInk(p.colors,state.bg);if(choice.ok)state.textColor=choice.color;},true);
 byId('textColors')?.addEventListener('click',event=>{if(event.target.closest('[data-color]'))explicitFront=true;},true);
 for(const id of ['textCustom','textPantone'])byId(id)?.addEventListener('input',()=>{explicitFront=true;},true);
 const beforeSync=syncPrintInks;syncPrintInks=function(){const result=beforeSync.apply(this,arguments);sync();return result;};
 const beforeRefresh=refresh;refresh=function(){const result=beforeRefresh.apply(this,arguments);sync();return result;};
 globalThis.PrintPolicyUI=Object.freeze({sync});sync();
})();
