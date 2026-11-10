# Sancho · Súper Machi — webs nuevas

Repo de Ocean Industries para rehacer desde cero las webs de **Sancho Restaurant Miami** y **El Mesón de Súper Machi**
(propuesta OI-PR-2026-SM). Primero se archivó todo lo que tenían publicado; sobre eso se construyeron las dos webs nuevas.

- **Súper Machi** = la casa de los eventos: cartelera con una página por show, reserva por WhatsApp desde el plano de la
  sala (VIP, Salón 1, Salón 2, barra), menú completo en HTML con buscador y «Mi comanda», grupos (cochinillo, tablas),
  buffet de almuerzo, club y visita.
- **Sancho** = cocina española de calidad al mejor precio: el sol de la semana (la promo de hoy con la hora de Miami),
  la semana completa, almuerzo y menú ejecutivo, pedidos en línea y a domicilio, club y visita.
- Las dos en español (`/`) e inglés (`/en/`), HTML estático, sin cookies ni rastreadores, con datos estructurados
  (Restaurant, Menu, Event) y redirecciones permanentes (308) desde cada URL vieja. El diseño de cada una está en `DESIGN.md`.
- **La comida manda** (2-nov, pedido de Juan): cada portada abre con un plato en movimiento a toda la pantalla (la cocina
  de Súper Machi en video; en Sancho el plato del día detrás del sol, el lunes la paella en video), cada página interior
  abre con un plato a todo lo ancho, los platos de la casa van en grande con su precio y las fotos se acercan al pasar.
- **Vista previa pública** (noindex, para mandarle al cliente): https://supermachi-web.vercel.app y https://sancho-miami.vercel.app.

## Qué hay

| Carpeta | Qué es |
|---|---|
| `content/<sitio>/` | **Lo que publica cada web**: `local.json` (dirección, teléfonos, horario, redes, pedidos), en Súper Machi `menu.json` (248 platos y bebidas de sus PDF) y `eventos.json` (próximos y archivo de shows), en Sancho `promos.json` (la semana, almuerzo, ejecutivo). Se edita aquí. |
| `web/` | El generador (sin dependencias en el build): `build.mjs`, `lib/` (plantillas), `sites/` (las páginas de cada web), `css/`, `js/`, `public/` (fuentes, logos, fotos y videos ya optimizados), `tools/` (fuentes, fotos, videos), `media.json` (qué fotos usa cada web, con su recorte y su foco). |
| `sites/<sitio>/` | Lo que despliega Vercel: `vercel.json` (redirecciones, cabeceras, CSP; lo escribe el build y se commitea) y `dist/` (no se commitea). |
| `archivo/<sitio>/` | Cada web vieja tal como estaba el 2026-11-02 (HTML, API de WordPress, `robots.txt`). No se edita. |
| `media/<sitio>/originales/` | Los originales de su biblioteca de medios, sus videos y los PDF del menú (Git LFS). `media/<sitio>/derivados/` cuadros sacados de sus videos para fotos (Git LFS). `media/<sitio>/marca/` los logos que mandó Juan. |
| `data/` | Lo extraído en limpio y `fuentes.json`: cada dato con fuente, fecha y estado (lo dudoso, `por_confirmar`). |
| `qa/` | `serve.py` (sirve `dist/` como Vercel; si cambia `vercel.json`, se reinicia), `funciones.py` (76 pruebas en navegador), `ver.py` (capturas de teléfono y escritorio). |
| `tools/` | `extraer.py` (la extracción) y `logos.py` (los logos vectoriales). |

## Menú digital (desde el 2026-11-10)

`menu/` genera la carta para el QR de las mesas desde `content/supermachi/carta.json` (carta impresa de nov-2026 + postres
y café de los PDF viejos, sin precios, ES/EN). Se edita ese archivo y se publica solo. Detalle en `menu/README.md`.

## Comandos

```bash
node web/build.mjs supermachi            # → sites/supermachi/dist (vista previa, noindex)
node web/build.mjs sancho                # → sites/sancho/dist
python3 qa/serve.py supermachi 4302 &    # http://localhost:4302 como en Vercel
python3 qa/serve.py sancho 4301 &
python3 qa/funciones.py                  # termina en «todo en verde»
python3 qa/ver.py http://localhost:4302 /tmp/capturas / /eventos/ /menu/

# solo si cambian fotos, videos, fuentes o logos (necesitan `npm install` en web/, ffmpeg y `git lfs pull`):
node web/tools/imagenes.mjs [sitio] [--solo id1,id2]
python3 web/tools/videos.py [sitio] [clave…]   # los videos de comida (unos minutos por video)
python3 web/tools/fuentes.py
python3 tools/logos.py
python3 tools/extraer.py --sin-medios    # volver a archivar las webs viejas
```

## Cómo se actualiza

- **Un show nuevo:** se agrega a `proximos` en `content/supermachi/eventos.json` (id `AAAA-MM-DD-artista`, fecha, artista,
  flyer en `media/supermachi/originales/`, y si las hay: `horas`, `entradas_url` de DigitalTike, `precio_desde`), se corre
  `node web/tools/imagenes.mjs supermachi` para el flyer y se hace push. El día después del show pasa solo al archivo
  (la web lo revisa con la hora de Miami aunque no se vuelva a publicar).
- **Un precio o una promo:** en `content/`, y su fuente en `data/fuentes.json`.
- Todo push a `main` publica las dos vistas previas en Vercel (ver `DEPLOY.md`).
