// Pruebas de laboratorio habituales: cómo se llaman en los informes, su unidad habitual,
// otras unidades en las que pueden venir (para convertir sin líos) y unos valores de
// referencia ORIENTATIVOS. Los que valen son los del propio informe de cada laboratorio.

export interface UnidadAlternativa {
  unidad: string
  /** valor en la unidad habitual = valor en esta unidad × factor */
  factor: number
}

export interface Referencia {
  min?: number
  max?: number
}

export interface PruebaLab {
  clave: string
  nombre: string
  otrosNombres?: string[]
  /** Para la fórmula leucocitaria: "%" (porcentaje) o "#" (número absoluto). */
  variante?: '%' | '#'
  unidad: string
  otrasUnidades?: UnidadAlternativa[]
  ref?: Referencia
  refHombre?: Referencia
  refMujer?: Referencia
  grupo: string
  /** Para qué sirve, en palabras sencillas. */
  explicacion: string
}

const MIL_POR_UL: UnidadAlternativa[] = [
  { unidad: '/µL', factor: 0.001 },
  { unidad: '/mm³', factor: 0.001 },
  { unidad: '10e9/L', factor: 1 },
]

const GRUPO = {
  rojos: 'Glóbulos rojos',
  blancos: 'Glóbulos blancos y defensas',
  plaquetas: 'Plaquetas',
  azucar: 'Azúcar',
  rinon: 'Riñón',
  higado: 'Hígado y páncreas',
  sales: 'Sales minerales',
  hierro: 'Hierro',
  grasas: 'Colesterol y grasas',
  proteinas: 'Proteínas e inflamación',
  tiroides: 'Tiroides',
  hormonas: 'Hormonas',
  marcadores: 'Marcadores',
  vitaminas: 'Vitaminas',
  coagulacion: 'Coagulación',
  orina: 'Orina',
}

const formula = (nombre: string, clave: string, explicacion: string, refPct: Referencia, refAbs: Referencia): PruebaLab[] => [
  { clave: `${clave}-pct`, nombre: `${nombre} (%)`, otrosNombres: [nombre], variante: '%', unidad: '%', ref: refPct, grupo: GRUPO.blancos, explicacion },
  {
    clave: `${clave}-abs`,
    nombre: `${nombre} (número)`,
    otrosNombres: [nombre],
    variante: '#',
    unidad: '10e3/µL',
    otrasUnidades: MIL_POR_UL,
    ref: refAbs,
    grupo: GRUPO.blancos,
    explicacion,
  },
]

