/**
 * ===================================================================
 * GUARDIANES DEL PLANETA: ECOSISTEMA EDUCATIVO DIGITAL INTELIGENTE
 * Misión Reciclaje - Motor del Juego y Lógica Interactiva
 * ===================================================================
 */

// BASE DE DATOS PEDAGÓGICA DEL JUEGO
const GAME_DATA = {
  // NIVEL 1 — RADAR AMBIENTAL (4 residuos, 20 puntos máx, 5 pts c/u)
  level1: {
    title: "Nivel 1: Radar Ambiental",
    badgeTitle: "Observador Verde",
    description: "Reconoce e identifica la naturaleza de cada residuo.",
    maxScore: 20,
    items: [
      {
        id: "l1_item1",
        name: "Cáscara de banana",
        emoji: "🍌",
        desc: "Resto vegetal tras el consumo en el refrigerio universitario.",
        correctType: "organico",
        hint: "¿Qué ocurre naturalmente con los restos de frutas cuando se descomponen en el suelo?",
        hints: [
          "¿Qué ocurre naturalmente con los restos de frutas cuando se descomponen en el suelo?",
          "Observa que se trata de un resto de alimento vegetal fresco. ¿Qué categoría aprovecha la descomposición biológica?",
          "¿Este residuo vegetal podría reintegrarse a procesos naturales para nutrir los jardines del campus?",
          "Piensa en cómo se gestionan las sobras de comida en una huerta o compostera universitaria.",
          "¿Contiene sustancias químicas sintéticas o es biomasa pura que los microorganismos pueden degradar sin contaminar?"
        ],
        explanation: "La cáscara de banana es un residuo orgánico biodegradable; reintegrarla mediante compostaje enriquece los suelos del campus.",
        concept: "Biodegradabilidad y fracción orgánica"
      },
      {
        id: "l1_item2",
        name: "Hojas secas",
        emoji: "🍂",
        desc: "Hojas caídas recolectadas en las áreas verdes del campus.",
        correctType: "organico",
        hint: "Provienen directamente de los árboles y zonas verdes del campus. ¿Son de origen natural o artificial?",
        hints: [
          "Provienen directamente de los árboles y zonas verdes del campus. ¿Son de origen natural o artificial?",
          "Aunque estén secas, ¿siguen siendo materia vegetal biodegradable que puede transformarse en abono?",
          "En la naturaleza, las hojas caídas forman el mantillo del suelo. ¿En qué contenedor deben ir para aprovechar ese ciclo?",
          "Compara las hojas con un plástico o metal: ¿necesitan procesos industriales para fundirse o se descomponen con el tiempo y la humedad?",
          "Piensa si este material de jardinería es un desecho inerte o biomasa vegetal que alimenta a los microorganismos de la tierra."
        ],
        explanation: "Las hojas secas son biomasa vegetal orgánica. Son excelentes para cobertura de suelo (mulching) o compostaje.",
        concept: "Biomasa vegetal y ciclo natural"
      },
      {
        id: "l1_item3",
        name: "Lata de aluminio limpia",
        emoji: "🥫",
        desc: "Envase de bebida vacío, enjuagado y sin restos de líquido.",
        correctType: "reciclable",
        hint: "Es un envase metálico inorgánico y limpio. ¿Qué ventaja ofrece este material al fundirse en una industria?",
        hints: [
          "Es un envase metálico inorgánico y limpio. ¿Qué ventaja ofrece este material al fundirse en una industria?",
          "El aluminio puede reprocesarse infinitas veces sin perder sus propiedades. ¿En qué circuito de aprovechamiento encaja?",
          "No proviene de un ser vivo ni se pudre de forma biológica, pero tiene un gran valor si se mantiene seco y limpio. ¿Dónde debe disponerse?",
          "La fabricación de aluminio nuevo consume enorme energía; reprocesar latas limpias ahorra hasta un 95%. ¿Qué contenedor promueve ese ahorro?",
          "¿Este envase pertenece a los residuos que se degradan en la tierra o a los materiales secos que se reintegran a la cadena productiva?"
        ],
        explanation: "El aluminio limpio es un material inorgánico altamente reciclable; reciclarlo ahorra hasta un 95% de la energía necesaria para producir aluminio primario.",
        concept: "Metales y economía circular"
      },
      {
        id: "l1_item4",
        name: "Batería usada",
        emoji: "🔋",
        desc: "Pila cilíndrica de linterna agotada.",
        correctType: "especial",
        hint: "Alberga en su interior componentes químicos y metales pesados. ¿Qué pasaría si se rompe y filtra sustancias en un vertedero común?",
        hints: [
          "Alberga en su interior componentes químicos y metales pesados. ¿Qué pasaría si se rompe y filtra sustancias en un vertedero común?",
          "No es un envase que pueda fundirse como el plástico, ni se degrada biológicamente. ¿Qué tratamiento preventivo de riesgo exige?",
          "Las pilas y acumuladores pueden contaminar miles de litros de agua subterránea. ¿Requieren un canal ordinario o un depósito especializado?",
          "Reflexiona sobre los riesgos de toxicidad y lixiviación de metales pesados. ¿Por qué existen urnas o recipientes exclusivos para este material?",
          "Piensa en la normativa ambiental: ¿puede un residuo con cadmio, plomo o litio mezclarse con la basura cotidiana del campus?"
        ],
        explanation: "Las baterías usadas son residuos de manejo especial o peligrosos. Requieren puntos seguros de recolección para evitar la lixiviación de metales pesados.",
        concept: "Residuos peligrosos y manejo especial"
      }
    ],
    options: [
      { type: "organico", label: "🟢 Residuo Orgánico", emoji: "🌱" },
      { type: "reciclable", label: "🔵 Residuo Reciclable", emoji: "♻️" },
      { type: "especial", label: "🟠 Manejo Especial", emoji: "⚠️" }
    ]
  },

  // NIVEL 2 — ESTACIÓN DE SEPARACIÓN (DRAG & DROP SECUENCIAL: 6 residuos uno por uno, 30 puntos máx, 5 pts c/u)
  level2: {
    title: "Nivel 2: Estación de Separación",
    badgeTitle: "Clasificador Consciente",
    description: "Arrastra este residuo hacia su contenedor correspondiente.",
    maxScore: 30,
    items: [
      {
        id: "l2_item1",
        name: "Restos de fruta",
        emoji: "🍎",
        desc: "Componente orgánico generado en la cafetería y áreas comunes.",
        correctType: "organico",
        hint: "¿Qué tipo de residuos genera la cafetería que pueden aprovecharse en una compostera universitaria?",
        hints: [
          "¿Qué tipo de residuos genera la cafetería que pueden aprovecharse en una compostera universitaria?",
          "Observa su contenido de humedad y nutrientes naturales. ¿Qué contenedor previene malos olores y genera abono orgánico?",
          "Si se mezcla con papeles limpios, arruina la celulosa con su líquido. ¿Hacia qué contenedor específico debe separarse lo húmedo de origen alimentario?",
          "Los microorganismos descomponen fácilmente este material en presencia de oxígeno. ¿A qué fracción corresponde?",
          "¿Pertenecen a los materiales inorgánicos secos o a la fracción biodegradable de los refrigerios del campus?"
        ],
        explanation: "Los restos de fruta corresponden al contenedor de residuos orgánicos para evitar fermentaciones anaeróbicas y generar compost.",
        concept: "Separación de residuos de alimentos"
      },
      {
        id: "l2_item2",
        name: "Restos de poda",
        emoji: "🌿",
        desc: "Hojas, ramas y cortes de césped del mantenimiento de áreas verdes.",
        correctType: "organico",
        hint: "Son ramas, cortes de césped y tallos generados por el mantenimiento del campus. ¿Qué origen biológico tienen?",
        hints: [
          "Son ramas, cortes de césped y tallos generados por el mantenimiento del campus. ¿Qué origen biológico tienen?",
          "Al triturarse, estos cortes verdes y secos sirven para proteger la tierra de los jardines. ¿En qué contenedor deben reunirse?",
          "¿Son materiales industriales fabricados o restos vegetales que forman parte del ciclo de nutrientes del suelo?",
          "Piensa en el volumen que ocupan en el campus: ¿conviene enviarlos a un relleno sanitario o destinarlos a enriquecer áreas verdes?",
          "Compara la poda con residuos plásticos o electrónicos: ¿puede degradarse naturalmente en compostaje sin liberar contaminantes tóxicos?"
        ],
        explanation: "La poda es residuo orgánico de jardinería; triturada sirve para enriquecer suelos y alimentar plantas del campus.",
        concept: "Residuos de jardinería y áreas verdes"
      },
      {
        id: "l2_item3",
        name: "Papel",
        emoji: "📄",
        desc: "Hojas impresas de apuntes y documentos limpios y secos.",
        correctType: "reciclable",
        hint: "Son apuntes y fotocopias secas sin restos de grasa ni líquidos. ¿Qué industria puede valorizar sus fibras de celulosa?",
        hints: [
          "Son apuntes y fotocopias secas sin restos de grasa ni líquidos. ¿Qué industria puede valorizar sus fibras de celulosa?",
          "Cada tonelada recuperada de este material limpio evita la tala de árboles y reduce el consumo de agua. ¿A qué contenedor debe ir?",
          "La clave de este material es mantenerlo seco y separado de restos de alimentos. ¿En qué categoría de aprovechamiento entra?",
          "Si estuviera sucio de comida no serviría, pero al estar limpio puede convertirse en cuadernos o cartón nuevo. ¿Cuál es su destino?",
          "¿Este residuo es de manejo peligroso o es un material inorgánico aprovechable en la economía circular?"
        ],
        explanation: "El papel seco y limpio pertenece al contenedor reciclable (blanco/azul); cada tonelada reciclada salva aproximadamente 17 árboles.",
        concept: "Fibras de papel y valorización"
      },
      {
        id: "l2_item4",
        name: "Botella PET limpia",
        emoji: "🍾",
        desc: "Envase plástico transparente vacío, enjuagado y seco.",
        correctType: "reciclable",
        hint: "Es un envase plástico transparente, enjuagado y libre de líquidos. ¿Qué contenedor recibe plásticos listos para reprocesar?",
        hints: [
          "Es un envase plástico transparente, enjuagado y libre de líquidos. ¿Qué contenedor recibe plásticos listos para reprocesar?",
          "Si se compacta y se entrega limpio, este polímero puede convertirse en nuevas botellas o fibras textiles. ¿Dónde debes soltarlo?",
          "No es biodegradable en el suelo y tardaría siglos en desaparecer, pero su valor en la industria es muy alto. ¿Qué debemos hacer con él?",
          "Observa el triángulo de reciclaje en la base de la botella. ¿Qué contenedor del campus está destinado a los envases aprovechables?",
          "¿Este material debe terminar descompuesto en abono o transformado mecánicamente en nuevos objetos útiles?"
        ],
        explanation: "Las botellas PET limpias van al contenedor reciclable; se transforman en nuevas botellas, envases o fibras textiles.",
        concept: "Plásticos aprovechables (PET)"
      },
      {
        id: "l2_item5",
        name: "Pila de botón",
        emoji: "🔘",
        desc: "Micropila de reloj o calculadora agotada con metales pesados.",
        correctType: "especial",
        hint: "Aunque mide pocos milímetros, concentra metales muy tóxicos como mercurio o litio. ¿Qué contenedor seguro evita su filtración?",
        hints: [
          "Aunque mide pocos milímetros, concentra metales muy tóxicos como mercurio o litio. ¿Qué contenedor seguro evita su filtración?",
          "Jamás debe arrojarse a los contenedores comunes de pasillo. ¿Dónde se entregan los elementos peligrosos de laboratorio y oficina?",
          "¿Una micropila puede mezclarse con papeles o botellas sin representar un peligro químico para los recicladores?",
          "Piensa en la gestión diferenciada de sustancias peligrosas: ¿qué categoría se encarga de aislar estos componentes de alto riesgo?",
          "Una sola de estas pilas puede contaminar miles de litros de agua si se desecha incorrectamente. ¿Qué contenedor exige su manejo?"
        ],
        explanation: "Las pilas de botón son residuos de manejo especial; una sola puede contaminar miles de litros de agua. Requieren recolección diferenciada.",
        concept: "Toxicidad de micropilas y confinamiento"
      },
      {
        id: "l2_item6",
        name: "Cargador dañado",
        emoji: "🔌",
        desc: "Accesorio de carga electrónica averiado e inservible (RAEE).",
        correctType: "especial",
        hint: "Tiene circuitos impresos, transformadores y cables de cobre. ¿Qué sigla técnica (RAEE) describe a estos aparatos?",
        hints: [
          "Tiene circuitos impresos, transformadores y cables de cobre. ¿Qué sigla técnica (RAEE) describe a estos aparatos?",
          "Aunque su carcasa parezca plástico, en su interior hay componentes electrónicos complejos. ¿Qué punto diferenciado requiere?",
          "El cobre y los metales internos requieren plantas autorizadas de desmantelamiento. ¿Pertenece al contenedor de botellas o a manejo especial?",
          "¿Puede un aparato electrónico roto arrojarse a la papelera común sin desperdiciar metales valiosos y generar riesgos eléctricos?",
          "Los accesorios electrónicos inservibles no van a los contenedores ordinarios. ¿Qué categoría del campus los gestiona de forma segura?"
        ],
        explanation: "Los cargadores dañados son RAEE de manejo especial; requieren desmontaje en plantas autorizadas para recuperar cobre y tratar aislantes.",
        concept: "Gestión de RAEE (Electrónicos)"
      }
    ],
    zones: [
      { type: "organico", label: "Residuo Orgánico", emoji: "🌱", desc: "Comida, frutas, poda y materia biodegradable." },
      { type: "reciclable", label: "Residuo Reciclable", emoji: "♻️", desc: "Papel, cartón, botellas PET y latas limpias." },
      { type: "especial", label: "Manejo Especial", emoji: "⚠️", desc: "Pilas, baterías, cargadores y electrónicos (RAEE)." }
    ]
  },

  // NIVEL 3 — RESCATE DEL CAMPUS (5 casos reales, 50 puntos máx, 10 pts c/u)
  level3: {
    title: "Nivel 3: Rescate del Campus",
    badgeTitle: "Protector del Campus",
    description: "Toma decisiones acertadas ante situaciones complejas en el campus.",
    maxScore: 50,
    items: [
      {
        id: "l3_case1",
        name: "CASO 1 — CAFETERÍA",
        emoji: "☕",
        desc: "En una mesa de la cafetería encuentras cáscaras de fruta mezcladas junto a botellas PET limpias.",
        options: [
          { id: "A", text: "Separar las cáscaras como orgánico y las botellas como reciclable.", correct: true },
          { id: "B", text: "Arrojar todo junto a la basura común para desocupar la mesa con rapidez.", correct: false },
          { id: "C", text: "Poner todo en el contenedor reciclable porque el plástico protegerá la comida.", correct: false }
        ],
        hint: "La regla fundamental del reciclaje es evitar que la humedad de los alimentos arruine los materiales reciclables secos. ¿Cómo debes actuar?",
        hints: [
          "La regla fundamental del reciclaje es evitar que la humedad de los alimentos arruine los materiales reciclables secos. ¿Cómo debes actuar?",
          "Si colocas todo en una sola bolsa, el líquido y la grasa de la fruta anulan la posibilidad de reciclar el plástico. ¿Qué separación previa es necesaria?",
          "¿Es correcto desechar todo junto por prisa, o cada uno de estos dos materiales tiene un destino ecológico completamente opuesto?",
          "Las cáscaras pueden ir a compostaje y las botellas a reciclaje, pero solo si no están contaminadas entre sí. ¿Cuál decisión preserva a ambos?",
          "Piensa en la prevención de la contaminación cruzada: ¿qué acción garantiza que ambos residuos mantengan su valor?"
        ],
        explanation: "Separar las cáscaras como orgánico y las botellas como reciclable previene la contaminación cruzada y permite valorizar ambos materiales.",
        concept: "Prevención de contaminación cruzada"
      },
      {
        id: "l3_case2",
        name: "CASO 2 — BIBLIOTECA",
        emoji: "📚",
        desc: "Al terminar de estudiar en la biblioteca encuentras una batería agotada olvidada sobre el escritorio.",
        options: [
          { id: "A", text: "Tirarla a la papelera del escritorio para que el personal de aseo la clasifique.", correct: false },
          { id: "B", text: "Entregarla en un punto autorizado o al responsable de residuos especiales.", correct: true },
          { id: "C", text: "Envolverla en papel reciclable y dejarla en el contenedor de botellas plásticas.", correct: false }
        ],
        hint: "Una batería olvidada contiene reactivos químicos peligrosos. ¿La papelera común de escritorio está diseñada para contener derrames tóxicos?",
        hints: [
          "Una batería olvidada contiene reactivos químicos peligrosos. ¿La papelera común de escritorio está diseñada para contener derrames tóxicos?",
          "El personal de limpieza de oficinas no cuenta con equipos para tratar residuos químicos peligrosos. ¿A quién o a dónde debe entregarse?",
          "¿Envolver un elemento peligroso en papel o plástico elimina su toxicidad o simplemente oculta el riesgo?",
          "Los residuos peligrosos del campus cuentan con protocolos y puntos específicos de recolección. ¿Qué canal seguro debes buscar?",
          "Reflexiona sobre la responsabilidad compartida: dejar una pila en la papelera común traslada un riesgo ambiental al vertedero. ¿Cómo lo evitas?"
        ],
        explanation: "Entregarla en un punto autorizado o al responsable de residuos especiales del campus garantiza su confinamiento seguro y neutralización.",
        concept: "Canales autorizados para residuos peligrosos"
      },
      {
        id: "l3_case3",
        name: "CASO 3 — PATIO CENTRAL",
        emoji: "🌳",
        desc: "En una banca del patio hay hojas de papel, latas limpias y restos de comida de un almuerzo.",
        options: [
          { id: "A", text: "Separar papel y latas de los restos de comida para evitar contaminar los reciclables.", correct: true },
          { id: "B", text: "Tirar todo al contenedor orgánico porque el contacto con la comida lo convierte todo en abono.", correct: false },
          { id: "C", text: "Introducir los restos de comida dentro de las latas y tirar todo al cesto verde.", correct: false }
        ],
        hint: "El papel absorbe líquidos y grasas rápidamente, lo que destruye sus fibras de celulosa para el reciclaje. ¿Qué separación es indispensable?",
        hints: [
          "El papel absorbe líquidos y grasas rápidamente, lo que destruye sus fibras de celulosa para el reciclaje. ¿Qué separación es indispensable?",
          "Meter comida dentro de las latas o juntarla con el papel hace inviable la recolección diferenciada. ¿Qué principio de limpieza debes aplicar?",
          "¿Toda la mezcla se vuelve abono por el simple hecho de tocar comida, o los metales y plásticos dañan el compost?",
          "Para salvar el valor del aluminio y del papel seco, ¿qué material orgánico húmedo debe separarse primero?",
          "Analiza la situación: tienes dos recursos aprovechables (papel y latas) y uno biodegradable (comida). ¿Qué acción responsable los clasifica adecuadamente?"
        ],
        explanation: "Separar papel y latas de los restos de comida evita contaminar los reciclables y preserva el valor industrial de la celulosa y el aluminio.",
        concept: "Preservación del material reciclable"
      },
      {
        id: "l3_case4",
        name: "CASO 4 — LABORATORIO",
        emoji: "💻",
        desc: "Durante una sesión práctica en el laboratorio se dañó el cargador de un teléfono celular.",
        options: [
          { id: "A", text: "Tirarlo al contenedor de plásticos porque su carcasa externa es de plástico.", correct: false },
          { id: "B", text: "Entregarlo en un punto autorizado para residuos electrónicos.", correct: true },
          { id: "C", text: "Desarmar el cable para botar el cobre al suelo y el plástico a la basura común.", correct: false }
        ],
        hint: "Un cargador averiado es un residuo electrónico con aleaciones de cobre y circuitos. ¿Es lo mismo que un envase de plástico de gaseosa?",
        hints: [
          "Un cargador averiado es un residuo electrónico con aleaciones de cobre y circuitos. ¿Es lo mismo que un envase de plástico de gaseosa?",
          "Desarmar cables por cuenta propia en el campus puede ocasionar accidentes o liberar fragmentos cortantes. ¿Cuál es el canal institucional adecuado?",
          "Los cargadores y cables rotos son RAEE y deben entregarse a campañas o puntos autorizados de recolección técnica. ¿Qué opción refleja esto?",
          "¿El plástico de un electrodoméstico o cargador puede reprocesarse en los mismos contenedores de botellas PET o requiere tratamiento de RAEE?",
          "En un laboratorio universitario, ¿cómo se gestionan normativamente los accesorios eléctricos y electrónicos que ya no funcionan?"
        ],
        explanation: "Entregarlo en un punto autorizado para residuos electrónicos asegura la recuperación técnica del cobre y el manejo de retardantes de llama.",
        concept: "Gestión integral de RAEE"
      },
      {
        id: "l3_case5",
        name: "CASO 5 — COMITÉ ESTUDIANTIL",
        emoji: "🏛️",
        desc: "El comité estudiantil te consulta para diseñar las nuevas estaciones de recolección en los pasillos de la facultad.",
        options: [
          { id: "A", text: "Colocar un solo contenedor grande para que no ocupe espacio y separar todo al final del semestre.", correct: false },
          { id: "B", text: "Etiquetar orgánico y reciclable y disponer un punto diferenciado para residuos de manejo especial.", correct: true },
          { id: "C", text: "Disponer únicamente recipientes para papel, suponiendo que en aulas no se genera nada más.", correct: false }
        ],
        hint: "Una estación ecológica universitaria completa debe resolver lo que realmente se genera en las facultades: comida, envases/papeles y pilas/cables. ¿Qué diseño cubre eso?",
        hints: [
          "Una estación ecológica universitaria completa debe resolver lo que realmente se genera en las facultades: comida, envases/papeles y pilas/cables. ¿Qué diseño cubre eso?",
          "¿Un solo contenedor colectivo incentiva la cultura de separación o provoca que todo termine contaminado en la basura común?",
          "Suponer que en las aulas solo se genera papel ignora refrigerios, botellas de agua y dispositivos electrónicos dañados. ¿Qué sistema integral es mejor?",
          "¿Por qué es crucial que los puntos ecológicos tengan señalización clara para orgánicos, reciclables y un buzón para residuos de manejo especial?",
          "El comité busca un modelo sustentable y duradero: ¿cuál de las tres propuestas asegura una separación real en la fuente sin mezclar peligrosos?"
        ],
        explanation: "Etiquetar orgánico y reciclable y disponer un punto diferenciado para residuos de manejo especial asegura un sistema integral, limpio y normativo en el campus.",
        concept: "Infraestructura y diseño de puntos ecológicos"
      }
    ]
  }
};

