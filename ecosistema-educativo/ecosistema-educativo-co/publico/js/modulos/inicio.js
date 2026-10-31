// publico/js/modulos/inicio.js · Página principal pública y panel de inicio para usuarios con sesión

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";
import { calcularAvance } from "./asignaturas.js";

await montarPlantilla({ titulo: "Inicio", roles: ["publico"] });

const contenido = document.getElementById("contenido");
const usuario = usuarioActual();

async function renderizarInicio() {
  if (!usuario) {
    renderizarPublico();
  } else {
    await renderizarPrivado();
  }
}

function renderizarPublico() {
  contenido.innerHTML = `
    <div class="inicio">
      <section class="inicio-hero">
        <span class="insignia insignia--acento" style="display: inline-block; margin-bottom: var(--espacio-s);">
          Ecosistema Educativo Digital
        </span>
        <h1>Aprende, Practica y Domina Competencias Digitales</h1>
        <p>
          Una plataforma interactiva con contenidos modulares, gamificación, canciones educativas,
          tutor inteligente socrático y seguimiento pedagógico en tiempo real.
        </p>
        <div class="inicio-hero__acciones">
          <a href="/paginas/ingreso.html" class="btn btn--acento btn--grande">Ingresar a la plataforma</a>
          <a href="/paginas/registro.html" class="btn btn--secundario btn--grande" style="color: var(--texto-inverso); border-color: rgba(255, 255, 255, 0.4);">
            Crear cuenta nueva
          </a>
        </div>
      </section>

      <section class="inicio-pilares">
        <div class="inicio-seccion__cabecera">
          <h2 class="inicio-seccion__titulo">Pilares del Aprendizaje</h2>
        </div>

        <div class="inicio-pilares__grid">
          <article class="pilar-tarjeta">
            <div class="fila" style="justify-content: space-between; align-items: center;">
              <span class="insignia insignia--primario">Contenidos</span>
              <span style="font-size: 1.5rem;">📚</span>
            </div>
            <h3 class="h4" style="margin-top: var(--espacio-xs);">Formación Modular</h3>
            <p style="font-size: var(--tamano-s); color: var(--texto-secundario); margin: 0;">
              Estructura curricular en asignaturas, unidades y temas con objetivos claros, recursos multimedia y glosario.
            </p>
          </article>

          <article class="pilar-tarjeta">
            <div class="fila" style="justify-content: space-between; align-items: center;">
              <span class="insignia insignia--acento">Gamificación</span>
              <span style="font-size: 1.5rem;">🏆</span>
            </div>
            <h3 class="h4" style="margin-top: var(--espacio-xs);">Puntos e Insignias</h3>
            <p style="font-size: var(--tamano-s); color: var(--texto-secundario); margin: 0;">
              Completa actividades formativas, pon a prueba tus habilidades, acumula puntos y desbloquea insignias pedagógicas.
            </p>
          </article>

          <article class="pilar-tarjeta">
            <div class="fila" style="justify-content: space-between; align-items: center;">
              <span class="insignia insignia--secundario">Música</span>
              <span style="font-size: 1.5rem;">🎵</span>
            </div>
            <h3 class="h4" style="margin-top: var(--espacio-xs);">Canciones Educativas</h3>
            <p style="font-size: var(--tamano-s); color: var(--texto-secundario); margin: 0;">
              Refuerza conceptos clave con canciones didácticas acompañadas de letras sincronizadas paso a paso.
            </p>
          </article>

          <article class="pilar-tarjeta">
            <div class="fila" style="justify-content: space-between; align-items: center;">
              <span class="insignia insignia--exito">Comunidad</span>
              <span style="font-size: 1.5rem;">📰</span>
            </div>
            <h3 class="h4" style="margin-top: var(--espacio-xs);">Noticias y Novedades</h3>
            <p style="font-size: var(--tamano-s); color: var(--texto-secundario); margin: 0;">
              Espacio informativo para mantenerte al día con anuncios académicos, eventos institucionales y logros.
            </p>
          </article>
        </div>
      </section>
    </div>
  `;
}

