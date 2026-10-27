(() => {
  const phone = window.matchMedia('(max-width: 760px)');
  const controls = [...document.querySelectorAll('.process-description-toggle')];
  const setExpanded = (button, expanded) => {
    document.getElementById(button.getAttribute('aria-controls')).hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Zwiń opis' : 'Rozwiń opis';
  };
  const updateViewport = () => {
    controls.forEach(button => {
      button.hidden = !phone.matches;
      setExpanded(button, true);
    });
  };
  controls.forEach(button => {
    button.addEventListener('click', () => {
      setExpanded(button, button.getAttribute('aria-expanded') !== 'true');
    });
  });
  phone.addEventListener('change', updateViewport);
  updateViewport();
})();
