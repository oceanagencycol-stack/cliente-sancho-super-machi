// Sancho: el sol de la semana. Hoy sale con la hora de Miami (el script de arranque ya lo marcó en <html data-hoy>);
// al tocar otro día el sol gira hasta él por el camino corto. Con movimiento reducido salta sin girar.
(() => {
  const sol = $('[data-sol]');
  if (!sol) return;
  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const ESTRELLA = -50; // dónde apunta la estrella del logo, en grados desde las 12 en punto
  const arte = $('.sol__arte', sol);
  const tabs = $$('[role="tab"]', sol);
  const hoy = Number(document.documentElement.dataset.hoy ?? ahoraMiami().dow);
  let giro = null;

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
    b.addEventListener('click', () => elegir(Number(b.dataset.dia)));
    b.addEventListener('keydown', (e) => {
      const i = ORDEN.indexOf(Number(b.dataset.dia));
      const mov = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (mov) { e.preventDefault(); elegir(ORDEN[(i + mov + 7) % 7], true); }
      if (e.key === 'Home') { e.preventDefault(); elegir(ORDEN[0], true); }
      if (e.key === 'End') { e.preventDefault(); elegir(ORDEN[6], true); }
    });
  }
  for (const p of $$('.sol__panel', sol)) if (Number(p.dataset.dia) === hoy) p.classList.add('es-hoy');
  for (const li of $$('.semana__dia')) if (Number(li.dataset.dia) === hoy) li.classList.add('es-hoy');
  // primera vuelta: el CSS lo pinta 140° antes de hoy y aquí gira hasta hoy (una vez); con movimiento reducido, quieto
  if (!REDUCIDO) requestAnimationFrame(() => requestAnimationFrame(() => { sol.classList.add('girando'); elegir(hoy); }));
  else elegir(hoy);
})();