// ESTADO GLOBAL DEL JUEGO
const gameState = {
  currentLevelKey: "level1",
  currentIndex: 0,
  scores: {
    level1: 0,
    level2: 0,
    level3: 0
  },
  bestLevelScores: {
    level1: 0,
    level2: 0,
    level3: 0
  },
  bestLevel3CorrectCases: 0,
  level3CorrectCases: 0, // Casos resueltos correctamente en Nivel 3 (intento 1 o 2)
  bestScore: 0,
  badges: {
    level1: false, // Observador Verde (mín 15/20)
    level2: false, // Clasificador Consciente (mín 20/30)
    level3: false, // Protector del Campus (mín 35/50)
    final: false   // Certificado Guardián del Planeta (70+ total Y 3+ casos N3)
  },
  passed: false,
  studentName: "Estudiante Universitario"
};

// ESTADO EXPLÍCITO DE LA ACTIVIDAD / RESIDUO ACTUAL
let currentActivityState = {
  attempt: 1,           // 1 = primer intento, 2 = segundo intento (segunda oportunidad)
  completed: false,     // true cuando finaliza la actividad (acierto o 2 errores)
  answered: false,      // true si ya se registró la resolución definitiva
  hintUsed: false,      // true si el estudiante pulsó 'Pedir pista al EcoGuardián'
  pointsAwarded: 0,     // puntos ganados en esta actividad específica
  selectedAnswers: []   // registro de respuestas elegidas
};

