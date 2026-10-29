// publico/js/modulos/editor-contenidos.js · Editor de unidades didácticas y temas para docentes y admin

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Editor de Contenidos", roles: ["docente", "admin"] });

const contenido = document.getElementById("contenido");

let asignaturas = [];
let asignaturaIdActual = null;
let unidades = [];
let unidadIdActual = null;
let temas = [];

async function inicializar() {
  try {
    ui.cargando(true);
    asignaturas = await api.listar("asignaturas");

    if (asignaturas.length > 0) {
      asignaturaIdActual = asignaturas[0].id;
      await recargarDatos();
    } else {
      renderizarSinAsignaturas();
    }
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar contenidos:</strong> ${ui.escapar(error.message)}</div>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

async function recargarDatos() {
  if (!asignaturaIdActual) return;
  try {
    ui.cargando(true);
    const [listaUnidades, listaTemas] = await Promise.all([
      api.listar("unidades"),
      api.listar("temas")
    ]);
    unidades = listaUnidades;
    temas = listaTemas;

    // Verificar si la unidad seleccionada aún pertenece a la asignatura
    const unidadesAsignatura = obtenerUnidadesAsignatura();
    if (!unidadesAsignatura.some((u) => u.id === unidadIdActual)) {
      unidadIdActual = unidadesAsignatura.length > 0 ? unidadesAsignatura[0].id : null;
    }

    renderizarInterfaz();
  } catch (error) {
    ui.aviso(error.message || "Error al recargar unidades y temas", "error");
  } finally {
    ui.cargando(false);
  }
}

function obtenerUnidadesAsignatura() {
  return unidades
    .filter((u) => u.asignaturaId === asignaturaIdActual)
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
}

function obtenerTemasUnidad() {
  if (!unidadIdActual) return [];
  return temas
    .filter((t) => t.unidadId === unidadIdActual)
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
}

function renderizarSinAsignaturas() {
  contenido.innerHTML = `
    <div class="editor-contenidos-layout pila">
      <header class="pila pila--xs">
        <h1>Editor de Contenidos</h1>
        <p style="color: var(--texto-suave);">Estructuración de unidades y temas de aprendizaje.</p>
      </header>
      <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
        <p>No tienes asignaturas vinculadas para editar contenidos.</p>
      </div>
    </div>
  `;
}

function renderizarInterfaz() {
  const unidadesAsig = obtenerUnidadesAsignatura();
  const unidadActual = unidades.find((u) => u.id === unidadIdActual);
  const temasUnidad = obtenerTemasUnidad();

  contenido.innerHTML = `
    <div class="editor-contenidos-layout pila">
      <header class="pila pila--xs">
        <h1>Editor de Contenidos</h1>
        <p style="color: var(--texto-suave);">Organiza las unidades didácticas y publica los temas correspondientes.</p>
      </header>

      <section class="editor-selector-bloque fila" style="justify-content: space-between; align-items: center; flex-wrap: wrap;">
        <div class="campo" style="margin: 0; min-width: 280px; flex: 1;">
          <label for="selectAsignatura"><strong>Asignatura en edición</strong></label>
          <select id="selectAsignatura">
            ${asignaturas
              .map(
                (a) => `
              <option value="${ui.escapar(a.id)}" ${a.id === asignaturaIdActual ? "selected" : ""}>
                ${ui.escapar(a.nombre)} (${ui.escapar(a.nivel || "PREGRADO")})
              </option>
            `
              )
              .join("")}
          </select>
        </div>
      </section>

      <div class="editor-columnas">
        <!-- Columna 1: Unidades -->
        <section class="editor-panel">
          <header class="editor-panel__cabecera">
            <h2 class="editor-panel__titulo">Unidades (${unidadesAsig.length})</h2>
            <button type="button" class="btn btn--primario btn--pequeno" id="btnNuevaUnidad">
              + Nueva Unidad
            </button>
          </header>

          <div class="lista-unidades" id="listaUnidades">
            ${
              unidadesAsig.length === 0
                ? `<p style="color: var(--texto-suave); font-size: var(--tamano-s); text-align: center; padding: var(--espacio-m);">No hay unidades en esta asignatura.</p>`
                : unidadesAsig
                    .map((u, idx) => {
                      const esActiva = u.id === unidadIdActual;
                      const esVisible = u.visible !== false;
                      const esPrimera = idx === 0;
                      const esUltima = idx === unidadesAsig.length - 1;

                      return `
                <article class="unidad-item ${esActiva ? "unidad-item--activa" : ""} ${!esVisible ? "estado-indicador--oculto" : ""}" data-id="${ui.escapar(u.id)}">
                  <div class="unidad-item__fila">
                    <span class="insignia insignia--secundario" style="font-size: var(--tamano-xs);">#${u.orden || idx + 1}</span>
                    <span class="unidad-item__titulo" data-accion="seleccionar" title="Seleccionar para ver temas">${ui.escapar(u.titulo)}</span>
                    <span class="insignia ${esVisible ? "insignia--exito" : "insignia--advertencia"}">
                      ${esVisible ? "Visible" : "Oculta"}
                    </span>
                  </div>

                  <div class="unidad-item__fila" style="justify-content: flex-end;">
                    <div class="item-acciones">
                      <button type="button" class="btn-icono" data-accion="subir-unidad" data-id="${ui.escapar(u.id)}" ${esPrimera ? "disabled" : ""} title="Subir orden">▲</button>
                      <button type="button" class="btn-icono" data-accion="bajar-unidad" data-id="${ui.escapar(u.id)}" ${esUltima ? "disabled" : ""} title="Bajar orden">▼</button>
                      <button type="button" class="btn-icono" data-accion="renombrar-unidad" data-id="${ui.escapar(u.id)}" title="Renombrar unidad">✏️</button>
                      <button type="button" class="btn-icono" data-accion="toggle-visibilidad-unidad" data-id="${ui.escapar(u.id)}" title="${esVisible ? "Ocultar a estudiantes" : "Mostrar a estudiantes"}">
                        ${esVisible ? "👁️" : "🙈"}
                      </button>
                    </div>
                  </div>
                </article>
              `;
                    })
                    .join("")
            }
          </div>
        </section>

        <!-- Columna 2: Temas de la unidad -->
        <section class="editor-panel">
          <header class="editor-panel__cabecera">
            <div>
              <h2 class="editor-panel__titulo">
                ${unidadActual ? `Temas: ${ui.escapar(unidadActual.titulo)}` : "Temas"}
              </h2>
              ${unidadActual ? `<small style="color: var(--texto-suave);">${temasUnidad.length} tema(s) registrado(s)</small>` : ""}
            </div>
            ${
              unidadActual
                ? `<button type="button" class="btn btn--primario btn--pequeno" id="btnNuevoTema">+ Nuevo Tema</button>`
                : ""
            }
          </header>

          <div class="lista-temas" id="listaTemas">
            ${
              !unidadActual
                ? `<p style="color: var(--texto-suave); text-align: center; padding: var(--espacio-l);">Selecciona o crea una unidad para gestionar sus temas.</p>`
                : temasUnidad.length === 0
                ? `<p style="color: var(--texto-suave); text-align: center; padding: var(--espacio-m);">No hay temas registrados en esta unidad.</p>`
                : temasUnidad
                    .map((t, idx) => {
                      const esPublicado = t.estado === "publicado";
                      const esPrimero = idx === 0;
                      const esUltimo = idx === temasUnidad.length - 1;

                      return `
                <article class="tema-item" data-id="${ui.escapar(t.id)}">
                  <div class="tema-item__fila">
                    <span class="insignia insignia--secundario" style="font-size: var(--tamano-xs);">Tema ${t.orden || idx + 1}</span>
                    <strong class="tema-item__titulo">${ui.escapar(t.titulo)}</strong>
                    <span class="insignia ${esPublicado ? "insignia--exito" : "insignia--advertencia"}">
                      ${esPublicado ? "Publicado" : "Borrador"}
                    </span>
                  </div>

                  <div class="tema-item__fila" style="justify-content: space-between; border-top: 1px solid var(--borde); padding-top: var(--espacio-xs);">
                    <div class="item-acciones">
                      <button type="button" class="btn-icono" data-accion="subir-tema" data-id="${ui.escapar(t.id)}" ${esPrimero ? "disabled" : ""} title="Subir orden">▲</button>
                      <button type="button" class="btn-icono" data-accion="bajar-tema" data-id="${ui.escapar(t.id)}" ${esUltimo ? "disabled" : ""} title="Bajar orden">▼</button>
                      <button type="button" class="btn btn--pequeno ${esPublicado ? "btn--secundario" : "btn--acento"}" data-accion="toggle-estado-tema" data-id="${ui.escapar(t.id)}">
                        ${esPublicado ? "Pasar a Borrador" : "Publicar"}
                      </button>
                    </div>

                    <a href="/paginas/editor-tema.html?id=${encodeURIComponent(t.id)}" class="btn btn--secundario btn--pequeno" style="text-decoration: none;">
                      Editar ficha ↗
                    </a>
                  </div>
                </article>
              `;
                    })
                    .join("")
            }
          </div>
        </section>
      </div>
    </div>
  `;

  // Eventos de selección de asignatura
  document.getElementById("selectAsignatura")?.addEventListener("change", async (e) => {
    asignaturaIdActual = e.target.value;
    await recargarDatos();
  });

  // Evento agregar unidad
  document.getElementById("btnNuevaUnidad")?.addEventListener("click", async () => {
    const titulo = await pedirTextoModal({
      titulo: "Nueva Unidad Didáctica",
      etiqueta: "Título de la unidad",
      textoBoton: "Crear Unidad"
    });
    if (!titulo) return;

    try {
      ui.cargando(true);
      const unidadesAsigActual = obtenerUnidadesAsignatura();
      const maxOrden = unidadesAsigActual.reduce((max, u) => Math.max(max, Number(u.orden) || 0), 0);
      const nueva = await api.crear("unidades", {
        asignaturaId: asignaturaIdActual,
        titulo,
        orden: maxOrden + 1,
        visible: true
      });
      unidadIdActual = nueva.id;
      ui.aviso("Unidad creada con éxito.", "exito");
      await recargarDatos();
    } catch (err) {
      ui.aviso(err.message || "Error al crear la unidad", "error");
    } finally {
      ui.cargando(false);
    }
  });

  // Eventos en lista de unidades
  document.getElementById("listaUnidades")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-accion]");
    if (!btn) return;
    const accion = btn.dataset.accion;
    const itemEl = btn.closest(".unidad-item");
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    const unidad = unidades.find((u) => u.id === id);
    if (!unidad) return;

    if (accion === "seleccionar") {
      unidadIdActual = id;
      renderizarInterfaz();
      return;
    }

    if (accion === "renombrar-unidad") {
      const nuevoTitulo = await pedirTextoModal({
        titulo: "Renombrar Unidad",
        etiqueta: "Nuevo título",
        valorInicial: unidad.titulo,
        textoBoton: "Guardar"
      });
      if (!nuevoTitulo || nuevoTitulo === unidad.titulo) return;

      try {
        ui.cargando(true);
        await api.actualizar("unidades", unidad.id, { titulo: nuevoTitulo });
        unidad.titulo = nuevoTitulo;
        ui.aviso("Unidad renombrada.", "exito");
        renderizarInterfaz();
      } catch (err) {
        ui.aviso(err.message || "Error al renombrar", "error");
      } finally {
        ui.cargando(false);
      }
      return;
    }

    if (accion === "toggle-visibilidad-unidad") {
      try {
        ui.cargando(true);
        const nuevaVisibilidad = !(unidad.visible !== false);
        await api.actualizar("unidades", unidad.id, { visible: nuevaVisibilidad });
        unidad.visible = nuevaVisibilidad;
        ui.aviso(nuevaVisibilidad ? "Unidad visible para estudiantes." : "Unidad oculta.", "info");
        renderizarInterfaz();
      } catch (err) {
        ui.aviso(err.message || "Error al cambiar visibilidad", "error");
      } finally {
        ui.cargando(false);
      }
      return;
    }

    if (accion === "subir-unidad" || accion === "bajar-unidad") {
      const lista = obtenerUnidadesAsignatura();
      const idx = lista.findIndex((u) => u.id === id);
      const destinoIdx = accion === "subir-unidad" ? idx - 1 : idx + 1;
      if (destinoIdx < 0 || destinoIdx >= lista.length) return;

      const uActual = lista[idx];
      const uDestino = lista[destinoIdx];

      try {
        ui.cargando(true);
        const ordenTemp = uActual.orden || idx + 1;
        const ordenNuevo = uDestino.orden || destinoIdx + 1;

        await Promise.all([
          api.actualizar("unidades", uActual.id, { orden: ordenNuevo }),
          api.actualizar("unidades", uDestino.id, { orden: ordenTemp })
        ]);

        uActual.orden = ordenNuevo;
        uDestino.orden = ordenTemp;
        ui.aviso("Orden de unidades actualizado.", "exito");
        renderizarInterfaz();
      } catch (err) {
        ui.aviso(err.message || "Error al reordenar unidades", "error");
      } finally {
        ui.cargando(false);
      }
      return;
    }
  });

  // Evento agregar tema
  document.getElementById("btnNuevoTema")?.addEventListener("click", async () => {
    if (!unidadIdActual) return;
    const titulo = await pedirTextoModal({
      titulo: "Nuevo Tema",
      etiqueta: "Título del tema",
      textoBoton: "Crear Tema (Borrador)"
    });
    if (!titulo) return;

    try {
      ui.cargando(true);
      const temasUnidadActual = obtenerTemasUnidad();
      const maxOrden = temasUnidadActual.reduce((max, t) => Math.max(max, Number(t.orden) || 0), 0);

      await api.crear("temas", {
        unidadId: unidadIdActual,
        titulo,
        orden: maxOrden + 1,
        estado: "borrador"
      });
      ui.aviso("Tema creado como borrador.", "exito");
      await recargarDatos();
    } catch (err) {
      ui.aviso(err.message || "Error al crear el tema", "error");
    } finally {
      ui.cargando(false);
    }
  });

  // Eventos en lista de temas
  document.getElementById("listaTemas")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-accion]");
    if (!btn) return;
    const accion = btn.dataset.accion;
    const itemEl = btn.closest(".tema-item");
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    const tema = temas.find((t) => t.id === id);
    if (!tema) return;

    if (accion === "toggle-estado-tema") {
      const nuevoEstado = tema.estado === "publicado" ? "borrador" : "publicado";
      try {
        ui.cargando(true);
        await api.actualizar("temas", tema.id, { estado: nuevoEstado });
        tema.estado = nuevoEstado;
        ui.aviso(`Tema marcado como ${nuevoEstado}.`, "exito");
        renderizarInterfaz();
      } catch (err) {
        ui.aviso(err.message || "Error al actualizar estado del tema", "error");
      } finally {
        ui.cargando(false);
      }
      return;
    }

    if (accion === "subir-tema" || accion === "bajar-tema") {
      const lista = obtenerTemasUnidad();
      const idx = lista.findIndex((t) => t.id === id);
      const destinoIdx = accion === "subir-tema" ? idx - 1 : idx + 1;
      if (destinoIdx < 0 || destinoIdx >= lista.length) return;

      const tActual = lista[idx];
      const tDestino = lista[destinoIdx];

      try {
        ui.cargando(true);
        const ordenTemp = tActual.orden || idx + 1;
        const ordenNuevo = tDestino.orden || destinoIdx + 1;

        await Promise.all([
          api.actualizar("temas", tActual.id, { orden: ordenNuevo }),
          api.actualizar("temas", tDestino.id, { orden: ordenTemp })
        ]);

        tActual.orden = ordenNuevo;
        tDestino.orden = ordenTemp;
        ui.aviso("Orden de temas actualizado.", "exito");
        renderizarInterfaz();
      } catch (err) {
        ui.aviso(err.message || "Error al reordenar temas", "error");
      } finally {
        ui.cargando(false);
      }
      return;
    }
  });
}

