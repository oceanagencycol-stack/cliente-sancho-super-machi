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

**Diales.** Variancia 6 · Motion 4 · Densidad 5. Movimiento: en la portada los carteles se pegan una vez al cargar (60 ms
entre uno y otro); hover y foco. Con movimiento reducido, nada se mueve.

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

**Diales.** Variancia 6 · Motion 4 · Densidad 5. Movimiento: el sol gira hasta hoy al cargar (una vez, 700 ms) y entre
días al tocarlos. Con movimiento reducido, salta sin girar.

## Común

- Teléfono primero (la gente llega de Instagram, WhatsApp y Google Maps): barra de acciones abajo en el teléfono
  (reservar, llamar, cómo llegar, menú), botones de 48 px, foco visible.
- El menú es HTML: buscador, secciones, «Mi comanda» (se anota lo que se va a pedir y se le enseña al mesero, sin cobro:
  la idea del producto menu-digital de Ocean) y el aviso de crudos.
- Español en `/` e inglés en `/en/`; los nombres de los platos se quedan en español.
- Nada inventado: lo que está por confirmar lo dice el banner de vista previa y `data/fuentes.json`.
