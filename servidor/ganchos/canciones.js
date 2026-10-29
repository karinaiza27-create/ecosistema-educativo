// servidor/ganchos/canciones.js · Reglas de acceso y edición para canciones educativas

import * as almacen from "../almacen.js";
import { asignaturasDe, asignaturaDeTema, puedeEditarAsignatura } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  const [temas, unidades] = await Promise.all([
    almacen.leer("temas"),
    almacen.leer("unidades")
  ]);

  const mapaUnidades = new Map(unidades.map((u) => [u.id, u.asignaturaId]));
  const mapaTemas = new Map(temas.map((t) => [t.id, mapaUnidades.get(t.unidadId)]));

  const permitidas = await asignaturasDe(usuario);

  return lista.filter((c) => {
    const asigId = mapaTemas.get(c.temaId);
    return asigId && permitidas.includes(asigId);
  });
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  const temaId = datos.temaId || (anterior && anterior.temaId);
  if (!temaId) {
    const error = new Error("El temaId es obligatorio");
    error.estado = 400;
    throw error;
  }

  const asignaturaId = await asignaturaDeTema(temaId);
  if (!asignaturaId) {
    const error = new Error("No se encontró la asignatura vinculada a este tema");
    error.estado = 400;
    throw error;
  }

  const puede = await puedeEditarAsignatura(usuario, asignaturaId);
  if (!puede) {
    const error = new Error("No tienes permisos para editar canciones en esta asignatura");
    error.estado = 403;
    throw error;
  }

  return datos;
}

export default {
  filtrarLista,
  antesDeGuardar
};
