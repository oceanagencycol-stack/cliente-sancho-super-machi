// Común a las dos webs. Todo es mejora: sin JS, los enlaces llevan a WhatsApp, al teléfono y al mapa, y el menú se ve entero.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LANG = document.documentElement.lang === 'en' ? 'en' : 'es';
const SITIO = document.documentElement.dataset.sitio;
const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- la hora de Miami
function ahoraMiami() {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())) p[x.type] = x.value;
  return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: (Number(p.hour) % 24) * 60 + Number(p.minute), iso: `${p.year}-${p.month}-${p.day}` };
}
function hora(min) {
  min = ((min % 1440) + 1440) % 1440;
  const hh = Math.floor(min / 60); const mm = min % 60;
  if (min === 0) return LANG === 'en' ? 'midnight' : 'medianoche';
  if (min === 720) return LANG === 'en' ? 'noon' : 'mediodía';
  const h12 = hh % 12 || 12; const m = mm ? ':' + String(mm).padStart(2, '0') : '';
  return LANG === 'en' ? `${h12}${m} ${hh >= 12 ? 'p.m.' : 'a.m.'}` : `${h12}${m} ${hh >= 12 ? 'p. m.' : 'a. m.'}`;
}
// «a las 10 p. m.», «a la 1 a. m.», «a medianoche» / «at 10 p.m.», «at midnight»
function aLas(min) {
  min = ((min % 1440) + 1440) % 1440;
  if (LANG === 'en') return 'at ' + hora(min);
  if (min === 0 || min === 720) return 'a ' + hora(min);
  return (Math.floor(min / 60) % 12 === 1 ? 'a la ' : 'a las ') + hora(min);
}
const aMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const DIAS = { es: ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };

// ---------- abierto ahora
for (const el of $$('[data-abierto]')) {
  let franjas; try { franjas = JSON.parse(el.dataset.abierto); } catch { continue; }
  const pintar = () => {
    const { dow, min } = ahoraMiami();
    // tramos de la semana en minutos desde el domingo 0:00 (los que pasan de medianoche siguen al día siguiente)
    const tramos = [];
    for (const f of franjas) for (const d of f.dias) {
      const a = d * 1440 + aMin(f.abre); let c = d * 1440 + aMin(f.cierra); if (c <= a) c += 1440;
      tramos.push([a, c], [a - 10080, c - 10080], [a + 10080, c + 10080]);
    }
    const ahora = dow * 1440 + min;
    const abierto = tramos.find(([a, c]) => ahora >= a && ahora < c);
    if (abierto) {
      el.textContent = `${LANG === 'en' ? 'Open now' : 'Abierto ahora'} · ${LANG === 'en' ? 'closes' : 'cierra'} ${aLas(abierto[1])}`;
      el.className = 'horario__vivo es-abierto';
    } else {
      const sig = tramos.filter(([a]) => a > ahora).sort((x, y) => x[0] - y[0])[0];
      if (!sig) return;
      const diaSig = Math.floor(((sig[0] % 10080) + 10080) % 10080 / 1440);
      const cuando = diaSig === dow && sig[0] - ahora < 1440 ? (LANG === 'en' ? 'today' : 'hoy') : (diaSig === (dow + 1) % 7 ? (LANG === 'en' ? 'tomorrow' : 'mañana') : DIAS[LANG][diaSig]);
      el.textContent = `${LANG === 'en' ? 'Closed' : 'Cerrado'} · ${LANG === 'en' ? 'opens' : 'abre'} ${cuando} ${aLas(sig[0])}`;
      el.className = 'horario__vivo';
    }
    el.hidden = false;
  };
  pintar(); setInterval(pintar, 60000);
}

// ---------- videos de comida: el póster ya está pintado; el video se pide cuando se va a ver (después del load, para no
// pelear con la página), corre solo en pantalla y con la pestaña visible, y nunca con movimiento reducido ni ahorro de datos
const AHORRO = !!(navigator.connection && navigator.connection.saveData);
const TELEFONO = matchMedia('(max-width: 47.99rem)');
const videos = $$('[data-video]');
// MP4 (H.264) donde se puede; si no, WebM (VP9)
const FORMATO = document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"') ? '.mp4' : '.webm';
function armarVideo(caja) {
  const v = $('video', caja); const boton = $('[data-video-pausa]', caja);
  if (!v || REDUCIDO || AHORRO) { caja.classList.add('quieto'); return; }
  let visible = false;
  const cargar = () => { if (v.getAttribute('src')) return; v.src = (TELEFONO.matches ? v.dataset.telefono : v.dataset.escritorio) + FORMATO; };
  const correr = () => { if (!visible || caja.classList.contains('pausado') || document.hidden || caja.offsetParent === null) return; cargar(); v.play().catch(() => {}); };
  v.addEventListener('playing', () => caja.classList.add('rodando'));
  boton?.addEventListener('click', () => {
    const pausar = !caja.classList.contains('pausado');
    caja.classList.toggle('pausado', pausar); boton.setAttribute('aria-pressed', String(pausar));
    boton.setAttribute('aria-label', pausar ? boton.dataset.play : boton.dataset.pausa);
    if (pausar) v.pause(); else correr();
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) correr(); else v.pause(); }, { rootMargin: '150px 0px' }).observe(caja);
  document.addEventListener('visibilitychange', () => (document.hidden ? v.pause() : correr()));
  caja.correr = correr;  // el sol de Sancho lo llama al mostrar el lunes
}
if (videos.length && 'IntersectionObserver' in window) {
  const arrancar = () => videos.forEach(armarVideo);
  if (document.readyState === 'complete') arrancar(); else addEventListener('load', arrancar, { once: true });
}

