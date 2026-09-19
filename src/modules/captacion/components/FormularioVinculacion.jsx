import { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import pub from '../services/captacionPublicApi.js';
import StepUpModal       from './StepUpModal.jsx';
import SeccionPersonal   from './SeccionPersonal.jsx';
import SeccionLaboral    from './SeccionLaboral.jsx';
import SeccionFinanciera from './SeccionFinanciera.jsx';
import SeccionPep        from './SeccionPep.jsx';
import SeccionBeneficiarios from './SeccionBeneficiarios.jsx';
import SeccionReferencias   from './SeccionReferencias.jsx';
import SeccionFirma      from './SeccionFirma.jsx';

const SECTIONS = [
  { key: 'personal',     label: 'Personal',     block: 1 },
  { key: 'laboral',      label: 'Laboral',       block: 1 },
  { key: 'financiera',   label: 'Financiera',    block: 2 },
  { key: 'pep',          label: 'Cumplimiento',  block: 2 },
  { key: 'beneficiarios',label: 'Beneficiarios', block: 3 },
  { key: 'referencias',  label: 'Referencias',   block: 3 },
  { key: 'firma',        label: 'Firma',         block: 3 },
];

const BLOCKS = [
  { num: 1, label: 'Información básica',  time: '~3 min' },
  { num: 2, label: 'Perfil financiero',   time: '~3 min' },
  { num: 3, label: 'Cierre y firma',      time: '~3 min' },
];

const DRAFT_KEY = (token) => `captacion_draft_${token}`;

const readDraft = (token) => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY(token)) || '{}'); }
  catch { return {}; }
};

const saveDraft = (token, key, value) => {
  try {
    const d = readDraft(token);
    localStorage.setItem(DRAFT_KEY(token), JSON.stringify({ ...d, [key]: value }));
  } catch {}
};

