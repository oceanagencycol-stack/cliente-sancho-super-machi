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
