// publico/js/modulos/asignatura.js · Vista de asignatura con unidades, temas y tutor socrático virtual

import { montarPlantilla } from "../nucleo/plantilla.js";
import { parametro } from "../nucleo/util.js";
import { usuarioActual } from "../nucleo/sesion.js";
import { calcularAvance } from "./asignaturas.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import { cambiarEstado, decir } from "../nucleo/avatar.js";

await montarPlantilla({ titulo: "Asignatura", roles: ["estudiante", "docente", "admin"] });

const contenido = document.getElementById("contenido");
const asignaturaId = parametro("id");

let mensajesTutor = [];
let asignaturaActual = null;
let temasAsignatura = [];

/**
 * Carga el historial de la conversación desde sessionStorage
 */
function cargarHistorial(asig) {
  const clave = `tutor_chat_${asig.id}`;
  try {
    const guardado = sessionStorage.getItem(clave);
    if (guardado) {
      const parsed = JSON.parse(guardado);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  const hora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return [
    {
      rol: "tutor",
      texto: `¡Hola! Soy Sócrates, tu tutor virtual para la asignatura **${asig.nombre}**.\n\nMi metodología se basa en el **diálogo socrático**: no te daré respuestas directas ni resolveré tus tareas, sino que te acompañaré con preguntas orientadoras, pistas y analogías para que tú mismo construyas y fundamentes tu aprendizaje.\n\n¿Qué concepto, duda o tema curricular de esta asignatura te gustaría que analicemos juntos hoy?`,
      fecha: hora
    }
  ];
}

/**
 * Guarda el historial en sessionStorage
 */
function guardarHistorial(asigId, lista) {
  try {
    sessionStorage.setItem(`tutor_chat_${asigId}`, JSON.stringify(lista));
  } catch {}
}

/**
 * Formatea texto básico (saltos de línea, negrita sutil, citas) con escape seguro
 */
function formatearTextoTutor(texto) {
  if (!texto) return "";
  const seguro = ui.escapar(texto);
  // Reemplazar saltos de línea y formatear **negritas**
  const conSaltos = seguro.replace(/\n\n/g, "<br><br>").replace(/\n/g, "<br>");
  return conSaltos.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

/**
 * Genera sugerencias de preguntas socráticas basadas en los temas reales de la asignatura
 */
function generarSugerencias(temas, asig) {
  const chips = [];
  if (temas.length > 0) {
    const primerTema = temas[0].titulo;
    chips.push(`¿Qué es ${primerTema} y qué objetivo persigue?`);
  }
  if (temas.length > 1) {
    const segundoTema = temas[1].titulo;
    chips.push(`¿Cómo se relaciona ${segundoTema} con nuestro entorno?`);
  }
  chips.push(`Dame una pista para reflexionar sobre los conceptos clave`);
  chips.push(`¿Cuáles son los errores más frecuentes en esta materia?`);
  return chips;
}

/**
 * Desplaza la lista de mensajes al final
 */
function desplazarAlFinal() {
  const lista = document.getElementById("tutor-mensajes-lista");
  if (lista) {
    lista.scrollTop = lista.scrollHeight;
  }
}

/**
 * Renderiza los mensajes en la lista del chat
 */
function renderizarMensajes() {
  const lista = document.getElementById("tutor-mensajes-lista");
  if (!lista || !asignaturaActual) return;

  const sugerencias = generarSugerencias(temasAsignatura, asignaturaActual);

  const htmlMensajes = mensajesTutor
    .map((m, index) => {
      const esTutor = m.rol === "tutor";
      const mostrarChips = esTutor && index === 0;

      return `
        <div class="tutor-msg tutor-msg--${esTutor ? "tutor" : "estudiante"}">
          <div class="tutor-msg__burbuja">
            ${formatearTextoTutor(m.texto)}
          </div>
          <span class="tutor-msg__meta">${ui.escapar(m.fecha || "")}</span>
          ${
            mostrarChips
              ? `
            <div class="tutor-chips-wrap">
              <span class="tutor-chips-wrap__titulo">Preguntas orientadoras sugeridas:</span>
              <div class="tutor-chips">
                ${sugerencias
                  .map(
                    (sug) => `
                  <button type="button" class="tutor-chip" data-sugerencia="${ui.escapar(sug)}">
                    ${ui.escapar(sug)}
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");

  lista.innerHTML = htmlMensajes;
  desplazarAlFinal();

  // Escuchar clics en los chips de sugerencia
  lista.querySelectorAll(".tutor-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const texto = btn.getAttribute("data-sugerencia");
      const input = document.getElementById("tutor-input");
      if (input && texto) {
        input.value = texto;
        input.focus();
        enviarMensajeTutor(texto);
      }
    });
  });
}

/**
 * Muestra u oculta el indicador de escritura
 */
function alternarEscribiendo(mostrar) {
  const lista = document.getElementById("tutor-mensajes-lista");
  if (!lista) return;

  const existente = document.getElementById("tutor-escribiendo-anim");
  if (mostrar && !existente) {
    const el = document.createElement("div");
    el.id = "tutor-escribiendo-anim";
    el.className = "tutor-escribiendo";
    el.innerHTML = `
      <span>Sócrates está formulando una pregunta</span>
      <span class="tutor-escribiendo__puntos">
        <span class="tutor-escribiendo__punto"></span>
        <span class="tutor-escribiendo__punto"></span>
        <span class="tutor-escribiendo__punto"></span>
      </span>
    `;
    lista.appendChild(el);
    desplazarAlFinal();
  } else if (!mostrar && existente) {
    existente.remove();
  }
}

/**
 * Envía un mensaje del estudiante al tutor socrático
 */
async function enviarMensajeTutor(textoManual = null) {
  const input = document.getElementById("tutor-input");
  const btnEnviar = document.getElementById("tutor-btn-enviar");
  if (!input || !asignaturaActual) return;

  const texto = (textoManual || input.value || "").trim();
  if (!texto) return;

  input.value = "";
  input.disabled = true;
  if (btnEnviar) btnEnviar.disabled = true;

  const horaActual = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Agregar mensaje del estudiante a la interfaz y al historial
  const nuevoEstudiante = { rol: "estudiante", texto, fecha: horaActual };
  mensajesTutor.push(nuevoEstudiante);
  guardarHistorial(asignaturaActual.id, mensajesTutor);
  renderizarMensajes();
  alternarEscribiendo(true);

  try {
    cambiarEstado("pensando");

    // 2. Preparar el historial previo (máximo 8 turnos) para mantener contexto
    const historialContexto = mensajesTutor.slice(-8);

    // 3. Consultar al endpoint de IA socrático
    const res = await api.ia("tutor", {
      asignaturaId: asignaturaActual.id,
      mensaje: texto,
      historial: historialContexto
    });

    const respuestaTexto = typeof res === "object" && res.respuesta ? res.respuesta : String(res);
    const horaResp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 4. Agregar respuesta del tutor
    mensajesTutor.push({
      rol: "tutor",
      texto: respuestaTexto,
      fecha: horaResp
    });
    guardarHistorial(asignaturaActual.id, mensajesTutor);

    cambiarEstado("hablando");
    const vozActiva = localStorage.getItem("avatar_voz_activa") !== "false";
    if (vozActiva) {
      decir(respuestaTexto);
    } else {
      setTimeout(() => cambiarEstado("reposo"), 2000);
    }
  } catch (error) {
    cambiarEstado("reposo");
    const horaErr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    mensajesTutor.push({
      rol: "tutor",
      texto: `*(Aviso pedagógico)* No se pudo procesar la consulta en este momento: ${error.message}.\n\nPor favor intenta nuevamente o reformula tu pregunta sobre el temario de ${asignaturaActual.nombre}.`,
      fecha: horaErr
    });
    guardarHistorial(asignaturaActual.id, mensajesTutor);
  } finally {
    alternarEscribiendo(false);
    renderizarMensajes();
    input.disabled = false;
    if (btnEnviar) btnEnviar.disabled = false;
    input.focus();
  }
}

/**
 * Abre o cierra el drawer de tutoría
 */
function alternarDrawerTutor(abrir) {
  const drawer = document.getElementById("tutor-drawer");
  if (!drawer) return;

  if (abrir) {
    drawer.classList.remove("tutor-drawer--oculto");
    desplazarAlFinal();
    const input = document.getElementById("tutor-input");
    if (input) setTimeout(() => input.focus(), 100);
  } else {
    drawer.classList.add("tutor-drawer--oculto");
  }
}

/**
 * Monta los componentes interactivos del tutor socrático en el DOM
 */
function montarComponentesTutor(asig) {
  // 1. Eliminar instancias previas si existieran
  document.getElementById("btn-tutor-flotante")?.remove();
  document.getElementById("tutor-drawer")?.remove();

  // 2. Montar botón flotante
  const btnFlotante = document.createElement("button");
  btnFlotante.type = "button";
  btnFlotante.id = "btn-tutor-flotante";
  btnFlotante.className = "tutor-flotante-btn";
  btnFlotante.setAttribute("aria-label", "Abrir chat con el tutor virtual socrático");
  btnFlotante.innerHTML = `
    <span class="tutor-flotante-btn__pulso" aria-hidden="true"></span>
    <span class="tutor-flotante-btn__icono" aria-hidden="true">💬</span>
    <span>Tutor Socrático</span>
  `;
  document.body.appendChild(btnFlotante);

  // 3. Montar panel / drawer de chat
  const drawer = document.createElement("aside");
  drawer.id = "tutor-drawer";
  drawer.className = "tutor-drawer tutor-drawer--oculto";
  drawer.setAttribute("aria-label", "Chat interactivo con Tutor Virtual Socrático");
  drawer.innerHTML = `
    <header class="tutor-drawer__cabecera">
      <div class="tutor-drawer__perfil">
        <div class="tutor-drawer__avatar" aria-hidden="true">🏛️</div>
        <div class="tutor-drawer__titulos">
          <h3>Sócrates · Tutor Virtual</h3>
          <span class="tutor-drawer__estado">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:var(--exito);"></span>
            En línea · Razonamiento guiado
          </span>
        </div>
      </div>
      <div class="tutor-drawer__acciones">
        <button type="button" class="tutor-btn-icono" id="btn-reiniciar-tutor" title="Reiniciar conversación" aria-label="Reiniciar conversación">
          🔄
        </button>
        <button type="button" class="tutor-btn-icono" id="btn-cerrar-tutor" title="Cerrar chat" aria-label="Cerrar chat">
          ✕
        </button>
      </div>
    </header>

    <div class="tutor-drawer__aviso-curricular">
      <span>🎯 Ámbito de estudio:</span>
      <strong>${ui.escapar(asig.nombre)}</strong>
    </div>

    <div class="tutor-drawer__mensajes" id="tutor-mensajes-lista" role="log" aria-live="polite"></div>

    <div class="tutor-drawer__pie">
      <form class="tutor-form" id="tutor-form">
        <input
          type="text"
          id="tutor-input"
          class="tutor-input"
          placeholder="Escribe tu inquietud o reflexión aquí..."
          autocomplete="off"
          required
        />
        <button type="submit" class="tutor-btn-enviar" id="tutor-btn-enviar" aria-label="Enviar mensaje">
          Enviar
        </button>
      </form>
      <div class="tutor-pie-leyenda">
        <span>💡</span>
        <span>Sócrates formulará preguntas para que deduzcas el aprendizaje por ti mismo.</span>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  // 4. Asignar eventos de apertura y cierre
  btnFlotante.addEventListener("click", () => alternarDrawerTutor(true));

  document.getElementById("btn-cerrar-tutor")?.addEventListener("click", () => {
    alternarDrawerTutor(false);
  });

  const btnBanner = document.getElementById("btn-abrir-tutor-banner");
  if (btnBanner) {
    btnBanner.addEventListener("click", () => alternarDrawerTutor(true));
  }

  // 5. Reiniciar conversación
  document.getElementById("btn-reiniciar-tutor")?.addEventListener("click", async () => {
    const confirmar = await ui.confirmar(
      "¿Deseas reiniciar la conversación con el tutor socrático para esta asignatura?"
    );
    if (confirmar) {
      sessionStorage.removeItem(`tutor_chat_${asig.id}`);
      mensajesTutor = cargarHistorial(asig);
      renderizarMensajes();
    }
  });

  // 6. Formulario de envío
  const form = document.getElementById("tutor-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarMensajeTutor();
    });
  }

  // 7. Cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.classList.contains("tutor-drawer--oculto")) {
      alternarDrawerTutor(false);
    }
  });

  renderizarMensajes();
}

/**
 * Inicialización principal del módulo
 */
async function inicializar() {
  if (!asignaturaId) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Identificador no encontrado:</strong> No se ha especificado un ID de asignatura en la URL.</div>
      </div>
      <a href="/paginas/asignaturas.html" class="btn btn--secundario" style="margin-top: var(--espacio-m);">
        ← Volver a Mis Asignaturas
      </a>
    `;
    return;
  }

  try {
    ui.cargando(true);

    const [asignatura, todasUnidades, todosTemas, progresos, avance] = await Promise.all([
      api.obtener("asignaturas", asignaturaId),
      api.listar("unidades"),
      api.listar("temas"),
      api.listar("progreso-temas"),
      calcularAvance(asignaturaId)
    ]);

    asignaturaActual = asignatura;

    const usuario = usuarioActual();
    const temasRevisadosIds = new Set(
      progresos
        .filter((p) => !usuario || p.usuarioId === usuario.id)
        .map((p) => p.temaId)
    );

    const unidadesVisibles = todasUnidades
      .filter((u) => u.asignaturaId === asignaturaId && u.visible !== false)
      .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

    const unidadesIds = new Set(unidadesVisibles.map((u) => u.id));

    temasAsignatura = todosTemas
      .filter((t) => unidadesIds.has(t.unidadId) && (t.estado === "publicado" || usuario?.rol !== "estudiante"))
      .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

    mensajesTutor = cargarHistorial(asignatura);

    contenido.innerHTML = `
      <div class="asignatura-detalle-layout pila">
        <!-- Navegación y Encabezado Hero -->
        <section class="asignatura-detalle-hero">
          <div class="fila" style="justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <a href="/paginas/asignaturas.html" class="btn btn--texto btn--pequeno">
              ← Volver a Mis Asignaturas
            </a>
            <span class="insignia insignia--acento">${ui.escapar(asignatura.nivel || "PREGRADO")}</span>
          </div>

          <div class="pila pila--xs">
            <h1 style="color: var(--primario); margin: 0;">${ui.escapar(asignatura.nombre)}</h1>
            <p style="color: var(--texto-suave); font-size: var(--tamano-m);">
              ${ui.escapar(asignatura.descripcion || "Sin descripción disponible.")}
            </p>
          </div>

          <!-- Barra de avance general -->
          <div class="pila pila--xs" style="border-top: 1px solid var(--borde); padding-top: var(--espacio-m);">
            <div class="fila" style="justify-content: space-between; font-size: var(--tamano-s);">
              <span>Avance de la asignatura: <strong>${avance.porcentaje}%</strong></span>
              <span>${avance.revisados} de ${avance.total} temas revisados</span>
            </div>
            <div class="progreso" role="progressbar" aria-valuenow="${avance.porcentaje}" aria-valuemin="0" aria-valuemax="100">
              <div class="progreso__barra" style="width: ${avance.porcentaje}%;"></div>
            </div>
          </div>
        </section>

        <!-- Banner Estratégico del Tutor Socrático -->
        <section class="tutor-hero-banner" id="tutor-banner">
          <div class="tutor-hero-banner__info">
            <div class="tutor-hero-banner__icono" aria-hidden="true">🏛️</div>
            <div class="tutor-hero-banner__texto">
              <h2>
                Tutor Virtual Socrático · Sócrates
                <span class="insignia insignia--acento" style="font-size: var(--tamano-xs);">IA Pedagógica</span>
              </h2>
              <p>
                Acompañamiento socrático personalizado para razonar y comprender los contenidos de <strong>${ui.escapar(asignatura.nombre)}</strong> mediante preguntas guiadas, pistas reflexivas y retroalimentación interactiva.
              </p>
            </div>
          </div>
          <div class="tutor-hero-banner__cta">
            <button type="button" class="btn btn--primario" id="btn-abrir-tutor-banner">
              💬 Consultar al Tutor
            </button>
          </div>
        </section>

        <!-- Unidades y temas -->
        ${
          unidadesVisibles.length === 0
            ? `
          <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
            <p>Esta asignatura aún no cuenta con unidades de estudio publicadas.</p>
          </div>
        `
            : unidadesVisibles
                .map((u) => {
                  const temasUnidad = temasAsignatura.filter((t) => t.unidadId === u.id);

                  return `
            <section class="unidad-bloque">
              <header class="unidad-bloque__cabecera">
                <h2 class="unidad-bloque__titulo">
                  Unidad ${u.orden || ""}: ${ui.escapar(u.titulo)}
                </h2>
                <small style="color: var(--texto-suave);">${temasUnidad.length} tema(s) publicado(s)</small>
              </header>

              <div class="lista-temas-estudiante">
                ${
                  temasUnidad.length === 0
                    ? `<p style="color: var(--texto-suave); font-size: var(--tamano-s); padding: var(--espacio-s);">No hay temas disponibles en esta unidad.</p>`
                    : temasUnidad
                        .map((t) => {
                          const estaRevisado = temasRevisadosIds.has(t.id);
                          return `
                    <a href="/paginas/tema.html?id=${encodeURIComponent(t.id)}" class="tema-tarjeta-enlace">
                      <div class="tema-tarjeta-enlace__info">
                        <span class="insignia insignia--secundario" style="font-size: var(--tamano-xs);">Tema ${t.orden || ""}</span>
                        <strong>${ui.escapar(t.titulo)}</strong>
                      </div>

                      <div class="fila" style="align-items: center; gap: var(--espacio-s);">
                        <span class="insignia ${estaRevisado ? "insignia--exito" : "insignia--secundario"}">
                          ${estaRevisado ? "Revisado ✓" : "Pendiente"}
                        </span>
                        <span style="color: var(--primario); font-size: var(--tamano-s);">Estudiar →</span>
                      </div>
                    </a>
                  `;
                        })
                        .join("")
                }
              </div>
            </section>
          `;
                })
                .join("")
        }
      </div>
    `;

    // Montar widget y chat flotante del tutor
    montarComponentesTutor(asignatura);
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar la asignatura:</strong> ${ui.escapar(error.message)}</div>
      </div>
      <a href="/paginas/asignaturas.html" class="btn btn--secundario" style="margin-top: var(--espacio-m);">
        ← Volver a Mis Asignaturas
      </a>
    `;
  } finally {
    ui.cargando(false);
  }
}

inicializar();
