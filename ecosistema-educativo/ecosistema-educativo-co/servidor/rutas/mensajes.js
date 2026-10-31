// servidor/rutas/mensajes.js · Rutas de mensajería interna, contactos, conversaciones y reportes

import { Router } from "express";
import * as almacen from "../almacen.js";
import { gruposDe, estudiantesDe, docentesDe } from "../acceso.js";
import { exigirRol } from "../auth.js";

const router = Router();

// Middleware: todas las rutas de mensajería requieren sesión activa
router.use((req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: "Sesión requerida" });
  }
  next();
});

// Control de tasa de envío: máximo 30 mensajes por minuto por usuario
const registroEnvios = new Map();

function verificarLimiteEnvio(usuarioId) {
  const ahora = Date.now();
  const unMinutoAtras = ahora - 60000;
  let timestamps = registroEnvios.get(usuarioId) || [];
  timestamps = timestamps.filter((t) => t > unMinutoAtras);
  if (timestamps.length >= 30) {
    const error = new Error("Has superado el límite de 30 mensajes por minuto. Espera un momento.");
    error.estado = 429;
    throw error;
  }
  timestamps.push(ahora);
  registroEnvios.set(usuarioId, timestamps);
}

/**
 * Obtiene el conjunto de identificadores con bloqueos en ambos sentidos
 */
async function obtenerIdsBloqueados(usuarioId) {
  const bloqueos = await almacen.leer("bloqueos");
  const bloqueados = new Set();
  for (const b of bloqueos) {
    if (b.usuarioId === usuarioId) {
      bloqueados.add(b.bloqueadoId);
    }
    if (b.bloqueadoId === usuarioId) {
      bloqueados.add(b.usuarioId);
    }
  }
  return bloqueados;
}

function perfilPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    correo: u.correo,
    rol: u.rol,
    foto: u.foto || ""
  };
}

/**
 * Obtiene los contactos permitidos según el rol del usuario, ajustes y bloqueos
 */
async function obtenerContactosPermitidos(usuario) {
  const [usuarios, ajustes, bloqueadosSet] = await Promise.all([
    almacen.leer("usuarios"),
    almacen.leerConfig("ajustes"),
    obtenerIdsBloqueados(usuario.id)
  ]);

  const activos = usuarios.filter((u) => u.activo !== false && u.id !== usuario.id && !bloqueadosSet.has(u.id));

  if (usuario.rol === "admin") {
    return activos.map(perfilPublico);
  }

  if (usuario.rol === "docente") {
    const estIds = await estudiantesDe(usuario.id);
    const estSet = new Set(estIds);
    return activos
      .filter((u) => estSet.has(u.id) || u.rol === "docente")
      .map(perfilPublico);
  }

  if (usuario.rol === "estudiante") {
    const docentesIds = await docentesDe(usuario.id);
    const permitidosSet = new Set(docentesIds);

    if (ajustes.chatEntreEstudiantes !== false) {
      const misGrupos = await gruposDe(usuario);
      for (const g of misGrupos) {
        if (Array.isArray(g.estudiantes)) {
          for (const eId of g.estudiantes) {
            if (eId !== usuario.id) {
              permitidosSet.add(eId);
            }
          }
        }
      }
    }

    return activos
      .filter((u) => permitidosSet.has(u.id))
      .map(perfilPublico);
  }

  return [];
}

// =========================================================================
// RUTAS FIJAS (definidas antes de las rutas con parámetro dinámico :convId)
// =========================================================================

/**
 * 1. GET /mensajes/contactos
 */
router.get("/mensajes/contactos", async (req, res, next) => {
  try {
    const contactos = await obtenerContactosPermitidos(req.usuario);
    res.json(contactos);
  } catch (error) {
    next(error);
  }
});

/**
 * 2. GET /mensajes/conversaciones
 */
