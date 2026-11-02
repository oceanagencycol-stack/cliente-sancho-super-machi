# Sancho · Súper Machi — webs nuevas

Repo de Ocean Industries para rehacer desde cero las webs de **Sancho Restaurant Miami** y **El Mesón de Súper Machi**
(propuesta OI-PR-2026-SM). Primero se archivó todo lo que tenían publicado; sobre eso se construyen las webs nuevas.

## Qué hay

| Carpeta | Qué es |
|---|---|
| `archivo/<sitio>/` | Cada web vieja tal como estaba el 2026-11-02: HTML de cada página, la API pública de WordPress (páginas, entradas, biblioteca de medios; en Súper Machi también la tienda WooCommerce) y su `robots.txt`. No se edita. |
| `media/<sitio>/originales/` | Los originales de su biblioteca de medios y los PDF del menú (Git LFS). |
| `data/<sitio>/` | Lo extraído en limpio: `paginas.json` (textos, encabezados, imágenes, enlaces, teléfonos), `medios.json` (inventario) y `estados.json` (código HTTP de cada URL). |
| `data/fuentes.json` | Cada dato de los restaurantes con su fuente y fecha; lo contradictorio, en `por_confirmar`. |
| `tools/extraer.py` | La extracción, reproducible: `python3 tools/extraer.py [sancho\|supermachi] [--sin-medios]`. |

## Comandos

```bash
python3 tools/extraer.py --sin-medios   # vuelve a archivar las páginas y la API (sin bajar medios)
git lfs pull                            # trae los originales (si el clon vino solo con punteros)
```
