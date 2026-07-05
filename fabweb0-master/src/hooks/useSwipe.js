import { useRef, useEffect, useCallback } from 'react';

export default function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }) {
  const ref = useRef(null);
  
  const startX = useRef(null);
  const startY = useRef(null);
  const startTime = useRef(0);
  const currentX = useRef(null);
  const isSwiping = useRef(false);
  const isLocked = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      if (e.touches.length > 1 || isLocked.current) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startTime.current = Date.now();
      isSwiping.current = false;
      currentX.current = null;
      
      element.style.transition = 'none';
    };

    const handleTouchMove = (e) => {
      if (startX.current === null || startY.current === null || isLocked.current) return;

      currentX.current = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const deltaX = currentX.current - startX.current;
      const deltaY = currentY - startY.current;

      if (!isSwiping.current && Math.abs(deltaY) > Math.abs(deltaX)) {
        startX.current = null;
        startY.current = null;
        return;
      }

      if (Math.abs(deltaX) > 10) {
        isSwiping.current = true;
        
        // CRITICAL: Prevent browser native back/forward gestures
        // This ONLY works if the listener is NOT passive.
        if (e.cancelable) {
          e.preventDefault();
        }
        
        let translateX = deltaX;
        if ((deltaX > 0 && !onSwipeRight) || (deltaX < 0 && !onSwipeLeft)) {
          translateX = deltaX * 0.2;
        }

        element.style.transform = `translateX(${translateX}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (startX.current === null || currentX.current === null || !isSwiping.current || isLocked.current) {
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'translateX(0)';
        startX.current = null;
        startY.current = null;
        currentX.current = null;
        isSwiping.current = false;
        return;
      }

      const deltaX = currentX.current - startX.current;
      const velocity = Math.abs(deltaX) / (Date.now() - startTime.current);
      const isSignificant = Math.abs(deltaX) > threshold || velocity > 0.5;
      const isSwipeRight = deltaX > 0;
      const handler = isSwipeRight ? onSwipeRight : onSwipeLeft;

      if (isSignificant && handler) {
        isLocked.current = true;
        const exitX = isSwipeRight ? window.innerWidth : -window.innerWidth;
        element.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 1, 1)';
        element.style.transform = `translateX(${exitX}px)`;

        setTimeout(() => {
          handler();
          requestAnimationFrame(() => {
            element.style.transition = 'none';
            element.style.transform = 'translateX(0)';
            isLocked.current = false;
          });
        }, 200);
      } else {
        element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        element.style.transform = 'translateX(0)';
      }

      startX.current = null;
      startY.current = null;
      currentX.current = null;
      isSwiping.current = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { ref };
}
