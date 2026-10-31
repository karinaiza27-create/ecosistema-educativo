// servidor/ganchos/noticias.js · Reglas de seguridad y publicación para noticias

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista)) return [];
  // Todos los roles (docente, estudiante y visitantes generales) ven las noticias
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

  // Por defecto, las noticias se crean publicadas para que sean visibles para todos
  if (!copia.estado) {
    copia.estado = "publicado";
  }

  if (copia.estado === "publicado") {
    if (!anterior || !anterior.fechaPublicacion) {
      copia.fechaPublicacion = copia.fechaPublicacion || new Date().toISOString();
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
