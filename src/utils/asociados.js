// Devuelve true si todas las palabras del query aparecen en alguno de los campos
export const coincideBusqueda = (query, ...campos) => {
  const palabras = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const texto    = campos.join(' ').toLowerCase();
  return palabras.every((p) => texto.includes(p));
};

export const CLASE_CUOTA = {
  '1': 'Quincenal',
  '2': 'Mensual',
};

export const labelClaseCuota = (valor) => CLASE_CUOTA[valor] ?? valor ?? '—';
