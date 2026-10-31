// servidor/preparadores/tutor.js · Preparador de contexto curricular y socrático para el tutor virtual

import * as almacen from "../almacen.js";
import { asignaturasDe } from "../acceso.js";

export default async function prepararTutor(cuerpo, usuario) {
  const { asignaturaId, mensaje, historial } = cuerpo || {};

  if (!asignaturaId) {
    const error = new Error("El campo asignaturaId es obligatorio");
    error.estado = 400;
    throw error;
  }

  if (!mensaje || typeof mensaje !== "string" || !mensaje.trim()) {
    const error = new Error("El mensaje del estudiante no puede estar vacío");
    error.estado = 400;
    throw error;
  }

  // 1. Validar acceso a la asignatura
  if (usuario && usuario.rol !== "admin") {
    const permitidas = await asignaturasDe(usuario);
    if (!permitidas.includes(asignaturaId)) {
      const error = new Error("No tienes acceso a los contenidos de esta asignatura");
      error.estado = 403;
      throw error;
    }
  }

  // 2. Control de cuota diaria del tutor
  const ajustes = await almacen.leerConfig("ajustes");
  const limiteDiario = ajustes.limiteTutorDiario ?? 40;

  if (usuario && usuario.rol === "estudiante") {
    try {
      const hoyIso = new Date().toISOString().slice(0, 10);
      const consultas = await almacen.leer("consultas-tutor");
      const hoyConsultas = consultas.filter(
        (c) => c.usuarioId === usuario.id && c.dia === hoyIso
      );

      const totalMensajesHoy = hoyConsultas.reduce((acc, curr) => {
        return acc + (Array.isArray(curr.mensajes) ? curr.mensajes.length : 1);
      }, 0);

      if (totalMensajesHoy >= limiteDiario) {
        const error = new Error(
          `Has alcanzado el límite diario de ${limiteDiario} consultas con el tutor socrático. ¡Has tenido una excelente jornada de estudio!`
        );
        error.estado = 429;
        throw error;
      }
    } catch (e) {
      if (e.estado === 429) throw e;
    }
  }

  // 3. Cargar información curricular de la asignatura
  const asignaturas = await almacen.leer("asignaturas");
  const asig = asignaturas.find((a) => a.id === asignaturaId);
  if (!asig) {
    const error = new Error(`La asignatura "${asignaturaId}" no existe`);
    error.estado = 404;
    throw error;
  }

  const todasUnidades = await almacen.leer("unidades");
  const unidadesAsig = todasUnidades
    .filter((u) => u.asignaturaId === asignaturaId && u.visible !== false)
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

  const unidadesIds = new Set(unidadesAsig.map((u) => u.id));

  const todosTemas = await almacen.leer("temas");
  const temasAsig = todosTemas
    .filter((t) => unidadesIds.has(t.unidadId) && (t.estado === "publicado" || usuario?.rol !== "estudiante"))
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

  const temaIds = new Set(temasAsig.map((t) => t.id));

  const todoGlosario = await almacen.leer("glosario");
  const glosarioAsig = todoGlosario.filter(
    (g) => temaIds.has(g.temaId) && (!g.estado || g.estado === "aprobado")
  );

  // 4. Compilar temario curricular estructurado
  const lineasTemario = [];
  lineasTemario.push(`ASIGNATURA: ${asig.nombre.toUpperCase()} (Nivel: ${asig.nivel || "General"})`);
  if (asig.descripcion) {
    lineasTemario.push(`Descripción general: ${asig.descripcion}`);
  }

  for (const u of unidadesAsig) {
    lineasTemario.push(`\n[UNIDAD ${u.orden || ""}: ${u.titulo}]`);
    const temasDeUnidad = temasAsig.filter((t) => t.unidadId === u.id);

    if (temasDeUnidad.length === 0) {
      lineasTemario.push(`  (Sin temas publicados aún)`);
    }

    for (const t of temasDeUnidad) {
      lineasTemario.push(`  * TEMA ${t.orden || ""}: ${t.titulo}`);
      if (t.resumen) lineasTemario.push(`    - Resumen conceptual: ${t.resumen}`);
      if (Array.isArray(t.objetivos) && t.objetivos.length > 0) {
        lineasTemario.push(`    - Objetivos pedagógicos: ${t.objetivos.join("; ")}`);
      }
      if (Array.isArray(t.ejemplos) && t.ejemplos.length > 0) {
        lineasTemario.push(`    - Ejemplos prácticos: ${t.ejemplos.join("; ")}`);
      }
      if (Array.isArray(t.erroresFrecuentes) && t.erroresFrecuentes.length > 0) {
        lineasTemario.push(`    - Errores conceptuales frecuentes: ${t.erroresFrecuentes.join("; ")}`);
      }

      const terminosTema = glosarioAsig.filter((g) => g.temaId === t.id);
      if (terminosTema.length > 0) {
        const glosarioTexto = terminosTema.map((g) => `${g.termino}: ${g.definicion}`).join(" | ");
        lineasTemario.push(`    - Términos del glosario: ${glosarioTexto}`);
      }
    }
  }

  const temario = lineasTemario.join("\n");

  // 5. Formatear historial conversacional para mantener contexto
  let textoHistorial = "Inicio de la conversación. No hay mensajes anteriores.";
  if (Array.isArray(historial) && historial.length > 0) {
    const ultimos = historial.slice(-8);
    textoHistorial = ultimos
      .map((m) => `${m.rol === "estudiante" ? "Estudiante" : "Sócrates (Tutor)"}: ${m.texto}`)
      .join("\n");
  }

  return {
    asignatura: asig.nombre,
    nivel: asig.nivel || "General",
    temario,
    historial: textoHistorial,
    mensaje: mensaje.trim()
  };
}
