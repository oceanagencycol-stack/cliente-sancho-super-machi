# DESIGN.md — dos casas, un motor

Las dos webs comparten motor (`web/`) y nada más: cada una tiene su idea rectora, su paleta, su tipografía y una sola
firma. Si se le cambia el logo a una y sirve para la otra, está mal.

## La comida manda (2-nov-2026)

Juan, al ver la primera versión: «La idea es que la comida sea lo principal y que las personas tan solo con entrar les dé
hambre […] las webs se ven muy robóticas y estáticas». Desde ese día las dos webs abren con comida y la comida es lo que
se mueve:

- **Al entrar, un plato en movimiento a toda la pantalla.** Súper Machi abre con la cocina en video; Sancho, con el plato
  del día detrás del sol (el lunes, la paella en video). Los videos son de los propios restaurantes (`web/tools/videos.py`).
- **Cada página interior abre con un plato a todo lo ancho** y el título encima (`cabezaPlato` en `web/lib/comp.mjs`):
  el jamón en «La semana», el bistec en el menú de Sancho, el tomahawk en el de Súper Machi, el buffet en video en
  «Almuerzo», etc.
- **Los platos con su precio, en grande.** Súper Machi: «Lo que se pide en la casa», seis platos con foto y el precio del
  menú en un sello. Sancho: «De la cocina de Sancho» en mosaico y la semana en un carril de fotos con el precio en un sol.
  El menú de Súper Machi lleva foto en los platos que la tienen (10 hoy).
- **Lo quieto se mueve un poco:** las fotos de comida se acercan mientras pasan por la pantalla (solo CSS, con `scale` para
  sumarse al acercamiento del `:hover`), las listas de platos se destapan en orden al llegar y la cinta de Súper Machi pasa
  los nombres de los platos.
- **Nada inventado ni de banco:** solo fotos y videos del restaurante; nada generado con IA que muestre un plato.
  `Drink-Wine.mp4` y `drink.mp4` (de la plantilla vieja) no se usan. Cada foto dice qué plato es solo si lo es.

## El Mesón de Súper Machi — la casa de los eventos

**Idea rectora.** *Fuego en la cocina, show en la sala.* Primero la comida que sale de su cocina (cochinillo segoviano,
carnes a la brasa, cola de langosta, pulpo); después, la noche de show casi cada viernes y sábado. Sale de lo que ya es
Súper Machi: ladrillo, brasa, flyers con la fecha en una caja grande y el plano de la sala.

**Firma: la escena de la cocina.** La portada es un video de su cocina a toda la pantalla (carnes a la brasa → cola de
langosta → cochinillo → pulpo) y un letrero abajo dice qué plato se ve, con el nombre del menú (`data-tramos`, sincronizado
con el video). Los shows siguen con la **pared de carteles** (los flyers en aparejo de ladrillo; los pasados, apagados con
«Ya pasó») y su luz de escenario, ya como segunda escena de la portada y en la cartelera.

**Paleta** (noche de ladrillo; nunca negro plano):

| Token | Hex | Por qué |
|---|---|---|
| `--noche` | `#150D0B` | el salón de noche: negro con el rojo del ladrillo |
| `--muro` | `#22130F` | ladrillo en sombra (superficies) |
| `--junta` | `#3B241C` | la junta del ladrillo: líneas de 1 px |
| `--crema` | `#F2E6D0` | el crema de sus cartas impresas (texto) |
| `--humo` | `#B9A592` | texto secundario |
| `--rojo` | `#BC2D27` | el rojo de la marca: sellos de precio y la acción principal (crema encima: 4,8:1) |
| `--brasa` | `#F7922B` | la llama del logo: solo «esta noche», «abierto ahora», el «show» del titular y el foco |

**Tipografía.** *Machi Serif* (Fraunces con el eje SOFT al 100, 600–800, y su itálica): titulares y nombres de platos,
cálidos como una carta de mesón. *Machi Display* (Big Shoulders Display 600–900): fechas, artistas de los flyers, sellos
y precios. *Machi Text* (Instrument Sans 400–700): todo lo demás. Precios con cifras tabulares.

**Diales.** Variancia 6 · Motion 7 · Densidad 5. El movimiento es la comida (el video y las fotos que se acercan); el resto
queda quieto. Sobre la pared siguen: los carteles se pegan una vez al cargar, un barrido enciende una vez cada cartel
apagado, en el teléfono se enciende el que cruza el centro de la pantalla y con ratón la luz es el puntero; el cartel que se
toca se vuelve el flyer de la página del show (View Transitions) y tiñe la página con un aura. Un grano de película muy
suave cubre la página (decorativo). Con movimiento reducido no corre ningún video (queda el póster) ni hay barrido.

## Sancho — cocina española de calidad al mejor precio

