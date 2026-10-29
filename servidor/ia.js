// servidor/ia.js · Motor de ejecución de tareas de inteligencia artificial

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as almacen from "./almacen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_PROMPTS = path.resolve(__dirname, "prompts");
const DIR_PREPARADORES = path.resolve(__dirname, "preparadores");

/**
 * Genera preguntas pedagógicas sintéticas cuando no se ha configurado una clave de IA externa.
 */
function generarPreguntasSimuladas(variables) {
  const { tema = "Concepto", glosario = "", cantidad = 5, nivelBloom = "1 Recordar" } = variables;

  // Extraer términos del glosario si existen
  const lineasGlosario = glosario
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes(":"))
    .map((l) => {
      const idx = l.indexOf(":");
      return {
        termino: l.substring(0, idx).trim(),
        def: l.substring(idx + 1).trim()
      };
    });

  const tipos = ["opcion", "vf", "completar"];
  const preguntas = [];

  for (let i = 0; i < cantidad; i++) {
    const tipo = tipos[i % tipos.length];
    const terminoActual = lineasGlosario[i % Math.max(1, lineasGlosario.length)] || {
      termino: `${tema} (término ${i + 1})`,
      def: `Definición central de ${tema} para el nivel de ${nivelBloom}.`
    };

    if (tipo === "opcion") {
      preguntas.push({
        tipo: "opcion",
        enunciado: `¿Cuál de las siguientes opciones describe con mayor precisión a "${terminoActual.termino}" en relación con ${tema}?`,
        opciones: [
          terminoActual.def,
          `Una herramienta sin relación directa con los objetivos pedagógicos de ${tema}.`,
          `Un concepto secundario que contradice los principios de ${tema}.`,
          `Un método obsoleto no aplicable a este nivel educativo.`
        ],
        correcta: 0,
        retroalimentacion: `Es correcta porque ${terminoActual.termino} se define exactamente como: ${terminoActual.def}.`
      });
    } else if (tipo === "vf") {
      const esVerdadera = i % 2 === 0;
      preguntas.push({
        tipo: "vf",
        enunciado: esVerdadera
          ? `En el contexto de ${tema}, ${terminoActual.termino} se fundamenta en: ${terminoActual.def}`
          : `En el contexto de ${tema}, ${terminoActual.termino} prohíbe el uso de cualquier herramienta digital o conceptual.`,
        opciones: ["Verdadero", "Falso"],
        correcta: esVerdadera,
        retroalimentacion: esVerdadera
          ? `Es verdadero porque ${terminoActual.termino} corresponde a esa definición según los contenidos revisados.`
          : `Es falso porque contradice la finalidad práctica y pedagógica de ${tema}.`
      });
    } else {
      preguntas.push({
        tipo: "completar",
        enunciado: `El concepto de ____ se refiere a: ${terminoActual.def}`,
        opciones: [],
        correcta: terminoActual.termino,
        retroalimentacion: `El término que completa con exactitud el enunciado es "${terminoActual.termino}".`
      });
    }
  }

  return preguntas;
}

/**
 * Genera una intervención socrática o rechazo curricular simulado cuando no hay conexión a IA externa.
 */
function generarRespuestaTutorSimulada(variables) {
  const { asignatura = "esta asignatura", temario = "", mensaje = "" } = variables;
  const mensajeMin = (mensaje || "").toLowerCase().trim();
  const temarioMin = (temario || "").toLowerCase();

  // Saludo amigable y orientación
  if (/^(hola|buenos d[ií]as|buenas tardes|buenas noches|saludos|qu[eé] tal|buenas)\b/i.test(mensajeMin)) {
    return `¡Hola! Soy Sócrates, tu tutor virtual para ${asignatura}. Mi misión es guiarte mediante preguntas reflexivas y pistas para que descubras las respuestas por ti mismo. ¿Qué concepto o inquietud de nuestro temario te gustaría que analicemos hoy?`;
  }

  // Comprobar si la consulta es ajena al temario de la asignatura
  const palabrasMsg = mensajeMin.split(/[\s,.;:?¿!¡]+/).filter((w) => w.length > 3);
  const coincideConTemario = palabrasMsg.some((p) => temarioMin.includes(p));

  const esFueraDeTema =
    /f[uú]tbol|partido|receta|pizza|pastel|m[uú]sica|canci[oó]n|pel[ií]cula|netflix|chiste|clima|presidente|pol[ií]tica|videojuego|minecraft|fifa|fortnite/i.test(mensajeMin) ||
    (!coincideConTemario && palabrasMsg.length > 5 && !/qu[eé]|c[oó]mo|por qu[eé]|cu[aá]l|duda|ayuda|pregunta|explicar|concepto|tema/i.test(mensajeMin));

  if (esFueraDeTema) {
    return `Como tu tutor socrático en ${asignatura}, mi propósito es guiarte exclusivamente en los contenidos y conceptos de esta materia. ¿Qué tema o duda de ${asignatura} te gustaría que analicemos juntos?`;
  }

  // Enfoque socrático: promover la reflexión guiada sin dar respuestas directas
  return `Esa es una pregunta central en ${asignatura}. Antes de llegar a una conclusión, pensemos paso a paso: ¿qué entiendes o recuerdas inicialmente sobre este concepto a partir de lo que has revisado en la unidad? ¿Qué elementos clave crees que intervienen y qué ejemplo cotidiano se te ocurre?`;
}

