// publico/js/modulos/tema.js · Vista de estudio de un tema para estudiantes y docentes

import { montarPlantilla } from "../nucleo/plantilla.js";
import { parametro, formatoBasico } from "../nucleo/util.js";
import { usuarioActual } from "../nucleo/sesion.js";
import { ACTIVIDADES } from "../nucleo/catalogo-actividades.js";
import { registrarIntento } from "../nucleo/gamificacion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Tema", roles: ["estudiante", "docente"] });

const contenido = document.getElementById("contenido");
const temaId = parametro("id");

function obtenerEmbedVideo(url) {
  if (!url) return null;
  // YouTube
  const matchYt = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (matchYt && matchYt[1]) {
    return `https://www.youtube-nocookie.com/embed/${matchYt[1]}`;
  }
  // Vimeo
  const matchVimeo = url.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|)(\d+)/i
  );
  if (matchVimeo && matchVimeo[1]) {
    return `https://player.vimeo.com/video/${matchVimeo[1]}`;
  }
  // Canva link o diseño oficial embebible
  if (url.includes("canva.link/wg8ok4mz50odujq") || url.includes("DAHXlWC-aCo")) {
    return "https://www.canva.com/design/DAHXlWC-aCo/1Jtlhz8sXSxPmI9QjSs1gQ/view?embed";
  }
  if (url.includes("canva.com/design/")) {
    if (url.includes("?embed") || url.includes("&embed")) return url;
    const matchCanva = url.match(/canva\.com\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?/i);
    if (matchCanva) {
      const dId = matchCanva[1];
      const tok = matchCanva[2];
      return tok
        ? `https://www.canva.com/design/${dId}/${tok}/view?embed`
        : `https://www.canva.com/design/${dId}/view?embed`;
    }
  }
  if (url.includes("canva.link") || url.includes("canva.com")) {
    return url;
  }
  return null;
}

