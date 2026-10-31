// publico/js/modulos/admin-usuarios.js · Gestión de usuarios, roles, estado y contraseñas

import { montarPlantilla } from "../nucleo/plantilla.js";
import * as api from "../nucleo/api.js";
import * as ui from "../nucleo/ui.js";

await montarPlantilla({ titulo: "Administración de Usuarios", roles: ["admin"] });

const contenido = document.getElementById("contenido");

let usuarios = [];
let textoBusqueda = "";
let rolFiltro = "todos";

async function cargarUsuarios() {
  try {
    ui.cargando(true);
    usuarios = await api.listar("usuarios");
    renderizarInterfaz();
  } catch (error) {
    contenido.innerHTML = `
      <div class="alerta alerta--error">
        <div><strong>Error al cargar usuarios:</strong> ${ui.escapar(error.message)}</div>
      </div>
    `;
  } finally {
    ui.cargando(false);
  }
}

function renderizarInterfaz() {
  contenido.innerHTML = `
    <div class="admin-usuarios-layout pila">
      <header class="pila pila--s">
        <h1>Administración de Usuarios</h1>
        <p style="color: var(--texto-suave);">Gestiona los accesos, roles y contraseñas de los usuarios del sistema.</p>
      </header>

      <section class="admin-filtros" aria-label="Filtros de búsqueda">
        <div class="campo">
          <label for="buscarUsuario">Buscar por nombre, apellido o correo</label>
          <input type="search" id="buscarUsuario" placeholder="Ej. Juan Pérez o juan@ejemplo.com" value="${ui.escapar(textoBusqueda)}" />
        </div>

        <div class="campo">
          <label for="filtrarRol">Filtrar por rol</label>
          <select id="filtrarRol">
            <option value="todos" ${rolFiltro === "todos" ? "selected" : ""}>Todos los roles</option>
            <option value="estudiante" ${rolFiltro === "estudiante" ? "selected" : ""}>Estudiantes</option>
            <option value="docente" ${rolFiltro === "docente" ? "selected" : ""}>Docentes</option>
            <option value="admin" ${rolFiltro === "admin" ? "selected" : ""}>Administradores</option>
          </select>
        </div>
      </section>

      <div class="fila" style="justify-content: space-between; align-items: center;">
        <span class="admin-contador" id="contadorUsuarios"></span>
      </div>

      <div class="tabla-contenedor">
        <table class="tabla tabla-usuarios">
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col" style="text-align: center;">Activo</th>
              <th scope="col" style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody id="cuerpoTablaUsuarios">
          </tbody>
        </table>
      </div>
    </div>
  `;

  const inputBuscar = document.getElementById("buscarUsuario");
  const selectRol = document.getElementById("filtrarRol");

  inputBuscar.addEventListener("input", (e) => {
    textoBusqueda = e.target.value.trim().toLowerCase();
    actualizarTabla();
  });

  selectRol.addEventListener("change", (e) => {
    rolFiltro = e.target.value;
    actualizarTabla();
  });

  actualizarTabla();
}

function filtrarUsuarios() {
  return usuarios.filter((u) => {
    if (rolFiltro !== "todos" && u.rol !== rolFiltro) {
      return false;
    }

    if (textoBusqueda) {
      const nom = (u.nombre || "").toLowerCase();
      const ape = (u.apellido || "").toLowerCase();
      const correo = (u.correo || "").toLowerCase();
      const completo = `${nom} ${ape}`;

      const coincide =
        nom.includes(textoBusqueda) ||
        ape.includes(textoBusqueda) ||
        completo.includes(textoBusqueda) ||
        correo.includes(textoBusqueda);

      if (!coincide) return false;
    }

    return true;
  });
}

