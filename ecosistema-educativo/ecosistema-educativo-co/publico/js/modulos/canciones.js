// publico/js/modulos/canciones.js · Reproductor y catálogo de canciones educativas

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Canciones Educativas", roles: ["sesion"] });

const contenido = document.getElementById("contenido");
const usuario = usuarioActual();
const puedeEditar = usuario && (usuario.rol === "docente" || usuario.rol === "admin");

let canciones = [];
let temas = [];
let unidades = [];
let asignaturas = [];

let temaIdFiltro = util.parametro("temaId") || "";
let asignaturaIdFiltro = "";
let cancionSeleccionadaId = null;

// Estado del reproductor
let audioEl = null;
let estaReproduciendo = false;
let lrcParseado = [];
let indiceLrcActivo = -1;
let tiempoArrastrando = false;

export function parsearLRC(lrcTexto) {
  if (!lrcTexto) return [];
  const lineas = lrcTexto.split(/\r?\n/);
  const resultado = [];
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const linea of lineas) {
    const coincidencias = [...linea.matchAll(regex)];
    if (coincidencias.length === 0) continue;

    const texto = linea.replace(regex, "").trim();

    for (const match of coincidencias) {
      const min = parseInt(match[1], 10);
      const seg = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      }
      const tiempoSegundos = min * 60 + seg + ms / 1000;
      resultado.push({ tiempo: tiempoSegundos, texto });
    }
  }

  resultado.sort((a, b) => a.tiempo - b.tiempo);
  return resultado;
}

