/* Direct contact only: no widget, analytics, personal form reads, or automatic send.
 * Format: https://faq.whatsapp.com/5913398998672934
 * Small-viewport unfixing: https://www.w3.org/WAI/WCAG21/Techniques/css/C34
 */
(function (root) {
  'use strict';
  let showDifferentProductDraft = null, activeDraftGuard = null;
  function summaryContext() {
    let context;
    try { context = root.getHijyenLabSummaryHelpContext?.(); } catch { return null; }
    if (!context || typeof context.product !== 'string' || !context.product.trim() || typeof context.fragrance !== 'string' || !context.fragrance.trim() || !Number.isSafeInteger(context.quantity) || context.quantity <= 0 || context.quantity > 1000000) return null;
    return { printMode: ['printed', 'unprinted'].includes(context.printMode) ? context.printMode : null, product: context.product.trim().slice(0, 140), quantity: context.quantity, fragrance: context.fragrance.trim().slice(0, 140) };
  }
  function reorderLine() {
    let code = null; try { code = root.HijyenLabReorder?.code?.(); } catch { code = null; }
    return typeof code === 'string' && /^HL-[A-HJ-NP-Z2-9]{6}$/.test(code) ? '\nSipariş kodu: ' + code : '';
  }
  function heaterLine() {
    try { const h = root.HijyenLabHeaterOffer; return h ? h.requestLine(root.selectedProductId) : ''; } catch { return ''; }
  }
  function openSummaryDraft() {
    const context = summaryContext();
    if (!context || !showDifferentProductDraft) return false;
    const key = JSON.stringify(context);
    if (!showDifferentProductDraft((context.printMode === 'unprinted' ? 'Merhaba, baskısız ürün teklifini görüşmek istiyorum.\nBaskısız; klişe uygulanmaz.' : 'Merhaba, bu tasarımı görüşmek istiyorum.') + '\nÜrün: ' + context.product + '\nAdet: ' + context.quantity + '\nKoku: ' + context.fragrance + reorderLine() + heaterLine())) return false;
    activeDraftGuard = () => { const fresh = summaryContext(); return !!fresh && JSON.stringify(fresh) === key; };
    return true;
  }
  function differentProductMessage(description) {
    const text = typeof description === 'string' ? description.trim().slice(0, 300) : '';
    return text ? 'Merhaba, önerilen ürünlerden farklı bir ürün arıyorum. İstediğim ürün: ' + text : 'Merhaba, ürün seçimi konusunda yardım almak istiyorum.';
  }
  function openDifferentProductDraft(description) {
    if (!showDifferentProductDraft) return false;
    return showDifferentProductDraft(differentProductMessage(description));
  }
  function openDeclaredQuoteDraft(context={}) {
    if(!showDifferentProductDraft||!['white','colored'].includes(context.ground)||![1,2,3,'4+','unknown'].includes(context.count))return false;
    const product=typeof context.product==='string'?context.product.replace(/[\r\n\t]+/g,' ').slice(0,140):'';
    return showDifferentProductDraft('Merhaba, görsel yüklemeden fiyat için yardım istiyorum.\nÜrün: '+product+'\nAmbalaj zemini: '+(context.ground==='white'?'Beyaz':'Renkli')+'\nToplam baskı rengi (beyanım): '+(context.count==='unknown'?'Emin değilim':context.count)+'.\nLogo ve grafik kontrolü henüz yapılmadı.');
  }
  function openInstitutionDraft() {
    if (!showDifferentProductDraft) return false;
    return showDifferentProductDraft('Merhaba, kamu kurumu veya resmî kuruluş adına talebimizi görüşmek istiyorum.');
  }
  const CONTACT = Object.freeze({
    international: '+905425699869',
    display: '0 (542) 569 98 69',
    message: 'Merhaba, HijyenLab Tasarım Atölyesi uygulamasında yardım almak istiyorum.'
  });
  const links = Object.freeze({
    whatsapp: 'https://wa.me/' + CONTACT.international.slice(1) + '?text=' + encodeURIComponent(CONTACT.message),
    telephone: 'tel:' + CONTACT.international
  });
  function messageLink(message) {
    return 'https://wa.me/' + CONTACT.international.slice(1) + '?text=' + encodeURIComponent(message);
  }
  function buildMessage(context = {}) {
    // Allowlist only; never serialize the provider object or read customer fields.
    const clean = value => typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 140) : '';
    const lines = [CONTACT.message];
    if (context.printMode === 'unprinted') lines.push('Baskı seçimi: Baskısız; klişe uygulanmaz');
    else if (context.printMode === 'printed') lines.push('Baskı seçimi: Baskılı');
    for (const [label, value] of [['Ürün', context.product], ['Bulunduğum aşama', context.stage], ['Seçtiğim koku', context.fragrance]]) {
      const text = clean(value);
      if (text) lines.push(label + ': ' + text);
    }
    if (Number.isSafeInteger(context.quantity) && context.quantity > 0 && context.quantity <= 1000000) lines.push('Seçtiğim adet: ' + context.quantity);
    if(Number.isSafeInteger(context.printInkCount)&&context.printInkCount>0&&context.printInkCount<=12)lines.push('Tasarımım '+context.printInkCount+' baskı rengi içeriyor. Uygun baskı seçeneklerini görüşmek istiyorum.');
    else if(context.printInkUncertain===true)lines.push('Tasarımımın baskı renkleri üç renk sınırı içinde doğrulanamadı. Uygun baskı seçeneklerini görüşmek istiyorum.');
    const heater = heaterLine().trim(); if (heater) lines.push(heater);
    return lines.join('\n');
  }
  // Local SVG artwork; control labels stay on the button/link, not the decorative icon.
  function contactIcon(doc, kind) {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '26'); svg.setAttribute('height', '26');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', kind === 'whatsapp'
      ? 'M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.4-4.8a8.5 8.5 0 1 1 16.1-4.1Z M8.1 7.2l1.6-.2 1.1 2.6-1.2 1.1a9.1 9.1 0 0 0 3.7 3.7l1.1-1.2 2.6 1.1-.2 1.6c-.1.9-1 1.4-1.9 1.2-4.3-.9-7.6-4.2-8.5-8.5-.2-.9.3-1.8 1.2-1.9Z'
      : 'M7.1 3.5H4.8c-.8 0-1.4.7-1.3 1.5 1 8.2 7.5 14.7 15.7 15.5.8.1 1.3-.5 1.3-1.3v-2.3c0-.6-.4-1.1-.9-1.3l-3.1-1.1c-.5-.2-1.1 0-1.4.4l-1.4 1.5a15 15 0 0 1-6.1-6.1l1.5-1.4c.4-.3.6-.9.4-1.4L8.4 4.4c-.2-.5-.7-.9-1.3-.9Z');
    svg.append(path);
    return svg;
  }
  function mount(doc) {
    if (doc.getElementById('contactHelp')) return;
    const bar = doc.createElement('aside');
    bar.id = 'contactHelp';
    bar.setAttribute('aria-label', 'HijyenLab ile iletişim');
    const inner = doc.createElement('div');
    inner.className = 'contactHelpInner';
    const prompt = doc.createElement('strong');
    prompt.textContent = 'Yardım ister misiniz?';
    const actions = doc.createElement('div');
    actions.className = 'contactHelpActions';
    const wa = doc.createElement('button');
    wa.id = 'contactWhatsApp';
    wa.type = 'button';
    wa.setAttribute('aria-haspopup', 'dialog');
    wa.append(contactIcon(doc, 'whatsapp'));
    wa.title = 'WhatsApp’tan sor';
    wa.setAttribute('aria-label', 'WhatsApp yardım mesajını hazırla');
    const phone = doc.createElement('a');
    phone.id = 'contactTelephone';
    phone.href = links.telephone;
    phone.append(contactIcon(doc, 'telephone'));
    phone.title = 'Telefonla ara';
    phone.setAttribute('aria-label', 'HijyenLab’ı telefonla ara: ' + CONTACT.display);
    actions.append(wa, phone);
    const note = doc.createElement('p');
    note.id = 'contactHelpNote';
    note.textContent = 'Mesajı önce görüp düzenlersiniz. Adınız, telefonunuz ve görseliniz otomatik eklenmez.';
    wa.setAttribute('aria-describedby', note.id);
    inner.append(prompt, actions, note);
    bar.append(inner);
    doc.body.append(bar);
    const dialog = doc.createElement('dialog');
    dialog.id = 'contactHelpDialog';
    dialog.setAttribute('aria-labelledby', 'contactHelpTitle');
    dialog.setAttribute('aria-describedby', 'contactDraftNote');
    const heading = doc.createElement('h2');
    heading.id = 'contactHelpTitle';
    heading.textContent = 'WhatsApp mesajınız';
    heading.tabIndex = -1;
    const draftNote = doc.createElement('p');
    draftNote.id = 'contactDraftNote';
    draftNote.textContent = 'İsterseniz mesajı değiştirin. Adınız, telefonunuz ve görseliniz otomatik eklenmez. WhatsApp açıldığında Gönder’e siz basarsınız. Bu, otomatik bir işletme yanıtı değildir.';
    const label = doc.createElement('label');
    label.htmlFor = 'contactMessage';
    label.textContent = 'Göndermek istediğiniz mesaj';
    const draft = doc.createElement('textarea');
    draft.id = 'contactMessage';
    draft.rows = 6;
    draft.maxLength = 2000;
    const buttons = doc.createElement('div');
    buttons.className = 'contactDraftActions';
    const cancel = doc.createElement('button');
    cancel.id = 'contactCancel';
    cancel.type = 'button';
    cancel.textContent = 'Vazgeç';
    const proceed = doc.createElement('a');
    proceed.id = 'contactProceed';
    proceed.target = '_blank';
    proceed.rel = 'noopener noreferrer';
    proceed.textContent = 'WhatsApp’a geç ↗';
    proceed.setAttribute('aria-label', 'WhatsApp’a geç (yeni sekme veya uygulama)');
    const returnNote = doc.createElement('p');
    returnNote.textContent = 'Uygulamaya dönmek için bu sekmeyi açık tutun. Sayfa yenilenirse taslağınız kaybolabilir.';
    buttons.append(cancel, proceed);
    dialog.append(heading, draftNote, label, draft, buttons, returnNote);
    doc.body.append(dialog);
    const syncDraft = () => {
      const text = draft.value.trim();
      if (text) proceed.href = messageLink(text);
      else proceed.removeAttribute('href');
      proceed.setAttribute('aria-disabled', String(!text));
    };
    const freshnessError = doc.createElement('p'); freshnessError.id = 'contactFreshnessError'; freshnessError.setAttribute('role', 'alert'); freshnessError.hidden = true; buttons.before(freshnessError);
    const closeDraft = () => dialog.close();
    cancel.onclick = closeDraft;
    let returnFocus = wa;
    dialog.addEventListener('close', () => returnFocus.focus({ preventScroll: true }));
    draft.addEventListener('input', syncDraft);
    proceed.onclick = event => {
      if (activeDraftGuard && !activeDraftGuard()) {
        event.preventDefault(); proceed.removeAttribute('href'); proceed.setAttribute('aria-disabled', 'true');
        freshnessError.textContent = 'Ürün veya tasarım bilgileri değişti. Bu pencereyi kapatıp ilgili mesajı yeniden açın.'; freshnessError.hidden = false;
        return;
      }
      syncDraft();
      if (!draft.value.trim()) { event.preventDefault(); draft.focus(); return; }
      closeDraft();
    };
    showDifferentProductDraft = message => {
      // Never stack dialogs or overwrite an in-progress draft on repeated activation.
      if (dialog.open || doc.querySelector?.('dialog[open]')) return false;
      returnFocus = doc.activeElement?.focus ? doc.activeElement : wa;
      activeDraftGuard = null; freshnessError.hidden = true;
      draft.value = message;
      syncDraft();
      dialog.showModal();
      // Read the summary first; do not immediately summon the phone keyboard.
      heading.focus({ preventScroll: true });
      return true;
    };
    const helpContext = () => {
      let context = {};
      try { context = root.getHijyenLabHelpContext?.() || {}; } catch { /* Generic help remains available. */ }
      let policy=null;try{policy=root.currentPrintPolicy?.();}catch{/* No unverified policy claim. */}
      return {...context,printInkCount:policy?.blocked&&Number.isSafeInteger(policy.count)&&policy.count>0&&policy.count<=12?policy.count:null,printInkUncertain:policy?.blocked===true&&policy.count===null};
    };
    wa.onclick = () => {
      const message=buildMessage(helpContext());
      if(showDifferentProductDraft(message))activeDraftGuard=()=>buildMessage(helpContext())===message;
    };
    const pricing = doc.getElementById('pricing');
    if (pricing) {
      const section = doc.createElement('p'); section.id = 'institutionContactHelp';
      const ask = doc.createElement('button'); ask.type = 'button'; ask.id = 'institutionContactDraft';
      ask.textContent = 'Kamu kurumları ve resmî kuruluşların talepleri için bizimle iletişime geçebilirsiniz.';
      ask.setAttribute('aria-haspopup', 'dialog');
      ask.onclick = () => openInstitutionDraft();
      section.append(ask);
      const review = doc.getElementById('review');
      if (review) review.before(section); else pricing.append(section);
    }
    doc.body.classList.add('hasContactHelp');
    const measure = () => doc.documentElement.style.setProperty('--contact-help-height', Math.ceil(bar.getBoundingClientRect().height) + 'px');
    const updateEditing = () => {
      const active = doc.activeElement;
      // Unfix while using a field: never float above the mobile keyboard.
      const editing = !!active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable);
      doc.body.classList.toggle('contactHelpEditing', editing);
      measure();
    };
    doc.addEventListener('focusin', updateEditing);
    doc.addEventListener('focusout', () => root.setTimeout(updateEditing, 0));
    const updateViewport = () => {
      // visualViewport also catches browser chrome, zoom and software-keyboard height changes.
      const height = root.visualViewport?.height || root.innerHeight;
      doc.body.classList.toggle('contactHelpShortViewport', Number.isFinite(height) && height <= 600);
      measure();
    };
    root.addEventListener('resize', updateViewport);
    root.visualViewport?.addEventListener('resize', updateViewport);
    if (root.ResizeObserver) new root.ResizeObserver(measure).observe(bar);
    updateViewport();
  }
  const api = Object.freeze({ CONTACT, links, messageLink, buildMessage, differentProductMessage, openDifferentProductDraft, openSummaryDraft, openInstitutionDraft, openDeclaredQuoteDraft, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabContactHelp = api;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true });
    else mount(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
