// publico/js/modulos/quiz.js · Vista del quiz formativo por niveles y diplomas

import { montarPlantilla } from "../nucleo/plantilla.js";
import { obtenerTemaActividad } from "../nucleo/selector-tema.js";
import { mostrarRetro, mostrarResumen } from "../nucleo/retroalimentacion.js";
import { mostrarLogros } from "../nucleo/gamificacion.js";
import { generarDiploma } from "../nucleo/pdf.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Quiz por Niveles", roles: ["estudiante"] });

const contenido = document.getElementById("contenido");

const DESCRIPCIONES_BLOOM = {
  1: "Evocación de hechos, conceptos y definiciones clave.",
  2: "Explicación e interpretación de ideas fundamentales.",
  3: "Uso de la información en situaciones y problemas nuevos.",
  4: "Descomposición y diferenciación de componentes.",
  5: "Justificación de juicios y criterios pedagógicos."
};

let temaActual = null;
let nivelesEstado = [];
let sesionActiva = null;
let respuestaSeleccionada = null;

async function inicializar() {
  ui.cargando(true);
  try {
    temaActual = await obtenerTemaActividad();
    if (!temaActual) {
      contenido.innerHTML = `
        <div class="vacio">
          <div class="vacio__icono">📚</div>
          <h2 class="vacio__titulo">No se seleccionó ningún tema</h2>
          <p class="vacio__texto">Debes seleccionar un tema pedagógico para acceder a sus evaluaciones por niveles.</p>
          <a href="/paginas/actividades.html" class="btn btn--primario">Volver a actividades</a>
        </div>
      `;
      return;
    }

    await cargarEstadoNiveles();
    renderizarSeleccionNiveles();
  } catch (err) {
    ui.aviso("Error al cargar el quiz: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

async function cargarEstadoNiveles() {
  const res = await api.llamar("GET", `/api/quiz/estado?temaId=${encodeURIComponent(temaActual.id)}`);
  nivelesEstado = Array.isArray(res?.niveles) ? res.niveles : [];
}

/**
 * Pantalla principal: Grilla de 5 tarjetas de niveles de Bloom
 */
function renderizarSeleccionNiveles() {
  sesionActiva = null;

  const tarjetasHtml = nivelesEstado
    .map((n) => {
      const esAprobado = n.estado === "aprobado";
      const esDisponible = n.estado === "disponible";
      const esBloqueado = n.estado === "bloqueado";

      let claseTarjeta = "nivel-tarjeta";
      let claseBadge = "badge--neutro";
      let textoBadge = "Bloqueado";

      if (esAprobado) {
        claseTarjeta += " nivel-tarjeta--aprobado";
        claseBadge = "badge--exito";
        textoBadge = "✓ Aprobado";
      } else if (esDisponible) {
        claseTarjeta += " nivel-tarjeta--disponible";
        claseBadge = "badge--primario";
        textoBadge = "Disponible";
      } else {
        claseTarjeta += " nivel-tarjeta--bloqueado";
      }

      const desc = DESCRIPCIONES_BLOOM[n.nivel] || "";
      const mejorPct = n.mejorPorcentaje ? `${n.mejorPorcentaje}%` : "Sin intentos";

      let accionesHtml = "";
      if (esAprobado) {
        accionesHtml = `
          <div class="fila" style="gap: var(--espacio-xs); flex-wrap: wrap;">
            <button type="button" class="btn btn--secundario btn--pequeno btnIniciarNivel" data-nivel="${n.nivel}">
              🔄 Repetir
            </button>
            <button type="button" class="btn btn--primario btn--pequeno btnDescargarDiploma" data-nivel="${n.nivel}">
              📜 Diploma
            </button>
          </div>
        `;
      } else if (esDisponible) {
        accionesHtml = `
          <button type="button" class="btn btn--primario btn--pequeno btnIniciarNivel" data-nivel="${n.nivel}">
            Comenzar nivel &rarr;
          </button>
        `;
      } else {
        accionesHtml = `
          <button type="button" class="btn btn--secundario btn--pequeno" disabled style="opacity: 0.6;">
            🔒 Bloqueado
          </button>
        `;
      }

      return `
        <article class="${claseTarjeta}">
          <div>
            <div class="nivel-tarjeta__cabecera">
              <span class="nivel-tarjeta__num">Nivel ${n.nivel}</span>
              <span class="badge ${claseBadge}">${textoBadge}</span>
            </div>
            <h3 class="nivel-tarjeta__titulo">${ui.escapar(n.nombre)}</h3>
            <p class="nivel-tarjeta__desc">${ui.escapar(desc)}</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--espacio-s);">
            <div class="nivel-tarjeta__metrica">
              <span class="texto-secundario">Mejor porcentaje:</span>
              <strong>${mejorPct}</strong>
            </div>
            ${accionesHtml}
          </div>
        </article>
      `;
    })
    .join("");

  contenido.innerHTML = `
    <div class="quiz-contenedor">
      <header class="quiz__cabecera">
        <div>
          <a href="/paginas/actividades.html" class="btn btn--texto btn--pequeno" style="padding-left: 0;">&larr; Volver a Actividades</a>
          <h1 class="h2" style="margin-bottom: 2px;">Quiz Formativo por Niveles</h1>
          <div class="quiz__tema-info">📚 Tema: <strong>${ui.escapar(temaActual.titulo)}</strong></div>
        </div>
        <button type="button" class="btn btn--secundario btn--pequeno" id="btnCambiarTemaQuiz">
          Cambiar tema
        </button>
      </header>

      <div class="quiz__grid-niveles">
        ${tarjetasHtml}
      </div>
    </div>
  `;

  // Eventos de selección de nivel
  const btnCambiar = document.getElementById("btnCambiarTemaQuiz");
  if (btnCambiar) {
    btnCambiar.addEventListener("click", () => {
      window.location.href = "/paginas/quiz.html";
    });
  }

  document.querySelectorAll(".btnIniciarNivel").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.getAttribute("data-nivel"), 10);
      if (n) iniciarNivel(n);
    });
  });

  document.querySelectorAll(".btnDescargarDiploma").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.getAttribute("data-nivel"), 10);
      if (n) generarDiploma({ tipo: "nivel-quiz", temaId: temaActual.id, nivel: n });
    });
  });
}

