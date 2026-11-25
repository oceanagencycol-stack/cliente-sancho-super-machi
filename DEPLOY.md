# DEPLOY.md — Vercel, consola y lanzamiento

## Proyectos en Vercel (equipo de Ocean)

| Proyecto | Root Directory | Build Command | Output | Install |
|---|---|---|---|---|
| `supermachi-web` | `sites/supermachi` | `node ../../web/build.mjs supermachi` | `dist` | `echo sin dependencias` |
| `sancho-web` | `sites/sancho` | `node ../../web/build.mjs sancho` | `dist` | `echo sin dependencias` |
| `supermachi-menu` | `sites/supermachi-menu` | `node ../../menu/build.mjs` | `dist` | `echo sin dependencias` |

El menú digital (https://supermachi-menu.vercel.app, desde el 2026-11-10) se publica con cada push a `main`; el QR impreso
apunta a https://qr.oceanindustries.com.co/supermachi (proyecto `ocean-qr`, en el repo `ocean-brain`, `servicios/qr/`), que
redirige con 307 al menú. Ver `menu/README.md`.

Framework: *Other*. «Include source files outside of the Root Directory»: activado (el build lee `web/` y `content/`).
Cada push a `main` publica las dos. El build no instala nada: las fotos, los videos, las fuentes y los logos ya van
optimizados en `web/public/` (los videos, unos 9–10 MB por web, van en git normal y no en LFS: Vercel no baja LFS). `sites/<sitio>/vercel.json` lo escribe el build y se commitea: si cambias redirecciones o la CSP, corre el
build en local y commitea el `vercel.json` nuevo (Vercel lo lee antes de construir).

## Lanzadas (20-nov-2026)

Las dos webs están **lanzadas**: Build Command de Vercel con `--lanzar` (sin banner ni noindex, canonical al dominio del
restaurante, robots abierto). Datos aprobados por el restaurante (Juan Diego, 20-nov-2026). Para volver a vista previa:
quitar `--lanzar` del Build Command y correr el build en local para commitear el `vercel.json` con el noindex.

## Vista previa (hasta el 20-nov-2026)

- **Lo que lleva la vista previa:**
  - el banner «Vista previa privada»;
  - `noindex` en cada página y la cabecera `X-Robots-Tag: noindex`;
  - un `robots.txt` que lo bloquea todo menos a los lectores de tarjetas de enlace (WhatsApp, Facebook, X, Slack,
    Telegram, LinkedIn), para que el enlace se vea con su imagen al compartirlo.
- **Las direcciones para compartir son públicas** (desde el 2-nov-2026; Juan pidió enlaces para mandarle al cliente):
  - https://supermachi-web.vercel.app
  - https://sancho-miami.vercel.app (también responde `sancho-web-tawny.vercel.app`)

  Son los dominios de producción de cada proyecto, y la protección estándar de Vercel no los cubre. Las URL de cada
  deploy y las `*-ocean-agency.vercel.app` sí piden sesión de Vercel.
- **Canonical y `og:*`:** en la vista previa apuntan a la dirección pública, que está en `vista_previa` de
  `content/<sitio>/local.json`. Así la tarjeta de WhatsApp no muestra la web vieja. Al lanzar (`--lanzar`) pasan al dominio
  del restaurante.

## Reservas en la web: variables y la línea de WhatsApp

- **Propuesta para el cliente:** proyecto `supermachi-propuesta` (sin git conectado) con la rama `reservas-web` publicada
  como producción en https://supermachi-propuesta.vercel.app (pública; Build Command `node ../../web/build.mjs supermachi --propuesta`:
  los datos aprobados, noindex y un banner de «Propuesta»; mismas
  variables `SM_RESERVAS_*`). Para actualizarla, un deploy nuevo de esa rama al proyecto. Se borra cuando la rama pase a `main`.

- Proyecto `supermachi-web`, variables (Production y Preview, tipo *sensitive*): `SM_RESERVAS_URL` (el webhook del flujo de
  n8n `XmFmnuE22xuYAjSU`) y `SM_RESERVAS_SECRETO` (la cabecera `x-reserva-secreto` que exige ese flujo). Si se cambia una,
  se cambia en los dos lados.
- **Vincular el WhatsApp del restaurante** (una vez, con el celular del 305-266-3226 en la mano):
  la página del flujo de n8n «Súper Machi · vincular WhatsApp (305 266 3226)» (`iwpZbafGEsel4Lrn`; su dirección se ve en el
  nodo «Abrir página» y no va en el repo: con ella cualquiera podría vincular otro celular). `?estado=1` dice si sigue conectada. Si el celular cierra la sesión de «Dispositivos vinculados», las reservas vuelven a
  salir por WhatsApp a mano hasta que se vincule de nuevo.

## Acciones de consola que solo hace Juan (o el cliente)

1. **Confirmar con el restaurante lo que está en `por_confirmar`** (`data/fuentes.json`): precios vigentes del menú de
   Súper Machi (los PDF son de diciembre de 2024), horarios de los dos locales, qué incluye el buffet, el precio del
   miércoles de Sancho ($30 en la web vieja, $35 en Instagram), si sigue el jueves de tapas, el martes de vino
   (cuántas bebidas), el happy hour «ilimitado», días y horas del almuerzo y del menú ejecutivo, y los beneficios del club.
   Cada dato confirmado pasa a `verificado` (con fuente y fecha); lo que el restaurante no confirme sale de `content/` y
   queda `retirado`. Mientras quede uno en `por_confirmar`, `--lanzar` se niega y lista cuáles faltan.
2. **La cartelera de noviembre y diciembre** de Súper Machi: fecha, artista, flyer, hora, y el enlace de DigitalTike de
   cada show que venda entradas.
3. **La carta completa de Sancho** (no existe en su web: el menú daba 404 y el PDF estaba en blanco).
4. **Fotos y videos en alta** (si los tienen): los originales de su biblioteca llegan hasta 1600 px y el video de la
   paella dura 2 s y está desenfocado. Con una toma nítida de la paella (y las fotos en su tamaño original) el lunes de
   Sancho se ve tan nítido como la portada de Súper Machi. Se ponen en `media/<sitio>/originales/` y se corren
   `node web/tools/imagenes.mjs` y `python3 web/tools/videos.py`.
5. **Lanzar** (con el visto bueno del cliente):
   - `node web/build.mjs <sitio> --lanzar` en el build de Vercel (cambiar el Build Command) quita el banner y el noindex.
   - Agregar los dominios en cada proyecto de Vercel (`supermachirestaurante.com` y `www.`; `sanchorestaurantemiami.com`
     y `www.`) y cambiar los DNS donde estén registrados (hoy apuntan al hosting de WordPress). Antes, guardar una copia
     del WordPress (ya está archivado aquí, pero conviene que el hosting conserve la cuenta un mes).
   - Después del cambio: Google Search Console de cada dominio, enviar `sitemap.xml`, revisar que las URL viejas
     redirijan (`qa/funciones.py https://supermachirestaurante.com https://sanchorestaurantemiami.com`).
   - Actualizar el enlace de la web en Google Business Profile, Instagram y las apps de domicilio.
6. Opcional: un *deploy hook* diario para que la portada mueva sola los shows del día anterior al archivo (la web ya lo
   hace en el navegador; el hook lo deja también en el HTML).

## Comprobar un deploy

```bash
curl -sI https://<deploy>/ | grep -i -E "^HTTP|content-security|x-robots"
python3 qa/funciones.py https://<deploy-supermachi> https://<deploy-sancho>
```
