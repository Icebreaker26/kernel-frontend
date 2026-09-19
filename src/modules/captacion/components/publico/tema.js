import { createContext, useContext } from 'react';
import { BRAND } from '../../data/marca.js';

/**
 * Los componentes de formulario (ui.jsx) se dibujan con uno de dos temas:
 *  - "publico": claro y amable, con la paleta del logo. Es el que ve el asociado (por defecto).
 *  - "panel":   claro con acento esmeralda, el del módulo del asesor. Así el asesor nunca confunde una
 *               pantalla suya con una del asociado, aunque el formulario sea el mismo.
 * Para usar el otro tema basta envolver el formulario en <TemaContext.Provider value="panel">.
 */
export const TEMAS = {
  publico: {
    controlBase: 'w-full rounded-xl border bg-white px-3.5 py-3 text-base text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-4',
    controlOk:   'border-slate-300 focus:border-[#065B8E] focus:ring-[#065B8E]/15',
    controlErr:  'border-red-400 focus:border-red-500 focus:ring-red-500/15',
    etiqueta: 'mb-1.5 block text-sm font-semibold text-slate-700',
    asterisco: 'text-red-500',
    ayuda: 'mt-1 block text-sm text-slate-500',
    errorTexto: 'mt-1 block text-sm font-medium text-red-600',
    simbolo: 'text-slate-500',
    casilla: 'rounded-xl border-slate-200 bg-white p-3.5 hover:border-slate-300 has-[:checked]:border-[#065B8E]/50 has-[:checked]:bg-[#E8F1F7]/50',
    casillaTexto: 'text-base leading-snug text-slate-700',
    casillaDesc: 'text-sm text-slate-500',

    grupo: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5',
    grupoTitulo: 'text-lg font-extrabold text-slate-900',
    grupoDesc: 'mt-0.5 text-sm text-slate-500',

    avisoBase: 'flex gap-3 rounded-xl border p-3.5',
    avisoTexto: 'text-[15px] leading-snug',
    avisos: {
      info:  'border-[#065B8E]/25 bg-[#E8F1F7] text-[#0b4468]',
      aviso: 'border-amber-300 bg-amber-50 text-amber-900',
      error: 'border-red-300 bg-red-50 text-red-800',
      ok:    'border-[#5B9C3C]/40 bg-[#EEF5E9] text-[#2f5f1a]',
    },

    botonPrimario: 'rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-sm hover:brightness-95',
    botonPrimarioEstilo: { background: BRAND.azul },
    botonSecundario: 'rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50',
    barra: 'border-t border-slate-200 bg-white/95 sm:rounded-b-2xl',
    barraAyuda: 'text-sm text-slate-500',

    segContenedor: 'rounded-xl bg-slate-100 p-1',
    segBoton: 'rounded-lg px-3 py-2 text-base font-semibold transition',
    segActivo: 'bg-white text-[#065B8E] shadow-sm',
    segInactivo: 'text-slate-500 hover:text-slate-700',

    // Sección de aportes
    opcionOn: 'border-[#065B8E] bg-[#E8F1F7]/60',
    opcionOff: 'border-slate-200 bg-white hover:border-slate-300',
    opcionTitulo: 'text-base font-extrabold text-slate-900',
    opcionDesc: 'text-sm leading-snug text-slate-600',
    opcionPrecio: 'text-base font-extrabold text-slate-900',
    opcionUnidad: 'text-xs text-slate-500',
    opcionIcono: 'bg-white text-[#065B8E] shadow-sm ring-1 ring-slate-200',
    check: 'accent-[#065B8E]',
    incluido: {
      caja: 'border-[#5B9C3C]/40 bg-[#EEF5E9]/60', marca: 'bg-[#5B9C3C] text-white',
      icono: 'bg-white text-[#3F7A25] shadow-sm ring-1 ring-slate-200', pastilla: 'bg-white text-[#3F7A25]',
    },
    linea: 'text-base text-slate-700',
    lineaFuerte: 'text-lg font-extrabold text-slate-900',
    lineaTenue: 'text-sm text-slate-500',
    divisor: 'border-slate-200',
  },

  panel: {
    controlBase: 'w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-4',
    controlOk:   'border-emerald-200 focus:border-emerald-600 focus:ring-emerald-600/15',
    controlErr:  'border-red-400 focus:border-red-500 focus:ring-red-500/15',
    etiqueta: 'mb-1.5 block text-sm font-semibold text-emerald-900',
    asterisco: 'text-red-500',
    ayuda: 'mt-1 block text-sm text-slate-500',
    errorTexto: 'mt-1 block text-sm font-medium text-red-600',
    simbolo: 'text-slate-500',
    casilla: 'rounded-lg border-emerald-200 bg-white p-3.5 hover:border-emerald-300 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50',
    casillaTexto: 'text-[15px] leading-snug text-slate-700',
    casillaDesc: 'text-sm text-slate-500',

    grupo: 'rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5',
    grupoTitulo: 'text-base font-extrabold text-emerald-800',
    grupoDesc: 'mt-0.5 text-sm text-slate-500',

    avisoBase: 'flex gap-3 rounded-lg border p-3.5',
    avisoTexto: 'text-sm leading-snug',
    avisos: {
      info:  'border-emerald-300 bg-emerald-50 text-emerald-900',
      aviso: 'border-amber-300 bg-amber-50 text-amber-900',
      error: 'border-red-300 bg-red-50 text-red-800',
      ok:    'border-emerald-400 bg-emerald-100 text-emerald-900',
    },

    botonPrimario: 'rounded-lg bg-emerald-600 px-6 py-3 text-[15px] font-bold text-white shadow-sm hover:bg-emerald-700',
    botonPrimarioEstilo: undefined,
    botonSecundario: 'rounded-lg border border-emerald-300 bg-white px-5 py-3 text-[15px] font-semibold text-emerald-800 hover:bg-emerald-50',
    barra: 'border-t border-emerald-200 bg-white/95',
    barraAyuda: 'text-sm text-slate-500',

    segContenedor: 'rounded-lg bg-emerald-100/70 p-1',
    segBoton: 'rounded-md px-3 py-2 text-[15px] font-semibold transition',
    segActivo: 'bg-white text-emerald-700 shadow-sm',
    segInactivo: 'text-emerald-900/80 hover:text-emerald-900',

    opcionOn: 'border-emerald-600 bg-emerald-50',
    opcionOff: 'border-emerald-100 bg-white hover:border-emerald-300',
    opcionTitulo: 'text-[15px] font-extrabold text-slate-900',
    opcionDesc: 'text-sm leading-snug text-slate-600',
    opcionPrecio: 'text-[15px] font-extrabold text-slate-900',
    opcionUnidad: 'text-xs text-slate-500',
    opcionIcono: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    check: 'accent-emerald-600',
    incluido: {
      caja: 'border-emerald-300 bg-emerald-50', marca: 'bg-emerald-600 text-white',
      icono: 'bg-white text-emerald-700 ring-1 ring-emerald-200', pastilla: 'bg-white text-emerald-700',
    },
    linea: 'text-[15px] text-slate-700',
    lineaFuerte: 'text-lg font-extrabold text-emerald-700',
    lineaTenue: 'text-sm text-slate-500',
    divisor: 'border-emerald-200',
  },
};

export const TemaContext = createContext('publico');
export const useTema = () => TEMAS[useContext(TemaContext)] || TEMAS.publico;
