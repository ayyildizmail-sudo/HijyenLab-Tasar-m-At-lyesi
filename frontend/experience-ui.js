/* Compact truthful progress and recoverable upload guidance. No form writes or network calls. */
(function (root) {
  'use strict';
  let renderStatus = null;
  function uploadFailure(message) {
    const raw = typeof message === 'string' ? message : '';
    if (/Dosya en fazla 8 MB olmalı/.test(raw)) return { short: 'Dosya çok büyük. En fazla 8 MB bir görsel seçin.', raw };
    if (/Dosya boş veya 8 MB sınırını/.test(raw)) return { short: 'Boş olmayan, en fazla 8 MB bir dosya seçin.', raw };
    if (/HEIC\/HEIF ve TIFF/.test(raw)) return { short: 'HEIC/HEIF ve TIFF açılamıyor. PNG, JPG veya PDF seçin.', raw };
    if (/Görsel boyutları bu cihaz/.test(raw)) return { short: 'Görsel boyutu uygun değil. Daha küçük bir görsel seçin.', raw };
    if (/Bu dosyanın görsel içeriği tanınamadı|Bu dosya çözülemedi|Görsel okunamadı|Görsel dönüştürülemedi|JPEG (başlığı geçersiz|dosyası eksik|boyutu eksik)|WebP dosyası eksik|HEIF\/AVIF başlığı geçersiz|Bu BMP çeşidi desteklenmiyor/.test(raw)) return { short: 'Bu dosya açılamadı. PNG, JPG veya PDF olarak yeniden seçin.', raw };
    if (/Bu görselden temiz logo ayrılamadı|Bu fotoğraftaki marka ayrıntılarının tamamını/.test(raw)) return { short: 'Logo net ayrılamadı. Daha net bir görsel veya logo dosyası seçin.', raw };
    if (/^PDF sayfası açılamadı:/.test(raw)) return { short: 'PDF sayfası açılamadı. Başka bir sayfa veya dosya seçin.', raw };
    return null;
  }
  function onStatus(message) {
    const error = uploadFailure(message);
    if (renderStatus) renderStatus(error);
    return error ? error.short : message;
  }
  function stepFromPanels(visible) {
    if (visible('summary') || visible('pricing')) return 'quote';
    if (visible('fragrancePanel')) return 'fragrance';
    return 'design';
  }
  function mount(doc) {
    if (doc.getElementById('journeyProgress')) return;
    const main = doc.querySelector('main');
    if (!main) return;
    const progress = doc.createElement('div'); progress.id = 'journeyProgress';
    progress.setAttribute('role', 'navigation'); progress.setAttribute('aria-label', 'İşlem aşamaları');
    const list = doc.createElement('ol');
    const steps = new Map();
    for (const [key, label] of [['design', 'Tasarım'], ['fragrance', 'Koku'], ['quote', 'Teklif']]) {
      const item = doc.createElement('li'); item.textContent = label; item.dataset.step = key; steps.set(key, item); list.append(item);
    }
    progress.append(list);
    const header = main.querySelector('header');
    if (header) header.after(progress); else main.prepend(progress);
    const help = doc.createElement('section'); help.id = 'uploadRecovery'; help.hidden = true;
    help.setAttribute('aria-label', 'Görsel için yardım');
    const errorText = doc.createElement('p'); errorText.id = 'uploadRecoveryText'; errorText.setAttribute('role', 'alert');
    const actions = doc.createElement('div'); actions.className = 'uploadRecoveryActions';
    const change = doc.createElement('button'); change.type = 'button'; change.id = 'uploadRecoveryChange'; change.className = 'outline'; change.textContent = 'Görseli değiştir';
    change.onclick = () => doc.getElementById('unifiedUpload')?.click();
    const ask = doc.createElement('button'); ask.type = 'button'; ask.id = 'uploadRecoveryHelp'; ask.className = 'outline'; ask.textContent = 'Yardım iste';
    ask.onclick = () => doc.getElementById('contactWhatsApp')?.click();
    actions.append(change, ask);
    const details = doc.createElement('details'); const summary = doc.createElement('summary'); summary.textContent = 'Hata ayrıntısı';
    const original = doc.createElement('p'); original.id = 'uploadRecoveryOriginal'; details.append(summary, original);
    help.append(errorText, actions, details); progress.after(help);
    renderStatus = error => {
      help.hidden = !error;
      if (error) { errorText.textContent = error.short; original.textContent = error.raw; details.open = false; }
    };
    const summaryPanel = doc.getElementById('summary');
    const discussion = doc.createElement('div'); discussion.id = 'summaryDiscussion';
    const discuss = doc.createElement('button'); discuss.type = 'button'; discuss.id = 'discussDesign'; discuss.className = 'primary full'; discuss.textContent = 'Bu tasarımı görüşelim';
    const note = doc.createElement('p'); note.className = 'hint'; note.textContent = 'Mesajı önce görüp düzenlersiniz. Görsel otomatik gönderilmez; isterseniz JPG’yi indirip WhatsApp’ta kendiniz ekleyebilirsiniz.';
    const discussionError = doc.createElement('p'); discussionError.id = 'summaryDiscussionError'; discussionError.setAttribute('role', 'alert'); discussionError.hidden = true;
    discuss.onclick = () => {
      const opened = root.HijyenLabContactHelp?.openSummaryDraft?.() === true;
      discussionError.hidden = opened;
      if (!opened) discussionError.textContent = 'Tasarım değişmiş olabilir. Teklif önizlemesini yeniden oluşturun.';
    };
    discussion.append(discuss, note, discussionError);
    if (summaryPanel) { const back = doc.getElementById('summaryBack'); if (back) back.before(discussion); else summaryPanel.append(discussion); }
    const visible = id => { const el = doc.getElementById(id); return !!el && !el.hidden; };
    function sync() {
      const current = stepFromPanels(visible);
      const blank = root.HijyenLabPrintMode?.get() === 'unprinted';
      const designLabel = blank ? 'Ürün' : 'Tasarım';
      if (steps.get('design').textContent !== designLabel) steps.get('design').textContent = designLabel;
      if (steps.get('fragrance').hidden !== blank) steps.get('fragrance').hidden = blank;
      for (const [key, item] of steps) {
        if (key === current) { if (item.getAttribute('aria-current') !== 'step') item.setAttribute('aria-current', 'step'); }
        else item.removeAttribute('aria-current');
      }
      let ready = false;
      if (visible('summary')) { try { ready = !!root.getHijyenLabSummaryHelpContext?.(); } catch (_) { /* Invalid/unavailable snapshot fails closed. */ } }
      discuss.disabled = !ready;
    }
    if (root.MutationObserver) new root.MutationObserver(sync).observe(main, { subtree: true, attributes: true, attributeFilter: ['hidden', 'src'] });
    doc.addEventListener('input', sync); doc.addEventListener('change', sync);
    doc.addEventListener('hijyenlab:quote-state', sync);
    root.addEventListener?.('hijyenlab:print-mode-change', sync);
    const existing = doc.getElementById('status')?.textContent;
    if (existing) onStatus(existing);
    sync();
  }
  const api = Object.freeze({ uploadFailure, onStatus, stepFromPanels, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.HijyenLabExperience = api; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true }); else mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
