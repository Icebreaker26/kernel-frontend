import LayoutSitio from '../components/LayoutSitio.jsx';
import { Beneficios, Cierre } from '../components/Secciones.jsx';
import { useSitio } from '../useSitio.js';

const BeneficiosPublico = () => {
  const { slides } = useSitio();
  return (
    <LayoutSitio titulo="Beneficios y bonos" descripcion="Incentivos, Plan de Bienestar Social y bonos de la Cooperativa Progresemos para los asociados y sus familias.">
      <Beneficios slides={slides} h1 />
      <Cierre />
    </LayoutSitio>
  );
};

export default BeneficiosPublico;
