// publico/js/modulos/distributivo.js · Gestión de distributivo académico para administradores

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Distributivo", roles: ["admin"] });

const contenido = document.getElementById("contenido");

let distributivo = [];
let asignaturas = [];
let usuarios = [];

async function cargarDatos() {
  try {
    ui.cargando(true);
    const [listaDist, listaAsig, listaUsu] = await Promise.all([
      api.listar("distributivo"),
      api.listar("asignaturas"),
      api.listar("usuarios")
    ]);
    distributivo = listaDist;
    asignaturas = listaAsig;
    usuarios = listaUsu;
    renderizar();
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar distributivo:</strong> ${ui.escapar(error.message)}</div>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

function obtenerNombreAsignatura(asignaturaId) {
  const asig = asignaturas.find((a) => a.id === asignaturaId);
  return asig ? asig.nombre : "(Asignatura no encontrada)";
}

function obtenerNombreDocente(docenteId) {
  const doc = usuarios.find((u) => u.id === docenteId);
  return doc ? `${doc.nombre} ${doc.apellido}` : "(Sin docente asignado)";
}

function renderizar() {
  contenido.innerHTML = `
    <div class="distributivo-layout pila">
      <header class="distributivo-cabecera">
        <div class="pila pila--xs">
          <h1>Distributivo Académico</h1>
          <p style="color: var(--texto-suave);">Asigna docentes, períodos y listas de estudiantes a cada paralelo.</p>
        </div>
        <button type="button" class="btn btn--primario" id="btnNuevoGrupo">
          + Nuevo Grupo
        </button>
      </header>

      ${
        distributivo.length === 0
          ? `
        <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
          <p>No existen grupos asignados en el distributivo.</p>
          <button type="button" class="btn btn--secundario" id="btnPrimerGrupo" style="margin-top: var(--espacio-m);">
            Registrar primer grupo
          </button>
        </div>
      `
          : `
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Asignatura</th>
                <th scope="col">Paralelo</th>
                <th scope="col">Período</th>
                <th scope="col">Docente</th>
                <th scope="col" style="text-align: center;">Estudiantes</th>
                <th scope="col" style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${distributivo
                .map((g) => {
                  const numEstudiantes = Array.isArray(g.estudiantes) ? g.estudiantes.length : 0;
                  return `
                <tr data-id="${ui.escapar(g.id)}">
                  <td><strong>${ui.escapar(obtenerNombreAsignatura(g.asignaturaId))}</strong></td>
                  <td>${ui.escapar(g.paralelo || "-")}</td>
                  <td>${ui.escapar(g.periodo || "-")}</td>
                  <td>${ui.escapar(obtenerNombreDocente(g.docenteId))}</td>
                  <td style="text-align: center;">
                    <span class="insignia insignia--primario">${numEstudiantes}</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="fila" style="justify-content: flex-end; gap: var(--espacio-xs);">
                      <button type="button" class="btn btn--secundario btn--pequeno btn-editar" data-id="${ui.escapar(g.id)}">
                        Editar
                      </button>
                      <button type="button" class="btn btn--peligro btn--pequeno btn-eliminar" data-id="${ui.escapar(g.id)}">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `
      }
    </div>
  `;

  document.getElementById("btnNuevoGrupo")?.addEventListener("click", () => abrirModalFormulario());
  document.getElementById("btnPrimerGrupo")?.addEventListener("click", () => abrirModalFormulario());

  contenido.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const grupo = distributivo.find((g) => g.id === id);
      if (grupo) abrirModalFormulario(grupo);
    });
  });

  contenido.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const grupo = distributivo.find((g) => g.id === id);
      if (!grupo) return;

      const nombreAsig = obtenerNombreAsignatura(grupo.asignaturaId);
      const confirmado = await ui.confirmar(
        `¿Estás seguro de eliminar el grupo "${nombreAsig} - Paralelo ${grupo.paralelo}"?`
      );
      if (!confirmado) return;

      try {
        ui.cargando(true);
        await api.eliminar("distributivo", grupo.id);
        ui.aviso("Grupo eliminado con éxito.", "exito");
        await cargarDatos();
      } catch (err) {
        ui.aviso(err.message || "Error al eliminar grupo", "error");
      } finally {
        ui.cargando(false);
      }
    });
  });
}

async function abrirModalFormulario(grupo = null) {
  const esEdicion = Boolean(grupo);
  const docentes = usuarios.filter((u) => u.rol === "docente");
  const todosEstudiantes = usuarios.filter((u) => u.rol === "estudiante");

  let seleccionados = new Set(
    esEdicion && Array.isArray(grupo.estudiantes) ? grupo.estudiantes : []
  );

  const formElement = document.createElement("form");
  formElement.className = "modal-form-distributivo";
  formElement.noValidate = true;

  formElement.innerHTML = `
    <div class="campo" id="grupoAsig">
      <label for="distAsignatura">Asignatura *</label>
      <select id="distAsignatura" required>
        <option value="">-- Selecciona una asignatura --</option>
        ${asignaturas
          .map(
            (a) => `
          <option value="${ui.escapar(a.id)}" ${grupo?.asignaturaId === a.id ? "selected" : ""}>
            ${ui.escapar(a.nombre)} (${ui.escapar(a.nivel || "PREGRADO")})
          </option>
        `
          )
          .join("")}
      </select>
      <span class="campo__error oculto" id="errAsig">Debes seleccionar una asignatura.</span>
    </div>

    <div class="grid-auto">
      <div class="campo" id="grupoPar">
        <label for="distParalelo">Paralelo *</label>
        <input type="text" id="distParalelo" placeholder="Ej. A" value="${ui.escapar(grupo ? grupo.paralelo || "" : "")}" required />
        <span class="campo__error oculto" id="errPar">El paralelo es obligatorio.</span>
      </div>

      <div class="campo" id="grupoPer">
        <label for="distPeriodo">Período lectivo *</label>
        <input type="text" id="distPeriodo" placeholder="Ej. 2026-2027" value="${ui.escapar(grupo ? grupo.periodo || "" : "")}" required />
        <span class="campo__error oculto" id="errPer">El período es obligatorio.</span>
      </div>
    </div>

    <div class="campo" id="grupoDoc">
      <label for="distDocente">Docente a cargo *</label>
      <select id="distDocente" required>
        <option value="">-- Selecciona un docente --</option>
        ${docentes
          .map(
            (d) => `
          <option value="${ui.escapar(d.id)}" ${grupo?.docenteId === d.id ? "selected" : ""}>
            ${ui.escapar(d.nombre)} ${ui.escapar(d.apellido)} (${ui.escapar(d.correo)})
          </option>
        `
          )
          .join("")}
      </select>
      <span class="campo__error oculto" id="errDoc">Debes asignar un docente al grupo.</span>
    </div>

    <div class="campo">
      <label>Estudiantes matriculados</label>
      <div class="distributivo-estudiantes-bloque">
        <input type="search" id="buscarEstudiantes" placeholder="Filtrar estudiantes por nombre o correo..." />
        <div class="distributivo-estudiantes-lista" id="listaEstudiantesCheckboxes">
        </div>
        <span class="distributivo-contador-estudiantes" id="contadorSeleccionados">
          Seleccionados: ${seleccionados.size} estudiantes
        </span>
      </div>
    </div>

    <div class="fila" style="justify-content: flex-end; gap: var(--espacio-s); margin-top: var(--espacio-s);">
      <button type="button" class="btn btn--secundario" id="btnModalCancelar">Cancelar</button>
      <button type="submit" class="btn btn--primario" id="btnModalGuardar">
        ${esEdicion ? "Guardar Cambios" : "Crear Grupo"}
      </button>
    </div>
  `;

  const inputBuscarEst = formElement.querySelector("#buscarEstudiantes");
  const contenedorLista = formElement.querySelector("#listaEstudiantesCheckboxes");
  const contadorEl = formElement.querySelector("#contadorSeleccionados");

  function actualizarListaEstudiantes(filtro = "") {
    const term = filtro.toLowerCase().trim();
    const filtrados = todosEstudiantes.filter((e) => {
      if (!term) return true;
      const nom = `${e.nombre || ""} ${e.apellido || ""}`.toLowerCase();
      const cor = (e.correo || "").toLowerCase();
      return nom.includes(term) || cor.includes(term);
    });

    if (filtrados.length === 0) {
      contenedorLista.innerHTML = `<span style="padding: var(--espacio-s); color: var(--texto-suave); font-size: var(--tamano-s);">No se encontraron estudiantes.</span>`;
      return;
    }

    contenedorLista.innerHTML = filtrados
      .map((est) => {
        const checkeado = seleccionados.has(est.id) ? "checked" : "";
        return `
        <label class="estudiante-item">
          <input type="checkbox" value="${ui.escapar(est.id)}" ${checkeado} class="chk-estudiante" />
          <div class="pila pila--none">
            <span class="estudiante-item__nombre">${ui.escapar(est.nombre)} ${ui.escapar(est.apellido)}</span>
            <span class="estudiante-item__correo">${ui.escapar(est.correo)}</span>
          </div>
        </label>
      `;
      })
      .join("");

    contenedorLista.querySelectorAll(".chk-estudiante").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          seleccionados.add(id);
        } else {
          seleccionados.delete(id);
        }
        contadorEl.textContent = `Seleccionados: ${seleccionados.size} estudiantes`;
      });
    });
  }

  inputBuscarEst.addEventListener("input", (e) => {
    actualizarListaEstudiantes(e.target.value);
  });

  actualizarListaEstudiantes();

  let cerrarDialogo = null;

  formElement.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectAsig = formElement.querySelector("#distAsignatura");
    const inputPar = formElement.querySelector("#distParalelo");
    const inputPer = formElement.querySelector("#distPeriodo");
    const selectDoc = formElement.querySelector("#distDocente");

    const asignaturaId = selectAsig.value;
    const paralelo = inputPar.value.trim();
    const periodo = inputPer.value.trim();
    const docenteId = selectDoc.value;
    const estudiantes = Array.from(seleccionados);

    const okAsig = asignaturaId.length > 0;
    const okPar = paralelo.length > 0;
    const okPer = periodo.length > 0;
    const okDoc = docenteId.length > 0;

    formElement.querySelector("#grupoAsig").classList.toggle("campo--error", !okAsig);
    formElement.querySelector("#errAsig").classList.toggle("oculto", okAsig);

    formElement.querySelector("#grupoPar").classList.toggle("campo--error", !okPar);
    formElement.querySelector("#errPar").classList.toggle("oculto", okPar);

    formElement.querySelector("#grupoPer").classList.toggle("campo--error", !okPer);
    formElement.querySelector("#errPer").classList.toggle("oculto", okPer);

    formElement.querySelector("#grupoDoc").classList.toggle("campo--error", !okDoc);
    formElement.querySelector("#errDoc").classList.toggle("oculto", okDoc);

    if (!okAsig || !okPar || !okPer || !okDoc) {
      return;
    }

    const btnSubmit = formElement.querySelector("#btnModalGuardar");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Guardando...";

    try {
      if (esEdicion) {
        await api.actualizar("distributivo", grupo.id, {
          asignaturaId,
          paralelo,
          periodo,
          docenteId,
          estudiantes
        });
        ui.aviso("Grupo actualizado con éxito.", "exito");
      } else {
        await api.crear("distributivo", {
          asignaturaId,
          paralelo,
          periodo,
          docenteId,
          estudiantes
        });
        ui.aviso("Grupo creado con éxito.", "exito");
      }
      if (typeof cerrarDialogo === "function") {
        cerrarDialogo();
      }
      await cargarDatos();
    } catch (err) {
      ui.aviso(err.message || "Error al guardar grupo", "error");
      btnSubmit.disabled = false;
      btnSubmit.textContent = esEdicion ? "Guardar Cambios" : "Crear Grupo";
    }
  });

  const modalPromesa = ui.modal({
    titulo: esEdicion ? "Editar Grupo" : "Nuevo Grupo",
    contenido: formElement,
    acciones: []
  });

  formElement.querySelector("#btnModalCancelar").addEventListener("click", () => {
    const botonEscape = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(botonEscape);
  });

  cerrarDialogo = () => {
    const botonEscape = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(botonEscape);
  };

  await modalPromesa;
}

cargarDatos();
