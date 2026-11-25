/* Server-rendered shells. Call only after the route has verified the requesting identity.
 * No customer data is embedded in HTML; owner APIs must authorize every request independently.
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function page(title, content, script = '') {
  return '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' + escapeHtml(title) + ' | HijyenLab</title><link rel="icon" type="image/svg+xml" href="/assets/hijyenlab-favicon.svg"><link rel="stylesheet" href="/admin-panel.css?v=4c9293955007"></head><body class="adminBody"><main class="adminMain"><header class="adminHeader"><div><img class="adminLogo" src="/assets/hijyenlab-logo.svg" alt="HijyenLab" width="801" height="307"><p class="adminEyebrow">HijyenLab · Yönetim</p><h1>' + escapeHtml(title) + '</h1></div><a href="/" target="_blank" rel="noopener noreferrer">Uygulamayı aç ↗</a></header>' + content + '</main>' + script + '</body></html>';
}
export function renderAdminPage() {
  return page('Gelen talepler', '<div id="adminApp"><p class="adminIntro">Yalnız açıkça gönderilmiş talepler ve ölçüme izin veren oturumların toplamları.</p><div class="adminToolbar"><button id="adminRefresh" type="button">Yenile</button><p id="adminStatus" role="status">Panel yükleniyor…</p></div><section aria-labelledby="adminStatsTitle"><h2 id="adminStatsTitle">Kullanım özeti</h2><p class="adminHint">Oturum sayısı kişi sayısı değildir. Ölçüme izin vermeyen ziyaretçiler bu sayılara dahil değildir.</p><div id="adminStats"></div></section><section aria-labelledby="adminLeadsTitle"><h2 id="adminLeadsTitle">İletişim talepleri</h2><p class="adminHint">Tam ve kullanıcı tarafından açıkça gönderilmiş kısmi talepler. Durum değiştirmek mesaj veya e-posta göndermez.</p><label for="adminStatusFilter">Gösterilecek durum</label><select id="adminStatusFilter"><option value="">Tümü</option><option value="new">Yeni</option><option value="contacted">İletişime geçildi</option><option value="quote_sent">Teklif gönderildi</option><option value="closed">Kapatıldı</option></select><div id="adminLeads"></div><button id="adminLoadMore" type="button" hidden>Daha fazla talep göster</button></section><p class="adminFootnote">E-posta bildirimleri yapılandırılmadı. Bu panelden otomatik e-posta, WhatsApp mesajı veya arama yapılmaz.</p></div>', '<script src="/admin-panel.js?v=94eda62e2f8e" defer></script>');
}
export function renderOwnerSetupPage(identity = {}) {
  // The route supplies only the authenticated caller's own subject/email, never other users.
  const subject = typeof identity.subject === 'string' ? identity.subject.slice(0, 300) : '';
  const email = typeof identity.email === 'string' ? identity.email.slice(0, 300) : '';
  return page('Panel erişimi', '<section class="adminNotice"><h2>Bu hesap için yönetici erişimi açılmadı</h2><p>Müşteri talepleri gösterilmez. Yönetici yetkisi ayrıca doğrulanıp yapılandırılmalıdır; bu ekran kendiliğinden yetki vermez.</p><p>Aşağıda yalnız giriş yaptığınız hesabın bilgileri yer alır.</p><dl><dt>Hesap kimliği</dt><dd class="adminIdentity">' + escapeHtml(subject || 'Kimlik alınamadı') + '</dd><dt>E-posta</dt><dd class="adminIdentity">' + escapeHtml(email || 'Paylaşılmadı') + '</dd></dl></section>');
}
