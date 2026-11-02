// Sancho: el sol de la semana. Hoy sale con la hora de Miami (el script de arranque ya lo marcó en <html data-hoy>);
// al tocar otro día el sol gira hasta él por el camino corto. Con movimiento reducido salta sin girar.
(() => {
  const sol = $('[data-sol]');
  if (!sol) return;
  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const ESTRELLA = -50; // dónde apunta la estrella del logo, en grados desde las 12 en punto
  const arte = $('.sol__arte', sol);
  const halo = $('.sol__halo', sol);
  const tabs = $$('[role="tab"]', sol);
  const hoy = Number(document.documentElement.dataset.hoy ?? ahoraMiami().dow);
  let giro = null;
  // al tocar un día: el texto nuevo entra (CSS, .sol--cambio) y el halo late una vez
  const latir = () => { if (REDUCIDO || !halo) return; halo.classList.remove('pulso'); void halo.offsetWidth; halo.classList.add('pulso'); };

  const angulo = (dia) => (ORDEN.indexOf(dia) * 360) / 7 - ESTRELLA;
  function elegir(dia, foco = false) {
    sol.dataset.activo = String(dia);
    for (const b of tabs) {
      const si = Number(b.dataset.dia) === dia;
      b.setAttribute('aria-selected', String(si));
      b.tabIndex = si ? 0 : -1;
      if (si && foco) b.focus();
    }
    const destino = angulo(dia);
    if (giro === null) giro = destino;
    else giro += ((((destino - giro) % 360) + 540) % 360) - 180;
    arte.style.setProperty('--giro', `${giro}deg`);
  }
  for (const b of tabs) {
    if (Number(b.dataset.dia) === hoy) b.classList.add('es-hoy');
    const tocar = (dia, foco = false) => { const antes = sol.dataset.activo; sol.classList.add('sol--cambio'); elegir(dia, foco); if (antes !== String(dia)) latir(); };
    b.addEventListener('click', () => tocar(Number(b.dataset.dia)));
    b.addEventListener('keydown', (e) => {
      const i = ORDEN.indexOf(Number(b.dataset.dia));
      const mov = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (mov) { e.preventDefault(); tocar(ORDEN[(i + mov + 7) % 7], true); }
      if (e.key === 'Home') { e.preventDefault(); tocar(ORDEN[0], true); }
      if (e.key === 'End') { e.preventDefault(); tocar(ORDEN[6], true); }
    });
  }
  for (const p of $$('.sol__panel', sol)) if (Number(p.dataset.dia) === hoy) p.classList.add('es-hoy');
  for (const li of $$('.semana__dia')) if (Number(li.dataset.dia) === hoy) li.classList.add('es-hoy');
  // primera vuelta: el CSS lo pinta 140° antes de hoy y aquí gira hasta hoy (una vez); con movimiento reducido, quieto
  if (!REDUCIDO) requestAnimationFrame(() => requestAnimationFrame(() => { sol.classList.add('girando'); elegir(hoy); setTimeout(latir, 520); }));
  else elegir(hoy);

  // con ratón: el cielo se mueve por capas y el sol se inclina un poco hacia el puntero (solo translate/rotate; el
  // cuadro se pide mientras hay movimiento y se detiene al llegar)
  const hero = sol.closest('.hero');
  const rueda = $('.sol__rueda', sol);
  const capas = $$('.cielo__capa', sol);
  if (hero && rueda && matchMedia('(hover: hover) and (pointer: fine)').matches && !REDUCIDO) {
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const paso = () => {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      capas.forEach((c, i) => { c.style.translate = `${(x * (i + 1) * 1.6).toFixed(2)}px ${(y * (i + 1) * 1.2).toFixed(2)}px`; });
      const m = Math.hypot(x, y);
      rueda.style.rotate = m > 0.001 ? `${(-y / m).toFixed(3)} ${(x / m).toFixed(3)} 0 ${(m * 6).toFixed(2)}deg` : '';
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(paso) : 0;
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (!raf) raf = requestAnimationFrame(paso);
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(paso); });
  }
})();
