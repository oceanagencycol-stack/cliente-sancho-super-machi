// Sancho Restaurant — cocina española de calidad al mejor precio. Firma: el sol de la semana (ver DESIGN.md).
import { h, raw, t, cuando, precio } from '../lib/util.mjs';
import { UI, DIAS, INICIAL, hora, rangoDias, telVisible } from '../lib/i18n.mjs';
import { foto, precarga, horario, direccion, telefono, redes, pedidos, tel, video, icono, cabezaPlato } from '../lib/comp.mjs';
import { pagina, idioma, nav } from '../lib/shell.mjs';

const R = {
  inicio: { es: '/', en: '/en/' },
  semana: { es: '/promos/', en: '/en/deals/' },
  menu: { es: '/menu/', en: '/en/menu/' },
  pedir: { es: '/pedir/', en: '/en/order/' },
  club: { es: '/club/', en: '/en/club/' },
  visita: { es: '/visita/', en: '/en/visit/' },
  privacidad: { es: '/privacidad/', en: '/en/privacy/' },
};
const otro = (lang) => (lang === 'es' ? 'en' : 'es');

// lo que dice el disco rojo del sol, día por día (grande + chico)
const DISCO = {
  1: { es: ['$12.99', 'paella'], en: ['$12.99', 'paella'] },
  2: { es: ['Gratis', 'con $20'], en: ['Free', 'with $20'] },
  3: { es: ['$30', 'sin límite'], en: ['$30', 'bottomless'] },
  4: { es: ['Tapas', 'jueves'], en: ['Tapas', 'Thursday'] },
  5: { es: ['Brasa', 'la carta'], en: ['Grill', 'full menu'] },
  6: { es: ['Cochinillo', 'la carta'], en: ['Suckling pig', 'full menu'] },
  0: { es: ['Familia', 'la carta'], en: ['Family', 'full menu'] },
};
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

// el plato de cada día, a pantalla completa detrás del sol (el lunes, la paella en video). Solo se baja el del día que
// se ve; los demás llegan cuando la página ya está quieta (sancho.js) o al tocar su día.
const FONDO = { 1: { video: 'paella' }, 2: 'sangria', 3: 'tapas', 4: 'calamares', 5: 'carne', 6: 'cochinillo', 0: 'paella' };

export const sitio = {
  id: 'sancho',
  nombre: 'Sancho Restaurant',
  nombreCorto: 'Sancho',
  tema: '#0F0B0A',
  esquema: 'light',
  fuentes: ['sancho-display', 'sancho-text', 'sancho-mano'],
  tituloPortada: { es: 'Sancho Restaurant · Cocina española en la Calle Ocho, Miami', en: 'Sancho Restaurant · Spanish cooking on Calle Ocho, Miami' },
  cabecera, pie, acciones,
};

function cabecera(ctx, { ruta, alterna }) {
  const { lang } = ctx; const ui = UI[lang];
  const items = [[R.semana[lang], lang === 'en' ? 'The week' : 'La semana'], [R.menu[lang], ui.menu], [R.pedir[lang], ui.pedir],
    [R.club[lang], 'Club'], [R.visita[lang], lang === 'en' ? 'Visit' : 'Visítanos']];
  return h`<header class="cabecera">
  <a class="cabecera__marca" href="${R.inicio[lang]}" aria-label="Sancho · ${lang === 'en' ? 'home' : 'inicio'}"><img src="/marca/sancho-linea.svg" width="190" height="51" alt="Sancho"></a>
  <nav class="cabecera__nav" aria-label="${lang === 'en' ? 'Main' : 'Principal'}">${nav(ctx, items, ruta, 'cabecera__lista')}</nav>
  <div class="cabecera__fin">
    ${idioma(ctx, alterna || R.inicio[otro(lang)])}
    <a class="boton boton--cabecera" href="${R.pedir[lang]}">${lang === 'en' ? 'Order online' : 'Pedir en línea'}</a>
    <button class="cabecera__abrir" type="button" aria-expanded="false" aria-controls="menu-movil" data-nav-abrir><span>${ui.menu}</span></button>
  </div>
  <div class="cabecera__movil" id="menu-movil" hidden>${nav(ctx, items, ruta, 'cabecera__movil-lista')}</div>
</header>`;
}

