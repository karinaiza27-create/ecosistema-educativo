// servidor/rutas/subidas.js · Endpoint para carga de archivos con multer y límites por rol

import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as almacen from "../almacen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_SUBIDAS = path.resolve(__dirname, "../../publico/recursos/subidas");

// Asegurar existencia de la carpeta de subidas
try {
  await fs.mkdir(DIR_SUBIDAS, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR_SUBIDAS);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const aleatorio = crypto.randomBytes(16).toString("hex");
    cb(null, `${aleatorio}${ext}`);
  }
});

const router = Router();

router.post("/subidas", async (req, res, next) => {
  let ajustes = {};
  try {
    ajustes = await almacen.leerConfig("ajustes");
  } catch {
    ajustes = {};
  }

  const esDocenteOAdmin =
    req.usuario && (req.usuario.rol === "docente" || req.usuario.rol === "admin");

  const maxMB = esDocenteOAdmin ? Number(ajustes.maxSubidaMB) || 10 : 2;
  const maxBytes = maxMB * 1024 * 1024;

  const permitidosMime = esDocenteOAdmin
    ? [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "audio/mpeg",
        "audio/mp3"
      ]
    : ["image/jpeg", "image/png", "image/webp"];

  const permitidosExt = esDocenteOAdmin
    ? [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp3"]
    : [".jpg", ".jpeg", ".png", ".webp"];

  const upload = multer({
    storage,
    limits: {
      fileSize: maxBytes
    },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (permitidosMime.includes(file.mimetype) && permitidosExt.includes(ext)) {
        cb(null, true);
      } else {
        const mensaje = esDocenteOAdmin
          ? "Formato no permitido. Se aceptan imágenes JPG, PNG, WEBP, documentos PDF y audios MP3."
          : "Formato no permitido. Solo se aceptan imágenes JPG, PNG o WEBP.";
        const error = new Error(mensaje);
        error.estado = 400;
        cb(error);
      }
    }
  }).single("archivo");

  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: `El archivo supera el tamaño máximo permitido de ${maxMB} MB.` });
      }
      return res
        .status(err.estado || 400)
        .json({ error: err.message || "Error al subir el archivo" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No se ha proporcionado ningún archivo en el campo 'archivo'." });
    }

    const url = `/recursos/subidas/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

export default router;
