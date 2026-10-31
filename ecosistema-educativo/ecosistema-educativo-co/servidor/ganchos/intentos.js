// servidor/ganchos/intentos.js · Reglas de acceso para intentos de actividades

import { estudiantesDe } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  if (usuario.rol === "docente") {
    const estudiantes = await estudiantesDe(usuario.id);
    return lista.filter((i) => estudiantes.includes(i.usuarioId));
  }

  if (usuario.rol === "estudiante") {
    return lista.filter((i) => i.usuarioId === usuario.id);
  }

  return [];
}

export default {
  filtrarLista
};