// ---------- las fotos diferidas entran con un fundido al llegar (las que ya están, quietas)
for (const img of $$('img[loading="lazy"]')) {
  if (img.complete) continue;
  img.classList.add('espera');
  const listo = () => { img.classList.add('llega'); img.classList.remove('espera'); };
  img.addEventListener('load', listo, { once: true }); img.addEventListener('error', listo, { once: true });
}

// ---------- listas que se destapan en orden al llegar (los platos de la casa); sin IntersectionObserver, a la vista
const destapar = $$('[data-destapa] > li');
if (destapar.length && !REDUCIDO && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.remove('revela'); io.unobserve(e.target); } }, { rootMargin: '0px 0px -12% 0px' });
  for (const li of destapar) { const r = li.getBoundingClientRect(); if (r.top > innerHeight * 0.92) { li.classList.add('revela'); io.observe(li); } }
}

// ---------- cintas en movimiento: quietas fuera de pantalla
for (const c of $$('.cinta')) {
  if (!('IntersectionObserver' in window)) break;
  new IntersectionObserver(([e]) => c.classList.toggle('quieta', !e.isIntersecting)).observe(c);
}

// ---------- menú del teléfono
const abrir = $('[data-nav-abrir]');
const movil = $('#menu-movil');
if (abrir && movil) {
  const cerrar = () => { movil.hidden = true; abrir.setAttribute('aria-expanded', 'false'); document.body.classList.remove('nav-abierta'); };
  abrir.addEventListener('click', () => {
    const ya = abrir.getAttribute('aria-expanded') === 'true';
    if (ya) return cerrar();
    movil.hidden = false; abrir.setAttribute('aria-expanded', 'true'); document.body.classList.add('nav-abierta');
    movil.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !movil.hidden) { cerrar(); abrir.focus(); } });
  movil.addEventListener('click', (e) => { if (e.target.closest('a')) cerrar(); });
}

// ---------- eventos para la analítica (si algún día se instala; hoy no hay rastreadores)
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-ev]');
  if (!a || !window.dataLayer) return;
  window.dataLayer.push({ event: a.dataset.ev, plataforma: a.dataset.plataforma, pagina: location.pathname });
});

// ---------- compartir
for (const b of $$('[data-compartir]')) {
  b.addEventListener('click', async () => {
    const datos = { title: document.title, url: location.href };
    try {
      if (navigator.share) return await navigator.share(datos);
      await navigator.clipboard.writeText(location.href);
      aviso(LANG === 'en' ? 'Link copied' : 'Enlace copiado');
    } catch { /* el usuario canceló */ }
  });
}
function aviso(texto) {
  let el = $('.aviso-flotante');
  if (!el) { el = document.createElement('p'); el.className = 'aviso-flotante'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = texto; el.classList.add('visible');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('visible'), 2200);
}

// ---------- menú: buscador
const menuEl = $('[data-menu]');
if (menuEl) {
  const input = $('[data-buscar-input]', menuEl);
  const vacio = $('[data-sin-resultados]', menuEl);
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const platos = $$('.plato', menuEl).map((el) => ({ el, txt: norm(el.dataset.buscar || el.textContent) }));
  let t;
  input?.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = norm(input.value.trim());
      let n = 0;
      for (const p of platos) { const ok = !q || p.txt.includes(q); p.el.hidden = !ok; if (ok) n++; }
      for (const g of $$('.menu__grupo, .menu__seccion, .menu__carta', menuEl)) g.hidden = !!q && !g.querySelector('.plato:not([hidden])');
      vacio.hidden = n > 0;
    }, 90);
  });
}

