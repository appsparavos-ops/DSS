import { useEffect, useRef, useState } from 'react';

/**
 * Wake Lock de pantalla (Screen Wake Lock API).
 *
 * Mientras `enabled` sea true mantiene la pantalla encendida y evita que el
 * dispositivo entre en suspensión (versión web / PWA). En la app de escritorio
 * esto ya lo cubre Electron con powerSaveBlocker; acá es el equivalente para
 * cuando la planilla corre en el navegador (GitHub Pages).
 *
 * El bloqueo se libera automáticamente si la pestaña queda oculta y se vuelve
 * a pedir cuando la pestaña recupera el foco (exigencia de la API).
 */
export function useWakeLock(enabled: boolean) {
  const [supported, setSupported] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  const lockRef = useRef<any>(null);

  useEffect(() => {
    const nav: any = navigator;
    setSupported(!!(nav.wakeLock && typeof nav.wakeLock.request === 'function'));
  }, []);

  useEffect(() => {
    const nav: any = navigator;
    if (!enabled || !nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
      return;
    }

    let cancelled = false;

    const requestLock = async () => {
      // La API exige que el documento esté visible para conceder el lock
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await nav.wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        lockRef.current = lock;
        setActive(true);
        lock.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (lockRef.current) {
        try {
          lockRef.current.release();
        } catch { /* ya liberado */ }
        lockRef.current = null;
      }
      setActive(false);
    };
  }, [enabled]);

  return { supported, active };
}
