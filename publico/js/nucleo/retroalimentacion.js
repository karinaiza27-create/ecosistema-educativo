// publico/js/nucleo/retroalimentacion.js · Componentes de retroalimentación pedagógica y resumen

import * as ui from "./ui.js";

/**
 * Despliega un panel de retroalimentación inmediata sobre la respuesta dada.
 * Utiliza clases .retro, .retro--correcto / .retro--incorrecto y atributos aria-live.
 */
export function mostrarRetro({
  correcto = true,
  explicacion = "",
  sugerencia = "",
  enlaceTema = ""
} = {}, contenedor = null) {
  const panel = document.createElement("div");
  panel.className = `retro ${correcto ? "retro--correcto" : "retro--incorrecto"}`;
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");

  const icono = correcto ? "✓" : "✗";
  const claseIcono = correcto ? "retro__icono--correcto" : "retro__icono--incorrecto";

  let html = `
    <div class="retro__cabecera">
      <span class="retro__icono ${claseIcono}" aria-hidden="true">${icono}</span>
      <span class="retro__titulo">${correcto ? "¡Correcto!" : "¡Incorrecto!"}</span>
    </div>
  `;

  if (explicacion) {
    html += `<div class="retro__explicacion">${ui.escapar(explicacion)}</div>`;
  }

  if (sugerencia) {
    html += `<div class="retro__sugerencia"><strong>Pista o sugerencia:</strong> ${ui.escapar(sugerencia)}</div>`;
  }

  if (enlaceTema) {
    html += `
      <div class="retro__enlace">
        <a href="${ui.escapar(enlaceTema)}" class="btn btn--secundario btn--pequeno" target="_blank" rel="noopener">
          Repasar el tema &rarr;
        </a>
      </div>
    `;
  }

  panel.innerHTML = html;

  const destino = (contenedor && typeof contenedor === "string" ? document.querySelector(contenedor) : contenedor) || document.getElementById("panel-retro");
  if (destino) {
    destino.innerHTML = "";
    destino.appendChild(panel);
  }

  return panel;
}

/**
 * Muestra el resumen de cierre de una actividad en un modal accesible.
 * Presenta aciertos, errores, recomendaciones y acciones para repetir o salir.
 * Retorna una promesa que resuelve a "repetir" o "salir".
 */
export async function mostrarResumen({
  titulo = "Resumen de la Actividad",
  aciertos = 0,
  errores = 0,
  recomendaciones = "",
  enlaceTema = ""
} = {}) {
  const total = aciertos + errores;
  const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;

  let cuerpoHtml = `
    <div class="resumen-actividad">
      <div class="resumen-actividad__metricas">
        <div class="resumen-actividad__metrica">
          <span class="resumen-actividad__metrica-num" style="color: var(--exito);">${aciertos}</span>
          <span class="resumen-actividad__metrica-label">Aciertos</span>
        </div>
        <div class="resumen-actividad__metrica">
          <span class="resumen-actividad__metrica-num" style="color: var(--peligro);">${errores}</span>
          <span class="resumen-actividad__metrica-label">Errores</span>
        </div>
        <div class="resumen-actividad__metrica">
          <span class="resumen-actividad__metrica-num" style="color: var(--primario);">${porcentaje}%</span>
          <span class="resumen-actividad__metrica-label">Efectividad</span>
        </div>
      </div>
  `;

  if (recomendaciones) {
    cuerpoHtml += `
      <div class="resumen-actividad__recomendaciones">
        <strong>Recomendaciones pedagógicas:</strong>
        <p style="margin: var(--espacio-xs) 0 0 0;">${ui.escapar(recomendaciones)}</p>
      </div>
    `;
  }

  cuerpoHtml += `</div>`;

  const acciones = [];

  if (enlaceTema) {
    acciones.push({
      texto: "Repasar el tema",
      valor: "repasar",
      primario: false
    });
  }

  acciones.push({
    texto: "Jugar de nuevo",
    valor: "repetir",
    primario: true
  });

  acciones.push({
    texto: "Salir",
    valor: "salir",
    primario: false
  });

  const respuesta = await ui.modal({
    titulo,
    contenido: cuerpoHtml,
    acciones
  });

  if (respuesta === "repasar" && enlaceTema) {
    window.location.href = enlaceTema;
    return "salir";
  }

  return respuesta === "repetir" ? "repetir" : "salir";
}

export default {
  mostrarRetro,
  mostrarResumen
};
