// El Mesón de Súper Machi — la casa de los eventos. Firma: la pared de carteles (ver DESIGN.md).
import { h, raw, t, cuando, precio } from '../lib/util.mjs';
import { UI, fechaLarga, sello, mesAnio, hora, rangoDias, telVisible } from '../lib/i18n.mjs';
import { foto, precarga, horario, direccion, telefono, menu, redes, pedidos, wa, tel } from '../lib/comp.mjs';
import { pagina, idioma, nav } from '../lib/shell.mjs';

const R = {
  inicio: { es: '/', en: '/en/' },
  cartelera: { es: '/eventos/', en: '/en/shows/' },
  menu: { es: '/menu/', en: '/en/menu/' },
  grupos: { es: '/grupos/', en: '/en/groups/' },
  almuerzo: { es: '/almuerzo/', en: '/en/lunch/' },
  club: { es: '/club/', en: '/en/club/' },
  visita: { es: '/visita/', en: '/en/visit/' },
  privacidad: { es: '/privacidad/', en: '/en/privacy/' },
};
const evRuta = (id, lang) => (lang === 'en' ? `/en/shows/${id}/` : `/eventos/${id}/`);

const MSG = {
  reservar: { es: 'Hola, quiero reservar una mesa en Súper Machi.', en: 'Hi! I’d like to reserve a table at Super Machi.' },
  grupo: { es: 'Hola, somos un grupo y queremos reservar en Súper Machi (y encargar para la mesa).', en: 'Hi! We’re a group and would like to reserve at Super Machi (and pre-order for the table).' },
  club: { es: 'Hola, quiero entrar al club de Súper Machi para enterarme primero de la cartelera.', en: 'Hi! I’d like to join the Super Machi club to hear about the shows first.' },
  cartelera: { es: 'Hola, avísenme cuando salga la cartelera de Súper Machi, por favor.', en: 'Hi! Please let me know when Super Machi’s next shows are announced.' },
};

export const sitio = {
  id: 'supermachi',
  nombre: 'El Mesón de Súper Machi',
  nombreCorto: 'Súper Machi',
  tema: '#150D0B',
  esquema: 'dark',
  fuentes: ['machi-display', 'machi-text'],
  tituloPortada: { es: 'El Mesón de Súper Machi · Cena con show en Miami', en: 'El Mesón de Súper Machi · Dinner & shows in Miami' },
  cabecera, pie, acciones,
};

// ---------------------------------------------------------------- cromo
function cabecera(ctx, { ruta, alterna }) {
  const { lang } = ctx; const ui = UI[lang];
  const items = [[R.cartelera[lang], lang === 'en' ? 'Shows' : 'Cartelera'], [R.menu[lang], ui.menu], [R.grupos[lang], lang === 'en' ? 'Groups' : 'Grupos'],
    [R.almuerzo[lang], lang === 'en' ? 'Lunch' : 'Almuerzo'], [R.club[lang], 'Club'], [R.visita[lang], lang === 'en' ? 'Visit' : 'Visítanos']];
  return h`<header class="cabecera">
  <a class="cabecera__marca" href="${R.inicio[lang]}" aria-label="Súper Machi · ${lang === 'en' ? 'home' : 'inicio'}"><img src="/marca/supermachi-linea-noche.svg" width="171" height="100" alt="Super Machi"></a>
  <nav class="cabecera__nav" aria-label="${lang === 'en' ? 'Main' : 'Principal'}">${nav(ctx, items, ruta, 'cabecera__lista')}</nav>
  <div class="cabecera__fin">
    ${idioma(ctx, alterna || R.inicio[lang === 'es' ? 'en' : 'es'])}
    <a class="boton boton--cabecera" href="${wa(ctx.local.whatsapp, t(MSG.reservar, lang))}" rel="noopener" data-ev="click_whatsapp">${lang === 'en' ? 'Reserve a table' : 'Reservar mesa'}</a>
    <button class="cabecera__abrir" type="button" aria-expanded="false" aria-controls="menu-movil" data-nav-abrir><span>${ui.menu}</span></button>
  </div>
  <div class="cabecera__movil" id="menu-movil" hidden>${nav(ctx, items, ruta, 'cabecera__movil-lista')}</div>
</header>`;
}

function pie(ctx, { alterna }) {
  const { lang, local } = ctx; const ui = UI[lang];
  return h`<footer class="pie">
  <div class="pie__marca"><img src="/marca/supermachi-logo-noche.svg" width="200" height="169" alt="Super Machi Restaurant" loading="lazy">
    <p>${lang === 'en' ? 'Spanish & Cuban cooking, and a show almost every Friday and Saturday.' : 'Cocina española y cubana, y show casi cada viernes y sábado.'}</p></div>
  <div><h2 class="pie__titulo">${ui.direccion}</h2>${direccion(ctx)}<p><a href="${local.mapa}" rel="noopener" data-ev="click_directions">${ui.comoLlegar} →</a></p></div>
  <div><h2 class="pie__titulo">${ui.horario}</h2>${horario(ctx)}</div>
  <div><h2 class="pie__titulo">${lang === 'en' ? 'Reservations' : 'Reservas'}</h2>
    <p>WhatsApp ${telefono(ctx)}</p><p>RSVP ${telefono(ctx, local.rsvp)}</p>
    <h2 class="pie__titulo">${ui.redes}</h2>${redes(ctx)}</div>
  <div class="pie__base">
    <p>© ${new Date().getFullYear()} El Mesón de Súper Machi · 7931 NW 2nd St, Miami, FL 33126</p>
    <p><a href="${R.privacidad[lang]}">${ui.privacidad}</a> · <a href="${alterna}" hreflang="${lang === 'es' ? 'en' : 'es'}">${ui.idioma}</a></p>
  </div>
</footer>`;
}

