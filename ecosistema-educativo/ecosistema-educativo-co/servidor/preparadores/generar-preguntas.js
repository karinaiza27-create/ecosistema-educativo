// servidor/preparadores/generar-preguntas.js · Preparador para generar preguntas con IA

import * as almacen from "../almacen.js";
import { asignaturaDeTema, puedeEditarAsignatura } from "../acceso.js";

const MAPA_BLOOM = {
  1: "1 Recordar",
  2: "2 Comprender",
  3: "3 Aplicar",
  4: "4 Analizar",
  5: "5 Evaluar"
};

export default async function prepararGeneracionPreguntas(cuerpo, usuario) {
  const { temaId } = cuerpo || {};
  if (!temaId) {
    const error = new Error("El campo temaId es obligatorio");
    error.estado = 400;
    throw error;
  }

  const nivelNum = Math.min(5, Math.max(1, parseInt(cuerpo.nivel, 10) || 1));
  const cantidad = Math.min(15, Math.max(5, parseInt(cuerpo.cantidad, 10) || 5));

  // Verificar que el tema exista
  const temas = await almacen.leer("temas");
  const tema = temas.find((t) => t.id === temaId);
  if (!tema) {
    const error = new Error(`El tema con ID "${temaId}" no existe`);
    error.estado = 404;
    throw error;
  }

  // Verificar permisos sobre la asignatura
  const asignaturaId = await asignaturaDeTema(temaId);
  if (!asignaturaId) {
    const error = new Error("No se pudo determinar la asignatura vinculada a este tema");
    error.estado = 404;
    throw error;
  }

  const puede = await puedeEditarAsignatura(usuario, asignaturaId);
  if (!puede) {
    const error = new Error("No tienes permisos para generar preguntas en este tema");
    error.estado = 403;
    throw error;
  }

  // Obtener datos de la asignatura
  const asignaturas = await almacen.leer("asignaturas");
  const asig = asignaturas.find((a) => a.id === asignaturaId);

  // Armar contenido pedagógico del tema
  const partesContenido = [];
  if (tema.resumen) {
    partesContenido.push(`Resumen:\n${tema.resumen}`);
  }
  if (Array.isArray(tema.objetivos) && tema.objetivos.length > 0) {
    partesContenido.push(`Objetivos de aprendizaje:\n${tema.objetivos.map((o) => "- " + o).join("\n")}`);
  }
  if (Array.isArray(tema.ejemplos) && tema.ejemplos.length > 0) {
    partesContenido.push(`Ejemplos:\n${tema.ejemplos.map((e) => "- " + e).join("\n")}`);
  }
  if (Array.isArray(tema.erroresFrecuentes) && tema.erroresFrecuentes.length > 0) {
    partesContenido.push(`Errores frecuentes a considerar:\n${tema.erroresFrecuentes.map((e) => "- " + e).join("\n")}`);
  }
  if (Array.isArray(tema.preguntasGuia) && tema.preguntasGuia.length > 0) {
    partesContenido.push(`Preguntas guía:\n${tema.preguntasGuia.map((p) => "- " + p).join("\n")}`);
  }

  const contenido = partesContenido.join("\n\n") || tema.resumen || tema.titulo;

  // Armar glosario del tema: "término: definición"
  const listaGlosario = await almacen.buscar("glosario", { temaId });
  const glosario = listaGlosario
    .filter((g) => g && g.termino && g.definicion && (!g.estado || g.estado === "aprobado"))
    .map((g) => `${g.termino}: ${g.definicion}`)
    .join("\n") || "No hay términos registrados en el glosario.";

  // Enunciados existentes en ese nivel
  const todasPreguntas = await almacen.buscar("preguntas", { temaId });
  const preguntasNivel = todasPreguntas.filter((p) => Number(p.nivel) === nivelNum);
  const existentes = preguntasNivel.length > 0
    ? preguntasNivel.map((p) => `- ${p.enunciado}`).join("\n")
    : "Ninguna pregunta registrada todavía para este nivel.";

  const nivelBloom = MAPA_BLOOM[nivelNum] || `${nivelNum} Recordar`;

  return {
    asignatura: asig?.nombre || "Asignatura",
    nivel: asig?.nivel || "General",
    tema: tema.titulo || "Tema",
    contenido,
    glosario,
    nivelBloom,
    cantidad,
    existentes
  };
}
