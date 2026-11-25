# *BOHEMIAN · web

Sitio de *BOHEMIAN: inmobiliaria, marketing y tecnología para propiedades.

**En vivo:** https://bohemian-ruby.vercel.app

| Página | Ruta |
|---|---|
| Landing | `/` |
| Casa de campo (recorrido 360 con dron, galería, ficha, ubicación) | `/casa-de-campo/` |
| Demo de mapa de lotes con cotizador | `/lotes/` |
| Aviso de privacidad | `/privacidad/` |

## Stack

- Vite multipágina + TypeScript, sin framework.
- GSAP (ScrollTrigger, SplitText) + Lenis para el movimiento.
- Photo Sphere Viewer para los 360 y MapLibre GL para los mapas.
- Capa visual «Sahara»: `src/sahara.css` (colores de marca con fondos arena clara y blanco hueso, tipografía Forum en mayúsculas como el logotipo) y `src/ornamentos.ts` (sol, órbitas, estrella de 8 puntas, dunas y constelaciones en SVG que se dibujan al hacer scroll).

## Desarrollo

```bash
npm install
npm run dev
```

Los formularios envían los contactos al CRM si se define `VITE_CRM_API` en un `.env.production` (no se incluye en el repositorio).
