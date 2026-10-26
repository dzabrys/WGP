(() => {
  const picker = document.querySelector('[data-product-id="gra-farmer"] .product-offer tbody');
  if (!picker) return;
  picker.addEventListener('click', event => {
    // Native input/label clicks already select the radio and support the keyboard.
    if (event.target.closest('input, label')) return;
    const radio = event.target.closest('tr')?.querySelector('input[type="radio"]');
    if (!radio || radio.disabled) return;
    radio.click();
    radio.focus({preventScroll: true});
  });
})();
