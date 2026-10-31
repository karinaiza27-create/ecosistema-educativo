// publico/js/modulos/tutor.js · Interfaz del tutor socrático con integración al avatar guía

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import { cambiarEstado, decir } from "../nucleo/avatar.js";

await montarPlantilla({ titulo: "Tutor Virtual Socrático", roles: ["estudiante", "docente", "admin"] });

const params = new URLSearchParams(window.location.search);
let asignaturaSeleccionadaId = params.get("asignaturaId") || "";
const historial = [];

const contenido = document.getElementById("contenido");

async function iniciar() {
  if (!contenido) return;

  // 1. Obtener lista de asignaturas disponibles
  let asignaturas = [];
  try {
    asignaturas = await api.listar("asignaturas");
  } catch (err) {
    ui.aviso("Error al cargar las asignaturas: " + err.message, "peligro");
  }

  if (!asignaturaSeleccionadaId && asignaturas.length > 0) {
    asignaturaSeleccionadaId = asignaturas[0].id;
  }

  const opcionesAsignaturas = asignaturas
    .map((a) => `<option value="${a.id}" ${a.id === asignaturaSeleccionadaId ? "selected" : ""}>${ui.escapar(a.nombre)}</option>`)
    .join("");

  contenido.innerHTML = `
    <div class="tutor-contenedor">
      <header class="tutor-cabecera">
        <div class="tutor-cabecera__info">
          <span class="tutor-cabecera__icono" aria-hidden="true">🏛️</span>
          <div>
            <h1 class="tutor-cabecera__titulo">Sócrates · Tutor Virtual Socrático</h1>
            <p class="tutor-cabecera__subtitulo">Aprende reflexionando con preguntas y retroalimentación guiada</p>
          </div>
        </div>
        <div class="tutor-selector">
          <label for="selAsignatura" class="etiqueta" style="margin: 0; font-size: var(--tamano-xs);">Materia:</label>
          <select id="selAsignatura" class="campo" style="padding: 4px 8px; font-size: var(--tamano-s);">
            ${opcionesAsignaturas}
          </select>
        </div>
      </header>

      <section class="tutor-chat" aria-label="Conversación con el tutor">
        <div class="tutor-mensajes" id="tutorMensajes">
          <div class="tutor-mensaje tutor-mensaje--tutor">
            <span class="tutor-mensaje__autor">Sócrates (Tutor)</span>
            <div class="tutor-mensaje__texto">
              ¡Saludos! Soy Sócrates. Estoy aquí para acompañarte en tu estudio. ¿Sobre qué concepto o inquietud de esta materia deseas que reflexionemos juntos?
            </div>
          </div>
        </div>

        <form id="formTutor" class="tutor-formulario">
          <textarea
            id="inputMensaje"
            placeholder="Escribe tu duda o reflexión aquí... (Enter envía, Mayús+Enter nueva línea)"
            required
            rows="1"
          ></textarea>
          <button type="submit" class="btn btn--primario" id="btnEnviar">Enviar</button>
        </form>
      </section>
    </div>
  `;

  const selAsignatura = document.getElementById("selAsignatura");
  const formTutor = document.getElementById("formTutor");
  const inputMensaje = document.getElementById("inputMensaje");
  const tutorMensajes = document.getElementById("tutorMensajes");
  const btnEnviar = document.getElementById("btnEnviar");

  selAsignatura?.addEventListener("change", (e) => {
    asignaturaSeleccionadaId = e.target.value;
    historial.length = 0;
    if (tutorMensajes) {
      tutorMensajes.innerHTML = `
        <div class="tutor-mensaje tutor-mensaje--tutor">
          <span class="tutor-mensaje__autor">Sócrates (Tutor)</span>
          <div class="tutor-mensaje__texto">
            Has cambiado de materia. ¿Qué tema o duda académica deseas que analicemos ahora?
          </div>
        </div>
      `;
    }
  });

  inputMensaje?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formTutor?.dispatchEvent(new Event("submit"));
    }
  });

  formTutor?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = inputMensaje.value.trim();
    if (!texto) return;

    if (!asignaturaSeleccionadaId) {
      ui.aviso("Por favor selecciona una materia primero.", "alerta");
      return;
    }

    // 1. Mostrar mensaje del estudiante
    inputMensaje.value = "";
    historial.push({ rol: "estudiante", texto });

    const msgEstudiante = document.createElement("div");
    msgEstudiante.className = "tutor-mensaje tutor-mensaje--estudiante";
    msgEstudiante.innerHTML = `
      <span class="tutor-mensaje__autor">Tú</span>
      <div class="tutor-mensaje__texto">${ui.escapar(texto)}</div>
    `;
    tutorMensajes.appendChild(msgEstudiante);

    // 2. Estado pensando y feedback visual
    cambiarEstado("pensando");

    const pensandoEl = document.createElement("div");
    pensandoEl.className = "tutor-pensando";
    pensandoEl.id = "tutorPensando";
    pensandoEl.innerHTML = `<span>🤔 Sócrates está reflexionando...</span>`;
    tutorMensajes.appendChild(pensandoEl);
    tutorMensajes.scrollTop = tutorMensajes.scrollHeight;

    btnEnviar.disabled = true;

    try {
      const cuerpo = {
        tarea: "tutor",
        asignaturaId: asignaturaSeleccionadaId,
        mensaje: texto,
        historial
      };

      const resultado = await api.llamar("POST", "/api/ia/ejecutar", cuerpo);
      const respuestaTexto = typeof resultado === "string" ? resultado : (resultado.respuesta || resultado.resultado || "");

      pensandoEl.remove();
      btnEnviar.disabled = false;

      // 3. Renderizar respuesta del tutor
      historial.push({ rol: "tutor", texto: respuestaTexto });

      const msgTutor = document.createElement("div");
      msgTutor.className = "tutor-mensaje tutor-mensaje--tutor";
      msgTutor.innerHTML = `
        <span class="tutor-mensaje__autor">Sócrates (Tutor)</span>
        <div class="tutor-mensaje__texto">${ui.escapar(respuestaTexto)}</div>
      `;
      tutorMensajes.appendChild(msgTutor);
      tutorMensajes.scrollTop = tutorMensajes.scrollHeight;

      // 4. Cambiar estado a hablando; lee la respuesta solo si la voz está activa
      cambiarEstado("hablando");
      const vozActiva = localStorage.getItem("avatar_voz_activa") !== "false";
      if (vozActiva) {
        decir(respuestaTexto);
      } else {
        setTimeout(() => {
          cambiarEstado("reposo");
        }, 2000);
      }
    } catch (err) {
      pensandoEl.remove();
      btnEnviar.disabled = false;
      cambiarEstado("reposo");
      ui.aviso(err.message || "Error al consultar al tutor", "peligro");
    }
  });
}

iniciar();
