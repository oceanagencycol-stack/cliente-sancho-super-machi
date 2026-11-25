// POST /api/reservar/ — la reserva de supermachirestaurante.com. La lógica está en _nucleo.cjs (copia de
// web/lib/reservar-api.cjs que escribe el build); aquí solo van los datos de Súper Machi.
module.exports = require('./_nucleo.cjs').crear({
  nombre: 'Súper Machi',
  whatsapp: '13052663226',
  // las páginas desde donde se puede reservar: el dominio, la dirección pública, la propuesta y los deploys del equipo
  permitidos: /^https:\/\/((www\.)?supermachirestaurante\.com|supermachi-web(-[a-z0-9-]+)?\.vercel\.app|supermachi-propuesta\.vercel\.app|supermachi-[a-z0-9-]+-ocean-agency\.vercel\.app)$/,
  lista: { es: '/reservar/listo/', en: '/en/reserve/done/' },
  // el flujo de n8n «Súper Machi · reservas desde la web» (XmFmnuE22xuYAjSU)
  variables: { url: 'SM_RESERVAS_URL', secreto: 'SM_RESERVAS_SECRETO' },
});
