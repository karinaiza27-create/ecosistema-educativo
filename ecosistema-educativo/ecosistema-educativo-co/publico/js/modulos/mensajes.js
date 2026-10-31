// publico/js/modulos/mensajes.js · Interfaz interactiva de mensajería interna

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Mensajes", roles: ["sesion"] });

const contenido = document.getElementById("contenido");
const usuario = usuarioActual();

let conversaciones = [];
let conversacionActiva = null;
let mensajes = [];
let filtroBusqueda = "";
let cargandoMasAnteriores = false;

// Intervalos de actualización
let timerMensajesNuevos = null;
let timerListaConversaciones = null;

/**
 * Convierte URLs en etiquetas <a> seguras preservando el escape de texto
 */
function formatearTextoMensaje(texto) {
  if (!texto) return "";
  const seguro = ui.escapar(texto);
  const regexUrl = /(https?:\/\/[^\s<]+)/g;
  const conEnlaces = seguro.replace(regexUrl, '<a href="$1" rel="noopener" target="_blank">$1</a>');
  return conEnlaces.replace(/\n/g, "<br>");
}

function formatearHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function obtenerEtiquetaDia(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

/**
 * Inicializa la estructura HTML de la página
 */
async function inicializar() {
  contenido.innerHTML = `
    <div class="mensajeria-layout" id="mensajeria-layout">
      <!-- Columna izquierda: Lista de chats -->
      <aside class="mensajeria-lateral" id="mensajeria-lateral">
        <header class="mensajeria-lateral__cabecera">
          <div class="mensajeria-lateral__fila-top">
            <h1 class="mensajeria-lateral__titulo">Mensajes</h1>
            <button type="button" class="btn btn--primario btn--pequeno" id="btn-nueva-conversacion">
              + Nuevo
            </button>
          </div>
          <div class="mensajeria-buscador-wrap">
            <input
              type="text"
              class="mensajeria-buscador"
              id="input-buscador-conv"
              placeholder="Buscar conversación o mensaje..."
              autocomplete="off"
            />
          </div>
        </header>

        <div class="mensajeria-lista" id="lista-conversaciones" role="list">
          <div style="padding: var(--espacio-m); text-align: center; color: var(--texto-suave);">
            Cargando conversaciones...
          </div>
        </div>
      </aside>

      <!-- Columna derecha: Chat abierto -->
      <section class="mensajeria-chat" id="mensajeria-chat">
        <div class="chat-vacio" id="chat-vacio">
          <div class="chat-vacio__icono">💬</div>
          <h2 style="margin: 0; color: var(--primario); font-size: var(--tamano-l);">Bandeja de Mensajería</h2>
          <p>Selecciona una conversación de la lista o pulsa en <strong>+ Nuevo</strong> para iniciar un diálogo.</p>
        </div>

        <div id="chat-activo-wrap" style="display: none; height: 100%; flex-direction: column;">
          <!-- Cabecera del chat -->
          <header class="chat-cabecera">
            <div class="chat-cabecera__usuario">
              <button type="button" class="btn btn--secundario btn--pequeno btn-volver-conversaciones" id="btn-volver-conversaciones" aria-label="Volver a la lista de mensajes">
                ←
              </button>
              <div class="chat-cabecera__avatar" id="chat-cabecera-avatar">U</div>
              <div class="chat-cabecera__detalles">
                <h2 class="chat-cabecera__nombre" id="chat-cabecera-nombre">Usuario</h2>
                <span class="chat-cabecera__subtitulo" id="chat-cabecera-subtitulo">Rol</span>
              </div>
            </div>

            <div class="chat-cabecera__acciones">
              <button type="button" class="btn btn--texto btn--pequeno" id="btn-opciones-usuario" title="Opciones de conversación">
                ⚙️ Opciones
              </button>
            </div>
          </header>

          <!-- Flujo de mensajes -->
          <div class="chat-mensajes" id="chat-mensajes-flujo" role="log" aria-live="polite">
            <button type="button" class="btn btn--secundario btn--pequeno chat-cargar-anteriores" id="btn-cargar-anteriores" style="display: none;">
              ↑ Ver anteriores
            </button>
            <div id="mensajes-contenedor" style="display: flex; flex-direction: column; gap: var(--espacio-s);"></div>
          </div>

          <!-- Pie con formulario de envío -->
          <footer class="chat-pie">
            <form class="chat-formulario" id="form-enviar-mensaje">
              <textarea
                class="chat-input"
                id="input-mensaje-texto"
                placeholder="Escribe un mensaje... (Enter para enviar, Mayús + Enter para nueva línea)"
                maxlength="2000"
                rows="1"
                required
              ></textarea>
              <button type="submit" class="btn btn--primario chat-btn-enviar" id="btn-enviar-mensaje">
                Enviar
              </button>
            </form>
            <div class="chat-pie-ayuda">
              <span>Enter envía · Mayús + Enter nueva línea</span>
              <span id="contador-caracteres">0 / 2.000</span>
            </div>
          </footer>
        </div>
      </section>
    </div>
  `;

  // Asignar listeners generales
  document.getElementById("btn-nueva-conversacion").addEventListener("click", abrirModalContactos);

  document.getElementById("input-buscador-conv").addEventListener("input", (e) => {
    filtroBusqueda = (e.target.value || "").toLowerCase().trim();
    renderizarListaConversaciones();
  });

  document.getElementById("btn-volver-conversaciones").addEventListener("click", () => {
    cerrarChatActivo();
  });

  const formMsg = document.getElementById("form-enviar-mensaje");
  const inputMsg = document.getElementById("input-mensaje-texto");
  const contador = document.getElementById("contador-caracteres");

  inputMsg.addEventListener("input", () => {
    contador.textContent = `${inputMsg.value.length} / 2.000`;
    // Auto-ajustar altura
    inputMsg.style.height = "auto";
    inputMsg.style.height = `${Math.min(inputMsg.scrollHeight, 120)}px`;
  });

  inputMsg.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formMsg.dispatchEvent(new Event("submit"));
    }
  });

  formMsg.addEventListener("submit", (e) => {
    e.preventDefault();
    enviarMensajeActual();
  });

  document.getElementById("btn-cargar-anteriores").addEventListener("click", () => {
    cargarMensajesAnteriores();
  });

  document.getElementById("btn-opciones-usuario").addEventListener("click", () => {
    abrirModalOpcionesUsuario();
  });

  // Cargar lista inicial
  await cargarConversaciones(true);

  // Iniciar temporizadores periódicos (con verificación de pestaña visible)
  iniciarSondeoPeriodico();
}

