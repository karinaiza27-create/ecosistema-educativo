// servidor/rutas/gamificacion.js · Endpoints de intentos y logros de gamificación

import { Router } from "express";
import { procesarIntento } from "../gamificacion.js";
import * as almacen from "../almacen.js";
import { estudiantesDe } from "../acceso.js";

const router = Router();

// POST /api/intentos · Registrar un intento de actividad y calcular puntos/insignias
router.post("/intentos", async (req, res) => {
  if (!req.usuario) {
    return res.status(401).json({ error: "Debes iniciar sesión para registrar intentos" });
  }

  try {
    const resultado = await procesarIntento(req.usuario, req.body);
    res.status(201).json(resultado);
  } catch (err) {
    const estado = err.estado && Number.isInteger(err.estado) ? err.estado : 400;
    res.status(estado).json({ error: err.message });
  }
});

// GET /api/logros/:usuarioId · Consultar logros de un usuario ("yo" = usuario actual)
router.get("/logros/:usuarioId", async (req, res) => {
  if (!req.usuario) {
    return res.status(401).json({ error: "Debes iniciar sesión para consultar logros" });
  }

  const { usuarioId } = req.params;
  const targetId = usuarioId === "yo" ? req.usuario.id : usuarioId;

  // Verificación de permisos:
  // - El propio usuario (estudiante o cualquier rol)
  // - Administrador
  // - Docente asignado a los grupos del estudiante
  let permitido = false;

  if (req.usuario.rol === "admin" || targetId === req.usuario.id) {
    permitido = true;
  } else if (req.usuario.rol === "docente") {
    const misEstudiantes = await estudiantesDe(req.usuario.id);
    if (misEstudiantes.includes(targetId)) {
      permitido = true;
    }
  }

  if (!permitido) {
    return res.status(403).json({ error: "No tienes permiso para consultar los logros de este usuario" });
  }

  try {
    const todosLogros = await almacen.leer("logros");
    let logro = todosLogros.find((l) => l.usuarioId === targetId);

    if (!logro) {
      logro = {
        usuarioId: targetId,
        puntos: 0,
        insignias: [],
        nivelQuiz: {}
      };
    }

    res.json(logro);
  } catch (err) {
    res.status(500).json({ error: "Error al consultar logros: " + err.message });
  }
});

export default router;
