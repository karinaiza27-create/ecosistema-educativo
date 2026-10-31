// publico/js/modulos/agenda.js · Módulo de Agenda interactiva con FullCalendar y Mi Semana

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import { ACTIVIDADES } from "../nucleo/catalogo-actividades.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Agenda", roles: ["sesion"] });

const contenido = document.getElementById("contenido");
const usuario = usuarioActual();

let todosEventos = [];
let todosGrupos = [];
let todasAsignaturas = [];
let todosTemas = [];
let todosIntentos = [];
let calendarioInstance = null;
let vistaActiva = "calendario"; // "calendario" | "mi-semana"

/**
 * Formatea fechas para datetime-local (YYYY-MM-DDTHH:mm)
 */
function aInputDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formatea fechas para date (YYYY-MM-DD)
 */
function aInputDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Procesa y enriquece cada evento con estado de completitud (✓) y vencimiento
 */
function procesarEvento(ev) {
  const ahora = new Date();
  const fechaFin = ev.fin ? new Date(ev.fin) : new Date(ev.inicio);
  const esFechaLimite = ev.tipo === "fecha-limite";

  // Requisito 3: Eventos "fecha-limite" con actividad y tema muestran ✓ si el estudiante
  // tiene un intento posterior a la creación del evento
  let completado = false;
  if (esFechaLimite && ev.actividad && ev.temaId) {
    const fechaReferencia = ev.fecha ? new Date(ev.fecha) : new Date(ev.inicio);
    completado = todosIntentos.some((i) => {
      if (i.usuarioId !== usuario?.id) return false;
      if (i.actividad !== ev.actividad) return false;
      if (i.temaId !== ev.temaId) return false;
      const fIntento = new Date(i.fecha);
      return fIntento >= fechaReferencia;
    });
  }

  const vencido = !completado && fechaFin < ahora;

  return {
    ...ev,
    completado,
    vencido,
    tituloConCheck: completado ? `✓ ${ev.titulo}` : ev.titulo
  };
}

/**
 * Mapea eventos para FullCalendar
 */
function mapearParaFullCalendar(lista) {
  return lista.map((ev) => {
    const clases = [`fc-evento--${ev.tipo}`];
    if (ev.completado) clases.push("fc-evento--completado");
    else if (ev.vencido) clases.push("fc-evento--vencido");

    return {
      id: ev.id,
      title: ev.tituloConCheck,
      start: ev.inicio,
      end: ev.fin || ev.inicio,
      allDay: Boolean(ev.todoElDia),
      classNames: clases,
      extendedProps: ev
    };
  });
}

/**
 * Renderiza la vista principal
 */
