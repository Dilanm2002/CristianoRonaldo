/* ============================================================
   Cristiano Ronaldo - Sitio estático
   JavaScript vanilla (sin dependencias).
   Funcionalidades:
     1. Menú de navegación en móvil (abrir / cerrar).
     2. Resaltado del enlace activo según la sección visible.
     3. Línea de tiempo interactiva (desplegar / plegar detalles).
     4. Contadores animados de estadísticas.
     5. Lightbox accesible para la galería.
     6. Imagen de respaldo si una foto remota no carga.
   ============================================================ */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenuMovil();
  inicializarEnlaceActivo();
  inicializarTimeline();
  inicializarContadores();
  inicializarGaleria();
  inicializarImagenesDeRespaldo();
});

/* ------------------------------------------------------------
   1. Menú de navegación en móvil
   ------------------------------------------------------------ */
function inicializarMenuMovil() {
  const boton = document.querySelector(".nav-toggle");
  const lista = document.querySelector(".nav__lista");

  if (!boton || !lista) return;

  boton.addEventListener("click", () => {
    const abierto = lista.classList.toggle("abierto");
    boton.setAttribute("aria-expanded", String(abierto));
  });

  // Al pulsar un enlace del menú, se cierra (útil en móvil).
  lista.addEventListener("click", (evento) => {
    if (evento.target.classList.contains("nav__enlace")) {
      lista.classList.remove("abierto");
      boton.setAttribute("aria-expanded", "false");
    }
  });
}

/* ------------------------------------------------------------
   2. Resaltado del enlace de navegación activo
   Usa IntersectionObserver para saber qué sección se ve.
   ------------------------------------------------------------ */
function inicializarEnlaceActivo() {
  const enlaces = Array.from(document.querySelectorAll(".nav__enlace"));
  if (enlaces.length === 0) return;

  const secciones = enlaces
    .map((enlace) => {
      const id = enlace.getAttribute("href").replace("#", "");
      return document.getElementById(id);
    })
    .filter((seccion) => seccion !== null);

  const marcarActivo = (id) => {
    enlaces.forEach((enlace) => {
      const coincide = enlace.getAttribute("href") === `#${id}`;
      enlace.classList.toggle("activo", coincide);
    });
  };

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          marcarActivo(entrada.target.id);
        }
      });
    },
    {
      // La sección se considera activa cuando su parte superior
      // cruza el 40% superior de la ventana.
      rootMargin: "-40% 0px -55% 0px",
      threshold: 0,
    }
  );

  secciones.forEach((seccion) => observador.observe(seccion));
}

/* ------------------------------------------------------------
   3. Línea de tiempo interactiva
   Cada botón abre / cierra su panel de detalle.
   ------------------------------------------------------------ */
function inicializarTimeline() {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;

  const cabeceras = timeline.querySelectorAll(".timeline__cabecera");

  cabeceras.forEach((cabecera) => {
    const detalle = cabecera.nextElementSibling;
    if (!detalle) return;

    cabecera.addEventListener("click", () => {
      const estaAbierto = cabecera.getAttribute("aria-expanded") === "true";
      cerrarTodos(cabeceras);

      if (!estaAbierto) {
        cabecera.setAttribute("aria-expanded", "true");
        detalle.hidden = false;
      }
    });
  });

  function cerrarTodos(lista) {
    lista.forEach((cabecera) => {
      cabecera.setAttribute("aria-expanded", "false");
      const detalle = cabecera.nextElementSibling;
      if (detalle) detalle.hidden = true;
    });
  }
}

/* ------------------------------------------------------------
   4. Contadores animados de estadísticas
   Se activan cuando la sección entra en pantalla.
   ------------------------------------------------------------ */
function inicializarContadores() {
  const numeros = Array.from(document.querySelectorAll(".stat__numero"));
  if (numeros.length === 0) return;

  const prefiereMenosMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const animarNumero = (elemento) => {
    const objetivo = Number(elemento.dataset.objetivo) || 0;

    // Si el usuario prefiere menos movimiento, se muestra el valor final.
    if (prefiereMenosMovimiento) {
      elemento.textContent = objetivo.toLocaleString("es-ES");
      return;
    }

    const duracion = 1400; // milisegundos
    const inicio = performance.now();

    const paso = (ahora) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      // Curva de suavizado (easeOutCubic).
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      const valor = Math.round(objetivo * suavizado);
      elemento.textContent = valor.toLocaleString("es-ES");

      if (progreso < 1) {
        requestAnimationFrame(paso);
      }
    };

    requestAnimationFrame(paso);
  };

  const observador = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          animarNumero(entrada.target);
          obs.unobserve(entrada.target); // se anima una sola vez
        }
      });
    },
    { threshold: 0.6 }
  );

  numeros.forEach((numero) => observador.observe(numero));
}

/* ------------------------------------------------------------
   5. Lightbox accesible para la galería
   ------------------------------------------------------------ */
function inicializarGaleria() {
  const galeria = document.getElementById("galeria-lista");
  const lightbox = document.getElementById("lightbox");
  if (!galeria || !lightbox) return;

  const imagenGrande = document.getElementById("lightbox-imagen");
  const pie = document.getElementById("lightbox-pie");
  const botonCerrar = lightbox.querySelector(".lightbox__cerrar");

  let elementoQueAbrio = null;

  const abrir = (imagen) => {
    imagenGrande.src = imagen.currentSrc || imagen.src;
    imagenGrande.alt = imagen.alt;
    pie.textContent = imagen.alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    botonCerrar.focus();
  };

  const cerrar = () => {
    lightbox.hidden = true;
    imagenGrande.src = "";
    document.body.style.overflow = "";
    if (elementoQueAbrio) elementoQueAbrio.focus();
  };

  galeria.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".galeria__boton");
    if (!boton) return;
    elementoQueAbrio = boton;
    const imagen = boton.querySelector("img");
    if (imagen) abrir(imagen);
  });

  botonCerrar.addEventListener("click", cerrar);

  // Clic fuera del contenido cierra el lightbox.
  lightbox.addEventListener("click", (evento) => {
    if (evento.target === lightbox) cerrar();
  });

  // Tecla Escape cierra; Tab queda atrapado dentro del diálogo.
  document.addEventListener("keydown", (evento) => {
    if (lightbox.hidden) return;

    if (evento.key === "Escape") {
      cerrar();
    }

    if (evento.key === "Tab") {
      // Solo hay un elemento enfocable (el botón cerrar): lo mantenemos.
      evento.preventDefault();
      botonCerrar.focus();
    }
  });
}

/* ------------------------------------------------------------
   6. Imagen de respaldo (SVG) si una foto remota falla
   Evita que la galería quede rota sin conexión.
   ------------------------------------------------------------ */
function inicializarImagenesDeRespaldo() {
  const colores = {
    cr7: "#d81f2a",
    madrid: "#3d5afe",
    alnassr: "#f2c14e",
  };

  const crearSvg = (texto, color) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="500" height="333">
        <rect width="100%" height="100%" fill="#1e232c"/>
        <rect width="100%" height="6" fill="${color}"/>
        <text x="50%" y="50%" fill="#e8eaed" font-family="Segoe UI, sans-serif"
              font-size="22" text-anchor="middle" dominant-baseline="middle">
          ${texto}
        </text>
      </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  };

  document.querySelectorAll("img[data-fallback]").forEach((imagen) => {
    imagen.addEventListener(
      "error",
      () => {
        const clave = imagen.dataset.fallback;
        const color = colores[clave] || "#d81f2a";
        imagen.src = crearSvg("Imagen no disponible", color);
      },
      { once: true }
    );
  });
}