// ---------- mi comanda (la lista que se le enseña al mesero; se guarda solo en este teléfono)
const comandaEl = $('[data-comanda]');
if (comandaEl && menuEl) {
  const CLAVE = `comanda:${SITIO}`;
  const i18n = JSON.parse($('[data-comanda-i18n]', comandaEl).innerHTML);
  let lineas = [];
  try { lineas = JSON.parse(localStorage.getItem(CLAVE) || '[]').filter((l) => l && l.id && l.c > 0); } catch { lineas = []; }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(lineas)); } catch { /* sin almacenamiento: la lista vive mientras la página */ } };
  const hoja = $('#comanda-hoja', comandaEl);
  const boton = $('[data-comanda-abrir]', comandaEl);
  const pantalla = $('[data-comanda-pantalla]', comandaEl);
  const precio = (p) => '$' + (Number.isInteger(p) ? p : p.toFixed(2));
  const pintar = () => {
    const n = lineas.reduce((s, l) => s + l.c, 0);
    $('[data-comanda-cuenta]', comandaEl).textContent = n;
    comandaEl.hidden = n === 0 && hoja.hidden;
    $('[data-comanda-vacia]', comandaEl).hidden = n > 0;
    const ul = $('[data-comanda-lineas]', comandaEl); ul.replaceChildren();
    for (const l of lineas) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="comanda__cant cifra"></span><span class="comanda__nombre"></span><span class="comanda__precio cifra"></span><span class="comanda__botones"><button type="button" data-menos>−</button><button type="button" data-mas>+</button></span>';
      li.querySelector('.comanda__cant').textContent = l.c + '×';
      li.querySelector('.comanda__nombre').textContent = l.n;
      li.querySelector('.comanda__precio').textContent = l.p != null ? precio(l.p * l.c) : '';
      li.querySelector('[data-menos]').setAttribute('aria-label', `${i18n.quitar}: ${l.n}`);
      li.querySelector('[data-mas]').setAttribute('aria-label', `${i18n.anadir}: ${l.n}`);
      li.querySelector('[data-menos]').addEventListener('click', () => { l.c--; lineas = lineas.filter((x) => x.c > 0); guardar(); pintar(); });
      li.querySelector('[data-mas]').addEventListener('click', () => { l.c = Math.min(l.c + 1, 30); guardar(); pintar(); });
      ul.append(li);
    }
    const total = lineas.reduce((s, l) => s + (l.p != null ? l.p * l.c : 0), 0);
    $('[data-comanda-total]', comandaEl).textContent = precio(Math.round(total * 100) / 100);
    for (const b of $$('[data-anadir]', menuEl)) {
      const d = JSON.parse(b.dataset.anadir); const l = lineas.find((x) => x.id === d.id);
      b.textContent = l ? String(l.c) : '+'; b.classList.toggle('en-comanda', !!l);
    }
  };
  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-anadir]'); if (!b) return;
    const d = JSON.parse(b.dataset.anadir);
    const l = lineas.find((x) => x.id === d.id);
    if (l) l.c = Math.min(l.c + 1, 30); else if (lineas.length < 60) lineas.push({ id: d.id, n: d.n, p: d.p, c: 1 });
    guardar(); pintar();
    if (!REDUCIDO) { boton.classList.remove('late'); void boton.offsetWidth; boton.classList.add('late'); }
  });
  const abrirHoja = () => { hoja.hidden = false; boton.setAttribute('aria-expanded', 'true'); document.body.classList.add('hoja-abierta'); $('[data-comanda-cerrar]', comandaEl).focus(); };
  const cerrarHoja = () => { hoja.hidden = true; boton.setAttribute('aria-expanded', 'false'); document.body.classList.remove('hoja-abierta'); pintar(); boton.focus(); };
  boton.addEventListener('click', () => (hoja.hidden ? abrirHoja() : cerrarHoja()));
  $('[data-comanda-cerrar]', comandaEl).addEventListener('click', cerrarHoja);
  $('[data-comanda-vaciar]', comandaEl).addEventListener('click', () => { lineas = []; guardar(); pintar(); });
  $('[data-comanda-mesero]', comandaEl).addEventListener('click', () => {
    if (!lineas.length) return;
    const ul = $('[data-comanda-mesero-lista]', pantalla); ul.replaceChildren();
    for (const l of lineas) { const li = document.createElement('li'); li.innerHTML = '<b class="cifra"></b> <span></span>'; li.querySelector('b').textContent = l.c; li.querySelector('span').textContent = l.n; ul.append(li); }
    pantalla.hidden = false; $('[data-comanda-volver]', pantalla).focus();
  });
  $('[data-comanda-volver]', pantalla).addEventListener('click', () => { pantalla.hidden = true; $('[data-comanda-mesero]', comandaEl).focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!pantalla.hidden) { pantalla.hidden = true; return; }
    if (!hoja.hidden) cerrarHoja();
  });
  pintar();
}
