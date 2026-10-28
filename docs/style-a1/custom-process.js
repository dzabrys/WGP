(() => {
  const phone = window.matchMedia('(max-width: 760px)');
  const controls = [...document.querySelectorAll('.process-description-toggle')];
  const running = new WeakMap();
  const setExpanded = (button, expanded, animate = false) => {
    const content = document.getElementById(button.getAttribute('aria-controls'));
    const height = content.hidden ? 0 : content.getBoundingClientRect().height;
    const opacity = content.hidden ? 0 : getComputedStyle(content).opacity;
    running.get(button)?.cancel();
    running.delete(button);
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Zwiń opis' : 'Rozwiń opis';
    if (!animate || !content.animate) {
      content.hidden = !expanded;
      return;
    }
    content.hidden = false;
    const animation = content.animate([
      {height: `${height}px`, opacity, overflow: 'hidden'},
      {height: `${expanded ? content.scrollHeight : 0}px`, opacity: expanded ? 1 : 0, overflow: 'hidden'}
    ], {duration: 550, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'});
    running.set(button, animation);
    animation.finished.then(() => {
      if (running.get(button) !== animation) return;
      content.hidden = !expanded;
      running.delete(button);
      animation.cancel();
    }).catch(() => {});
  };
  const updateViewport = () => {
    controls.forEach(button => {
      button.hidden = !phone.matches;
      setExpanded(button, true);
    });
  };
  controls.forEach(button => {
    button.addEventListener('click', () => {
      setExpanded(button, button.getAttribute('aria-expanded') !== 'true', true);
    });
  });
  phone.addEventListener('change', updateViewport);
  updateViewport();
})();
