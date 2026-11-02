(() => {
  const pref = matchMedia('(prefers-reduced-motion:reduce)');
  if (pref.matches || !Element.prototype.animate) return;
  const running = new Set();
  const track = animation => {
    running.add(animation);
    animation.finished.then(() => running.delete(animation)).catch(() => running.delete(animation));
  };
  const animate = (el, base, delay = 0) => {
    track(el.animate([
      {transform:`translateY(8px) ${base === 'none' ? '' : base}`},
      {transform:base}
    ], {duration:480, delay, easing:'cubic-bezier(.22,.61,.36,1)'}));
  };
  // Text moves once; images, links and headings are never hidden behind JS.
  const animateBatch = (elements, stagger = false) => {
    if (pref.matches) return;
    // Read every starting transform before starting animations (layout writes).
    const prepared = Array.from(elements, el => ({el, base:getComputedStyle(el).transform}));
    prepared.forEach(({el, base}, index) => animate(el, base, stagger ? Math.min(index * 45, 135) : 0));
  };
  animateBatch(document.querySelectorAll('.hero-copy,.audience-copy,.subpage-intro,.subpage-aside,.offer-heading,.selection-heading,.product-heading,.proposal-intro,.company-intro,.company-hero-offer,.contact-intro,.legal-heading'), true);
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
      visible.forEach(el => observer.unobserve(el));
      animateBatch(visible);
    }, {threshold:.08});
    // Animate card contents so entrance and card hover never fight over transform.
    document.querySelectorAll('.game-copy,.catalog-copy,.product-copy,.steps>li,.mission-values>article,.brief-list>li,.benefits h2,.home-footer .competencies,.proposal-format-copy,.proposal-section-heading,.proposal-contact,.catalog-section-heading,.company-section-heading,.company-help-card,.contact-form-heading,.legal-section').forEach(el => observer.observe(el));
  }
  pref.addEventListener('change', () => {
    if (!pref.matches) return;
    observer?.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
  });
})();
