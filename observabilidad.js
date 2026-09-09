/* ============================================================
   CR7 Observability - Observabilidad 100% local
   ------------------------------------------------------------
   - No hay backend, ni servicios externos, ni envío de datos.
   - Todo se guarda en localStorage bajo el prefijo "cr7-observability".
   - Se instrumenta sola cualquier página que la incluya.
   - Si la página contiene el panel (#panel-observabilidad), también
     activa el dashboard.
   - Compatible: cada API del navegador se comprueba antes de usarla.
   ============================================================ */

/* ------------------------------------------------------------
   BLOQUE 1 · Núcleo de instrumentación + API pública
   ------------------------------------------------------------ */
(function () {
  "use strict";

  var PREFIJO = "cr7-observability";
  var CLAVE = PREFIJO + ":store";
  var MAX_EVENTOS = 500;
  var VERSION = 1;

  /* ---- Almacenamiento seguro (con respaldo en memoria) ---- */
  function storageDisponible() {
    try {
      var prueba = PREFIJO + ":test";
      window.localStorage.setItem(prueba, "1");
      window.localStorage.removeItem(prueba);
      return true;
    } catch (error) {
      return false;
    }
  }

  var HAY_STORAGE = storageDisponible();
  var memoria = null; // se usa solo si localStorage no está disponible

  function clonar(objeto) {
    try {
      return JSON.parse(JSON.stringify(objeto));
    } catch (error) {
      return objeto;
    }
  }

  function nuevoStore() {
    var ahora = new Date().toISOString();
    return {
      version: VERSION,
      prefijo: PREFIJO,
      primeraVez: ahora,
      actualizado: ahora,
      entorno: null,
      rendimiento: null,
      eventos: []
    };
  }

  function leerStore() {
    if (!HAY_STORAGE) {
      return memoria ? clonar(memoria) : nuevoStore();
    }
    try {
      var crudo = window.localStorage.getItem(CLAVE);
      if (!crudo) return nuevoStore();
      var datos = JSON.parse(crudo);
      if (!datos || typeof datos !== "object") return nuevoStore();
      if (!Array.isArray(datos.eventos)) datos.eventos = [];
      if (typeof datos.version !== "number") datos.version = VERSION;
      return datos;
    } catch (error) {
      return nuevoStore();
    }
  }

  function escribirStore(datos) {
    datos.actualizado = new Date().toISOString();
    if (!HAY_STORAGE) {
      memoria = clonar(datos);
      return;
    }
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (error) {
      // Cuota superada: recorta eventos a la mitad y reintenta una vez.
      try {
        datos.eventos = datos.eventos.slice(-Math.floor(MAX_EVENTOS / 2));
        window.localStorage.setItem(CLAVE, JSON.stringify(datos));
      } catch (error2) {
        memoria = clonar(datos);
      }
    }
  }

  /* ---- Utilidades ---- */
  function ahoraMs() {
    if (window.performance && typeof window.performance.now === "function") {
      return window.performance.now();
    }
    return Date.now();
  }

  function redondear(valor) {
    return typeof valor === "number" && isFinite(valor)
      ? Math.round(valor * 10) / 10
      : null;
  }

  function acortarUrl(url) {
    try {
      var partes = new URL(url, window.location.href);
      return (partes.pathname.split("/").pop() || partes.hostname) + (partes.search || "");
    } catch (error) {
      return String(url).slice(0, 90);
    }
  }

  function textoBreve(elemento) {
    var texto =
      (elemento.getAttribute && (elemento.getAttribute("aria-label") || elemento.getAttribute("title"))) ||
      elemento.textContent ||
      elemento.value ||
      "";
    texto = String(texto).replace(/\s+/g, " ").trim();
    return texto.length > 60 ? texto.slice(0, 60) + "…" : texto;
  }

  function emitir(nombre, detalle) {
    try {
      window.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
    } catch (error) {
      // CustomEvent no soportado: el dashboard usará su refresco manual.
    }
  }

  /* ---- Registro de eventos ---- */
  function registrarEvento(tipo, datos) {
    var store = leerStore();
    var evento = {
      ts: new Date().toISOString(),
      msDesdeInicio: redondear(ahoraMs()),
      pagina: window.location.pathname,
      tipo: String(tipo)
    };
    if (datos && typeof datos === "object") {
      for (var clave in datos) {
        if (Object.prototype.hasOwnProperty.call(datos, clave)) {
          evento[clave] = datos[clave];
        }
      }
    }
    store.eventos.push(evento);
    if (store.eventos.length > MAX_EVENTOS) {
      store.eventos = store.eventos.slice(-MAX_EVENTOS);
    }
    escribirStore(store);
    emitir(PREFIJO + ":evento", evento);
    return evento;
  }

  /* ---- Detección de entorno, conexión y soporte de APIs ---- */
  function detectarEntorno() {
    var nav = window.navigator || {};
    var conexion = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    var reducirMovimiento =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : null;

    return {
      medido: new Date().toISOString(),
      userAgent: nav.userAgent || null,
      idioma: nav.language || null,
      idiomas: Array.isArray(nav.languages) ? nav.languages.slice(0, 5) : null,
      plataforma: nav.platform || null,
      nucleosCPU: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
      memoriaGB: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
      enLinea: typeof nav.onLine === "boolean" ? nav.onLine : null,
      cookiesHabilitadas: typeof nav.cookieEnabled === "boolean" ? nav.cookieEnabled : null,
      viewport: {
        ancho: window.innerWidth || null,
        alto: window.innerHeight || null,
        dpr: window.devicePixelRatio || 1,
        orientacion:
          window.screen && window.screen.orientation ? window.screen.orientation.type : null
      },
      pantalla: window.screen
        ? { ancho: window.screen.width, alto: window.screen.height, profundidadColor: window.screen.colorDepth }
        : null,
      conexion: conexion
        ? {
            tipoEfectivo: conexion.effectiveType || null,
            downlinkMbps: typeof conexion.downlink === "number" ? conexion.downlink : null,
            rttMs: typeof conexion.rtt === "number" ? conexion.rtt : null,
            ahorroDatos: typeof conexion.saveData === "boolean" ? conexion.saveData : null
          }
        : null,
      apis: {
        performance: !!window.performance,
        performanceNow: !!(window.performance && typeof window.performance.now === "function"),
        navigationTimingL2: !!(window.performance && typeof window.performance.getEntriesByType === "function"),
        navigationTimingL1: !!(window.performance && window.performance.timing),
        resourceTiming: !!(
          window.performance &&
          typeof window.performance.getEntriesByType === "function" &&
          window.performance.getEntriesByType("resource")
        ),
        paintTiming: !!(
          window.performance &&
          typeof window.performance.getEntriesByType === "function" &&
          window.performance.getEntriesByType("paint").length >= 0
        ),
        performanceObserver: typeof window.PerformanceObserver === "function",
        localStorage: HAY_STORAGE,
        networkInformation: !!conexion,
        visibilityState: typeof document.visibilityState === "string",
        intersectionObserver: typeof window.IntersectionObserver === "function",
        matchMedia: typeof window.matchMedia === "function",
        customEvent: typeof window.CustomEvent === "function",
        blob: typeof window.Blob === "function",
        urlCreateObjectURL: !!(window.URL && typeof window.URL.createObjectURL === "function"),
        prefiereMenosMovimiento: reducirMovimiento
      }
    };
  }

  /* ---- Métricas de rendimiento (Performance API) ---- */
  function medirRendimiento() {
    var resultado = {
      medido: new Date().toISOString(),
      navegacion: null,
      paint: null,
      recursos: null
    };

    if (!window.performance) {
      resultado.disponible = false;
      return resultado;
    }
    resultado.disponible = true;

    try {
      // Navigation Timing Level 2
      if (typeof window.performance.getEntriesByType === "function") {
        var entradas = window.performance.getEntriesByType("navigation");
        if (entradas && entradas[0]) {
          var n = entradas[0];
          resultado.navegacion = {
            nivel: 2,
            tipo: n.type || null,
            redireccionesMs: redondear(n.redirectEnd - n.redirectStart),
            dnsMs: redondear(n.domainLookupEnd - n.domainLookupStart),
            tcpMs: redondear(n.connectEnd - n.connectStart),
            ttfbMs: redondear(n.responseStart - n.requestStart),
            descargaRespuestaMs: redondear(n.responseEnd - n.responseStart),
            procesadoDomMs: redondear(n.domComplete - n.responseEnd),
            domInteractivoMs: redondear(n.domInteractive),
            domContentLoadedMs: redondear(n.domContentLoadedEventEnd),
            domCompletoMs: redondear(n.domComplete),
            cargaTotalMs: redondear(n.loadEventEnd),
            transferenciaKB:
              typeof n.transferSize === "number" ? redondear(n.transferSize / 1024) : null,
            tamanoDecodificadoKB:
              typeof n.decodedBodySize === "number" ? redondear(n.decodedBodySize / 1024) : null
          };
        }
      }

      // Fallback: Navigation Timing Level 1
      if (!resultado.navegacion && window.performance.timing) {
        var t = window.performance.timing;
        var inicio = t.navigationStart || 0;
        resultado.navegacion = {
          nivel: 1,
          tipo: "legacy",
          dnsMs: t.domainLookupEnd - t.domainLookupStart,
          tcpMs: t.connectEnd - t.connectStart,
          ttfbMs: t.responseStart - t.requestStart,
          descargaRespuestaMs: t.responseEnd - t.responseStart,
          domInteractivoMs: t.domInteractive ? t.domInteractive - inicio : null,
          domContentLoadedMs: t.domContentLoadedEventEnd ? t.domContentLoadedEventEnd - inicio : null,
          domCompletoMs: t.domComplete ? t.domComplete - inicio : null,
          cargaTotalMs: t.loadEventEnd ? t.loadEventEnd - inicio : null
        };
      }

      // Paint Timing (First Paint / First Contentful Paint)
      if (typeof window.performance.getEntriesByType === "function") {
        var pintados = window.performance.getEntriesByType("paint");
        if (pintados && pintados.length) {
          resultado.paint = {};
          pintados.forEach(function (p) {
            resultado.paint[p.name] = redondear(p.startTime);
          });
        }
      }

      // Resource Timing (resumen)
      if (typeof window.performance.getEntriesByType === "function") {
        var recursos = window.performance.getEntriesByType("resource") || [];
        var porTipo = {};
        recursos.forEach(function (r) {
          var clave = r.initiatorType || "otro";
          porTipo[clave] = (porTipo[clave] || 0) + 1;
        });
        resultado.recursos = {
          total: recursos.length,
          porTipo: porTipo,
          masLentos: recursos
            .map(function (r) {
              return {
                nombre: acortarUrl(r.name),
                tipo: r.initiatorType || null,
                duracionMs: redondear(r.duration),
                tamanoKB:
                  typeof r.transferSize === "number" && r.transferSize > 0
                    ? redondear(r.transferSize / 1024)
                    : null
              };
            })
            .sort(function (a, b) {
              return (b.duracionMs || 0) - (a.duracionMs || 0);
            })
            .slice(0, 6)
        };
      }
    } catch (error) {
      resultado.error = String((error && error.message) || error);
    }

    return resultado;
  }

  /* ---- Escuchas: errores de JavaScript y de recursos ---- */
  window.addEventListener(
    "error",
    function (evento) {
      var destino = evento.target || evento.srcElement;

      // Si el destino es un elemento con recurso (img, script, link, ...),
      // se trata de un fallo de carga de recurso, no de un error de script.
      if (destino && destino !== window && destino.tagName) {
        registrarEvento("recurso-error", {
          etiqueta: destino.tagName.toLowerCase(),
          url: destino.src || destino.href || null,
          id: destino.id || null
        });
        return;
      }

      registrarEvento("js-error", {
        mensaje: evento.message || null,
        origen: evento.filename || null,
        linea: evento.lineno || null,
        columna: evento.colno || null,
        pila:
          evento.error && evento.error.stack
            ? String(evento.error.stack).slice(0, 600)
            : null
      });
    },
    true // fase de captura: necesaria para detectar errores de recursos
  );

  /* ---- Escucha: promesas rechazadas sin manejar ---- */
  window.addEventListener("unhandledrejection", function (evento) {
    var motivo = evento ? evento.reason : null;
    registrarEvento("promesa-rechazada", {
      motivo:
        motivo && motivo.message ? motivo.message : motivo != null ? String(motivo) : "desconocido",
      pila: motivo && motivo.stack ? String(motivo.stack).slice(0, 600) : null
    });
  });

  /* ---- Escucha: clics en enlaces, botones y controles ---- */
  document.addEventListener(
    "click",
    function (evento) {
      var origen = evento.target;
      if (!origen || typeof origen.closest !== "function") return;
      var control = origen.closest(
        'a, button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"]'
      );
      if (!control) return;

      registrarEvento("interaccion", {
        accion: "click",
        control: control.tagName ? control.tagName.toLowerCase() : null,
        rol: control.getAttribute ? control.getAttribute("role") : null,
        tipoControl: control.type || null,
        texto: textoBreve(control),
        id: control.id || null,
        clases:
          control.className && typeof control.className === "string" ? control.className : null,
        href: control.tagName === "A" ? control.getAttribute("href") : null
      });
    },
    true
  );

  /* ---- Escucha: cambios en controles de formulario ---- */
  document.addEventListener(
    "change",
    function (evento) {
      var control = evento.target;
      if (!control || !control.tagName) return;
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName)) return;
      registrarEvento("interaccion", {
        accion: "change",
        control: control.tagName.toLowerCase(),
        tipoControl: control.type || null,
        id: control.id || null,
        texto: textoBreve(control)
      });
    },
    true
  );

  /* ---- Escucha: cambios de visibilidad de la pestaña ---- */
  document.addEventListener("visibilitychange", function () {
    registrarEvento("visibilidad", {
      estado: typeof document.visibilityState === "string" ? document.visibilityState : null,
      oculta: document.hidden === true
    });
  });

  /* ---- Escucha: conexión online / offline ---- */
  window.addEventListener("online", function () {
    registrarEvento("conexion", { estado: "online" });
  });
  window.addEventListener("offline", function () {
    registrarEvento("conexion", { estado: "offline" });
  });

  /* ---- Captura inicial: entorno + rendimiento al terminar de cargar ---- */
  function capturarCargaInicial() {
    var store = leerStore();
    store.version = VERSION;
    store.prefijo = PREFIJO;
    store.entorno = detectarEntorno();
    store.rendimiento = medirRendimiento();
    escribirStore(store);

    registrarEvento("carga", {
      ruta: window.location.pathname,
      cargaTotalMs:
        store.rendimiento && store.rendimiento.navegacion
          ? store.rendimiento.navegacion.cargaTotalMs
          : null,
      fcpMs: store.rendimiento && store.rendimiento.paint ? store.rendimiento.paint["first-contentful-paint"] : null
    });
  }

  if (document.readyState === "complete") {
    setTimeout(capturarCargaInicial, 0);
  } else {
    window.addEventListener("load", function () {
      // Pequeño retraso para que loadEventEnd quede registrado.
      setTimeout(capturarCargaInicial, 0);
    });
  }

  /* ---- API pública ---- */
  function getSnapshot() {
    var store = leerStore();
    var eventos = Array.isArray(store.eventos) ? store.eventos : [];
    var porTipo = {};
    eventos.forEach(function (e) {
      porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
    });

    return {
      generado: new Date().toISOString(),
      version: VERSION,
      clave: CLAVE,
      prefijo: PREFIJO,
      almacenamiento: HAY_STORAGE
        ? "localStorage"
        : "memoria en RAM (localStorage no disponible en este contexto)",
      pagina: {
        url: window.location.href,
        ruta: window.location.pathname,
        titulo: document.title,
        referrer: document.referrer || null
      },
      entorno: store.entorno || detectarEntorno(),
      rendimiento: store.rendimiento || medirRendimiento(),
      resumen: {
        totalEventos: eventos.length,
        porTipo: porTipo,
        primerEvento: eventos.length ? eventos[0].ts : null,
        ultimoEvento: eventos.length ? eventos[eventos.length - 1].ts : null,
        primeraVez: store.primeraVez || null,
        actualizado: store.actualizado || null
      },
      eventos: eventos.slice()
    };
  }

  function generarDemostracion() {
    return registrarEvento("demostracion", {
      nota: "Evento de demostración generado manualmente desde el panel",
      identificador: Math.random().toString(36).slice(2, 10),
      viewport: { ancho: window.innerWidth, alto: window.innerHeight },
      visibilidad: document.visibilityState || null
    });
  }

  function limpiar() {
    memoria = null;
    if (HAY_STORAGE) {
      try {
        var aBorrar = [];
        for (var i = 0; i < window.localStorage.length; i++) {
          var clave = window.localStorage.key(i);
          if (clave && clave.indexOf(PREFIJO) === 0) {
            aBorrar.push(clave);
          }
        }
        aBorrar.forEach(function (clave) {
          window.localStorage.removeItem(clave);
        });
      } catch (error) {
        // Sin acceso a localStorage: solo se limpió la memoria.
      }
    }
    emitir(PREFIJO + ":limpiado", { ts: new Date().toISOString() });
    return true;
  }

  function descargarSnapshot() {
    var datos = getSnapshot();
    var texto = JSON.stringify(datos, null, 2);
    var nombre =
      "cr7-observability-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";

    var url;
    var usarBlob = typeof window.Blob === "function" && window.URL && typeof window.URL.createObjectURL === "function";

    if (usarBlob) {
      url = window.URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    } else {
      // Compatibilidad: data URI si Blob no está disponible.
      url = "data:application/json;charset=utf-8," + encodeURIComponent(texto);
    }

    var enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.rel = "noopener";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    if (usarBlob) {
      setTimeout(function () {
        window.URL.revokeObjectURL(url);
      }, 1500);
    }
    return { nombre: nombre, bytes: texto.length };
  }

  window.CR7Observability = {
    getSnapshot: getSnapshot,
    registrarEvento: registrarEvento,
    generarDemostracion: generarDemostracion,
    limpiar: limpiar,
    descargarSnapshot: descargarSnapshot,
    CLAVE: CLAVE,
    PREFIJO: PREFIJO,
    hayStorage: HAY_STORAGE
  };
})();

