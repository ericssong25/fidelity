import { useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QrScannerProps {
  onScan: (url: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const isRunningRef = useRef(false);
  const scannerDivId = useMemo(() => `qr-scanner-${Math.random().toString(36).slice(2, 8)}`, []);

  useEffect(() => {
    mountedRef.current = true;
    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (mountedRef.current) {
            onScan(decodedText);
          }
        },
        () => {
          // Ignore intermediate scan errors
        }
      )
      .then(() => {
        isRunningRef.current = true;
      })
      .catch((err) => {
        console.error('Camera start error:', err);
        isRunningRef.current = false;
        if (mountedRef.current) {
          onClose();
        }
      });

    return () => {
      mountedRef.current = false;
      if (isRunningRef.current) {
        scanner.stop().catch(() => {});
        isRunningRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    mountedRef.current = false;
    if (isRunningRef.current) {
      scannerRef.current?.stop().catch(() => {});
      isRunningRef.current = false;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h2 className="text-white font-extrabold text-lg">Escanear QR</h2>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      <div className="flex-1 relative">
        <div id={scannerDivId} className="w-full h-full" />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[250px] h-[250px] relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
          </div>
        </div>

        <p className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm">
          Apunta la cámara al código QR
        </p>
      </div>
    </div>
  );
}
