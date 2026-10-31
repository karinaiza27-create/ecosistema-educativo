// publico/js/modulos/admin-asignaturas.js · Gestión de asignaturas para administradores

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Asignaturas", roles: ["admin"] });

const contenido = document.getElementById("contenido");

let asignaturas = [];
let distributivo = [];

async function cargarDatos() {
  try {
    ui.cargando(true);
    const [listaAsig, listaDist] = await Promise.all([
      api.listar("asignaturas"),
      api.listar("distributivo")
    ]);
    asignaturas = listaAsig;
    distributivo = listaDist;
    renderizar();
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar asignaturas:</strong> ${ui.escapar(error.message)}</div>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

function contarGrupos(asignaturaId) {
  return distributivo.filter((g) => g.asignaturaId === asignaturaId).length;
}

function renderizar() {
  contenido.innerHTML = `
    <div class="asignaturas-layout pila">
      <header class="asignaturas-cabecera">
        <div class="pila pila--xs">
          <h1>Asignaturas</h1>
          <p style="color: var(--texto-suave);">Administra las asignaturas académicas y sus niveles de estudio.</p>
        </div>
        <button type="button" class="btn btn--primario" id="btnNuevaAsignatura">
          + Nueva Asignatura
        </button>
      </header>

      ${
        asignaturas.length === 0
          ? `
        <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
          <p>No existen asignaturas registradas actualmente.</p>
          <button type="button" class="btn btn--secundario" id="btnPrimerAsignatura" style="margin-top: var(--espacio-m);">
            Registrar primera asignatura
          </button>
        </div>
      `
          : `
        <div class="grid-auto">
          ${asignaturas
            .map((asig) => {
              const numGrupos = contarGrupos(asig.id);
              return `
            <article class="tarjeta tarjeta-asignatura">
              <header class="tarjeta-asignatura__cabecera">
                <h2 class="tarjeta-asignatura__titulo">${ui.escapar(asig.nombre)}</h2>
                <span class="insignia insignia--acento">${ui.escapar(asig.nivel || "PREGRADO")}</span>
              </header>

              <p class="tarjeta-asignatura__desc">
                ${ui.escapar(asig.descripcion || "Sin descripción.")}
              </p>

              <div class="tarjeta-asignatura__meta">
                <span>${numGrupos === 1 ? "1 grupo asignado" : `${numGrupos} grupos asignados`}</span>
                <div class="tarjeta-asignatura__acciones">
                  <button type="button" class="btn btn--secundario btn--pequeno btn-editar" data-id="${ui.escapar(asig.id)}">
                    Editar
                  </button>
                  <button type="button" class="btn btn--peligro btn--pequeno btn-eliminar" data-id="${ui.escapar(asig.id)}">
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          `;
            })
            .join("")}
        </div>
      `
      }
    </div>
  `;

  document.getElementById("btnNuevaAsignatura")?.addEventListener("click", () => abrirModalFormulario());
  document.getElementById("btnPrimerAsignatura")?.addEventListener("click", () => abrirModalFormulario());

  contenido.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const asig = asignaturas.find((a) => a.id === id);
      if (asig) abrirModalFormulario(asig);
    });
  });

  contenido.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const asig = asignaturas.find((a) => a.id === id);
      if (!asig) return;

      const numGrupos = contarGrupos(asig.id);
      if (numGrupos > 0) {
        ui.aviso(
          `No se puede eliminar la asignatura porque tiene ${numGrupos} grupo(s) asignado(s) en el distributivo.`,
          "advertencia"
        );
        return;
      }

      const confirmado = await ui.confirmar(
        `¿Estás seguro de eliminar la asignatura "${asig.nombre}"? Esta acción no se puede deshacer.`
      );
      if (!confirmado) return;

      try {
        ui.cargando(true);
        await api.eliminar("asignaturas", asig.id);
        ui.aviso("Asignatura eliminada con éxito.", "exito");
        await cargarDatos();
      } catch (err) {
        ui.aviso(err.message || "Error al eliminar la asignatura", "error");
      } finally {
        ui.cargando(false);
      }
    });
  });
}

