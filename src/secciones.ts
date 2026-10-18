// Las secciones que aparecen como banners en la pantalla de inicio.
// Para cambiar el orden, el texto o la foto de un banner, se toca solo este archivo.

// Fotos de Unsplash y Pexels (licencias gratuitas, sin obligación de citar al autor).
// El dibujo de alergias está hecho a medida para la app.
import fotoAlergias from './assets/banners/alergias.svg'
import fotoAnalisis from './assets/banners/analisis.webp'
import fotoBajas from './assets/banners/bajas.jpg'
import fotoCitas from './assets/banners/citas.webp'
import fotoConstantes from './assets/banners/constantes.webp'
import fotoDatos from './assets/banners/datos.webp'
import fotoDental from './assets/banners/dental.webp'
import fotoHistorial from './assets/banners/historial.webp'
import fotoMedicacion from './assets/banners/medicacion.webp'
import fotoOjos from './assets/banners/ojos.webp'
import fotoRevisiones from './assets/banners/revisiones.webp'
import fotoTelefonos from './assets/banners/telefonos.webp'

export interface Seccion {
  clave: string
  titulo: string
  descripcion: string
  /** Se ve mientras no haya foto, y si la foto no carga. */
  icono: string
  fondo: string
  /** Foto del banner (libre de derechos). */
  imagen?: string
  /** Qué parte de la foto se ve cuando no cabe entera (por defecto, el centro). */
  encuadre?: string
}

export const FICHA_EMERGENCIA: Seccion = {
  clave: 'emergencia',
  titulo: 'Ficha de emergencia',
  descripcion: 'Para enseñar en urgencias',
  icono: '🚑',
  fondo: '#b3261e',
}

export const SECCIONES: Seccion[] = [
  {
    clave: 'medicacion',
    titulo: 'Medicación',
    descripcion: 'Lo que tomas ahora y lo que tomaste antes',
    icono: '💊',
    imagen: fotoMedicacion,
    fondo: 'linear-gradient(135deg, #8fb4d9, #4f7fb5)',
  },
  {
    clave: 'citas',
    titulo: 'Citas médicas',
    descripcion: 'Las próximas y las que ya pasaron',
    icono: '📅',
    imagen: fotoCitas,
    encuadre: 'center 30%',
    fondo: 'linear-gradient(135deg, #a9b8e6, #5f74b8)',
  },
  {
    clave: 'historial',
    titulo: 'Historial',
    descripcion: 'Informes, pruebas, radiografías y operaciones',
    icono: '📁',
    imagen: fotoHistorial,
    fondo: 'linear-gradient(135deg, #b9c7dd, #6b80a3)',
  },
  {
    clave: 'analisis',
    titulo: 'Análisis',
    descripcion: 'Resultados de sangre y orina, y cómo van cambiando',
    icono: '🧪',
    imagen: fotoAnalisis,
    fondo: 'linear-gradient(135deg, #c9b3e0, #7d68ad)',
  },
  {
    clave: 'revisiones',
    titulo: 'Revisiones y vacunas',
    descripcion: 'Lo que te toca revisar según tu edad',
    icono: '🩺',
    imagen: fotoRevisiones,
    fondo: 'linear-gradient(135deg, #9fd3d6, #3f8a9c)',
  },
  {
    clave: 'dental',
    titulo: 'Salud dental',
    descripcion: 'Tu boca, diente a diente',
    icono: '🦷',
    imagen: fotoDental,
    fondo: 'linear-gradient(135deg, #a8d4f0, #4a8ab0)',
  },
  {
    clave: 'ojos',
    titulo: 'Salud ocular',
    descripcion: 'Graduación de la vista y cómo va cambiando',
    icono: '👁️',
    imagen: fotoOjos,
    encuadre: '70% 55%',
    fondo: 'linear-gradient(135deg, #9fd8cf, #2f8577)',
  },
  {
    clave: 'constantes',
    titulo: 'Constantes vitales',
    descripcion: 'Tensión, pulso, peso, azúcar…',
    icono: '❤️',
    imagen: fotoConstantes,
    fondo: 'linear-gradient(135deg, #f0b8c4, #b0607a)',
  },
  {
    clave: 'bajas',
    titulo: 'Bajas médicas',
    descripcion: 'Bajas, partes de confirmación y altas',
    icono: '📋',
    imagen: fotoBajas,
    encuadre: 'center 45%',
    fondo: 'linear-gradient(135deg, #c7c2e8, #6a5fa8)',
  },
  {
    clave: 'alergias',
    titulo: 'Alergias e intolerancias',
    descripcion: 'Medicamentos y alimentos que te sientan mal',
    icono: '⚠️',
    imagen: fotoAlergias,
    fondo: 'linear-gradient(135deg, #f5d79a, #c08a2e)',
  },
  {
    clave: 'datos',
    titulo: 'Mis datos sanitarios',
    descripcion: 'Tarjeta sanitaria, seguro médico y grupo sanguíneo',
    icono: '🏥',
    imagen: fotoDatos,
    fondo: 'linear-gradient(135deg, #b8c4dc, #5c6c94)',
  },
  {
    clave: 'telefonos',
    titulo: 'Teléfonos de centros médicos',
    descripcion: 'Llama a tu médico',
    icono: '📞',
    imagen: fotoTelefonos,
    fondo: 'linear-gradient(135deg, #a8cde8, #3f7aa8)',
  },
]

export function buscarSeccion(clave: string | undefined): Seccion | undefined {
  if (clave === FICHA_EMERGENCIA.clave) return FICHA_EMERGENCIA
  return SECCIONES.find((s) => s.clave === clave)
}
