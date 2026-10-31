import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_GANCHOS = path.resolve(__dirname, "ganchos");

const ganchosPorCol = new Map();

export async function cargarGanchos() {
  ganchosPorCol.clear();
  try {
    const entradas = await fs.readdir(DIR_GANCHOS, { withFileTypes: true });
    for (const entrada of entradas) {
      if (entrada.isFile() && entrada.name.endsWith(".js")) {
        const col = entrada.name.slice(0, -3);
        const rutaArchivo = path.join(DIR_GANCHOS, entrada.name);
        const mod = await import(pathToFileURL(rutaArchivo).href);
        ganchosPorCol.set(col, mod.default || mod);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error al cargar ganchos:", error);
    }
  }
}

// Carga inicial
await cargarGanchos();

export async function aplicar(col, nombre, ...args) {
  const baseCol = typeof col === "string" ? col.split("/")[0] : col;
  const gancho = ganchosPorCol.get(col) || ganchosPorCol.get(baseCol);
  if (!gancho || typeof gancho[nombre] !== "function") {
    return args[0];
  }
  return await gancho[nombre](...args);
}

export default { aplicar, cargarGanchos };
