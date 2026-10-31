// publico/js/modulos/ahorcado.js · Juego pedagógico del Ahorcado con globo no violento

import { montarPlantilla } from "../nucleo/plantilla.js";
import { obtenerTemaActividad } from "../nucleo/selector-tema.js";
import { mostrarRetro } from "../nucleo/retroalimentacion.js";
import { registrarIntento } from "../nucleo/gamificacion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Ahorcado", roles: ["estudiante", "docente"] });

const contenido = document.getElementById("contenido");

const LETRAS_TECLADO = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "Ñ", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

let temaActual = null;
let terminosAptos = [];
const terminosUsadosIds = new Set();

let terminoActual = null;
let palabraNormalizada = "";
let letrasAdivinadas = new Set();
let letrasFalladas = new Set();
let errores = 0;
let juegoTerminado = false;
let tiempoInicio = Date.now();

async function inicializar() {
  ui.cargando(true);
  try {
    temaActual = await obtenerTemaActividad();

    if (!temaActual) {
      contenido.innerHTML = `
        <div class="vacio">
          <div class="vacio__icono">📚</div>
          <h2 class="vacio__titulo">No se seleccionó ningún tema</h2>
          <p class="vacio__texto">Debes seleccionar un tema pedagógico para jugar al ahorcado.</p>
          <a href="/paginas/actividades.html" class="btn btn--primario">Volver a actividades</a>
        </div>
      `;
      return;
    }

    const glosario = await api.listar("glosario", { temaId: temaActual.id });
    const listaGlosario = Array.isArray(glosario) ? glosario : [];

    // Términos de exactamente 6 letras normalizadas y aprobados
    terminosAptos = listaGlosario.filter((t) => {
      if (!t || !t.termino) return false;
      if (t.estado && t.estado !== "aprobado") return false;
      const normal = util.normalizar(t.termino);
      return normal.length === 6;
    });

    if (terminosAptos.length === 0) {
      contenido.innerHTML = `
        <div class="ahorcado-juego">
          <div class="vacio">
            <div class="vacio__icono">📭</div>
            <h2 class="vacio__titulo">No hay palabras disponibles</h2>
            <p class="vacio__texto">
              El tema <strong>${ui.escapar(temaActual.titulo)}</strong> no cuenta con términos de 6 letras en su glosario para jugar al ahorcado.
            </p>
            <div class="fila" style="gap: var(--espacio-s);">
              <a href="/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}" class="btn btn--primario">
                Repasar el tema &rarr;
              </a>
              <button type="button" class="btn btn--secundario" id="btnCambiarTemaVacio">
                Elegir otro tema
              </button>
            </div>
          </div>
        </div>
      `;

      const btnCambiar = document.getElementById("btnCambiarTemaVacio");
      if (btnCambiar) {
        btnCambiar.addEventListener("click", () => {
          window.location.href = "/paginas/ahorcado.html";
        });
      }
      return;
    }

    iniciarPartida();
  } catch (err) {
    ui.aviso("Error al iniciar el juego: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

function iniciarPartida() {
  let disponibles = terminosAptos.filter((t) => !terminosUsadosIds.has(t.id));

  // Si ya se usaron todos los términos de 6 letras del tema, reiniciar ciclo
  if (disponibles.length === 0) {
    terminosUsadosIds.clear();
    disponibles = [...terminosAptos];
  }

  const barajados = util.barajar(disponibles);
  terminoActual = barajados[0];
  terminosUsadosIds.add(terminoActual.id);

  palabraNormalizada = util.normalizar(terminoActual.termino);
  letrasAdivinadas.clear();
  letrasFalladas.clear();
  errores = 0;
  juegoTerminado = false;
  tiempoInicio = Date.now();

  renderizarTablero();
}

function generarSvgGlobo(estado) {
  return `
    <svg class="globo-svg globo--estado-${estado}" viewBox="0 0 160 180" aria-label="Globo con ${estado} de 4 errores permitidos" role="img">
      <!-- Cuerda ondulada -->
      <path class="globo__cuerda" d="M 80 125 Q 75 145 85 155 T 80 175" />
      
      <!-- Aire escapando (estados de desinflado) -->
      <path class="globo__aire" d="M 72 130 L 60 142 M 88 130 L 100 142" />
      
      <!-- Nudo del globo -->
      <polygon class="globo__nudo" points="75,122 85,122 80,128" />
      
      <!-- Cuerpo del globo -->
      <ellipse class="globo__cuerpo" cx="80" cy="70" rx="55" ry="58" />
    </svg>
  `;
}

function renderizarTablero() {
  const estadoGlobo = Math.min(errores, 4);

  // Casillas de 6 letras
  const casillasHtml = palabraNormalizada
    .split("")
    .map((letra) => {
      const acertada = letrasAdivinadas.has(letra);
      let contenidoLetra = "";
      let claseExtra = "";

      if (acertada) {
        contenidoLetra = letra;
        claseExtra = "casilla-letra--acierto";
      } else if (juegoTerminado) {
        contenidoLetra = letra;
        claseExtra = "casilla-letra--revelada";
      }

      return `<div class="casilla-letra ${claseExtra}">${contenidoLetra}</div>`;
    })
    .join("");

  // Teclado virtual
  const tecladoHtml = LETRAS_TECLADO.map((letra) => {
    let claseTecla = "";
    let deshabilitada = juegoTerminado;

    if (letrasAdivinadas.has(letra)) {
      claseTecla = "tecla-btn--acierto";
      deshabilitada = true;
    } else if (letrasFalladas.has(letra)) {
      claseTecla = "tecla-btn--fallo";
      deshabilitada = true;
    }

    return `
      <button type="button" class="tecla-btn ${claseTecla}" data-letra="${letra}" ${deshabilitada ? "disabled" : ""}>
        ${letra}
      </button>
    `;
  }).join("");

  // Vidas (3 errores permitidos, 4to pierde)
  const vidasHtml = [1, 2, 3]
    .map((num) => {
      const perdida = errores >= num;
      return `<span class="ahorcado__vida ${perdida ? "ahorcado__vida--perdida" : ""}" title="${perdida ? "Oportunidad perdida" : "Oportunidad disponible"}">🎈</span>`;
    })
    .join("");

  contenido.innerHTML = `
    <div class="ahorcado-juego">
      <header class="ahorcado__cabecera">
        <div>
          <a href="/paginas/actividades.html" class="btn btn--texto btn--pequeno" style="padding-left: 0;">&larr; Volver a Actividades</a>
          <h1 class="h2" style="margin-bottom: 2px;">El Ahorcado</h1>
          <div class="ahorcado__tema-info">📚 Tema: ${ui.escapar(temaActual.titulo)}</div>
        </div>

        <div class="fila" style="gap: var(--espacio-s);">
          <button type="button" class="btn btn--secundario btn--pequeno" id="btnCambiarTema">
            Cambiar tema
          </button>
        </div>
      </header>

      <section class="ahorcado__tablero" aria-label="Tablero de juego">
        <div class="ahorcado__figura-contenedor" id="figuraGlobo">
          ${generarSvgGlobo(estadoGlobo)}
        </div>

        <div class="ahorcado__marcador">
          <span>Oportunidades restantes:</span>
          <div class="ahorcado__vidas">${vidasHtml}</div>
          <span style="margin-left: var(--espacio-xs); font-size: var(--tamano-xs); color: ${errores >= 3 ? "var(--peligro)" : "var(--texto-secundario)"};">
            (${errores} de 3 errores · el 4to termina la partida)
          </span>
        </div>

        <div class="ahorcado__pista">
          <strong>Pista:</strong> ${ui.escapar(terminoActual.pista || "Concepto clave del tema")}
        </div>

        <div class="ahorcado__palabra" aria-label="Casillas de la palabra">
          ${casillasHtml}
        </div>

        <div class="ahorcado__teclado" aria-label="Teclado para adivinar letras">
          ${tecladoHtml}
        </div>

        <div id="panelRetroAhorcado" style="width: 100%;"></div>

        ${
          juegoTerminado
            ? `
            <div class="ahorcado__acciones">
              <button type="button" class="btn btn--primario" id="btnOtraPalabra">
                Otra palabra &rarr;
              </button>
            </div>
          `
            : ""
        }
      </section>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const btnCambiar = document.getElementById("btnCambiarTema");
  if (btnCambiar) {
    btnCambiar.addEventListener("click", () => {
      window.location.href = "/paginas/ahorcado.html";
    });
  }

  const btnOtra = document.getElementById("btnOtraPalabra");
  if (btnOtra) {
    btnOtra.addEventListener("click", () => {
      iniciarPartida();
    });
  }

  document.querySelectorAll(".tecla-btn:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const letra = btn.getAttribute("data-letra");
      if (letra) intentarLetra(letra);
    });
  });
}

async function intentarLetra(letra) {
  if (juegoTerminado) return;
  if (letrasAdivinadas.has(letra) || letrasFalladas.has(letra)) return;

  if (palabraNormalizada.includes(letra)) {
    letrasAdivinadas.add(letra);

    // Verificar si ya completó la palabra
    const gano = palabraNormalizada.split("").every((l) => letrasAdivinadas.has(l));
    if (gano) {
      await finalizarPartida(true);
      return;
    }
  } else {
    letrasFalladas.add(letra);
    errores++;

    // El juego termina en el cuarto error
    if (errores >= 4) {
      await finalizarPartida(false);
      return;
    }
  }

  renderizarTablero();
}

async function finalizarPartida(gano) {
  juegoTerminado = true;
  const duracionSeg = Math.max(1, Math.round((Date.now() - tiempoInicio) / 1000));
  const puntaje = gano ? Math.max(0, 10 - errores * 2) : 0;

  renderizarTablero();

  // Mostrar panel de retroalimentación inmediata
  mostrarRetro(
    {
      correcto: gano,
      explicacion: terminoActual.definicion || "Término formativo del glosario.",
      sugerencia: terminoActual.retroalimentacion || terminoActual.pista || "",
      enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
    },
    "#panelRetroAhorcado"
  );

  // Registrar intento en el motor de gamificación
  try {
    await registrarIntento({
      actividad: "ahorcado",
      temaId: temaActual.id,
      puntaje,
      maximo: 10,
      errores,
      duracionSeg
    });
  } catch (err) {
    console.warn("No se pudo registrar intento de ahorcado:", err);
  }
}

// Escuchar teclado físico
window.addEventListener("keydown", (e) => {
  if (juegoTerminado) return;
  if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

  const normal = util.normalizar(e.key);
  if (normal && normal.length === 1 && /^[A-ZÑ]$/.test(normal)) {
    intentarLetra(normal);
  }
});

await inicializar();
