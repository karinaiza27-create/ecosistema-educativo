# Ecosistema Educativo Digital

Plataforma web educativa para el desarrollo de competencias digitales con gamificación, tutor IA y gestión académica.

## Requisitos

- **Node.js 20 LTS o superior**
- **npm** (incluido con Node.js)

## Instalación y Puesta en Marcha

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.ejemplo .env
   # En Windows PowerShell:
   Copy-Item .env.ejemplo .env
   ```

3. **Iniciar el servidor:**
   ```bash
   npm start
   ```

El servidor estará disponible en `http://localhost:3000`.

## Scripts disponibles

- `npm start`: Inicia el servidor Node.js en `servidor/server.js`.
- `npm run semilla`: Ejecuta la carga de datos iniciales (`servidor/semilla.js`).
- `npm run crear-admin`: Crea o restablece el usuario administrador (`servidor/crear-admin.js`).
