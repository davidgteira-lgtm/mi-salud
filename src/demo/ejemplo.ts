// Personas de ejemplo con datos INVENTADOS, para enseñar la app (por ejemplo, al jurado)
// sin usar datos de nadie. Las fechas van en relación con el día de hoy, para que
// las citas próximas sigan siendo próximas y las vacunas «toquen» cuando se mire.
import { guardarAdjuntos, type AdjuntoNuevo } from '../db/adjuntos'
import { guardarAlergia } from '../db/alergias'
import { guardarAnalitica } from '../db/analiticas'
import { guardarCiclo } from '../db/ciclos'
import { guardarCita } from '../db/citas'
import { guardarMedida } from '../db/constantes'
import { guardarDatos } from '../db/datosSanitarios'
import { db } from '../db/db'
import { guardarDental, llevaFactura } from '../db/dental'
import { infoTipoDental, nombreDiente } from '../datos/dientes'
import { guardarBaja } from '../db/bajas'
import { guardarHistorial } from '../db/historial'
import { dejarDeTomar, guardarMedicamento } from '../db/medicamentos'
import { guardarOcular } from '../db/ojos'
import { borrarPerfil, crearPerfil } from '../db/perfiles'
import { marcarTomada } from '../db/tomas'
import { guardarPropia, guardarRegistro } from '../db/revisiones'
import { guardarContacto } from '../db/telefonos'
import type { Baja, FechaISO, ResultadoAnalisis, RevisionOcular } from '../db/tipos'
import { buscarPrueba } from '../utils/analisis'
import { sumarDias } from '../utils/ciclos'
import { hoyISO } from '../utils/fechas'
import { crearPdf, fechaEs, type LineaPdf } from './pdfFalso'
// Fotos libres de derechos: Pexels 5959404 (Rosa) y Unsplash photo-1758600433363-eaa446a1ac84 (Lucía).
import fotoLucia from '../assets/perfiles/lucia.jpg'
import fotoRosa from '../assets/perfiles/rosa.jpg'

/** Números «al azar» pero siempre los mismos, para que el ejemplo no cambie cada vez. */
function azar(semilla: number) {
  let s = semilla
  return (min: number, max: number) => {
    s = (s * 1103515245 + 12345) % 2147483648
    return min + Math.round((s / 2147483648) * (max - min))
  }
}

/** Un resultado de análisis, reconociendo la prueba como lo haría al pegar un informe. */
function r(nombre: string, valor: number, unidad: string, refMin?: number, refMax?: number): ResultadoAnalisis {
  return { clave: buscarPrueba(nombre, unidad)?.clave, nombre, valor, unidad: unidad || undefined, refMin, refMax }
}

/** Sube cuando los datos de ejemplo cambian: así se avisa a quien tenga los antiguos. */
export const VERSION_EJEMPLOS = 4

export async function borrarEjemplos(): Promise<void> {
  const ejemplos = await db.perfiles.filter((p) => !!p.ejemplo).toArray()
  for (const p of ejemplos) await borrarPerfil(p.id)
}

export async function hayEjemplos(): Promise<boolean> {
  return (await db.perfiles.filter((p) => !!p.ejemplo).count()) > 0
}

/** Crea (o vuelve a crear) las dos personas de ejemplo. Devuelve la principal. */
export async function crearEjemplos(hoy: FechaISO = hoyISO()): Promise<string> {
  await borrarEjemplos()
  const dia = (n: number) => sumarDias(hoy, n)
  const ano = Number(hoy.slice(0, 4))
  const rosa = await crearRosa(dia, ano)
  const lucia = await crearLucia(dia, ano)
  // Documentos inventados unidos a sus registros, para poder abrirlos.
  for (const id of [rosa, lucia]) await adjuntarDocumentos(id)
  return rosa
}