async function cargarDatosYRenderizar() {
  try {
    ui.cargando(true);

    const [eventos, distributivo, asignaturas, temas, intentos] = await Promise.all([
      api.listar("agenda"),
      api.listar("distributivo"),
      api.listar("asignaturas"),
      api.listar("temas"),
      api.listar("intentos")
    ]);

    todosGrupos = distributivo;
    todasAsignaturas = asignaturas;
    todosTemas = temas;
    todosIntentos = intentos;
    todosEventos = (eventos || []).map(procesarEvento);

    renderizarInterfaz();
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar la agenda:</strong> ${ui.escapar(error.message)}</div>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

/**
 * Dibuja el marco HTML de la agenda
 */
function renderizarInterfaz() {
  contenido.innerHTML = `
    <div class="agenda-layout">
      <!-- Encabezado con acciones -->
      <header class="agenda-cabecera">
        <div class="agenda-cabecera__titulos">
          <h1>📅 Mi Agenda Académica</h1>
          <p>Organiza tus tareas, reuniones, fechas límite y recordatorios de clase.</p>
        </div>
        <button type="button" class="btn btn--primario" id="btn-nuevo-evento">
          + Nuevo evento
        </button>
      </header>

      <!-- Barra de leyenda de colores -->
      <div class="agenda-leyenda">
        <span style="font-weight: var(--peso-negrita);">Leyenda:</span>
        <span class="agenda-leyenda__item"><span class="agenda-punto agenda-punto--tarea"></span> Tarea</span>
        <span class="agenda-leyenda__item"><span class="agenda-punto agenda-punto--reunion"></span> Reunión</span>
        <span class="agenda-leyenda__item"><span class="agenda-punto agenda-punto--fecha-limite"></span> Fecha límite</span>
        <span class="agenda-leyenda__item"><span class="agenda-punto agenda-punto--recordatorio"></span> Recordatorio</span>
        <span class="agenda-leyenda__item"><span class="agenda-punto agenda-punto--completado"></span> ✓ Realizado</span>
        <span class="agenda-leyenda__item"><span class="agenda-punto agenda-punto--vencido"></span> Vencido</span>
      </div>

      <!-- Pestañas de vista -->
      <nav class="agenda-pestanas" aria-label="Selector de vista de agenda">
        <button type="button" class="agenda-pestana-btn ${vistaActiva === "calendario" ? "agenda-pestana-btn--activa" : ""}" id="tab-calendario">
          📆 Calendario completo
        </button>
        <button type="button" class="agenda-pestana-btn ${vistaActiva === "mi-semana" ? "agenda-pestana-btn--activa" : ""}" id="tab-mi-semana">
          ⚡ Mi semana (próximos 7 días)
        </button>
      </nav>

      <!-- Área de Calendario FullCalendar -->
      <div id="seccion-calendario" class="agenda-calendario-wrap" ${vistaActiva === "calendario" ? "" : 'style="display:none;"'}>
        <div id="fullcalendar-target"></div>
      </div>

      <!-- Área de Vista "Mi semana" -->
      <div id="seccion-mi-semana" class="mi-semana-contenedor" ${vistaActiva === "mi-semana" ? "" : 'style="display:none;"'}></div>
    </div>
  `;

  // Asignar eventos de pestañas
  document.getElementById("tab-calendario").addEventListener("click", () => cambiarVista("calendario"));
  document.getElementById("tab-mi-semana").addEventListener("click", () => cambiarVista("mi-semana"));
  document.getElementById("btn-nuevo-evento").addEventListener("click", () => abrirModalEvento());

  if (vistaActiva === "calendario") {
    iniciarFullCalendar();
  } else {
    renderizarMiSemana();
  }
}

/**
 * Cambia entre la vista de Calendario y la vista "Mi semana"
 */
function cambiarVista(nuevaVista) {
  vistaActiva = nuevaVista;
  const secCal = document.getElementById("seccion-calendario");
  const secSem = document.getElementById("seccion-mi-semana");
  const tabCal = document.getElementById("tab-calendario");
  const tabSem = document.getElementById("tab-mi-semana");

  if (nuevaVista === "calendario") {
    secCal.style.display = "block";
    secSem.style.display = "none";
    tabCal.classList.add("agenda-pestana-btn--activa");
    tabSem.classList.remove("agenda-pestana-btn--activa");
    iniciarFullCalendar();
  } else {
    secCal.style.display = "none";
    secSem.style.display = "flex";
    tabCal.classList.remove("agenda-pestana-btn--activa");
    tabSem.classList.add("agenda-pestana-btn--activa");
    renderizarMiSemana();
  }
}

/**
 * Inicializa FullCalendar con configuración en español y semana desde el lunes
 */
function iniciarFullCalendar() {
  const target = document.getElementById("fullcalendar-target");
  if (!target) return;

  if (typeof window.FullCalendar !== "undefined") {
    if (calendarioInstance) {
      calendarioInstance.destroy();
    }

    calendarioInstance = new window.FullCalendar.Calendar(target, {
      initialView: "dayGridMonth",
      locale: "es",
      firstDay: 1, // Semana inicia en lunes
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,listWeek"
      },
      buttonText: {
        today: "Hoy",
        month: "Mes",
        week: "Semana",
        list: "Lista"
      },
      events: mapearParaFullCalendar(todosEventos),
      eventClick: (info) => {
        info.jsEvent.preventDefault();
        abrirModalEvento(info.event.extendedProps);
      },
      dateClick: (info) => {
        abrirModalEvento({ inicio: info.dateStr });
      }
    });

    calendarioInstance.render();
  } else {
    // Modo de respaldo local si el CDN no estuviera accesible
    renderizarCalendarioRespaldo(target);
  }
}

/**
 * Fallback de visualización cuando no hay acceso a la librería FullCalendar de CDN
 */
function renderizarCalendarioRespaldo(target) {
  target.innerHTML = `
    <div class="tarjeta" style="display: flex; flex-direction: column; gap: var(--espacio-m);">
      <div class="fila" style="justify-content: space-between; align-items: center;">
        <h2 style="color: var(--primario); margin: 0;">Lista de eventos programados</h2>
        <span class="insignia insignia--secundario">${todosEventos.length} eventos</span>
      </div>
      <div class="mi-semana-lista-eventos">
        ${
          todosEventos.length === 0
            ? `<p style="color: var(--texto-suave);">No hay eventos registrados en la agenda.</p>`
            : todosEventos
                .map((ev) => `
              <div class="evento-tarjeta evento-tarjeta--${ev.tipo} ${ev.completado ? "evento-tarjeta--completado" : ""} ${ev.vencido ? "evento-tarjeta--vencido" : ""}">
                <div class="evento-tarjeta__cuerpo">
                  <h3 class="evento-tarjeta__titulo">${ui.escapar(ev.tituloConCheck)}</h3>
                  <div class="evento-tarjeta__meta">
                    <span>📅 ${new Date(ev.inicio).toLocaleString()}</span>
                    <span class="insignia insignia--secundario">${ev.tipo}</span>
                  </div>
                </div>
                <div class="evento-tarjeta__acciones">
                  <button type="button" class="btn btn--secundario btn--pequeno btn-ver-ev" data-id="${ev.id}">
                    Ver / Editar
                  </button>
                </div>
              </div>
            `)
                .join("")
        }
      </div>
    </div>
  `;

  target.querySelectorAll(".btn-ver-ev").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const ev = todosEventos.find((e) => e.id === id);
      if (ev) abrirModalEvento(ev);
    });
  });
}

