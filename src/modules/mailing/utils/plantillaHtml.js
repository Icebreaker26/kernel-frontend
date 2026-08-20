// Genera cuerpo_html a partir de la estructura de plantilla.
// El HTML producido se inyecta dentro del template base de la cooperativa (mailingController.js).

const boton = (texto, url) =>
  texto && url
    ? `<p style="margin:24px 0 0;">
        <a href="${url}" style="display:inline-block;background:#006680;color:#ffffff;text-decoration:none;
          padding:11px 28px;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:1px;">
          ${texto} &rarr;
        </a>
       </p>`
    : '';

const parrafos = (texto) =>
  (texto ?? '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

const titulo = (texto, color = '#003d4d') =>
  `<h2 style="margin:0 0 20px;color:${color};font-size:20px;font-weight:700;letter-spacing:1px;">${texto}</h2>`;

// ── Generadores por tipo ──────────────────────────────────────────────────────

const generadores = {
  comunicado: ({ titulo: t, cuerpo, boton_texto, boton_url }) =>
    titulo(t) + parrafos(cuerpo) + boton(boton_texto, boton_url),

  promocion: ({ titulo: t, descripcion, puntos, boton_texto, boton_url }) => {
    const items = (puntos ?? '')
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<li style="margin-bottom:8px;color:#334155;font-size:14px;">${p}</li>`)
      .join('\n');
    return (
      titulo(t, '#5b21b6') +
      `<p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${descripcion}</p>` +
      (items
        ? `<ul style="margin:0 0 18px;padding-left:20px;">\n${items}\n</ul>`
        : '') +
      boton(boton_texto, boton_url)
    );
  },

  recordatorio: ({ titulo: t, evento, fecha, mensaje, boton_texto, boton_url }) =>
    titulo(t) +
    `<div style="background:#f0f9ff;border-left:4px solid #006680;border-radius:0 4px 4px 0;padding:14px 18px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-weight:700;color:#003d4d;font-size:15px;">${evento}</p>
      <p style="margin:0;color:#0369a1;font-size:13px;">📅 ${fecha}</p>
     </div>` +
    (mensaje ? parrafos(mensaje) : '') +
    boton(boton_texto, boton_url),
};

export const generarHtml = (plantilla) => {
  if (!plantilla?.tipo || !plantilla?.campos) return '';
  const gen = generadores[plantilla.tipo];
  return gen ? gen(plantilla.campos) : '';
};

export const PLANTILLAS_INFO = [
  {
    tipo:        'comunicado',
    nombre:      'Comunicado',
    descripcion: 'Anuncio general o mensaje institucional',
    emoji:       '📢',
    campos: [
      { key: 'titulo',      label: 'Título',         tipo: 'input',    placeholder: 'Ej: Actualización de tarifas 2025' },
      { key: 'cuerpo',      label: 'Mensaje',        tipo: 'textarea', placeholder: 'Escribe el cuerpo del comunicado. Separa párrafos con una línea en blanco.' },
      { key: 'boton_texto', label: 'Texto del botón', tipo: 'input',   placeholder: 'Ej: Ver más información', optional: true },
      { key: 'boton_url',   label: 'Enlace del botón', tipo: 'input',  placeholder: 'https://...', optional: true },
    ],
  },
  {
    tipo:        'promocion',
    nombre:      'Promoción',
    descripcion: 'Oferta, beneficio o campaña especial',
    emoji:       '🎁',
    campos: [
      { key: 'titulo',      label: 'Título de la promoción', tipo: 'input',    placeholder: 'Ej: ¡Tu bono solidario ya está disponible!' },
      { key: 'descripcion', label: 'Descripción',            tipo: 'textarea', placeholder: 'Describe brevemente la oferta o beneficio.' },
      { key: 'puntos',      label: 'Puntos clave',           tipo: 'textarea', placeholder: 'Un punto por línea:\nAcceso inmediato\n30 días de vigencia\nSin costo adicional', optional: true },
      { key: 'boton_texto', label: 'Texto del botón',        tipo: 'input',    placeholder: 'Ej: Reclamar mi bono' },
      { key: 'boton_url',   label: 'Enlace del botón',       tipo: 'input',    placeholder: 'https://...' },
    ],
  },
  {
    tipo:        'recordatorio',
    nombre:      'Recordatorio',
    descripcion: 'Evento, fecha límite o vencimiento próximo',
    emoji:       '📅',
    campos: [
      { key: 'titulo',      label: 'Título',        tipo: 'input',    placeholder: 'Ej: Recordatorio de pago de aportes' },
      { key: 'evento',      label: 'Evento',        tipo: 'input',    placeholder: 'Ej: Pago cuota mensual' },
      { key: 'fecha',       label: 'Fecha',         tipo: 'input',    placeholder: 'Ej: 31 de agosto de 2025' },
      { key: 'mensaje',     label: 'Mensaje adicional', tipo: 'textarea', placeholder: 'Información adicional o instrucciones...', optional: true },
      { key: 'boton_texto', label: 'Texto del botón',   tipo: 'input',    placeholder: 'Ej: Ir al portal', optional: true },
      { key: 'boton_url',   label: 'Enlace del botón',  tipo: 'input',    placeholder: 'https://...', optional: true },
    ],
  },
];