async function crearRosa(dia: (n: number) => FechaISO, ano: number): Promise<string> {
  const p = await crearPerfil({
    nombre: 'Rosa (ejemplo)',
    foto: await fotoDe(fotoRosa),
    fechaNacimiento: `${ano - 71}-11-12`,
    sexo: 'mujer',
    color: '#6a5fa8',
    ejemplo: true,
    ejemploVersion: VERSION_EJEMPLOS,
  })
  const id = p.id

  await guardarDatos(id, {
    grupoSanguineo: 'A+',
    tarjetaSanitaria: 'EJEMPLO 0000 0000 00',
    centroSalud: 'Centro de Salud Ejemplo',
    medicoCabecera: 'Dra. Ejemplo',
    avisos: 'Toma anticoagulante (Sintrom).\nUsa audífono en el oído derecho.',
    contactos: [
      { nombre: 'Lucía (ejemplo)', relacion: 'Hija', telefono: '600 000 001' },
      { nombre: 'Andrés (ejemplo)', relacion: 'Vecino', telefono: '600 000 002' },
    ],
  })

  await guardarAlergia(id, {
    tipo: 'medicamento',
    clase: 'alergia',
    nombre: 'Penicilina',
    gravedad: 'grave',
    reaccion: 'Ronchas y le costaba respirar',
  })
  await guardarAlergia(id, {
    tipo: 'medicamento',
    clase: 'alergia',
    nombre: 'Ibuprofeno',
    gravedad: 'moderada',
    reaccion: 'Hinchazón de labios',
  })
  await guardarAlergia(id, { tipo: 'alimento', clase: 'intolerancia', nombre: 'Lactosa', gravedad: 'leve', reaccion: 'Molestias de tripa' })

  await guardarMedicamento(id, {
    nombre: 'Sintrom 4 mg',
    dosis: 'Según la hoja de control',
    momentos: [],
    horas: ['20:00'],
    paraQue: 'Arritmia (que no se formen coágulos)',
    familia: 'Anticoagulante',
    fechaInicio: `${ano - 6}-03-15`,
    activo: 1,
  })
  await guardarMedicamento(id, {
    nombre: 'Enalapril 20 mg',
    dosis: '1 comprimido',
    momentos: [],
    horas: ['08:00'],
    paraQue: 'La tensión',
    fechaInicio: `${ano - 14}-05-02`,
    activo: 1,
  })
  await guardarMedicamento(id, {
    nombre: 'Atorvastatina 20 mg',
    dosis: '1 comprimido',
    momentos: [],
    horas: ['21:30'],
    paraQue: 'El colesterol',
    fechaInicio: `${ano - 4}-09-20`,
    activo: 1,
  })
  await guardarMedicamento(id, {
    nombre: 'Metformina 850 mg',
    dosis: '1 comprimido',
    momentos: [],
    horas: ['08:30', '21:00'],
    paraQue: 'El azúcar',
    fechaInicio: `${ano - 8}-01-10`,
    activo: 1,
  })
  await guardarMedicamento(id, {
    nombre: 'Pantoprazol 40 mg',
    dosis: '1 cápsula',
    momentos: [],
    horas: ['07:30'],
    paraQue: 'Proteger el estómago',
    fechaInicio: dia(-120),
    activo: 1,
  })
  const omeprazol = await guardarMedicamento(id, {
    nombre: 'Omeprazol 20 mg',
    dosis: '1 cápsula',
    momentos: ['desayuno'],
    paraQue: 'Proteger el estómago',
    fechaInicio: `${ano - 5}-02-01`,
    activo: 1,
  })
  await dejarDeTomar(omeprazol, dia(-121))

  // Tomas: los días pasados, casi todo «Tomada» (una se le olvidó). Hoy, lo que ya tocaba, salvo la metformina.
  const ahora = new Date()
  const horaAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  const hoyReal = hoyISO(ahora)
  for (const med of await db.medicamentos
    .where('perfilId')
    .equals(id)
    .filter((m) => m.activo === 1)
    .toArray()) {
    for (const hora of med.horas ?? []) {
      for (let n = -3; n <= 0; n++) {
        const fecha = sumarDias(hoyReal, n)
        const olvidada = n === -1 && med.nombre.startsWith('Metformina') && hora === '21:00'
        const pendienteHoy = n === 0 && (hora > horaAhora || med.nombre.startsWith('Metformina'))
        if (olvidada || pendienteHoy) continue
        const [h, mi] = hora.split(':').map(Number)
        const cuando = new Date(`${fecha}T${hora}`).getTime() + ((h * 7 + mi) % 25) * 60_000
        await marcarTomada(id, med.id, { fecha, hora }, cuando)
      }
    }
  }

  // Bajas de cuando trabajaba.
  await guardarBaja(id, {
    inicio: `${ano - 8}-02-11`,
    fin: `${ano - 8}-03-04`,
    tipo: 'comun',
    motivo: 'Lumbalgia',
    diagnostico: 'Dolor lumbar con ciática',
    medico: 'Dra. Ejemplo',
    centro: 'Centro de Salud Ejemplo',
    empresa: 'Comercio Ejemplo S. A.',
    confirmaciones: [`${ano - 8}-02-18`, `${ano - 8}-02-25`],
    tipoAlta: 'curacion',
  })
  await guardarBaja(id, {
    inicio: `${ano - 7}-05-06`,
    fin: `${ano - 7}-06-14`,
    tipo: 'accidente-laboral',
    motivo: 'Esguince de muñeca',
    diagnostico: 'Caída en el almacén. Esguince de muñeca derecha',
    medico: 'Dr. Ejemplo',
    centro: 'Mutua Ejemplo',
    empresa: 'Comercio Ejemplo S. A.',
    confirmaciones: [`${ano - 7}-05-13`, `${ano - 7}-05-27`, `${ano - 7}-06-10`],
    tipoAlta: 'mejoria',
    notas: 'Rehabilitación en la mutua tres semanas.',
  })
  // Citas: próximas y pasadas.
  await guardarCita(id, {
    fecha: dia(3),
    hora: '10:30',
    especialidad: 'Cardiología',
    medico: 'Dr. Ejemplo',
    lugar: 'Hospital Ejemplo, consulta 12',
    motivo: 'Revisión de la arritmia',
  })
  await guardarCita(id, {
    fecha: dia(9),
    hora: '09:00',
    especialidad: 'Enfermería',
    lugar: 'Centro de Salud Ejemplo',
    motivo: 'Control del Sintrom',
  })
  await guardarCita(id, {
    fecha: dia(41),
    hora: '12:15',
    especialidad: 'Oftalmología (ojos)',
    lugar: 'Hospital Ejemplo',
    motivo: 'Revisión de la vista por la diabetes',
  })
  await guardarCita(id, {
    fecha: dia(-60),
    hora: '11:00',
    especialidad: 'Traumatología',
    motivo: 'Dolor de rodilla',
    resultado: 'Artrosis leve. Caminar a diario y paracetamol si duele.',
  })
  await guardarCita(id, {
    fecha: dia(-95),
    hora: '10:00',
    especialidad: 'Endocrinología',
    motivo: 'Control del azúcar',
    resultado: 'Bien. Seguir igual y repetir análisis en 6 meses.',
  })
  await guardarCita(id, {
    fecha: dia(-182),
    hora: '09:30',
    especialidad: 'Cardiología',
    medico: 'Dr. Ejemplo',
    resultado: 'Arritmia estable. Seguir con el Sintrom.',
  })
  await guardarCita(id, { fecha: dia(-30), hora: '17:00', especialidad: 'Podología', motivo: 'Uñas', anulada: true })

  // Historial.
  await guardarHistorial(id, {
    fecha: `${ano - 14}-05-02`,
    tipo: 'diagnostico',
    titulo: 'Hipertensión arterial',
    medicacion: ['Enalapril 20 mg'],
    especialidad: 'Medicina de familia',
    cronica: true,
  })
  await guardarHistorial(id, {
    fecha: `${ano - 8}-01-10`,
    tipo: 'diagnostico',
    titulo: 'Diabetes tipo 2',
    medicacion: ['Metformina 850 mg'],
    especialidad: 'Endocrinología',
    cronica: true,
  })
  await guardarHistorial(id, {
    fecha: `${ano - 6}-03-15`,
    tipo: 'diagnostico',
    titulo: 'Fibrilación auricular (arritmia)',
    medicacion: ['Sintrom 4 mg'],
    especialidad: 'Cardiología',
    cronica: true,
  })
  await guardarHistorial(id, {
    fecha: `${ano - 5}-06-20`,
    tipo: 'operacion',
    titulo: 'Prótesis de cadera derecha',
    medicacion: ['Paracetamol 1 g', 'Enoxaparina 40 mg (inyección)'],
    especialidad: 'Traumatología',
    centro: 'Hospital Ejemplo',
    resumen: 'Le pusieron una prótesis por desgaste. Salió bien; rehabilitación de 2 meses.',
  })
  await guardarHistorial(id, {
    fecha: dia(-200),
    tipo: 'urgencias',
    titulo: 'Caída en casa',
    centro: 'Hospital Ejemplo',
    resumen: 'Golpe en el brazo sin fractura. Tenía fiebre de una gripe.',
    medicacion: ['Paracetamol 1 g'],
  })
  await guardarHistorial(id, {
    fecha: dia(-182),
    tipo: 'prueba',
    titulo: 'Ecocardiograma',
    prueba: 'Ecografía',
    especialidad: 'Cardiología',
    resumen: 'El corazón bombea bien. Aurícula izquierda algo grande, por la arritmia.',
  })
  await guardarHistorial(id, {
    fecha: dia(-58),
    tipo: 'prueba',
    titulo: 'Radiografía de rodilla',
    prueba: 'Radiografía',
    especialidad: 'Traumatología',
    resumen: 'Artrosis leve en la rodilla derecha.',
  })

  // Tres análisis para ver la evolución (uno de otro laboratorio, con el azúcar en mmol/L).
  await guardarAnalitica(id, {
    fecha: dia(-730),
    centro: 'Laboratorio Ejemplo',
    resultados: [
      r('Glucosa', 118, 'mg/dL', 74, 100),
      r('Hemoglobina glicada (HbA1c)', 6.6, '%', 4, 6),
      r('Colesterol total', 228, 'mg/dL', undefined, 200),
      r('LDL Colesterol', 148, 'mg/dL', undefined, 130),
      r('HDL Colesterol', 48, 'mg/dL', 40),
      r('Triglicéridos', 160, 'mg/dL', undefined, 150),
      r('Creatinina', 0.9, 'mg/dL', 0.5, 1.1),
      r('Filtrado glomerular', 72, 'mL/min', 60),
      r('Hemoglobina', 13.1, 'g/dL', 12, 16),
      r('Potasio', 4.4, 'mmol/L', 3.5, 5.1),
    ],
  })
  await guardarAnalitica(id, {
    fecha: dia(-365),
    centro: 'Otro laboratorio (ejemplo)',
    resultados: [
      r('Glucosa', 7, 'mmol/L', 4.1, 5.6),
      r('Hemoglobina glicada (HbA1c)', 7.1, '%', 4, 6),
      r('Colesterol total', 215, 'mg/dL', undefined, 200),
      r('LDL Colesterol', 136, 'mg/dL', undefined, 130),
      r('HDL Colesterol', 46, 'mg/dL', 40),
      r('Triglicéridos', 172, 'mg/dL', undefined, 150),
      r('Creatinina', 1, 'mg/dL', 0.5, 1.1),
      r('Filtrado glomerular', 65, 'mL/min', 60),
      r('Hemoglobina', 12.6, 'g/dL', 12, 16),
      r('TSH', 2.4, 'µUI/mL', 0.4, 4),
    ],
  })
  await guardarAnalitica(id, {
    fecha: dia(-25),
    centro: 'Laboratorio Ejemplo',
    notas: 'Análisis de control de 6 meses.',
    resultados: [
      r('Glucosa', 112, 'mg/dL', 74, 100),
      r('Hemoglobina glicada (HbA1c)', 6.8, '%', 4, 6),
      r('Colesterol total', 189, 'mg/dL', undefined, 200),
      r('LDL Colesterol', 108, 'mg/dL', undefined, 130),
      r('HDL Colesterol', 52, 'mg/dL', 40),
      r('Triglicéridos', 140, 'mg/dL', undefined, 150),
      r('Creatinina', 1.1, 'mg/dL', 0.5, 1.1),
      r('Filtrado glomerular', 58, 'mL/min', 60),
      r('Hemoglobina', 12.2, 'g/dL', 12, 16),
      r('Potasio', 4.9, 'mmol/L', 3.5, 5.1),
      r('INR', 2.6, '', 2, 3),
    ],
  })

  // Constantes: la tensión cada mañana del último mes, el azúcar cada semana, el peso cada mes.
  const al = azar(7)
  for (let n = -30; n <= -1; n++) {
    const alta = al(124, 146)
    await guardarMedida(id, {
      tipo: 'tension',
      fecha: dia(n),
      hora: `08:${String(al(10, 45))}`,
      valor: alta,
      valor2: al(74, 90),
      pulso: al(62, 84),
    })
  }
  for (let n = -42; n <= -1; n += 7) {
    await guardarMedida(id, { tipo: 'glucosa', fecha: dia(n), hora: '08:00', valor: al(102, 128), momento: 'ayunas' })
  }
  await guardarMedida(id, {
    tipo: 'glucosa',
    fecha: dia(-3),
    hora: '15:30',
    valor: 164,
    momento: 'despues-comer',
    notas: 'Después de la comida del cumpleaños',
  })
  let peso = 74.6
  for (let n = -180; n <= -1; n += 30) {
    await guardarMedida(id, { tipo: 'peso', fecha: dia(n), valor: Math.round(peso * 10) / 10 })
    peso -= 0.4
  }
  await guardarMedida(id, { tipo: 'temperatura', fecha: dia(-201), hora: '21:00', valor: 38.4, notas: 'Con gripe' })
  await guardarMedida(id, { tipo: 'temperatura', fecha: dia(-2), hora: '09:00', valor: 36.5 })
  await guardarMedida(id, { tipo: 'saturacion', fecha: dia(-2), hora: '09:00', valor: 96 })

  // Revisiones y vacunas (a sus años: la gripe y el COVID de este otoño, la 2.ª dosis del zóster y el tétanos le tocan).
  await guardarRegistro(id, {
    tipo: 'vacuna',
    clave: 'gripe',
    nombre: 'Vacuna de la gripe',
    fecha: dia(-365),
    lugar: 'Centro de Salud Ejemplo',
  })
  await guardarRegistro(id, {
    tipo: 'vacuna',
    clave: 'covid',
    nombre: 'Vacuna del COVID',
    fecha: dia(-365),
    lugar: 'Centro de Salud Ejemplo',
  })
  await guardarRegistro(id, {
    tipo: 'vacuna',
    clave: 'neumococo',
    nombre: 'Vacuna del neumococo (neumonía)',
    fecha: `${ano - 4}-11-10`,
    lugar: 'Centro de Salud Ejemplo',
  })
  await guardarRegistro(id, {
    tipo: 'vacuna',
    clave: 'zoster',
    nombre: 'Vacuna del herpes zóster (culebrilla)',
    fecha: dia(-45),
    dosis: '1.ª dosis',
    lote: 'EJ-0001',
  })
  await guardarPropia(p, 'Revisión del cardiólogo', 6)
  const conPropia = await db.perfiles.get(id)
  const cardio = conPropia?.revisionesPropias?.[0]
  if (cardio) await guardarRegistro(id, { tipo: 'revision', clave: cardio.clave, nombre: cardio.nombre, fecha: dia(-182) })

  // Dentista.
  await guardarDental(id, {
    fecha: `${ano - 11}-04-10`,
    tipo: 'extraccion',
    dientes: [38, 48],
    dentista: 'Clínica Dental Ejemplo',
    importe: 120,
  })
  await guardarDental(id, {
    fecha: `${ano - 6}-02-15`,
    tipo: 'empaste',
    dientes: [16, 26, 36],
    dentista: 'Clínica Dental Ejemplo',
    importe: 165,
  })
  await guardarDental(id, {
    fecha: `${ano - 3}-11-20`,
    tipo: 'endodoncia',
    dientes: [46],
    dentista: 'Clínica Dental Ejemplo',
    importe: 180,
  })
  await guardarDental(id, { fecha: `${ano - 2}-01-12`, tipo: 'corona', dientes: [46], dentista: 'Clínica Dental Ejemplo', importe: 390 })
  await guardarDental(id, { fecha: `${ano - 2}-06-03`, tipo: 'implante', dientes: [38], dentista: 'Clínica Dental Ejemplo', importe: 1150 })
  await guardarDental(id, { fecha: dia(-420), tipo: 'limpieza', dientes: [], dentista: 'Clínica Dental Ejemplo', importe: 55 })
  await guardarDental(id, {
    fecha: dia(-420),
    tipo: 'caries',
    dientes: [24],
    dentista: 'Clínica Dental Ejemplo',
    notas: 'Pendiente de empastar',
  })

  // Teléfonos.
  await guardarContacto(id, {
    tipo: 'centro-salud',
    nombre: 'Centro de Salud Ejemplo',
    telefono: '910 000 000',
    direccion: 'Calle Ejemplo, 1',
  })
  await guardarContacto(id, { tipo: 'hospital', nombre: 'Hospital Ejemplo (citas)', telefono: '910 000 001' })
  await guardarContacto(id, { tipo: 'farmacia', nombre: 'Farmacia Ejemplo', telefono: '910 000 002' })

  // Vista: hipermetropía y vista cansada que suben; en la última, la presión del ojo algo alta.
  await guardarOcular(id, {
    fecha: dia(-1500),
    tipo: 'gafas',
    donde: 'Óptica Ejemplo',
    derecho: { esfera: 1, adicion: 2, agudeza: 1, presion: 17 },
    izquierdo: { esfera: 1.25, adicion: 2, agudeza: 1, presion: 18 },
  })
  await guardarOcular(id, {
    fecha: dia(-760),
    tipo: 'gafas',
    donde: 'Óptica Ejemplo',
    derecho: { esfera: 1.25, adicion: 2.25, agudeza: 0.9, presion: 19 },
    izquierdo: { esfera: 1.5, adicion: 2.25, agudeza: 0.9, presion: 20 },
  })
  await guardarOcular(id, {
    fecha: dia(-40),
    tipo: 'revision',
    donde: 'Hospital Ejemplo, Oftalmología',
    derecho: { esfera: 1.5, cilindro: -0.5, eje: 90, adicion: 2.5, agudeza: 0.8, presion: 22 },
    izquierdo: { esfera: 1.75, adicion: 2.5, agudeza: 0.8, presion: 20 },
    diagnostico: 'Principio de cataratas. Vigilar la presión del ojo derecho.',
  })
  return id
}

