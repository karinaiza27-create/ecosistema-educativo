// servidor/crear-admin.js · Script CLI para registrar o actualizar un usuario con rol de administrador

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import * as almacen from "./almacen.js";

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("=== Crear Usuario Administrador ===");
    const nombre = (await rl.question("Nombre: ")).trim();
    const apellido = (await rl.question("Apellido: ")).trim();
    const correo = (await rl.question("Correo: ")).trim().toLowerCase();
    const clave = (await rl.question("Clave: ")).trim();

    if (!nombre || !apellido || !correo || !clave) {
      console.error("Error: Todos los campos son obligatorios.");
      process.exit(1);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      console.error("Error: Formato de correo electrónico inválido.");
      process.exit(1);
    }

    if (clave.length < 8 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) {
      console.error("Error: La clave debe tener al menos 8 caracteres y contener letras y números.");
      process.exit(1);
    }

    const usuarios = await almacen.leer("usuarios");
    const existente = usuarios.find((u) => u.correo && u.correo.toLowerCase() === correo);

    const claveHash = await bcrypt.hash(clave, 10);

    if (existente) {
      console.log(`El usuario con correo "${correo}" ya existe. Actualizando a rol admin...`);
      await almacen.actualizar("usuarios", existente.id, {
        nombre,
        apellido,
        claveHash,
        rol: "admin",
        activo: true
      });
      console.log(`✓ Administrador "${correo}" (${existente.id}) actualizado con éxito.`);
    } else {
      const nuevo = await almacen.agregar("usuarios", {
        nombre,
        apellido,
        correo,
        claveHash,
        rol: "admin",
        activo: true,
        foto: "",
        consentimiento: {
          aceptado: true,
          fecha: new Date().toISOString()
        }
      });
      console.log(`✓ Administrador creado con éxito con ID: ${nuevo.id}`);
    }
  } catch (error) {
    console.error("Error al crear administrador:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
