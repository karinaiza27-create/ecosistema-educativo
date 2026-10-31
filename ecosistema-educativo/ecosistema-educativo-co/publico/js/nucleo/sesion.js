// publico/js/nucleo/sesion.js · Gestión de sesión, tokens y control de acceso en el navegador

import { llamar } from "./api.js";
import { aviso } from "./ui.js";

export function token() {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem("token");
}

export function usuarioActual() {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem("usuario");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function iniciar(correo, clave) {
  const res = await llamar("POST", "/api/auth/login", { correo, clave });
  sessionStorage.setItem("token", res.token);
  sessionStorage.setItem("usuario", JSON.stringify(res.usuario));
  return res.usuario;
}

export async function registrar(datos) {
  await llamar("POST", "/api/auth/registro", datos);
  return iniciar(datos.correo, datos.clave);
}

export async function cerrar() {
  try {
    await llamar("POST", "/api/auth/logout");
  } catch {
    // Continuar con limpieza local incluso ante fallos de red
  } finally {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    window.location.href = "/paginas/ingreso.html";
  }
}

export function exigirRol(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0 || roles.includes("publico")) {
    return true;
  }

  const usuario = usuarioActual();

  // Sin sesión -> redirigir al formulario de ingreso
  if (!usuario) {
    sessionStorage.setItem("aviso_pendiente", JSON.stringify({
      texto: "Debes iniciar sesión para acceder a este recurso.",
      tipo: "advertencia"
    }));
    window.location.href = "/paginas/ingreso.html";
    throw new Error("Redirigiendo a ingreso...");
  }

  // Si requiere sesión genérica y existe usuario
  if (roles.includes("sesion")) {
    return true;
  }

  // Rol no permitido -> redirigir a inicio con aviso
  if (!roles.includes(usuario.rol)) {
    sessionStorage.setItem("aviso_pendiente", JSON.stringify({
      texto: "No tienes permisos suficientes para acceder a esta página.",
      tipo: "error"
    }));
    window.location.href = "/index.html";
    throw new Error("Acceso denegado...");
  }

  return true;
}

export default {
  token,
  usuarioActual,
  iniciar,
  registrar,
  cerrar,
  exigirRol
};
