import { useRef, useState } from 'react';
import QRCode from 'qrcode';
import EventSection from '../components/events/EventSection';
import { api } from '../services/api';

const DEFAULT_GATE_IN_CONFIG = {
  stagiaire: [
    { id: 'project', label: 'Projet en cours', requiresProject: true, enabled: true },
    { id: 'information', label: "Demande d'information / Consultation", enabled: true },
    { id: 'idea', label: "Amélioration / Demande d'idée", enabled: true },
    { id: 'event', label: 'Event', requiresEvent: true, enabled: true },
    { id: 'internship', label: 'Stage', enabled: true },
    { id: 'other', label: 'Other', requiresText: true, enabled: true }
  ],
  staff: [
    { id: 'visit_objective', label: 'Objectif de visite', requiresText: true, enabled: true },
    { id: 'project', label: 'Project', requiresProject: true, enabled: true },
    { id: 'event', label: 'Event', requiresEvent: true, enabled: true }
  ],
  visitor: [
    { id: 'visit_objective', label: 'Objectif de visite', requiresText: true, enabled: true },
    { id: 'event', label: 'Event', requiresEvent: true, enabled: true }
  ]
};

function activeConfig(config) {
  return {
    stagiaire: (config.stagiaire || []).filter((item) => item.enabled !== false),
    staff: (config.staff || []).filter((item) => item.enabled !== false),
    visitor: (config.visitor || []).filter((item) => item.enabled !== false)
  };
}

function GateCard({ type }) {
  const canvasRef = useRef(null);
  const [payload, setPayload] = useState(null);

  const isIn = type === 'in';
  const isEvent = type === 'event';

  const handleGenerate = async () => {
    if (isIn) {
      await api.saveGateConfig(activeConfig(DEFAULT_GATE_IN_CONFIG));
    }
    const qr = await api.getPermanentGateQr(isIn ? 'GATE_IN' : (isEvent ? 'EVENT' : 'GATE_OUT'));
    const data = JSON.stringify({
      action: isIn ? 'check_in' : (isEvent ? 'event' : 'check_out'),
      lab: 'CMC_BENI_MELLAL',
      gate: isIn ? 'GATE_IN' : (isEvent ? 'EVENT' : 'GATE_OUT'),
      id: qr.id
    });

    setPayload({ uid: qr.id, data });

    // Wait for the canvas to mount before drawing into it.
    requestAnimationFrame(async () => {
      if (!canvasRef.current) return;
      await QRCode.toCanvas(canvasRef.current, data, {
        width: 220,
        color: {
          dark: isIn ? '#01B574' : (isEvent ? '#4318FF' : '#E31A1A'),
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
    });
  };

  const handleDownload = async () => {
    if (!payload?.data) return;
    const url = await QRCode.toDataURL(payload.data, {
      width: 2000,
      margin: 4,
      color: {
        dark: isIn ? '#01B574' : (isEvent ? '#4318FF' : '#E31A1A'),
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });
    const link = document.createElement('a');
    link.download = `fablab_gate_${type}_${Date.now()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // UI styling flags
  const dotColorClass = isIn ? 'bg-accent-green' : (isEvent ? 'bg-accent-purple' : 'bg-accent-red');
  const titleClass = isIn ? 'text-accent-green' : (isEvent ? 'text-accent-purple' : 'text-accent-red');
  const titleText = isIn ? 'Gate-IN' : (isEvent ? 'Event' : 'Gate-OUT');
  
  const descText = isIn 
    ? 'QR Code pour le check-in des utilisateurs' 
    : (isEvent 
      ? "QR Code pour l'enregistrement à un événement" 
      : 'QR Code pour le check-out des utilisateurs');

  const btnClass = isIn ? 'btn-gate-in' : (isEvent ? 'btn-gate-event' : 'btn-gate-out');
  const btnText = isIn ? 'Générer Gate-IN' : (isEvent ? 'Générer Event' : 'Générer Gate-OUT');

  return (
    <div className="section-card p-7 flex flex-col items-center">
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${dotColorClass}`} />
        <h3 className={`text-[18px] font-bold ${titleClass}`}>
          {titleText}
        </h3>
      </div>
      <p className="text-[13px] text-white/40 font-normal mb-6 text-center">
        {descText}
      </p>
      <button
        onClick={handleGenerate}
        className={`${btnClass} px-6 py-2.5 rounded-lg font-bold text-[13px] flex items-center justify-center space-x-2 mb-6 cursor-pointer`}
      >
        <span>{btnText}</span>
      </button>

      {payload && (
        <div className="w-full flex flex-col items-center animate-fade-in">
          <div className="qr-container flex flex-col items-center mb-4 p-2 bg-white rounded-2xl">
            <canvas ref={canvasRef} />
          </div>
          <p className="text-[11px] text-white/25 font-medium mb-4">ID: {payload.uid}...</p>
          <button onClick={handleDownload} className="btn-download px-5 py-2.5 rounded-xl font-bold text-[12px] flex items-center space-x-2 cursor-pointer hover:border-white/45 transition-colors">
            <span>📥</span>
            <span>Télécharger PNG</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function QrCodesView() {
  return (
    <section>
      <div className="mb-7 mt-2">
        <p className="text-[12px] font-medium text-white/50 mb-1">Pages / QR Codes</p>
        <h1 className="text-[32px] font-bold text-white tracking-tight">Générateur QR Codes</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <GateCard type="in" />
        <EventSection />
        <GateCard type="out" />
      </div>
    </section>
  );
}
