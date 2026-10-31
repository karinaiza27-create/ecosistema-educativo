// publico/js/nucleo/bitacora.js · Registro de actividad y eventos en el navegador

import { llamar } from "./api.js";

export async function registrarEvento(tipo, recurso = "") {
  try {
    return await llamar("POST", "/api/eventos", { tipo, recurso });
  } catch (error) {
    // La bitácora en segundo plano no interrumpe la navegación del usuario
    console.warn("No se pudo registrar el evento:", error);
  }
}

export default {
  registrarEvento
};
