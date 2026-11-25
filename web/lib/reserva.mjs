// El formulario de reserva en la web, igual en Súper Machi y en Sancho (desde el 23-nov-2026).
// Va a /api/reservar/ (sites/<sitio>/api/reservar.js) → n8n → el WhatsApp del restaurante. El navegador lo maneja
// iniciarReserva (web/js/comun.js); sin JS, el formulario se envía solo y la función redirige.
import { h, raw } from './util.mjs';
import { hora } from './i18n.mjs';
import { wa } from './comp.mjs';

// las horas que se ofrecen: cada media hora; el navegador deja solo las del horario del día elegido
export const HORAS = (() => { const r = []; for (let m = 11 * 60; m <= 23 * 60 + 30; m += 30) r.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); return r; })();
const PERSONAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

// nombreLocal: cómo se nombra el restaurante en el mensaje de WhatsApp de respaldo
// zonas: el <fieldset> de zonas (Súper Machi) o nada
// evento: { fecha, texto } cuando se reserva desde la página de un show (la fecha va fija)
// mensajeWa: el texto con que se abre el WhatsApp del enlace «¿Prefieres escribir?»
// notaExtra: lo que sigue al enlace de WhatsApp en la nota del pie (p. ej. el RSVP de los shows)
export function formularioReserva(ctx, { nombreLocal, zonas = '', evento = null, horaSugerida = '20:00', mensajeWa, notaExtra = '' }) {
  const { lang, local } = ctx; const en = lang === 'en';
  return h`<form class="reserva__form" method="post" action="/api/reservar/" data-reserva data-local="${nombreLocal}" data-hora-sugerida="${horaSugerida}" data-wa="${local.whatsapp}" data-lang="${lang}" data-franjas='${JSON.stringify(local.horario.franjas)}' ${evento ? h`data-evento="${evento.texto}"` : ''} novalidate>
        ${zonas}
        <div class="reserva__fila">
          ${evento ? h`<input type="hidden" name="fecha" value="${evento.fecha}">` : h`<label class="campo"><span>${en ? 'Date' : 'Fecha'}</span><input type="date" name="fecha" data-hoy-min required></label>`}
          <label class="campo"><span>${en ? 'Time' : 'Hora'}</span>
            <select name="hora" required>${HORAS.map((x) => h`<option value="${x}" ${raw(x === horaSugerida ? 'selected' : '')}>${hora(x, lang)}</option>`)}</select></label>
          <label class="campo"><span>${en ? 'Guests' : 'Personas'}</span>
            <select name="personas">${PERSONAS.map((n) => h`<option ${raw(n === 2 ? 'selected' : '')}>${n === 20 ? '20+' : n}</option>`)}</select></label>
        </div>
        <div class="reserva__fila reserva__fila--datos">
          <label class="campo"><span>${en ? 'Name' : 'Nombre'}</span><input type="text" name="nombre" autocomplete="name" maxlength="60" required></label>
          <label class="campo"><span>WhatsApp</span><input type="tel" name="telefono" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="(305) 555-0123" required></label>
        </div>
        <label class="campo"><span>${en ? 'Anything we should know? (optional)' : '¿Algo que debamos saber? (opcional)'}</span><textarea name="nota" rows="2" maxlength="300" placeholder="${en ? 'Birthday, high chair, allergies…' : 'Cumpleaños, silla para bebé, alergias…'}"></textarea></label>
        <input type="hidden" name="lang" value="${lang}">${evento ? h`<input type="hidden" name="evento" value="${evento.texto}">` : ''}
        <label class="reserva__trampa" aria-hidden="true">Empresa <input type="text" name="empresa" tabindex="-1" autocomplete="off"></label>
        <p class="reserva__error" data-reserva-error role="alert" hidden></p>
        <button class="boton boton--grande" type="submit" data-ev="click_reserve">${en ? 'Reserve' : 'Reservar'}</button>
        <p class="reserva__nota">${en ? 'Prefer to write or call? ' : '¿Prefieres escribir o llamar? '}<a href="${wa(local.whatsapp, mensajeWa)}" rel="noopener" data-ev="click_whatsapp">WhatsApp</a>${notaExtra}</p>
      </form>
      <div class="reserva__listo" data-reserva-listo tabindex="-1" hidden>
        <p class="reserva__listo-titulo">${en ? 'Request received!' : '¡Solicitud recibida!'}</p>
        <p data-reserva-listo-texto></p>
        <p><button class="boton boton--sutil" type="button" data-reserva-otra>${en ? 'Make another reservation' : 'Hacer otra reserva'}</button></p>
      </div>`;
}

// «Solicitud recibida»: adonde llega el formulario cuando el navegador no corre JavaScript
export function cuerpoLista(ctx, { mensajeWa, telefonoWa, otraReserva, seguir }) {
  const { lang, local } = ctx; const en = lang === 'en';
  return h`<section class="reserva reserva--lista" aria-labelledby="listo-t"><div class="reserva__texto">
        <h1 id="listo-t" class="titulo-1">${en ? 'Request received!' : '¡Solicitud recibida!'}</h1>
        <p>${en ? 'We just sent a message to your WhatsApp with your request. The restaurant will confirm your table in that same chat.' : 'Te acabamos de escribir a tu WhatsApp con tu solicitud. El restaurante te confirma la mesa en ese mismo chat.'}</p>
        <p>${en ? 'Didn’t get it? Write to us at ' : '¿No te llegó? Escríbenos al '}<a href="${wa(local.whatsapp, mensajeWa)}" rel="noopener">WhatsApp ${telefonoWa}</a>.</p>
        <p><a class="boton" href="${seguir.href}">${seguir.texto}</a> <a class="boton boton--sutil" href="${otraReserva}">${en ? 'Make another reservation' : 'Hacer otra reserva'}</a></p>
      </div></section>`;
}
