// publico/js/nucleo/plantilla.js · Renderizado de encabezado, menú filtrado por rol y pie común

import { MENU } from "./menu.js";
import { usuarioActual, exigirRol, cerrar } from "./sesion.js";
import { registrarEvento } from "./bitacora.js";
import { aviso, escapar } from "./ui.js";
import * as api from "./api.js";
import { logrosDe } from "./gamificacion.js";
import { montarAvatar, decir } from "./avatar.js";

export const NOMBRE = "Ecosistema Educativo";

export async function montarPlantilla({ titulo = "", roles = [] } = {}) {
  // 1. Control de acceso si se especifican roles
  if (roles && roles.length > 0) {
    exigirRol(roles);
  }

  // 2. Título del documento
  document.title = titulo ? `${titulo} · ${NOMBRE}` : NOMBRE;

  const plantillaEl = document.getElementById("plantilla");
  if (!plantillaEl) {
    console.error("No se encontró el contenedor #plantilla en el DOM.");
    return;
  }

  // 3. Usuario en sesión y filtrado de menú por rol
  const usuario = usuarioActual();
  const rutaActual = window.location.pathname || "/";
  const esInicio = rutaActual === "/" || rutaActual === "/index.html" || rutaActual.endsWith("/index.html");

  let noticiasNoLeidas = 0;
  let mensajesNoLeidos = 0;
  if (usuario) {
    try {
      const [noticias, lecturas, resMensajes] = await Promise.all([
        api.listar("noticias"),
        api.listar("lecturas-noticias"),
        api.llamar("GET", "/api/mensajes/no-leidos").catch(() => ({ total: 0 }))
      ]);
      const publicadas = (noticias || []).filter((n) => n && n.estado === "publicado");
      const leidasIds = new Set((lecturas || []).map((l) => l && l.noticiaId));
      noticiasNoLeidas = publicadas.filter((n) => !leidasIds.has(n.id)).length;
      mensajesNoLeidos = resMensajes?.total || 0;
    } catch {
      // Ignorar error al cargar conteo de noticias o mensajes
    }
  }

  const enlacesVisibles = MENU.filter((item) => {
    if (!item.roles || item.roles.includes("publico")) return true;
    if (item.roles.includes("sesion") && usuario) return true;
    if (usuario && item.roles.includes(usuario.rol)) return true;
    return false;
  });

  const enlacesHtml = enlacesVisibles.map((item) => {
    const esActivo = (item.href === "/index.html" && esInicio) ||
      (item.href !== "/index.html" && rutaActual.endsWith(item.href));
    const ariaCurrent = esActivo ? ' aria-current="page"' : "";
    const claseActiva = esActivo ? " menu__enlace--activo" : "";

    let badgeHtml = "";
    if (item.texto === "Noticias" && noticiasNoLeidas > 0) {
      badgeHtml = `<span class="insignia insignia--acento" style="margin-left: auto; font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radio-total);">${noticiasNoLeidas}</span>`;
    } else if (item.texto === "Mensajes" && mensajesNoLeidos > 0) {
      badgeHtml = `<span class="insignia insignia--acento" id="badge-mensajes-no-leidos" style="margin-left: auto; font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radio-total);">${mensajesNoLeidos}</span>`;
    }

    return `<a href="${item.href}" class="menu__enlace${claseActiva}"${ariaCurrent}><span>${item.texto}</span>${badgeHtml}</a>`;
  }).join("");

  // 4. Bloque de usuario en el encabezado
  let usuarioAreaHtml = "";
  if (usuario) {
    let puntosHtml = "";
    if (usuario.rol === "estudiante") {
      let puntos = 0;
      try {
        const logros = await logrosDe("yo");
        puntos = (logros && logros.puntos) || 0;
      } catch {}
      puntosHtml = `<span class="puntos-usuario" id="puntos-usuario" title="Tus puntos acumulados">⭐ ${puntos} pts</span>`;
    }

    usuarioAreaHtml = `
      <div class="encabezado__usuario-area fila" style="gap: var(--espacio-s); align-items: center;">
        ${puntosHtml}
        <a href="/paginas/perfil.html" class="encabezado__perfil-enlace fila" style="gap: var(--espacio-xs); color: var(--texto-inverso); text-decoration: none;" title="Ver perfil">
          <span class="encabezado__usuario-nombre">${escapar(usuario.nombre)} ${escapar(usuario.apellido)}</span>
          <span class="insignia insignia--acento">${escapar(usuario.rol)}</span>
        </a>
        <button type="button" class="btn btn--secundario btn--pequeno" id="btnCerrarSesion">Salir</button>
      </div>
    `;
  } else {
    usuarioAreaHtml = `
      <div class="encabezado__usuario-area fila" style="gap: var(--espacio-s);">
        <a href="/paginas/ingreso.html" class="btn btn--texto btn--pequeno" style="color: var(--texto-inverso);">Ingresar</a>
        <a href="/paginas/registro.html" class="btn btn--acento btn--pequeno">Registrarse</a>
      </div>
    `;
  }

  // 5. Inserción en #plantilla
  plantillaEl.innerHTML = `
    <header class="encabezado app-encabezado">
      <div class="contenedor encabezado__contenedor">
        <div class="encabezado__marca-grupo">
          <button type="button" class="menu-boton-movil" id="btnMenuMovil" aria-label="Abrir menú de navegación" aria-expanded="false">
            ☰
          </button>
          <a href="/index.html" class="encabezado__marca">
            <span>UNEMI</span>
            <span class="encabezado__submarca">| ${NOMBRE}</span>
          </a>
        </div>
        <div class="encabezado__titulo-pagina" id="encabezadoTitulo">${titulo}</div>
        ${usuarioAreaHtml}
      </div>
    </header>
    <div class="menu-telon" id="telonMenu" aria-hidden="true"></div>
    <aside class="menu app-menu" id="menuLateral" aria-label="Navegación principal">
      <span class="menu__seccion">Navegación</span>
      ${enlacesHtml}
    </aside>
  `;

  // 6. Pie al final del body si no existe
  let pieEl = document.querySelector(".app-pie");
  if (!pieEl) {
    pieEl = document.createElement("footer");
    pieEl.className = "pie app-pie";
    const anio = new Date().getFullYear();
    pieEl.innerHTML = `
      <div class="contenedor pie__copy">
        &copy; ${anio} ${NOMBRE} · Todos los derechos reservados.
      </div>
    `;
    document.body.appendChild(pieEl);
  }

  // 7. Evento cerrar sesión
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", () => cerrar());
  }

  // 8. Comportamiento responsive del menú
  const btnMenuMovil = document.getElementById("btnMenuMovil");
  const menuLateral = document.getElementById("menuLateral");
  const telonMenu = document.getElementById("telonMenu");

  if (btnMenuMovil && menuLateral && telonMenu) {
    const alternar = (forzarCierre = false) => {
      const estaAbierto = forzarCierre ? false : !menuLateral.classList.contains("abierto");
      menuLateral.classList.toggle("abierto", estaAbierto);
      telonMenu.classList.toggle("visible", estaAbierto);
      btnMenuMovil.setAttribute("aria-expanded", String(estaAbierto));
    };

    btnMenuMovil.addEventListener("click", () => alternar());
    telonMenu.addEventListener("click", () => alternar(true));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuLateral.classList.contains("abierto")) {
        alternar(true);
      }
    });
  }

  // 9. Registrar evento en bitácora si hay sesión activa (sin esperar respuesta)
  if (usuario) {
    registrarEvento("pagina", window.location.pathname).catch(() => {});
  }

  // 10. Mostrar avisos pendientes guardados entre redirecciones
  try {
    const avisoGuardado = sessionStorage.getItem("aviso_pendiente");
    if (avisoGuardado) {
      sessionStorage.removeItem("aviso_pendiente");
      const { texto, tipo } = JSON.parse(avisoGuardado);
      aviso(texto, tipo);
    }
  } catch {}

  // 11. Sondeo periódico de mensajes no leídos cada 60 s
  if (usuario) {
    setInterval(async () => {
      try {
        const res = await api.llamar("GET", "/api/mensajes/no-leidos");
        const total = res?.total || 0;
        const badge = document.getElementById("badge-mensajes-no-leidos");
        if (total > 0) {
          if (badge) {
            badge.textContent = String(total);
            badge.style.display = "inline-block";
          } else {
            const enlaceMsg = document.querySelector('a.menu__enlace[href*="mensajes.html"]');
            if (enlaceMsg) {
              const span = document.createElement("span");
              span.id = "badge-mensajes-no-leidos";
              span.className = "insignia insignia--acento";
              span.style.cssText = "margin-left: auto; font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radio-total);";
              span.textContent = String(total);
              enlaceMsg.appendChild(span);
            }
          }
        } else if (badge) {
          badge.style.display = "none";
        }
      } catch {}
    }, 60000);
  }

  // 12. Avatar guía pedagógico si la página define data-avatar
  const elAvatar = document.querySelector("[data-avatar]");
  if (elAvatar) {
    const instrucciones = elAvatar.getAttribute("data-avatar");
    if (instrucciones) {
      montarAvatar();
      decir(instrucciones);
    }
  }
}

export default {
  NOMBRE,
  montarPlantilla
};
