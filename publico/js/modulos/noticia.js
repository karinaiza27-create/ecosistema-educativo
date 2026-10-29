// publico/js/modulos/noticia.js · Detalle de una publicación y registro automático de lectura

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Noticia", roles: ["sesion"] });

const contenido = document.getElementById("contenido");
const noticiaId = util.parametro("id");
const usuario = usuarioActual();
const puedeEditar = usuario && (usuario.rol === "docente" || usuario.rol === "admin");

async function registrarLectura() {
  if (!noticiaId || !usuario) return;
  try {
    const lecturas = await api.listar("lecturas-noticias");
    const yaLeida = Array.isArray(lecturas) && lecturas.some((l) => l.noticiaId === noticiaId);
    if (!yaLeida) {
      await api.crear("lecturas-noticias", { noticiaId });
    }
  } catch {
    // Si ya existe o falla por permisos, no interrumpe la lectura
  }
}

async function cargarNoticia() {
  if (!noticiaId) {
    ui.aviso("No se especificó ninguna noticia para mostrar", "error");
    contenido.innerHTML = `
      <div class="noticia-detalle">
        <p>No se especificó ninguna noticia.</p>
        <a href="/paginas/noticias.html" class="btn btn--primario" style="margin-top: var(--espacio-m);">Volver a Noticias</a>
      </div>
    `;
    return;
  }

  ui.cargando(true);
  try {
    const noticia = await api.obtener("noticias", noticiaId);
    if (!noticia) {
      throw new Error("La noticia no existe o no tienes permiso para verla");
    }

    // Registrar lectura en segundo plano
    registrarLectura();

    // Obtener información adicional en paralelo (autor y tema)
    let autorTexto = "Comunidad Educativa";
    let temaInfo = null;

    try {
      if (noticia.autorId) {
        const autor = await api.obtener("usuarios", noticia.autorId);
        if (autor && autor.nombre) {
          autorTexto = `${autor.nombre} ${autor.apellido || ""}`.trim();
        }
      }
    } catch {}

    try {
      if (noticia.temaId) {
        temaInfo = await api.obtener("temas", noticia.temaId);
      }
    } catch {}

    renderizar(noticia, autorTexto, temaInfo);
  } catch (err) {
    contenido.innerHTML = `
      <div class="noticia-detalle">
        <p class="h3" style="color: var(--peligro);">${ui.escapar(err.message)}</p>
        <a href="/paginas/noticias.html" class="btn btn--primario" style="margin-top: var(--espacio-m);">Volver a Noticias</a>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

function renderizar(noticia, autorTexto, temaInfo) {
  const fechaIso = noticia.fechaPublicacion || noticia.fecha;
  const fechaTexto = fechaIso ? util.fechaLarga(fechaIso) : "Fecha no disponible";

  contenido.innerHTML = `
    <article class="noticia-detalle">
      <div class="noticia-detalle__cabecera">
        <a href="/paginas/noticias.html" class="noticia-detalle__volver">&larr; Volver a Noticias</a>

        <div class="noticia-detalle__etiquetas">
          <span class="insignia insignia--primario">${ui.escapar(noticia.categoria || "General")}</span>
          ${noticia.destacada ? `<span class="insignia insignia--acento">★ Destacada</span>` : ""}
          ${
            noticia.estado === "borrador"
              ? `<span class="insignia insignia--secundario">Borrador</span>`
              : ""
          }
        </div>

        <h1 class="noticia-detalle__titulo">${ui.escapar(noticia.titulo)}</h1>

        <div class="noticia-detalle__meta">
          <span>Por: <strong>${ui.escapar(autorTexto)}</strong></span>
          <span>&bull;</span>
          <time datetime="${ui.escapar(fechaIso || "")}">${ui.escapar(fechaTexto)}</time>
          ${
            temaInfo
              ? `<span>&bull;</span><span>Tema: <a href="/paginas/tema.html?id=${temaInfo.id}" style="color: var(--primario); font-weight: var(--peso-medio);">${ui.escapar(temaInfo.titulo)}</a></span>`
              : ""
          }
        </div>
      </div>

      ${
        noticia.resumen
          ? `<div class="noticia-detalle__resumen">${ui.escapar(noticia.resumen)}</div>`
          : ""
      }

      ${
        noticia.imagen
          ? `<div class="noticia-detalle__imagen-contenedor">
              <img src="${ui.escapar(noticia.imagen)}" alt="${ui.escapar(noticia.titulo)}" class="noticia-detalle__imagen">
            </div>`
          : ""
      }

      <div class="noticia-detalle__cuerpo">
        ${util.formatoBasico(noticia.cuerpo || "")}
      </div>

      <div class="noticia-detalle__pie">
        <a href="/paginas/noticias.html" class="btn btn--secundario">&larr; Todas las noticias</a>
        ${
          puedeEditar
            ? `<a href="/paginas/editor-noticia.html?id=${noticia.id}" class="btn btn--primario">Editar noticia</a>`
            : ""
        }
      </div>
    </article>
  `;
}

await cargarNoticia();
