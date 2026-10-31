/* Static owner UI contains no customer records. /admin and every API request require server owner authorization. */
(function (root) {
  'use strict';
  const STATUS = Object.freeze({ new: 'Yeni', contacted: 'İletişime geçildi', quote_sent: 'Teklif gönderildi', closed: 'Kapatıldı' });
  const PRODUCTS = Object.freeze({ BM12: '25 × 30 cm Rulo Islak Havlu', BM11: '30 × 30 cm Rulo Islak Havlu', BM13: '30 × 35 cm Rulo Islak Havlu', BM15: '25 × 25 cm Rulo Islak Havlu', BM545: '20 × 25 cm Katlı Islak Havlu', BM21: '7 × 12 cm Islak Mendil' });
  const FRAGRANCES = Object.freeze({ flambau: 'Flambau', green_tea: 'Yeşil çay', bodrum_mandarin: 'Bodrum mandalinası', lemon: 'Limon' });
  const STAGES = Object.freeze({ visit: 'Ölçümlü ziyaret', design_started: 'Tasarım başlatıldı', design_ready: 'Tasarım hazır aşamasına ulaşıldı', fragrance_selected: 'Koku seçildi', quote_viewed: 'Teklif görüntülendi' });
  function text(value) { return value === null || value === undefined || value === '' ? 'Belirtilmedi' : String(value); }
  function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('tr-TR') : '—'; }
  function date(value) {
    if (value === null || value === undefined || value === '') return 'Belirtilmedi';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Belirtilmedi' : parsed.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  }
  function mount(doc) {
    if (!doc.getElementById('adminApp')) return null;
    const $ = id => doc.getElementById(id);
    let rows = [], nextOffset = null, generation = 0, updating = false, fetching = false;
    function node(tag, content, className) { const element = doc.createElement(tag); if (content !== undefined) element.textContent = content; if (className) element.className = className; return element; }
    function status(message) { $('adminStatus').textContent = message; }
    function controls() { $('adminRefresh').disabled = updating || fetching; $('adminStatusFilter').disabled = updating || fetching; $('adminLoadMore').disabled = updating || fetching; $('adminLoadMore').hidden = nextOffset === null; }
    function clearPrivate() { rows = []; nextOffset = null; $('adminLeads').replaceChildren(); $('adminStats').replaceChildren(); controls(); }
    async function request(path, options = {}) {
      const controller = new AbortController(), timer = root.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await root.fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, signal: controller.signal });
        if (!response.ok) { const error = new Error('HTTP ' + response.status); error.status = response.status; throw error; }
        return await response.json();
      } finally { root.clearTimeout(timer); }
    }
    function failure(error, target) {
      if (error.status === 401 || error.status === 403) { clearPrivate(); status('Bu panel için yetkiniz doğrulanamadı. Sayfayı yeniden açıp girişinizi kontrol edin.'); return; }
      const message = error.status === 409 ? 'Bu talep başka bir işlemde değişti. Güncel durumu görmek için Yenile’ye basın.' : error.status === 404 ? 'Bu talep artık bulunamıyor. Listeyi yenileyin.' : 'İşlemin tamamlandığı doğrulanamadı. Bağlantınızı kontrol edip yeniden deneyin.';
      if (target) target.textContent = message; else status(message);
    }
    function renderStats(data) {
      const host = $('adminStats'); host.replaceChildren();
      const window = Number.isInteger(data.windowDays) && data.windowDays > 0 ? data.windowDays : null;
      host.append(node('p', window ? 'Son ' + window + ' gün · İzinli oturum ölçümü' : 'İzinli oturum ölçümü', 'adminHint'));
      if (data.analyticsEnabled !== true) host.append(node('p', 'Yeni kullanım ölçümü kapalı. Varsa önceki kayıtların toplamları gösterilir.', 'adminNotice'));
      if (data.collectionEnabled !== true) host.append(node('p', 'Yeni iletişim talebi toplama şu anda kapalı.', 'adminHint'));
      const metrics = node('div', undefined, 'adminMetrics');
      for (const [label, value] of [['Ölçüme izin veren oturumlar', data.sessionCount], ['WhatsApp bağlantısı tıklamaları', data.counts?.whatsapp_clicked], ['Telefon bağlantısı tıklamaları', data.counts?.phone_clicked]]) {
        const item = node('div', undefined, 'adminMetric'); item.append(node('strong', count(value)), node('span', label)); metrics.append(item);
      }
      host.append(metrics);
      const table = node('table'), head = node('thead'), header = node('tr'); header.append(node('th', 'Ulaşılan aşama'), node('th', 'Oturum')); head.append(header);
      const body = node('tbody');
      for (const [key, label] of Object.entries(STAGES)) { const row = node('tr'); row.append(node('td', label), node('td', count(data.counts?.[key]))); body.append(row); }
      table.append(head, body); const wrapper = node('div', undefined, 'adminTableWrap'); wrapper.append(table); host.append(wrapper);
      host.append(node('p', 'Aynı oturum aynı aşamada bir kez sayılır. Satırlar toplanarak kişi sayısı bulunamaz. WhatsApp/telefon bağlantısına tıklanması mesajın gönderildiğini veya aramanın gerçekleştiğini göstermez. Devam etmeyen oturumun kesin olarak terk edildiği söylenemez.', 'adminHint'));
      if (Number.isInteger(data.retentionDays) && data.retentionDays > 0) host.append(node('p', 'Yapılandırılmış saklama süresi: ' + data.retentionDays + ' gün.', 'adminHint'));
    }
    function renderLeads() {
      const host = $('adminLeads'); host.replaceChildren();
      if (!rows.length) { host.append(node('p', 'Bu görünümde henüz talep yok.', 'adminEmpty')); return; }
      for (const lead of rows) {
        const article = node('article', undefined, 'adminLead'), heading = node('div', undefined, 'adminLeadHeader');
        heading.append(node('h3', text(lead.contact?.companyName || lead.contact?.contactName)), node('span', STATUS[lead.status] || 'Bilinmeyen durum', 'adminBadge'));
        heading.append(node('span', { printed: 'Baskılı', unprinted: 'Baskısız' }[lead.printMode] || 'Baskı seçimi belirtilmedi', 'adminBadge'));
        article.append(heading, node('p', (lead.kind === 'contact_request' ? 'İletişim isteği · kısmi bilgi' : lead.kind === 'complete' ? 'Tam talep' : 'Talep') + ' · ' + date(lead.createdAt), 'adminHint'));
        const details = node('dl');
        const values = [['Baskı seçimi', { printed: 'Baskılı', unprinted: 'Baskısız' }[lead.printMode]], ['Yetkili kişi', lead.contact?.contactName], ['Telefon', lead.contact?.phone], ['İl / ilçe', [lead.contact?.province, lead.contact?.district].filter(Boolean).join(' / ')], ['Ürün', PRODUCTS[lead.productId] || lead.productId], ['Adet', lead.quantity === null ? null : lead.quantity], ['Koku', FRAGRANCES[lead.fragrance] || lead.fragrance]];
        for (const [label, value] of values) details.append(node('dt', label), node('dd', text(value)));
        article.append(details, node('p', 'Talep no: ' + text(lead.id) + ' · Saklama sonu: ' + date(lead.expiresAt), 'adminHint'));
        if (lead.printMode === 'unprinted') article.append(node('p', 'Baskısız; klişe uygulanmaz', 'adminNotice'));
        if (lead.printMode !== 'unprinted' && lead.design) {
          const designDetails = node('details'), designTitle = node('summary', 'Gönderilen tasarım bilgileri'), designList = node('dl');
          for (const [label, value] of [['Zemin', lead.design.background], ['Ön yüz yazısı', lead.design.frontText], ['Ön yüz yazı tipi', lead.design.frontFont], ['Ön baskı renkleri', Array.isArray(lead.design.frontInkColors) ? lead.design.frontInkColors.join(', ') : null], ['Arka yüz yazısı', lead.design.rearText], ['Arka baskı rengi', lead.design.rearInkColor], ['QR bağlantısı', lead.design.qrEnabled === true ? lead.design.qrUrl : null]]) designList.append(node('dt', label), node('dd', text(value)));
          designDetails.append(designTitle, designList); article.append(designDetails);
        }
        const actions = node('div', undefined, 'adminLeadActions'), field = node('div'), label = node('label', 'Talep durumu'), select = node('select');
        // IDs never derive from untrusted customer text.
        select.id = 'adminLeadStatus-' + rows.indexOf(lead); label.htmlFor = select.id;
        for (const [value, title] of Object.entries(STATUS)) { const option = node('option', title); option.value = value; select.append(option); }
        select.value = STATUS[lead.status] ? lead.status : '';
        const save = node('button', 'Durumu kaydet'); save.type = 'button';
        const feedback = node('p', undefined, 'adminLeadMessage'); feedback.setAttribute('role', 'status');
        save.onclick = async () => {
          if (updating || fetching || !STATUS[select.value]) return;
          if (select.value === lead.status) { feedback.textContent = 'Durum zaten böyle.'; return; }
          const ticket = generation, desired = select.value; updating = true; controls(); save.disabled = true; select.disabled = true; feedback.textContent = 'Kaydediliyor…';
          try {
            const result = await request('/api/admin/leads/' + encodeURIComponent(lead.id) + '/status', { method: 'PATCH', body: JSON.stringify({ status: desired, revision: lead.revision }) });
            if (ticket !== generation) return;
            if (result.updated !== true || result.id !== lead.id || result.status !== desired || !Number.isInteger(result.revision) || result.revision <= lead.revision) throw new Error('Unverified status');
            lead.status = result.status; lead.revision = result.revision; heading.children[1].textContent = STATUS[result.status]; feedback.textContent = 'Durum kaydedildi. Mesaj veya e-posta gönderilmedi.'; if (STATUS[$('adminStatusFilter').value] && $('adminStatusFilter').value !== result.status) feedback.textContent += ' Bu talep artık seçili filtreye uymuyor; listeyi yenileyin.';
          } catch (error) { if (ticket === generation) { select.value = lead.status; failure(error, feedback); } }
          finally { updating = false; save.disabled = false; select.disabled = false; controls(); }
        };
        field.append(label, select); actions.append(field, save, feedback); article.append(actions); host.append(article);
      }
    }
    async function load(append = false) {
      if (updating || fetching || (append && nextOffset === null)) return;
      fetching = true; const ticket = ++generation; controls(); status('Yükleniyor…');
      try {
        const filter = $('adminStatusFilter').value, offset = append ? nextOffset : 0;
        const query = '?offset=' + offset + '&limit=25' + (STATUS[filter] ? '&status=' + encodeURIComponent(filter) : '');
        const [leads, stats] = await Promise.all([request('/api/admin/leads' + query), append ? Promise.resolve(null) : request('/api/admin/stats?days=30')]);
        if (ticket !== generation) return;
        if (!Array.isArray(leads.items) || !(leads.nextOffset === null || Number.isSafeInteger(leads.nextOffset) && leads.nextOffset > offset)) throw new Error('Invalid response');
        rows = append ? [...rows, ...leads.items.filter(item => !rows.some(existing => existing.id === item.id))] : leads.items;
        nextOffset = leads.nextOffset; renderLeads(); if (stats) renderStats(stats); status(rows.length + ' talep gösteriliyor.');
      } catch (error) { if (ticket === generation) { clearPrivate(); failure(error); } }
      finally { if (ticket === generation) { fetching = false; controls(); } }
    }
    $('adminRefresh').onclick = () => load(); $('adminStatusFilter').onchange = () => load(); $('adminLoadMore').onclick = () => load(true);
    load();
    return Object.freeze({ load });
  }
  const api = Object.freeze({ STATUS, PRODUCTS, FRAGRANCES, STAGES, text, count, date, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.HijyenLabAdminPanel = api; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => mount(root.document), { once: true }); else mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
