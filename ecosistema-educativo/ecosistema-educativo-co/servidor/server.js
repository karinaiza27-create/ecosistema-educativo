import express from "express";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as almacen from "./almacen.js";
import { puede } from "./permisos.js";
import * as ganchos from "./ganchos.js";
import { cargarUsuario } from "./auth.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_PUBLICO = path.resolve(__dirname, "../publico");
const DIR_RUTAS = path.resolve(__dirname, "rutas");

export const app = express();

// Asegurar existencia de carpeta pública
try {
  await fs.mkdir(DIR_PUBLICO, { recursive: true });
} catch {}

// Servir archivos estáticos de publico/
app.use(express.static(DIR_PUBLICO));

// Límite de 1 MB para payloads JSON
app.use(express.json({ limit: "1mb" }));

// Middleware de autenticación y carga de usuario
app.use(cargarUsuario);

// Montar automáticamente cada servidor/rutas/*.js en orden alfabético
async function montarRutas() {
  try {
    const entradas = await fs.readdir(DIR_RUTAS, { withFileTypes: true });
    const archivosRutas = entradas
      .filter((e) => e.isFile() && e.name.endsWith(".js"))
      .map((e) => e.name)
      .sort();

    for (const archivo of archivosRutas) {
      const rutaModulo = path.join(DIR_RUTAS, archivo);
      const mod = await import(pathToFileURL(rutaModulo).href);
      const router = mod.default || mod;
      if (router) {
        app.use("/api", router);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error al montar rutas:", error);
    }
  }
}

await montarRutas();

// --- API genérica ---

// GET /api/:col (filtros exactos por query)
app.get("/api/:col", async (req, res, next) => {
  try {
    const { col } = req.params;
    if (!puede(req.usuario, "leer", col)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    let lista = await almacen.buscar(col, req.query);
    lista = await ganchos.aplicar(col, "filtrarLista", lista, req.usuario);
    res.json(lista);
  } catch (error) {
    next(error);
  }
});

// GET /api/:col/:id
app.get("/api/:col/:id", async (req, res, next) => {
  try {
    const { col, id } = req.params;
    const lista = await almacen.leer(col);
    const reg = lista.find((item) => item.id === id);
    if (!reg) {
      return res.status(404).json({ error: `Registro "${id}" no encontrado en "${col}"` });
    }
    if (!puede(req.usuario, "leer", col, reg)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    res.json(reg);
  } catch (error) {
    next(error);
  }
});

// POST /api/:col
app.post("/api/:col", async (req, res, next) => {
  try {
    const { col } = req.params;
    if (!puede(req.usuario, "escribir", col, req.body)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    const datos = await ganchos.aplicar(col, "antesDeGuardar", req.body, req.usuario);
    const nuevo = await almacen.agregar(col, datos);
    await ganchos.aplicar(col, "despuesDeGuardar", nuevo, req.usuario);
    res.status(201).json(nuevo);
  } catch (error) {
    next(error);
  }
});

// PUT /api/:col/:id (fusiona campos)
app.put("/api/:col/:id", async (req, res, next) => {
  try {
    const { col, id } = req.params;
    const lista = await almacen.leer(col);
    const anterior = lista.find((item) => item.id === id);
    if (!anterior) {
      return res.status(404).json({ error: `Registro "${id}" no encontrado en "${col}"` });
    }
    if (!puede(req.usuario, "escribir", col, anterior)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    const cambios = await ganchos.aplicar(col, "antesDeGuardar", req.body, req.usuario, anterior);
    const actualizado = await almacen.actualizar(col, id, cambios);
    await ganchos.aplicar(col, "despuesDeGuardar", actualizado, req.usuario, anterior);
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/:col/:id
app.delete("/api/:col/:id", async (req, res, next) => {
  try {
    const { col, id } = req.params;
    const lista = await almacen.leer(col);
    const anterior = lista.find((item) => item.id === id);
    if (!anterior) {
      return res.status(404).json({ error: `Registro "${id}" no encontrado en "${col}"` });
    }
    if (!puede(req.usuario, "escribir", col, anterior)) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    await ganchos.aplicar(col, "antesDeEliminar", anterior, req.usuario);
    await almacen.eliminar(col, id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  const estado = err.estado || err.status || 500;
  res.status(estado).json({ error: err.message || "Error interno del servidor" });
});

// Arranque del servidor
const PUERTO = process.env.PORT || process.env.PUERTO || 3000;
const esModuloPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (esModuloPrincipal) {
  app.listen(PUERTO, () => {
    console.log(`Servidor iniciado en http://localhost:${PUERTO}`);
  });
}
