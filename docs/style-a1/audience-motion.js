/* Keep native details semantics; animate their content in either direction. */
(() => {
  document.querySelectorAll('body.audience-compact .company-faq details, [data-animated-faq] details, details[data-animated-faq-item]').forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary || !Element.prototype.animate) return;
    let content = details.querySelector(':scope > .details-content');
    if (!content) {
      content = document.createElement('div');
      while (summary.nextSibling) content.append(summary.nextSibling);
      details.append(content);
    }
    content.classList.add('audience-faq-content');
    let expanded = details.open;
    let running;
    details.dataset.expanded = String(expanded);

    summary.addEventListener('click', event => {
      event.preventDefault();
      // Read the current interpolated height before cancelling a previous run.
      const height = details.open ? content.getBoundingClientRect().height : 0;
      const opacity = details.open ? getComputedStyle(content).opacity : 0;
      expanded = !expanded;
      running?.cancel();
      details.open = true;
      details.dataset.expanded = String(expanded);
      const target = expanded ? content.scrollHeight : 0;
      const animation = content.animate([
        {height: `${height}px`, opacity},
        {height: `${target}px`, opacity: expanded ? 1 : 0}
      ], {duration: 550, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'});
      running = animation;
      animation.finished.then(() => {
        if (running !== animation) return;
        details.open = expanded;
        running = null;
        animation.cancel();
      }).catch(() => {});
    });
  });
})();
