// Súper Machi: la reserva por WhatsApp desde el plano de la sala, y los shows que ya pasaron aunque la web no se haya
// vuelto a publicar (la fecha se revisa con la hora de Miami).
(() => {
  const hoy = ahoraMiami().iso;

  // carteles y páginas de shows que pasaron después del último build
  for (const c of $$('.cartel[data-fecha]')) if (c.dataset.fecha < hoy) c.classList.add('cartel--pasado');
  const ev = $('.evento[data-fecha]');
  if (ev && ev.dataset.fecha < hoy && !ev.classList.contains('evento--pasado')) {
    ev.classList.add('evento--pasado');
    $('.evento__acciones')?.setAttribute('hidden', '');
    $('#reservar')?.setAttribute('hidden', '');
    const p = document.createElement('div'); p.className = 'evento__estado';
    p.innerHTML = LANG === 'en' ? '<p><strong>This show already happened.</strong> See the lineup for what’s next.</p><p><a class="boton" href="/en/shows/">See the lineup</a></p>'
      : '<p><strong>Este show ya pasó.</strong> Mira en la cartelera lo que viene.</p><p><a class="boton" href="/eventos/">Ver la cartelera</a></p>';
    $('.evento__datos')?.append(p);
  }

  // la escena de la portada: el letrero dice qué plato está en pantalla (los tramos los escribe web/tools/videos.py)
  const letrero = $('.escena__plato[data-tramos]');
  const clip = $('.escena video');
  if (letrero && clip) {
    let tramos = []; try { tramos = JSON.parse(letrero.dataset.tramos); } catch { /* sin letrero */ }
    const nombre = $('[data-plato]', letrero); let actual = 0;
    clip.addEventListener('timeupdate', () => {
      const i = tramos.findIndex((x) => clip.currentTime >= x.d && clip.currentTime < x.h);
      if (i < 0 || i === actual) return;
      actual = i; letrero.classList.add('cambia');
      setTimeout(() => { nombre.textContent = tramos[i].n; letrero.classList.remove('cambia'); }, 260);
    });
  }

  // la luz del escenario. En el teléfono, el cartel apagado que cruza el centro de la pantalla recupera el color (una
  // franja fina en el medio); con ratón, la luz es el puntero: una luz cálida lo sigue y el cartel de debajo se enciende.
  const conRaton = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!conRaton && 'IntersectionObserver' in window) {
    const luz = new IntersectionObserver((es) => { for (const e of es) e.target.classList.toggle('cartel--luz', e.isIntersecting); }, { rootMargin: '-46% 0px -46% 0px' });
    for (const c of $$('.cartel--pasado')) luz.observe(c);
  }
  if (conRaton && !REDUCIDO) {
    for (const pared of $$('.pared')) {
      const luz = document.createElement('li'); luz.className = 'pared__luz'; luz.setAttribute('aria-hidden', 'true'); pared.append(luz);
      let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
      const pintar = () => { luz.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; };
      const paso = () => { x += (tx - x) * 0.2; y += (ty - y) * 0.2; pintar(); raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(paso) : 0; };
      const donde = (e) => { const r = pared.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; };
      pared.addEventListener('pointerenter', (e) => { donde(e); x = tx; y = ty; pintar(); pared.classList.add('con-luz'); });
      pared.addEventListener('pointermove', (e) => { donde(e); if (!raf) raf = requestAnimationFrame(paso); });
      pared.addEventListener('pointerleave', () => pared.classList.remove('con-luz'));
    }
  }
  // del muro al show: el cartel que se toca se vuelve el flyer de la página del show (View Transitions entre páginas).
  // Un solo elemento puede llevar el nombre: se limpia antes, también el flyer de la página actual.
  if (window.CSS && CSS.supports('view-transition-name: none')) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.cartel__enlace');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      for (const img of $$('.cartel__enlace img, .evento__flyer img')) img.style.viewTransitionName = 'none';
      const img = $('img', a); if (img) img.style.viewTransitionName = 'flyer';
    });
    addEventListener('pageshow', (e) => { if (!e.persisted) return; setTimeout(() => { for (const img of $$('.cartel__enlace img, .evento__flyer img')) img.style.viewTransitionName = ''; }, 900); });
  }

  // reserva: zona en el plano + personas + fecha → mensaje de WhatsApp
  const form = $('[data-reserva]');
  if (!form) return;
  const fecha = $('[data-hoy-min]', form);
  if (fecha) fecha.min = hoy;
  const radios = $$('input[name="zona"]', form);
  const plano = $('.plano');
  const marcar = () => {
    const z = radios.find((r) => r.checked)?.dataset.zona;
    for (const g of $$('.plano__zona', plano)) g.classList.toggle('activa', g.dataset.zona === z);
  };
  radios.forEach((r) => r.addEventListener('change', marcar));
  plano?.addEventListener('click', (e) => {
    const g = e.target.closest('.plano__zona'); if (!g) return;
    const r = radios.find((x) => x.dataset.zona === g.dataset.zona);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change')); r.focus({ preventScroll: true }); }
  });
  marcar();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const en = LANG === 'en';
    const fechaTxt = (v) => { if (!v) return ''; const [y, m, dd] = v.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString(en ? 'en-US' : 'es-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); };
    const lineas = [en ? 'Hi! I’d like to reserve at Super Machi.' : 'Hola, quiero reservar en Súper Machi.'];
    if (form.dataset.evento) lineas.push(`${en ? 'Show' : 'Show'}: ${form.dataset.evento}`);
    if (d.get('fecha')) lineas.push(`${en ? 'Date' : 'Fecha'}: ${fechaTxt(d.get('fecha'))}`);
    lineas.push(`${en ? 'Area' : 'Zona'}: ${d.get('zona') || '-'}`, `${en ? 'Guests' : 'Personas'}: ${d.get('personas')}`);
    if (d.get('nombre')) lineas.push(`${en ? 'Name' : 'Nombre'}: ${String(d.get('nombre')).slice(0, 60)}`);
    location.href = `https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(lineas.join('\n'))}`;
  });
})();
