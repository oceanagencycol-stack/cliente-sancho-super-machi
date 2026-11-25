// POST /api/reservar/ — la reserva de sanchorestaurantemiami.com. La lógica está en _nucleo.cjs (copia de
// web/lib/reservar-api.cjs que escribe el build); aquí solo van los datos de Sancho.
module.exports = require('./_nucleo.cjs').crear({
  nombre: 'Sancho',
  whatsapp: '17868892197',
  // las páginas desde donde se puede reservar: el dominio, las direcciones públicas, la propuesta y los deploys del equipo
  permitidos: /^https:\/\/((www\.)?sanchorestaurantemiami\.com|sancho-miami\.vercel\.app|sancho-web(-[a-z0-9-]+)?\.vercel\.app|sancho-propuesta\.vercel\.app|sancho-[a-z0-9-]+-ocean-agency\.vercel\.app)$/,
  lista: { es: '/reservar/listo/', en: '/en/book/done/' },
  // el flujo de n8n «Sancho · reservas desde la web»
  variables: { url: 'SA_RESERVAS_URL', secreto: 'SA_RESERVAS_SECRETO' },
});
