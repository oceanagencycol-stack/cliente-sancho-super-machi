# Menú digital de Súper Machi

La carta completa del restaurante, sin precios, en español (`/`) y en inglés (`/en/`), hecha para leerse en el teléfono
desde el QR de las mesas.

- **Dirección pública:** https://supermachi-menu.vercel.app (proyecto de Vercel `supermachi-menu`, Root `sites/supermachi-menu`).
- **Dirección del QR (fija, la que va impresa):** https://qr.oceanindustries.com.co/supermachi. Redirige con 307 (temporal) al
  menú, así que si el menú cambia de dirección se cambia el destino y el QR impreso sigue sirviendo. El redireccionador
  vive en `ocean-brain/servicios/qr/` (proyecto de Vercel `ocean-qr`).
- **Archivos para imprimir el QR:** `menu/qr/` (SVG, PNG de 4000 px y PDF).

## Lo que hace el cliente en la mesa

- **Mi pedido:** toca «+» en cualquier plato o bebida, ajusta cantidades, deja una nota para la cocina y lo enseña al
  mesero en una pantalla clara con letra grande. Se guarda en su teléfono 12 horas (sigue ahí si cierra el navegador o
  cambia de idioma) y no sale de él: no hay base de datos ni datos personales en el menú.
- **Club y Wallet (Pleamar):** el bloque «Club Super Machi» lleva al registro del club en Pleamar
  (`https://pleamar-ochre.vercel.app/go/supermachi-menu`, enlace con origen `qr / mesa / menu-digital`, con
  `utm_source` = el `src` que trae el QR). Ahí el cliente deja sus datos y recibe su tarjeta en Apple Wallet o Google
  Wallet; la tarjeta, a su vez, trae «Ver la carta» con la dirección del QR. Se enciende con `"club": {"activo": true}`
  en `carta.json` cuando el club exista en Pleamar (`scripts/seed-restaurants.ts` con `SEED_SOLO=super-machi`).
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
```
