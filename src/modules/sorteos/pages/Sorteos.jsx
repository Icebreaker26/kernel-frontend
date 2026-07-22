import { Ticket } from 'lucide-react';

const Sorteos = () => (
  <div className="flex flex-col items-center justify-center h-full text-[#1a4a55] py-20">
    <Ticket size={40} className="mb-4 opacity-20" style={{ color: '#00e5ff' }} />
    <p className="text-[10px] tracking-[3px]">SELECCIONA UN SORTEO EN EL PANEL IZQUIERDO</p>
    <p className="text-[9px] mt-1 tracking-widest opacity-60">o crea uno nuevo con el botón superior</p>
  </div>
);

export default Sorteos;
