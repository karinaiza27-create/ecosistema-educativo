// publico/js/modulos/banco-preguntas.js · Banco de preguntas pedagógicas por nivel Bloom

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Banco de Preguntas", roles: ["docente", "admin"] });

const contenido = document.getElementById("contenido");

const NIVELES = [
  { nivel: 1, nombre: "Recordar", descripcion: "Evocación de hechos, conceptos y definiciones" },
  { nivel: 2, nombre: "Comprender", descripcion: "Explicación e interpretación de ideas" },
  { nivel: 3, nombre: "Aplicar", descripcion: "Uso de la información en situaciones nuevas" },
  { nivel: 4, nombre: "Analizar", descripcion: "Descomposición y diferenciación de partes" },
  { nivel: 5, nombre: "Evaluar", descripcion: "Justificación de juicios y criterios" }
];

let temasDisponibles = [];
let temaSeleccionadoId = null;
let nivelActivo = 1;
let todasPreguntasTema = [];

async function inicializar() {
  ui.cargando(true);
  try {
    const usuario = usuarioActual();

    // 1. Cargar temas accesibles
    const [asignaturas, unidades, temas] = await Promise.all([
      api.listar("asignaturas"),
      api.listar("unidades"),
      api.listar("temas")
    ]);

    let asignaturasPermitidas = asignaturas;
    if (usuario.rol === "docente") {
      const distributivo = await api.listar("distributivo");
      const misGrupos = distributivo.filter((g) => g.docenteId === usuario.id);
      const misAsigIds = new Set(misGrupos.map((g) => g.asignaturaId));
      asignaturasPermitidas = asignaturas.filter((a) => misAsigIds.has(a.id));
    }

    const mapaAsig = new Map(asignaturasPermitidas.map((a) => [a.id, a]));
    const mapaUnid = new Map(unidades.map((u) => [u.id, u]));

    temasDisponibles = temas.filter((t) => {
      const u = mapaUnid.get(t.unidadId);
      return u && mapaAsig.has(u.asignaturaId);
    });

    if (temasDisponibles.length === 0) {
      contenido.innerHTML = `
        <div class="vacio">
          <div class="vacio__icono">📚</div>
          <h2 class="vacio__titulo">No hay temas disponibles</h2>
          <p class="vacio__texto">No tienes asignaturas o temas asignados para gestionar preguntas evaluativas.</p>
          <a href="/paginas/editor-contenidos.html" class="btn btn--primario">Ir a Contenidos</a>
        </div>
      `;
      return;
    }

    // Comprobar si viene temaId por URL
    const paramTemaId = util.parametro("temaId");
    const temaValido = temasDisponibles.find((t) => t.id === paramTemaId);
    temaSeleccionadoId = temaValido ? temaValido.id : temasDisponibles[0].id;

    await cargarPreguntasTema();
    renderizarInterfaz();
  } catch (err) {
    ui.aviso("Error al inicializar el banco de preguntas: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

async function cargarPreguntasTema() {
  if (!temaSeleccionadoId) {
    todasPreguntasTema = [];
    return;
  }
  const lista = await api.listar("preguntas", { temaId: temaSeleccionadoId });
  todasPreguntasTema = Array.isArray(lista) ? lista : [];
}

function contarAprobadasPorNivel(nivelNum) {
  return todasPreguntasTema.filter(
    (p) => Number(p.nivel) === nivelNum && (!p.estado || p.estado === "aprobado")
  ).length;
}

function renderizarInterfaz() {
  const temaActual = temasDisponibles.find((t) => t.id === temaSeleccionadoId);
  const aprobadasNivelActivo = contarAprobadasPorNivel(nivelActivo);

  // Selector de tema
  const opcionesTemas = temasDisponibles
    .map(
      (t) =>
        `<option value="${ui.escapar(t.id)}" ${t.id === temaSeleccionadoId ? "selected" : ""}>${ui.escapar(t.titulo)}</option>`
    )
    .join("");

  // Pestañas niveles 1 a 5 con sus contadores
  const pestanasHtml = NIVELES.map((n) => {
    const aprobadas = contarAprobadasPorNivel(n.nivel);
    const esActiva = n.nivel === nivelActivo;
    return `
      <button type="button" class="pestana-nivel ${esActiva ? "pestana-nivel--activa" : ""}" data-nivel="${n.nivel}">
        <span>Nivel ${n.nivel}: ${ui.escapar(n.nombre)}</span>
        <span class="pestana-nivel__contador" title="${aprobadas} preguntas aprobadas">${aprobadas}</span>
      </button>
    `;
  }).join("");

  // Preguntas filtradas para el nivel activo
  const preguntasNivel = todasPreguntasTema.filter((p) => Number(p.nivel) === nivelActivo);

  let listaHtml = "";
  if (preguntasNivel.length === 0) {
    listaHtml = `
      <div class="vacio" style="padding: var(--espacio-xl) var(--espacio-m);">
        <div class="vacio__icono">📝</div>
        <h3 class="vacio__titulo">No hay preguntas en el Nivel ${nivelActivo}</h3>
        <p class="vacio__texto">Puedes redactar preguntas manualmente o generarlas con IA a partir de los contenidos del tema.</p>
        <div class="fila" style="gap: var(--espacio-s); justify-content: center;">
          <button type="button" class="btn btn--primario btnAbrirGenerarIA">✨ Generar con IA</button>
          <button type="button" class="btn btn--secundario btnNuevaPregunta">➕ Nueva pregunta</button>
        </div>
      </div>
    `;
  } else {
    listaHtml = preguntasNivel
      .map((p) => {
        const esAprobada = !p.estado || p.estado === "aprobado";
        const claseEstado = esAprobada ? "badge--exito" : "badge--neutro";
        const textoEstado = esAprobada ? "Aprobada" : "Borrador";

        let tipoTexto = "Opción múltiple";
        if (p.tipo === "vf") tipoTexto = "Verdadero o Falso";
        if (p.tipo === "completar") tipoTexto = "Completar";

        // Renderizado de opciones
        let opcionesHtml = "";
        if (p.tipo === "opcion" && Array.isArray(p.opciones)) {
          opcionesHtml = `
            <ul class="pregunta-tarjeta__opciones">
              ${p.opciones
                .map((opc, idx) => {
                  const esCorrecta = idx === Number(p.correcta);
                  return `
                    <li class="pregunta-tarjeta__opcion ${esCorrecta ? "pregunta-tarjeta__opcion--correcta" : ""}">
                      <span>${esCorrecta ? "✓" : "○"}</span>
                      <span>${ui.escapar(opc)}</span>
                      ${esCorrecta ? `<strong style="margin-left: auto; font-size: 0.75rem; color: var(--exito);">Respuesta correcta</strong>` : ""}
                    </li>
                  `;
                })
                .join("")}
            </ul>
          `;
        } else if (p.tipo === "vf") {
          opcionesHtml = `
            <div class="fila" style="gap: var(--espacio-s); margin: var(--espacio-xs) 0;">
              <span class="pregunta-tarjeta__opcion ${p.correcta === true ? "pregunta-tarjeta__opcion--correcta" : ""}">
                ${p.correcta === true ? "✓ " : ""}Verdadero
              </span>
              <span class="pregunta-tarjeta__opcion ${p.correcta === false ? "pregunta-tarjeta__opcion--correcta" : ""}">
                ${p.correcta === false ? "✓ " : ""}Falso
              </span>
            </div>
          `;
        } else if (p.tipo === "completar") {
          opcionesHtml = `
            <div class="pregunta-tarjeta__opcion pregunta-tarjeta__opcion--correcta" style="margin: var(--espacio-xs) 0;">
              <strong>Respuesta correcta:</strong> <span>${ui.escapar(p.correcta || "")}</span>
            </div>
          `;
        }

        return `
          <article class="pregunta-tarjeta" data-id="${ui.escapar(p.id)}">
            <div class="pregunta-tarjeta__cabecera">
              <div class="pregunta-tarjeta__etiquetas">
                <span class="badge badge--primario">${ui.escapar(tipoTexto)}</span>
                <span class="badge ${claseEstado}">${ui.escapar(textoEstado)}</span>
                <span class="badge badge--secundario">${p.origen === "ia" ? "🤖 IA" : "👤 Docente"}</span>
              </div>
              <div class="pregunta-tarjeta__acciones">
                <button type="button" class="btn btn--texto btn--pequeno btnEditarPregunta" data-id="${ui.escapar(p.id)}">
                  ✏️ Editar
                </button>
                <button type="button" class="btn btn--texto btn--pequeno btnEliminarPregunta" data-id="${ui.escapar(p.id)}" style="color: var(--error);">
                  🗑️ Eliminar
                </button>
              </div>
            </div>

            <div class="pregunta-tarjeta__enunciado">${ui.escapar(p.enunciado)}</div>

            ${opcionesHtml}

            ${
              p.retroalimentacion
                ? `<div class="pregunta-tarjeta__retro"><strong>Retroalimentación:</strong> ${ui.escapar(p.retroalimentacion)}</div>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  // Aviso de menos de 20 preguntas aprobadas
  const avisoMinimoHtml =
    aprobadasNivelActivo < 20
      ? `
        <div class="banco__alerta-minimo" role="alert">
          <span style="font-size: 1.25rem;">⚠️</span>
          <div>
            <strong>Aviso pedagógico:</strong> Este nivel cuenta con <strong>${aprobadasNivelActivo}</strong> preguntas aprobadas (se recomienda tener al menos <strong>20</strong> para generar quizzes formativos balanceados).
          </div>
        </div>
      `
      : "";

  contenido.innerHTML = `
    <div class="banco-preguntas">
      <header class="banco__cabecera">
        <div>
          <a href="/paginas/editor-contenidos.html" class="btn btn--texto btn--pequeno" style="padding-left: 0;">&larr; Volver a Contenidos</a>
          <h1 class="h2" style="margin-bottom: 4px;">Banco de Preguntas</h1>
          <p class="texto-secundario" style="margin: 0; font-size: var(--tamano-s);">
            Gestión de reactivos evaluativos por taxonomía de Bloom y generación asistida por IA.
          </p>
        </div>

        <div class="banco__acciones">
          ${
            usuarioActual()?.rol === "admin"
              ? `<a href="/paginas/admin-ia.html" class="btn btn--texto btn--pequeno" style="margin-right: var(--espacio-xs);">⚙️ Configurar IA</a>`
              : ""
          }
          <button type="button" class="btn btn--secundario btnAbrirGenerarIA">
            ✨ Generar con IA
          </button>
          <button type="button" class="btn btn--primario btnNuevaPregunta">
            ➕ Nueva pregunta
          </button>
        </div>
      </header>

      <div class="banco__selector-panel">
        <label for="selTemaPreguntas" class="etiqueta" style="margin: 0; font-weight: var(--peso-negrita);">
          Tema pedagógico:
        </label>
        <select id="selTemaPreguntas" class="select" style="min-width: 280px; max-width: 100%;">
          ${opcionesTemas}
        </select>
      </div>

      <nav class="pestanas-niveles" aria-label="Niveles cognitivos">
        ${pestanasHtml}
      </nav>

      ${avisoMinimoHtml}

      <div class="banco__lista">
        ${listaHtml}
      </div>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  // Cambio de tema
  const selTema = document.getElementById("selTemaPreguntas");
  if (selTema) {
    selTema.addEventListener("change", async (e) => {
      temaSeleccionadoId = e.target.value;
      ui.cargando(true);
      try {
        await cargarPreguntasTema();
        renderizarInterfaz();
      } catch (err) {
        ui.aviso("Error al cambiar de tema: " + err.message, "error");
      } finally {
        ui.cargando(false);
      }
    });
  }

  // Cambio de pestaña de nivel
  document.querySelectorAll(".pestana-nivel").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.getAttribute("data-nivel"), 10);
      if (n && n !== nivelActivo) {
        nivelActivo = n;
        renderizarInterfaz();
      }
    });
  });

  // Botones de acción general
  document.querySelectorAll(".btnAbrirGenerarIA").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalGenerarIA());
  });

  document.querySelectorAll(".btnNuevaPregunta").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEdicion());
  });

  // Editar pregunta existente
  document.querySelectorAll(".btnEditarPregunta").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const pregunta = todasPreguntasTema.find((p) => p.id === id);
      if (pregunta) abrirModalEdicion(pregunta);
    });
  });

  // Eliminar pregunta
  document.querySelectorAll(".btnEliminarPregunta").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const confirmacion = await ui.confirmar("¿Seguro que deseas eliminar esta pregunta?");
      if (!confirmacion) return;

      ui.cargando(true);
      try {
        await api.eliminar("preguntas", id);
        ui.aviso("Pregunta eliminada correctamente", "exito");
        await cargarPreguntasTema();
        renderizarInterfaz();
      } catch (err) {
        ui.aviso("Error al eliminar pregunta: " + err.message, "error");
      } finally {
        ui.cargando(false);
      }
    });
  });
}

/**
 * Modal para crear o editar una pregunta manualmente.
 */
async function abrirModalEdicion(pregunta = null) {
  const esEdicion = Boolean(pregunta);
  const datos = pregunta || {
    temaId: temaSeleccionadoId,
    nivel: nivelActivo,
    tipo: "opcion",
    enunciado: "",
    opciones: ["", "", "", ""],
    correcta: 0,
    retroalimentacion: "",
    estado: "aprobado",
    origen: "docente"
  };

  const contenedor = document.createElement("div");
  contenedor.className = "formulario";
  contenedor.style.display = "flex";
  contenedor.style.flexDirection = "column";
  contenedor.style.gap = "var(--espacio-m)";

  contenedor.innerHTML = `
    <div class="campo">
      <label for="formNivel" class="etiqueta">Nivel de Bloom:</label>
      <select id="formNivel" class="select">
        ${NIVELES.map(
          (n) => `<option value="${n.nivel}" ${Number(datos.nivel) === n.nivel ? "selected" : ""}>Nivel ${n.nivel}: ${ui.escapar(n.nombre)}</option>`
        ).join("")}
      </select>
    </div>

    <div class="campo">
      <label for="formTipo" class="etiqueta">Tipo de pregunta:</label>
      <select id="formTipo" class="select">
        <option value="opcion" ${datos.tipo === "opcion" ? "selected" : ""}>Opción múltiple (4 opciones)</option>
        <option value="vf" ${datos.tipo === "vf" ? "selected" : ""}>Verdadero / Falso</option>
        <option value="completar" ${datos.tipo === "completar" ? "selected" : ""}>Completar (con ____)</option>
      </select>
    </div>

    <div class="campo">
      <label for="formEnunciado" class="etiqueta">Enunciado de la pregunta:</label>
      <textarea id="formEnunciado" class="control" rows="3" placeholder="Redacta el enunciado claro y preciso...">${ui.escapar(datos.enunciado || "")}</textarea>
    </div>

    <div id="contenedorCamposTipo"></div>

    <div class="campo">
      <label for="formRetro" class="etiqueta">Retroalimentación pedagógica:</label>
      <textarea id="formRetro" class="control" rows="2" placeholder="Explica brevemente por qué es correcta la respuesta...">${ui.escapar(datos.retroalimentacion || "")}</textarea>
    </div>

    <div class="campo">
      <label for="formEstado" class="etiqueta">Estado:</label>
      <select id="formEstado" class="select">
        <option value="aprobado" ${datos.estado === "aprobado" ? "selected" : ""}>Aprobado (disponible para quizzes)</option>
        <option value="borrador" ${datos.estado === "borrador" ? "selected" : ""}>Borrador (en revisión)</option>
      </select>
    </div>
  `;

  function actualizarCamposTipo(tipoActual) {
    const cont = contenedor.querySelector("#contenedorCamposTipo");
    if (!cont) return;

    if (tipoActual === "opcion") {
      const opciones = Array.isArray(datos.opciones) && datos.opciones.length === 4
        ? datos.opciones
        : ["", "", "", ""];
      const correctaIdx = typeof datos.correcta === "number" ? datos.correcta : 0;

      cont.innerHTML = `
        <div class="campo">
          <label class="etiqueta">Opciones y respuesta correcta:</label>
          <div style="display: flex; flex-direction: column; gap: var(--espacio-xs);">
            ${[0, 1, 2, 3]
              .map(
                (idx) => `
                <div class="fila" style="gap: var(--espacio-s); align-items: center;">
                  <input type="radio" name="opcionCorrecta" id="optRadio_${idx}" value="${idx}" ${correctaIdx === idx ? "checked" : ""}>
                  <label for="optRadio_${idx}" style="min-width: 1.5rem; font-weight: var(--peso-negrita);">${String.fromCharCode(65 + idx)}</label>
                  <input type="text" class="control inputOpcionTexto" data-index="${idx}" value="${ui.escapar(opciones[idx] || "")}" placeholder="Texto de la opción ${String.fromCharCode(65 + idx)}">
                </div>
              `
              )
              .join("")}
          </div>
          <small class="texto-secundario" style="margin-top: 4px;">Selecciona el botón circular correspondiente a la opción correcta.</small>
        </div>
      `;
    } else if (tipoActual === "vf") {
      const esVerdadera = datos.correcta === true;
      cont.innerHTML = `
        <div class="campo">
          <label class="etiqueta">Respuesta correcta:</label>
          <div class="fila" style="gap: var(--espacio-l);">
            <label class="fila" style="gap: var(--espacio-xs); align-items: center; cursor: pointer;">
              <input type="radio" name="vfCorrecta" value="true" ${esVerdadera ? "checked" : ""}>
              <span>Verdadero</span>
            </label>
            <label class="fila" style="gap: var(--espacio-xs); align-items: center; cursor: pointer;">
              <input type="radio" name="vfCorrecta" value="false" ${!esVerdadera ? "checked" : ""}>
              <span>Falso</span>
            </label>
          </div>
        </div>
      `;
    } else if (tipoActual === "completar") {
      const valCorrecta = typeof datos.correcta === "string" ? datos.correcta : "";
      cont.innerHTML = `
        <div class="campo">
          <label for="formCompletarCorrecta" class="etiqueta">Palabra o frase que completa el enunciado:</label>
          <input type="text" id="formCompletarCorrecta" class="control" value="${ui.escapar(valCorrecta)}" placeholder="Ej: fotosíntesis">
          <small class="texto-secundario">El enunciado debe incluir "____" donde va esta respuesta.</small>
        </div>
      `;
    }
  }

  // Inicializar campos de tipo y escuchar cambios
  const selectTipo = contenedor.querySelector("#formTipo");
  selectTipo.addEventListener("change", (e) => {
    actualizarCamposTipo(e.target.value);
  });
  actualizarCamposTipo(datos.tipo);

  const respuestaModal = await ui.modal({
    titulo: esEdicion ? "Editar Pregunta" : "Nueva Pregunta",
    contenido: contenedor,
    acciones: [
      { texto: "Cancelar", valor: null, clase: "btn--secundario" },
      { texto: esEdicion ? "Guardar cambios" : "Crear pregunta", valor: "guardar", clase: "btn--primario" }
    ]
  });

  if (respuestaModal !== "guardar") return;

  // Recolectar datos del formulario
  const nivelVal = parseInt(contenedor.querySelector("#formNivel").value, 10) || nivelActivo;
  const tipoVal = contenedor.querySelector("#formTipo").value;
  const enunciadoVal = contenedor.querySelector("#formEnunciado").value.trim();
  const retroVal = contenedor.querySelector("#formRetro").value.trim();
  const estadoVal = contenedor.querySelector("#formEstado").value;

  if (!enunciadoVal) {
    ui.aviso("El enunciado de la pregunta es obligatorio.", "error");
    return;
  }

  let opcionesFinal = [];
  let correctaFinal = null;

  if (tipoVal === "opcion") {
    const inputs = contenedor.querySelectorAll(".inputOpcionTexto");
    opcionesFinal = Array.from(inputs).map((inp) => inp.value.trim());
    if (opcionesFinal.some((o) => !o)) {
      ui.aviso("Debes ingresar el texto de las 4 opciones.", "error");
      return;
    }
    const radioSel = contenedor.querySelector("input[name='opcionCorrecta']:checked");
    correctaFinal = radioSel ? parseInt(radioSel.value, 10) : 0;
  } else if (tipoVal === "vf") {
    opcionesFinal = ["Verdadero", "Falso"];
    const radioSel = contenedor.querySelector("input[name='vfCorrecta']:checked");
    correctaFinal = radioSel ? radioSel.value === "true" : true;
  } else if (tipoVal === "completar") {
    opcionesFinal = [];
    const inp = contenedor.querySelector("#formCompletarCorrecta");
    correctaFinal = inp ? inp.value.trim() : "";
    if (!correctaFinal) {
      ui.aviso("Debes especificar la palabra o frase correcta para completar.", "error");
      return;
    }
  }

  const payload = {
    temaId: temaSeleccionadoId,
    nivel: nivelVal,
    tipo: tipoVal,
    enunciado: enunciadoVal,
    opciones: opcionesFinal,
    correcta: correctaFinal,
    retroalimentacion: retroVal,
    estado: estadoVal,
    origen: datos.origen || "docente"
  };

  ui.cargando(true);
  try {
    if (esEdicion) {
      await api.actualizar("preguntas", pregunta.id, payload);
      ui.aviso("Pregunta actualizada con éxito", "exito");
    } else {
      await api.crear("preguntas", payload);
      ui.aviso("Pregunta creada con éxito", "exito");
    }
    await cargarPreguntasTema();
    nivelActivo = nivelVal;
    renderizarInterfaz();
  } catch (err) {
    ui.aviso("Error al guardar pregunta: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

/**
 * Modal para solicitar y procesar propuestas de IA.
 */
async function abrirModalGenerarIA() {
  const temaActual = temasDisponibles.find((t) => t.id === temaSeleccionadoId);
  const contenedor = document.createElement("div");
  contenedor.innerHTML = `
    <p style="margin-top: 0; font-size: var(--tamano-s); color: var(--texto-secundario);">
      La IA analizará el tema <strong>${ui.escapar(temaActual.titulo)}</strong>, su glosario y objetivos pedagógicos para redactar reactivos del nivel seleccionado.
    </p>
    <div class="campo">
      <label for="selNivelIA" class="etiqueta">Nivel de Bloom:</label>
      <select id="selNivelIA" class="select">
        ${NIVELES.map(
          (n) => `<option value="${n.nivel}" ${n.nivel === nivelActivo ? "selected" : ""}>Nivel ${n.nivel}: ${ui.escapar(n.nombre)}</option>`
        ).join("")}
      </select>
    </div>
    <div class="campo" style="margin-top: var(--espacio-s);">
      <label for="numCantidadIA" class="etiqueta">Cantidad de preguntas a generar (5 a 15):</label>
      <input type="number" id="numCantidadIA" class="control" min="5" max="15" value="5">
    </div>
  `;

  const accion = await ui.modal({
    titulo: "✨ Generar Preguntas con IA",
    contenido: contenedor,
    acciones: [
      { texto: "Cancelar", valor: null, clase: "btn--secundario" },
      { texto: "Generar propuestas", valor: "generar", clase: "btn--primario" }
    ]
  });

  if (accion !== "generar") return;

  const nivelNum = parseInt(contenedor.querySelector("#selNivelIA").value, 10) || nivelActivo;
  const cantidad = Math.min(15, Math.max(5, parseInt(contenedor.querySelector("#numCantidadIA").value, 10) || 5));

  ui.cargando(true);
  let propuestas = [];
  try {
    const res = await api.ia("generar-preguntas", {
      temaId: temaSeleccionadoId,
      nivel: nivelNum,
      cantidad
    });

    propuestas = Array.isArray(res) ? res : [];
    if (propuestas.length === 0) {
      ui.aviso("La IA no devolvió preguntas para este tema.", "info");
      return;
    }
  } catch (err) {
    ui.aviso("Error al generar preguntas con IA: " + err.message, "error");
    return;
  } finally {
    ui.cargando(false);
  }

  // Mostrar modal de revisión de propuestas
  await mostrarPropuestasIA(propuestas, nivelNum);
}

/**
 * Interfaz para revisar, aprobar, editar o descartar propuestas de IA.
 */
async function mostrarPropuestasIA(propuestasIniciales, nivelGenerado) {
  let lista = [...propuestasIniciales];

  async function refrescarModal() {
    if (lista.length === 0) {
      ui.aviso("Se han procesado todas las propuestas de IA.", "exito");
      await cargarPreguntasTema();
      nivelActivo = nivelGenerado;
      renderizarInterfaz();
      return;
    }

    const modalContenido = document.createElement("div");
    modalContenido.style.maxHeight = "60vh";
    modalContenido.style.overflowY = "auto";
    modalContenido.style.display = "flex";
    modalContenido.style.flexDirection = "column";
    modalContenido.style.gap = "var(--espacio-m)";

    modalContenido.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--borde); padding-bottom: var(--espacio-xs);">
        <span class="texto-secundario" style="font-size: var(--tamano-s);">
          Quedan <strong>${lista.length}</strong> propuestas por revisar (Nivel ${nivelGenerado})
        </span>
        <button type="button" class="btn btn--primario btn--pequeno" id="btnAprobarTodasIA">
          Aprobar todas (${lista.length})
        </button>
      </div>
      <div id="listaPropuestasContenedor" style="display: flex; flex-direction: column; gap: var(--espacio-m);">
        ${lista
          .map((p, idx) => {
            let tipoLabel = p.tipo === "vf" ? "V / F" : p.tipo === "completar" ? "Completar" : "Opción";
            return `
              <div class="propuesta-ia-tarjeta" data-idx="${idx}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="badge badge--primario">${ui.escapar(tipoLabel)}</span>
                  <span class="badge badge--secundario">Propuesta #${idx + 1}</span>
                </div>
                <div style="font-weight: var(--peso-negrita); font-size: var(--tamano-s);">${ui.escapar(p.enunciado)}</div>
                ${
                  p.tipo === "opcion" && Array.isArray(p.opciones)
                    ? `<ul style="margin: 0; padding-left: var(--espacio-m); font-size: var(--tamano-xs);">
                        ${p.opciones.map((o, i) => `<li style="${i === Number(p.correcta) ? "font-weight: bold; color: var(--exito);" : ""}">${i === Number(p.correcta) ? "✓ " : ""}${ui.escapar(o)}</li>`).join("")}
                      </ul>`
                    : p.tipo === "vf"
                    ? `<div style="font-size: var(--tamano-xs);"><strong>Respuesta correcta:</strong> ${p.correcta ? "Verdadero" : "Falso"}</div>`
                    : `<div style="font-size: var(--tamano-xs);"><strong>Respuesta correcta:</strong> ${ui.escapar(String(p.correcta || ""))}</div>`
                }
                <div style="font-size: var(--tamano-xs); color: var(--texto-secundario);">${ui.escapar(p.retroalimentacion || "")}</div>
                <div class="propuesta-ia__acciones">
                  <button type="button" class="btn btn--exito btn--pequeno btnAprobarPropuesta" data-idx="${idx}">✓ Aprobar</button>
                  <button type="button" class="btn btn--secundario btn--pequeno btnEditarPropuesta" data-idx="${idx}">✏️ Editar</button>
                  <button type="button" class="btn btn--texto btn--pequeno btnDescartarPropuesta" data-idx="${idx}" style="color: var(--error);">✕ Descartar</button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    // Botón aprobar todas
    const btnAprobarTodas = modalContenido.querySelector("#btnAprobarTodasIA");
    if (btnAprobarTodas) {
      btnAprobarTodas.addEventListener("click", async () => {
        ui.cargando(true);
        try {
          for (const item of lista) {
            await api.crear("preguntas", {
              temaId: temaSeleccionadoId,
              nivel: nivelGenerado,
              tipo: item.tipo,
              enunciado: item.enunciado,
              opciones: item.opciones || [],
              correcta: item.correcta,
              retroalimentacion: item.retroalimentacion || "",
              origen: "ia",
              estado: "aprobado"
            });
          }
          ui.aviso(`Se aprobaron y guardaron ${lista.length} preguntas de IA.`, "exito");
          lista = [];
          document.querySelector(".modal__cerrar")?.click();
          await cargarPreguntasTema();
          nivelActivo = nivelGenerado;
          renderizarInterfaz();
        } catch (err) {
          ui.aviso("Error al aprobar preguntas: " + err.message, "error");
        } finally {
          ui.cargando(false);
        }
      });
    }

    // Botones individuales
    modalContenido.querySelectorAll(".btnAprobarPropuesta").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const item = lista[idx];
        if (!item) return;

        ui.cargando(true);
        try {
          await api.crear("preguntas", {
            temaId: temaSeleccionadoId,
            nivel: nivelGenerado,
            tipo: item.tipo,
            enunciado: item.enunciado,
            opciones: item.opciones || [],
            correcta: item.correcta,
            retroalimentacion: item.retroalimentacion || "",
            origen: "ia",
            estado: "aprobado"
          });
          ui.aviso("Pregunta aprobada y agregada al banco.", "exito");
          lista.splice(idx, 1);
          refrescarPropuestasEnModal();
        } catch (err) {
          ui.aviso("Error al aprobar pregunta: " + err.message, "error");
        } finally {
          ui.cargando(false);
        }
      });
    });

    modalContenido.querySelectorAll(".btnDescartarPropuesta").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        lista.splice(idx, 1);
        refrescarPropuestasEnModal();
      });
    });

    modalContenido.querySelectorAll(".btnEditarPropuesta").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const item = lista[idx];
        if (!item) return;

        document.querySelector(".modal__cerrar")?.click();
        await abrirModalEdicion({
          ...item,
          temaId: temaSeleccionadoId,
          nivel: nivelGenerado,
          origen: "ia",
          estado: "aprobado"
        });
        lista.splice(idx, 1);
      });
    });

    function refrescarPropuestasEnModal() {
      if (lista.length === 0) {
        document.querySelector(".modal__cerrar")?.click();
        cargarPreguntasTema().then(() => {
          nivelActivo = nivelGenerado;
          renderizarInterfaz();
        });
        return;
      }
      refrescarModal();
    }

    await ui.modal({
      titulo: `Propuestas de Preguntas con IA (Nivel ${nivelGenerado})`,
      contenido: modalContenido,
      acciones: [{ texto: "Cerrar revisión", valor: "cerrar", clase: "btn--secundario" }]
    });

    await cargarPreguntasTema();
    nivelActivo = nivelGenerado;
    renderizarInterfaz();
  }

  await refrescarModal();
}

await inicializar();
