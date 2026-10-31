// publico/js/modulos/privacidad.js · Aviso de privacidad conforme a la LOPDP del Ecuador

import { montarPlantilla } from "../nucleo/plantilla.js";

await montarPlantilla({ titulo: "Aviso de Privacidad", roles: ["publico"] });

const contenido = document.getElementById("contenido");

contenido.innerHTML = `
  <article class="tarjeta privacidad-tarjeta pila">
    <header class="pila pila--s">
      <span class="insignia insignia--primario" style="align-self: flex-start;">Normativa Legal</span>
      <h1>Aviso de Privacidad y Tratamiento de Datos Personales</h1>
      <small style="color: var(--texto-suave);">Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) de la República del Ecuador.</small>
    </header>

    <div class="privacidad-seccion">
      <h2>1. Finalidad del Tratamiento</h2>
      <p>
        Los datos personales recopilados a través de esta plataforma tienen como exclusiva finalidad la gestión académica, autenticación de usuarios, registro del progreso en competencias digitales, personalización pedagógica y emisión de certificaciones en el <strong>Ecosistema Educativo Digital</strong>.
      </p>
    </div>

    <div class="privacidad-seccion">
      <h2>2. Datos Tratados</h2>
      <p>La plataforma recopila y almacena únicamente la siguiente información:</p>
      <ul style="padding-left: var(--espacio-l); margin-bottom: var(--espacio-m);">
        <li><strong>Identificación y contacto:</strong> Nombres, apellidos y dirección de correo electrónico institucional.</li>
        <li><strong>Actividad en la plataforma:</strong> Tiempos de conexión, intentos en actividades formativas, evaluaciones y eventos en la bitácora del sistema.</li>
      </ul>
    </div>

    <div class="privacidad-seccion">
      <h2>3. Derechos del Titular (LOPDP)</h2>
      <p>
        De acuerdo con la legislación ecuatoriana, todo titular de datos tiene derecho al <strong>acceso</strong>, <strong>rectificación</strong>, <strong>actualización</strong>, <strong>oposición</strong> y <strong>eliminación</strong> de su información personal almacenada en el sistema.
      </p>
    </div>

    <div class="privacidad-seccion">
      <h2>4. Canal de Contacto</h2>
      <p>
        Para ejercer tus derechos o resolver inquietudes sobre el tratamiento de tus datos personales, puedes contactar al delegado de protección de datos al correo institucional:
        <a href="mailto:privacidad@unemi.edu.ec">privacidad@unemi.edu.ec</a>.
      </p>
    </div>

    <div class="fila" style="margin-top: var(--espacio-m);">
      <a href="/paginas/registro.html" class="btn btn--primario">Volver al Registro</a>
      <a href="/index.html" class="btn btn--secundario">Ir al Inicio</a>
    </div>
  </article>
`;
