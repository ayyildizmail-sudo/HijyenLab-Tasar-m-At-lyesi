/* Free sample request: customer fills name, phone, address and interests; the message opens in
 * WhatsApp for the customer to send. Nothing is stored or sent automatically; no quantity is promised. */
(function (root) {
  'use strict';
  const PRODUCTS = Object.freeze([
    ['BM12', '25 × 30 cm Rulo Islak Havlu'], ['BM11', '30 × 30 cm Rulo Islak Havlu'], ['BM13', '30 × 35 cm Rulo Islak Havlu'],
    ['BM15', '25 × 25 cm Rulo Islak Havlu'], ['BM545', '20 × 25 cm Katlı Islak Havlu'], ['BM21', '7 × 12 cm Islak Mendil'],
    ['OSHIBORI', 'Oshibori Pamuk Havlu']
  ].map(Object.freeze));
  const SCENTS = Object.freeze([['flambau', 'Flambau çiçeği'], ['green_tea', 'Yeşil çay'], ['bodrum_mandarin', 'Bodrum mandalinası'], ['lemon', 'Limon']].map(Object.freeze));
  const PHONE = '905425699869';
  const clean = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

  function validate(input) {
    const name = clean(input.name, 80), phone = clean(input.phone, 25), address = clean(input.address, 300);
    if (name.length < 3 || !/\s/.test(name)) return { field: 'sampleName', message: 'Adınızı ve soyadınızı yazın.' };
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[0-9 ()-]+$/.test(phone) || digits.length < 10 || digits.length > 13) return { field: 'samplePhone', message: 'Geçerli bir telefon numarası yazın.' };
    if (address.length < 10) return { field: 'sampleAddress', message: 'Numunenin gönderileceği açık adresi yazın.' };
    const products = (input.products || []).filter(id => PRODUCTS.some(p => p[0] === id));
    if (!products.length) return { field: 'sampleProducts', message: 'İlgilendiğiniz en az bir ürünü işaretleyin.' };
    return null;
  }

  function message(input) {
    const products = PRODUCTS.filter(p => (input.products || []).includes(p[0])).map(p => p[1]);
    const scents = SCENTS.filter(s => (input.scents || []).includes(s[0])).map(s => s[1]);
    return ['Merhaba, ücretsiz numune talep etmek istiyorum.',
      'Ad soyad: ' + clean(input.name, 80),
      'Telefon: ' + clean(input.phone, 25),
      'Adres: ' + clean(input.address, 300),
      'İlgilendiğim ürünler: ' + products.join(', '),
      'Koku tercihim: ' + (scents.length ? scents.join(', ') : 'Fark etmez')].join('\n');
  }

  function link(input) { return 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(message(input)); }

  function mount(doc) {
    if (doc.getElementById('sampleRequest')) return;
    const main = doc.querySelector('main'); if (!main) return;
    const box = doc.createElement('details'); box.id = 'sampleRequest';
    const summary = doc.createElement('summary'); summary.textContent = 'Ücretsiz numune isteyin';
    const intro = doc.createElement('p'); intro.className = 'sampleIntro';
    intro.textContent = 'Ürünlerimizi önce elinizde görmek isterseniz bilgilerinizi bırakın. Hangi ürün ve kokulardan numune gönderileceğini ekibimiz belirler.';
    const form = doc.createElement('form'); form.id = 'sampleForm'; form.noValidate = true;
    const field = (id, label, tag, attrs) => {
      const wrap = doc.createElement('label'); wrap.textContent = label;
      const el = doc.createElement(tag); el.id = id; for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      wrap.append(el); form.append(wrap); return el;
    };
    field('sampleName', 'Ad soyad', 'input', { type: 'text', autocomplete: 'name', maxlength: '80' });
    field('samplePhone', 'Telefon', 'input', { type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: '25' });
    field('sampleAddress', 'Adres', 'textarea', { autocomplete: 'street-address', rows: '3', maxlength: '300' });
    const group = (id, legend, items, name) => {
      const set = doc.createElement('fieldset'); set.id = id;
      const lg = doc.createElement('legend'); lg.textContent = legend; set.append(lg);
      for (const [value, text] of items) {
        const l = doc.createElement('label'), c = doc.createElement('input');
        c.type = 'checkbox'; c.name = name; c.value = value; l.append(c, doc.createTextNode(' ' + text)); set.append(l);
      }
      form.append(set);
    };
    group('sampleProducts', 'İlgilendiğiniz ürünler', PRODUCTS, 'sampleProduct');
    group('sampleScents', 'Koku tercihiniz (isteğe bağlı)', SCENTS, 'sampleScent');
    const error = doc.createElement('p'); error.id = 'sampleError'; error.setAttribute('role', 'alert'); error.hidden = true;
    const send = doc.createElement('button'); send.type = 'submit'; send.className = 'primary'; send.textContent = 'WhatsApp ile gönder';
    const note = doc.createElement('small'); note.textContent = 'Bilgileriniz kaydedilmez; mesaj WhatsApp\'ta açılır, siz gönderirsiniz.';
    form.append(error, send, note);
    box.append(summary, intro, form);
    const contact = doc.getElementById('contactHelp');
    if (contact && contact.parentElement === main) contact.before(box); else main.append(box);

    const read = () => ({
      name: doc.getElementById('sampleName').value, phone: doc.getElementById('samplePhone').value, address: doc.getElementById('sampleAddress').value,
      products: [...form.querySelectorAll('input[name=sampleProduct]:checked')].map(c => c.value),
      scents: [...form.querySelectorAll('input[name=sampleScent]:checked')].map(c => c.value)
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = read(), problem = validate(input);
      if (problem) {
        error.textContent = problem.message; error.hidden = false;
        const target = doc.getElementById(problem.field); (target.querySelector?.('input') || target).focus();
        return;
      }
      error.hidden = true;
      root.open(link(input), '_blank', 'noopener');
    });
    const opener = doc.createElement('button'); opener.type = 'button'; opener.id = 'sampleOpener'; opener.className = 'linkButton';
    opener.textContent = 'Önce ürünü görmek ister misiniz? Ücretsiz numune isteyin';
    opener.addEventListener('click', () => { box.open = true; box.scrollIntoView({ behavior: 'smooth', block: 'start' }); doc.getElementById('sampleName').focus({ preventScroll: true }); });
    doc.getElementById('welcomeDelivery')?.after(opener);
  }

  const api = { PRODUCTS, SCENTS, validate, message, link, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.HijyenLabSampleRequest = api;
    const start = () => mount(root.document);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
