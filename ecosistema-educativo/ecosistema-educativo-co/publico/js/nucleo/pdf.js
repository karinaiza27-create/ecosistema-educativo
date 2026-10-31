// publico/js/nucleo/pdf.js · Generación y descarga accesible de diplomas en PDF

import { usuarioActual } from "./sesion.js";
import * as api from "./api.js";
import * as ui from "./ui.js";

const NOMBRES_BLOOM = {
  1: "Recordar",
  2: "Comprender",
  3: "Aplicar",
  4: "Analizar",
  5: "Evaluar"
};

/**
 * Asegura la carga del cliente jsPDF desde CDN oficial permitido.
 */
async function cargarJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) {
    return window.jspdf.jsPDF;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error("Librería jsPDF no disponible tras la carga."));
      }
    };
    script.onerror = () => reject(new Error("No se pudo cargar jsPDF desde el CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Genera y descarga un diploma en formato PDF.
 * @param {object} opciones - { tipo: "cumplimiento" | "nivel-quiz", temaId, nivel }
 * @returns {Promise<{ codigo: string }>}
 */
export async function generarDiploma({ tipo = "nivel-quiz", temaId = null, nivel = 1 } = {}) {
  ui.cargando(true);
  try {
    const jsPDF = await cargarJsPDF();
    const usuario = usuarioActual() || { nombre: "Estudiante", apellido: "" };
    const nombreCompleto = `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() || "Estudiante";

    // Obtener información del tema pedagógico
    let tituloTema = "Competencias Digitales";
    if (temaId) {
      try {
        const temas = await api.listar("temas", { id: temaId });
        if (Array.isArray(temas) && temas.length > 0) {
          tituloTema = temas[0].titulo;
        } else {
          const t = await api.obtener("temas", temaId);
          if (t && t.titulo) tituloTema = t.titulo;
        }
      } catch {}
    }

    // Código único del certificado
    const sufijoAleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
    const codigo = `DIP-${Date.now().toString(36).toUpperCase()}-${sufijoAleatorio}`;
    const fechaEmision = new Date().toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const nombreNivel = NOMBRES_BLOOM[nivel] || `Nivel ${nivel}`;

    // Crear documento apaisado A4 (297mm x 210mm)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Marco exterior azul oscuro / primario
    doc.setDrawColor(26, 54, 93);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    // Marco interior dorado / acento
    doc.setDrawColor(197, 148, 43);
    doc.setLineWidth(0.8);
    doc.rect(14, 14, 269, 182);

    // Encabezado institucional
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(26, 54, 93);
    doc.text("ECOSISTEMA EDUCATIVO DIGITAL", 148.5, 30, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Plataforma de Aprendizaje y Evaluación por Competencias", 148.5, 36, { align: "center" });

    // Título del Diploma
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(197, 148, 43);
    doc.text("DIPLOMA DE LOGRO FORMATIVO", 148.5, 56, { align: "center" });

    // Texto de certificación
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.text("Se otorga con distinción el presente reconocimiento a:", 148.5, 72, { align: "center" });

    // Nombre del estudiante
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(nombreCompleto.toUpperCase(), 148.5, 88, { align: "center" });

    // Línea decorativa bajo el nombre
    doc.setDrawColor(197, 148, 43);
    doc.setLineWidth(0.5);
    doc.line(70, 92, 227, 92);

    // Detalle del logro
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);

    let lineaDetalle1 = `Por haber superado satisfactoriamente la evaluación del Nivel ${nivel}: ${nombreNivel}`;
    if (tipo === "cumplimiento") {
      lineaDetalle1 = "Por haber completado con éxito la totalidad de los contenidos y actividades del tema:";
    }

    doc.text(lineaDetalle1, 148.5, 108, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(26, 54, 93);
    doc.text(`«${tituloTema}»`, 148.5, 118, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text("Demostrando dominio de conceptos, razonamiento crítico y aplicación pedagógica.", 148.5, 128, { align: "center" });

    // Metadatos y firma
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);

    // Fecha
    doc.text(`Fecha de emisión: ${fechaEmision}`, 40, 165);

    // Código de verificación
    doc.setFont("courier", "bold");
    doc.text(`Código de verificación: ${codigo}`, 40, 172);

    // Sello o firma digital
    doc.setFont("helvetica", "normal");
    doc.line(190, 160, 260, 160);
    doc.text("Comité Académico y Pedagógico", 225, 165, { align: "center" });
    doc.setFontSize(8);
    doc.text("Ecosistema Educativo Digital", 225, 170, { align: "center" });

    // Guardar archivo PDF en el navegador del estudiante
    const nombreArchivo = `Diploma_${tipo === "cumplimiento" ? "Tema" : `Nivel_${nivel}`}_${codigo}.pdf`;
    doc.save(nombreArchivo);

    ui.aviso("Diploma generado y descargado con éxito.", "exito");
    return { codigo };
  } catch (err) {
    ui.aviso("Error al generar diploma: " + err.message, "error");
    throw err;
  } finally {
    ui.cargando(false);
  }
}

export default {
  generarDiploma
};
