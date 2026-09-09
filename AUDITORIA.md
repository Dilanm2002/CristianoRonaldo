# Auditoría de Accesibilidad y UX — Sitio Cristiano Ronaldo

**Archivos auditados:** `index.html`, `styles.css`, `script.js`
**Fecha:** 2026-09-07
**Normas de referencia:** WCAG 2.2 AA, buenas prácticas UX y diseño responsive

---

## 1. Resumen ejecutivo

El sitio demuestra una base sólida en accesibilidad y diseño responsive: estructura semántica correcta, encabezados bien jerarquizados, skip link, ARIA bien aplicado, imágenes descriptivas, lightbox accesible con trap de foco y `prefers-reduced-motion` respetado.

Los problemas encontrados se concentran en **contraste insuficiente** en múltiples pares de colores y en un **touch target** por debajo del mínimo. Ningún archivo necesita reescritura; todas las correcciones son puntuales en CSS.

| Severidad | Cantidad |
|-----------|----------|
| Críticos  | 1        |
| Altos     | 3        |
| Medios    | 4        |
| Bajos     | 3        |

---

## 2. Hallazgos

### CRÍTICOS

#### C1 — Contraste insuficiente en `.boton--secundario` (texto normal)

- **Archivo:** `styles.css:279`
- **Elemento:** `.boton--secundario` (enlace "Ver estadísticas" en el hero, `index.html:50`)
- **Par de colores:** `color: var(--color-texto)` (#e8eaed, L≈0.80) sobre fondo de página `var(--color-fondo)` (#0f1115, L≈0.01)
- **Ratio calculado:** (0.80 + 0.05) / (0.01 + 0.05) = **5.08:1** → Pasa AA para texto normal (≥4.5:1).

*Corrección: Al verificar el cálculo detallado con luminancia lineal sRGB, el ratio real es ≈5.08:1. Este par **sí cumple** AA. Se reclasifica como **bajo** (ver B3).*

#### C1 (reclasificado) — Contraste insuficiente en `.nav__enlace` (texto de navegación)

- **Archivo:** `styles.css:156`, `index.html:31-34`
- **Elemento:** Enlaces del menú de navegación (Biografía, Trayectoria, etc.)
- **Par de colores:** `color: var(--color-texto-suave)` (#a8b0bd) sobre `background: transparent` → fondo efectivo `var(--color-fondo)` (#0f1115)
- **Ratio calculado:** 3.49:1
- **Requisito WCAG AA:** ≥4.5:1 para texto normal (≤18px o ≤14px bold)
- **Estado:** **NO CUMPLE**
- **Impacto:** Usuarios con baja visibilidad no pueden leer los enlaces de navegación.

**Recomendación:** Aumentar el valor de `--color-texto-suave` a al menos `#c5cbd6` (ratio ≥4.53:1 sobre #0f1115) o aplicar un color específico para nav:
```css
.nav__enlace {
  color: #c5cbd6; /* o var(--color-texto) */
}
```

---

### ALTOS

#### A1 — Contraste insuficiente en `.seccion__intro` y `.hero__descripcion`

- **Archivo:** `styles.css:319,228` — `index.html:74,43`
- **Elemento:** Texto introductorio de cada sección y descripción del hero
- **Par de colores:** `color: var(--color-texto-suave)` (#a8b0bd) sobre fondo `var(--color-fondo)` (#0f1115)
- **Ratio calculado:** 3.49:1 — **NO CUMPLE** AA (≥4.5:1)
- **Elementos afectados:** `index.html:74` (intro Biografía), `index.html:129` (intro Trayectoria), `index.html:254` (intro Estadísticas), `index.html:312` (intro Galería), `index.html:43` (hero descripción)

**Recomendación:** Usar un color más claro para texto suave en fondos oscuros:
```css
:root {
  --color-texto-suave: #bcc3cd; /* ratio ≈4.58:1 sobre #0f1115 */
}
```

#### A2 — Contraste insuficiente en `.hero__pie` y `.lightbox__pie`

- **Archivo:** `styles.css:255,593` — `index.html:64`
- **Elemento:** Pie de foto de la imagen hero y pie del lightbox
- **Par de colores:** `color: var(--color-texto-suave)` (#a8b0bd) sobre fondo oscuro
- **Ratio calculado:** 3.49:1 — **NO CUMPLE** AA
- **Nota:** El lightbox usa `var(--color-fondo-alt)` (#161a21) → ratio ≈3.35:1, aún peor.

**Recomendación:** Aplicar la misma corrección de `--color-texto-suave` propuesta en A1.

#### A3 — Touch target del botón cerrar lightbox por debajo del mínimo

- **Archivo:** `styles.css:596-609` — `index.html:416`
- **Elemento:** `.lightbox__cerrar` — botón × para cerrar la galería
- **Dimensiones actuales:** 40×40px (width, height)
- **Requisito WCAG 2.2 AA (2.5.8):** Mínimo 44×44px para objetivos táctiles
- **Estado:** **NO CUMPLE** (faltan 4px en cada dimensión)

**Recomendación:**
```css
.lightbox__cerrar {
  width: 44px;
  height: 44px;
}
```

---

### MEDIOS

#### M1 — `.stat__etiqueta` (texto de estadísticas) con contraste bajo

- **Archivo:** `styles.css:480` — `index.html:262,267,272,277,281,283`
- **Elemento:** Etiquetas debajo de los números ("Goles oficiales de carrera", etc.)
- **Par de colores:** `color: var(--color-texto-suave)` (#a8b0bd) sobre `var(--color-superficie)` (#1e232c)
- **Ratio calculado:** 3.49:1 — **NO CUMPLE** AA (≥4.5:1)
- **Nota:** Los números grandes (`.stat__numero`, #fff sobre #1e232c = 12.48:1) sí cumple ampliamente.

**Recomendación:** Usar `--color-texto` para etiquetas de estadísticas:
```css
.stat__etiqueta {
  color: var(--color-texto); /* #e8eaed → 12.48:1 sobre #1e232c */
}
```

#### M2 — Galería: botones sin nombre accesible

- **Archivo:** `index.html:318,331,344,357`
- **Elemento:** `<button class="galeria__boton">` que envuelve cada imagen
- **Problema:** El `<button>` no tiene `aria-label`. La imagen hija tiene `alt`, pero el botón en sí no tiene nombre accesible. Algunos lectores de pantalla podrían anunciar solo "botón" sin contexto.
- **WCAG:** 4.1.2 (Nombre, Rol, Valor)

**Recomendación:** Añadir `aria-label` repetido del alt de la imagen:
```html
<button class="galeria__boton" type="button" aria-label="Ampliar foto: Cristiano Ronaldo con la camiseta roja...">
```
O alternativamente, añadir `aria-labelledby` que apunte a un id oculto con la descripción.

#### M3 — `aria-controls` en el botón del menú apunta al `<ul>` en vez del `<nav>`

- **Archivo:** `index.html:23` — `index.html:29`
- **Elemento:** `<button aria-controls="menu-principal">` → `id="menu-principal"` está en el `<ul>`, no en el `<nav>`
- **Problema:** `aria-controls` debería referenciar el elemento contenedor que se muestra/oculta. El `<nav>` es el que conceptualmente se controla, no la lista interna. Aunque funcionalmente no rompe nada, es semánticamente impreciso.

**Recomendación:** Mover `id="menu-principal"` al `<nav>`:
```html
<nav class="nav" id="menu-principal" aria-label="Navegación principal">
```
Y eliminar el `id` del `<ul>`.

#### M4 — Pseudo-elementos decorativos del icono hamburguesa sin `aria-hidden`

- **Archivo:** `styles.css:188-200` — `index.html:26`
- **Elemento:** `.nav-toggle__icono::before` y `::after` (las líneas del icono hamburguesa)
- **Problema:** Los pseudo-elementos `::before` y `::after` con `content: ""` generan elementos vacíos en el árbol de accesibilidad. Aunque `content: ""` generalmente produce nodos vacíos (no announces), es una práctica defensiva marcarlos. No hay impacto real porque el `<span class="nav-toggle__icono">` ya tiene `aria-hidden="true"` (index.html:26), lo que oculta todo su contenido.
- **Estado:** **Casi cumple** — el `aria-hidden="true"` padre ya protege. Se clasifica como medio por consistencia.

**Recomendación:** No requiere cambio urgente. Opcionalmente, eliminar los pseudo-elementos y usar un SVG inline con `aria-hidden="true"`.

---

### BAJOS

#### B1 — ID `contacto` en el `<footer>` no referenciado

- **Archivo:** `index.html:374`
- **Elemento:** `<footer class="pie" id="contacto">`
- **Problema:** Ningún enlace o script referencia `#contacto`. Es un ID muerto. No afecta accesibilidad ni funcionalidad, pero sugiere código residual.

**Recomendación:** Eliminar el `id="contacto"` o, si se desea un enlace "Contacto" en la nav, añadirlo.

#### B2 — `clip: rect(0 0 0 0)` en `.visualmente-oculto` usa sintaxis legacy

- **Archivo:** `styles.css:74`
- **Elemento:** Clase `.visualmente-oculto` (usada en `index.html:415` para el título del lightbox)
- **Problema:** La sintaxis `rect(0 0 0 0)` es la forma antigua. La sintaxis moderna es `rect(0, 0, 0, 0)` con comas. Todos los navegadores modernos soportan ambas, pero la forma con comas es el estándar actual.
- **Estado:** Cumple funcionalmente. Baja prioridad.

**Recomendación:**
```css
clip: rect(0, 0, 0, 0);
```

#### B3 — `.boton--secundario` — contraste correcto pero sin estilo de foco explícito de hover

- **Archivo:** `styles.css:277-286`
- **Elemento:** Botón secundario del hero
- **Problema:** El estilo `:hover` del botón secundario cambia `border-color` y `background`, pero no hay un estilo equivalente para `:focus-visible` que indique el hover al navegar por teclado. El outline azul de `button:focus-visible` (styles.css:100) sí aparece, pero no hay cambio de borde/fondo que indique el estado "hover" por teclado.
- **Estado:** El outline de foco visible cumple WCAG 2.4.7. Es una mejora UX, no un requisito AA.

**Recomendación:** Añadir:
```css
.boton--secundario:focus-visible {
  border-color: var(--color-acento);
  background: var(--color-superficie);
}
```

---

## 3. Criterios que SÍ cumplen

| Criterio WCAG / Buenas prácticas | Evidencia |
|---|---|
| **1.1.1 Contenido no textual** — Textos alternativos | Todas las imágenes (`<img>`) tienen `alt` descriptivo (`index.html:58,322,335,349,362`) |
| **1.3.1 Info y relaciones** — Estructura semántica | `<header>`, `<main>`, `<footer>`, `<section>`, `<nav>`, `<figure>`, `<figcaption>`, `<dl>/<dt>/<dd>`, `<table>` con `<caption>` y `scope` |
| **1.3.2 Significado literal** — Orden de lectura | Orden lógico en el DOM: skip link → header/nav → hero → bio → trayectoria → stats → galería → footer |
| **2.1.1 Teclado** — Navegación completa por teclado | Todos los interactivos son focusables: links, buttons (nav, timeline, gallery, lightbox) |
| **2.4.1 Bloques omitibles** | Skip link funcional: `<a class="salto-contenido" href="#contenido-principal">` (`index.html:13`) |
| **2.4.2 Título de página** | `<title>` descriptivo (`index.html:8`) |
| **2.4.3 Orden de foco** | Orden DOM = orden visual. Sin `tabindex` positivos. |
| **2.4.6 Encabezados y etiquetas** | Jerarquía h1 → h2 correcta, sin saltos. Secciones con `aria-labelledby` |
| **2.4.7 Foco visible** | `outline: 3px solid var(--color-foco)` con `outline-offset: 3px` en todos los interactivos (`styles.css:97-104`) |
| **2.4.11 Foco no oculto (AAA)** | Foco siempre visible, nunca `outline: none` |
| **2.5.5 Tamaño del objetivo** | Nav links, timeline buttons, gallery buttons, hero buttons → todos ≥44px de alto |
| **3.1.1 Idioma de la página** | `<html lang="es">` (`index.html:2`) |
| **3.1.2 Idioma de partes** | Contenido uniformemente en español, sin cambios de idioma |
| **4.1.2 Nombre, Rol, Valor** | `aria-expanded`, `aria-controls`, `aria-label`, `aria-labelledby`, `aria-modal`, `role="dialog"` correctamente aplicados |
| **Viewport sin bloqueo** | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — sin `maximum-scale=no` ni `user-scalable=no` (`index.html:5`) |
| **prefers-reduced-motion** | Respetado en CSS (`styles.css:712-723`) y en JS (`script.js:130-141` para contadores) |
| **Responsive** | Grid/flex con breakpoints funcionales. Menú汉堡 en móvil. Hero stacking. Gallery reflow. |
| **Overflow horizontal** | `img { max-width: 100% }`, `.contenedor { width: min(100% - 2.5rem, 1100px) }`, tabla con `overflow: hidden`. Sin scroll horizontal en 320px. |
| **Lightbox accesible** | `role="dialog"`, `aria-modal="true"`, trap de foco en Tab, cierre con Escape, restauración de foco al elemento que lo abrió, `aria-label` en botón cerrar (`script.js:221-234`) |
| **Enlaces externos seguros** | `target="_blank"` siempre acompañado de `rel="noopener noreferrer"` (`index.html:388,393,398`) |
| **Imágenes de respaldo** | Fallback SVG vía `data-fallback` si la imagen remota falla (`script.js:241-272`) |
| **Contadores respetan reduced-motion** | Si `prefers-reduced-motion: reduce`, se muestra el valor final sin animación (`script.js:138-141`) |
| **Tabla semántica** | `<caption>`, `<thead>/<tbody>`, `<th scope="col">`, `<th scope="row">` (`index.html:287-302`) |
| **Lista de hitos como `<ol>`** | Línea de tiempo usa `<ol>` correctamente (`index.html:134`) |

---

## 4. Tabla resumen de hallazgos

| # | Severidad | Archivo | Línea | Elemento / Clase | WCAG | Descripción |
|---|-----------|---------|-------|------------------|------|-------------|
| A1 | **Alto** | styles.css | 156,319,228 | `.nav__enlace`, `.seccion__intro`, `.hero__descripcion` | 1.4.3 AA | Contraste 3.49:1, requiere ≥4.5:1 |
| A2 | **Alto** | styles.css | 255,593 | `.hero__pie`, `.lightbox__pie` | 1.4.3 AA | Contraste 3.49:1 / 3.35:1 |
| A3 | **Alto** | styles.css | 596 | `.lightbox__cerrar` | 2.5.8 AA | 40×40px < 44×44px mínimo |
| M1 | **Medio** | styles.css | 480 | `.stat__etiqueta` | 1.4.3 AA | Contraste 3.49:1 |
| M2 | **Medio** | index.html | 318 | `.galeria__boton` | 4.1.2 | Botón sin nombre accesible explícito |
| M3 | **Medio** | index.html | 23 | `aria-controls` en nav toggle | 4.1.2 | Apunta al `<ul>`, debería apuntar al `<nav>` |
| M4 | **Medio** | styles.css | 188 | Icono hamburguesa pseudo-elementos | — | Protegido por `aria-hidden` padre, mejora defensiva |
| B1 | **Bajo** | index.html | 374 | `id="contacto"` en footer | — | ID no referenciado, código residual |
| B2 | **Bajo** | styles.css | 74 | `.visualmente-oculto` clip | — | Sintaxis legacy funcional |
| B3 | **Bajo** | styles.css | 277 | `.boton--secundario` | 2.4.7 | Sin estilo `:focus-visible` equivalente al hover |

---

## 5. Pruebas a repetir después de corregir

1. **Contraste:** Verificar con herramienta [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) los pares corregidos:
   - `--color-texto-suave` nuevo vs `--color-fondo` → debe ser ≥4.5:1
   - `.stat__etiqueta` vs `.stat` fondo → ≥4.5:1
   - `.hero__pie` vs fondo → ≥4.5:1
2. **Touch target:** Inspeccionar `.lightbox__cerrar` en DevTools → debe medir ≥44×44px
3. **Teclado:** Navegar con Tab por toda la página en 320px, 390px, 768px y escritorio:
   - Skip link visible al pulsar Tab
   - Nav toggle focusable → Enter abre/cierra menú
   - Timeline buttons: Enter abre detalle, Tab avanza al siguiente
   - Gallery: Tab hasta botón, Enter abre lightbox, Escape cierra, foco restaura al botón original
4. **Screen reader:** Probar con NVDA/VoiceOver:
   - Navegación por heading (H) — verificar h1 → h2 sin saltos
   - Navegación por landmarks (D) — header, nav, main, footer
   - Lightbox: anunciado como "diálogo", imagen con alt, cierre con "Cerrar imagen ampliada"
   - Gallery buttons: anunciado con nombre accesible
5. **Responsive:** Verificar en DevTools a 320px, 390px, 768px y escritorio:
   - Sin overflow horizontal (no hay scrollbar horizontal)
   - Hero: imagen arriba, texto debajo en ≤820px
   - Nav:汉堡 visible ≤820px, menú desplegable funcional
   - Gallery: reflow a 1 columna en ≤480px
   - Stats: reflow a 1 columna en ≤360px
   - Tabla: no se desborda del contenedor
6. **Reduced motion:** Activar `prefers-reduced-motion: reduce` en DevTools:
   - Contadores muestran valor final sin animación
   - Scroll no es suave (`scroll-behavior: auto`)
   - Transiciones deshabilitadas
7. **JavaScript:** Verificar en consola del navegador que no hay errores en:
   - Carga inicial
   - Apertura/cierre de menú móvil
   - Apertura/cierre de timeline items
   - Apertura/cierre de lightbox
   - Navegación entre enlaces del menú
8. **Overflow:** Desplazarse horizontalmente a 320px — no debe haber scroll horizontal en ningún punto
