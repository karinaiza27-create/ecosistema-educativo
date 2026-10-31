// servidor/gamificacion.js · Motor de gamificación pedagógica (puntos, logros e insignias)

import * as almacen from "./almacen.js";
import { asignaturasDe, asignaturaDeTema } from "./acceso.js";
import { evaluarAlertas } from "./alertas.js";

// Registro en memoria de intentos por usuario para control de límite por hora
const registroIntentosPorUsuario = new Map();

function extraerValor(obj, campo) {
  if (!obj || !campo) return undefined;
  const partes = campo.split(".");
  let actual = obj;
  for (const parte of partes) {
    if (actual == null || typeof actual !== "object") return undefined;
    actual = actual[parte];
  }
  return actual;
}

function calcularRachaHastaHoy(todosLosIntentosUsuario) {
  if (!todosLosIntentosUsuario || todosLosIntentosUsuario.length === 0) return 0;
  const diasUnicos = new Set(
    todosLosIntentosUsuario.map((i) =>
      i.fecha ? i.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10)
    )
  );

  let racha = 0;
  const cursor = new Date();

  while (true) {
    const fechaStr = cursor.toISOString().slice(0, 10);
    if (diasUnicos.has(fechaStr)) {
      racha++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return racha;
}

/**
 * Procesa un intento de actividad formativa o lúdica.
 * Valida datos, calcula puntos, gestiona logros y evalúa insignias.
 */
export async function procesarIntento(usuario, datos) {
  if (!usuario || !usuario.id) {
    const err = new Error("No autenticado");
    err.estado = 401;
    throw err;
  }

  if (!datos || typeof datos !== "object") {
    const err = new Error("Datos de intento no válidos");
    err.estado = 400;
    throw err;
  }

  const reglas = await almacen.leerConfig("reglas-gamificacion");
  if (!reglas || !reglas.puntos) {
    const err = new Error("Configuración de gamificación no disponible");
    err.estado = 500;
    throw err;
  }

  const { actividad } = datos;
  if (!actividad || typeof actividad !== "string" || reglas.puntos[actividad] === undefined) {
    const err = new Error(`Actividad "${actividad}" no reconocida`);
    err.estado = 400;
    throw err;
  }

  const puntaje = Number(datos.puntaje);
  const maximo = Number(datos.maximo);
  if (isNaN(puntaje) || isNaN(maximo) || maximo <= 0 || puntaje < 0 || puntaje > maximo) {
    const err = new Error("El puntaje debe ser mayor o igual a 0 y menor o igual al máximo permitido");
    err.estado = 400;
    throw err;
  }

  const errores = Number(datos.errores) >= 0 ? Number(datos.errores) : 0;
  const duracionSeg = Number(datos.duracionSeg) >= 0 ? Number(datos.duracionSeg) : 0;
  const nivel = datos.nivel !== undefined && datos.nivel !== null ? Number(datos.nivel) : null;
  const detalle = datos.detalle && typeof datos.detalle === "object" ? datos.detalle : {};

  // Validación de acceso al tema si viene especificado
  if (datos.temaId) {
    const asignaturaId = await asignaturaDeTema(datos.temaId);
    if (!asignaturaId) {
      const err = new Error("El tema especificado no existe o no tiene una unidad vinculada");
      err.estado = 400;
      throw err;
    }

    if (usuario.rol !== "admin") {
      const asignaturasPermitidas = await asignaturasDe(usuario);
      if (!asignaturasPermitidas.includes(asignaturaId)) {
        const err = new Error("No tienes acceso al tema especificado");
        err.estado = 403;
        throw err;
      }
    }
  }

  // Control de límite de intentos por hora en memoria (429)
  const ahora = Date.now();
  const limiteHora = reglas.limiteIntentosHora || 60;
  const ventanaHora = ahora - 3600 * 1000;
  let historial = registroIntentosPorUsuario.get(usuario.id) || [];
  historial = historial.filter((ts) => ts > ventanaHora);

  if (historial.length >= limiteHora) {
    const err = new Error(`Has alcanzado el límite de ${limiteHora} intentos por hora. Intenta más tarde.`);
    err.estado = 429;
    throw err;
  }

  historial.push(ahora);
  registroIntentosPorUsuario.set(usuario.id, historial);

  // Cálculo de puntos base y bono
  const puntosBase = Math.round((reglas.puntos[actividad] * puntaje) / maximo);
  const actividadesSinBono = new Set(["tema-revisado", "foro"]);
  const bono =
    !actividadesSinBono.has(actividad) &&
    datos.errores !== undefined &&
    Number(datos.errores) === 0 &&
    puntaje === maximo
      ? (reglas.bonoSinErrores || 0)
      : 0;
  let puntosCalculados = puntosBase + bono;

  // Condiciones bajo las cuales el intento se guarda pero sin puntos (0)
  const intentosTodos = await almacen.leer("intentos");
  const intentosPreviosUsuario = intentosTodos.filter((i) => i.usuarioId === usuario.id);

  let sinPuntos = false;

  // 1. Actividad única y ya existe intento con puntos con la misma clave
  if (reglas.unicas && Array.isArray(reglas.unicas[actividad])) {
    const camposUnicos = reglas.unicas[actividad];
    const claveActual = camposUnicos
      .map((c) => String(extraerValor({ ...datos, detalle }, c)))
      .join("::");

    const yaTienePuntos = intentosPreviosUsuario.some((i) => {
      if (i.actividad !== actividad || !(i.puntos > 0)) return false;
      const clavePrev = camposUnicos
        .map((c) => String(extraerValor(i, c)))
        .join("::");
      return clavePrev === claveActual;
    });

    if (yaTienePuntos) {
      sinPuntos = true;
    }
  }

  // 2. Requiere aprobado y no está aprobado
  if (Array.isArray(reglas.requiereAprobado) && reglas.requiereAprobado.includes(actividad)) {
    if (detalle.aprobado !== true) {
      sinPuntos = true;
    }
  }

  // 3. Máximo diario con puntos alcanzado hoy
  if (reglas.maxDiario && reglas.maxDiario[actividad] !== undefined) {
    const hoyIso = new Date().toISOString().slice(0, 10);
    const intentosHoyConPuntos = intentosPreviosUsuario.filter(
      (i) => i.actividad === actividad && i.puntos > 0 && i.fecha && i.fecha.slice(0, 10) === hoyIso
    ).length;

    if (intentosHoyConPuntos >= reglas.maxDiario[actividad]) {
      sinPuntos = true;
    }
  }

  if (sinPuntos) {
    puntosCalculados = 0;
  }

  // Guardar intento
  const intentoParaGuardar = {
    usuarioId: usuario.id,
    actividad,
    temaId: datos.temaId || null,
    nivel,
    puntaje,
    maximo,
    errores,
    duracionSeg,
    detalle,
    puntos: puntosCalculados
  };

  const intentoGuardado = await almacen.agregar("intentos", intentoParaGuardar);

  // Obtener o inicializar logros del usuario
  const todosLogros = await almacen.leer("logros");
  let logroUsuario = todosLogros.find((l) => l.usuarioId === usuario.id);

  if (!logroUsuario) {
    logroUsuario = {
      usuarioId: usuario.id,
      puntos: 0,
      insignias: [],
      nivelQuiz: {}
    };
  }

  logroUsuario.puntos = (logroUsuario.puntos || 0) + puntosCalculados;

  // Si es un quiz aprobado, actualizar el nivel más alto aprobado para ese tema
  if (actividad === "quiz" && detalle.aprobado === true && datos.temaId && nivel) {
    logroUsuario.nivelQuiz = logroUsuario.nivelQuiz || {};
    const nivelPrevio = logroUsuario.nivelQuiz[datos.temaId] || 0;
    if (nivel > nivelPrevio) {
      logroUsuario.nivelQuiz[datos.temaId] = nivel;
    }
  }

  // Evaluar insignias no obtenidas
  const todasInsignias = await almacen.leer("insignias");
  const insigniasObtenidasIds = new Set((logroUsuario.insignias || []).map((ins) => ins.id));
  const insigniasPendientes = todasInsignias.filter((ins) => !insigniasObtenidasIds.has(ins.id));

  const todosIntentosConNuevo = [...intentosPreviosUsuario, intentoGuardado];
  const insigniasNuevas = [];

  for (const ins of insigniasPendientes) {
    const { condicion } = ins;
    if (!condicion || !condicion.tipo) continue;

    let cumple = false;

    if (condicion.tipo === "conteo") {
      const act = condicion.actividad;
      if (reglas.unicas && Array.isArray(reglas.unicas[act])) {
        // En actividades únicas cuenta claves distintas
        const campos = reglas.unicas[act];
        const clavesDistintas = new Set();
        for (const i of todosIntentosConNuevo) {
          if (i.actividad === act) {
            const clave = campos.map((c) => String(extraerValor(i, c))).join("::");
            clavesDistintas.add(clave);
          }
        }
        cumple = clavesDistintas.size >= (condicion.minimo || 1);
      } else {
        const totalAct = todosIntentosConNuevo.filter((i) => i.actividad === act).length;
        cumple = totalAct >= (condicion.minimo || 1);
      }
    } else if (condicion.tipo === "sinErrores") {
      const act = condicion.actividad;
      cumple = todosIntentosConNuevo.some(
        (i) => i.actividad === act && i.errores === 0 && i.puntaje > 0
      );
    } else if (condicion.tipo === "puntos") {
      cumple = logroUsuario.puntos >= (condicion.minimo || 0);
    } else if (condicion.tipo === "nivelQuiz") {
      const nivelReq = condicion.nivel;
      const nivelesTemas = Object.values(logroUsuario.nivelQuiz || {});
      cumple = nivelesTemas.some((n) => n >= nivelReq);
    } else if (condicion.tipo === "racha") {
      const diasReq = condicion.dias || 1;
      const rachaActual = calcularRachaHastaHoy(todosIntentosConNuevo);
      cumple = rachaActual >= diasReq;
    }

    if (cumple) {
      logroUsuario.insignias.push({
        id: ins.id,
        fecha: new Date().toISOString()
      });
      insigniasNuevas.push({
        id: ins.id,
        nombre: ins.nombre,
        icono: ins.icono
      });
    }
  }

  // Guardar logros actualizados
  if (logroUsuario.id) {
    await almacen.actualizar("logros", logroUsuario.id, logroUsuario);
  } else {
    await almacen.agregar("logros", logroUsuario);
  }

  // Evaluar alertas tempranas en try/catch
  try {
    await evaluarAlertas(intentoGuardado, usuario);
  } catch (err) {
    console.error("Error al evaluar alertas tempranas:", err);
  }

  return {
    puntosGanados: puntosCalculados,
    puntosTotales: logroUsuario.puntos,
    insigniasNuevas
  };
}

export default {
  procesarIntento
};
