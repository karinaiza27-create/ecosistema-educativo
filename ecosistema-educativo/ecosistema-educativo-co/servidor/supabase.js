// servidor/supabase.js · Cliente REST nativo para persistencia permanente en Supabase

const obtenerConfig = () => ({
  url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/\/+$/, "") : "",
  key: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
});

export function estaConfigurado() {
  const { url, key } = obtenerConfig();
  return Boolean(url && key);
}

function cabeceras(extra = {}) {
  const { key } = obtenerConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

let advertenciaTablaMostrada = false;

export async function obtenerColeccion(col) {
  if (!estaConfigurado()) return null;
  const { url } = obtenerConfig();

  try {
    const res = await fetch(
      `${url}/rest/v1/ecosistema_colecciones?coleccion=eq.${encodeURIComponent(col)}&select=datos`,
      {
        method: "GET",
        headers: cabeceras({
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache"
        })
      }
    );

    if (res.status === 404 || res.status === 400) {
      const errTexto = await res.text();
      if (!advertenciaTablaMostrada && errTexto.includes("ecosistema_colecciones")) {
        console.warn("[Supabase] La tabla 'ecosistema_colecciones' no existe en Supabase.");
        console.warn(
          "[Supabase] Para activarla, ejecuta en el SQL Editor de Supabase:\n" +
          "CREATE TABLE IF NOT EXISTS ecosistema_colecciones (\n" +
          "  coleccion TEXT PRIMARY KEY,\n" +
          "  datos JSONB NOT NULL DEFAULT '[]'::jsonb,\n" +
          "  actualizado_en TIMESTAMPTZ DEFAULT now()\n" +
          ");\n" +
          "ALTER TABLE ecosistema_colecciones ENABLE ROW LEVEL SECURITY;\n" +
          "CREATE POLICY \"Acceso ecosistema\" ON ecosistema_colecciones FOR ALL USING (true) WITH CHECK (true);"
        );
        advertenciaTablaMostrada = true;
      }
      return null;
    }

    if (!res.ok) {
      console.warn(`[Supabase] Error al leer colección "${col}": HTTP ${res.status}`);
      return null;
    }

    const filas = await res.json();
    if (Array.isArray(filas) && filas.length > 0) {
      return filas[0].datos;
    }
    return null;
  } catch (err) {
    console.warn(`[Supabase] Falla de conexión al leer "${col}":`, err.message);
    return null;
  }
}

export async function guardarColeccion(col, datos) {
  if (!estaConfigurado()) return false;
  const { url } = obtenerConfig();

  try {
    const cuerpo = JSON.stringify({
      coleccion: col,
      datos,
      actualizado_en: new Date().toISOString()
    });

    const res = await fetch(`${url}/rest/v1/ecosistema_colecciones`, {
      method: "POST",
      headers: cabeceras({
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      }),
      body: cuerpo
    });

    if (!res.ok) {
      const errTexto = await res.text();
      console.warn(`[Supabase] Error al guardar "${col}": HTTP ${res.status} - ${errTexto}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[Supabase] Falla de conexión al guardar "${col}":`, err.message);
    return false;
  }
}

export async function eliminarColeccion(col) {
  if (!estaConfigurado()) return false;
  const { url } = obtenerConfig();

  try {
    const res = await fetch(
      `${url}/rest/v1/ecosistema_colecciones?coleccion=eq.${encodeURIComponent(col)}`,
      {
        method: "DELETE",
        headers: cabeceras()
      }
    );
    return res.ok;
  } catch (err) {
    console.warn(`[Supabase] Falla de conexión al eliminar "${col}":`, err.message);
    return false;
  }
}

export async function listarColecciones() {
  if (!estaConfigurado()) return [];
  const { url } = obtenerConfig();

  try {
    const res = await fetch(`${url}/rest/v1/ecosistema_colecciones?select=coleccion`, {
      method: "GET",
      headers: cabeceras({ Accept: "application/json" })
    });
    if (!res.ok) return [];
    const filas = await res.json();
    return Array.isArray(filas) ? filas.map((f) => f.coleccion) : [];
  } catch {
    return [];
  }
}

