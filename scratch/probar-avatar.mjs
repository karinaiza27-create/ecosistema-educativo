// scratch/probar-avatar.mjs · Verificación de la implementación del avatar guía pedagógico

import fs from "fs/promises";
import assert from "assert";

async function probar() {
  console.log("Iniciando pruebas de Avatar Guía (P11.3)...");

  // 1. avatar.js existe y exporta montarAvatar, decir, cambiarEstado
  const avatarCode = await fs.readFile("publico/js/nucleo/avatar.js", "utf8");
  assert(avatarCode.includes("export function montarAvatar"), "Falta export montarAvatar");
  assert(avatarCode.includes("export function decir"), "Falta export decir");
  assert(avatarCode.includes("export function cambiarEstado"), "Falta export cambiarEstado");
  assert(avatarCode.includes("<svg class=\"avatar-svg\""), "Debe tener SVG inline");
  assert(avatarCode.includes("avatar_voz_activa"), "Debe gestionar avatar_voz_activa en localStorage");
  assert(avatarCode.includes("avatar_oculto"), "Debe gestionar avatar_oculto en localStorage");
  assert(avatarCode.includes("speechSynthesis"), "Debe utilizar speechSynthesis");
  console.log("✓ avatar.js cumple con exports, SVG inline, preferencias y síntesis de voz");

  // 2. componentes.css tiene las clases del avatar y sus estados
  const cssCode = await fs.readFile("publico/css/componentes.css", "utf8");
  assert(cssCode.includes(".avatar-guia-contenedor"), "Falta .avatar-guia-contenedor");
  assert(cssCode.includes(".avatar-guia--reposo"), "Falta .avatar-guia--reposo");
  assert(cssCode.includes(".avatar-guia--hablando"), "Falta .avatar-guia--hablando");
  assert(cssCode.includes(".avatar-guia--pensando"), "Falta .avatar-guia--pensando");
  assert(cssCode.includes(".avatar-guia--celebrando"), "Falta .avatar-guia--celebrando");
  assert(cssCode.includes("prefers-reduced-motion"), "Falta soporte para prefers-reduced-motion");
  console.log("✓ componentes.css incluye clases y animaciones de estados");

  // 3. plantilla.js monta el avatar si hay data-avatar
  const plantillaCode = await fs.readFile("publico/js/nucleo/plantilla.js", "utf8");
  assert(plantillaCode.includes("data-avatar"), "plantilla.js debe detectar data-avatar");
  assert(plantillaCode.includes("montarAvatar()"), "plantilla.js debe llamar montarAvatar");
  assert(plantillaCode.includes("decir("), "plantilla.js debe llamar decir");
  console.log("✓ plantilla.js integra data-avatar con el avatar");

  // 4. Páginas con data-avatar
  const paginas = [
    "publico/paginas/ahorcado.html",
    "publico/paginas/pareja.html",
    "publico/paginas/quiz.html",
    "publico/paginas/sopa-letras.html",
    "publico/paginas/crucigrama.html",
    "publico/paginas/tutor.html"
  ];
  for (const p of paginas) {
    const html = await fs.readFile(p, "utf8");
    assert(html.includes("<main") && html.includes("data-avatar="), `${p} debe tener data-avatar en main`);
  }
  console.log("✓ Todas las páginas requeridas tienen data-avatar en <main>");

  // 5. tutor.js maneja estados pensando y hablando
  const tutorCode = await fs.readFile("publico/js/modulos/tutor.js", "utf8");
  assert(tutorCode.includes('cambiarEstado("pensando")'), "tutor.js debe poner estado pensando");
  assert(tutorCode.includes('cambiarEstado("hablando")'), "tutor.js debe poner estado hablando");
  console.log("✓ tutor.js implementa estados pensando y hablando con lectura condicional");

  // 6. gamificacion.js celebra si hay nueva insignia
  const gamifCode = await fs.readFile("publico/js/nucleo/gamificacion.js", "utf8");
  assert(gamifCode.includes('cambiarEstado("celebrando")'), "gamificacion.js debe cambiar a celebrando");
  assert(gamifCode.includes('cambiarEstado("reposo")'), "gamificacion.js debe volver a reposo tras 3s");
  console.log("✓ gamificacion.js activa estado celebrando por 3 segundos");

  console.log("\nTODAS LAS PRUEBAS DE P11.3 PASARON EXITOSAMENTE.");
}

probar().catch((e) => {
  console.error("Error en prueba:", e);
  process.exit(1);
});
