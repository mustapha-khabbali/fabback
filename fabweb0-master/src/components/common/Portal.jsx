import { createPortal } from 'react-dom';

// Renders children directly under <body>, escaping any ancestor that has a
// `transform`/`filter`/`will-change` (e.g. the swipeable tab container in
// LoginScreen). Without this, `position: fixed` overlays are positioned
// relative to that transformed ancestor instead of the viewport, so a
// "full-screen" modal fails to cover the bottom nav on mobile.
export default function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
