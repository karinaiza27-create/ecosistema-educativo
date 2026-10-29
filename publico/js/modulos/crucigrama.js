// publico/js/modulos/crucigrama.js · Actividad pedagógica de Crucigrama con generación pura y navegación por teclado

import { montarPlantilla } from "../nucleo/plantilla.js";
import { obtenerTemaActividad } from "../nucleo/selector-tema.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";
import { mostrarRetro, mostrarResumen } from "../nucleo/retroalimentacion.js";
import { registrarIntento } from "../nucleo/gamificacion.js";

await montarPlantilla({ titulo: "Crucigrama", roles: ["estudiante", "docente", "admin"] });

const MAX_LETRAS_REVELADAS = 3;

/**
 * Función pura que genera la cuadrícula del crucigrama a partir de una lista de palabras/términos.
 * Coloca la palabra más larga en el centro y busca cruces válidos para las siguientes.
 * Repite 30 órdenes aleatorios, prioriza más palabras colocadas y menor área, y recorta la cuadrícula.
 *
 * @param {Array<string|object>} palabras - Lista de palabras o { palabra, pista }
 * @returns {{ filas: number, columnas: number, entradas: Array<object> }}
 */
export function generarCrucigrama(palabras) {
  if (!Array.isArray(palabras) || palabras.length === 0) {
    return { filas: 0, columnas: 0, entradas: [] };
  }

  // Normalizar y filtrar palabras válidas (3 a 12 letras, una sola palabra)
  const candidatos = palabras
    .map((p) => {
      const palabraStr = typeof p === "string" ? p : p.palabra || p.termino || "";
      const pistaStr = typeof p === "string" ? "" : p.pista || p.definicion || "";
      return {
        palabra: util.normalizar(palabraStr),
        pista: pistaStr
      };
    })
    .filter(
      (p) =>
        p.palabra.length >= 3 &&
        p.palabra.length <= 12 &&
        !p.palabra.includes(" ") &&
        !p.palabra.includes("-")
    );

  if (candidatos.length === 0) {
    return { filas: 0, columnas: 0, entradas: [] };
  }

  // Ordenar candidatos por longitud descendente
  const ordenadosPorLargo = [...candidatos].sort((a, b) => b.palabra.length - a.palabra.length);
  const masLarga = ordenadosPorLargo[0];
  const restoCandidatos = ordenadosPorLargo.slice(1);

  const GRID_SIZE = 70;
  const CENTRO = Math.floor(GRID_SIZE / 2);

  let mejorResultado = null;

  // Realizar 30 iteraciones con órdenes aleatorios
  for (let intento = 0; intento < 30; intento++) {
    const barajados = [masLarga, ...util.barajar(restoCandidatos)];

    // Estructuras de la cuadrícula para esta iteración
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const entradasColocadas = [];

    // Colocar la primera palabra en el centro horizontalmente
    const p1 = barajados[0];
    const L1 = p1.palabra.length;
    const r1 = CENTRO;
    const c1 = Math.floor(CENTRO - L1 / 2);

    for (let k = 0; k < L1; k++) {
      grid[r1][c1 + k] = {
        letra: p1.palabra[k],
        horiz: true,
        vert: false
      };
    }

    entradasColocadas.push({
      palabra: p1.palabra,
      pista: p1.pista,
      fila: r1,
      col: c1,
      direccion: "horizontal"
    });

    // Intentar cruzar las siguientes palabras
    for (let idx = 1; idx < barajados.length; idx++) {
      if (entradasColocadas.length >= 12) break; // Objetivo de 8 a 12 palabras

      const cand = barajados[idx];
      const L = cand.palabra.length;
      const posicionesValidas = [];

      for (let i = 0; i < L; i++) {
        const letraCand = cand.palabra[i];

        for (const colocada of entradasColocadas) {
          const L_col = colocada.palabra.length;

          for (let j = 0; j < L_col; j++) {
            if (colocada.palabra[j] === letraCand) {
              let nuevaDir = "";
              let rInicio = 0;
              let cInicio = 0;

              if (colocada.direccion === "horizontal") {
                nuevaDir = "vertical";
                rInicio = colocada.fila - i;
                cInicio = colocada.col + j;
              } else {
                nuevaDir = "horizontal";
                rInicio = colocada.fila + j;
                cInicio = colocada.col - i;
              }

              // Validar si cabe sin conflictos
              if (
                esPosicionValida(grid, cand.palabra, rInicio, cInicio, nuevaDir, GRID_SIZE)
              ) {
                // Calcular distancia al centro como métrica de compacidad
                const distCentro =
                  Math.abs(rInicio + L / 2 - CENTRO) + Math.abs(cInicio + L / 2 - CENTRO);
                posicionesValidas.push({
                  r: rInicio,
                  c: cInicio,
                  dir: nuevaDir,
                  dist: distCentro
                });
              }
            }
          }
        }
      }

      if (posicionesValidas.length > 0) {
        // Elegir la posición más compacta cercana al centro
        posicionesValidas.sort((a, b) => a.dist - b.dist);
        const elegida = posicionesValidas[0];

        // Escribir en la grilla
        for (let k = 0; k < L; k++) {
          const nr = elegida.dir === "horizontal" ? elegida.r : elegida.r + k;
          const nc = elegida.dir === "horizontal" ? elegida.c + k : elegida.c;

          if (!grid[nr][nc]) {
            grid[nr][nc] = {
              letra: cand.palabra[k],
              horiz: elegida.dir === "horizontal",
              vert: elegida.dir === "vertical"
            };
          } else {
            if (elegida.dir === "horizontal") grid[nr][nc].horiz = true;
            if (elegida.dir === "vertical") grid[nr][nc].vert = true;
          }
        }

        entradasColocadas.push({
          palabra: cand.palabra,
          pista: cand.pista,
          fila: elegida.r,
          col: elegida.c,
          direccion: elegida.dir
        });
      }
    }

    // Calcular área de este intento
    let minR = GRID_SIZE,
      maxR = 0,
      minC = GRID_SIZE,
      maxC = 0;

    for (const ent of entradasColocadas) {
      const L = ent.palabra.length;
      const fFin = ent.direccion === "horizontal" ? ent.fila : ent.fila + L - 1;
      const cFin = ent.direccion === "horizontal" ? ent.col + L - 1 : ent.col;

      if (ent.fila < minR) minR = ent.fila;
      if (fFin > maxR) maxR = fFin;
      if (ent.col < minC) minC = ent.col;
      if (cFin > maxC) maxC = cFin;
    }

    const area = (maxR - minR + 1) * (maxC - minC + 1);
    const conteo = entradasColocadas.length;

    if (
      !mejorResultado ||
      conteo > mejorResultado.conteo ||
      (conteo === mejorResultado.conteo && area < mejorResultado.area)
    ) {
      mejorResultado = {
        conteo,
        area,
        entradas: entradasColocadas,
        minR,
        maxR,
        minC,
        maxC
      };
    }
  }

  if (!mejorResultado || mejorResultado.entradas.length === 0) {
    return { filas: 0, columnas: 0, entradas: [] };
  }

  // Recortar la cuadrícula a los límites exactos
  const { minR, maxR, minC, maxC, entradas } = mejorResultado;
  const filas = maxR - minR + 1;
  const columnas = maxC - minC + 1;

  // Normalizar coordenadas restando el desplazamiento mínimo
  const entradasRecortadas = entradas.map((e) => ({
    ...e,
    fila: e.fila - minR,
    col: e.col - minC
  }));

  // Asignar numeración correlativa estándar de crucigramas
  // Casillas iniciales agrupadas por (fila, col)
  const casillasMap = new Map();
  for (const e of entradasRecortadas) {
    const clave = `${e.fila},${e.col}`;
    if (!casillasMap.has(clave)) {
      casillasMap.set(clave, { fila: e.fila, col: e.col });
    }
  }

  const casillasOrdenadas = Array.from(casillasMap.values()).sort((a, b) => {
    if (a.fila !== b.fila) return a.fila - b.fila;
    return a.col - b.col;
  });

  const numPorCasilla = new Map();
  casillasOrdenadas.forEach((c, index) => {
    numPorCasilla.set(`${c.fila},${c.col}`, index + 1);
  });

  const entradasFinales = entradasRecortadas
    .map((e) => ({
      numero: numPorCasilla.get(`${e.fila},${e.col}`),
      palabra: e.palabra,
      pista: e.pista,
      fila: e.fila,
      col: e.col,
      direccion: e.direccion
    }))
    .sort((a, b) => a.numero - b.numero);

  return {
    filas,
    columnas,
    entradas: entradasFinales
  };
}

