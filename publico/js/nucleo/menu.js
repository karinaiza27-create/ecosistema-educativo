// publico/js/nucleo/menu.js · Configuración de elementos del menú de navegación

export const MENU = [
  { texto: "Inicio", href: "/index.html", roles: ["publico"] },
  { texto: "Noticias", href: "/paginas/noticias.html", roles: ["sesion"] },
  { texto: "Actividades", href: "/paginas/actividades.html", roles: ["estudiante", "docente"] },
  { texto: "Canciones", href: "/paginas/canciones.html", roles: ["sesion"] },
  { texto: "Mis asignaturas", href: "/paginas/asignaturas.html", roles: ["estudiante", "docente"] },
  { texto: "Agenda", href: "/paginas/agenda.html", roles: ["sesion"] },
  { texto: "Mensajes", href: "/paginas/mensajes.html", roles: ["sesion"] },
  { texto: "Mi perfil", href: "/paginas/perfil.html", roles: ["sesion"] },
  { texto: "Contenidos", href: "/paginas/editor-contenidos.html", roles: ["docente", "admin"] },
  { texto: "Banco de preguntas", href: "/paginas/banco-preguntas.html", roles: ["docente", "admin"] },
  { texto: "Usuarios", href: "/paginas/admin-usuarios.html", roles: ["admin"] },
  { texto: "Asignaturas", href: "/paginas/admin-asignaturas.html", roles: ["admin"] },
  { texto: "Distributivo", href: "/paginas/distributivo.html", roles: ["admin"] },
  { texto: "Configuración IA", href: "/paginas/admin-ia.html", roles: ["admin"] }
];

export default MENU;
