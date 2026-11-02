/* Static HTML is complete before this enhancement runs. */
(() => {
  const $ = selector => document.querySelector(selector);
  const motionPreference = matchMedia('(prefers-reduced-motion:reduce)');
  const surfaceMotion = new WeakMap();
  const closingDialogs = new WeakSet();
  const openSurface = (element, duration = 220, distance = 6) => {
    if (!element.animate) return;
    surfaceMotion.get(element)?.cancel();
    const frames = motionPreference.matches
      ? [{opacity:.8}, {opacity:1}]
      : [{opacity:.5, transform:`translateY(${distance}px)`}, {opacity:1, transform:'none'}];
    const animation = element.animate(frames, {duration:motionPreference.matches ? 140 : duration, easing:'cubic-bezier(.22,.61,.36,1)'});
    surfaceMotion.set(element, animation);
    animation.finished.then(() => {if(surfaceMotion.get(element)===animation)surfaceMotion.delete(element)}).catch(() => {});
  };
  const closeSurface = async dialog => {
    if (!dialog.open || closingDialogs.has(dialog)) return;
    closingDialogs.add(dialog);
    surfaceMotion.get(dialog)?.cancel();
    if (dialog.animate) {
      const frames = motionPreference.matches
        ? [{opacity:1}, {opacity:.8}]
        : [{opacity:1, transform:'none'}, {opacity:0, transform:'translateY(4px)'}];
      const animation = dialog.animate(frames, {duration:motionPreference.matches ? 100 : 150, easing:'ease-in'});
      surfaceMotion.set(dialog, animation);
      await animation.finished.catch(() => {});
    }
    dialog.close();
    surfaceMotion.get(dialog)?.cancel();
    surfaceMotion.delete(dialog);
    closingDialogs.delete(dialog);
  };
  const installDialog = (dialog, closeButton) => {
    closeButton.addEventListener('click', () => closeSurface(dialog));
    dialog.addEventListener('cancel', event => {event.preventDefault();closeSurface(dialog)});
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) closeSurface(dialog);
    });
  };

  const menu = $('.menu-toggle'), nav = $('#navigation');
  const desktopMenu = matchMedia('(min-width:1001px)');
  let menuAnimation;
  const setMenu = open => {
    const wasVisible = nav.classList.contains('open');
    const opacity = wasVisible ? getComputedStyle(nav).opacity : 0;
    const transform = wasVisible ? getComputedStyle(nav).transform : 'translateY(-6px)';
    menuAnimation?.cancel();
    menuAnimation = null;
    menu.setAttribute('aria-expanded', String(open));
    nav.inert = !desktopMenu.matches && !open;
    if (desktopMenu.matches || !nav.animate || motionPreference.matches) {
      nav.classList.toggle('open', open);
      return;
    }
    if (!open && !wasVisible) return;
    nav.classList.add('open');
    const animation = nav.animate([
      {opacity, transform},
      {opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-6px)'}
    ], {duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'});
    menuAnimation = animation;
    animation.finished.then(() => {
      if (menuAnimation !== animation) return;
      nav.classList.toggle('open', open);
      menuAnimation = null;
      animation.cancel();
    }).catch(() => {});
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown', event => {
    if(event.key==='Escape' && nav.classList.contains('open')){setMenu(false);menu.focus()}
  });
  document.addEventListener('click', event => {
    if(!event.target.closest('.header') && nav.classList.contains('open'))setMenu(false);
  });
  desktopMenu.addEventListener('change', () => setMenu(false));
  setMenu(false);
  nav.addEventListener('focusout', event => {
    if(event.relatedTarget && !nav.contains(event.relatedTarget) && event.relatedTarget!==menu)setMenu(false);
  });

  const dialog = $('#search-dialog'), input = $('#search-input');
  if (dialog && input && $('.search-toggle')) {
  const normalize = value => value.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu,'').replaceAll('ł','l');
  const items = JSON.parse($('#search-data').textContent);
  const search = () => {
    const query=normalize(input.value.trim());
    const results=items.filter(item=>normalize(item.title+' '+item.desc).includes(query));
    $('#search-results').replaceChildren();
    $('#search-status').textContent=results.length?`Liczba wyników: ${results.length}.`:'Brak wyników. Spróbuj innego hasła.';
    for(const item of results){const link=document.createElement('a');link.textContent=item.title;link.href=item.href;$('#search-results').append(link)}
  };
  $('.search-toggle').addEventListener('click', () => {dialog.showModal();search();input.focus();openSurface(dialog)});
  input.addEventListener('input', search);
  installDialog(dialog, $('.close-dialog'));
  }

  if($('.hero-carousel')){
    const carousel=$('.hero-carousel');
    const slides=[...carousel.querySelectorAll('[data-product-slide]')];
    const dots=[...carousel.querySelectorAll('[data-slide]')];
    let active=-1, requested=0, requestId=0, transitionId=0;
    const slideMotion=[];
    let hovered=false, focused=false, timer;
    const settleSlides=()=>{
      transitionId++;
      slideMotion.splice(0).forEach(animation=>animation.cancel());
      slides.forEach((slide,index)=>{
        slide.hidden=index!==active;
        slide.classList.toggle('is-active',index===active);
        slide.setAttribute('aria-hidden',String(index!==active));
      });
    };
    const schedule=()=>{
      clearTimeout(timer);
      if(!slides.length || hovered || focused || document.hidden || motionPreference.matches)return;
      timer=setTimeout(()=>{show(requested+1);schedule();},5000);
    };
    const show = async (number, announce=false) => {
      if(!slides.length)return;
      const next=(number+slides.length)%slides.length;
      requested=next;
      const request=++requestId;
      if(next===active)return;
      const current=slides[next], artwork=current.querySelector('img');
      if(artwork){
        artwork.loading='eager';
        try { if(artwork.decode)await artwork.decode(); }
        catch { if(active>=0)return; }
      }
      if(request!==requestId)return;
      const previous=slides[active];
      settleSlides();
      active=next;
      current.hidden=false;
      current.classList.add('is-active');
      current.setAttribute('aria-hidden','false');
      if(previous && current.animate && !motionPreference.matches){
        previous.hidden=false;
        previous.classList.remove('is-active');
        previous.setAttribute('aria-hidden','true');
        const id=transitionId;
        // Full-size layers only: resizing and photo aspect ratios cannot expose edges.
        const animation=current.animate([{opacity:0},{opacity:1}],
          {duration:550,easing:'cubic-bezier(.22,.61,.36,1)'});
        slideMotion.push(animation);
        animation.finished.then(()=>{if(id===transitionId)settleSlides();}).catch(()=>{});
      }else settleSlides();
      dots.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.slide)===active)));
      const status=carousel.querySelector('#carousel-status');
      status.setAttribute('aria-live',announce?'polite':'off');
      status.textContent=`Slajd ${active+1} z ${slides.length}: ${current.dataset.slideLabel||current.querySelector('figcaption strong')?.textContent||''}.`;
      const upcoming=slides[(active+1)%slides.length].querySelector('img');
      if(upcoming)upcoming.loading='eager';
    };
    const select=number=>{show(number,true);schedule();};
    carousel.querySelector('.carousel-prev').addEventListener('click',()=>select(requested-1));
    carousel.querySelector('.carousel-next').addEventListener('click',()=>select(requested+1));
    dots.forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.slide))));
    carousel.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;schedule();}});
    carousel.addEventListener('pointerleave',()=>{hovered=false;schedule();});
    carousel.addEventListener('focusin',()=>{focused=true;schedule();});
    carousel.addEventListener('focusout',event=>{focused=carousel.contains(event.relatedTarget);schedule();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)settleSlides();schedule();});
    motionPreference.addEventListener?.('change',()=>{settleSlides();schedule();});
    window.addEventListener('resize',settleSlides);
    show(0);schedule();
  }

  const imageTrigger=$('.product-image-open'), imageDialog=$('#product-image-dialog');
  if(imageTrigger && imageDialog){
    imageTrigger.addEventListener('click',()=>{imageDialog.showModal();openSurface(imageDialog)});
    installDialog(imageDialog, $('.product-image-close'));
    imageDialog.addEventListener('close',()=>imageTrigger.focus({preventScroll:true}));
  }

  document.querySelectorAll('.step-details,.product-detail-faq details,.proposal-faq:not([data-animated-faq]) details').forEach(details=>{
    const summary=details.querySelector('summary'), content=details.querySelector('.details-content');
    if(!content || !content.animate)return;
    let desiredOpen=details.open, running;
    summary.addEventListener('click',event=>{
      event.preventDefault();
      const wasOpen=details.open;
      const opacity=wasOpen?getComputedStyle(content).opacity:(motionPreference.matches ? .8 : 0);
      desiredOpen=!desiredOpen;
      running?.cancel();
      if(desiredOpen)details.open=true;
      const frames=motionPreference.matches
        ? [{opacity},{opacity:desiredOpen?1:.6}]
        : [{opacity,transform:wasOpen?'none':'translateY(-4px)'},{opacity:desiredOpen?1:0,transform:desiredOpen?'none':'translateY(-3px)'}];
      const animation=content.animate(frames,{duration:motionPreference.matches?120:desiredOpen?220:140,easing:'ease-out'});
      running=animation;
      animation.finished.then(()=>{if(running!==animation)return;if(!desiredOpen)details.open=false;running=null}).catch(()=>{});
    });
  });

  const topic=new URLSearchParams(location.search).get('temat');
  if(topic && $('.contact-card')){const note=document.createElement('p');note.className='selected-game';note.textContent='Wybrana gra: '+topic.slice(0,120);$('.contact-card').prepend(note)}
})();
