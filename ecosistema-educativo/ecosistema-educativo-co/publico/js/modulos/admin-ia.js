// publico/js/modulos/admin-ia.js · Panel de configuración de IA y modelos para el administrador

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Configuración de IA", roles: ["admin"] });

const contenido = document.getElementById("contenido");

let listaModelos = [
  { id: "gemini-2.0-flash", nombre: "Gemini 2.0 Flash (Recomendado · Alta disponibilidad)", desc: "El modelo principal de Google para producción: ultra rápido y sin saturación." },
  { id: "gemini-2.0-flash-lite", nombre: "Gemini 2.0 Flash Lite (Anti-saturación)", desc: "Diseñado para latencia mínima y máxima tolerancia a picos de demanda." },
  { id: "gemini-1.5-flash", nombre: "Gemini 1.5 Flash (Estándar de producción)", desc: "Ampliamente probado con gran capacidad de contexto y disponibilidad constante." },
  { id: "gemini-1.5-flash-8b", nombre: "Gemini 1.5 Flash 8B (Ultra ligero)", desc: "Ideal para generación rápida con bajo consumo." },
  { id: "gemini-1.5-pro", nombre: "Gemini 1.5 Pro (Razonamiento profundo)", desc: "Para evaluaciones complejas que demandan máxima precisión." },
  { id: "gemini-3.8-flash", nombre: "Gemini 3.8 Flash (Experimental)", desc: "Versión preliminar sujeta a alta demanda temporal." },
  { id: "gemini-4-argon", nombre: "Gemini 4 Argon (Experimental)", desc: "Versión preliminar sujeta a alta demanda temporal." }
];

async function inicializar() {
  ui.cargando(true);
  try {
    const config = await api.llamar("GET", "/api/ia/config");
    try {
      const modelosData = await api.llamar("GET", "/api/ia/modelos");
      if (Array.isArray(modelosData?.modelos) && modelosData.modelos.length > 0) {
        listaModelos = modelosData.modelos;
      }
    } catch {}

    renderizar(config);
  } catch (err) {
    ui.aviso("Error al cargar configuración de IA: " + err.message, "error");
  } finally {
    ui.cargando(false);
  }
}

