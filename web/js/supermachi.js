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
  const en = LANG === 'en';

  // las horas que se ofrecen según el día: desde que abre hasta una hora antes de cerrar (hasta las 11:30 p. m. si cierra
  // de madrugada) y, si es hoy, desde dentro de una hora
  let franjas = []; try { franjas = JSON.parse(form.dataset.franjas || '[]'); } catch { /* todas las horas */ }
  const selHora = $('select[name="hora"]', form);
  const todas = [...selHora.options].map((o) => ({ v: o.value, t: o.textContent }));
  const campoFecha = $('[name="fecha"]', form);
  const horasDel = (iso) => {
    if (!iso || !franjas.length) return todas;
    const [y, m, dd] = iso.split('-').map(Number); const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
    const ahora = ahoraMiami();
    const desde = iso === ahora.iso ? ahora.min + 60 : 0;
    return todas.filter((o) => { const x = aMin(o.v); return x >= desde && franjas.some((f) => f.dias.includes(dow) && x >= aMin(f.abre) && (aMin(f.cierra) <= aMin(f.abre) || x <= aMin(f.cierra) - 60)); });
  };
  const ponerHoras = () => {
    const antes = selHora.value; const lista = horasDel(campoFecha?.value);
    selHora.replaceChildren(...lista.map((o) => new Option(o.t, o.v)));
    if (!lista.length) selHora.append(new Option(en ? 'No times left that day' : 'Ya no quedan horas ese día', ''));
    selHora.value = lista.some((o) => o.v === antes) ? antes : (lista.find((o) => o.v >= '20:00') || lista[lista.length - 1] || { v: '' }).v;
  };
  campoFecha?.addEventListener('change', ponerHoras);
  ponerHoras();

  const fechaTxt = (v) => { if (!v) return ''; const [y, m, dd] = v.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString(en ? 'en-US' : 'es-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); };
  const horaTxt = (v) => todas.find((o) => o.v === v)?.t || v;
  const digitos = (v) => { let n = String(v || '').replace(/\D/g, ''); if (n.length === 10) n = '1' + n; return n; };
  const error = $('[data-reserva-error]', form);
  const decir = (txt, campo) => { error.textContent = txt; error.hidden = !txt; if (campo) campo.focus(); };
  // el mismo pedido, por WhatsApp a mano (sin JS de servidor o si la línea automática no responde)
  const porWhatsApp = (d) => {
    const lineas = [en ? 'Hi! I’d like to reserve at Super Machi.' : 'Hola, quiero reservar en Súper Machi.'];
    if (form.dataset.evento) lineas.push(`Show: ${form.dataset.evento}`);
    if (d.fecha) lineas.push(`${en ? 'Date' : 'Fecha'}: ${fechaTxt(d.fecha)}`);
    if (d.hora) lineas.push(`${en ? 'Time' : 'Hora'}: ${horaTxt(d.hora)}`);
    lineas.push(`${en ? 'Area' : 'Zona'}: ${d.zona || '-'}`, `${en ? 'Guests' : 'Personas'}: ${d.personas}`);
    if (d.nombre) lineas.push(`${en ? 'Name' : 'Nombre'}: ${d.nombre}`);
    if (d.nota) lineas.push(`${en ? 'Note' : 'Nota'}: ${d.nota}`);
    location.href = `https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(lineas.join('\n'))}`;
  };
  const listo = $('[data-reserva-listo]');
  $('[data-reserva-otra]')?.addEventListener('click', () => { listo.hidden = true; form.hidden = false; form.reset(); marcar(); ponerHoras(); $('input[name="nombre"]', form).focus(); });

  let enviando = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando) return;
    const f = new FormData(form);
    const d = Object.fromEntries(['zona', 'personas', 'fecha', 'hora', 'nombre', 'telefono', 'nota', 'empresa'].map((k) => [k, String(f.get(k) || '').trim()]));
    d.nombre = d.nombre.slice(0, 60); d.nota = d.nota.slice(0, 300);
    if (form.dataset.evento) d.evento = form.dataset.evento;
    d.lang = LANG;
    if (!d.fecha || d.fecha < hoy) return decir(en ? 'Choose the day.' : 'Elige el día.', campoFecha);
    if (!d.hora) return decir(en ? 'Choose a time (or another day).' : 'Elige una hora (u otro día).', selHora);
    if (d.nombre.length < 2) return decir(en ? 'Tell us your name.' : 'Dinos tu nombre.', $('input[name="nombre"]', form));
    const n = digitos(d.telefono);
    if (n.length < 8 || n.length > 15) return decir(en ? 'Write your WhatsApp number (with area code).' : 'Escribe tu número de WhatsApp (con el código de área).', $('input[name="telefono"]', form));
    decir('');
    const boton = $('button[type="submit"]', form); const txt = boton.textContent;
    enviando = true; boton.disabled = true; boton.textContent = en ? 'Sending…' : 'Enviando…';
    let r = null;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
      const resp = await fetch('/api/reservar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: ctl.signal });
      clearTimeout(t);
      r = { status: resp.status, ...(await resp.json().catch(() => ({}))) };
    } catch { r = null; }
    enviando = false; boton.disabled = false; boton.textContent = txt;
    if (r && r.ok) {
      const visible = n.length === 11 && n[0] === '1' ? `+1 (${n.slice(1, 4)}) ${n.slice(4, 7)}-${n.slice(7)}` : '+' + n;
      const pila = d.nombre.split(' ')[0];
      $('[data-reserva-listo-texto]', listo).textContent = r.cliente
        ? (en ? `Thanks, ${pila}. We just sent a message to your WhatsApp (${visible}) with your request for ${fechaTxt(d.fecha)} at ${horaTxt(d.hora)}. The restaurant will confirm your table in that same chat.` : `Gracias, ${pila}. Te acabamos de escribir a tu WhatsApp (${visible}) con tu solicitud para el ${fechaTxt(d.fecha)} a las ${horaTxt(d.hora)}. El restaurante te confirma la mesa en ese mismo chat.`)
        : (en ? `Thanks, ${pila}. The restaurant has your request for ${fechaTxt(d.fecha)} at ${horaTxt(d.hora)} and will call you at ${visible} to confirm.` : `Gracias, ${pila}. El restaurante ya tiene tu solicitud para el ${fechaTxt(d.fecha)} a las ${horaTxt(d.hora)} y te llama al ${visible} para confirmar.`);
      form.hidden = true; listo.hidden = false; listo.focus();
      return;
    }
    if (r && r.status === 400) {
      const campo = { nombre: 'nombre', telefono: 'telefono', fecha: 'fecha', hora: 'hora' }[r.error];
      return decir(en ? 'Please check that field.' : 'Revisa ese dato, por favor.', campo ? $(`[name="${campo}"]`, form) : null);
    }
    // la línea automática no respondió: la reserva no se pierde, sale por WhatsApp con un toque
    porWhatsApp(d);
  });
})();