function acciones(ctx) {
  const { lang, local } = ctx; const ui = UI[lang];
  return h`<nav class="acciones" aria-label="${lang === 'en' ? 'Quick actions' : 'Acciones rápidas'}">
  <a href="${wa(local.whatsapp, t(MSG.reservar, lang))}" rel="noopener" data-ev="click_whatsapp" class="acciones__principal">${ui.reservar}</a>
  <a href="${tel(local.telefono)}" data-ev="click_call">${ui.llamar}</a>
  <a href="${local.mapa}" rel="noopener" data-ev="click_directions">${lang === 'en' ? 'Map' : 'Mapa'}</a>
  <a href="${R.menu[lang]}">${ui.menu}</a>
</nav>`;
}

// ---------------------------------------------------------------- la firma: la pared de carteles
function cartel(ctx, e, { pasado, eager = false, sizes = '(min-width: 1100px) 260px, (min-width: 700px) 30vw, 46vw' }) {
  const { lang } = ctx; const s = sello(e.fecha, lang);
  return h`<li class="cartel${pasado ? ' cartel--pasado' : ''}" data-fecha="${e.fecha}">
    <a href="${evRuta(e.id, lang)}" class="cartel__enlace">
      ${foto(ctx, e.id, { flyer: true, sizes, cls: 'cartel__foto', eager, alt: `${e.artista} · ${fechaLarga(e.fecha, lang)}` })}
      <span class="cartel__sello" aria-hidden="true"><span>${s.dia}</span><b>${s.num}</b><span>${s.mes}</span></span>
      ${cuando(pasado, () => h`<span class="cartel__ya" aria-hidden="true">${lang === 'en' ? 'Past show' : 'Ya pasó'}</span>`)}
      <span class="cartel__pie"><span class="cartel__artista">${e.artista}</span><span class="cartel__fecha">${fechaLarga(e.fecha, lang)}</span></span>
    </a>
  </li>`;
}

const pared = (ctx, evs, opts = {}) => h`<ol class="pared${opts.cls ? ' ' + opts.cls : ''}" role="list">${evs.map((e, i) => cartel(ctx, e, { pasado: opts.pasado, eager: opts.eager && i < (opts.eagerN ?? 2), sizes: opts.sizes }))}</ol>`;

// ---------------------------------------------------------------- el plano de la sala y la reserva
const MESAS = {
  vip: [[42, 105, 38, 64, 4], [42, 176, 38, 64, 4], [123, 145, 64, 38, 2], [207, 145, 64, 38, 2], [376, 145, 64, 38, 2], [456, 145, 64, 38, 2],
    [555, 105, 38, 64, 4], [555, 176, 38, 64, 4], [48, 262, 64, 38, 4], [132, 262, 64, 38, 4], [297, 262, 64, 38, 4], [377, 262, 64, 38, 4], [467, 262, 64, 38, 4]],
  'salon-1': [[150, 355, 64, 36, 2], [233, 355, 64, 36, 2], [293, 355, 64, 36, 2], [481, 355, 64, 36, 2], [559, 372, 40, 64, 2], [559, 447, 40, 64, 4], [559, 522, 40, 64, 6],
    [388, 403, 64, 36, 2], [223, 451, 64, 36, 2], [312, 451, 64, 36, 2], [388, 451, 64, 36, 4], [223, 500, 64, 36, 4], [312, 500, 64, 36, 4], [388, 500, 64, 36, 2],
    [223, 548, 64, 36, 4], [312, 548, 64, 36, 4], [388, 548, 64, 36, 4]],
  'salon-2': [[225, 648, 64, 36, 4], [320, 648, 64, 36, 4], [408, 673, 64, 36, 6], [549, 655, 40, 64, 6], [225, 697, 64, 36, 6], [320, 697, 64, 36, 4], [408, 727, 64, 36, 4],
    [549, 724, 40, 64, 6], [225, 745, 64, 36, 2], [320, 748, 64, 36, 4], [225, 808, 64, 36, 6], [320, 808, 64, 36, 6], [408, 808, 64, 36, 6]],
  barra: [[36, 425, 48, 18, 1], [36, 452, 48, 18, 1], [36, 479, 48, 18, 1], [36, 506, 48, 18, 1], [36, 533, 48, 18, 1], [36, 560, 48, 18, 1],
    [36, 662, 48, 18, 1], [36, 689, 48, 18, 1], [36, 716, 48, 18, 1], [36, 743, 48, 18, 1]],
};
const ZONAS = { vip: [18, 95, 600, 232], 'salon-1': [106, 343, 512, 262], 'salon-2': [106, 622, 512, 258], barra: [18, 405, 88, 475] };

