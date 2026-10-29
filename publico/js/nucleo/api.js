// publico/js/nucleo/api.js · Cliente API para comunicación con el servidor

export async function llamar(metodo, ruta, cuerpo = null) {
  const headers = {};
  const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const opciones = {
    method: metodo.toUpperCase(),
    headers
  };

  if (cuerpo !== null && cuerpo !== undefined) {
    if (typeof FormData !== "undefined" && cuerpo instanceof FormData) {
      opciones.body = cuerpo;
    } else {
      headers["Content-Type"] = "application/json";
      opciones.body = JSON.stringify(cuerpo);
    }
  }

  const res = await fetch(ruta, opciones);

  if (res.status === 401) {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("usuario");
    }
    if (typeof window !== "undefined" && window.location) {
      const rutaActual = window.location.pathname || "";
      const enAutenticacion = rutaActual.endsWith("ingreso.html") || rutaActual.endsWith("registro.html");
      if (!enAutenticacion) {
        window.location.href = "/paginas/ingreso.html";
      }
    }
    throw new Error("No autorizado");
  }

  let respuestaJson = null;
  const texto = await res.text();
  if (texto) {
    try {
      respuestaJson = JSON.parse(texto);
    } catch {
      respuestaJson = texto;
    }
  }

  if (!res.ok) {
    const mensaje = (respuestaJson && typeof respuestaJson === "object" && respuestaJson.error)
      ? respuestaJson.error
      : `Error HTTP ${res.status}`;
    throw new Error(mensaje);
  }

  if (respuestaJson && typeof respuestaJson === "object" && respuestaJson.error) {
    throw new Error(respuestaJson.error);
  }

  return respuestaJson;
}

export async function listar(col, filtros = {}) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") {
      params.append(clave, valor);
    }
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return llamar("GET", `/api/${col}${query}`);
}

export async function obtener(col, id) {
  return llamar("GET", `/api/${col}/${encodeURIComponent(id)}`);
}

export async function crear(col, datos) {
  return llamar("POST", `/api/${col}`, datos);
}

export async function actualizar(col, id, cambios) {
  return llamar("PUT", `/api/${col}/${encodeURIComponent(id)}`, cambios);
}

export async function eliminar(col, id) {
  return llamar("DELETE", `/api/${col}/${encodeURIComponent(id)}`);
}

export async function subir(archivo) {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return llamar("POST", "/api/subidas", formData);
}

export async function ia(tarea, datos) {
  return llamar("POST", `/api/ia/${encodeURIComponent(tarea)}`, datos);
}

export default {
  llamar,
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  subir,
  ia
};
