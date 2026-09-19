import {
  Landmark, Building2, Wallet, Gift, Star, HeartHandshake,
  ShieldCheck, PiggyBank, Banknote, Heart, Trophy, MapPin,
} from 'lucide-react';

import PresenciaExtras from '../components/PresenciaExtras.jsx';

export { BRAND, ACCENTS } from './marca.js';

// `tipo` decide qué componente de StandSlideBody dibuja el lado derecho.
// Valores de respaldo si el servidor aún no los entregó. Los oficiales viven en backend/src/modules/captacion/tarifas.js
// y llegan en las respuestas públicas (`tarifas`), así lo que ve la persona nunca contradice a lo que cobra el sistema.
const TARIFAS_DEFECTO = { aporte_minimo: 74000, fondo_bienestar: 5300, seguro_vida: 5000, bono_sorteo: 3000, cuota_admision: 35000 };
const cop = (n) => `$${Number(n).toLocaleString('es-CO')}`;

export const crearSlides = (t = TARIFAS_DEFECTO) => [
  {
    id: 'historia',
    tipo: 'timeline',
    eyebrow: 'Nuestra historia',
    titulo: 'Más de 50 años acompañando trabajadores',
    cuerpo: 'Nacimos como fondo de empleados del Ingenio Risaralda y hoy servimos a más de 2.100 asociados en la región.',
    Icono: Landmark,
    accent: 'azul',
    hitos: [
      { anio: '1974', fecha: '18 de octubre', texto: 'Se constituyó el Fondo de Trabajadores del Ingenio Risaralda con 58 asociados' },
      { anio: '1977', fecha: '2 de julio',    texto: 'Asamblea de constitución de la Cooperativa de Trabajadores del Ingenio Risaralda' },
      { anio: '1978', fecha: '17 de julio',   texto: 'Se otorga la personería jurídica: “Cooperativa de Trabajadores del Ingenio Risaralda”' },
      { anio: '1998', fecha: '6 de octubre',  texto: 'Cambio de razón social a “Cooperativa de Aporte y Crédito Progresemos”' },
      { anio: '2026', fecha: 'Hoy',           texto: 'Prestamos servicio de libranza a más de 2.100 asociados' },
    ],
  },
  {
    id: 'convenios',
    tipo: 'nombres',
    eyebrow: 'Convenios de libranza',
    titulo: 'Tu empresa ya trabaja con nosotros',
    cuerpo: 'El descuento va directo a tu nómina, sin gestiones adicionales.',
    Icono: Building2,
    accent: 'verde',
    nombres: [
      'Ingenio Risaralda', 'Cruz Verde', 'Seguridad Nacional', 'Oncólogos del Occidente',
      'Industrial Aceitera de Casanare', 'AgroIndustrial de palma aceitera', 'La Ofrenda', 'OfiHogar',
      'CGI Colombia', 'Corredores de Seguros Asociados', 'CDA del Café', 'Concretos Eje',
      '¡Viva Cerritos!', 'Pentagrama', 'Confetex de Colombia', 'Transportes Especiales del Café',
    ],
  },
  {
    id: 'servicios',
    tipo: 'columnas',
    eyebrow: 'Servicios para los asociados',
    titulo: 'Ahorro, crédito y bienestar en uno',
    cuerpo: 'Todo lo que necesitas, con el respaldo de una cooperativa vigilada por la Superintendencia de Economía Solidaria.',
    Icono: Wallet,
    accent: 'azul',
    bloques: [
      {
        titulo: 'Ahorro', Ic: PiggyBank, accent: 'azul',
        puntos: [
          { t: 'Ahorro programado', d: 'A través de aportes sociales' },
          { t: `Ahorro mínimo mensual ${cop(t.aporte_minimo)}`, d: 'Descuento de nómina' },
          { t: 'A más ahorro, más cupo de crédito' },
          { t: 'A más ahorro, más beneficios sociales' },
        ],
      },
      {
        titulo: 'Créditos', Ic: Banknote, accent: 'verde',
        puntos: [
          { t: 'Crédito de Vinculación: 1 SMMLV', d: '6 meses en la empresa' },
          { t: 'Crédito de Caja Rápida: 20% SMMLV', d: '2 meses en la empresa' },
          { t: 'Crédito para SOAT', d: 'Financiado a seis (6) meses' },
          { t: 'Otras líneas', d: 'Vehículo · Educación' },
        ],
      },
      {
        titulo: 'Bienestar', Ic: Heart, accent: 'dorado',
        puntos: [
          { t: 'Programa de seguros', d: 'Vida · Autos · Familiar · Exequial' },
          { t: 'Plan de bienestar', d: 'Fidelización · Recreación · Salud · Auxilios' },
          { t: 'Alianzas comerciales', d: 'Recreación · Salud · Hogar · Educación' },
          { t: 'Auxilios', d: 'Educación · Solidaridad · Calamidad' },
        ],
      },
    ],
  },
  {
    id: 'incentivos',
    tipo: 'grupos',
    eyebrow: 'Incentivos para los asociados',
    titulo: 'Beneficios que sentirás todo el año',
    cuerpo: 'Distribución equitativa de beneficios sociales.',
    Icono: Gift,
    accent: 'dorado',
    grupos: [
      {
        titulo: 'Obsequios y celebraciones', accent: 'dorado',
        puntos: [
          'Ancheta navideña para todos los asociados(as)',
          'Obsequio para asociadas en periodo de maternidad',
          'Obsequio por el nacimiento de los hijos',
          'Obsequio por matrimonio',
          'Celebración del día del Padre, de la Madre y del Niño',
        ],
      },
      {
        titulo: 'Rifas y bingos', accent: 'azul',
        puntos: [
          'Rifa de bono mensual para quienes cumplieron años en el mes',
          'Rifas de bonos KUPI por fidelización',
          'Bingos por empresas',
        ],
      },
      {
        titulo: 'Salud y calamidad', accent: 'verde',
        puntos: [
          'Brigadas de salud: exámenes visuales y de prevención',
          'Auxilio de mercado por fallecimiento del asociado cabeza de familia',
          '“Bono de Calamidad” por fallecimiento de familiar en primer grado',
          'Apoyo en diferentes situaciones de calamidad',
        ],
      },
      {
        titulo: 'Bienestar y paseos', accent: 'bosque',
        puntos: [
          'Auxilios por antigüedad para los paseos que programe la Cooperativa',
          'Apoyo en las actividades de bienestar que programen las empresas',
        ],
      },
    ],
  },
  {
    id: 'alianzas',
    tipo: 'categorias',
    eyebrow: 'Alianzas comerciales',
    titulo: 'Más que una cooperativa, una red de beneficios',
    cuerpo: 'Descuentos y ventajas para ti y tu familia en aliados de la región.',
    Icono: Star,
    accent: 'verde',
    categorias: [
      { titulo: 'Educación', accent: 'azul', nombres: ['UNAD', 'Universidad Cooperativa de Colombia', 'Eleganza Academia'] },
      { titulo: 'Salud', accent: 'verde', nombres: ['Laboratorio López Correa', 'Opticalia', 'Óptica Empresarial', 'Óptica MV', 'Marcela Agudelo Restrepo', 'Emi'] },
      { titulo: 'Movilidad', accent: 'dorado', nombres: ['CEA Conductor', 'Rodando', 'CDA del Café', 'BRAM', 'Merlin'] },
      { titulo: 'Hogar y comercio', accent: 'bosque', nombres: ['Los Olivos', 'Closets & Cocinas', 'La Ofrenda', 'Cucuteño', 'Ceveco'] },
      { titulo: 'Recreación y turismo', accent: 'azul', nombres: ['Termales Santa Rosa de Cabal', 'Viajes Fantasía', 'Corre Caminos'] },
    ],
  },
  {
    id: 'presencia',
    tipo: 'mapa',
    eyebrow: 'Presencia',
    titulo: 'Estamos en todo el país',
    cuerpo: 'Personas de todo Colombia ya hacen parte de la cooperativa: trabajan en empresas con convenio y viven en municipios de todas las regiones.',
    Icono: MapPin,
    accent: 'verde',
    Extra: PresenciaExtras,   // texto adicional bajo el cuerpo (cifras reales y puntos)
  },
  {
    id: 'asociacion',
    tipo: 'precios',
    eyebrow: 'Valor de la asociación',
    titulo: `Desde ${cop(t.aporte_minimo + t.fondo_bienestar)} al mes`,
    cuerpo: `Cuota de admisión solo el primer mes (${cop(t.cuota_admision)}). Descuento por nómina. Al retirarte, te devolvemos el 100% de tus aportes.`,
    Icono: HeartHandshake,
    accent: 'azul',
    items: [
      { Ic: PiggyBank,   label: 'Aportes (ahorro 100%)', val: cop(t.aporte_minimo) },
      { Ic: Heart,       label: 'Fondo de bienestar',    val: cop(t.fondo_bienestar) },
      { Ic: ShieldCheck, label: 'Seguro de vida $5M (opcional)',    val: cop(t.seguro_vida) },
      { Ic: Trophy,      label: 'Bono sorteo $1M (opcional)',       val: cop(t.bono_sorteo) },
    ],
  },
];

export const SLIDES = crearSlides();