function plano(ctx) {
  const { lang } = ctx;
  const nombres = { vip: 'VIP', 'salon-1': lang === 'en' ? 'Room 1' : 'Salón 1', 'salon-2': lang === 'en' ? 'Room 2' : 'Salón 2', barra: lang === 'en' ? 'Bar' : 'Barra' };
  const etiqueta = { vip: [318, 222], 'salon-1': [160, 512], 'salon-2': [165, 728], barra: [62, 612] };
  return h`<svg class="plano" viewBox="0 0 640 900" aria-hidden="true" focusable="false">
    <rect class="plano__escenario" x="150" y="18" width="340" height="52" rx="2"/><text class="plano__escenario-txt" x="320" y="53">${lang === 'en' ? 'STAGE' : 'ESCENARIO'}</text>
    ${Object.entries(ZONAS).map(([z, [x, y, w, hh]]) => h`<g class="plano__zona" data-zona="${z}"><rect class="plano__area" x="${x}" y="${y}" width="${w}" height="${hh}"/>
      ${MESAS[z].map(([mx, my, mw, mh, n]) => h`<rect class="plano__mesa" x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="2"/><text class="plano__n" x="${mx + mw / 2}" y="${my + mh / 2 + 6}">${n}</text>`)}
      <text class="plano__nombre" x="${etiqueta[z][0]}" y="${etiqueta[z][1]}">${nombres[z]}</text></g>`)}
  </svg>`;
}

function reserva(ctx, { evento = null } = {}) {
  const { lang, local } = ctx; const ui = UI[lang];
  const zonas = ctx.eventos.zonas;
  const personas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
  return h`<section class="reserva" id="reservar" aria-labelledby="reserva-t">
    <div class="reserva__texto">
      <h2 id="reserva-t" class="titulo-2">${lang === 'en' ? 'Pick your spot' : 'Elige dónde sentarte'}</h2>
      <p>${lang === 'en' ? 'The room faces the stage: VIP up front, then Room 1 and Room 2, and the bar along the side. Tell us where you’d like to sit and we’ll confirm on WhatsApp.' : 'La sala mira al escenario: el VIP adelante, luego el Salón 1 y el Salón 2, y la barra a un lado. Dinos dónde quieres sentarte y te confirmamos por WhatsApp.'}</p>
      <form class="reserva__form" data-reserva data-wa="${local.whatsapp}" data-lang="${lang}" ${evento ? h`data-evento="${evento.artista} · ${fechaLarga(evento.fecha, lang)}"` : ''}>
        <fieldset class="reserva__zonas"><legend>${lang === 'en' ? 'Area' : 'Zona'}</legend>
          ${zonas.map((z, i) => h`<label class="chip"><input type="radio" name="zona" value="${t(z, lang)}" data-zona="${z.id}" ${raw(i === 1 ? 'checked' : '')}><span>${t(z, lang)}</span></label>`)}
        </fieldset>
        <div class="reserva__fila">
          <label class="campo"><span>${lang === 'en' ? 'Guests' : 'Personas'}</span>
            <select name="personas">${personas.map((n) => h`<option ${raw(n === 2 ? 'selected' : '')}>${n === 20 ? '20+' : n}</option>`)}</select></label>
          ${evento ? '' : h`<label class="campo"><span>${lang === 'en' ? 'Date' : 'Fecha'}</span><input type="date" name="fecha" data-hoy-min></label>`}
        </div>
        <label class="campo"><span>${lang === 'en' ? 'Name' : 'Nombre'}</span><input type="text" name="nombre" autocomplete="name" maxlength="60"></label>
        <button class="boton boton--grande" type="submit" data-ev="click_whatsapp">${lang === 'en' ? 'Send on WhatsApp' : 'Enviar por WhatsApp'}</button>
        <p class="reserva__nota">${lang === 'en' ? 'Prefer to call? Show reservations (RSVP): ' : '¿Prefieres llamar? Reservas para los shows (RSVP): '}${telefono(ctx, local.rsvp)}</p>
      </form>
    </div>
    <div class="reserva__plano">${plano(ctx)}</div>
  </section>`;
}

// ---------------------------------------------------------------- bloques
function laCasa(ctx) {
  const { lang } = ctx; const e = ctx.local.especiales;
  const items = [
    { foto: 'cochinillo', titulo: { es: 'El cochinillo', en: 'The suckling pig' }, texto: { es: 'Cochinillo segoviano asado entero, para 6 a 8 personas y con dos acompañantes.', en: 'A whole Segovia-style roast suckling pig for 6 to 8, with two sides.' }, dato: '$290', href: R.grupos[lang] },
    { foto: 'buffet', titulo: { es: 'El buffet del mediodía', en: 'The lunch buffet' }, texto: { es: `Almuerzo cubano estilo buffet, ${rangoDias(e.buffet.dias, 'es').toLowerCase()} de ${hora(e.buffet.desde, 'es')} a ${hora(e.buffet.hasta, 'es')}`, en: `Cuban lunch, buffet-style, ${rangoDias(e.buffet.dias, 'en')} from ${hora(e.buffet.desde, 'en')} to ${hora(e.buffet.hasta, 'en')}` }, dato: precio(e.buffet.precio), href: R.almuerzo[lang] },
    { foto: 'mojito', titulo: { es: 'El happy hour', en: 'Happy hour' }, texto: { es: 'De lunes a viernes de 4 a 7: cócteles a $6.50, cerveza a $3 y tapas desde $4.', en: 'Monday to Friday, 4 to 7: cocktails at $6.50, beer at $3 and tapas from $4.' }, dato: '4–7 p. m.', href: `${R.menu[lang]}#happy-hour` },
  ];
  return h`<section class="casa" aria-labelledby="casa-t">
    <h2 class="titulo-2" id="casa-t">${lang === 'en' ? 'House favorites' : 'Lo de la casa'}</h2>
    <ul class="casa__lista">${items.map((it) => h`<li class="casa__item"><a href="${it.href}">
      ${foto(ctx, it.foto, { sizes: '(min-width: 900px) 33vw, 92vw', cls: 'casa__foto' })}
      <span class="casa__dato cifra">${lang === 'en' ? it.dato.replace(' p. m.', ' p.m.') : it.dato}</span>
      <h3>${t(it.titulo, lang)}</h3><p>${t(it.texto, lang)}</p></a></li>`)}</ul>
  </section>`;
}

