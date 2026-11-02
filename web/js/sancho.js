// Sancho: el sol de la semana elige el plato. Hoy sale con la hora de Miami (el script de arranque ya lo marcó en
// <html data-hoy>); al tocar otro día el sol gira hasta él por el camino corto, el plato de ese día entra a pantalla
// completa con un fundido (cuando ya llegó la foto) y el halo late. Con movimiento reducido, todo salta sin moverse.
(() => {
  const dia = $('[data-sol]');
  if (!dia) return;
  const sol = $('.sol', dia);
  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const ESTRELLA = -50; // dónde apunta la estrella del logo, en grados desde las 12 en punto
  const arte = $('.sol__arte', dia);
  const halo = $('.sol__halo', dia);
  const tabs = $$('[role="tab"]', dia);
  const fondos = $$('.dia__fondo', dia);
  const hoy = Number(document.documentElement.dataset.hoy ?? ahoraMiami().dow);
  let giro = null;
  let actual = null;

  const latir = () => { if (REDUCIDO || !halo) return; halo.classList.remove('pulso'); void halo.offsetWidth; halo.classList.add('pulso'); };

  // el plato de fondo: el nuevo entra encima cuando su foto ya está (o a los 1,2 s, lo que pase primero)
  function cambiarFondo(d) {
    const nuevo = fondos.find((f) => Number(f.dataset.dia) === d);
    if (!nuevo || nuevo === actual) return;
    const viejo = actual; actual = nuevo;
    if (!viejo || REDUCIDO) { nuevo.classList.add('activo'); viejo?.classList.remove('activo'); return; }
    nuevo.classList.add('entrando', 'activo'); viejo.classList.remove('activo'); viejo.classList.add('saliendo');
    const img = $('.dia__foto img, .video__poster img', nuevo);
    if (img && img.loading === 'lazy') img.loading = 'eager';
    const listo = !img || img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    Promise.race([listo.then(() => img?.decode?.().catch(() => {})), new Promise((r) => setTimeout(r, 1200))]).then(() => requestAnimationFrame(() => {
      if (actual !== nuevo) return;
      nuevo.classList.remove('entrando');
      setTimeout(() => { if (actual !== viejo) viejo.classList.remove('saliendo'); }, 900);
    }));
  }

  const angulo = (d) => (ORDEN.indexOf(d) * 360) / 7 - ESTRELLA;
  function elegir(d, foco = false) {
    cambiarFondo(d);
    dia.dataset.activo = sol.dataset.activo = String(d);
    for (const b of tabs) {
      const si = Number(b.dataset.dia) === d;
      b.setAttribute('aria-selected', String(si));
      b.tabIndex = si ? 0 : -1;
      if (si && foco) b.focus();
    }
    const destino = angulo(d);
    if (giro === null) giro = destino;
    else giro += ((((destino - giro) % 360) + 540) % 360) - 180;
    arte.style.setProperty('--giro', `${giro}deg`);
  }
  const tocar = (d, foco = false) => { const antes = dia.dataset.activo; sol.classList.add('sol--cambio'); elegir(d, foco); if (antes !== String(d)) latir(); };
  for (const b of tabs) {
    if (Number(b.dataset.dia) === hoy) b.classList.add('es-hoy');
    b.addEventListener('click', () => tocar(Number(b.dataset.dia)));
    b.addEventListener('keydown', (e) => {
      const i = ORDEN.indexOf(Number(b.dataset.dia));
      const mov = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (mov) { e.preventDefault(); tocar(ORDEN[(i + mov + 7) % 7], true); }
      if (e.key === 'Home') { e.preventDefault(); tocar(ORDEN[0], true); }
      if (e.key === 'End') { e.preventDefault(); tocar(ORDEN[6], true); }
    });
  }
  for (const p of $$('.sol__panel', dia)) if (Number(p.dataset.dia) === hoy) p.classList.add('es-hoy');
  // primera vuelta: el CSS lo pinta 140° antes de hoy y aquí gira hasta hoy (una vez); con movimiento reducido, quieto
  if (!REDUCIDO) requestAnimationFrame(() => requestAnimationFrame(() => { sol.classList.add('girando'); elegir(hoy); setTimeout(latir, 520); }));
  else elegir(hoy);

  // los platos de los otros días se bajan cuando la página ya está quieta: tocar un día no espera a la red
  const precargar = () => { for (const img of $$('.dia__fondo img[loading="lazy"]', dia)) img.loading = 'eager'; };
  addEventListener('load', () => ('requestIdleCallback' in window ? requestIdleCallback(precargar, { timeout: 4000 }) : setTimeout(precargar, 2500)), { once: true });

  // con ratón: el sol se inclina un poco hacia el puntero (solo rotate; el cuadro se pide mientras hay movimiento)
  const rueda = $('.sol__rueda', dia);
  if (rueda && matchMedia('(hover: hover) and (pointer: fine)').matches && !REDUCIDO) {
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const paso = () => {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      const m = Math.hypot(x, y);
      rueda.style.rotate = m > 0.001 ? `${(-y / m).toFixed(3)} ${(x / m).toFixed(3)} 0 ${(m * 6).toFixed(2)}deg` : '';
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(paso) : 0;
    };
    dia.addEventListener('pointermove', (e) => {
      const r = dia.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (!raf) raf = requestAnimationFrame(paso);
    });
    dia.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(paso); });
  }
})();
