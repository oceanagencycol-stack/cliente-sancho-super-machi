# CLAUDE.md — ruteador para agentes

Clientes: **Sancho Restaurant Miami** (sanchorestaurantemiami.com, 13202 SW 8th St) y **El Mesón de Súper Machi**
(supermachirestaurante.com, 7931 NW 2nd St). Repo privado de Ocean. Comunicación con Juan en español; las webs en
español (`/`) e inglés (`/en/`). Estrategia: propuesta OI-PR-2026-SM (27-oct-2026): Súper Machi es **la casa de los
eventos** (centro de eventos: página por show, reserva y tickets en un flujo, cartelera del mes) y Sancho es **cocina
española de calidad al mejor precio** (centro de promociones: la promo de hoy según el día, menú, pedidos, reservas).

## Reglas
1. **Se respeta el robots.txt de cada sitio** (`archivo/<sitio>/robots.txt`). Para volver a extraer: `tools/extraer.py`.
2. **`archivo/` es cada web tal como estaba el 2026-11-02: no se edita.** Los originales de su biblioteca de medios
   viven en `media/<sitio>/originales/` (Git LFS); el inventario, en `data/<sitio>/medios.json`.
3. **Todo dato de los restaurantes lleva fuente y fecha** en `data/fuentes.json`. Lo que la web vieja dice se publica
   solo si no se contradice; lo contradictorio o dudoso va en `por_confirmar` y la web lo muestra como «se confirma
   en el restaurante» o no lo muestra. Nada de precios, horarios, eventos ni reseñas inventados.
4. **Eventos:** solo los que el restaurante confirma. Los pasados quedan como archivo («ya pasó») y nunca se venden.
5. **Fotos:** solo las del restaurante (su biblioteca de medios o lo que entregue). Las de bancos de imágenes que traía
   la plantilla vieja no se reutilizan (`stock: true` en el inventario). Nada generado con IA que muestre un plato.
6. **Reseñas con nombre** (las de Google que mostraba Trustindex) no se copian: se enlaza a Google.
7. Las webs nuevas son **vistas previas privadas** (noindex) hasta el visto bueno del cliente; cambiar el dominio a la
   web nueva lo confirma Juan. Las URL viejas redirigen con 301 a su equivalente (`web/sites/<sitio>/redirects.json`).
8. Commits con identidad `oceanagencycol-stack <oceanagencycol@gmail.com>`. Cero secretos en el repo y en el frontend.

## Dónde está cada cosa
`README.md` (qué hay, comandos, cómo se actualiza) · `DESIGN.md` (las dos ideas rectoras, paletas, tipografía y firmas:
la pared de carteles y el sol de la semana) · `DEPLOY.md` (Vercel, acciones de consola y lanzamiento) · `content/<sitio>/`
(lo que publica cada web) · `data/fuentes.json` (fuente y estado de cada dato) · `web/` (el generador) · `sites/<sitio>/`
(lo que despliega Vercel) · `qa/` (`funciones.py` debe terminar en «todo en verde» antes de cada push).
