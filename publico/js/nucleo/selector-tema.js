// publico/js/nucleo/selector-tema.js · Resolución del tema pedagógico para actividades formativas

import * as api from "./api.js";
import * as ui from "./ui.js";
import * as util from "./util.js";

/**
 * Obtiene el tema para una actividad.
 * Si la URL contiene el parámetro ?temaId=, lo consulta y devuelve directamente.
 * De lo contrario, despliega un modal con selectores en cascada (asignatura -> unidad -> tema)
 * mostrando únicamente los temas con estado "publicado".
 * Retorna el objeto tema seleccionado o null si el usuario cancela.
 */
export async function obtenerTemaActividad() {
  const temaIdParam = util.parametro("temaId");

  // 1. Si existe parámetro en la URL, intentar obtenerlo directamente
  if (temaIdParam) {
    try {
      const temaDirecto = await api.obtener("temas", temaIdParam);
      if (temaDirecto && temaDirecto.id) {
        return temaDirecto;
      }
    } catch (err) {
      console.warn("No se pudo cargar el tema indicado por URL:", err.message);
    }
  }

  // 2. Cargar datos para selector en cascada
  let asignaturas = [];
  let unidades = [];
  let temas = [];

  try {
    ui.cargando(true);
    const [listaAsig, listaUni, listaTem] = await Promise.all([
      api.listar("asignaturas"),
      api.listar("unidades"),
      api.listar("temas")
    ]);

    asignaturas = Array.isArray(listaAsig) ? listaAsig : [];
    unidades = Array.isArray(listaUni) ? listaUni : [];
    temas = Array.isArray(listaTem) ? listaTem.filter((t) => t.estado === "publicado") : [];
  } catch (err) {
    ui.aviso("Error al cargar temas: " + err.message, "error");
    return null;
  } finally {
    ui.cargando(false);
  }

  if (temas.length === 0) {
    await ui.modal({
      titulo: "Sin temas disponibles",
      contenido: "<p>No hay temas publicados disponibles para realizar esta actividad en este momento.</p>",
      acciones: [{ texto: "Aceptar", valor: null, primario: true }]
    });
    return null;
  }

  // Construir interfaz interactiva para el modal
  const contenedor = document.createElement("div");
  contenedor.className = "pila";
  contenedor.style.gap = "var(--espacio-m)";

  contenedor.innerHTML = `
    <p style="font-size: var(--tamano-s); color: var(--texto-secundario); margin: 0;">
      Selecciona la asignatura, unidad y tema que deseas practicar:
    </p>

    <div class="campo">
      <label for="selAsignaturaModal" class="etiqueta">Asignatura</label>
      <select id="selAsignaturaModal" class="select" required>
        <option value="">-- Selecciona una asignatura --</option>
        ${asignaturas.map((a) => `<option value="${a.id}">${ui.escapar(a.nombre)}</option>`).join("")}
      </select>
    </div>

    <div class="campo">
      <label for="selUnidadModal" class="etiqueta">Unidad</label>
      <select id="selUnidadModal" class="select" disabled>
        <option value="">-- Primero selecciona una asignatura --</option>
      </select>
    </div>

    <div class="campo">
      <label for="selTemaModal" class="etiqueta">Tema</label>
      <select id="selTemaModal" class="select" disabled>
        <option value="">-- Primero selecciona una unidad --</option>
      </select>
    </div>
  `;

  const selAsig = contenedor.querySelector("#selAsignaturaModal");
  const selUni = contenedor.querySelector("#selUnidadModal");
  const selTem = contenedor.querySelector("#selTemaModal");

  selAsig.addEventListener("change", () => {
    const asigId = selAsig.value;
    selUni.innerHTML = '<option value="">-- Selecciona una unidad --</option>';
    selTem.innerHTML = '<option value="">-- Primero selecciona una unidad --</option>';
    selTem.disabled = true;

    if (!asigId) {
      selUni.disabled = true;
      return;
    }

    const unidadesFiltradas = unidades.filter(
      (u) => u.asignaturaId === asigId && u.visible !== false
    );

    if (unidadesFiltradas.length === 0) {
      selUni.innerHTML = '<option value="">No hay unidades en esta asignatura</option>';
      selUni.disabled = true;
      return;
    }

    unidadesFiltradas.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = u.titulo;
      selUni.appendChild(opt);
    });

    selUni.disabled = false;
  });

  selUni.addEventListener("change", () => {
    const unidadId = selUni.value;
    selTem.innerHTML = '<option value="">-- Selecciona un tema --</option>';

    if (!unidadId) {
      selTem.disabled = true;
      return;
    }

    const temasFiltrados = temas.filter((t) => t.unidadId === unidadId);

    if (temasFiltrados.length === 0) {
      selTem.innerHTML = '<option value="">No hay temas publicados en esta unidad</option>';
      selTem.disabled = true;
      return;
    }

    temasFiltrados.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.titulo;
      selTem.appendChild(opt);
    });

    selTem.disabled = false;
  });

  // Si solo hay una asignatura, preseleccionarla para comodidad
  if (asignaturas.length === 1) {
    selAsig.value = asignaturas[0].id;
    selAsig.dispatchEvent(new Event("change"));
  }

  const respuesta = await ui.modal({
    titulo: "Seleccionar Tema de Estudio",
    contenido: contenedor,
    acciones: [
      { texto: "Seleccionar", valor: "aceptar", primario: true },
      { texto: "Cancelar", valor: null, primario: false }
    ]
  });

  if (respuesta === "aceptar") {
    const temaIdSeleccionado = selTem.value;
    if (!temaIdSeleccionado) {
      ui.aviso("Debes seleccionar un tema para continuar", "error");
      return await obtenerTemaActividad();
    }

    const temaElegido = temas.find((t) => t.id === temaIdSeleccionado);
    return temaElegido || null;
  }

  return null;
}

export default {
  obtenerTemaActividad
};
