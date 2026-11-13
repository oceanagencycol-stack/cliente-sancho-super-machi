// Menú digital de Súper Machi. La carta se lee entera sin JavaScript; esto le suma el video de la cocina, la ficha de cada
// plato, el buscador con filtros, el índice que sigue la lectura y «Mi pedido» (solo en este teléfono, 12 horas, nunca sale de él).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TX = JSON.parse($('#textos').textContent);
  const fmt = (s, v) => s.replace(/\{\w\}/, v);
  const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AHORRO = !!(navigator.connection && navigator.connection.saveData);
  const vibra = () => { try { navigator.vibrate?.(8); } catch {} };
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const escH = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- el video de la cocina: el póster ya está; el clip se pide después del load, solo en pantalla, y nunca con
  // movimiento reducido ni ahorro de datos. El letrero dice qué plato se ve.
  const caja = $('[data-video]');
  if (caja) {
    const v = $('video', caja); const boton = $('[data-video-pausa]', caja);
    const letrero = $('[data-tramos]'); const tramos = letrero ? JSON.parse(letrero.dataset.tramos) : [];
    const span = letrero && $('[data-tramo]', letrero);
    const TEL = matchMedia('(max-width: 47.99rem)');
    const FORMATO = document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"') ? '.mp4' : '.webm';
    let visible = false; let actual = 0;
    const cargar = () => { if (!v.getAttribute('src')) v.src = (TEL.matches ? v.dataset.telefono : v.dataset.escritorio) + FORMATO; };
    const correr = () => { if (!visible || caja.classList.contains('pausado') || document.hidden) return; cargar(); v.play().catch(() => {}); };
    const armar = () => {
      if (REDUCIDO || AHORRO || !('IntersectionObserver' in window)) { caja.classList.add('quieto'); return; }
      v.addEventListener('playing', () => caja.classList.add('rodando'));
      v.addEventListener('timeupdate', () => {
        const i = tramos.findIndex((t) => v.currentTime >= t.d && v.currentTime < t.h);
        if (i < 0 || i === actual || !span) return;
        actual = i; letrero.classList.add('cambia');
        setTimeout(() => { span.textContent = tramos[i].n; letrero.classList.remove('cambia'); }, 220);
      });
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) correr(); else v.pause(); }, { rootMargin: '100px 0px' }).observe(caja);
      document.addEventListener('visibilitychange', () => (document.hidden ? v.pause() : correr()));
    };
    boton?.addEventListener('click', () => {
      const pausar = !caja.classList.contains('pausado');
      caja.classList.toggle('pausado', pausar); boton.setAttribute('aria-pressed', String(pausar));
      boton.setAttribute('aria-label', pausar ? boton.dataset.play : boton.dataset.pausa);
      if (pausar) v.pause(); else correr();
    });
    if (document.readyState === 'complete') armar(); else addEventListener('load', armar, { once: true });
  }

  // ---------- promociones: «ahora» o «hoy desde las …» con la hora de Miami; la que está en curso pasa primero
  const promos = $$('[data-cuando]');
  if (promos.length) {
    const pintar = () => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
      const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
      const ahora = `${p.hour}:${p.minute}`;
      for (const li of promos) {
        const c = JSON.parse(li.dataset.cuando); const et = $('[data-ahora]', li);
        const hoy = c.dias.includes(dia);
        const enCurso = hoy && (!c.desde || ahora >= c.desde) && (!c.hasta || ahora < c.hasta);
        const luego = hoy && c.desde && ahora < c.desde;
        li.classList.toggle('en-curso', enCurso);
        et.hidden = !(enCurso || luego);
        if (enCurso) et.textContent = TX.ahora;
        else if (luego) {
          const [h, m] = c.desde.split(':').map(Number); const h12 = ((h + 11) % 12) + 1;
          const hora = TX.lang === 'en' ? `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}` : `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'a. m.' : 'p. m.'}`;
          et.textContent = fmt(TX.hoyDesde, hora);
        }
      }
      const lista = promos[0].parentElement; const primera = promos.find((li) => li.classList.contains('en-curso'));
      if (primera && lista.firstElementChild !== primera) lista.prepend(primera);
    };
    pintar(); setInterval(pintar, 60000);
  }

  // ---------- hojas (ficha, secciones, pedido, mesero): abren con <dialog>, cierran con un deslizamiento hacia abajo
  const cerrarHoja = (d) => {
    if (!d.open || d.classList.contains('cerrando')) return;
    if (REDUCIDO || d.classList.contains('mesero')) { d.close(); return; }
    d.classList.add('cerrando');
    const fin = () => { d.classList.remove('cerrando'); d.style.transform = ''; d.close(); };
    d.addEventListener('animationend', fin, { once: true });
    setTimeout(() => d.classList.contains('cerrando') && fin(), 400);
  };
  const abrirHoja = (d) => { if (!d.open) { d.style.transform = ''; d.showModal(); } };
  for (const d of $$('dialog')) {
    d.addEventListener('cancel', (e) => { e.preventDefault(); d.dispatchEvent(new Event('pedir-cierre')); });
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-cerrar]')) return d.dispatchEvent(new Event('pedir-cierre'));
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.dispatchEvent(new Event('pedir-cierre'));
    });
    d.addEventListener('pedir-cierre', () => cerrarHoja(d));
    // el asa: se arrastra hacia abajo para cerrar
    const asa = $('[data-asa]', d);
    if (asa) {
      let y0 = null; let dy = 0;
      asa.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; asa.setPointerCapture(e.pointerId); d.style.transition = 'none'; });
      asa.addEventListener('pointermove', (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); d.style.transform = `translateY(${dy}px)`; });
      const suelta = () => {
        if (y0 === null) return; y0 = null; d.style.transition = '';
        if (dy > 90) d.dispatchEvent(new Event('pedir-cierre')); else d.animate?.([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });
        d.style.transform = dy > 90 ? `translateY(${dy}px)` : '';
      };
      asa.addEventListener('pointerup', suelta); asa.addEventListener('pointercancel', suelta);
    }
  }

  // ---------- la carta: platos, secciones y el índice
  const items = $$('[data-plato]');
  const secciones = $$('.seccion');
  const porId = new Map(items.map((li) => [li.dataset.plato, li]));
  const tituloSeccion = (sid) => $(`#t-${CSS.escape(sid)}`)?.textContent || '';
  const enlaces = new Map($$('[data-indice]').map((a) => [a.dataset.indice, a]));
  const mosaico = new Map($$('[data-ir]').map((a) => [a.hash.slice(3), a]));
  const indice = $('.indice');
  let marcada = null;
  const marcar = (sid) => {
    if (sid === marcada) return; marcada = sid;
    for (const a of enlaces.values()) a.removeAttribute('aria-current');
    for (const a of mosaico.values()) a.removeAttribute('aria-current');
    const a = enlaces.get(sid); mosaico.get(sid)?.setAttribute('aria-current', 'true');
    if (a) { a.setAttribute('aria-current', 'true'); indice.scrollTo({ left: a.parentElement.offsetLeft - indice.clientWidth / 2 + a.offsetWidth / 2, behavior: REDUCIDO ? 'auto' : 'smooth' }); }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target.hidden) marcar(e.target.id.slice(2)); }, { rootMargin: '-30% 0px -65% 0px' });
    secciones.forEach((s) => io.observe(s));
  }
  // el botón de volver arriba aparece cuando la carta ya va lejos
  const arriba = $('[data-arriba]'); const inicio = $('#carta-inicio');
  let pendiente = false;
  addEventListener('scroll', () => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; arriba.hidden = scrollY < innerHeight * 2.2; });
  }, { passive: true });
  arriba.addEventListener('click', () => inicio.scrollIntoView({ behavior: REDUCIDO ? 'auto' : 'smooth' }));

  // los puntos del carril del chef siguen la tarjeta que se ve
  for (const carril of $$('[data-carril]')) {
    const puntos = $$('i', carril.nextElementSibling);
    const pinta = () => { const w = carril.firstElementChild?.offsetWidth || 1; const i = Math.round(carril.scrollLeft / (w + 13)); puntos.forEach((p, j) => p.classList.toggle('activo', j === Math.min(i, puntos.length - 1))); };
    carril.addEventListener('scroll', () => requestAnimationFrame(pinta), { passive: true }); pinta();
  }

  // ir a una sección: suave si está cerca; si está lejos, salta y el título entra con un fundido (sin un viaje de 10 metros)
  const irA = (s) => {
    const lejos = Math.abs(s.getBoundingClientRect().top) > innerHeight * 2.5;
    s.scrollIntoView({ behavior: REDUCIDO || lejos ? 'instant' : 'smooth' });
    marcar(s.id.slice(2));
    if (lejos && !REDUCIDO) $('.seccion__cabeza', s).animate?.([{ opacity: 0, transform: 'translateY(.8rem)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  indice.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); irA($(a.hash)); history.replaceState(history.state, '', a.hash); });
  // panel de secciones
  const panel = $('[data-secciones]');
  $('[data-abrir-secciones]').addEventListener('click', () => { abrirHoja(panel); (mosaico.get(marcada) || $('a', panel))?.focus(); });
  panel.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ir]'); if (!a) return;
    e.preventDefault();
    const s = $(a.hash);
    // se baja cuando la hoja ya cerró (con una hoja abierta la página no se mueve)
    panel.addEventListener('close', () => irA(s), { once: true });
    cerrarHoja(panel);
  });

  // ---------- buscador y filtros
  const barra = $('[data-barra]'); const buscador = $('[data-buscador]'); const lupa = $('[data-abrir-buscar]');
  const campo = $('[data-buscar]', buscador); const limpiar = $('[data-limpiar]'); const cuentaEl = $('[data-cuenta]');
  const vacio = $('[data-vacio]'); const vacioTexto = $('[data-vacio-texto]');
  const filtrosOn = new Set();
  // el nombre de cada plato, para resaltar lo que se busca
  const nombres = items.map((li) => { const el = $('.plato__nombre, .destacado__nombre, .fila__nombre', li); const t = el.firstChild; const s = document.createElement('span'); s.textContent = t.textContent; t.replaceWith(s); return [li, s, s.textContent]; });
  const resaltar = (s, txt, palabras) => {
    if (!palabras.length) { s.textContent = txt; return; }
    const n = norm(txt); const marca = new Array(txt.length).fill(false);
    for (const w of palabras) { let i = n.indexOf(w); while (i >= 0) { for (let k = i; k < i + w.length; k++) marca[k] = true; i = n.indexOf(w, i + w.length); } }
    let html = ''; let dentro = false;
    for (let k = 0; k < txt.length; k++) { if (marca[k] !== dentro) { html += marca[k] ? '<mark>' : '</mark>'; dentro = marca[k]; } html += escH(txt[k]); }
    s.innerHTML = html + (dentro ? '</mark>' : '');
  };
  let antes = '';
  const filtrar = (llevar) => {
    const q = norm(campo.value.trim()); const palabras = q.split(/\s+/).filter(Boolean);
    const activo = palabras.length > 0 || filtrosOn.size > 0;
    let hay = 0;
    for (const [li, s, txt] of nombres) {
      const f = li.dataset.f.split(' ');
      const ve = palabras.every((w) => li.dataset.buscar.includes(w)) && [...filtrosOn].every((x) => f.includes(x));
      li.hidden = !ve; if (ve) hay++;
      resaltar(s, txt, palabras);
    }
    for (const g of $$('.grupo')) g.hidden = activo && !$('[data-plato]:not([hidden])', g);
    for (const s of secciones) {
      const ve = !activo || !!$('[data-plato]:not([hidden])', s);
      s.hidden = !ve; enlaces.get(s.id.slice(2))?.parentElement.toggleAttribute('hidden', !ve);
      const pts = $('.carril__puntos', s); if (pts) pts.hidden = activo;
    }
    vacio.hidden = hay > 0;
    vacioTexto.textContent = filtrosOn.size ? vacioTexto.dataset.sinFiltro : vacioTexto.dataset.sin;
    $('[data-quitar-filtros]').hidden = !filtrosOn.size;
    cuentaEl.textContent = activo ? (hay === 1 ? TX.resultado1 : fmt(TX.resultados, hay)) : '';
    limpiar.hidden = !campo.value;
    // al empezar a buscar o al filtrar, la carta sube hasta el primer resultado
    if (llevar && activo) {
      const primero = secciones.find((s) => !s.hidden) || vacio;
      const y = primero.getBoundingClientRect().top + scrollY - barra.offsetHeight - 8;
      if (Math.abs(scrollY - y) > 4) scrollTo({ top: y, behavior: 'auto' });
    }
  };
  const abrirBuscador = (abrir) => {
    buscador.hidden = !abrir; barra.classList.toggle('buscando', abrir); lupa.setAttribute('aria-expanded', String(abrir));
    if (abrir) { const y = inicio.getBoundingClientRect().top + scrollY; if (scrollY < y) scrollTo({ top: y, behavior: REDUCIDO ? 'auto' : 'smooth' }); campo.focus({ preventScroll: true }); }
    else { campo.value = ''; filtrosOn.clear(); $$('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', 'false')); filtrar(false); }
  };
  lupa.addEventListener('click', () => abrirBuscador(buscador.hidden));
  campo.addEventListener('input', () => { const q = campo.value.trim(); filtrar(!!q && q !== antes); antes = q; });
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') campo.blur(); if (e.key === 'Escape') { e.preventDefault(); abrirBuscador(false); lupa.focus(); } });
  limpiar.addEventListener('click', () => { campo.value = ''; antes = ''; filtrar(false); campo.focus(); });
  for (const b of $$('[data-filtro]')) b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on));
    if (on) filtrosOn.add(b.dataset.filtro); else filtrosOn.delete(b.dataset.filtro);
    filtrar(true);
  });
  $('[data-quitar-filtros]').addEventListener('click', () => { filtrosOn.clear(); $$('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', 'false')); filtrar(true); });

  // ---------- Mi pedido: lo anotado se guarda en este teléfono 12 horas
  const CLAVE = 'supermachi-menu:pedido';
  const lee = () => { try { const v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return v && Date.now() - v.t < 12 * 3600e3 ? v : null; } catch { return null; } };
  const guardado = lee();
  let lineas = (guardado?.lineas || []).filter((l) => porId.has(l.id) && l.c > 0);
  const hoja = $('[data-pedido]'); const nota = $('[data-pedido-nota]'); const mesa = $('[data-pedido-mesa]');
  nota.value = guardado?.nota || ''; mesa.value = guardado?.mesa || '';
  const guarda = () => { try { localStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), lineas, nota: nota.value, mesa: mesa.value })); } catch {} };
  const barraPedido = $('[data-pedido-barra]'); const cuenta = $('[data-pedido-cuenta]'); const resumen = $('[data-pedido-resumen]');
  const nombre = (id) => porId.get(id)?.dataset.nombre || '';
  const cant = (id) => lineas.find((x) => x.id === id)?.c || 0;
  // los pasos de un plato (en la carta, la ficha y el pedido) muestran lo mismo
  const pintaPaso = (id) => {
    const n = cant(id);
    for (const p of $$(`[data-paso="${CSS.escape(id)}"]`)) { p.classList.toggle('anotado', n > 0); $('[data-n]', p).textContent = n; $('[data-menos]', p).tabIndex = n > 0 ? 0 : -1; }
    if (ficha.open && ficha.dataset.id === id) $('[data-ficha-anotado]').textContent = n ? fmt(TX.anotado, n) : '';
  };
  const ordenadas = () => [...lineas].sort((a, b) => items.indexOf(porId.get(a.id)) - items.indexOf(porId.get(b.id)));
  const pintaPedido = () => {
    const total = lineas.reduce((a, l) => a + l.c, 0);
    cuenta.textContent = total;
    barraPedido.hidden = total === 0;
    resumen.textContent = lineas.slice(-3).reverse().map((l) => nombre(l.id)).join(' · ');
    $('[data-pedido-vacio]').hidden = total > 0;
    $('[data-pedido-mesero]').disabled = total === 0;
    if (!hoja.open) return;
    // agrupado por sección, en el orden de la carta (como lo lee el mesero)
    const caja = $('[data-pedido-lineas]'); caja.replaceChildren();
    let grupo = null; let ul = null;
    for (const l of ordenadas()) {
      const li0 = porId.get(l.id); const sid = li0.dataset.seccion;
      if (sid !== grupo) { grupo = sid; const g = document.createElement('div'); g.className = 'pedido__grupo'; g.innerHTML = `<h3>${escH(tituloSeccion(sid))}</h3><ul role="list"></ul>`; caja.append(g); ul = $('ul', g); }
      const li = document.createElement('li'); li.className = 'pedido__linea';
      li.innerHTML = li0.dataset.foto ? `<img src="/fotos/${li0.dataset.foto}-640.webp" alt="" width="64" height="64" style="object-position:${li0.dataset.pos}">` : '<span class="pedido__sin" aria-hidden="true"></span>';
      const n = document.createElement('span'); n.className = 'pedido__nombre'; n.textContent = nombre(l.id);
      li.append(n, $('.paso', li0).cloneNode(true)); ul.append(li);
    }
    lineas.forEach((l) => pintaPaso(l.id));
  };
  // el aviso «Anotado: …» con deshacer
  const aviso = $('[data-aviso]'); let avisoT = 0; let ultimo = null;
  const avisar = (txt, deshacer) => {
    ultimo = deshacer; $('[data-aviso-texto]').textContent = txt; aviso.hidden = false;
    aviso.style.animation = 'none'; void aviso.offsetWidth; aviso.style.animation = '';
    clearTimeout(avisoT); avisoT = setTimeout(() => { aviso.hidden = true; ultimo = null; }, 3600);
  };
  $('[data-deshacer]').addEventListener('click', () => { ultimo?.(); aviso.hidden = true; ultimo = null; });
  // el puntito que vuela del plato a la barra
  const vuela = (desde) => {
    if (REDUCIDO || !desde.animate) return;
    const a = desde.getBoundingClientRect(); const b = cuenta.getBoundingClientRect();
    if (!b.width) return;
    const d = document.createElement('span'); d.className = 'vuela'; d.style.left = a.left + a.width / 2 + 'px'; d.style.top = a.top + a.height / 2 + 'px'; document.body.append(d);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2); const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    d.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.45}px,${Math.min(dy * 0.2, -60)}px) scale(1.2)`, offset: 0.45 }, { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: 0.6 }], { duration: 560, easing: 'cubic-bezier(.5,0,.5,1)' }).onfinish = () => {
      d.remove(); barraPedido.classList.remove('late'); void barraPedido.offsetWidth; barraPedido.classList.add('late');
    };
  };
  const cambia = (id, d, origen) => {
    const antes = lineas.map((x) => ({ ...x }));
    const l = lineas.find((x) => x.id === id);
    if (l) l.c = Math.min(99, l.c + d); else if (d > 0) lineas.push({ id, c: 1 });
    lineas = lineas.filter((x) => x.c > 0);
    guarda(); pintaPaso(id); pintaPedido(); vibra();
    for (const p of $$(`[data-paso="${CSS.escape(id)}"]`)) { p.classList.remove('late'); void p.offsetWidth; p.classList.add('late'); }
    const deshacer = () => { lineas = antes; guarda(); pintaPaso(id); pintaPedido(); };
    if (d > 0) { avisar(fmt(TX.seAnoto, nombre(id)), deshacer); if (origen && !hoja.open) requestAnimationFrame(() => vuela(origen)); }
    else if (!cant(id)) avisar(fmt(TX.seQuito, nombre(id)), deshacer);
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mas], [data-menos]'); if (!b) return;
    const p = b.closest('[data-paso]'); if (!p) return;
    e.preventDefault(); e.stopPropagation();
    cambia(p.dataset.paso, b.hasAttribute('data-mas') ? 1 : -1, b);
  });
  $('[data-abrir-pedido]').addEventListener('click', () => { abrirHoja(hoja); pintaPedido(); });
  nota.addEventListener('input', guarda); mesa.addEventListener('input', () => { mesa.value = mesa.value.replace(/[^\dA-Za-z-]/g, ''); guarda(); });
  $('[data-pedido-vaciar]').addEventListener('click', () => {
    const antes = { lineas: lineas.map((x) => ({ ...x })), nota: nota.value };
    const ids = lineas.map((l) => l.id); lineas = []; nota.value = ''; guarda(); ids.forEach(pintaPaso); pintaPedido();
    avisar(TX.lang === 'en' ? 'Order cleared' : 'Pedido vaciado', () => { lineas = antes.lineas; nota.value = antes.nota; guarda(); lineas.forEach((l) => pintaPaso(l.id)); pintaPedido(); });
  });
  // la pantalla para el mesero: letra grande, por secciones, y la pantalla no se apaga mientras se enseña
  const mesero = $('[data-mesero]'); let wake = null;
  $('[data-pedido-mesero]').addEventListener('click', () => {
    if (!lineas.length) return;
    const caja = $('[data-mesero-lista]'); caja.replaceChildren();
    let grupo = null; let ul = null;
    for (const l of ordenadas()) {
      const sid = porId.get(l.id).dataset.seccion;
      if (sid !== grupo) { grupo = sid; const h = document.createElement('h3'); h.textContent = tituloSeccion(sid); ul = document.createElement('ul'); ul.setAttribute('role', 'list'); caja.append(h, ul); }
      const li = document.createElement('li'); li.innerHTML = `<b>${l.c}×</b><span></span>`; $('span', li).textContent = nombre(l.id); ul.append(li);
    }
    $('[data-mesero-mesa]').textContent = mesa.value.trim() ? `${TX.mesa} ${mesa.value.trim()}` : '';
    $('[data-mesero-nota]').textContent = nota.value.trim();
    mesero.showModal(); $('[data-cerrar]', mesero).focus();
    navigator.wakeLock?.request('screen').then((w) => { wake = w; }).catch(() => {});
  });
  mesero.addEventListener('close', () => { wake?.release().catch(() => {}); wake = null; });
  hoja.addEventListener('close', () => $('[data-abrir-pedido]').focus());

  // ---------- la ficha del plato: la foto en grande, todo el texto y el «+»; se pasa al siguiente plato de la sección
  const ficha = $('[data-ficha]'); const media = $('[data-ficha-media]'); const fImg = $('[data-ficha-img]');
  const vecinos = (li) => $$('[data-plato]:not([hidden])', li.closest('.seccion')).filter((x) => x.querySelector('[data-abrir]'));
  const llenar = (li) => {
    const id = li.dataset.plato; ficha.dataset.id = id;
    const conFoto = !!li.dataset.foto;
    media.classList.toggle('sin-foto', !conFoto);
    if (conFoto) {
      fImg.style.objectPosition = li.dataset.pos; fImg.alt = li.dataset.nombre;
      const chica = `/fotos/${li.dataset.foto}-640.webp`; const grande = `/fotos/${li.dataset.foto}-1080.webp`;
      fImg.src = chica; const pre = new Image(); pre.onload = () => { if (ficha.dataset.id === id) fImg.src = grande; }; pre.src = grande;
    } else { fImg.removeAttribute('src'); fImg.alt = ''; }
    $('[data-ficha-ref]').hidden = li.dataset.tipo !== 'referencia';
    $('[data-ficha-seccion]').textContent = tituloSeccion(li.dataset.seccion);
    $('[data-ficha-nombre]').textContent = li.dataset.nombre;
    const det = $('[data-ficha-detalle]'); det.replaceChildren();
    for (const el of $$('.destacado__sello, .plato__desc, .destacado__desc, .plato__variantes, .etiquetas', li)) det.append(el.cloneNode(true));
    if (li.hasAttribute('data-crudo')) { const p = document.createElement('p'); p.className = 'ficha__crudo'; p.textContent = '* ' + $('#aviso-crudo').textContent.replace(/^\*\s*/, ''); det.append(p); }
    const paso = $('.paso', li).cloneNode(true); paso.classList.remove('paso--claro'); $('[data-mas]', paso).dataset.texto = TX.anotarBoton;
    $('[data-ficha-paso]').replaceChildren(paso);
    const vs = vecinos(li); const i = vs.indexOf(li);
    $('[data-ficha-ant]').hidden = i <= 0; $('[data-ficha-sig]').hidden = i < 0 || i >= vs.length - 1;
    pintaPaso(id);
  };
  // la foto del plato crece desde donde estaba (FLIP)
  const crecer = (li) => {
    const de = $('.foto img', li); if (REDUCIDO || !de || !fImg.animate) return;
    const a = de.getBoundingClientRect(); const b = fImg.getBoundingClientRect(); if (!a.width || !b.width) return;
    fImg.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`, borderRadius: '8px' }, { transform: 'none', borderRadius: '0' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    fImg.style.transformOrigin = '0 0';
  };
  const abrirFicha = (li, { empujar = true } = {}) => {
    llenar(li); abrirHoja(ficha); ficha.scrollTop = 0; crecer(li);
    if (empujar) history.pushState({ ficha: li.dataset.plato }, '', `#p-${li.dataset.plato}`);
    $('[data-ficha-paso] [data-mas]').focus({ preventScroll: true });
  };
  const mover = (d) => {
    const li = porId.get(ficha.dataset.id); const vs = vecinos(li); const sig = vs[vs.indexOf(li) + d]; if (!sig) return;
    if (!REDUCIDO && fImg.animate) fImg.animate([{ opacity: 0.2, transform: `translateX(${d * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
    llenar(sig); history.replaceState({ ficha: sig.dataset.plato }, '', `#p-${sig.dataset.plato}`);
    sig.scrollIntoView({ block: 'center', behavior: 'auto' });
  };
  $('[data-ficha-ant]').addEventListener('click', () => mover(-1));
  $('[data-ficha-sig]').addEventListener('click', () => mover(1));
  ficha.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') mover(-1); if (e.key === 'ArrowRight') mover(1); });
  // en la foto: deslizar a los lados cambia de plato, hacia abajo cierra
  let toque = null;
  media.addEventListener('touchstart', (e) => { const t = e.touches[0]; toque = { x: t.clientX, y: t.clientY }; }, { passive: true });
  media.addEventListener('touchend', (e) => {
    if (!toque) return; const t = e.changedTouches[0]; const dx = t.clientX - toque.x; const dy = t.clientY - toque.y; toque = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) mover(dx < 0 ? 1 : -1);
    else if (dy > 70 && Math.abs(dy) > Math.abs(dx)) ficha.dispatchEvent(new Event('pedir-cierre'));
  }, { passive: true });
  // cerrar la ficha también la saca del historial (el botón «atrás» del teléfono la cierra)
  ficha.addEventListener('pedir-cierre', (e) => { if (history.state?.ficha) { e.stopImmediatePropagation(); history.back(); } }, true);
  addEventListener('popstate', (e) => {
    const id = e.state?.ficha;
    if (id && porId.has(id)) { if (!ficha.open) abrirFicha(porId.get(id), { empujar: false }); else llenar(porId.get(id)); }
    else if (ficha.open) cerrarHoja(ficha);
  });
  ficha.addEventListener('close', () => { const li = porId.get(ficha.dataset.id); $('[data-abrir]', li)?.focus({ preventScroll: true }); });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-abrir]'); if (b) abrirFicha(b.closest('[data-plato]')); });
  // un enlace directo a un plato (#p-…) abre su ficha
  const directo = location.hash.match(/^#p-(.+)$/);
  if (directo && porId.has(decodeURIComponent(directo[1]))) {
    const li = porId.get(decodeURIComponent(directo[1]));
    history.replaceState(null, '', location.pathname + location.search);
    li.scrollIntoView({ block: 'center' }); abrirFicha(li);
  }

  lineas.forEach((l) => pintaPaso(l.id)); pintaPedido();

  // ---------- el club: el enlace de Pleamar lleva el origen del escaneo (QR de mesa, póster…); el otro idioma lo conserva
  let src = new URLSearchParams(location.search).get('src');
  try { if (src) sessionStorage.setItem('supermachi-menu:src', src); else src = sessionStorage.getItem('supermachi-menu:src'); } catch {}
  for (const a of $$('[data-club]')) { const u = new URL(a.href); if (src) u.searchParams.set('utm_source', src); u.searchParams.set('utm_medium', 'menu-digital'); a.href = u.toString(); }
  if (src) for (const a of $$('.cabecera__idioma')) { const u = new URL(a.href, location.href); u.searchParams.set('src', src); a.href = u.pathname + u.search; }
})();