function obtenerEmbedDrive(url) {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

async function inicializar() {
  if (!temaId) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Identificador no encontrado:</strong> No se ha especificado un ID de tema en la URL.</div>
      </div>
      <a href="/paginas/asignaturas.html" class="btn btn--secundario" style="margin-top: var(--espacio-m);">
        ← Volver a Mis Asignaturas
      </a>
    `;
    return;
  }

  try {
    ui.cargando(true);

    const tema = await api.obtener("temas", temaId);

    // Guardar en localStorage el último tema consultado
    try {
      localStorage.setItem(
        "ultimoTema",
        JSON.stringify({ id: tema.id, titulo: tema.titulo })
      );
    } catch {}

    // Obtener unidad y asignatura para las migas de pan
    const unidad = tema.unidadId ? await api.obtener("unidades", tema.unidadId) : null;
    const asignatura = unidad && unidad.asignaturaId ? await api.obtener("asignaturas", unidad.asignaturaId) : null;

    // Obtener progreso del usuario
    const progresos = await api.listar("progreso-temas");
    const usuario = usuarioActual();
    let estaRevisado = progresos.some(
      (p) => p.temaId === tema.id && (!usuario || p.usuarioId === usuario.id)
    );

    document.title = `${tema.titulo} · Ecosistema Educativo`;

    contenido.innerHTML = `
      <div class="tema-estudio-layout pila">
        <!-- Migas de pan -->
        <nav class="migas-pan" aria-label="Ruta de navegación">
          <a href="/paginas/asignaturas.html">Mis asignaturas</a>
          <span>/</span>
          ${
            asignatura
              ? `<a href="/paginas/asignatura.html?id=${encodeURIComponent(asignatura.id)}">${ui.escapar(asignatura.nombre)}</a><span>/</span>`
              : ""
          }
          <span>${ui.escapar(tema.titulo)}</span>
        </nav>

        <!-- Cabecera Hero del tema -->
        <header class="tema-hero">
          <div class="tema-hero__cabecera">
            <div class="pila pila--xs">
              <span class="insignia insignia--secundario" style="align-self: flex-start;">
                Tema ${tema.orden || ""}
              </span>
              <h1 style="color: var(--primario); margin: 0;">${ui.escapar(tema.titulo)}</h1>
              ${
                asignatura
                  ? `<small style="color: var(--texto-suave);">${ui.escapar(asignatura.nombre)} · Unidad ${unidad?.orden || ""}</small>`
                  : ""
              }
            </div>

            <div id="contenedorBotonRevisado">
              ${
                estaRevisado
                  ? `<button type="button" class="btn btn--secundario" disabled>Revisado ✓</button>`
                  : `<button type="button" class="btn btn--primario" id="btnMarcarRevisado">Marcar como revisado</button>`
              }
            </div>
          </div>
        </header>

        <!-- Objetivos de Aprendizaje -->
        ${
          Array.isArray(tema.objetivos) && tema.objetivos.length > 0
            ? `
          <section class="tema-seccion">
            <h2>Objetivos de Aprendizaje</h2>
            <ul style="padding-left: var(--espacio-l); line-height: var(--interlineado-relajado);">
              ${tema.objetivos.map((o) => `<li>${ui.escapar(o)}</li>`).join("")}
            </ul>
          </section>
        `
            : ""
        }

        <!-- Resumen Teórico -->
        <section class="tema-seccion">
          <h2>Fundamentos Teóricos</h2>
          <div class="tema-resumen-cuerpo">
            ${formatoBasico(tema.resumen || "*(Contenido en desarrollo)*")}
          </div>
        </section>

        <!-- Ejemplos Prácticos -->
        ${
          Array.isArray(tema.ejemplos) && tema.ejemplos.length > 0
            ? `
          <section class="tema-seccion">
            <h2>Ejemplos de Aplicación</h2>
            <ul style="padding-left: var(--espacio-l); line-height: var(--interlineado-relajado);">
              ${tema.ejemplos.map((e) => `<li>${ui.escapar(e)}</li>`).join("")}
            </ul>
          </section>
        `
            : ""
        }

        <!-- Recursos Multimedia y Didácticos -->
        ${
          Array.isArray(tema.recursos) && tema.recursos.length > 0
            ? `
          <section class="tema-seccion">
            <h2>Recursos Complementarios</h2>
            <div class="recursos-contenedor">
              ${tema.recursos
                .map((rec, index) => {
                  // 1. Placeholder para video
                  if (rec.tipo === "video-placeholder") {
                    return `
                    <div class="recurso-card-vista recurso-card-vista--placeholder">
                      <div class="recurso-placeholder-icono" aria-hidden="true">📹</div>
                      <div class="pila pila--xs" style="text-align: center;">
                        <h3 style="margin: 0; color: var(--primario); font-size: var(--tamano-m);">${ui.escapar(rec.titulo || "Video explicativo")}</h3>
                        <p style="margin: 0; font-size: var(--tamano-s); color: var(--texto-suave);">
                          ${ui.escapar(rec.descripcion || "Sección preparada: Próximamente estará disponible el video explicativo de este tema.")}
                        </p>
                      </div>
                    </div>
                  `;
                  }

                  // 2. Podcast o Google Drive Preview
                  const embedDrive = obtenerEmbedDrive(rec.url);
                  if (rec.tipo === "podcast" || embedDrive) {
                    return `
                    <div class="recurso-card-vista">
                      <div class="fila" style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--espacio-xs);">
                        <div class="fila" style="align-items: center; gap: var(--espacio-xs);">
                          <span style="font-size: 1.3rem;">🎙️</span>
                          <strong>${ui.escapar(rec.titulo || "Micro Podcast")}</strong>
                        </div>
                        <a href="${ui.escapar(rec.url)}" target="_blank" rel="noopener noreferrer" class="btn btn--texto btn--pequeno">
                          Abrir en Google Drive ↗
                        </a>
                      </div>
                      <div class="recurso-podcast-embed">
                        <iframe
                          src="${ui.escapar(embedDrive || rec.url)}"
                          title="${ui.escapar(rec.titulo || "Reproductor de Podcast")}"
                          allow="autoplay"
                          loading="lazy">
                        </iframe>
                      </div>
                    </div>
                  `;
                  }

                  // 3. Juego educativo interactivo (con botón de pantalla completa)
                  if (rec.tipo === "juego" || (rec.url && (rec.url.includes("netlify.app") || rec.url.includes("guardianes")))) {
                    const frameId = `frame-juego-${index}`;
                    const urlIframe = (rec.url && rec.url.includes("cute-zabaione-72c640.netlify.app"))
                      ? "/recursos/guardianes/index.html"
                      : rec.url;
                    const urlExterna = rec.enlaceExterno || (rec.url.startsWith("/") ? "https://cute-zabaione-72c640.netlify.app" : rec.url);
                    return `
                    <div class="recurso-card-vista recurso-juego-card">
                      <div class="fila" style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--espacio-xs);">
                        <div class="fila" style="align-items: center; gap: var(--espacio-xs);">
                          <span style="font-size: 1.5rem;">🎮</span>
                          <div>
                            <strong style="color: var(--primario); font-size: var(--tamano-m); display: block;">${ui.escapar(rec.titulo || "Juego Educativo · Guardianes del Planeta")}</strong>
                            <small style="color: var(--texto-suave);">Misión interactiva de reciclaje y cuidado ambiental</small>
                          </div>
                        </div>
                        <div class="fila" style="gap: var(--espacio-xs);">
                          <button type="button" class="btn btn--primario btn--pequeno btn-pantalla-completa" data-frame-id="${frameId}">
                            ⛶ Jugar en pantalla completa
                          </button>
                          <a href="${ui.escapar(urlExterna)}" target="_blank" rel="noopener noreferrer" class="btn btn--secundario btn--pequeno">
                            Abrir en ventana nueva ↗
                          </a>
                        </div>
                      </div>
                      <div class="recurso-juego-embed" id="contenedor-${frameId}">
                        <iframe
                          id="${frameId}"
                          src="${ui.escapar(urlIframe)}"
                          title="${ui.escapar(rec.titulo || "Juego Educativo · Guardianes del Planeta")}"
                          allow="fullscreen; autoplay"
                          allowfullscreen
                          loading="lazy">
                        </iframe>
                      </div>
                    </div>
                  `;
                  }

                  // 4. Recurso interactivo (ej. Canva site)
                  if (rec.tipo === "interactivo" || (rec.url && rec.url.includes("canva.site"))) {
                    const urlIframe = (rec.url && (rec.url.includes("reciclaje-y-manejo-adecuado-de-residuos.my.canva.site") || rec.url === "/api/proxy/canva-site"))
                      ? "/api/proxy/canva-site"
                      : rec.url;
                    const urlExterna = rec.enlaceExterno || (rec.url.startsWith("/") ? "https://reciclaje-y-manejo-adecuado-de-residuos.my.canva.site" : rec.url);
                    return `
                    <div class="recurso-card-vista">
                      <div class="fila" style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--espacio-xs);">
                        <div class="fila" style="align-items: center; gap: var(--espacio-xs);">
                          <span style="font-size: 1.3rem;">🌐</span>
                          <strong>${ui.escapar(rec.titulo || "Recurso Interactivo")}</strong>
                        </div>
                        <a href="${ui.escapar(urlExterna)}" target="_blank" rel="noopener noreferrer" class="btn btn--secundario btn--pequeno">
                          Abrir en ventana nueva ↗
                        </a>
                      </div>
                      <div class="recurso-interactivo-embed">
                        <iframe
                          src="${ui.escapar(urlIframe)}"
                          title="${ui.escapar(rec.titulo || "Recurso interactivo")}"
                          allow="fullscreen"
                          allowfullscreen
                          loading="lazy">
                        </iframe>
                      </div>
                    </div>
                  `;
                  }

                  // 5. Video (Canva link, YouTube, Vimeo, etc.)
                  const embedVideo = rec.tipo === "video" ? (obtenerEmbedVideo(rec.url) || rec.url) : null;
                  const urlVideoExterna = rec.enlaceExterno || (rec.url.includes("view?embed") ? "https://canva.link/wg8ok4mz50odujq" : rec.url);
                  if (embedVideo) {
                    return `
                    <div class="recurso-card-vista">
                      <div class="fila" style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--espacio-xs);">
                        <div class="fila" style="align-items: center; gap: var(--espacio-xs);">
                          <span style="font-size: 1.3rem;">🎬</span>
                          <strong>${ui.escapar(rec.titulo || "Video explicativo")}</strong>
                        </div>
                        <a href="${ui.escapar(urlVideoExterna)}" target="_blank" rel="noopener noreferrer" class="btn btn--texto btn--pequeno">
                          Abrir enlace ↗
                        </a>
                      </div>
                      <div class="recurso-video-embed">
                        <iframe
                          src="${ui.escapar(embedVideo)}"
                          title="${ui.escapar(rec.titulo || "Video educativo")}"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowfullscreen
                          loading="lazy">
                        </iframe>
                      </div>
                    </div>
                  `;
                  }

                  // 6. PDF
                  if (rec.tipo === "pdf") {
                    return `
                    <div class="recurso-card-vista fila" style="justify-content: space-between; align-items: center;">
                      <div>
                        <strong>📄 ${ui.escapar(rec.titulo || "Documento PDF")}</strong>
                      </div>
                      <a href="${ui.escapar(rec.url)}" target="_blank" rel="noopener noreferrer" class="btn btn--secundario btn--pequeno">
                        Abrir PDF ↗
                      </a>
                    </div>
                  `;
                  }

                  // 7. Imagen
                  if (rec.tipo === "imagen") {
                    return `
                    <div class="recurso-card-vista">
                      <figure class="recurso-imagen">
                        <img src="${ui.escapar(rec.url)}" alt="${ui.escapar(rec.titulo || "Imagen didáctica del tema")}" loading="lazy" />
                        ${rec.titulo ? `<figcaption style="font-size: var(--tamano-xs); color: var(--texto-suave); margin-top: var(--espacio-xs);">${ui.escapar(rec.titulo)}</figcaption>` : ""}
                      </figure>
                    </div>
                  `;
                  }

                  // 8. Enlace genérico
                  return `
                  <div class="recurso-card-vista fila" style="justify-content: space-between; align-items: center;">
                    <div>
                      <strong>🔗 ${ui.escapar(rec.titulo || "Enlace de interés")}</strong>
                    </div>
                    <a href="${ui.escapar(rec.url)}" target="_blank" rel="noopener noreferrer" class="btn btn--texto btn--pequeno">
                      Visitar recurso ↗
                    </a>
                  </div>
                `;
                })
                .join("")}
            </div>
          </section>
        `
            : ""
        }

        <!-- Bloque: Practica este tema -->
        <section class="tema-seccion">
          <h2>Practica este tema</h2>
          <div id="bloquePractica">
            ${
              ACTIVIDADES && ACTIVIDADES.length > 0
                ? `
              <div class="actividades-grid">
                ${ACTIVIDADES.map(
                  (act) => `
                  <a href="${act.href}?temaId=${encodeURIComponent(tema.id)}" class="tarjeta tarjeta--interactiva" style="text-decoration: none; color: inherit;">
                    <div class="tarjeta__cabecera">
                      <h3 style="font-size: var(--tamano-m); margin: 0; color: var(--primario);">${ui.escapar(act.texto)}</h3>
                    </div>
                    <p style="font-size: var(--tamano-s); color: var(--texto-suave); margin: 0;">${ui.escapar(act.descripcion || "Practica y consolida tus conocimientos.")}</p>
                    <span style="color: var(--acento); font-size: var(--tamano-xs); font-weight: var(--peso-negrita);">Comenzar actividad →</span>
                  </a>
                `
                ).join("")}
              </div>
            `
                : `
              <div class="alerta alerta--info">
                <div>Las actividades y juegos interactivos de práctica para este tema estarán disponibles próximamente.</div>
              </div>
            `
            }
          </div>
        </section>
      </div>
    `;

    // Conectar botones de pantalla completa para juegos y recursos
    document.querySelectorAll(".btn-pantalla-completa").forEach((btn) => {
      btn.addEventListener("click", () => {
        const frameId = btn.getAttribute("data-frame-id");
        const iframe = document.getElementById(frameId);
        if (iframe) {
          if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
          } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen();
          } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen();
          }
        }
      });
    });

    // Conectar botón Marcar como revisado
    const btnRevisar = document.getElementById("btnMarcarRevisado");
    if (btnRevisar) {
      btnRevisar.addEventListener("click", async () => {
        try {
          ui.cargando(true);
          btnRevisar.disabled = true;
          await api.crear("progreso-temas", { temaId: tema.id });
          estaRevisado = true;
          ui.aviso("¡Tema completado y marcado como revisado!", "exito");

          // Registrar intento de gamificación
          try {
            await registrarIntento({
              actividad: "tema-revisado",
              temaId: tema.id,
              puntaje: 1,
              maximo: 1
            });
          } catch (errGamif) {
            console.warn("No se pudo registrar intento de gamificación:", errGamif);
          }

          const contenedorBtn = document.getElementById("contenedorBotonRevisado");
          if (contenedorBtn) {
            contenedorBtn.innerHTML = `<button type="button" class="btn btn--secundario" disabled>Revisado ✓</button>`;
          }
        } catch (err) {
          btnRevisar.disabled = false;
          ui.aviso(err.message || "Error al registrar el progreso", "error");
        } finally {
          ui.cargando(false);
        }
      });
    }
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar el tema:</strong> ${ui.escapar(error.message)}</div>
      </div>
      <a href="/paginas/asignaturas.html" class="btn btn--secundario" style="margin-top: var(--espacio-m);">
        ← Volver a Mis Asignaturas
      </a>
    `;
  } finally {
    ui.cargando(false);
  }
}

inicializar();
