// servidor/ganchos/preguntas.js · Reglas de acceso y validación para el banco de preguntas

import * as almacen from "../almacen.js";
import { asignaturasDe, asignaturaDeTema, puedeEditarAsignatura } from "../acceso.js";

/**
 * Filtra las preguntas visibles según las asignaturas del usuario docente.
 * Los administradores tienen acceso total.
 */
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

  return lista.filter((p) => {
    const asigId = mapaTemas.get(p.temaId);
    return asigId && permitidas.includes(asigId);
  });
}

/**
 * Valida la edición de preguntas y comprueba que el usuario pueda editar la asignatura vinculada.
 */
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
    const error = new Error("No se encontró la asignatura asociada al tema");
    error.estado = 400;
    throw error;
  }

  const puede = await puedeEditarAsignatura(usuario, asignaturaId);
  if (!puede) {
    const error = new Error("No tienes permisos para editar preguntas en esta asignatura");
    error.estado = 403;
    throw error;
  }

  // Validaciones del esquema de pregunta
  if (datos.nivel !== undefined) {
    const n = Number(datos.nivel);
    if (![1, 2, 3, 4, 5].includes(n)) {
      const error = new Error("El nivel debe ser un número entre 1 y 5");
      error.estado = 400;
      throw error;
    }
    datos.nivel = n;
  }

  if (datos.tipo && !["opcion", "vf", "completar"].includes(datos.tipo)) {
    const error = new Error("El tipo debe ser 'opcion', 'vf' o 'completar'");
    error.estado = 400;
    throw error;
  }

  if (datos.enunciado !== undefined && typeof datos.enunciado === "string") {
    datos.enunciado = datos.enunciado.trim();
    if (!datos.enunciado) {
      const error = new Error("El enunciado de la pregunta no puede estar vacío");
      error.estado = 400;
      throw error;
    }
  }

  if (datos.estado && !["aprobado", "borrador"].includes(datos.estado)) {
    datos.estado = "aprobado";
  }

  if (!datos.origen && !anterior) {
    datos.origen = "docente";
  }

  return datos;
}

export default {
  filtrarLista,
  antesDeGuardar
};