function pie(ctx, { alterna }) {
  const { lang, local } = ctx; const ui = UI[lang];
  return h`<footer class="pie">
  <div class="pie__marca"><img src="/marca/sancho-logo.svg" width="180" height="162" alt="Sancho Restaurant · Fine Spanish Cuisine and Tapas" loading="lazy">
    <p>${lang === 'en' ? 'A corner of Spain on Calle Ocho.' : 'Un rincón de España en la Calle Ocho.'}</p></div>
  <div><h2 class="pie__titulo">${ui.direccion}</h2>${direccion(ctx)}<p><a href="${local.mapa}" rel="noopener" data-ev="click_directions">${ui.comoLlegar} →</a></p></div>
  <div><h2 class="pie__titulo">${ui.horario}</h2>${horario(ctx)}</div>
  <div><h2 class="pie__titulo">${ui.telefono}</h2><p>${telefono(ctx)}</p><h2 class="pie__titulo">${ui.redes}</h2>${redes(ctx)}</div>
  <div class="pie__base">
    <p>© ${new Date().getFullYear()} Sancho Restaurant · 13202 SW 8th St, Miami, FL 33184</p>
    <p><a href="${R.privacidad[lang]}">${ui.privacidad}</a> · <a href="${alterna}" hreflang="${otro(lang)}">${ui.idioma}</a></p>
  </div>
</footer>`;
}

function acciones(ctx) {
  const { lang, local } = ctx; const ui = UI[lang];
  return h`<nav class="acciones" aria-label="${lang === 'en' ? 'Quick actions' : 'Acciones rápidas'}">
  <a href="${R.pedir[lang]}" class="acciones__principal">${ui.pedir}</a>
  <a href="${tel(local.telefono)}" data-ev="click_call">${ui.llamar}</a>
  <a href="${local.mapa}" rel="noopener" data-ev="click_directions">${lang === 'en' ? 'Map' : 'Mapa'}</a>
  <a href="${R.menu[lang]}">${ui.menu}</a>
</nav>`;
}

// ---------------------------------------------------------------- la firma: el sol de la semana
function sol(ctx) {
  const { lang } = ctx; const sem = ctx.promos.semana; const hh = ctx.promos.happy_hour; const en = lang === 'en';
  const porDia = Object.fromEntries(sem.map((p) => [p.dia, p]));
  const fondo = (d) => {
    const f = FONDO[d];
    if (typeof f === 'object') return video(ctx, f.video, { cls: 'dia__video', alta: true, alt: en ? 'Seafood paella, up close' : 'Paella de mariscos, de cerca' });
    return foto(ctx, f, { sizes: '(min-width: 62rem) 64vw, 100vw', cls: 'dia__foto', alta: true });
  };
  return h`<section class="dia" data-sol aria-labelledby="sol-t">
    <div class="dia__fondos">${ORDEN.map((d) => h`<div class="dia__fondo" data-dia="${d}">${fondo(d)}</div>`)}</div>
    <div class="sol">
      <div class="sol__rueda">
        <span class="sol__halo" aria-hidden="true"></span>
        <img class="sol__arte" src="/marca/sancho-sol.svg" alt="" width="1471" height="1303">
        <div class="sol__disco" aria-hidden="true">${ORDEN.map((d) => { const g = DISCO[d][lang][0]; return h`<p class="sol__cara" data-dia="${d}"><b class="${g.length >= 9 ? 'muy-largo' : g.length >= 7 ? 'largo' : ''}">${g}</b><span>${DISCO[d][lang][1]}</span></p>`; })}</div>
        <div class="sol__dias" role="tablist" aria-label="${en ? 'Day of the week' : 'Día de la semana'}">
          ${ORDEN.map((d, i) => h`<button type="button" role="tab" class="sol__dia sol__dia--${i}" data-dia="${d}" id="tab-${d}" aria-controls="panel-${d}" aria-label="${DIAS[lang][d]}" aria-selected="false" tabindex="-1">${INICIAL[lang][d]}</button>`)}
        </div>
      </div>
      <div class="sol__paneles">
        <h1 class="sr" id="sol-t">${en ? 'Sancho Restaurant: what’s on today' : 'Sancho Restaurant: lo que hay hoy'}</h1>
        ${ORDEN.map((d) => { const p = porDia[d]; const x = t(p, lang); return h`<div class="sol__panel" role="tabpanel" id="panel-${d}" aria-labelledby="tab-${d}" data-dia="${d}">
          <h2 class="sol__titulo">${x.titulo}</h2>
          <p class="sol__precio cifra">${x.precio_txt}<span class="sol__mano sol__mano--hoy" aria-hidden="true">${en ? 'today!' : '¡hoy!'}</span><span class="sol__mano sol__mano--dia" aria-hidden="true">${x.dia.toLowerCase()}</span></p>
          <p class="sol__texto">${x.texto}</p>
          ${cuando(hh.dias.includes(d), () => h`<p class="sol__hh">${t(hh, lang).titulo} · ${hora(hh.desde, lang)} – ${hora(hh.hasta, lang)}</p>`)}
        </div>`; })}
        <p class="sol__acciones"><a class="boton boton--grande" href="${R.pedir[lang]}">${en ? 'Order online' : 'Pedir en línea'}</a> <a class="boton boton--sutil boton--grande" href="${tel(ctx.local.telefono)}" data-ev="click_call">${en ? 'Call to reserve' : 'Llamar para reservar'}</a></p>
      </div>
    </div>
  </section>`;
}

