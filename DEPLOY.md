# DEPLOY.md — Vercel, consola y lanzamiento

## Proyectos en Vercel (equipo de Ocean)

| Proyecto | Root Directory | Build Command | Output | Install |
|---|---|---|---|---|
| `supermachi-web` | `sites/supermachi` | `node ../../web/build.mjs supermachi` | `dist` | `echo sin dependencias` |
| `sancho-web` | `sites/sancho` | `node ../../web/build.mjs sancho` | `dist` | `echo sin dependencias` |

Framework: *Other*. «Include source files outside of the Root Directory»: activado (el build lee `web/` y `content/`).
Cada push a `main` publica las dos. El build no instala nada: las fotos, fuentes y logos ya van optimizados en
`web/public/`. `sites/<sitio>/vercel.json` lo escribe el build y se commitea: si cambias redirecciones o la CSP, corre el
build en local y commitea el `vercel.json` nuevo (Vercel lo lee antes de construir).

## Vista previa (hoy)

- Banner «Vista previa privada», `noindex` en cada página, `X-Robots-Tag: noindex` y `robots.txt` que lo bloquea todo.
- Las URL `*.vercel.app` pueden pedir inicio de sesión de Vercel; para mostrarlas, un enlace para compartir (caduca).

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
4. **Lanzar** (con el visto bueno del cliente):
   - `node web/build.mjs <sitio> --lanzar` en el build de Vercel (cambiar el Build Command) quita el banner y el noindex.
   - Agregar los dominios en cada proyecto de Vercel (`supermachirestaurante.com` y `www.`; `sanchorestaurantemiami.com`
     y `www.`) y cambiar los DNS donde estén registrados (hoy apuntan al hosting de WordPress). Antes, guardar una copia
     del WordPress (ya está archivado aquí, pero conviene que el hosting conserve la cuenta un mes).
   - Después del cambio: Google Search Console de cada dominio, enviar `sitemap.xml`, revisar que las URL viejas
     redirijan (`qa/funciones.py https://supermachirestaurante.com https://sanchorestaurantemiami.com`).
   - Actualizar el enlace de la web en Google Business Profile, Instagram y las apps de domicilio.
5. Opcional: un *deploy hook* diario para que la portada mueva sola los shows del día anterior al archivo (la web ya lo
   hace en el navegador; el hook lo deja también en el HTML).

## Comprobar un deploy

```bash
curl -sI https://<deploy>/ | grep -i -E "^HTTP|content-security|x-robots"
python3 qa/funciones.py https://<deploy-supermachi> https://<deploy-sancho>
```