function visita(ctx) {
  const { lang, local } = ctx; const ui = UI[lang];
  return h`<section class="visita" aria-labelledby="visita-t">
    ${foto(ctx, 'fachada', { sizes: '(min-width: 900px) 50vw, 100vw', cls: 'visita__foto' })}
    <div class="visita__datos">
      <h2 class="titulo-2" id="visita-t">${lang === 'en' ? 'Find us' : 'Cómo llegar'}</h2>
      ${direccion(ctx)}
      ${horario(ctx)}
      <p class="visita__acciones"><a class="boton" href="${local.mapa}" rel="noopener" data-ev="click_directions">${ui.comoLlegar}</a> <a class="boton boton--sutil" href="${tel(local.telefono)}" data-ev="click_call">${ui.llamar} ${telVisible(local.telefono)}</a></p>
      <h3 class="titulo-3">${lang === 'en' ? 'Delivery' : 'A domicilio'}</h3>${pedidos(ctx)}
    </div>
  </section>`;
}

function clubTeaser(ctx) {
  const { lang } = ctx;
  return h`<section class="club-teaser" aria-labelledby="club-t">
    <h2 class="titulo-2" id="club-t">${lang === 'en' ? 'Hear about the shows first' : 'Entérate primero de la cartelera'}</h2>
    <p>${lang === 'en' ? 'The house club is coming: early access to each show, a preferred table and something for your birthday.' : 'Viene el club de la casa: preventa de cada show, mesa preferente y algo para tu cumpleaños.'}</p>
    <a class="boton" href="${R.club[lang]}">${lang === 'en' ? 'About the club' : 'Así será el club'}</a>
  </section>`;
}

