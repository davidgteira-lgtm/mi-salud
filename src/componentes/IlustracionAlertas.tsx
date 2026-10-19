// Dibujo del banner de «Alertas»: un triángulo de aviso con ondas de alerta y la línea de un electrocardiograma.
// Sobrio y serio (sobre el fondo rojo que pone el banner), hecho a mano en SVG: pesa muy poco y se ve nítido.
// Va siempre a la derecha, así no tapa el texto en ningún tamaño de pantalla.
export function IlustracionAlertas() {
  return (
    <svg viewBox="320 0 280 300" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" className="ilustracion-alertas">
      {/* Ondas de alerta alrededor del aviso */}
      <g fill="none" stroke="#fff">
        <circle cx="470" cy="128" r="78" strokeWidth="2.5" opacity="0.28" />
        <circle cx="470" cy="128" r="108" strokeWidth="2" opacity="0.16" />
        <circle cx="470" cy="128" r="138" strokeWidth="1.5" opacity="0.08" />
      </g>

      {/* Electrocardiograma */}
      <path
        d="M320 238 H408 L420 222 L432 238 H444 L456 186 L470 272 L484 214 L494 238 H600"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />

      {/* Triángulo de aviso */}
      <path
        d="M470 54 L540 178 Q544 186 535 186 H405 Q396 186 400 178 Z"
        fill="#fff"
        fillOpacity="0.14"
        stroke="#fff"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      <rect x="463" y="92" width="14" height="56" rx="7" fill="#fff" />
      <circle cx="470" cy="166" r="8" fill="#fff" />
    </svg>
  )
}
