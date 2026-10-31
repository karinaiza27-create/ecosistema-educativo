// publico/js/modulos/sopa-letras.js · Actividad pedagógica de Sopa de Letras con Pointer Events

import { montarPlantilla } from "../nucleo/plantilla.js";
import { obtenerTemaActividad } from "../nucleo/selector-tema.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";
import { mostrarRetro, mostrarResumen } from "../nucleo/retroalimentacion.js";
import { registrarIntento } from "../nucleo/gamificacion.js";

await montarPlantilla({ titulo: "Sopa de Letras", roles: ["estudiante", "docente", "admin"] });

const ALFABETO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

const CONFIG_DIFICULTAD = {
  facil: {
    tamano: 10,
    maxPalabras: 8,
    direcciones: [
      [0, 1], // Horizontal derecha
      [1, 0]  // Vertical abajo
    ]
  },
  media: {
    tamano: 12,
    maxPalabras: 10,
    direcciones: [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal descendente
      [-1, 1]  // Diagonal ascendente
    ]
  },
  dificil: {
    tamano: 15,
    maxPalabras: 12,
    direcciones: [
      [0, 1],   // Horizontal derecha
      [1, 0],   // Vertical abajo
      [1, 1],   // Diagonal desc. der.
      [-1, 1],  // Diagonal asc. der.
      [0, -1],  // Horizontal izquierda (invertida)
      [-1, 0],  // Vertical arriba (invertida)
      [-1, -1], // Diagonal asc. izq. (invertida)
      [1, -1]   // Diagonal desc. izq. (invertida)
    ]
  }
};

/**
 * Función pura que genera la grilla de la sopa de letras y las ubicaciones de las palabras.
 * Coloca de la más larga a la más corta con hasta 200 intentos por palabra,
 * permite cruces con letras iguales, descarta la que no quepa y rellena con A–Z y Ñ.
 *
 * @param {string[]} palabras - Lista de palabras normalizadas a colocar
 * @param {number} tamano - Dimensión N x N de la cuadrícula
 * @param {Array<[number, number]>} direcciones - Vectores [dr, dc] permitidos
 * @returns {{ grilla: string[][], ubicaciones: Array<object> }}
 */
export function generarSopa(palabras, tamano, direcciones) {
  const grilla = Array.from({ length: tamano }, () => Array(tamano).fill(""));
  const ubicaciones = [];

  const ordenadas = palabras
    .map((p) => (typeof p === "string" ? p.trim().toUpperCase() : ""))
    .filter((p) => p.length >= 3 && p.length <= tamano)
    .sort((a, b) => b.length - a.length);

  for (const palabra of ordenadas) {
    const L = palabra.length;
    let colocada = false;

    for (let intento = 0; intento < 200; intento++) {
      const [dr, dc] = direcciones[Math.floor(Math.random() * direcciones.length)];

      let minR = 0;
      let maxR = tamano - 1;
      let minC = 0;
      let maxC = tamano - 1;

      if (dr > 0) maxR = tamano - L;
      else if (dr < 0) minR = L - 1;

      if (dc > 0) maxC = tamano - L;
      else if (dc < 0) minC = L - 1;

      if (minR > maxR || minC > maxC) continue;

      const r = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
      const c = Math.floor(Math.random() * (maxC - minC + 1)) + minC;

      let cabe = true;
      for (let i = 0; i < L; i++) {
        const nr = r + i * dr;
        const nc = c + i * dc;
        if (grilla[nr][nc] !== "" && grilla[nr][nc] !== palabra[i]) {
          cabe = false;
          break;
        }
      }

      if (cabe) {
        const casillas = [];
        for (let i = 0; i < L; i++) {
          const nr = r + i * dr;
          const nc = c + i * dc;
          grilla[nr][nc] = palabra[i];
          casillas.push({ r: nr, c: nc });
        }

        ubicaciones.push({
          palabra,
          filaInicio: r,
          colInicio: c,
          filaFin: r + (L - 1) * dr,
          colFin: c + (L - 1) * dc,
          dr,
          dc,
          casillas
        });
        colocada = true;
        break;
      }
    }
  }

  // Rellenar celdas vacías con letras aleatorias
  for (let r = 0; r < tamano; r++) {
    for (let c = 0; c < tamano; c++) {
      if (grilla[r][c] === "") {
        grilla[r][c] = ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
      }
    }
  }

  return { grilla, ubicaciones };
}