const FormularioVinculacion = ({ prospecto, token, isStand, stepupToken, setStepupToken, onFirmado }) => {
  const vin = prospecto?.vinculacion;

  const firstIncomplete = SECTIONS.findIndex(
    (s) => s.key !== 'firma' && !vin?.[`seccion_${s.key}_at`]
  );
  const hasAllSections = SECTIONS.slice(0, 6).every(s => vin?.[`seccion_${s.key}_at`]);
  const initialSection = hasAllSections ? 6 : Math.max(0, firstIncomplete);

  const [current, setCurrent]         = useState(initialSection);
  const [saving, setSaving]           = useState(false);
  const [showStepUp, setShowStepUp]   = useState(false);
  const [done, setDone]               = useState(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s.key]: !!vin?.[`seccion_${s.key}_at`] }), {})
  );

  const draft = readDraft(token);

  const currentBlock = BLOCKS[SECTIONS[current]?.block - 1];

  const saveSection = async (seccion, data) => {
    setSaving(true);
    saveDraft(token, seccion, data);
    try {
      if (seccion === 'firma') {
        await pub.post(`/captacion/pub/${token}/firmar`, data, {
          headers: { 'X-Stepup-Token': stepupToken || '' },
        });
        onFirmado();
        return;
      }
      await pub.put(`/captacion/pub/${token}/seccion/${seccion}`, data);
      setDone(prev => ({ ...prev, [seccion]: true }));
      setCurrent(prev => {
        const next = SECTIONS.findIndex((s, i) => i > prev && !done[s.key] && s.key !== 'firma');
        if (next === -1) {
          const allDone = SECTIONS.slice(0, 6).every(s => done[s.key] || s.key === seccion);
          return allDone ? 6 : prev + 1;
        }
        return next;
      });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code?.startsWith('STEPUP')) {
        setShowStepUp(true);
      } else {
        console.error('Error saving section', err);
      }
    } finally {
      setSaving(false);
    }
  };

  const goToSection = (i) => {
    const isReachable = i === 0 || SECTIONS.slice(0, i).every(s => done[s.key]);
    if (!isReachable) return;
    if (i === 6 && !isStand && !stepupToken) { setShowStepUp(true); return; }
    setCurrent(i);
  };

  const handleFirmarClick = () => {
    if (!isStand && !stepupToken) { setShowStepUp(true); return; }
    setCurrent(6);
  };

  const section = SECTIONS[current];

  return (
    <div className="min-h-screen bg-[#020617] font-mono text-slate-200">
      {/* Header progress */}
      <div className="sticky top-0 bg-[#020617]/95 backdrop-blur border-b border-slate-800/60 z-10 px-4 py-3">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-400/60 text-[9px] tracking-[3px]">// {currentBlock?.label?.toUpperCase()}</p>
            <p className="text-slate-600 text-[9px]">{currentBlock?.time}</p>
          </div>
          <div className="flex items-center gap-1">
            {SECTIONS.map((s, i) => {
              const isDone = done[s.key];
              const isActive = i === current;
              return (
                <button
                  key={s.key}
                  onClick={() => goToSection(i)}
                  className="flex-1 h-1 rounded transition-all"
                  style={{
                    background: isDone ? '#10b981' : isActive ? '#6ee7b7' : '#1e293b',
                    cursor: isDone || i === 0 || SECTIONS.slice(0,i).every(s2 => done[s2.key]) ? 'pointer' : 'default',
                  }}
                  title={s.label}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-[9px] text-emerald-400/70 capitalize">{section?.label}</p>
            <span className="text-slate-700 text-[9px]">·</span>
            <p className="text-slate-600 text-[9px]">{current + 1}/{SECTIONS.length}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-4 py-6">
        {/* Prospecto info card */}
        {current === 0 && (
          <div className="bg-emerald-900/10 border border-emerald-900/30 rounded p-3 mb-4">
            <p className="text-emerald-400/60 text-[9px] tracking-[2px] mb-1">// COMPLETANDO SOLICITUD DE</p>
            <p className="text-slate-200 text-sm font-bold">{prospecto?.nombres} {prospecto?.apellidos}</p>
            <p className="text-slate-500 text-[10px]">CC {prospecto?.cedula} · {prospecto?.celular}</p>
          </div>
        )}

        {/* Section components */}
        {section?.key === 'personal' && (
          <SeccionPersonal defaultValues={draft.personal || {}} onSave={(d) => saveSection('personal', d)} saving={saving} />
        )}
        {section?.key === 'laboral' && (
          <SeccionLaboral defaultValues={draft.laboral || {}} onSave={(d) => saveSection('laboral', d)} saving={saving} />
        )}
        {section?.key === 'financiera' && (
          <SeccionFinanciera defaultValues={draft.financiera || {}} onSave={(d) => saveSection('financiera', d)} saving={saving} isStand={isStand} />
        )}
        {section?.key === 'pep' && (
          <SeccionPep defaultValues={draft.pep || {}} onSave={(d) => saveSection('pep', d)} saving={saving} />
        )}
        {section?.key === 'beneficiarios' && (
          <SeccionBeneficiarios defaultValues={draft.beneficiarios || {}} onSave={(d) => saveSection('beneficiarios', d)} saving={saving} />
        )}
        {section?.key === 'referencias' && (
          <SeccionReferencias defaultValues={draft.referencias || {}} onSave={(d) => saveSection('referencias', d)} saving={saving} />
        )}
        {section?.key === 'firma' && (
          <SeccionFirma
            prospecto={prospecto}
            stepupToken={stepupToken}
            onSave={(d) => saveSection('firma', d)}
            saving={saving}
          />
        )}

        {/* Block summary when all sections in a block are done */}
        {current < 6 && !section && (
          <div className="text-center py-8">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-300 text-sm">Todas las secciones completadas.</p>
            <button onClick={handleFirmarClick}
              className="mt-4 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold tracking-wider rounded transition-all">
              Ir a firmar
            </button>
          </div>
        )}
      </div>

      {/* Block nav buttons at bottom */}
      {current > 0 && current < 6 && (
        <div className="max-w-sm mx-auto px-4 pb-6">
          <button onClick={() => setCurrent(prev => prev - 1)}
            className="text-slate-600 hover:text-slate-400 text-[10px] transition-colors">
            ← Sección anterior
          </button>
        </div>
      )}

      {/* Step-up modal */}
      {showStepUp && (
        <StepUpModal
          token={token}
          onVerificado={(t) => {
            setStepupToken(t);
            setShowStepUp(false);
            setCurrent(6);
          }}
          onCancelar={() => setShowStepUp(false)}
        />
      )}
    </div>
  );
};

export default FormularioVinculacion;