// el plato de cada día para el script de arranque (shell.mjs → ARRANQUE): pide primero el de hoy, que es el LCP
function precargaHoy(ctx) {
  const mapa = {};
  for (const d of ORDEN) {
    const f = FONDO[d];
    if (typeof f === 'object') {
      const base = `/media/sancho/video/${f.video}`;
      mapa[d] = [[`${base}-telefono.avif`, '', '(max-width: 47.99rem)'], [`${base}-escritorio.avif`, '', '(min-width: 48rem)']];
    } else {
      const m = ctx.media.fotos[f];
      mapa[d] = [[m.anchos.map((w) => `/media/sancho/${f}-${w}.avif ${w}w`).join(', '), '(min-width: 62rem) 64vw, 100vw', '']];
    }
  }
  return h`<script id="precarga-hoy" type="application/json">${raw(JSON.stringify(mapa))}</script>`;
}

// la semana: en la portada, un carril de fotos para deslizar; en «La semana», la cuadrícula. El precio en cifra va en
// un sello con la forma del sol (disco rojo, anillo amarillo); el día, escrito a mano sobre la foto.
function semanaLista(ctx, { fotos = false, nivel = 3, riel = false } = {}) {
  const { lang } = ctx; const en = lang === 'en';
  const porDia = Object.fromEntries(ctx.promos.semana.map((p) => [p.dia, p]));
  const cifra = (txt) => /^\$\d/.test(txt);
  return h`<ol class="semana${fotos ? ' semana--fotos' : ''}${riel ? ' semana--riel' : ''}">${ORDEN.map((d, i) => { const p = porDia[d]; const x = t(p, lang); const conFoto = fotos && p.foto && ctx.media.fotos[p.foto]; return h`<li class="semana__dia${[1, 2, 3, 4].includes(d) ? ' semana__dia--promo' : ''}" data-dia="${d}">
      ${cuando(conFoto, () => h`<div class="semana__marco">${foto(ctx, p.foto, { sizes: riel ? '(min-width: 62rem) 26vw, 72vw' : '(min-width: 900px) 30vw, 100vw', cls: 'semana__foto', eager: !riel && i === 0 })}
        <span class="semana__mano" aria-hidden="true"><span class="semana__mano-dia">${x.dia.toLowerCase()}</span><span class="semana__mano-hoy">${en ? 'today!' : '¡hoy!'}</span></span>
        ${cuando(cifra(x.precio_txt), () => h`<span class="sello-sol cifra" aria-hidden="true">${x.precio_txt}</span>`)}</div>`)}
      <p class="semana__nombre">${x.dia}</p>${raw(`<h${nivel} class="semana__titulo">`)}${x.titulo}${raw(`</h${nivel}>`)}<p class="semana__precio cifra${cifra(x.precio_txt) ? '' : ' semana__precio--texto'}">${x.precio_txt}</p>
      <p class="semana__texto">${x.texto}</p>
      ${cuando(fotos && p.por_confirmar, () => h`<p class="semana__nota">${en ? 'To be confirmed with the restaurant.' : 'Por confirmar con el restaurante.'}</p>`)}
    </li>`; })}</ol>`;
}