/* ------------------------------------------------------------
   BLOQUE 2 · Dashboard (solo si la página lo incluye)
   ------------------------------------------------------------ */
(function () {
  "use strict";

  var raiz = document.getElementById("panel-observabilidad");
  if (!raiz || !window.CR7Observability) return;

  var API = window.CR7Observability;

  /* Referencias del DOM */
  var salidaResumen = document.getElementById("salida-resumen");
  var salidaEntorno = document.getElementById("salida-entorno");
  var salidaApis = document.getElementById("salida-apis");
  var salidaRendimiento = document.getElementById("salida-rendimiento");
  var salidaEventos = document.getElementById("salida-eventos");
  var salidaJson = document.getElementById("salida-json");
  var anuncio = document.getElementById("anuncio-estado");
  var sello = document.getElementById("sello-actualizacion");

  var btnActualizar = document.getElementById("btn-actualizar");
  var btnDemo = document.getElementById("btn-demo");
  var btnLimpiar = document.getElementById("btn-limpiar");
  var btnDescargar = document.getElementById("btn-descargar");

  /* Utilidades de construcción de DOM (sin innerHTML: evita inyección) */
  function crear(etiqueta, texto, atributos) {
    var nodo = document.createElement(etiqueta);
    if (texto !== undefined && texto !== null) {
      nodo.textContent = String(texto);
    }
    if (atributos) {
      Object.keys(atributos).forEach(function (clave) {
        nodo.setAttribute(clave, atributos[clave]);
      });
    }
    return nodo;
  }

  function vaciar(nodo) {
    while (nodo && nodo.firstChild) {
      nodo.removeChild(nodo.firstChild);
    }
  }

  function formatearValor(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (typeof valor === "boolean") return valor ? "sí" : "no";
    if (typeof valor === "object") return JSON.stringify(valor);
    return String(valor);
  }

  /* Construye una tabla clave/valor a partir de un objeto plano */
  function tablaClaveValor(objeto, titulos) {
    var envoltura = crear("div", null, { class: "tabla-scroll" });
    var tabla = crear("table", null, { class: "tabla-datos" });
    var thead = crear("thead");
    var filaTitulos = crear("tr");
    filaTitulos.appendChild(crear("th", titulos[0], { scope: "col" }));
    filaTitulos.appendChild(crear("th", titulos[1], { scope: "col" }));
    thead.appendChild(filaTitulos);
    tabla.appendChild(thead);

    var tbody = crear("tbody");
    Object.keys(objeto).forEach(function (clave) {
      var fila = crear("tr");
      fila.appendChild(crear("th", clave, { scope: "row" }));
      fila.appendChild(crear("td", formatearValor(objeto[clave])));
      tbody.appendChild(fila);
    });
    tabla.appendChild(tbody);
    envoltura.appendChild(tabla);
    return envoltura;
  }

  function anunciar(mensaje) {
    if (anuncio) {
      anuncio.textContent = "";
      // Reasignar en el siguiente frame asegura que el lector lo anuncie.
      window.requestAnimationFrame(function () {
        anuncio.textContent = mensaje;
      });
    }
  }

  /* ---- Render de cada sección ---- */
  function renderResumen(snapshot) {
    vaciar(salidaResumen);
    var resumen = snapshot.resumen || {};
    var tarjetas = [
      { etiqueta: "Eventos registrados", valor: resumen.totalEventos || 0 },
      { etiqueta: "Tipos distintos", valor: Object.keys(resumen.porTipo || {}).length },
      { etiqueta: "Almacenamiento", valor: snapshot.almacenamiento },
      { etiqueta: "Clave localStorage", valor: snapshot.clave }
    ];
    var lista = crear("ul", null, { class: "tarjetas" });
    tarjetas.forEach(function (item) {
      var li = crear("li", null, { class: "tarjeta" });
      li.appendChild(crear("span", item.valor, { class: "tarjeta__valor" }));
      li.appendChild(crear("span", item.etiqueta, { class: "tarjeta__etiqueta" }));
      lista.appendChild(li);
    });
    salidaResumen.appendChild(lista);

    var porTipo = resumen.porTipo || {};
    if (Object.keys(porTipo).length) {
      salidaResumen.appendChild(crear("h3", "Eventos por tipo"));
      salidaResumen.appendChild(tablaClaveValor(porTipo, ["Tipo", "Cantidad"]));
    }
  }

  function renderEntorno(snapshot) {
    vaciar(salidaEntorno);
    var entorno = snapshot.entorno || {};

    var general = {
      "User agent": entorno.userAgent,
      Idioma: entorno.idioma,
      Plataforma: entorno.plataforma,
      "Núcleos de CPU": entorno.nucleosCPU,
      "Memoria (GB)": entorno.memoriaGB,
      "En línea": entorno.enLinea,
      "Cookies habilitadas": entorno.cookiesHabilitadas
    };
    salidaEntorno.appendChild(crear("h3", "Dispositivo"));
    salidaEntorno.appendChild(tablaClaveValor(general, ["Propiedad", "Valor"]));

    if (entorno.viewport) {
      salidaEntorno.appendChild(crear("h3", "Viewport y pantalla"));
      salidaEntorno.appendChild(
        tablaClaveValor(
          {
            "Ancho viewport (px)": entorno.viewport.ancho,
            "Alto viewport (px)": entorno.viewport.alto,
            "Densidad de píxeles": entorno.viewport.dpr,
            Orientación: entorno.viewport.orientacion,
            "Pantalla (px)": entorno.pantalla
              ? entorno.pantalla.ancho + " × " + entorno.pantalla.alto
              : null,
            "Profundidad de color": entorno.pantalla ? entorno.pantalla.profundidadColor : null
          },
          ["Propiedad", "Valor"]
        )
      );
    }

    salidaEntorno.appendChild(crear("h3", "Conexión (Network Information API)"));
    if (entorno.conexion) {
      salidaEntorno.appendChild(
        tablaClaveValor(
          {
            "Tipo efectivo": entorno.conexion.tipoEfectivo,
            "Downlink (Mbps)": entorno.conexion.downlinkMbps,
            "RTT (ms)": entorno.conexion.rttMs,
            "Ahorro de datos": entorno.conexion.ahorroDatos
          },
          ["Propiedad", "Valor"]
        )
      );
    } else {
      salidaEntorno.appendChild(
        crear("p", "La Network Information API no está disponible en este navegador.", {
          class: "nota"
        })
      );
    }
  }

  function renderApis(snapshot) {
    vaciar(salidaApis);
    var apis = (snapshot.entorno && snapshot.entorno.apis) || {};
    var envoltura = crear("div", null, { class: "tabla-scroll" });
    var tabla = crear("table", null, { class: "tabla-datos" });
    var thead = crear("thead");
    var ft = crear("tr");
    ft.appendChild(crear("th", "API", { scope: "col" }));
    ft.appendChild(crear("th", "Soporte", { scope: "col" }));
    thead.appendChild(ft);
    tabla.appendChild(thead);
    var tbody = crear("tbody");
    Object.keys(apis).forEach(function (clave) {
      var fila = crear("tr");
      fila.appendChild(crear("th", clave, { scope: "row" }));
      var valor = apis[clave];
      var celda = crear("td");
      var estado = crear(
        "span",
        valor === true ? "Disponible" : valor === false ? "No disponible" : formatearValor(valor),
        { class: "estado " + (valor === true ? "estado--ok" : valor === false ? "estado--no" : "estado--info") }
      );
      celda.appendChild(estado);
      fila.appendChild(celda);
      tbody.appendChild(fila);
    });
    tabla.appendChild(tbody);
    envoltura.appendChild(tabla);
    salidaApis.appendChild(envoltura);
  }

  function renderRendimiento(snapshot) {
    vaciar(salidaRendimiento);
    var rend = snapshot.rendimiento || {};

    if (!rend.disponible) {
      salidaRendimiento.appendChild(
        crear("p", "La Performance API no está disponible en este navegador.", { class: "nota" })
      );
      return;
    }

    if (rend.navegacion) {
      salidaRendimiento.appendChild(
        crear("h3", "Navegación (Navigation Timing nivel " + rend.navegacion.nivel + ")")
      );
      var nav = {};
      Object.keys(rend.navegacion).forEach(function (k) {
        if (k !== "nivel") nav[k] = rend.navegacion[k];
      });
      salidaRendimiento.appendChild(tablaClaveValor(nav, ["Métrica", "Valor"]));
    } else {
      salidaRendimiento.appendChild(
        crear("p", "Aún no hay datos de navegación (recarga la página).", { class: "nota" })
      );
    }

    if (rend.paint) {
      salidaRendimiento.appendChild(crear("h3", "Paint Timing"));
      salidaRendimiento.appendChild(tablaClaveValor(rend.paint, ["Evento", "ms"]));
    }

    if (rend.recursos) {
      salidaRendimiento.appendChild(crear("h3", "Recursos cargados"));
      salidaRendimiento.appendChild(
        tablaClaveValor(
          {
            "Total de recursos": rend.recursos.total,
            "Por tipo": rend.recursos.porTipo
          },
          ["Métrica", "Valor"]
        )
      );

      if (rend.recursos.masLentos && rend.recursos.masLentos.length) {
        var envoltura = crear("div", null, { class: "tabla-scroll" });
        var tabla = crear("table", null, { class: "tabla-datos" });
        var thead = crear("thead");
        var ft = crear("tr");
        ["Recurso", "Tipo", "Duración (ms)", "Tamaño (KB)"].forEach(function (t) {
          ft.appendChild(crear("th", t, { scope: "col" }));
        });
        thead.appendChild(ft);
        tabla.appendChild(thead);
        var tbody = crear("tbody");
        rend.recursos.masLentos.forEach(function (r) {
          var fila = crear("tr");
          fila.appendChild(crear("th", r.nombre, { scope: "row" }));
          fila.appendChild(crear("td", formatearValor(r.tipo)));
          fila.appendChild(crear("td", formatearValor(r.duracionMs)));
          fila.appendChild(crear("td", formatearValor(r.tamanoKB)));
          tbody.appendChild(fila);
        });
        tabla.appendChild(tbody);
        envoltura.appendChild(tabla);
        salidaRendimiento.appendChild(crear("h3", "Recursos más lentos"));
        salidaRendimiento.appendChild(envoltura);
      }
    }
  }

  function renderEventos(snapshot) {
    vaciar(salidaEventos);
    var eventos = snapshot.eventos || [];

    if (!eventos.length) {
      salidaEventos.appendChild(
        crear("p", "Todavía no hay eventos registrados. Interactúa con la página o genera uno de demostración.", {
          class: "nota"
        })
      );
      return;
    }

    var envoltura = crear("div", null, { class: "tabla-scroll" });
    var tabla = crear("table", null, { class: "tabla-datos tabla-eventos" });
    var caption = crear("caption", "Últimos " + Math.min(eventos.length, 60) + " eventos (de " + eventos.length + ")");
    tabla.appendChild(caption);

    var thead = crear("thead");
    var ft = crear("tr");
    ["Hora", "Tipo", "Página", "Detalle"].forEach(function (t) {
      ft.appendChild(crear("th", t, { scope: "col" }));
    });
    thead.appendChild(ft);
    tabla.appendChild(thead);

    var tbody = crear("tbody");
    eventos
      .slice(-60)
      .reverse()
      .forEach(function (evento) {
        var fila = crear("tr");
        var hora = evento.ts ? new Date(evento.ts).toLocaleTimeString() : "—";
        fila.appendChild(crear("td", hora));

        var celdaTipo = crear("td");
        celdaTipo.appendChild(
          crear("span", evento.tipo, { class: "etiqueta-tipo etiqueta-tipo--" + evento.tipo })
        );
        fila.appendChild(celdaTipo);

        fila.appendChild(crear("td", evento.pagina || "—"));

        var extra = {};
        Object.keys(evento).forEach(function (k) {
          if (["ts", "tipo", "pagina", "msDesdeInicio"].indexOf(k) === -1) {
            extra[k] = evento[k];
          }
        });
        fila.appendChild(crear("td", Object.keys(extra).length ? JSON.stringify(extra) : "—"));
        tbody.appendChild(fila);
      });
    tabla.appendChild(tbody);
    envoltura.appendChild(tabla);
    salidaEventos.appendChild(envoltura);
  }

  function renderJson(snapshot) {
    if (salidaJson) {
      salidaJson.textContent = JSON.stringify(snapshot, null, 2);
    }
  }

  /* ---- Render completo ---- */
  var pendiente = null;
  function render() {
    var snapshot = API.getSnapshot();
    renderResumen(snapshot);
    renderEntorno(snapshot);
    renderApis(snapshot);
    renderRendimiento(snapshot);
    renderEventos(snapshot);
    renderJson(snapshot);
    if (sello) {
      sello.textContent = "Actualizado: " + new Date().toLocaleTimeString();
    }
  }

  function renderDiferido() {
    if (pendiente) return;
    pendiente = window.setTimeout(function () {
      pendiente = null;
      render();
    }, 200);
  }

  /* ---- Botones ---- */
  if (btnActualizar) {
    btnActualizar.addEventListener("click", function () {
      render();
      anunciar("Datos actualizados.");
    });
  }

  if (btnDemo) {
    btnDemo.addEventListener("click", function () {
      var evento = API.generarDemostracion();
      render();
      anunciar("Evento de demostración añadido (" + evento.identificador + ").");
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", function () {
      var confirmar =
        typeof window.confirm === "function"
          ? window.confirm("¿Borrar todos los datos de observabilidad guardados en este navegador?")
          : true;
      if (!confirmar) return;
      API.limpiar();
      render();
      anunciar("Almacenamiento de observabilidad limpiado.");
    });
  }

  if (btnDescargar) {
    btnDescargar.addEventListener("click", function () {
      var info = API.descargarSnapshot();
      anunciar("Descargando snapshot: " + info.nombre + " (" + info.bytes + " bytes).");
    });
  }

  /* ---- Refresco automático ante nuevos eventos ---- */
  window.addEventListener(API.PREFIJO + ":evento", renderDiferido);
  window.addEventListener(API.PREFIJO + ":limpiado", renderDiferido);

  // Cambios desde otra pestaña.
  window.addEventListener("storage", function (evento) {
    if (evento && evento.key && evento.key.indexOf(API.PREFIJO) === 0) {
      renderDiferido();
    }
  });

  /* ---- Primer render ---- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
