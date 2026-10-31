// publico/js/nucleo/gamificacion.js · Registro de intentos, visualización de logros e insignias

import * as api from "./api.js";
import * as ui from "./ui.js";
import { cambiarEstado } from "./avatar.js";

/**
 * Consulta los logros de un usuario ("yo" por defecto).
 * Retorna { usuarioId, puntos, insignias, nivelQuiz }.
 */
export async function logrosDe(usuarioId = "yo") {
  return await api.llamar("GET", `/api/logros/${encodeURIComponent(usuarioId)}`);
}

/**
 * Muestra las recompensas obtenidas: aviso de puntos, actualización de marcador
 * en el encabezado y modales de celebración por cada insignia nueva.
 */
export async function mostrarLogros(resultado) {
  if (!resultado || typeof resultado !== "object") return;

  // 1. Aviso de puntos ganados si es mayor a 0
  if (resultado.puntosGanados && resultado.puntosGanados > 0) {
    ui.aviso(`+${resultado.puntosGanados} puntos ganados`, "exito");
  }

  // 2. Actualizar marcador de puntos en el encabezado si existe
  if (resultado.puntosTotales !== undefined) {
    const puntosEl = document.getElementById("puntos-usuario");
    if (puntosEl) {
      puntosEl.textContent = `⭐ ${resultado.puntosTotales} pts`;
    }
  }

  // 3. Modales de celebración secuenciales por cada insignia nueva
  if (Array.isArray(resultado.insigniasNuevas) && resultado.insigniasNuevas.length > 0) {
    if (document.getElementById("avatar-guia-widget")) {
      cambiarEstado("celebrando");
      setTimeout(() => cambiarEstado("reposo"), 3000);
    }
    for (const ins of resultado.insigniasNuevas) {
      const cuerpoHtml = `
        <div class="celebracion">
          <div class="celebracion__icono" aria-hidden="true">${ui.escapar(ins.icono || "🏆")}</div>
          <p class="celebracion__subtitulo">¡Nueva insignia desbloqueada!</p>
          <h3 class="celebracion__nombre">${ui.escapar(ins.nombre || "Insignia")}</h3>
        </div>
      `;

      await ui.modal({
        titulo: "¡Felicitaciones!",
        contenido: cuerpoHtml,
        acciones: [{ texto: "¡Genial!", valor: true, primario: true }]
      });
    }
  }
}

/**
 * Registra un intento de actividad en el servidor, procesa recompensas
 * y despliega la retroalimentación de logros.
 */
export async function registrarIntento({
  actividad,
  temaId = null,
  nivel = null,
  puntaje = 0,
  maximo = 1,
  errores = 0,
  duracionSeg = 0,
  detalle = null
} = {}) {
  const datos = {
    actividad,
    temaId,
    nivel,
    puntaje,
    maximo,
    errores,
    duracionSeg,
    detalle
  };

  const resultado = await api.llamar("POST", "/api/intentos", datos);
  await mostrarLogros(resultado);
  return resultado;
}

export default {
  logrosDe,
  mostrarLogros,
  registrarIntento
};
