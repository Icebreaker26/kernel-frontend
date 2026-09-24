import { moneda } from '../../creditos/lib/formato.js';

const redondear = (n) => Math.round(Number(n) * 100) / 100;

/** Misma regla que el servidor: aval = % sobre el monto a desembolsar; la firma electrónica se resta solo si fue con proveedor externo. */
export const calcular = ({ monto, conAval, porcentaje, externa, tarifa }) => {
  const pct = Number(porcentaje);
  const aval = conAval && pct > 0 ? redondear((Number(monto) * pct) / 100) : 0;
  const firma = externa ? redondear(tarifa) : 0;
  return { aval, firma, neto: redondear(Number(monto) - aval - firma) };
};

/** Textos de cada sello (idénticos a los que estampa el servidor). Solo los que aplican a este crédito. */
export const textosSellos = ({ conAval, porcentaje, externa }, valores) => ({
  ...(conAval ? { aval: { titulo: 'AVAL FONDO REGIONAL', valor: moneda(valores.aval), pie: `${Number(porcentaje)}% del valor solicitado` } } : {}),
  ...(externa ? { firma: { titulo: 'FIRMA ELECTRONICA', valor: moneda(valores.firma), pie: 'costo del proveedor' } } : {}),
  desembolso: { titulo: 'DESEMBOLSO', valor: moneda(valores.neto), pie: 'valor neto a pagar' },
});

/** Posición inicial de los sellos que aún no se han colocado: apilados en la esquina superior derecha de la primera página. */
export const conPosicionInicial = (sellos, claves) => {
  const out = {};
  claves.forEach((c, i) => { out[c] = sellos?.[c] ?? { pagina: 0, x: 0.66, y: 0.04 + i * 0.1 }; });
  return out;
};