/**
 * Ejecuta una tarea de IA procesando su preparador, su prompt y el proveedor correspondiente.
 */
export async function ejecutarTarea(tarea, datos = {}, usuario = null, { formato = "json" } = {}) {
  // 1. Validar límite diario de consumo de IA
  const ajustes = await almacen.leerConfig("ajustes");
  const limiteDiario = ajustes.limiteIADiario ?? 30;

  if (usuario && usuario.rol !== "admin") {
    try {
      const hoyISO = new Date().toISOString().slice(0, 10);
      const lineasConsumo = await almacen.leerLineas("consumo-ia.jsonl");
      const consumoHoy = lineasConsumo.filter(
        (c) => c.usuarioId === usuario.id && c.fecha && c.fecha.startsWith(hoyISO)
      ).length;

      if (consumoHoy >= limiteDiario) {
        const error = new Error(`Has alcanzado el límite diario de ${limiteDiario} consultas de IA.`);
        error.estado = 429;
        throw error;
      }
    } catch (e) {
      if (e.estado === 429) throw e;
      // Archivo aún no existe o error menor de lectura
    }
  }

  // 2. Ejecutar preparador si existe
  let variables = { ...datos };
  const rutaPreparador = path.join(DIR_PREPARADORES, `${tarea}.js`);
  try {
    await fs.access(rutaPreparador);
    const mod = await import(pathToFileURL(rutaPreparador).href);
    const preparador = mod.default || mod;
    if (typeof preparador === "function") {
      variables = await preparador(datos, usuario);
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // 3. Cargar plantilla de prompt
  const rutaPrompt = path.join(DIR_PROMPTS, `${tarea}.txt`);
  let plantilla = "";
  try {
    plantilla = await fs.readFile(rutaPrompt, "utf8");
  } catch (err) {
    const error = new Error(`No existe plantilla de prompt para la tarea "${tarea}"`);
    error.estado = 404;
    throw error;
  }

  // 4. Interpolar variables {{clave}}
  let promptInterpolado = plantilla;
  for (const [clave, valor] of Object.entries(variables)) {
    const regex = new RegExp(`{{${clave}}}`, "g");
    promptInterpolado = promptInterpolado.replace(regex, String(valor ?? ""));
  }

  // 5. Separar instrucción de sistema y mensaje de usuario
  let sistema = "";
  let mensajeUsuario = promptInterpolado;
  const separador = "### USUARIO";
  const posSep = promptInterpolado.indexOf(separador);
  if (posSep !== -1) {
    sistema = promptInterpolado.substring(0, posSep).trim();
    mensajeUsuario = promptInterpolado.substring(posSep + separador.length).trim();
  }

  // 6. Consultar proveedor de IA o generador simulado
  let resultado = null;
  const claveIA = (ajustes.ia && ajustes.ia.clave) || process.env.IA_CLAVE || "";
  const modelo = (ajustes.ia && ajustes.ia.modelo) || process.env.IA_MODELO || "gemini-3.8-flash";

  if (claveIA) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(claveIA)}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${sistema ? sistema + "\n\n" : ""}${mensajeUsuario}` }]
          }
        ],
        generationConfig: {
          responseMimeType: formato === "json" ? "application/json" : "text/plain"
        }
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        let msg = `Código ${resp.status}`;
        try {
          const parsed = JSON.parse(errorText);
          msg = parsed?.error?.message || msg;
        } catch {}
        if (msg.includes("high demand") || msg.includes("spikes in demand")) {
          msg = `El modelo '${modelo}' está saturado temporalmente en Google («high demand»). Te recomendamos cambiar a 'gemini-2.0-flash' o 'gemini-1.5-flash', que tienen disponibilidad inmediata permanente.`;
        }
        throw new Error(`Error en llamada a Gemini: ${msg}`);
      }

      const resJson = await resp.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let textoLimpio = rawText.trim();
      if (textoLimpio.startsWith("```json")) {
        textoLimpio = textoLimpio.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      } else if (textoLimpio.startsWith("```")) {
        textoLimpio = textoLimpio.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
      }
      resultado = formato === "json" ? JSON.parse(textoLimpio) : rawText;
    } catch (apiErr) {
      console.warn("Fallo en llamada externa a IA, usando generador local de respaldo:", apiErr.message);
      if (tarea === "generar-preguntas") {
        resultado = generarPreguntasSimuladas(variables);
      } else if (tarea === "tutor") {
        resultado = generarRespuestaTutorSimulada(variables);
      } else {
        throw apiErr;
      }
    }
  } else {
    // Modo simulación pedagógica local
    if (tarea === "generar-preguntas") {
      resultado = generarPreguntasSimuladas(variables);
    } else if (tarea === "tutor") {
      resultado = generarRespuestaTutorSimulada(variables);
    } else {
      resultado = formato === "json" ? [] : "Respuesta simulada";
    }
  }

  // 7. Registrar consumo en bitácora de IA
  try {
    await almacen.anexarLinea("consumo-ia.jsonl", {
      usuarioId: usuario?.id || "anonimo",
      tarea,
      entrada: variables,
      salida: resultado,
      ok: true,
      fecha: new Date().toISOString()
    });
  } catch (logErr) {
    console.warn("No se pudo registrar bitácora consumo-ia:", logErr.message);
  }

  return resultado;
}

