// servidor/ganchos/unidades.js · Reglas de acceso y edición para unidades didácticas

import { asignaturasDe, puedeEditarAsignatura } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  const permitidas = await asignaturasDe(usuario);

  if (usuario.rol === "estudiante") {
    return lista.filter(
      (u) => permitidas.includes(u.asignaturaId) && u.visible !== false
    );
  }

  return lista.filter((u) => permitidas.includes(u.asignaturaId));
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  const asignaturaId = datos.asignaturaId || (anterior && anterior.asignaturaId);
  const puede = await puedeEditarAsignatura(usuario, asignaturaId);

  if (!puede) {
    const error = new Error("No tienes permisos para editar esta asignatura");
    error.estado = 403;
    throw error;
  }

  return datos;
}

export default {
  filtrarLista,
  antesDeGuardar
};
