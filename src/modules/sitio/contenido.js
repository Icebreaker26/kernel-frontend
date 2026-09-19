/**
 * Contenido propio del sitio público (no lo usa el kiosco). Tomado de las páginas actuales de WordPress:
 * /lineas/, /planbienestar/ y /bonos/. Si cambia, se edita aquí.
 */

// Las condiciones solo se muestran donde la cooperativa las publica hoy; el resto se explica al asociarse.
export const LINEAS_CREDITO = [
  { t: 'Vinculación', d: '1 SMMLV · 6 meses en la empresa' },
  { t: 'Caja rápida', d: '20% SMMLV · 2 meses en la empresa' },
  { t: 'SOAT', d: 'Financiado a 6 meses' },
  { t: 'Libre inversión' },
  { t: 'Vehicular' },
  { t: 'Educación' },
  { t: 'Vivienda' },
  { t: 'Calamidad doméstica' },
  { t: 'Alianzas comerciales' },
];

// Cuatro líneas estratégicas del Plan de Bienestar Social
export const PLAN_BIENESTAR = {
  titulo: 'Plan de Bienestar Social',
  cuerpo: 'Un conjunto de acciones para mejorar la calidad de vida de los asociados y sus familias, y fortalecer los lazos entre las empresas, la cooperativa y sus asociados.',
  lineas: [
    { t: 'Fidelización', accent: 'dorado', items: ['Alianzas comerciales', 'Ferias comerciales', 'Rifas de bonos', 'Rifas de cumpleaños', 'Talleres de formación'] },
    { t: 'Recreación',   accent: 'azul',   items: ['Torneos de juegos de mesa', 'Rumbo terapias', 'Paseos de integración', 'Torneos deportivos', 'Celebraciones especiales'] },
    { t: 'Salud',        accent: 'verde',  items: ['Brigadas odontológicas', 'Brigadas de optometría', 'Terapias de masajes', 'Talleres de nutrición', 'Donación de sangre'] },
    { t: 'Emprendimiento', accent: 'bosque', items: ['Premio al emprendimiento', 'Cursos de emprendimiento', 'Feria de emprendimiento', 'Alianzas con el Sena', 'Crédito de emprendimiento'] },
  ],
};

export const BONOS = {
  titulo: 'Bonos: cada número cuenta',
  cuerpo: 'Los números participan el primer y el último viernes de cada mes, con las últimas 3 cifras de la Lotería de Risaralda.',
  pasos: [
    'Entra al portal de asociados con tu cédula.',
    '¿Primera vez? Pide tu acceso con “Solicitar acceso”; te avisamos por WhatsApp.',
    'Consulta tus números, pide nuevos bonos y sigue tus participaciones.',
  ],
};