function actualizarTabla() {
  const tbody = document.getElementById("cuerpoTablaUsuarios");
  const contador = document.getElementById("contadorUsuarios");
  if (!tbody) return;

  const filtrados = filtrarUsuarios();
  if (contador) {
    contador.textContent = `Mostrando ${filtrados.length} de ${usuarios.length} usuarios`;
  }

  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: var(--espacio-l); color: var(--texto-suave);">
          No se encontraron usuarios que coincidan con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados
    .map((u) => {
      const esActivo = u.activo !== false;
      return `
        <tr data-id="${ui.escapar(u.id)}">
          <td>
            <strong>${ui.escapar(u.nombre || "")} ${ui.escapar(u.apellido || "")}</strong>
          </td>
          <td>${ui.escapar(u.correo || "")}</td>
          <td>
            <select class="selector-rol" data-id="${ui.escapar(u.id)}" aria-label="Cambiar rol de ${ui.escapar(u.nombre || "")}">
              <option value="estudiante" ${u.rol === "estudiante" ? "selected" : ""}>Estudiante</option>
              <option value="docente" ${u.rol === "docente" ? "selected" : ""}>Docente</option>
              <option value="admin" ${u.rol === "admin" ? "selected" : ""}>Administrador</option>
            </select>
          </td>
          <td style="text-align: center;">
            <input type="checkbox" class="casilla-activo" data-id="${ui.escapar(u.id)}" aria-label="Estado activo de ${ui.escapar(u.nombre || "")}" ${esActivo ? "checked" : ""} />
          </td>
          <td style="text-align: right;">
            <button type="button" class="btn btn--secundario btn--pequeno btn-restablecer" data-id="${ui.escapar(u.id)}">
              Restablecer clave
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Manejo de eventos en la tabla
  tbody.querySelectorAll(".selector-rol").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const u = usuarios.find((item) => item.id === id);
      if (!u) return;
      const rolAnterior = u.rol;
      const nuevoRol = e.target.value;

      try {
        ui.cargando(true);
        await api.actualizar("usuarios", id, { rol: nuevoRol });
        u.rol = nuevoRol;
        ui.aviso(`Rol de ${u.nombre} actualizado a ${nuevoRol}`, "exito");
      } catch (err) {
        e.target.value = rolAnterior;
        ui.aviso(err.message || "Error al actualizar rol", "error");
      } finally {
        ui.cargando(false);
      }
    });
  });

  tbody.querySelectorAll(".casilla-activo").forEach((chk) => {
    chk.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const u = usuarios.find((item) => item.id === id);
      if (!u) return;
      const activoAnterior = u.activo !== false;
      const nuevoActivo = e.target.checked;

      try {
        ui.cargando(true);
        await api.actualizar("usuarios", id, { activo: nuevoActivo });
        u.activo = nuevoActivo;
        ui.aviso(`Usuario ${u.nombre} marcado como ${nuevoActivo ? "activo" : "inactivo"}`, "exito");
      } catch (err) {
        e.target.checked = activoAnterior;
        ui.aviso(err.message || "Error al actualizar estado", "error");
      } finally {
        ui.cargando(false);
      }
    });
  });

  tbody.querySelectorAll(".btn-restablecer").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const u = usuarios.find((item) => item.id === id);
      if (!u) return;

      const confirmado = await ui.confirmar(
        `¿Deseas restablecer la contraseña de ${u.nombre} ${u.apellido}? Se generará una clave temporal.`
      );
      if (!confirmado) return;

      try {
        ui.cargando(true);
        const resp = await api.llamar("POST", `/api/admin/usuarios/${encodeURIComponent(id)}/restablecer`);
        const clave = resp.claveTemporal;

        const contenedorModal = document.createElement("div");
        contenedorModal.className = "pila";
        contenedorModal.innerHTML = `
          <p>Se ha generado una clave temporal para <strong>${ui.escapar(u.nombre)} ${ui.escapar(u.apellido)}</strong>:</p>
          <div class="clave-temporal-box">
            <code class="clave-temporal-codigo" id="textoClaveModal">${ui.escapar(clave)}</code>
            <button type="button" class="btn btn--primario btn--pequeno" id="btnCopiarModal">Copiar</button>
          </div>
          <small style="color: var(--texto-suave);">Comparte esta contraseña temporal con el usuario para que pueda acceder y cambiarla.</small>
        `;

        const btnCopiar = contenedorModal.querySelector("#btnCopiarModal");
        btnCopiar.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(clave);
            btnCopiar.textContent = "¡Copiada!";
            ui.aviso("Contraseña copiada al portapapeles", "exito");
            setTimeout(() => {
              btnCopiar.textContent = "Copiar";
            }, 2500);
          } catch {
            ui.aviso("No se pudo copiar automáticamente. Selecciónala manualmente.", "advertencia");
          }
        });

        await ui.modal({
          titulo: "Contraseña Restablecida",
          contenido: contenedorModal,
          acciones: [{ texto: "Aceptar", valor: true, primario: true }]
        });
      } catch (err) {
        ui.aviso(err.message || "Error al restablecer la contraseña", "error");
      } finally {
        ui.cargando(false);
      }
    });
  });
}

cargarUsuarios();
