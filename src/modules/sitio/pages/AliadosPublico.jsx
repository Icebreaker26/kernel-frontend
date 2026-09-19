import LayoutSitio from '../components/LayoutSitio.jsx';
import { Aliados, Cierre } from '../components/Secciones.jsx';
import { useSitio } from '../useSitio.js';

const AliadosPublico = () => {
  const { slides } = useSitio();
  return (
    <LayoutSitio titulo="Aliados comerciales" descripcion="Descuentos y ventajas para los asociados de la Cooperativa Progresemos en salud, educación, movilidad, hogar, recreación y turismo.">
      <Aliados slides={slides} h1 />
      <Cierre />
    </LayoutSitio>
  );
};

export default AliadosPublico;
