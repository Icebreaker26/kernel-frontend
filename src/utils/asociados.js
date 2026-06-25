export const CLASE_CUOTA = {
  '1': 'Quincenal',
  '2': 'Mensual',
};

export const labelClaseCuota = (valor) => CLASE_CUOTA[valor] ?? valor ?? '—';