/**
 * Inicia la sesión de evaluación para un nivel
 */
async function iniciarNivel(nivelNum) {
  ui.cargando(true);
  try {
    const res = await api.llamar("POST", "/api/quiz/iniciar", {
      temaId: temaActual.id,
      nivel: nivelNum
    });

    if (!res || !res.sesionId || !Array.isArray(res.preguntas) || res.preguntas.length === 0) {
      ui.aviso("No se pudieron cargar preguntas para este nivel.", "error");
      return;
    }

    sesionActiva = {
      sesionId: res.sesionId,
      nivel: nivelNum,
      preguntas: res.preguntas,
      indiceActual: 0,
      respondida: false
    };

    renderizarPreguntaActual();
  } catch (err) {
    ui.aviso("Error al iniciar nivel: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

/**
 * Renderiza la pregunta actual con barra de progreso y opciones interactivas
 */
function renderizarPreguntaActual() {
  if (!sesionActiva) return;

  const { preguntas, indiceActual, nivel } = sesionActiva;
  const total = preguntas.length;
  const pregunta = preguntas[indiceActual];
  const porcentajeProgreso = Math.round(((indiceActual + 1) / total) * 100);

  respuestaSeleccionada = null;
  sesionActiva.respondida = false;

  let opcionesHtml = "";

  if (pregunta.tipo === "opcion") {
    opcionesHtml = `
      <div class="quiz-opciones-lista" role="radiogroup" aria-label="Opciones de respuesta">
        ${(pregunta.opciones || [])
          .map((opc, idx) => `
            <label class="quiz-opcion-item" data-index="${idx}">
              <span class="quiz-opcion-item__letra">${String.fromCharCode(65 + idx)}</span>
              <span class="quiz-opcion-item__texto">${ui.escapar(opc)}</span>
              <input type="radio" name="quizOpcionRadio" value="${idx}" style="display: none;">
            </label>
          `)
          .join("")}
      </div>
    `;
  } else if (pregunta.tipo === "vf") {
    opcionesHtml = `
      <div class="quiz-vf-grid">
        <button type="button" class="quiz-vf-btn" data-vf="true">Verdadero</button>
        <button type="button" class="quiz-vf-btn" data-vf="false">Falso</button>
      </div>
    `;
  } else if (pregunta.tipo === "completar") {
    opcionesHtml = `
      <div class="quiz-completar-campo">
        <label for="inputCompletar" class="etiqueta">Escribe la palabra o frase que completa el enunciado:</label>
        <input type="text" id="inputCompletar" class="quiz-completar-input" placeholder="Tu respuesta..." autocomplete="off">
      </div>
    `;
  }

  contenido.innerHTML = `
    <div class="quiz-contenedor">
      <div class="quiz-sesion">
        <header class="quiz__progreso-barra-container">
          <div class="quiz__progreso-texto">
            <span>Nivel ${nivel}: ${ui.escapar(DESCRIPCIONES_BLOOM[nivel] ? DESCRIPCIONES_BLOOM[nivel].slice(0, 30) + "..." : "")}</span>
            <span>Pregunta ${indiceActual + 1} de ${total}</span>
          </div>
          <div class="quiz__barra" role="progressbar" aria-valuenow="${porcentajeProgreso}" aria-valuemin="0" aria-valuemax="100">
            <div class="quiz__barra-relleno" style="width: ${porcentajeProgreso}%;"></div>
          </div>
        </header>

        <div class="quiz-pregunta__enunciado">
          ${ui.escapar(pregunta.enunciado)}
        </div>

        <div class="quiz-pregunta__contenedor-opciones">
          ${opcionesHtml}
        </div>

        <div id="panel-retro"></div>

        <footer class="quiz__acciones-pie">
          <button type="button" class="btn btn--texto btn--pequeno" id="btnAbandonarQuiz">
            ✕ Salir del quiz
          </button>
          <button type="button" class="btn btn--primario" id="btnAccionPregunta" disabled>
            Responder
          </button>
        </footer>
      </div>
    </div>
  `;

  asociarEventosPregunta();
}

function asociarEventosPregunta() {
  const btnAccion = document.getElementById("btnAccionPregunta");
  const btnAbandonar = document.getElementById("btnAbandonarQuiz");

  if (btnAbandonar) {
    btnAbandonar.addEventListener("click", async () => {
      const seguro = await ui.confirmar("¿Seguro que deseas salir? Tu progreso en esta sesión se perderá.");
      if (seguro) renderizarSeleccionNiveles();
    });
  }

  const { preguntas, indiceActual } = sesionActiva;
  const pregunta = preguntas[indiceActual];

  // Interacción según tipo de pregunta
  if (pregunta.tipo === "opcion") {
    document.querySelectorAll(".quiz-opcion-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (sesionActiva.respondida) return;
        document.querySelectorAll(".quiz-opcion-item").forEach((el) => el.classList.remove("quiz-opcion-item--seleccionada"));
        item.classList.add("quiz-opcion-item--seleccionada");
        respuestaSeleccionada = parseInt(item.getAttribute("data-index"), 10);
        btnAccion.disabled = false;
      });
    });
  } else if (pregunta.tipo === "vf") {
    document.querySelectorAll(".quiz-vf-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (sesionActiva.respondida) return;
        document.querySelectorAll(".quiz-vf-btn").forEach((b) => b.classList.remove("quiz-vf-btn--seleccionado"));
        btn.classList.add("quiz-vf-btn--seleccionado");
        respuestaSeleccionada = btn.getAttribute("data-vf") === "true";
        btnAccion.disabled = false;
      });
    });
  } else if (pregunta.tipo === "completar") {
    const input = document.getElementById("inputCompletar");
    if (input) {
      input.addEventListener("input", (e) => {
        if (sesionActiva.respondida) return;
        const val = e.target.value.trim();
        respuestaSeleccionada = val;
        btnAccion.disabled = !val;
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !btnAccion.disabled && !sesionActiva.respondida) {
          e.preventDefault();
          enviarRespuesta();
        }
      });
    }
  }

  // Clic en botón Responder / Siguiente
  btnAccion.addEventListener("click", () => {
    if (!sesionActiva.respondida) {
      enviarRespuesta();
    } else {
      avanzarSiguientePregunta();
    }
  });
}

