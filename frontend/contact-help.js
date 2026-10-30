/* Direct contact only: no widget, analytics, personal form reads, or automatic send.
 * Format: https://faq.whatsapp.com/5913398998672934
 * Small-viewport unfixing: https://www.w3.org/WAI/WCAG21/Techniques/css/C34
 */
(function (root) {
  'use strict';
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
    for (const [label, value] of [['Ürün', context.product], ['Bulunduğum aşama', context.stage], ['Seçtiğim koku', context.fragrance]]) {
      const text = clean(value);
      if (text) lines.push(label + ': ' + text);
    }
    if (Number.isSafeInteger(context.quantity) && context.quantity > 0 && context.quantity <= 1000000) lines.push('Seçtiğim adet: ' + context.quantity);
    return lines.join('\n');
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
    wa.textContent = 'WhatsApp’tan sor';
    wa.setAttribute('aria-label', 'WhatsApp yardım mesajını hazırla');
    const phone = doc.createElement('a');
    phone.id = 'contactTelephone';
    phone.href = links.telephone;
    phone.textContent = 'Telefonla ara';
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
    draftNote.textContent = 'İsterseniz mesajı değiştirin. WhatsApp açıldığında Gönder’e siz basarsınız. Bu, otomatik bir işletme yanıtı değildir.';
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
    const closeDraft = () => dialog.close();
    cancel.onclick = closeDraft;
    dialog.addEventListener('close', () => wa.focus({ preventScroll: true }));
    draft.addEventListener('input', syncDraft);
    proceed.onclick = event => {
      syncDraft();
      if (!draft.value.trim()) { event.preventDefault(); draft.focus(); return; }
      closeDraft();
    };
    wa.onclick = () => {
      let context = {};
      try { context = root.getHijyenLabHelpContext?.() || {}; } catch (_) { /* Generic help remains available. */ }
      draft.value = buildMessage(context);
      syncDraft();
      dialog.showModal();
      // Read the summary first; do not immediately summon the phone keyboard.
      heading.focus({ preventScroll: true });
    };
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
    root.addEventListener('resize', measure);
    if (root.ResizeObserver) new root.ResizeObserver(measure).observe(bar);
    measure();
  }
  const api = Object.freeze({ CONTACT, links, messageLink, buildMessage, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabContactHelp = api;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true });
    else mount(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