/**
 * Carga las conversaciones desde el servidor
 */
async function cargarConversaciones(mostrarCarga = false) {
  if (mostrarCarga) ui.cargando(true);
  try {
    conversaciones = await api.llamar("GET", "/api/mensajes/conversaciones");
    renderizarListaConversaciones();

    // Si hay una conversación activa, actualizar sus datos
    if (conversacionActiva) {
      const actualizada = conversaciones.find((c) => c.id === conversacionActiva.id);
      if (actualizada) {
        conversacionActiva = actualizada;
      }
    }
  } catch (err) {
    console.error("Error al cargar conversaciones:", err);
  } finally {
    if (mostrarCarga) ui.cargando(false);
  }
}

/**
 * Renderiza la columna izquierda con las conversaciones
 */
function renderizarListaConversaciones() {
  const listaEl = document.getElementById("lista-conversaciones");
  if (!listaEl) return;

  const filtradas = conversaciones.filter((c) => {
    if (!filtroBusqueda) return true;
    const nombre = `${c.otroUsuario?.nombre || ""} ${c.otroUsuario?.apellido || ""}`.toLowerCase();
    const ultimoTexto = (c.ultimo?.texto || "").toLowerCase();
    return nombre.includes(filtroBusqueda) || ultimoTexto.includes(filtroBusqueda);
  });

  if (filtradas.length === 0) {
    listaEl.innerHTML = `
      <div style="padding: var(--espacio-l); text-align: center; color: var(--texto-suave);">
        <p>${filtroBusqueda ? "No se encontraron conversaciones que coincidan." : "No tienes conversaciones aún."}</p>
      </div>
    `;
    return;
  }

  listaEl.innerHTML = filtradas
    .map((c) => {
      const estaActiva = conversacionActiva && conversacionActiva.id === c.id;
      const nombreCompleto = `${c.otroUsuario?.nombre || "Usuario"} ${c.otroUsuario?.apellido || ""}`.trim();
      const inicial = (c.otroUsuario?.nombre || "U").charAt(0).toUpperCase();
      const horaStr = c.ultimo ? formatearHora(c.ultimo.fecha) : "";
      const ultimoTexto = c.ultimo ? ui.escapar(c.ultimo.texto) : "<em>Conversación iniciada</em>";
      const noLeidos = Number(c.noLeidos) || 0;

      return `
        <article
          class="conv-item ${estaActiva ? "conv-item--activa" : ""}"
          data-id="${c.id}"
          role="button"
          tabindex="0"
          aria-label="Conversación con ${ui.escapar(nombreCompleto)}"
        >
          <div class="conv-item__avatar">${ui.escapar(inicial)}</div>
          <div class="conv-item__contenido">
            <div class="conv-item__fila-superior">
              <span class="conv-item__nombre">${ui.escapar(nombreCompleto)}</span>
              <span class="conv-item__hora">${ui.escapar(horaStr)}</span>
            </div>
            <div class="conv-item__fila-inferior">
              <p class="conv-item__ultimo-msg">${ultimoTexto}</p>
              ${
                noLeidos > 0
                  ? `<span class="insignia insignia--acento" style="font-size: 0.75rem; padding: 2px 6px;">${noLeidos}</span>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  // Eventos de selección
  listaEl.querySelectorAll(".conv-item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      const seleccionada = conversaciones.find((c) => c.id === id);
      if (seleccionada) abrirConversacion(seleccionada);
    });
  });
}

