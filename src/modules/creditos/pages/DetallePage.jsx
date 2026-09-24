import { useParams } from 'react-router-dom';
import ExpedienteDetalle from '../components/ExpedienteDetalle.jsx';

const DetallePage = () => {
  const { id } = useParams();
  return <ExpedienteDetalle id={id} api="/creditos" modo="asesor" volver="/creditos" />;
};

export default DetallePage;