async function crearLucia(dia: (n: number) => FechaISO, ano: number): Promise<string> {
  const p = await crearPerfil({
    nombre: 'Lucía (ejemplo)',
    foto: await fotoDe(fotoLucia),
    fechaNacimiento: `${ano - 42}-09-03`,
    sexo: 'mujer',
    color: '#2f7f8f',
    ejemplo: true,
    ejemploVersion: VERSION_EJEMPLOS,
  })
  const id = p.id

  await guardarDatos(id, {
    grupoSanguineo: '0+',
    centroSalud: 'Centro de Salud Ejemplo',
    contactos: [{ nombre: 'Rosa (ejemplo)', relacion: 'Madre', telefono: '600 000 003' }],
  })
  await guardarAlergia(id, {
    tipo: 'otro',
    clase: 'alergia',
    nombre: 'Polen de gramíneas',
    gravedad: 'leve',
    reaccion: 'Estornudos y picor de ojos en primavera',
  })
  await guardarMedicamento(id, {
    nombre: 'Sumatriptán 50 mg',
    dosis: '1 comprimido',
    momentos: [],
    otroHorario: 'Solo si empieza una migraña',
    paraQue: 'La migraña',
    activo: 1,
  })
  await guardarHistorial(id, {
    fecha: `${ano - 11}-03-01`,
    tipo: 'diagnostico',
    titulo: 'Migraña',
    especialidad: 'Neurología',
    cronica: true,
  })

  // La regla: casi siempre cada 28-29 días, con un ciclo más largo.
  const inicios = [-160, -131, -103, -74, -41, -12]
  for (const [i, n] of inicios.entries()) {
    await guardarCiclo(id, {
      inicio: dia(n),
      fin: dia(n + (i % 2 ? 4 : 5)),
      intensidad: i === 3 ? 'mucha' : 'normal',
      sintomas: i === 1 || i === 4 ? ['Dolor', 'Migraña'] : ['Dolor'],
    })
  }
  // Las migrañas fuertes coinciden con la regla (la app lo marca).
  await guardarHistorial(id, {
    fecha: dia(-102),
    tipo: 'consulta',
    titulo: 'Migraña fuerte',
    especialidad: 'Medicina de familia',
    resumen: 'Tres días con dolor. Empezar con sumatriptán.',
    medicacion: ['Sumatriptán 50 mg'],
  })
  await guardarHistorial(id, {
    fecha: dia(-40),
    tipo: 'urgencias',
    titulo: 'Migraña con vómitos',
    centro: 'Hospital Ejemplo',
    resumen: 'Le pusieron medicación en vena y se fue a casa.',
  })
  await guardarCita(id, {
    fecha: dia(-30),
    hora: '13:00',
    especialidad: 'Neurología',
    motivo: 'Migrañas',
    resultado: 'Apuntar cuándo pasan: parece que coinciden con la regla.',
  })
  await guardarCita(id, {
    fecha: dia(20),
    hora: '16:30',
    especialidad: 'Ginecología',
    motivo: 'Comentar la relación de las migrañas con la regla',
  })

  await guardarMedida(id, { tipo: 'tension', fecha: dia(-90), valor: 118, valor2: 74, pulso: 70 })
  await guardarMedida(id, { tipo: 'peso', fecha: dia(-90), valor: 61.5 })
  await guardarRegistro(id, {
    tipo: 'revision',
    clave: 'cervix',
    nombre: 'Prueba del cuello del útero',
    fecha: dia(-760),
    notas: 'Todo normal.',
  })
  await guardarDental(id, { fecha: dia(-150), tipo: 'limpieza', dientes: [], dentista: 'Clínica Dental Ejemplo', importe: 50 })

  // Vista: miopía que ha ido subiendo con los años.
  const miopia: [number, number, number, RevisionOcular['tipo']][] = [
    [-3650, -1, -0.75, 'gafas'],
    [-2555, -1.5, -1.25, 'gafas'],
    [-1460, -2, -1.75, 'gafas'],
    [-730, -2.25, -2, 'lentillas'],
    [-60, -2.5, -2.25, 'lentillas'],
  ]
  for (const [n, od, oi, tipo] of miopia) {
    await guardarOcular(id, {
      fecha: dia(n),
      tipo,
      donde: 'Óptica Ejemplo',
      derecho: { esfera: od, agudeza: 1 },
      izquierdo: { esfera: oi, ...(n >= -1460 ? { cilindro: -0.5, eje: 180 } : {}), agudeza: 1 },
    })
  }

  // Bajas: una de hace dos años con su alta, la de la migraña (con la regla) y una gripe que sigue abierta.
  await guardarBaja(id, {
    inicio: dia(-700),
    fin: dia(-686),
    tipo: 'comun',
    motivo: 'Lumbalgia',
    diagnostico: 'Dolor lumbar agudo',
    medico: 'Dra. Ejemplo',
    centro: 'Centro de Salud Ejemplo',
    empresa: 'Empresa Ejemplo S. L.',
    confirmaciones: [dia(-693)],
    tipoAlta: 'curacion',
  })
  await guardarBaja(id, {
    inicio: dia(-40),
    fin: dia(-37),
    tipo: 'comun',
    motivo: 'Migraña',
    medico: 'Dra. Ejemplo',
    centro: 'Centro de Salud Ejemplo',
    empresa: 'Empresa Ejemplo S. L.',
    confirmaciones: [],
    tipoAlta: 'mejoria',
  })
  await guardarBaja(id, {
    inicio: dia(-2),
    tipo: 'comun',
    motivo: 'Gripe',
    medico: 'Dra. Ejemplo',
    centro: 'Centro de Salud Ejemplo',
    empresa: 'Empresa Ejemplo S. L.',
    confirmaciones: [],
  })
  return id
}