/**
 * Requisito 4: Vista "Mi semana": los próximos 7 días, con los vencidos resaltados
 */
function renderizarMiSemana() {
  const contenedor = document.getElementById("seccion-mi-semana");
  if (!contenedor) return;

  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finSemana = new Date(inicioHoy.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Eventos vencidos (pasados y no completados)
  const eventosVencidos = todosEventos.filter((ev) => ev.vencido);

  // Eventos dentro de los próximos 7 días
  const eventosProximos = todosEventos.filter((ev) => {
    const f = new Date(ev.inicio);
    return f >= inicioHoy && f <= finSemana;
  }).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  const completados = todosEventos.filter((ev) => ev.completado).length;

  contenedor.innerHTML = `
    <!-- Tarjetas de métricas rápidas -->
    <div class="mi-semana-resumen">
      <div class="mi-semana-metrica">
        <span class="mi-semana-metrica__num">${eventosProximos.length}</span>
        <span class="mi-semana-metrica__label">Próximos 7 días</span>
      </div>
      <div class="mi-semana-metrica" style="border-left: 4px solid var(--error);">
        <span class="mi-semana-metrica__num" style="color: var(--error);">${eventosVencidos.length}</span>
        <span class="mi-semana-metrica__label">Vencidos pendientes</span>
      </div>
      <div class="mi-semana-metrica" style="border-left: 4px solid var(--exito);">
        <span class="mi-semana-metrica__num" style="color: var(--exito);">${completados}</span>
        <span class="mi-semana-metrica__label">Actividades realizadas</span>
      </div>
    </div>

    <!-- Sección de Eventos Vencidos Resaltados -->
    ${
      eventosVencidos.length > 0
        ? `
      <section class="mi-semana-seccion" style="border-color: var(--error);">
        <h2 class="mi-semana-seccion__titulo" style="color: var(--error);">
          <span>⚠️ Eventos y Fechas Límite Vencidas</span>
          <span class="insignia insignia--peligro">${eventosVencidos.length} pendiente(s)</span>
        </h2>
        <div class="mi-semana-lista-eventos">
          ${eventosVencidos.map((ev) => renderizarTarjetaEvento(ev, true)).join("")}
        </div>
      </section>
    `
        : ""
    }

    <!-- Sección de los Próximos 7 Días -->
    <section class="mi-semana-seccion">
      <h2 class="mi-semana-seccion__titulo">
        <span>📅 Compromisos para los próximos 7 días</span>
        <small style="color: var(--texto-suave); font-size: var(--tamano-s);">
          ${inicioHoy.toLocaleDateString()} al ${finSemana.toLocaleDateString()}
        </small>
      </h2>

      ${
        eventosProximos.length === 0
          ? `
        <div style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
          <p>No tienes eventos agendados para los próximos 7 días. ¡Excelente momento para adelantar actividades!</p>
        </div>
      `
          : `
        <div class="mi-semana-lista-eventos">
          ${eventosProximos.map((ev) => renderizarTarjetaEvento(ev, false)).join("")}
        </div>
      `
      }
    </section>
  `;

  // Asignar listeners a los botones de acción en las tarjetas
  contenedor.querySelectorAll(".btn-abrir-actividad").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-href");
      if (url) window.location.href = url;
    });
  });

  contenedor.querySelectorAll(".btn-editar-evento").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const ev = todosEventos.find((e) => e.id === id);
      if (ev) abrirModalEvento(ev);
    });
  });
}

