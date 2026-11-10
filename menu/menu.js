// Buscador, sección activa del índice y visor de fotos. La carta se lee entera sin JavaScript.
(() => {
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const campo = document.querySelector('[data-buscar]');
  const vacio = document.querySelector('[data-vacio]');
  const items = [...document.querySelectorAll('[data-buscar]:not(input)')];
  const secciones = [...document.querySelectorAll('.seccion')];
  if (campo) campo.addEventListener('input', () => {
    const q = norm(campo.value);
    let hay = 0;
    for (const el of items) { const ve = !q || el.dataset.buscar.includes(q); el.hidden = !ve; if (ve) hay++; }
    for (const s of secciones) s.hidden = !!q && !s.querySelector('[data-buscar]:not([hidden])');
    for (const g of document.querySelectorAll('.grupo')) g.hidden = !!q && !g.querySelector('[data-buscar]:not([hidden])');
    vacio.hidden = hay > 0;
  });

  // índice: marca la sección que se está leyendo y la mantiene a la vista
  const indice = document.querySelector('.indice');
  const enlaces = new Map([...document.querySelectorAll('.indice a')].map((a) => [a.hash.slice(1), a]));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) {
        for (const a of enlaces.values()) a.removeAttribute('aria-current');
        const a = enlaces.get(e.target.id);
        if (a) { a.setAttribute('aria-current', 'true'); indice.scrollTo({ left: a.parentElement.offsetLeft - indice.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' }); }
      }
    }, { rootMargin: '-35% 0px -60% 0px' });
    secciones.forEach((s) => io.observe(s));
  }

  // visor: la foto en grande al tocarla
  const visor = document.querySelector('[data-visor]');
  if (visor && visor.showModal) document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.plato__foto');
    if (!b) return;
    const img = b.querySelector('img');
    visor.querySelector('[data-visor-img]').src = img.dataset.grande;
    visor.querySelector('[data-visor-img]').alt = img.alt;
    visor.querySelector('[data-visor-titulo]').textContent = img.alt;
    visor.showModal();
  });
  if (visor) visor.addEventListener('click', (ev) => { if (ev.target === visor) visor.close(); });
})();
