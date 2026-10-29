// publico/js/modulos/editor-tema.js · Edición de ficha de tema y gestión del glosario

import { montarPlantilla } from "../nucleo/plantilla.js";
import { parametro, formatoBasico, normalizar } from "../nucleo/util.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Ficha del Tema", roles: ["docente", "admin"] });

const contenido = document.getElementById("contenido");
const temaId = parametro("id");

let tema = null;
let glosario = [];
let hayCambiosSinGuardar = false;

// Advertencia al cerrar pestaña o recargar con cambios pendientes
window.addEventListener("beforeunload", (e) => {
  if (hayCambiosSinGuardar) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function marcarModificado() {
  hayCambiosSinGuardar = true;
}

function contarPalabras(texto) {
  if (!texto || typeof texto !== "string") return 0;
  const limpio = texto.trim();
  return limpio ? limpio.split(/\s+/).length : 0;
}

async function inicializar() {
  if (!temaId) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Identificador no encontrado:</strong> No se ha especificado un ID de tema en la URL.</div>
      </div>
      <a href="/paginas/editor-contenidos.html" class="btn btn--secundario" style="margin-top: var(--espacio-m);">
        ← Volver al Editor de Contenidos
      </a>
    `;
    return;
  }

  try {
    ui.cargando(true);
    const [temaData, todosGlosario] = await Promise.all([
      api.obtener("temas", temaId),
      api.listar("glosario")
    ]);

    tema = temaData;
    glosario = todosGlosario.filter((g) => g.temaId === temaId);
    renderizarTodo();
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar el tema:</strong> ${ui.escapar(error.message)}</div>
      </div>
      <a href="/paginas/editor-contenidos.html" class="btn btn--secundario" style="margin-top: var(--espacio-m);">
        ← Volver al Editor de Contenidos
      </a>
    `;
  } finally {
    ui.cargando(false);
  }
}

function renderizarTodo() {
  // Asegurar estructuras de arreglos
  tema.objetivos = Array.isArray(tema.objetivos) ? tema.objetivos : [];
  tema.ejemplos = Array.isArray(tema.ejemplos) ? tema.ejemplos : [];
  tema.erroresFrecuentes = Array.isArray(tema.erroresFrecuentes) ? tema.erroresFrecuentes : [];
  tema.preguntasGuia = Array.isArray(tema.preguntasGuia) ? tema.preguntasGuia : [];
  tema.recursos = Array.isArray(tema.recursos) ? tema.recursos : [];

  const palabrasResumen = contarPalabras(tema.resumen || "");
  const totalTerminos = glosario.length;
  const deSeisLetras = glosario.filter((g) => normalizar(g.termino).length === 6).length;
  const aptoParaJuegos = totalTerminos >= 12 && deSeisLetras >= 3;

  contenido.innerHTML = `
    <div class="editor-tema-layout pila">
      <!-- Cabecera y acciones principales -->
      <header class="editor-tema-cabecera">
        <div class="pila pila--xs">
          <div class="fila" style="align-items: center; gap: var(--espacio-s);">
            <a href="/paginas/editor-contenidos.html" class="btn btn--texto btn--pequeno" id="btnVolverContenidos">
              ← Volver a Contenidos
            </a>
            <span class="insignia ${tema.estado === "publicado" ? "insignia--exito" : "insignia--advertencia"}">
              ${tema.estado === "publicado" ? "Publicado" : "Borrador"}
            </span>
          </div>
          <h1>${ui.escapar(tema.titulo || "Ficha del Tema")}</h1>
          <p style="color: var(--texto-suave);">Edita la información pedagógica del tema y gestiona sus términos de glosario.</p>
        </div>

        <div class="fila" style="gap: var(--espacio-s);">
          <button type="button" class="btn btn--primario" id="btnGuardarFicha">
            💾 Guardar Ficha
          </button>
        </div>
      </header>

      <!-- SECCIÓN 1: FICHA PEDAGÓGICA -->
      <section class="tarjeta pila">
        <h2 style="font-size: var(--tamano-xl); border-bottom: 1px solid var(--borde); padding-bottom: var(--espacio-xs);">
          Ficha Pedagógica
        </h2>

        <form id="formFichaTema" class="pila">
          <div class="grid-auto">
            <div class="campo" style="flex: 2;">
              <label for="fichaTitulo">Título del Tema *</label>
              <input type="text" id="fichaTitulo" value="${ui.escapar(tema.titulo || "")}" required />
            </div>

            <div class="campo">
              <label for="fichaEstado">Estado</label>
              <select id="fichaEstado">
                <option value="borrador" ${tema.estado === "borrador" ? "selected" : ""}>Borrador</option>
                <option value="publicado" ${tema.estado === "publicado" ? "selected" : ""}>Publicado</option>
              </select>
            </div>

            <div class="campo">
              <label for="fichaDificultad">Dificultad</label>
              <select id="fichaDificultad">
                <option value="baja" ${tema.dificultad === "baja" ? "selected" : ""}>Baja</option>
                <option value="media" ${tema.dificultad === "media" || !tema.dificultad ? "selected" : ""}>Media</option>
                <option value="alta" ${tema.dificultad === "alta" ? "selected" : ""}>Alta</option>
              </select>
            </div>
          </div>

          <!-- Resumen y contador de palabras -->
          <div class="campo">
            <label for="fichaResumen">
              Resumen Teórico (Admite formato con **negrita** y viñetas con "- ")
            </label>
            <textarea id="fichaResumen" rows="8" placeholder="Escribe el contenido teórico del tema...">${ui.escapar(tema.resumen || "")}</textarea>
            <div class="contador-palabras" id="contadorResumen">
              <span>Palabras: <strong>${palabrasResumen}</strong> (Recomendado: 300 a 800)</span>
              <span id="indicadorRangoResumen" class="${
                palabrasResumen >= 300 && palabrasResumen <= 800
                  ? "contador-palabras--valido"
                  : palabrasResumen > 800
                  ? "contador-palabras--exceso"
                  : "contador-palabras--alerta"
              }">
                ${
                  palabrasResumen >= 300 && palabrasResumen <= 800
                    ? "✓ Extensión óptima"
                    : palabrasResumen > 800
                    ? "Excede el máximo recomendado"
                    : "Extensión corta"
                }
              </span>
            </div>
          </div>

          <!-- Vista previa de resumen -->
          <details style="margin-bottom: var(--espacio-s);">
            <summary style="cursor: pointer; color: var(--primario); font-size: var(--tamano-s); font-weight: var(--peso-seminegrita);">
              Ver vista previa formateada del resumen
            </summary>
            <div class="vista-previa-resumen" id="vistaPreviaResumen" style="margin-top: var(--espacio-xs);">
              ${formatoBasico(tema.resumen || "*(Sin contenido de resumen)*")}
            </div>
          </details>

          <!-- Listas dinámicas: Objetivos, Ejemplos, Errores y Preguntas -->
          <div class="grid-auto">
            <!-- Objetivos -->
            <div class="campo">
              <label>Objetivos de Aprendizaje</label>
              <div class="fila" style="gap: var(--espacio-xs);">
                <input type="text" id="nuevoObjetivo" placeholder="Añadir objetivo..." />
                <button type="button" class="btn btn--secundario btn--pequeno" id="btnAgregarObjetivo">+</button>
              </div>
              <div class="lista-dinamica-contenedor">
                <div class="lista-dinamica-items" id="listaObjetivos"></div>
              </div>
            </div>

            <!-- Ejemplos -->
            <div class="campo">
              <label>Ejemplos de Aplicación</label>
              <div class="fila" style="gap: var(--espacio-xs);">
                <input type="text" id="nuevoEjemplo" placeholder="Añadir ejemplo..." />
                <button type="button" class="btn btn--secundario btn--pequeno" id="btnAgregarEjemplo">+</button>
              </div>
              <div class="lista-dinamica-contenedor">
                <div class="lista-dinamica-items" id="listaEjemplos"></div>
              </div>
            </div>
          </div>

          <div class="grid-auto">
            <!-- Errores Frecuentes -->
            <div class="campo">
              <label>Errores Frecuentes</label>
              <div class="fila" style="gap: var(--espacio-xs);">
                <input type="text" id="nuevoError" placeholder="Añadir error frecuente..." />
                <button type="button" class="btn btn--secundario btn--pequeno" id="btnAgregarError">+</button>
              </div>
              <div class="lista-dinamica-contenedor">
                <div class="lista-dinamica-items" id="listaErrores"></div>
              </div>
            </div>

            <!-- Preguntas Guía -->
            <div class="campo">
              <label>Preguntas Guía</label>
              <div class="fila" style="gap: var(--espacio-xs);">
                <input type="text" id="nuevaPregunta" placeholder="Añadir pregunta guía..." />
                <button type="button" class="btn btn--secundario btn--pequeno" id="btnAgregarPregunta">+</button>
              </div>
              <div class="lista-dinamica-contenedor">
                <div class="lista-dinamica-items" id="listaPreguntas"></div>
              </div>
            </div>
          </div>

          <!-- Recursos complementarios -->
          <div class="campo">
            <div class="fila" style="justify-content: space-between; align-items: center;">
              <label style="margin: 0;">Recursos Didácticos (Enlaces, Videos, PDF o Imágenes)</label>
              <button type="button" class="btn btn--secundario btn--pequeno" id="btnAgregarRecurso">
                + Agregar Recurso
              </button>
            </div>
            <div class="pila" id="contenedorRecursos" style="margin-top: var(--espacio-s);"></div>
          </div>

          <!-- Metadatos adicionales -->
          <div class="grid-auto">
            <div class="campo">
              <label for="fichaPalabrasClave">Palabras Clave (separadas por comas)</label>
              <input type="text" id="fichaPalabrasClave" placeholder="ecosistema, bioma, conservación" value="${ui.escapar(
                Array.isArray(tema.palabrasClave)
                  ? tema.palabrasClave.join(", ")
                  : tema.palabrasClave || ""
              )}" />
            </div>

            <div class="campo">
              <label for="fichaFuentes">Fuentes y Referencias</label>
              <input type="text" id="fichaFuentes" placeholder="Libros, autores, convenios o instituciones" value="${ui.escapar(
                tema.fuentes || ""
              )}" />
            </div>
          </div>
        </form>
      </section>

      <!-- SECCIÓN 2: GLOSARIO -->
      <section class="tarjeta pila">
        <header class="editor-tema-cabecera">
          <div>
            <h2 style="font-size: var(--tamano-xl); margin: 0;">Glosario de Términos</h2>
            <p style="color: var(--texto-suave);">Vocabulario clave para las actividades pedagógicas y juegos interactivos.</p>
          </div>

          <div class="fila" style="gap: var(--espacio-s);">
            <button type="button" class="btn btn--secundario" id="btn-generar-ia" disabled title="Disponible en Sprint 7">
              ✨ Generar con IA
            </button>
            <button type="button" class="btn btn--primario btn--pequeno" id="btnAgregarTermino">
              + Agregar Término
            </button>
          </div>
        </header>

        <!-- Indicador de Aptitud para Juegos -->
        <div class="glosario-stats">
          <div class="glosario-stats__indicadores">
            <span>Total de términos: <strong>${totalTerminos}</strong></span>
            <span>·</span>
            <span>Términos de 6 letras: <strong>${deSeisLetras}</strong></span>
          </div>

          <div>
            <span class="insignia ${aptoParaJuegos ? "insignia--exito" : "insignia--advertencia"}">
              ${
                aptoParaJuegos
                  ? "✓ Apto para juegos (12+ términos y 3+ de 6 letras)"
                  : "No apto para juegos (Mínimo 12 términos y al menos 3 de 6 letras)"
              }
            </span>
          </div>
        </div>

        <!-- Tabla del glosario -->
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Término</th>
                <th scope="col">Definición (máx. 25 pal.)</th>
                <th scope="col">Pista (máx. 10 pal.)</th>
                <th scope="col">Retroalimentación</th>
                <th scope="col" style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody id="cuerpoTablaGlosario">
              ${
                glosario.length === 0
                  ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: var(--espacio-l); color: var(--texto-suave);">
                    No hay términos registrados en el glosario de este tema.
                  </td>
                </tr>
              `
                  : glosario
                      .map((g) => {
                        const lenNorm = normalizar(g.termino).length;
                        return `
                  <tr data-id="${ui.escapar(g.id)}">
                    <td>
                      <strong>${ui.escapar(g.termino)}</strong>
                      ${lenNorm === 6 ? `<span class="insignia insignia--secundario" style="margin-left: var(--espacio-xs); font-size: 10px;">6 letras</span>` : ""}
                    </td>
                    <td>${ui.escapar(g.definicion || "-")}</td>
                    <td>${ui.escapar(g.pista || "-")}</td>
                    <td>${ui.escapar(g.retroalimentacion || "-")}</td>
                    <td style="text-align: right;">
                      <div class="fila" style="justify-content: flex-end; gap: var(--espacio-xs);">
                        <button type="button" class="btn btn--secundario btn--pequeno btn-editar-termino" data-id="${ui.escapar(g.id)}">
                          Editar
                        </button>
                        <button type="button" class="btn btn--peligro btn--pequeno btn-eliminar-termino" data-id="${ui.escapar(g.id)}">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  conectarEventosFicha();
  conectarEventosGlosario();
}

function conectarEventosFicha() {
  const form = document.getElementById("formFichaTema");
  const btnGuardar = document.getElementById("btnGuardarFicha");
  const btnVolver = document.getElementById("btnVolverContenidos");
  const textareaResumen = document.getElementById("fichaResumen");
  const vistaPrevia = document.getElementById("vistaPreviaResumen");
  const contadorResumen = document.getElementById("contadorResumen");

  // Rastrear cambios en cualquier input del formulario
  form.addEventListener("input", () => marcarModificado());

  btnVolver.addEventListener("click", async (e) => {
    if (hayCambiosSinGuardar) {
      e.preventDefault();
      const salir = await ui.confirmar(
        "Tienes cambios sin guardar en la ficha del tema. ¿Deseas salir de todas formas?"
      );
      if (salir) {
        hayCambiosSinGuardar = false;
        window.location.href = "/paginas/editor-contenidos.html";
      }
    }
  });

  // Contador de resumen en vivo
  textareaResumen.addEventListener("input", () => {
    const total = contarPalabras(textareaResumen.value);
    contadorResumen.innerHTML = `
      <span>Palabras: <strong>${total}</strong> (Recomendado: 300 a 800)</span>
      <span class="${
        total >= 300 && total <= 800
          ? "contador-palabras--valido"
          : total > 800
          ? "contador-palabras--exceso"
          : "contador-palabras--alerta"
      }">
        ${
          total >= 300 && total <= 800
            ? "✓ Extensión óptima"
            : total > 800
            ? "Excede el máximo recomendado"
            : "Extensión corta"
        }
      </span>
    `;
    vistaPrevia.innerHTML = formatoBasico(textareaResumen.value || "*(Sin contenido de resumen)*");
  });

  // Renderizar y conectar listas dinámicas
  renderizarListaDinamica("listaObjetivos", tema.objetivos);
  renderizarListaDinamica("listaEjemplos", tema.ejemplos);
  renderizarListaDinamica("listaErrores", tema.erroresFrecuentes);
  renderizarListaDinamica("listaPreguntas", tema.preguntasGuia);

  document.getElementById("btnAgregarObjetivo").addEventListener("click", () => {
    agregarItemLista("nuevoObjetivo", tema.objetivos, "listaObjetivos");
  });
  document.getElementById("btnAgregarEjemplo").addEventListener("click", () => {
    agregarItemLista("nuevoEjemplo", tema.ejemplos, "listaEjemplos");
  });
  document.getElementById("btnAgregarError").addEventListener("click", () => {
    agregarItemLista("nuevoError", tema.erroresFrecuentes, "listaErrores");
  });
  document.getElementById("btnAgregarPregunta").addEventListener("click", () => {
    agregarItemLista("nuevaPregunta", tema.preguntasGuia, "listaPreguntas");
  });

  // Recursos didácticos
  renderizarRecursos();
  document.getElementById("btnAgregarRecurso").addEventListener("click", () => {
    tema.recursos.push({ tipo: "enlace", titulo: "", url: "" });
    marcarModificado();
    renderizarRecursos();
  });

  // Guardar Ficha
  btnGuardar.addEventListener("click", async () => {
    const titulo = document.getElementById("fichaTitulo").value.trim();
    if (!titulo) {
      ui.aviso("El título del tema es obligatorio.", "advertencia");
      document.getElementById("fichaTitulo").focus();
      return;
    }

    const estado = document.getElementById("fichaEstado").value;
    const dificultad = document.getElementById("fichaDificultad").value;
    const resumen = document.getElementById("fichaResumen").value.trim();
    const fuentes = document.getElementById("fichaFuentes").value.trim();
    const rawPalabras = document.getElementById("fichaPalabrasClave").value;
    const palabrasClave = rawPalabras
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      ui.cargando(true);
      btnGuardar.disabled = true;

      const actualizado = await api.actualizar("temas", tema.id, {
        titulo,
        estado,
        dificultad,
        resumen,
        fuentes,
        palabrasClave,
        objetivos: tema.objetivos,
        ejemplos: tema.ejemplos,
        erroresFrecuentes: tema.erroresFrecuentes,
        preguntasGuia: tema.preguntasGuia,
        recursos: tema.recursos
      });

      tema = actualizado;
      hayCambiosSinGuardar = false;
      ui.aviso("Ficha del tema guardada con éxito.", "exito");
      renderizarTodo();
    } catch (err) {
      ui.aviso(err.message || "Error al guardar la ficha del tema", "error");
    } finally {
      btnGuardar.disabled = false;
      ui.cargando(false);
    }
  });
}

function agregarItemLista(inputId, arrayItems, contenedorId) {
  const input = document.getElementById(inputId);
  const texto = input.value.trim();
  if (!texto) return;
  arrayItems.push(texto);
  input.value = "";
  marcarModificado();
  renderizarListaDinamica(contenedorId, arrayItems);
}

function renderizarListaDinamica(contenedorId, arrayItems) {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;

  if (arrayItems.length === 0) {
    cont.innerHTML = `<span style="color: var(--texto-suave); font-size: var(--tamano-xs);">No hay elementos añadidos.</span>`;
    return;
  }

  cont.innerHTML = arrayItems
    .map(
      (item, idx) => `
    <div class="item-dinamico">
      <span>${ui.escapar(item)}</span>
      <button type="button" class="btn-eliminar-item" data-idx="${idx}" title="Eliminar elemento">✕</button>
    </div>
  `
    )
    .join("");

  cont.querySelectorAll(".btn-eliminar-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      arrayItems.splice(idx, 1);
      marcarModificado();
      renderizarListaDinamica(contenedorId, arrayItems);
    });
  });
}

function renderizarRecursos() {
  const cont = document.getElementById("contenedorRecursos");
  if (!cont) return;

  if (tema.recursos.length === 0) {
    cont.innerHTML = `<span style="color: var(--texto-suave); font-size: var(--tamano-s);">No hay recursos adicionales registrados.</span>`;
    return;
  }

  cont.innerHTML = tema.recursos
    .map(
      (rec, idx) => `
    <div class="recurso-item-card" data-idx="${idx}">
      <div class="grid-auto" style="align-items: flex-end;">
        <div class="campo" style="max-width: 160px;">
          <label>Tipo</label>
          <select class="rec-tipo" data-idx="${idx}">
            <option value="enlace" ${rec.tipo === "enlace" ? "selected" : ""}>Enlace web</option>
            <option value="video" ${rec.tipo === "video" ? "selected" : ""}>Video</option>
            <option value="pdf" ${rec.tipo === "pdf" ? "selected" : ""}>Documento PDF</option>
            <option value="imagen" ${rec.tipo === "imagen" ? "selected" : ""}>Imagen</option>
          </select>
        </div>

        <div class="campo" style="flex: 1;">
          <label>Título del recurso</label>
          <input type="text" class="rec-titulo" data-idx="${idx}" placeholder="Ej. Guía metodológica..." value="${ui.escapar(
            rec.titulo || ""
          )}" />
        </div>

        <div class="campo" style="flex: 2;">
          <label>URL o archivo</label>
          <div class="fila" style="gap: var(--espacio-xs);">
            <input type="text" class="rec-url" data-idx="${idx}" placeholder="https://... o /recursos/..." value="${ui.escapar(
              rec.url || ""
            )}" style="flex: 1;" />
            ${
              rec.tipo === "pdf" || rec.tipo === "imagen"
                ? `<button type="button" class="btn btn--secundario btn--pequeno btn-subir-archivo" data-idx="${idx}">Subir</button>`
                : ""
            }
          </div>
        </div>

        <button type="button" class="btn btn--peligro btn--pequeno btn-quitar-recurso" data-idx="${idx}" style="margin-bottom: var(--espacio-xs);">
          Eliminar
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Input file invisible para subidas
  let inputFile = document.getElementById("inputSubirRecurso");
  if (!inputFile) {
    inputFile = document.createElement("input");
    inputFile.type = "file";
    inputFile.id = "inputSubirRecurso";
    inputFile.style.display = "none";
    document.body.appendChild(inputFile);
  }

  cont.querySelectorAll(".rec-tipo").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.idx);
      tema.recursos[idx].tipo = e.target.value;
      marcarModificado();
      renderizarRecursos();
    });
  });

  cont.querySelectorAll(".rec-titulo").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      tema.recursos[idx].titulo = e.target.value;
      marcarModificado();
    });
  });

  cont.querySelectorAll(".rec-url").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      tema.recursos[idx].url = e.target.value;
      marcarModificado();
    });
  });

  cont.querySelectorAll(".btn-quitar-recurso").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      tema.recursos.splice(idx, 1);
      marcarModificado();
      renderizarRecursos();
    });
  });

  cont.querySelectorAll(".btn-subir-archivo").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const rec = tema.recursos[idx];
      inputFile.accept = rec.tipo === "pdf" ? ".pdf,application/pdf" : "image/jpeg,image/png,image/webp";

      inputFile.onchange = async () => {
        const file = inputFile.files[0];
        if (!file) return;

        try {
          ui.cargando(true);
          const res = await api.subir(file);
          tema.recursos[idx].url = res.url;
          if (!tema.recursos[idx].titulo) {
            tema.recursos[idx].titulo = file.name;
          }
          marcarModificado();
          ui.aviso("Archivo subido con éxito.", "exito");
          renderizarRecursos();
        } catch (err) {
          ui.aviso(err.message || "Error al subir archivo", "error");
        } finally {
          inputFile.value = "";
          ui.cargando(false);
        }
      };

      inputFile.click();
    });
  });
}