async function pedirTextoModal({ titulo, etiqueta, valorInicial = "", textoBoton = "Aceptar" }) {
  const form = document.createElement("form");
  form.className = "modal-form-asignatura";
  form.innerHTML = `
    <div class="campo">
      <label for="inputModalTexto">${ui.escapar(etiqueta)} *</label>
      <input type="text" id="inputModalTexto" value="${ui.escapar(valorInicial)}" required />
    </div>
    <div class="fila" style="justify-content: flex-end; gap: var(--espacio-s); margin-top: var(--espacio-s);">
      <button type="button" class="btn btn--secundario" id="btnModalCancelar">Cancelar</button>
      <button type="submit" class="btn btn--primario">${ui.escapar(textoBoton)}</button>
    </div>
  `;

  return new Promise(async (resolve) => {
    let resuelto = false;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = form.querySelector("#inputModalTexto").value.trim();
      if (!val) return;
      resuelto = true;
      cerrarDialogo();
      resolve(val);
    });

    form.querySelector("#btnModalCancelar").addEventListener("click", () => {
      cerrarDialogo();
      resolve(null);
    });

    function cerrarDialogo() {
      const telon = form.closest(".modal-telon");
      if (telon) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      }
    }

    await ui.modal({ titulo, contenido: form, acciones: [] });
    if (!resuelto) resolve(null);
  });
}

inicializar();
