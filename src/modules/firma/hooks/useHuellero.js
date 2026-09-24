import { useCallback, useEffect, useRef, useState } from 'react';
import websdkUrl from '@digitalpersona/websdk/dist/websdk.client.min.js?url';

// Adaptador del lector de huellas HID DigitalPersona U.are.U 4500.
// Habla con el servicio local "HID Authentication Device Client" (DigitalPersona Lite Client) por WebSocket en 127.0.0.1:52181.
// Solo se pide la imagen PNG de la huella: nunca plantillas (FMD), que son el dato biométrico más sensible y aquí no hacen falta.
// Toda la interfaz depende de este hook: si se cambia de SDK o se usa un agente propio, solo se reemplaza este archivo.

const MENSAJES_CALIDAD = {
  1: 'No se detecta la huella. Apoye el dedo sobre el lector.',
  2: 'Poca presión o dedo muy seco. Presione un poco más.',
  3: 'Demasiada presión o dedo muy húmedo. Presione más suave.',
  4: 'La lectura salió con ruido. Limpie el lector y el dedo e intente de nuevo.',
  5: 'Poco contraste. Intente de nuevo.',
  6: 'Faltan detalles de la huella. Apoye más superficie del dedo.',
  7: 'Centre el dedo sobre el lector.',
  8: 'Lo que se apoyó no parece un dedo.',
  9: 'Baje un poco el dedo.', 10: 'Suba un poco el dedo.', 11: 'Mueva el dedo hacia la derecha.', 12: 'Mueva el dedo hacia la izquierda.',
  13: 'Apoye el dedo de forma normal.', 14: 'Muy rápido. Apoye el dedo y manténgalo un instante.', 15: 'Dedo inclinado. Apóyelo plano.',
  16: 'Apoye una porción mayor del dedo.', 17: 'Muy lento. Intente de nuevo.', 19: 'Demasiada presión. Presione más suave.',
  20: 'Muy poca presión. Presione un poco más.', 21: 'Dedo húmedo. Séquelo e intente de nuevo.', 22: 'Se detectó un posible dedo falso.',
  23: 'Superficie muy pequeña. Apoye más el dedo.', 24: 'Dedo rotado. Apóyelo derecho.',
};

let cargaScript = null;
const cargarWebSdk = () => {
  if (window.WebSdk) return Promise.resolve();
  if (!cargaScript) {
    cargaScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = websdkUrl;
      s.onload = () => resolve();
      s.onerror = () => { cargaScript = null; reject(new Error('No se pudo cargar el cliente del lector')); };
      document.head.appendChild(s);
    });
  }
  return cargaScript;
};

// base64url -> base64 -> dataURL
const aDataUrlPng = (b64url) => `data:image/png;base64,${b64url.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - (b64url.length % 4)) % 4)}`;

/**
 * estado: 'inactivo' | 'buscando' | 'sin_servicio' | 'sin_lector' | 'listo' | 'capturada'
 *  - sin_servicio: el Lite Client no está instalado/ejecutándose, o el navegador bloqueó el acceso a la red local
 *  - sin_lector: el servicio responde pero no hay lector conectado
 */
export const useHuellero = () => {
  const [estado, setEstado] = useState('inactivo');
  const [mensaje, setMensaje] = useState('');
  const [muestra, setMuestra] = useState(null);       // dataURL PNG
  const [dispositivo, setDispositivo] = useState(null);
  const lector = useRef(null);
  const uid = useRef(null);
  const vivo = useRef(true);
  const corrida = useRef(0);   // descarta arranques superpuestos (p. ej. el doble montaje de React en desarrollo)

  const detener = useCallback(async () => {
    const r = lector.current;
    lector.current = null;
    if (!r) return;
    try { r.off(); await r.stopAcquisition(uid.current ?? undefined); } catch { /* el lector ya se había soltado */ }
  }, []);

  const iniciar = useCallback(async () => {
    const id = ++corrida.current;
    await detener();
    if (!vivo.current || id !== corrida.current) return;
    setEstado('buscando');
    setMensaje('');
    setMuestra(null);
    try {
      await cargarWebSdk();
      const { FingerprintReader, SampleFormat } = await import('@digitalpersona/devices');
      if (!vivo.current || id !== corrida.current) return;
      const reader = new FingerprintReader();
      lector.current = reader;
      reader.on('CommunicationFailed', () => { if (lector.current === reader) setEstado('sin_servicio'); });
      reader.on('DeviceConnected', () => { if (lector.current === reader && !uid.current) iniciar(); });
      reader.on('DeviceDisconnected', () => { if (lector.current === reader) { uid.current = null; setEstado('sin_lector'); } });
      reader.on('QualityReported', (e) => { if (e.quality !== 0) setMensaje(MENSAJES_CALIDAD[e.quality] ?? 'La lectura no fue buena. Intente de nuevo.'); else setMensaje(''); });
      reader.on('ErrorOccurred', () => setMensaje('El lector reportó un error. Intente de nuevo.'));
      reader.on('SamplesAcquired', (e) => {
        const item = e.samples?.[0];
        const b64 = typeof item === 'string' ? item : item?.Data;
        if (!b64) return;
        setMuestra(aDataUrlPng(b64));
        setMensaje('');
        setEstado('capturada');
        // Se suelta el lector apenas hay una lectura buena
        reader.stopAcquisition(uid.current ?? undefined).catch(() => {});
      });
      const lista = await reader.enumerateDevices();
      if (lector.current !== reader) return;
      if (!lista.length) { uid.current = null; setEstado('sin_lector'); return; }   // sigue escuchando DeviceConnected
      uid.current = lista[0];
      setDispositivo(`DigitalPersona ${lista[0]}`.slice(0, 80));
      await reader.startAcquisition(SampleFormat.PngImage, lista[0]);
      if (lector.current === reader) setEstado('listo');
    } catch {
      if (id === corrida.current) setEstado('sin_servicio');
    }
  }, [detener]);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; corrida.current += 1; detener(); };
  }, [detener]);

  const descartar = useCallback(() => { setMuestra(null); iniciar(); }, [iniciar]);

  return { estado, mensaje, muestra, dispositivo, iniciar, detener, descartar };
};
