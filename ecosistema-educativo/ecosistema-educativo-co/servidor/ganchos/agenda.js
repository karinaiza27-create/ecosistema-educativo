// servidor/ganchos/agenda.js · Reglas de acceso, filtrado y validación para la agenda

import { gruposDe } from "../acceso.js";

/**
 * Filtra los eventos de la agenda:
 * - Admin: ve todos los eventos.
 * - Docente / Estudiante: ve sus eventos propios y los eventos dirigidos a sus grupos.
 */
export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  const misGrupos = await gruposDe(usuario);
  const idsGrupos = new Set(misGrupos.map((g) => g.id));

  return lista.filter((evento) => {
    // Evento propio
    if (evento.propietarioId === usuario.id) return true;
    // Evento publicado para uno de mis grupos
    if (evento.grupoId && idsGrupos.has(evento.grupoId)) return true;
    return false;
  });
}

/**
 * Validaciones y fijación de campos antes de guardar (crear o actualizar):
 * - Fija propietarioId al crear.
 * - Solo el propietario puede editar un evento existente.
 * - Solo docente y admin pueden asignar grupoId (de sus propios grupos en el caso de docentes).
 */
export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  // 1. Verificación de edición: solo el propietario edita
  if (anterior) {
    if (anterior.propietarioId !== usuario.id) {
      const error = new Error("Solo el propietario puede editar este evento de la agenda");
      error.estado = 403;
      throw error;
    }
    datos.propietarioId = anterior.propietarioId;
  } else {
    // Fijar propietarioId al crear
    datos.propietarioId = usuario.id;
    if (!datos.avisados) {
      datos.avisados = {};
    }
  }

  // 2. Validación de campos obligatorios
  if (!datos.titulo || typeof datos.titulo !== "string" || !datos.titulo.trim()) {
    const error = new Error("El título del evento es obligatorio");
    error.estado = 400;
    throw error;
  }

  const tiposValidos = ["tarea", "reunion", "fecha-limite", "recordatorio"];
  if (!tiposValidos.includes(datos.tipo)) {
    const error = new Error(`El tipo de evento debe ser uno de: ${tiposValidos.join(", ")}`);
    error.estado = 400;
    throw error;
  }

  if (!datos.inicio) {
    const error = new Error("La fecha de inicio es obligatoria");
    error.estado = 400;
    throw error;
  }

  // 3. Validación de grupoId: solo docente y admin
  if (datos.grupoId) {
    if (usuario.rol !== "docente" && usuario.rol !== "admin") {
      const error = new Error("Solo los docentes y administradores pueden asignar eventos a un grupo");
      error.estado = 403;
      throw error;
    }

    if (usuario.rol === "docente") {
      const misGrupos = await gruposDe(usuario);
      const pertenece = misGrupos.some((g) => g.id === datos.grupoId);
      if (!pertenece) {
        const error = new Error("Solo puedes asignar eventos a tus propios grupos");
        error.estado = 403;
        throw error;
      }
    }
  } else {
    datos.grupoId = null;
  }

  // 4. Normalizar recordatorios
  if (!Array.isArray(datos.recordatorios)) {
    datos.recordatorios = [];
  } else {
    datos.recordatorios = datos.recordatorios.map(Number).filter((n) => !isNaN(n) && n > 0);
  }

  // 5. Normalizar actividad y tema
  if (!datos.actividad) datos.actividad = null;
  if (!datos.temaId) datos.temaId = null;
  datos.todoElDia = Boolean(datos.todoElDia);

  return datos;
}

/**
 * Verificación antes de eliminar:
 * - Solo el propietario del evento puede eliminarlo.
 */
export async function antesDeEliminar(anterior, usuario) {
  if (!anterior || !usuario) return;
  if (anterior.propietarioId !== usuario.id) {
    const error = new Error("Solo el propietario puede eliminar este evento de la agenda");
    error.estado = 403;
    throw error;
  }
}

export default {
  filtrarLista,
  antesDeGuardar,
  antesDeEliminar
};
