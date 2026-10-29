// publico/js/modulos/ingreso.js · Controlador de inicio de sesión con validación en vivo

import { montarPlantilla } from "../nucleo/plantilla.js";
import { iniciar, usuarioActual } from "../nucleo/sesion.js";
import { aviso } from "../nucleo/ui.js";

// Si ya tiene sesión activa, redirigir a inicio
if (usuarioActual()) {
  window.location.href = "/index.html";
}

await montarPlantilla({ titulo: "Iniciar Sesión", roles: ["publico"] });

const contenido = document.getElementById("contenido");

contenido.innerHTML = `
  <div class="ingreso-contenedor">
    <div class="tarjeta pila">
      <header class="pila pila--s" style="text-align: center;">
        <span class="insignia insignia--primario" style="align-self: center;">Acceso</span>
        <h1>Iniciar Sesión</h1>
        <p style="color: var(--texto-suave);">Ingresa con tu correo institucional y contraseña.</p>
      </header>

      <form id="formIngreso" class="pila" novalidate>
        <div class="campo" id="grupoCorreo">
          <label for="ingresoCorreo">Correo institucional o usuario</label>
          <input
            type="text"
            id="ingresoCorreo"
            name="correo"
            placeholder="admin@demo.ec o admin"
            autocomplete="username"
            required
          />
          <span class="campo__error oculto" id="errorCorreo">Ingresa un correo o usuario válido.</span>
        </div>

        <div class="campo" id="grupoClave">
          <label for="ingresoClave">Contraseña</label>
          <input
            type="password"
            id="ingresoClave"
            name="clave"
            placeholder="Tu contraseña"
            autocomplete="current-password"
            required
          />
          <span class="campo__error oculto" id="errorClave">Ingresa tu contraseña.</span>
        </div>

        <button type="submit" class="btn btn--primario" id="btnSubmit">
          Ingresar al Sistema
        </button>
      </form>

      <footer class="fila" style="justify-content: center; font-size: var(--tamano-s); color: var(--texto-suave);">
        <span>¿No tienes una cuenta aún?</span>
        <a href="/paginas/registro.html" style="font-weight: var(--peso-seminegrita);">Regístrate aquí</a>
      </footer>
    </div>
  </div>
`;

const form = document.getElementById("formIngreso");
const inputCorreo = document.getElementById("ingresoCorreo");
const inputClave = document.getElementById("ingresoClave");
const btnSubmit = document.getElementById("btnSubmit");

function validarCorreo() {
  const val = inputCorreo.value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^[a-zA-Z0-9_.-]+$/.test(val);
  const grupo = document.getElementById("grupoCorreo");
  const err = document.getElementById("errorCorreo");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

function validarClave() {
  const val = inputClave.value;
  const ok = Boolean(val && val.length > 0);
  const grupo = document.getElementById("grupoClave");
  const err = document.getElementById("errorClave");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

inputCorreo.addEventListener("input", validarCorreo);
inputClave.addEventListener("input", validarClave);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const vCor = validarCorreo();
  const vCla = validarClave();

  if (!vCor || !vCla) {
    aviso("Completa tus credenciales de acceso", "advertencia");
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Verificando...";

  try {
    let entrada = inputCorreo.value.trim().toLowerCase();
    if (!entrada.includes("@")) {
      entrada = `${entrada}@demo.ec`;
    }
    await iniciar(entrada, inputClave.value);
    aviso("Sesión iniciada con éxito.", "exito");
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    aviso(error.message || "Correo o contraseña incorrectos", "error");
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Ingresar al Sistema";
  }
});