function conectarEventosGlosario() {
  document.getElementById("btnAgregarTermino")?.addEventListener("click", () => {
    abrirModalTermino();
  });

  document.querySelectorAll(".btn-editar-termino").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const term = glosario.find((g) => g.id === id);
      if (term) abrirModalTermino(term);
    });
  });

  document.querySelectorAll(".btn-eliminar-termino").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const term = glosario.find((g) => g.id === id);
      if (!term) return;

      const ok = await ui.confirmar(`¿Estás seguro de eliminar el término "${term.termino}"?`);
      if (!ok) return;

      try {
        ui.cargando(true);
        await api.eliminar("glosario", term.id);
        glosario = glosario.filter((g) => g.id !== term.id);
        ui.aviso("Término eliminado del glosario.", "exito");
        renderizarTodo();
      } catch (err) {
        ui.aviso(err.message || "Error al eliminar término", "error");
      } finally {
        ui.cargando(false);
      }
    });
  });
}

async function abrirModalTermino(term = null) {
  const esEdicion = Boolean(term);
  const form = document.createElement("form");
  form.className = "modal-form-asignatura";
  form.noValidate = true;

  const defInicial = term ? term.definicion || "" : "";
  const pistaInicial = term ? term.pista || "" : "";

  form.innerHTML = `
    <div class="campo" id="grupoTermino">
      <label for="modalTermino">Término * (una sola palabra)</label>
      <input type="text" id="modalTermino" value="${ui.escapar(term ? term.termino : "")}" placeholder="Ej. Ecosistema" required />
      <span class="campo__error oculto" id="errTermino">Debe ser una sola palabra sin espacios.</span>
    </div>

    <div class="campo" id="grupoDef">
      <label for="modalDefinicion">Definición * (máximo 25 palabras)</label>
      <textarea id="modalDefinicion" rows="3" required placeholder="Definición precisa del concepto...">${ui.escapar(
        defInicial
      )}</textarea>
      <div class="contador-palabras" id="cntDef">
        <span>Palabras: <strong id="numPalDef">${contarPalabras(defInicial)}</strong> / 25</span>
      </div>
      <span class="campo__error oculto" id="errDef">La definición no puede superar las 25 palabras ni estar vacía.</span>
    </div>

    <div class="campo" id="grupoPista">
      <label for="modalPista">Pista * (máximo 10 palabras)</label>
      <input type="text" id="modalPista" value="${ui.escapar(pistaInicial)}" placeholder="Pista orientadora para el estudiante..." required />
      <div class="contador-palabras" id="cntPista">
        <span>Palabras: <strong id="numPalPista">${contarPalabras(pistaInicial)}</strong> / 10</span>
      </div>
      <span class="campo__error oculto" id="errPista">La pista no puede superar las 10 palabras ni estar vacía.</span>
    </div>

    <div class="campo">
      <label for="modalRetro">Retroalimentación pedagógica</label>
      <textarea id="modalRetro" rows="2" placeholder="Explicación formativa cuando el estudiante responde...">${ui.escapar(
        term ? term.retroalimentacion || "" : ""
      )}</textarea>
    </div>

    <div class="fila" style="justify-content: flex-end; gap: var(--espacio-s); margin-top: var(--espacio-s);">
      <button type="button" class="btn btn--secundario" id="btnCancelarTermino">Cancelar</button>
      <button type="submit" class="btn btn--primario" id="btnGuardarTermino">
        ${esEdicion ? "Guardar Cambios" : "Agregar Término"}
      </button>
    </div>
  `;

  const inputTerm = form.querySelector("#modalTermino");
  const textareaDef = form.querySelector("#modalDefinicion");
  const inputPista = form.querySelector("#modalPista");
  const textareaRetro = form.querySelector("#modalRetro");

  const numPalDef = form.querySelector("#numPalDef");
  const numPalPista = form.querySelector("#numPalPista");

  textareaDef.addEventListener("input", () => {
    const c = contarPalabras(textareaDef.value);
    numPalDef.textContent = c;
    form.querySelector("#cntDef").classList.toggle("contador-palabras--exceso", c > 25);
  });

  inputPista.addEventListener("input", () => {
    const c = contarPalabras(inputPista.value);
    numPalPista.textContent = c;
    form.querySelector("#cntPista").classList.toggle("contador-palabras--exceso", c > 10);
  });

  let cerrarDialogo = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const termino = inputTerm.value.trim();
    const definicion = textareaDef.value.trim();
    const pista = inputPista.value.trim();
    const retroalimentacion = textareaRetro.value.trim();

    const palDef = contarPalabras(definicion);
    const palPista = contarPalabras(pista);

    // Validar término: una sola palabra, sin espacios internos
    const okTermino = termino.length > 0 && !/\s/.test(termino);
    const okDef = definicion.length > 0 && palDef <= 25;
    const okPista = pista.length > 0 && palPista <= 10;

    form.querySelector("#grupoTermino").classList.toggle("campo--error", !okTermino);
    form.querySelector("#errTermino").classList.toggle("oculto", okTermino);

    form.querySelector("#grupoDef").classList.toggle("campo--error", !okDef);
    form.querySelector("#errDef").classList.toggle("oculto", okDef);

    form.querySelector("#grupoPista").classList.toggle("campo--error", !okPista);
    form.querySelector("#errPista").classList.toggle("oculto", okPista);

    if (!okTermino || !okDef || !okPista) return;

    const btnSubmit = form.querySelector("#btnGuardarTermino");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Guardando...";

    try {
      if (esEdicion) {
        const actualizado = await api.actualizar("glosario", term.id, {
          termino,
          definicion,
          pista,
          retroalimentacion,
          origen: "docente",
          estado: "aprobado"
        });
        const idx = glosario.findIndex((g) => g.id === term.id);
        if (idx !== -1) glosario[idx] = actualizado;
        ui.aviso("Término actualizado con éxito.", "exito");
      } else {
        const creado = await api.crear("glosario", {
          temaId,
          termino,
          definicion,
          pista,
          retroalimentacion,
          origen: "docente",
          estado: "aprobado"
        });
        glosario.push(creado);
        ui.aviso("Término agregado al glosario.", "exito");
      }

      if (typeof cerrarDialogo === "function") {
        cerrarDialogo();
      }
      renderizarTodo();
    } catch (err) {
      ui.aviso(err.message || "Error al guardar el término", "error");
      btnSubmit.disabled = false;
      btnSubmit.textContent = esEdicion ? "Guardar Cambios" : "Agregar Término";
    }
  });

  const modalPromesa = ui.modal({
    titulo: esEdicion ? "Editar Término del Glosario" : "Nuevo Término del Glosario",
    contenido: form,
    acciones: []
  });

  form.querySelector("#btnCancelarTermino").addEventListener("click", () => {
    const botonEscape = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(botonEscape);
  });

  cerrarDialogo = () => {
    const botonEscape = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(botonEscape);
  };

  await modalPromesa;
}

inicializar();
