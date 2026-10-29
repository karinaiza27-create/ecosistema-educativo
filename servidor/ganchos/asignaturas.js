// servidor/ganchos/asignaturas.js · Reglas de acceso y filtrado para asignaturas

import { asignaturasDe } from "../acceso.js";

export async function filtrarLista(lista, usuario) {
  if (!Array.isArray(lista) || !usuario) return [];
  if (usuario.rol === "admin") return lista;

  const permitidas = await asignaturasDe(usuario);
  return lista.filter((a) => permitidas.includes(a.id));
}

export default {
  filtrarLista
};
