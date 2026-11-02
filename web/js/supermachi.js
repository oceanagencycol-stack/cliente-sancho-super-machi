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