// CARGAR DATOS PERSISTENTES (localStorage)
function initStorage() {
  try {
    const saved = localStorage.getItem("guardianes_mejor_puntaje");
    if (saved !== null) {
      gameState.bestScore = parseInt(saved, 10) || 0;
    }
    const savedName = localStorage.getItem("guardianes_estudiante_nombre");
    if (savedName) {
      gameState.studentName = savedName;
    }
    const savedBadges = localStorage.getItem("guardianes_insignias");
    if (savedBadges) {
      const parsedBadges = JSON.parse(savedBadges);
      gameState.badges = Object.assign(gameState.badges, parsedBadges);
    }
    const savedBestLevels = localStorage.getItem("guardianes_best_level_scores");
    if (savedBestLevels) {
      const parsedScores = JSON.parse(savedBestLevels);
      gameState.bestLevelScores = Object.assign(gameState.bestLevelScores, parsedScores);
    }
    const savedBestCases = localStorage.getItem("guardianes_best_level3_cases");
    if (savedBestCases !== null) {
      gameState.bestLevel3CorrectCases = parseInt(savedBestCases, 10) || 0;
    }
  } catch (e) {
    console.warn("localStorage no disponible:", e);
  }
}

// GUARDAR MEJOR PUNTAJE
function saveBestScore(newScore) {
  if (newScore > gameState.bestScore) {
    gameState.bestScore = newScore;
  }
  try {
    localStorage.setItem("guardianes_mejor_puntaje", gameState.bestScore.toString());
    localStorage.setItem("guardianes_estudiante_nombre", gameState.studentName);
  } catch (e) {
    console.warn("No se pudo guardar en localStorage:", e);
  }
}

// GUARDAR INSIGNIAS Y MEJORES RESULTADOS EN LOCALSTORAGE
function saveBadgesAndScores() {
  try {
    localStorage.setItem("guardianes_insignias", JSON.stringify(gameState.badges));
    localStorage.setItem("guardianes_best_level_scores", JSON.stringify(gameState.bestLevelScores));
    localStorage.setItem("guardianes_best_level3_cases", gameState.bestLevel3CorrectCases.toString());
    localStorage.setItem("guardianes_mejor_puntaje", gameState.bestScore.toString());
    localStorage.setItem("guardianes_estudiante_nombre", gameState.studentName);
  } catch (e) {
    console.warn("No se pudo guardar insignias en localStorage:", e);
  }
}

// CALCULAR TOTALES ACTUALES DE LA SESIÓN
function getTotalScore() {
  return gameState.scores.level1 + gameState.scores.level2 + gameState.scores.level3;
}

// CALCULAR MEJOR TOTAL ACUMULADO
function getBestTotalScore() {
  const s1 = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1);
  const s2 = Math.max(gameState.scores.level2, gameState.bestLevelScores.level2);
  const s3 = Math.max(gameState.scores.level3, gameState.bestLevelScores.level3);
  return s1 + s2 + s3;
}

// VERIFICAR APROBACIÓN (70+ puntos Y al menos 3 de 5 casos del Nivel 3)
function checkPassCondition() {
  const bestTotal = getBestTotalScore();
  const cases = Math.max(gameState.level3CorrectCases, gameState.bestLevel3CorrectCases);
  return (bestTotal >= 70) && (cases >= 3);
}

// INICIAR O REINICIAR MISIÓN
function startMission() {
  gameState.currentLevelKey = "level1";
  gameState.currentIndex = 0;
  gameState.scores.level1 = 0;
  gameState.scores.level2 = 0;
  gameState.scores.level3 = 0;
  gameState.level3CorrectCases = 0;
  gameState.passed = false;

  // Reiniciar rotación de pistas para la nueva misión
  if (typeof lastHintIndices !== "undefined") {
    Object.keys(lastHintIndices).forEach(k => delete lastHintIndices[k]);
  }

  // Cambiar a la pestaña de juego si no está activa
  goToTab("juego");

  // Mostrar contenedor de juego y ocultar portada
  const introCard = document.getElementById("game-intro-card");
  const activeArea = document.getElementById("game-active-area");
  if (introCard) introCard.style.display = "none";
  if (activeArea) activeArea.style.display = "block";

  renderCurrentItem();
  updateHUD();
}

// REINICIAR PROGRESO / NUEVO ESTUDIANTE
function resetStudentProgress() {
  const confirmed = confirm(
    "¿Deseas iniciar una nueva sesión para un nuevo estudiante?\n\nEsta acción reiniciará el progreso actual, los récords acumulados y las insignias guardadas en este navegador para comenzar de cero."
  );
  if (!confirmed) return;

  try {
    localStorage.removeItem("guardianes_mejor_puntaje");
    localStorage.removeItem("guardianes_estudiante_nombre");
    localStorage.removeItem("guardianes_insignias");
    localStorage.removeItem("guardianes_best_level_scores");
    localStorage.removeItem("guardianes_best_level3_cases");
  } catch (e) {
    console.warn("No se pudo limpiar localStorage:", e);
  }

  gameState.bestLevelScores = {
    level1: 0,
    level2: 0,
    level3: 0
  };
  gameState.bestLevel3CorrectCases = 0;
  gameState.bestScore = 0;
  gameState.badges = {
    level1: false,
    level2: false,
    level3: false,
    final: false
  };
  gameState.studentName = "Estudiante Universitario";

  startMission();
}

// ACTUALIZAR INTERFAZ HUD (PUNTAJE Y PROGRESO)
function updateHUD() {
  const total = getTotalScore();
  const hudScore = document.getElementById("hud-score-value");
  const hudLevel = document.getElementById("hud-level-indicator");
  const hudProgress = document.getElementById("hud-progress-bar");

  if (hudScore) hudScore.textContent = total;
  
  let levelText = "Nivel 1: Radar";
  let totalItemsPassed = 0;
  const totalItemsMission = 4 + 6 + 5; // 15 actividades en total

  if (gameState.currentLevelKey === "level1") {
    levelText = "Nivel 1: Radar Ambiental";
    totalItemsPassed = gameState.currentIndex;
  } else if (gameState.currentLevelKey === "level2") {
    levelText = `Nivel 2: Estación Separación (${gameState.currentIndex + 1}/6)`;
    totalItemsPassed = 4 + gameState.currentIndex;
  } else if (gameState.currentLevelKey === "level3") {
    levelText = "Nivel 3: Rescate Campus";
    totalItemsPassed = 10 + gameState.currentIndex;
  }

  if (hudLevel) hudLevel.textContent = `📍 ${levelText}`;
  
  const percentage = Math.min(100, Math.round((totalItemsPassed / totalItemsMission) * 100));
  if (hudProgress) hudProgress.style.width = `${percentage}%`;
}

// RENDERIZAR LA ACTIVIDAD ACTUAL (ENRUTA A NIVEL 1, 2 O 3)
function renderCurrentItem() {
  // Reiniciar estado explícito de la actividad actual
  currentActivityState = {
    attempt: 1,
    completed: false,
    answered: false,
    hintUsed: false,
    pointsAwarded: 0,
    selectedAnswers: []
  };

  // Contenedor principal
  const container = document.getElementById("activity-container");
  if (!container) return;

  // Ocultar y limpiar panel de retroalimentación
  const feedbackBox = document.getElementById("activity-feedback");
  if (feedbackBox) {
    feedbackBox.className = "feedback-box";
    feedbackBox.style.display = "none";
    feedbackBox.innerHTML = "";
  }

  // Ocultar botón siguiente
  const nextBtn = document.getElementById("activity-next-btn");
  if (nextBtn) {
    nextBtn.style.display = "none";
  }

  // =================================================================
  // NIVEL 2: DRAG & DROP SECUENCIAL (UN RESIDUO A LA VEZ)
  // =================================================================
  if (gameState.currentLevelKey === "level2") {
    renderLevel2SingleItemDragAndDrop();
    return;
  }

  // =================================================================
  // NIVEL 1 O NIVEL 3
  // =================================================================
  const levelData = GAME_DATA[gameState.currentLevelKey];
  const item = levelData.items[gameState.currentIndex];

  let optionsHTML = "";

  if (gameState.currentLevelKey === "level1") {
    optionsHTML = levelData.options.map((opt) => `
      <button class="option-btn" data-type="${opt.type}" onclick="handleItemAnswer('${opt.type}')">
        <span>${opt.emoji}</span>
        <span>${opt.label}</span>
      </button>
    `).join("");
  } else {
    // Nivel 3: Casos reales
    optionsHTML = item.options.map((opt) => `
      <button class="option-btn" data-id="${opt.id}" onclick="handleCaseAnswer('${opt.id}')">
        <span style="font-weight:900; color:var(--g-deep); font-size:18px;">${opt.id})</span>
        <span style="text-align:left;">${opt.text}</span>
      </button>
    `).join("");
  }

  container.innerHTML = `
    <div class="level-indicator" style="margin-bottom:12px;">
      ${levelData.title} · Actividad ${gameState.currentIndex + 1} de ${levelData.items.length}
    </div>
    
    <div class="item-visual-box">
      <div class="item-emoji">${item.emoji}</div>
      <div class="item-title">${item.name}</div>
      <div class="item-desc">${item.desc}</div>
    </div>

    <div class="options-grid" id="options-buttons-grid">
      ${optionsHTML}
    </div>
  `;

  updateHUD();
}

