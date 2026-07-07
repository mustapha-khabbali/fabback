import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import EventForm from './EventForm';
import ConfirmModal from '../projects/ConfirmModal';
import { api } from '../../services/api';
import { subscribeRealtime } from '../../services/realtime';

// An event is "active" when its (end) date is today or in the future.
function isActive(evt) {
  const end = evt.dateMode === 'range' ? evt.dateTo : evt.date;
  if (!end) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(end) >= today;
}

function eventQrPayload(id) {
  return JSON.stringify({ action: 'event', lab: 'CMC_BENI_MELLAL', gate: 'EVENT', id });
}

export default function EventSection() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [mode, setMode] = useState('list'); // 'list' | 'form' | 'history'
  const [returnTo, setReturnTo] = useState('list'); // where the form's Back returns to
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);

  const loadEventsData = useCallback((cancelledRef = { current: false }) => {
    Promise.all([api.getUsers(), api.getEvents()])
      .then(([loadedUsers, loadedEvents]) => {
        if (!cancelledRef.current) {
          setUsers(loadedUsers);
          setEvents(loadedEvents);
        }
      })
      .catch((error) => {
        if (!cancelledRef.current) alert(error.message);
      });
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    loadEventsData(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [loadEventsData]);

  useEffect(() => subscribeRealtime((change) => {
    if (change.entity === 'sync' || change.entity === 'events') {
      loadEventsData();
    }
  }), [loadEventsData]);

  // New intervenant → into the database with name + surname + type.
  const createUser = async (prenom, nom, type) => {
    const newUser = await api.createUser({ prenom, nom, role: type });
    setUsers((prev) => [newUser, ...prev]);
    return newUser;
  };

  const openNew = () => { setEditing(null); setReturnTo('list'); setMode('form'); };
  const openEdit = (evt, from) => { setEditing(evt); setReturnTo(from); setMode('form'); };

  const saveEvent = async (evt) => {
    // A present/future date brings the event (back) into the active box on save.
    const finalEvt = { ...evt, archived: isActive(evt) ? false : evt.archived };
    try {
      const saved = await api.saveEvent(finalEvt);
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === saved.id);
        return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev];
      });
      // Go to where the event now lives: active box (list) or history.
      setMode(isActive(saved) && !saved.archived ? 'list' : 'history');
      setEditing(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const archiveEvent = async (id) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    try {
      const saved = await api.saveEvent({ ...event, archived: true });
      setEvents((prev) => prev.map((e) => (e.id === id ? saved : e)));
    } catch (error) {
      alert(error.message);
    }
  };
  const permanentDelete = async () => {
    try {
      await api.deleteEvent(confirmDeleteId);
      setEvents((prev) => prev.filter((e) => e.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const toggleQr = async () => {
    if (qrDataUrl) { setQrDataUrl(null); setQrPayload(null); return; }
    try {
      const qr = await api.getPermanentGateQr('EVENT');
      const payload = eventQrPayload(qr.id);
      const url = await QRCode.toDataURL(payload, { width: 512, color: { dark: '#4318FF', light: '#ffffff' }, errorCorrectionLevel: 'H' });
      setQrPayload(payload);
      setQrDataUrl(url);
    } catch (error) {
      alert(error.message);
    }
  };

  const downloadQr = async () => {
    if (!qrPayload) return;
    const url = await QRCode.toDataURL(qrPayload, {
      width: 2000,
      margin: 4,
      color: { dark: '#4318FF', light: '#ffffff' },
      errorCorrectionLevel: 'H'
    });
    const link = document.createElement('a');
    link.download = `fablab_event_qr.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Box = active (present/future) and not removed. History = everything else (past date or removed).
  const activeEvents = events.filter((e) => isActive(e) && !e.archived);
  const historyEvents = events.filter((e) => !isActive(e) || e.archived);

  // ── FORM ──
  if (mode === 'form') {
    return (
      <div className="section-card p-5">
        <EventForm
          event={editing}
          users={users}
          onCreateUser={createUser}
          onSave={saveEvent}
          onBack={() => { setMode(returnTo); setEditing(null); }}
        />
      </div>
    );
  }

  // ── HISTORY ──
  if (mode === 'history') {
    return (
      <div className="section-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setMode('list')} className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 rounded-lg transition-colors cursor-pointer shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h4 className="flex-1 text-[13px] font-bold text-white truncate">Historique</h4>
        </div>

        {historyEvents.length === 0 ? (
          <div className="py-8 text-center text-white/20 italic text-[12px]">Aucun événement dans l'historique</div>
        ) : (
          <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1 -mr-1">
            {historyEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 transition-colors">
                <button onClick={() => openEdit(e, 'history')} className="min-w-0 text-left cursor-pointer flex-1">
                  <p className="text-[12px] font-bold text-white truncate">{e.title}</p>
                  <p className="text-[9px] text-white/40 font-medium truncate">{(e.spaces || (e.space ? [e.space] : [])).join(', ')}</p>
                </button>
                <button onClick={() => setConfirmDeleteId(e.id)} className="p-1.5 text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors cursor-pointer shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {confirmDeleteId && (
          <ConfirmModal
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
            iconBg="bg-accent-red/10"
            iconColor="text-accent-red"
            title="Supprimer cet événement ?"
            description="Cette action est irréversible."
            confirmLabel="Oui, supprimer"
            danger
            onConfirm={permanentDelete}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>
    );
  }

  // ── LIST (mirrors the Gate cards: title → description → buttons in the same spot) ──
  return (
    <div className="section-card p-7 flex flex-col items-center relative">
      <button
        onClick={() => setMode('history')}
        className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        History
      </button>

      <div className="flex items-center space-x-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-accent-purple" />
        <h3 className="text-[18px] font-bold text-accent-purple">Event</h3>
      </div>
      <p className="text-[13px] text-white/40 font-normal mb-6 text-center">
        QR Code pour l'enregistrement à un événement
      </p>

      <div className="w-full flex gap-2 mb-6">
        <button
          onClick={openNew}
          className="btn-gate-event flex-1 px-3 py-2.5 rounded-lg font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span>Créer</span>
        </button>
        <button
          onClick={toggleQr}
          className={`flex-1 px-3 py-2.5 rounded-lg font-bold text-[12px] flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            qrDataUrl ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple' : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/15 text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          <span>Générer QR</span>
        </button>
      </div>

      {/* Single constant QR for all events */}
      {qrDataUrl && (
        <div className="w-full flex flex-col items-center mb-6 animate-in fade-in duration-200">
          <div className="p-3 bg-white rounded-2xl mb-3">
            <img src={qrDataUrl} alt="QR Événements" className="w-[180px] h-[180px]" />
          </div>
          <button onClick={downloadQr} className="btn-download px-5 py-2.5 rounded-xl font-bold text-[12px] flex items-center gap-2 cursor-pointer hover:border-white/45 transition-colors">
            <span>📥</span><span>Télécharger PNG</span>
          </button>
        </div>
      )}

      {activeEvents.length > 0 && (
        <div className="w-full flex flex-wrap justify-center gap-2 max-h-[220px] overflow-y-auto pt-4 border-t border-white/[0.06]">
          {activeEvents.map((e) => (
            <div
              key={e.id}
              className="group flex items-center gap-1.5 rounded-full border pl-3 pr-1 py-1.5 bg-accent-green/10 border-accent-green/40 transition-colors"
            >
              <button onClick={() => openEdit(e, 'list')} className="flex items-center gap-1.5 cursor-pointer min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-accent-green" />
                <span className="text-[12px] font-bold truncate max-w-[150px] text-white">{e.title}</span>
              </button>
              <button
                onClick={() => archiveEvent(e.id)}
                className="p-1 text-white/30 hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors cursor-pointer shrink-0"
                title="Retirer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
