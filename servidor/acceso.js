// servidor/acceso.js · Control de acceso académico por grupos y asignaturas

import * as almacen from "./almacen.js";

/**
 * Obtiene los grupos del distributivo a los que pertenece el usuario.
 * - Admin: ve todos los grupos.
 * - Docente: grupos donde figura como docenteId.
 * - Estudiante: grupos donde figura dentro del array de estudiantes.
 */
export async function gruposDe(usuario) {
  if (!usuario) return [];
  const distributivo = await almacen.leer("distributivo");

  if (usuario.rol === "admin") {
    return distributivo;
  }

  if (usuario.rol === "docente") {
    return distributivo.filter((g) => g.docenteId === usuario.id);
  }

  if (usuario.rol === "estudiante") {
    return distributivo.filter(
      (g) => Array.isArray(g.estudiantes) && g.estudiantes.includes(usuario.id)
    );
  }

  return [];
}

/**
 * Retorna los identificadores de asignaturas vinculadas al usuario.
 * - Admin: todas las asignaturas existentes.
 * - Docente / Estudiante: asignaturas de los grupos a los que pertenece.
 */
export async function asignaturasDe(usuario) {
  if (!usuario) return [];

  if (usuario.rol === "admin") {
    const asignaturas = await almacen.leer("asignaturas");
    return asignaturas.map((a) => a.id);
  }

  const grupos = await gruposDe(usuario);
  const ids = [...new Set(grupos.map((g) => g.asignaturaId).filter(Boolean))];
  return ids;
}

/**
 * Resuelve la asignatura correspondiente a un tema: tema -> unidad -> asignatura.
 */
export async function asignaturaDeTema(temaId) {
  if (!temaId) return null;

  const temas = await almacen.leer("temas");
  const tema = temas.find((t) => t.id === temaId);
  if (!tema || !tema.unidadId) return null;

  const unidades = await almacen.leer("unidades");
  const unidad = unidades.find((u) => u.id === tema.unidadId);
  if (!unidad || !unidad.asignaturaId) return null;

  return unidad.asignaturaId;
}

/**
 * Verifica si el usuario tiene permiso para editar contenidos de una asignatura.
 * - Admin: siempre puede.
 * - Docente: si tiene asignado al menos un grupo de esa asignatura.
 * - Estudiante: no puede.
 */
export async function puedeEditarAsignatura(usuario, asignaturaId) {
  if (!usuario || !asignaturaId) return false;

  if (usuario.rol === "admin") {
    return true;
  }

  if (usuario.rol === "docente") {
    const grupos = await gruposDe(usuario);
    return grupos.some((g) => g.asignaturaId === asignaturaId);
  }

  return false;
}

/**
 * Retorna la lista de identificadores de estudiantes a cargo del docente.
 */
export async function estudiantesDe(docenteId) {
  if (!docenteId) return [];

  const distributivo = await almacen.leer("distributivo");
  const gruposDocente = distributivo.filter((g) => g.docenteId === docenteId);

  const estudiantesSet = new Set();
  for (const g of gruposDocente) {
    if (Array.isArray(g.estudiantes)) {
      for (const id of g.estudiantes) {
        estudiantesSet.add(id);
      }
    }
  }

  return Array.from(estudiantesSet);
}

/**
 * Retorna la lista de identificadores de docentes asignados al estudiante.
 */
export async function docentesDe(estudianteId) {
  if (!estudianteId) return [];

  const distributivo = await almacen.leer("distributivo");
  const gruposEstudiante = distributivo.filter(
    (g) => Array.isArray(g.estudiantes) && g.estudiantes.includes(estudianteId)
  );

  const docentesSet = new Set();
  for (const g of gruposEstudiante) {
    if (g.docenteId) {
      docentesSet.add(g.docenteId);
    }
  }

  return Array.from(docentesSet);
}

export default {
  gruposDe,
  asignaturasDe,
  asignaturaDeTema,
  puedeEditarAsignatura,
  estudiantesDe,
  docentesDe
};