/**
 * Envía la respuesta al servidor y muestra la retroalimentación
 */
async function enviarRespuesta() {
  const { sesionId, preguntas, indiceActual } = sesionActiva;
  const pregunta = preguntas[indiceActual];
  const btnAccion = document.getElementById("btnAccionPregunta");

  btnAccion.disabled = true;
  ui.cargando(true);

  try {
    const res = await api.llamar("POST", "/api/quiz/responder", {
      sesionId,
      preguntaId: pregunta.id,
      respuesta: respuestaSeleccionada
    });

    sesionActiva.respondida = true;

    // Deshabilitar controles de opciones
    document.querySelectorAll(".quiz-opcion-item").forEach((el) => el.classList.add("quiz-opcion-item--deshabilitado"));
    document.querySelectorAll(".quiz-vf-btn").forEach((el) => (el.disabled = true));
    const inputComp = document.getElementById("inputCompletar");
    if (inputComp) inputComp.disabled = true;

    // Mostrar retroalimentación pedagógica
    mostrarRetro({
      correcto: res.correcto,
      explicacion: res.retroalimentacion || `La respuesta correcta es: ${res.correcta}`,
      enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
    });

    // Cambiar botón a siguiente
    const esUltima = indiceActual === preguntas.length - 1;
    btnAccion.textContent = esUltima ? "Finalizar evaluación" : "Siguiente pregunta \u2192";
    btnAccion.disabled = false;
    btnAccion.focus();
  } catch (err) {
    ui.aviso("Error al responder pregunta: " + err.message, "error");
    btnAccion.disabled = false;
  } finally {
    ui.cargando(false);
  }
}

