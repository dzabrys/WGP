(() => {
  const init = () => {
    const form = document.querySelector('#formularz-kontaktowy .contact-form');
    if (!form || form.dataset.enhanced) return;
    form.dataset.enhanced = 'true';
    const guide = document.querySelector('.contact-guide-disclosure');
    if (guide && typeof matchMedia === 'function') {
      const compact = matchMedia('(max-width:620px)');
      const adaptGuide = () => { guide.open = !compact.matches; };
      adaptGuide();
      compact.addEventListener?.('change', adaptGuide);
    }
    const fields = Array.from(form.elements).filter(field => /^(INPUT|SELECT|TEXTAREA)$/.test(field.tagName));
    const game = form.elements.namedItem('gra');
    const kind = form.elements.namedItem('rodzaj_zapytania');
    const query = new URLSearchParams(location.search);
    const topic = query.get('temat');
    if (topic && game) game.value = topic.slice(0, 180);
    if (query.get('rodzaj') === 'custom' && kind) kind.value = 'Gra na zamówienie';
    const context = form.querySelector('.contact-context');
    const updateContext = () => {
      if (!context) return;
      const topic = game?.value.trim() || kind?.value || '';
      context.hidden = !topic;
      context.textContent = topic ? `Zapytanie o: ${topic}` : '';
    };
    updateContext();
    game?.addEventListener('input', updateContext);
    kind?.addEventListener('change', updateContext);

    const updateError = field => {
      const error = field.id && document.getElementById(`${field.id}-error`);
      if (!error) return;
      const invalid = !field.validity.valid;
      field.toggleAttribute('aria-invalid', invalid);
      if (invalid) field.setAttribute('aria-invalid', 'true');
      const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== error.id);
      if (invalid) descriptions.push(error.id);
      if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
      else field.removeAttribute('aria-describedby');
      error.hidden = !invalid;
      error.textContent = invalid ? (field.validity.customError ? 'Wpisz treść, nie tylko spacje.' : field.validity.valueMissing ? ({name:'Wpisz swoje imię.',email:'Podaj adres e-mail, na który mamy odpisać.',message:'Napisz kilka słów o swoim zapytaniu.'}[field.name] || 'Uzupełnij to pole.') : 'Wpisz poprawny adres e-mail, np. imie@firma.pl.') : '';
    };
    for (const field of fields) {
      field.addEventListener('invalid', () => updateError(field));
      field.addEventListener('input', () => {
        field.setCustomValidity('');
        if (field.hasAttribute('aria-invalid')) updateError(field);
      });
      if (field.required && field.type !== 'email') field.addEventListener('change', () => {
        field.setCustomValidity(field.value && !field.value.trim() ? 'Wpisz treść, nie tylko spacje.' : '');
      });
    }
    // Unsupported browsers retain ordinary HTML POST and native validation.
    if (typeof fetch !== 'function' || typeof FormData !== 'function' || typeof AbortController !== 'function') return;
    const status = form.querySelector('.contact-form-status');
    const submit = form.querySelector('[type="submit"]');
    let sending = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      const payload = new FormData(form);
      const value = key => String(payload.get(key) || '').trim();
      const date = value('termin');
      payload.set('subject', `[${value('rodzaj_zapytania') || 'Zapytanie'}] ${value('gra') || 'Rozmowa o grze'}`.slice(0, 400));
      payload.set('message', [
        `Osoba: ${value('name')}`, `E-mail: ${value('email')}`,
        value('rodzaj_zapytania') && `Rodzaj zapytania: ${value('rodzaj_zapytania')}`,
        value('gra') && `Gra lub pomysł: ${value('gra')}`,
        value('organizacja') && `Organizacja: ${value('organizacja')}`,
        value('telefon') && `Telefon: ${value('telefon')}`,
        value('grupa') && `Grupa: ${value('grupa')}`,
        value('miejsce') && `Miejsce: ${value('miejsce')}`,
        date && `Termin: ${date.split('-').reverse().join('.')}`,
        '\nWiadomość:', value('message'),
      ].filter(Boolean).join('\n'));
      sending = true;
      const original = submit.innerHTML;
      const disabledBefore = fields.map(field => field.disabled);
      fields.forEach(field => { field.disabled = true; });
      submit.disabled = true;
      submit.textContent = 'Wysyłanie…';
      form.setAttribute('aria-busy', 'true');
      status.dataset.state = 'pending';
      status.textContent = 'Wysyłamy Twoje zapytanie…';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(form.action, {method:'POST',body:payload,headers:{Accept:'application/json'},signal:controller.signal});
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.ok !== true) throw Object.assign(new Error('submission'), {status:response.status});
        form.reset();
        updateContext();
        fields.forEach(field => { field.setCustomValidity(''); updateError(field); });
        // A cleared form has not yet been submitted again; hide validation feedback.
        fields.forEach(field => {
          field.removeAttribute('aria-invalid');
          const error = field.id && document.getElementById(`${field.id}-error`);
          if (error) {
            error.hidden = true;
            error.textContent = '';
            const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== error.id);
            if (ids.length) field.setAttribute('aria-describedby',ids.join(' '));
            else field.removeAttribute('aria-describedby');
          }
        });
        const extra = form.querySelector('.contact-extra');
        if (extra) extra.open = false;
        status.dataset.state = 'success';
        status.textContent = 'Dziękujemy! Zapytanie zostało wysłane. Odpowiemy na podany adres e-mail.';
      } catch (error) {
        status.dataset.state = 'error';
        const message = error.name === 'AbortError'
          ? 'Wysyłka trwała zbyt długo. Dane zostały w formularzu. Spróbuj ponownie lub '
          : error.status === 429
            ? 'Zbyt wiele prób wysyłki. Dane zostały w formularzu. Odczekaj chwilę lub '
            : 'Nie udało się wysłać zapytania. Dane zostały w formularzu. Spróbuj ponownie lub ';
        status.textContent = message;
        const link = document.createElement('a');
        link.href = 'mailto:biuro@wielkiegryplanszowe.pl';
        link.textContent = 'napisz bezpośrednio e-mail.';
        status.append(link);
      } finally {
        clearTimeout(timeout);
        fields.forEach((field,index) => { field.disabled = disabledBefore[index]; });
        submit.disabled = false;
        submit.innerHTML = original;
        form.removeAttribute('aria-busy');
        sending = false;
        status.focus();
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
