// publico/js/modulos/actividades.js · Catálogo de actividades y juegos pedagógicos

import { montarPlantilla } from "../nucleo/plantilla.js";
import { ACTIVIDADES } from "../nucleo/catalogo-actividades.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Actividades", roles: ["estudiante", "docente"] });

const contenido = document.getElementById("contenido");

function obtenerIconoActividad(id) {
  switch (id) {
    case "ahorcado":
      return "🎈";
    case "canciones":
      return "🎵";
    case "pareja":
      return "🃏";
    case "sopa-letras":
      return "🔤";
    case "crucigrama":
      return "✏️";
    case "quiz":
      return "🧠";
    case "simulacion":
      return "🎭";
    default:
      return "🎮";
  }
}

function renderizar() {
  const tarjetasHtml = ACTIVIDADES.map((act) => {
    const icono = obtenerIconoActividad(act.id);
    return `
      <article class="actividad-card">
        <div>
          <div class="actividad-card__icono" aria-hidden="true">${icono}</div>
          <h2 class="actividad-card__titulo">${ui.escapar(act.texto)}</h2>
          <p class="actividad-card__descripcion">${ui.escapar(act.descripcion || "Actividad interactiva de consolidación pedagógica.")}</p>
        </div>
        <div class="actividad-card__pie">
          <a href="${act.href}" class="btn btn--primario">
            Jugar &rarr;
          </a>
        </div>
      </article>
    `;
  }).join("");

  contenido.innerHTML = `
    <div class="actividades-catalogo">
      <header class="actividades-catalogo__cabecera">
        <h1>Centro de Actividades y Juegos</h1>
        <p>Aprende, refuerza conceptos y acumula puntos jugando con los contenidos de tus temas de estudio.</p>
      </header>

      <div class="actividades-grid">
        ${tarjetasHtml}
      </div>
    </div>
  `;
}

renderizar();
