// servidor/semilla.js · Carga de datos de prueba iniciales en datos/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import * as almacen from "./almacen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_SEMILLA = path.resolve(__dirname, "../datos/semilla");
const DIR_DATOS = path.resolve(__dirname, "../datos");

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes("--forzar");

  if (forzar) {
    const rl = readline.createInterface({ input, output });
    const respuesta = await rl.question(
      "¿Estás seguro de sobrescribir los datos existentes con la semilla? (s/N): "
    );
    rl.close();

    if (!/^s(i)?$/i.test(respuesta.trim())) {
      console.log("Operación cancelada por el usuario.");
      process.exit(0);
    }
  }

  try {
    const entradas = await fs.readdir(DIR_SEMILLA);
    const archivosJson = entradas.filter((e) => e.endsWith(".json"));

    if (archivosJson.length === 0) {
      console.log("No se encontraron archivos de semilla en datos/semilla/");
      return;
    }

    console.log(`Cargando semillas (${forzar ? "modo forzado" : "solo colecciones inexistentes"})...`);

    // Clave unificada para usuarios de prueba
    const claveDemoHash = await bcrypt.hash("Demo12345", 10);

    for (const archivo of archivosJson) {
      const coleccion = archivo.replace(/\.json$/, "");
      const rutaDestino = path.join(DIR_DATOS, archivo);

      let existe = false;
      try {
        await fs.access(rutaDestino);
        existe = true;
      } catch {
        existe = false;
      }

      if (existe && !forzar) {
        console.log(`[omisión] ${archivo} ya existe en datos/.`);
        continue;
      }

      const contenidoRaw = await fs.readFile(path.join(DIR_SEMILLA, archivo), "utf8");
      let registros = JSON.parse(contenidoRaw);

      if (coleccion === "usuarios") {
        registros = registros.map((u) => ({
          ...u,
          claveHash: claveDemoHash
        }));
      }

      await almacen.escribir(coleccion, registros);
      console.log(`[copiado] ${archivo} -> datos/${archivo} (${registros.length} registros)`);
    }

    console.log("Carga de semilla completada con éxito.");
  } catch (error) {
    console.error("Error al ejecutar la semilla:", error);
    process.exit(1);
  }
}

main();