// ---------------------------------------------------------------- páginas
export function paginas(ctx0) {
  const out = [];
  const { eventos } = ctx0;
  const hoyIso = ctx0.hoy; // fecha del build (solo para separar próximos de pasados; app.js lo revisa en el navegador)
  const todos = [...eventos.proximos, ...eventos.archivo].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximos = todos.filter((e) => e.fecha >= hoyIso);
  const pasados = todos.filter((e) => e.fecha < hoyIso).reverse();

  for (const lang of ['es', 'en']) {
    const ctx = { ...ctx0, lang };
    const ui = UI[lang];
    const L = (o) => t(o, lang);

    // ---- inicio
    {
      const recientes = pasados.slice(0, 6);
      const hero = proximos.length
        ? h`<section class="hero hero--cartelera" aria-labelledby="hero-t">
            <div class="hero__texto">
              <h1 class="titulo-1" id="hero-t">${lang === 'en' ? 'This week at the house' : 'Esta semana en la casa'}</h1>
              <p class="hero__entrada">${lang === 'en' ? 'Dinner with a show. Book your table on WhatsApp; tickets, when the show has them, on DigitalTike.' : 'Cena con show. Reserva tu mesa por WhatsApp; las entradas, cuando el show las pide, en DigitalTike.'}</p>
              <p class="hero__acciones"><a class="boton boton--grande" href="${R.cartelera[lang]}">${lang === 'en' ? 'See the lineup' : 'Ver la cartelera'}</a></p>
            </div>
            ${pared(ctx, proximos.slice(0, 4), { eager: true, cls: 'pared--hero' })}
          </section>`
        : h`<section class="hero" aria-labelledby="hero-t">
            <div class="hero__texto">
              <h1 class="titulo-1" id="hero-t">${lang === 'en' ? h`Dinner with a show, almost every <span>Friday and Saturday</span>` : h`Cena con show, casi cada <span>viernes y sábado</span>`}</h1>
              <p class="hero__entrada">${lang === 'en' ? `${pasados.length} shows since December at El Mesón de Súper Machi, with Spanish and Cuban cooking. The November lineup is announced here first.` : `${pasados.length} shows desde diciembre en El Mesón de Súper Machi, con cocina española y cubana. La cartelera de noviembre se anuncia aquí primero.`}</p>
              <p class="hero__acciones">
                <a class="boton boton--grande" href="${wa(ctx.local.whatsapp, L(MSG.reservar))}" rel="noopener" data-ev="click_whatsapp">${lang === 'en' ? 'Reserve a table' : 'Reservar mesa'}</a>
                <a class="boton boton--sutil boton--grande" href="${R.cartelera[lang]}">${lang === 'en' ? 'Who has played here' : 'Quién ha pasado por la casa'}</a>
              </p>
            </div>
            ${pared(ctx, recientes, { pasado: true, eager: true, eagerN: 2, cls: 'pared--hero', sizes: '(min-width: 1100px) 240px, (min-width: 700px) 28vw, 46vw' })}
          </section>`;
      const cuerpo = h`${hero}${laCasa(ctx)}
        <section class="carta-teaser" aria-labelledby="carta-t">
          <div><h2 class="titulo-2" id="carta-t">${lang === 'en' ? 'The menu, without the PDF' : 'El menú, sin PDF'}</h2>
          <p>${lang === 'en' ? 'Starters, mains, drinks and happy hour, with prices, searchable from your phone. Note what you want and show it to your server.' : 'Entradas, platos fuertes, bebidas y happy hour, con precios y buscador desde el teléfono. Anota lo que quieres y enséñaselo al mesero.'}</p>
          <a class="boton" href="${R.menu[lang]}">${lang === 'en' ? 'Open the menu' : 'Abrir el menú'}</a></div>
          <ul class="carta-teaser__platos">${ctx.menu.cartas[0].secciones[0].platos.slice(0, 4).map((p) => h`<li><span>${p.n}</span><span class="cifra">${precio(p.p)}</span></li>`)}</ul>
        </section>
        ${visita(ctx)}${clubTeaser(ctx)}`;
      out.push({ ruta: R.inicio[lang], html: pagina(ctx, { ruta: R.inicio[lang], alterna: R.inicio[lang === 'es' ? 'en' : 'es'], titulo: '', descripcion: lang === 'en' ? 'Spanish and Cuban restaurant in Miami with dinner shows almost every Friday and Saturday, Segovia-style suckling pig, a Cuban lunch buffet and happy hour. 7931 NW 2nd St.' : 'Restaurante español y cubano en Miami con cena y show casi cada viernes y sábado, cochinillo segoviano, buffet cubano al mediodía y happy hour. 7931 NW 2nd St.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-inicio', precargas: recientes[0] ? precarga(ctx, recientes[0].id, '(min-width: 1100px) 240px, (min-width: 700px) 28vw, 46vw', true) : '' }) });
    }

    // ---- cartelera
    {
      const cuerpo = h`<header class="cabeza-pagina">
          <h1 class="titulo-1">${lang === 'en' ? 'Shows' : 'Cartelera'}</h1>
          <p class="entrada">${lang === 'en' ? 'Dinner with a show at El Mesón. Reserve your table on WhatsApp; when a show sells tickets, they’re on DigitalTike.' : 'Cena con show en el mesón. Reserva tu mesa por WhatsApp; cuando un show vende entradas, están en DigitalTike.'}</p>
        </header>
        <section class="proximos" aria-labelledby="prox-t">
          <h2 class="titulo-2" id="prox-t">${lang === 'en' ? 'Coming up' : 'Próximos shows'}</h2>
          ${proximos.length ? pared(ctx, proximos, { eager: true }) : h`<div class="vacio">
            <p class="vacio__titulo">${lang === 'en' ? 'The November lineup is about to be announced.' : 'La cartelera de noviembre está por anunciarse.'}</p>
            <p>${lang === 'en' ? 'It goes up here and on Instagram first. Want a heads-up?' : 'Sale aquí y en Instagram primero. ¿Quieres que te avisemos?'}</p>
            <p class="vacio__acciones"><a class="boton" href="${wa(ctx.local.whatsapp, L(MSG.cartelera))}" rel="noopener" data-ev="click_whatsapp">${lang === 'en' ? 'Let me know on WhatsApp' : 'Avísame por WhatsApp'}</a> <a class="boton boton--sutil" href="${ctx.local.redes.instagram}" rel="noopener" data-ev="click_social">@supermachi_miami</a></p>
          </div>`}
        </section>
        ${reserva(ctx)}
        <section class="archivo" aria-labelledby="arch-t">
          <h2 class="titulo-2" id="arch-t">${lang === 'en' ? 'Who has played the house' : 'Quién ha pasado por la casa'}</h2>
          <p class="archivo__cuenta">${lang === 'en' ? `${pasados.length} shows since December 2025. Each one has its own page.` : `${pasados.length} shows desde diciembre de 2025. Cada uno tiene su página.`}</p>
          ${pared(ctx, pasados, { pasado: true })}
        </section>`;
      out.push({ ruta: R.cartelera[lang], html: pagina(ctx, { ruta: R.cartelera[lang], alterna: R.cartelera[lang === 'es' ? 'en' : 'es'], titulo: lang === 'en' ? 'Shows' : 'Cartelera', descripcion: lang === 'en' ? 'Dinner shows at El Mesón de Súper Machi in Miami: the upcoming lineup, how to reserve your table, and everyone who has played the house.' : 'Cena con show en El Mesón de Súper Machi, Miami: la próxima cartelera, cómo reservar tu mesa y todos los que han pasado por la casa.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-cartelera' }) });
    }

    // ---- una página por show
    for (const e of todos) {
      const pasado = e.fecha < hoyIso;
      const s = sello(e.fecha, lang);
      const siguientes = proximos.filter((x) => x.id !== e.id).slice(0, 4);
      const mismos = pasados.filter((x) => x.id !== e.id && x.artista === e.artista).slice(0, 4);
      const cuerpo = h`<article class="evento${pasado ? ' evento--pasado' : ''}" data-fecha="${e.fecha}">
          <div class="evento__flyer">${foto(ctx, e.id, { flyer: true, sizes: '(min-width: 900px) 520px, 92vw', eager: true, alt: `${e.artista} · ${fechaLarga(e.fecha, lang)}` })}</div>
          <div class="evento__datos">
            <p class="evento__sello" aria-hidden="true"><span>${s.dia}</span><b>${s.num}</b><span>${s.mes}</span></p>
            <h1 class="titulo-1 evento__titulo">${e.artista}</h1>
            ${cuando(e.subtitulo, () => h`<p class="evento__sub">${lang === 'en' && e.subtitulo_en ? e.subtitulo_en : e.subtitulo}</p>`)}
            <p class="evento__fecha"><time datetime="${e.fecha}">${fechaLarga(e.fecha, lang, true)}</time>${cuando(e.horas, () => ' · ' + e.horas.map((x) => hora(x, lang)).join(lang === 'en' ? ' and ' : ' y '))}</p>
            <p class="evento__lugar">El Mesón de Súper Machi · 7931 NW 2nd St, Miami</p>
            ${pasado ? h`<div class="evento__estado"><p><strong>${lang === 'en' ? 'This show already happened.' : 'Este show ya pasó.'}</strong> ${lang === 'en' ? 'The next lineup is announced on the shows page and on Instagram.' : 'La próxima cartelera se anuncia en la cartelera y en Instagram.'}</p>
                <p><a class="boton" href="${R.cartelera[lang]}">${lang === 'en' ? 'See the lineup' : 'Ver la cartelera'}</a></p></div>`
              : h`<p class="evento__acciones">
                ${cuando(e.entradas_url, () => h`<a class="boton boton--grande" href="${e.entradas_url}" rel="noopener" data-ev="click_tickets">${lang === 'en' ? 'Buy tickets' : 'Comprar entradas'}</a>`)}
                <a class="boton ${e.entradas_url ? 'boton--sutil ' : ''}boton--grande" href="#reservar">${lang === 'en' ? 'Reserve a table' : 'Reservar mesa'}</a>
                <a class="boton boton--sutil" href="/eventos/${e.id}.ics" download>${lang === 'en' ? 'Add to calendar' : 'Añadir al calendario'}</a>
                <button class="boton boton--sutil" type="button" data-compartir>${ui.compartir}</button></p>`}
          </div>
        </article>
        ${cuando(!pasado, () => reserva(ctx, { evento: e }))}
        ${cuando(siguientes.length, () => h`<section class="mas" aria-labelledby="mas-t"><h2 class="titulo-2" id="mas-t">${lang === 'en' ? 'Also coming up' : 'También viene'}</h2>${pared(ctx, siguientes, {})}</section>`)}
        ${cuando(mismos.length, () => h`<section class="mas" aria-labelledby="mismo-t"><h2 class="titulo-2" id="mismo-t">${lang === 'en' ? `${e.artista} at the house before` : `${e.artista} en la casa, antes`}</h2>${pared(ctx, mismos, { pasado: true })}</section>`)}
        ${cuando(!siguientes.length && !mismos.length, () => h`<section class="mas" aria-labelledby="otros-t"><h2 class="titulo-2" id="otros-t">${lang === 'en' ? 'Other recent shows' : 'Otros shows recientes'}</h2>${pared(ctx, pasados.filter((x) => x.id !== e.id).slice(0, 4), { pasado: true })}</section>`)}`;
      const r = evRuta(e.id, lang);
      out.push({ ruta: r, html: pagina(ctx, { ruta: r, alterna: evRuta(e.id, lang === 'es' ? 'en' : 'es'), titulo: `${e.artista} · ${fechaLarga(e.fecha, lang)}`, descripcion: lang === 'en' ? `${e.artista} live at El Mesón de Súper Machi, Miami, ${fechaLarga(e.fecha, 'en', true)}. Dinner with a show.` : `${e.artista} en vivo en El Mesón de Súper Machi, Miami, el ${fechaLarga(e.fecha, 'es', true)}. Cena con show.`, cuerpo, jsonld: [ctx.jsonldEvento(e, lang)], og: `${ctx.sitio.dominio}/media/supermachi/flyers/${e.id}-${ctx.media.flyers[e.id].anchos.at(-1)}.webp`, cls: 'p-evento' }) });
    }

    // ---- menú
    {
      const cuerpo = h`<header class="cabeza-pagina cabeza-pagina--menu">
          <h1 class="titulo-1">${lang === 'en' ? 'Menu' : 'Menú'}</h1>
          <p class="entrada">${lang === 'en' ? 'Spanish and Cuban cooking, the bar and happy hour. Dish names stay in Spanish; descriptions are in English.' : 'Cocina española y cubana, la barra y el happy hour. Busca un plato, anótalo con «+» y enséñale tu comanda al mesero.'}</p>
        </header>
        ${menu(ctx, ctx.menu)}`;
      out.push({ ruta: R.menu[lang], html: pagina(ctx, { ruta: R.menu[lang], alterna: R.menu[lang === 'es' ? 'en' : 'es'], titulo: lang === 'en' ? 'Menu' : 'Menú', descripcion: lang === 'en' ? 'The full menu at El Mesón de Súper Machi, Miami: tapas, Segovia-style suckling pig, Cuban classics, cocktails, wine and happy hour, with prices.' : 'El menú completo de El Mesón de Súper Machi, Miami: tapas, cochinillo segoviano, clásicos cubanos, cócteles, vinos y happy hour, con precios.', cuerpo, jsonld: [ctx.jsonldMenu(lang)], cls: 'p-menu' }) });
    }

    // ---- grupos
    {
      const recs = ctx.menu.cartas[0].secciones[0].platos;
      const cuerpo = h`<header class="cabeza-pagina">
          <h1 class="titulo-1">${lang === 'en' ? 'For the big table' : 'Para la mesa grande'}</h1>
          <p class="entrada">${lang === 'en' ? 'Birthdays, family, the whole crew. These come to the table to share.' : 'Cumpleaños, la familia, el grupo completo. Esto llega a la mesa para compartir.'}</p>
        </header>
        <section class="grupos">
          <div class="grupos__foto">${foto(ctx, 'cochinillo', { sizes: '(min-width: 900px) 50vw, 100vw', eager: true })}</div>
          <ul class="grupos__lista">${recs.map((p) => h`<li id="${p.id}"><h2 class="titulo-3">${p.n}</h2>${cuando(p.d, () => h`<p>${t(p.d, lang)}</p>`)}${cuando(p.nota, () => h`<p class="grupos__nota">${t(p.nota, lang)}</p>`)}<p class="grupos__precio cifra">${precio(p.p)}</p></li>`)}</ul>
        </section>
        <section class="grupos-reserva">
          ${foto(ctx, 'tabla', { sizes: '(min-width: 900px) 50vw, 100vw' })}
          <div><h2 class="titulo-2">${lang === 'en' ? 'Reserve and pre-order' : 'Reserva y encarga'}</h2>
          <p>${lang === 'en' ? 'Tell us how many you are, the day, and what you’d like for the table. The suckling pig is ordered a day ahead. For groups of 6 or more, an 18% gratuity is included in the bill.' : 'Dinos cuántos son, qué día y qué quieren para la mesa. El cochinillo se encarga con un día de anticipación. Para grupos de 6 o más, el 18 % de propina va incluido en la factura.'}</p>
          <p><a class="boton boton--grande" href="${wa(ctx.local.whatsapp, L(MSG.grupo))}" rel="noopener" data-ev="click_whatsapp">${lang === 'en' ? 'Plan it on WhatsApp' : 'Organizarlo por WhatsApp'}</a></p></div>
        </section>`;
      out.push({ ruta: R.grupos[lang], html: pagina(ctx, { ruta: R.grupos[lang], alterna: R.grupos[lang === 'es' ? 'en' : 'es'], titulo: lang === 'en' ? 'Groups' : 'Grupos', descripcion: lang === 'en' ? 'Segovia-style suckling pig for 6–8, the Surf & Turf board for 6–10 and more for big tables at El Mesón de Súper Machi, Miami.' : 'Cochinillo segoviano para 6–8, la Tabla Mar y Tierra para 6–10 y más para la mesa grande en El Mesón de Súper Machi, Miami.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-grupos' }) });
    }

    // ---- almuerzo
    {
      const b = ctx.local.especiales.buffet;
      const cuerpo = h`<section class="almuerzo">
          <div class="almuerzo__texto">
            <h1 class="titulo-1">${L(b).titulo}</h1>
            <p class="almuerzo__precio cifra">${precio(b.precio)}</p>
            <p class="entrada">${L(b).texto}</p>
            <p class="almuerzo__cuando"><strong>${rangoDias(b.dias, lang)}</strong> · ${hora(b.desde, lang)} – ${hora(b.hasta, lang)}</p>
            <p class="almuerzo__nota">${L(b.incluye)}</p>
            <p><a class="boton boton--grande" href="${ctx.local.mapa}" rel="noopener" data-ev="click_directions">${ui.comoLlegar}</a></p>
          </div>
          <div class="almuerzo__fotos">${foto(ctx, 'buffet', { sizes: '(min-width: 900px) 45vw, 100vw', eager: true })}${foto(ctx, 'buffet2', { sizes: '(min-width: 900px) 45vw, 100vw' })}</div>
        </section>`;
      out.push({ ruta: R.almuerzo[lang], html: pagina(ctx, { ruta: R.almuerzo[lang], alterna: R.almuerzo[lang === 'es' ? 'en' : 'es'], titulo: lang === 'en' ? 'Cuban lunch buffet' : 'Buffet cubano', descripcion: lang === 'en' ? 'Cuban lunch buffet at El Mesón de Súper Machi, Miami: Monday to Friday, 11 a.m. to 4 p.m., $12.99.' : 'Almuerzo cubano estilo buffet en El Mesón de Súper Machi, Miami: de lunes a viernes, de 11 a. m. a 4 p. m., $12.99.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-almuerzo' }) });
    }

    // ---- club
    {
      const beneficios = lang === 'en'
        ? [['48 hours early', 'Every show goes to the club two days before it’s announced.'], ['A preferred table', 'Members get first pick of the room.'], ['Your birthday', 'Something from the house on your day.']]
        : [['48 horas antes', 'Cada show le llega al club dos días antes de anunciarse.'], ['Mesa preferente', 'Los del club escogen primero dónde sentarse.'], ['Tu cumpleaños', 'Algo de la casa en tu día.']];
      const cuerpo = h`<section class="club">
          <h1 class="titulo-1">${lang === 'en' ? 'The house club' : 'El club de la casa'}</h1>
          <p class="entrada">${lang === 'en' ? 'A card in your phone’s wallet that tells you about each show before anyone else. Opening soon.' : 'Una tarjeta en la billetera de tu teléfono que te avisa de cada show antes que a nadie. Abre muy pronto.'}</p>
          <ol class="club__beneficios">${beneficios.map(([a, b]) => h`<li><h2 class="titulo-3">${a}</h2><p>${b}</p></li>`)}</ol>
          <p class="club__nota">${lang === 'en' ? 'Benefits to be confirmed at launch.' : 'Beneficios por confirmar al abrir.'}</p>
          <p><a class="boton boton--grande" href="${wa(ctx.local.whatsapp, L(MSG.club))}" rel="noopener" data-ev="click_whatsapp">${lang === 'en' ? 'Save me a spot' : 'Quiero entrar'}</a></p>
        </section>`;
      out.push({ ruta: R.club[lang], html: pagina(ctx, { ruta: R.club[lang], alterna: R.club[lang === 'es' ? 'en' : 'es'], titulo: 'Club', descripcion: lang === 'en' ? 'Join the Súper Machi club: hear about every show first.' : 'El club de Súper Machi: entérate primero de cada show.', cuerpo, cls: 'p-club' }) });
    }

    // ---- visita
    {
      const cuerpo = h`<header class="cabeza-pagina"><h1 class="titulo-1">${lang === 'en' ? 'Visit' : 'Visítanos'}</h1>
          <p class="entrada">${lang === 'en' ? 'On NW 2nd St, by NW 79th Ave, in Miami.' : 'En la NW 2nd St, a la altura de la NW 79th Ave, en Miami.'}</p></header>
        ${visita(ctx)}
        <section class="contacto"><h2 class="titulo-2">${lang === 'en' ? 'Talk to us' : 'Escríbenos'}</h2>
          <ul class="contacto__lista">
            <li><span>WhatsApp</span> <a href="${wa(ctx.local.whatsapp, L(MSG.reservar))}" rel="noopener" data-ev="click_whatsapp">${telVisible(ctx.local.telefono)}</a></li>
            <li><span>${lang === 'en' ? 'Phone' : 'Teléfono'}</span> ${telefono(ctx)}</li>
            <li><span>${lang === 'en' ? 'Show reservations (RSVP)' : 'Reservas de shows (RSVP)'}</span> ${telefono(ctx, ctx.local.rsvp)}</li>
          </ul>${redes(ctx)}</section>`;
      out.push({ ruta: R.visita[lang], html: pagina(ctx, { ruta: R.visita[lang], alterna: R.visita[lang === 'es' ? 'en' : 'es'], titulo: lang === 'en' ? 'Visit' : 'Visítanos', descripcion: lang === 'en' ? 'Address, hours, phone and WhatsApp for El Mesón de Súper Machi: 7931 NW 2nd St, Miami, FL 33126.' : 'Dirección, horario, teléfono y WhatsApp de El Mesón de Súper Machi: 7931 NW 2nd St, Miami, FL 33126.', cuerpo, jsonld: [ctx.jsonldLocal(lang)], cls: 'p-visita' }) });
    }

    // ---- privacidad
    out.push({ ruta: R.privacidad[lang], html: pagina(ctx, { ruta: R.privacidad[lang], alterna: R.privacidad[lang === 'es' ? 'en' : 'es'], titulo: lang === 'en' ? 'Privacy' : 'Privacidad', descripcion: lang === 'en' ? 'How this website handles your information.' : 'Cómo trata esta web tu información.', cuerpo: ctx.privacidad(lang), cls: 'p-texto' }) });
  }

  // ---- 404 (una sola, en los dos idiomas)
  {
    const ctx = { ...ctx0, lang: 'es' };
    const cuerpo = h`<section class="no-esta"><h1 class="titulo-1">Esta página no está en la cartelera</h1><p class="entrada">Puede que el enlace sea de la web anterior. <span lang="en">This page isn’t on the bill — the link may be from the old site.</span></p>
      <p><a class="boton" href="/">Ir al inicio</a> <a class="boton boton--sutil" href="/eventos/">Ver la cartelera</a> <a class="boton boton--sutil" href="/en/" lang="en">English</a></p></section>`;
    out.push({ ruta: '/404.html', archivo: '404.html', html: pagina(ctx, { ruta: '/404.html', alterna: '/en/', titulo: 'No encontrada', descripcion: 'Página no encontrada.', cuerpo, cls: 'p-404' }) });
  }

  // ---- .ics de los próximos
  const ics = proximos.map((e) => ({ ruta: `/eventos/${e.id}.ics`, archivo: `eventos/${e.id}.ics`, texto: ctx0.ics(e) }));
  return { paginas: out, extras: ics, redirecciones: redirecciones(todos) };
}