async function abrirModalFormulario(asig = null) {
  const esEdicion = Boolean(asig);
  const formElement = document.createElement("form");
  formElement.className = "modal-form-asignatura";
  formElement.noValidate = true;

  formElement.innerHTML = `
    <div class="campo" id="grupoNom">
      <label for="asigNombre">Nombre de la asignatura *</label>
      <input type="text" id="asigNombre" value="${ui.escapar(asig ? asig.nombre : "")}" required />
      <span class="campo__error oculto" id="errNom">El nombre de la asignatura es obligatorio.</span>
    </div>

    <div class="campo">
      <label for="asigNivel">Nivel de formación *</label>
      <select id="asigNivel">
        <option value="PREGRADO" ${asig?.nivel === "PREGRADO" ? "selected" : ""}>Pregrado</option>
        <option value="POSTGRADO" ${asig?.nivel === "POSTGRADO" ? "selected" : ""}>Postgrado</option>
        <option value="EDUCACIÓN CONTINUA" ${asig?.nivel === "EDUCACIÓN CONTINUA" ? "selected" : ""}>Educación Continua</option>
      </select>
    </div>

    <div class="campo">
      <label for="asigDesc">Descripción</label>
      <textarea id="asigDesc" rows="3" placeholder="Breve resumen de los contenidos y objetivos...">${ui.escapar(asig ? asig.descripcion || "" : "")}</textarea>
    </div>

    <div class="fila" style="justify-content: flex-end; gap: var(--espacio-s); margin-top: var(--espacio-s);">
      <button type="button" class="btn btn--secundario" id="btnModalCancelar">Cancelar</button>
      <button type="submit" class="btn btn--primario" id="btnModalGuardar">
        ${esEdicion ? "Guardar Cambios" : "Crear Asignatura"}
      </button>
    </div>
  `;

  let cerrarDialogo = null;

  formElement.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputNombre = formElement.querySelector("#asigNombre");
    const selectNivel = formElement.querySelector("#asigNivel");
    const textareaDesc = formElement.querySelector("#asigDesc");

    const nombre = inputNombre.value.trim();
    const nivel = selectNivel.value;
    const descripcion = textareaDesc.value.trim();

    const grupoNom = formElement.querySelector("#grupoNom");
    const errNom = formElement.querySelector("#errNom");

    const esValido = nombre.length > 0;
    grupoNom.classList.toggle("campo--error", !esValido);
    errNom.classList.toggle("oculto", esValido);

    if (!esValido) {
      inputNombre.focus();
      return;
    }

    const btnSubmit = formElement.querySelector("#btnModalGuardar");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Guardando...";

    try {
      if (esEdicion) {
        await api.actualizar("asignaturas", asig.id, { nombre, nivel, descripcion });
        ui.aviso("Asignatura actualizada con éxito.", "exito");
      } else {
        await api.crear("asignaturas", { nombre, nivel, descripcion });
        ui.aviso("Asignatura creada con éxito.", "exito");
      }
      if (typeof cerrarDialogo === "function") {
        cerrarDialogo();
      }
      await cargarDatos();
    } catch (err) {
      ui.aviso(err.message || "Error al guardar la asignatura", "error");
      btnSubmit.disabled = false;
      btnSubmit.textContent = esEdicion ? "Guardar Cambios" : "Crear Asignatura";
    }
  });

  const modalPromesa = ui.modal({
    titulo: esEdicion ? "Editar Asignatura" : "Nueva Asignatura",
    contenido: formElement,
    acciones: []
  });

  // El botón cancelar cierra el modal
  formElement.querySelector("#btnModalCancelar").addEventListener("click", () => {
    const telon = formElement.closest(".modal-telon");
    if (telon) {
      const botonEscape = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(botonEscape);
    }
  });

  cerrarDialogo = () => {
    const telon = formElement.closest(".modal-telon");
    if (telon) {
      const botonEscape = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(botonEscape);
    }
  };

  await modalPromesa;
}

cargarDatos();
