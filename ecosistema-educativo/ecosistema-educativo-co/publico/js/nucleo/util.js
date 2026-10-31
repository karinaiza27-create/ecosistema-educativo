// publico/js/nucleo/util.js · Utilidades de formato, texto, fechas y colecciones

import { escapar } from "./ui.js";

export function normalizar(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .trim()
    .toUpperCase()
    .replace(/Ñ/g, "\uE000")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uE000/g, "Ñ");
}

export function barajar(lista) {
  if (!Array.isArray(lista)) return [];
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function fechaLarga(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "long",
    timeZone: "America/Guayaquil"
  }).format(fecha);
}

export function fechaRelativa(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";

  const ahora = Date.now();
  const diffSegundos = Math.round((fecha.getTime() - ahora) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es-EC", { numeric: "auto" });

  const absSegundos = Math.abs(diffSegundos);
  if (absSegundos < 60) {
    return rtf.format(diffSegundos, "second");
  }
  const diffMinutos = Math.round(diffSegundos / 60);
  if (Math.abs(diffMinutos) < 60) {
    return rtf.format(diffMinutos, "minute");
  }
  const diffHoras = Math.round(diffMinutos / 60);
  if (Math.abs(diffHoras) < 24) {
    return rtf.format(diffHoras, "hour");
  }
  const diffDias = Math.round(diffHoras / 24);
  if (Math.abs(diffDias) < 30) {
    return rtf.format(diffDias, "day");
  }
  const diffMeses = Math.round(diffDias / 30);
  if (Math.abs(diffMeses) < 12) {
    return rtf.format(diffMeses, "month");
  }
  const diffAnios = Math.round(diffDias / 365);
  return rtf.format(diffAnios, "year");
}

export function parametro(nombre) {
  if (typeof window === "undefined" || !window.location) return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nombre);
}

export function formatoBasico(texto) {
  if (!texto) return "";
  const escapado = escapar(texto);
  const conNegrita = escapado.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const bloques = conNegrita.split(/\n\s*\n/);

  const bloquesHtml = bloques.map((bloque) => {
    const lineas = bloque.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lineas.length === 0) return "";

    let html = "";
    let itemsLista = [];

    const vaciarLista = () => {
      if (itemsLista.length > 0) {
        html += `<ul>${itemsLista.map((it) => `<li>${it}</li>`).join("")}</ul>`;
        itemsLista = [];
      }
    };

    let lineasParrafo = [];
    const vaciarParrafo = () => {
      if (lineasParrafo.length > 0) {
        html += `<p>${lineasParrafo.join("<br>")}</p>`;
        lineasParrafo = [];
      }
    };

    for (const linea of lineas) {
      if (linea.startsWith("- ")) {
        vaciarParrafo();
        itemsLista.push(linea.slice(2));
      } else {
        vaciarLista();
        lineasParrafo.push(linea);
      }
    }

    vaciarParrafo();
    vaciarLista();

    return html;
  });

  return bloquesHtml.filter(Boolean).join("");
}

export default {
  normalizar,
  barajar,
  fechaLarga,
  fechaRelativa,
  parametro,
  formatoBasico
};
