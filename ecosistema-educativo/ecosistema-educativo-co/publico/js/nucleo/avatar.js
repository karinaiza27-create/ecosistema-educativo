// publico/js/nucleo/avatar.js · Avatar guía pedagógico interactivo con voz y animación CSS

let estadoActual = "reposo";
let ultimoTexto = "";
let widgetEl = null;
let globoEl = null;
let textoEl = null;
let btnVozEl = null;
let btnReabrirEl = null;

const SVG_PERSONAJE = `
<svg class="avatar-svg" viewBox="0 0 100 100" width="70" height="70" aria-label="Avatar guía pedagógico" role="img">
  <defs>
    <radialGradient id="avatarGrad" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="var(--acento, #ffd166)"/>
      <stop offset="100%" stop-color="var(--primario, #4361ee)"/>
    </radialGradient>
  </defs>
  <!-- Brazos articulados -->
  <g class="avatar-brazo-izq">
    <ellipse cx="22" cy="62" rx="7" ry="14" fill="var(--primario, #4361ee)" transform="rotate(15 22 62)"/>
  </g>
  <g class="avatar-brazo-der">
    <ellipse cx="78" cy="62" rx="7" ry="14" fill="var(--primario, #4361ee)" transform="rotate(-15 78 62)"/>
  </g>
  <!-- Cabeza y rostro -->
  <g class="avatar-cabeza">
    <!-- Birrete académico -->
    <polygon points="50,14 26,26 50,34 74,26" fill="var(--texto, #1a202c)"/>
    <rect x="42" y="27" width="16" height="8" rx="2" fill="var(--primario-oscuro, #3a0ca3)"/>
    <line x1="68" y1="28" x2="72" y2="38" stroke="var(--peligro, #ef476f)" stroke-width="2"/>
    <circle cx="72" cy="38" r="2.5" fill="var(--peligro, #ef476f)"/>
    <!-- Cabeza -->
    <circle cx="50" cy="56" r="28" fill="url(#avatarGrad)"/>
    <!-- Ojos -->
    <circle class="avatar-ojo" cx="40" cy="52" r="7" fill="#ffffff"/>
    <circle class="avatar-ojo" cx="60" cy="52" r="7" fill="#ffffff"/>
    <circle class="avatar-pupila" cx="40" cy="52" r="3.5" fill="#1a202c"/>
    <circle class="avatar-pupila" cx="60" cy="52" r="3.5" fill="#1a202c"/>
    <circle cx="42" cy="50" r="1.5" fill="#ffffff"/>
    <circle cx="62" cy="50" r="1.5" fill="#ffffff"/>
    <!-- Mejillas -->
    <circle cx="34" cy="61" r="3.5" fill="rgba(255, 100, 100, 0.4)"/>
    <circle cx="66" cy="61" r="3.5" fill="rgba(255, 100, 100, 0.4)"/>
    <!-- Boca -->
    <path class="avatar-boca" d="M 43 65 Q 50 72 57 65" stroke="#1a202c" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </g>
</svg>
`;

/**
 * Obtiene la mejor voz en español disponible en el navegador.
 */
