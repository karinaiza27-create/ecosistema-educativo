// servidor/ganchos/lecturas-noticias.js · Registro y control de lecturas de noticias

import * as almacen from "../almacen.js";

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;
  if (!usuario) {
    const err = new Error("No autorizado");
    err.estado = 401;
    throw err;
  }

  const copia = { ...datos };
  copia.usuarioId = usuario.id;

  const noticiaId = copia.noticiaId || (anterior && anterior.noticiaId);
  if (!noticiaId) {
    const error = new Error("El noticiaId es obligatorio");
    error.estado = 400;
    throw error;
  }

  if (!copia.fecha) {
    copia.fecha = new Date().toISOString();
  }

  const lecturas = await almacen.leer("lecturas-noticias");
  const existeDuplicado = lecturas.some(
    (l) =>
      l.usuarioId === usuario.id &&
      l.noticiaId === noticiaId &&
      (!anterior || l.id !== anterior.id)
  );

  if (existeDuplicado) {
    const error = new Error("La noticia ya ha sido marcada como leída");
    error.estado = 400;
    throw error;
  }

  return copia;
}

export default {
  antesDeGuardar
};
