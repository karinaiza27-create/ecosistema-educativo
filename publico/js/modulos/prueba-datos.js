// publico/js/modulos/prueba-datos.js · Controlador para pruebas de guardado y listado en la colección "prueba"

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import { fechaRelativa } from "../nucleo/util.js";

await montarPlantilla({ titulo: "Prueba de datos", roles: ["publico"] });

const contenido = document.getElementById("contenido");

contenido.innerHTML = `
  <div class="pila">
    <header class="pila pila--s">
      <h1>Prueba de Almacenamiento y API</h1>
      <p style="color: var(--texto-suave);">
        Guarda y consulta registros en la colección pública <code>prueba</code> mediante los módulos del núcleo.
      </p>
    </header>

    <section class="tarjeta prueba-datos__panel-formulario">
      <h2 style="font-size: var(--tamano-xl); margin-bottom: var(--espacio-s);">Nuevo Registro</h2>
      <form id="formPrueba" class="pila" novalidate>
        <div class="campo" id="contenedorCampo">
          <label for="inputTexto">Texto del registro</label>
          <input
            type="text"
            id="inputTexto"
            name="texto"
            placeholder="Escribe un mensaje o dato para almacenar..."
            autocomplete="off"
            required
          />
          <span class="campo__error oculto" id="errorCampo">Este campo es obligatorio.</span>
        </div>
        <div class="fila">
          <button type="submit" class="btn btn--primario" id="btnGuardar">
            Guardar en Colección
          </button>
          <button type="button" class="btn btn--secundario" id="btnRecargar">
            Recargar Lista
          </button>
        </div>
      </form>
    </section>

    <section class="pila">
      <div class="fila" style="justify-content: space-between;">
        <h2>Registros Guardados</h2>
        <span class="insignia insignia--primario" id="contadorRegistros">0 registros</span>
      </div>
      <div id="contenedorLista">
        <div class="tarjeta cargando-contenedor">
          <div class="cargando"></div>
          <span>Cargando datos...</span>
        </div>
      </div>
    </section>
  </div>
`;

const formPrueba = document.getElementById("formPrueba");
const inputTexto = document.getElementById("inputTexto");
const contenedorCampo = document.getElementById("contenedorCampo");
const errorCampo = document.getElementById("errorCampo");
const contenedorLista = document.getElementById("contenedorLista");
const contadorRegistros = document.getElementById("contadorRegistros");
const btnRecargar = document.getElementById("btnRecargar");

async function cargarRegistros() {
  try {
    const registros = await api.listar("prueba");
    contadorRegistros.textContent = `${registros.length} registro${registros.length === 1 ? "" : "s"}`;

    if (!Array.isArray(registros) || registros.length === 0) {
      contenedorLista.innerHTML = `
        <div class="vacio">
          <div class="vacio__icono">📝</div>
          <h3 class="vacio__titulo">No hay registros aún</h3>
          <p class="vacio__texto">Utiliza el formulario de arriba para crear el primer registro en la colección "prueba".</p>
        </div>
      `;
      return;
    }

    const filasHtml = registros.map((reg) => {
      const fechaTxt = reg.fecha ? fechaRelativa(reg.fecha) : "Sin fecha";
      return `
        <tr>
          <td><code>${ui.escapar(reg.id)}</code></td>
          <td>${ui.escapar(reg.texto || "(Sin contenido)")}</td>
          <td><small>${ui.escapar(fechaTxt)}</small></td>
        </tr>
      `;
    }).join("");

    contenedorLista.innerHTML = `
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead>
            <tr>
              <th style="width: 140px;">ID</th>
              <th>Texto</th>
              <th style="width: 180px;">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Error al cargar registros:", error);
    ui.aviso(`Error al listar registros: ${error.message}`, "error");
    contenedorLista.innerHTML = `
      <div class="alerta alerta--error">
        <div>
          <strong>Error al cargar datos:</strong> ${ui.escapar(error.message)}
        </div>
      </div>
    `;
  }
}

formPrueba.addEventListener("submit", async (e) => {
  e.preventDefault();
  const valor = inputTexto.value.trim();

  if (!valor) {
    contenedorCampo.classList.add("campo--error");
    errorCampo.classList.remove("oculto");
    inputTexto.focus();
    return;
  }

  contenedorCampo.classList.remove("campo--error");
  errorCampo.classList.add("oculto");

  try {
    ui.cargando(true);
    await api.crear("prueba", { texto: valor });
    ui.aviso("Registro guardado con éxito en la colección.", "exito");
    inputTexto.value = "";
    await cargarRegistros();
  } catch (error) {
    console.error("Error al guardar:", error);
    ui.aviso(`No se pudo guardar: ${error.message}`, "error");
  } finally {
    ui.cargando(false);
  }
});

inputTexto.addEventListener("input", () => {
  if (inputTexto.value.trim()) {
    contenedorCampo.classList.remove("campo--error");
    errorCampo.classList.add("oculto");
  }
});

btnRecargar.addEventListener("click", () => {
  cargarRegistros();
  ui.aviso("Lista actualizada.", "info");
});

// Carga inicial
cargarRegistros();
