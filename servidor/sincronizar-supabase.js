// servidor/sincronizar-supabase.js · Migra o sincroniza todos los datos locales con Supabase

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import * as supabase from "./supabase.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_DATOS = path.resolve(__dirname, "../datos");
const DIR_CONFIG = path.join(DIR_DATOS, "config");
const DIR_MENSAJES = path.join(DIR_DATOS, "mensajes");

async function main() {
  if (!supabase.estaConfigurado()) {
    console.error("❌ Error: SUPABASE_URL y SUPABASE_KEY no están configurados en el archivo .env.");
    console.error("Configúralos antes de ejecutar la sincronización.");
    process.exit(1);
  }

  console.log("🚀 Iniciando sincronización con Supabase...");

  let totalColecciones = 0;

  // 1. Colecciones principales en datos/*.json
  try {
    const entradas = await fs.readdir(DIR_DATOS, { withFileTypes: true });
    for (const ent of entradas) {
      if (ent.isFile() && ent.name.endsWith(".json") && !ent.name.includes(".tmp.")) {
        const col = ent.name.replace(/\.json$/, "");
        const raw = await fs.readFile(path.join(DIR_DATOS, ent.name), "utf8");
        try {
          const datos = JSON.parse(raw);
          const ok = await supabase.guardarColeccion(col, datos);
          if (ok) {
            const cantidad = Array.isArray(datos) ? `${datos.length} registros` : "objeto";
            console.log(`  ✔ Colección "${col}" sincronizada (${cantidad})`);
            totalColecciones++;
          }
        } catch (e) {
          console.warn(`  ⚠ Error al procesar ${ent.name}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.warn("  ⚠ Error al leer carpeta de datos:", err.message);
  }

  // 2. Configuraciones en datos/config/*.json
  try {
    const entradasCfg = await fs.readdir(DIR_CONFIG, { withFileTypes: true });
    for (const ent of entradasCfg) {
      if (ent.isFile() && ent.name.endsWith(".json")) {
        const col = `config/${ent.name.replace(/\.json$/, "")}`;
        const raw = await fs.readFile(path.join(DIR_CONFIG, ent.name), "utf8");
        try {
          const datos = JSON.parse(raw);
          const ok = await supabase.guardarColeccion(col, datos);
          if (ok) {
            console.log(`  ✔ Configuración "${col}" sincronizada`);
            totalColecciones++;
          }
        } catch (e) {
          console.warn(`  ⚠ Error al procesar config ${ent.name}:`, e.message);
        }
      }
    }
  } catch {}

  // 3. Conversaciones en datos/mensajes/*.json
  try {
    const entradasMsg = await fs.readdir(DIR_MENSAJES, { withFileTypes: true });
    for (const ent of entradasMsg) {
      if (ent.isFile() && ent.name.endsWith(".json")) {
        const col = `mensajes/${ent.name.replace(/\.json$/, "")}`;
        const raw = await fs.readFile(path.join(DIR_MENSAJES, ent.name), "utf8");
        try {
          const datos = JSON.parse(raw);
          const ok = await supabase.guardarColeccion(col, datos);
          if (ok) {
            console.log(`  ✔ Mensajería "${col}" sincronizada (${datos.length} mensajes)`);
            totalColecciones++;
          }
        } catch {}
      }
    }
  } catch {}

  console.log(`\n🎉 Sincronización finalizada: ${totalColecciones} colecciones guardadas en Supabase permanentemente.`);
}

main().catch((err) => {
  console.error("Error fatal en sincronización:", err);
  process.exit(1);
});

