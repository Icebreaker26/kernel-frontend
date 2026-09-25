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

/**
 * Los cuatro pasos del cierre, en orden. El primero que falta es el "actual"; los siguientes quedan pendientes.
 * Una vez completado, todos están hechos.
 */
export const pasosCierre = ({ firmados, total, guardado, sinGuardar, sellosPuestos, sellosTotal, completada }) => {
  const hecho = [
    total > 0 && firmados >= total,
    !!guardado && !sinGuardar,
    sellosTotal > 0 && sellosPuestos >= sellosTotal,
    !!completada,
  ];
  const detalle = [`${firmados}/${total} firmados`, guardado && !sinGuardar ? 'Guardado' : sinGuardar ? 'Cambios sin guardar' : 'Sin guardar', `${sellosPuestos}/${sellosTotal} ubicados`, completada ? 'En Control Interno' : 'Pendiente'];
  const titulos = ['Documentos', 'Aval y desembolso', 'Sellos', 'Completar'];
  const actual = completada ? -1 : hecho.findIndex((h) => !h);
  return titulos.map((titulo, i) => ({ n: i + 1, titulo, detalle: detalle[i], estado: hecho[i] || completada ? 'hecho' : i === actual ? 'actual' : 'pendiente' }));
};