export const PRUEBAS: PruebaLab[] = [
  // Glóbulos rojos
  { clave: 'hematies', nombre: 'Hematíes', otrosNombres: ['eritrocitos', 'globulos rojos', 'recuento de hematies'], unidad: '10e6/µL', otrasUnidades: [{ unidad: '10e12/L', factor: 1 }], refHombre: { min: 4.3, max: 5.8 }, refMujer: { min: 3.8, max: 5.2 }, grupo: GRUPO.rojos, explicacion: 'Cantidad de glóbulos rojos, que llevan el oxígeno.' },
  { clave: 'hemoglobina', nombre: 'Hemoglobina', otrosNombres: ['hb', 'hgb'], unidad: 'g/dL', otrasUnidades: [{ unidad: 'g/L', factor: 0.1 }], refHombre: { min: 13, max: 17 }, refMujer: { min: 12, max: 16 }, grupo: GRUPO.rojos, explicacion: 'Lleva el oxígeno en la sangre. Si está baja, hay anemia.' },
  { clave: 'hematocrito', nombre: 'Hematocrito', otrosNombres: ['hto', 'hct'], unidad: '%', otrasUnidades: [{ unidad: 'L/L', factor: 100 }], refHombre: { min: 40, max: 52 }, refMujer: { min: 36, max: 47 }, grupo: GRUPO.rojos, explicacion: 'Parte de la sangre que son glóbulos rojos.' },
  { clave: 'vcm', nombre: 'Volumen corpuscular medio (VCM)', otrosNombres: ['vcm', 'volumen corpuscular medio', 'mcv'], unidad: 'fL', ref: { min: 80, max: 100 }, grupo: GRUPO.rojos, explicacion: 'Tamaño de los glóbulos rojos.' },
  { clave: 'hcm', nombre: 'Hemoglobina corpuscular media (HCM)', otrosNombres: ['hcm', 'hemoglobina corpuscular media', 'mch'], unidad: 'pg', ref: { min: 27, max: 33 }, grupo: GRUPO.rojos, explicacion: 'Hemoglobina que lleva cada glóbulo rojo.' },
  { clave: 'chcm', nombre: 'Concentración de hemoglobina corpuscular media (CHCM)', otrosNombres: ['chcm', 'conc hemoglobina corpuscular media', 'concentracion de hemoglobina corpuscular media', 'mchc'], unidad: 'g/dL', otrasUnidades: [{ unidad: 'g/L', factor: 0.1 }], ref: { min: 32, max: 36 }, grupo: GRUPO.rojos, explicacion: 'Concentración de hemoglobina en los glóbulos rojos.' },
  { clave: 'rdw', nombre: 'Índice de anisocitosis (RDW)', otrosNombres: ['rdw', 'indice de anisocitosis', 'ade'], unidad: '%', ref: { min: 11.5, max: 14.5 }, grupo: GRUPO.rojos, explicacion: 'Si los glóbulos rojos son de tamaños parecidos o muy distintos.' },

  // Glóbulos blancos
  { clave: 'leucocitos', nombre: 'Leucocitos', otrosNombres: ['globulos blancos', 'recuento de leucocitos', 'wbc'], unidad: '10e3/µL', otrasUnidades: MIL_POR_UL, ref: { min: 4, max: 11 }, grupo: GRUPO.blancos, explicacion: 'Las defensas. Suben con las infecciones.' },
  ...formula('Neutrófilos', 'neutrofilos', 'Defensas que luchan contra las bacterias.', { min: 40, max: 75 }, { min: 1.8, max: 7.5 }),
  ...formula('Linfocitos', 'linfocitos', 'Defensas que luchan contra los virus.', { min: 20, max: 45 }, { min: 1, max: 4 }),
  ...formula('Monocitos', 'monocitos', 'Defensas que limpian restos y gérmenes.', { min: 2, max: 10 }, { min: 0.2, max: 1 }),
  ...formula('Eosinófilos', 'eosinofilos', 'Defensas que suben con alergias y parásitos.', { min: 0, max: 6 }, { min: 0, max: 0.5 }),
  ...formula('Basófilos', 'basofilos', 'Defensas que participan en las alergias.', { min: 0, max: 2 }, { min: 0, max: 0.2 }),

  // Plaquetas
  { clave: 'plaquetas', nombre: 'Plaquetas', otrosNombres: ['recuento de plaquetas', 'plt'], unidad: '10e3/µL', otrasUnidades: MIL_POR_UL, ref: { min: 150, max: 400 }, grupo: GRUPO.plaquetas, explicacion: 'Ayudan a que la sangre coagule al hacerse una herida.' },
  { clave: 'vpm', nombre: 'Volumen plaquetar medio (VPM)', otrosNombres: ['vpm', 'volumen plaquetar medio', 'volumen plaquetario medio', 'mpv'], unidad: 'fL', ref: { min: 7, max: 12 }, grupo: GRUPO.plaquetas, explicacion: 'Tamaño de las plaquetas.' },

  // Azúcar
  { clave: 'glucosa', nombre: 'Glucosa', otrosNombres: ['glucosa basal', 'glucemia', 'glucosa en ayunas', 'glu'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 18.016 }], ref: { min: 70, max: 100 }, grupo: GRUPO.azucar, explicacion: 'Azúcar en la sangre, en ayunas.' },
  { clave: 'hba1c', nombre: 'Hemoglobina glicada (HbA1c)', otrosNombres: ['hemoglobina a1c', 'hba1c', 'hemoglobina glicosilada', 'glicohemoglobina'], unidad: '%', ref: { max: 5.7 }, grupo: GRUPO.azucar, explicacion: 'La media del azúcar de los últimos 3 meses.' },
  { clave: 'insulina', nombre: 'Insulina', otrosNombres: ['insulina basal'], unidad: 'µUI/mL', otrasUnidades: [{ unidad: 'mUI/L', factor: 1 }], ref: { min: 2, max: 25 }, grupo: GRUPO.azucar, explicacion: 'Hormona que baja el azúcar.' },
  { clave: 'homa', nombre: 'Índice HOMA', otrosNombres: ['indice homa', 'homa', 'indice homa resistencia a la insulina', 'homa ir'], unidad: '', ref: { max: 3.8 }, grupo: GRUPO.azucar, explicacion: 'Si el cuerpo responde bien a la insulina.' },

  // Riñón
  { clave: 'urea', nombre: 'Urea', unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 6.006 }], ref: { min: 15, max: 50 }, grupo: GRUPO.rinon, explicacion: 'Desecho que eliminan los riñones.' },
  { clave: 'creatinina', nombre: 'Creatinina', otrosNombres: ['creatinina en suero', 'creatinina serica'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'µmol/L', factor: 0.01131 }], refHombre: { min: 0.7, max: 1.3 }, refMujer: { min: 0.5, max: 1.1 }, grupo: GRUPO.rinon, explicacion: 'Dice cómo funcionan los riñones. Si sube, filtran peor.' },
  { clave: 'filtrado', nombre: 'Filtrado glomerular', otrosNombres: ['filtrado glomerular estimado', 'fg', 'fge', 'egfr', 'ckd epi'], unidad: 'mL/min/1,73m²', ref: { min: 60 }, grupo: GRUPO.rinon, explicacion: 'Cuánta sangre limpian los riñones. Más de 60 es lo normal.' },
  { clave: 'acido-urico', nombre: 'Ácido úrico', otrosNombres: ['acido urico', 'urato'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'µmol/L', factor: 0.01681 }], refHombre: { min: 3.5, max: 7.2 }, refMujer: { min: 2.6, max: 6 }, grupo: GRUPO.rinon, explicacion: 'Si está alto puede dar gota.' },
  { clave: 'cociente-albumina-creatinina', nombre: 'Cociente albúmina/creatinina en orina', otrosNombres: ['microalbuminuria', 'cociente albumina creatinina', 'albumina creatinina orina'], unidad: 'mg/g', ref: { max: 30 }, grupo: GRUPO.rinon, explicacion: 'Si el riñón deja escapar proteína a la orina.' },

  // Hígado y páncreas
  { clave: 'got', nombre: 'GOT (AST)', otrosNombres: ['asat', 'ast', 'got', 'asat got', 'got ast', 'aspartato aminotransferasa'], unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { max: 40 }, grupo: GRUPO.higado, explicacion: 'Enzima del hígado (y del músculo).' },
  { clave: 'gpt', nombre: 'GPT (ALT)', otrosNombres: ['alat', 'alt', 'gpt', 'alat gpt', 'gpt alt', 'alanina aminotransferasa'], unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { max: 40 }, grupo: GRUPO.higado, explicacion: 'Enzima del hígado.' },
  { clave: 'ggt', nombre: 'Gamma-GT (GGT)', otrosNombres: ['gamma gt', 'ggt', 'gamma glutamil transferasa', 'gamma glutamiltransferasa'], unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { max: 55 }, grupo: GRUPO.higado, explicacion: 'Enzima del hígado. Sube con el alcohol y algunos medicamentos.' },
  { clave: 'fosfatasa-alcalina', nombre: 'Fosfatasa alcalina', otrosNombres: ['fa', 'falc'], unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { min: 40, max: 130 }, grupo: GRUPO.higado, explicacion: 'Enzima del hígado y de los huesos.' },
  { clave: 'bilirrubina-total', nombre: 'Bilirrubina total', otrosNombres: ['bilirrubina'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'µmol/L', factor: 0.05848 }], ref: { max: 1.2 }, grupo: GRUPO.higado, explicacion: 'Si está alta, la piel y los ojos se ponen amarillos.' },
  { clave: 'bilirrubina-directa', nombre: 'Bilirrubina directa', unidad: 'mg/dL', otrasUnidades: [{ unidad: 'µmol/L', factor: 0.05848 }], ref: { max: 0.3 }, grupo: GRUPO.higado, explicacion: 'Parte de la bilirrubina que pasa por el hígado.' },
  { clave: 'ldh', nombre: 'LDH', otrosNombres: ['lactato deshidrogenasa', 'ldh'], unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { min: 125, max: 220 }, grupo: GRUPO.higado, explicacion: 'Enzima que sube cuando se dañan células.' },
  { clave: 'ck', nombre: 'CK (creatín quinasa)', otrosNombres: ['ck', 'cpk', 'creatin quinasa', 'creatina quinasa', 'creatinquinasa'], unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { min: 30, max: 200 }, grupo: GRUPO.higado, explicacion: 'Enzima de los músculos.' },
  { clave: 'lipasa', nombre: 'Lipasa', unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { min: 8, max: 78 }, grupo: GRUPO.higado, explicacion: 'Enzima del páncreas.' },
  { clave: 'amilasa', nombre: 'Amilasa', unidad: 'U/L', otrasUnidades: [{ unidad: 'UI/L', factor: 1 }], ref: { min: 25, max: 125 }, grupo: GRUPO.higado, explicacion: 'Enzima del páncreas.' },

  // Sales minerales
  { clave: 'sodio', nombre: 'Sodio', otrosNombres: ['na'], unidad: 'mmol/L', otrasUnidades: [{ unidad: 'mEq/L', factor: 1 }], ref: { min: 135, max: 145 }, grupo: GRUPO.sales, explicacion: 'La sal del cuerpo.' },
  { clave: 'potasio', nombre: 'Potasio', otrosNombres: ['k'], unidad: 'mmol/L', otrasUnidades: [{ unidad: 'mEq/L', factor: 1 }], ref: { min: 3.5, max: 5.1 }, grupo: GRUPO.sales, explicacion: 'Importante para el corazón y los músculos.' },
  { clave: 'cloro', nombre: 'Cloro', otrosNombres: ['cl', 'cloruro'], unidad: 'mmol/L', otrasUnidades: [{ unidad: 'mEq/L', factor: 1 }], ref: { min: 98, max: 107 }, grupo: GRUPO.sales, explicacion: 'Sal del cuerpo, va junto al sodio.' },
  { clave: 'calcio', nombre: 'Calcio', otrosNombres: ['ca', 'calcio total'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 4.008 }], ref: { min: 8.5, max: 10.5 }, grupo: GRUPO.sales, explicacion: 'Para los huesos, los músculos y los nervios.' },
  { clave: 'calcio-corregido', nombre: 'Calcio corregido por albúmina', otrosNombres: ['calcio corregido', 'calcio corregido por albumina'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 4.008 }], ref: { min: 8.5, max: 10.5 }, grupo: GRUPO.sales, explicacion: 'El calcio ajustado según las proteínas de la sangre.' },
  { clave: 'magnesio', nombre: 'Magnesio', otrosNombres: ['mg'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 2.431 }], ref: { min: 1.6, max: 2.6 }, grupo: GRUPO.sales, explicacion: 'Mineral para los músculos y los nervios.' },
  { clave: 'fosforo', nombre: 'Fósforo', otrosNombres: ['fosfato', 'p'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 3.097 }], ref: { min: 2.5, max: 4.5 }, grupo: GRUPO.sales, explicacion: 'Mineral de los huesos.' },

  // Hierro
  { clave: 'hierro', nombre: 'Hierro', otrosNombres: ['sideremia', 'hierro serico', 'fe'], unidad: 'µg/dL', otrasUnidades: [{ unidad: 'µmol/L', factor: 5.585 }], ref: { min: 50, max: 170 }, grupo: GRUPO.hierro, explicacion: 'Hierro en la sangre en este momento.' },
  { clave: 'ferritina', nombre: 'Ferritina', unidad: 'ng/mL', otrasUnidades: [{ unidad: 'µg/L', factor: 1 }], refHombre: { min: 30, max: 400 }, refMujer: { min: 15, max: 150 }, grupo: GRUPO.hierro, explicacion: 'El hierro que el cuerpo tiene guardado.' },
  { clave: 'transferrina', nombre: 'Transferrina', unidad: 'mg/dL', otrasUnidades: [{ unidad: 'g/L', factor: 100 }], ref: { min: 200, max: 360 }, grupo: GRUPO.hierro, explicacion: 'La proteína que transporta el hierro.' },
  { clave: 'saturacion-transferrina', nombre: 'Índice de saturación de transferrina', otrosNombres: ['indice de saturacion de transferrina', 'saturacion de transferrina', 'ist', 'ist transferrina'], unidad: '%', ref: { min: 20, max: 45 }, grupo: GRUPO.hierro, explicacion: 'Cuánto hierro va cargado en la transferrina.' },

  // Colesterol y grasas
  { clave: 'colesterol-total', nombre: 'Colesterol total', otrosNombres: ['colesterol'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 38.67 }], ref: { max: 200 }, grupo: GRUPO.grasas, explicacion: 'Todo el colesterol de la sangre.' },
  { clave: 'hdl', nombre: 'Colesterol HDL («bueno»)', otrosNombres: ['hdl colesterol', 'colesterol hdl', 'hdl', 'hdl col', 'c hdl'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 38.67 }], refHombre: { min: 40 }, refMujer: { min: 50 }, grupo: GRUPO.grasas, explicacion: 'El colesterol «bueno»: cuanto más, mejor.' },
  { clave: 'ldl', nombre: 'Colesterol LDL («malo»)', otrosNombres: ['ldl colesterol', 'colesterol ldl', 'ldl', 'ldl col', 'c ldl'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 38.67 }], ref: { max: 130 }, grupo: GRUPO.grasas, explicacion: 'El colesterol «malo». Tu objetivo depende de tu riesgo: pregúntalo a tu médico.' },
  { clave: 'no-hdl', nombre: 'Colesterol no-HDL', otrosNombres: ['colesterol no hdl', 'no hdl'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 38.67 }], ref: { max: 160 }, grupo: GRUPO.grasas, explicacion: 'Todo el colesterol menos el «bueno».' },
  { clave: 'trigliceridos', nombre: 'Triglicéridos', otrosNombres: ['tg'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'mmol/L', factor: 88.57 }], ref: { max: 150 }, grupo: GRUPO.grasas, explicacion: 'Grasas de la sangre. Suben con el azúcar y el alcohol.' },
  { clave: 'indice-col-hdl', nombre: 'Índice colesterol total / HDL', otrosNombres: ['indice col total hdl col', 'indice colesterol total hdl', 'cociente colesterol hdl', 'indice aterogenico'], unidad: '', ref: { max: 5 }, grupo: GRUPO.grasas, explicacion: 'Relación entre el colesterol total y el bueno.' },
  { clave: 'indice-ldl-hdl', nombre: 'Índice LDL / HDL', otrosNombres: ['indice ldl col hdl col', 'indice ldl hdl', 'cociente ldl hdl'], unidad: '', ref: { max: 3.5 }, grupo: GRUPO.grasas, explicacion: 'Relación entre el colesterol malo y el bueno.' },
  { clave: 'apo-a1', nombre: 'Apolipoproteína A1', otrosNombres: ['apolipoproteina a1', 'apo a1', 'apoa1'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'g/L', factor: 100 }], ref: { min: 95, max: 186 }, grupo: GRUPO.grasas, explicacion: 'Proteína del colesterol bueno.' },
  { clave: 'apo-b', nombre: 'Apolipoproteína B', otrosNombres: ['apolipoproteina b', 'apo b', 'apob'], unidad: 'mg/dL', otrasUnidades: [{ unidad: 'g/L', factor: 100 }], ref: { min: 49, max: 173 }, grupo: GRUPO.grasas, explicacion: 'Proteína del colesterol malo.' },
  { clave: 'lpa', nombre: 'Lipoproteína (a)', otrosNombres: ['lipoproteina a', 'lp a', 'lpa'], unidad: 'mg/dL', ref: { max: 30 }, grupo: GRUPO.grasas, explicacion: 'Tipo de colesterol que se hereda.' },

  // Proteínas e inflamación
  { clave: 'pcr', nombre: 'Proteína C reactiva (PCR)', otrosNombres: ['proteina c reactiva', 'pcr', 'proteina c reactiva hs', 'proteina c reactiva hs alta sensibilidad', 'pcr ultrasensible'], unidad: 'mg/L', otrasUnidades: [{ unidad: 'mg/dL', factor: 10 }], ref: { max: 5 }, grupo: GRUPO.proteinas, explicacion: 'Sube cuando hay inflamación o infección.' },
  { clave: 'vsg', nombre: 'Velocidad de sedimentación (VSG)', otrosNombres: ['vsg', 'velocidad de sedimentacion', 'vsg 1 hora'], unidad: 'mm/h', ref: { max: 20 }, grupo: GRUPO.proteinas, explicacion: 'Otra forma de ver si hay inflamación.' },
  { clave: 'proteinas-totales', nombre: 'Proteínas totales', otrosNombres: ['proteinas totales', 'proteinas'], unidad: 'g/dL', otrasUnidades: [{ unidad: 'g/L', factor: 0.1 }], ref: { min: 6.3, max: 7.9 }, grupo: GRUPO.proteinas, explicacion: 'Todas las proteínas de la sangre.' },
  { clave: 'albumina', nombre: 'Albúmina', otrosNombres: ['albumina', 'albumina suero', 'albumina serica'], unidad: 'g/dL', otrasUnidades: [{ unidad: 'g/L', factor: 0.1 }], ref: { min: 3.5, max: 5 }, grupo: GRUPO.proteinas, explicacion: 'La proteína principal de la sangre. Baja si hay desnutrición.' },

  // Tiroides y hormonas
  { clave: 'tsh', nombre: 'TSH', otrosNombres: ['tsh', 'tirotropina', 'hormona estimulante del tiroides'], unidad: 'µUI/mL', otrasUnidades: [{ unidad: 'mUI/L', factor: 1 }], ref: { min: 0.35, max: 4.94 }, grupo: GRUPO.tiroides, explicacion: 'La señal que manda el cerebro al tiroides. Sube si el tiroides funciona poco.' },
  { clave: 't4-libre', nombre: 'T4 libre', otrosNombres: ['t4 libre', 't4l', 'tiroxina libre', 'ft4'], unidad: 'ng/dL', otrasUnidades: [{ unidad: 'pmol/L', factor: 0.0777 }], ref: { min: 0.7, max: 1.48 }, grupo: GRUPO.tiroides, explicacion: 'Hormona del tiroides.' },
  { clave: 't3-libre', nombre: 'T3 libre', otrosNombres: ['t3 libre', 't3l', 'ft3'], unidad: 'pg/mL', otrasUnidades: [{ unidad: 'pmol/L', factor: 0.651 }], ref: { min: 1.7, max: 3.5 }, grupo: GRUPO.tiroides, explicacion: 'Hormona del tiroides.' },

  // Marcadores
  { clave: 'psa', nombre: 'PSA', otrosNombres: ['psa', 'psa total', 'antigeno prostatico especifico'], unidad: 'ng/mL', otrasUnidades: [{ unidad: 'µg/L', factor: 1 }], ref: { max: 4 }, grupo: GRUPO.marcadores, explicacion: 'Proteína de la próstata. Se vigila a partir de cierta edad.' },
  { clave: 'psa-libre', nombre: 'PSA libre', otrosNombres: ['psa libre'], unidad: 'ng/mL', grupo: GRUPO.marcadores, explicacion: 'Se mira junto al PSA cuando este sale algo alto.' },
  { clave: 'cea', nombre: 'CEA', otrosNombres: ['cea', 'antigeno carcinoembrionario'], unidad: 'ng/mL', ref: { max: 5 }, grupo: GRUPO.marcadores, explicacion: 'Marcador que se usa en seguimientos. Sube algo en fumadores.' },
  { clave: 'ca19-9', nombre: 'CA 19-9', otrosNombres: ['ca 19 9', 'ca19 9'], unidad: 'U/mL', otrasUnidades: [{ unidad: 'UI/mL', factor: 1 }], ref: { max: 37 }, grupo: GRUPO.marcadores, explicacion: 'Marcador que se usa en seguimientos.' },

  // Vitaminas
  { clave: 'vitamina-d', nombre: 'Vitamina D', otrosNombres: ['vitamina d 25 hidroxi', '25 oh vitamina d', '25 hidroxivitamina d', 'calcidiol', 'vitamina d3'], unidad: 'ng/mL', otrasUnidades: [{ unidad: 'nmol/L', factor: 0.4 }], ref: { min: 30, max: 100 }, grupo: GRUPO.vitaminas, explicacion: 'Para los huesos. Se fabrica con el sol.' },
  { clave: 'vitamina-b12', nombre: 'Vitamina B12', otrosNombres: ['vitamina b12', 'cobalamina', 'b12'], unidad: 'pg/mL', otrasUnidades: [{ unidad: 'pmol/L', factor: 1.355 }], ref: { min: 200, max: 900 }, grupo: GRUPO.vitaminas, explicacion: 'Para la sangre y los nervios.' },
  { clave: 'acido-folico', nombre: 'Ácido fólico', otrosNombres: ['acido folico', 'folato', 'folatos'], unidad: 'ng/mL', otrasUnidades: [{ unidad: 'nmol/L', factor: 0.4413 }], ref: { min: 3.5 }, grupo: GRUPO.vitaminas, explicacion: 'Vitamina para la sangre.' },

  // Coagulación
  { clave: 'inr', nombre: 'INR', otrosNombres: ['inr', 'indice internacional normalizado'], unidad: '', grupo: GRUPO.coagulacion, explicacion: 'Lo rápido que coagula la sangre. Con Sintrom, tu médico te dirá tu objetivo (suele ser entre 2 y 3).' },

  // Orina
  { clave: 'densidad-orina', nombre: 'Densidad de la orina', otrosNombres: ['densidad', 'densidad orina'], unidad: '', ref: { min: 1.005, max: 1.03 }, grupo: GRUPO.orina, explicacion: 'Lo concentrada que está la orina.' },
]
