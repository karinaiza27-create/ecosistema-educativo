import { Router } from "express";

const router = Router();

// Proxy para recursos interactivos de Canva que bloquean iframes con SAMEORIGIN
router.get("/proxy/canva-site", async (req, res) => {
  try {
    const targetUrl = "https://reciclaje-y-manejo-adecuado-de-residuos.my.canva.site/";
    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      return res.status(resp.status).send("Error al obtener el recurso de Canva");
    }

    let html = await resp.text();

    // Eliminar base relativa y reemplazar con la URL absoluta de Canva
    html = html.replace(/<base href=["']\/["']\s*\/?>/i, `<base href="${targetUrl}">`);

    // Inyectar script para asegurar que enlaces internos abran correctamente
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");

    res.send(html);
  } catch (error) {
    console.error("Error en proxy Canva:", error);
    res.status(500).send("No se pudo cargar el recurso interactivo.");
  }
});

export default router;
