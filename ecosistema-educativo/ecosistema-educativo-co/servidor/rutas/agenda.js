// servidor/rutas/agenda.js · Rutas de agenda y recordatorios

import { Router } from "express";
import * as almacen from "../almacen.js";
import { filtrarLista } from "../ganchos/agenda.js";

const router = Router();

/**
 * GET /api/agenda/recordatorios
 * Retorna y marca los recordatorios pendientes para el usuario en sesión.
 */
router.get("/agenda/recordatorios", async (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: "Sesión requerida" });
    }

    const todos = await almacen.leer("agenda");
    const visibles = await filtrarLista(todos, req.usuario);
    const ahora = Date.now();
    const pendientes = [];

    for (const evento of visibles) {
      if (!Array.isArray(evento.recordatorios) || evento.recordatorios.length === 0) continue;
      const tInicio = new Date(evento.inicio).getTime();
      const difMin = Math.round((tInicio - ahora) / 60000);

      // Si el evento ya ocurrió hace más de 10 minutos, omitir
      if (difMin < -10) continue;

      const avisadosUsuario = evento.avisados?.[req.usuario.id] || [];
      let huboCambio = false;

      for (const minutos of evento.recordatorios) {
        if (difMin <= minutos && difMin >= 0 && !avisadosUsuario.includes(minutos)) {
          pendientes.push({
            eventoId: evento.id,
            titulo: evento.titulo,
            tipo: evento.tipo,
            inicio: evento.inicio,
            minutosFaltantes: difMin,
            umbralMinutos: minutos,
            actividad: evento.actividad,
            temaId: evento.temaId
          });

          if (!evento.avisados) evento.avisados = {};
          if (!evento.avisados[req.usuario.id]) evento.avisados[req.usuario.id] = [];
          evento.avisados[req.usuario.id].push(minutos);
          huboCambio = true;
        }
      }

      if (huboCambio) {
        await almacen.actualizar("agenda", evento.id, { avisados: evento.avisados });
      }
    }

    res.json({ recordatorios: pendientes });
  } catch (error) {
    next(error);
  }
});

export default router;
