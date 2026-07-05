import { useState, useCallback } from 'react';
import { useApp, TABS } from '../../../context/AppContext';
import { useQrScanner } from '../../../hooks/useQrScanner';

export default function ScanTab() {
  const { activeTab, isUserInLab, currentUser, setShowScanObjectiveModal, setShowRoleScanObjectiveModal, setShowFeedbackModal } = useApp();
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const isActive = activeTab === TABS.SCAN;

  const readScanPayload = (decodedText) => {
    try {
      return JSON.parse(decodedText);
    } catch {
      return { action: decodedText };
    }
  };

  const handleDecodedScan = useCallback((decodedText) => {
    const payload = readScanPayload(decodedText);
    const scanAction = payload?.gate || payload?.action || decodedText;
    const isGateInScan = scanAction === 'GATE_IN' || scanAction === 'check_in' || scanAction === 'fablab';
    const isGateOutScan = scanAction === 'GATE_OUT' || scanAction === 'check_out';

    if (!isGateInScan && !isGateOutScan) {
      return;
    }

    if (payload?.gateInConfig) {
      localStorage.setItem('gate_in_config', JSON.stringify(payload.gateInConfig));
    }
    if (payload?.events) {
      localStorage.setItem('gate_in_events', JSON.stringify(payload.events));
    }

    if (!isUserInLab && isGateInScan) {
      if (currentUser?.role === 'stagiaire') {
        setShowScanObjectiveModal(true);
      } else {
        setShowRoleScanObjectiveModal(true);
      }
    } else if (isUserInLab && isGateOutScan) {
      setShowFeedbackModal(true);
    }
  }, [isUserInLab, currentUser, setShowScanObjectiveModal, setShowRoleScanObjectiveModal, setShowFeedbackModal]);

  const onScanSuccess = useCallback((decodedText) => {
    handleDecodedScan(decodedText);
  }, [handleDecodedScan]);

  const handleCameraStarted = useCallback(() => {
    setCameraError('');
    setCameraStarted(true);
  }, []);

  const handleCameraError = useCallback((error) => {
    setCameraStarted(false);
    setCameraError(error?.message || "La camera n'a pas pu demarrer.");
  }, []);

  const { startScanner, stopScanner } = useQrScanner('qr-reader', onScanSuccess, isActive, handleCameraStarted, handleCameraError);

  const handleScanAction = useCallback(() => {
    stopScanner();
    handleDecodedScan(JSON.stringify({
      action: isUserInLab ? 'check_out' : 'check_in',
      gate: isUserInLab ? 'GATE_OUT' : 'GATE_IN',
    }));
  }, [stopScanner, handleDecodedScan, isUserInLab]);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 space-y-8 pb-32">
      {/* Scanner Container */}
      <div className="w-full max-w-[320px] aspect-square bg-gray-900 rounded-[40px] overflow-hidden relative shadow-2xl border-4 border-white/20">
        <div id="qr-reader" className="w-full h-full"></div>
        {/* Overlay if not scanning */}
        {!cameraStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm z-10 transition-opacity duration-300">
            <button
              type="button"
              onClick={startScanner}
              className="p-6 bg-midnight-blue/40 rounded-full border-2 border-white/20 animate-pulse active:scale-95"
              aria-label="Activer la camera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <p className="text-white font-bold mt-4 text-sm px-4 text-center">
              {cameraError ? 'Toucher pour reessayer' : 'Scanner pour continuer'}
            </p>
            {cameraError && (
              <p className="text-white/70 text-xs mt-2 px-6 text-center">
                Autorisez la camera dans Android si la demande apparait.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Banner / Button */}
      <div className="w-full max-w-[320px] space-y-4">
        <div
          onClick={handleScanAction}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-center space-x-3 shadow-lg transition-all duration-500 cursor-pointer active:scale-95 active:brightness-110"
        >
          <span className="w-2.5 h-2.5 bg-t-surface glass-card rounded-full animate-pulse"></span>
          <span className="text-base font-bold uppercase tracking-wider">SCAN</span>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-t-secondary font-medium">Scannez le QR Code pour valider l'action</p>
        </div>
      </div>
    </div>
  );
}
