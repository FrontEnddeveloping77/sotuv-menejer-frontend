import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const ProductQR = ({ product }) => {
    const [open, setOpen] = useState(false);
    if (!product?.qr_token) return null;

    const publicBase = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
    const url = `${publicBase}/qr/${product.qr_token}`;

    return (
        <>
            <button type="button" className="qr-mini-btn" onClick={() => setOpen(true)} title="QR kodni ko'rish">
                ▣ QR
            </button>
            {open && (
                <div className="qr-modal-overlay" onClick={() => setOpen(false)}>
                    <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="qr-close" onClick={() => setOpen(false)}>×</button>
                        <h3>📱 Tovar QR kodi</h3>
                        <p><b>{product.name || product.title}</b></p>
                        <p className="qr-meta">{product.size || 'Standart'} • {product.quantity} dona</p>
                        <div className="qr-canvas-wrap">
                            <QRCodeCanvas value={url} size={260} includeMargin level="H" />
                        </div>
                        <small className="qr-url">{url}</small>
                        <button type="button" className="btn btn-primary" onClick={() => window.open(url, '_blank')}>
                            🔗 Sahifani ochish
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductQR;