// ===================================================================
// LÓGICA DE RESPUESTA: NIVEL 1
// ===================================================================
function handleItemAnswer(selectedType) {
  if (currentActivityState.completed) return;
  if (currentActivityState.selectedAnswers.includes(selectedType)) return;

  const levelData = GAME_DATA[gameState.currentLevelKey];
  const item = levelData.items[gameState.currentIndex];
  const isCorrect = (selectedType === item.correctType);

  const feedbackBox = document.getElementById("activity-feedback");
  const nextBtn = document.getElementById("activity-next-btn");
  const buttons = document.querySelectorAll("#options-buttons-grid .option-btn");

  if (isCorrect) {
    currentActivityState.completed = true;
    currentActivityState.answered = true;
    let pointsAwarded = 0;

    if (currentActivityState.attempt === 1) {
      pointsAwarded = 5;
      currentActivityState.pointsAwarded = 5;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box correct show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#1b5e20; font-size:16px;">
            ✅ ¡Excelente acierto al primer intento! (+5 puntos)
          </div>
          <div class="feedback-text" style="margin-top:6px;">
            <p>${item.explanation}</p>
          </div>
        `;
      }
    } else {
      pointsAwarded = 3;
      currentActivityState.pointsAwarded = 3;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box correct show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#1b5e20; font-size:16px;">
            🎉 ¡Correcto! Aprovechaste la pista del EcoGuardián IA.
          </div>
          <div class="feedback-text" style="margin-top:6px;">
            <p><strong>Puntaje obtenido:</strong> +3 puntos.</p>
            <p style="margin-top:4px;">${item.explanation}</p>
          </div>
        `;
      }
    }

    gameState.scores.level1 += pointsAwarded;

    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.getAttribute("data-type") === selectedType) {
        btn.classList.remove("selected-wrong");
        btn.classList.add("selected-correct");
      }
    });

    if (nextBtn) {
      nextBtn.style.display = "inline-flex";
      nextBtn.textContent = "Siguiente actividad →";
      nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

  } else {
    if (currentActivityState.attempt === 1) {
      currentActivityState.attempt = 2;
      currentActivityState.selectedAnswers.push(selectedType);

      buttons.forEach(btn => {
        if (btn.getAttribute("data-type") === selectedType) {
          btn.classList.add("selected-wrong");
          btn.disabled = true;
        }
      });

      if (feedbackBox) {
        feedbackBox.className = "feedback-box hint show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#b75300; font-size:16px; display:flex; align-items:center; gap:8px;">
            <span>⚠️</span> <span>Primera oportunidad no acertada — Segunda oportunidad</span>
          </div>
          <div class="feedback-text" style="margin-top:8px;">
            <p style="font-weight:600; color:#5c4300; font-size:15px;">
              “No es la opción más adecuada. Observa el tipo de residuo y reflexiona sobre su origen.”
            </p>
            <div style="margin:12px 0 8px;">
              <button class="btn-ia-hint" id="btn-request-hint" onclick="revealEcoGuardianHint()">
                🤖 Pedir pista al EcoGuardián IA
              </button>
            </div>
            <div id="hint-display-box" style="display:none; margin-top:10px;"></div>
            <p style="margin-top:10px; font-size:13px; color:#7a5800; font-weight:600;">
              👉 Selecciona nuevamente una opción en las tarjetas de arriba para tu segundo intento.
            </p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (nextBtn) {
        nextBtn.style.display = "none";
      }

    } else {
      currentActivityState.completed = true;
      currentActivityState.answered = true;
      currentActivityState.pointsAwarded = 0;
      currentActivityState.selectedAnswers.push(selectedType);

      buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.getAttribute("data-type") === selectedType) {
          btn.classList.add("selected-wrong");
        }
        if (btn.getAttribute("data-type") === item.correctType) {
          btn.classList.add("selected-correct");
        }
      });

      const correctOpt = levelData.options.find(o => o.type === item.correctType);
      const correctLabel = correctOpt ? `${correctOpt.emoji} ${correctOpt.label}` : item.correctType;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box explanation show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#0b3d62; font-size:16px;">
            📘 Explicación formativa (0 puntos en esta actividad)
          </div>
          <div class="feedback-text" style="margin-top:8px;">
            <p><strong>Clasificación adecuada:</strong> ${correctLabel}</p>
            <p style="margin-top:6px;"><strong>Por qué:</strong> ${item.explanation}</p>
            <p style="margin-top:8px; font-size:13px; color:#555;">
              Recuerda que no se restan puntos acumulados. Pulsa en continuar para la siguiente actividad.
            </p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Siguiente actividad →";
        nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  updateHUD();
}

// ===================================================================
// LÓGICA DE RESPUESTA: NIVEL 3 (CASOS DEL CAMPUS)
// ===================================================================
function handleCaseAnswer(selectedId) {
  if (currentActivityState.completed) return;
  if (currentActivityState.selectedAnswers.includes(selectedId)) return;

  const levelData = GAME_DATA.level3;
  const item = levelData.items[gameState.currentIndex];
  const selectedOption = item.options.find(o => o.id === selectedId);
  const isCorrect = (selectedOption && selectedOption.correct);

  const feedbackBox = document.getElementById("activity-feedback");
  const nextBtn = document.getElementById("activity-next-btn");
  const buttons = document.querySelectorAll("#options-buttons-grid .option-btn");

  if (isCorrect) {
    currentActivityState.completed = true;
    currentActivityState.answered = true;
    gameState.level3CorrectCases++; // Acertado en intento 1 o 2 cuenta como correcto
    let pointsAwarded = 0;

    if (currentActivityState.attempt === 1) {
      pointsAwarded = 10;
      currentActivityState.pointsAwarded = 10;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box correct show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#1b5e20; font-size:16px;">
            🏆 ¡Decisión impecable al primer intento! (+10 puntos)
          </div>
          <div class="feedback-text" style="margin-top:6px;">
            <p>${item.explanation}</p>
          </div>
        `;
      }
    } else {
      pointsAwarded = 5;
      currentActivityState.pointsAwarded = 5;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box correct show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#1b5e20; font-size:16px;">
            🎉 ¡Correcto! Aprovechaste la pista del EcoGuardián IA.
          </div>
          <div class="feedback-text" style="margin-top:6px;">
            <p><strong>Puntaje obtenido:</strong> +5 puntos.</p>
            <p style="margin-top:4px;">${item.explanation}</p>
          </div>
        `;
      }
    }

    gameState.scores.level3 += pointsAwarded;

    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.getAttribute("data-id") === selectedId) {
        btn.classList.remove("selected-wrong");
        btn.classList.add("selected-correct");
      }
    });

    if (nextBtn) {
      nextBtn.style.display = "inline-flex";
      nextBtn.textContent = "Siguiente caso →";
      nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

  } else {
    if (currentActivityState.attempt === 1) {
      currentActivityState.attempt = 2;
      currentActivityState.hintUsed = true;
      currentActivityState.selectedAnswers.push(selectedId);

      buttons.forEach(btn => {
        if (btn.getAttribute("data-id") === selectedId) {
          btn.classList.add("selected-wrong");
          btn.disabled = true;
        }
      });

      if (feedbackBox) {
        feedbackBox.className = "feedback-box hint show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#b75300; font-size:16px; display:flex; align-items:center; gap:8px;">
            <span>⚠️</span> <span>Primera oportunidad no acertada — Segunda oportunidad</span>
          </div>
          <div class="feedback-text" style="margin-top:8px;">
            <p style="font-weight:600; color:#5c4300; font-size:15px;">
              “No es la decisión ambiental más adecuada para este caso.”
            </p>
            <div style="margin:12px 0 8px;">
              <button class="btn-ia-hint" id="btn-request-hint" onclick="revealEcoGuardianHint()">
                🤖 Pedir pista al EcoGuardián IA
              </button>
            </div>
            <div id="hint-display-box" style="display:none; margin-top:10px;"></div>
            <p style="margin-top:10px; font-size:13px; color:#7a5800; font-weight:600;">
              👉 Selecciona nuevamente una opción para tu segundo intento.
            </p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (nextBtn) {
        nextBtn.style.display = "none";
      }

    } else {
      currentActivityState.completed = true;
      currentActivityState.answered = true;
      currentActivityState.pointsAwarded = 0;
      currentActivityState.selectedAnswers.push(selectedId);

      const correctOpt = item.options.find(o => o.correct);

      buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.getAttribute("data-id") === selectedId) {
          btn.classList.add("selected-wrong");
        }
        if (correctOpt && btn.getAttribute("data-id") === correctOpt.id) {
          btn.classList.add("selected-correct");
        }
      });

      if (feedbackBox) {
        feedbackBox.className = "feedback-box explanation show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#0b3d62; font-size:16px;">
            📘 Decisión ambiental adecuada (0 puntos en este caso)
          </div>
          <div class="feedback-text" style="margin-top:8px;">
            <p><strong>Opción correcta (${correctOpt ? correctOpt.id : ''}):</strong> ${correctOpt ? correctOpt.text : ''}</p>
            <p style="margin-top:6px;"><strong>Por qué:</strong> ${item.explanation}</p>
            <p style="margin-top:8px; font-size:13px; color:#555;">
              Recuerda que no se restan puntos acumulados. Pulsa en continuar para la siguiente actividad.
            </p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Siguiente caso →";
        nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  updateHUD();
}

// ===================================================================
// PISTA DEL ECOGUARDIÁN IA (BANCO MULTI-PISTA ALEATORIO SIN REPETICIÓN)
// ===================================================================
const lastHintIndices = {};

function getRandomHint(item) {
  const hints = (item.hints && item.hints.length > 0) ? item.hints : (item.hint ? [item.hint] : []);
  if (hints.length === 0) {
    return "Observa el origen del residuo y piensa en qué categoría debe gestionarse.";
  }
  if (hints.length === 1) {
    return hints[0];
  }

  const lastIdx = lastHintIndices[item.id];
  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * hints.length);
  } while (newIdx === lastIdx && hints.length > 1);

  lastHintIndices[item.id] = newIdx;
  return hints[newIdx];
}

