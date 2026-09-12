import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DIAS_ES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Jul','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmtCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

const CalendarioFacturas = ({ facturas = [], accent = '#34d399', onDetalle }) => {
  const hoy = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const [mes, setMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() });

  const { year, month } = mes;

  const prev    = () => setMes(m => m.month === 0  ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 });
  const next    = () => setMes(m => m.month === 11 ? { year: m.year + 1, month: 0  } : { ...m, month: m.month + 1 });
  const goToday = () => setMes({ year: hoy.getFullYear(), month: hoy.getMonth() });

  const porDia = useMemo(() => {
    const map = {};
    facturas.forEach(f => {
      if (!f.fecha_vencimiento) return;
      const key = String(f.fecha_vencimiento).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    });
    return map;
  }, [facturas]);

  const prefix   = `${year}-${String(month + 1).padStart(2, '0')}`;
  const totalMes = Object.entries(porDia)
    .filter(([k]) => k.startsWith(prefix))
    .reduce((s, [, v]) => s + v.length, 0);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-[3px]" style={{ color: accent }}>
            {MESES_ES[month].toUpperCase()} {year}
          </span>
          {totalMes > 0 && (
            <span className="text-[9px] tracking-widest px-2 py-0.5 rounded-sm border"
              style={{ color: accent, borderColor: accent + '44', background: accent + '11' }}>
              {totalMes} FACT.
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goToday}
            className="px-2 py-1 text-[9px] tracking-widest rounded-sm border border-[#1e3a4a] text-[#6aacbc] hover:text-[#a0d4e0] transition-all">
            HOY
          </button>
          <button onClick={prev}
            className="p-1.5 rounded-sm border border-[#1e3a4a] text-[#6aacbc] hover:text-[#a0d4e0] transition-all">
            <ChevronLeft size={12} />
          </button>
          <button onClick={next}
            className="p-1.5 rounded-sm border border-[#1e3a4a] text-[#6aacbc] hover:text-[#a0d4e0] transition-all">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Encabezados de días */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_ES.map(d => (
          <div key={d} className="text-center text-[9px] tracking-widest text-[#4a7a8a] py-1 font-bold">{d}</div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[72px]" />;

          const dateStr     = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayFacturas = porDia[dateStr] || [];
          const cellDate    = new Date(year, month, day);
          const isToday     = cellDate.getTime() === hoy.getTime();
          const hasFacts    = dayFacturas.length > 0;

          return (
            <div key={i}
              className="min-h-[72px] p-1 rounded-sm border transition-colors"
              style={{
                borderColor: hasFacts ? accent + '33' : '#1e3a4a22',
                background:  isToday  ? accent + '08' : hasFacts ? accent + '04' : 'transparent',
              }}>
              <p className="text-right text-[9px] mb-0.5 leading-none"
                style={{ color: isToday ? accent : '#4a7a8a', fontWeight: isToday ? 700 : 400 }}>
                {day}
              </p>
              {dayFacturas.map(f => {
                const dias  = Math.round((new Date(f.fecha_vencimiento + 'T00:00:00') - hoy) / 86400000);
                const color = dias < 0 ? '#ef4444' : dias <= 5 ? '#fbbf24' : accent;
                return (
                  <div key={f.id}
                    onClick={() => onDetalle?.(f)}
                    className="text-[7px] leading-tight px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-75 transition-opacity"
                    style={{ background: color + '15', color, border: `1px solid ${color}33` }}
                    title={`${f.proveedor_nombre} — ${fmtCOP(f.monto)}`}>
                    {f.proveedor_nombre}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {totalMes === 0 && (
        <p className="text-center text-[10px] tracking-widest text-[#2a4a5a] mt-6">
          SIN FACTURAS CON VENCIMIENTO ESTE MES
        </p>
      )}
    </div>
  );
};

export default CalendarioFacturas;
