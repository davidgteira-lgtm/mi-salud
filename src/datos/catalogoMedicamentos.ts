// Lista de medicamentos habituales en España, con su familia y para qué se suelen usar,
// en palabras sencillas. Sirve para rellenar datos y para avisar de alergias.
//
// IMPORTANTE: es información orientativa. No sustituye al prospecto ni al médico.
// Para añadir un medicamento: copia una línea parecida y cambia los datos.
// Los nombres se escriben como se dicen; las tildes y mayúsculas dan igual al buscar.

/** Grupos que importan para las alergias: si eres alérgico a uno, cuidado con todo el grupo. */
export type GrupoAlergia =
  | 'penicilinas'
  | 'cefalosporinas'
  | 'aines'
  | 'pirazolonas'
  | 'sulfamidas'
  | 'macrolidos'
  | 'quinolonas'
  | 'tetraciclinas'
  | 'opioides'
  | 'ieca'
  | 'contrastes-yodados'

export interface InfoGrupo {
  nombre: string
  /** Palabras con las que la gente se refiere al grupo entero ("alérgico a la penicilina"). */
  sinonimos: string[]
  /** Grupos con los que puede haber reacción cruzada (aviso de precaución, no tan fuerte). */
  relacionados?: GrupoAlergia[]
}

export const GRUPOS: Record<GrupoAlergia, InfoGrupo> = {
  penicilinas: {
    nombre: 'penicilinas',
    sinonimos: ['penicilina', 'penicilinas', 'betalactamicos', 'betalactamico'],
    relacionados: ['cefalosporinas'],
  },
  cefalosporinas: {
    nombre: 'cefalosporinas',
    sinonimos: ['cefalosporina', 'cefalosporinas'],
    relacionados: ['penicilinas'],
  },
  aines: {
    nombre: 'antiinflamatorios (AINE)',
    sinonimos: ['aine', 'aines', 'antiinflamatorio', 'antiinflamatorios', 'antinflamatorios'],
    relacionados: ['pirazolonas'],
  },
  pirazolonas: {
    nombre: 'pirazolonas (metamizol)',
    sinonimos: ['pirazolona', 'pirazolonas'],
    relacionados: ['aines'],
  },
  sulfamidas: { nombre: 'sulfamidas', sinonimos: ['sulfamida', 'sulfamidas', 'sulfas'] },
  macrolidos: { nombre: 'macrólidos', sinonimos: ['macrolido', 'macrolidos'] },
  quinolonas: { nombre: 'quinolonas', sinonimos: ['quinolona', 'quinolonas', 'fluoroquinolonas'] },
  tetraciclinas: { nombre: 'tetraciclinas', sinonimos: ['tetraciclina', 'tetraciclinas'] },
  opioides: { nombre: 'opioides', sinonimos: ['opioide', 'opioides', 'opiaceos', 'opiaceo'] },
  ieca: { nombre: 'IECA (para la tensión)', sinonimos: ['ieca'] },
  'contrastes-yodados': {
    nombre: 'contrastes yodados',
    sinonimos: ['contraste', 'contrastes', 'contraste yodado', 'yodo'],
  },
}

export interface MedicamentoCatalogo {
  /** Principio activo, tal como se escribe en la caja. */
  nombre: string
  /** Nombres comerciales y otras formas de llamarlo. */
  otrosNombres?: string[]
  familia: string
  paraQue: string
  grupos?: GrupoAlergia[]
}

// Familias, escritas siempre igual para poder agruparlas.
const F = {
  analgesico: 'Analgésico (para el dolor y la fiebre)',
  aine: 'Antiinflamatorio (AINE)',
  opioide: 'Analgésico opioide (para el dolor fuerte)',
  penicilina: 'Antibiótico (penicilina)',
  cefalosporina: 'Antibiótico (cefalosporina)',
  macrolido: 'Antibiótico (macrólido)',
  quinolona: 'Antibiótico (quinolona)',
  antibiotico: 'Antibiótico',
  protector: 'Protector del estómago',
  tension: 'Para la tensión',
  diuretico: 'Diurético (para eliminar líquidos)',
  colesterol: 'Para el colesterol',
  diabetes: 'Para el azúcar (diabetes)',
  anticoagulante: 'Anticoagulante (para que la sangre no coagule)',
  antiagregante: 'Antiagregante (para evitar trombos)',
  tiroides: 'Para el tiroides',
  benzodiacepina: 'Tranquilizante (para la ansiedad o el sueño)',
  sueno: 'Para dormir',
  antidepresivo: 'Antidepresivo',
  antipsicotico: 'Antipsicótico',
  neuropatico: 'Para el dolor de los nervios',
  bronquios: 'Para el asma o los bronquios',
  antialergico: 'Antialérgico (antihistamínico)',
  corticoide: 'Corticoide (antiinflamatorio fuerte)',
  vitaminas: 'Vitaminas y minerales',
  huesos: 'Para los huesos',
  prostata: 'Para la próstata',
  gota: 'Para la gota (ácido úrico)',
  memoria: 'Para la memoria',
  parkinson: 'Para el Parkinson',
  estrenimiento: 'Para el estreñimiento',
  corazon: 'Para el corazón',
  orina: 'Para la orina (vejiga)',
} as const

