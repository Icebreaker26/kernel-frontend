import LayoutSitio from '../components/LayoutSitio.jsx';
import { Cierre, Servicios } from '../components/Secciones.jsx';
import { useSitio } from '../useSitio.js';

const ServiciosPublico = () => {
  const { slides } = useSitio();
  return (
    <LayoutSitio titulo="Servicios y créditos" descripcion="Ahorro, líneas de crédito por libranza y bienestar para los asociados de la Cooperativa Progresemos.">
      <Servicios slides={slides} h1 />
      <Cierre />
    </LayoutSitio>
  );
};

export default ServiciosPublico;
