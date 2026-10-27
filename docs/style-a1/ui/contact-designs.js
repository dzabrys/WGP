(() => {
  const isValidPhone = text => /^[+]?[0-9\s().-]+$/.test(text.trim()) && /^[0-9]{7,15}$/.test(text.replace(/\D/g, ''));
  const mailtoUrl = (recipient, message) => 'mailto:' + recipient + '?subject=' + encodeURIComponent(message.subject) + '&body=' + encodeURIComponent(message.body);
  window.WGPContactMail = {isValidPhone, mailtoUrl};
  const init = () => {
    const form = document.querySelector('form[data-contact-design]');
    if (!form) return;
    const fields = [...form.querySelectorAll('input, select, textarea')];
    const panels = [...form.querySelectorAll('[data-contact-step]')];
    const stepLinks = [...form.querySelectorAll('[data-go-step]')];
    const next = form.querySelector('[data-step-next]');
    const back = form.querySelector('[data-step-back]');
    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('.contact-form-status');
    const context = form.querySelector('.contact-context');
    const guide = document.querySelector('.contact-guide-disclosure');
    const recipient = 'biuro@wielkiegryplanszowe.pl';
    let step = 0;

    const products = [...form.querySelectorAll('input[name="gra"][data-format]')];
    const selectedProduct = () => products.find(product => product.checked);
    const catalog = window.WGPCatalog;
    const variantField = form.querySelector('[data-contact-variant]');
    const productData = () => catalog?.get(selectedProduct()?.value || '');
    const selectedVariant = () => catalog?.variant(productData(), variantField?.value);
    let variantProductId = '';
    let choosingProduct = false;
    let initialVariant = '';
    const quantity = () => Math.max(1, Number(value('liczba_egzemplarzy')) || 1);
    const priceText = total => total?.gross == null ? 'Wycena indywidualna' : catalog.money(total.net) + ' netto / ' + catalog.money(total.gross) + ' brutto';
    const specification = () => {
      const product = productData();
      return product ? [selectedVariant()?.id === 'other' ? 'Opis wariantu standardowego. Rozmiar i zawartość wariantu indywidualnego wymagają potwierdzenia.' : '', product.description, ...product.facts.map(([key, text]) => key + ': ' + text), 'W zestawie: ' + product.included, product.material].filter(Boolean).join('\n') : '';
    };
    const syncVariant = () => {
      if (!variantField || !catalog) return;
      const product = productData();
      variantField.disabled = !product;
      variantField.closest('label').hidden = !product;
      form.querySelector('[data-contact-spec]').hidden = !product;
      form.querySelector('[data-order-prices]').hidden = !product;
      form.elements.namedItem('liczba_egzemplarzy').disabled = !product;
      if ((product?.id || '') !== variantProductId) {
        choosingProduct = false;
        variantProductId = product?.id || '';
        variantField.replaceChildren();
        for (const variant of catalog.options(product)) {
          const option = document.createElement('option');
          option.value = variant.id;
          option.textContent = variant.label + ' — ' + (variant.gross == null ? 'wycena indywidualna' : catalog.money(variant.gross) + ' brutto');
          variantField.append(option);
        }
        if (product && initialVariant) variantField.value = catalog.variant(product, initialVariant).id;
        initialVariant = '';
        if (product) {
          const thumbnail = form.querySelector('[data-order-image]');
          thumbnail.src = product.image;
          thumbnail.alt = product.name;
          form.querySelector('[data-contact-description]').textContent = product.description;
          form.querySelector('[data-contact-included]').textContent = product.included;
          form.querySelector('[data-contact-material]').textContent = product.material;
          form.querySelector('[data-review-description]').textContent = product.description;
          form.querySelector('[data-review-included]').textContent = product.included;
          form.querySelector('[data-review-material]').textContent = product.material;
          const facts = form.querySelector('[data-contact-facts]');
          facts.replaceChildren();
          for (const [key, text] of product.facts) {
            const term = document.createElement('dt'), description = document.createElement('dd');
            term.textContent = key; description.textContent = text;
            facts.append(term, description);
          }
          form.querySelector('[data-review-facts]').replaceChildren(...[...facts.children].map(node => node.cloneNode(true)));
        }
      }
      form.querySelector('[data-product-menu]').hidden = Boolean(product) && !choosingProduct;
      form.querySelector('[data-order-context]').hidden = !product || choosingProduct;
      form.querySelector('[data-return-products]').setAttribute('aria-expanded', String(choosingProduct));
      form.querySelector('[data-review-spec]').hidden = !product;
      if (product) {
        const choice = selectedVariant();
        form.querySelector('[data-contact-spec] summary').textContent = choice.id === 'other' ? 'Opis standardowej wersji gry — wariant indywidualny do ustalenia' : 'Opis i zawartość wybranej gry';
        const count = quantity();
        const total = catalog.totals(choice, count);
        form.querySelector('[data-order-title]').textContent = product.name;
        form.querySelector('[data-order-choice]').textContent = product.format + ' · ' + choice.label + ' · ' + count + ' zest.';
        form.querySelector('[data-order-price]').textContent = priceText(total);
        form.querySelector('[data-contact-unit-price]').textContent = 'Za zestaw: ' + priceText(choice);
        form.querySelector('[data-contact-total-price]').textContent = 'Razem (' + count + ' zest.): ' + priceText(total);
      }
    };
    const formatField = form.elements.namedItem('format');
    const search = form.querySelector('[data-product-search]');
    const category = form.querySelector('[data-product-category]');
    const clearProduct = form.querySelector('[data-product-clear]');
    form.querySelector('[data-return-products]').addEventListener('click', () => {
      choosingProduct = true;
      syncVariant();
      search.focus();
    });
    form.addEventListener('contact-product-chosen', () => {
      choosingProduct = false;
      syncVariant();
    });
    const normalize = text => text.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
    const filterProducts = () => {
      const term = normalize(search.value.trim());
      let count = 0;
      products.forEach(product => {
        const inCategory = !category.value || (category.value === 'custom' ? product.dataset.productGroup !== 'plansze' : product.dataset.productGroup === category.value);
        const visible = normalize(product.value).includes(term) && inCategory;
        product.closest('.contact-product').hidden = !visible;
        if (visible) count++;
      });
      form.querySelector('[data-product-count]').textContent = 'Pasujące produkty: ' + count;
      form.querySelector('[data-product-empty]').hidden = count !== 0;
    };
    search?.addEventListener('input', filterProducts);
    category?.addEventListener('change', filterProducts);
    clearProduct?.addEventListener('click', () => {
      products.forEach(product => { product.checked = false; });
      updateSummary();
      form.dispatchEvent(new Event('change', {bubbles: true}));
      search.focus();
    });
    const value = name => {
      // Always derive both values from the same product, including the mail body.
      if (products.length && name === 'gra') return selectedProduct()?.value || '';
      if (products.length && name === 'format') return productData()?.format || selectedProduct()?.dataset.format || '';
      if (catalog && name === 'wariant') return selectedVariant()?.label || '';
      if (catalog && name === 'liczba_egzemplarzy' && !productData()) return '';
      const field = form.elements.namedItem(name);
      if (!field) return '';
      return String(field.value || '').trim();
    };
    const showStep = (index, focus = true) => {
      if (!panels.length) return;
      step = Math.max(0, Math.min(index, panels.length - 1));
      panels.forEach((panel, i) => { panel.hidden = i !== step; });
      stepLinks.forEach((button, i) => {
        if (i === step) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        button.dataset.complete = String(i < step);
      });
      back.hidden = step === 0;
      next.hidden = step === panels.length - 1;
      submit.hidden = step !== panels.length - 1;
      form.querySelector('.contact-captcha').hidden = step !== panels.length - 1;
      form.querySelector('[data-step-caption]').textContent = `Krok ${step + 1} z ${panels.length}`;
      if (focus) panels[step].querySelector('h3').focus();
      if (step === panels.length - 1) initCaptcha();
    };
    const errorFor = field => field.id && document.getElementById(`${field.id}-error`);
    const clearError = field => {
      field.removeAttribute('aria-invalid');
      const error = errorFor(field);
      if (error) { error.hidden = true; error.textContent = ''; }
    };
    const validateField = field => {
      field.setCustomValidity('');
      if (field.required && !['radio', 'checkbox'].includes(field.type) && field.value && !field.value.trim()) {
        field.setCustomValidity('Wpisz treść, nie tylko spacje.');
      }
      if (field.name === 'telefon' && field.value && !isValidPhone(field.value)) {
        field.setCustomValidity('Podaj numer telefonu zawierający od 7 do 15 cyfr, np. +48 600 894 644.');
      }
      const valid = field.validity.valid;
      const error = errorFor(field);
      if (valid) clearError(field);
      else {
        field.setAttribute('aria-invalid', 'true');
        if (error) {
          error.textContent = field.validity.customError ? field.validationMessage
            : field.validity.valueMissing ? ({ name: 'Wpisz swoje imię.', nazwisko: 'Wpisz swoje nazwisko.', organizacja: 'Podaj nazwę firmy, szkoły lub instytucji.', email: 'Podaj adres e-mail.', telefon: 'Podaj numer telefonu.', message: 'Napisz kilka słów o swoim zapytaniu.' }[field.name] || 'Uzupełnij to pole.')
              : field.type === 'email' ? 'Wpisz poprawny adres e-mail, np. imie@firma.pl.' : 'Sprawdź wpisaną wartość.';
          error.hidden = false;
        }
      }
      return valid;
    };
    const validate = container => {
      const invalid = [...container.querySelectorAll('input, select, textarea')].filter(field => !field.disabled && !validateField(field));
      if (!invalid.length) return true;
      const panel = invalid[0].closest('[data-contact-step]');
      if (panel) showStep(panels.indexOf(panel), false);
      invalid[0].focus();
      invalid[0].reportValidity();
      return false;
    };
    const updateSummary = () => {
      syncVariant();
      if (products.length) {
        formatField.value = value('format');
        formatField.disabled = !selectedProduct();
        form.querySelector('[data-product-selected]').textContent = value('gra') ? 'Wybrany produkt: ' + value('gra') : 'Nie wybrano produktu — możesz wysłać pytanie ogólne.';
        clearProduct.hidden = !selectedProduct();
      }
      const selected = value('gra') || value('rodzaj_zapytania') || sourceTopic;
      if (context) {
        context.hidden = !selected;
        context.textContent = selected ? `Zapytanie o: ${selected}` : '';
      }
      const data = {
        recipient,
        person: [value('name'), value('nazwisko')].filter(Boolean).join(' ') || 'Uzupełnij dane kontaktowe',
        organization: value('organizacja') || 'Nie podano',
        contact: [value('email'), value('telefon')].filter(Boolean).join('\n') || 'Podaj adres e-mail',
        kind: value('rodzaj_zapytania') || sourceTopic || (value('gra') ? 'Pytanie o produkt' : 'Zapytanie ogólne'),
        game: value('gra') || 'Bez wyboru produktu — pytanie ogólne',
        group: value('grupa') || 'Do ustalenia',
        place: value('miejsce') || 'Do ustalenia',
        date: value('termin') ? value('termin').split('-').reverse().join('.') : 'Do ustalenia',
        quantity: productData() ? String(quantity()) : 'Nie dotyczy',
        variant: value('wariant') || 'Nie dotyczy — bez produktu',
        unitprice: productData() ? priceText(selectedVariant()) : 'Nie dotyczy',
        totalprice: productData() ? priceText(catalog.totals(selectedVariant(), quantity())) : 'Nie dotyczy',
        specification: specification() || 'Nie dotyczy — pytanie ogólne',
        format: value('format') || 'Nie dotyczy — bez produktu',
        message: value('message') || 'Uzupełnij wiadomość w szczegółach',
      };
      form.querySelectorAll('[data-summary]').forEach(node => { node.textContent = data[node.dataset.summary] || ''; });
      const subjectPreview = form.querySelector('[data-mail-preview-subject]');
      if (subjectPreview) subjectPreview.textContent = emailSubject();
    };
    const query = new URLSearchParams(location.search);
    const topic = (query.get('temat') || '').slice(0, 180).trim();
    initialVariant = query.get('wariant') || '';
    const linkedProduct = catalog?.get(query.get('produkt') || '');
    const match = products.find(product => linkedProduct ? product.value === linkedProduct.name : normalize(product.value) === normalize(topic));
    if (match) match.checked = true;
    if (!match && query.get('rodzaj') === 'custom') {
      const custom = products.find(product => product.value === 'Gra autorska');
      if (custom) custom.checked = true;
    }
    const sourceTopic = match ? '' : topic;
    if (selectedProduct() && query.get('zamiar') === 'zakup') {
      const count = Number(query.get('liczba'));
      form.elements.namedItem('liczba_egzemplarzy').value = Number.isInteger(count) && count >= 1 && count <= 10000 ? String(count) : '1';
      const message = form.elements.namedItem('message');
      if (!message.value) message.value = 'Dzień dobry, chcę zamówić wybrany produkt. Proszę o potwierdzenie dostępności i terminu realizacji.';
    }
    document.querySelectorAll('.contact-view-picker a').forEach(link => {
      const url = new URL(link.href);
      for (const key of ['temat', 'rodzaj', 'produkt', 'wariant', 'liczba', 'zamiar']) if (query.has(key)) url.searchParams.set(key, query.get(key));
      link.href = url.href;
    });
    if (guide && typeof matchMedia === 'function') {
      const compact = matchMedia('(max-width:620px)');
      const adapt = () => { guide.open = !compact.matches; };
      adapt();
      compact.addEventListener?.('change', adapt);
    }
    for (const field of fields) {
      field.addEventListener('input', () => {
        field.setCustomValidity('');
        if (field.hasAttribute('aria-invalid')) validateField(field);
        updateSummary();
      });
      field.addEventListener('change', updateSummary);
    }
    form.elements.namedItem('telefon').addEventListener('beforeinput', event => {
      if (event.data && /[^0-9+\s().-]/.test(event.data)) event.preventDefault();
    });
    if (panels.length) {
      form.querySelector('.contact-steps').hidden = false;
      form.querySelector('.contact-step-actions').hidden = false;
      form.querySelector('.contact-fallback-actions').hidden = true;
      form.querySelector('[data-step-caption]').hidden = false;
      showStep(0, false);
      next.addEventListener('click', () => { if (validate(panels[step])) showStep(step + 1); });
      back.addEventListener('click', () => showStep(step - 1));
      stepLinks.forEach(button => button.addEventListener('click', () => {
        const target = Number(button.dataset.goStep);
        if (target <= step) return showStep(target);
        for (let i = 0; i < target; i++) if (!validate(panels[i])) return;
        showStep(target);
      }));
      form.querySelector('[data-edit-details]').addEventListener('click', () => showStep(0));
    }
    updateSummary();
    const provider = form.querySelector('[data-mail-provider]');
    const help = form.querySelector('[data-mail-help]');
    const manual = form.querySelector('[data-mail-manual]');
    const copyButton = form.querySelector('[data-copy-mail]');
    const captchaStatus = form.querySelector('[data-captcha-status]');
    const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
    const captchaApiBase = localPreview ? new URL('./', location.href).href : document.querySelector('meta[name="contact-api-base"]')?.content || new URL('./', location.href).href;
    const captchaEndpoint = route => new URL(route, captchaApiBase).href;
    const captchaRetry = form.querySelector('[data-captcha-retry]');
    let captchaStarted = false;
    let widgetId;
    let verifiedUntil = 0;
    let approvalTimer;
    const lockMail = message => {
      verifiedUntil = 0;
      clearTimeout(approvalTimer);
      submit.disabled = true;
      copyButton.disabled = true;
      if (message) captchaStatus.textContent = message;
    };
    const canUseMail = () => {
      if (Date.now() < verifiedUntil && !value('_gotcha')) return true;
      lockMail('Dokończ weryfikację CAPTCHA przed przygotowaniem wiadomości.');
      captchaRetry.hidden = false;
      return false;
    };
    async function initCaptcha() {
      if (captchaStarted) return;
      captchaStarted = true;
      captchaRetry.hidden = true;
      lockMail('Ładowanie weryfikacji…');
      try {
        const response = await fetch(captchaEndpoint('api/captcha/config'), {cache: 'no-store', signal: AbortSignal.timeout(10000)});
        if (!response.ok) throw new Error('config');
        const config = await response.json();
        const mode = form.querySelector('[data-captcha-mode]');
        mode.hidden = true;
        mode.textContent = '';
        if (!window.turnstile) await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const timeout = setTimeout(() => { script.remove(); reject(new Error('timeout')); }, 15000);
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.onload = () => { clearTimeout(timeout); resolve(); };
          script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('script')); };
          document.head.append(script);
        });
        if (widgetId !== undefined) window.turnstile.remove(widgetId);
        widgetId = window.turnstile.render(form.querySelector('[data-captcha-widget]'), {
          sitekey: config.sitekey, action: 'contact', language: 'pl', size: 'flexible',
          callback: async token => {
            lockMail('Sprawdzanie potwierdzenia…');
            try {
              const result = await fetch(captchaEndpoint('api/captcha/verify'), {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({token, trap: value('_gotcha')}), signal: AbortSignal.timeout(12000),
              });
              if (!result.ok || (await result.json()).ok !== true) throw new Error('verify');
              verifiedUntil = Date.now() + 240000;
              submit.disabled = false;
              copyButton.disabled = false;
              captchaRetry.hidden = true;
              captchaStatus.textContent = 'Weryfikacja zakończona. Możesz otworzyć pocztę lub skopiować wiadomość.';
              approvalTimer = setTimeout(() => {
                lockMail('Weryfikacja wygasła. Potwierdź ponownie, że jesteś człowiekiem.');
                captchaRetry.hidden = false;
              }, 240000);
            } catch {
              lockMail('Nie udało się potwierdzić CAPTCHA. Spróbuj ponownie za chwilę. Dane pozostają w formularzu.');
              captchaRetry.hidden = false;
            }
          },
          'expired-callback': () => { lockMail('Weryfikacja wygasła. Spróbuj ponownie.'); captchaRetry.hidden = false; },
          'error-callback': errorCode => {
            const code = String(errorCode || '').replace(/[^0-9]/g, '').slice(0, 6);
            const message = code === '110200'
              ? 'Domena tej strony nie jest dodana do CAPTCHA. Administrator musi dodać dzabrys.github.io w ustawieniach Turnstile.'
              : ['110100', '110110', '400020', '400070'].includes(code)
                ? 'Konfiguracja CAPTCHA wymaga sprawdzenia przez administratora.'
                : code === '200100'
                  ? 'Sprawdź datę i godzinę urządzenia, a następnie odśwież stronę.'
                  : 'Nie udało się połączyć z CAPTCHA Cloudflare. Otwórz tę stronę w aktualnym Chrome, Edge lub Firefox i spróbuj ponownie. Dane pozostają w formularzu.';
            lockMail(message + (code ? ' Kod błędu: ' + code + '.' : ''));
            captchaRetry.hidden = false;
            return true;
          },
          'unsupported-callback': () => {
            lockMail('Ta przeglądarka nie obsługuje CAPTCHA. Otwórz stronę w aktualnym Chrome, Edge lub Firefox. Dane pozostają w formularzu.');
            captchaRetry.hidden = false;
          },
        });
        captchaStatus.textContent = 'Dokończ weryfikację w polu powyżej.';
      } catch {
        captchaStarted = false;
        lockMail('CAPTCHA jest niedostępna. Sprawdź połączenie i spróbuj ponownie. Dane pozostają w formularzu.');
        captchaRetry.hidden = false;
      }
    }
    captchaRetry.addEventListener('click', () => { captchaStarted = false; initCaptcha(); });
    function emailSubject() {
      const organization = value('organizacja').replace(/[\r\n]+/g, ' ');
      const person = [value('name'), value('nazwisko')].filter(Boolean).join(' ').replace(/[\r\n]+/g, ' ');
      return [organization && '[' + organization + ']', person, value('rodzaj_zapytania') || sourceTopic || 'Zapytanie', value('gra')].filter(Boolean).join(' — ');
    }
    const compose = () => {
      const person = [value('name'), value('nazwisko')].filter(Boolean).join(' ');
      const date = value('termin');
      const section = (heading, lines) => {
        const content = lines.filter(Boolean);
        return content.length ? heading + '\n' + content.join('\n') : '';
      };
      const body = [
        'Dzień dobry,\n\nprzesyłam zapytanie za pośrednictwem strony Wielkie Gry Planszowe.',
        section('ZAPYTANIE', [
          'Temat pytania: ' + (value('rodzaj_zapytania') || (value('gra') ? 'Pytanie o produkt' : 'Zapytanie ogólne')),
          sourceTopic && 'Temat z podstrony: ' + sourceTopic,
          value('gra') && 'Produkt: ' + value('gra'),
          value('format') && 'Format gry: ' + value('format'),
          value('wariant') && 'Rozmiar / wariant: ' + value('wariant'),
          productData() && 'Cena za zestaw: ' + priceText(selectedVariant()),
          productData() && 'Razem za ' + quantity() + ' zest.: ' + priceText(catalog.totals(selectedVariant(), quantity())),
          productData() && 'Liczba egzemplarzy: ' + quantity(),
        ]),
        section('UCZESTNICY I ORGANIZACJA', [
          value('grupa') && 'Dla kogo: ' + value('grupa'),
          value('miejsce') && 'Miejsce: ' + value('miejsce'),
          date && 'Planowany termin: ' + date.split('-').reverse().join('.'),
        ]),
        section('OPIS I ZAWARTOŚĆ PRODUKTU', [specification()]),
        section('TREŚĆ WIADOMOŚCI', [value('message')]),
        section('DANE DO KONTAKTU', [
          'Imię i nazwisko: ' + person,
          value('organizacja') && 'Firma / szkoła / instytucja: ' + value('organizacja'),
          'E-mail: ' + value('email'),
          value('telefon') && 'Telefon: ' + value('telefon'),
        ]),
        'Pozdrawiam,\n' + person + (value('organizacja') ? '\n' + value('organizacja') : ''),
      ].filter(Boolean).join('\n\n');
      return {subject: emailSubject(), body};
    };
    const prepareManual = () => {
      const message = compose();
      form.querySelector('[data-mail-subject]').value = message.subject;
      form.querySelector('[data-mail-body]').value = message.body;
      manual.hidden = false;
      return message;
    };
    const toast = document.createElement('div');
    toast.className = 'contact-copy-toast';
    toast.hidden = true;
    toast.innerHTML = '<span class="contact-copy-toast-icon" aria-hidden="true">✓</span><div role="status" aria-live="polite" aria-atomic="true"></div><button type="button" aria-label="Zamknij powiadomienie">×</button>';
    document.body.append(toast);
    let toastTimer;
    const hideToast = () => { clearTimeout(toastTimer); toast.hidden = true; };
    toast.querySelector('button').addEventListener('click', hideToast);
    const showCopied = () => {
      hideToast();
      toast.hidden = false;
      const content = toast.querySelector('[role="status"]');
      content.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = 'Wiadomość skopiowana';
      const hint = document.createElement('span');
      hint.textContent = 'Możesz wkleić ją w swojej poczcie.';
      content.append(title, hint);
      toastTimer = setTimeout(hideToast, 5000);
    };
    const copyMessage = async () => {
      const message = compose();
      const text = 'Do: ' + recipient + '\nTemat: ' + message.subject + '\n\n' + message.body;
      try {
        await navigator.clipboard.writeText(text);
        manual.hidden = true;
        status.textContent = '';
        showCopied();
      } catch {
        hideToast();
        prepareManual();
        status.textContent = 'Skopiuj adres, temat i treść z widocznych pól, a następnie wklej je do nowej wiadomości w swojej poczcie.';
        status.focus({preventScroll: true});
      }
    };
    const updateProvider = () => {
      const labels = {gmail: 'Otwórz Gmail z wiadomością', outlook: 'Otwórz Outlook z wiadomością', app: 'Otwórz aplikację pocztową z wiadomością'};
      submit.querySelector('span').textContent = labels[provider.value];
      copyButton.hidden = false;
      manual.hidden = true;
      status.textContent = '';
      hideToast();
      help.textContent = provider.value === 'app'
        ? 'Otworzymy domyślną aplikację pocztową urządzenia, np. Thunderbird, Outlook lub Apple Mail. Ustaw wybraną aplikację jako domyślną do obsługi poczty. Sprawdź wiadomość w aplikacji i kliknij „Wyślij”.'
        : 'Otworzymy pocztę w przeglądarce z gotową wiadomością. W poczcie kliknij „Wyślij”. Jeśli nie jesteś zalogowany, zaloguj się, wróć tutaj i kliknij ponownie.';
    };
    provider.addEventListener('change', updateProvider);
    form.querySelector('[data-copy-mail]').addEventListener('click', () => { if (validate(form) && canUseMail()) copyMessage(); });
    form.addEventListener('input', () => { if (!manual.hidden) prepareManual(); });
    form.addEventListener('change', () => { if (!manual.hidden) prepareManual(); });
    updateProvider();
    form.noValidate = true;
    submit.disabled = true;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (panels.length && step < panels.length - 1) {
        if (validate(panels[step])) showStep(step + 1);
        return;
      }
      if (!validate(form)) return;
      if (!canUseMail()) return;
      const message = compose();
      if (provider.value === 'app') {
        window.location.assign(mailtoUrl(recipient, message));
        status.textContent = 'Sprawdź wiadomość w swojej aplikacji pocztowej i kliknij „Wyślij”. Jeśli aplikacja się nie otworzyła, skopiuj wiadomość do wysłania.';
        return;
      }
      const url = new URL(provider.value === 'gmail' ? 'https://mail.google.com/mail/' : 'https://outlook.live.com/mail/0/deeplink/compose');
      if (provider.value === 'gmail') {
        url.searchParams.set('view', 'cm');
        url.searchParams.set('fs', '1');
        url.searchParams.set('to', recipient);
        url.searchParams.set('su', message.subject);
      } else {
        url.searchParams.set('to', recipient);
        url.searchParams.set('subject', message.subject);
      }
      url.searchParams.set('body', message.body);
      window.open(url.href, '_blank', 'noopener,noreferrer');
      status.textContent = 'W poczcie sprawdź wiadomość i kliknij „Wyślij”. Jeśli karta się nie otworzyła lub brakuje treści, użyj przycisku „Kopiuj całą wiadomość”. Dane pozostają w formularzu.';
      status.focus();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
