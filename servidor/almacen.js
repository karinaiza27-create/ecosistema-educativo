import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_DATOS = path.resolve(__dirname, "../datos");
const DIR_RESPALDOS = path.join(DIR_DATOS, "respaldos");
const DIR_CONFIG = path.join(DIR_DATOS, "config");

const colas = new Map();

function encolarEscritura(rutaArchivo, tarea) {
  const colaPrevia = colas.get(rutaArchivo) || Promise.resolve();
  const siguiente = colaPrevia
    .catch(() => {})
    .then(tarea);
  colas.set(rutaArchivo, siguiente);
  return siguiente;
}

let respaldoHoyPromesa = null;

async function verificarRespaldoDiario() {
  const hoy = new Date().toISOString().slice(0, 10);
  const carpetaHoy = path.join(DIR_RESPALDOS, hoy);
  try {
    await fs.access(carpetaHoy);
    return;
  } catch {
    // No existe respaldo de hoy, se procede
  }

  if (respaldoHoyPromesa) {
    return respaldoHoyPromesa;
  }

  respaldoHoyPromesa = (async () => {
    try {
      await fs.mkdir(DIR_RESPALDOS, { recursive: true });
      try {
        await fs.access(carpetaHoy);
        return;
      } catch {}

      await fs.mkdir(carpetaHoy, { recursive: true });

      const entradas = await fs.readdir(DIR_DATOS, { withFileTypes: true });
      for (const entrada of entradas) {
        if (entrada.name === "respaldos") continue;
        const origen = path.join(DIR_DATOS, entrada.name);
        const destino = path.join(carpetaHoy, entrada.name);
        await fs.cp(origen, destino, { recursive: true });
      }

      const respaldos = (await fs.readdir(DIR_RESPALDOS, { withFileTypes: true }))
        .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
        .map((e) => e.name)
        .sort();

      if (respaldos.length > 14) {
        const aEliminar = respaldos.slice(0, respaldos.length - 14);
        for (const carpeta of aEliminar) {
          await fs.rm(path.join(DIR_RESPALDOS, carpeta), { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.error("Error en respaldo diario:", error);
    } finally {
      respaldoHoyPromesa = null;
    }
  })();

  return respaldoHoyPromesa;
}

async function escribirArchivoAtomico(rutaArchivo, contenido) {
  await verificarRespaldoDiario();
  await fs.mkdir(path.dirname(rutaArchivo), { recursive: true });
  const rutaTmp = `${rutaArchivo}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(rutaTmp, contenido, "utf8");
  await fs.rename(rutaTmp, rutaArchivo);
}

function validarNombreCol(col) {
  if (typeof col !== "string" || !/^[a-z0-9-]+(?:\/[a-z0-9_-]+)?$/.test(col)) {
    throw new Error(`Nombre de colección inválido: "${col}"`);
  }
}

function rutaCol(col) {
  validarNombreCol(col);
  return path.join(DIR_DATOS, `${col}.json`);
}

export async function leer(col) {
  const ruta = rutaCol(col);
  try {
    const raw = await fs.readFile(ruta, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function escribir(col, lista) {
  const ruta = rutaCol(col);
  return encolarEscritura(ruta, async () => {
    await escribirArchivoAtomico(ruta, JSON.stringify(lista, null, 2));
  });
}

export async function agregar(col, reg) {
  const ruta = rutaCol(col);
  return encolarEscritura(ruta, async () => {
    const lista = await leer(col);
    const base = col.split("/")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const prefijo = base.slice(0, 3).padEnd(3, "x");

    let mayorNum = 0;
    const regex = new RegExp(`^${prefijo}_(\\d+)$`);
    for (const item of lista) {
      if (item && item.id) {
        const match = String(item.id).match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > mayorNum) mayorNum = num;
        }
      }
    }

    const nuevoId = `${prefijo}_${String(mayorNum + 1).padStart(6, "0")}`;
    const nuevoReg = {
      ...reg,
      id: nuevoId,
      fecha: new Date().toISOString()
    };

    lista.push(nuevoReg);
    await escribirArchivoAtomico(ruta, JSON.stringify(lista, null, 2));
    return nuevoReg;
  });
}

export async function actualizar(col, id, cambios) {
  const ruta = rutaCol(col);
  return encolarEscritura(ruta, async () => {
    const lista = await leer(col);
    const indice = lista.findIndex((item) => item.id === id);
    if (indice === -1) {
      const err = new Error(`Registro "${id}" no encontrado en "${col}"`);
      err.estado = 404;
      throw err;
    }
    const anterior = lista[indice];
    const actualizado = {
      ...anterior,
      ...cambios,
      id: anterior.id,
      fecha: anterior.fecha
    };
    lista[indice] = actualizado;
    await escribirArchivoAtomico(ruta, JSON.stringify(lista, null, 2));
    return actualizado;
  });
}

export async function eliminar(col, id) {
  const ruta = rutaCol(col);
  return encolarEscritura(ruta, async () => {
    const lista = await leer(col);
    const indice = lista.findIndex((item) => item.id === id);
    if (indice === -1) {
      const err = new Error(`Registro "${id}" no encontrado en "${col}"`);
      err.estado = 404;
      throw err;
    }
    const [eliminado] = lista.splice(indice, 1);
    await escribirArchivoAtomico(ruta, JSON.stringify(lista, null, 2));
    return eliminado;
  });
}

export async function buscar(col, filtro) {
  const lista = await leer(col);
  if (!filtro) return lista;
  if (typeof filtro === "function") {
    return lista.filter(filtro);
  }
  return lista.filter((item) => {
    return Object.entries(filtro).every(([clave, valor]) => {
      return String(item[clave]) === String(valor);
    });
  });
}

export async function anexarLinea(archivo, obj) {
  const nombreLimpio = archivo.endsWith(".jsonl") ? archivo : `${archivo}.jsonl`;
  if (!/^[a-z0-9_-]+(?:\.jsonl)?$/.test(nombreLimpio)) {
    throw new Error(`Nombre de archivo .jsonl inválido: "${archivo}"`);
  }
  const ruta = path.join(DIR_DATOS, nombreLimpio);
  return encolarEscritura(ruta, async () => {
    await verificarRespaldoDiario();
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.appendFile(ruta, JSON.stringify(obj) + "\n", "utf8");
  });
}

export async function leerLineas(archivo) {
  const nombreLimpio = archivo.endsWith(".jsonl") ? archivo : `${archivo}.jsonl`;
  const ruta = path.join(DIR_DATOS, nombreLimpio);
  try {
    const contenido = await fs.readFile(ruta, "utf8");
    return contenido
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function leerConfig(nombre) {
  const nombreLimpio = nombre.endsWith(".json") ? nombre : `${nombre}.json`;
  const ruta = path.join(DIR_CONFIG, nombreLimpio);
  try {
    const raw = await fs.readFile(ruta, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function escribirConfig(nombre, obj) {
  const nombreLimpio = nombre.endsWith(".json") ? nombre : `${nombre}.json`;
  const ruta = path.join(DIR_CONFIG, nombreLimpio);
  return encolarEscritura(ruta, async () => {
    await fs.mkdir(DIR_CONFIG, { recursive: true });
    await escribirArchivoAtomico(ruta, JSON.stringify(obj, null, 2));
    return obj;
  });
}