function almuerzo(ctx, { titulo = 'h2', eager = false } = {}) {
  const { lang } = ctx; const a = ctx.promos.almuerzo; const e = ctx.promos.ejecutivo;
  return h`<section class="almuerzo" id="almuerzo" aria-labelledby="alm-t">
    ${foto(ctx, 'almuerzo', { sizes: '(min-width: 900px) 40vw, 100vw', cls: 'almuerzo__foto', eager })}
    <div class="almuerzo__lunch">
      ${raw(`<${titulo} class="titulo-2" id="alm-t">`)}${t(a, lang).titulo}${raw(`</${titulo}>`)}
      <p class="almuerzo__desde">${lang === 'en' ? 'from' : 'desde'} <span class="cifra">${precio(a.desde)}</span></p>
      <ul class="lista-precios">${a.platos.map((p) => h`<li><span>${p.n}${cuando(lang === 'en', () => h` <small>${p.en}</small>`)}</span><span class="cifra">${precio(p.p)}</span></li>`)}</ul>
    </div>
    <div class="almuerzo__ejecutivo">
      <h3 class="titulo-3">${t(e, lang).titulo}</h3>
      <p class="almuerzo__ejecutivo-precio cifra">${precio(e.precio)}</p>
      <ul>${t(e, lang).incluye.map((x) => h`<li>${x}</li>`)}</ul>
      <p class="semana__nota">${lang === 'en' ? 'Days and hours to be confirmed with the restaurant.' : 'Días y horas por confirmar con el restaurante.'}</p>
    </div>
  </section>`;
}

function especialidades(ctx) {
  const { lang } = ctx; const en = lang === 'en';
  const conFoto = ctx.local.especialidades.filter((e) => e.foto);
  return h`<section class="cocina" aria-labelledby="cocina-t">
    <div class="cocina__cabeza"><h2 class="titulo-2" id="cocina-t">${en ? 'From Sancho’s kitchen' : 'De la cocina de Sancho'}</h2>
      <p>${en ? 'Paella, Galician octopus, tapas, the famous Segovia-style suckling pig and meats off the grill.' : 'Paella, pulpo a la gallega, tapas, el famoso cochinillo segoviano y las carnes asadas.'}</p></div>
    <ul class="cocina__lista" role="list" data-destapa>${conFoto.map((e, i) => h`<li class="bocado bocado--${i + 1}">
      ${foto(ctx, e.foto, { sizes: i === 0 ? '(min-width: 62rem) 50vw, 100vw' : '(min-width: 62rem) 25vw, 50vw', cls: 'bocado__foto' })}
      <h3 class="bocado__nombre">${t(e, lang)}</h3>
      ${cuando(e.nota, () => h`<span class="bocado__nota" aria-hidden="true">${t(e.nota, lang)}<svg class="bocado__flecha" viewBox="0 0 60 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M56 6C40 4 18 10 8 30"/><path d="M5 20l3 11 10-5"/></svg></span>`)}
    </li>`)}</ul>
  </section>`;
}

// con fuego de verdad: la cocina en video a todo lo ancho
function fuego(ctx) {
  const { lang } = ctx; const en = lang === 'en';
  return h`<section class="fuego" aria-labelledby="fuego-t">
    ${video(ctx, 'fuego', { cls: 'fuego__video', alt: en ? 'Shrimp flambéed in the pan and served sizzling' : 'Camarones flameados en el sartén y servidos chisporroteando' })}
    <div class="fuego__texto">
      <h2 class="fuego__titulo" id="fuego-t">${en ? h`Cooked over a <span>real flame</span>` : h`Con fuego <span>de verdad</span>`}</h2>
      <p>${en ? 'From the pan, through the flame, to your table.' : 'Del sartén a la llama, y de ahí a tu mesa.'}</p>
      <p><a class="boton boton--grande boton--flecha" href="${R.pedir[lang]}">${en ? 'Order online' : 'Pedir en línea'}${icono('flecha')}</a></p>
    </div>
  </section>`;
}

function visita(ctx) {
  const { lang, local } = ctx; const ui = UI[lang];
  return h`<section class="visita" aria-labelledby="visita-t">
    ${foto(ctx, 'salon', { sizes: '(min-width: 900px) 50vw, 100vw', cls: 'visita__foto' })}
    <div class="visita__datos">
      <h2 class="titulo-2" id="visita-t">${lang === 'en' ? 'On Calle Ocho' : 'En la Calle Ocho'}</h2>
      ${direccion(ctx)}
      ${horario(ctx)}
      <p class="visita__acciones"><a class="boton" href="${local.mapa}" rel="noopener" data-ev="click_directions">${ui.comoLlegar}</a> <a class="boton boton--sutil" href="${tel(local.telefono)}" data-ev="click_call">${ui.llamar} ${telVisible(local.telefono)}</a></p>
    </div>
  </section>`;
}

