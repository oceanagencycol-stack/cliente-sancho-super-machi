# DESIGN.md — dos casas, un motor

Las dos webs comparten motor (`web/`) y nada más: cada una tiene su idea rectora, su paleta, su tipografía y una sola
firma. Si se le cambia el logo a una y sirve para la otra, está mal.

## El Mesón de Súper Machi — la casa de los eventos

**Idea rectora.** *La cartelera del mesón: una pared de ladrillo donde cada noche se anuncia en grande, y la mesa se
aparta en un toque.* Sale de lo que ya es Súper Machi: fachada y salón de ladrillo, un show casi cada viernes y sábado,
flyers con la fecha en una caja grande, y el plano de la sala (escenario, Salón VIP, Salón 1, Salón 2, barra).

**Firma: la pared de carteles.** Los flyers de los shows pegados en una pared en aparejo de ladrillo (las columnas
alternas bajan medio cartel, con juntas de 1 px). Los próximos van a color con su sello de fecha; los que ya pasaron
siguen en la pared, apagados y con «Ya pasó»: la prueba de que aquí hay show de verdad. Todo lo demás queda quieto.

**Paleta** (noche de ladrillo; nunca negro plano):

| Token | Hex | Por qué |
|---|---|---|
| `--noche` | `#150D0B` | el salón de noche: negro con el rojo del ladrillo |
| `--muro` | `#22130F` | ladrillo en sombra (superficies) |
| `--junta` | `#3B241C` | la junta del ladrillo: líneas de 1 px |
| `--crema` | `#F2E6D0` | el crema de sus cartas impresas (texto) |
| `--humo` | `#B9A592` | texto secundario |
| `--rojo` | `#BC2D27` | el rojo de la marca: sellos y la acción principal (crema encima: 4,8:1) |
| `--brasa` | `#F7922B` | la llama del logo: solo «esta noche», «abierto ahora» y el foco |

**Tipografía.** *Machi Display* (Big Shoulders Display 600–900): fechas, artistas y títulos, en mayúsculas, como la
caja de fecha de sus flyers. *Machi Text* (Instrument Sans 400–700): todo lo demás. Precios con cifras tabulares.

**Diales.** Variancia 6 · Motion 6 · Densidad 5. Motion subió de 4 a 6 el 2-nov-2026 (Juan: «hazlas un poquito
inmersivas»). La inmersión sale de la firma; no se suma otra:
- **La noche frente al mesón.** En la portada, el ladrillo apenas se ve detrás del texto y arriba a la derecha está la luz
  cálida del escenario.
- **Se prueban las luces.** Los carteles se pegan una vez al cargar, con 60 ms entre uno y otro. Después, un barrido
  enciende una vez, en orden, cada cartel apagado.
- **La luz del escenario.** En el teléfono, el cartel apagado que cruza el centro de la pantalla recupera el color (una
  franja fina, con `IntersectionObserver`). Con ratón, la luz es el puntero: una luz cálida lo sigue y el cartel de
  debajo se enciende.
- **Del muro al show.** El cartel que se toca se vuelve el flyer de la página del show (View Transitions entre
  documentos), y ese flyer tiñe la página con un aura difusa.
- **Las fotos se acercan** al entrar en pantalla, con una animación por scroll que es solo CSS.

Con movimiento reducido no hay barrido, ni transiciones, ni fotos que se acercan. La franja de luz sigue: es un cambio
de color, no de movimiento.

## Sancho — cocina española de calidad al mejor precio

**Idea rectora.** *El sol de Miró sobre la Calle Ocho: cada día de la semana sale con su plato y su precio, dicho sin
vergüenza.* Sale del logo (un sol a lo Miró: disco rojo, anillo negro, anillo amarillo, estrella) y de su agenda fija
(lunes de paella, martes de vino, miércoles de tapas, happy hour).

**Firma: el sol de la semana.** El sol del logo se vuelve el reloj de la semana en la portada: los siete días alrededor,
la estrella marca hoy y el disco rojo dice la promo de hoy con su precio grande. Se toca otro día y el sol gira hasta él.
Hoy se calcula con la hora de Miami.

**Paleta** (lienzo de Miró: blanco, tinta y dos colores puros):

| Token | Hex | Por qué |
|---|---|---|
| `--tinta` | `#0F0B0A` | el negro del logo: cabecera, sol y pie |
| `--papel` | `#FFFDF8` | el lienzo (contenido) |
| `--rojo` | `#CB282A` | el rojo del logo: precios y la acción principal (AA sobre papel) |
| `--sol` | `#F0E83D` | el amarillo del logo: solo formas y fondo de botón con tinta encima, nunca texto sobre blanco |
| `--gris` | `#5E5450` | texto secundario |
| `--linea` | `#E9E1D6` | líneas de 1 px |

**Tipografía.** *Sancho Display* (Archivo expandida al 125 %, 700–900): precios y títulos, el precio sin vergüenza.
*Sancho Text* (Archivo 400–700): todo lo demás. Una familia, dos anchos.

**Diales.** Variancia 6 · Motion 6 · Densidad 5. Motion subió de 4 a 6 el 2-nov-2026. El sol gira hasta hoy una vez al
cargar y gira de un día a otro cuando se tocan. La inmersión vive alrededor de la firma:
- **El cielo de Miró.** Entre los días hay astros chicos: estrellas, puntos, una luna y una constelación, en los colores
  del logo. Están en tres capas que se mueven distinto con el scroll (solo CSS). Con ratón, también se mueven con el
  puntero, y el sol se inclina un poco hacia él (como mucho 6°).
- **El halo.** El sol tiene un resplandor amarillo que late una vez cuando llega a hoy y cada vez que se toca otro día.
  El texto del día nuevo entra con un fundido corto; lo que ya se veía al cargar no parpadea.
- **Las fotos se acercan** al entrar en pantalla.

Con movimiento reducido, el sol salta sin girar y el cielo y el halo se quedan quietos.

## Común

- Teléfono primero (la gente llega de Instagram, WhatsApp y Google Maps): barra de acciones abajo en el teléfono
  (reservar, llamar, cómo llegar, menú), botones de 48 px, foco visible.
- El menú es HTML: buscador, secciones, «Mi comanda» (se anota lo que se va a pedir y se le enseña al mesero, sin cobro:
  la idea del producto menu-digital de Ocean) y el aviso de crudos.
- Español en `/` e inglés en `/en/`; los nombres de los platos se quedan en español.
- Nada inventado: lo que está por confirmar lo dice el banner de vista previa y `data/fuentes.json`.
- **De una página a otra no hay corte.** Se usan View Transitions entre documentos (`@view-transition` en `base.css`): la
  cabecera y la barra de acciones se quedan quietas y el contenido entra con un fundido de 0,42 s. En un navegador sin
  soporte, se navega como siempre.
- **Reglas de oficio del movimiento:**
  - Lo que se mueve usa solo `transform`, `translate`, `rotate`, `opacity` y `filter`.
  - En reposo no se pide ningún cuadro: los bucles del puntero se detienen al llegar.
  - Lo decorativo va con `aria-hidden`.
  - Todo respeta `prefers-reduced-motion`.
  - Las animaciones por scroll van dentro de `@supports (animation-timeline: …)`.