export const MODELOS_RECOMENDADOS = [
  { id: "gemini-2.0-flash", nombre: "Gemini 2.0 Flash (Recomendado)", descripcion: "El modelo principal de Google: ultra rápido, alta disponibilidad y excelente calidad." },
  { id: "gemini-2.0-flash-lite", nombre: "Gemini 2.0 Flash Lite (Anti-saturación)", descripcion: "Diseñado para latencia mínima y máxima tolerancia a picos de demanda." },
  { id: "gemini-1.5-flash", nombre: "Gemini 1.5 Flash (Estándar de producción)", descripcion: "Ampliamente probado con gran capacidad de contexto y disponibilidad constante." },
  { id: "gemini-1.5-flash-8b", nombre: "Gemini 1.5 Flash 8B (Ultra ligero)", descripcion: "Ideal para generación rápida con bajo consumo." },
  { id: "gemini-1.5-pro", nombre: "Gemini 1.5 Pro (Razonamiento profundo)", descripcion: "Para evaluaciones complejas que demandan máxima precisión." },
  { id: "gemini-3.8-flash", nombre: "Gemini 3.8 Flash (Experimental)", descripcion: "Versión preliminar sujeta a alta demanda temporal." },
  { id: "gemini-4-argon", nombre: "Gemini 4 Argon (Experimental)", descripcion: "Versión preliminar sujeta a alta demanda temporal." }
];

/**
 * Consulta la lista de modelos disponibles directamente a la API de Google o devuelve la lista recomendada.
 */
export async function listarModelosDisponibles(claveParam = null) {
  const ajustes = await almacen.leerConfig("ajustes");
  const clave = claveParam || ajustes.ia?.clave || process.env.IA_CLAVE || "";

  if (!clave) {
    return { modelos: MODELOS_RECOMENDADOS, origen: "predeterminados" };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(clave)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return { modelos: MODELOS_RECOMENDADOS, origen: "predeterminados" };
    }
    const data = await resp.json();
    const lista = Array.isArray(data.models) ? data.models : [];
    const filtrados = lista
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => {
        const idLimpio = m.name.replace(/^models\//, "");
        return {
          id: idLimpio,
          nombre: m.displayName ? `${m.displayName} (${idLimpio})` : idLimpio,
          descripcion: m.description || ""
        };
      });

    return {
      modelos: filtrados.length > 0 ? filtrados : MODELOS_RECOMENDADOS,
      origen: "google_api"
    };
  } catch {
    return { modelos: MODELOS_RECOMENDADOS, origen: "predeterminados" };
  }
}

/**
 * Prueba la conectividad con el modelo de Gemini configurado o proporcionado.
 */
export async function probarConexionIA(configParam = null) {
  const ajustes = await almacen.leerConfig("ajustes");
  const claveIA = configParam?.clave || ajustes.ia?.clave || process.env.IA_CLAVE || "";
  const modelo = configParam?.modelo || ajustes.ia?.modelo || process.env.IA_MODELO || "gemini-2.0-flash";
  const proveedor = configParam?.proveedor || ajustes.ia?.proveedor || process.env.IA_PROVEEDOR || "gemini";

  if (!claveIA) {
    throw new Error("No hay API Key configurada. Ingrésala para probar la conexión.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(claveIA)}`;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Responde únicamente este JSON exacto: {\"estado\":\"ok\",\"mensaje\":\"Conexión exitosa con Gemini\"}" }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    let msg = `Código ${resp.status}`;
    try {
      const errJson = JSON.parse(errorBody);
      msg = errJson?.error?.message || msg;
    } catch {}

    if (msg.includes("high demand") || msg.includes("spikes in demand")) {
      msg = `El modelo '${modelo}' está saturado temporalmente en Google («high demand»). Te recomendamos cambiar a 'gemini-2.0-flash' o 'gemini-1.5-flash', que tienen disponibilidad inmediata permanente.`;
    }

    throw new Error(msg);
  }

  const resJson = await resp.json();
  const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  let respuesta = { estado: "ok", mensaje: "Conexión exitosa" };
  try {
    const limpia = rawText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    respuesta = JSON.parse(limpia);
  } catch {}

  return {
    ok: true,
    proveedor,
    modelo,
    respuesta
  };
}

export default {
  ejecutarTarea,
  probarConexionIA,
  listarModelosDisponibles,
  MODELOS_RECOMENDADOS
};
