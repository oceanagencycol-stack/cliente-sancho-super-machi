// Textos de interfaz comunes y formatos de fecha y hora (Miami escribe los precios como $12.99 en los dos idiomas).
export const DIAS = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
export const DIAS_CORTOS = {
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
export const INICIAL = { es: ['D', 'L', 'M', 'X', 'J', 'V', 'S'], en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'] };
const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MESES_CORTOS = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function partes(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

export function fechaLarga(iso, lang, conAnio = false) {
  const { y, m, d, dow } = partes(iso);
  if (lang === 'en') return `${DIAS.en[dow]}, ${MESES.en[m - 1]} ${d}${conAnio ? `, ${y}` : ''}`;
  return `${DIAS.es[dow]} ${d} de ${MESES.es[m - 1]}${conAnio ? ` de ${y}` : ''}`;
}

export function sello(iso, lang) {
  const { m, d, dow } = partes(iso);
  return { dia: DIAS_CORTOS[lang][dow], num: String(d), mes: MESES_CORTOS[lang][m - 1], dow };
}

export const mesAnio = (y, m, lang) => (lang === 'en' ? `${MESES.en[m - 1]} ${y}` : `${MESES.es[m - 1]} de ${y}`);

// '16:00' → '4 p. m.' / '4 p.m.'; '00:00' → 'medianoche' / 'midnight'
export function hora(hhmm, lang) {
  let [hh, mm] = hhmm.split(':').map(Number);
  if (hh === 0 && mm === 0) return lang === 'en' ? 'midnight' : 'medianoche';
  if (hh === 12 && mm === 0) return lang === 'en' ? 'noon' : 'mediodía';
  const pm = hh >= 12;
  const h12 = hh % 12 || 12;
  const min = mm ? `:${String(mm).padStart(2, '0')}` : '';
  return lang === 'en' ? `${h12}${min} ${pm ? 'p.m.' : 'a.m.'}` : `${h12}${min} ${pm ? 'p. m.' : 'a. m.'}`;
}

export function rangoDias(dias, lang) {
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const ds = orden.filter((d) => dias.includes(d));
  if (ds.length === 7) return lang === 'en' ? 'Every day' : 'Todos los días';
  // tramos seguidos según el orden de la semana
  const tramos = [];
  let ini = null; let prev = null;
  for (const d of ds) {
    const i = orden.indexOf(d);
    if (ini !== null && i === orden.indexOf(prev) + 1) { prev = d; continue; }
    if (ini !== null) tramos.push([ini, prev]);
    ini = d; prev = d;
  }
  if (ini !== null) tramos.push([ini, prev]);
  const nombre = (d) => (lang === 'en' ? DIAS.en[d] : DIAS.es[d]);
  // dos días seguidos se dicen con «y» («miércoles y jueves»); tres o más, como tramo («lunes a viernes»)
  const junto = (a, b) => (orden.indexOf(b) - orden.indexOf(a) === 1 ? (lang === 'en' ? 'and' : 'y') : (lang === 'en' ? 'to' : 'a'));
  const txt = tramos.map(([a, b]) => (a === b ? nombre(a) : `${nombre(a)} ${junto(a, b)} ${nombre(b)}`))
    .join(lang === 'en' ? ', ' : ', ');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export const UI = {
  es: {
    saltar: 'Saltar al contenido', menu: 'Menú', cerrar: 'Cerrar', idioma: 'English', idiomaCorto: 'EN',
    llamar: 'Llamar', comoLlegar: 'Cómo llegar', whatsapp: 'WhatsApp', reservar: 'Reservar', pedir: 'Pedir',
    horario: 'Horario', direccion: 'Dirección', telefono: 'Teléfono', redes: 'Síguenos',
    abiertoAhora: 'Abierto ahora', cerrado: 'Cerrado', cierraA: 'cierra a las', abreA: 'abre a las',
    previa: 'Vista previa privada · precios, horarios y promos por confirmar con el restaurante',
    buscarPlato: 'Busca un plato o una bebida', sinResultados: 'Nada con ese nombre en el menú.',
    comanda: 'Mi comanda', anadir: 'Añadir', quitar: 'Quitar', mostrarMesero: 'Enseñar al mesero',
    vaciar: 'Vaciar', total: 'Total aproximado', comandaVacia: 'Toca «Añadir» en un plato para anotarlo aquí.',
    comandaNota: 'Esto no es un pedido: es tu lista para pedírsela al mesero. No se cobra aquí.',
    nuestroPedido: 'Nuestro pedido', volver: 'Volver',
    crudo: 'Crudo o poco cocinado', avisoCrudo: 'Los platos con * pueden servirse crudos o poco cocinados.',
    copa: 'copa', botella: 'botella', jarra: 'jarra',
    compartir: 'Compartir', copiado: 'Enlace copiado',
    privacidad: 'Privacidad', hechoPor: 'Web de Ocean Industries',
    volverInicio: 'Volver al inicio',
  },
  en: {
    saltar: 'Skip to content', menu: 'Menu', cerrar: 'Close', idioma: 'Español', idiomaCorto: 'ES',
    llamar: 'Call', comoLlegar: 'Directions', whatsapp: 'WhatsApp', reservar: 'Reserve', pedir: 'Order',
    horario: 'Hours', direccion: 'Address', telefono: 'Phone', redes: 'Follow us',
    abiertoAhora: 'Open now', cerrado: 'Closed', cierraA: 'closes at', abreA: 'opens at',
    previa: 'Private preview · prices, hours and deals pending the restaurant’s confirmation',
    buscarPlato: 'Search a dish or a drink', sinResultados: 'Nothing on the menu by that name.',
    comanda: 'My order list', anadir: 'Add', quitar: 'Remove', mostrarMesero: 'Show my server',
    vaciar: 'Clear', total: 'Approximate total', comandaVacia: 'Tap “Add” on a dish to note it here.',
    comandaNota: 'This is not an order: it’s your list to show your server. Nothing is charged here.',
    nuestroPedido: 'Our order', volver: 'Back',
    crudo: 'Raw or undercooked', avisoCrudo: 'Dishes marked * may be served raw or undercooked.',
    copa: 'glass', botella: 'bottle', jarra: 'pitcher',
    compartir: 'Share', copiado: 'Link copied',
    privacidad: 'Privacy', hechoPor: 'Website by Ocean Industries',
    volverInicio: 'Back to home',
  },
};

export const telVisible = (e164) => {
  const d = e164.replace(/\D/g, '').replace(/^1/, '');
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};
