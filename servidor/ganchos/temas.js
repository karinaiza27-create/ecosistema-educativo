// servidor/ganchos/temas.js · Reglas de acceso y edición para temas

import * as almacen from "../almacen.js";
import { asignaturasDe, puedeEditarAsignatura } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  const unidades = await almacen.leer("unidades");
  const mapaUnidades = new Map(unidades.map((u) => [u.id, u]));
  const permitidas = await asignaturasDe(usuario);

  if (usuario.rol === "estudiante") {
    return lista.filter((t) => {
      const u = mapaUnidades.get(t.unidadId);
      if (!u || !permitidas.includes(u.asignaturaId)) return false;
      if (u.visible === false) return false;
      return t.estado === "publicado";
    });
  }

  if (usuario.rol === "docente") {
    return lista.filter((t) => {
      const u = mapaUnidades.get(t.unidadId);
      return u && permitidas.includes(u.asignaturaId);
    });
  }

  return [];
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  const unidadId = datos.unidadId || (anterior && anterior.unidadId);
  const unidades = await almacen.leer("unidades");
  const unidad = unidades.find((u) => u.id === unidadId);
  const asignaturaId = unidad ? unidad.asignaturaId : null;

  const puede = await puedeEditarAsignatura(usuario, asignaturaId);
  if (!puede) {
    const error = new Error("No tienes permisos para editar temas en esta asignatura");
    error.estado = 403;
    throw error;
  }

  return datos;
}

export default {
  filtrarLista,
  antesDeGuardar
};
