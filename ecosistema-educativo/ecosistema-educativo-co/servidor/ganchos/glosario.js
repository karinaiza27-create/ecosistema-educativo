// servidor/ganchos/glosario.js · Reglas de acceso y edición para términos del glosario

import * as almacen from "../almacen.js";
import { asignaturasDe, asignaturaDeTema, puedeEditarAsignatura } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  const temas = await almacen.leer("temas");
  const unidades = await almacen.leer("unidades");
  const mapaUnidades = new Map(unidades.map((u) => [u.id, u.asignaturaId]));
  const mapaTemas = new Map(temas.map((t) => [t.id, mapaUnidades.get(t.unidadId)]));

  const permitidas = await asignaturasDe(usuario);

  if (usuario.rol === "estudiante") {
    return lista.filter((g) => {
      const asigId = mapaTemas.get(g.temaId);
      if (!asigId || !permitidas.includes(asigId)) return false;
      return g.estado === "aprobado";
    });
  }

  if (usuario.rol === "docente") {
    return lista.filter((g) => {
      const asigId = mapaTemas.get(g.temaId);
      return asigId && permitidas.includes(asigId);
    });
  }

  return [];
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  const temaId = datos.temaId || (anterior && anterior.temaId);
  const asignaturaId = await asignaturaDeTema(temaId);

  const puede = await puedeEditarAsignatura(usuario, asignaturaId);
  if (!puede) {
    const error = new Error("No tienes permisos para editar glosario en esta asignatura");
    error.estado = 403;
    throw error;
  }

  return datos;
}

export default {
  filtrarLista,
  antesDeGuardar
};