async function renderizarPrivado() {
  ui.cargando(true);
  try {
    const esDocenteOAdmin = usuario.rol === "docente" || usuario.rol === "admin";

    // 1. Cargar asignaturas y noticias
    const [listaAsignaturas, listaNoticias] = await Promise.all([
      api.listar("asignaturas").catch(() => []),
      api.listar("noticias").catch(() => [])
    ]);

    // 2. Calcular avance de cada asignatura en paralelo
    const asignaturasConAvance = await Promise.all(
      (Array.isArray(listaAsignaturas) ? listaAsignaturas : []).map(async (asig) => {
        const avance = await calcularAvance(asig.id);
        return { ...asig, avance };
      })
    );

    // 3. Obtener 3 noticias publicadas más recientes (destacadas primero)
    const publicadas = (Array.isArray(listaNoticias) ? listaNoticias : []).filter(
      (n) => n && n.estado === "publicado"
    );

    publicadas.sort((a, b) => {
      const destA = Boolean(a.destacada);
      const destB = Boolean(b.destacada);
      if (destA !== destB) return destB ? 1 : -1;
      const fechaA = a.fechaPublicacion || a.fecha || "";
      const fechaB = b.fechaPublicacion || b.fecha || "";
      return fechaB.localeCompare(fechaA);
    });

    const noticiasRecientes = publicadas.slice(0, 3);

    // 4. Último tema visto (localStorage)
    let ultimoTema = null;
    try {
      const guardado = localStorage.getItem("ultimoTema");
      if (guardado) {
        ultimoTema = JSON.parse(guardado);
      }
    } catch {}

    // 5. Construir HTML
    let continuarHtml = "";
    if (ultimoTema && ultimoTema.id && ultimoTema.titulo) {
      continuarHtml = `
        <div class="inicio-continuar">
          <div class="inicio-continuar__info">
            <div class="inicio-continuar__icono">📖</div>
            <div>
              <div class="inicio-continuar__subtitulo">Continuar donde te quedaste</div>
              <div class="inicio-continuar__titulo">${ui.escapar(ultimoTema.titulo)}</div>
            </div>
          </div>
          <a href="/paginas/tema.html?id=${encodeURIComponent(ultimoTema.id)}" class="btn btn--primario">
            Continuar estudio &rarr;
          </a>
        </div>
      `;
    }

    // Accesos rápidos para docentes y admin
    let accesosRapidosHtml = "";
    if (esDocenteOAdmin) {
      accesosRapidosHtml = `
        <section class="inicio-seccion">
          <div class="inicio-seccion__cabecera">
            <h2 class="inicio-seccion__titulo">Accesos Rápidos</h2>
          </div>
          <div class="inicio-accesos-rapidos">
            <a href="/paginas/editor-contenidos.html" class="acceso-rapido">
              <div class="acceso-rapido__icono">📑</div>
              <div>
                <div class="acceso-rapido__titulo">Contenidos</div>
                <div class="acceso-rapido__desc">Gestionar unidades, temas y recursos</div>
              </div>
            </a>

            <a href="/paginas/noticias.html" class="acceso-rapido">
              <div class="acceso-rapido__icono">📢</div>
              <div>
                <div class="acceso-rapido__titulo">Noticias</div>
                <div class="acceso-rapido__desc">Crear y publicar novedades comunitarias</div>
              </div>
            </a>

            <a href="/paginas/editor-cancion.html" class="acceso-rapido">
              <div class="acceso-rapido__icono">🎵</div>
              <div>
                <div class="acceso-rapido__titulo">Canciones</div>
                <div class="acceso-rapido__desc">Añadir audios y letras sincronizadas</div>
              </div>
            </a>

            ${
              usuario.rol === "admin"
                ? `
                <a href="/paginas/distributivo.html" class="acceso-rapido">
                  <div class="acceso-rapido__icono">👥</div>
                  <div>
                    <div class="acceso-rapido__titulo">Distributivo</div>
                    <div class="acceso-rapido__desc">Asignar docentes y estudiantes</div>
                  </div>
                </a>
              `
                : ""
            }
          </div>
        </section>
      `;
    }

    // Bloque de Asignaturas
    let asignaturasHtml = "";
    if (asignaturasConAvance.length === 0) {
      asignaturasHtml = `
        <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-secundario);">
          <p>No tienes asignaturas asignadas en este momento.</p>
        </div>
      `;
    } else {
      asignaturasHtml = `
        <div class="inicio-asignaturas-grid">
          ${asignaturasConAvance
            .map((asig) => {
              const { porcentaje = 0, revisados = 0, total = 0 } = asig.avance || {};
              return `
                <article class="asignatura-resumen">
                  <div class="asignatura-resumen__cabecera">
                    <h3 class="asignatura-resumen__nombre">${ui.escapar(asig.nombre)}</h3>
                    <span class="insignia insignia--secundario">${ui.escapar(asig.nivel || "Grado")}</span>
                  </div>

                  <div class="asignatura-resumen__progreso-area">
                    <div class="asignatura-resumen__progreso-meta">
                      <span>${porcentaje}% completado</span>
                      <span>${revisados} / ${total} temas</span>
                    </div>
                    <div class="barra-progreso" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">
                      <div class="barra-progreso__relleno" style="width: ${porcentaje}%;"></div>
                    </div>
                  </div>

                  <a href="/paginas/asignatura.html?id=${asig.id}" class="btn btn--secundario btn--pequeno" style="align-self: flex-start;">
                    Ver asignatura &rarr;
                  </a>
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    }

    // Bloque de Noticias
    let noticiasHtml = "";
    if (noticiasRecientes.length === 0) {
      noticiasHtml = `
        <div class="tarjeta" style="text-align: center; padding: var(--espacio-xl); color: var(--texto-secundario);">
          <p>No hay noticias publicadas recientemente.</p>
        </div>
      `;
    } else {
      noticiasHtml = `
        <div class="inicio-noticias-grid">
          ${noticiasRecientes
            .map((n) => {
              const fechaIso = n.fechaPublicacion || n.fecha;
              const fechaTxt = fechaIso ? util.fechaRelativa(fechaIso) : "";
              return `
                <article class="noticia-resumen">
                  ${
                    n.imagen
                      ? `<img src="${ui.escapar(n.imagen)}" alt="${ui.escapar(n.titulo)}" class="noticia-resumen__imagen" loading="lazy">`
                      : `<div class="noticia-resumen__imagen-placeholder">📰</div>`
                  }
                  <div class="noticia-resumen__cuerpo">
                    <div class="fila" style="gap: var(--espacio-xs); flex-wrap: wrap;">
                      <span class="insignia insignia--primario">${ui.escapar(n.categoria || "General")}</span>
                      ${n.destacada ? `<span class="insignia insignia--acento">★ Destacada</span>` : ""}
                    </div>
                    <h3 class="noticia-resumen__titulo">
                      <a href="/paginas/noticia.html?id=${n.id}">${ui.escapar(n.titulo)}</a>
                    </h3>
                    <p class="noticia-resumen__texto">${ui.escapar(n.resumen || "")}</p>
                    <div class="noticia-resumen__pie">
                      <span>${fechaTxt}</span>
                      <a href="/paginas/noticia.html?id=${n.id}" class="btn btn--texto btn--pequeno" style="padding-right: 0;">
                        Leer más &rarr;
                      </a>
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    }

    contenido.innerHTML = `
      <div class="inicio">
        <header class="inicio-saludo">
          <div class="inicio-saludo__texto">
            <h1>¡Hola, ${ui.escapar(usuario.nombre)}! 👋</h1>
            <p>Bienvenido de vuelta a tu espacio formativo.</p>
          </div>
          <span class="insignia insignia--acento" style="font-size: var(--tamano-s); text-transform: capitalize;">
            Rol: ${ui.escapar(usuario.rol)}
          </span>
        </header>

        ${continuarHtml}

        ${accesosRapidosHtml}

        <section class="inicio-seccion">
          <div class="inicio-seccion__cabecera">
            <h2 class="inicio-seccion__titulo">Mis Asignaturas</h2>
            ${
              usuario.rol === "estudiante" || usuario.rol === "docente"
                ? `<a href="/paginas/asignaturas.html" class="btn btn--texto btn--pequeno">Ver todas &rarr;</a>`
                : ""
            }
          </div>
          ${asignaturasHtml}
        </section>

        <section class="inicio-seccion">
          <div class="inicio-seccion__cabecera">
            <h2 class="inicio-seccion__titulo">Noticias Recientes</h2>
            <a href="/paginas/noticias.html" class="btn btn--texto btn--pequeno">Ver todas las noticias &rarr;</a>
          </div>
          ${noticiasHtml}
        </section>
      </div>
    `;
  } catch (err) {
    contenido.innerHTML = `
      <div class="tarjeta" style="color: var(--peligro); text-align: center; padding: var(--espacio-xl);">
        <p class="h3">Error al cargar la página de inicio</p>
        <p>${ui.escapar(err.message)}</p>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

await renderizarInicio();
