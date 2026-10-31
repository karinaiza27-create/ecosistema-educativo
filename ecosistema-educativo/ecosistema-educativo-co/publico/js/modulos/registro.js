// publico/js/modulos/registro.js · Controlador de registro de usuarios con validación en vivo

import { montarPlantilla } from "../nucleo/plantilla.js";
import { registrar, usuarioActual } from "../nucleo/sesion.js";
import { aviso } from "../nucleo/ui.js";

// Si ya tiene sesión activa, redirigir a inicio
if (usuarioActual()) {
  window.location.href = "/index.html";
}

await montarPlantilla({ titulo: "Registro de Estudiante", roles: ["publico"] });

const contenido = document.getElementById("contenido");

contenido.innerHTML = `
  <div class="auth-contenedor">
    <div class="tarjeta pila">
      <header class="pila pila--s" style="text-align: center;">
        <span class="insignia insignia--primario" style="align-self: center;">Nuevo Usuario</span>
        <h1>Crear Cuenta</h1>
        <p style="color: var(--texto-suave);">Regístrate para acceder a los cursos y tutorías del ecosistema educativo.</p>
      </header>

      <form id="formRegistro" class="pila" novalidate>
        <div class="campo" id="grupoNombre">
          <label for="regNombre">Nombres *</label>
          <input type="text" id="regNombre" name="nombre" placeholder="Ej. Ana Belén" autocomplete="given-name" required />
          <span class="campo__error oculto" id="errorNombre">Ingresa tus nombres.</span>
        </div>

        <div class="campo" id="grupoApellido">
          <label for="regApellido">Apellidos *</label>
          <input type="text" id="regApellido" name="apellido" placeholder="Ej. Morales Vega" autocomplete="family-name" required />
          <span class="campo__error oculto" id="errorApellido">Ingresa tus apellidos.</span>
        </div>

        <div class="campo" id="grupoCorreo">
          <label for="regCorreo">Correo electrónico institucional *</label>
          <input type="email" id="regCorreo" name="correo" placeholder="usuario@unemi.edu.ec" autocomplete="email" required />
          <span class="campo__error oculto" id="errorCorreo">Ingresa un correo electrónico válido.</span>
        </div>

        <div class="campo" id="grupoClave">
          <label for="regClave">Contraseña *</label>
          <input type="password" id="regClave" name="clave" placeholder="Mínimo 8 caracteres (letras y números)" autocomplete="new-password" required />
          <span class="campo__error oculto" id="errorClave">La contraseña debe tener al menos 8 caracteres y contener letras y números.</span>
        </div>

        <div class="campo" id="grupoConsentimiento">
          <label class="auth-checkbox">
            <input type="checkbox" id="regConsentimiento" name="consentimiento" required />
            <span>Acepto el <a href="/paginas/privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a> y tratamiento de mis datos personales según la LOPDP.</span>
          </label>
          <span class="campo__error oculto" id="errorConsentimiento">Debes aceptar el aviso de privacidad para continuar.</span>
        </div>

        <button type="submit" class="btn btn--primario" id="btnSubmit">
          Crear Cuenta y Comenzar
        </button>
      </form>

      <footer class="fila" style="justify-content: center; font-size: var(--tamano-s); color: var(--texto-suave);">
        <span>¿Ya tienes una cuenta?</span>
        <a href="/paginas/ingreso.html" style="font-weight: var(--peso-seminegrita);">Inicia sesión aquí</a>
      </footer>
    </div>
  </div>
`;

const form = document.getElementById("formRegistro");
const inputNombre = document.getElementById("regNombre");
const inputApellido = document.getElementById("regApellido");
const inputCorreo = document.getElementById("regCorreo");
const inputClave = document.getElementById("regClave");
const inputConsentimiento = document.getElementById("regConsentimiento");
const btnSubmit = document.getElementById("btnSubmit");

// Validadores individuales
function validarNombre() {
  const ok = inputNombre.value.trim().length > 0;
  const grupo = document.getElementById("grupoNombre");
  const err = document.getElementById("errorNombre");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

function validarApellido() {
  const ok = inputApellido.value.trim().length > 0;
  const grupo = document.getElementById("grupoApellido");
  const err = document.getElementById("errorApellido");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

function validarCorreo() {
  const val = inputCorreo.value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const grupo = document.getElementById("grupoCorreo");
  const err = document.getElementById("errorCorreo");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

function validarClave() {
  const val = inputClave.value;
  const ok = typeof val === "string" && val.length >= 8 && /[A-Za-z]/.test(val) && /\d/.test(val);
  const grupo = document.getElementById("grupoClave");
  const err = document.getElementById("errorClave");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

function validarConsentimiento() {
  const ok = inputConsentimiento.checked;
  const grupo = document.getElementById("grupoConsentimiento");
  const err = document.getElementById("errorConsentimiento");
  grupo.classList.toggle("campo--error", !ok);
  err.classList.toggle("oculto", ok);
  return ok;
}

// Eventos de validación en vivo
inputNombre.addEventListener("input", validarNombre);
inputApellido.addEventListener("input", validarApellido);
inputCorreo.addEventListener("input", validarCorreo);
inputClave.addEventListener("input", validarClave);
inputConsentimiento.addEventListener("change", validarConsentimiento);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const vNom = validarNombre();
  const vApe = validarApellido();
  const vCor = validarCorreo();
  const vCla = validarClave();
  const vCon = validarConsentimiento();

  if (!vNom || !vApe || !vCor || !vCla || !vCon) {
    aviso("Por favor corrige los campos señalados", "advertencia");
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Creando cuenta...";

  try {
    await registrar({
      nombre: inputNombre.value.trim(),
      apellido: inputApellido.value.trim(),
      correo: inputCorreo.value.trim().toLowerCase(),
      clave: inputClave.value,
      consentimiento: true
    });

    aviso("¡Cuenta creada con éxito! Bienvenido al ecosistema.", "exito");
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Error al registrar:", error);
    aviso(error.message || "Error al registrar usuario", "error");
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Crear Cuenta y Comenzar";
  }
});
