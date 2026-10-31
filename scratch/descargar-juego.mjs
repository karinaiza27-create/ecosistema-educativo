import fs from "node:fs/promises";
import path from "node:path";

async function descargar() {
  const base = "https://cute-zabaione-72c640.netlify.app";
  const destino = path.resolve("publico/recursos/guardianes");
  await fs.mkdir(destino, { recursive: true });

  const resHtml = await fetch(base);
  let html = await resHtml.text();

  // Remove netlify hud script if present
  html = html.replace(/<script[^>]*hud\?variant=public[^>]*><\/script>/gi, "");

  await fs.writeFile(path.join(destino, "index.html"), html, "utf8");

  for (const archivo of ["style.css", "game.js"]) {
    const res = await fetch(`${base}/${archivo}`);
    if (res.ok) {
      const texto = await res.text();
      await fs.writeFile(path.join(destino, archivo), texto, "utf8");
      console.log(`Descargado ${archivo} (${texto.length} bytes)`);
    } else {
      console.log(`Error descargando ${archivo}: ${res.status}`);
    }
  }

  console.log("¡Descarga completa de Guardianes del Planeta!");
}

descargar().catch(console.error);
