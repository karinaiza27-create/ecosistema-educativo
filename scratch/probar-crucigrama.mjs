// scratch/probar-crucigrama.mjs · Pruebas unitarias de Crucigrama (P07.3)

import assert from "assert";
import fs from "fs/promises";

// Mock para entorno Node.js
globalThis.window = {
  location: { pathname: "/paginas/crucigrama.html", search: "" }
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
  console.log("Iniciando pruebas de Crucigrama (P07.3)...");

  // Import dinámico de crucigrama.js
  const { generarCrucigrama } = await import("../publico/js/modulos/crucigrama.js");

  // 1. Probar generarCrucigrama con un conjunto de palabras con letras comunes
  const palabrasPrueba = [
    { palabra: "PROGRAMACION", pista: "Arte de escribir código para computadoras" },
    { palabra: "ALGORITMO", pista: "Secuencia finita de instrucciones" },
    { palabra: "COMPILADOR", pista: "Traduce código fuente a binario" },
    { palabra: "MEMORIA", pista: "Almacenamiento de datos de acceso rápido" },
    { palabra: "VARIABLE", pista: "Espacio reservado con un identificador" },
    { palabra: "FUNCION", pista: "Bloque reutilizable de código" },
    { palabra: "MATRIZ", pista: "Arreglo bidimensional de elementos" },
    { palabra: "OBJETO", pista: "Instancia de una clase con atributos" },
    { palabra: "CLASE", pista: "Plantilla para crear objetos" },
    { palabra: "BUCLE", pista: "Estructura de repetición controlada" },
    { palabra: "CODIGO", pista: "Instrucciones escritas en un lenguaje" },
    { palabra: "LOGICA", pista: "Razonamiento estructurado" },
    { palabra: "RED", pista: "Conjunto de computadoras interconectadas" },
    { palabra: "DATO", pista: "Unidad mínima de información" },
    { palabra: "CPU", pista: "Unidad central de procesamiento" }
  ];

  const resultado = generarCrucigrama(palabrasPrueba);

  assert(resultado && typeof resultado === "object", "El resultado debe ser un objeto");
  assert(Number.isInteger(resultado.filas) && resultado.filas > 0, "filas debe ser un entero positivo");
  assert(Number.isInteger(resultado.columnas) && resultado.columnas > 0, "columnas debe ser un entero positivo");
  assert(Array.isArray(resultado.entradas), "entradas debe ser un array");
  assert(resultado.entradas.length >= 3, `Debe colocar al menos 3 palabras cruzadas (colocó ${resultado.entradas.length})`);

  console.log(`✓ generarCrucigrama generó ${resultado.entradas.length} entradas en una cuadrícula de ${resultado.filas}x${resultado.columnas}`);

  // Verificar estructura de cada entrada
  for (const ent of resultado.entradas) {
    assert(Number.isInteger(ent.numero) && ent.numero > 0, "Cada entrada debe tener un número positivo");
    assert(typeof ent.palabra === "string" && ent.palabra.length >= 3, "Palabra válida");
    assert(typeof ent.pista === "string", "Pista válida");
    assert(ent.fila >= 0 && ent.fila < resultado.filas, `Fila fuera de rango: ${ent.fila}`);
    assert(ent.col >= 0 && ent.col < resultado.columnas, `Col fuera de rango: ${ent.col}`);
    assert(ent.direccion === "horizontal" || ent.direccion === "vertical", "Dirección válida");

    if (ent.direccion === "horizontal") {
      assert(ent.col + ent.palabra.length <= resultado.columnas, "La palabra horizontal excede las columnas");
    } else {
      assert(ent.fila + ent.palabra.length <= resultado.filas, "La palabra vertical excede las filas");
    }
  }

  // Verificar que los cruces entre palabras tengan la misma letra
  const mapaLetras = new Map();
  for (const ent of resultado.entradas) {
    for (let k = 0; k < ent.palabra.length; k++) {
      const r = ent.direccion === "horizontal" ? ent.fila : ent.fila + k;
      const c = ent.direccion === "horizontal" ? ent.col + k : ent.col;
      const clave = `${r},${c}`;
      const letra = ent.palabra[k];

      if (mapaLetras.has(clave)) {
        assert.strictEqual(
          mapaLetras.get(clave),
          letra,
          `Conflicto en celda (${r},${c}): ${mapaLetras.get(clave)} vs ${letra}`
        );
      } else {
        mapaLetras.set(clave, letra);
      }
    }
  }
  console.log("✓ Todos los cruces de letras son 100% coincidentes y válidos");

  // 2. Verificar catalogo-actividades.js
  const catalogoContent = await fs.readFile("publico/js/nucleo/catalogo-actividades.js", "utf8");
  assert(catalogoContent.includes('id: "crucigrama"'), "catalogo debe tener crucigrama");
  assert(catalogoContent.includes('texto: "Crucigrama"'), "catalogo debe tener texto Crucigrama");
  assert(
    catalogoContent.includes('descripcion: "Completa las palabras con sus pistas"'),
    "catalogo debe tener la descripción solicitada"
  );
  assert(catalogoContent.includes('href: "/paginas/crucigrama.html"'), "catalogo debe enlazar a crucigrama.html");
  console.log("✓ catalogo-actividades.js verificado");

  // 3. Verificar crucigrama.js
  const jsContent = await fs.readFile("publico/js/modulos/crucigrama.js", "utf8");
  assert(jsContent.includes("obtenerTemaActividad()"), "debe usar obtenerTemaActividad");
  assert(jsContent.includes("generarCrucigrama"), "debe exportar generarCrucigrama");
  assert(jsContent.includes("mostrarRetro("), "debe llamar a mostrarRetro");
  assert(jsContent.includes("mostrarResumen("), "debe llamar a mostrarResumen");
  assert(jsContent.includes("registrarIntento("), "debe llamar a registrarIntento");
  assert(jsContent.includes('actividad: "crucigrama"'), "actividad debe ser crucigrama");
  assert(jsContent.includes("MAX_LETRAS_REVELADAS"), "debe limitar pistas a 3");
  assert(jsContent.includes("btnComprobar"), "debe tener botón comprobar");
  assert(jsContent.includes("btnRevelarLetra"), "debe tener botón revelar letra");
  assert(jsContent.includes("btnTerminar"), "debe tener botón terminar");
  console.log("✓ crucigrama.js implementa todas las reglas y contratos");

  // 4. Verificar crucigrama.css
  const cssContent = await fs.readFile("publico/css/modulos/crucigrama.css", "utf8");
  assert(cssContent.includes(".cruci-grilla"), "debe definir .cruci-grilla");
  assert(cssContent.includes(".cruci-celda"), "debe definir .cruci-celda");
  assert(cssContent.includes(".cruci-celda--correcta"), "debe definir estado correcto");
  assert(cssContent.includes(".cruci-celda--incorrecta"), "debe definir estado incorrecto");
  assert(cssContent.includes(".cruci-celda--revelada"), "debe definir estado revelada");
  console.log("✓ crucigrama.css verificado");

  console.log("\nTODAS LAS PRUEBAS DE P07.3 PASARON EXITOSAMENTE.");
  process.exit(0);
}

probar().catch((err) => {
  console.error("Error en pruebas:", err);
  process.exit(1);
});
