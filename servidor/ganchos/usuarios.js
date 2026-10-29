// servidor/ganchos/usuarios.js · Reglas de seguridad y filtrado para la colección "usuarios"

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista)) return lista;
  return lista.map((u) => {
    if (!u || typeof u !== "object") return u;
    const { claveHash, ...resto } = u;
    return resto;
  });
}

export async function antesDeGuardar(datos, usuario, anterior) {
  if (!datos || typeof datos !== "object") return datos;

  // Evitar que un administrador se quite el rol o se desactive a sí mismo
  if (anterior && usuario && anterior.id === usuario.id) {
    if (datos.rol !== undefined && datos.rol !== anterior.rol) {
      const err = new Error("No puedes cambiar tu propio rol de administrador");
      err.estado = 400;
      throw err;
    }

    if (datos.activo !== undefined && datos.activo === false) {
      const err = new Error("No puedes desactivar tu propia cuenta");
      err.estado = 400;
      throw err;
    }
  }

  // Ignorar claveHash y correo para que no se alteren por la API genérica
  const copia = { ...datos };
  delete copia.claveHash;
  delete copia.correo;

  return copia;
}

export default {
  filtrarLista,
  antesDeGuardar
};
