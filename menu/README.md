# Menú digital de Súper Machi

La carta completa del restaurante, sin precios, en español (`/`) y en inglés (`/en/`), hecha para leerse en el teléfono
desde el QR de las mesas.

- **Dirección pública:** https://supermachi-menu.vercel.app (proyecto de Vercel `supermachi-menu`, Root `sites/supermachi-menu`).
- **Dirección del QR (fija, la que va impresa):** https://qr.oceanindustries.com.co/supermachi. Redirige con 307 (temporal) al
  menú, así que si el menú cambia de dirección se cambia el destino y el QR impreso sigue sirviendo. El redireccionador
  vive en `ocean-brain/servicios/qr/` (proyecto de Vercel `ocean-qr`).
- **Archivos para imprimir el QR:** `menu/qr/` (SVG, PNG de 4000 px y PDF).

## Lo que hace el cliente en la mesa

- **La cocina primero:** abre con el video de la cocina de la portada de la web (el mismo de `web/public/media/supermachi/video`,
  que el build copia a `/video/`) y el letrero dice qué plato se ve. El clip se pide después de cargar la página, solo en
  pantalla y nunca con movimiento reducido ni ahorro de datos; siempre tiene pausa.
- **Promociones con «ahora»:** cada promo lleva `cuando` en `carta.json` (días 0 = domingo … 6 = sábado y horas, sacados de su
  propio texto); con la hora de Miami el menú marca «Ahora» o «Hoy desde las …» y pone primero la que está en curso.
- **Ficha del plato:** se toca un plato y sube su ficha con la foto en grande (crece desde la de la carta), todo el texto, las
  etiquetas y el botón «Anotar». Se pasa al plato anterior o siguiente de la sección con las flechas o deslizando la foto;
  hacia abajo se cierra. Cada ficha tiene su enlace (`/#p-<id>`, p. ej. `/#p-cochinillo`) y el botón «atrás» del teléfono la cierra.
- **Buscar y filtrar:** la lupa abre el buscador (sin tildes, en los dos idiomas, resalta lo encontrado y lleva al primer
  resultado) y los filtros «Para compartir», «En la oferta» y «Happy hour», que salen de `personas`, `oferta` y `hh`.
- **Secciones:** la barra fija sigue la sección que se lee; el botón de cuadritos abre todas las secciones con su foto.

- **Mi pedido:** toca «+» en cualquier plato o bebida (pasa a «− 1 +»; un aviso permite deshacer), ajusta cantidades, pone
  el número de mesa si quiere, deja una nota para la cocina y lo enseña al mesero en una pantalla clara con letra grande,
  ordenada por secciones como se lee la carta (la pantalla no se apaga mientras se enseña). Se guarda en su teléfono 12 horas (sigue ahí si cierra el navegador o
  cambia de idioma) y no sale de él: no hay base de datos ni datos personales en el menú.
- **Club y Wallet (Pleamar):** el bloque «Club Super Machi» lleva al registro del club en Pleamar
  (`https://pleamar-ochre.vercel.app/go/supermachi-menu`, enlace con origen `qr / mesa / menu-digital`, con
  `utm_source` = el `src` que trae el QR). Ahí el cliente deja sus datos y recibe su tarjeta en Apple Wallet o Google
  Wallet; la tarjeta, a su vez, enlaza a la carta (la «Web» del negocio en Pleamar es la dirección del QR). El club ya
  existe en Pleamar producción (creado desde el panel el 2026-11-10): negocio `super-machi-restaurant`, club
  `club-super-machi` (10 sellos, llamas, icono cerdito), enlace `supermachi-menu` → `/j/super-machi-restaurant/club-super-machi`
  (comprobado: conserva los `utm_*`). Se enciende con `"club": {"activo": true}` en `carta.json` cuando Juan dé el visto
  bueno: antes conviene que el restaurante confirme el premio y que Wallet esté activo (Google: llave de la cuenta de
  servicio en Integraciones; Apple: cuenta Apple Developer). Sin Wallet, el cliente igual recibe su tarjeta web con QR.
- **Origen del escaneo:** el QR redirige a `…/?src=qr-mesa`; el menú lo conserva al cambiar de idioma y lo pasa al club.

## Cómo se edita (sin tocar nada impreso)

Todo sale de **un archivo**: `content/supermachi/carta.json`. Se edita en GitHub (botón del lápiz) o en local, y al hacer
commit en `main` Vercel publica solo en uno o dos minutos. Si el archivo queda con un error (una coma de más, un plato sin
nombre, una foto que no existe), el build falla y **sigue publicada la versión anterior**; el error se ve en el log de Vercel.
Para revisarlo antes: `node menu/build.mjs --revisar`.

| Quiero… | Hago… |
|---|---|
| Cambiar un nombre o una descripción | Editar `n` / `n_en` / `d.es` / `d.en` del plato |
| Quitar un plato sin borrarlo | Ponerle `"oculto": true` |
| Agregar un plato | Copiar uno de la misma sección y cambiarle el `id` (único) y los textos |
| Marcarlo para las ofertas o el happy hour | `"oferta": true` / `"hh": true` |
| Cambiar una promo | Editar `promos` |
| Cambiar o agregar una foto | Poner el original en `media/supermachi/originales/` (o `derivados/menu/`), apuntar `foto.src` a él con su `tipo` (`real`, `mejorada` o `referencia`) y correr `python3 menu/tools/fotos.py` (recorta al plato con `foco` [x, y] en % y `zoom`) |

Los precios (`p`) se guardan como dato pero la página no los muestra (pedido de Juan, 2026-11-10).

## Fotos

- `real`: de la biblioteca del restaurante (`media/supermachi/originales/`).
- `mejorada`: foto real escalada con Topaz en ElevenLabs, sin cambiar el plato (`media/supermachi/derivados/menu/`, con `base` = la original).
- `referencia`: recreada con IA (gpt-image-2.5 en ElevenLabs, flujo `G7B0LU93Bx8LWPMNzPRs`) porque el restaurante no tiene
  foto de ese plato. La página la marca «imagen de referencia». Se reemplaza por la real en cuanto el restaurante la tenga.
- `foto_por_confirmar`: foto real del restaurante cuyo plato dedujo Ocean; se confirma con el restaurante.

## Comandos

```bash
node menu/build.mjs            # genera sites/supermachi-menu/dist y su vercel.json
node menu/build.mjs --revisar  # solo valida la carta
python3 menu/tools/fotos.py    # recorta las fotos nuevas (necesita git lfs pull para los originales)
python3 menu/tools/qr.py       # vuelve a generar los archivos del QR
python3 qa/serve.py supermachi-menu 4310 & python3 qa/menu.py   # pruebas del menú en un navegador (todo en verde)
```
