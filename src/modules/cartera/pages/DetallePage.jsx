import { useParams } from 'react-router-dom';
import ExpedienteDetalle from '../../creditos/components/ExpedienteDetalle.jsx';

const DetallePage = () => {
  const { id } = useParams();
  return <ExpedienteDetalle id={id} api="/cartera" modo="cartera" volver="/cartera" />;
};

export default DetallePage;
