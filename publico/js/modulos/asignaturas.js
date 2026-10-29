// publico/js/modulos/asignaturas.js · Vista de mis asignaturas con cálculo de avance pedagógico

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

/**
 * Calcula el avance del usuario actual en una asignatura.
 * Considera únicamente las unidades visibles y los temas con estado "publicado".
 * Retorna { porcentaje, revisados, total }.
 */
export async function calcularAvance(asignaturaId) {
  if (!asignaturaId) return { porcentaje: 0, revisados: 0, total: 0 };

  try {
    const [unidades, temas, progresos] = await Promise.all([
      api.listar("unidades"),
      api.listar("temas"),
      api.listar("progreso-temas")
    ]);

    const usuario = usuarioActual();
    const unidsVisibles = unidades.filter(
      (u) => u.asignaturaId === asignaturaId && u.visible !== false
    );
    const uIds = new Set(unidsVisibles.map((u) => u.id));

    const temasPublicados = temas.filter(
      (t) => uIds.has(t.unidadId) && t.estado === "publicado"
    );
    const tIds = new Set(temasPublicados.map((t) => t.id));

    const revisados = progresos.filter(
      (p) => (!usuario || p.usuarioId === usuario.id) && tIds.has(p.temaId)
    );

    const total = temasPublicados.length;
    const cantRevisados = revisados.length;
    const porcentaje = total > 0 ? Math.round((cantRevisados / total) * 100) : 0;

    return {
      porcentaje,
      revisados: cantRevisados,
      total
    };
  } catch (err) {
    console.error("Error al calcular avance:", err);
    return { porcentaje: 0, revisados: 0, total: 0 };
  }
}

// Ejecución solo en la página si estamos en asignaturas.html
if (
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  document.getElementById("contenido") &&
  (window.location.pathname.endsWith("/asignaturas.html") || window.location.pathname.endsWith("asignaturas.html"))
) {
  await montarPlantilla({ titulo: "Mis Asignaturas", roles: ["estudiante", "docente"] });
  const contenido = document.getElementById("contenido");

  async function cargarAsignaturas() {
    try {
      ui.cargando(true);
      const asignaturas = await api.listar("asignaturas");

      if (asignaturas.length === 0) {
        contenido.innerHTML = `
          <div class="mis-asignaturas-layout pila">
            <header class="pila pila--xs">
              <h1>Mis Asignaturas</h1>
              <p style="color: var(--texto-suave);">Materias y módulos de estudio activos.</p>
            </header>
            <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-suave);">
              <p>No tienes asignaturas matriculadas o asignadas en este período.</p>
            </div>
          </div>
        `;
        return;
      }

      // Calcular avances en paralelo
      const avances = await Promise.all(
        asignaturas.map((asig) => calcularAvance(asig.id))
      );

      contenido.innerHTML = `
        <div class="mis-asignaturas-layout pila">
          <header class="pila pila--xs">
            <h1>Mis Asignaturas</h1>
            <p style="color: var(--texto-suave);">Selecciona una asignatura para acceder a sus unidades, temas y recursos.</p>
          </header>

          <div class="grid-auto">
            ${asignaturas
              .map((asig, idx) => {
                const av = avances[idx] || { porcentaje: 0, revisados: 0, total: 0 };
                return `
              <a href="/paginas/asignatura.html?id=${encodeURIComponent(asig.id)}" class="tarjeta-mi-asignatura">
                <header class="tarjeta-mi-asignatura__cabecera">
                  <h2 class="tarjeta-mi-asignatura__titulo">${ui.escapar(asig.nombre)}</h2>
                  <span class="insignia insignia--acento">${ui.escapar(asig.nivel || "PREGRADO")}</span>
                </header>

                <p class="tarjeta-mi-asignatura__desc">
                  ${ui.escapar(asig.descripcion || "Sin descripción disponible.")}
                </p>

                <div class="tarjeta-mi-asignatura__avance">
                  <div class="tarjeta-mi-asignatura__avance-info">
                    <span>Avance: <strong>${av.porcentaje}%</strong></span>
                    <span>${av.revisados} de ${av.total} temas</span>
                  </div>
                  <div class="progreso" role="progressbar" aria-valuenow="${av.porcentaje}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance en ${ui.escapar(asig.nombre)}">
                    <div class="progreso__barra" style="width: ${av.porcentaje}%;"></div>
                  </div>
                </div>
              </a>
            `;
              })
              .join("")}
          </div>
        </div>
      `;
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

  cargarAsignaturas();
}

export default {
  calcularAvance
};