// Variables de estado de la partida
let temaActual = null;
let glosarioTema = [];
let dificultadActual = "facil";
let grillaActual = [];
let ubicacionesActuales = [];
let palabrasEncontradas = new Set();
let definicionesMap = new Map();
let tiempoSegundos = 0;
let intervaloTimer = null;
let juegoTerminado = false;

// Variables de interacción Pointer Events
let arrastrando = false;
let celdaInicio = null;
let celdasSeleccionadas = [];

const contenido = document.getElementById("contenido");

/**
 * Inicia o reinicia el temporizador de la partida
 */
function iniciarTemporizador() {
  if (intervaloTimer) clearInterval(intervaloTimer);
  tiempoSegundos = 0;
  actualizarVistaTiempo();

  intervaloTimer = setInterval(() => {
    tiempoSegundos++;
    actualizarVistaTiempo();
  }, 1000);
}

function detenerTemporizador() {
  if (intervaloTimer) {
    clearInterval(intervaloTimer);
    intervaloTimer = null;
  }
}

function actualizarVistaTiempo() {
  const el = document.getElementById("sopaTiempo");
  if (!el) return;
  const m = String(Math.floor(tiempoSegundos / 60)).padStart(2, "0");
  const s = String(tiempoSegundos % 60).padStart(2, "0");
  el.textContent = `${m}:${s}`;
}

/**
 * Prepara los términos del glosario aptos para la sopa de letras
 */
function filtrarTerminosAptos(tamanoMax) {
  definicionesMap.clear();

  const terminos = glosarioTema.filter((t) => {
    if (!t || !t.termino) return false;
    if (t.estado && t.estado !== "aprobado") return false;
    // Una sola palabra sin espacios ni guiones internos
    const terminoLimpio = t.termino.trim();
    if (terminoLimpio.includes(" ") || terminoLimpio.includes("-")) return false;
    const normal = util.normalizar(terminoLimpio);
    return normal.length >= 3 && normal.length <= tamanoMax;
  });

  const palabrasUnicas = [];
  const vistas = new Set();

  for (const t of terminos) {
    const normal = util.normalizar(t.termino.trim());
    if (!vistas.has(normal)) {
      vistas.add(normal);
      palabrasUnicas.push(normal);
      definicionesMap.set(normal, t.definicion || "Término curricular clave del tema.");
    }
  }

  return palabrasUnicas;
}

/**
 * Monta la partida de sopa de letras según la dificultad seleccionada
 */
function iniciarPartida() {
  juegoTerminado = false;
  palabrasEncontradas.clear();
  arrastrando = false;
  celdaInicio = null;
  celdasSeleccionadas = [];

  const config = CONFIG_DIFICULTAD[dificultadActual] || CONFIG_DIFICULTAD.facil;
  const palabrasAptas = filtrarTerminosAptos(config.tamano);

  if (palabrasAptas.length < 3) {
    contenido.innerHTML = `
      <div class="sopa-juego">
        <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl);">
          <div style="font-size: 3rem; margin-bottom: var(--espacio-s);">📖</div>
          <h2 class="tarjeta__titulo">Términos insuficientes</h2>
          <p class="tarjeta__texto">
            El tema <strong>${ui.escapar(temaActual.titulo)}</strong> no cuenta con suficientes palabras aptas (mínimo 3 de una sola palabra) en su glosario para generar la sopa de letras.
          </p>
          <div class="fila" style="justify-content: center; gap: var(--espacio-s); margin-top: var(--espacio-m);">
            <button type="button" class="btn btn--primario" id="btnCambiarTema">Elegir otro tema</button>
            <a href="/paginas/actividades.html" class="btn btn--secundario">Volver a actividades</a>
          </div>
        </div>
      </div>
    `;
    document.getElementById("btnCambiarTema")?.addEventListener("click", () => window.location.reload());
    return;
  }

  // Tomar hasta maxPalabras barajadas
  const barajadas = util.barajar(palabrasAptas).slice(0, config.maxPalabras);
  const resultado = generarSopa(barajadas, config.tamano, config.direcciones);

  grillaActual = resultado.grilla;
  ubicacionesActuales = resultado.ubicaciones;

  renderizarInterfaz(config.tamano);
  iniciarTemporizador();
}