/**
 * Genera el HTML para una tarjeta de evento en Mi Semana
 */
function renderizarTarjetaEvento(ev, esVencido) {
  const fInicio = new Date(ev.inicio);
  const fechaStr = fInicio.toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  const horaStr = ev.todoElDia ? "Todo el día" : fInicio.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const actInfo = ev.actividad ? ACTIVIDADES.find((a) => a.id === ev.actividad) : null;
  const temaInfo = ev.temaId ? todosTemas.find((t) => t.id === ev.temaId) : null;
  const grupoInfo = ev.grupoId ? todosGrupos.find((g) => g.id === ev.grupoId) : null;

  let urlActividad = null;
  if (actInfo && ev.temaId) {
    urlActividad = `${actInfo.href}?temaId=${encodeURIComponent(ev.temaId)}`;
  }

  const esPropietario = ev.propietarioId === usuario?.id;

  return `
    <article class="evento-tarjeta evento-tarjeta--${ev.tipo} ${ev.completado ? "evento-tarjeta--completado" : ""} ${esVencido ? "evento-tarjeta--vencido" : ""}">
      <div class="evento-tarjeta__cuerpo">
        <h3 class="evento-tarjeta__titulo">
          ${ui.escapar(ev.tituloConCheck)}
          ${ev.completado ? `<span class="insignia insignia--exito">✓ Completado</span>` : ""}
          ${esVencido ? `<span class="insignia insignia--peligro">¡Vencido!</span>` : ""}
        </h3>

        <div class="evento-tarjeta__meta">
          <span>🕒 <strong>${fechaStr}</strong> · ${horaStr}</span>
          <span class="insignia insignia--secundario" style="text-transform: capitalize;">${ev.tipo}</span>
          ${grupoInfo ? `<span class="insignia insignia--acento">Grupo: Paralelo ${grupoInfo.paralelo || "A"}</span>` : ""}
          ${actInfo ? `<span class="insignia insignia--secundario">Actividad: ${ui.escapar(actInfo.texto)}</span>` : ""}
          ${temaInfo ? `<span>Tema: ${ui.escapar(temaInfo.titulo)}</span>` : ""}
        </div>
      </div>

      <div class="evento-tarjeta__acciones">
        ${
          urlActividad
            ? `
          <button type="button" class="btn btn--primario btn--pequeno btn-abrir-actividad" data-href="${urlActividad}">
            ${ev.completado ? "Repetir actividad →" : "Realizar actividad →"}
          </button>
        `
            : ""
        }
        ${
          esPropietario
            ? `
          <button type="button" class="btn btn--secundario btn--pequeno btn-editar-evento" data-id="${ev.id}">
            Editar
          </button>
        `
            : ""
        }
      </div>
    </article>
  `;
}

