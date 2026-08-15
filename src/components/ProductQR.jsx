import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const ProductQR = ({ product }) => {
    const [open, setOpen] = useState(false);
    const qrRef = useRef(null);

    if (!product?.qr_token) return null;

    const publicBase = (
        import.meta.env.VITE_PUBLIC_APP_URL ||
        window.location.origin
    ).replace(/\/$/, '');

    const url = `${publicBase}/qr/${product.qr_token}`;

    const downloadQR = () => {
        const canvas = qrRef.current;

        if (!canvas) return;

        const pngUrl = canvas.toDataURL('image/png');

        const downloadLink = document.createElement('a');

        downloadLink.href = pngUrl;
        downloadLink.download =
            `QR-${product.name || product.title || 'tovar'}-${product.local_id || product.id}.png`;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <>
            <button
                type="button"
                className="qr-mini-btn"
                onClick={() => setOpen(true)}
                title="QR kodni ko'rish"
            >
                ▣ QR
            </button>

            {open && (
                <div
                    className="qr-modal-overlay"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="qr-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="qr-close"
                            onClick={() => setOpen(false)}
                        >
                            ×
                        </button>

                        <h3>📱 Tovar QR kodi</h3>

                        <p>
                            <b>
                                {product.name || product.title}
                            </b>
                        </p>

                        <p className="qr-meta">
                            {product.size || 'Standart'} •{' '}
                            {product.quantity} dona
                        </p>

                        <div
                            className="qr-canvas-wrap"
                            style={{
                                background: '#fff',
                                padding: '15px',
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: '12px'
                            }}
                        >
                            <QRCodeCanvas
                                ref={qrRef}
                                value={url}
                                size={260}
                                includeMargin={true}
                                level="H"
                            />
                        </div>

                        <small className="qr-url">
                            {url}
                        </small>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                marginTop: '15px'
                            }}
                        >
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={downloadQR}
                            >
                                ⬇️ QR kodni yuklab olish
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                    window.open(
                                        url,
                                        '_blank'
                                    )
                                }
                            >
                                🔗 Sahifani ochish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductQR;