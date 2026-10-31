// servidor/notificar.js · Sistema de notificaciones en el servidor

import * as almacen from "./almacen.js";

/**
 * Registra una notificación para un usuario.
 * @param {string} usuarioId - ID del destinatario
 * @param {object} datos - { tipo, mensaje, enlace }
 */
export async function notificar(usuarioId, { tipo = "sistema", mensaje = "", enlace = "" } = {}) {
  if (!usuarioId) return null;

  const notificacion = {
    usuarioId,
    tipo,
    mensaje,
    enlace,
    leida: false
  };

  try {
    return await almacen.agregar("notificaciones", notificacion);
  } catch (err) {
    console.warn("No se pudo guardar notificación:", err.message);
    return null;
  }
}

export default {
  notificar
};