function formatoTiempo(segundos) {
  if (isNaN(segundos) || segundos < 0) return "00:00";
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function inicializar() {
  ui.cargando(true);
  try {
    const [listaCanciones, listaTemas, listaUnidades, listaAsignaturas] = await Promise.all([
      api.listar("canciones"),
      api.listar("temas"),
      api.listar("unidades"),
      api.listar("asignaturas")
    ]);

    canciones = Array.isArray(listaCanciones) ? listaCanciones : [];
    temas = Array.isArray(listaTemas) ? listaTemas : [];
    unidades = Array.isArray(listaUnidades) ? listaUnidades : [];
    asignaturas = Array.isArray(listaAsignaturas) ? listaAsignaturas : [];

    // Si viene temaId por URL, encontrar su asignatura para prefiltrar
    if (temaIdFiltro) {
      const temaEncontrado = temas.find((t) => t.id === temaIdFiltro);
      if (temaEncontrado) {
        const unidad = unidades.find((u) => u.id === temaEncontrado.unidadId);
        if (unidad) {
          asignaturaIdFiltro = unidad.asignaturaId;
        }
      }
    }

    // Seleccionar la primera canción disponible
    const filtradas = obtenerCancionesFiltradas();
    if (filtradas.length > 0) {
      cancionSeleccionadaId = filtradas[0].id;
    }
  } catch (err) {
    ui.aviso("Error al cargar canciones: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }

  renderizar();
}

function obtenerCancionesFiltradas() {
  const mapaUnidades = new Map(unidades.map((u) => [u.id, u.asignaturaId]));
  const mapaTemas = new Map(temas.map((t) => [t.id, mapaUnidades.get(t.unidadId)]));

  return canciones.filter((c) => {
    if (temaIdFiltro && c.temaId !== temaIdFiltro) return false;
    if (asignaturaIdFiltro) {
      const asigId = mapaTemas.get(c.temaId);
      if (asigId !== asignaturaIdFiltro) return false;
    }
    return true;
  });
}

function renderizar() {
  const mapaUnidades = new Map(unidades.map((u) => [u.id, u]));
  const mapaAsignaturas = new Map(asignaturas.map((a) => [a.id, a.nombre]));
  const mapaTemas = new Map(temas.map((t) => [t.id, t]));

  // Opciones de asignaturas
  const opcionesAsignaturas = asignaturas
    .map(
      (a) =>
        `<option value="${a.id}" ${asignaturaIdFiltro === a.id ? "selected" : ""}>${ui.escapar(a.nombre)}</option>`
    )
    .join("");

  // Temas filtrados por la asignatura seleccionada (si aplica)
  const temasDisponibles = temas.filter((t) => {
    if (!asignaturaIdFiltro) return true;
    const u = mapaUnidades.get(t.unidadId);
    return u && u.asignaturaId === asignaturaIdFiltro;
  });

  const opcionesTemas = temasDisponibles
    .map(
      (t) =>
        `<option value="${t.id}" ${temaIdFiltro === t.id ? "selected" : ""}>${ui.escapar(t.titulo)}</option>`
    )
    .join("");

  const filtradas = obtenerCancionesFiltradas();
  if (cancionSeleccionadaId && !filtradas.some((c) => c.id === cancionSeleccionadaId)) {
    cancionSeleccionadaId = filtradas.length > 0 ? filtradas[0].id : null;
  } else if (!cancionSeleccionadaId && filtradas.length > 0) {
    cancionSeleccionadaId = filtradas[0].id;
  }

  const cancionActual = canciones.find((c) => c.id === cancionSeleccionadaId);

  // Lista de canciones html
  let listaHtml = "";
  if (filtradas.length === 0) {
    listaHtml = `
      <div class="canciones__vacio">
        <p style="margin: 0; font-size: var(--tamano-s);">No hay canciones para los filtros seleccionados.</p>
      </div>
    `;
  } else {
    listaHtml = `
      <div class="canciones__lista">
        ${filtradas
          .map((c) => {
            const esActiva = c.id === cancionSeleccionadaId;
            const t = mapaTemas.get(c.temaId);
            return `
              <button type="button" class="cancion-item ${esActiva ? "cancion-item--activa" : ""}" data-id="${c.id}">
                <div class="cancion-item__titulo">${ui.escapar(c.titulo)}</div>
                <div class="cancion-item__tema">📚 ${ui.escapar(t ? t.titulo : "Tema")}</div>
                <div class="cancion-item__autoria">Por: ${ui.escapar(c.autoria || "Anónimo")}</div>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  // Panel principal (reproductor y letra)
  let panelPrincipalHtml = "";
  if (!cancionActual) {
    panelPrincipalHtml = `
      <div class="canciones__panel-principal">
        <p class="h3" style="color: var(--texto-secundario); text-align: center; margin: var(--espacio-xl) 0;">
          Selecciona una canción para escucharla y ver su letra
        </p>
      </div>
    `;
  } else {
    const t = mapaTemas.get(cancionActual.temaId);
    lrcParseado = cancionActual.lrc ? parsearLRC(cancionActual.lrc) : [];
    indiceLrcActivo = -1;

    let panelLetraHtml = "";
    if (lrcParseado.length > 0) {
      panelLetraHtml = `
        <div class="panel-letra__contenedor" id="contenedorLrc">
          ${lrcParseado
            .map(
              (l, idx) => `
              <div class="letra-linea" data-idx="${idx}" data-tiempo="${l.tiempo}">
                ${ui.escapar(l.texto || "♪ ♪ ♪")}
              </div>
            `
            )
            .join("")}
        </div>
      `;
    } else {
      panelLetraHtml = `
        <div class="panel-letra__contenedor">
          <pre class="letra-plana">${ui.escapar(cancionActual.letra || "Letra no disponible")}</pre>
        </div>
      `;
    }

    panelPrincipalHtml = `
      <div class="canciones__panel-principal">
        <div class="reproductor-cabecera">
          <div>
            <div class="fila" style="gap: var(--espacio-xs); margin-bottom: var(--espacio-xs);">
              <span class="insignia insignia--primario">🎵 Canción</span>
              <span class="insignia insignia--secundario">${ui.escapar(cancionActual.licencia || "Propia")}</span>
            </div>
            <h2 class="h3" style="margin-bottom: var(--espacio-xs);">${ui.escapar(cancionActual.titulo)}</h2>
            <div style="font-size: var(--tamano-s); color: var(--texto-secundario);">
              <span>Tema: <strong>${ui.escapar(t ? t.titulo : "")}</strong></span>
              <span> &bull; </span>
              <span>Autoría: <strong>${ui.escapar(cancionActual.autoria)}</strong></span>
            </div>
          </div>
          ${
            puedeEditar
              ? `<a href="/paginas/editor-cancion.html?id=${cancionActual.id}" class="btn btn--secundario btn--pequeno">Editar canción</a>`
              : ""
          }
        </div>

        <!-- Reproductor de audio propio -->
        <div class="reproductor-audio" role="region" aria-label="Reproductor de música">
          <audio id="audioReproductor" src="${ui.escapar(cancionActual.audio)}" preload="metadata"></audio>

          <div class="reproductor-audio__barra-fila">
            <span class="reproductor-audio__tiempo" id="tiempoActual">00:00</span>
            <input type="range" class="reproductor-audio__progreso" id="barraProgreso" min="0" max="100" value="0" step="0.1" aria-label="Progreso del audio">
            <span class="reproductor-audio__tiempo" id="tiempoTotal">00:00</span>
          </div>

          <div class="reproductor-audio__controles-fila">
            <div class="fila" style="gap: var(--espacio-s); align-items: center;">
              <button type="button" class="btn btn--primario reproductor-audio__boton-reproducir" id="btnPlayPause" aria-label="Reproducir audio">
                ▶
              </button>
              <button type="button" class="btn btn--secundario btn--pequeno" id="btnRetroceder" aria-label="Retroceder 5 segundos" title="Retroceder 5s">
                -5s
              </button>
              <button type="button" class="btn btn--secundario btn--pequeno" id="btnAdelantar" aria-label="Adelantar 5 segundos" title="Adelantar 5s">
                +5s
              </button>
            </div>

            <div class="reproductor-audio__volumen-grupo">
              <button type="button" class="btn btn--texto btn--pequeno" id="btnMute" aria-label="Silenciar">
                🔊
              </button>
              <input type="range" class="reproductor-audio__volumen-slider" id="controlVolumen" min="0" max="1" step="0.05" value="1" aria-label="Control de volumen">
            </div>
          </div>
        </div>

        <!-- Panel de letra -->
        <div class="panel-letra">
          <div class="fila" style="justify-content: space-between; align-items: center;">
            <h3 class="h4" style="margin: 0;">Letra de la canción</h3>
            ${
              lrcParseado.length > 0
                ? `<span class="insignia insignia--acento" style="font-size: var(--tamano-xs);">✨ Sincronizada</span>`
                : ""
            }
          </div>
          ${panelLetraHtml}
        </div>
      </div>
    `;
  }

  contenido.innerHTML = `
    <div class="canciones">
      <div class="canciones__cabecera">
        <div>
          <h1 class="h2">Canciones Educativas</h1>
          <p style="color: var(--texto-secundario); font-size: var(--tamano-s);">
            Aprende conceptos clave a través de la música y letras sincronizadas.
          </p>
        </div>
        ${
          puedeEditar
            ? `<a href="/paginas/editor-cancion.html" class="btn btn--primario">+ Nueva canción</a>`
            : ""
        }
      </div>

      <div class="canciones__filtros">
        <div class="canciones__filtros-campo">
          <label for="filtroAsignatura" class="etiqueta" style="margin-bottom: 0;">Asignatura:</label>
          <select id="filtroAsignatura" class="select" style="min-width: 180px;">
            <option value="">Todas las asignaturas</option>
            ${opcionesAsignaturas}
          </select>
        </div>

        <div class="canciones__filtros-campo">
          <label for="filtroTema" class="etiqueta" style="margin-bottom: 0;">Tema:</label>
          <select id="filtroTema" class="select" style="min-width: 200px;">
            <option value="">Todos los temas</option>
            ${opcionesTemas}
          </select>
        </div>

        ${
          asignaturaIdFiltro || temaIdFiltro
            ? `<button type="button" class="btn btn--texto btn--pequeno" id="btnLimpiarFiltros" style="color: var(--peligro);">
                Limpiar filtros
              </button>`
            : ""
        }
      </div>

      <div class="canciones__contenedor">
        <aside aria-label="Catálogo de canciones">
          ${listaHtml}
        </aside>

        <section aria-label="Reproductor y letra">
          ${panelPrincipalHtml}
        </section>
      </div>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const selAsig = document.getElementById("filtroAsignatura");
  const selTema = document.getElementById("filtroTema");
  const btnLimpiar = document.getElementById("btnLimpiarFiltros");

  if (selAsig) {
    selAsig.addEventListener("change", (e) => {
      asignaturaIdFiltro = e.target.value;
      temaIdFiltro = "";
      renderizar();
    });
  }

  if (selTema) {
    selTema.addEventListener("change", (e) => {
      temaIdFiltro = e.target.value;
      renderizar();
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      asignaturaIdFiltro = "";
      temaIdFiltro = "";
      renderizar();
    });
  }

  // Selección de canciones en la lista
  document.querySelectorAll(".cancion-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (id !== cancionSeleccionadaId) {
        cancionSeleccionadaId = id;
        renderizar();
        const reproductor = document.getElementById("audioReproductor");
        if (reproductor) {
          reproductor.play().then(() => {
            actualizarEstadoReproduccion(true);
          }).catch(() => {});
        }
      }
    });
  });

  // Configuración del reproductor de audio
  audioEl = document.getElementById("audioReproductor");
  if (!audioEl) return;

  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnRetroceder = document.getElementById("btnRetroceder");
  const btnAdelantar = document.getElementById("btnAdelantar");
  const barraProgreso = document.getElementById("barraProgreso");
  const tiempoActualEl = document.getElementById("tiempoActual");
  const tiempoTotalEl = document.getElementById("tiempoTotal");
  const btnMute = document.getElementById("btnMute");
  const controlVolumen = document.getElementById("controlVolumen");
  const contenedorLrc = document.getElementById("contenedorLrc");

  function actualizarEstadoReproduccion(reproduciendo) {
    estaReproduciendo = reproduciendo;
    if (btnPlayPause) {
      btnPlayPause.textContent = reproduciendo ? "⏸" : "▶";
      btnPlayPause.setAttribute("aria-label", reproduciendo ? "Pausar audio" : "Reproducir audio");
    }
  }

  btnPlayPause.addEventListener("click", () => {
    if (audioEl.paused) {
      audioEl.play().catch((err) => ui.aviso("Error al reproducir audio: " + err.message, "error"));
    } else {
      audioEl.pause();
    }
  });

  audioEl.addEventListener("play", () => actualizarEstadoReproduccion(true));
  audioEl.addEventListener("pause", () => actualizarEstadoReproduccion(false));
  audioEl.addEventListener("ended", () => {
    actualizarEstadoReproduccion(false);
    if (barraProgreso) barraProgreso.value = 0;
    if (tiempoActualEl) tiempoActualEl.textContent = "00:00";
    desactivarLineasLrc();
  });

  btnRetroceder.addEventListener("click", () => {
    audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
  });

  btnAdelantar.addEventListener("click", () => {
    audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 5);
  });

  audioEl.addEventListener("loadedmetadata", () => {
    if (tiempoTotalEl) tiempoTotalEl.textContent = formatoTiempo(audioEl.duration);
  });

  audioEl.addEventListener("timeupdate", () => {
    if (!tiempoArrastrando && barraProgreso && audioEl.duration) {
      barraProgreso.value = (audioEl.currentTime / audioEl.duration) * 100;
    }
    if (tiempoActualEl) {
      tiempoActualEl.textContent = formatoTiempo(audioEl.currentTime);
    }
    sincronizarLrc(audioEl.currentTime);
  });

  barraProgreso.addEventListener("input", () => {
    tiempoArrastrando = true;
    if (audioEl.duration) {
      const tiempoDestino = (barraProgreso.value / 100) * audioEl.duration;
      if (tiempoActualEl) tiempoActualEl.textContent = formatoTiempo(tiempoDestino);
    }
  });

  barraProgreso.addEventListener("change", () => {
    tiempoArrastrando = false;
    if (audioEl.duration) {
      audioEl.currentTime = (barraProgreso.value / 100) * audioEl.duration;
    }
  });

  controlVolumen.addEventListener("input", (e) => {
    const vol = parseFloat(e.target.value);
    audioEl.volume = vol;
    audioEl.muted = vol === 0;
    if (btnMute) btnMute.textContent = vol === 0 ? "🔇" : "🔊";
  });

  btnMute.addEventListener("click", () => {
    audioEl.muted = !audioEl.muted;
    if (audioEl.muted) {
      btnMute.textContent = "🔇";
      controlVolumen.value = 0;
    } else {
      btnMute.textContent = "🔊";
      controlVolumen.value = audioEl.volume > 0 ? audioEl.volume : 1;
      if (audioEl.volume === 0) audioEl.volume = 1;
    }
  });

  // Clic en líneas LRC para saltar a ese segundo
  if (contenedorLrc) {
    contenedorLrc.querySelectorAll(".letra-linea").forEach((el) => {
      el.addEventListener("click", () => {
        const seg = parseFloat(el.getAttribute("data-tiempo"));
        if (!isNaN(seg)) {
          audioEl.currentTime = seg;
          if (audioEl.paused) {
            audioEl.play().catch(() => {});
          }
        }
      });
    });
  }

  function desactivarLineasLrc() {
    indiceLrcActivo = -1;
    document.querySelectorAll(".letra-linea--activa").forEach((el) => {
      el.classList.remove("letra-linea--activa");
    });
  }

  function sincronizarLrc(tiempoActual) {
    if (!lrcParseado || lrcParseado.length === 0) return;

    let nuevoIndice = -1;
    for (let i = 0; i < lrcParseado.length; i++) {
      if (lrcParseado[i].tiempo <= tiempoActual + 0.15) {
        nuevoIndice = i;
      } else {
        break;
      }
    }

    if (nuevoIndice !== indiceLrcActivo) {
      indiceLrcActivo = nuevoIndice;
      document.querySelectorAll(".letra-linea--activa").forEach((el) => {
        el.classList.remove("letra-linea--activa");
      });

      if (nuevoIndice >= 0) {
        const lineaEl = document.querySelector(`.letra-linea[data-idx="${nuevoIndice}"]`);
        if (lineaEl) {
          lineaEl.classList.add("letra-linea--activa");
          lineaEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }
}
if (contenido) {
  await inicializar();
}
