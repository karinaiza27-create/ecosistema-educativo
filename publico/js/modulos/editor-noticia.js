// publico/js/modulos/editor-noticia.js · Creación y edición de noticias

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Editor de Noticia", roles: ["docente", "admin"] });

const contenido = document.getElementById("contenido");
const noticiaId = util.parametro("id");
let mostrarPrevia = false;
let temas = [];
let noticiaActual = {
  titulo: "",
  resumen: "",
  cuerpo: "",
  imagen: "",
  categoria: "Institucional",
  temaId: "",
  destacada: false,
  estado: "publicado"
};

async function inicializar() {
  ui.cargando(true);
  try {
    const listaTemas = await api.listar("temas");
    temas = Array.isArray(listaTemas) ? listaTemas : [];

    if (noticiaId) {
      const encontrada = await api.obtener("noticias", noticiaId);
      if (encontrada) {
        noticiaActual = {
          titulo: encontrada.titulo || "",
          resumen: encontrada.resumen || "",
          cuerpo: encontrada.cuerpo || "",
          imagen: encontrada.imagen || "",
          categoria: encontrada.categoria || "Institucional",
          temaId: encontrada.temaId || "",
          destacada: Boolean(encontrada.destacada),
          estado: encontrada.estado || "borrador"
        };
      }
    }
  } catch (err) {
    ui.aviso("Error al cargar la información de la noticia: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }

  renderizar();
}

function renderizar() {
  const opcionesTemas = temas
    .map(
      (t) =>
        `<option value="${t.id}" ${noticiaActual.temaId === t.id ? "selected" : ""}>${ui.escapar(t.titulo)}</option>`
    )
    .join("");

  const resumenRestante = 200 - (noticiaActual.resumen ? noticiaActual.resumen.length : 0);

  contenido.innerHTML = `
    <div class="editor-noticia">
      <div class="editor-noticia__cabecera">
        <div>
          <a href="/paginas/noticias.html" class="btn btn--texto btn--pequeno" style="padding-left: 0;">&larr; Volver a Noticias</a>
          <h1 class="h2">${noticiaId ? "Editar Noticia" : "Nueva Noticia"}</h1>
        </div>
        <div class="fila" style="gap: var(--espacio-s);">
          <button type="button" class="btn btn--secundario" id="btnAlternarPrevia">
            ${mostrarPrevia ? "Ocultar vista previa" : "Vista previa"}
          </button>
          <button type="button" class="btn btn--primario" id="btnGuardar">Guardar noticia</button>
        </div>
      </div>

      <div class="editor-noticia__paneles ${mostrarPrevia ? "con-previa" : ""}">
        <form class="editor-noticia__formulario" id="formNoticia">
          <div class="campo">
            <label for="titulo" class="etiqueta">Título *</label>
            <input type="text" id="titulo" class="input" required value="${ui.escapar(noticiaActual.titulo)}" placeholder="Título de la noticia">
          </div>

          <div class="fila" style="gap: var(--espacio-m); flex-wrap: wrap;">
            <div class="campo" style="flex: 1; min-width: 200px;">
              <label for="categoria" class="etiqueta">Categoría *</label>
              <select id="categoria" class="select" required>
                <option value="Institucional" ${noticiaActual.categoria === "Institucional" ? "selected" : ""}>Institucional</option>
                <option value="Académica" ${noticiaActual.categoria === "Académica" ? "selected" : ""}>Académica</option>
                <option value="Eventos" ${noticiaActual.categoria === "Eventos" ? "selected" : ""}>Eventos</option>
                <option value="Logros" ${noticiaActual.categoria === "Logros" ? "selected" : ""}>Logros</option>
              </select>
            </div>

            <div class="campo" style="flex: 1; min-width: 200px;">
              <label for="temaId" class="etiqueta">Tema relacionado (opcional)</label>
              <select id="temaId" class="select">
                <option value="">-- Ninguno --</option>
                ${opcionesTemas}
              </select>
            </div>
          </div>

          <div class="campo">
            <label for="resumen" class="etiqueta">Resumen (máximo 200 caracteres) *</label>
            <textarea id="resumen" class="input" rows="2" maxlength="200" placeholder="Breve resumen de la noticia..." required>${ui.escapar(noticiaActual.resumen)}</textarea>
            <div class="editor-noticia__contador" id="contadorResumen">${resumenRestante} caracteres restantes</div>
          </div>

          <div class="campo">
            <label for="imagenUrl" class="etiqueta">Imagen de portada</label>
            <div class="editor-noticia__subida">
              <input type="url" id="imagenUrl" class="input" style="flex: 1; min-width: 220px;" placeholder="https://... o sube una imagen" value="${ui.escapar(noticiaActual.imagen)}">
              <label class="btn btn--secundario" style="cursor: pointer;">
                Subir imagen
                <input type="file" id="inputArchivo" accept="image/*" style="display: none;">
              </label>
            </div>
            ${
              noticiaActual.imagen
                ? `<img src="${ui.escapar(noticiaActual.imagen)}" alt="Vista previa imagen" class="editor-noticia__miniatura" id="imgMiniatura">`
                : `<img src="" alt="Vista previa imagen" class="editor-noticia__miniatura" id="imgMiniatura" style="display: none;">`
            }
          </div>

          <div class="campo">
            <label for="cuerpo" class="etiqueta">Cuerpo de la noticia *</label>
            <div style="font-size: var(--tamano-xs); color: var(--texto-secundario); margin-bottom: var(--espacio-xs);">
              Admite formato básico: párrafos separados por líneas vacías, listas con guiones (- item) y negrita con **texto**.
            </div>
            <textarea id="cuerpo" class="input" rows="8" placeholder="Escribe aquí el contenido completo de la noticia..." required>${ui.escapar(noticiaActual.cuerpo)}</textarea>
          </div>

          <div class="fila" style="gap: var(--espacio-l); align-items: center; flex-wrap: wrap;">
            <div class="campo" style="min-width: 180px;">
              <label for="estado" class="etiqueta">Estado</label>
              <select id="estado" class="select">
                <option value="borrador" ${noticiaActual.estado === "borrador" ? "selected" : ""}>Borrador</option>
                <option value="publicado" ${noticiaActual.estado === "publicado" ? "selected" : ""}>Publicado</option>
              </select>
            </div>

            <div class="campo" style="margin-top: var(--espacio-m);">
              <label class="fila" style="gap: var(--espacio-xs); cursor: pointer; user-select: none;">
                <input type="checkbox" id="destacada" ${noticiaActual.destacada ? "checked" : ""}>
                <span>Destacar esta noticia en la portada</span>
              </label>
            </div>
          </div>
        </form>

        <div class="editor-noticia__previa-contenedor" id="panelPrevia" style="display: ${mostrarPrevia ? "block" : "none"};">
          <h2 class="h4" style="margin-bottom: var(--espacio-m); color: var(--texto-secundario);">Vista previa</h2>
          <article>
            <div class="fila" style="gap: var(--espacio-xs); margin-bottom: var(--espacio-s);">
              <span class="insignia insignia--primario" id="previaCategoria">${ui.escapar(noticiaActual.categoria)}</span>
              <span class="insignia insignia--acento" id="previaDestacada" style="display: ${noticiaActual.destacada ? "inline-block" : "none"};">★ Destacada</span>
              <span class="insignia insignia--secundario" id="previaEstado">${ui.escapar(noticiaActual.estado)}</span>
            </div>
            <h1 class="h3" id="previaTitulo" style="margin-bottom: var(--espacio-s);">${ui.escapar(noticiaActual.titulo || "Título de la noticia")}</h1>
            <p id="previaResumen" style="font-weight: var(--peso-medio); color: var(--texto-secundario); margin-bottom: var(--espacio-m);">${ui.escapar(noticiaActual.resumen || "Resumen de la noticia...")}</p>
            <img src="${ui.escapar(noticiaActual.imagen)}" alt="Imagen de la noticia" class="editor-noticia__previa-imagen" id="previaImg" style="display: ${noticiaActual.imagen ? "block" : "none"};">
            <div class="editor-noticia__cuerpo-previa" id="previaCuerpo">${util.formatoBasico(noticiaActual.cuerpo || "Cuerpo de la noticia...")}</div>
          </article>
        </div>
      </div>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const form = document.getElementById("formNoticia");
  const inputTitulo = document.getElementById("titulo");
  const inputResumen = document.getElementById("resumen");
  const contadorResumen = document.getElementById("contadorResumen");
  const inputCuerpo = document.getElementById("cuerpo");
  const selectCategoria = document.getElementById("categoria");
  const selectTemaId = document.getElementById("temaId");
  const selectEstado = document.getElementById("estado");
  const checkDestacada = document.getElementById("destacada");
  const inputImagenUrl = document.getElementById("imagenUrl");
  const inputArchivo = document.getElementById("inputArchivo");
  const imgMiniatura = document.getElementById("imgMiniatura");

  // Elementos de vista previa
  const panelPrevia = document.getElementById("panelPrevia");
  const previaCategoria = document.getElementById("previaCategoria");
  const previaDestacada = document.getElementById("previaDestacada");
  const previaEstado = document.getElementById("previaEstado");
  const previaTitulo = document.getElementById("previaTitulo");
  const previaResumen = document.getElementById("previaResumen");
  const previaImg = document.getElementById("previaImg");
  const previaCuerpo = document.getElementById("previaCuerpo");

  const actualizarPreviaEnVivo = () => {
    noticiaActual.titulo = inputTitulo.value.trim();
    noticiaActual.resumen = inputResumen.value.trim();
    noticiaActual.cuerpo = inputCuerpo.value.trim();
    noticiaActual.categoria = selectCategoria.value;
    noticiaActual.temaId = selectTemaId.value || null;
    noticiaActual.estado = selectEstado.value;
    noticiaActual.destacada = checkDestacada.checked;
    noticiaActual.imagen = inputImagenUrl.value.trim();

    if (previaCategoria) previaCategoria.textContent = noticiaActual.categoria;
    if (previaDestacada) previaDestacada.style.display = noticiaActual.destacada ? "inline-block" : "none";
    if (previaEstado) previaEstado.textContent = noticiaActual.estado;
    if (previaTitulo) previaTitulo.textContent = noticiaActual.titulo || "Título de la noticia";
    if (previaResumen) previaResumen.textContent = noticiaActual.resumen || "Resumen de la noticia...";
    if (previaImg) {
      if (noticiaActual.imagen) {
        previaImg.src = noticiaActual.imagen;
        previaImg.style.display = "block";
      } else {
        previaImg.style.display = "none";
      }
    }
    if (previaCuerpo) {
      previaCuerpo.innerHTML = util.formatoBasico(noticiaActual.cuerpo || "Cuerpo de la noticia...");
    }
  };

  inputResumen.addEventListener("input", () => {
    const restante = 200 - inputResumen.value.length;
    contadorResumen.textContent = `${restante} caracteres restantes`;
    actualizarPreviaEnVivo();
  });

  inputTitulo.addEventListener("input", actualizarPreviaEnVivo);
  inputCuerpo.addEventListener("input", actualizarPreviaEnVivo);
  selectCategoria.addEventListener("change", actualizarPreviaEnVivo);
  selectTemaId.addEventListener("change", actualizarPreviaEnVivo);
  selectEstado.addEventListener("change", actualizarPreviaEnVivo);
  checkDestacada.addEventListener("change", actualizarPreviaEnVivo);

  inputImagenUrl.addEventListener("input", () => {
    const url = inputImagenUrl.value.trim();
    if (url) {
      imgMiniatura.src = url;
      imgMiniatura.style.display = "block";
    } else {
      imgMiniatura.style.display = "none";
    }
    actualizarPreviaEnVivo();
  });

  inputArchivo.addEventListener("change", async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    try {
      ui.cargando(true);
      const res = await api.subir(archivo);
      if (res && res.url) {
        inputImagenUrl.value = res.url;
        imgMiniatura.src = res.url;
        imgMiniatura.style.display = "block";
        actualizarPreviaEnVivo();
        ui.aviso("Imagen subida con éxito", "exito");
      }
    } catch (err) {
      ui.aviso("Error al subir imagen: " + err.message, "error");
    } finally {
      ui.cargando(false);
    }
  });

  document.getElementById("btnAlternarPrevia").addEventListener("click", () => {
    mostrarPrevia = !mostrarPrevia;
    const paneles = document.querySelector(".editor-noticia__paneles");
    if (paneles) paneles.classList.toggle("con-previa", mostrarPrevia);
    if (panelPrevia) panelPrevia.style.display = mostrarPrevia ? "block" : "none";
    document.getElementById("btnAlternarPrevia").textContent = mostrarPrevia
      ? "Ocultar vista previa"
      : "Vista previa";
    if (mostrarPrevia) actualizarPreviaEnVivo();
  });

  const guardar = async () => {
    actualizarPreviaEnVivo();

    if (!noticiaActual.titulo) {
      ui.aviso("El título es obligatorio", "error");
      inputTitulo.focus();
      return;
    }

    if (!noticiaActual.resumen) {
      ui.aviso("El resumen es obligatorio", "error");
      inputResumen.focus();
      return;
    }

    if (noticiaActual.resumen.length > 200) {
      ui.aviso("El resumen no puede superar los 200 caracteres", "error");
      inputResumen.focus();
      return;
    }

    if (!noticiaActual.cuerpo) {
      ui.aviso("El cuerpo de la noticia es obligatorio", "error");
      inputCuerpo.focus();
      return;
    }

    try {
      ui.cargando(true);
      const datosParaGuardar = {
        titulo: noticiaActual.titulo,
        resumen: noticiaActual.resumen,
        cuerpo: noticiaActual.cuerpo,
        imagen: noticiaActual.imagen || null,
        categoria: noticiaActual.categoria,
        temaId: noticiaActual.temaId || null,
        destacada: noticiaActual.destacada,
        estado: noticiaActual.estado
      };

      if (noticiaId) {
        await api.actualizar("noticias", noticiaId, datosParaGuardar);
        ui.aviso("Noticia actualizada con éxito", "exito");
      } else {
        await api.crear("noticias", datosParaGuardar);
        ui.aviso("Noticia creada con éxito", "exito");
      }

      setTimeout(() => {
        window.location.href = "/paginas/noticias.html";
      }, 700);
    } catch (err) {
      ui.aviso("Error al guardar: " + err.message, "error");
    } finally {
      ui.cargando(false);
    }
  };

  document.getElementById("btnGuardar").addEventListener("click", guardar);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    guardar();
  });
}

await inicializar();
