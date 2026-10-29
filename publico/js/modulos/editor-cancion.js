// publico/js/modulos/editor-cancion.js · Creación y edición de canciones educativas

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Editor de Canción", roles: ["docente", "admin"] });

const contenido = document.getElementById("contenido");
const cancionId = util.parametro("id");
let temas = [];
let unidades = [];
let asignaturas = [];

let cancionActual = {
  titulo: "",
  temaId: "",
  audio: "",
  letra: "",
  lrc: "",
  autoria: "",
  licenciaTipo: "Propia",
  licenciaOtra: ""
};

async function inicializar() {
  ui.cargando(true);
  try {
    const [listaTemas, listaUnidades, listaAsignaturas] = await Promise.all([
      api.listar("temas"),
      api.listar("unidades"),
      api.listar("asignaturas")
    ]);

    temas = Array.isArray(listaTemas) ? listaTemas : [];
    unidades = Array.isArray(listaUnidades) ? listaUnidades : [];
    asignaturas = Array.isArray(listaAsignaturas) ? listaAsignaturas : [];

    if (cancionId) {
      const encontrada = await api.obtener("canciones", cancionId);
      if (encontrada) {
        let licTipo = "Propia";
        let licOtra = "";

        if (encontrada.licencia === "Propia" || encontrada.licencia === "CC BY" || encontrada.licencia === "CC BY-SA") {
          licTipo = encontrada.licencia;
        } else if (encontrada.licencia) {
          licTipo = "Otra";
          licOtra = encontrada.licencia.startsWith("Otra: ")
            ? encontrada.licencia.slice(6)
            : encontrada.licencia;
        }

        cancionActual = {
          titulo: encontrada.titulo || "",
          temaId: encontrada.temaId || "",
          audio: encontrada.audio || "",
          letra: encontrada.letra || "",
          lrc: encontrada.lrc || "",
          autoria: encontrada.autoria || "",
          licenciaTipo: licTipo,
          licenciaOtra: licOtra
        };
      }
    }
  } catch (err) {
    ui.aviso("Error al cargar datos: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }

  renderizar();
}

function renderizar() {
  const mapaUnidades = new Map(unidades.map((u) => [u.id, u]));
  const mapaAsignaturas = new Map(asignaturas.map((a) => [a.id, a.nombre]));

  const opcionesTemas = temas
    .map((t) => {
      const u = mapaUnidades.get(t.unidadId);
      const asigNombre = u && mapaAsignaturas.get(u.asignaturaId) ? `[${mapaAsignaturas.get(u.asignaturaId)}] ` : "";
      const selected = cancionActual.temaId === t.id ? "selected" : "";
      return `<option value="${t.id}" ${selected}>${ui.escapar(asigNombre + t.titulo)}</option>`;
    })
    .join("");

  contenido.innerHTML = `
    <div class="editor-cancion">
      <div class="editor-cancion__cabecera">
        <div>
          <a href="/paginas/canciones.html" class="btn btn--texto btn--pequeno" style="padding-left: 0;">&larr; Volver a Canciones</a>
          <h1 class="h2">${cancionId ? "Editar Canción" : "Nueva Canción"}</h1>
        </div>
        <button type="button" class="btn btn--primario" id="btnGuardar">Guardar canción</button>
      </div>

      <form class="editor-cancion__formulario" id="formCancion">
        <div class="campo">
          <label for="titulo" class="etiqueta">Título de la canción *</label>
          <input type="text" id="titulo" class="input" required value="${ui.escapar(cancionActual.titulo)}" placeholder="Ej: Rap de las tres R">
        </div>

        <div class="campo">
          <label for="temaId" class="etiqueta">Tema pedagógico relacionado *</label>
          <select id="temaId" class="select" required>
            <option value="">-- Selecciona un tema --</option>
            ${opcionesTemas}
          </select>
        </div>

        <div class="campo">
          <label for="audioUrl" class="etiqueta">Archivo de audio MP3 *</label>
          <div class="editor-cancion__subida">
            <input type="url" id="audioUrl" class="input" style="flex: 1; min-width: 240px;" placeholder="https://... o sube un archivo MP3" value="${ui.escapar(cancionActual.audio)}" required>
            <label class="btn btn--secundario" style="cursor: pointer;">
              Subir MP3
              <input type="file" id="inputArchivo" accept="audio/*,.mp3" style="display: none;">
            </label>
          </div>
          <audio id="audioPrevia" class="editor-cancion__audio-previa" controls src="${ui.escapar(cancionActual.audio)}" style="display: ${cancionActual.audio ? "block" : "none"};"></audio>
        </div>

        <div class="fila" style="gap: var(--espacio-m); flex-wrap: wrap;">
          <div class="campo" style="flex: 1; min-width: 220px;">
            <label for="autoria" class="etiqueta">Autoría *</label>
            <input type="text" id="autoria" class="input" required value="${ui.escapar(cancionActual.autoria)}" placeholder="Ej: Docente Juan Pérez / UNEMI">
          </div>

          <div class="campo" style="flex: 1; min-width: 220px;">
            <label for="licenciaTipo" class="etiqueta">Licencia *</label>
            <select id="licenciaTipo" class="select" required>
              <option value="Propia" ${cancionActual.licenciaTipo === "Propia" ? "selected" : ""}>Propia</option>
              <option value="CC BY" ${cancionActual.licenciaTipo === "CC BY" ? "selected" : ""}>Creative Commons BY (CC BY)</option>
              <option value="CC BY-SA" ${cancionActual.licenciaTipo === "CC BY-SA" ? "selected" : ""}>Creative Commons BY-SA (CC BY-SA)</option>
              <option value="Otra" ${cancionActual.licenciaTipo === "Otra" ? "selected" : ""}>Otra</option>
            </select>
          </div>
        </div>

        <div class="campo" id="campoLicenciaOtra" style="display: ${cancionActual.licenciaTipo === "Otra" ? "block" : "none"};">
          <label for="licenciaOtra" class="etiqueta">Descripción de la licencia *</label>
          <input type="text" id="licenciaOtra" class="input" value="${ui.escapar(cancionActual.licenciaOtra)}" placeholder="Especifica los términos o tipo de licencia">
        </div>

        <div class="campo">
          <label for="letra" class="etiqueta">Letra completa *</label>
          <div class="editor-cancion__ayuda">Texto de la canción estructurado en estrofas.</div>
          <textarea id="letra" class="input" rows="8" placeholder="Escribe aquí la letra de la canción..." required>${ui.escapar(cancionActual.letra)}</textarea>
        </div>

        <div class="campo">
          <label for="lrc" class="etiqueta">Letra sincronizada LRC (opcional)</label>
          <div class="editor-cancion__ayuda">Formato estándar [mm:ss.xx] Texto. Permite resaltar la línea activa al reproducir.</div>
          <textarea id="lrc" class="input" rows="6" placeholder="[00:05.10] Primera estrofa sincronizada&#10;[00:10.50] Segunda estrofa sincronizada">${ui.escapar(cancionActual.lrc)}</textarea>
        </div>
      </form>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const form = document.getElementById("formCancion");
  const inputTitulo = document.getElementById("titulo");
  const selectTemaId = document.getElementById("temaId");
  const inputAudioUrl = document.getElementById("audioUrl");
  const inputArchivo = document.getElementById("inputArchivo");
  const audioPrevia = document.getElementById("audioPrevia");
  const inputAutoria = document.getElementById("autoria");
  const selectLicenciaTipo = document.getElementById("licenciaTipo");
  const campoLicenciaOtra = document.getElementById("campoLicenciaOtra");
  const inputLicenciaOtra = document.getElementById("licenciaOtra");
  const inputLetra = document.getElementById("letra");
  const inputLrc = document.getElementById("lrc");

  inputAudioUrl.addEventListener("input", () => {
    const url = inputAudioUrl.value.trim();
    if (url) {
      audioPrevia.src = url;
      audioPrevia.style.display = "block";
    } else {
      audioPrevia.style.display = "none";
    }
  });

  inputArchivo.addEventListener("change", async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    try {
      ui.cargando(true);
      const res = await api.subir(archivo);
      if (res && res.url) {
        inputAudioUrl.value = res.url;
        audioPrevia.src = res.url;
        audioPrevia.style.display = "block";
        ui.aviso("Audio MP3 subido con éxito", "exito");
      }
    } catch (err) {
      ui.aviso("Error al subir archivo de audio: " + err.message, "error");
    } finally {
      ui.cargando(false);
    }
  });

  selectLicenciaTipo.addEventListener("change", () => {
    campoLicenciaOtra.style.display = selectLicenciaTipo.value === "Otra" ? "block" : "none";
  });

  const guardar = async () => {
    const titulo = inputTitulo.value.trim();
    const temaId = selectTemaId.value;
    const audio = inputAudioUrl.value.trim();
    const autoria = inputAutoria.value.trim();
    const licTipo = selectLicenciaTipo.value;
    const licOtra = inputLicenciaOtra.value.trim();
    const letra = inputLetra.value.trim();
    const lrc = inputLrc.value.trim();

    if (!titulo) {
      ui.aviso("El título es obligatorio", "error");
      inputTitulo.focus();
      return;
    }

    if (!temaId) {
      ui.aviso("Debes seleccionar un tema pedagógico", "error");
      selectTemaId.focus();
      return;
    }

    if (!audio) {
      ui.aviso("El archivo de audio es obligatorio", "error");
      inputAudioUrl.focus();
      return;
    }

    if (!autoria) {
      ui.aviso("La autoría es obligatoria", "error");
      inputAutoria.focus();
      return;
    }

    let licenciaFinal = licTipo;
    if (licTipo === "Otra") {
      if (!licOtra) {
        ui.aviso("Debes especificar la descripción de la licencia", "error");
        inputLicenciaOtra.focus();
        return;
      }
      licenciaFinal = `Otra: ${licOtra}`;
    }

    if (!letra) {
      ui.aviso("La letra de la canción es obligatoria", "error");
      inputLetra.focus();
      return;
    }

    const datosGuardar = {
      titulo,
      temaId,
      audio,
      letra,
      lrc: lrc || null,
      autoria,
      licencia: licenciaFinal
    };

    try {
      ui.cargando(true);
      if (cancionId) {
        await api.actualizar("canciones", cancionId, datosGuardar);
        ui.aviso("Canción actualizada con éxito", "exito");
      } else {
        await api.crear("canciones", datosGuardar);
        ui.aviso("Canción creada con éxito", "exito");
      }

      setTimeout(() => {
        window.location.href = `/paginas/canciones.html?temaId=${encodeURIComponent(temaId)}`;
      }, 700);
    } catch (err) {
      ui.aviso("Error al guardar canción: " + err.message, "error");
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
