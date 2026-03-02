/**
 * Base URL used for QR code scan links (so the store's phone opens the right host).
 * Set VITE_PUBLIC_URL when using ngrok so QR codes point to the ngrok URL instead of localhost.
 */
export function getPublicBaseUrl() {
  if (typeof import.meta.env.VITE_PUBLIC_URL === 'string' && import.meta.env.VITE_PUBLIC_URL.trim()) {
    return import.meta.env.VITE_PUBLIC_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function getScanUrl(qrCode) {
  const base = getPublicBaseUrl();
  return base ? `${base}/scan/${qrCode}` : `/scan/${qrCode}`;
}
