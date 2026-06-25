import { Ticket } from 'lucide-react';

const Sorteos = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-600 py-20">
    <Ticket size={40} className="mb-4 opacity-30" />
    <p className="text-sm">Selecciona un sorteo en el panel izquierdo</p>
    <p className="text-xs mt-1">o crea uno nuevo con el botón verde</p>
  </div>
);

export default Sorteos;
