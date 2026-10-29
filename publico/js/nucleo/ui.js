// publico/js/nucleo/ui.js · Utilidades de interfaz y componentes accesibles

export function escapar(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function limpiar(html) {
  if (typeof window !== "undefined" && window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    return window.DOMPurify.sanitize(html);
  }
  return escapar(html);
}

export function cargando(activo) {
  if (typeof document === "undefined") return;
  let el = document.querySelector(".cargando");
  if (activo) {
    if (!el) {
      el = document.createElement("div");
      el.className = "cargando";
      el.setAttribute("aria-live", "assertive");
      el.setAttribute("aria-label", "Cargando");
      document.body.appendChild(el);
    }
    el.hidden = false;
  } else if (el) {
    el.hidden = true;
  }
}

export function aviso(texto, tipo = "info") {
  if (typeof document === "undefined") return;

  let contenedor = document.getElementById("contenedor-avisos");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "contenedor-avisos";
    contenedor.className = "contenedor-avisos";
    contenedor.setAttribute("aria-live", "polite");
    contenedor.setAttribute("aria-atomic", "false");
    document.body.appendChild(contenedor);
  }

  const tipoNormalizado = ["info", "exito", "error"].includes(tipo) ? tipo : "info";
  const item = document.createElement("div");
  item.className = `aviso aviso--${tipoNormalizado}`;
  item.setAttribute("role", "status");
  item.textContent = String(texto);

  contenedor.appendChild(item);

  setTimeout(() => {
    item.classList.add("aviso--saliendo");
    setTimeout(() => {
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    }, 300);
  }, 4000);
}

export function modal({ titulo = "", contenido = "", acciones = [] } = {}) {
  if (typeof document === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const elementoPrevio = document.activeElement;

    const telon = document.createElement("div");
    telon.className = "modal-telon";
    telon.setAttribute("role", "presentation");

    const idTitulo = `modal-titulo-${Date.now()}`;
    const dialogo = document.createElement("div");
    dialogo.className = "modal-dialogo";
    dialogo.setAttribute("role", "dialog");
    dialogo.setAttribute("aria-modal", "true");
    dialogo.setAttribute("aria-labelledby", idTitulo);
    dialogo.setAttribute("tabindex", "-1");

    const cabecera = document.createElement("header");
    cabecera.className = "modal-cabecera";
    const h2 = document.createElement("h2");
    h2.id = idTitulo;
    h2.textContent = titulo;
    cabecera.appendChild(h2);

    const cuerpo = document.createElement("div");
    cuerpo.className = "modal-cuerpo";
    if (typeof contenido === "string") {
      cuerpo.innerHTML = limpiar(contenido);
    } else if (contenido instanceof HTMLElement) {
      cuerpo.appendChild(contenido);
    }

    const pie = document.createElement("footer");
    pie.className = "modal-pie";

    const listaAcciones = Array.isArray(acciones) && acciones.length > 0
      ? acciones
      : [{ texto: "Aceptar", valor: true, primario: true }];

    const botones = [];

    listaAcciones.forEach((acc) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = `boton ${acc.primario ? "boton--primario" : "boton--secundario"} ${acc.clase || ""}`.trim();
      boton.textContent = acc.texto;
      boton.addEventListener("click", () => cerrar(acc.valor !== undefined ? acc.valor : acc.texto));
      pie.appendChild(boton);
      botones.push(boton);
    });

    dialogo.appendChild(cabecera);
    dialogo.appendChild(cuerpo);
    dialogo.appendChild(pie);
    telon.appendChild(dialogo);
    document.body.appendChild(telon);

    function obtenerEnfocables() {
      const selectores = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(dialogo.querySelectorAll(selectores));
    }

    function manejarTeclado(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar(null);
        return;
      }

      if (e.key === "Tab") {
        const enfocables = obtenerEnfocables();
        if (enfocables.length === 0) {
          e.preventDefault();
          return;
        }

        const primerEnfocable = enfocables[0];
        const ultimoEnfocable = enfocables[enfocables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === primerEnfocable) {
            e.preventDefault();
            ultimoEnfocable.focus();
          }
        } else {
          if (document.activeElement === ultimoEnfocable) {
            e.preventDefault();
            primerEnfocable.focus();
          }
        }
      }
    }

    function clickAfuera(e) {
      if (e.target === telon) {
        cerrar(null);
      }
    }

    telon.addEventListener("click", clickAfuera);
    document.addEventListener("keydown", manejarTeclado);

    // Enfocar el primer botón primario o el primer botón disponible
    const botonPrimario = botones.find((b, idx) => listaAcciones[idx]?.primario) || botones[0];
    if (botonPrimario) {
      botonPrimario.focus();
    } else {
      dialogo.focus();
    }

    function cerrar(resultado) {
      document.removeEventListener("keydown", manejarTeclado);
      telon.removeEventListener("click", clickAfuera);
      if (telon.parentNode) {
        telon.parentNode.removeChild(telon);
      }
      if (elementoPrevio && typeof elementoPrevio.focus === "function") {
        elementoPrevio.focus();
      }
      resolve(resultado);
    }
  });
}

export async function confirmar(texto) {
  const resultado = await modal({
    titulo: "Confirmación",
    contenido: `<p>${escapar(texto)}</p>`,
    acciones: [
      { texto: "Cancelar", valor: false, primario: false },
      { texto: "Aceptar", valor: true, primario: true }
    ]
  });
  return Boolean(resultado);
}

export default {
  escapar,
  limpiar,
  cargando,
  aviso,
  modal,
  confirmar
};