/**
 * Valida si una palabra puede colocarse en una posición sin tocar palabras en paralelo
 * ni en los extremos, respetando cruces de letras iguales.
 */
function esPosicionValida(grid, palabra, rInicio, cInicio, dir, size) {
  const L = palabra.length;

  // 1. Límites de la cuadrícula
  if (dir === "horizontal") {
    if (rInicio < 2 || rInicio >= size - 2) return false;
    if (cInicio < 2 || cInicio + L >= size - 2) return false;

    // Extremos anterior y posterior deben estar vacíos
    if (grid[rInicio][cInicio - 1] !== null) return false;
    if (grid[rInicio][cInicio + L] !== null) return false;
  } else {
    if (cInicio < 2 || cInicio >= size - 2) return false;
    if (rInicio < 2 || rInicio + L >= size - 2) return false;

    // Extremos superior e inferior deben estar vacíos
    if (grid[rInicio - 1][cInicio] !== null) return false;
    if (grid[rInicio + L][cInicio] !== null) return false;
  }

  let totalCruces = 0;

  for (let k = 0; k < L; k++) {
    const r = dir === "horizontal" ? rInicio : rInicio + k;
    const c = dir === "horizontal" ? cInicio + k : cInicio;
    const letraEsperada = palabra[k];
    const celdaActual = grid[r][c];

    if (celdaActual !== null) {
      // Si la celda está ocupada:
      // Debe tener la misma letra y no estar en la misma dirección
      if (celdaActual.letra !== letraEsperada) return false;
      if (dir === "horizontal" && celdaActual.horiz) return false;
      if (dir === "vertical" && celdaActual.vert) return false;
      totalCruces++;
    } else {
      // Si la celda está vacía:
      // Las celdas adyacentes perpendiculares DEBEN estar vacías para evitar palabras en paralelo
      if (dir === "horizontal") {
        if (grid[r - 1][c] !== null || grid[r + 1][c] !== null) return false;
      } else {
        if (grid[r][c - 1] !== null || grid[r][c + 1] !== null) return false;
      }
    }
  }

  return totalCruces >= 1;
}

