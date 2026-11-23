/* Optional advisor. Empty by default: no sector mapping is an approved recommendation.
 * Activate only with the owner's approved public category/product/reason configuration.
 * Never put customer examples, statistics, prices or private research in this configuration.
 */
(function (root) {
  'use strict';
  const DEFAULT_CONFIG = Object.freeze({ categories: Object.freeze([]) });
  const UNKNOWN_ID = 'other-or-unsure';
  function publicText(value, limit) {
    return typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit) : '';
  }
  function model(config, productIds) {
    const allowedProducts = new Set(productIds || []);
    const seen = new Set();
    const categories = [], errors = [];
    for (const category of Array.isArray(config?.categories) ? config.categories : []) {
      const id = publicText(category?.id, 60), label = publicText(category?.label, 100);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || id === UNKNOWN_ID || !label || seen.has(id)) { if (category?.mapping?.approved === true) errors.push('Invalid or duplicate approved category'); continue; }
      seen.add(id);
      const recommendation = (choice, allowInquiry = false) => {
        const reason = publicText(choice?.reason, 240), condition = publicText(choice?.condition, 100);
        if (allowedProducts.has(choice?.productId) && reason) return Object.freeze({ productId: choice.productId, reason, condition });
        const label = publicText(choice?.label, 140);
        if (allowInquiry && choice?.catalogPending === true && !choice.productId && label && reason && condition) return Object.freeze({ catalogPending: true, label, reason, condition });
        return null;
      };
      let primary = null, alternatives = [];
      if (category.mapping?.approved === true) {
        primary = recommendation(category.mapping.primary);
        const neutral = Array.isArray(category.mapping.choices);
        if (!neutral && !primary) errors.push(id + ': invalid approved primary');
        const source = neutral ? category.mapping.choices : Array.isArray(category.mapping.alternatives) ? category.mapping.alternatives : [category.mapping.alternative];
        const products = new Set(primary ? [primary.productId] : []);
        if (primary || neutral) for (const item of source) {
          const choice = recommendation(item, true);
          if (!choice) { if (item || neutral || Array.isArray(category.mapping.alternatives)) errors.push(id + ': invalid approved choice'); continue; }
          if (choice.productId && products.has(choice.productId)) continue;
          if (choice.productId) products.add(choice.productId);
          alternatives.push(choice);
        }
      }
      alternatives = Object.freeze(alternatives);
      categories.push(Object.freeze({ id, label, primary, alternatives, alternative: alternatives.find(choice => choice.productId) || null }));
    }
    const frozen = Object.freeze(categories);
    return Object.freeze({
      categories: frozen,
      errors: Object.freeze(errors),
      enabled: frozen.some(category => category.primary || category.alternatives.length),
      result(id) { return frozen.find(category => category.id === id) || null; },
      canSelect(id, productId) {
        const category = frozen.find(item => item.id === id);
        return !!category && !!productId && (category.primary?.productId === productId || category.alternatives.some(choice => !!choice.productId && choice.productId === productId));
      }
    });
  }
  function mount(config = DEFAULT_CONFIG, adapters = {}) {
    const doc = adapters.document || root.document;
    const catalog = adapters.catalog || root.ProductCatalog;
    const host = doc?.querySelector('.productPicker');
    if (!host || !catalog || doc.getElementById('productAdvisorButton')) return false;
    const data = model(config, catalog.items.map(product => product.id));
    // Do not expose an advisor whose every path is a dead end.
    if (!data.enabled || data.errors.length) return false;
    const select = adapters.selectProduct || (id => root.selectProduct(id));
    const button = doc.createElement('button');
    button.id = 'productAdvisorButton';
    button.type = 'button';
    button.className = 'outline';
    button.textContent = 'Hangi ürün bana uygun?';
    button.setAttribute('aria-haspopup', 'dialog');
    const dialog = doc.createElement('dialog');
    dialog.id = 'productAdvisorDialog';
    dialog.setAttribute('aria-labelledby', 'productAdvisorTitle');
    const title = doc.createElement('h2');
    title.id = 'productAdvisorTitle';
    title.textContent = 'İşletmenize uygun ürünü birlikte seçelim';
    title.tabIndex = -1;
    const intro = doc.createElement('p');
    intro.textContent = 'İsteğe bağlıdır. Öneriyi inceleyebilir veya mevcut ürününüzle devam edebilirsiniz.';
    const field = doc.createElement('label');
    field.htmlFor = 'productAdvisorCategory';
    field.textContent = 'Hangi alanda kullanacaksınız?';
    const categories = doc.createElement('select');
    categories.id = 'productAdvisorCategory';
    const option = (label, value) => {
      const item = doc.createElement('option'); item.textContent = label; item.value = value; return item;
    };
    categories.append(option('Seçin', ''));
    for (const category of data.categories) categories.append(option(category.label, category.id));
    categories.append(option('Diğer / Emin değilim', UNKNOWN_ID));
    const result = doc.createElement('div');
    result.id = 'productAdvisorResult';
    result.setAttribute('aria-live', 'polite');
    const cancel = doc.createElement('button');
    cancel.id = 'productAdvisorCancel';
    cancel.type = 'button';
    cancel.textContent = 'Mevcut ürünümle devam et';
    const close = () => dialog.close();
    cancel.onclick = close;
    dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
    function showResult() {
      result.replaceChildren();
      if (!categories.value) return;
      const category = data.result(categories.value);
      if (!category || (!category.primary && !category.alternatives.length)) {
        const message = doc.createElement('p');
        message.textContent = 'Bu alan için ürün önerisi henüz hazır değil. İsterseniz birlikte seçelim.';
        const help = doc.createElement('button');
        help.type = 'button'; help.className = 'outline'; help.id = 'productAdvisorHelp';
        help.textContent = 'WhatsApp’tan sor';
        help.onclick = () => {
          close();
          // Existing local editable draft opens, not WhatsApp itself. No category is sent.
          const trigger = doc.getElementById('contactWhatsApp');
          if (trigger) trigger.click();
        };
        help.disabled = !doc.getElementById('contactWhatsApp');
        result.append(message, help);
        return;
      }
      for (const [label, choice] of [['Önerilen ürün', category.primary], ...category.alternatives.map(choice => [choice.condition || (category.primary ? 'Alternatif' : 'Seçenek'), choice])]) {
        if (!choice) continue;
        const product = choice.catalogPending ? null : catalog.get(choice.productId);
        const card = doc.createElement('article');
        const heading = doc.createElement('h3'); heading.textContent = label + ': ' + (product?.label || choice.label);
        const reason = doc.createElement('p'); reason.textContent = choice.reason;
        const choose = doc.createElement('button');
        choose.type = 'button'; choose.className = 'primary';
        if (choice.catalogPending) {
          choose.textContent = 'Tasarım seçeneği hazırlanıyor';
          choose.dataset.advisorPending = 'true';
          choose.disabled = true;
          const pending = doc.createElement('p');
          pending.textContent = 'Bu ürünün tasarım seçeneği hazırlanıyor. Henüz bu ekranda tasarlanamaz veya fiyatlandırılamaz.';
          card.append(heading, reason, pending, choose); result.append(card);
          continue;
        }
        choose.textContent = 'Bu ürünü seç'; choose.dataset.advisorProduct = product.id;
        choose.onclick = () => {
          if (!data.canSelect(categories.value, product.id)) return;
          // Only this explicit action changes the product; reuse all existing safety gates.
          close(); select(product.id);
        };
        card.append(heading, reason, choose); result.append(card);
      }
    }
    const different = doc.createElement('button');
    different.id = 'productAdvisorDifferent'; different.type = 'button'; different.className = 'outline';
    different.textContent = 'Aradığım ürün bunlardan farklı';
    different.setAttribute('aria-expanded', 'false'); different.setAttribute('aria-controls', 'productAdvisorDifferentFields');
    const differentFields = doc.createElement('div'); differentFields.id = 'productAdvisorDifferentFields'; differentFields.hidden = true;
    const requestLabel = doc.createElement('label'); requestLabel.htmlFor = 'productAdvisorRequest'; requestLabel.textContent = 'Nasıl bir ürün arıyorsunuz? (İsteğe bağlı)';
    const request = doc.createElement('textarea'); request.id = 'productAdvisorRequest'; request.maxLength = 300; request.rows = 3;
    request.placeholder = 'Örneğin: farklı ölçü veya ambalaj biçimi';
    const requestNote = doc.createElement('p'); requestNote.textContent = 'Ürünü kısaca anlatabilirsiniz. Mesajı önce görüp düzenlersiniz; WhatsApp’ta Gönder’e siz basarsınız.';
    const prepare = doc.createElement('button'); prepare.id = 'productAdvisorPrepareMessage'; prepare.type = 'button'; prepare.className = 'outline'; prepare.textContent = 'Mesajı hazırla';
    const requestError = doc.createElement('p'); requestError.setAttribute('role', 'alert'); requestError.hidden = true;
    different.onclick = () => { differentFields.hidden = !differentFields.hidden; different.setAttribute('aria-expanded', String(!differentFields.hidden)); if (!differentFields.hidden) request.focus(); };
    prepare.onclick = () => {
      requestError.hidden = true;
      const open = root.HijyenLabContactHelp?.openDifferentProductDraft;
      if (typeof open !== 'function') { requestError.textContent = 'Mesaj taslağı şu anda açılamıyor. Lütfen yeniden deneyin.'; requestError.hidden = false; return; }
      close();
      let opened = false;
      try { opened = open(request.value) === true; } catch (_) { /* No automatic or generic fallback. */ }
      if (!opened) { dialog.showModal(); requestError.textContent = 'Mesaj taslağı açılamadı. Lütfen yeniden deneyin.'; requestError.hidden = false; }
    };
    differentFields.append(requestLabel, request, requestNote, prepare, requestError);
    categories.addEventListener('change', showResult);
    button.onclick = () => { categories.value = ''; result.replaceChildren(); dialog.showModal(); title.focus({ preventScroll: true }); };
    dialog.append(title, intro, field, categories, result, different, differentFields, cancel);
    host.append(button); doc.body.append(dialog);
    return true;
  }
  const api = Object.freeze({ DEFAULT_CONFIG, UNKNOWN_ID, model, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HijyenLabProductAdvisor = api;
})(typeof window !== 'undefined' ? window : globalThis);