async function revealEcoGuardianHint() {
  currentActivityState.hintUsed = true;
  const levelData = GAME_DATA[gameState.currentLevelKey];
  const item = levelData ? levelData.items[gameState.currentIndex] : null;
  if (!item) return;

  const hintBtn = document.getElementById("btn-request-hint");
  const hintDisplay = document.getElementById("hint-display-box");

  // 1. Mostrar indicador breve de pensamiento
  if (hintDisplay) {
    hintDisplay.style.display = "block";
    hintDisplay.innerHTML = `
      <div style="background:#fffef5; border:2px dashed var(--gold); border-radius:12px; padding:14px; animation:slideDown 0.3s ease;">
        <div style="font-weight:700; color:#856404; display:flex; align-items:center; gap:8px; font-size:14.5px;">
          <span>🤖 EcoGuardián está pensando...</span>
        </div>
      </div>
    `;
    hintDisplay.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (hintBtn) {
    hintBtn.disabled = true;
    hintBtn.style.opacity = "0.7";
  }

  // 2. Preparar contexto educativo pedagógico
  const lastStudentAnswer = (currentActivityState.selectedAnswers && currentActivityState.selectedAnswers.length > 0)
    ? currentActivityState.selectedAnswers[currentActivityState.selectedAnswers.length - 1]
    : "opción incorrecta";

  const contextPayload = {
    level: gameState.currentLevelKey,
    levelTitle: levelData ? levelData.title : "Misión Reciclaje",
    itemId: item.id || "",
    itemName: item.name || "Residuo",
    itemDesc: item.desc || "",
    itemConcept: item.concept || "",
    studentAnswer: String(lastStudentAnswer),
    attempt: currentActivityState.attempt || 2
  };

  // 3. Solicitar pista a la IA generativa mediante el endpoint backend seguro
  let hintText = null;
  try {
    hintText = await callEcoGuardianBackendAPI(contextPayload);
  } catch (e) {
    hintText = null;
  }

  // 4. Si la IA no está disponible o falla, usar automáticamente el respaldo local variable
  if (!hintText || typeof hintText !== "string" || !hintText.trim()) {
    hintText = getRandomHint(item);
  }

  // 5. Renderizar la pista final con el diseño del juego
  if (hintDisplay) {
    hintDisplay.style.display = "block";
    hintDisplay.innerHTML = `
      <div style="background:#fffef5; border:2px dashed var(--gold); border-radius:12px; padding:14px; animation:slideDown 0.3s ease;">
        <div style="font-weight:800; color:#856404; margin-bottom:6px; display:flex; align-items:center; gap:6px; font-size:14.5px;">
          <span>🤖 EcoGuardián IA te orienta:</span>
        </div>
        <p style="color:#4e3c03; font-size:14.5px; line-height:1.55; margin:0;">
          ${hintText}
        </p>
        <small style="color:#856404; display:block; margin-top:8px; font-weight:600;">
          💡 Razona sobre esta orientación y elige la opción adecuada en tu segunda oportunidad.
        </small>
      </div>
    `;
    hintDisplay.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // 6. Restaurar botón y permitir pedir otra pista si el estudiante lo desea
  if (hintBtn) {
    hintBtn.disabled = false;
    hintBtn.style.opacity = "1";
    hintBtn.innerHTML = "🔄 Pedir otra pista al EcoGuardián IA";
  }
}

// ===================================================================
// ===================================================================
// NUEVO NIVEL 2: ESTACIÓN DE SEPARACIÓN (SECUENCIAL UNO POR UNO)
// ===================================================================
// ===================================================================

function renderLevel2SingleItemDragAndDrop() {
  const container = document.getElementById("activity-container");
  const levelData = GAME_DATA.level2;
  const item = levelData.items[gameState.currentIndex];

  if (!container) return;

  // Clases dinámicas de la tarjeta según estado actual
  let cardClass = "draggable-single-card";
  let isDraggable = !currentActivityState.completed;

  if (currentActivityState.completed) {
    if (currentActivityState.pointsAwarded > 0) {
      cardClass += " completed-correct";
    } else {
      cardClass += " completed-wrong";
    }
  } else if (currentActivityState.attempt === 2) {
    cardClass += " second-chance";
  }

  // 3 Zonas fijas de destino (Contenedores)
  const zonesHTML = levelData.zones.map(z => `
    <div 
      id="zone-${z.type}"
      class="drop-zone zone-${z.type}"
      data-target="${z.type}"
      ondragover="handleLevel2DragOver(event)"
      ondragleave="handleLevel2DragLeave(event)"
      ondrop="handleLevel2DropEvent(event, '${z.type}')"
    >
      <div>
        <div class="zone-emoji">${z.emoji}</div>
        <div class="zone-title">${z.label}</div>
        <div class="zone-desc">${z.desc}</div>
      </div>
      <div class="zone-drop-prompt">⬇️ Soltar aquí</div>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="level-indicator" style="margin-bottom:12px;">
      Nivel 2: Estación de Separación · Residuo ${gameState.currentIndex + 1} de 6
    </div>

    <!-- TARJETA GRANDE ARRASTRABLE DEL RESIDUO ACTUAL -->
    <div 
      id="drag-active-card"
      class="${cardClass}"
      draggable="${isDraggable}"
      data-item-id="${item.id}"
      data-correct-type="${item.correctType}"
      ondragstart="handleLevel2DragStart(event, '${item.id}')"
      ondragend="handleLevel2DragEnd(event)"
      onpointerdown="handleLevel2PointerDown(event, '${item.id}')"
    >
      <div class="item-emoji" style="font-size:72px; margin-bottom:6px;">${item.emoji}</div>
      <div class="item-title" style="font-size:24px; font-weight:800; color:var(--g-deep); margin-bottom:4px;">${item.name}</div>
      <div class="item-desc" style="font-size:14px; color:var(--text-muted); margin-bottom:12px;">${item.desc}</div>
      
      <div class="drag-hint-badge">
        <span>✋ Arrastra este residuo hacia su contenedor correspondiente</span>
      </div>
    </div>

    <!-- 3 ZONAS DE DESTINO (CONTENEDORES) -->
    <div class="drop-zones-grid">
      ${zonesHTML}
    </div>
  `;

  updateHUD();
}

// ===================================================================
// LÓGICA DE DROP Y EVALUACIÓN DEL NIVEL 2 (SECUENCIAL)
// ===================================================================
function handleLevel2DropCore(itemId, targetType) {
  if (currentActivityState.completed) return;

  const levelData = GAME_DATA.level2;
  const item = levelData.items[gameState.currentIndex];

  // Seguridad: comprobar que corresponda al residuo actual
  if (item.id !== itemId) return;

  const isCorrect = (targetType === item.correctType);
  const feedbackBox = document.getElementById("activity-feedback");
  const nextBtn = document.getElementById("activity-next-btn");
  const card = document.getElementById("drag-active-card");
  const zoneElem = document.getElementById(`zone-${targetType}`);

  const zoneNames = {
    organico: "🌱 Residuo Orgánico",
    reciclable: "♻️ Residuo Reciclable",
    especial: "⚠️ Manejo Especial"
  };

  if (isCorrect) {
    // ---------------------------------------------------------------
    // CLASIFICACIÓN CORRECTA
    // ---------------------------------------------------------------
    currentActivityState.completed = true;
    currentActivityState.answered = true;

    if (card) {
      card.setAttribute("draggable", "false");
      card.classList.remove("second-chance", "dragging");
      card.classList.add("completed-correct");
    }

    if (zoneElem) {
      zoneElem.classList.add("zone-success");
      setTimeout(() => zoneElem.classList.remove("zone-success"), 600);
    }

    let pointsAwarded = 0;

    if (currentActivityState.attempt === 1) {
      // Primer intento correcto: +5 puntos
      pointsAwarded = 5;
      currentActivityState.pointsAwarded = 5;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box correct show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#1b5e20; font-size:16px;">
            ✅ ¡Correcto! ${item.emoji} "${item.name}" pertenece a ${zoneNames[targetType]}. (+5 puntos)
          </div>
          <div class="feedback-text" style="margin-top:6px;">
            <p>${item.explanation}</p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      // Segundo intento correcto tras pista: +3 puntos (¡NUNCA 2.5!)
      pointsAwarded = 3;
      currentActivityState.pointsAwarded = 3;

      if (feedbackBox) {
        feedbackBox.className = "feedback-box correct show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#1b5e20; font-size:16px;">
            🎉 ¡Correcto! Aprovechaste la pista del EcoGuardián IA.
          </div>
          <div class="feedback-text" style="margin-top:6px;">
            <p><strong>Puntaje obtenido:</strong> +3 puntos.</p>
            <p style="margin-top:4px;">${item.explanation}</p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    gameState.scores.level2 += pointsAwarded;

    // Mostrar botón para avanzar al siguiente residuo
    if (nextBtn) {
      nextBtn.style.display = "inline-flex";
      nextBtn.textContent = (gameState.currentIndex < 5) ? "Siguiente residuo →" : "Finalizar Nivel 2 →";
      nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

  } else {
    // ---------------------------------------------------------------
    // CLASIFICACIÓN INCORRECTA
    // ---------------------------------------------------------------
    if (zoneElem) {
      zoneElem.classList.add("zone-error");
      setTimeout(() => zoneElem.classList.remove("zone-error"), 600);
    }

    if (currentActivityState.attempt === 1) {
      // Primer intento incorrecto: 0 puntos, segunda oportunidad
      currentActivityState.attempt = 2;
      currentActivityState.hintUsed = true;
      currentActivityState.selectedAnswers.push(zoneNames[targetType] || targetType);

      if (card) {
        card.classList.add("second-chance");
      }

      if (feedbackBox) {
        feedbackBox.className = "feedback-box hint show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#b75300; font-size:16px; display:flex; align-items:center; gap:8px;">
            <span>⚠️</span> <span>Primera oportunidad no acertada — Segunda oportunidad</span>
          </div>
          <div class="feedback-text" style="margin-top:8px;">
            <p style="font-weight:600; color:#5c4300; font-size:15px;">
              “No es el contenedor adecuado para este residuo.”
            </p>
            <div style="margin:12px 0 8px;">
              <button class="btn-ia-hint" id="btn-request-hint" onclick="revealEcoGuardianHint()">
                🤖 Pedir pista al EcoGuardián IA
              </button>
            </div>
            <div id="hint-display-box" style="display:none; margin-top:10px;"></div>
            <p style="margin-top:10px; font-size:13px; color:#7a5800; font-weight:600;">
              👉 Vuelve a arrastrar la tarjeta "${item.name}" hacia el contenedor correcto en tu segundo intento.
            </p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (nextBtn) {
        nextBtn.style.display = "none";
      }

    } else {
      // Segundo intento incorrecto: 0 puntos, bloquear tarjeta, mostrar explicación formativa
      currentActivityState.completed = true;
      currentActivityState.answered = true;
      currentActivityState.pointsAwarded = 0;

      if (card) {
        card.setAttribute("draggable", "false");
        card.classList.remove("second-chance", "dragging");
        card.classList.add("completed-wrong");
      }

      if (feedbackBox) {
        feedbackBox.className = "feedback-box explanation show";
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
          <div class="feedback-title" style="color:#0b3d62; font-size:16px;">
            📘 Explicación formativa (0 puntos en este residuo)
          </div>
          <div class="feedback-text" style="margin-top:8px;">
            <p><strong>El contenedor correcto para ${item.emoji} "${item.name}" era:</strong> ${zoneNames[item.correctType]}</p>
            <p style="margin-top:6px;"><strong>Por qué:</strong> ${item.explanation}</p>
            <p style="margin-top:8px; font-size:13px; color:#555;">
              Recuerda que no se restan puntos acumulados. Pulsa en continuar para el siguiente residuo.
            </p>
          </div>
        `;
        feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = (gameState.currentIndex < 5) ? "Siguiente residuo →" : "Finalizar Nivel 2 →";
        nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  updateHUD();
}

// ===================================================================
// EVENTOS DRAG & DROP HTML5 NATIVOS (RATÓN / PC)
// ===================================================================
function handleLevel2DragStart(e, itemId) {
  if (currentActivityState.completed) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.setData("text/plain", itemId);
  e.dataTransfer.effectAllowed = "move";
  if (e.target && e.target.classList) {
    e.target.classList.add("dragging");
  }
}

function handleLevel2DragEnd(e) {
  if (e.target && e.target.classList) {
    e.target.classList.remove("dragging");
  }
  document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("drag-over"));
}

function handleLevel2DragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (e.currentTarget && e.currentTarget.classList) {
    e.currentTarget.classList.add("drag-over");
  }
}

function handleLevel2DragLeave(e) {
  if (e.currentTarget && e.currentTarget.classList) {
    e.currentTarget.classList.remove("drag-over");
  }
}

function handleLevel2DropEvent(e, targetType) {
  e.preventDefault();
  if (e.currentTarget && e.currentTarget.classList) {
    e.currentTarget.classList.remove("drag-over");
  }
  const itemId = e.dataTransfer.getData("text/plain");
  if (itemId) {
    handleLevel2DropCore(itemId, targetType);
  }
}

// ===================================================================
// EVENTOS POINTER / TOUCH (CELULARES Y TABLETS)
// ===================================================================
let activeTouchDrag = {
  itemId: null,
  ghostElem: null
};

function handleLevel2PointerDown(e, itemId) {
  if (e.button && e.button !== 0) return;
  if (currentActivityState.completed) return;

  const item = GAME_DATA.level2.items[gameState.currentIndex];
  if (!item || item.id !== itemId) return;

  activeTouchDrag.itemId = itemId;

  // Crear ghost flotante para el arrastre táctil
  const ghost = document.createElement("div");
  ghost.className = "drag-touch-ghost";
  ghost.innerHTML = `<span>${item.emoji}</span><span>${item.name}</span>`;
  ghost.style.left = `${e.clientX}px`;
  ghost.style.top = `${e.clientY}px`;
  document.body.appendChild(ghost);
  activeTouchDrag.ghostElem = ghost;

  const onPointerMove = (moveEvt) => {
    if (activeTouchDrag.ghostElem) {
      activeTouchDrag.ghostElem.style.left = `${moveEvt.clientX}px`;
      activeTouchDrag.ghostElem.style.top = `${moveEvt.clientY}px`;
    }

    const elemBelow = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
    const dropZone = elemBelow ? elemBelow.closest(".drop-zone") : null;

    document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("drag-over"));
    if (dropZone) {
      dropZone.classList.add("drag-over");
    }
  };

  const onPointerUp = (upEvt) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    if (activeTouchDrag.ghostElem) {
      activeTouchDrag.ghostElem.remove();
      activeTouchDrag.ghostElem = null;
    }

    const elemBelow = document.elementFromPoint(upEvt.clientX, upEvt.clientY);
    const dropZone = elemBelow ? elemBelow.closest(".drop-zone") : null;

    document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("drag-over"));

    if (dropZone) {
      const targetType = dropZone.getAttribute("data-target");
      if (targetType && activeTouchDrag.itemId) {
        handleLevel2DropCore(activeTouchDrag.itemId, targetType);
      }
    }

    activeTouchDrag.itemId = null;
  };

  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

// ===================================================================
// AVANZAR AL SIGUIENTE ÍTEM O A LA PANTALLA DE FINALIZACIÓN DE NIVEL
// ===================================================================
function nextItem() {
  const levelData = GAME_DATA[gameState.currentLevelKey];

  if (gameState.currentIndex < levelData.items.length - 1) {
    gameState.currentIndex++;
    renderCurrentItem();
  } else {
    // Fin de nivel actual: desplegar pantalla de finalización con las dos tarjetas
    if (gameState.currentLevelKey === "level1") {
      showLevelCompletionScreen(1);
    } else if (gameState.currentLevelKey === "level2") {
      showLevelCompletionScreen(2);
    } else if (gameState.currentLevelKey === "level3") {
      showLevelCompletionScreen(3);
    }
  }
}

// ===================================================================
// PANTALLAS DE FINALIZACIÓN DE CADA NIVEL (DOS TARJETAS JUNTAS)
// ===================================================================
function showLevelCompletionScreen(levelNum) {
  const container = document.getElementById("activity-container");
  const feedbackBox = document.getElementById("activity-feedback");
  const nextBtn = document.getElementById("activity-next-btn");

  if (feedbackBox) {
    feedbackBox.style.display = "none";
    feedbackBox.innerHTML = "";
  }
  if (nextBtn) {
    nextBtn.style.display = "none";
  }
  if (!container) return;

  if (levelNum === 1) {
    // ===============================================================
    // NIVEL 1 — Observador Verde (🌱, mín 15/20)
    // ===============================================================
    const currentScore = gameState.scores.level1;
    if (currentScore > gameState.bestLevelScores.level1) {
      gameState.bestLevelScores.level1 = currentScore;
    }
    const bestScore = gameState.bestLevelScores.level1;
    const isUnlocked = bestScore >= 15;
    if (isUnlocked) {
      gameState.badges.level1 = true;
    }
    saveBadgesAndScores();

    const badgeCardHTML = isUnlocked ? `
      <div class="completion-card badge-card-level badge-achieved">
        <div class="card-header-label">🏅 INSIGNIA CONSEGUIDA</div>
        <div class="badge-emoji-box">🌱</div>
        <div>
          <div class="badge-status-title">🌱 ¡Insignia conseguida!</div>
          <h4 class="badge-main-name">Observador Verde</h4>
        </div>
        <div class="badge-text-box">
          Has demostrado que reconoces correctamente los principales tipos de residuos.
        </div>
      </div>
    ` : `
      <div class="completion-card badge-card-level badge-pending">
        <div class="card-header-label">🔒 INSIGNIA PENDIENTE</div>
        <div class="badge-emoji-box">🔒</div>
        <div>
          <div class="badge-status-title">🔒 Insignia pendiente</div>
          <h4 class="badge-main-name">Observador Verde</h4>
        </div>
        <div class="badge-text-box">
          Necesitas al menos 15/20 puntos para conseguir esta insignia. Puedes repetir el nivel.
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="level-completion-wrapper">
        <div class="level-completion-header">
          <div class="completion-tag">Fase 1 Finalizada</div>
          <h3>¡Nivel 1 Completado!</h3>
          <p>Has finalizado el reconocimiento de residuos en el Radar Ambiental.</p>
        </div>

        <div class="dual-cards-container">
          <!-- TARJETA 1: PUNTAJE OBTENIDO -->
          <div class="completion-card score-card">
            <div class="card-header-label">🏆 PUNTAJE OBTENIDO</div>
            <div>
              <div class="score-hero-number">${currentScore} <span class="denom">/ 20 pts</span></div>
              <div style="font-size:14px; font-weight:700; color:var(--g);">Nivel 1: Radar Ambiental</div>
            </div>
            <div class="score-detail-box">
              <div class="score-detail-item">
                <span>Puntaje de este intento:</span>
                <strong>${currentScore} / 20 pts</strong>
              </div>
              <div class="score-detail-item">
                <span>Mejor puntaje conservado:</span>
                <strong>${bestScore} / 20 pts</strong>
              </div>
              <div class="score-detail-item">
                <span>Puntaje acumulado misión:</span>
                <strong>${getTotalScore()} / 100 pts</strong>
              </div>
            </div>
          </div>

          <!-- TARJETA 2: INSIGNIA -->
          ${badgeCardHTML}
        </div>

        <div class="completion-actions-row">
          <button class="btn gold" style="font-size:16px; padding:14px 28px;" onclick="advanceFromLevel(1)">
            Comenzar Nivel 2: Estación de Separación →
          </button>
          <button class="btn outline" style="font-size:15px; padding:12px 22px;" onclick="repeatLevel(1)">
            🔄 Repetir Nivel 1
          </button>
        </div>
      </div>
    `;

  } else if (levelNum === 2) {
    // ===============================================================
    // NIVEL 2 — Clasificador Consciente (♻️, mín 20/30)
    // ===============================================================
    const currentScore = gameState.scores.level2;
    if (currentScore > gameState.bestLevelScores.level2) {
      gameState.bestLevelScores.level2 = currentScore;
    }
    const bestScore = gameState.bestLevelScores.level2;
    const isUnlocked = bestScore >= 20;
    if (isUnlocked) {
      gameState.badges.level2 = true;
    }
    saveBadgesAndScores();

    const badgeCardHTML = isUnlocked ? `
      <div class="completion-card badge-card-level badge-achieved">
        <div class="card-header-label">🏅 INSIGNIA CONSEGUIDA</div>
        <div class="badge-emoji-box">♻️</div>
        <div>
          <div class="badge-status-title">♻️ ¡Insignia conseguida!</div>
          <h4 class="badge-main-name">Clasificador Consciente</h4>
        </div>
        <div class="badge-text-box">
          Has demostrado que puedes clasificar correctamente los residuos del campus.
        </div>
      </div>
    ` : `
      <div class="completion-card badge-card-level badge-pending">
        <div class="card-header-label">🔒 INSIGNIA PENDIENTE</div>
        <div class="badge-emoji-box">🔒</div>
        <div>
          <div class="badge-status-title">🔒 Insignia pendiente</div>
          <h4 class="badge-main-name">Clasificador Consciente</h4>
        </div>
        <div class="badge-text-box">
          Necesitas al menos 20/30 puntos para conseguir esta insignia. Puedes repetir el nivel.
        </div>
      </div>
    `;

    const accumulatedUntilL2 = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1) + currentScore;

    container.innerHTML = `
      <div class="level-completion-wrapper">
        <div class="level-completion-header">
          <div class="completion-tag">Fase 2 Finalizada</div>
          <h3>¡Nivel 2 Completado!</h3>
          <p>Has clasificado los 6 residuos del campus en sus respectivos contenedores.</p>
        </div>

        <div class="dual-cards-container">
          <!-- TARJETA 1: PUNTAJE OBTENIDO -->
          <div class="completion-card score-card">
            <div class="card-header-label">🏆 PUNTAJE OBTENIDO</div>
            <div>
              <div class="score-hero-number">${currentScore} <span class="denom">/ 30 pts</span></div>
              <div style="font-size:14px; font-weight:700; color:var(--g);">Nivel 2: Estación de Separación</div>
            </div>
            <div class="score-detail-box">
              <div class="score-detail-item">
                <span>Puntaje de este intento:</span>
                <strong>${currentScore} / 30 pts</strong>
              </div>
              <div class="score-detail-item">
                <span>Mejor puntaje conservado:</span>
                <strong>${bestScore} / 30 pts</strong>
              </div>
              <div class="score-detail-item">
                <span>Puntaje acumulado (N1 + N2):</span>
                <strong>${accumulatedUntilL2} / 50 pts</strong>
              </div>
            </div>
          </div>

          <!-- TARJETA 2: INSIGNIA -->
          ${badgeCardHTML}
        </div>

        <div class="completion-actions-row">
          <button class="btn gold" style="font-size:16px; padding:14px 28px;" onclick="advanceFromLevel(2)">
            🚀 Comenzar Nivel 3: Rescate del Campus →
          </button>
          <button class="btn outline" style="font-size:15px; padding:12px 22px;" onclick="repeatLevel(2)">
            🔄 Repetir Nivel 2
          </button>
        </div>
      </div>
    `;

  } else if (levelNum === 3) {
    // ===============================================================
    // NIVEL 3 — Protector del Campus (🛡️, mín 35/50)
    // ===============================================================
    const currentScore = gameState.scores.level3;
    if (currentScore > gameState.bestLevelScores.level3) {
      gameState.bestLevelScores.level3 = currentScore;
    }
    if (gameState.level3CorrectCases > gameState.bestLevel3CorrectCases) {
      gameState.bestLevel3CorrectCases = gameState.level3CorrectCases;
    }
    const bestScore = gameState.bestLevelScores.level3;
    const isUnlockedL3 = bestScore >= 35;
    if (isUnlockedL3) {
      gameState.badges.level3 = true;
    }

    // Evaluación final:
    // - Completar los 3 niveles
    // - Obtener mínimo 70/100 puntos
    // - Resolver correctamente al menos 3 de los 5 casos del Nivel 3 (intento 1 o 2)
    const totalMission = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1) +
                         Math.max(gameState.scores.level2, gameState.bestLevelScores.level2) +
                         bestScore;
    const bestCases = Math.max(gameState.level3CorrectCases, gameState.bestLevel3CorrectCases);
    const isFinalUnlocked = (totalMission >= 70 && bestCases >= 3);
    if (isFinalUnlocked) {
      gameState.badges.final = true;
    }
    saveBestScore(totalMission);
    saveBadgesAndScores();

    const badgeCardHTML = isUnlockedL3 ? `
      <div class="completion-card badge-card-level badge-achieved">
        <div class="card-header-label">🏅 INSIGNIA CONSEGUIDA</div>
        <div class="badge-emoji-box">🛡️</div>
        <div>
          <div class="badge-status-title">🛡️ ¡Insignia conseguida!</div>
          <h4 class="badge-main-name">Protector del Campus</h4>
        </div>
        <div class="badge-text-box">
          Has demostrado que puedes tomar decisiones responsables ante situaciones reales del campus.
        </div>
      </div>
    ` : `
      <div class="completion-card badge-card-level badge-pending">
        <div class="card-header-label">🔒 INSIGNIA PENDIENTE</div>
        <div class="badge-emoji-box">🔒</div>
        <div>
          <div class="badge-status-title">🔒 Insignia pendiente</div>
          <h4 class="badge-main-name">Protector del Campus</h4>
        </div>
        <div class="badge-text-box">
          Necesitas al menos 35/50 puntos para conseguir esta insignia. Puedes repetir el nivel.
        </div>
      </div>
    `;

    const finalCertificateSpecialCard = isFinalUnlocked ? `
      <div class="final-cert-card unlocked">
        <div class="final-cert-icon">🏆</div>
        <div class="final-cert-title">CERTIFICADO GUARDIÁN DEL PLANETA</div>
        <div class="final-cert-subtitle">¡Misión completada!</div>
        <p class="final-cert-text">
          Has completado exitosamente la experiencia gamificada y demostrado competencias para reconocer, clasificar y gestionar responsablemente los residuos en el campus.
        </p>
        <div style="font-size:14.5px; font-weight:700; color:var(--gold); margin-bottom:14px;">
          Puntaje total alcanzado: ${totalMission} / 100 pts · Casos del campus superados: ${bestCases} / 5
        </div>
      </div>
    ` : `
      <div class="final-cert-card locked">
        <div class="final-cert-icon">🔒</div>
        <div class="final-cert-title">Certificado pendiente</div>
        <p class="final-cert-text">
          Necesitas obtener al menos 70/100 puntos y resolver correctamente al menos 3 de los 5 casos del Nivel 3.
        </p>
        <div style="font-size:13.5px; font-weight:600; color:#8d6e63; margin-top:8px;">
          Puntaje actual: ${totalMission} / 100 pts · Casos resueltos: ${bestCases} / 5
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="level-completion-wrapper">
        <div class="level-completion-header">
          <div class="completion-tag">Fase 3 Finalizada · Misión Completa</div>
          <h3>¡Nivel 3 Completado!</h3>
          <p>Has resuelto los 5 casos reales de gestión de residuos en el campus universitario.</p>
        </div>

        <div class="dual-cards-container">
          <!-- TARJETA 1: PUNTAJE OBTENIDO -->
          <div class="completion-card score-card">
            <div class="card-header-label">🏆 PUNTAJE OBTENIDO</div>
            <div>
              <div class="score-hero-number">${currentScore} <span class="denom">/ 50 pts</span></div>
              <div style="font-size:14px; font-weight:700; color:var(--g);">Nivel 3: Rescate del Campus</div>
            </div>
            <div class="score-detail-box">
              <div class="score-detail-item">
                <span>Casos resueltos en Nivel 3:</span>
                <strong>${gameState.level3CorrectCases} / 5</strong>
              </div>
              <div class="score-detail-item">
                <span>Mejor puntaje Nivel 3:</span>
                <strong>${bestScore} / 50 pts</strong>
              </div>
              <div class="score-detail-item">
                <span>Puntaje total de la misión:</span>
                <strong>${totalMission} / 100 pts</strong>
              </div>
            </div>
          </div>

          <!-- TARJETA 2: INSIGNIA -->
          ${badgeCardHTML}
        </div>

        <!-- TARJETA ESPECIAL GRANDE: CERTIFICADO FINAL -->
        ${finalCertificateSpecialCard}

        <div class="completion-actions-row">
          <button class="btn gold" style="font-size:16px; padding:14px 28px;" onclick="advanceFromLevel(3)">
            📜 Ver Certificado y Resultados Oficiales →
          </button>
          <button class="btn outline" style="font-size:15px; padding:12px 22px;" onclick="repeatLevel(3)">
            🔄 Repetir Nivel 3
          </button>
          <button class="btn" style="background:#4a6356; color:white; font-size:15px; padding:12px 20px;" onclick="startMission()">
            🔄 Reiniciar Misión Completa
          </button>
        </div>
      </div>
    `;
  }
}

// AVANZAR AL SIGUIENTE NIVEL TRAS LA PANTALLA DE FINALIZACIÓN
function advanceFromLevel(levelNum) {
  if (levelNum === 1) {
    gameState.scores.level1 = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1);
    gameState.currentLevelKey = "level2";
    gameState.currentIndex = 0;
    renderCurrentItem();
    updateHUD();
  } else if (levelNum === 2) {
    gameState.scores.level2 = Math.max(gameState.scores.level2, gameState.bestLevelScores.level2);
    gameState.currentLevelKey = "level3";
    gameState.currentIndex = 0;
    renderCurrentItem();
    updateHUD();
  } else if (levelNum === 3) {
    finishGame();
  }
}

// REPETIR UN NIVEL ESPECÍFICO CONSERVANDO EL MEJOR PUNTAJE
function repeatLevel(levelNum) {
  if (levelNum === 1) {
    gameState.currentLevelKey = "level1";
    gameState.currentIndex = 0;
    gameState.scores.level1 = 0;
  } else if (levelNum === 2) {
    gameState.currentLevelKey = "level2";
    gameState.currentIndex = 0;
    gameState.scores.level2 = 0;
  } else if (levelNum === 3) {
    gameState.currentLevelKey = "level3";
    gameState.currentIndex = 0;
    gameState.scores.level3 = 0;
    gameState.level3CorrectCases = 0;
  }
  renderCurrentItem();
  updateHUD();
}

// FINALIZAR MISIÓN Y MOSTRAR RESULTADOS
function finishGame() {
  gameState.scores.level1 = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1);
  gameState.scores.level2 = Math.max(gameState.scores.level2, gameState.bestLevelScores.level2);
  gameState.scores.level3 = Math.max(gameState.scores.level3, gameState.bestLevelScores.level3);
  gameState.level3CorrectCases = Math.max(gameState.level3CorrectCases, gameState.bestLevel3CorrectCases);

  const total = getTotalScore();
  const passed = checkPassCondition();
  gameState.passed = passed;

  if (passed) {
    gameState.badges.final = true;
  }

  // Guardar mejor puntaje
  saveBestScore(total);
  saveBadgesAndScores();

  // Ocultar área de juego
  const activeArea = document.getElementById("game-active-area");
  const introCard = document.getElementById("game-intro-card");
  if (activeArea) activeArea.style.display = "none";
  if (introCard) introCard.style.display = "block";

  // Ir a la pestaña de resultados
  goToTab("resultado");

  // Renderizar resultados dinámicos
  renderResultsView();
}

// RENDERIZAR VISTA DINÁMICA DE RESULTADOS
function renderResultsView() {
  gameState.scores.level1 = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1);
  gameState.scores.level2 = Math.max(gameState.scores.level2, gameState.bestLevelScores.level2);
  gameState.scores.level3 = Math.max(gameState.scores.level3, gameState.bestLevelScores.level3);
  gameState.level3CorrectCases = Math.max(gameState.level3CorrectCases, gameState.bestLevel3CorrectCases);

  const total = getTotalScore();
  const passed = checkPassCondition();

  const scoreNum = document.getElementById("result-score-num");
  const statusPill = document.getElementById("result-status-pill");
  const customMsg = document.getElementById("result-custom-message");
  const statL1 = document.getElementById("stat-score-l1");
  const statL2 = document.getElementById("stat-score-l2");
  const statL3 = document.getElementById("stat-score-l3");
  const statCases = document.getElementById("stat-cases-n3");
  const bestScoreEl = document.getElementById("stat-best-score");

  if (scoreNum) scoreNum.textContent = total;
  if (statL1) statL1.textContent = `${gameState.scores.level1} / 20`;
  if (statL2) statL2.textContent = `${gameState.scores.level2} / 30`;
  if (statL3) statL3.textContent = `${gameState.scores.level3} / 50`;
  if (statCases) statCases.textContent = `${gameState.level3CorrectCases} / 5`;
  if (bestScoreEl) bestScoreEl.textContent = `${gameState.bestScore} / 100`;

  if (statusPill) {
    if (passed) {
      statusPill.className = "status-pill status-approved";
      statusPill.textContent = "¡MISIÓN CUMPLIDA! APROBADO";
    } else {
      statusPill.className = "status-pill status-reinforce";
      statusPill.textContent = "DEBE REFORZAR LA MISIÓN";
    }
  }

  if (customMsg) {
    if (passed) {
      customMsg.innerHTML = `
        <p style="font-size:18px; font-weight:bold; color:var(--g-deep);">
          “¡Misión cumplida! Eres un Guardián del Planeta.”
        </p>
        <p style="margin-top:8px; color:var(--text-muted);">
          Has superado con éxito el estándar universitario (mínimo 70/100 y al menos 3 de 5 casos del campus resueltos). Tu compromiso fortalece la sostenibilidad en el campus.
        </p>
      `;
    } else {
      let detalleFalta = [];
      if (total < 70) detalleFalta.push(`obtuviste ${total}/100 (mínimo requerido: 70)`);
      if (gameState.level3CorrectCases < 3) detalleFalta.push(`resolviste ${gameState.level3CorrectCases}/5 casos en el Nivel 3 (mínimo requerido: 3)`);

      customMsg.innerHTML = `
        <p style="font-size:17px; font-weight:bold; color:var(--warning);">
          Estuviste muy cerca de certificar como Guardián del Planeta.
        </p>
        <p style="margin-top:6px; color:var(--text-muted);">
          Para aprobar la misión se requiere un puntaje mínimo de 70/100 y acertar al menos 3 casos del campus. En este intento ${detalleFalta.join(" y ")}.
        </p>
        <p style="margin-top:8px; font-weight:600; color:var(--g-deep);">
          ¡Repasa los recursos de la Tarea 2, practica en las flashcards y repite la misión para desbloquear tu Certificado!
        </p>
      `;
    }
  }

  // Renderizar Insignias
  renderBadges();

  // Renderizar Certificado (si aprobó)
  renderCertificate(passed);
}

// RENDERIZAR INSIGNIAS SEGÚN REGLAS ESTRICTAS
function renderBadges() {
  const b1 = gameState.badges.level1 || gameState.bestLevelScores.level1 >= 15 || gameState.scores.level1 >= 15;
  const b2 = gameState.badges.level2 || gameState.bestLevelScores.level2 >= 20 || gameState.scores.level2 >= 20;
  const b3 = gameState.badges.level3 || gameState.bestLevelScores.level3 >= 35 || gameState.scores.level3 >= 35;
  const b4 = gameState.badges.final || checkPassCondition();

  const container = document.getElementById("badges-container");
  if (!container) return;

  const scoreL1 = Math.max(gameState.scores.level1, gameState.bestLevelScores.level1);
  const scoreL2 = Math.max(gameState.scores.level2, gameState.bestLevelScores.level2);
  const scoreL3 = Math.max(gameState.scores.level3, gameState.bestLevelScores.level3);

  container.innerHTML = `
    <!-- Insignia 1 -->
    <div class="badge-card ${b1 ? 'unlocked' : 'locked'}">
      <div class="badge-icon">🌱</div>
      <div class="badge-title">Observador Verde</div>
      <div class="badge-cond">Mínimo 15/20 en Nivel 1</div>
      <div class="badge-status">${b1 ? 'Desbloqueada (' + scoreL1 + ' pts)' : 'Bloqueada (' + scoreL1 + '/15)'}</div>
    </div>

    <!-- Insignia 2 -->
    <div class="badge-card ${b2 ? 'unlocked' : 'locked'}">
      <div class="badge-icon">♻️</div>
      <div class="badge-title">Clasificador Consciente</div>
      <div class="badge-cond">Mínimo 20/30 en Nivel 2</div>
      <div class="badge-status">${b2 ? 'Desbloqueada (' + scoreL2 + ' pts)' : 'Bloqueada (' + scoreL2 + '/20)'}</div>
    </div>

    <!-- Insignia 3 -->
    <div class="badge-card ${b3 ? 'unlocked' : 'locked'}">
      <div class="badge-icon">🛡️</div>
      <div class="badge-title">Protector del Campus</div>
      <div class="badge-cond">Mínimo 35/50 en Nivel 3</div>
      <div class="badge-status">${b3 ? 'Desbloqueada (' + scoreL3 + ' pts)' : 'Bloqueada (' + scoreL3 + '/35)'}</div>
    </div>

    <!-- Insignia 4 / Certificado -->
    <div class="badge-card ${b4 ? 'unlocked' : 'locked'}">
      <div class="badge-icon">🏆</div>
      <div class="badge-title">Certificado Guardián del Planeta</div>
      <div class="badge-cond">70+ pts y 3+ casos Nivel 3</div>
      <div class="badge-status">${b4 ? '¡Logro Máximo Obtenido!' : 'Pendiente de Aprobación'}</div>
    </div>
  `;
}

// RENDERIZAR CERTIFICADO OFICIAL
function renderCertificate(passed) {
  const certContainer = document.getElementById("certificate-display-area");
  if (!certContainer) return;

  if (!passed) {
    certContainer.style.display = "none";
    return;
  }

  certContainer.style.display = "block";
  const now = new Date();
  const fechaStr = now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  certContainer.innerHTML = `
    <div class="certificate-wrapper" id="printable-certificate">
      <div class="cert-header">Proyecto Áulico Universitario · Grupo 11</div>
      <div class="cert-title">CERTIFICADO OFICIAL</div>
      <div style="font-weight:bold; color:var(--gold-dark); letter-spacing:1px; margin-bottom:12px;">GUARDIÁN DEL PLANETA</div>
      
      <p class="cert-text">Por haber demostrado conocimiento, criterio ambiental y resolución efectiva de situaciones de gestión de residuos en el campus universitario se certifica a:</p>
      
      <input type="text" class="cert-name-input" id="cert-student-input" value="${gameState.studentName}" placeholder="Escribe tu nombre y apellido" onchange="updateStudentName(this.value)">
      
      <p class="cert-text">
        Al completar con éxito la experiencia gamificada <b>“Guardianes del Planeta: Misión Reciclaje”</b> con una calificación de <b>${getTotalScore()}/100 puntos</b> y <b>${gameState.level3CorrectCases}/5 casos prácticos</b> resueltos con éxito.
      </p>

      <div class="cert-seal">🎖️ 🌎 ♻️</div>

      <div class="cert-footer">
        <div>
          <strong>Fecha de Emisión:</strong> ${fechaStr}<br>
          <strong>ID Verificación:</strong> GP-${Math.floor(100000 + Math.random() * 900000)}
        </div>
        <div style="text-align:right;">
          <strong>Ecosistema Educativo Inteligente</strong><br>
          <i>Manejo Adecuado de Residuos</i>
        </div>
      </div>
    </div>

    <div style="text-align:center; margin-top:16px;" class="no-print">
      <button class="btn gold" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
    </div>
  `;
}

function updateStudentName(val) {
  if (val && val.trim()) {
    gameState.studentName = val.trim();
    saveBestScore(getTotalScore());
  }
}

// ===================================================================
// ARQUITECTURA SEGURA PARA IA GENERATIVA (EcoGuardián IA)
// ===================================================================

/**
 * Función modular preparada para conectar con un endpoint seguro de backend/serverless
 * (por ejemplo: Vercel Functions, AWS Lambda, Cloud Run o Netlify Functions).
 * 
 * NO expone claves API en el frontend.
 * Utiliza un motor contextual seguro de alta fidelidad como respaldo offline.
 */
async function callEcoGuardianBackendAPI(contextPayload) {
  const SECURE_ENDPOINT = "/api/ecoguardian-hint"; 

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;

  try {
    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contextPayload)
    };
    if (controller) {
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(SECURE_ENDPOINT, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.hintText && typeof data.hintText === "string" && data.hintText.trim().length > 0) {
        return data.hintText.trim();
      }
    }
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    // Fallback silencioso sin exponer detalles técnicos en consola
  }

  return null;
}

// CONSULTOR INTERACTIVO EN LA PESTAÑA IA
async function askEcoGuardianAssistant() {
  const input = document.getElementById("ai-user-query");
  const chatBox = document.getElementById("ai-chat-messages");
  if (!input || !chatBox) return;

  const query = input.value.trim();
  if (!query) return;

  // Mensaje del usuario
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.textContent = query;
  chatBox.appendChild(userBubble);
  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  // Respuesta de IA
  const aiBubble = document.createElement("div");
  aiBubble.className = "chat-bubble ai";
  aiBubble.innerHTML = "<em>EcoGuardián está pensando...</em>";
  chatBox.appendChild(aiBubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    const qLower = query.toLowerCase();
    let reply = "Como tutor ambiental universitario, te sugiero recordar la jerarquía de las 3R (Reducir, Reutilizar y Reciclar). ¿De qué tipo de residuo te gustaría conocer la gestión correcta?";

    if (qLower.includes("pila") || qLower.includes("batería") || qLower.includes("cargador") || qLower.includes("electrónic")) {
      reply = "🔋 Los aparatos electrónicos y baterías son residuos de manejo especial. Contienen litio, plomo o cadmio y deben depositarse exclusivamente en contenedores autorizados (puntos RAEE).";
    } else if (qLower.includes("banana") || qLower.includes("manzana") || qLower.includes("fruta") || qLower.includes("comida") || qLower.includes("hoja")) {
      reply = "🌱 Son residuos orgánicos biodegradables. Si los separas de los materiales secos, pueden alimentar una compostera para fertilizar las zonas verdes del campus.";
    } else if (qLower.includes("botella") || qLower.includes("plástico") || qLower.includes("lata") || qLower.includes("aluminio") || qLower.includes("papel")) {
      reply = "♻️ Pertenecen a los residuos reciclables o aprovechables. La regla de oro es que deben estar vacíos, limpios y secos para que no dañen la celulosa ni fermenten.";
    } else if (qLower.includes("regla") || qLower.includes("nivel") || qLower.includes("punto") || qLower.includes("aprobar")) {
      reply = "🎯 La Misión Reciclaje evalúa 100 puntos en 3 niveles. Para aprobar necesitas mínimo 70 puntos y resolver acertadamente al menos 3 de los 5 casos de campus en el Nivel 3.";
    }

    aiBubble.innerHTML = `<strong>🤖 EcoGuardián IA:</strong><br>${reply}`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 600);
}

// ===================================================================
// MULTIMEDIA CON IA: ECOGUARDIÁN PRESENTADOR AMBIENTAL
// ===================================================================
let speechUtterance = null;

function speakPresenterText(type) {
  if (!('speechSynthesis' in window)) {
    alert("Tu navegador no soporta síntesis de voz, pero puedes leer el mensaje en pantalla.");
    return;
  }

  window.speechSynthesis.cancel();

  const scriptWelcome = "¡Hola, futuro Guardián del Planeta! Te doy la bienvenida a este ecosistema educativo inteligente. Nuestra misión es transformar nuestro campus universitario en un modelo de sustentabilidad mediante el reconocimiento, separación y manejo adecuado de residuos. ¡Acompáñame en esta misión y pon a prueba tus conocimientos!";
  const scriptMission = "En la Misión Reciclaje superarás tres fases consecutivas: primero el Radar Ambiental para reconocer cuatro residuos clave; segundo, la Estación de Separación para clasificar seis elementos en sus contenedores; y tercero, el Rescate del Campus, donde resolverás cinco dilemas reales. ¡Recuerda que cada decisión cuenta!";
  const scriptTips = "Consejo de Guardián: si cometes un primer error, no te desanimes. Tendrás una pista inteligente y una segunda oportunidad. Busca siempre el bienestar común y la prevención de la contaminación. ¡Vamos con todo por tu Certificado!";

  let selectedText = scriptWelcome;
  if (type === "mision") selectedText = scriptMission;
  if (type === "consejo") selectedText = scriptTips;

  const bubbleText = document.getElementById("presenter-bubble-text");
  if (bubbleText) bubbleText.textContent = selectedText;

  speechUtterance = new SpeechSynthesisUtterance(selectedText);
  speechUtterance.lang = "es-ES";
  speechUtterance.rate = 1.0;
  speechUtterance.pitch = 1.05;

  const avatarCircle = document.getElementById("presenter-avatar-circle");

  speechUtterance.onstart = () => {
    if (avatarCircle) avatarCircle.classList.add("speaking");
  };

  speechUtterance.onend = () => {
    if (avatarCircle) avatarCircle.classList.remove("speaking");
  };

  speechUtterance.onerror = () => {
    if (avatarCircle) avatarCircle.classList.remove("speaking");
  };

  window.speechSynthesis.speak(speechUtterance);
}

function stopPresenterVoice() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  const avatarCircle = document.getElementById("presenter-avatar-circle");
  if (avatarCircle) avatarCircle.classList.remove("speaking");
}

// ===================================================================
// SISTEMA DE NAVEGACIÓN Y PESTAÑAS DEL ECOSISTEMA
// ===================================================================
function goToTab(tabId) {
  // Desactivar todas las secciones
  document.querySelectorAll("main section").forEach(sec => sec.classList.remove("active"));
  
  // Activar la seleccionada
  const targetSec = document.getElementById(tabId);
  if (targetSec) targetSec.classList.add("active");

  // Actualizar botones de navegación
  document.querySelectorAll("nav button").forEach(btn => {
    btn.classList.remove("active-nav");
    const onclickAttr = btn.getAttribute("onclick") || "";
    if (onclickAttr.includes(`'${tabId}'`) || onclickAttr.includes(`"${tabId}"`)) {
      btn.classList.add("active-nav");
    }
  });

  // Si va a resultados, renderizar la vista de resultados
  if (tabId === "resultado") {
    renderResultsView();
  }

  // Scroll suave al inicio
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Compatibilidad con la función anterior `go(id)` del proyecto
function go(id) {
  goToTab(id);
}

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  updateHUD();
});
