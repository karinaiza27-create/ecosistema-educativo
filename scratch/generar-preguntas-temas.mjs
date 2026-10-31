// scratch/generar-preguntas-temas.mjs · Genera preguntas de quiz completas para los 4 temas actualizados

import fs from "fs/promises";

const TEMAS = [
  {
    id: "tem_000001",
    titulo: "Cultivos Sostenibles y Prácticas Agroecológicas",
    conceptos: [
      { t: "Abono", d: "Sustancia orgánica o mineral que mejora la fertilidad del suelo y aporta nutrientes a las plantas." },
      { t: "Compost", d: "Abono orgánico obtenido de la descomposición controlada de restos biológicos y vegetales." },
      { t: "Rotacion", d: "Alternancia secuencial de diferentes especies de plantas en una misma parcela de cultivo." },
      { t: "Agroecologia", d: "Enfoque agronómico que aplica principios ecológicos al diseño y gestión de sistemas agrícolas." },
      { t: "Cobertura", d: "Manto vegetal vivo o acolchado orgánico que protege el suelo contra la erosión y deshidratación." }
    ]
  },
  {
    id: "tem_000002",
    titulo: "Manejo Pecuario Sostenible y Cuidado de Animales de Granja",
    conceptos: [
      { t: "Pastoreo", d: "Alimentación directa del ganado mediante el consumo de pasturas en potreros seleccionados." },
      { t: "Bienestar", d: "Estado integral de salud, confort, nutrición y ausencia de estrés en los animales de granja." },
      { t: "Forraje", d: "Plantas gramíneas o leguminosas cultivadas específicamente para nutrir al ganado." },
      { t: "Sanidad", d: "Conjunto de medidas higiénicas y sanitarias para prevenir y controlar enfermedades animales." },
      { t: "Potrero", d: "Área de terreno cercada con pastos delimitada para el pastoreo ordenado del ganado." }
    ]
  },
  {
    id: "tem_000003",
    titulo: "Impacto y Control de la Contaminación del Agua, Aire y Suelo",
    conceptos: [
      { t: "Emision", d: "Liberación directa de contaminantes gaseosos o particulados hacia la atmósfera." },
      { t: "Efluente", d: "Descarga líquida de origen doméstico o industrial vertida hacia ríos, lagos o mares." },
      { t: "Lixiviado", d: "Líquido altamente contaminante generado por la filtración de agua a través de residuos sólidos." },
      { t: "Remediacion", d: "Conjunto de métodos biológicos o químicos para eliminar contaminantes y restaurar un área afectada." },
      { t: "Polucion", d: "Presencia de sustancias o formas de energía nocivas en el medio ambiente que alteran su equilibrio." }
    ]
  },
  {
    id: "tem_000004",
    titulo: "Reciclaje, Valorización de Residuos y Guardianes del Planeta",
    conceptos: [
      { t: "Reciclaje", d: "Transformación de residuos aprovechables para reincorporarlos como materia prima en nuevos ciclos." },
      { t: "Compostaje", d: "Tratamiento biológico aerobio de residuos orgánicos para transformarlos en abono enriquecido." },
      { t: "Reutilizar", d: "Dar un nuevo uso a un producto o envase para alargar su vida útil antes de reciclarlo." },
      { t: "Separacion", d: "Clasificación inicial de los residuos en el hogar o escuela en contenedores diferenciados." },
      { t: "Circular", d: "Economía que busca mantener productos, materiales y recursos en uso constante sin generar basura." }
    ]
  }
];

async function generar() {
  const preguntas = [];
  let contador = 1;

  for (const tema of TEMAS) {
    for (let nivel = 1; nivel <= 5; nivel++) {
      for (let i = 0; i < tema.conceptos.length; i++) {
        const c = tema.conceptos[i];
        const distractor1 = tema.conceptos[(i + 1) % tema.conceptos.length];
        const distractor2 = tema.conceptos[(i + 2) % tema.conceptos.length];

        // 1. Pregunta de opción múltiple
        preguntas.push({
          id: `pre_${String(contador++).padStart(6, "0")}`,
          fecha: new Date().toISOString(),
          temaId: tema.id,
          nivel,
          tipo: "opcion",
          enunciado: `¿Cuál de las siguientes afirmaciones define correctamente el concepto de "${c.t}" en el contexto de ${tema.titulo}?`,
          opciones: [
            c.d,
            `Práctica que contradice los principios ecológicos de ${tema.titulo}.`,
            distractor1.d,
            distractor2.d
          ],
          correcta: 0,
          retroalimentacion: `Es correcta porque ${c.t} se define como: ${c.d}.`,
          origen: "docente",
          estado: "aprobado"
        });

        // 2. Pregunta de Verdadero / Falso
        preguntas.push({
          id: `pre_${String(contador++).padStart(6, "0")}`,
          fecha: new Date().toISOString(),
          temaId: tema.id,
          nivel,
          tipo: "vf",
          enunciado: `En ${tema.titulo}, el concepto "${c.t}" hace referencia a: ${c.d}`,
          opciones: ["Verdadero", "Falso"],
          correcta: true,
          retroalimentacion: `Es verdadero. ${c.t} se define precisamente como ${c.d}.`,
          origen: "docente",
          estado: "aprobado"
        });

        // 3. Pregunta de completar
        preguntas.push({
          id: `pre_${String(contador++).padStart(6, "0")}`,
          fecha: new Date().toISOString(),
          temaId: tema.id,
          nivel,
          tipo: "completar",
          enunciado: `El término fundamental que se define como "${c.d}" corresponde a: ____.`,
          correcta: c.t.toUpperCase(),
          retroalimentacion: `El término correcto es ${c.t.toUpperCase()}.`,
          origen: "docente",
          estado: "aprobado"
        });
      }
    }
  }

  await fs.writeFile("datos/preguntas.json", JSON.stringify(preguntas, null, 2), "utf8");
  console.log(`Se generaron ${preguntas.length} preguntas de quiz aprobadas para los 4 temas.`);
}

generar().catch(console.error);
