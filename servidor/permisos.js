import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUTA_PERMISOS = path.resolve(__dirname, "../datos/config/permisos.json");

function obtenerPermisos() {
  try {
    const raw = fs.readFileSync(RUTA_PERMISOS, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function puede(usuario, accion, col, registro = null) {
  if (!accion || !col) return false;
  const config = obtenerPermisos();

  const reglasCol = config[col] || config[col.split("/")[0]];
  if (!reglasCol) return false;

  const rolesPermitidos = reglasCol[accion];
  if (!Array.isArray(rolesPermitidos)) return false;

  for (const regla of rolesPermitidos) {
    if (regla === "servidor") {
      continue;
    }
    if (regla === "publico") {
      return true;
    }
    if (regla === "sesion") {
      if (usuario) return true;
    }
    if (regla === "admin" || regla === "docente" || regla === "estudiante") {
      if (usuario && usuario.rol === regla) return true;
    }
    if (regla === "propio") {
      if (usuario && usuario.id) {
        if (!registro) return true;
        if (registro.usuarioId === usuario.id || (col === "usuarios" && registro.id === usuario.id)) {
          return true;
        }
      }
    }
  }

  return false;
}

export default { puede };