export const CATALOGO: MedicamentoCatalogo[] = [
  // Dolor y fiebre
  { nombre: 'paracetamol', otrosNombres: ['gelocatil', 'termalgin', 'efferalgan', 'dafalgan'], familia: F.analgesico, paraQue: 'Dolor y fiebre' },
  { nombre: 'metamizol', otrosNombres: ['nolotil', 'metamizol magnesico'], familia: 'Analgésico (pirazolona)', paraQue: 'Dolor y fiebre', grupos: ['pirazolonas'] },
  { nombre: 'ibuprofeno', otrosNombres: ['dalsy', 'espidifen', 'neobrufen', 'algiasdin'], familia: F.aine, paraQue: 'Dolor, inflamación y fiebre', grupos: ['aines'] },
  { nombre: 'naproxeno', otrosNombres: ['antalgin'], familia: F.aine, paraQue: 'Dolor e inflamación', grupos: ['aines'] },
  { nombre: 'diclofenaco', otrosNombres: ['voltaren'], familia: F.aine, paraQue: 'Dolor e inflamación', grupos: ['aines'] },
  { nombre: 'dexketoprofeno', otrosNombres: ['enantyum'], familia: F.aine, paraQue: 'Dolor', grupos: ['aines'] },
  { nombre: 'ketoprofeno', familia: F.aine, paraQue: 'Dolor e inflamación', grupos: ['aines'] },
  { nombre: 'aceclofenaco', otrosNombres: ['airtal'], familia: F.aine, paraQue: 'Dolor e inflamación', grupos: ['aines'] },
  { nombre: 'celecoxib', otrosNombres: ['celebrex'], familia: F.aine, paraQue: 'Dolor e inflamación (artrosis)', grupos: ['aines'] },
  { nombre: 'etoricoxib', otrosNombres: ['arcoxia'], familia: F.aine, paraQue: 'Dolor e inflamación (artrosis)', grupos: ['aines'] },
  { nombre: 'acido acetilsalicilico', otrosNombres: ['aspirina', 'adiro', 'tromalyt'], familia: 'Antiinflamatorio (AINE) y antiagregante', paraQue: 'Dolor; a dosis bajas, para evitar trombos', grupos: ['aines'] },
  { nombre: 'tramadol', otrosNombres: ['adolonta'], familia: F.opioide, paraQue: 'Dolor moderado o fuerte', grupos: ['opioides'] },
  { nombre: 'tramadol paracetamol', otrosNombres: ['zaldiar', 'pazital'], familia: F.opioide, paraQue: 'Dolor moderado o fuerte', grupos: ['opioides'] },
  { nombre: 'codeina', familia: F.opioide, paraQue: 'Dolor y tos', grupos: ['opioides'] },
  { nombre: 'morfina', familia: F.opioide, paraQue: 'Dolor fuerte', grupos: ['opioides'] },
  { nombre: 'fentanilo', otrosNombres: ['durogesic'], familia: F.opioide, paraQue: 'Dolor fuerte', grupos: ['opioides'] },
  { nombre: 'tapentadol', otrosNombres: ['palexia'], familia: F.opioide, paraQue: 'Dolor fuerte', grupos: ['opioides'] },
  { nombre: 'oxicodona', familia: F.opioide, paraQue: 'Dolor fuerte', grupos: ['opioides'] },

  // Antibióticos
  { nombre: 'penicilina', otrosNombres: ['bencilpenicilina'], familia: F.penicilina, paraQue: 'Infecciones', grupos: ['penicilinas'] },
  { nombre: 'amoxicilina', otrosNombres: ['clamoxyl'], familia: F.penicilina, paraQue: 'Infecciones', grupos: ['penicilinas'] },
  { nombre: 'amoxicilina clavulanico', otrosNombres: ['augmentine', 'amoxicilina acido clavulanico', 'amoxicilina y clavulanico'], familia: F.penicilina, paraQue: 'Infecciones', grupos: ['penicilinas'] },
  { nombre: 'cloxacilina', otrosNombres: ['orbenin'], familia: F.penicilina, paraQue: 'Infecciones de la piel', grupos: ['penicilinas'] },
  { nombre: 'cefuroxima', otrosNombres: ['zinnat'], familia: F.cefalosporina, paraQue: 'Infecciones', grupos: ['cefalosporinas'] },
  { nombre: 'cefixima', familia: F.cefalosporina, paraQue: 'Infecciones', grupos: ['cefalosporinas'] },
  { nombre: 'cefalexina', familia: F.cefalosporina, paraQue: 'Infecciones', grupos: ['cefalosporinas'] },
  { nombre: 'cefadroxilo', familia: F.cefalosporina, paraQue: 'Infecciones', grupos: ['cefalosporinas'] },
  { nombre: 'ceftriaxona', familia: F.cefalosporina, paraQue: 'Infecciones (inyectable)', grupos: ['cefalosporinas'] },
  { nombre: 'azitromicina', otrosNombres: ['zitromax'], familia: F.macrolido, paraQue: 'Infecciones', grupos: ['macrolidos'] },
  { nombre: 'claritromicina', otrosNombres: ['klacid'], familia: F.macrolido, paraQue: 'Infecciones', grupos: ['macrolidos'] },
  { nombre: 'eritromicina', familia: F.macrolido, paraQue: 'Infecciones', grupos: ['macrolidos'] },
  { nombre: 'ciprofloxacino', otrosNombres: ['baycip'], familia: F.quinolona, paraQue: 'Infecciones (orina y otras)', grupos: ['quinolonas'] },
  { nombre: 'levofloxacino', otrosNombres: ['tavanic'], familia: F.quinolona, paraQue: 'Infecciones (pulmón y otras)', grupos: ['quinolonas'] },
  { nombre: 'moxifloxacino', otrosNombres: ['actira'], familia: F.quinolona, paraQue: 'Infecciones', grupos: ['quinolonas'] },
  { nombre: 'norfloxacino', familia: F.quinolona, paraQue: 'Infecciones de orina', grupos: ['quinolonas'] },
  { nombre: 'cotrimoxazol', otrosNombres: ['septrin', 'sulfametoxazol trimetoprim', 'trimetoprim sulfametoxazol'], familia: 'Antibiótico (sulfamida)', paraQue: 'Infecciones (orina y otras)', grupos: ['sulfamidas'] },
  { nombre: 'fosfomicina', otrosNombres: ['monurol'], familia: F.antibiotico, paraQue: 'Infecciones de orina' },
  { nombre: 'nitrofurantoina', otrosNombres: ['furantoina'], familia: F.antibiotico, paraQue: 'Infecciones de orina' },
  { nombre: 'doxiciclina', otrosNombres: ['vibracina'], familia: 'Antibiótico (tetraciclina)', paraQue: 'Infecciones', grupos: ['tetraciclinas'] },

  // Estómago
  { nombre: 'omeprazol', familia: F.protector, paraQue: 'Proteger el estómago, ardor y úlcera' },
  { nombre: 'pantoprazol', familia: F.protector, paraQue: 'Proteger el estómago, ardor y úlcera' },
  { nombre: 'esomeprazol', otrosNombres: ['nexium'], familia: F.protector, paraQue: 'Proteger el estómago, ardor y úlcera' },
  { nombre: 'lansoprazol', familia: F.protector, paraQue: 'Proteger el estómago, ardor y úlcera' },
  { nombre: 'almagato', otrosNombres: ['almax'], familia: 'Antiácido', paraQue: 'Ardor de estómago' },
  { nombre: 'lactulosa', otrosNombres: ['duphalac'], familia: F.estrenimiento, paraQue: 'Estreñimiento' },
  { nombre: 'macrogol', otrosNombres: ['movicol'], familia: F.estrenimiento, paraQue: 'Estreñimiento' },
  { nombre: 'metoclopramida', otrosNombres: ['primperan'], familia: 'Para las náuseas', paraQue: 'Náuseas y vómitos' },
  { nombre: 'domperidona', otrosNombres: ['motilium'], familia: 'Para las náuseas', paraQue: 'Náuseas y digestiones pesadas' },

  // Tensión y corazón
  { nombre: 'enalapril', otrosNombres: ['renitec'], familia: 'Para la tensión (IECA)', paraQue: 'Tensión alta y corazón', grupos: ['ieca'] },
  { nombre: 'ramipril', familia: 'Para la tensión (IECA)', paraQue: 'Tensión alta y corazón', grupos: ['ieca'] },
  { nombre: 'lisinopril', familia: 'Para la tensión (IECA)', paraQue: 'Tensión alta y corazón', grupos: ['ieca'] },
  { nombre: 'captopril', familia: 'Para la tensión (IECA)', paraQue: 'Tensión alta', grupos: ['ieca'] },
  { nombre: 'losartan', otrosNombres: ['cozaar'], familia: 'Para la tensión (ARA II)', paraQue: 'Tensión alta' },
  { nombre: 'valsartan', otrosNombres: ['diovan'], familia: 'Para la tensión (ARA II)', paraQue: 'Tensión alta y corazón' },
  { nombre: 'candesartan', otrosNombres: ['atacand'], familia: 'Para la tensión (ARA II)', paraQue: 'Tensión alta' },
  { nombre: 'olmesartan', otrosNombres: ['olmetec'], familia: 'Para la tensión (ARA II)', paraQue: 'Tensión alta' },
  { nombre: 'irbesartan', otrosNombres: ['aprovel'], familia: 'Para la tensión (ARA II)', paraQue: 'Tensión alta' },
  { nombre: 'amlodipino', otrosNombres: ['norvas'], familia: F.tension, paraQue: 'Tensión alta' },
  { nombre: 'lercanidipino', otrosNombres: ['zanidip'], familia: F.tension, paraQue: 'Tensión alta' },
  { nombre: 'doxazosina', otrosNombres: ['carduran'], familia: F.tension, paraQue: 'Tensión alta y próstata' },
  { nombre: 'bisoprolol', otrosNombres: ['emconcor'], familia: 'Betabloqueante (corazón y tensión)', paraQue: 'Corazón, tensión y arritmias' },
  { nombre: 'atenolol', otrosNombres: ['tenormin'], familia: 'Betabloqueante (corazón y tensión)', paraQue: 'Corazón y tensión' },
  { nombre: 'carvedilol', familia: 'Betabloqueante (corazón y tensión)', paraQue: 'Corazón y tensión' },
  { nombre: 'nebivolol', otrosNombres: ['lobivon'], familia: 'Betabloqueante (corazón y tensión)', paraQue: 'Corazón y tensión' },
  { nombre: 'hidroclorotiazida', familia: F.diuretico, paraQue: 'Tensión alta y retención de líquidos' },
  { nombre: 'clortalidona', otrosNombres: ['higroton'], familia: F.diuretico, paraQue: 'Tensión alta y retención de líquidos' },
  { nombre: 'indapamida', otrosNombres: ['tertensif'], familia: F.diuretico, paraQue: 'Tensión alta' },
  { nombre: 'furosemida', otrosNombres: ['seguril'], familia: F.diuretico, paraQue: 'Retención de líquidos y corazón' },
  { nombre: 'torasemida', otrosNombres: ['sutril'], familia: F.diuretico, paraQue: 'Retención de líquidos y corazón' },
  { nombre: 'espironolactona', otrosNombres: ['aldactone'], familia: F.diuretico, paraQue: 'Corazón y retención de líquidos' },
  { nombre: 'digoxina', otrosNombres: ['lanacordin'], familia: F.corazon, paraQue: 'Corazón y arritmias' },
  { nombre: 'nitroglicerina', otrosNombres: ['cafinitrina', 'solinitrina', 'vernies'], familia: F.corazon, paraQue: 'Dolor de pecho (angina)' },
  { nombre: 'amiodarona', otrosNombres: ['trangorex'], familia: F.corazon, paraQue: 'Arritmias' },

  // Colesterol
  { nombre: 'simvastatina', otrosNombres: ['zocor'], familia: F.colesterol, paraQue: 'Bajar el colesterol' },
  { nombre: 'atorvastatina', otrosNombres: ['cardyl', 'zarator'], familia: F.colesterol, paraQue: 'Bajar el colesterol' },
  { nombre: 'rosuvastatina', otrosNombres: ['crestor'], familia: F.colesterol, paraQue: 'Bajar el colesterol' },
  { nombre: 'pravastatina', familia: F.colesterol, paraQue: 'Bajar el colesterol' },
  { nombre: 'ezetimiba', otrosNombres: ['ezetrol'], familia: F.colesterol, paraQue: 'Bajar el colesterol' },
  { nombre: 'fenofibrato', familia: F.colesterol, paraQue: 'Bajar los triglicéridos' },

  // Diabetes
  { nombre: 'metformina', otrosNombres: ['dianben'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'sitagliptina', otrosNombres: ['januvia', 'tesavel'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'linagliptina', otrosNombres: ['trajenta'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'vildagliptina', otrosNombres: ['galvus'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'empagliflozina', otrosNombres: ['jardiance'], familia: F.diabetes, paraQue: 'Controlar el azúcar (y corazón)' },
  { nombre: 'dapagliflozina', otrosNombres: ['forxiga'], familia: F.diabetes, paraQue: 'Controlar el azúcar (y corazón)' },
  { nombre: 'gliclazida', otrosNombres: ['diamicron'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'glimepirida', otrosNombres: ['amaryl'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'repaglinida', otrosNombres: ['novonorm'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'semaglutida', otrosNombres: ['ozempic', 'rybelsus'], familia: F.diabetes, paraQue: 'Controlar el azúcar' },
  { nombre: 'insulina', otrosNombres: ['lantus', 'toujeo', 'abasaglar', 'tresiba', 'levemir', 'humalog', 'novorapid', 'apidra', 'mixtard'], familia: 'Insulina (diabetes)', paraQue: 'Controlar el azúcar' },

  // Sangre
  { nombre: 'acenocumarol', otrosNombres: ['sintrom'], familia: F.anticoagulante, paraQue: 'Evitar trombos y embolias' },
  { nombre: 'warfarina', otrosNombres: ['aldocumar'], familia: F.anticoagulante, paraQue: 'Evitar trombos y embolias' },
  { nombre: 'apixaban', otrosNombres: ['eliquis'], familia: F.anticoagulante, paraQue: 'Evitar trombos y embolias' },
  { nombre: 'rivaroxaban', otrosNombres: ['xarelto'], familia: F.anticoagulante, paraQue: 'Evitar trombos y embolias' },
  { nombre: 'dabigatran', otrosNombres: ['pradaxa'], familia: F.anticoagulante, paraQue: 'Evitar trombos y embolias' },
  { nombre: 'edoxaban', otrosNombres: ['lixiana'], familia: F.anticoagulante, paraQue: 'Evitar trombos y embolias' },
  { nombre: 'enoxaparina', otrosNombres: ['clexane'], familia: 'Anticoagulante (inyección)', paraQue: 'Evitar trombos' },
  { nombre: 'clopidogrel', otrosNombres: ['plavix', 'iscover'], familia: F.antiagregante, paraQue: 'Evitar trombos (corazón y cerebro)' },
  { nombre: 'ticagrelor', otrosNombres: ['brilique'], familia: F.antiagregante, paraQue: 'Evitar trombos (corazón)' },

  // Tiroides y hormonas
  { nombre: 'levotiroxina', otrosNombres: ['eutirox', 'levothroid', 'dexnon'], familia: F.tiroides, paraQue: 'Tiroides que funciona poco (hipotiroidismo)' },
  { nombre: 'tiamazol', otrosNombres: ['tirodril'], familia: F.tiroides, paraQue: 'Tiroides que funciona demasiado' },

  // Ansiedad, sueño y ánimo
  { nombre: 'lorazepam', otrosNombres: ['orfidal', 'idalprem'], familia: F.benzodiacepina, paraQue: 'Ansiedad y sueño' },
  { nombre: 'alprazolam', otrosNombres: ['trankimazin'], familia: F.benzodiacepina, paraQue: 'Ansiedad' },
  { nombre: 'diazepam', otrosNombres: ['valium'], familia: F.benzodiacepina, paraQue: 'Ansiedad y relajar los músculos' },
  { nombre: 'lormetazepam', otrosNombres: ['noctamid'], familia: F.benzodiacepina, paraQue: 'Dormir' },
  { nombre: 'clonazepam', otrosNombres: ['rivotril'], familia: F.benzodiacepina, paraQue: 'Ansiedad y epilepsia' },
  { nombre: 'bromazepam', otrosNombres: ['lexatin'], familia: F.benzodiacepina, paraQue: 'Ansiedad' },
  { nombre: 'zolpidem', otrosNombres: ['stilnox'], familia: F.sueno, paraQue: 'Dormir' },
  { nombre: 'sertralina', otrosNombres: ['besitran'], familia: F.antidepresivo, paraQue: 'Depresión y ansiedad' },
  { nombre: 'escitalopram', otrosNombres: ['cipralex', 'esertia'], familia: F.antidepresivo, paraQue: 'Depresión y ansiedad' },
  { nombre: 'citalopram', familia: F.antidepresivo, paraQue: 'Depresión y ansiedad' },
  { nombre: 'paroxetina', otrosNombres: ['seroxat', 'motivan'], familia: F.antidepresivo, paraQue: 'Depresión y ansiedad' },
  { nombre: 'fluoxetina', otrosNombres: ['prozac'], familia: F.antidepresivo, paraQue: 'Depresión' },
  { nombre: 'duloxetina', otrosNombres: ['cymbalta'], familia: F.antidepresivo, paraQue: 'Depresión y dolor' },
  { nombre: 'venlafaxina', otrosNombres: ['vandral'], familia: F.antidepresivo, paraQue: 'Depresión y ansiedad' },
  { nombre: 'mirtazapina', otrosNombres: ['rexer'], familia: F.antidepresivo, paraQue: 'Depresión y sueño' },
  { nombre: 'trazodona', otrosNombres: ['deprax'], familia: F.antidepresivo, paraQue: 'Depresión y sueño' },
  { nombre: 'quetiapina', otrosNombres: ['seroquel'], familia: F.antipsicotico, paraQue: 'Alteraciones de conducta y sueño' },
  { nombre: 'risperidona', otrosNombres: ['risperdal'], familia: F.antipsicotico, paraQue: 'Alteraciones de conducta' },
  { nombre: 'haloperidol', familia: F.antipsicotico, paraQue: 'Agitación y alteraciones de conducta' },

  // Nervios, memoria, Parkinson
  { nombre: 'gabapentina', otrosNombres: ['neurontin'], familia: F.neuropatico, paraQue: 'Dolor de nervios y epilepsia' },
  { nombre: 'pregabalina', otrosNombres: ['lyrica'], familia: F.neuropatico, paraQue: 'Dolor de nervios y ansiedad' },
  { nombre: 'donepezilo', otrosNombres: ['aricept'], familia: F.memoria, paraQue: 'Alzheimer' },
  { nombre: 'rivastigmina', otrosNombres: ['exelon', 'prometax'], familia: F.memoria, paraQue: 'Alzheimer' },
  { nombre: 'memantina', otrosNombres: ['axura', 'ebixa'], familia: F.memoria, paraQue: 'Alzheimer' },
  { nombre: 'levodopa', otrosNombres: ['sinemet', 'madopar'], familia: F.parkinson, paraQue: 'Parkinson' },

  // Pulmones y alergias
  { nombre: 'salbutamol', otrosNombres: ['ventolin'], familia: F.bronquios, paraQue: 'Abrir los bronquios (ahogo)' },
  { nombre: 'budesonida', otrosNombres: ['pulmicort'], familia: F.bronquios, paraQue: 'Asma y bronquios' },
  { nombre: 'tiotropio', otrosNombres: ['spiriva'], familia: F.bronquios, paraQue: 'EPOC y bronquios' },
  { nombre: 'formoterol budesonida', otrosNombres: ['symbicort'], familia: F.bronquios, paraQue: 'Asma y EPOC' },
  { nombre: 'salmeterol fluticasona', otrosNombres: ['seretide', 'inaladuo', 'plusvent'], familia: F.bronquios, paraQue: 'Asma y EPOC' },
  { nombre: 'montelukast', otrosNombres: ['singulair'], familia: F.bronquios, paraQue: 'Asma y alergia' },
  { nombre: 'loratadina', otrosNombres: ['clarityne'], familia: F.antialergico, paraQue: 'Alergia' },
  { nombre: 'cetirizina', otrosNombres: ['zyrtec', 'alerlisin'], familia: F.antialergico, paraQue: 'Alergia' },
  { nombre: 'ebastina', otrosNombres: ['ebastel'], familia: F.antialergico, paraQue: 'Alergia' },
  { nombre: 'bilastina', otrosNombres: ['bilaxten', 'ibis'], familia: F.antialergico, paraQue: 'Alergia' },
  { nombre: 'desloratadina', otrosNombres: ['aerius'], familia: F.antialergico, paraQue: 'Alergia' },
  { nombre: 'dexclorfeniramina', otrosNombres: ['polaramine'], familia: F.antialergico, paraQue: 'Alergia y picores' },

  // Corticoides
  { nombre: 'prednisona', otrosNombres: ['dacortin'], familia: F.corticoide, paraQue: 'Inflamación, asma, reuma' },
  { nombre: 'metilprednisolona', otrosNombres: ['urbason'], familia: F.corticoide, paraQue: 'Inflamación, asma, reuma' },
  { nombre: 'deflazacort', otrosNombres: ['zamene', 'dezacor'], familia: F.corticoide, paraQue: 'Inflamación y reuma' },
  { nombre: 'dexametasona', otrosNombres: ['fortecortin'], familia: F.corticoide, paraQue: 'Inflamación' },

  // Huesos, gota, vitaminas
  { nombre: 'alendronato', otrosNombres: ['fosamax'], familia: F.huesos, paraQue: 'Osteoporosis' },
  { nombre: 'risedronato', otrosNombres: ['actonel'], familia: F.huesos, paraQue: 'Osteoporosis' },
  { nombre: 'denosumab', otrosNombres: ['prolia'], familia: F.huesos, paraQue: 'Osteoporosis (inyección)' },
  { nombre: 'calcifediol', otrosNombres: ['hidroferol'], familia: F.vitaminas, paraQue: 'Falta de vitamina D' },
  { nombre: 'colecalciferol', otrosNombres: ['vitamina d', 'deltius'], familia: F.vitaminas, paraQue: 'Falta de vitamina D' },
  { nombre: 'calcio', otrosNombres: ['mastical', 'ideos', 'natecal', 'carbonato calcico'], familia: F.vitaminas, paraQue: 'Huesos (calcio)' },
  { nombre: 'hierro', otrosNombres: ['ferro sanol', 'tardyferon', 'sulfato ferroso'], familia: F.vitaminas, paraQue: 'Anemia por falta de hierro' },
  { nombre: 'acido folico', otrosNombres: ['acfol'], familia: F.vitaminas, paraQue: 'Anemia y embarazo' },
  { nombre: 'cianocobalamina', otrosNombres: ['vitamina b12', 'optovite'], familia: F.vitaminas, paraQue: 'Falta de vitamina B12' },
  { nombre: 'alopurinol', otrosNombres: ['zyloric', 'zyloprim'], familia: F.gota, paraQue: 'Bajar el ácido úrico' },
  { nombre: 'febuxostat', otrosNombres: ['adenuric'], familia: F.gota, paraQue: 'Bajar el ácido úrico' },
  { nombre: 'colchicina', familia: F.gota, paraQue: 'Ataques de gota' },

  // Próstata y orina
  { nombre: 'tamsulosina', otrosNombres: ['omnic', 'urolosin'], familia: F.prostata, paraQue: 'Orinar mejor (próstata)' },
  { nombre: 'silodosina', otrosNombres: ['silodyx', 'urorec'], familia: F.prostata, paraQue: 'Orinar mejor (próstata)' },
  { nombre: 'finasterida', otrosNombres: ['proscar'], familia: F.prostata, paraQue: 'Próstata grande' },
  { nombre: 'dutasterida', otrosNombres: ['avidart'], familia: F.prostata, paraQue: 'Próstata grande' },
  { nombre: 'dutasterida tamsulosina', otrosNombres: ['duodart'], familia: F.prostata, paraQue: 'Próstata' },
  { nombre: 'solifenacina', otrosNombres: ['vesicare'], familia: F.orina, paraQue: 'Escapes y ganas urgentes de orinar' },
  { nombre: 'mirabegron', otrosNombres: ['betmiga'], familia: F.orina, paraQue: 'Escapes y ganas urgentes de orinar' },
]
