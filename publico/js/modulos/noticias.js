// publico/js/modulos/noticias.js · Catálogo de noticias con filtros, paginación y marcas de lectura

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Noticias", roles: ["sesion"] });

const contenido = document.getElementById("contenido");
const usuario = usuarioActual();
const puedeEditar = usuario && (usuario.rol === "docente" || usuario.rol === "admin");

const ELEMENTOS_POR_PAGINA = 9;
let paginaActual = 1;
let filtroCategoria = "";
let filtroTema = "";

let noticias = [];
let lecturas = [];
let temas = [];
let temasMap = new Map();

async function cargarDatos() {
  ui.cargando(true);
  try {
    const [listaNoticias, listaLecturas, listaTemas] = await Promise.all([
      api.listar("noticias"),
      api.listar("lecturas-noticias"),
      api.listar("temas")
    ]);

    noticias = Array.isArray(listaNoticias) ? listaNoticias : [];
    lecturas = Array.isArray(listaLecturas) ? listaLecturas : [];
    temas = Array.isArray(listaTemas) ? listaTemas : [];
    temasMap = new Map(temas.map((t) => [t.id, t.titulo]));

    renderizar();
  } catch (err) {
    ui.aviso("Error al cargar noticias: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

function filtrarYOrdenar() {
  const leidasSet = new Set(lecturas.map((l) => l.noticiaId));

  let resultado = noticias.filter((n) => {
    if (filtroCategoria && n.categoria !== filtroCategoria) return false;
    if (filtroTema && n.temaId !== filtroTema) return false;
    return true;
  });

  // Ordenar: destacadas primero, luego por fecha desc
  resultado.sort((a, b) => {
    const destA = Boolean(a.destacada);
    const destB = Boolean(b.destacada);
    if (destA !== destB) return destB ? 1 : -1;

    const fechaA = a.fechaPublicacion || a.fecha || "";
    const fechaB = b.fechaPublicacion || b.fecha || "";
    return fechaB.localeCompare(fechaA);
  });

  return { items: resultado, leidasSet };
}

function renderizar() {
  const { items, leidasSet } = filtrarYOrdenar();
  const totalPaginas = Math.ceil(items.length / ELEMENTOS_POR_PAGINA) || 1;

  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
  const paginados = items.slice(inicio, inicio + ELEMENTOS_POR_PAGINA);

  const opcionesCategorias = ["Institucional", "Académica", "Eventos", "Logros"]
    .map(
      (cat) =>
        `<option value="${cat}" ${filtroCategoria === cat ? "selected" : ""}>${cat}</option>`
    )
    .join("");

  const opcionesTemas = temas
    .map(
      (t) =>
        `<option value="${t.id}" ${filtroTema === t.id ? "selected" : ""}>${ui.escapar(t.titulo)}</option>`
    )
    .join("");

  let tarjetasHtml = "";
  if (paginados.length === 0) {
    tarjetasHtml = `
      <div class="noticias__vacio">
        <p class="h3" style="color: var(--texto-secundario); margin-bottom: var(--espacio-s);">No hay noticias disponibles</p>
        <p>No se encontraron publicaciones con los filtros seleccionados.</p>
      </div>
    `;
  } else {
    tarjetasHtml = `
      <div class="noticias__grid">
        ${paginados
          .map((n) => {
            const esLeida = leidasSet.has(n.id);
            const fechaTxt = n.fechaPublicacion
              ? util.fechaRelativa(n.fechaPublicacion)
              : (n.fecha ? util.fechaRelativa(n.fecha) : "");
            const nombreTema = n.temaId && temasMap.has(n.temaId) ? temasMap.get(n.temaId) : null;

            return `
              <article class="noticia-tarjeta ${n.destacada ? "noticia-tarjeta--destacada" : ""}">
                <div class="noticia-tarjeta__imagen-contenedor">
                  ${
                    n.imagen
                      ? `<img src="${ui.escapar(n.imagen)}" alt="${ui.escapar(n.titulo)}" class="noticia-tarjeta__imagen" loading="lazy">`
                      : `<div class="noticia-tarjeta__imagen-placeholder">📰</div>`
                  }
                </div>

                <div class="noticia-tarjeta__contenido">
                  <div class="noticia-tarjeta__etiquetas">
                    <span class="insignia insignia--primario">${ui.escapar(n.categoria || "General")}</span>
                    ${n.destacada ? `<span class="insignia insignia--acento">★ Destacada</span>` : ""}
                    ${!esLeida ? `<span class="insignia insignia--acento">Nuevo</span>` : ""}
                    ${
                      n.estado === "borrador"
                        ? `<span class="insignia insignia--secundario">Borrador</span>`
                        : ""
                    }
                  </div>

                  <h2 class="noticia-tarjeta__titulo">
                    <a href="/paginas/noticia.html?id=${n.id}">${ui.escapar(n.titulo)}</a>
                  </h2>

                  <p class="noticia-tarjeta__resumen">${ui.escapar(n.resumen || "")}</p>

                  ${
                    nombreTema
                      ? `<div style="font-size: var(--tamano-xs); color: var(--primario); margin-bottom: var(--espacio-s);">
                          📚 Tema: ${ui.escapar(nombreTema)}
                        </div>`
                      : ""
                  }

                  <div class="noticia-tarjeta__pie">
                    <span>${fechaTxt}</span>
                    <div class="noticia-tarjeta__acciones">
                      ${
                        puedeEditar
                          ? `<a href="/paginas/editor-noticia.html?id=${n.id}" class="btn btn--secundario btn--pequeno">Editar</a>`
                          : ""
                      }
                      <a href="/paginas/noticia.html?id=${n.id}" class="btn btn--primario btn--pequeno">Leer más</a>
                    </div>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  const paginacionHtml =
    totalPaginas > 1
      ? `
      <div class="noticias__paginacion">
        <button type="button" class="btn btn--secundario btn--pequeno" id="btnPagAnt" ${paginaActual <= 1 ? "disabled" : ""}>
          &larr; Anterior
        </button>
        <span style="font-size: var(--tamano-s); color: var(--texto-secundario);">
          Página ${paginaActual} de ${totalPaginas}
        </span>
        <button type="button" class="btn btn--secundario btn--pequeno" id="btnPagSig" ${paginaActual >= totalPaginas ? "disabled" : ""}>
          Siguiente &rarr;
        </button>
      </div>
    `
      : "";

  contenido.innerHTML = `
    <div class="noticias">
      <div class="noticias__cabecera">
        <div>
          <h1 class="h2">Noticias y Actualidad</h1>
          <p style="color: var(--texto-secundario); font-size: var(--tamano-s);">
            Mantente al día con las últimas novedades, eventos y logros de la comunidad.
          </p>
        </div>
        ${
          puedeEditar
            ? `<a href="/paginas/editor-noticia.html" class="btn btn--primario">+ Nueva noticia</a>`
            : ""
        }
      </div>

      <div class="noticias__filtros">
        <div class="noticias__filtros-campo">
          <label for="filtroCategoria" class="etiqueta" style="margin-bottom: 0;">Categoría:</label>
          <select id="filtroCategoria" class="select" style="min-width: 160px;">
            <option value="">Todas</option>
            ${opcionesCategorias}
          </select>
        </div>

        <div class="noticias__filtros-campo">
          <label for="filtroTema" class="etiqueta" style="margin-bottom: 0;">Tema:</label>
          <select id="filtroTema" class="select" style="min-width: 200px;">
            <option value="">Todos los temas</option>
            ${opcionesTemas}
          </select>
        </div>

        ${
          filtroCategoria || filtroTema
            ? `<button type="button" class="btn btn--texto btn--pequeno" id="btnLimpiarFiltros" style="color: var(--peligro);">
                Limpiar filtros
              </button>`
            : ""
        }
      </div>

      ${tarjetasHtml}
      ${paginacionHtml}
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const selCat = document.getElementById("filtroCategoria");
  const selTema = document.getElementById("filtroTema");
  const btnLimpiar = document.getElementById("btnLimpiarFiltros");
  const btnAnt = document.getElementById("btnPagAnt");
  const btnSig = document.getElementById("btnPagSig");

  if (selCat) {
    selCat.addEventListener("change", (e) => {
      filtroCategoria = e.target.value;
      paginaActual = 1;
      renderizar();
    });
  }

  if (selTema) {
    selTema.addEventListener("change", (e) => {
      filtroTema = e.target.value;
      paginaActual = 1;
      renderizar();
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      filtroCategoria = "";
      filtroTema = "";
      paginaActual = 1;
      renderizar();
    });
  }

  if (btnAnt) {
    btnAnt.addEventListener("click", () => {
      if (paginaActual > 1) {
        paginaActual--;
        renderizar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (btnSig) {
    btnSig.addEventListener("click", () => {
      paginaActual++;
      renderizar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

await cargarDatos();
