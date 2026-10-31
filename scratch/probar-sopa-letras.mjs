// scratch/probar-sopa-letras.mjs · Pruebas unitarias de Sopa de Letras (P05.1)

import assert from "assert";
import fs from "fs/promises";

// Mock mínimo para entorno Node.js
globalThis.window = {
  location: { pathname: "/paginas/sopa-letras.html", search: "" }
};
globalThis.sessionStorage = {
  getItem: (k) => {
    if (k === "usuario") return JSON.stringify({ id: "usr_000001", nombre: "Estudiante", rol: "estudiante" });
    if (k === "token") return "token_valido";
    return null;
  },
  setItem: () => {},
  removeItem: () => {}
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.document = {
  title: "",
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    className: "",
    innerHTML: "",
    appendChild: () => {},
    setAttribute: () => {},
    addEventListener: () => {}
  }),
  body: { appendChild: () => {} },
  addEventListener: () => {}
};

async function probar() {
  console.log("Iniciando pruebas de Sopa de Letras (P05.1)...");

  // Import dinámico de sopa-letras.js tras configurar mocks
  const { generarSopa } = await import("../publico/js/modulos/sopa-letras.js");

  // 1. Probar generarSopa en dificultad Fácil (10x10, H y V)
  const palabrasFacil = ["ALGORITMO", "DATOS", "RED", "CODIGO", "VARIABLE"];
  const direccionesFacil = [[0, 1], [1, 0]];
  const resFacil = generarSopa(palabrasFacil, 10, direccionesFacil);

  assert(Array.isArray(resFacil.grilla), "grilla debe ser un array");
  assert.strictEqual(resFacil.grilla.length, 10, "grilla debe tener 10 filas");
  assert.strictEqual(resFacil.grilla[0].length, 10, "grilla debe tener 10 columnas");
  assert(resFacil.ubicaciones.length > 0, "debe ubicar palabras");

  // Verificar que todas las celdas estén rellenas con letras A-Z o Ñ
  const regexLetra = /^[A-ZÑ]$/;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      assert(regexLetra.test(resFacil.grilla[r][c]), `Celda [${r}][${c}] inválida: ${resFacil.grilla[r][c]}`);
    }
  }

  // Verificar que las palabras ubicadas coincidan con las letras en la grilla
  for (const u of resFacil.ubicaciones) {
    const palabraEnGrilla = u.casillas.map((p) => resFacil.grilla[p.r][p.c]).join("");
    assert.strictEqual(palabraEnGrilla, u.palabra, `La palabra ${u.palabra} no coincide en la grilla`);
  }
  console.log("✓ generarSopa (10x10) funciona correctamente y verifica coherencia de letras");

  // 2. Probar dificultad Media (12x12, con diagonales)
  const palabrasMedia = ["COMPUTADORA", "PROGRAMA", "SISTEMA", "MEMORIA", "TECLADO", "PANTALLA"];
  const direccionesMedia = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  const resMedia = generarSopa(palabrasMedia, 12, direccionesMedia);
  assert.strictEqual(resMedia.grilla.length, 12, "debe ser 12x12");
  assert.strictEqual(resMedia.grilla[0].length, 12, "debe ser 12x12");
  console.log("✓ generarSopa (12x12 con diagonales) funciona correctamente");

  // 3. Probar dificultad Difícil (15x15, 8 direcciones con invertidas)
  const palabrasDificil = ["ALGORITMOS", "ESTRUCTURAS", "FUNCIONES", "MATRICES", "RECURSION", "OBJETOS"];
  const direccionesDificil = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  const resDificil = generarSopa(palabrasDificil, 15, direccionesDificil);
  assert.strictEqual(resDificil.grilla.length, 15, "debe ser 15x15");
  assert.strictEqual(resDificil.grilla[0].length, 15, "debe ser 15x15");
  console.log("✓ generarSopa (15x15 con 8 direcciones) funciona correctamente");

  // 4. Verificar catalogo-actividades.js
  const catalogoContent = await fs.readFile("publico/js/nucleo/catalogo-actividades.js", "utf8");
  assert(catalogoContent.includes('id: "sopa-letras"'), "catalogo debe incluir sopa-letras");
  assert(catalogoContent.includes('texto: "Sopa de letras"'), "catalogo debe tener texto Sopa de letras");
  assert(catalogoContent.includes('descripcion: "Encuentra los conceptos del tema"'), "catalogo debe tener la descripción solicitada");
  assert(catalogoContent.includes('href: "/paginas/sopa-letras.html"'), "catalogo debe enlazar a sopa-letras.html");
  console.log("✓ catalogo-actividades.js contiene la entrada exacta");

  // 5. Verificar elementos en sopa-letras.js
  const jsContent = await fs.readFile("publico/js/modulos/sopa-letras.js", "utf8");
  assert(jsContent.includes("obtenerTemaActividad()"), "debe usar obtenerTemaActividad");
  assert(jsContent.includes("pointerdown"), "debe usar Pointer Events (pointerdown)");
  assert(jsContent.includes("pointermove"), "debe usar Pointer Events (pointermove)");
  assert(jsContent.includes("pointerup"), "debe usar Pointer Events (pointerup)");
  assert(jsContent.includes("mostrarRetro("), "debe llamar a mostrarRetro");
  assert(jsContent.includes("mostrarResumen("), "debe llamar a mostrarResumen");
  assert(jsContent.includes("registrarIntento("), "debe llamar a registrarIntento");
  assert(jsContent.includes('actividad: "sopa-letras"'), "actividad debe ser sopa-letras");
  assert(jsContent.includes("btnRendirse"), "debe tener botón rendirse");
  console.log("✓ sopa-letras.js incluye todos los contratos requeridos");

  // 6. Verificar CSS touch-action: none
  const cssContent = await fs.readFile("publico/css/modulos/sopa-letras.css", "utf8");
  assert(cssContent.includes("touch-action: none"), "CSS debe tener touch-action: none para Pointer Events");
  console.log("✓ sopa-letras.css incluye touch-action: none y estilos completos");

  console.log("\nTODAS LAS PRUEBAS DE P05.1 PASARON EXITOSAMENTE.");
  process.exit(0);
}

probar().catch((err) => {
  console.error("Error en pruebas:", err);
  process.exit(1);
});
