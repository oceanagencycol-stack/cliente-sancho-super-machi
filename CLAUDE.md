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
   en el restaurante» o no lo muestra. Nada de precios, horarios, eventos ni reseñas inventados. En la vista previa se
   ve lo que decía la web vieja bajo el banner «por confirmar»; `--lanzar` se niega mientras quede un dato del sitio en
   `por_confirmar` (se confirma, `verificado`, o sale de `content/`, `retirado`).
4. **Eventos:** solo los que el restaurante confirma. Los pasados quedan como archivo («ya pasó») y nunca se venden.
5. **Fotos:** primero las del restaurante (su biblioteca de medios o lo que entregue). Las de bancos de imágenes que traía
   la plantilla vieja no se reutilizan (lista en `web/media.json`, clave `stock`). En las **webs**, nada generado con IA que
   muestre un plato. En el **menú digital** (`menu/`), desde el 2026-11-10 por pedido de Juan: las fotos reales de baja
   calidad se mejoran (escalado fiel, sin cambiar el plato) y los platos sin foto llevan una recreada con IA, marcada en la
   página como «imagen de referencia». Cada foto dice en `content/supermachi/carta.json` si es `real`, `mejorada` o `referencia`.
6. **Reseñas con nombre** (las de Google que mostraba Trustindex) no se copian: se enlaza a Google.
7. Las webs nuevas son **vistas previas** (noindex) hasta el visto bueno del cliente, en https://supermachi-web.vercel.app y
   https://sancho-miami.vercel.app (públicas para compartir; ver `DEPLOY.md`); cambiar el dominio a la web nueva lo confirma Juan. Las URL viejas redirigen de forma permanente (308, que Google trata igual que un 301) a su equivalente (las listas al final de `web/sites/<sitio>.mjs`).
8. Commits con identidad `oceanagencycol-stack <oceanagencycol@gmail.com>`. Cero secretos en el repo y en el frontend.

## Dónde está cada cosa
`README.md` (qué hay, comandos, cómo se actualiza) · `menu/README.md` (el menú digital y su QR) · `DESIGN.md` (las dos ideas rectoras, paletas, tipografía y firmas:
la pared de carteles y el sol de la semana) · `DEPLOY.md` (Vercel, acciones de consola y lanzamiento) · `content/<sitio>/`
(lo que publica cada web) · `data/fuentes.json` (fuente y estado de cada dato) · `web/` (el generador) · `sites/<sitio>/`
(lo que despliega Vercel) · `qa/` (`funciones.py` debe terminar en «todo en verde» antes de cada push).
