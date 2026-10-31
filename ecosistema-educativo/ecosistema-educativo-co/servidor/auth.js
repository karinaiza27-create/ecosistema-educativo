// servidor/auth.js · Autenticación, middleware de usuario y control de roles

import * as almacen from "./almacen.js";

// Borrar sesiones vencidas al cargarse el módulo
try {
  const ahora = new Date();
  const sesiones = await almacen.leer("sesiones");
  const vigentes = sesiones.filter((s) => s.expira && new Date(s.expira) > ahora);
  if (vigentes.length !== sesiones.length) {
    await almacen.escribir("sesiones", vigentes);
  }
} catch (error) {
  // Continuar si aún no existe la colección sesiones
}

export async function cargarUsuario(req, res, next) {
  req.usuario = null;
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next();
  }

  try {
    const sesiones = await almacen.leer("sesiones");
    const sesion = sesiones.find((s) => s.token === token);
    if (!sesion || !sesion.expira) {
      return next();
    }

    if (new Date(sesion.expira) <= new Date()) {
      return next();
    }

    const usuarios = await almacen.leer("usuarios");
    const usuario = usuarios.find((u) => u.id === sesion.usuarioId);
    if (usuario && usuario.activo) {
      req.usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol
      };
    }
  } catch (err) {
    console.error("Error en cargarUsuario:", err);
  }

  next();
}

export function exigirRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "No autorizado" });
    }
    if (roles.length > 0 && !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    next();
  };
}

export default {
  cargarUsuario,
  exigirRol
};