**Idea rectora.** *El sol de Miró sobre la Calle Ocho: cada día de la semana sale con su plato y su precio, dicho sin
vergüenza.* Sale del logo (un sol a lo Miró: disco rojo, anillo negro, anillo amarillo, estrella) y de su agenda fija
(lunes de paella, martes de vino, miércoles de tapas, happy hour).

**Firma: el sol elige el plato.** El sol del logo es el reloj de la semana: los siete días alrededor, la estrella marca hoy
y el disco rojo dice la promo de hoy con su precio. Detrás, a pantalla completa, el plato de ese día (el lunes la paella
en video; martes la sangría, miércoles las tapas, jueves los calamares, viernes la carne, sábado el cochinillo, domingo
la mesa de paellas). Se toca otro día y el sol gira hasta él, el halo late y el plato nuevo entra con un fundido cuando su
foto ya llegó. Hoy se calcula con la hora de Miami; el script de arranque pide primero la foto de hoy (es el LCP).

**Paleta** (lienzo de Miró: blanco, tinta y dos colores puros):

| Token | Hex | Por qué |
|---|---|---|
| `--tinta` | `#0F0B0A` | el negro del logo: cabecera, la portada, el fuego y el pie |
| `--papel` | `#FFFDF8` | el lienzo (contenido) |
| `--rojo` | `#CB282A` | el rojo del logo: precios, sellos y la acción principal (AA sobre papel) |
| `--sol` | `#F0E83D` | el amarillo del logo: formas, «¡hoy!» y botones con tinta encima, nunca texto sobre blanco |
| `--gris` | `#5E5450` | texto secundario |
| `--linea` | `#E9E1D6` | líneas de 1 px |

**Tipografía.** *Sancho Display* (Archivo expandida al 125 %, 700–900): precios y títulos, el precio sin vergüenza.
*Sancho Text* (Archivo 400–700): todo lo demás. *Sancho Mano* (Caveat 600): lo escrito a mano sobre la comida
(«¡hoy!», el día sobre cada foto de la semana, «¡el famoso!» con su flecha junto al cochinillo).

**Diales.** Variancia 6 · Motion 7 · Densidad 5. El sol gira hasta hoy una vez al cargar y de un día a otro cuando se
tocan; con ratón se inclina un poco hacia el puntero (como mucho 6°). La banda «Con fuego de verdad» es la cocina en video
a todo lo ancho (el sartén, la llama y el plato servido). El cielo de astros del 2-nov se quitó: ahora el fondo es el plato.
Con movimiento reducido, el sol salta sin girar, el halo no late y no corre ningún video.

## Común

- Teléfono primero (la gente llega de Instagram, WhatsApp y Google Maps): barra de acciones abajo en el teléfono
  (reservar o pedir, llamar, cómo llegar, menú), botones de 48 px, foco visible. En el teléfono, el sol entero (con sus
  siete días) cabe en la primera pantalla por encima de la barra (375 × 667 en adelante).
- **Videos de comida** (`web/tools/videos.py`, de los videos propios en `media/<sitio>/originales/`): escritorio 1920×1080
  (la resolución de los originales), teléfono 720×1080 (recorte vertical; un corte puede acercarse con `zoom` e `y`), en
  MP4 H.264 y WebM VP9 desde un intermedio sin pérdida, con póster AVIF/WebP. El póster se pinta con la página (es el LCP);
  el video se pide después del `load`, solo cuando se va a ver, nunca con movimiento reducido ni ahorro de datos; se pausa
  fuera de pantalla y con la pestaña oculta, y siempre tiene botón de pausa (WCAG 2.2.2).
- El menú es HTML: buscador, secciones, «Mi comanda» (se anota lo que se va a pedir y se le enseña al mesero, sin cobro)
  y el aviso de crudos. Los platos con foto la muestran en cuadrado, y se acerca al pasar el ratón.
- Español en `/` e inglés en `/en/`; los nombres de los platos se quedan en español.
- Nada inventado: lo que está por confirmar lo dice el banner de vista previa y `data/fuentes.json`.
- **De una página a otra no hay corte** (View Transitions entre documentos): la cabecera y la barra de acciones se quedan
  quietas y el contenido entra con un fundido de 0,42 s. En un navegador sin soporte, se navega como siempre.
- **Reglas de oficio del movimiento:**
  - Lo que se mueve usa solo `transform`, `scale`, `translate`, `rotate`, `opacity` y `filter`.
  - En reposo no se pide ningún cuadro: los bucles del puntero se detienen al llegar; los videos se detienen fuera de
    pantalla.
  - Lo decorativo va con `aria-hidden`; lo escrito a mano sobre una foto lleva una sombra debajo para leerse en cualquier foto.
  - Todo respeta `prefers-reduced-motion`.
  - Las animaciones por scroll van dentro de `@supports (animation-timeline: …)`.
