// servidor/ganchos/progreso-temas.js · Reglas de acceso y registro para progreso de temas

import * as almacen from "../almacen.js";
import { estudiantesDe } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  if (usuario.rol === "docente") {
    const estudiantes = await estudiantesDe(usuario.id);
    return lista.filter((p) => estudiantes.includes(p.usuarioId));
  }

  if (usuario.rol === "estudiante") {
    return lista.filter((p) => p.usuarioId === usuario.id);
  }

  return [];
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;
  if (!usuario) {
    const err = new Error("No autorizado");
    err.estado = 401;
    throw err;
  }

  const copia = { ...datos };
  copia.usuarioId = usuario.id;

  const temaId = copia.temaId || (anterior && anterior.temaId);
  if (!temaId) {
    const error = new Error("El temaId es obligatorio");
    error.estado = 400;
    throw error;
  }

  const progreso = await almacen.leer("progreso-temas");
  const existeDuplicado = progreso.some(
    (p) =>
      p.usuarioId === usuario.id &&
      p.temaId === temaId &&
      (!anterior || p.id !== anterior.id)
  );

  if (existeDuplicado) {
    const error = new Error("El progreso para este tema ya ha sido registrado");
    error.estado = 400;
    throw error;
  }

  return copia;
}

export default {
  filtrarLista,
  antesDeGuardar
};
