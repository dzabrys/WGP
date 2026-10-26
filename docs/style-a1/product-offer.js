(() => {
  const panel = document.querySelector('[data-product-offer]');
  const catalog = window.WGPCatalog;
  if (!panel || !catalog) return;
  const product = catalog.get(panel.dataset.productOffer);
  const link = document.querySelector('[data-product-contact]');
  const quantity = panel.querySelector('#product-quantity');
  const update = () => {
    const choice = catalog.variant(product, panel.querySelector('[name="product-variant"]:checked')?.value);
    const valid = quantity.validity.valid && quantity.value !== '';
    const count = valid ? Number(quantity.value) : 1;
    const total = catalog.totals(choice, count);
    panel.querySelector('[data-product-quantity-error]').hidden = valid;
    quantity.setAttribute('aria-invalid', String(!valid));
    link.setAttribute('aria-disabled', String(!valid));
    // Invalid quantities must never silently turn into a different order.
    if (valid) link.href = catalog.contactURL(product, choice, count);
    else link.removeAttribute('href');
    const price = document.querySelector('[data-product-price]');
    price.querySelector('strong').textContent = choice.gross == null ? 'Wycena indywidualna' : catalog.money(choice.gross) + ' brutto';
    price.querySelector('span').textContent = choice.net == null ? choice.label : catalog.money(choice.net) + ' netto · ' + choice.label;
    panel.querySelector('[data-product-total]').textContent = valid
      ? choice.label + ' · ' + count + ' zest. · ' + catalog.money(total.gross) + (total.gross == null ? '' : ' brutto łącznie (' + catalog.money(total.net) + ' netto)')
      : 'Uzupełnij liczbę zestawów, aby przejść do kontaktu.';
  };
  panel.addEventListener('input', update);
  panel.addEventListener('change', update);
  link.addEventListener('click', event => {
    if (link.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      quantity.focus();
      quantity.reportValidity();
    }
  });
  update();
})();
