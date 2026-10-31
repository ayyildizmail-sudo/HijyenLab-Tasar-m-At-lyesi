/* Presentation only. Read catalog/state; preserve all native controls and explicit consent. */
(function (root) {
  'use strict';
  const number = value => value.toLocaleString('tr-TR');
  function minimumCopy(product, mode, ground) {
    const rules = product.priceRules;
    if (mode === 'unprinted') return 'En az 1 koli ve tam koli katları · ' + number(rules.unitsPerBox) + ' adet / koli.';
    if (ground === 'unknown') return 'Minimum: beyaz zeminde ' + number(rules.minimum.white) + ', renkli zeminde ' + number(rules.minimum.colored) + ' adet.';
    return (ground === 'white' ? 'Beyaz' : 'Renkli') + ' zeminde en az ' + number(rules.minimum[ground]) + ' adet · ' + number(rules.unitsPerBox) + ' adet / koli.';
  }
  function productFacts(product, mode) {
    return [
      product.type === 'mendil' ? 'Ambalaj: 7 × 12 cm. Onaylı boş görselle yaklaşık önizleme; baskı payları teknik onay gerektirir.' : 'Açılmış havlu: ' + product.towelDimensions.join(' × ') + ' cm. Bu ölçü ambalaj ölçüsü değildir.',
      (product.type === 'mendil' ? 'Islak mendil' : product.type === 'rulo' ? 'Rulo havlu' : 'Katlı havlu') + ' · ' + number(product.priceRules.unitsPerBox) + ' adet / koli.',
      mode === 'unprinted' ? 'Beyaz, baskısız ambalaj · '+(product.id === 'BM21' ? 'Yeşil çay' : 'Flambau')+' koku sabit · Baskı kalıbı (klişe) uygulanmaz.' : 'Kokuyu tasarım kontrolünden sonra seçersiniz. Ambalaj önizlemesi baskıya hazır dosya değildir.'
    ];
  }
  function meaningfulArtwork(value) {
    return !!(value.logo || value.photoLayout) && !value.designProcessing && !value.designBlocked && !value.productAssetPending && !value.productAssetFailure && !value.screenSelectionRequired;
  }
  function draftPromptEligible(value, context) {
    return !context.seen && !context.consented && !context.hasRestore && context.mode !== 'unprinted' && context.designVisible && meaningfulArtwork(value);
  }
  function mount(doc) {
    if (doc.getElementById('personaMinimum')) return;
    const get = id => doc.getElementById(id), main = doc.querySelector('main'), picker = doc.querySelector('.productPicker');
    const action = doc.querySelector('.simplePrimary'), preview = doc.querySelector('.preview');
    if (!main || !picker || !action || !preview || !root.ProductCatalog) return;
    const make = (tag, id, text) => { const node = doc.createElement(tag); if (id) node.id = id; if (text) node.textContent = text; return node; };
    const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const hide = (node, value) => { if (node.hidden !== value) node.hidden = value; };
    const minimum = make('p', 'personaMinimum'); minimum.className = 'personaMinimum';
    const expectation = make('p', 'personaQuoteExpectation', 'Teklif aşamasında işletme adı, ilgili kişi ve telefon gerekir.');
    const facts = make('details', 'personaProductFacts');
    const factsTitle = make('summary', '', 'Ürün bilgileri');
    const factLines = [make('p'), make('p'), make('p')]; facts.append(factsTitle, ...factLines);
    picker.append(minimum, expectation, facts);
    // Move the actual action, not a second upload trigger. Return to its exact original slot after opening.
    const home = make('span', 'personaActionHome'); home.hidden = true; action.before(home);
    const noLogo = make('details', 'personaNoLogo');
    const noLogoTitle = make('summary', '', 'Görsel yüklemeden fiyat al');
    noLogoTitle.setAttribute('aria-controls', 'declarationPanel');
    noLogo.append(noLogoTitle);
    const declarationPanel=make('div','declarationPanel');declarationPanel.className='declarationPanel';
    const groundGroup=make('fieldset'),groundLegend=make('legend','','Ambalaj zemini');groundGroup.append(groundLegend);
    const countGroup=make('fieldset'),countLegend=make('legend','','Kaç renk baskı olacak?');countGroup.append(countLegend);
    const choices=[];
    function choose(kind,value,label,group){const b=make('button','',label);b.type='button';b.className='declarationChoice';b.setAttribute('aria-pressed','false');b.onclick=()=>{const d=state.declaration||root.DeclaredQuote.create();setDeclaration(kind==='ground'?value:d.ground,kind==='count'?value:d.count);syncDeclaration();};group.append(b);choices.push({b,kind,value});}
    choose('ground','white','Beyaz',groundGroup);choose('ground','colored','Renkli',groundGroup);
    for(const n of [1,2,3])choose('count',n,n+' renk',countGroup);
    const note=make('p','','Beyazı saymayın. Renkli zemini ve iki yüzün baskısını toplam renk sayısına dahil edin; aynı rengi bir kez sayın.');note.className='hint';
    const helpRow=make('div');helpRow.className='declarationHelp';
    for(const [value,label] of [['4+','4 veya daha fazla'],['unknown','Emin değilim']]){const b=make('button','',label);b.type='button';b.className='textButton';b.onclick=()=>{const d=state.declaration||root.DeclaredQuote.create();setDeclaration(d.ground,value);syncDeclaration();root.HijyenLabContactHelp?.openDeclaredQuoteDraft({product:root.ProductCatalog.get(root.selectedProductId||'BM12').label,ground:d.ground,count:value});};helpRow.append(b);}
    const proceed=make('button','declarationContinue','Devam et →');proceed.type='button';proceed.className='primary full';proceed.onclick=()=>continueDeclaredQuote();
    const disclaimer=make('p','','Teklif, belirttiğiniz renk sayısına göre hazırlanır; görsel kontrolü yapılmış sayılmaz.');disclaimer.className='hint';
    declarationPanel.append(groundGroup,countGroup,note,helpRow,proceed,disclaimer);noLogo.append(declarationPanel);
    function syncExpanded(){const expanded=String(noLogo.open);if(noLogoTitle.getAttribute('aria-expanded')!==expanded)noLogoTitle.setAttribute('aria-expanded',expanded);}
    function syncDeclaration(){const active=typeof isDeclaredQuote==='function'&&isDeclaredQuote(),d=active?state.declaration:root.DeclaredQuote.create();for(const {b,kind,value} of choices){const pressed=String(d[kind]===value);if(b.getAttribute('aria-pressed')!==pressed)b.setAttribute('aria-pressed',pressed);}const disabled=!active||!root.DeclaredQuote.valid(d);if(proceed.disabled!==disabled)proceed.disabled=disabled;}
    noLogo.addEventListener('toggle',()=>{syncExpanded();if(noLogo.open&&!(typeof isDeclaredQuote==='function'&&isDeclaredQuote()))startDeclaredQuote();syncDeclaration();});

    const hint = get('welcomeUploadHint'); (hint || action).after(noLogo);
    const prompt = make('aside', 'personaDraftPrompt'); prompt.hidden = true; prompt.setAttribute('aria-label', 'İsteğe bağlı taslak saklama');
    const promptText = make('p', '', 'Daha sonra devam etmek ister misiniz? Taslak saklamayı siz açarsınız; ortak cihazda açmayın.');
    const options = make('button', 'personaDraftOptions', 'Saklama seçeneğini göster'); options.type = 'button'; options.className = 'textButton';
    const dismiss = make('button', 'personaDraftDismiss', 'Şimdi değil'); dismiss.type = 'button'; dismiss.className = 'textButton';
    options.onclick = () => { hide(prompt, true); const panel = get('welcomeDraftOptions'); if (panel) panel.open = true; get('draftConsent')?.focus(); };
    dismiss.onclick = () => hide(prompt, true);
    prompt.append(promptText, options, dismiss); get('simpleDetails')?.before(prompt);
    const sharing = doc.querySelector('#summaryDiscussion .hint');
    if (sharing) put(sharing, '1 · JPG’yi kaydet → 2 · WhatsApp’ı aç → 3 · Görseli ekle. Görsel otomatik eklenmez; Gönder’e siz basarsınız.');
    let seen = false, previousOpening = null;
    function sync() {
      const value = typeof state === 'undefined' ? {} : state;
      const mode = root.HijyenLabPrintMode?.get() || 'printed';
      const product = root.ProductCatalog.get(root.selectedProductId || root.ProductCatalog.defaultId);
      const ground = value.photoLayout && value.photoQuoteBg === 'unknown' ? 'unknown' : typeof effectiveBackground === 'function' && effectiveBackground() !== '#ffffff' ? 'colored' : 'white';
      put(minimum, minimumCopy(product, mode, ground));
      productFacts(product, mode).forEach((line, index) => put(factLines[index], line));
      const visible = !get('design')?.hidden;
      const opening = root.HijyenLabWelcome?.isOpening(value, visible, mode === 'unprinted') === true;
      if (opening !== previousOpening) {
        if (opening) { preview.before(action); preview.after(facts); }
        else { home.after(action); picker.append(facts); }
        previousOpening = opening;
      }
      // This is the sole owner of CTA/hint ordering. Do not separately force the hint
      // after action: that would fight the second CTA on every observer delivery.
      // The same guarded chain converges in opening, editor, reset and restored states.
      if (action.nextElementSibling !== noLogo) action.after(noLogo);
      if (hint && noLogo.nextElementSibling !== hint) noLogo.after(hint);
      hide(noLogo, !opening||!!value.text?.trim()||(typeof rearHasContent==='function'&&rearHasContent())||!!root.MultiLogo?.has('front')||!!root.MultiLogo?.has('rear'));
      syncExpanded();
      syncDeclaration();
      const consented = !!get('draftConsent')?.checked, hasRestore = !!get('restoreDraft') && !get('restoreDraft').hidden;
      if (draftPromptEligible(value, { seen, consented, hasRestore, mode, designVisible: visible })) { seen = true; hide(prompt, false); }
      if (consented || hasRestore || !visible || mode === 'unprinted' || !meaningfulArtwork(value)) hide(prompt, true);
    }
    // Existing renderers change captions/visibility after async upload/product work. Equality guards avoid observer loops.
    new root.MutationObserver(sync).observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
    doc.addEventListener('change', sync); doc.addEventListener('input', sync);
    root.addEventListener?.('hijyenlab:print-mode-change', sync);
    sync();
  }
  const api = { minimumCopy, productFacts, meaningfulArtwork, draftPromptEligible, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.HijyenLabPersonaUX = api; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true }); else mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
