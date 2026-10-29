// publico/js/modulos/pareja.js · Juego pedagógico Encuentra la Pareja (memoria y asociación conceptual)

import { montarPlantilla } from "../nucleo/plantilla.js";
import { obtenerTemaActividad } from "../nucleo/selector-tema.js";
import { mostrarRetro, mostrarResumen } from "../nucleo/retroalimentacion.js";
import { registrarIntento } from "../nucleo/gamificacion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";
import * as util from "../nucleo/util.js";

await montarPlantilla({ titulo: "Encuentra la Pareja", roles: ["estudiante", "docente"] });

const contenido = document.getElementById("contenido");

let temaActual = null;
let terminosGlosario = [];
let dificultadSeleccionada = 6;

// Estado de la partida
let cartas = [];
let cartasVolteadas = [];
let bloqueoTablero = false;
let parejasEncontradas = 0;
let totalParejas = 0;
let intentos = 0;
let tiempoInicio = Date.now();
let intervaloTimer = null;

function formatoSegundos(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function inicializar() {
  ui.cargando(true);
  try {
    temaActual = await obtenerTemaActividad();

    if (!temaActual) {
      contenido.innerHTML = `
        <div class="vacio">
          <div class="vacio__icono">📚</div>
          <h2 class="vacio__titulo">No se seleccionó ningún tema</h2>
          <p class="vacio__texto">Debes seleccionar un tema pedagógico para jugar a Encuentra la Pareja.</p>
          <a href="/paginas/actividades.html" class="btn btn--primario">Volver a actividades</a>
        </div>
      `;
      return;
    }

    const glosario = await api.listar("glosario", { temaId: temaActual.id });
    const lista = Array.isArray(glosario) ? glosario : [];

    terminosGlosario = lista.filter(
      (t) => t && t.termino && t.definicion && (!t.estado || t.estado === "aprobado")
    );

    // Mínimo 4 parejas para jugar
    if (terminosGlosario.length < 4) {
      contenido.innerHTML = `
        <div class="pareja-juego">
          <div class="vacio">
            <div class="vacio__icono">📭</div>
            <h2 class="vacio__titulo">Glosario insuficiente</h2>
            <p class="vacio__texto">
              El tema <strong>${ui.escapar(temaActual.titulo)}</strong> cuenta con menos de 4 términos en su glosario (se requieren al menos 4 para este juego).
            </p>
            <div class="fila" style="gap: var(--espacio-s);">
              <a href="/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}" class="btn btn--primario">
                Repasar el tema &rarr;
              </a>
              <button type="button" class="btn btn--secundario" id="btnCambiarTemaVacio">
                Elegir otro tema
              </button>
            </div>
          </div>
        </div>
      `;

      const btnCambiar = document.getElementById("btnCambiarTemaVacio");
      if (btnCambiar) {
        btnCambiar.addEventListener("click", () => {
          window.location.href = "/paginas/pareja.html";
        });
      }
      return;
    }

    iniciarPartida();
  } catch (err) {
    ui.aviso("Error al inicializar juego: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

function iniciarPartida() {
  if (intervaloTimer) clearInterval(intervaloTimer);

  // Determinar cuántas parejas usar según dificultad y disponibilidad (mínimo 4)
  const maximoPosible = terminosGlosario.length;
  totalParejas = Math.min(dificultadSeleccionada, maximoPosible);
  if (totalParejas < 4) totalParejas = 4;

  const seleccionados = util.barajar(terminosGlosario).slice(0, totalParejas);

  // Crear dos tarjetas por término: una con el término y otra con la definición
  const listaCartas = [];
  seleccionados.forEach((t, idx) => {
    listaCartas.push({
      indice: 0,
      terminoId: t.id,
      tipo: "termino",
      texto: t.termino,
      definicion: t.definicion,
      emparejada: false
    });
    listaCartas.push({
      indice: 0,
      terminoId: t.id,
      tipo: "definicion",
      texto: t.definicion,
      definicion: t.definicion,
      emparejada: false
    });
  });

  // Barajar todas las cartas
  cartas = util.barajar(listaCartas).map((c, i) => ({ ...c, indice: i }));

  cartasVolteadas = [];
  bloqueoTablero = false;
  parejasEncontradas = 0;
  intentos = 0;
  tiempoInicio = Date.now();

  renderizarInterfaz();

  // Iniciar temporizador
  const tiempoEl = document.getElementById("metricaTiempo");
  intervaloTimer = setInterval(() => {
    if (tiempoEl) {
      const transcurrido = Math.floor((Date.now() - tiempoInicio) / 1000);
      tiempoEl.textContent = formatoSegundos(transcurrido);
    }
  }, 1000);
}

function renderizarInterfaz() {
  const opcionesDificultad = [6, 8, 10]
    .map((num) => {
      const disabled = num > terminosGlosario.length && terminosGlosario.length < 6;
      return `<option value="${num}" ${dificultadSeleccionada === num ? "selected" : ""} ${disabled ? "disabled" : ""}>${num} parejas</option>`;
    })
    .join("");

  const gridHtml = cartas
    .map((carta) => {
      const estaVolteada = cartasVolteadas.some((c) => c.indice === carta.indice);
      let claseEstado = "";
      if (carta.emparejada) {
        claseEstado = "carta-pareja--emparejada";
      } else if (estaVolteada) {
        claseEstado = "carta-pareja--volteada";
      }

      const ariaLabel = carta.emparejada
        ? `Tarjeta ${carta.indice + 1}: ${carta.tipo === "termino" ? "Término" : "Definición"} ${carta.texto}, ya emparejada`
        : estaVolteada
        ? `Tarjeta ${carta.indice + 1}: ${carta.tipo === "termino" ? "Término" : "Definición"} ${carta.texto}`
        : `Tarjeta ${carta.indice + 1}: boca abajo`;

      return `
        <button type="button" class="carta-pareja ${claseEstado}" data-indice="${carta.indice}" aria-label="${ui.escapar(ariaLabel)}" ${carta.emparejada ? "disabled" : ""}>
          <div class="carta-pareja__interior">
            <div class="carta-pareja__frente">
              <span class="carta-pareja__frente-icono" aria-hidden="true">🃏</span>
              <span class="carta-pareja__frente-sub">Memoria</span>
            </div>
            <div class="carta-pareja__dorso">
              <span class="carta-pareja__tipo">${carta.tipo === "termino" ? "Concepto" : "Definición"}</span>
              <span class="carta-pareja__texto ${carta.tipo === "termino" ? "carta-pareja__texto--termino" : ""}">${ui.escapar(carta.texto)}</span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  contenido.innerHTML = `
    <div class="pareja-juego">
      <header class="pareja__cabecera">
        <div>
          <a href="/paginas/actividades.html" class="btn btn--texto btn--pequeno" style="padding-left: 0;">&larr; Volver a Actividades</a>
          <h1 class="h2" style="margin-bottom: 2px;">Encuentra la Pareja</h1>
          <div class="pareja__tema-info">📚 Tema: ${ui.escapar(temaActual.titulo)}</div>
        </div>

        <div class="fila" style="gap: var(--espacio-s); align-items: center;">
          <label for="selDificultad" class="etiqueta" style="margin: 0; font-size: var(--tamano-xs);">Dificultad:</label>
          <select id="selDificultad" class="select" style="min-width: 130px; padding: var(--espacio-xs) var(--espacio-s); font-size: var(--tamano-s);">
            ${opcionesDificultad}
          </select>
          <button type="button" class="btn btn--secundario btn--pequeno" id="btnCambiarTema">
            Cambiar tema
          </button>
        </div>
      </header>

      <div class="pareja__marcador-panel">
        <div class="pareja__metricas">
          <div class="pareja__metrica-item">
            <span class="pareja__metrica-num" id="metricaParejas">${parejasEncontradas} / ${totalParejas}</span>
            <span class="pareja__metrica-label">Parejas</span>
          </div>
          <div class="pareja__metrica-item">
            <span class="pareja__metrica-num" id="metricaIntentos">${intentos}</span>
            <span class="pareja__metrica-label">Intentos</span>
          </div>
          <div class="pareja__metrica-item">
            <span class="pareja__metrica-num" id="metricaTiempo">00:00</span>
            <span class="pareja__metrica-label">Tiempo</span>
          </div>
        </div>

        <button type="button" class="btn btn--secundario btn--pequeno" id="btnReiniciar">
          🔄 Reiniciar partida
        </button>
      </div>

      <div class="pareja__grid" id="tableroParejas" role="region" aria-label="Tablero de tarjetas">
        ${gridHtml}
      </div>

      <div id="panel-retro"></div>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const selDif = document.getElementById("selDificultad");
  if (selDif) {
    selDif.addEventListener("change", (e) => {
      dificultadSeleccionada = parseInt(e.target.value, 10) || 6;
      iniciarPartida();
    });
  }

  const btnCambiar = document.getElementById("btnCambiarTema");
  if (btnCambiar) {
    btnCambiar.addEventListener("click", () => {
      window.location.href = "/paginas/pareja.html";
    });
  }

  const btnReiniciar = document.getElementById("btnReiniciar");
  if (btnReiniciar) {
    btnReiniciar.addEventListener("click", () => {
      iniciarPartida();
    });
  }

  // Clic en tarjetas
  document.querySelectorAll(".carta-pareja").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-indice"), 10);
      if (!isNaN(idx)) manejarVolteoCarta(idx);
    });
  });
}

async function manejarVolteoCarta(indice) {
  if (bloqueoTablero) return;

  const carta = cartas[indice];
  if (!carta || carta.emparejada) return;

  // Si ya está seleccionada como primera carta volteada, ignorar
  if (cartasVolteadas.some((c) => c.indice === indice)) return;

  // Voltear carta en estado y DOM
  cartasVolteadas.push(carta);
  const btnEl = document.querySelector(`.carta-pareja[data-indice="${indice}"]`);
  if (btnEl) {
    btnEl.classList.add("carta-pareja--volteada");
    btnEl.setAttribute("aria-label", `Tarjeta ${indice + 1}: ${carta.tipo === "termino" ? "Término" : "Definición"} ${carta.texto}`);
  }

  // Si hay dos cartas volteadas, verificar coincidencia
  if (cartasVolteadas.length === 2) {
    intentos++;
    const metricaIntentosEl = document.getElementById("metricaIntentos");
    if (metricaIntentosEl) metricaIntentosEl.textContent = intentos;

    const [c1, c2] = cartasVolteadas;
    const esPareja = c1.terminoId === c2.terminoId;

    if (esPareja) {
      // Pareja correcta
      c1.emparejada = true;
      c2.emparejada = true;
      parejasEncontradas++;

      const btn1 = document.querySelector(`.carta-pareja[data-indice="${c1.indice}"]`);
      const btn2 = document.querySelector(`.carta-pareja[data-indice="${c2.indice}"]`);

      if (btn1) {
        btn1.classList.remove("carta-pareja--volteada");
        btn1.classList.add("carta-pareja--emparejada");
        btn1.disabled = true;
      }
      if (btn2) {
        btn2.classList.remove("carta-pareja--volteada");
        btn2.classList.add("carta-pareja--emparejada");
        btn2.disabled = true;
      }

      const metricaParejasEl = document.getElementById("metricaParejas");
      if (metricaParejasEl) {
        metricaParejasEl.textContent = `${parejasEncontradas} / ${totalParejas}`;
      }

      // Retroalimentación inmediata con la definición del concepto
      mostrarRetro({
        correcto: true,
        explicacion: c1.definicion
      });

      cartasVolteadas = [];

      // Verificar si completó el juego
      if (parejasEncontradas === totalParejas) {
        await finalizarJuego();
      }
    } else {
      // No coinciden: esperar 1.2 segundos y voltear de vuelta
      bloqueoTablero = true;
      setTimeout(() => {
        const btn1 = document.querySelector(`.carta-pareja[data-indice="${c1.indice}"]`);
        const btn2 = document.querySelector(`.carta-pareja[data-indice="${c2.indice}"]`);

        if (btn1) {
          btn1.classList.remove("carta-pareja--volteada");
          btn1.setAttribute("aria-label", `Tarjeta ${c1.indice + 1}: boca abajo`);
        }
        if (btn2) {
          btn2.classList.remove("carta-pareja--volteada");
          btn2.setAttribute("aria-label", `Tarjeta ${c2.indice + 1}: boca abajo`);
        }

        cartasVolteadas = [];
        bloqueoTablero = false;
      }, 1200);
    }
  }
}

async function finalizarJuego() {
  if (intervaloTimer) clearInterval(intervaloTimer);

  const duracionSeg = Math.max(1, Math.round((Date.now() - tiempoInicio) / 1000));
  const errores = Math.max(0, intentos - totalParejas);
  const puntaje = Math.max(0, 10 - errores);

  // Registrar intento en el motor de gamificación
  try {
    await registrarIntento({
      actividad: "pareja",
      temaId: temaActual.id,
      puntaje,
      maximo: 10,
      errores,
      duracionSeg
    });
  } catch (err) {
    console.warn("No se pudo registrar intento de pareja:", err);
  }

  // Modal de resumen
  const accion = await mostrarResumen({
    titulo: "¡Felicitaciones! Has completado el tablero",
    aciertos: totalParejas,
    errores,
    recomendaciones: "Demostraste gran memoria y asociación conceptual.",
    enlaceTema: `/paginas/tema.html?id=${encodeURIComponent(temaActual.id)}`
  });

  if (accion === "repetir") {
    iniciarPartida();
  }
}

await inicializar();
