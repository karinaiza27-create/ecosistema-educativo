// servidor/ganchos/logros.js · Reglas de acceso para logros de gamificación

import { estudiantesDe } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  if (usuario.rol === "docente") {
    const estudiantes = await estudiantesDe(usuario.id);
    return lista.filter((l) => estudiantes.includes(l.usuarioId));
  }

  if (usuario.rol === "estudiante") {
    return lista.filter((l) => l.usuarioId === usuario.id);
  }

  return [];
}

export default {
  filtrarLista
};