/**
 * Abre una conversación en la columna derecha
 */
async function abrirConversacion(conv) {
  conversacionActiva = conv;
  renderizarListaConversaciones();

  const layout = document.getElementById("mensajeria-layout");
  const vacio = document.getElementById("chat-vacio");
  const wrapActivo = document.getElementById("chat-activo-wrap");

  layout.classList.add("mensajeria-layout--chat-abierto");
  vacio.style.display = "none";
  wrapActivo.style.display = "flex";

  // Actualizar cabecera
  const nombreCompleto = `${conv.otroUsuario?.nombre || "Usuario"} ${conv.otroUsuario?.apellido || ""}`.trim();
  const inicial = (conv.otroUsuario?.nombre || "U").charAt(0).toUpperCase();

  document.getElementById("chat-cabecera-avatar").textContent = inicial;
  document.getElementById("chat-cabecera-nombre").textContent = nombreCompleto;
  document.getElementById("chat-cabecera-subtitulo").innerHTML = `
    <span class="insignia insignia--secundario" style="text-transform: capitalize;">${ui.escapar(conv.otroUsuario?.rol || "estudiante")}</span>
    ${conv.bloqueado ? `<span class="insignia insignia--peligro">Bloqueado</span>` : ""}
  `;

  // Cargar primeros 50 mensajes
  ui.cargando(true);
  try {
    mensajes = await api.llamar("GET", `/api/mensajes/${conv.id}`);
    renderizarMensajesEnFlujo(false);
    desplazarAlFinal();

    // Marcar como leído
    await marcarComoLeido(conv.id);
  } catch (err) {
    ui.aviso(`Error al cargar mensajes: ${err.message}`, "error");
  } finally {
    ui.cargando(false);
  }

  // Enfocar input
  const input = document.getElementById("input-mensaje-texto");
  if (input) setTimeout(() => input.focus(), 100);
}

/**
 * Cierra la conversación activa en vista móvil
 */
function cerrarChatActivo() {
  conversacionActiva = null;
  const layout = document.getElementById("mensajeria-layout");
  const vacio = document.getElementById("chat-vacio");
  const wrapActivo = document.getElementById("chat-activo-wrap");

  layout.classList.remove("mensajeria-layout--chat-abierto");
  vacio.style.display = "flex";
  wrapActivo.style.display = "none";
  renderizarListaConversaciones();
}

/**
 * Dibuja los mensajes agrupados por fecha
 */