export function paginas(ctx0) {
  const out = [];
  for (const lang of ['es', 'en']) {
    const ctx = { ...ctx0, lang };
    const ui = UI[lang];

    // ---- inicio
    {
      // la comida primero: el plato del día a pantalla completa (el sol lo elige), la cocina, el fuego y la semana en fotos
      const cuerpo = h`${sol(ctx)}
        ${especialidades(ctx)}
        ${fuego(ctx)}
        <section class="semana-bloque" aria-labelledby="sem-t">
          <div class="semana-bloque__cabeza"><h2 class="titulo-2" id="sem-t">${lang === 'en' ? 'Sancho’s week' : 'La semana de Sancho'}</h2>
          <p>${lang === 'en' ? 'A fixed week you can learn by heart, and happy hour Monday to Friday from 4 to 7.' : 'Una semana fija para aprendérsela de memoria, y happy hour de lunes a viernes de 4 a 7.'}</p>
          <p><a class="enlace-flecha" href="${R.semana[lang]}">${lang === 'en' ? 'The whole week' : 'Toda la semana'}${icono('flecha')}</a></p></div>
          ${semanaLista(ctx, { fotos: true, riel: true })}
        </section>
        ${almuerzo(ctx)}
        <section class="musica" aria-labelledby="mus-t">
          ${foto(ctx, 'noche', { sizes: '(min-width: 900px) 50vw, 100vw', cls: 'musica__foto' })}
          <div><h2 class="titulo-2" id="mus-t">${t(ctx.local.musica, lang)}</h2>
          <p>${lang === 'en' ? 'Some nights the room fills with music. Ask us which ones when you book.' : 'Hay noches en que el salón se llena de música. Pregúntanos cuáles al reservar.'}</p></div>
        </section>
        ${visita(ctx)}
        <section class="club-teaser" aria-labelledby="club-t"><h2 class="titulo-2" id="club-t">${lang === 'en' ? 'Every visit counts' : 'Cada visita cuenta'}</h2>
          <p>${lang === 'en' ? 'The Sancho club is coming: a stamp per visit, a dish on the house when you fill the card, and dessert on your birthday.' : 'Viene el club de Sancho: un sello por visita, un plato de la casa al completar la tarjeta y postre en tu cumpleaños.'}</p>
          <a class="boton" href="${R.club[lang]}">${lang === 'en' ? 'About the club' : 'Así será el club'}</a></section>`;
      out.push({ ruta: R.inicio[lang], html: pagina(ctx, { ruta: R.inicio[lang], alterna: R.inicio[otro(lang)], titulo: '', descripcion: lang === 'en' ? 'Spanish restaurant on Calle Ocho, Miami: Paella Monday at $12.99, wine Tuesday, bottomless tapas Wednesday, happy hour Monday to Friday, lunch specials from $10.99.' : 'Restaurante español en la Calle Ocho, Miami: lunes de paella a $12.99, martes de vino, miércoles de tapas ilimitadas, happy hour de lunes a viernes y almuerzo desde $10.99.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-inicio', precargas: h`<link rel="preload" href="/marca/sancho-sol.svg" as="image">${precargaHoy(ctx)}` }) });
    }

    // ---- la semana
    {
      const hh = ctx.promos.happy_hour;
      const cuerpo = h`${cabezaPlato(ctx, { titulo: lang === 'en' ? 'Sancho’s week' : 'La semana de Sancho', entrada: lang === 'en' ? 'Every day has its plate and its price.' : 'Cada día tiene su plato y su precio.', foto: 'jamon' })}
        ${semanaLista(ctx, { fotos: true, nivel: 2 })}
        <section class="hh" aria-labelledby="hh-t">${foto(ctx, 'sangria', { sizes: '(min-width: 900px) 30vw, 60vw', cls: 'hh__foto' })}
          <div><h2 class="titulo-2" id="hh-t">${t(hh, lang).titulo}</h2><p class="hh__cuando">${rangoDias(hh.dias, lang)} · ${hora(hh.desde, lang)} – ${hora(hh.hasta, lang)}</p>
          <p class="semana__nota">${lang === 'en' ? 'Ask what’s included.' : 'Pregunta qué incluye.'}</p></div></section>
        ${almuerzo(ctx)}`;
      out.push({ ruta: R.semana[lang], html: pagina(ctx, { ruta: R.semana[lang], alterna: R.semana[otro(lang)], titulo: lang === 'en' ? 'The week' : 'La semana', descripcion: lang === 'en' ? 'Sancho’s weekly deals on Calle Ocho: Paella Monday, wine Tuesday, bottomless tapas Wednesday, tapas Thursday, happy hour and lunch specials.' : 'Las promos de la semana en Sancho, Calle Ocho: lunes de paella, martes de vino, miércoles de tapas ilimitadas, jueves de tapas, happy hour y almuerzo.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-semana' }) });
    }

    // ---- menú
    {
      const cuerpo = h`${cabezaPlato(ctx, { titulo: lang === 'en' ? 'Menu' : 'Menú', entrada: lang === 'en' ? 'What’s on every day, and the full menu online.' : 'Lo que hay cada día, y la carta completa en línea.', foto: 'bistec' })}
        ${almuerzo(ctx)}
        <section class="carta-pendiente" aria-labelledby="cp-t">
          <h2 class="titulo-2" id="cp-t">${lang === 'en' ? 'The full menu' : 'La carta completa'}</h2>
          <p>${lang === 'en' ? 'Tapas, paella, cochinillo, meats and seafood: the whole menu is coming to this page soon, with photos. Meanwhile you can browse it in our online ordering.' : 'Tapas, paella, cochinillo, carnes y mariscos: la carta entera llega pronto a esta página, con fotos. Mientras tanto la ves completa en nuestro pedido en línea.'}</p>
          <p><a class="boton" href="${ctx.local.pedidos[0].url}" rel="noopener" data-ev="click_order">${lang === 'en' ? 'See it in online ordering' : 'Verla en el pedido en línea'}</a></p>
        </section>
        ${especialidades(ctx)}`;
      out.push({ ruta: R.menu[lang], html: pagina(ctx, { ruta: R.menu[lang], alterna: R.menu[otro(lang)], titulo: lang === 'en' ? 'Menu' : 'Menú', descripcion: lang === 'en' ? 'Lunch specials from $10.99, the $17.99 executive menu and Sancho’s Spanish classics on Calle Ocho, Miami.' : 'Almuerzo desde $10.99, menú ejecutivo a $17.99 y los clásicos españoles de Sancho en la Calle Ocho, Miami.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-menu' }) });
    }

    // ---- pedir
    {
      const cuerpo = h`${cabezaPlato(ctx, { titulo: lang === 'en' ? 'Order' : 'Pedir', entrada: lang === 'en' ? 'Pick it up or get it delivered. Our own online ordering is the first option.' : 'Para recoger o a domicilio. Nuestro pedido en línea es la primera opción.', foto: 'calamares' })}
        <section class="pedir">${pedidos(ctx)}<p class="pedir__llamar">${lang === 'en' ? 'Or call us to order for pickup: ' : 'O llámanos y pide para recoger: '}${telefono(ctx)}</p></section>`;
      out.push({ ruta: R.pedir[lang], html: pagina(ctx, { ruta: R.pedir[lang], alterna: R.pedir[otro(lang)], titulo: lang === 'en' ? 'Order' : 'Pedir', descripcion: lang === 'en' ? 'Order Sancho for pickup or delivery: online ordering, DoorDash, Uber Eats and Grubhub.' : 'Pide Sancho para recoger o a domicilio: pedido en línea, DoorDash, Uber Eats y Grubhub.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-pedir' }) });
    }

    // ---- club
    {
      const beneficios = lang === 'en'
        ? [['A stamp per visit', 'Every meal adds a stamp to the card in your phone.'], ['A dish on the house', 'Fill the card and the next dish is on us.'], ['Birthday dessert', 'Dessert on your day.']]
        : [['Un sello por visita', 'Cada comida suma un sello a la tarjeta de tu teléfono.'], ['Un plato de la casa', 'Completa la tarjeta y el siguiente plato va por nosotros.'], ['Postre de cumpleaños', 'El postre en tu día.']];
      const cuerpo = h`${cabezaPlato(ctx, { titulo: lang === 'en' ? 'The Sancho club' : 'El club de Sancho', entrada: lang === 'en' ? 'A card in your phone’s wallet. Opening soon: follow us to hear first.' : 'Una tarjeta en la billetera de tu teléfono. Abre muy pronto: síguenos para enterarte primero.', foto: 'postre' })}
        <section class="club">
          <ol class="club__beneficios">${beneficios.map(([a, b]) => h`<li><h2 class="titulo-3">${a}</h2><p>${b}</p></li>`)}</ol>
          <p class="club__nota">${lang === 'en' ? 'Benefits to be confirmed at launch.' : 'Beneficios por confirmar al abrir.'}</p>
          <p><a class="boton boton--grande" href="${ctx.local.redes.instagram}" rel="noopener" data-ev="click_social">${lang === 'en' ? 'Follow @sanchorestaurant_' : 'Seguir a @sanchorestaurant_'}</a></p>
        </section>`;
      out.push({ ruta: R.club[lang], html: pagina(ctx, { ruta: R.club[lang], alterna: R.club[otro(lang)], titulo: 'Club', descripcion: lang === 'en' ? 'The Sancho club: a stamp per visit, a dish on the house and birthday dessert.' : 'El club de Sancho: un sello por visita, un plato de la casa y postre de cumpleaños.', cuerpo, cls: 'p-club' }) });
    }

    // ---- visita
    {
      const cuerpo = h`${cabezaPlato(ctx, { titulo: lang === 'en' ? 'Visit' : 'Visítanos', entrada: lang === 'en' ? 'On SW 8th Street, Calle Ocho, at SW 132nd Ave.' : 'En la SW 8th Street, la Calle Ocho, a la altura de la SW 132nd Ave.', foto: 'paella' })}
        ${visita(ctx)}
        <section class="contacto"><h2 class="titulo-2">${lang === 'en' ? 'Reservations and questions' : 'Reservas y preguntas'}</h2>
          <ul class="contacto__lista"><li><span>${ui.telefono}</span> ${telefono(ctx)}</li></ul>${redes(ctx)}</section>`;
      out.push({ ruta: R.visita[lang], html: pagina(ctx, { ruta: R.visita[lang], alterna: R.visita[otro(lang)], titulo: lang === 'en' ? 'Visit' : 'Visítanos', descripcion: lang === 'en' ? 'Address, hours and phone for Sancho Restaurant: 13202 SW 8th St, Miami, FL 33184.' : 'Dirección, horario y teléfono de Sancho Restaurant: 13202 SW 8th St, Miami, FL 33184.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-visita' }) });
    }

    out.push({ ruta: R.privacidad[lang], html: pagina(ctx, { ruta: R.privacidad[lang], alterna: R.privacidad[otro(lang)], titulo: lang === 'en' ? 'Privacy' : 'Privacidad', descripcion: lang === 'en' ? 'How this website handles your information.' : 'Cómo trata esta web tu información.', cuerpo: ctx.privacidad(lang), cls: 'p-texto' }) });
  }

  {
    const ctx = { ...ctx0, lang: 'es' };
    const cuerpo = h`<section class="no-esta"><h1 class="titulo-1">Esta página no existe</h1><p class="entrada">Puede que el enlace sea de la web anterior. <span lang="en">This page doesn’t exist — the link may be from the old site.</span></p>
      <p><a class="boton" href="/">Ir al inicio</a> <a class="boton boton--sutil" href="/promos/">La semana</a> <a class="boton boton--sutil" href="/en/" lang="en">English</a></p></section>`;
    out.push({ ruta: '/404.html', archivo: '404.html', html: pagina(ctx, { ruta: '/404.html', alterna: '/en/', titulo: 'No encontrada', descripcion: 'Página no encontrada.', cuerpo, cls: 'p-404' }) });
  }

  const redirecciones = [
    ['/nuestro-menu/', '/menu/'], ['/almuerzos-especiales/', '/menu/#almuerzo'], ['/nuestro-restaurante/', '/visita/'], ['/ubicacion/', '/visita/'],
    ['/contactanos/', '/visita/'], ['/trabajando/', '/'], ['/hello-world/', '/'], ['/category/(.*)', '/'], ['/author/(.*)', '/'], ['/blocks/(.*)', '/'],
  ];
  return { paginas: out, extras: [], redirecciones };
}
