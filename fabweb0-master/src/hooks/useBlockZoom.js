import { useEffect } from 'react';

export default function useBlockZoom() {
  useEffect(() => {
    // 1. Prevent pinch-to-zoom on touch devices
    const handleTouchMove = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // 2. Prevent double-tap-to-zoom
    let lastTouchEnd = 0;
    const handleTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // 3. iOS Safari: prevent gesturestart (pinch gesture)
    const handleGestureStart = (e) => {
      e.preventDefault();
    };

    // 4. Desktop: prevent Ctrl+scroll / Ctrl+plus/minus zoom
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, false);
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown, false);

    // 5. Ensure the viewport meta tag is strict
    let meta = document.querySelector('meta[name="viewport"]');
    const strictContent = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    if (meta) {
      meta.setAttribute('content', strictContent);
    } else {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = strictContent;
      document.head.appendChild(meta);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