function renderizarMensajesEnFlujo(mantenerScroll = false) {
  const flujo = document.getElementById("chat-mensajes-flujo");
  const contenedor = document.getElementById("mensajes-contenedor");
  const btnAnteriores = document.getElementById("btn-cargar-anteriores");
  if (!contenedor) return;

  const alturaPrevia = flujo ? flujo.scrollHeight : 0;

  if (mensajes.length >= 50) {
    btnAnteriores.style.display = "block";
  } else {
    btnAnteriores.style.display = "none";
  }

  if (mensajes.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
        <p>No hay mensajes en esta conversación. ¡Saluda y comienza el diálogo!</p>
      </div>
    `;
    return;
  }

  let html = "";
  let ultimoDia = "";

  mensajes.forEach((m) => {
    const diaActual = obtenerEtiquetaDia(m.fecha);
    if (diaActual !== ultimoDia) {
      ultimoDia = diaActual;
      html += `
        <div class="separador-dia">
          <span class="separador-dia__texto">${ui.escapar(diaActual)}</span>
        </div>
      `;
    }

    const esMio = m.autorId === usuario?.id;
    const hora = formatearHora(m.fecha);

    html += `
      <div class="mensaje-fila ${esMio ? "mensaje-fila--mio" : "mensaje-fila--otro"}">
        <div class="mensaje-burbuja">
          ${formatearTextoMensaje(m.texto)}
        </div>
        <div class="mensaje-meta">
          <span>${ui.escapar(hora)}</span>
          ${
            !esMio
              ? `
            <button type="button" class="btn-reportar-msg" data-msg-id="${m.id}" title="Reportar mensaje inapropiado">
              🚩
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;
  });

  contenedor.innerHTML = html;

  if (mantenerScroll && flujo) {
    const nuevaAltura = flujo.scrollHeight;
    flujo.scrollTop = nuevaAltura - alturaPrevia;
  }

  // Listeners para reportar mensajes
  contenedor.querySelectorAll(".btn-reportar-msg").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      abrirModalReportarMensaje(msgId);
    });
  });
}

function desplazarAlFinal() {
  const flujo = document.getElementById("chat-mensajes-flujo");
  if (flujo) {
    flujo.scrollTop = flujo.scrollHeight;
  }
}

/**
 * Carga mensajes anteriores usando el parámetro antes=
 */
async function cargarMensajesAnteriores() {
  if (!conversacionActiva || mensajes.length === 0 || cargandoMasAnteriores) return;
  cargandoMasAnteriores = true;

  const primerMensajeFecha = mensajes[0].fecha;
  try {
    const anteriores = await api.llamar(
      "GET",
      `/api/mensajes/${conversacionActiva.id}?antes=${encodeURIComponent(primerMensajeFecha)}`
    );

    if (anteriores.length === 0) {
      document.getElementById("btn-cargar-anteriores").style.display = "none";
      ui.aviso("No hay más mensajes anteriores", "info");
    } else {
      mensajes = [...anteriores, ...mensajes];
      renderizarMensajesEnFlujo(true);
    }
  } catch (err) {
    ui.aviso(`Error al cargar anteriores: ${err.message}`, "error");
  } finally {
    cargandoMasAnteriores = false;
  }
}

/**
 * Envía el mensaje escrito por el usuario
 */
async function enviarMensajeActual() {
  const input = document.getElementById("input-mensaje-texto");
  const btnEnviar = document.getElementById("btn-enviar-mensaje");
  if (!input || !conversacionActiva) return;

  const texto = input.value.trim();
  if (!texto) return;

  input.disabled = true;
  if (btnEnviar) btnEnviar.disabled = true;

  try {
    const nuevoMsg = await api.llamar("POST", `/api/mensajes/${conversacionActiva.id}`, { texto });
    mensajes.push(nuevoMsg);
    renderizarMensajesEnFlujo(false);
    desplazarAlFinal();

    input.value = "";
    input.style.height = "auto";
    document.getElementById("contador-caracteres").textContent = "0 / 2.000";

    // Actualizar lista de conversaciones
    await cargarConversaciones(false);
  } catch (err) {
    ui.aviso(`Error al enviar mensaje: ${err.message}`, "error");
  } finally {
    input.disabled = false;
    if (btnEnviar) btnEnviar.disabled = false;
    input.focus();
  }
}

/**
 * Marca una conversación como leída
 */
async function marcarComoLeido(convId) {
  try {
    await api.llamar("POST", `/api/mensajes/${convId}/leido`);
    // Actualizar badge local
    if (conversacionActiva && conversacionActiva.id === convId) {
      conversacionActiva.noLeidos = 0;
    }
    const enLista = conversaciones.find((c) => c.id === convId);
    if (enLista) enLista.noLeidos = 0;
    renderizarListaConversaciones();
  } catch {}
}

/**
 * Requisito 2: Sondeo periódico (4s mensajes nuevos, 15s lista de conversaciones)
 */
function iniciarSondeoPeriodico() {
  if (timerMensajesNuevos) clearInterval(timerMensajesNuevos);
  if (timerListaConversaciones) clearInterval(timerListaConversaciones);

  // Cada 4 s pide solo los mensajes nuevos (desde=) de la conversación abierta
  timerMensajesNuevos = setInterval(async () => {
    if (document.visibilityState !== "visible" || !conversacionActiva) return;

    try {
      let url = `/api/mensajes/${conversacionActiva.id}`;
      if (mensajes.length > 0) {
        const ultimaFecha = mensajes[mensajes.length - 1].fecha;
        url += `?desde=${encodeURIComponent(ultimaFecha)}`;
      }

      const nuevos = await api.llamar("GET", url);
      if (Array.isArray(nuevos) && nuevos.length > 0) {
        // Filtrar duplicados
        const idsExistentes = new Set(mensajes.map((m) => m.id));
        const paraAgregar = nuevos.filter((m) => !idsExistentes.has(m.id));

        if (paraAgregar.length > 0) {
          mensajes.push(...paraAgregar);
          renderizarMensajesEnFlujo(false);
          desplazarAlFinal();
          await marcarComoLeido(conversacionActiva.id);
        }
      }
    } catch {}
  }, 4000);

  // Cada 15 s actualiza la lista de conversaciones
  timerListaConversaciones = setInterval(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      await cargarConversaciones(false);
    } catch {}
  }, 15000);
}

/**
 * Modal para seleccionar contacto e iniciar nueva conversación
 */
async function abrirModalContactos() {
  ui.cargando(true);
  try {
    const contactos = await api.llamar("GET", "/api/mensajes/contactos");

    const contenedor = document.createElement("div");
    contenedor.style.display = "flex";
    contenedor.style.flexDirection = "column";
    contenedor.style.gap = "var(--espacio-m)";

    contenedor.innerHTML = `
      <input
        type="text"
        id="buscador-modal-contactos"
        class="input"
        placeholder="Buscar por nombre o correo..."
        autocomplete="off"
      />
      <div class="contactos-lista" id="lista-modal-contactos">
        ${
          contactos.length === 0
            ? `<p style="color: var(--texto-suave); text-align: center; padding: var(--espacio-m);">No tienes contactos disponibles para iniciar conversación.</p>`
            : contactos
                .map((c) => {
                  const inicial = (c.nombre || "U").charAt(0).toUpperCase();
                  const nombre = `${c.nombre} ${c.apellido || ""}`.trim();
                  return `
              <button type="button" class="contacto-item" data-id="${c.id}">
                <div class="conv-item__avatar" style="width: 38px; height: 38px; font-size: var(--tamano-s);">${ui.escapar(inicial)}</div>
                <div style="display: flex; flex-direction: column; min-width: 0;">
                  <strong style="font-size: var(--tamano-s); color: var(--primario);">${ui.escapar(nombre)}</strong>
                  <div class="fila" style="gap: var(--espacio-xs); align-items: center;">
                    <span class="insignia insignia--secundario" style="font-size: var(--tamano-xs); text-transform: capitalize;">${ui.escapar(c.rol)}</span>
                    <span style="font-size: var(--tamano-xs); color: var(--texto-suave);">${ui.escapar(c.correo)}</span>
                  </div>
                </div>
              </button>
            `;
                })
                .join("")
        }
      </div>
    `;

    // Filtro interactivo en el modal
    const inputBuscador = contenedor.querySelector("#buscador-modal-contactos");
    const listaModal = contenedor.querySelector("#lista-modal-contactos");

    inputBuscador?.addEventListener("input", (e) => {
      const q = (e.target.value || "").toLowerCase().trim();
      listaModal.querySelectorAll(".contacto-item").forEach((btn) => {
        const texto = btn.textContent.toLowerCase();
        btn.style.display = texto.includes(q) ? "flex" : "none";
      });
    });

    let contactoElegidoId = null;

    listaModal.querySelectorAll(".contacto-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        contactoElegidoId = btn.getAttribute("data-id");
        // Cerrar modal disparando click en botón de acción
        document.querySelector(".modal-pie button")?.click();
      });
    });

    ui.cargando(false);

    await ui.modal({
      titulo: "Iniciar Nueva Conversación",
      contenido: contenedor,
      acciones: [{ texto: "Cancelar", valor: null, clase: "btn--secundario" }]
    });

    if (contactoElegidoId) {
      ui.cargando(true);
      const resConv = await api.llamar("POST", "/api/mensajes/conversaciones", { con: contactoElegidoId });
      await cargarConversaciones(false);
      const creada = conversaciones.find((c) => c.id === resConv.id);
      if (creada) {
        abrirConversacion(creada);
      }
      ui.cargando(false);
    }
  } catch (err) {
    ui.cargando(false);
    ui.aviso(`Error al cargar contactos: ${err.message}`, "error");
  }
}

/**
 * Modal para opciones de usuario (bloquear o reportar)
 */
async function abrirModalOpcionesUsuario() {
  if (!conversacionActiva || !conversacionActiva.otroUsuario) return;

  const otro = conversacionActiva.otroUsuario;
  const nombre = `${otro.nombre} ${otro.apellido || ""}`.trim();

  const contenedor = document.createElement("div");
  contenedor.innerHTML = `
    <div class="pila pila--m">
      <p>Estás conversando con <strong>${ui.escapar(nombre)}</strong> (${ui.escapar(otro.rol)}).</p>
      <div class="pila pila--s">
        <button type="button" class="btn btn--peligro" id="btn-modal-bloquear">
          🚫 ${conversacionActiva.bloqueado ? "Desbloquear a este usuario" : "Bloquear a este usuario"}
        </button>
      </div>
    </div>
  `;

  let accionElegida = null;
  contenedor.querySelector("#btn-modal-bloquear").addEventListener("click", () => {
    accionElegida = "bloquear";
    document.querySelector(".modal-pie button")?.click();
  });

  await ui.modal({
    titulo: `Opciones: ${nombre}`,
    contenido: contenedor,
    acciones: [{ texto: "Cerrar", valor: null, clase: "btn--secundario" }]
  });

  if (accionElegida === "bloquear") {
    if (conversacionActiva.bloqueado) {
      await api.llamar("DELETE", `/api/mensajes/bloquear/${otro.id}`);
      ui.aviso("Usuario desbloqueado", "exito");
    } else {
      const confirmar = await ui.confirmar(
        `¿Deseas bloquear a ${nombre}? No podrán enviarse mensajes mutuamente.`
      );
      if (confirmar) {
        await api.llamar("POST", "/api/mensajes/bloquear", { usuarioId: otro.id });
        ui.aviso("Usuario bloqueado", "info");
      }
    }
    await cargarConversaciones(false);
    if (conversacionActiva) {
      const act = conversaciones.find((c) => c.id === conversacionActiva.id);
      if (act) abrirConversacion(act);
    }
  }
}

/**
 * Modal para reportar un mensaje específico
 */
async function abrirModalReportarMensaje(mensajeId) {
  if (!conversacionActiva) return;

  const contenedor = document.createElement("div");
  contenedor.innerHTML = `
    <div class="pila pila--m">
      <p style="font-size: var(--tamano-s); color: var(--texto-suave);">
        Indica el motivo por el cual consideras que este mensaje infringe las normas de la comunidad educativa:
      </p>
      <div class="campo">
        <label for="input-motivo-reporte">Motivo del reporte *</label>
        <textarea
          id="input-motivo-reporte"
          class="chat-input"
          style="min-height: 80px;"
          placeholder="Describe por qué reportas este mensaje..."
          required
        ></textarea>
      </div>
    </div>
  `;

  const respuesta = await ui.modal({
    titulo: "Reportar Mensaje a Moderación",
    contenido: contenedor,
    acciones: [
      { texto: "Cancelar", valor: "cancelar", clase: "btn--secundario" },
      { texto: "Enviar reporte", valor: "reportar", primario: true }
    ]
  });

  if (respuesta === "reportar") {
    const motivo = contenedor.querySelector("#input-motivo-reporte")?.value?.trim();
    if (!motivo) {
      ui.aviso("Debes ingresar un motivo para el reporte", "error");
      return;
    }

    try {
      ui.cargando(true);
      await api.crear("reportes", {
        tipo: "mensaje",
        referenciaId: `${conversacionActiva.id}/${mensajeId}`,
        motivo
      });
      ui.aviso("El reporte ha sido enviado al equipo de administración para su revisión", "exito");
    } catch (err) {
      ui.aviso(`Error al enviar reporte: ${err.message}`, "error");
    } finally {
      ui.cargando(false);
    }
  }
}

inicializar();
