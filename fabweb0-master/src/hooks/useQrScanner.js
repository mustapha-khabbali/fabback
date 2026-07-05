import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function useQrScanner(elementId, onScanSuccess, isActive, onCameraStarted, onCameraError) {
  const scannerRef = useRef(null);

  const startScanner = useCallback(async () => {
    if (!isActive) return;
    if (scannerRef.current?.isScanning) return;

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.9;
        return { width: size, height: size };
      },
      aspectRatio: 1.0
    };

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(elementId);
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
        }
      );
      if (onCameraStarted) onCameraStarted();
      return true; // camera started
    } catch (err) {
      console.error("Scanner error:", err);
      if (onCameraError) onCameraError(err);
      return false; // camera failed
    }
  }, [elementId, onScanSuccess, isActive, onCameraStarted, onCameraError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
  }, []);

  // Auto-start/stop based on isActive
  useEffect(() => {
    if (isActive) {
      startScanner();
    } else {
      stopScanner();
    }

    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, [isActive, startScanner, stopScanner]);

  return { startScanner, stopScanner, scannerRef };
}