function redirecciones(todos) {
  const r = [
    ['/nuestro-menu/', '/menu/'], ['/platos-especiales/', '/grupos/'], ['/buffet-cubano/', '/almuerzo/'], ['/tickets/', '/eventos/'],
    ['/tienda/', '/eventos/'], ['/tienda/page/:n/', '/eventos/'], ['/categoria-producto/:rest*', '/eventos/'], ['/carrito/', '/eventos/'],
    ['/finalizar-compra/', '/eventos/'], ['/mi-cuenta/:rest*', '/'], ['/contactanos/', '/visita/'], ['/ubicacion/', '/visita/'],
    ['/construccion/', '/'], ['/prueba-imc/', '/'], ['/hello-world/', '/'], ['/category/:rest*', '/'], ['/author/:rest*', '/'],
    ['/blocks/:rest*', '/'], ['/producto/cochinillo-segoviano/', '/grupos/#cochinillo'], ['/producto/tabla-mar-y-tierra/', '/grupos/#tabla-mar-y-tierra'],
    ['/producto/tabla-mar-tierra/', '/grupos/#tabla-mar-y-tierra'], ['/producto/ticket/', '/eventos/'],
  ];
  for (const e of todos) {
    if (e.url_vieja) r.push([new URL(e.url_vieja).pathname, `/eventos/${e.id}/`]);
    if (e.url_vieja_tambien) r.push([new URL(e.url_vieja_tambien).pathname, `/eventos/${e.id}/`]);
  }
  r.push(['/producto/:rest*', '/eventos/']);
  return r;
}
