/* Progressive controls: original form fields remain the source of truth. */
(() => {
  const init = () => {
    const form = document.querySelector('form[data-contact-design]');
    if (!form || form.dataset.controlsReady) return;
    form.dataset.controlsReady = 'true';
    let active = null;
    const button = (text, className, label) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = className; el.textContent = text;
      if (label) el.setAttribute('aria-label', label);
      return el;
    };
    const emit = field => {
      field.dispatchEvent(new Event('input', {bubbles: true}));
      field.dispatchEvent(new Event('change', {bubbles: true}));
    };
    const products = [...form.querySelectorAll('.contact-product input[name="gra"]')];
    const catalog = window.WGPCatalog;
    let chosen = products.find(input => input.checked);
    const updatePrices = () => {
      chosen = products.find(input => input.checked);
      if (!catalog) return;
      for (const input of products) {
        const card = input.closest('.contact-product');
        const product = catalog.get(input.value);
        if (!product) continue;
        let price = card.querySelector('.contact-product-price');
        if (!price) {
          price = document.createElement('span'); price.className = 'contact-product-price';
          card.querySelector(':scope > span').append(price);
        }
        const options = catalog.options(product);
        const selected = chosen === input;
        const choice = selected ? catalog.variant(product, form.elements.namedItem('wariant')?.value) : null;
        const priced = options.filter(option => option.gross != null);
        const minimum = priced.length ? Math.min(...priced.map(option => option.gross)) : null;
        const amount = selected ? choice?.gross : minimum;
        const lead = !selected && amount != null && options.length > 1 ? 'od ' : '';
        const label = amount == null ? 'Wycena indywidualna' : lead + catalog.money(amount) + ' brutto';
        price.textContent = label;
      }
    };
    for (const input of products) {
      const card = input.closest('.contact-product');
      const grid = card.closest('.contact-product-grid');
      card.addEventListener('click', event => {
        if (input.disabled) return;
        const top = card.getBoundingClientRect().top;
        const listTop = grid?.scrollTop;
        const listLeft = grid?.scrollLeft;
        // Radios are already checked during native click preactivation. Use
        // the committed selection and apply after canceled activation restores it.
        const uncheck = chosen === input;
        event.preventDefault();
        queueMicrotask(() => {
          input.checked = !uncheck;
          emit(input);
          updatePrices();
          // Keep the clicked card in place when the order summary above it
          // appears, changes height or disappears. Preserve the list position too.
          if (grid) { grid.scrollTop = listTop; grid.scrollLeft = listLeft; }
          const offset = card.getBoundingClientRect().top - top;
          if (offset) window.scrollBy({top: offset, left: 0, behavior: 'instant'});
        });
      });
    }
    form.addEventListener('input', updatePrices);
    form.addEventListener('change', updatePrices);
    updatePrices();
    const control = (field, kind, name) => {
      const wrap = document.createElement('div'); wrap.className = 'contact-control';
      field.before(wrap); wrap.append(field);
      const trigger = button('', 'contact-control-trigger');
      const text = document.createElement('span'); trigger.append(text);
      const icon = document.createElement('span'); icon.className = 'contact-control-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = kind === 'calendar'
        ? '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg>';
      trigger.append(icon); wrap.append(trigger);
      const panel = document.createElement('div'); panel.className = 'contact-control-popup contact-' + kind;
      panel.id = field.id + '-popup'; panel.hidden = true;
      panel.setAttribute('aria-label', name); panel.setAttribute('role', kind === 'calendar' ? 'dialog' : 'listbox');
      trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-haspopup', kind === 'calendar' ? 'dialog' : 'listbox');
      if (field.getAttribute('aria-describedby')) trigger.setAttribute('aria-describedby', field.getAttribute('aria-describedby'));
      document.body.append(panel);
      const place = () => {
        if (panel.hidden) return;
        const rect = trigger.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const preferredWidth = viewportWidth <= 620 ? rect.width : kind === 'calendar' ? 352 : Math.max(300, rect.width);
        const width = Math.min(preferredWidth, viewportWidth - 24);
        panel.style.width = width + 'px';
        panel.style.left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12)) + 'px';
        const available = Math.max(120, Math.min(window.innerHeight - 24, kind === 'calendar' ? 560 : 360));
        panel.style.maxHeight = available + 'px';
        const height = Math.min(panel.scrollHeight, available);
        const below = window.innerHeight - rect.bottom - 12;
        const top = below >= height || rect.top < height + 12
          ? Math.min(rect.bottom + 8, window.innerHeight - height - 12)
          : rect.top - height - 8;
        panel.style.top = Math.max(12, top) + 'px';
      };
      const close = (focus = false) => {
        panel.hidden = true; trigger.setAttribute('aria-expanded', 'false');
        if (active?.panel === panel) active = null;
        if (focus) trigger.focus();
      };
      const open = () => {
        active?.close(); panel.hidden = false; trigger.setAttribute('aria-expanded', 'true');
        active = {panel, wrap, close, place}; place();
      };
      const sync = () => {
        trigger.disabled = field.disabled;
        trigger.setAttribute('aria-label', name + ': ' + (text.textContent || 'nie wybrano'));
        if (field.getAttribute('aria-invalid') === 'true') trigger.setAttribute('aria-invalid', 'true');
        else trigger.removeAttribute('aria-invalid');
        if (field.disabled) close();
      };
      // Hide only after the replacement has been installed successfully.
      field.classList.add('contact-control-native'); field.tabIndex = -1;
      field.setAttribute('aria-hidden', 'true');
      field.addEventListener('focus', () => trigger.focus());
      return {trigger, panel, text, open, close, place, sync};
    };

    for (const select of form.querySelectorAll('select')) {
      const name = select.labels?.[0]?.querySelector('span')?.textContent.trim()
        || select.labels?.[0]?.textContent.trim() || 'Wybierz opcję';
      const c = control(select, 'options', name);
      c.panel.tabIndex = -1;
      let items = [], index = 0;
      const highlight = next => {
        const valid = items.map((el, i) => !el.disabled ? i : -1).filter(i => i >= 0);
        if (!valid.length) return;
        index = valid.includes(next) ? next : valid[0];
        items.forEach((el, i) => el.classList.toggle('is-active', i === index));
        c.panel.setAttribute('aria-activedescendant', items[index].id);
        items[index].scrollIntoView?.({block: 'nearest'});
      };
      const render = () => {
        c.text.textContent = select.selectedOptions[0]?.textContent || 'Wybierz opcję';
        c.trigger.classList.toggle('is-placeholder', !select.value);
        c.panel.replaceChildren();
        items = [...select.options].map((option, i) => {
          const item = button(option.textContent, 'contact-option');
          item.id = select.id + '-option-' + i; item.tabIndex = -1;
          item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(option.selected));
          item.disabled = option.disabled; item.hidden = option.hidden;
          item.addEventListener('click', () => {
            select.selectedIndex = i; emit(select); render(); c.close(true);
          });
          c.panel.append(item); return item;
        });
        index = Math.max(0, select.selectedIndex); c.sync();
        if (!c.panel.hidden) { highlight(index); c.place(); }
      };
      const open = () => { render(); c.open(); c.panel.focus(); highlight(index); };
      c.trigger.addEventListener('click', () => c.panel.hidden ? open() : c.close());
      c.trigger.addEventListener('keydown', event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); }
      });
      let typed = '', lastTyped = 0;
      c.panel.addEventListener('keydown', event => {
        const valid = items.map((el, i) => !el.disabled && !el.hidden ? i : -1).filter(i => i >= 0);
        if (!valid.length) return;
        const position = valid.indexOf(index);
        if (event.key === 'ArrowDown') highlight(valid[(position + 1) % valid.length]);
        else if (event.key === 'ArrowUp') highlight(valid[(position - 1 + valid.length) % valid.length]);
        else if (event.key === 'Home') highlight(valid[0]);
        else if (event.key === 'End') highlight(valid.at(-1));
        else if (event.key === 'Enter' || event.key === ' ') items[index].click();
        else if (event.key === 'Tab') { c.close(true); return; }
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now(); typed = now - lastTyped < 700 ? typed + event.key : event.key; lastTyped = now;
          const match = valid.find(i => items[i].textContent.toLocaleLowerCase('pl').startsWith(typed.toLocaleLowerCase('pl')));
          if (match !== undefined) highlight(match);
        } else return;
        event.preventDefault();
      });
      select.addEventListener('change', render);
      new MutationObserver(render).observe(select, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-invalid', 'selected', 'hidden']});
      render();
    }

    const date = form.querySelector('input[type="date"]');
    if (date) {
      const c = control(date, 'calendar', 'Planowany termin');
      const iso = d => String(d.getFullYear()).padStart(4, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const parse = value => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); };
      const today = () => parse(new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()));
      const minimum = () => date.min && date.min > iso(today()) ? date.min : iso(today());
      const refreshMinimum = () => {const value = minimum(); if (date.min !== value) date.min = value;};
      const allowed = d => iso(d) >= minimum() && (!date.max || iso(d) <= date.max);
      const inBounds = d => {
        if (iso(d) < minimum()) return parse(minimum());
        if (date.max && iso(d) > date.max) return parse(date.max);
        return d;
      };
      const availableMonth = (year, month) => {
        const first = new Date(year, month, 1, 12), last = new Date(year, month + 1, 0, 12);
        return iso(last) >= minimum() && (!date.max || iso(first) <= date.max);
      };
      refreshMinimum();
      const months = Array.from({length: 12}, (_, month) => new Date(2026, month, 1).toLocaleDateString('pl-PL', {month: 'long'}));
      let shown = today(), focused = today(), choosingMonth = false;
      const sync = () => {
        c.text.textContent = date.value ? parse(date.value).toLocaleDateString('pl-PL', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Wybierz termin';
        c.trigger.classList.toggle('is-placeholder', !date.value); c.sync();
      };
      const choose = value => { if (value && !allowed(parse(value))) return; date.value = value; emit(date); sync(); c.close(true); };
      const shift = (d, months) => {
        const day = d.getDate(), next = new Date(d.getFullYear(), d.getMonth() + months, 1, 12);
        next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())); return next;
      };
      const render = () => {
        c.panel.replaceChildren();
        const caption = document.createElement('p'); caption.className = 'contact-calendar-caption';
        caption.textContent = 'PLANOWANY TERMIN'; c.panel.append(caption);
        const header = document.createElement('div'); header.className = 'contact-calendar-header';
        const prev = button('‹', 'contact-calendar-arrow', choosingMonth ? 'Poprzedni rok' : 'Poprzedni miesiąc');
        const title = button(choosingMonth ? String(shown.getFullYear()) : months[shown.getMonth()] + ' ' + shown.getFullYear(), 'contact-calendar-title');
        title.setAttribute('aria-label', 'Zmień miesiąc i rok'); title.setAttribute('aria-expanded', String(choosingMonth));
        const next = button('›', 'contact-calendar-arrow', choosingMonth ? 'Następny rok' : 'Następny miesiąc');
        const availablePage = direction => {
          const candidate = shift(shown, direction * (choosingMonth ? 12 : 1));
          if (candidate.getFullYear() < 1 || candidate.getFullYear() > 9999) return false;
          return choosingMonth
            ? Array.from({length: 12}, (_, month) => availableMonth(candidate.getFullYear(), month)).some(Boolean)
            : availableMonth(candidate.getFullYear(), candidate.getMonth());
        };
        prev.disabled = !availablePage(-1); next.disabled = !availablePage(1);
        const turn = direction => {
          if (!availablePage(direction)) return;
          const value = shift(shown, direction * (choosingMonth ? 12 : 1));
          focused = inBounds(value); shown = focused; render();
          const arrow = c.panel.querySelector(direction < 0 ? '.contact-calendar-arrow' : '.contact-calendar-arrow:last-child');
          (arrow.disabled ? c.panel.querySelector('.contact-calendar-title') : arrow).focus();
        };
        prev.addEventListener('click', () => turn(-1)); next.addEventListener('click', () => turn(1));
        title.addEventListener('click', () => {choosingMonth = !choosingMonth; render(); c.panel.querySelector(choosingMonth ? '.contact-calendar-month:not(:disabled)' : '.contact-calendar-title').focus();});
        header.append(prev, title, next); c.panel.append(header);
        const live = document.createElement('span'); live.className = 'visually-hidden'; live.setAttribute('aria-live', 'polite'); live.textContent = title.textContent; c.panel.append(live);
        if (choosingMonth) {
          const grid = document.createElement('div'); grid.className = 'contact-calendar-months';
          months.forEach((name, i) => {
            const month = button(name, 'contact-calendar-month');
            month.disabled = !availableMonth(shown.getFullYear(), i);
            month.setAttribute('aria-pressed', String(shown.getMonth() === i));
            month.addEventListener('click', () => {focused = inBounds(new Date(shown.getFullYear(), i, 1, 12)); shown = focused; choosingMonth = false; render(); focusDay();});
            grid.append(month);
          }); c.panel.append(grid);
        } else {
          const week = document.createElement('div'); week.className = 'contact-calendar-week'; week.setAttribute('aria-hidden', 'true');
          for (const text of ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']) {const span = document.createElement('span'); span.textContent = text; week.append(span);} c.panel.append(week);
          const grid = document.createElement('div'); grid.className = 'contact-calendar-days'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Dni miesiąca');
          const first = new Date(shown.getFullYear(), shown.getMonth(), 1, 12);
          first.setDate(1 - ((first.getDay() + 6) % 7));
          for (let i = 0; i < 42; i++) {
            const d = new Date(first); d.setDate(first.getDate() + i);
            const value = iso(d), day = button(String(d.getDate()), 'contact-calendar-day');
            day.dataset.date = value; day.disabled = !allowed(d);
            day.tabIndex = value === iso(focused) ? 0 : -1;
            day.classList.toggle('is-muted', d.getMonth() !== shown.getMonth());
            day.setAttribute('aria-label', d.toLocaleDateString('pl-PL', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}));
            day.setAttribute('aria-pressed', String(value === date.value));
            if (value === iso(today())) day.setAttribute('aria-current', 'date');
            day.addEventListener('focus', () => {focused = d;});
            day.addEventListener('click', () => choose(value));
            grid.append(day);
          }
          grid.addEventListener('keydown', event => {
            if (!event.target.dataset.date) return;
            let next = new Date(focused);
            if (event.key === 'ArrowLeft') next.setDate(next.getDate() - 1);
            else if (event.key === 'ArrowRight') next.setDate(next.getDate() + 1);
            else if (event.key === 'ArrowUp') next.setDate(next.getDate() - 7);
            else if (event.key === 'ArrowDown') next.setDate(next.getDate() + 7);
            else if (event.key === 'Home') next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
            else if (event.key === 'End') next.setDate(next.getDate() + 6 - ((next.getDay() + 6) % 7));
            else if (event.key === 'PageUp' || event.key === 'PageDown') next = shift(next, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
            else return;
            event.preventDefault();
            if (!allowed(next) || next.getFullYear() < 1 || next.getFullYear() > 9999) return;
            focused = next; shown = next; render(); focusDay();
          }); c.panel.append(grid);
        }
        const actions = document.createElement('div'); actions.className = 'contact-calendar-actions';
        const clear = button('Wyczyść', 'contact-calendar-clear'), now = button('Dzisiaj', 'contact-calendar-today');
        clear.disabled = !date.value; now.disabled = !allowed(today());
        clear.addEventListener('click', () => choose('')); now.addEventListener('click', () => choose(iso(today())));
        actions.append(clear, now); c.panel.append(actions); c.place();
      };
      const focusDay = () => {
        const day = c.panel.querySelector('[data-date="' + iso(focused) + '"]:not(:disabled)') || c.panel.querySelector('[data-date]:not(:disabled)');
        if (day) {day.tabIndex = 0; day.focus();} else c.panel.querySelector('.contact-calendar-title').focus();
      };
      const open = () => {
        refreshMinimum();
        focused = inBounds(date.value ? parse(date.value) : today());
        shown = focused; choosingMonth = false; render(); c.open(); focusDay();
      };
      c.trigger.addEventListener('click', () => c.panel.hidden ? open() : c.close());
      c.trigger.addEventListener('keydown', event => {if (event.key === 'ArrowDown') {event.preventDefault(); open();}});
      c.panel.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const focusable = [...c.panel.querySelectorAll('button:not(:disabled)')].filter(el => el.tabIndex >= 0);
        if ((event.shiftKey && event.target === focusable[0]) || (!event.shiftKey && event.target === focusable.at(-1))) c.close(true);
      });
      date.addEventListener('change', sync);
      new MutationObserver(sync).observe(date, {attributes: true, attributeFilter: ['disabled', 'aria-invalid', 'min', 'max']});
      sync();
    }
    document.addEventListener('pointerdown', event => {
      if (active && !active.panel.contains(event.target) && !active.wrap.contains(event.target)) active.close();
    });
    document.addEventListener('keydown', event => {
      if (active && event.key === 'Escape') {event.preventDefault(); active.close(true);}
    });
    document.addEventListener('focusin', event => {
      if (active && !active.panel.contains(event.target) && !active.wrap.contains(event.target)) active.close();
    });
    window.addEventListener('resize', () => active?.place());
    document.addEventListener('scroll', () => active?.place(), true);
    form.addEventListener('reset', () => {active?.close(); setTimeout(() => form.querySelectorAll('select,input[type="date"]').forEach(emit), 0);});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
