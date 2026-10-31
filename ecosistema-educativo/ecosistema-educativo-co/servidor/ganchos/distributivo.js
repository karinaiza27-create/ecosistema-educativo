// servidor/ganchos/distributivo.js · Reglas de acceso y filtrado para el distributivo

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  if (usuario.rol === "docente") {
    return lista.filter((g) => g.docenteId === usuario.id);
  }

  if (usuario.rol === "estudiante") {
    return lista.filter(
      (g) => Array.isArray(g.estudiantes) && g.estudiantes.includes(usuario.id)
    );
  }

  return [];
}

export default {
  filtrarLista
};