/**
 * Requisito 2: Modal para crear y editar evento
 */
async function abrirModalEvento(eventoExistente = null) {
  const esEdicion = Boolean(eventoExistente && eventoExistente.id);
  const esPropietario = !esEdicion || eventoExistente.propietarioId === usuario?.id;
  const esDocenteOAdmin = usuario?.rol === "docente" || usuario?.rol === "admin";

  // Grupos disponibles para este docente
  const gruposDisponibles = esDocenteOAdmin
    ? (usuario?.rol === "admin" ? todosGrupos : todosGrupos.filter((g) => g.docenteId === usuario?.id))
    : [];

  const tipoActual = eventoExistente?.tipo || "tarea";
  const recordatoriosActuales = Array.isArray(eventoExistente?.recordatorios) ? eventoExistente.recordatorios : [];

  const formHtml = `
    <form id="form-evento-agenda" class="agenda-form">
      <div class="campo">
        <label for="evento-titulo">Título del evento *</label>
        <input
          type="text"
          id="evento-titulo"
          class="input"
          value="${ui.escapar(eventoExistente?.titulo || "")}"
          placeholder="Ej: Entrega de informe ambiental"
          required
          ${!esPropietario ? "disabled" : ""}
        />
      </div>

      <div class="agenda-form-grid">
        <div class="campo">
          <label for="evento-tipo">Tipo de evento *</label>
          <select id="evento-tipo" class="selector" ${!esPropietario ? "disabled" : ""}>
            <option value="tarea" ${tipoActual === "tarea" ? "selected" : ""}>Tarea</option>
            <option value="reunion" ${tipoActual === "reunion" ? "selected" : ""}>Reunión</option>
            <option value="fecha-limite" ${tipoActual === "fecha-limite" ? "selected" : ""}>Fecha límite</option>
            <option value="recordatorio" ${tipoActual === "recordatorio" ? "selected" : ""}>Recordatorio</option>
          </select>
        </div>

        <div class="campo" style="display: flex; align-items: flex-end; padding-bottom: var(--espacio-s);">
          <label class="fila" style="align-items: center; gap: var(--espacio-s); cursor: pointer;">
            <input type="checkbox" id="evento-todo-el-dia" ${eventoExistente?.todoElDia ? "checked" : ""} ${!esPropietario ? "disabled" : ""} />
            <span>Todo el día</span>
          </label>
        </div>
      </div>

      <div class="agenda-form-grid">
        <div class="campo">
          <label for="evento-inicio">Fecha / Hora de inicio *</label>
          <input
            type="datetime-local"
            id="evento-inicio"
            class="input"
            value="${aInputDateTime(eventoExistente?.inicio || new Date().toISOString())}"
            required
            ${!esPropietario ? "disabled" : ""}
          />
        </div>

        <div class="campo">
          <label for="evento-fin">Fecha / Hora de fin</label>
          <input
            type="datetime-local"
            id="evento-fin"
            class="input"
            value="${aInputDateTime(eventoExistente?.fin || eventoExistente?.inicio || new Date().toISOString())}"
            ${!esPropietario ? "disabled" : ""}
          />
        </div>
      </div>

      <!-- Recordatorios -->
      <div class="campo">
        <label>Recordatorios automáticos</label>
        <div class="fila" style="gap: var(--espacio-l); flex-wrap: wrap;">
          <label class="fila" style="align-items: center; gap: var(--espacio-xs); cursor: pointer;">
            <input type="checkbox" class="chk-recordatorio" value="1440" ${recordatoriosActuales.includes(1440) ? "checked" : ""} ${!esPropietario ? "disabled" : ""} />
            <span>1 día antes (24 h)</span>
          </label>
          <label class="fila" style="align-items: center; gap: var(--espacio-xs); cursor: pointer;">
            <input type="checkbox" class="chk-recordatorio" value="60" ${recordatoriosActuales.includes(60) ? "checked" : ""} ${!esPropietario ? "disabled" : ""} />
            <span>1 hora antes</span>
          </label>
        </div>
      </div>

      <!-- Opciones docentes: Grupo y Actividad pedagógica vinculada -->
      ${
        esDocenteOAdmin
          ? `
        <div class="pila pila--s" style="border-top: 1px solid var(--borde); padding-top: var(--espacio-m);">
          <h4 style="margin: 0; color: var(--primario); font-size: var(--tamano-s);">Opciones para docentes:</h4>

          <div class="campo">
            <label for="evento-grupo">Asignar a un grupo de clase</label>
            <select id="evento-grupo" class="selector" ${!esPropietario ? "disabled" : ""}>
              <option value="">Ninguno (Evento personal)</option>
              ${gruposDisponibles
                .map((g) => {
                  const asig = todasAsignaturas.find((a) => a.id === g.asignaturaId);
                  const nombreAsig = asig ? asig.nombre : g.asignaturaId;
                  const sel = eventoExistente?.grupoId === g.id ? "selected" : "";
                  return `<option value="${g.id}" ${sel}>Paralelo ${g.paralelo || "A"} · ${ui.escapar(nombreAsig)}</option>`;
                })
                .join("")}
            </select>
          </div>

          <div class="agenda-form-grid" id="bloque-actividad" style="${tipoActual === "fecha-limite" ? "" : "display: none;"}">
            <div class="campo">
              <label for="evento-actividad">Actividad vinculada</label>
              <select id="evento-actividad" class="selector" ${!esPropietario ? "disabled" : ""}>
                <option value="">Ninguna</option>
                ${ACTIVIDADES.map((act) => {
                  const sel = eventoExistente?.actividad === act.id ? "selected" : "";
                  return `<option value="${act.id}" ${sel}>${ui.escapar(act.texto)}</option>`;
                }).join("")}
              </select>
            </div>

            <div class="campo">
              <label for="evento-tema">Tema de la actividad</label>
              <select id="evento-tema" class="selector" ${!esPropietario ? "disabled" : ""}>
                <option value="">Ninguno</option>
                ${todosTemas.map((t) => {
                  const sel = eventoExistente?.temaId === t.id ? "selected" : "";
                  return `<option value="${t.id}" ${sel}>${ui.escapar(t.titulo)}</option>`;
                }).join("")}
              </select>
            </div>
          </div>
        </div>
      `
          : ""
      }
    </form>
  `;

  // Construir acciones del modal
  const accionesModal = [];
  if (esPropietario) {
    if (esEdicion) {
      accionesModal.push({
        texto: "🗑️ Eliminar",
        valor: "eliminar",
        clase: "btn--peligro"
      });
    }
    accionesModal.push({
      texto: "Cancelar",
      valor: "cancelar",
      clase: "btn--secundario"
    });
    accionesModal.push({
      texto: esEdicion ? "Guardar cambios" : "Crear evento",
      valor: "guardar",
      primario: true
    });
  } else {
    // Si no es propietario (estudiante viendo evento de docente), permitir ir a la actividad
    if (eventoExistente?.actividad && eventoExistente?.temaId) {
      const actInfo = ACTIVIDADES.find((a) => a.id === eventoExistente.actividad);
      if (actInfo) {
        accionesModal.push({
          texto: eventoExistente.completado ? "Repetir actividad →" : "Realizar actividad →",
          valor: "ir-actividad",
          primario: true
        });
      }
    }
    accionesModal.push({
      texto: "Cerrar",
      valor: "cancelar",
      clase: "btn--secundario"
    });
  }

  const contenedorModal = document.createElement("div");
  contenedorModal.innerHTML = formHtml;

  // Interacción dinámica en el modal: mostrar u ocultar bloque de actividad según tipo
  const selTipo = contenedorModal.querySelector("#evento-tipo");
  const bloqueActividad = contenedorModal.querySelector("#bloque-actividad");
  if (selTipo && bloqueActividad) {
    selTipo.addEventListener("change", () => {
      bloqueActividad.style.display = selTipo.value === "fecha-limite" ? "grid" : "none";
    });
  }

  // Interacción de todo el día
  const chkTodoElDia = contenedorModal.querySelector("#evento-todo-el-dia");
  const inInicio = contenedorModal.querySelector("#evento-inicio");
  const inFin = contenedorModal.querySelector("#evento-fin");
  if (chkTodoElDia && inInicio && inFin) {
    chkTodoElDia.addEventListener("change", () => {
      if (chkTodoElDia.checked) {
        inInicio.type = "date";
        inFin.type = "date";
        inInicio.value = inInicio.value.slice(0, 10);
        inFin.value = inFin.value.slice(0, 10);
      } else {
        inInicio.type = "datetime-local";
        inFin.type = "datetime-local";
      }
    });
  }

  const respuesta = await ui.modal({
    titulo: esEdicion ? (esPropietario ? "Editar Evento" : "Detalle del Evento") : "Nuevo Evento en la Agenda",
    contenido: contenedorModal,
    acciones: accionesModal
  });

  if (respuesta === "ir-actividad") {
    const actInfo = ACTIVIDADES.find((a) => a.id === eventoExistente.actividad);
    if (actInfo && eventoExistente.temaId) {
      window.location.href = `${actInfo.href}?temaId=${encodeURIComponent(eventoExistente.temaId)}`;
    }
    return;
  }

  if (respuesta === "eliminar" && esEdicion) {
    const confirmar = await ui.confirmar(`¿Estás seguro de que deseas eliminar el evento "${eventoExistente.titulo}"?`);
    if (confirmar) {
      try {
        ui.cargando(true);
        await api.eliminar("agenda", eventoExistente.id);
        ui.aviso("Evento eliminado correctamente", "exito");
        await cargarDatosYRenderizar();
      } catch (err) {
        ui.aviso(`Error al eliminar evento: ${err.message}`, "error");
      } finally {
        ui.cargando(false);
      }
    }
    return;
  }

  if (respuesta === "guardar") {
    const titulo = contenedorModal.querySelector("#evento-titulo")?.value?.trim();
    const tipo = contenedorModal.querySelector("#evento-tipo")?.value;
    const todoElDia = Boolean(contenedorModal.querySelector("#evento-todo-el-dia")?.checked);
    const inicio = contenedorModal.querySelector("#evento-inicio")?.value;
    const fin = contenedorModal.querySelector("#evento-fin")?.value;
    const grupoId = contenedorModal.querySelector("#evento-grupo")?.value || null;
    const actividad = contenedorModal.querySelector("#evento-actividad")?.value || null;
    const temaId = contenedorModal.querySelector("#evento-tema")?.value || null;

    const recordatorios = Array.from(contenedorModal.querySelectorAll(".chk-recordatorio:checked")).map((chk) =>
      Number(chk.value)
    );

    if (!titulo) {
      ui.aviso("El título es obligatorio", "error");
      return;
    }
    if (!inicio) {
      ui.aviso("La fecha de inicio es obligatoria", "error");
      return;
    }

    const payload = {
      titulo,
      tipo,
      todoElDia,
      inicio,
      fin: fin || inicio,
      recordatorios,
      grupoId,
      actividad: tipo === "fecha-limite" ? actividad : null,
      temaId: tipo === "fecha-limite" ? temaId : null
    };

    try {
      ui.cargando(true);
      if (esEdicion) {
        await api.actualizar("agenda", eventoExistente.id, payload);
        ui.aviso("Evento actualizado correctamente", "exito");
      } else {
        await api.crear("agenda", payload);
        ui.aviso("Evento agregado a la agenda", "exito");
      }
      await cargarDatosYRenderizar();
    } catch (err) {
      ui.aviso(`Error al guardar evento: ${err.message}`, "error");
    } finally {
      ui.cargando(false);
    }
  }
}

// Inicializar la carga de la agenda
cargarDatosYRenderizar();
