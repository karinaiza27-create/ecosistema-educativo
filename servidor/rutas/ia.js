import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ejecutarTarea, probarConexionIA, listarModelosDisponibles } from "../ia.js";
import { exigirRol } from "../auth.js";
import * as almacen from "../almacen.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUTA_ENV = path.resolve(__dirname, "../../.env");

function enmascararClave(clave) {
  if (!clave || typeof clave !== "string") return "";
  if (clave.length <= 8) return "********";
  return `${clave.slice(0, 6)}...${clave.slice(-4)}`;
}

// GET /api/ia/modelos (solo admin): lista modelos recomendados y disponibles en Google AI
router.get("/ia/modelos", exigirRol("admin"), async (req, res, next) => {
  try {
    const clave = req.query.clave || null;
    const info = await listarModelosDisponibles(clave);
    res.json(info);
  } catch (error) {
    next(error);
  }
});

// POST /api/ia/:tarea
router.post("/ia/:tarea", async (req, res, next) => {
  try {
    const { tarea } = req.params;
    // Si la tarea es "prueba", redirigir a la función de prueba
    if (tarea === "prueba") {
      const resultado = await probarConexionIA(req.body);
      return res.json(resultado);
    }

    const esTexto = tarea === "tutor" || req.body?.formato === "texto";
    const formato = esTexto ? "texto" : "json";

    const resultado = await ejecutarTarea(tarea, req.body, req.usuario, { formato });

    if (tarea === "tutor") {
      try {
        const dia = new Date().toISOString().slice(0, 10);
        await almacen.agregar("consultas-tutor", {
          usuarioId: req.usuario?.id || "anonimo",
          asignaturaId: req.body?.asignaturaId || null,
          temaId: req.body?.temaId || null,
          dia,
          mensajes: [
            { rol: "estudiante", texto: req.body?.mensaje, fecha: new Date().toISOString() },
            { rol: "tutor", texto: typeof resultado === "string" ? resultado : (resultado?.respuesta || ""), fecha: new Date().toISOString() }
          ]
        });
      } catch (errReg) {
        console.warn("No se pudo registrar consultas-tutor:", errReg.message);
      }
      return res.json({ respuesta: resultado });
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /api/ia/config (solo admin): consultar configuración actual
router.get("/ia/config", exigirRol("admin"), async (req, res, next) => {
  try {
    const ajustes = await almacen.leerConfig("ajustes");
    const claveActual = ajustes.ia?.clave || process.env.IA_CLAVE || "";
    const modeloActual = ajustes.ia?.modelo || process.env.IA_MODELO || "gemini-2.0-flash";
    const proveedorActual = ajustes.ia?.proveedor || process.env.IA_PROVEEDOR || "gemini";

    res.json({
      proveedor: proveedorActual,
      modelo: modeloActual,
      tieneClave: Boolean(claveActual),
      claveEnmascarada: enmascararClave(claveActual)
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/ia/config (solo admin): actualizar proveedor, modelo y clave
router.put("/ia/config", exigirRol("admin"), async (req, res, next) => {
  try {
    const { proveedor = "gemini", modelo = "gemini-2.0-flash", clave = "" } = req.body || {};

    const ajustes = await almacen.leerConfig("ajustes");
    const claveAnterior = ajustes.ia?.clave || process.env.IA_CLAVE || "";

    // Si no envió nueva clave o envió texto enmascarado, mantener la anterior
    const claveFinal = clave && !clave.includes("...") ? clave.trim() : claveAnterior;

    ajustes.ia = {
      proveedor: proveedor.trim() || "gemini",
      modelo: modelo.trim() || "gemini-3.8-flash",
      clave: claveFinal
    };

    await almacen.escribirConfig("ajustes", ajustes);

    // Actualizar variables en memoria para la sesión activa
    process.env.IA_PROVEEDOR = ajustes.ia.proveedor;
    process.env.IA_MODELO = ajustes.ia.modelo;
    if (claveFinal) {
      process.env.IA_CLAVE = claveFinal;
    }

    // Actualizar .env si existe para que persista ante reinicios manuales
    try {
      let contenidoEnv = await fs.readFile(RUTA_ENV, "utf8");
      contenidoEnv = contenidoEnv.replace(/IA_PROVEEDOR=.*/g, `IA_PROVEEDOR=${ajustes.ia.proveedor}`);
      contenidoEnv = contenidoEnv.replace(/IA_MODELO=.*/g, `IA_MODELO=${ajustes.ia.modelo}`);
      if (claveFinal) {
        contenidoEnv = contenidoEnv.replace(/IA_CLAVE=.*/g, `IA_CLAVE=${claveFinal}`);
      }
      await fs.writeFile(RUTA_ENV, contenidoEnv, "utf8");
    } catch {}

    res.json({
      ok: true,
      proveedor: ajustes.ia.proveedor,
      modelo: ajustes.ia.modelo,
      tieneClave: Boolean(claveFinal),
      claveEnmascarada: enmascararClave(claveFinal)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ia/prueba (solo admin): probar conexión con parámetros o guardados
router.post("/ia/prueba", exigirRol("admin"), async (req, res, next) => {
  try {
    const resultado = await probarConexionIA(req.body);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /api/ia/prueba (solo admin)
router.get("/ia/prueba", exigirRol("admin"), async (req, res, next) => {
  try {
    const resultado = await probarConexionIA();
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

export default router;