function renderizar(config) {
  const tieneClave = Boolean(config.tieneClave);
  const estadoClase = tieneClave ? "badge--exito" : "badge--neutro";
  const estadoTexto = tieneClave ? "✓ Clave configurada" : "⚠ Sin clave configurada (modo simulado)";
  const modeloActual = config.modelo || "gemini-2.0-flash";

  const tarjetasModelosHtml = listaModelos
    .map((m) => {
      const esSeleccionado = m.id === modeloActual;
      return `
        <button type="button" class="admin-ia__btn-modelo ${esSeleccionado ? "btn--primario" : ""}" data-modelo="${ui.escapar(m.id)}" style="text-align: left; padding: var(--espacio-s); border-radius: var(--radio-m); display: flex; flex-direction: column; gap: 2px;">
          <strong style="font-size: var(--tamano-s);">${ui.escapar(m.nombre || m.id)}</strong>
          <span style="font-size: 0.75rem; opacity: 0.85;">${ui.escapar(m.desc || m.descripcion || m.id)}</span>
        </button>
      `;
    })
    .join("");

  contenido.innerHTML = `
    <div class="admin-ia">
      <header class="fila" style="justify-content: space-between; align-items: center; border-bottom: 1px solid var(--borde); padding-bottom: var(--espacio-m);">
        <div>
          <h1 class="h2" style="margin-bottom: 4px;">Configuración de Inteligencia Artificial</h1>
          <p class="texto-secundario" style="margin: 0; font-size: var(--tamano-s);">
            Configura el proveedor, las credenciales de API y el modelo generativo de Google Gemini.
          </p>
        </div>
        <span class="badge ${estadoClase}">${estadoTexto}</span>
      </header>

      <div class="alerta alerta--aviso" style="background: rgba(245, 124, 0, 0.08); border-left: 4px solid #f57c00; padding: var(--espacio-m); border-radius: var(--radio-m);">
        <strong style="color: #b75900;">⚠️ Sobre el error «This model is currently experiencing high demand»</strong>
        <p style="margin: var(--espacio-xs) 0 0 0; font-size: var(--tamano-s); color: var(--texto-secundario); line-height: var(--linea-comoda);">
          Los modelos experimentales (como <code>gemini-3.8-flash</code> o <code>gemini-4-argon</code>) son versiones preliminares con cuotas reducidas que sufren saturación frecuente en los servidores globales de Google.
          Para garantizar disponibilidad constante y evitar interrupciones, recomendamos usar los modelos oficiales de producción: <strong>gemini-2.0-flash</strong> o <strong>gemini-2.0-flash-lite</strong>.
        </p>
      </div>

      <div class="admin-ia__panel">
        <div class="campo">
          <label for="selProveedorIA" class="etiqueta">Proveedor de IA:</label>
          <select id="selProveedorIA" class="select">
            <option value="gemini" selected>Google Gemini (Google AI Studio)</option>
          </select>
          <small class="texto-secundario">Utiliza la API REST v1beta de Google Generative Language.</small>
        </div>

        <div class="campo">
          <label for="txtClaveIA" class="etiqueta">API Key de Gemini:</label>
          <div class="fila" style="gap: var(--espacio-xs);">
            <input type="password" id="txtClaveIA" class="control" style="flex: 1;" placeholder="${config.claveEnmascarada ? `Actual: ${config.claveEnmascarada}` : "Pega tu clave (ej: AQ.Ab8RN...)"}">
            <button type="button" class="btn btn--secundario" id="btnToggleVisibilidadClave" title="Mostrar/Ocultar clave">👁️</button>
          </div>
          <div class="fila" style="justify-content: space-between; align-items: center; margin-top: 4px;">
            <small class="texto-secundario">
              Si dejas el campo vacío al guardar, se conservará la clave guardada anteriormente.
            </small>
            <button type="button" class="btn btn--texto btn--pequeno" id="btnConsultarModelosRemotos" style="font-size: var(--tamano-xs);">
              🔄 Consultar modelos activos en mi cuenta de Google AI
            </button>
          </div>
        </div>

        <div class="campo">
          <label for="txtModeloIA" class="etiqueta">Modelo de IA en uso:</label>
          <input type="text" id="txtModeloIA" class="control" value="${ui.escapar(modeloActual)}" placeholder="Ej: gemini-2.0-flash">
          <small class="texto-secundario">Puedes seleccionar uno de la lista inferior o escribir cualquier identificador de modelo.</small>
        </div>

        <div class="campo">
          <label class="etiqueta">Modelos con disponibilidad garantizada y recomendados:</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--espacio-s);" id="gridModelosDisponibles">
            ${tarjetasModelosHtml}
          </div>
        </div>

        <div id="resultadoPruebaIA" class="admin-ia__resultado-prueba"></div>

        <div class="fila" style="justify-content: space-between; margin-top: var(--espacio-m); gap: var(--espacio-s); flex-wrap: wrap;">
          <button type="button" class="btn btn--secundario" id="btnProbarIA">
            🧪 Probar conexión con Gemini
          </button>
          <button type="button" class="btn btn--primario" id="btnGuardarIA">
            💾 Guardar configuración
          </button>
        </div>
      </div>

      <div class="panel" style="background: var(--fondo); border: 1px solid var(--borde); border-radius: var(--radio-m); padding: var(--espacio-m);">
        <h3 class="h4" style="margin-top: 0;">📋 Guía de modelos de Google Gemini</h3>
        <table class="tabla" style="font-size: var(--tamano-s); width: 100%;">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Disponibilidad</th>
              <th>Velocidad</th>
              <th>Uso recomendado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>gemini-2.0-flash</code></td>
              <td><span class="badge badge--exito">Alta</span></td>
              <td>Muy rápida</td>
              <td><strong>Predeterminado recomendado</strong> para el Banco de preguntas y actividades.</td>
            </tr>
            <tr>
              <td><code>gemini-2.0-flash-lite</code></td>
              <td><span class="badge badge--exito">Máxima</span></td>
              <td>Ultra rápida</td>
              <td>Ideal ante picos de demanda o conexiones con cuota básica.</td>
            </tr>
            <tr>
              <td><code>gemini-1.5-flash</code></td>
              <td><span class="badge badge--exito">Alta</span></td>
              <td>Rápida</td>
              <td>Estabilidad de producción garantizada a largo plazo.</td>
            </tr>
            <tr>
              <td><code>gemini-1.5-pro</code></td>
              <td><span class="badge badge--exito">Alta</span></td>
              <td>Media</td>
              <td>Razonamiento complejo y análisis pedagógico exhaustivo.</td>
            </tr>
            <tr>
              <td><code>gemini-3.8-flash</code></td>
              <td><span class="badge badge--neutro">Variable</span></td>
              <td>Rápida</td>
              <td>Experimental. Puede devolver error 503 por alta demanda.</td>
            </tr>
            <tr>
              <td><code>gemini-4-argon</code></td>
              <td><span class="badge badge--neutro">Variable</span></td>
              <td>Rápida</td>
              <td>Experimental. Puede devolver error 503 por alta demanda.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  asociarEventos();
}

function asociarEventos() {
  const txtModelo = document.getElementById("txtModeloIA");
  const txtClave = document.getElementById("txtClaveIA");
  const btnToggle = document.getElementById("btnToggleVisibilidadClave");
  const resultadoPrueba = document.getElementById("resultadoPruebaIA");

  // Selección de modelo al hacer clic en cualquiera de las tarjetas
  document.querySelectorAll(".admin-ia__btn-modelo").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mod = btn.getAttribute("data-modelo");
      if (txtModelo && mod) {
        txtModelo.value = mod;
        document.querySelectorAll(".admin-ia__btn-modelo").forEach((b) => b.classList.remove("btn--primario"));
        btn.classList.add("btn--primario");
        txtModelo.focus();
      }
    });
  });

  // Mostrar / ocultar clave
  if (btnToggle && txtClave) {
    btnToggle.addEventListener("click", () => {
      if (txtClave.type === "password") {
        txtClave.type = "text";
        btnToggle.textContent = "🔒";
      } else {
        txtClave.type = "password";
        btnToggle.textContent = "👁️";
      }
    });
  }

  // Consultar modelos en vivo desde Google AI
  const btnConsultar = document.getElementById("btnConsultarModelosRemotos");
  if (btnConsultar) {
    btnConsultar.addEventListener("click", async () => {
      const clave = txtClave.value.trim();
      btnConsultar.disabled = true;
      btnConsultar.textContent = "Consultando Google AI...";
      try {
        const url = clave ? `/api/ia/modelos?clave=${encodeURIComponent(clave)}` : "/api/ia/modelos";
        const data = await api.llamar("GET", url);
        if (Array.isArray(data.modelos) && data.modelos.length > 0) {
          listaModelos = data.modelos;
          const configActual = {
            modelo: txtModelo.value.trim(),
            tieneClave: Boolean(clave || txtClave.placeholder.includes("Actual:"))
          };
          renderizar(configActual);
          ui.aviso(`Se cargaron ${data.modelos.length} modelos de Google AI.`, "exito");
        } else {
          ui.aviso("No se obtuvieron modelos adicionales.", "info");
        }
      } catch (err) {
        ui.aviso("Error al consultar modelos de Google AI: " + err.message, "error");
      } finally {
        btnConsultar.disabled = false;
        btnConsultar.textContent = "🔄 Consultar modelos activos en mi cuenta de Google AI";
      }
    });
  }

  // Probar conexión
  const btnProbar = document.getElementById("btnProbarIA");
  if (btnProbar) {
    btnProbar.addEventListener("click", async () => {
      const modelo = txtModelo.value.trim();
      const clave = txtClave.value.trim();

      resultadoPrueba.className = "admin-ia__resultado-prueba";
      resultadoPrueba.style.display = "none";
      btnProbar.disabled = true;
      btnProbar.textContent = "Probando conexión con Gemini...";

      try {
        const payload = {
          proveedor: "gemini",
          modelo
        };
        if (clave) {
          payload.clave = clave;
        }

        const res = await api.llamar("POST", "/api/ia/prueba", payload);
        resultadoPrueba.className = "admin-ia__resultado-prueba admin-ia__resultado-prueba--exito";
        resultadoPrueba.innerHTML = `<strong>✓ Conexión exitosa:</strong> El modelo <code>${ui.escapar(res.modelo || modelo)}</code> respondió de inmediato y está disponible.`;
        resultadoPrueba.style.display = "block";
        ui.aviso("Conexión con Gemini verificada correctamente", "exito");
      } catch (err) {
        resultadoPrueba.className = "admin-ia__resultado-prueba admin-ia__resultado-prueba--error";
        resultadoPrueba.innerHTML = `<strong>✕ Error al conectar con Gemini:</strong> ${ui.escapar(err.message)}`;
        resultadoPrueba.style.display = "block";
        ui.aviso("Fallo en la prueba de conexión: " + err.message, "error");
      } finally {
        btnProbar.disabled = false;
        btnProbar.textContent = "🧪 Probar conexión con Gemini";
      }
    });
  }

  // Guardar configuración
  const btnGuardar = document.getElementById("btnGuardarIA");
  if (btnGuardar) {
    btnGuardar.addEventListener("click", async () => {
      const proveedor = document.getElementById("selProveedorIA").value;
      const modelo = txtModelo.value.trim();
      const clave = txtClave.value.trim();

      if (!modelo) {
        ui.aviso("Debes ingresar o seleccionar un modelo.", "error");
        return;
      }

      ui.cargando(true);
      try {
        const res = await api.llamar("PUT", "/api/ia/config", {
          proveedor,
          modelo,
          clave
        });

        ui.aviso("Configuración de IA guardada con éxito", "exito");
        txtClave.value = "";
        renderizar(res);
      } catch (err) {
        ui.aviso("Error al guardar configuración: " + err.message, "error");
      } finally {
        ui.cargando(false);
      }
    });
  }
}

await inicializar();
