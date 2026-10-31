// servidor/rutas/quiz.js · Motor y endpoints del quiz formativo por niveles de Bloom

import { Router } from "express";
import * as almacen from "../almacen.js";
import { asignaturasDe, asignaturaDeTema } from "../acceso.js";
import { procesarIntento } from "../gamificacion.js";
import { notificar } from "../notificar.js";

const router = Router();

const NOMBRES_NIVELES = {
  1: "Recordar",
  2: "Comprender",
  3: "Aplicar",
  4: "Analizar",
  5: "Evaluar"
};

function normalizar(texto) {
  if (!texto) return "";
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function barajar(lista) {
  const res = [...lista];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

/**
 * Valida que el usuario sea estudiante y tenga acceso al tema correspondiente.
 */
async function validarAccesoEstudianteTema(req, res, temaId) {
  if (!req.usuario) {
    res.status(401).json({ error: "No autenticado" });
    return false;
  }
  if (req.usuario.rol !== "estudiante") {
    res.status(403).json({ error: "Solo los estudiantes tienen acceso al quiz" });
    return false;
  }
  if (!temaId) {
    res.status(400).json({ error: "El parámetro temaId es obligatorio" });
    return false;
  }

  const asignaturaId = await asignaturaDeTema(temaId);
  if (!asignaturaId) {
    res.status(404).json({ error: "Tema no encontrado" });
    return false;
  }

  const permitidas = await asignaturasDe(req.usuario);
  if (!permitidas.includes(asignaturaId)) {
    res.status(403).json({ error: "No tienes acceso a los contenidos de este tema" });
    return false;
  }

  return true;
}

// 1. GET /api/quiz/estado?temaId=
router.get("/quiz/estado", async (req, res, next) => {
  try {
    const { temaId } = req.query;
    const valido = await validarAccesoEstudianteTema(req, res, temaId);
    if (!valido) return;

    // Obtener nivel máximo aprobado por el estudiante para este tema
    const logros = await almacen.leer("logros");
    const logro = logros.find((l) => l.usuarioId === req.usuario.id);
    const nivelMaxAprobado = (logro && logro.nivelQuiz && Number(logro.nivelQuiz[temaId])) || 0;

    // Intentos previos de quiz para calcular mejorPorcentaje por nivel
    const intentos = await almacen.buscar("intentos", {
      usuarioId: req.usuario.id,
      actividad: "quiz",
      temaId
    });

    const niveles = [1, 2, 3, 4, 5].map((nivelNum) => {
      // Estado: aprobado si nivel <= nivelMaxAprobado; disponible si es 1 o nivel === nivelMaxAprobado + 1; sino bloqueado
      let estado = "bloqueado";
      if (nivelNum <= nivelMaxAprobado) {
        estado = "aprobado";
      } else if (nivelNum === 1 || nivelNum === nivelMaxAprobado + 1) {
        estado = "disponible";
      }

      // Mejor porcentaje obtenido en este nivel
      const intentosNivel = intentos.filter((i) => Number(i.nivel) === nivelNum);
      let mejorPorcentaje = 0;
      for (const i of intentosNivel) {
        const pct = i.maximo > 0 ? Math.round((Number(i.puntaje) / Number(i.maximo)) * 100) : 0;
        if (pct > mejorPorcentaje) {
          mejorPorcentaje = pct;
        }
      }

      return {
        nivel: nivelNum,
        nombre: NOMBRES_NIVELES[nivelNum] || `Nivel ${nivelNum}`,
        estado,
        mejorPorcentaje
      };
    });

    res.json({ niveles });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/quiz/iniciar { temaId, nivel }
router.post("/quiz/iniciar", async (req, res, next) => {
  try {
    const { temaId } = req.body || {};
    const nivel = parseInt(req.body?.nivel, 10);

    const valido = await validarAccesoEstudianteTema(req, res, temaId);
    if (!valido) return;

    if (!nivel || nivel < 1 || nivel > 5) {
      return res.status(400).json({ error: "El nivel debe ser un número entre 1 y 5" });
    }

    // Verificar que el nivel esté disponible
    const logros = await almacen.leer("logros");
    const logro = logros.find((l) => l.usuarioId === req.usuario.id);
    const nivelMaxAprobado = (logro && logro.nivelQuiz && Number(logro.nivelQuiz[temaId])) || 0;

    const estaDisponible = nivel <= nivelMaxAprobado + 1;
    if (!estaDisponible) {
      return res.status(400).json({ error: `El nivel ${nivel} aún se encuentra bloqueado.` });
    }

    // Reglas de gamificación para cantidad de preguntas
    const reglas = await almacen.leerConfig("reglas-gamificacion");
    const preguntasPorNivel = reglas.quiz?.preguntasPorNivel || 10;

    // Preguntas aprobadas de ese tema y nivel
    const todasPreguntas = await almacen.buscar("preguntas", { temaId });
    const preguntasAprobadas = todasPreguntas.filter(
      (p) => Number(p.nivel) === nivel && (!p.estado || p.estado === "aprobado")
    );

    if (preguntasAprobadas.length === 0) {
      return res.status(400).json({ error: "No hay preguntas aprobadas disponibles para este nivel" });
    }

    // Consultar quiz-sesiones previas del estudiante para saber cuáles ya vio y cuándo
    const todasSesiones = await almacen.buscar("quiz-sesiones", { usuarioId: req.usuario.id });
    
    // Mapear cada preguntaId con la fecha más reciente en que se vio
    const vistasMap = new Map();
    const sesionesOrdenadas = [...todasSesiones].sort(
      (a, b) => new Date(a.inicio || a.fecha || 0).getTime() - new Date(b.inicio || b.fecha || 0).getTime()
    );

    for (const s of sesionesOrdenadas) {
      if (Array.isArray(s.preguntasIds)) {
        const timestamp = new Date(s.inicio || s.fecha || 0).getTime();
        for (const pid of s.preguntasIds) {
          vistasMap.set(pid, timestamp);
        }
      }
    }

    // Preguntas no vistas y preguntas vistas
    const noVistas = preguntasAprobadas.filter((p) => !vistasMap.has(p.id));
    const vistas = preguntasAprobadas
      .filter((p) => vistasMap.has(p.id))
      .sort((a, b) => vistasMap.get(a.id) - vistasMap.get(b.id)); // más antiguas primero

    let seleccionadas = [];
    let requirioCompletar = false;

    if (noVistas.length >= preguntasPorNivel) {
      seleccionadas = barajar(noVistas).slice(0, preguntasPorNivel);
    } else {
      requirioCompletar = true;
      seleccionadas = [...barajar(noVistas)];
      const faltantes = preguntasPorNivel - seleccionadas.length;
      const completadas = vistas.slice(0, faltantes);
      seleccionadas.push(...completadas);
    }

    // Si no alcanzaron y se completó con preguntas ya vistas, notificar al docente del grupo (máx 1 vez al día)
    if (requirioCompletar) {
      try {
        const asignaturaId = await asignaturaDeTema(temaId);
        const distributivo = await almacen.leer("distributivo");
        const grupo = distributivo.find(
          (g) => g.asignaturaId === asignaturaId && Array.isArray(g.estudiantes) && g.estudiantes.includes(req.usuario.id)
        );

        if (grupo && grupo.docenteId) {
          const hoyIso = new Date().toISOString().slice(0, 10);
          const notificacionesDocente = await almacen.buscar("notificaciones", { usuarioId: grupo.docenteId });
          const temas = await almacen.leer("temas");
          const tema = temas.find((t) => t.id === temaId);
          const tituloTema = tema?.titulo || temaId;

          const yaNotificadoHoy = notificacionesDocente.some((n) => {
            return (
              n.tipo === "banco_insuficiente" &&
              n.fecha &&
              n.fecha.startsWith(hoyIso) &&
              n.mensaje &&
              n.mensaje.includes(`tema "${tituloTema}"`) &&
              n.mensaje.includes(`nivel ${nivel}`)
            );
          });

          if (!yaNotificadoHoy) {
            await notificar(grupo.docenteId, {
              tipo: "banco_insuficiente",
              mensaje: `El estudiante ${req.usuario.nombre} ${req.usuario.apellido} agotó preguntas nuevas en el nivel ${nivel} del tema "${tituloTema}". Se recomienda agregar más reactivos al banco.`,
              enlace: `/paginas/banco-preguntas.html?temaId=${encodeURIComponent(temaId)}`
            });
          }
        }
      } catch (notifErr) {
        console.warn("No se pudo enviar notificación de banco insuficiente:", notifErr.message);
      }
    }

    // Barajar la lista final de preguntas seleccionadas
    const preguntasFinales = barajar(seleccionadas);

    // Crear la quiz-sesión
    const nuevaSesion = {
      usuarioId: req.usuario.id,
      temaId,
      nivel,
      preguntasIds: preguntasFinales.map((p) => p.id),
      respuestas: {},
      inicio: new Date().toISOString(),
      finalizada: false
    };

    const sesionCreada = await almacen.agregar("quiz-sesiones", nuevaSesion);

    // Devolver preguntas SIN respuestas ni retroalimentación
    const preguntasParaCliente = preguntasFinales.map((p) => {
      let opciones = [];
      if (p.tipo === "opcion") {
        opciones = Array.isArray(p.opciones) ? p.opciones : [];
      } else if (p.tipo === "vf") {
        opciones = ["Verdadero", "Falso"];
      }

      return {
        id: p.id,
        tipo: p.tipo,
        enunciado: p.enunciado,
        opciones
      };
    });

    res.status(201).json({
      sesionId: sesionCreada.id,
      preguntas: preguntasParaCliente
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/quiz/responder { sesionId, preguntaId, respuesta }
router.post("/quiz/responder", async (req, res, next) => {
  try {
    if (!req.usuario || req.usuario.rol !== "estudiante") {
      return res.status(403).json({ error: "Solo los estudiantes pueden responder quizzes" });
    }

    const { sesionId, preguntaId, respuesta } = req.body || {};
    if (!sesionId || !preguntaId) {
      return res.status(400).json({ error: "Los campos sesionId y preguntaId son obligatorios" });
    }

    const sesiones = await almacen.leer("quiz-sesiones");
    const sesion = sesiones.find((s) => s.id === sesionId);
    if (!sesion) {
      return res.status(404).json({ error: "Sesión de quiz no encontrada" });
    }

    if (sesion.usuarioId !== req.usuario.id) {
      return res.status(403).json({ error: "No tienes permiso para responder en esta sesión" });
    }

    if (sesion.finalizada) {
      return res.status(400).json({ error: "Esta sesión de quiz ya ha sido finalizada" });
    }

    if (!Array.isArray(sesion.preguntasIds) || !sesion.preguntasIds.includes(preguntaId)) {
      return res.status(400).json({ error: "La pregunta no pertenece a esta sesión de quiz" });
    }

    // Guarda una sola vez por pregunta
    sesion.respuestas = sesion.respuestas || {};
    if (sesion.respuestas[preguntaId] !== undefined) {
      return res.status(400).json({ error: "Ya respondiste esta pregunta previamente" });
    }

    // Obtener la pregunta original para evaluar
    const preguntas = await almacen.leer("preguntas");
    const preg = preguntas.find((p) => p.id === preguntaId);
    if (!preg) {
      return res.status(404).json({ error: "Pregunta no encontrada en el banco" });
    }

    let correcto = false;
    let correctaTexto = "";

    if (preg.tipo === "opcion") {
      correcto = Number(respuesta) === Number(preg.correcta);
      correctaTexto = Array.isArray(preg.opciones) ? (preg.opciones[Number(preg.correcta)] ?? String(preg.correcta)) : String(preg.correcta);
    } else if (preg.tipo === "vf") {
      const respBool = respuesta === true || respuesta === "true" || normalizar(respuesta) === "verdadero";
      const correctaBool = preg.correcta === true || preg.correcta === "true";
      correcto = respBool === correctaBool;
      correctaTexto = correctaBool ? "Verdadero" : "Falso";
    } else if (preg.tipo === "completar") {
      // en "completar" compara con normalizar()
      correcto = normalizar(respuesta) === normalizar(preg.correcta);
      correctaTexto = String(preg.correcta || "");
    }

    // Guardar respuesta en la sesión
    sesion.respuestas[preguntaId] = {
      respuesta,
      correcto,
      fecha: new Date().toISOString()
    };

    await almacen.actualizar("quiz-sesiones", sesion.id, { respuestas: sesion.respuestas });

    res.json({
      correcto,
      retroalimentacion: preg.retroalimentacion || "",
      correcta: correctaTexto
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/quiz/finalizar { sesionId }
router.post("/quiz/finalizar", async (req, res, next) => {
  try {
    if (!req.usuario || req.usuario.rol !== "estudiante") {
      return res.status(403).json({ error: "Solo los estudiantes pueden finalizar quizzes" });
    }

    const { sesionId } = req.body || {};
    if (!sesionId) {
      return res.status(400).json({ error: "El campo sesionId es obligatorio" });
    }

    const sesiones = await almacen.leer("quiz-sesiones");
    const sesion = sesiones.find((s) => s.id === sesionId);
    if (!sesion) {
      return res.status(404).json({ error: "Sesión de quiz no encontrada" });
    }

    if (sesion.usuarioId !== req.usuario.id) {
      return res.status(403).json({ error: "No tienes permiso sobre esta sesión" });
    }

    if (sesion.finalizada) {
      return res.status(400).json({ error: "Esta sesión ya fue finalizada anteriormente" });
    }

    const preguntas = await almacen.leer("preguntas");
    const total = Array.isArray(sesion.preguntasIds) ? sesion.preguntasIds.length : 0;
    let aciertos = 0;
    const repasar = [];

    for (const pid of sesion.preguntasIds || []) {
      const resp = sesion.respuestas?.[pid];
      const p = preguntas.find((item) => item.id === pid);
      if (resp && resp.correcto) {
        aciertos++;
      } else {
        if (p) {
          repasar.push({
            preguntaId: pid,
            enunciado: p.enunciado,
            retroalimentacion: p.retroalimentacion || ""
          });
        }
      }
    }

    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;
    const reglas = await almacen.leerConfig("reglas-gamificacion");
    const porcentajeAprobacion = reglas.quiz?.porcentajeAprobacion ?? 70;
    const aprobado = porcentaje >= porcentajeAprobacion;
    const errores = total - aciertos;

    const fechaInicio = sesion.inicio ? new Date(sesion.inicio).getTime() : Date.now();
    const duracionSeg = Math.max(1, Math.round((Date.now() - fechaInicio) / 1000));

    // Si aprueba, primero actualiza logros.nivelQuiz[temaId] al máximo
    if (aprobado && sesion.temaId && sesion.nivel) {
      const todosLogros = await almacen.leer("logros");
      let logro = todosLogros.find((l) => l.usuarioId === req.usuario.id);
      if (!logro) {
        await almacen.agregar("logros", {
          usuarioId: req.usuario.id,
          puntos: 0,
          insignias: [],
          nivelQuiz: { [sesion.temaId]: sesion.nivel }
        });
      } else {
        logro.nivelQuiz = logro.nivelQuiz || {};
        const nivelPrevio = Number(logro.nivelQuiz[sesion.temaId]) || 0;
        if (sesion.nivel > nivelPrevio) {
          logro.nivelQuiz[sesion.temaId] = sesion.nivel;
          await almacen.actualizar("logros", logro.id, { nivelQuiz: logro.nivelQuiz });
        }
      }
    }

    // En todos los casos llama a procesarIntento
    const resultadoGamif = await procesarIntento(req.usuario, {
      actividad: "quiz",
      temaId: sesion.temaId,
      nivel: sesion.nivel,
      puntaje: aciertos,
      maximo: total,
      errores,
      duracionSeg,
      detalle: {
        aprobado,
        porcentaje,
        sesionId: sesion.id
      }
    });

    // Marcar sesión como finalizada
    await almacen.actualizar("quiz-sesiones", sesion.id, {
      finalizada: true,
      fin: new Date().toISOString(),
      porcentaje,
      aprobado,
      aciertos,
      total
    });

    res.json({
      porcentaje,
      aprobado,
      aciertos,
      total,
      repasar,
      puntosGanados: resultadoGamif.puntosGanados,
      insigniasNuevas: resultadoGamif.insigniasNuevas
    });
  } catch (err) {
    next(err);
  }
});

export default router;