// Variables de estado del crucigrama en pantalla
let temaActual = null;
let crucigramaData = null; // { filas, columnas, entradas }
let letrasUsuario = {}; // clave "r,c" => letra
let palabrasResueltas = new Set();
let letrasReveladas = 0;
let entradaSeleccionada = null;
let celdaSeleccionada = null; // { r, c }
let tiempoInicio = Date.now();
let intervaloTimer = null;
let tiempoSegundos = 0;

const contenido = document.getElementById("contenido");

/**
 * Inicia el cronómetro en vivo
 */
function iniciarTimer() {
  if (intervaloTimer) clearInterval(intervaloTimer);
  tiempoInicio = Date.now();
  tiempoSegundos = 0;
  actualizarVistaTimer();

  intervaloTimer = setInterval(() => {
    tiempoSegundos = Math.floor((Date.now() - tiempoInicio) / 1000);
    actualizarVistaTimer();
  }, 1000);
}

function detenerTimer() {
  if (intervaloTimer) {
    clearInterval(intervaloTimer);
    intervaloTimer = null;
  }
}

function actualizarVistaTimer() {
  const el = document.getElementById("cruciTiempo");
  if (!el) return;
  const m = String(Math.floor(tiempoSegundos / 60)).padStart(2, "0");
  const s = String(tiempoSegundos % 60).padStart(2, "0");
  el.textContent = `${m}:${s}`;
}

/**
 * Obtiene las celdas activas que componen la cuadrícula
 */
function construirMapaCeldas(entradas) {
  const celdasLetra = new Map(); // "r,c" => { r, c, letraCorrecta, numero, entradas: [] }

  for (const ent of entradas) {
    const L = ent.palabra.length;
    for (let k = 0; k < L; k++) {
      const r = ent.direccion === "horizontal" ? ent.fila : ent.fila + k;
      const c = ent.direccion === "horizontal" ? ent.col + k : ent.col;
      const clave = `${r},${c}`;

      if (!celdasLetra.has(clave)) {
        celdasLetra.set(clave, {
          r,
          c,
          letraCorrecta: ent.palabra[k],
          numero: k === 0 ? ent.numero : null,
          entradas: [ent]
        });
      } else {
        const existente = celdasLetra.get(clave);
        if (k === 0 && !existente.numero) {
          existente.numero = ent.numero;
        }
        existente.entradas.push(ent);
      }
    }
  }

  return celdasLetra;
}

/**
 * Renderiza la interfaz principal del crucigrama
 */