function obtenerVozEspanol() {
  if (!("speechSynthesis" in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  return (
    voces.find((v) => v.lang === "es-EC") ||
    voces.find((v) => v.lang.startsWith("es-")) ||
    voces.find((v) => v.lang.toLowerCase().startsWith("es")) ||
    null
  );
}

/**
 * Cambia el estado visual del avatar entre:
 * "reposo" | "hablando" | "pensando" | "celebrando"
 */
export function cambiarEstado(nuevoEstado) {
  const estadosValidos = ["reposo", "hablando", "pensando", "celebrando"];
  if (!estadosValidos.includes(nuevoEstado)) {
    nuevoEstado = "reposo";
  }

  estadoActual = nuevoEstado;

  if (!widgetEl) {
    widgetEl = document.getElementById("avatar-guia-widget");
  }

  if (widgetEl) {
    estadosValidos.forEach((est) => {
      widgetEl.classList.remove(`avatar-guia--${est}`);
    });
    widgetEl.classList.add(`avatar-guia--${nuevoEstado}`);
  }
}

/**
 * Muestra el texto en el globo y, si la voz está activa, lo sintetiza.
 */
export function decir(texto) {
  if (!texto) return;
  ultimoTexto = texto;

  montarAvatar();

  if (textoEl) {
    textoEl.textContent = texto;
  }
  if (globoEl) {
    globoEl.style.display = "flex";
  }

  const vozActiva = localStorage.getItem("avatar_voz_activa") !== "false";
  const estaOculto = localStorage.getItem("avatar_oculto") === "true";

  if (!estaOculto && vozActiva && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const emision = new SpeechSynthesisUtterance(texto);
      const voz = obtenerVozEspanol();
      if (voz) emision.voice = voz;
      emision.lang = voz ? voz.lang : "es-EC";

      cambiarEstado("hablando");

      emision.onend = () => {
        if (estadoActual === "hablando") cambiarEstado("reposo");
      };
      emision.onerror = () => {
        if (estadoActual === "hablando") cambiarEstado("reposo");
      };

      window.speechSynthesis.speak(emision);
    } catch {
      cambiarEstado("hablando");
      setTimeout(() => {
        if (estadoActual === "hablando") cambiarEstado("reposo");
      }, 2000);
    }
  } else if (!estaOculto) {
    cambiarEstado("hablando");
    setTimeout(() => {
      if (estadoActual === "hablando") cambiarEstado("reposo");
    }, 1500);
  }
}

/**
 * Monta el avatar y su botón de restauración en el DOM si no existen.
 */
export function montarAvatar() {
  widgetEl = document.getElementById("avatar-guia-widget");
  btnReabrirEl = document.getElementById("avatar-reabrir-btn");

  if (widgetEl) return;

  const vozActiva = localStorage.getItem("avatar_voz_activa") !== "false";
  const estaOculto = localStorage.getItem("avatar_oculto") === "true";

  // 1. Contenedor del avatar
  widgetEl = document.createElement("aside");
  widgetEl.id = "avatar-guia-widget";
  widgetEl.className = `avatar-guia-contenedor avatar-guia--${estadoActual}`;
  widgetEl.setAttribute("aria-label", "Avatar guía interactivo");
  if (estaOculto) {
    widgetEl.style.display = "none";
  }

  widgetEl.innerHTML = `
    <div class="avatar-globo" id="avatar-globo" role="status" aria-live="polite">
      <p class="avatar-globo__texto" id="avatar-globo-texto">¡Hola! Estoy aquí para acompañarte.</p>
      <div class="avatar-globo__acciones">
        <button type="button" class="avatar-globo__btn" id="avatar-btn-voz" aria-label="Alternar voz del avatar">
          ${vozActiva ? "Silenciar voz" : "Activar voz"}
        </button>
        <button type="button" class="avatar-globo__btn" id="avatar-btn-ocultar" aria-label="Ocultar avatar guía">
          Ocultar
        </button>
      </div>
    </div>
    <div class="avatar-personaje" id="avatar-personaje" role="button" tabindex="0" title="Avatar guía · Clic para escuchar" aria-label="Avatar guía">
      ${SVG_PERSONAJE.trim()}
    </div>
  `;

  // 2. Botón flotante para reabrir cuando esté oculto
  btnReabrirEl = document.createElement("button");
  btnReabrirEl.type = "button";
  btnReabrirEl.id = "avatar-reabrir-btn";
  btnReabrirEl.className = "avatar-reabrir-btn";
  btnReabrirEl.setAttribute("aria-label", "Mostrar avatar guía");
  btnReabrirEl.innerHTML = "💡 Guía";
  btnReabrirEl.style.position = "fixed";
  btnReabrirEl.style.bottom = "var(--espacio-l)";
  btnReabrirEl.style.right = "var(--espacio-l)";
  btnReabrirEl.style.zIndex = "999";
  btnReabrirEl.style.display = estaOculto ? "inline-flex" : "none";

  document.body.appendChild(widgetEl);
  document.body.appendChild(btnReabrirEl);

  globoEl = document.getElementById("avatar-globo");
  textoEl = document.getElementById("avatar-globo-texto");
  btnVozEl = document.getElementById("avatar-btn-voz");
  const btnOcultarEl = document.getElementById("avatar-btn-ocultar");
  const personajeEl = document.getElementById("avatar-personaje");

  // Evento alternar voz
  btnVozEl.addEventListener("click", () => {
    const estadoPrevio = localStorage.getItem("avatar_voz_activa") !== "false";
    const nuevoEstado = !estadoPrevio;
    localStorage.setItem("avatar_voz_activa", String(nuevoEstado));
    btnVozEl.textContent = nuevoEstado ? "Silenciar voz" : "Activar voz";

    if (!nuevoEstado && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (estadoActual === "hablando") cambiarEstado("reposo");
    } else if (nuevoEstado && ultimoTexto) {
      decir(ultimoTexto);
    }
  });

  // Evento ocultar
  btnOcultarEl.addEventListener("click", () => {
    localStorage.setItem("avatar_oculto", "true");
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    cambiarEstado("reposo");
    widgetEl.style.display = "none";
    btnReabrirEl.style.display = "inline-flex";
  });

  // Evento reabrir
  btnReabrirEl.addEventListener("click", () => {
    localStorage.setItem("avatar_oculto", "false");
    widgetEl.style.display = "flex";
    btnReabrirEl.style.display = "none";
    if (ultimoTexto) {
      decir(ultimoTexto);
    }
  });

  // Evento clic o enter en el personaje para repetir
  const repetir = () => {
    if (ultimoTexto) {
      decir(ultimoTexto);
    }
  };
  personajeEl.addEventListener("click", repetir);
  personajeEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      repetir();
    }
  });

  // Carga diferida de voces si el navegador lo requiere
  if ("speechSynthesis" in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
}

export default {
  montarAvatar,
  decir,
  cambiarEstado
};