/**
 * Pasa a la siguiente pregunta o finaliza el quiz si era la última
 */
async function avanzarSiguientePregunta() {
  const { preguntas, indiceActual } = sesionActiva;
  if (indiceActual < preguntas.length - 1) {
    sesionActiva.indiceActual++;
    renderizarPreguntaActual();
  } else {
    await finalizarQuiz();
  }
}

/**
 * Finaliza el quiz, calcula porcentaje, actualiza logros y despliega diploma si aprueba
 */
async function finalizarQuiz() {
  const { sesionId, nivel } = sesionActiva;
  ui.cargando(true);

  try {
    const res = await api.llamar("POST", "/api/quiz/finalizar", { sesionId });

    // Preparar recomendaciones con los reactivos a repasar
    let recomendacionesTexto = "";
    if (Array.isArray(res.repasar) && res.repasar.length > 0) {
      recomendacionesTexto = res.repasar
        .map((r, i) => `${i + 1}. ${r.enunciado}: ${r.retroalimentacion}`)
        .join("\n\n");
    } else {
      recomendacionesTexto = "¡Excelente dominio! No tuviste fallos en este nivel.";
    }

    // Modal de resumen
    const accionResumen = await mostrarResumen({
      titulo: res.aprobado ? "¡Felicitaciones! Has aprobado el nivel" : "Nivel no aprobado",
      aciertos: res.aciertos,
      errores: res.total - res.aciertos,
      recomendaciones: recomendacionesTexto,
      enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
    });

    // Si aprobó, mostrar logros y botón para diploma
    if (res.aprobado) {
      await mostrarLogros({
        puntosGanados: res.puntosGanados,
        insigniasNuevas: res.insigniasNuevas
      });

      // Mostrar pantalla de celebración del nivel con descarga de diploma
      contenido.innerHTML = `
        <div class="quiz-contenedor">
          <div class="quiz-resultado-panel">
            <div style="font-size: 3rem;">🎓</div>
            <h2 class="h2" style="color: var(--primario); margin: 0;">¡Nivel ${nivel} Aprobado!</h2>
            <p class="texto-secundario" style="margin: 0; font-size: var(--tamano-base);">
              Alcanzaste un <strong>${res.porcentaje}%</strong> de efectividad en el nivel <strong>${DESCRIPCIONES_BLOOM[nivel] || ""}</strong>.
            </p>
            <div class="fila" style="gap: var(--espacio-s); margin-top: var(--espacio-m);">
              <button type="button" class="btn btn--primario btn--grande" id="btnDescargarDiplomaExito">
                📜 Descargar diploma en PDF
              </button>
              <button type="button" class="btn btn--secundario" id="btnVolverNiveles">
                Volver a la selección de niveles
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("btnDescargarDiplomaExito")?.addEventListener("click", () => {
        generarDiploma({ tipo: "nivel-quiz", temaId: temaActual.id, nivel });
      });

      document.getElementById("btnVolverNiveles")?.addEventListener("click", async () => {
        await cargarEstadoNiveles();
        renderizarSeleccionNiveles();
      });
      return;
    }

    // Si no aprobó
    if (accionResumen === "repetir") {
      iniciarNivel(nivel);
    } else {
      await cargarEstadoNiveles();
      renderizarSeleccionNiveles();
    }
  } catch (err) {
    ui.aviso("Error al finalizar evaluación: " + err.message, "error");
    await cargarEstadoNiveles();
    renderizarSeleccionNiveles();
  } finally {
    ui.cargando(false);
  }
}

await inicializar();
