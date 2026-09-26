import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  targetPath: string; // e.g. "/tournament/national-championship-2026" or "/match/match-123"
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  targetPath,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fullUrl = window.location.origin + targetPath;

  useEffect(() => {
    if (isOpen && targetPath) {
      QRCode.toDataURL(fullUrl, { width: 300, margin: 2, color: { dark: '#0a0a1a', light: '#ffffff' } })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, targetPath, fullUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#16162a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: '1.5rem 1.25rem',
          maxWidth: 420,
          maxHeight: '90vh',
          overflowY: 'auto',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '1.4rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
        <h2 style={{ margin: '0 0 0.25rem', color: '#fff', fontSize: '1.3rem', fontWeight: 800 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '0 0 1.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            {subtitle}
          </p>
        )}

        {/* QR Code Container */}
        <div
          style={{
            background: '#fff',
            padding: '1rem',
            borderRadius: 16,
            display: 'inline-block',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            marginBottom: '1.25rem',
          }}
        >
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" style={{ width: 220, height: 220, display: 'block' }} />
          ) : (
            <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Generating...
            </div>
          )}
        </div>

        {/* URL Box & Copy */}
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '0.6rem 0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '1rem',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left', fontFamily: 'monospace' }}>
            {fullUrl}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#22c55e' : 'rgba(99,102,241,0.3)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >
            {copied ? '✓ Copied' : 'Copy Link'}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          Scan with mobile camera to view live scoreboard & tournament details
        </p>
      </div>
    </div>
  );
};