/**
 * Renderiza el DOM completo del juego y enlaza Pointer Events
 */
function renderizarInterfaz(tamano) {
  const total = ubicacionesActuales.length;

  contenido.innerHTML = `
    <div class="sopa-juego">
      <header class="sopa-cabecera">
        <div class="sopa-cabecera__info">
          <h1 class="sopa-cabecera__titulo">Sopa de Letras</h1>
          <span class="sopa-cabecera__tema">📚 Tema: ${ui.escapar(temaActual.titulo)}</span>
        </div>

        <div class="sopa-cabecera__stats">
          <div class="sopa-stat">
            <span>Dificultad:</span>
            <select id="selDificultad" class="campo" style="padding: 2px 8px; font-size: var(--tamano-xs);" aria-label="Seleccionar dificultad">
              <option value="facil" ${dificultadActual === "facil" ? "selected" : ""}>Fácil (10×10)</option>
              <option value="media" ${dificultadActual === "media" ? "selected" : ""}>Media (12×12)</option>
              <option value="dificil" ${dificultadActual === "dificil" ? "selected" : ""}>Difícil (15×15)</option>
            </select>
          </div>

          <div class="sopa-stat">
            <span>Tiempo:</span>
            <span class="sopa-stat__badge" id="sopaTiempo">00:00</span>
          </div>

          <div class="sopa-stat">
            <span>Progreso:</span>
            <span class="sopa-stat__badge" id="sopaProgreso">0 / ${total}</span>
          </div>

          <div class="sopa-controles">
            <button type="button" class="btn btn--peligro btn--pequeno" id="btnRendirse" aria-label="Rendirse y revelar palabras">
              Rendirse
            </button>
          </div>
        </div>
      </header>

      <div class="sopa-layout">
        <!-- Tablero de la grilla -->
        <section class="sopa-tablero-wrap" aria-label="Cuadrícula de la sopa de letras">
          <div
            class="sopa-grilla"
            id="sopaGrilla"
            style="--sopa-tamano: ${tamano};"
            role="grid"
            aria-label="Sopa de letras de ${tamano} por ${tamano}"
          >
            ${grillaActual
              .map((fila, r) =>
                fila
                  .map(
                    (letra, c) => `
                <button
                  type="button"
                  class="sopa-celda"
                  id="celda-${r}-${c}"
                  data-r="${r}"
                  data-c="${c}"
                  role="gridcell"
                  aria-label="Letra ${letra} en fila ${r + 1}, columna ${c + 1}"
                >${letra}</button>
              `
                  )
                  .join("")
              )
              .join("")}
          </div>
          <div class="sopa-retro-contenedor" id="panel-retro-sopa"></div>
        </section>

        <!-- Panel lateral con lista de palabras a encontrar -->
        <aside class="sopa-palabras-panel">
          <div class="sopa-palabras-tarjeta">
            <h2 class="sopa-palabras-titulo">
              <span>Palabras por encontrar</span>
              <span class="insignia insignia--primario" id="badgeTotalPalabras">${total}</span>
            </h2>
            <ul class="sopa-palabras-lista" id="sopaListaPalabras">
              ${ubicacionesActuales
                .map(
                  (u) => `
                <li class="sopa-palabra-item" id="palabra-${u.palabra}">
                  ${ui.escapar(u.palabra)}
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  `;

  // Selector de dificultad
  document.getElementById("selDificultad")?.addEventListener("change", (e) => {
    dificultadActual = e.target.value;
    iniciarPartida();
  });

  // Botón rendirse
  document.getElementById("btnRendirse")?.addEventListener("click", rendirse);

  // Enlazar Pointer Events en la cuadrícula
  enlazarPointerEvents();
}

/**
 * Configura los eventos táctiles y de ratón (Pointer Events) con touch-action: none
 */
function enlazarPointerEvents() {
  const grillaEl = document.getElementById("sopaGrilla");
  if (!grillaEl) return;

  const obtenerCeldaDesdePunto = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".sopa-celda") : null;
  };

  const onPointerDown = (e) => {
    if (juegoTerminado) return;
    const celda = e.target.closest(".sopa-celda");
    if (!celda) return;

    arrastrando = true;
    celdaInicio = {
      r: parseInt(celda.dataset.r, 10),
      c: parseInt(celda.dataset.c, 10)
    };

    try {
      grillaEl.setPointerCapture(e.pointerId);
    } catch {}

    resaltarLinea(celdaInicio, celdaInicio);
  };

  const onPointerMove = (e) => {
    if (!arrastrando || juegoTerminado || !celdaInicio) return;

    const celdaActual = obtenerCeldaDesdePunto(e.clientX, e.clientY);
    if (!celdaActual) return;

    const rActual = parseInt(celdaActual.dataset.r, 10);
    const cActual = parseInt(celdaActual.dataset.c, 10);

    const dr = rActual - celdaInicio.r;
    const dc = cActual - celdaInicio.c;

    // Solo permitir líneas rectas: horizontal, vertical o diagonal 45°
    const esHorizontal = dr === 0;
    const esVertical = dc === 0;
    const esDiagonal = Math.abs(dr) === Math.abs(dc);

    if (esHorizontal || esVertical || esDiagonal) {
      resaltarLinea(celdaInicio, { r: rActual, c: cActual });
    }
  };

  const onPointerUp = (e) => {
    if (!arrastrando) return;
    arrastrando = false;

    try {
      grillaEl.releasePointerCapture(e.pointerId);
    } catch {}

    verificarSeleccion();
    limpiarResaltadoTemporal();
  };

  const onPointerCancel = () => {
    arrastrando = false;
    limpiarResaltadoTemporal();
  };

  grillaEl.addEventListener("pointerdown", onPointerDown);
  grillaEl.addEventListener("pointermove", onPointerMove);
  grillaEl.addEventListener("pointerup", onPointerUp);
  grillaEl.addEventListener("pointercancel", onPointerCancel);
}

/**
 * Resalta en vivo las celdas entre inicio y fin si forman una línea recta
 */
function resaltarLinea(inicio, fin) {
  limpiarResaltadoTemporal();
  celdasSeleccionadas = [];

  const dr = fin.r - inicio.r;
  const dc = fin.c - inicio.c;
  const pasoR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
  const pasoC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
  const pasos = Math.max(Math.abs(dr), Math.abs(dc));

  for (let i = 0; i <= pasos; i++) {
    const r = inicio.r + i * pasoR;
    const c = inicio.c + i * pasoC;
    celdasSeleccionadas.push({ r, c });

    const el = document.getElementById(`celda-${r}-${c}`);
    if (el) {
      el.classList.add("sopa-celda--seleccionada");
    }
  }
}

/**
 * Elimina la clase de selección temporal en la cuadrícula
 */
function limpiarResaltadoTemporal() {
  document.querySelectorAll(".sopa-celda--seleccionada").forEach((el) => {
    el.classList.remove("sopa-celda--seleccionada");
  });
}

/**
 * Verifica si la secuencia seleccionada coincide con alguna palabra no encontrada
 */
function verificarSeleccion() {
  if (celdasSeleccionadas.length < 3) return;

  const palabraFormada = celdasSeleccionadas.map((pos) => grillaActual[pos.r][pos.c]).join("");
  const palabraReversa = palabraFormada.split("").reverse().join("");

  const coincidencia = ubicacionesActuales.find(
    (u) =>
      !palabrasEncontradas.has(u.palabra) &&
      (u.palabra === palabraFormada || u.palabra === palabraReversa)
  );

  if (coincidencia) {
    marcarPalabraEncontrada(coincidencia, celdasSeleccionadas);
  }
}

/**
 * Marca permanentemente la palabra encontrada y muestra retroalimentación con su definición
 */
function marcarPalabraEncontrada(ubicacion, celdas) {
  palabrasEncontradas.add(ubicacion.palabra);

  // 1. Marcar celdas en la grilla
  celdas.forEach((pos) => {
    const el = document.getElementById(`celda-${pos.r}-${pos.c}`);
    if (el) {
      el.classList.add("sopa-celda--encontrada");
    }
  });

  // 2. Tachar palabra en la lista lateral
  const itemLista = document.getElementById(`palabra-${ubicacion.palabra}`);
  if (itemLista) {
    itemLista.classList.add("sopa-palabra-item--encontrada");
  }

  // 3. Actualizar marcador de progreso
  const total = ubicacionesActuales.length;
  const progresoEl = document.getElementById("sopaProgreso");
  if (progresoEl) {
    progresoEl.textContent = `${palabrasEncontradas.size} / ${total}`;
  }

  // 4. Mostrar definición con retroalimentación inmediata
  const definicion = definicionesMap.get(ubicacion.palabra) || "Concepto clave del tema curricular.";
  mostrarRetro(
    {
      correcto: true,
      explicacion: `¡Correcto! ${ubicacion.palabra}: ${definicion}`,
      enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
    },
    "#panel-retro-sopa"
  );

  // 5. Verificar victoria
  if (palabrasEncontradas.size === total) {
    finalizarPartida(true);
  }
}

/**
 * Revela las palabras restantes cuando el estudiante pulsa "Rendirse"
 */
async function rendirse() {
  if (juegoTerminado) return;

  const confirmar = await ui.confirmar(
    "¿Deseas rendirte? Se revelarán las palabras restantes y se registrará tu intento."
  );
  if (!confirmar) return;

  // Revelar las no encontradas
  for (const u of ubicacionesActuales) {
    if (!palabrasEncontradas.has(u.palabra)) {
      u.casillas.forEach((pos) => {
        const el = document.getElementById(`celda-${pos.r}-${pos.c}`);
        if (el && !el.classList.contains("sopa-celda--encontrada")) {
          el.classList.add("sopa-celda--revelada");
        }
      });

      const itemLista = document.getElementById(`palabra-${u.palabra}`);
      if (itemLista) {
        itemLista.classList.add("sopa-palabra-item--revelada");
      }
    }
  }

  finalizarPartida(false);
}

/**
 * Concluye la partida, registra el intento y despliega el modal de resumen
 */
async function finalizarPartida(victoria = true) {
  juegoTerminado = true;
  detenerTemporizador();

  const total = ubicacionesActuales.length;
  const encontradas = palabrasEncontradas.size;
  const errores = total - encontradas;

  // Registrar intento en el servidor
  try {
    await registrarIntento({
      actividad: "sopa-letras",
      temaId: temaActual.id,
      puntaje: encontradas,
      maximo: total,
      errores,
      duracionSeg: tiempoSegundos
    });
  } catch (err) {
    console.warn("No se pudo registrar intento de sopa-letras:", err.message);
  }

  // Modal de resumen
  const recomendaciones = victoria
    ? "¡Excelente trabajo! Has localizado todos los términos clave de esta unidad temática."
    : "Te recomendamos repasar los términos no encontrados en el glosario del tema para afianzar los conceptos.";

  const accion = await mostrarResumen({
    titulo: victoria ? "¡Sopa de Letras Completada!" : "Partida Finalizada",
    aciertos: encontradas,
    errores,
    recomendaciones,
    enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
  });

  if (accion === "repetir") {
    iniciarPartida();
  } else {
    window.location.href = "/paginas/actividades.html";
  }
}

/**
 * Inicialización del módulo
 */
async function inicializar() {
  try {
    ui.cargando(true);
    temaActual = await obtenerTemaActividad();

    if (!temaActual) {
      contenido.innerHTML = `
        <div class="sopa-juego">
          <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl);">
            <div style="font-size: 3rem; margin-bottom: var(--espacio-s);">📚</div>
            <h2 class="tarjeta__titulo">No se seleccionó ningún tema</h2>
            <p class="tarjeta__texto">Debes seleccionar un tema pedagógico para jugar a la sopa de letras.</p>
            <div style="margin-top: var(--espacio-m);">
              <a href="/paginas/actividades.html" class="btn btn--primario">Volver a actividades</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const glosarioRes = await api.listar("glosario", { temaId: temaActual.id });
    glosarioTema = Array.isArray(glosarioRes) ? glosarioRes : [];

    iniciarPartida();
  } catch (err) {
    ui.aviso("Error al inicializar la sopa de letras: " + err.message, "peligro");
  } finally {
    ui.cargando(false);
  }
}

inicializar();

export default {
  generarSopa
};