function renderizarCrucigrama() {
  if (!crucigramaData || crucigramaData.entradas.length === 0) {
    contenido.innerHTML = `
      <div class="cruci-juego">
        <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl);">
          <div style="font-size: 3rem; margin-bottom: var(--espacio-s);">🧩</div>
          <h2 class="tarjeta__titulo">Términos insuficientes para el crucigrama</h2>
          <p class="tarjeta__texto">
            El tema <strong>${ui.escapar(temaActual.titulo)}</strong> no cuenta con suficientes palabras que puedan cruzarse entre sí (se requieren cruces de letras comunes de 3 a 12 letras).
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

  const { filas, columnas, entradas } = crucigramaData;
  const mapaCeldas = construirMapaCeldas(entradas);

  const horizontales = entradas.filter((e) => e.direccion === "horizontal");
  const verticales = entradas.filter((e) => e.direccion === "vertical");

  // Matriz visual
  let htmlCeldas = "";
  for (let r = 0; r < filas; r++) {
    for (let c = 0; c < columnas; c++) {
      const clave = `${r},${c}`;
      if (mapaCeldas.has(clave)) {
        const celda = mapaCeldas.get(clave);
        const numHtml = celda.numero
          ? `<span class="cruci-celda__num" aria-hidden="true">${celda.numero}</span>`
          : "";
        const val = letrasUsuario[clave] || "";

        htmlCeldas += `
          <div
            class="cruci-celda cruci-celda--letra"
            id="celda-${r}-${c}"
            data-r="${r}"
            data-c="${c}"
            role="gridcell"
          >
            ${numHtml}
            <input
              type="text"
              class="cruci-celda__input"
              id="input-${r}-${c}"
              data-r="${r}"
              data-c="${c}"
              maxlength="1"
              value="${val}"
              autocomplete="off"
              aria-label="Casilla fila ${r + 1}, columna ${c + 1}${celda.numero ? ', inicio de palabra ' + celda.numero : ''}"
            />
          </div>
        `;
      } else {
        htmlCeldas += `<div class="cruci-celda cruci-celda--vacia" aria-hidden="true"></div>`;
      }
    }
  }

  contenido.innerHTML = `
    <div class="cruci-juego">
      <header class="cruci-cabecera">
        <div class="cruci-cabecera__info">
          <h1 class="cruci-cabecera__titulo">Crucigrama Pedagógico</h1>
          <span class="cruci-cabecera__tema">📚 Tema: ${ui.escapar(temaActual.titulo)}</span>
        </div>

        <div class="cruci-cabecera__stats">
          <div class="cruci-stat">
            <span>Tiempo:</span>
            <span class="cruci-stat__badge" id="cruciTiempo">00:00</span>
          </div>

          <div class="cruci-stat">
            <span>Progreso:</span>
            <span class="cruci-stat__badge" id="cruciProgreso">0 / ${entradas.length}</span>
          </div>

          <div class="cruci-stat">
            <span>Pistas reveladas:</span>
            <span class="cruci-stat__badge" id="cruciPistasBadge">${letrasReveladas} / ${MAX_LETRAS_REVELADAS}</span>
          </div>
        </div>
      </header>

      <div class="cruci-layout">
        <!-- Columna del tablero -->
        <section class="cruci-tablero-card" aria-label="Tablero del crucigrama">
          <!-- Pista activa actual -->
          <div class="cruci-pista-actual" id="pistaActualBox" aria-live="polite">
            <span class="cruci-pista-actual__num" id="pistaActualNum">Selecciona una casilla</span>
            <span class="cruci-pista-actual__texto" id="pistaActualTexto">Haz clic en una casilla para comenzar a resolver.</span>
          </div>

          <div class="cruci-tablero-wrap">
            <div
              class="cruci-grilla"
              id="cruciGrilla"
              style="--cruci-filas: ${filas}; --cruci-cols: ${columnas};"
              role="grid"
            >
              ${htmlCeldas}
            </div>
          </div>

          <!-- Acciones -->
          <div class="cruci-acciones">
            <button type="button" class="btn btn--secundario" id="btnRevelarLetra" title="Revela la letra de la casilla seleccionada">
              💡 Revelar letra (${MAX_LETRAS_REVELADAS - letrasReveladas} restantes)
            </button>
            <button type="button" class="btn btn--primario" id="btnComprobar">
              ✓ Comprobar palabra
            </button>
            <button type="button" class="btn btn--peligro" id="btnTerminar">
              Terminar crucigrama
            </button>
          </div>

          <div class="cruci-retro-contenedor" id="panel-retro-crucigrama"></div>
        </section>

        <!-- Columna de pistas -->
        <aside class="cruci-pistas-card" aria-label="Lista de pistas del crucigrama">
          <div class="cruci-seccion-pistas">
            <h2 class="cruci-seccion-pistas__titulo">➡ Horizontales</h2>
            <ul class="cruci-pistas-lista" id="listaHorizontales">
              ${horizontales
                .map(
                  (ent) => `
                <li
                  class="cruci-pista-item ${palabrasResueltas.has(ent.palabra) ? "cruci-pista-item--resuelta" : ""}"
                  id="pista-item-${ent.numero}-${ent.direccion}"
                  data-num="${ent.numero}"
                  data-dir="horizontal"
                  role="button"
                  tabindex="0"
                >
                  <span class="cruci-pista-item__num">${ent.numero}.</span>
                  <span>${ui.escapar(ent.pista || "Definición curricular del tema.")}</span>
                </li>
              `
                )
                .join("")}
            </ul>
          </div>

          <div class="cruci-seccion-pistas">
            <h2 class="cruci-seccion-pistas__titulo">⬇ Verticales</h2>
            <ul class="cruci-pistas-lista" id="listaVerticales">
              ${verticales
                .map(
                  (ent) => `
                <li
                  class="cruci-pista-item ${palabrasResueltas.has(ent.palabra) ? "cruci-pista-item--resuelta" : ""}"
                  id="pista-item-${ent.numero}-${ent.direccion}"
                  data-num="${ent.numero}"
                  data-dir="vertical"
                  role="button"
                  tabindex="0"
                >
                  <span class="cruci-pista-item__num">${ent.numero}.</span>
                  <span>${ui.escapar(ent.pista || "Definición curricular del tema.")}</span>
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

  enlazarEventos();
  iniciarTimer();

  // Seleccionar la primera palabra por defecto
  if (entradas.length > 0) {
    seleccionarEntrada(entradas[0], entradas[0].fila, entradas[0].col);
  }
}

/**
 * Enlaza la interacción del tablero: inputs, flechas, retroceso, pistas y botones
 */
function enlazarEventos() {
  const grilla = document.getElementById("cruciGrilla");
  if (!grilla) return;

  const mapaCeldas = construirMapaCeldas(crucigramaData.entradas);

  // 1. Clics en celdas de la grilla
  grilla.querySelectorAll(".cruci-celda--letra").forEach((celdaEl) => {
    const r = parseInt(celdaEl.dataset.r, 10);
    const c = parseInt(celdaEl.dataset.c, 10);
    const info = mapaCeldas.get(`${r},${c}`);
    if (!info) return;

    // Clic simple: seleccionar palabra o alternar dirección si ya estaba seleccionada
    celdaEl.addEventListener("click", () => {
      if (celdaSeleccionada && celdaSeleccionada.r === r && celdaSeleccionada.c === c) {
        // Alternar dirección si la casilla pertenece a más de una entrada
        if (info.entradas.length > 1) {
          const otraEntrada = info.entradas.find((e) => e !== entradaSeleccionada) || info.entradas[0];
          seleccionarEntrada(otraEntrada, r, c);
          return;
        }
      }

      // Si pertenece a la entrada activa actual, mantenerla
      let elegida = info.entradas.find((e) => e === entradaSeleccionada);
      if (!elegida) {
        // Preferir entrada con la misma dirección activa previa o la primera
        elegida =
          info.entradas.find((e) => entradaSeleccionada && e.direccion === entradaSeleccionada.direccion) ||
          info.entradas[0];
      }

      seleccionarEntrada(elegida, r, c);
    });

    // Doble clic: alternar dirección
    celdaEl.addEventListener("dblclick", () => {
      if (info.entradas.length > 1) {
        const otraEntrada = info.entradas.find((e) => e !== entradaSeleccionada) || info.entradas[0];
        seleccionarEntrada(otraEntrada, r, c);
      }
    });

    // Manejo de teclado en el input de la celda
    const input = celdaEl.querySelector(".cruci-celda__input");
    if (!input) return;

    input.addEventListener("keydown", (e) => {
      manejarTecladoCelda(e, r, c, info);
    });

    input.addEventListener("input", (e) => {
      const val = input.value.trim().toUpperCase();
      const letra = val ? val[val.length - 1] : "";
      input.value = letra;
      letrasUsuario[`${r},${c}`] = letra;

      if (letra) {
        avanzarSiguienteCelda(r, c);
      }
    });
  });

  // 2. Clics en la lista de pistas
  document.querySelectorAll(".cruci-pista-item").forEach((item) => {
    const num = parseInt(item.dataset.num, 10);
    const dir = item.dataset.dir;

    const manejarSeleccion = () => {
      const entrada = crucigramaData.entradas.find((e) => e.numero === num && e.direccion === dir);
      if (entrada) {
        seleccionarEntrada(entrada, entrada.fila, entrada.col);
      }
    };

    item.addEventListener("click", manejarSeleccion);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        manejarSeleccion();
      }
    });
  });

  // 3. Botones de acción
  document.getElementById("btnComprobar")?.addEventListener("click", comprobarPalabraActiva);
  document.getElementById("btnRevelarLetra")?.addEventListener("click", revelarLetraActual);
  document.getElementById("btnTerminar")?.addEventListener("click", () => terminarJuego(false));
}

/**
 * Selecciona una entrada y enfoca la casilla correspondiente
 */
function seleccionarEntrada(entrada, rFoco, cFoco) {
  if (!entrada) return;
  entradaSeleccionada = entrada;
  celdaSeleccionada = { r: rFoco, c: cFoco };

  // 1. Desmarcar selecciones anteriores
  document.querySelectorAll(".cruci-celda--activa-palabra").forEach((el) => {
    el.classList.remove("cruci-celda--activa-palabra");
  });
  document.querySelectorAll(".cruci-celda--foco").forEach((el) => {
    el.classList.remove("cruci-celda--foco");
  });
  document.querySelectorAll(".cruci-pista-item--activa").forEach((el) => {
    el.classList.remove("cruci-pista-item--activa");
  });

  // 2. Resaltar todas las celdas de la entrada
  const L = entrada.palabra.length;
  for (let k = 0; k < L; k++) {
    const r = entrada.direccion === "horizontal" ? entrada.fila : entrada.fila + k;
    const c = entrada.direccion === "horizontal" ? entrada.col + k : entrada.col;
    const celdaEl = document.getElementById(`celda-${r}-${c}`);
    if (celdaEl) {
      celdaEl.classList.add("cruci-celda--activa-palabra");
    }
  }

  // 3. Resaltar y enfocar la celda activa
  const celdaFocoEl = document.getElementById(`celda-${rFoco}-${cFoco}`);
  if (celdaFocoEl) {
    celdaFocoEl.classList.add("cruci-celda--foco");
    const input = celdaFocoEl.querySelector(".cruci-celda__input");
    if (input) {
      input.focus();
      input.select();
    }
  }

  // 4. Actualizar pista activa en el banner
  const dirTexto = entrada.direccion === "horizontal" ? "Horizontal" : "Vertical";
  const pNum = document.getElementById("pistaActualNum");
  const pTexto = document.getElementById("pistaActualTexto");
  if (pNum) pNum.textContent = `${entrada.numero} ${dirTexto} (${L} letras)`;
  if (pTexto) pTexto.textContent = entrada.pista || "Definición conceptual del tema.";

  // 5. Resaltar ítem en la lista lateral
  const pistaItem = document.getElementById(`pista-item-${entrada.numero}-${entrada.direccion}`);
  if (pistaItem) {
    pistaItem.classList.add("cruci-pista-item--activa");
    pistaItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/**
 * Manejo de eventos de teclado dentro de una celda: flechas, retroceso y barra espaciadora
 */
function manejarTecladoCelda(e, r, c, info) {
  if (!entradaSeleccionada) return;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    moverCursor(r, c + 1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    moverCursor(r, c - 1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    moverCursor(r + 1, c);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moverCursor(r - 1, c);
  } else if (e.key === "Backspace") {
    const input = document.getElementById(`input-${r}-${c}`);
    if (input && input.value) {
      // Borrar celda actual
      input.value = "";
      letrasUsuario[`${r},${c}`] = "";
    } else {
      // Retroceder a la celda anterior y borrarla
      retrocederCelda(r, c);
    }
  } else if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    // Alternar dirección si hay cruce
    if (info.entradas.length > 1) {
      const otraEntrada = info.entradas.find((ent) => ent !== entradaSeleccionada) || info.entradas[0];
      seleccionarEntrada(otraEntrada, r, c);
    }
  }
}

/**
 * Mueve el cursor a una celda adyacente si es parte del crucigrama
 */
function moverCursor(nr, nc) {
  const mapaCeldas = construirMapaCeldas(crucigramaData.entradas);
  const info = mapaCeldas.get(`${nr},${nc}`);
  if (!info) return;

  let elegida = info.entradas.find((e) => e === entradaSeleccionada);
  if (!elegida) {
    elegida =
      info.entradas.find((e) => entradaSeleccionada && e.direccion === entradaSeleccionada.direccion) ||
      info.entradas[0];
  }
  seleccionarEntrada(elegida, nr, nc);
}

/**
 * Avanza automáticamente a la siguiente celda de la palabra activa
 */
function avanzarSiguienteCelda(r, c) {
  if (!entradaSeleccionada) return;
  const L = entradaSeleccionada.palabra.length;
  const esHoriz = entradaSeleccionada.direccion === "horizontal";

  const kActual = esHoriz ? c - entradaSeleccionada.col : r - entradaSeleccionada.fila;
  if (kActual < L - 1) {
    const sigR = esHoriz ? r : r + 1;
    const sigC = esHoriz ? c + 1 : c;
    seleccionarEntrada(entradaSeleccionada, sigR, sigC);
  }
}

/**
 * Retrocede a la casilla anterior en la palabra activa y la borra
 */
function retrocederCelda(r, c) {
  if (!entradaSeleccionada) return;
  const esHoriz = entradaSeleccionada.direccion === "horizontal";
  const kActual = esHoriz ? c - entradaSeleccionada.col : r - entradaSeleccionada.fila;

  if (kActual > 0) {
    const prevR = esHoriz ? r : r - 1;
    const prevC = esHoriz ? c - 1 : c;
    const prevInput = document.getElementById(`input-${prevR}-${prevC}`);
    if (prevInput) {
      prevInput.value = "";
      letrasUsuario[`${prevR},${prevC}`] = "";
    }
    seleccionarEntrada(entradaSeleccionada, prevR, prevC);
  }
}

/**
 * Comprueba la palabra actualmente activa
 */
function comprobarPalabraActiva() {
  if (!entradaSeleccionada) {
    ui.aviso("Selecciona una palabra primero.", "alerta");
    return;
  }

  const ent = entradaSeleccionada;
  const L = ent.palabra.length;
  let letrasIngresadas = "";
  const celdasPalabra = [];

  for (let k = 0; k < L; k++) {
    const r = ent.direccion === "horizontal" ? ent.fila : ent.fila + k;
    const c = ent.direccion === "horizontal" ? ent.col + k : ent.col;
    const val = (letrasUsuario[`${r},${c}`] || "").toUpperCase();
    letrasIngresadas += val;
    celdasPalabra.push({ r, c, esperada: ent.palabra[k], ingresada: val });
  }

  if (letrasIngresadas === ent.palabra) {
    // Correcta
    palabrasResueltas.add(ent.palabra);

    celdasPalabra.forEach(({ r, c }) => {
      const el = document.getElementById(`celda-${r}-${c}`);
      if (el) {
        el.classList.add("cruci-celda--correcta");
        el.classList.remove("cruci-celda--incorrecta");
      }
    });

    const pItem = document.getElementById(`pista-item-${ent.numero}-${ent.direccion}`);
    if (pItem) pItem.classList.add("cruci-pista-item--resuelta");

    const progresoEl = document.getElementById("cruciProgreso");
    if (progresoEl) {
      progresoEl.textContent = `${palabrasResueltas.size} / ${crucigramaData.entradas.length}`;
    }

    mostrarRetro(
      {
        correcto: true,
        explicacion: `¡Excelente! ${ent.palabra}: ${ent.pista || "Concepto clave del tema."}`,
        enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
      },
      "#panel-retro-crucigrama"
    );

    // Verificar si se resolvió todo el crucigrama
    if (palabrasResueltas.size === crucigramaData.entradas.length) {
      terminarJuego(true);
    }
  } else {
    // Incorrecta
    celdasPalabra.forEach(({ r, c, esperada, ingresada }) => {
      const el = document.getElementById(`celda-${r}-${c}`);
      if (el && ingresada && ingresada !== esperada) {
        el.classList.add("cruci-celda--incorrecta");
        setTimeout(() => el.classList.remove("cruci-celda--incorrecta"), 800);
      }
    });

    mostrarRetro(
      {
        correcto: false,
        explicacion: "La palabra ingresada aún no es correcta. ¡Revisa la pista y las letras cruzadas!",
        enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
      },
      "#panel-retro-crucigrama"
    );
  }
}

/**
 * Revela la letra de la casilla actualmente seleccionada (máximo 3)
 */
function revelarLetraActual() {
  if (letrasReveladas >= MAX_LETRAS_REVELADAS) {
    ui.aviso("Ya has utilizado las 3 pistas de letras disponibles.", "alerta");
    return;
  }

  if (!celdaSeleccionada || !entradaSeleccionada) {
    ui.aviso("Selecciona una casilla para revelar su letra.", "alerta");
    return;
  }

  const { r, c } = celdaSeleccionada;
  const mapaCeldas = construirMapaCeldas(crucigramaData.entradas);
  const info = mapaCeldas.get(`${r},${c}`);
  if (!info) return;

  const input = document.getElementById(`input-${r}-${c}`);
  const celdaEl = document.getElementById(`celda-${r}-${c}`);

  if (input) {
    input.value = info.letraCorrecta;
    letrasUsuario[`${r},${c}`] = info.letraCorrecta;
    celdaEl?.classList.add("cruci-celda--revelada");

    letrasReveladas++;

    const badge = document.getElementById("cruciPistasBadge");
    if (badge) badge.textContent = `${letrasReveladas} / ${MAX_LETRAS_REVELADAS}`;

    const btn = document.getElementById("btnRevelarLetra");
    if (btn) {
      btn.textContent = `💡 Revelar letra (${MAX_LETRAS_REVELADAS - letrasReveladas} restantes)`;
      if (letrasReveladas >= MAX_LETRAS_REVELADAS) {
        btn.disabled = true;
      }
    }

    avanzarSiguienteCelda(r, c);
  }
}

/**
 * Finaliza el juego, calcula aciertos/errores, registra el intento y despliega resumen
 */
async function terminarJuego(victoriaAutomatica = false) {
  detenerTimer();

  // Contar palabras correctamente resueltas
  let palabrasCorrectas = 0;
  for (const ent of crucigramaData.entradas) {
    const L = ent.palabra.length;
    let correcta = true;
    for (let k = 0; k < L; k++) {
      const r = ent.direccion === "horizontal" ? ent.fila : ent.fila + k;
      const c = ent.direccion === "horizontal" ? ent.col + k : ent.col;
      if ((letrasUsuario[`${r},${c}`] || "").toUpperCase() !== ent.palabra[k]) {
        correcta = false;
        break;
      }
    }
    if (correcta) palabrasCorrectas++;
  }

  const total = crucigramaData.entradas.length;
  const incorrectas = total - palabrasCorrectas;
  const errores = incorrectas + letrasReveladas;

  // Registrar intento en el servidor
  try {
    await registrarIntento({
      actividad: "crucigrama",
      temaId: temaActual.id,
      puntaje: palabrasCorrectas,
      maximo: total,
      errores,
      duracionSeg: tiempoSegundos
    });
  } catch (err) {
    console.warn("No se pudo registrar intento de crucigrama:", err.message);
  }

  const recomendaciones =
    palabrasCorrectas === total
      ? "¡Extraordinario! Completaste todas las palabras del crucigrama curricular."
      : "Te recomendamos repasar las definiciones de los conceptos pendientes en el glosario.";

  const accion = await mostrarResumen({
    titulo: victoriaAutomatica ? "¡Crucigrama Completado!" : "Resumen del Crucigrama",
    aciertos: palabrasCorrectas,
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
 * Inicia la partida cargando candidatos y generando el crucigrama
 */
async function iniciarPartida() {
  letrasUsuario = {};
  palabrasResueltas.clear();
  letrasReveladas = 0;
  entradaSeleccionada = null;
  celdaSeleccionada = null;

  try {
    ui.cargando(true);

    const glosario = await api.listar("glosario", { temaId: temaActual.id });
    const listaGlosario = Array.isArray(glosario) ? glosario : [];

    // Términos de una sola palabra, normalizados, de 3 a 12 letras
    const candidatosAptos = listaGlosario
      .filter((t) => {
        if (!t || !t.termino) return false;
        if (t.estado && t.estado !== "aprobado") return false;
        const limpio = t.termino.trim();
        if (limpio.includes(" ") || limpio.includes("-")) return false;
        const norm = util.normalizar(limpio);
        return norm.length >= 3 && norm.length <= 12;
      })
      .map((t) => ({
        palabra: util.normalizar(t.termino.trim()),
        pista: t.definicion || "Concepto clave del tema."
      }));

    // Tomar hasta 15 candidatos al azar
    const muestra = util.barajar(candidatosAptos).slice(0, 15);

    crucigramaData = generarCrucigrama(muestra);
    renderizarCrucigrama();
  } catch (err) {
    ui.aviso("Error al preparar el crucigrama: " + err.message, "peligro");
  } finally {
    ui.cargando(false);
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
        <div class="cruci-juego">
          <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl);">
            <div style="font-size: 3rem; margin-bottom: var(--espacio-s);">🧩</div>
            <h2 class="tarjeta__titulo">No se seleccionó ningún tema</h2>
            <p class="tarjeta__texto">Debes seleccionar un tema pedagógico para jugar al crucigrama.</p>
            <div style="margin-top: var(--espacio-m);">
              <a href="/paginas/actividades.html" class="btn btn--primario">Volver a actividades</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    await iniciarPartida();
  } catch (err) {
    ui.aviso("Error al inicializar el crucigrama: " + err.message, "peligro");
  } finally {
    ui.cargando(false);
  }
}

inicializar();

export default {
  generarCrucigrama
};
