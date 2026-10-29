// publico/js/modulos/perfil.js · Edición de perfil, subida de foto y cambio de contraseña

import { montarPlantilla } from "../nucleo/plantilla.js";
import { usuarioActual } from "../nucleo/sesion.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Mi Perfil", roles: ["sesion"] });

const contenido = document.getElementById("contenido");

async function renderizar() {
  try {
    const usuario = await api.llamar("GET", "/api/auth/yo");
    let fotoUrlActual = usuario.foto || "";

    contenido.innerHTML = `
      <div class="perfil-layout pila">
        <header class="pila pila--s">
          <div class="fila" style="justify-content: space-between;">
            <h1>Mi Perfil</h1>
            <span class="insignia insignia--acento">${ui.escapar(usuario.rol)}</span>
          </div>
          <p style="color: var(--texto-suave);">Actualiza tu información personal, foto y contraseña.</p>
        </header>

        <!-- Sección 1: Datos Personales -->
        <section class="tarjeta pila">
          <h2 style="font-size: var(--tamano-xl);">Datos Personales</h2>

          <div class="perfil-avatar-bloque">
            <div id="avatarContainer">
              ${
                fotoUrlActual
                  ? `<img src="${ui.escapar(fotoUrlActual)}" alt="Foto de perfil" class="perfil-avatar-preview" id="avatarImg" />`
                  : `<div class="perfil-avatar-preview" id="avatarImg">👤</div>`
              }
            </div>
            <div class="pila pila--s">
              <label for="inputFoto" class="btn btn--secundario btn--pequeno" style="cursor: pointer;">
                Subir nueva foto
              </label>
              <input type="file" id="inputFoto" accept="image/jpeg,image/png,image/webp" style="display: none;" />
              <small style="color: var(--texto-suave);">Formatos: JPG, PNG, WEBP. Tamaño máximo: 2 MB.</small>
            </div>
          </div>

          <form id="formPerfil" class="pila" novalidate>
            <div class="grid-auto">
              <div class="campo" id="grupoNombre">
                <label for="perfilNombre">Nombres *</label>
                <input type="text" id="perfilNombre" value="${ui.escapar(usuario.nombre || "")}" required />
                <span class="campo__error oculto" id="errNombre">El nombre es obligatorio.</span>
              </div>

              <div class="campo" id="grupoApellido">
                <label for="perfilApellido">Apellidos *</label>
                <input type="text" id="perfilApellido" value="${ui.escapar(usuario.apellido || "")}" required />
                <span class="campo__error oculto" id="errApellido">El apellido es obligatorio.</span>
              </div>
            </div>

            <div class="campo">
              <label for="perfilCorreo">Correo institucional</label>
              <input type="email" id="perfilCorreo" value="${ui.escapar(usuario.correo || "")}" disabled />
              <small style="color: var(--texto-suave);">El correo está vinculado a tu cuenta y no puede cambiarse.</small>
            </div>

            <div class="fila">
              <button type="submit" class="btn btn--primario" id="btnGuardarPerfil">Guardar Datos</button>
            </div>
          </form>
        </section>

        <!-- Sección 2: Cambio de Contraseña -->
        <section class="tarjeta pila">
          <h2 style="font-size: var(--tamano-xl);">Cambiar Contraseña</h2>
          <form id="formClave" class="pila" novalidate>
            <div class="campo" id="grupoClaveActual">
              <label for="claveActual">Contraseña actual *</label>
              <input type="password" id="claveActual" autocomplete="current-password" required />
              <span class="campo__error oculto" id="errClaveActual">Ingresa tu contraseña actual.</span>
            </div>

            <div class="grid-auto">
              <div class="campo" id="grupoClaveNueva">
                <label for="claveNueva">Nueva contraseña *</label>
                <input type="password" id="claveNueva" placeholder="Mínimo 8 caracteres (letras y números)" autocomplete="new-password" required />
                <span class="campo__error oculto" id="errClaveNueva">Mínimo 8 caracteres con letras y números.</span>
              </div>

              <div class="campo" id="grupoClaveRepetir">
                <label for="claveRepetir">Repetir nueva contraseña *</label>
                <input type="password" id="claveRepetir" autocomplete="new-password" required />
                <span class="campo__error oculto" id="errClaveRepetir">Las contraseñas no coinciden.</span>
              </div>
            </div>

            <div class="fila">
              <button type="submit" class="btn btn--secundario" id="btnCambiarClave">Actualizar Contraseña</button>
            </div>
          </form>
        </section>

        <!-- Sección 3: Logros (se completa en Sprint 5) -->
        <section id="logros"></section>
      </div>
    `;

    // 1. Manejo de subida de foto
    const inputFoto = document.getElementById("inputFoto");
    const avatarContainer = document.getElementById("avatarContainer");

    inputFoto.addEventListener("change", async () => {
      const archivo = inputFoto.files[0];
      if (!archivo) return;

      if (archivo.size > 2 * 1024 * 1024) {
        ui.aviso("La imagen no debe superar los 2 MB", "advertencia");
        inputFoto.value = "";
        return;
      }

      try {
        ui.cargando(true);
        const res = await api.subir(archivo);
        fotoUrlActual = res.url;
        avatarContainer.innerHTML = `<img src="${ui.escapar(fotoUrlActual)}" alt="Foto de perfil" class="perfil-avatar-preview" id="avatarImg" />`;
        ui.aviso("Foto subida correctamente. Guarda los cambios para conservarla.", "info");
      } catch (err) {
        ui.aviso(err.message || "Error al subir la imagen", "error");
      } finally {
        ui.cargando(false);
      }
    });

    // 2. Guardar datos personales
    const formPerfil = document.getElementById("formPerfil");
    const inputNombre = document.getElementById("perfilNombre");
    const inputApellido = document.getElementById("perfilApellido");
    const btnGuardarPerfil = document.getElementById("btnGuardarPerfil");

    formPerfil.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = inputNombre.value.trim();
      const apellido = inputApellido.value.trim();

      const grupoNom = document.getElementById("grupoNombre");
      const errNom = document.getElementById("errNombre");
      const grupoApe = document.getElementById("grupoApellido");
      const errApe = document.getElementById("errApellido");

      const okNom = nombre.length > 0;
      const okApe = apellido.length > 0;

      grupoNom.classList.toggle("campo--error", !okNom);
      errNom.classList.toggle("oculto", okNom);
      grupoApe.classList.toggle("campo--error", !okApe);
      errApe.classList.toggle("oculto", okApe);

      if (!okNom || !okApe) return;

      btnGuardarPerfil.disabled = true;
      btnGuardarPerfil.textContent = "Guardando...";

      try {
        const actualizado = await api.llamar("PUT", "/api/auth/perfil", {
          nombre,
          apellido,
          foto: fotoUrlActual
        });

        // Actualizar sessionStorage
        const actual = usuarioActual() || {};
        sessionStorage.setItem("usuario", JSON.stringify({
          ...actual,
          nombre: actualizado.nombre,
          apellido: actualizado.apellido,
          foto: actualizado.foto
        }));

        // Actualizar texto en encabezado si está visible
        const nombreHeader = document.querySelector(".encabezado__usuario-nombre");
        if (nombreHeader) {
          nombreHeader.textContent = `${actualizado.nombre} ${actualizado.apellido}`;
        }

        ui.aviso("Perfil actualizado con éxito.", "exito");
      } catch (err) {
        ui.aviso(err.message || "Error al actualizar perfil", "error");
      } finally {
        btnGuardarPerfil.disabled = false;
        btnGuardarPerfil.textContent = "Guardar Datos";
      }
    });

    // 3. Cambiar clave
    const formClave = document.getElementById("formClave");
    const inputActual = document.getElementById("claveActual");
    const inputNueva = document.getElementById("claveNueva");
    const inputRepetir = document.getElementById("claveRepetir");
    const btnCambiarClave = document.getElementById("btnCambiarClave");

    formClave.addEventListener("submit", async (e) => {
      e.preventDefault();
      const actual = inputActual.value;
      const nueva = inputNueva.value;
      const repetir = inputRepetir.value;

      const grupoAct = document.getElementById("grupoClaveActual");
      const errAct = document.getElementById("errClaveActual");
      const grupoNue = document.getElementById("grupoClaveNueva");
      const errNue = document.getElementById("errClaveNueva");
      const grupoRep = document.getElementById("grupoClaveRepetir");
      const errRep = document.getElementById("errClaveRepetir");

      const okAct = actual.length > 0;
      const okNue = typeof nueva === "string" && nueva.length >= 8 && /[A-Za-z]/.test(nueva) && /\d/.test(nueva);
      const okRep = nueva === repetir;

      grupoAct.classList.toggle("campo--error", !okAct);
      errAct.classList.toggle("oculto", okAct);
      grupoNue.classList.toggle("campo--error", !okNue);
      errNue.classList.toggle("oculto", okNue);
      grupoRep.classList.toggle("campo--error", !okRep);
      errRep.classList.toggle("oculto", okRep);

      if (!okAct || !okNue || !okRep) return;

      btnCambiarClave.disabled = true;
      btnCambiarClave.textContent = "Actualizando...";

      try {
        await api.llamar("POST", "/api/auth/clave", { actual, nueva });
        ui.aviso("Contraseña actualizada con éxito.", "exito");
        formClave.reset();
      } catch (err) {
        ui.aviso(err.message || "Error al cambiar la contraseña", "error");
      } finally {
        btnCambiarClave.disabled = false;
        btnCambiarClave.textContent = "Actualizar Contraseña";
      }
    });

  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar el perfil:</strong> ${ui.escapar(error.message)}</div>
      </div>
    `;
  }
}

renderizar();