// ---------- Documentos inventados (partes de baja, informes) ----------

const TIPO_BAJA_TEXTO: Record<string, string> = {
  comun: 'Enfermedad común',
  'accidente-no-laboral': 'Accidente no laboral',
  'accidente-laboral': 'Accidente de trabajo',
  'enfermedad-profesional': 'Enfermedad profesional',
}

/** Parte de baja, de confirmación o de alta, con la forma de los de verdad (y bien marcado como ejemplo). */
function parte(tipo: 'baja' | 'confirmacion' | 'alta', paciente: string, b: Baja, fecha: string, numero = 1): Blob {
  const titulo = { baja: 'PARTE MÉDICO DE BAJA', confirmacion: `PARTE MÉDICO DE CONFIRMACIÓN N.º ${numero}`, alta: 'PARTE MÉDICO DE ALTA' }[
    tipo
  ]
  const lineas: LineaPdf[] = [
    [50, 780, 14, `${titulo} DE INCAPACIDAD TEMPORAL`, true],
    [50, 762, 9, 'Modelo de ejemplo (copia para la persona trabajadora)'],
    [50, 730, 10, `Trabajador/a: ${paciente.toUpperCase()}`],
    [50, 715, 10, `Empresa: ${(b.empresa ?? 'EMPRESA EJEMPLO').toUpperCase()}`],
    [50, 690, 10, `Fecha de la baja: ${fechaEs(b.inicio)}`],
    [50, 675, 10, `Contingencia: ${(TIPO_BAJA_TEXTO[b.tipo] ?? b.tipo).toLowerCase()}`],
    [50, 660, 10, `Diagnóstico: ${(b.diagnostico ?? b.motivo).toLowerCase()}`],
  ]
  if (tipo === 'confirmacion') {
    lineas.push([50, 635, 10, `Fecha de este parte: ${fechaEs(fecha)}`], [50, 620, 10, 'Continúa en situación de incapacidad temporal.'])
  }
  if (tipo === 'alta') {
    const motivo = {
      curacion: 'curación',
      mejoria: 'mejoría que permite trabajar',
      inspeccion: 'inspección médica',
      incapacidad: 'propuesta de incapacidad permanente',
      otra: 'otro motivo',
    }[b.tipoAlta ?? 'curacion']
    lineas.push(
      [50, 635, 10, `Fecha del alta: ${fechaEs(fecha)}`, true],
      [50, 620, 10, `Motivo del alta: ${motivo}`],
      [50, 605, 10, 'Se incorpora a su trabajo al día siguiente.'],
    )
  }
  lineas.push([50, 570, 10, `Médico: ${b.medico ?? 'Dra. Ejemplo'} - ${b.centro ?? 'Centro de Salud Ejemplo'}`])
  return crearPdf(lineas)
}

