// servidor/ganchos/reportes.js · Reglas para reportes de foros y mensajes

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;
  return lista.filter((r) => r.reportadoPor === usuario.id);
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  if (anterior) {
    // Solo admin puede modificar estado de un reporte
    if (usuario.rol !== "admin") {
      const error = new Error("Solo el administrador puede actualizar reportes");
      error.estado = 403;
      throw error;
    }
  } else {
    datos.reportadoPor = usuario.id;
    if (!datos.estado) {
      datos.estado = "pendiente";
    }
  }

  const tiposValidos = ["foro", "mensaje"];
  if (!tiposValidos.includes(datos.tipo)) {
    const error = new Error(`El tipo de reporte debe ser uno de: ${tiposValidos.join(", ")}`);
    error.estado = 400;
    throw error;
  }

  if (!datos.referenciaId || typeof datos.referenciaId !== "string") {
    const error = new Error("El campo referenciaId es obligatorio");
    error.estado = 400;
    throw error;
  }

  if (!datos.motivo || typeof datos.motivo !== "string" || !datos.motivo.trim()) {
    const error = new Error("El motivo del reporte es obligatorio");
    error.estado = 400;
    throw error;
  }

  return datos;
}

export default {
  filtrarLista,
  antesDeGuardar
};
