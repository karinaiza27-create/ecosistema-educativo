// servidor/ganchos/noticias.js · Reglas de seguridad y publicación para noticias

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];

  // Los estudiantes solo ven las noticias con estado "publicado"
  if (usuario.rol === "estudiante") {
    return lista.filter((n) => n && n.estado === "publicado");
  }

  // Docentes y administradores ven todas (publicadas y borradores)
  return lista;
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  const copia = { ...datos };

  // Fija autorId al crear
  if (!anterior) {
    copia.autorId = usuario ? usuario.id : null;
  } else {
    copia.autorId = anterior.autorId || (usuario ? usuario.id : null);
  }

  // Fija fechaPublicacion cuando el estado pasa a "publicado"
  if (copia.estado === "publicado") {
    if (!anterior || anterior.estado !== "publicado" || !anterior.fechaPublicacion) {
      copia.fechaPublicacion = new Date().toISOString();
    } else {
      copia.fechaPublicacion = anterior.fechaPublicacion;
    }
  } else {
    copia.fechaPublicacion = anterior ? anterior.fechaPublicacion || null : null;
  }

  return copia;
}

export default {
  filtrarLista,
  antesDeGuardar
};
