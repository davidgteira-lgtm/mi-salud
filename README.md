# Mi Salud

**Todo mi historial en un único lugar.**

Mi Salud es una aplicación web instalable (PWA) para llevar el historial médico de una familia desde el móvil: medicación, citas, análisis, revisiones, salud dental y ocular, bajas, alergias y teléfonos. Está pensada para personas mayores, con letra grande, botones grandes y lectura en voz alta, y para quien las cuida.

Proyecto presentado al **Hackathon de Vibe Coding (edición 7, Big School)**.

> Todos los datos que aparecen en la app, en las pruebas y en este repositorio son **inventados**. Las personas de ejemplo (Rosa y Lucía) no existen.

## Probarla en un minuto

1. Abre la app y pulsa **«Ver con datos de ejemplo»**.
2. Entra como **Rosa (ejemplo)**, de 70 años, con diabetes, tensión alta y un historial largo.
3. Empieza por el banner **ALERTAS**: tomas de hoy, controles en casa, citas próximas y revisiones que tocan.

Para probar la lectura de documentos hay PDF inventados en `public/documentos-de-prueba/` (análisis, receta de gafas, partes de baja, confirmación y alta, receta e informe).

## Qué hace

- **Varias personas** en el mismo móvil (los padres, los hijos…), cada una con su foto.
- **Alertas** nada más entrar: medicinas sin tomar, azúcar o tensión por apuntar, citas y revisiones.
- **Medicación**: horas de cada toma con «Tomada / Sin tomar», foto de la pastilla o de la caja para reconocerla, avisos de alergia y un **historial** de lo que se tomó antes (cuánto tiempo, qué tal fue, por qué se dejó), buscable por nombre o por familia. Al apuntar una nueva, avisa si ya se tomó esa u otra de la misma familia.
- **Análisis**: el PDF del laboratorio se lee **en el propio móvil, sin IA ni internet**; gráficas de evolución y valores fuera de lo normal.
- **Historial médico**, citas (con aviso y paso al calendario), constantes, revisiones y vacunas según las recomendaciones oficiales en España, salud dental con odontograma y gasto, salud ocular, bajas laborales, regla, alergias, teléfonos y ficha de emergencia.
- **Recetas de gafas y partes de baja en PDF**: también se leen sin IA.
- **Documentos, fotos y notas de voz** en cada sección.
- **IA opcional** (Claude, de Anthropic): lee cualquier informe, foto o nota de voz y propone el registro; la persona siempre confirma. Necesita una clave propia; la app explica cómo conseguirla y cuánto cuesta.
- **Resumen para el médico**, buscador, copia de seguridad con contraseña y lectura en voz alta.
- **Intro animada** del logo hecha con Remotion, con un jingle original sintetizado por código.

## Privacidad

- Todo se guarda **solo en el móvil** (IndexedDB). No hay servidor ni cuentas.
- Funciona **sin internet** una vez instalada.
- Solo sale del móvil lo que la persona decide analizar con la IA, si la ha activado.
- La copia de seguridad es un archivo que se guarda donde la persona quiera, cifrado con contraseña (AES-GCM).

## Tecnología

| Parte | Herramienta |
| --- | --- |
| Interfaz | React 19, TypeScript, React Router |
| Construcción y PWA | Vite, vite-plugin-pwa (Workbox) |
| Datos en el móvil | Dexie (IndexedDB) |
| Lectura de PDF | pdf.js |
| IA (opcional) | API de Claude (Anthropic), desde el navegador |
| Intro animada | Remotion Player |
| Pruebas | Vitest, Testing Library, fake-indexeddb |
| Calidad | oxlint, TypeScript estricto |

## Ponerla en marcha

Hace falta Node.js 20 o superior.

```bash
npm install
npm run dev
```

Otros comandos:

```bash
npm run build          # comprueba los tipos y genera la carpeta dist (lista para publicar)
npm run test:una-vez   # pasa todas las pruebas
npm run lint           # revisa el código
```

Para publicarla basta con subir la carpeta `dist` a cualquier alojamiento estático (por ejemplo, Netlify).

Scripts que generan contenido inventado:

- `node scripts/crear-documentos-prueba.mjs`: los PDF y la imagen de `public/documentos-de-prueba/`.
- `node scripts/crear-jingle.mjs`: el jingle de la intro (necesita ffmpeg).

## Cómo está organizado

```
src/
  paginas/      una pantalla por sección (Medicación, Análisis, Alertas…)
  componentes/  piezas reutilizables (fotos, tomas, adjuntos, lector de voz…)
  db/           base de datos y reglas de cada tipo de registro
  utils/        lectura de PDF e informes, fechas, medicamentos…
  datos/        catálogos: medicamentos, pruebas de laboratorio, revisiones, dientes
  ia/           conexión opcional con Claude
  intro/        animación del logo (Remotion) y jingle
  demo/         personas y documentos de ejemplo
```

## Aviso

Mi Salud es una herramienta para organizar la propia información. No da diagnósticos ni sustituye al médico ni al farmacéutico.