router.get("/mensajes/conversaciones", async (req, res, next) => {
  try {
    const [conversaciones, usuarios, bloqueadosSet] = await Promise.all([
      almacen.leer("conversaciones"),
      almacen.leer("usuarios"),
      obtenerIdsBloqueados(req.usuario.id)
    ]);

    const mapaUsuarios = new Map(usuarios.map((u) => [u.id, perfilPublico(u)]));

    const misConv = conversaciones.filter(
      (c) => Array.isArray(c.participantes) && c.participantes.includes(req.usuario.id)
    );

    const resultado = [];

    for (const c of misConv) {
      const otroId = c.participantes.find((id) => id !== req.usuario.id);
      const otroPerfil = mapaUsuarios.get(otroId) || {
        id: otroId,
        nombre: "Usuario",
        apellido: "",
        rol: "estudiante"
      };

      const estaBloqueado = bloqueadosSet.has(otroId);

      // Calcular no leídos
      const leidoFecha = c.leidoHasta?.[req.usuario.id] ? new Date(c.leidoHasta[req.usuario.id]) : null;
      let noLeidos = 0;
      try {
        const mensajes = await almacen.leer("mensajes/" + c.id);
        noLeidos = mensajes.filter(
          (m) => !m.oculto && m.autorId !== req.usuario.id && (!leidoFecha || new Date(m.fecha) > leidoFecha)
        ).length;
      } catch {}

      resultado.push({
        id: c.id,
        participantes: c.participantes,
        otroUsuario: otroPerfil,
        ultimo: c.ultimo || null,
        noLeidos,
        bloqueado: estaBloqueado,
        fecha: c.ultimo?.fecha || c.fecha
      });
    }

    // Ordenar por actividad más reciente
    resultado.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * 2. POST /mensajes/conversaciones { con }
 */
router.post("/mensajes/conversaciones", async (req, res, next) => {
  try {
    const { con } = req.body || {};
    if (!con || typeof con !== "string") {
      return res.status(400).json({ error: "El campo 'con' es obligatorio" });
    }

    if (con === req.usuario.id) {
      return res.status(400).json({ error: "No puedes crear una conversación contigo mismo" });
    }

    // Verificar si el contacto está permitido
    const permitidos = await obtenerContactosPermitidos(req.usuario);
    const esPermitido = permitidos.some((p) => p.id === con);
    if (!esPermitido) {
      return res.status(403).json({ error: "No tienes permitido iniciar conversación con este usuario" });
    }

    // Verificar bloqueos
    const bloqueadosSet = await obtenerIdsBloqueados(req.usuario.id);
    if (bloqueadosSet.has(con)) {
      return res.status(403).json({ error: "No es posible iniciar conversación debido a un bloqueo" });
    }

    const conversaciones = await almacen.leer("conversaciones");
    let convExistente = conversaciones.find(
      (c) =>
        Array.isArray(c.participantes) &&
        c.participantes.length === 2 &&
        c.participantes.includes(req.usuario.id) &&
        c.participantes.includes(con)
    );

    if (convExistente) {
      return res.json({ id: convExistente.id, participantes: convExistente.participantes, nuevo: false });
    }

    const nueva = await almacen.agregar("conversaciones", {
      participantes: [req.usuario.id, con],
      ultimo: null,
      leidoHasta: { [req.usuario.id]: new Date().toISOString() }
    });

    res.status(201).json({ id: nueva.id, participantes: nueva.participantes, nuevo: true });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. GET /mensajes/no-leidos
 */
router.get("/mensajes/no-leidos", async (req, res, next) => {
  try {
    const conversaciones = await almacen.leer("conversaciones");
    const misConv = conversaciones.filter(
      (c) => Array.isArray(c.participantes) && c.participantes.includes(req.usuario.id)
    );

    let total = 0;
    for (const c of misConv) {
      const leidoFecha = c.leidoHasta?.[req.usuario.id] ? new Date(c.leidoHasta[req.usuario.id]) : null;
      try {
        const mensajes = await almacen.leer("mensajes/" + c.id);
        const cant = mensajes.filter(
          (m) => !m.oculto && m.autorId !== req.usuario.id && (!leidoFecha || new Date(m.fecha) > leidoFecha)
        ).length;
        total += cant;
      } catch {}
    }

    res.json({ total });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. POST /mensajes/difusion { grupoId, texto } (solo docente del grupo o admin)
 */
router.post("/mensajes/difusion", async (req, res, next) => {
  try {
    const { grupoId, texto } = req.body || {};
    if (!grupoId || !texto || typeof texto !== "string" || !texto.trim()) {
      return res.status(400).json({ error: "Los campos grupoId y texto son obligatorios" });
    }

    if (texto.trim().length > 2000) {
      return res.status(400).json({ error: "El texto no puede exceder 2.000 caracteres" });
    }

    // Validar permisos sobre el grupo: solo el docente del grupo o admin
    const distributivo = await almacen.leer("distributivo");
    const grupo = distributivo.find((g) => g.id === grupoId);
    if (!grupo) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const esDocenteDelGrupo = req.usuario.rol === "docente" && grupo.docenteId === req.usuario.id;
    const esAdmin = req.usuario.rol === "admin";
    if (!esDocenteDelGrupo && !esAdmin) {
      return res.status(403).json({ error: "Solo el docente a cargo de este grupo puede enviar mensajes de difusión" });
    }

    const estudiantes = Array.isArray(grupo.estudiantes) ? grupo.estudiantes : [];
    if (estudiantes.length === 0) {
      return res.json({ ok: true, enviados: 0, mensaje: "El grupo no contiene estudiantes" });
    }

    const bloqueadosSet = await obtenerIdsBloqueados(req.usuario.id);
    const conversaciones = await almacen.leer("conversaciones");
    let enviados = 0;

    for (const estId of estudiantes) {
      if (bloqueadosSet.has(estId)) continue;

      let conv = conversaciones.find(
        (c) =>
          Array.isArray(c.participantes) &&
          c.participantes.length === 2 &&
          c.participantes.includes(req.usuario.id) &&
          c.participantes.includes(estId)
      );

      if (!conv) {
        conv = await almacen.agregar("conversaciones", {
          participantes: [req.usuario.id, estId],
          ultimo: null,
          leidoHasta: { [req.usuario.id]: new Date().toISOString() }
        });
        conversaciones.push(conv);
      }

      const nuevoMsg = await almacen.agregar("mensajes/" + conv.id, {
        autorId: req.usuario.id,
        texto: texto.trim(),
        oculto: false
      });

      const leidoHasta = conv.leidoHasta || {};
      leidoHasta[req.usuario.id] = nuevoMsg.fecha;

      await almacen.actualizar("conversaciones", conv.id, {
        ultimo: { texto: nuevoMsg.texto, fecha: nuevoMsg.fecha, autorId: req.usuario.id },
        leidoHasta
      });

      enviados++;
    }

    res.json({ ok: true, enviados });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. POST /mensajes/bloquear { usuarioId }
 */
router.post("/mensajes/bloquear", async (req, res, next) => {
  try {
    const { usuarioId } = req.body || {};
    if (!usuarioId || typeof usuarioId !== "string") {
      return res.status(400).json({ error: "El campo usuarioId es obligatorio" });
    }

    if (usuarioId === req.usuario.id) {
      return res.status(400).json({ error: "No puedes bloquearte a ti mismo" });
    }

    const usuarios = await almacen.leer("usuarios");
    const objetivo = usuarios.find((u) => u.id === usuarioId);
    if (!objetivo) {
      return res.status(404).json({ error: "Usuario a bloquear no encontrado" });
    }

    const lista = await almacen.leer("bloqueos");
    const existe = lista.find((b) => b.usuarioId === req.usuario.id && b.bloqueadoId === usuarioId);
    if (!existe) {
      await almacen.agregar("bloqueos", {
        usuarioId: req.usuario.id,
        bloqueadoId: usuarioId
      });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. DELETE /mensajes/bloquear/:usuarioId
 */
router.delete("/mensajes/bloquear/:usuarioId", async (req, res, next) => {
  try {
    const { usuarioId } = req.params;
    const lista = await almacen.leer("bloqueos");
    const existente = lista.find((b) => b.usuarioId === req.usuario.id && b.bloqueadoId === usuarioId);

    if (existente) {
      await almacen.eliminar("bloqueos", existente.id);
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * 6. Admin: GET /mensajes/reporte/:reporteId
 */
router.get("/mensajes/reporte/:reporteId", exigirRol("admin"), async (req, res, next) => {
  try {
    const { reporteId } = req.params;
    const reportes = await almacen.leer("reportes");
    const reporte = reportes.find((r) => r.id === reporteId);
    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    if (reporte.tipo !== "mensaje") {
      return res.status(400).json({ error: "El reporte especificado no corresponde a un mensaje" });
    }

    const [convId, mensajeId] = String(reporte.referenciaId || "").split("/");
    if (!convId || !mensajeId) {
      return res.status(400).json({ error: "Formato de referenciaId de reporte inválido" });
    }

    const mensajes = await almacen.leer("mensajes/" + convId);
    const idx = mensajes.findIndex((m) => m.id === mensajeId);
    if (idx === -1) {
      return res.status(404).json({ error: "Mensaje reportado no encontrado en la conversación" });
    }

    const inicio = Math.max(0, idx - 5);
    const contexto = mensajes.slice(inicio, idx + 1);

    res.json({
      reporte,
      mensajeReportado: mensajes[idx],
      contexto,
      convId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 6. Admin: POST /mensajes/ocultar { referenciaId: "<convId>/<mensajeId>" }
 */
router.post("/mensajes/ocultar", exigirRol("admin"), async (req, res, next) => {
  try {
    const { referenciaId } = req.body || {};
    if (!referenciaId || !referenciaId.includes("/")) {
      return res.status(400).json({ error: "El campo referenciaId debe tener el formato '<convId>/<mensajeId>'" });
    }

    const [convId, mensajeId] = referenciaId.split("/");
    const mensajes = await almacen.leer("mensajes/" + convId);
    const msg = mensajes.find((m) => m.id === mensajeId);
    if (!msg) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    await almacen.actualizar("mensajes/" + convId, mensajeId, { oculto: true });

    // Actualizar estado del reporte si existe
    const reportes = await almacen.leer("reportes");
    const reporteRelacionado = reportes.find((r) => r.referenciaId === referenciaId && r.estado === "pendiente");
    if (reporteRelacionado) {
      await almacen.actualizar("reportes", reporteRelacionado.id, { estado: "resuelto" });
    }

    res.json({ ok: true, convId, mensajeId, oculto: true });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// RUTAS DINÁMICAS POR CONVERSACIÓN (:convId)
// =========================================================================

/**
 * 3. POST /mensajes/:convId/leido
 */
router.post("/mensajes/:convId/leido", async (req, res, next) => {
  try {
    const { convId } = req.params;
    const conversaciones = await almacen.leer("conversaciones");
    const conv = conversaciones.find((c) => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    if (!Array.isArray(conv.participantes) || !conv.participantes.includes(req.usuario.id)) {
      return res.status(403).json({ error: "No eres participante de esta conversación" });
    }

    const leidoHasta = conv.leidoHasta || {};
    leidoHasta[req.usuario.id] = new Date().toISOString();

    await almacen.actualizar("conversaciones", conv.id, { leidoHasta });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. GET /mensajes/:convId?desde=&antes=
 */
router.get("/mensajes/:convId", async (req, res, next) => {
  try {
    const { convId } = req.params;
    const { desde, antes } = req.query;

    const conversaciones = await almacen.leer("conversaciones");
    const conv = conversaciones.find((c) => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    const esParticipante = Array.isArray(conv.participantes) && conv.participantes.includes(req.usuario.id);
    if (!esParticipante && req.usuario.rol !== "admin") {
      return res.status(403).json({ error: "No tienes acceso a esta conversación" });
    }

    const mensajes = await almacen.leer("mensajes/" + convId);

    // Filtrar los que no estén ocultos
    let filtrados = mensajes.filter((m) => !m.oculto);

    if (desde) {
      const fDesde = new Date(desde);
      filtrados = filtrados.filter((m) => new Date(m.fecha) > fDesde);
    }

    if (antes) {
      const fAntes = new Date(antes);
      filtrados = filtrados.filter((m) => new Date(m.fecha) < fAntes);
    }

    // Retorna hasta 50 mensajes (los más recientes del rango)
    const ultimos50 = filtrados.slice(-50);

    res.json(ultimos50);
  } catch (error) {
    next(error);
  }
});

/**
 * 3. POST /mensajes/:convId { texto }
 */
router.post("/mensajes/:convId", async (req, res, next) => {
  try {
    const { convId } = req.params;
    const { texto } = req.body || {};

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return res.status(400).json({ error: "El texto del mensaje no puede estar vacío" });
    }

    if (texto.trim().length > 2000) {
      return res.status(400).json({ error: "El mensaje excede el límite máximo de 2.000 caracteres" });
    }

    const conversaciones = await almacen.leer("conversaciones");
    const conv = conversaciones.find((c) => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    if (!Array.isArray(conv.participantes) || !conv.participantes.includes(req.usuario.id)) {
      return res.status(403).json({ error: "No perteneces a esta conversación" });
    }

    // Verificar límite de 30 mensajes por minuto
    verificarLimiteEnvio(req.usuario.id);

    // Rechaza si hay bloqueo en ambos sentidos con el otro participante
    const otroId = conv.participantes.find((id) => id !== req.usuario.id);
    if (otroId) {
      const bloqueadosSet = await obtenerIdsBloqueados(req.usuario.id);
      if (bloqueadosSet.has(otroId)) {
        return res.status(403).json({ error: "No puedes enviar mensajes a este usuario debido a un bloqueo" });
      }
    }

    // Agregar mensaje en mensajes/<convId>
    const nuevoMensaje = await almacen.agregar("mensajes/" + conv.id, {
      autorId: req.usuario.id,
      texto: texto.trim(),
      oculto: false
    });

    // Actualizar ultimo y leidoHasta del emisor
    const leidoHasta = conv.leidoHasta || {};
    leidoHasta[req.usuario.id] = nuevoMensaje.fecha;

    await almacen.actualizar("conversaciones", conv.id, {
      ultimo: {
        texto: nuevoMensaje.texto,
        fecha: nuevoMensaje.fecha,
        autorId: req.usuario.id
      },
      leidoHasta
    });

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    next(error);
  }
});

export default router;