/** Un informe de texto sencillo (radiografía, análisis…). */
function informe(titulo: string, centro: string, paciente: string, fecha: string, cuerpo: string[]): Blob {
  return crearPdf([
    [50, 780, 14, titulo, true],
    [50, 762, 9, centro],
    [50, 730, 10, `Paciente: ${paciente.toUpperCase()}`],
    [50, 715, 10, `Fecha: ${fechaEs(fecha)}`],
    ...cuerpo.map((t, i): LineaPdf => [50, 685 - i * 16, 10, t]),
  ])
}

const pdf = (nombre: string, archivo: Blob): AdjuntoNuevo => ({
  clave: crypto.randomUUID(),
  tipo: 'documento',
  nombre,
  archivo,
  leido: true,
})

async function adjuntarDocumentos(perfilId: string): Promise<void> {
  const paciente = (await db.perfiles.get(perfilId))?.nombre.replace(' (ejemplo)', '') ?? 'Persona de ejemplo'

  for (const b of await db.bajas.where('perfilId').equals(perfilId).toArray()) {
    const docs = [pdf(`Parte de baja ${fechaEs(b.inicio)}.pdf`, parte('baja', paciente, b, b.inicio))]
    b.confirmaciones.forEach((c, i) =>
      docs.push(pdf(`Parte de confirmación ${i + 1} ${fechaEs(c)}.pdf`, parte('confirmacion', paciente, b, c, i + 1))),
    )
    if (b.fin) docs.push(pdf(`Parte de alta ${fechaEs(b.fin)}.pdf`, parte('alta', paciente, b, b.fin)))
    await guardarAdjuntos(perfilId, b.id, docs)
  }

  const historial = await db.historial.where('perfilId').equals(perfilId).toArray()
  const rodilla = historial.find((h) => h.titulo === 'Radiografía de rodilla')
  if (rodilla) {
    await guardarAdjuntos(perfilId, rodilla.id, [
      pdf(
        'Informe radiografía de rodilla.pdf',
        informe('SERVICIO DE RADIODIAGNÓSTICO', 'Hospital Ejemplo', paciente, rodilla.fecha, [
          'Estudio: radiografía de rodilla derecha, proyecciones AP y lateral.',
          'Disminución leve del espacio articular femorotibial interno.',
          'Pequeños osteofitos marginales. No se observan fracturas.',
          'Conclusión: gonartrosis leve (artrosis de rodilla leve).',
        ]),
      ),
    ])
  }
  const eco = historial.find((h) => h.titulo === 'Ecocardiograma')
  if (eco) {
    await guardarAdjuntos(perfilId, eco.id, [
      pdf(
        'Informe ecocardiograma.pdf',
        informe('CARDIOLOGÍA - ECOCARDIOGRAMA', 'Hospital Ejemplo', paciente, eco.fecha, [
          'Ventrículo izquierdo de tamaño y función normales (FEVI 60 %).',
          'Aurícula izquierda ligeramente dilatada.',
          'Válvulas sin alteraciones relevantes.',
          'Conclusión: hallazgos compatibles con fibrilación auricular conocida.',
        ]),
      ),
    ])
  }

  const ultima = (await db.analiticas.where('perfilId').equals(perfilId).toArray()).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  if (ultima) {
    const filas = ultima.resultados.map(
      (r) =>
        `${r.nombre.padEnd(34, ' ')} ${String(r.valor).replace('.', ',')} ${r.unidad ?? ''}${
          r.refMin !== undefined || r.refMax !== undefined ? `   (${r.refMin ?? ''} - ${r.refMax ?? ''})` : ''
        }`,
    )
    await guardarAdjuntos(perfilId, ultima.id, [
      pdf(
        `Análisis ${fechaEs(ultima.fecha)}.pdf`,
        informe('LABORATORIO DE EJEMPLO - ANÁLISIS', ultima.centro ?? 'Laboratorio Ejemplo', paciente, ultima.fecha, filas),
      ),
    ])
  }

  // Facturas del dentista: una por cada tratamiento pagado.
  const dental = (await db.dental.where('perfilId').equals(perfilId).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha))
  let numero = 0
  for (const t of dental.filter((x) => llevaFactura(x.tipo))) {
    numero++
    const concepto = CONCEPTO_FACTURA[t.tipo] ?? infoTipoDental(t.tipo).texto
    const dientes = t.dientes.map((n) => `${nombreDiente(n).toLowerCase()} (${n})`)
    const importe = t.importe ?? 0
    const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} EUR`
    const factura = crearPdf(
      [
        [50, 780, 15, (t.dentista ?? 'Clínica Dental Ejemplo').toUpperCase(), true],
        [50, 763, 9, 'Calle Ejemplo, 1 - 00000 Ciudad Ejemplo - CIF B00000000 (ejemplo)'],
        [380, 780, 12, 'FACTURA', true],
        [380, 763, 9, `N.º EJ-${t.fecha.slice(0, 4)}-${String(numero).padStart(4, '0')}`],
        [380, 750, 9, `Fecha: ${fechaEs(t.fecha)}`],
        [50, 720, 10, `Paciente: ${paciente.toUpperCase()}`],
        [50, 690, 10, 'Concepto', true],
        [450, 690, 10, 'Importe', true],
        [50, 672, 10, concepto],
        [450, 672, 10, euros(importe)],
        ...dientes.map((d, i): LineaPdf => [62, 656 - i * 14, 9, `- ${d}`]),
        [50, 600, 9, 'Exento de IVA (servicios de asistencia sanitaria, art. 20.Uno.3.º Ley 37/1992).'],
        [330, 570, 12, `TOTAL: ${euros(importe)}`, true],
        [50, 540, 9, 'Forma de pago: tarjeta.'],
      ],
      [
        [50, 684, 545, 684],
        [330, 585, 545, 585],
      ],
    )
    await guardarAdjuntos(perfilId, t.id, [pdf(`Factura ${concepto.toLowerCase()} ${fechaEs(t.fecha)}.pdf`, factura)])
  }
}

/** Cómo se escribe cada tratamiento en una factura. */
const CONCEPTO_FACTURA: Partial<Record<string, string>> = {
  extraccion: 'Extracción dental',
  empaste: 'Empaste',
  endodoncia: 'Endodoncia',
  corona: 'Funda o corona',
  implante: 'Implante dental',
  limpieza: 'Limpieza dental',
  protesis: 'Dentadura postiza',
  ortodoncia: 'Ortodoncia',
}

/** La foto de una persona de ejemplo (de la carpeta de la app). Si no se puede cargar, se queda sin foto. */
async function fotoDe(url: string): Promise<Blob | undefined> {
  try {
    const r = await fetch(url)
    return r.ok ? await r.blob() : undefined
  } catch {
    return undefined
  }
}
