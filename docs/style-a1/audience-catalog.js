/* Native scrolling works without JavaScript; controls appear only for overflow. */
(() => {
  const grid = document.querySelector('.audience-catalog .games-grid');
  if (!grid) return;
  grid.id ||= 'catalog-products';
  const navigation = document.createElement('div');
  navigation.className = 'catalog-navigation';
  navigation.hidden = true;
  navigation.innerHTML = '<p>Przewiń w dół, aby zobaczyć więcej gier</p><div><button type="button" aria-label="Przewiń gry w górę"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-7 7 7-7 7 7"/></svg></button><button type="button" aria-label="Przewiń gry w dół"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-7-7 7 7 7-7"/></svg></button></div>';
  grid.before(navigation);
  const [previous,next] = navigation.querySelectorAll('button');
  for (const button of [previous,next]) button.setAttribute('aria-controls',grid.id);
  const update = () => {
    const cards = [...grid.querySelectorAll('.game-card:not([hidden])')];
    const firstRow = cards.filter(card => Math.abs(card.offsetTop - cards[0].offsetTop) < 2);
    const rowHeight = Math.max(0,...firstRow.map(card => card.getBoundingClientRect().height));
    const gridStyle = getComputedStyle(grid);
    const padding = parseFloat(gridStyle.paddingTop) + parseFloat(gridStyle.paddingBottom);
    const windowHeight = firstRow.length === cards.length ? 'none' : `${Math.ceil(rowHeight + padding)}px`;
    if (grid.style.getPropertyValue('--catalog-window') !== windowHeight) grid.style.setProperty('--catalog-window',windowHeight);
    const max = grid.scrollHeight - grid.clientHeight;
    const overflow = max > 2;
    grid.classList.toggle('catalog-overflow',overflow);
    navigation.hidden = !overflow;
    if (overflow) {
      grid.tabIndex = 0;
      grid.setAttribute('role','region');
      grid.setAttribute('aria-label','Gry — lista przewijana w pionie');
    } else {
      grid.removeAttribute('tabindex');
      grid.removeAttribute('role');
      grid.removeAttribute('aria-label');
    }
    previous.disabled = grid.scrollTop <= 2;
    next.disabled = grid.scrollTop >= max - 2;
  };
  const step = () => {
    const card = grid.querySelector('.game-card:not([hidden])');
    return card ? card.getBoundingClientRect().height + parseFloat(getComputedStyle(grid).rowGap) : grid.clientHeight;
  };
  const scroll = top => grid.scrollTo({top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  previous.addEventListener('click', () => scroll(grid.scrollTop - step()));
  next.addEventListener('click', () => scroll(grid.scrollTop + step()));
  grid.addEventListener('scroll',update,{passive:true});
  grid.addEventListener('keydown',event => {
    if (event.target !== grid) return;
    const destinations = {ArrowUp:grid.scrollTop-step(),ArrowDown:grid.scrollTop+step(),PageUp:grid.scrollTop-grid.clientHeight,PageDown:grid.scrollTop+grid.clientHeight,Home:0,End:grid.scrollHeight};
    if (!(event.key in destinations)) return;
    event.preventDefault(); scroll(destinations[event.key]);
  });
  const resize = new ResizeObserver(update);
  resize.observe(grid);
  const observeCards = () => grid.querySelectorAll('.game-card').forEach(card => resize.observe(card));
  observeCards();
  new MutationObserver(mutations => {
    if (mutations.some(m => m.type === 'attributes')) grid.scrollTop = 0;
    if (mutations.some(m => m.type === 'childList')) observeCards();
    update();
  }).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  update();
  document.fonts.ready.then(update);
})();
