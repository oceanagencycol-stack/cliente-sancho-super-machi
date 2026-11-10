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

// Mi pedido: la lista que se le enseña al mesero. Se guarda solo en este teléfono (12 horas) y nunca sale de él.
(() => {
  const raiz = document.querySelector('[data-pedido]');
  if (!raiz) return;
  const CLAVE = 'supermachi-menu:pedido';
  const lee = () => { try { const v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return v && Date.now() - v.t < 12 * 3600e3 ? v : null; } catch { return null; } };
  const guarda = () => { try { localStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), lineas, nota: nota.value })); } catch {} };
  const nombres = new Map([...document.querySelectorAll('[data-anotar]')].map((b) => [b.dataset.anotar, b.dataset.nombre]));
  const hoja = raiz.querySelector('#pedido-hoja'), abrir = raiz.querySelector('[data-pedido-abrir]'), nota = raiz.querySelector('[data-pedido-nota]');
  const mesero = raiz.querySelector('[data-mesero]');
  const guardado = lee();
  let lineas = (guardado?.lineas || []).filter((l) => nombres.has(l.id) && l.c > 0);
  nota.value = guardado?.nota || '';
  const pinta = () => {
    const n = lineas.reduce((a, l) => a + l.c, 0);
    raiz.querySelector('[data-pedido-cuenta]').textContent = n;
    raiz.hidden = n === 0 && hoja.hidden;
    raiz.querySelector('[data-pedido-vacio]').hidden = n > 0;
    const ul = raiz.querySelector('[data-pedido-lineas]'); ul.replaceChildren();
    for (const l of lineas) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="pedido__cant"></span><span class="pedido__nombre"></span><span class="pedido__botones"><button type="button" data-menos>−</button><button type="button" data-mas>+</button></span>';
      li.querySelector('.pedido__cant').textContent = l.c + '×';
      li.querySelector('.pedido__nombre').textContent = nombres.get(l.id);
      li.querySelector('[data-menos]').setAttribute('aria-label', '− ' + nombres.get(l.id));
      li.querySelector('[data-mas]').setAttribute('aria-label', '+ ' + nombres.get(l.id));
      li.querySelector('[data-menos]').onclick = () => cambia(l.id, -1);
      li.querySelector('[data-mas]').onclick = () => cambia(l.id, 1);
      ul.append(li);
    }
    for (const b of document.querySelectorAll('[data-anotar]')) {
      const l = lineas.find((x) => x.id === b.dataset.anotar);
      b.textContent = l ? String(l.c) : '+'; b.classList.toggle('anotado', !!l);
    }
  };
  const cambia = (id, d) => {
    const l = lineas.find((x) => x.id === id);
    if (l) l.c += d; else if (d > 0) lineas.push({ id, c: 1 });
    lineas = lineas.filter((x) => x.c > 0);
    guarda(); pinta();
  };
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-anotar]'); if (!b) return;
    cambia(b.dataset.anotar, 1);
    abrir.animate?.([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 220 });
  });
  const cierra = () => { hoja.hidden = true; abrir.setAttribute('aria-expanded', 'false'); document.body.classList.remove('hoja-abierta'); pinta(); abrir.focus(); };
  abrir.onclick = () => { if (!hoja.hidden) return cierra(); hoja.hidden = false; abrir.setAttribute('aria-expanded', 'true'); document.body.classList.add('hoja-abierta'); raiz.querySelector('[data-pedido-cerrar]').focus(); };
  raiz.querySelector('[data-pedido-cerrar]').onclick = cierra;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!mesero.hidden) mesero.hidden = true; else if (!hoja.hidden) cierra(); } });
  nota.addEventListener('input', guarda);
  raiz.querySelector('[data-pedido-vaciar]').onclick = () => { lineas = []; nota.value = ''; guarda(); pinta(); };
  raiz.querySelector('[data-pedido-mesero]').onclick = () => {
    if (!lineas.length) return;
    const ul = mesero.querySelector('[data-mesero-lista]'); ul.replaceChildren();
    for (const l of lineas) { const li = document.createElement('li'); li.textContent = `${l.c} × ${nombres.get(l.id)}`; ul.append(li); }
    mesero.querySelector('[data-mesero-nota]').textContent = nota.value.trim();
    mesero.hidden = false; mesero.querySelector('[data-mesero-volver]').focus();
  };
  mesero.querySelector('[data-mesero-volver]').onclick = () => { mesero.hidden = true; };
  pinta();
})();

// El club: el enlace de Pleamar lleva el origen del escaneo (QR de mesa, póster…) para que el panel sepa qué trajo a cada miembro.
(() => {
  let src = new URLSearchParams(location.search).get('src');
  try { if (src) sessionStorage.setItem('supermachi-menu:src', src); else src = sessionStorage.getItem('supermachi-menu:src'); } catch {}
  for (const a of document.querySelectorAll('[data-club]')) {
    const u = new URL(a.href);
    if (src) u.searchParams.set('utm_source', src);
    u.searchParams.set('utm_medium', 'menu-digital');
    a.href = u.toString();
  }
  // la versión en otro idioma conserva el origen
  if (src) for (const a of document.querySelectorAll('.cabecera__idioma')) { const u = new URL(a.href, location.href); u.searchParams.set('src', src); a.href = u.pathname + u.search; }
})();
